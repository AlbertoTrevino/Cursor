import { useState, useCallback, useEffect } from 'react'
import { X, FileText, FileSpreadsheet, FileAudio, FileType, Download, Loader2, Key, CheckCircle, MessageSquare, PenLine } from 'lucide-react'
import { useWorkflowStore } from '@/store/workflowStore'
import { useExecutionStore } from '@/store/executionStore'
import { NODE_TYPES } from '@shared/nodeTypes'
import { INPUT_SUB_TYPES } from '@shared/inputSubTypes'
import { OUTPUT_SUB_TYPES } from '@shared/outputSubTypes'
import { AI_PROVIDERS, PROVIDER_LABELS } from '@shared/providers'
import InspectionPanel from './InspectionPanel'
import FileDropzone from './FileDropzone'
import { filesApi, downloadBlob } from '@/api/files.api'
import { executionApi } from '@/api/execution.api'
import toast from 'react-hot-toast'
import { apiKeysApi, type ApiKeyItem } from '@/api/apiKeys.api'

const inputSubTypeOptions = [
  { value: INPUT_SUB_TYPES.TEXT, label: 'Texto', icon: <FileText size={14} /> },
  { value: INPUT_SUB_TYPES.EXCEL, label: 'Excel', icon: <FileSpreadsheet size={14} /> },
  { value: INPUT_SUB_TYPES.PDF, label: 'PDF', icon: <FileType size={14} /> },
  { value: INPUT_SUB_TYPES.AUDIO, label: 'Audio', icon: <FileAudio size={14} /> },
]

const outputSubTypeOptions = [
  { value: OUTPUT_SUB_TYPES.EXCEL, label: 'Excel' },
]

function DownloadButton({ fileId, fileName }: { fileId: string; fileName: string }) {
  const [downloading, setDownloading] = useState(false)

  const handleDownload = useCallback(async () => {
    setDownloading(true)
    try {
      const { data } = await filesApi.download(fileId)
      downloadBlob(data, fileName)
    } catch {
      toast.error('Error al descargar archivo')
    } finally {
      setDownloading(false)
    }
  }, [fileId, fileName])

  return (
    <button
      onClick={handleDownload}
      disabled={downloading}
      className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg border border-amber-200 transition-colors disabled:opacity-50"
    >
      {downloading ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
      Descargar archivo generado
    </button>
  )
}

export default function NodeConfigPanel() {
  const { nodes, edges, selectedNodeId, selectNode, updateNodeData, removeNode } =
    useWorkflowStore()
  const isRunning = useExecutionStore((s) => s.isRunning)
  const executionId = useExecutionStore((s) => s.executionId)
  const nodeRunStates = useExecutionStore((s) => s.nodeRunStates)
  const nodeOutputs = useExecutionStore((s) => s.nodeOutputs)

  const [apiKeys, setApiKeys] = useState<ApiKeyItem[]>([])
  const [feedbackText, setFeedbackText] = useState('')
  const [sendingAction, setSendingAction] = useState(false)

  useEffect(() => {
    apiKeysApi.list().then((res) => setApiKeys(res.data)).catch(() => {
      toast.error('Error al cargar API keys')
    })
  }, [])

  const node = nodes.find((n) => n.id === selectedNodeId)
  if (!node) return null

  const data = node.data as Record<string, unknown>
  const nodeType = data.nodeType as string
  const nodeRunState = selectedNodeId ? nodeRunStates[selectedNodeId] : undefined
  const showInspection = isRunning || (nodeRunState && nodeRunState !== 'idle')

  const handleChange = (key: string, value: unknown) => {
    updateNodeData(node.id, { [key]: value })
  }

  const handleDelete = () => {
    removeNode(node.id)
  }

  const handleReviewAction = async (action: 'continue' | 'promptFeedback' | 'dataFeedback') => {
    if (!executionId || !selectedNodeId) return
    setSendingAction(true)
    try {
      await executionApi.reviewAction(executionId, selectedNodeId, action, feedbackText || undefined)
      setFeedbackText('')
    } catch {
      toast.error('Error al enviar acción')
    } finally {
      setSendingAction(false)
    }
  }

  // For review node: get the AI output from upstream
  const getUpstreamOutput = () => {
    if (!selectedNodeId) return null
    const incomingEdge = edges.find((e) => e.target === selectedNodeId)
    if (!incomingEdge) return null
    return nodeOutputs[incomingEdge.source] ?? null
  }

  // For prompt history: get the upstream CuboAI prompt
  const getConnectedCuboPrompt = () => {
    // Find CuboAI node connected downstream from this node
    const outEdge = edges.find((e) => e.source === selectedNodeId)
    if (!outEdge) return null
    const targetNode = nodes.find((n) => n.id === outEdge.target)
    if (!targetNode) return null
    const targetData = targetNode.data as Record<string, unknown>
    if (targetData.nodeType !== NODE_TYPES.CUBO_AI) return null
    return (targetData.prompt as string) || ''
  }

  return (
    <div className="fixed inset-y-0 right-0 z-40 w-80 bg-white border-l border-gray-200 flex flex-col overflow-hidden shadow-lg md:relative md:shadow-none md:z-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <h3 className="text-sm font-semibold text-gray-900">
          {nodeType === NODE_TYPES.INPUT && 'Configurar Entrada'}
          {nodeType === NODE_TYPES.CUBO_AI && 'Configurar Cubo AI'}
          {nodeType === NODE_TYPES.OUTPUT && 'Configurar Salida'}
          {nodeType === NODE_TYPES.REVIEW && 'Revisión'}
          {nodeType === NODE_TYPES.PROMPT_HISTORY && 'Historial Prompt'}
        </h3>
        <button
          onClick={() => selectNode(null)}
          className="p-1 text-gray-400 hover:text-gray-600 rounded"
          aria-label="Cerrar panel"
        >
          <X size={16} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Common: Label */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Nombre
          </label>
          <input
            type="text"
            value={(data.label as string) || ''}
            onChange={(e) => handleChange('label', e.target.value)}
            disabled={isRunning}
            className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-cubo-500 focus:border-cubo-500 outline-none disabled:opacity-60"
          />
        </div>

        {/* Input Node Config */}
        {nodeType === NODE_TYPES.INPUT && (
          <>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Tipo de entrada
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {inputSubTypeOptions.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => handleChange('subType', opt.value)}
                    disabled={isRunning}
                    className={`flex flex-col items-center gap-1 p-2 rounded-lg border text-xs transition-colors disabled:opacity-60 ${
                      data.subType === opt.value
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                        : 'border-gray-200 hover:border-gray-300 text-gray-600'
                    }`}
                  >
                    {opt.icon}
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {data.subType === INPUT_SUB_TYPES.TEXT && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Contenido de texto
                </label>
                <textarea
                  value={((data.config as Record<string, string>)?.text) || ''}
                  onChange={(e) =>
                    handleChange('config', { ...data.config as object, text: e.target.value })
                  }
                  disabled={isRunning}
                  rows={6}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-cubo-500 focus:border-cubo-500 outline-none resize-none disabled:opacity-60"
                  placeholder="Escribe o pega tu texto aquí..."
                />
              </div>
            )}

            {data.subType === INPUT_SUB_TYPES.EXCEL && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Archivo Excel
                </label>
                <FileDropzone
                  accept=".xlsx,.xls,.csv"
                  fileId={((data.config as Record<string, string>)?.fileId) || null}
                  fileName={((data.config as Record<string, string>)?.fileName) || null}
                  disabled={isRunning}
                  onFileUploaded={(fileId, fileName) =>
                    handleChange('config', { ...data.config as object, fileId, fileName })
                  }
                  onFileRemoved={() =>
                    handleChange('config', { ...data.config as object, fileId: null, fileName: null })
                  }
                />
              </div>
            )}

            {data.subType === INPUT_SUB_TYPES.PDF && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Archivo PDF
                </label>
                <FileDropzone
                  accept=".pdf"
                  fileId={((data.config as Record<string, string>)?.fileId) || null}
                  fileName={((data.config as Record<string, string>)?.fileName) || null}
                  disabled={isRunning}
                  onFileUploaded={(fileId, fileName) =>
                    handleChange('config', { ...data.config as object, fileId, fileName })
                  }
                  onFileRemoved={() =>
                    handleChange('config', { ...data.config as object, fileId: null, fileName: null })
                  }
                />
              </div>
            )}

            {data.subType === INPUT_SUB_TYPES.AUDIO && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Archivo de audio
                </label>
                <FileDropzone
                  accept=".mp3,.wav,.m4a,.webm,.ogg"
                  fileId={((data.config as Record<string, string>)?.fileId) || null}
                  fileName={((data.config as Record<string, string>)?.fileName) || null}
                  disabled={isRunning}
                  onFileUploaded={(fileId, fileName) =>
                    handleChange('config', { ...data.config as object, fileId, fileName })
                  }
                  onFileRemoved={() =>
                    handleChange('config', { ...data.config as object, fileId: null, fileName: null })
                  }
                />
              </div>
            )}
          </>
        )}

        {/* Cubo AI Node Config */}
        {nodeType === NODE_TYPES.CUBO_AI && (
          <>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Proveedor de IA
              </label>
              <select
                value={(data.provider as string) || AI_PROVIDERS.OPENAI}
                onChange={(e) => {
                  handleChange('provider', e.target.value)
                  const currentKey = apiKeys.find((k) => k.id === data.apiKeyId)
                  if (currentKey && currentKey.provider !== e.target.value) {
                    handleChange('apiKeyId', null)
                  }
                }}
                disabled={isRunning}
                className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-cubo-500 focus:border-cubo-500 outline-none disabled:opacity-60"
              >
                <option value={AI_PROVIDERS.OPENAI}>
                  {PROVIDER_LABELS[AI_PROVIDERS.OPENAI]}
                </option>
                <option value={AI_PROVIDERS.ANTHROPIC}>
                  {PROVIDER_LABELS[AI_PROVIDERS.ANTHROPIC]}
                </option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                <Key size={12} className="inline mr-1" />
                API Key
              </label>
              {apiKeys.filter((k) => k.provider === ((data.provider as string) || AI_PROVIDERS.OPENAI)).length === 0 ? (
                <p className="text-[10px] text-amber-600 bg-amber-50 px-2 py-1.5 rounded-lg border border-amber-200">
                  No hay API keys de {PROVIDER_LABELS[(data.provider as string) || AI_PROVIDERS.OPENAI]}. Agrégala en Configuración.
                </p>
              ) : (
                <select
                  value={(data.apiKeyId as string) || ''}
                  onChange={(e) => handleChange('apiKeyId', e.target.value || null)}
                  disabled={isRunning}
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-cubo-500 focus:border-cubo-500 outline-none disabled:opacity-60"
                >
                  <option value="">— Selecciona una API key —</option>
                  {apiKeys
                    .filter((k) => k.provider === ((data.provider as string) || AI_PROVIDERS.OPENAI))
                    .map((k) => (
                      <option key={k.id} value={k.id}>
                        {k.label} ({k.maskedKey})
                      </option>
                    ))}
                </select>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Prompt
              </label>
              <textarea
                value={(data.prompt as string) || ''}
                onChange={(e) => handleChange('prompt', e.target.value)}
                disabled={isRunning}
                rows={8}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-cubo-500 focus:border-cubo-500 outline-none resize-none font-mono disabled:opacity-60"
                placeholder="Escribe tu prompt aquí...&#10;&#10;Usa {{input_0}}, {{input_1}} para referenciar entradas."
              />
            </div>

            {data.output && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Resultado
                </label>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs text-gray-700 max-h-40 overflow-y-auto whitespace-pre-wrap">
                  {data.output as string}
                </div>
              </div>
            )}
          </>
        )}

        {/* Output Node Config */}
        {nodeType === NODE_TYPES.OUTPUT && (
          <>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Tipo de salida
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {outputSubTypeOptions.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => handleChange('subType', opt.value)}
                    disabled={isRunning}
                    className={`p-2 rounded-lg border text-xs transition-colors disabled:opacity-60 ${
                      data.subType === opt.value
                        ? 'border-amber-500 bg-amber-50 text-amber-700'
                        : 'border-gray-200 hover:border-gray-300 text-gray-600'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {data.subType === OUTPUT_SUB_TYPES.EXCEL && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Nombre del archivo
                </label>
                <input
                  type="text"
                  value={((data.config as Record<string, string>)?.fileName) || ''}
                  onChange={(e) =>
                    handleChange('config', { ...data.config as object, fileName: e.target.value })
                  }
                  disabled={isRunning}
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-cubo-500 focus:border-cubo-500 outline-none disabled:opacity-60"
                  placeholder="resultado.xlsx"
                />
              </div>
            )}

            {nodeRunState === 'success' && (data.output as Record<string, string>)?.fileId && (
              <DownloadButton
                fileId={(data.output as Record<string, string>).fileId}
                fileName={(data.output as Record<string, string>)?.fileName || 'resultado.xlsx'}
              />
            )}
          </>
        )}

        {/* Review Node Config */}
        {nodeType === NODE_TYPES.REVIEW && (
          <>
            {/* Show AI output when waiting for review */}
            {nodeRunState === 'waiting_review' && (
              <>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Resultado del AI
                  </label>
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-xs text-gray-700 max-h-60 overflow-y-auto whitespace-pre-wrap">
                    {(() => {
                      const output = getUpstreamOutput()
                      if (!output) return 'Sin resultado'
                      return typeof output === 'string' ? output : JSON.stringify(output, null, 2)
                    })()}
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-3">
                  <p className="text-xs font-medium text-gray-700 mb-2">
                    ¿Qué deseas hacer?
                  </p>

                  <button
                    onClick={() => handleReviewAction('continue')}
                    disabled={sendingAction}
                    className="w-full flex items-center gap-2 px-3 py-2 mb-2 text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100 rounded-lg border border-green-200 transition-colors disabled:opacity-50"
                  >
                    <CheckCircle size={14} />
                    Aprobar y continuar
                  </button>

                  <div className="space-y-2">
                    <textarea
                      value={feedbackText}
                      onChange={(e) => setFeedbackText(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none resize-none"
                      placeholder="Describe qué está mal..."
                    />

                    <button
                      onClick={() => handleReviewAction('promptFeedback')}
                      disabled={sendingAction || !feedbackText.trim()}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg border border-indigo-200 transition-colors disabled:opacity-50"
                    >
                      <MessageSquare size={14} />
                      Prompt incorrecto
                    </button>

                    <button
                      onClick={() => handleReviewAction('dataFeedback')}
                      disabled={sendingAction}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg border border-amber-200 transition-colors disabled:opacity-50"
                    >
                      <PenLine size={14} />
                      Datos iniciales incorrectos
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* When not in review state, show info */}
            {nodeRunState !== 'waiting_review' && (
              <p className="text-xs text-gray-500">
                Este nodo pausará la ejecución para que puedas revisar el resultado del AI y decidir si continuar, corregir el prompt, o editar los datos.
              </p>
            )}
          </>
        )}

        {/* Prompt History Node Config */}
        {nodeType === NODE_TYPES.PROMPT_HISTORY && (
          <>
            {/* Show connected CuboAI prompt */}
            {(() => {
              const cuboPrompt = getConnectedCuboPrompt()
              if (cuboPrompt !== null) {
                return (
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Prompt actual del Cubo AI
                    </label>
                    <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 text-xs text-gray-700 max-h-32 overflow-y-auto whitespace-pre-wrap font-mono">
                      {cuboPrompt || '(vacío)'}
                    </div>
                  </div>
                )
              }
              return null
            })()}

            {/* Show feedback history from output */}
            {(() => {
              const output = selectedNodeId ? nodeOutputs[selectedNodeId] as Record<string, unknown> | undefined : undefined
              if (!output) return null
              const history = output.feedbackHistory as { message: string; createdAt: string }[] | undefined
              if (!history || history.length === 0) return null
              return (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Historial de feedback ({history.length})
                  </label>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {history.map((f, i) => (
                      <div key={i} className="bg-gray-50 border border-gray-200 rounded p-2 text-[10px] text-gray-600">
                        {f.message}
                      </div>
                    ))}
                  </div>
                </div>
              )
            })()}

            <p className="text-xs text-gray-500">
              Este nodo acumula feedback sobre el prompt y genera sugerencias de mejora usando IA.
            </p>
          </>
        )}

        {/* Inspection panel during/after execution */}
        {showInspection && selectedNodeId && (
          <>
            <div className="border-t border-gray-200 my-2" />
            <InspectionPanel nodeId={selectedNodeId} nodeType={nodeType} />
          </>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-gray-200">
        <button
          onClick={handleDelete}
          disabled={isRunning}
          className="w-full px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-colors"
        >
          Eliminar nodo
        </button>
      </div>
    </div>
  )
}
