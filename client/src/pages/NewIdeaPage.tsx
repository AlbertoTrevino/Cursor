import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Zap, FileText } from 'lucide-react'
import { ideasApi } from '@/api/ideas.api'
import type { IdeaMode } from '@/types/idea'
import toast from 'react-hot-toast'

export default function NewIdeaPage() {
  const navigate = useNavigate()
  const [mode, setMode] = useState<IdeaMode>('simple')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [projectContext, setProjectContext] = useState('')
  const [affectedAreas, setAffectedAreas] = useState('')
  const [structuralNotes, setStructuralNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !description.trim()) {
      toast.error('Título y descripción son requeridos')
      return
    }

    setSaving(true)
    try {
      const { data } = await ideasApi.create({
        title: title.trim(),
        description: description.trim(),
        mode,
        ...(mode === 'complex' && {
          projectContext: projectContext.trim() || undefined,
          affectedAreas: affectedAreas.trim() || undefined,
          structuralNotes: structuralNotes.trim() || undefined,
        }),
      })
      toast.success('Idea creada')
      navigate(`/ideas/${data.id}`)
    } catch {
      toast.error('Error al crear la idea')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <button
        onClick={() => navigate('/ideas')}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6"
      >
        <ArrowLeft size={16} />
        Volver a Ideas
      </button>

      <h1 className="text-2xl font-bold text-gray-900 mb-6">Nueva Idea</h1>

      {/* Mode selector */}
      <div className="grid grid-cols-2 gap-3 mb-8">
        <button
          type="button"
          onClick={() => setMode('simple')}
          className={`p-4 rounded-xl border-2 text-left transition-all ${
            mode === 'simple'
              ? 'border-cubo-500 bg-cubo-50'
              : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <FileText size={24} className={mode === 'simple' ? 'text-cubo-600' : 'text-gray-400'} />
          <h3 className="font-semibold mt-2 text-gray-900">Cambio Simple</h3>
          <p className="text-xs text-gray-500 mt-1">
            Feature pequeña, fix, ajuste rápido
          </p>
        </button>
        <button
          type="button"
          onClick={() => setMode('complex')}
          className={`p-4 rounded-xl border-2 text-left transition-all ${
            mode === 'complex'
              ? 'border-purple-500 bg-purple-50'
              : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <Zap size={24} className={mode === 'complex' ? 'text-purple-600' : 'text-gray-400'} />
          <h3 className="font-semibold mt-2 text-gray-900">Cambio Complejo</h3>
          <p className="text-xs text-gray-500 mt-1">
            Nuevo proyecto, cambio estructural, múltiples áreas
          </p>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
            Título
          </label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Nombre corto para tu idea..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cubo-500 focus:border-cubo-500 outline-none"
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
            Descripción
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe tu idea libremente... la AI te ayudará a estructurarla"
            rows={6}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cubo-500 focus:border-cubo-500 outline-none resize-y"
          />
          {description.length > 10000 && (
            <p className="text-xs text-amber-600 mt-1">
              Texto largo ({description.length} caracteres) — el procesamiento AI puede ser más lento
            </p>
          )}
        </div>

        {mode === 'complex' && (
          <>
            <div>
              <label htmlFor="projectContext" className="block text-sm font-medium text-gray-700 mb-1">
                Contexto del Proyecto
                <span className="text-gray-400 font-normal ml-1">(opcional)</span>
              </label>
              <textarea
                id="projectContext"
                value={projectContext}
                onChange={(e) => setProjectContext(e.target.value)}
                placeholder="¿Qué proyecto es? ¿Qué tecnologías usa? ¿Cuál es el estado actual?"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cubo-500 focus:border-cubo-500 outline-none resize-y"
              />
            </div>

            <div>
              <label htmlFor="affectedAreas" className="block text-sm font-medium text-gray-700 mb-1">
                Áreas Afectadas
                <span className="text-gray-400 font-normal ml-1">(opcional)</span>
              </label>
              <textarea
                id="affectedAreas"
                value={affectedAreas}
                onChange={(e) => setAffectedAreas(e.target.value)}
                placeholder="Frontend, Backend, Base de datos, API, Auth..."
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cubo-500 focus:border-cubo-500 outline-none resize-y"
              />
            </div>

            <div>
              <label htmlFor="structuralNotes" className="block text-sm font-medium text-gray-700 mb-1">
                Notas Estructurales
                <span className="text-gray-400 font-normal ml-1">(opcional)</span>
              </label>
              <textarea
                id="structuralNotes"
                value={structuralNotes}
                onChange={(e) => setStructuralNotes(e.target.value)}
                placeholder="Cambios de arquitectura, nuevos módulos, migraciones..."
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cubo-500 focus:border-cubo-500 outline-none resize-y"
              />
            </div>
          </>
        )}

        <div className="flex justify-end gap-3 pt-4">
          <button
            type="button"
            onClick={() => navigate('/ideas')}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving || !title.trim() || !description.trim()}
            className="px-5 py-2.5 bg-cubo-600 text-white rounded-lg hover:bg-cubo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {saving ? 'Creando...' : 'Crear Idea'}
          </button>
        </div>
      </form>
    </div>
  )
}
