import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Save, Trash2, Sparkles,
  Copy, Check, FileText, Zap, Download, History
} from 'lucide-react'
import { ideasApi } from '@/api/ideas.api'
import type { Idea, NamingSuggestion, IdeaVersionSummary } from '@/types/idea'
import ClarificationDialog from '@/components/ideas/ClarificationDialog'
import AIProcessingView from '@/components/ideas/AIProcessingView'
import HandoffDisplay from '@/components/ideas/HandoffDisplay'
import DiagramSection from '@/components/ideas/DiagramSection'
import FileUploadZone from '@/components/ideas/FileUploadZone'
import NamingSuggestions from '@/components/ideas/NamingSuggestions'
import ConfirmDialog from '@/components/ideas/ConfirmDialog'
import toast from 'react-hot-toast'

export default function IdeaDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [idea, setIdea] = useState<Idea | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [processingStep, setProcessingStep] = useState('')
  const [copied, setCopied] = useState(false)
  const [namingSuggestions, setNamingSuggestions] = useState<NamingSuggestion[]>([])
  const [checkingNames, setCheckingNames] = useState(false)
  const [activeTab, setActiveTab] = useState<'edit' | 'result'>('edit')
  const [isDirty, setIsDirty] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [versions, setVersions] = useState<IdeaVersionSummary[]>([])
  const [showVersions, setShowVersions] = useState(false)
  const abortControllerRef = useRef<AbortController | null>(null)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [mode, setMode] = useState<'simple' | 'complex'>('simple')
  const [projectContext, setProjectContext] = useState('')
  const [affectedAreas, setAffectedAreas] = useState('')
  const [structuralNotes, setStructuralNotes] = useState('')

  const fetchIdea = useCallback(async () => {
    if (!id) return
    try {
      const { data } = await ideasApi.get(id)
      setIdea(data)
      setTitle(data.title)
      setDescription(data.description)
      setMode(data.mode)
      setProjectContext(data.projectContext || '')
      setAffectedAreas(data.affectedAreas || '')
      setStructuralNotes(data.structuralNotes || '')
      setIsDirty(false)
      if (data.status === 'done') setActiveTab('result')
    } catch {
      toast.error('Error al cargar la idea')
      navigate('/ideas')
    } finally {
      setLoading(false)
    }
  }, [id, navigate])

  useEffect(() => {
    fetchIdea()
  }, [fetchIdea])

  // Unsaved changes warning
  useEffect(() => {
    if (!isDirty) return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [isDirty])

  const markDirty = () => setIsDirty(true)

  const handleSave = async () => {
    if (!id || !idea) return
    setSaving(true)
    try {
      const { data } = await ideasApi.update(id, {
        title: title.trim(),
        description: description.trim(),
        mode,
        projectContext: mode === 'complex' ? projectContext.trim() || null : null,
        affectedAreas: mode === 'complex' ? affectedAreas.trim() || null : null,
        structuralNotes: mode === 'complex' ? structuralNotes.trim() || null : null,
      })
      setIdea({ ...idea, ...data })
      setIsDirty(false)
      toast.success('Idea guardada')
    } catch {
      toast.error('Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const handleProcess = async () => {
    if (!id || !idea) return

    setProcessing(true)
    const controller = new AbortController()
    abortControllerRef.current = controller

    try {
      setProcessingStep('Guardando idea...')
      await ideasApi.update(id, {
        title: title.trim(),
        description: description.trim(),
        mode,
        projectContext: mode === 'complex' ? projectContext.trim() || null : null,
        affectedAreas: mode === 'complex' ? affectedAreas.trim() || null : null,
        structuralNotes: mode === 'complex' ? structuralNotes.trim() || null : null,
      })
      setIsDirty(false)

      setProcessingStep('Analizando si necesita aclaración...')
      const { data: clarification } = await ideasApi.checkClarification(id)

      if (clarification.needsClarification) {
        setProcessingStep('')
        setProcessing(false)
        const { data: refreshed } = await ideasApi.get(id)
        setIdea(refreshed)
        return
      }

      setProcessingStep('Enviando a Claude y GPT, combinando respuestas...')
      await ideasApi.process(id, controller.signal)

      const { data: refreshed } = await ideasApi.get(id)
      setIdea(refreshed)
      setActiveTab('result')
      toast.success('Idea procesada exitosamente')
    } catch (err: any) {
      if (err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED') {
        toast('Procesamiento cancelado')
      } else {
        const msg = err?.response?.data?.message || 'Error al procesar'
        toast.error(msg)
      }
    } finally {
      setProcessing(false)
      setProcessingStep('')
      abortControllerRef.current = null
    }
  }

  const handleCancelProcessing = () => {
    abortControllerRef.current?.abort()
    setProcessing(false)
    setProcessingStep('')
  }

  const handleClarificationAnswered = async () => {
    if (!id) return
    const { data } = await ideasApi.get(id)
    setIdea(data)
    toast.success('Respuestas guardadas. Puedes procesar la idea ahora.')
  }

  const handleCheckNaming = async () => {
    const text = `${title}\n${description}\n${projectContext}\n${affectedAreas}\n${structuralNotes}`
    setCheckingNames(true)
    try {
      const { data } = await ideasApi.checkNaming(text)
      setNamingSuggestions(data.suggestions)
      if (data.suggestions.length === 0) {
        toast.success('Nombres consistentes — no hay sugerencias')
      }
    } catch {
      toast.error('Error al verificar nombres')
    } finally {
      setCheckingNames(false)
    }
  }

  const handleCopyHandoff = () => {
    if (!idea?.handoffText) return
    navigator.clipboard.writeText(idea.handoffText)
    setCopied(true)
    toast.success('Handoff copiado al portapapeles')
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownloadHandoff = () => {
    if (!idea?.handoffText) return
    const blob = new Blob([idea.handoffText], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `handoff-${idea.title.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleDelete = async () => {
    if (!id) return
    try {
      await ideasApi.delete(id)
      toast.success('Idea eliminada')
      navigate('/ideas')
    } catch {
      toast.error('Error al eliminar')
    }
  }

  const handleAttachmentUploaded = async () => {
    if (!id) return
    const { data } = await ideasApi.get(id)
    setIdea(data)
  }

  const handleDiagramsChanged = async () => {
    if (!id) return
    const { data } = await ideasApi.get(id)
    setIdea(data)
  }

  const handleShowVersions = async () => {
    if (!id) return
    try {
      const { data } = await ideasApi.listVersions(id)
      setVersions(data)
      setShowVersions(true)
    } catch {
      toast.error('Error al cargar versiones')
    }
  }

  const handleNavigateAway = () => {
    if (isDirty) {
      if (!window.confirm('Tienes cambios sin guardar. ¿Salir de todos modos?')) return
    }
    navigate('/ideas')
  }

  if (loading) {
    return (
      <div className="p-8 max-w-5xl mx-auto">
        <div className="h-8 w-48 bg-gray-100 rounded animate-pulse mb-6" />
        <div className="h-64 bg-gray-100 rounded-xl animate-pulse" />
      </div>
    )
  }

  if (!idea) return null

  const hasUnansweredQuestions = idea.questions.some(q => !q.answer)
  const showClarification = idea.status === 'clarifying' || (idea.questions.length > 0 && hasUnansweredQuestions)

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <ConfirmDialog
        open={deleteConfirm}
        title="Eliminar idea"
        message={`¿Estás seguro de eliminar "${idea.title}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        variant="danger"
        onConfirm={() => { setDeleteConfirm(false); handleDelete() }}
        onCancel={() => setDeleteConfirm(false)}
      />

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={handleNavigateAway}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft size={16} />
          Volver a Ideas
          {isDirty && <span className="ml-1 text-amber-500 text-xs">(sin guardar)</span>}
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCheckNaming}
            disabled={checkingNames}
            className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            title="Verificar consistencia de nombres"
          >
            {checkingNames ? 'Verificando...' : 'Verificar Nombres'}
          </button>
          <button
            onClick={handleShowVersions}
            className="p-2 text-gray-400 hover:text-cubo-600 rounded-lg hover:bg-cubo-50"
            title="Historial de versiones"
          >
            <History size={16} />
          </button>
          <button
            onClick={() => setDeleteConfirm(true)}
            className="p-2 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50"
            title="Eliminar idea"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* Processing overlay */}
      {processing && (
        <AIProcessingView step={processingStep} onCancel={handleCancelProcessing} />
      )}

      {/* Version history panel */}
      {showVersions && (
        <div className="mb-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm text-gray-800 flex items-center gap-1.5">
              <History size={16} />
              Historial de Versiones
            </h3>
            <button onClick={() => setShowVersions(false)} className="text-xs text-gray-500 hover:text-gray-700">
              Cerrar
            </button>
          </div>
          {versions.length === 0 ? (
            <p className="text-sm text-gray-400">No hay versiones anteriores</p>
          ) : (
            <div className="space-y-1.5">
              {versions.map(v => (
                <div key={v.id} className="flex items-center gap-3 text-sm px-3 py-2 bg-white rounded-lg border border-gray-100">
                  <span className="font-mono text-xs text-gray-400">v{v.version}</span>
                  <span className="text-gray-600">{new Date(v.createdAt).toLocaleString('es-MX')}</span>
                  {v.recommendation && (
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      v.recommendation === 'agent' ? 'bg-orange-50 text-orange-600' : 'bg-blue-50 text-blue-600'
                    }`}>
                      {v.recommendation}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab('edit')}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'edit'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Editar
        </button>
        <button
          onClick={() => setActiveTab('result')}
          disabled={!idea.handoffText}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'result'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          } disabled:opacity-40 disabled:cursor-not-allowed`}
        >
          Resultado
        </button>
      </div>

      {activeTab === 'edit' ? (
        <div className="space-y-6">
          {/* Mode toggle */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => { setMode('simple'); markDirty() }}
              className={`p-3 rounded-xl border-2 text-left transition-all ${
                mode === 'simple'
                  ? 'border-cubo-500 bg-cubo-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <FileText size={18} className={mode === 'simple' ? 'text-cubo-600' : 'text-gray-400'} />
                <span className="font-medium text-sm text-gray-900">Cambio Simple</span>
              </div>
            </button>
            <button
              type="button"
              onClick={() => { setMode('complex'); markDirty() }}
              className={`p-3 rounded-xl border-2 text-left transition-all ${
                mode === 'complex'
                  ? 'border-purple-500 bg-purple-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <Zap size={18} className={mode === 'complex' ? 'text-purple-600' : 'text-gray-400'} />
                <span className="font-medium text-sm text-gray-900">Cambio Complejo</span>
              </div>
            </button>
          </div>

          {/* Title */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">Título</label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => { setTitle(e.target.value); markDirty() }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cubo-500 focus:border-cubo-500 outline-none"
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => { setDescription(e.target.value); markDirty() }}
              rows={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cubo-500 focus:border-cubo-500 outline-none resize-y"
            />
          </div>

          {/* Complex fields */}
          {mode === 'complex' && (
            <div className="space-y-4 p-4 bg-purple-50/50 rounded-xl border border-purple-100">
              <h3 className="text-sm font-semibold text-purple-800">Detalles del Cambio Complejo</h3>
              <div>
                <label htmlFor="projectContext" className="block text-sm font-medium text-gray-700 mb-1">Contexto del Proyecto</label>
                <textarea id="projectContext" value={projectContext} onChange={(e) => { setProjectContext(e.target.value); markDirty() }}
                  placeholder="¿Qué proyecto es? ¿Tecnologías? ¿Estado actual?" rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cubo-500 focus:border-cubo-500 outline-none resize-y" />
              </div>
              <div>
                <label htmlFor="affectedAreas" className="block text-sm font-medium text-gray-700 mb-1">Áreas Afectadas</label>
                <textarea id="affectedAreas" value={affectedAreas} onChange={(e) => { setAffectedAreas(e.target.value); markDirty() }}
                  placeholder="Frontend, Backend, DB, API..." rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cubo-500 focus:border-cubo-500 outline-none resize-y" />
              </div>
              <div>
                <label htmlFor="structuralNotes" className="block text-sm font-medium text-gray-700 mb-1">Notas Estructurales</label>
                <textarea id="structuralNotes" value={structuralNotes} onChange={(e) => { setStructuralNotes(e.target.value); markDirty() }}
                  placeholder="Cambios de arquitectura, módulos nuevos..." rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cubo-500 focus:border-cubo-500 outline-none resize-y" />
              </div>
            </div>
          )}

          {namingSuggestions.length > 0 && (
            <NamingSuggestions suggestions={namingSuggestions} onDismiss={() => setNamingSuggestions([])} />
          )}

          {showClarification && (
            <ClarificationDialog ideaId={idea.id} questions={idea.questions} onAnswered={handleClarificationAnswered} />
          )}

          <FileUploadZone ideaId={idea.id} attachments={idea.attachments} onChanged={handleAttachmentUploaded} />
          <DiagramSection ideaId={idea.id} diagrams={idea.diagrams} onChanged={handleDiagramsChanged} />

          {/* Actions */}
          <div className="flex justify-between items-center pt-4 border-t border-gray-200">
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-2 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50">
              <Save size={16} />
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
            <button onClick={handleProcess} disabled={processing || !title.trim() || !description.trim()}
              className="flex items-center gap-2 px-5 py-2.5 bg-cubo-600 text-white rounded-lg hover:bg-cubo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium">
              <Sparkles size={18} />
              {processing ? 'Procesando...' : 'Procesar con AI'}
            </button>
          </div>
        </div>
      ) : (
        /* Result tab */
        <div className="space-y-6">
          {idea.recommendation && (
            <div className={`p-4 rounded-xl border-2 ${
              idea.recommendation === 'agent' ? 'border-orange-200 bg-orange-50' : 'border-blue-200 bg-blue-50'
            }`}>
              <span className={`text-lg font-bold ${
                idea.recommendation === 'agent' ? 'text-orange-700' : 'text-blue-700'
              }`}>
                Recomendado: {idea.recommendation === 'agent' ? 'Agent Mode' : 'Plan Mode'}
              </span>
              {idea.recommendReason && <p className="text-sm mt-1 text-gray-600">{idea.recommendReason}</p>}
            </div>
          )}

          {idea.handoffText && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-gray-900">Handoff para Cursor</h3>
                <div className="flex gap-2">
                  <button onClick={handleDownloadHandoff}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-600">
                    <Download size={14} />
                    .md
                  </button>
                  <button onClick={handleCopyHandoff}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-cubo-600 text-white rounded-lg hover:bg-cubo-700 transition-colors">
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                    {copied ? 'Copiado' : 'Copiar'}
                  </button>
                </div>
              </div>
              <HandoffDisplay text={idea.handoffText} />
            </div>
          )}

          {(idea.claudeResponse || idea.gptResponse) && (
            <details className="group">
              <summary className="cursor-pointer text-sm font-medium text-gray-600 hover:text-gray-800">
                Ver respuestas individuales de AI
              </summary>
              <div className="mt-3 space-y-4">
                {idea.gptResponse && (
                  <div className="p-4 bg-green-50 rounded-xl border border-green-200">
                    <h4 className="font-medium text-green-800 text-sm mb-2">Respuesta GPT</h4>
                    <div className="text-sm text-gray-700 whitespace-pre-wrap">{idea.gptResponse}</div>
                  </div>
                )}
                {idea.claudeResponse && (
                  <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
                    <h4 className="font-medium text-amber-800 text-sm mb-2">Respuesta Claude</h4>
                    <div className="text-sm text-gray-700 whitespace-pre-wrap">{idea.claudeResponse}</div>
                  </div>
                )}
                {idea.mergedResponse && (
                  <div className="p-4 bg-purple-50 rounded-xl border border-purple-200">
                    <h4 className="font-medium text-purple-800 text-sm mb-2">Respuesta Combinada (Claude)</h4>
                    <div className="text-sm text-gray-700 whitespace-pre-wrap">{idea.mergedResponse}</div>
                  </div>
                )}
              </div>
            </details>
          )}

          <div className="flex justify-end pt-4 border-t border-gray-200">
            <div className="flex gap-3">
              <button onClick={() => setActiveTab('edit')}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">
                Editar Idea
              </button>
              <button onClick={handleProcess} disabled={processing}
                className="flex items-center gap-2 px-5 py-2.5 bg-cubo-600 text-white rounded-lg hover:bg-cubo-700 disabled:opacity-50 transition-colors font-medium">
                <Sparkles size={18} />
                Re-procesar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
