import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Save, Trash2, Sparkles,
  Copy, Check, FileText, Zap
} from 'lucide-react'
import { ideasApi } from '@/api/ideas.api'
import type { Idea, NamingSuggestion } from '@/types/idea'
import ClarificationDialog from '@/components/ideas/ClarificationDialog'
import AIProcessingView from '@/components/ideas/AIProcessingView'
import HandoffDisplay from '@/components/ideas/HandoffDisplay'
import DiagramSection from '@/components/ideas/DiagramSection'
import FileUploadZone from '@/components/ideas/FileUploadZone'
import NamingSuggestions from '@/components/ideas/NamingSuggestions'
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
  const [activeTab, setActiveTab] = useState<'edit' | 'result'>('edit')

  // Editable fields
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

    try {
      // Save first
      setProcessingStep('Guardando idea...')
      await ideasApi.update(id, {
        title: title.trim(),
        description: description.trim(),
        mode,
        projectContext: mode === 'complex' ? projectContext.trim() || null : null,
        affectedAreas: mode === 'complex' ? affectedAreas.trim() || null : null,
        structuralNotes: mode === 'complex' ? structuralNotes.trim() || null : null,
      })

      // Check clarification
      setProcessingStep('Analizando si necesita aclaración...')
      const { data: clarification } = await ideasApi.checkClarification(id)

      if (clarification.needsClarification) {
        setProcessingStep('')
        setProcessing(false)
        const { data: refreshed } = await ideasApi.get(id)
        setIdea(refreshed)
        return
      }

      // Process with AI
      setProcessingStep('Enviando a Claude...')
      await new Promise(r => setTimeout(r, 500))
      setProcessingStep('Enviando a GPT...')
      await new Promise(r => setTimeout(r, 500))
      setProcessingStep('Combinando respuestas con Claude...')

      await ideasApi.process(id)

      // Refresh idea
      const { data: refreshed } = await ideasApi.get(id)
      setIdea(refreshed)
      setActiveTab('result')
      toast.success('Idea procesada exitosamente')
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Error al procesar'
      toast.error(msg)
    } finally {
      setProcessing(false)
      setProcessingStep('')
    }
  }

  const handleClarificationAnswered = async () => {
    if (!id) return
    const { data } = await ideasApi.get(id)
    setIdea(data)
    toast.success('Respuestas guardadas. Puedes procesar la idea ahora.')
  }

  const handleCheckNaming = async () => {
    const text = `${title}\n${description}\n${projectContext}\n${affectedAreas}\n${structuralNotes}`
    try {
      const { data } = await ideasApi.checkNaming(text)
      setNamingSuggestions(data.suggestions)
      if (data.suggestions.length === 0) {
        toast.success('Nombres consistentes — no hay sugerencias')
      }
    } catch {
      toast.error('Error al verificar nombres')
    }
  }

  const handleCopyHandoff = () => {
    if (!idea?.handoffText) return
    navigator.clipboard.writeText(idea.handoffText)
    setCopied(true)
    toast.success('Handoff copiado al portapapeles')
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDelete = async () => {
    if (!id || !confirm('¿Eliminar esta idea?')) return
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
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => navigate('/ideas')}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft size={16} />
          Volver a Ideas
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCheckNaming}
            className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 border border-gray-200 rounded-lg hover:bg-gray-50"
            title="Verificar consistencia de nombres"
          >
            Verificar Nombres
          </button>
          <button
            onClick={handleDelete}
            className="p-2 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50"
            title="Eliminar idea"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* Processing overlay */}
      {processing && <AIProcessingView step={processingStep} />}

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
              onClick={() => setMode('simple')}
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
              onClick={() => setMode('complex')}
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
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
              Título
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cubo-500 focus:border-cubo-500 outline-none"
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Descripción
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cubo-500 focus:border-cubo-500 outline-none resize-y"
            />
          </div>

          {/* Complex fields */}
          {mode === 'complex' && (
            <div className="space-y-4 p-4 bg-purple-50/50 rounded-xl border border-purple-100">
              <h3 className="text-sm font-semibold text-purple-800">Detalles del Cambio Complejo</h3>
              <div>
                <label htmlFor="projectContext" className="block text-sm font-medium text-gray-700 mb-1">
                  Contexto del Proyecto
                </label>
                <textarea
                  id="projectContext"
                  value={projectContext}
                  onChange={(e) => setProjectContext(e.target.value)}
                  placeholder="¿Qué proyecto es? ¿Tecnologías? ¿Estado actual?"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cubo-500 focus:border-cubo-500 outline-none resize-y"
                />
              </div>
              <div>
                <label htmlFor="affectedAreas" className="block text-sm font-medium text-gray-700 mb-1">
                  Áreas Afectadas
                </label>
                <textarea
                  id="affectedAreas"
                  value={affectedAreas}
                  onChange={(e) => setAffectedAreas(e.target.value)}
                  placeholder="Frontend, Backend, DB, API..."
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cubo-500 focus:border-cubo-500 outline-none resize-y"
                />
              </div>
              <div>
                <label htmlFor="structuralNotes" className="block text-sm font-medium text-gray-700 mb-1">
                  Notas Estructurales
                </label>
                <textarea
                  id="structuralNotes"
                  value={structuralNotes}
                  onChange={(e) => setStructuralNotes(e.target.value)}
                  placeholder="Cambios de arquitectura, módulos nuevos..."
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cubo-500 focus:border-cubo-500 outline-none resize-y"
                />
              </div>
            </div>
          )}

          {/* Naming suggestions */}
          {namingSuggestions.length > 0 && (
            <NamingSuggestions
              suggestions={namingSuggestions}
              onDismiss={() => setNamingSuggestions([])}
            />
          )}

          {/* Clarification dialog */}
          {showClarification && (
            <ClarificationDialog
              ideaId={idea.id}
              questions={idea.questions}
              onAnswered={handleClarificationAnswered}
            />
          )}

          {/* File attachments */}
          <FileUploadZone
            ideaId={idea.id}
            attachments={idea.attachments}
            onChanged={handleAttachmentUploaded}
          />

          {/* Diagrams */}
          <DiagramSection
            ideaId={idea.id}
            diagrams={idea.diagrams}
            onChanged={handleDiagramsChanged}
          />

          {/* Actions */}
          <div className="flex justify-between items-center pt-4 border-t border-gray-200">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              <Save size={16} />
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
            <button
              onClick={handleProcess}
              disabled={processing || !title.trim() || !description.trim()}
              className="flex items-center gap-2 px-5 py-2.5 bg-cubo-600 text-white rounded-lg hover:bg-cubo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              <Sparkles size={18} />
              {processing ? 'Procesando...' : 'Procesar con AI'}
            </button>
          </div>
        </div>
      ) : (
        /* Result tab */
        <div className="space-y-6">
          {/* Recommendation badge */}
          {idea.recommendation && (
            <div className={`p-4 rounded-xl border-2 ${
              idea.recommendation === 'agent'
                ? 'border-orange-200 bg-orange-50'
                : 'border-blue-200 bg-blue-50'
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <span className={`text-lg font-bold ${
                    idea.recommendation === 'agent' ? 'text-orange-700' : 'text-blue-700'
                  }`}>
                    Recomendado: {idea.recommendation === 'agent' ? 'Agent Mode' : 'Plan Mode'}
                  </span>
                  {idea.recommendReason && (
                    <p className="text-sm mt-1 text-gray-600">{idea.recommendReason}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Handoff */}
          {idea.handoffText && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-gray-900">Handoff para Cursor</h3>
                <button
                  onClick={handleCopyHandoff}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-cubo-600 text-white rounded-lg hover:bg-cubo-700 transition-colors"
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  {copied ? 'Copiado' : 'Copiar'}
                </button>
              </div>
              <HandoffDisplay text={idea.handoffText} />
            </div>
          )}

          {/* Individual AI responses */}
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

          {/* Re-process button */}
          <div className="flex justify-end pt-4 border-t border-gray-200">
            <div className="flex gap-3">
              <button
                onClick={() => setActiveTab('edit')}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Editar Idea
              </button>
              <button
                onClick={handleProcess}
                disabled={processing}
                className="flex items-center gap-2 px-5 py-2.5 bg-cubo-600 text-white rounded-lg hover:bg-cubo-700 disabled:opacity-50 transition-colors font-medium"
              >
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
