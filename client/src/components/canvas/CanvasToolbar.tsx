import { useMemo } from 'react'
import {
  ArrowLeft,
  FileInput,
  Box,
  FileOutput,
  Eye,
  History,
  Play,
  FastForward,
  SkipForward,
  Square,
  Settings,
  Loader2,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useWorkflowStore } from '@/store/workflowStore'
import { useExecutionStore } from '@/store/executionStore'
import { executionApi } from '@/api/execution.api'
import { getApiErrorMessage } from '@/utils/getApiError'
import {
  createInputNode,
  createCuboAINode,
  createOutputNode,
  createReviewNode,
  createPromptHistoryNode,
  getNextNodePosition,
} from '@/utils/nodeFactory'

export default function CanvasToolbar() {
  const navigate = useNavigate()
  const { nodes, addNode, workflowName, workflowId } = useWorkflowStore()
  const {
    isRunning,
    isPaused,
    executionId,
    startExecution,
    nodeRunStates,
  } = useExecutionStore()

  const canAddNodes = !isRunning

  const progress = useMemo(() => {
    if (!isRunning && Object.keys(nodeRunStates).length === 0) return null
    const total = nodes.length
    const completed = Object.values(nodeRunStates).filter(
      (s) => s === 'success' || s === 'error',
    ).length
    const runningNode = nodes.find((n) => nodeRunStates[n.id] === 'running')
    const runningLabel = runningNode
      ? (runningNode.data as Record<string, unknown>).label as string
      : null
    return { total, completed, runningLabel }
  }, [isRunning, nodeRunStates, nodes])

  const handleAddInput = () => {
    if (!canAddNodes) return
    const pos = getNextNodePosition(nodes)
    addNode(createInputNode(pos))
  }

  const handleAddCuboAI = () => {
    if (!canAddNodes) return
    const pos = getNextNodePosition(nodes)
    addNode(createCuboAINode(pos))
  }

  const handleAddOutput = () => {
    if (!canAddNodes) return
    const pos = getNextNodePosition(nodes)
    addNode(createOutputNode(pos))
  }

  const handleAddReview = () => {
    if (!canAddNodes) return
    const pos = getNextNodePosition(nodes)
    addNode(createReviewNode(pos))
  }

  const handleAddPromptHistory = () => {
    if (!canAddNodes) return
    const pos = getNextNodePosition(nodes)
    addNode(createPromptHistoryNode(pos))
  }

  const handlePlay = async () => {
    if (!workflowId) return
    try {
      if (isPaused && executionId) {
        await executionApi.resume(executionId)
        return
      }
      const { data } = await executionApi.start(workflowId, 'play')
      startExecution(data.executionId, 'play')
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Error al ejecutar'))
    }
  }

  const handleAutorun = async () => {
    if (!workflowId) return
    try {
      const { data } = await executionApi.start(workflowId, 'autorun')
      startExecution(data.executionId, 'autorun')
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Error al ejecutar'))
    }
  }

  const handleStep = async () => {
    if (!workflowId) return
    try {
      if (isPaused && executionId) {
        await executionApi.step(executionId)
        return
      }
      const { data } = await executionApi.start(workflowId, 'step')
      startExecution(data.executionId, 'step')
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Error al ejecutar paso'))
    }
  }

  const handleStop = async () => {
    if (!executionId) return
    try {
      await executionApi.stop(executionId)
    } catch {
      // Best-effort stop
    }
    useExecutionStore.getState().reset()
  }

  return (
    <div className="h-12 bg-white border-b border-gray-200 flex items-center px-2 md:px-3 gap-1 md:gap-2 flex-shrink-0 overflow-x-auto">
      <button
        onClick={() => navigate('/')}
        className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
        title="Volver al dashboard"
      >
        <ArrowLeft size={18} />
      </button>

      <span className="text-sm font-semibold text-gray-700 mr-1 md:mr-3 truncate max-w-24 md:max-w-48 hidden sm:inline">
        {workflowName || 'Sin nombre'}
      </span>

      <div className="w-px h-6 bg-gray-200 flex-shrink-0 hidden sm:block" />

      <button
        onClick={handleAddInput}
        disabled={!canAddNodes}
        className="flex items-center gap-1.5 px-2 md:px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-colors flex-shrink-0"
        title="Entrada"
      >
        <FileInput size={14} />
        <span className="hidden lg:inline">Entrada</span>
      </button>

      <button
        onClick={handleAddCuboAI}
        disabled={!canAddNodes}
        className="flex items-center gap-1.5 px-2 md:px-3 py-1.5 text-xs font-medium text-cubo-700 bg-cubo-50 hover:bg-cubo-100 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-colors flex-shrink-0"
        title="Cubo AI"
      >
        <Box size={14} />
        <span className="hidden lg:inline">Cubo AI</span>
      </button>

      <button
        onClick={handleAddOutput}
        disabled={!canAddNodes}
        className="flex items-center gap-1.5 px-2 md:px-3 py-1.5 text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-colors flex-shrink-0"
        title="Salida"
      >
        <FileOutput size={14} />
        <span className="hidden lg:inline">Salida</span>
      </button>

      <button
        onClick={handleAddReview}
        disabled={!canAddNodes}
        className="flex items-center gap-1.5 px-2 md:px-3 py-1.5 text-xs font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-colors flex-shrink-0"
        title="Revisión"
      >
        <Eye size={14} />
        <span className="hidden lg:inline">Revisión</span>
      </button>

      <button
        onClick={handleAddPromptHistory}
        disabled={!canAddNodes}
        className="flex items-center gap-1.5 px-2 md:px-3 py-1.5 text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-colors flex-shrink-0"
        title="Historial"
      >
        <History size={14} />
        <span className="hidden lg:inline">Historial</span>
      </button>

      <div className="flex-1 flex items-center justify-center min-w-0">
        {progress && (isRunning || progress.completed > 0) && (
          <div className="flex items-center gap-2">
            {progress.runningLabel && (
              <div className="flex items-center gap-1.5 text-xs text-blue-600 hidden md:flex">
                <Loader2 size={12} className="animate-spin" />
                <span className="font-medium truncate max-w-24">{progress.runningLabel}</span>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <div className="w-16 md:w-24 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 rounded-full transition-all duration-500"
                  style={{ width: `${progress.total > 0 ? (progress.completed / progress.total) * 100 : 0}%` }}
                />
              </div>
              <span className="text-[10px] text-gray-500 font-medium">
                {progress.completed}/{progress.total}
              </span>
            </div>
          </div>
        )}
      </div>

      {isRunning && (
        <button
          onClick={handleStop}
          className="flex items-center gap-1.5 px-2 md:px-3 py-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors flex-shrink-0"
          title="Detener"
        >
          <Square size={14} fill="currentColor" />
          <span className="hidden md:inline">Detener</span>
        </button>
      )}

      <button
        onClick={handleStep}
        disabled={nodes.length === 0 || (isRunning && !isPaused)}
        className="flex items-center gap-1.5 px-2 md:px-3 py-1.5 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-colors flex-shrink-0"
        title={isPaused ? 'Siguiente nodo' : 'Paso a paso'}
      >
        <SkipForward size={14} />
        <span className="hidden md:inline">{isPaused ? 'Siguiente' : 'Step'}</span>
      </button>

      <button
        onClick={handleAutorun}
        disabled={isRunning || nodes.length === 0}
        className="flex items-center gap-1.5 px-2 md:px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-colors flex-shrink-0"
        title="Auto-run (sin pausas)"
      >
        <FastForward size={14} />
        <span className="hidden md:inline">Auto</span>
      </button>

      <button
        onClick={handlePlay}
        disabled={nodes.length === 0 || (isRunning && !isPaused)}
        className="flex items-center gap-1.5 px-3 md:px-4 py-1.5 text-xs font-semibold text-white bg-green-600 hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-colors flex-shrink-0"
        title={isPaused ? 'Continuar' : 'Ejecutar'}
      >
        <Play size={14} fill="currentColor" />
        <span className="hidden md:inline">{isPaused ? 'Continuar' : isRunning ? 'Ejecutando...' : 'Ejecutar'}</span>
      </button>

      <button
        onClick={() => navigate('/configuracion')}
        className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
        title="Configuración"
      >
        <Settings size={18} />
      </button>
    </div>
  )
}
