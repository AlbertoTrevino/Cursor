import { useEffect, useRef, useCallback, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ReactFlowProvider } from '@xyflow/react'
import toast from 'react-hot-toast'
import { workflowsApi } from '@/api/workflows.api'
import { useWorkflowStore } from '@/store/workflowStore'
import { useExecutionSocket } from '@/hooks/useExecutionSocket'
import WorkflowCanvas from '@/components/canvas/WorkflowCanvas'
import CanvasToolbar from '@/components/canvas/CanvasToolbar'
import NodeConfigPanel from '@/components/config-panel/NodeConfigPanel'

export default function WorkflowEditorPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const { nodes, edges, selectedNodeId, setWorkflow } = useWorkflowStore()

  // Connect to execution socket
  useExecutionSocket(id)

  // Track if we need to auto-save
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastSavedRef = useRef<string>('')

  // Load workflow from backend
  useEffect(() => {
    if (!id) return

    const loadWorkflow = async () => {
      try {
        const { data } = await workflowsApi.get(id)
        // Map DB type ("input"/"cuboAI"/"output") to React Flow type ("inputNode"/"cuboAINode"/"outputNode")
        const dbTypeToRFType: Record<string, string> = {
          input: 'inputNode',
          cuboAI: 'cuboAINode',
          output: 'outputNode',
          review: 'reviewNode',
          promptHistory: 'promptHistoryNode',
        }
        const loadedNodes = ((data.nodes || []) as Record<string, unknown>[]).map((n) => ({
          id: n.id as string,
          type: dbTypeToRFType[n.type as string] || 'inputNode',
          position: { x: n.positionX as number, y: n.positionY as number },
          data: {
            nodeType: n.type as string,
            label: n.label as string,
            subType: n.subType as string | undefined,
            config: n.config as Record<string, unknown> | undefined,
            prompt: n.currentPrompt as string | undefined,
            provider: n.provider as string | undefined,
            apiKeyId: n.apiKeyId as string | undefined,
            mode: (n.mode as string) || 'output_only',
            pauseForReview: (n.pauseForReview as boolean) || false,
            runState: 'idle',
            output: null,
          },
        }))
        const loadedEdges = ((data.edges || []) as Record<string, unknown>[]).map((e) => ({
          id: e.id as string,
          source: e.sourceNodeId as string,
          target: e.targetNodeId as string,
          sourceHandle: e.sourceHandle as string | undefined,
          targetHandle: e.targetHandle as string | undefined,
          type: 'smoothstep',
        }))
        setWorkflow(id, data.name, loadedNodes, loadedEdges)
        lastSavedRef.current = JSON.stringify({ nodes: loadedNodes, edges: loadedEdges })
      } catch {
        toast.error('Error al cargar el flujo')
        navigate('/')
      } finally {
        setLoading(false)
      }
    }

    loadWorkflow()
  }, [id, navigate, setWorkflow])

  // Auto-save (debounced 1s)
  const saveCanvas = useCallback(async () => {
    if (!id) return

    const payload = {
      nodes: nodes.map((n) => {
        const d = n.data as Record<string, unknown>
        return {
          id: n.id,
          type: n.type,
          positionX: n.position.x,
          positionY: n.position.y,
          nodeType: d.nodeType,
          label: d.label,
          subType: d.subType,
          config: d.config,
          currentPrompt: d.prompt,
          provider: d.provider,
          apiKeyId: d.apiKeyId,
        }
      }),
      edges: edges.map((e) => ({
        id: e.id,
        sourceNodeId: e.source,
        targetNodeId: e.target,
        sourceHandle: e.sourceHandle,
        targetHandle: e.targetHandle,
      })),
    }

    const serialized = JSON.stringify(payload)
    if (serialized === lastSavedRef.current) return

    try {
      await workflowsApi.saveCanvas(id, payload)
      lastSavedRef.current = serialized
    } catch {
      toast.error('Error al guardar el flujo')
    }
  }, [id, nodes, edges])

  useEffect(() => {
    if (loading) return

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current)
    }
    saveTimerRef.current = setTimeout(saveCanvas, 1000)

    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current)
      }
    }
  }, [nodes, edges, saveCanvas, loading])

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-400 text-sm">Cargando flujo...</div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <ReactFlowProvider>
        <CanvasToolbar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <div className="flex flex-1 overflow-hidden min-h-0">
            <WorkflowCanvas />
            {selectedNodeId && <NodeConfigPanel />}
          </div>
        </div>
      </ReactFlowProvider>
    </div>
  )
}
