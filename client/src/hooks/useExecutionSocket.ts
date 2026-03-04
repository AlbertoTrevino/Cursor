import { useEffect } from 'react'
import { SOCKET_EVENTS } from '@shared/socketEvents'
import type { RunState } from '@shared/runState'
import { getSocket, connectSocket, disconnectSocket } from '../utils/socket'
import { useExecutionStore } from '../store/executionStore'
import { useWorkflowStore } from '../store/workflowStore'

export function useExecutionSocket(workflowId: string | undefined) {
  useEffect(() => {
    if (!workflowId) return

    connectSocket()
    const socket = getSocket()

    socket.emit(SOCKET_EVENTS.JOIN_WORKFLOW, workflowId)

    socket.on(SOCKET_EVENTS.EXECUTION_STARTED, (data: { executionId: string }) => {
      // Already handled by the API call response, but sync if needed
      const store = useExecutionStore.getState()
      if (!store.executionId) {
        store.startExecution(data.executionId, store.executionMode || 'play')
      }
    })

    socket.on(SOCKET_EVENTS.NODE_RUN_STATE_CHANGE, (data: { nodeId: string; runState: RunState }) => {
      useExecutionStore.getState().setNodeRunState(data.nodeId, data.runState)
    })

    socket.on(SOCKET_EVENTS.NODE_OUTPUT_READY, (data: { nodeId: string; output: unknown }) => {
      useExecutionStore.getState().setNodeOutput(data.nodeId, data.output)
    })

    socket.on(SOCKET_EVENTS.EDGE_ACTIVE, (data: { sourceId: string; targetId: string; active: boolean }) => {
      // Find edge by source+target since engine doesn't know ReactFlow edge IDs
      const edges = useWorkflowStore.getState().edges
      const edge = edges.find((e) => e.source === data.sourceId && e.target === data.targetId)
      if (edge) {
        useExecutionStore.getState().setActiveEdge(edge.id, data.active)
      }
    })

    socket.on(SOCKET_EVENTS.EXECUTION_PAUSED, (data: { nodeId: string; reason: 'review' | 'step' }) => {
      useExecutionStore.getState().setPaused(data.nodeId, data.reason)
    })

    socket.on(SOCKET_EVENTS.REVIEW_WAITING, (data: { nodeId: string }) => {
      useExecutionStore.getState().setPaused(data.nodeId, 'review')
    })

    socket.on(SOCKET_EVENTS.EXECUTION_COMPLETED, () => {
      useExecutionStore.getState().completeExecution()
    })

    socket.on(SOCKET_EVENTS.NODE_ERROR, (data: { nodeId: string; error: string }) => {
      useExecutionStore.getState().setNodeRunState(data.nodeId, 'error')
      useExecutionStore.getState().appendLog({
        timestamp: new Date().toISOString(),
        message: data.error,
        level: 'error',
        nodeId: data.nodeId,
      })
    })

    socket.on(SOCKET_EVENTS.EXECUTION_LOG, (data: { message: string; level: 'info' | 'warn' | 'error'; nodeId?: string }) => {
      useExecutionStore.getState().appendLog({
        timestamp: new Date().toISOString(),
        ...data,
      })
    })

    return () => {
      socket.emit(SOCKET_EVENTS.LEAVE_WORKFLOW, workflowId)
      socket.off(SOCKET_EVENTS.EXECUTION_STARTED)
      socket.off(SOCKET_EVENTS.NODE_RUN_STATE_CHANGE)
      socket.off(SOCKET_EVENTS.NODE_OUTPUT_READY)
      socket.off(SOCKET_EVENTS.EDGE_ACTIVE)
      socket.off(SOCKET_EVENTS.EXECUTION_PAUSED)
      socket.off(SOCKET_EVENTS.REVIEW_WAITING)
      socket.off(SOCKET_EVENTS.EXECUTION_COMPLETED)
      socket.off(SOCKET_EVENTS.NODE_ERROR)
      socket.off(SOCKET_EVENTS.EXECUTION_LOG)
      disconnectSocket()
    }
  }, [workflowId])
}
