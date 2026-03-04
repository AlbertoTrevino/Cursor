import { useCallback, useMemo } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  type NodeTypes,
  type Connection,
  type Edge,
  BackgroundVariant,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useWorkflowStore } from '@/store/workflowStore'
import { useExecutionStore } from '@/store/executionStore'
import InputNode from '@/components/nodes/InputNode'
import CuboAINode from '@/components/nodes/CuboAINode'
import OutputNode from '@/components/nodes/OutputNode'
import ReviewNode from '@/components/nodes/ReviewNode'
import PromptHistoryNode from '@/components/nodes/PromptHistoryNode'
import { NODE_TYPES } from '@shared/nodeTypes'

const nodeTypes: NodeTypes = {
  inputNode: InputNode,
  cuboAINode: CuboAINode,
  outputNode: OutputNode,
  reviewNode: ReviewNode,
  promptHistoryNode: PromptHistoryNode,
}

// Validate connections: prevent cycles and only allow valid source→target types
function isValidConnection(connection: Connection, nodes: { id: string; data: Record<string, unknown> }[]): boolean {
  const sourceNode = nodes.find((n) => n.id === connection.source)
  const targetNode = nodes.find((n) => n.id === connection.target)
  if (!sourceNode || !targetNode) return false

  const sourceType = sourceNode.data.nodeType as string
  const targetType = targetNode.data.nodeType as string

  // Output nodes can't be sources
  if (sourceType === NODE_TYPES.OUTPUT) return false
  // Input nodes can't be targets
  if (targetType === NODE_TYPES.INPUT) return false
  // No self-connections
  if (connection.source === connection.target) return false
  // PromptHistory can only connect to CuboAI (feedback handle)
  if (sourceType === NODE_TYPES.PROMPT_HISTORY && targetType !== NODE_TYPES.CUBO_AI) return false

  return true
}

export default function WorkflowCanvas() {
  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    selectNode,
  } = useWorkflowStore()

  const { nodeRunStates, nodeOutputs, activeEdges, isRunning } = useExecutionStore()

  // Merge execution state into node data
  const enrichedNodes = useMemo(() => {
    if (!isRunning && Object.keys(nodeRunStates).length === 0) return nodes
    return nodes.map((node) => ({
      ...node,
      data: {
        ...node.data,
        runState: nodeRunStates[node.id] || node.data.runState || 'idle',
        output: nodeOutputs[node.id] ?? node.data.output ?? null,
      },
    }))
  }, [nodes, nodeRunStates, nodeOutputs, isRunning])

  // Animate active edges
  const enrichedEdges = useMemo(() => {
    if (activeEdges.size === 0) return edges
    return edges.map((edge: Edge) => ({
      ...edge,
      animated: activeEdges.has(edge.id),
      className: activeEdges.has(edge.id) ? 'edge-active' : '',
    }))
  }, [edges, activeEdges])

  const handleConnect = useCallback(
    (connection: Connection) => {
      if (isValidConnection(connection, enrichedNodes as { id: string; data: Record<string, unknown> }[])) {
        onConnect(connection)
      }
    },
    [enrichedNodes, onConnect],
  )

  const handleNodeClick = useCallback(
    (_event: React.MouseEvent, node: { id: string }) => {
      selectNode(node.id)
    },
    [selectNode],
  )

  const handlePaneClick = useCallback(() => {
    selectNode(null)
  }, [selectNode])

  const defaultEdgeOptions = useMemo(
    () => ({
      type: 'smoothstep',
      style: { stroke: '#94a3b8', strokeWidth: 2 },
    }),
    [],
  )

  return (
    <div className="flex-1 relative">
      <ReactFlow
        nodes={enrichedNodes}
        edges={enrichedEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={handleConnect}
        onNodeClick={handleNodeClick}
        onPaneClick={handlePaneClick}
        nodeTypes={nodeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        deleteKeyCode={isRunning ? [] : ['Backspace', 'Delete']}
        nodesDraggable={!isRunning}
        nodesConnectable={!isRunning}
        elementsSelectable={true}
        snapToGrid
        snapGrid={[16, 16]}
        minZoom={0.3}
        maxZoom={2}
      >
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="#e2e8f0" />
        <Controls
          showInteractive={false}
          className="!bg-white !border-gray-200 !shadow-sm !rounded-lg"
        />
        <MiniMap
          nodeStrokeWidth={2}
          className="!bg-white !border-gray-200 !shadow-sm !rounded-lg"
          maskColor="rgba(0,0,0,0.08)"
          pannable
          zoomable
        />
      </ReactFlow>

      {/* Empty state */}
      {nodes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <p className="text-gray-400 text-sm">
              Usa los botones de arriba para agregar nodos
            </p>
            <p className="text-gray-300 text-xs mt-1">
              Entrada → Cubo AI → Salida
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
