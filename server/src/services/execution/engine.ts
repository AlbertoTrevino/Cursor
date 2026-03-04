import type { Server } from 'socket.io'
import { prisma } from '../../config/database.js'
import { topologicalSort } from './topologicalSort.js'
import { getExecutor } from './nodeExecutors/index.js'
import type { NodeExecutorContext, NodeExecutorResult } from './nodeExecutors/types.js'
import { SOCKET_EVENTS } from '@shared/socketEvents'
import type { ExecutionMode } from '@shared/executionModes'
import { NODE_TYPES } from '@shared/nodeTypes'
import { removeEngine } from './engineRegistry.js'

const NODE_TIMEOUT_MS = 120_000

interface NodeData {
  id: string
  type: string
  subType: string | null
  label: string
  config: Record<string, unknown>
  currentPrompt: string | null
  provider: string | null
  apiKeyId: string | null
}

interface EdgeData {
  id: string
  sourceNodeId: string
  targetNodeId: string
  sourceHandle: string | null
  targetHandle: string | null
}

export class ExecutionEngine {
  private executionId: string
  private workflowId: string
  private mode: ExecutionMode
  private executionOrder: string[] = []
  private currentIndex = 0
  private isPaused = false
  private isStopped = false
  private isWaitingReview = false
  private waitingReviewNodeId: string | null = null
  private nodeOutputs = new Map<string, unknown>()
  private nodeDataMap = new Map<string, NodeData>()
  private edgeMap = new Map<string, string[]>() // targetId -> sourceIds (normal edges only)
  private allEdges: EdgeData[] = []
  private feedbackEdges: EdgeData[] = [] // edges targeting 'feedback' handle
  private io: Server

  constructor(workflowId: string, executionId: string, mode: ExecutionMode, io: Server) {
    this.workflowId = workflowId
    this.executionId = executionId
    this.mode = mode
    this.io = io
  }

  private executeWithTimeout(
    executor: (ctx: NodeExecutorContext) => Promise<NodeExecutorResult>,
    ctx: NodeExecutorContext,
  ): Promise<NodeExecutorResult> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error(`Nodo "${ctx.label}" excedió el tiempo límite (${NODE_TIMEOUT_MS / 1000}s)`)),
        NODE_TIMEOUT_MS,
      )
      executor(ctx).then(
        (r) => { clearTimeout(timer); resolve(r) },
        (e) => { clearTimeout(timer); reject(e) },
      )
    })
  }

  private emit(event: string, data: Record<string, unknown>) {
    this.io.to(`workflow:${this.workflowId}`).emit(event, {
      executionId: this.executionId,
      ...data,
    })
  }

  async start(): Promise<void> {
    const workflow = await prisma.workflow.findUnique({
      where: { id: this.workflowId },
      include: { nodes: true, edges: true },
    })
    if (!workflow) throw new Error('Flujo no encontrado')

    // Build node data map
    for (const node of workflow.nodes) {
      this.nodeDataMap.set(node.id, {
        id: node.id,
        type: node.type,
        subType: node.subType,
        label: node.label,
        config: node.config as Record<string, unknown>,
        currentPrompt: node.currentPrompt,
        provider: (node.config as Record<string, unknown>)?.provider as string | null,
        apiKeyId: node.apiKeyId,
      })
    }

    // Separate feedback edges from normal edges
    this.allEdges = workflow.edges.map((e) => ({
      id: e.id,
      sourceNodeId: e.sourceNodeId,
      targetNodeId: e.targetNodeId,
      sourceHandle: e.sourceHandle,
      targetHandle: e.targetHandle,
    }))

    // Feedback edges: any edge FROM a promptHistory node (these create cycles back to CuboAI)
    const promptHistoryNodeIds = new Set(
      workflow.nodes.filter((n) => n.type === NODE_TYPES.PROMPT_HISTORY).map((n) => n.id),
    )
    this.feedbackEdges = this.allEdges.filter((e) => promptHistoryNodeIds.has(e.sourceNodeId))
    const normalEdges = this.allEdges.filter((e) => !promptHistoryNodeIds.has(e.sourceNodeId))

    // Build edge map (normal edges only — feedback edges excluded to avoid cycles)
    for (const edge of normalEdges) {
      const sources = this.edgeMap.get(edge.targetNodeId) || []
      sources.push(edge.sourceNodeId)
      this.edgeMap.set(edge.targetNodeId, sources)
    }

    // Topological sort excluding feedback edges and promptHistory nodes
    // (promptHistory nodes are only executed manually during feedback loops)
    const sortableNodes = workflow.nodes.filter((n) => !promptHistoryNodeIds.has(n.id))
    const sortableEdges = normalEdges.filter(
      (e) => !promptHistoryNodeIds.has(e.sourceNodeId) && !promptHistoryNodeIds.has(e.targetNodeId),
    )
    this.executionOrder = topologicalSort(
      sortableNodes.map((n) => ({ id: n.id })),
      sortableEdges.map((e) => ({
        sourceNodeId: e.sourceNodeId,
        targetNodeId: e.targetNodeId,
      })),
    )

    await prisma.execution.update({
      where: { id: this.executionId },
      data: { status: 'running', startedAt: new Date() },
    })

    for (const nodeId of this.executionOrder) {
      this.emit(SOCKET_EVENTS.NODE_RUN_STATE_CHANGE, { nodeId, runState: 'waiting' })
    }

    this.emit(SOCKET_EVENTS.EXECUTION_STARTED, { mode: this.mode })
    await this.processNext()
  }

  private async processNext(): Promise<void> {
    if (this.isStopped) return

    if (this.currentIndex >= this.executionOrder.length) {
      await prisma.execution.update({
        where: { id: this.executionId },
        data: { status: 'completed', completedAt: new Date() },
      })
      this.emit(SOCKET_EVENTS.EXECUTION_COMPLETED, { status: 'completed' })
      removeEngine(this.executionId)
      return
    }

    const nodeId = this.executionOrder[this.currentIndex]
    const nodeData = this.nodeDataMap.get(nodeId)
    if (!nodeData) return

    this.emit(SOCKET_EVENTS.NODE_RUN_STATE_CHANGE, { nodeId, runState: 'running' })

    const sourceIds = this.edgeMap.get(nodeId) || []
    for (const srcId of sourceIds) {
      this.emit(SOCKET_EVENTS.EDGE_ACTIVE, { sourceId: srcId, targetId: nodeId, active: true })
    }

    try {
      const inputs: Record<string, unknown> = {}
      for (const srcId of sourceIds) {
        const srcData = this.nodeDataMap.get(srcId)
        inputs[srcData?.label || srcId] = this.nodeOutputs.get(srcId)
      }

      const feedbackInputs: Record<string, unknown> = {}
      for (const fEdge of this.feedbackEdges) {
        if (fEdge.targetNodeId === nodeId) {
          const srcData = this.nodeDataMap.get(fEdge.sourceNodeId)
          feedbackInputs[srcData?.label || fEdge.sourceNodeId] = this.nodeOutputs.get(fEdge.sourceNodeId)
        }
      }

      const executor = getExecutor(nodeData.type, nodeData.subType)
      const ctx: NodeExecutorContext = {
        nodeId,
        nodeType: nodeData.type,
        subType: nodeData.subType,
        label: nodeData.label,
        config: { ...nodeData.config, feedbackInputs },
        currentPrompt: nodeData.currentPrompt,
        provider: nodeData.provider,
        apiKeyId: nodeData.apiKeyId,
        inputs,
        executionId: this.executionId,
        workflowId: this.workflowId,
      }

      const result = await this.executeWithTimeout(executor, ctx)
      this.nodeOutputs.set(nodeId, result.output)

      await prisma.nodeExecutionResult.upsert({
        where: {
          executionId_nodeId_iteration: { executionId: this.executionId, nodeId, iteration: 1 },
        },
        create: {
          executionId: this.executionId,
          nodeId,
          status: 'success',
          iteration: 1,
          inputData: JSON.parse(JSON.stringify(inputs)),
          outputData: result.output as object,
          durationMs: result.durationMs,
          startedAt: new Date(Date.now() - result.durationMs),
          completedAt: new Date(),
        },
        update: {
          status: 'success',
          inputData: JSON.parse(JSON.stringify(inputs)),
          outputData: result.output as object,
          durationMs: result.durationMs,
          completedAt: new Date(),
        },
      })

      for (const srcId of sourceIds) {
        this.emit(SOCKET_EVENTS.EDGE_ACTIVE, { sourceId: srcId, targetId: nodeId, active: false })
      }

      // Review node: always pause for user review
      if (nodeData.type === NODE_TYPES.REVIEW) {
        this.isWaitingReview = true
        this.waitingReviewNodeId = nodeId
        this.isPaused = true

        this.emit(SOCKET_EVENTS.NODE_RUN_STATE_CHANGE, { nodeId, runState: 'waiting_review' })
        this.emit(SOCKET_EVENTS.NODE_OUTPUT_READY, { nodeId, output: result.output })
        this.emit(SOCKET_EVENTS.REVIEW_WAITING, { nodeId })

        await prisma.execution.update({
          where: { id: this.executionId },
          data: { status: 'paused', currentNodeId: nodeId },
        })
        return // Wait for handleReviewAction
      }

      this.emit(SOCKET_EVENTS.NODE_RUN_STATE_CHANGE, { nodeId, runState: 'success' })
      this.emit(SOCKET_EVENTS.NODE_OUTPUT_READY, { nodeId, output: result.output })

      // Check step mode pause
      const shouldPause = this.shouldPauseAfterNode()
      if (shouldPause) {
        this.isPaused = true
        this.emit(SOCKET_EVENTS.EXECUTION_PAUSED, { nodeId, reason: 'step' })

        await prisma.execution.update({
          where: { id: this.executionId },
          data: { status: 'paused', currentNodeId: nodeId },
        })
        return
      }

      this.currentIndex++
      await this.processNext()
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error desconocido'

      for (const srcId of sourceIds) {
        this.emit(SOCKET_EVENTS.EDGE_ACTIVE, { sourceId: srcId, targetId: nodeId, active: false })
      }

      this.emit(SOCKET_EVENTS.NODE_RUN_STATE_CHANGE, { nodeId, runState: 'error' })
      this.emit(SOCKET_EVENTS.NODE_ERROR, { nodeId, error: errorMsg })

      await prisma.nodeExecutionResult.upsert({
        where: {
          executionId_nodeId_iteration: { executionId: this.executionId, nodeId, iteration: 1 },
        },
        create: {
          executionId: this.executionId,
          nodeId,
          status: 'error',
          iteration: 1,
          errorMessage: errorMsg,
          startedAt: new Date(),
          completedAt: new Date(),
        },
        update: {
          status: 'error',
          errorMessage: errorMsg,
          completedAt: new Date(),
        },
      })

      await prisma.execution.update({
        where: { id: this.executionId },
        data: { status: 'failed', completedAt: new Date(), errorMessage: errorMsg },
      })
      this.emit(SOCKET_EVENTS.EXECUTION_COMPLETED, { status: 'failed', error: errorMsg })
      removeEngine(this.executionId)
    }
  }

  private shouldPauseAfterNode(): boolean {
    if (this.mode === 'step') return true
    return false
  }

  /**
   * Handle user action from the Review node.
   */
  async handleReviewAction(
    nodeId: string,
    action: 'continue' | 'promptFeedback' | 'dataFeedback',
    feedbackText?: string,
  ): Promise<void> {
    if (!this.isWaitingReview || this.waitingReviewNodeId !== nodeId) return

    this.isWaitingReview = false
    this.waitingReviewNodeId = null
    this.isPaused = false

    await prisma.execution.update({
      where: { id: this.executionId },
      data: { status: 'running', currentNodeId: null },
    })

    if (action === 'continue') {
      this.emit(SOCKET_EVENTS.NODE_RUN_STATE_CHANGE, { nodeId, runState: 'success' })
      this.currentIndex++
      await this.processNext()
      return
    }

    if (action === 'promptFeedback') {
      // Store the feedback text as output of the review node
      this.nodeOutputs.set(nodeId, feedbackText || '')
      this.emit(SOCKET_EVENTS.NODE_RUN_STATE_CHANGE, { nodeId, runState: 'success' })

      // Find the PromptHistory node connected via the 'promptFeedback' handle
      const promptFeedbackEdge = this.allEdges.find(
        (e) => e.sourceNodeId === nodeId && e.sourceHandle === 'promptFeedback',
      )
      if (!promptFeedbackEdge) {
        this.currentIndex++
        await this.processNext()
        return
      }

      const promptHistoryNodeId = promptFeedbackEdge.targetNodeId

      // Execute PromptHistory node manually
      await this.executeNodeManually(promptHistoryNodeId)

      // Find the CuboAI connected via feedback edge from PromptHistory
      const feedbackEdge = this.feedbackEdges.find(
        (e) => e.sourceNodeId === promptHistoryNodeId,
      )
      if (!feedbackEdge) {
        this.currentIndex++
        await this.processNext()
        return
      }

      const cuboNodeId = feedbackEdge.targetNodeId

      // Re-execute CuboAI with feedback context
      await this.executeNodeManually(cuboNodeId)

      // Re-execute Review node (which will pause again)
      await this.executeNodeManually(nodeId)
      return
    }

    if (action === 'dataFeedback') {
      // Emit signal to input node to allow editing
      const inputNodeId = this.findUpstreamInputNode(nodeId)
      if (inputNodeId) {
        this.emit(SOCKET_EVENTS.DATA_EDIT_SIGNAL, { nodeId: inputNodeId, feedbackText })
        this.emit(SOCKET_EVENTS.NODE_RUN_STATE_CHANGE, { nodeId: inputNodeId, runState: 'waiting_data_edit' })
      }

      // Mark review as waiting for data edit
      this.isWaitingReview = true
      this.waitingReviewNodeId = nodeId
      this.isPaused = true
      this.emit(SOCKET_EVENTS.NODE_RUN_STATE_CHANGE, { nodeId, runState: 'waiting_data_edit' })
      return
    }
  }

  /**
   * Execute a single node manually (used for feedback loops).
   */
  private async executeNodeManually(nodeId: string): Promise<void> {
    const nodeData = this.nodeDataMap.get(nodeId)
    if (!nodeData) return

    this.emit(SOCKET_EVENTS.NODE_RUN_STATE_CHANGE, { nodeId, runState: 'running' })

    // Gather inputs from all edges (including feedback edges for this node)
    const inputs: Record<string, unknown> = {}
    const normalSources = this.edgeMap.get(nodeId) || []
    for (const srcId of normalSources) {
      const srcData = this.nodeDataMap.get(srcId)
      inputs[srcData?.label || srcId] = this.nodeOutputs.get(srcId)
    }

    const feedbackInputs: Record<string, unknown> = {}
    for (const fEdge of this.feedbackEdges) {
      if (fEdge.targetNodeId === nodeId) {
        const srcData = this.nodeDataMap.get(fEdge.sourceNodeId)
        feedbackInputs[srcData?.label || fEdge.sourceNodeId] = this.nodeOutputs.get(fEdge.sourceNodeId)
      }
    }

    try {
      const executor = getExecutor(nodeData.type, nodeData.subType)
      const ctx: NodeExecutorContext = {
        nodeId,
        nodeType: nodeData.type,
        subType: nodeData.subType,
        label: nodeData.label,
        config: { ...nodeData.config, feedbackInputs },
        currentPrompt: nodeData.currentPrompt,
        provider: nodeData.provider,
        apiKeyId: nodeData.apiKeyId,
        inputs,
        executionId: this.executionId,
        workflowId: this.workflowId,
      }

      const result = await this.executeWithTimeout(executor, ctx)
      this.nodeOutputs.set(nodeId, result.output)

      if (nodeData.type === NODE_TYPES.REVIEW) {
        this.isWaitingReview = true
        this.waitingReviewNodeId = nodeId
        this.isPaused = true

        this.emit(SOCKET_EVENTS.NODE_RUN_STATE_CHANGE, { nodeId, runState: 'waiting_review' })
        this.emit(SOCKET_EVENTS.NODE_OUTPUT_READY, { nodeId, output: result.output })
        this.emit(SOCKET_EVENTS.REVIEW_WAITING, { nodeId })
        return
      }

      this.emit(SOCKET_EVENTS.NODE_RUN_STATE_CHANGE, { nodeId, runState: 'success' })
      this.emit(SOCKET_EVENTS.NODE_OUTPUT_READY, { nodeId, output: result.output })
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error desconocido'
      this.emit(SOCKET_EVENTS.NODE_RUN_STATE_CHANGE, { nodeId, runState: 'error' })
      this.emit(SOCKET_EVENTS.NODE_ERROR, { nodeId, error: errorMsg })
    }
  }

  /**
   * Find the upstream input node by walking backwards from the given node.
   */
  private findUpstreamInputNode(fromNodeId: string): string | null {
    const visited = new Set<string>()
    const queue = [fromNodeId]

    while (queue.length > 0) {
      const current = queue.shift()!
      if (visited.has(current)) continue
      visited.add(current)

      const nodeData = this.nodeDataMap.get(current)
      if (nodeData && nodeData.type === NODE_TYPES.INPUT) return current

      const sources = this.edgeMap.get(current) || []
      for (const srcId of sources) {
        if (!visited.has(srcId)) queue.push(srcId)
      }
    }

    return null
  }

  async resume(): Promise<void> {
    if (!this.isPaused) return
    this.isPaused = false
    this.isWaitingReview = false
    this.waitingReviewNodeId = null
    this.currentIndex++

    await prisma.execution.update({
      where: { id: this.executionId },
      data: { status: 'running', currentNodeId: null },
    })

    this.emit(SOCKET_EVENTS.EXECUTION_STARTED, { mode: this.mode })
    await this.processNext()
  }

  async step(): Promise<void> {
    if (!this.isPaused && this.currentIndex > 0) return
    const wasPaused = this.isPaused
    this.isPaused = false
    this.isWaitingReview = false
    this.waitingReviewNodeId = null
    if (this.currentIndex > 0 || wasPaused) this.currentIndex++

    await prisma.execution.update({
      where: { id: this.executionId },
      data: { status: 'running', currentNodeId: null },
    })

    const prevMode = this.mode
    this.mode = 'step'
    await this.processNext()
    this.mode = prevMode
  }

  async stop(): Promise<void> {
    this.isStopped = true
    this.isPaused = false
    this.isWaitingReview = false
    this.waitingReviewNodeId = null

    await prisma.execution.update({
      where: { id: this.executionId },
      data: { status: 'failed', completedAt: new Date(), errorMessage: 'Cancelado por el usuario' },
    })
    this.emit(SOCKET_EVENTS.EXECUTION_COMPLETED, { status: 'failed', error: 'Cancelado' })
    removeEngine(this.executionId)
  }

}
