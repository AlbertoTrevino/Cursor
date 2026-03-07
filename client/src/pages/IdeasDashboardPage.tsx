import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Trash2, Lightbulb, Zap, FileText, Clock, CheckCircle, AlertCircle } from 'lucide-react'
import { ideasApi } from '@/api/ideas.api'
import type { IdeaSummary } from '@/types/idea'
import toast from 'react-hot-toast'

const statusConfig: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  draft: { label: 'Borrador', color: 'text-gray-500 bg-gray-50', icon: FileText },
  clarifying: { label: 'Aclarando', color: 'text-amber-600 bg-amber-50', icon: AlertCircle },
  processing: { label: 'Procesando', color: 'text-blue-600 bg-blue-50', icon: Clock },
  done: { label: 'Completo', color: 'text-green-600 bg-green-50', icon: CheckCircle },
}

export default function IdeasDashboardPage() {
  const navigate = useNavigate()
  const [ideas, setIdeas] = useState<IdeaSummary[]>([])
  const [loading, setLoading] = useState(true)

  const fetchIdeas = async () => {
    try {
      const { data } = await ideasApi.list()
      setIdeas(data)
    } catch {
      toast.error('Error al cargar las ideas')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchIdeas()
  }, [])

  const handleCreate = () => {
    navigate('/ideas/nueva')
  }

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('¿Eliminar esta idea?')) return
    try {
      await ideasApi.delete(id)
      setIdeas((prev) => prev.filter((i) => i.id !== id))
      toast.success('Idea eliminada')
    } catch {
      toast.error('Error al eliminar')
    }
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Lightbulb className="text-cubo-600" size={28} />
            Mis Ideas
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Organiza tus ideas y genera descripciones listas para Cursor
          </p>
        </div>
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 px-4 py-2.5 bg-cubo-600 text-white rounded-lg hover:bg-cubo-700 transition-colors font-medium"
        >
          <Plus size={18} />
          Nueva Idea
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-40 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : ideas.length === 0 ? (
        <div className="text-center py-20">
          <Lightbulb size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500 mb-2 text-lg">No tienes ideas todavía</p>
          <p className="text-gray-400 text-sm mb-6">
            Crea tu primera idea y deja que la AI te ayude a describirla
          </p>
          <button
            onClick={handleCreate}
            className="px-5 py-2.5 bg-cubo-600 text-white rounded-lg hover:bg-cubo-700 transition-colors font-medium"
          >
            Crear mi primera idea
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {ideas.map((idea) => {
            const status = statusConfig[idea.status] || statusConfig.draft
            const StatusIcon = status.icon
            return (
              <div
                key={idea.id}
                role="button"
                tabIndex={0}
                onClick={() => navigate(`/ideas/${idea.id}`)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    navigate(`/ideas/${idea.id}`)
                  }
                }}
                className="p-5 bg-white border border-gray-200 rounded-xl hover:border-cubo-300 hover:shadow-sm cursor-pointer transition-all group focus:outline-none focus:ring-2 focus:ring-cubo-500"
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-gray-900 line-clamp-1 flex-1 mr-2">
                    {idea.title}
                  </h3>
                  <button
                    onClick={(e) => handleDelete(idea.id, e)}
                    className="p-1 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity flex-shrink-0"
                    title="Eliminar"
                    aria-label={`Eliminar ${idea.title}`}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>

                <p className="text-sm text-gray-500 line-clamp-2 mb-3">
                  {idea.description}
                </p>

                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-medium ${status.color}`}>
                      <StatusIcon size={12} />
                      {status.label}
                    </span>
                    {idea.mode === 'complex' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-50 text-purple-600 font-medium">
                        <Zap size={12} />
                        Complejo
                      </span>
                    )}
                  </div>

                  {idea.recommendation && (
                    <span className={`px-2 py-0.5 rounded-full font-medium ${
                      idea.recommendation === 'agent'
                        ? 'bg-orange-50 text-orange-600'
                        : 'bg-blue-50 text-blue-600'
                    }`}>
                      {idea.recommendation === 'agent' ? 'Agent' : 'Plan'}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3 mt-3 text-xs text-gray-400">
                  {idea._count.attachments > 0 && (
                    <span>{idea._count.attachments} archivo(s)</span>
                  )}
                  {idea._count.diagrams > 0 && (
                    <span>{idea._count.diagrams} diagrama(s)</span>
                  )}
                  <span className="ml-auto">
                    {new Date(idea.updatedAt).toLocaleDateString('es-MX')}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
