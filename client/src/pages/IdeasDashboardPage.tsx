import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Trash2, Lightbulb, Zap, FileText, Clock, CheckCircle, AlertCircle, Search, ChevronLeft, ChevronRight } from 'lucide-react'
import { ideasApi } from '@/api/ideas.api'
import type { IdeaSummary } from '@/types/idea'
import ConfirmDialog from '@/components/ideas/ConfirmDialog'
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
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [modeFilter, setModeFilter] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null)
  const limit = 12

  const fetchIdeas = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await ideasApi.list({
        page,
        limit,
        search: search || undefined,
        status: statusFilter || undefined,
        mode: modeFilter || undefined,
      })
      setIdeas(data.ideas)
      setTotal(data.total)
    } catch {
      toast.error('Error al cargar las ideas')
    } finally {
      setLoading(false)
    }
  }, [page, search, statusFilter, modeFilter])

  useEffect(() => {
    fetchIdeas()
  }, [fetchIdeas])

  useEffect(() => {
    setPage(1)
  }, [search, statusFilter, modeFilter])

  const handleCreate = () => navigate('/ideas/nueva')

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await ideasApi.delete(deleteTarget.id)
      setIdeas((prev) => prev.filter((i) => i.id !== deleteTarget.id))
      setTotal(t => t - 1)
      toast.success('Idea eliminada')
    } catch {
      toast.error('Error al eliminar')
    } finally {
      setDeleteTarget(null)
    }
  }

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="p-8">
      <ConfirmDialog
        open={!!deleteTarget}
        title="Eliminar idea"
        message={`¿Estás seguro de eliminar "${deleteTarget?.title}"?`}
        confirmLabel="Eliminar"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Lightbulb className="text-cubo-600" size={28} />
            Mis Ideas
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Organiza tus ideas y genera descripciones listas para Cursor
          </p>
        </div>
        <button onClick={handleCreate}
          className="flex items-center gap-2 px-4 py-2.5 bg-cubo-600 text-white rounded-lg hover:bg-cubo-700 transition-colors font-medium">
          <Plus size={18} />
          Nueva Idea
        </button>
      </div>

      {/* Search and filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar ideas..."
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-cubo-500 focus:border-cubo-500 outline-none"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-cubo-500 outline-none"
        >
          <option value="">Todos los estados</option>
          <option value="draft">Borrador</option>
          <option value="clarifying">Aclarando</option>
          <option value="processing">Procesando</option>
          <option value="done">Completo</option>
        </select>
        <select
          value={modeFilter}
          onChange={(e) => setModeFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-cubo-500 outline-none"
        >
          <option value="">Todos los tipos</option>
          <option value="simple">Simple</option>
          <option value="complex">Complejo</option>
        </select>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <div key={i} className="h-40 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      ) : ideas.length === 0 ? (
        <div className="text-center py-20">
          <Lightbulb size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500 mb-2 text-lg">
            {search || statusFilter || modeFilter ? 'No se encontraron ideas' : 'No tienes ideas todavía'}
          </p>
          <p className="text-gray-400 text-sm mb-6">
            {search || statusFilter || modeFilter
              ? 'Intenta con otros filtros'
              : 'Crea tu primera idea y deja que la AI te ayude a describirla'}
          </p>
          {!search && !statusFilter && !modeFilter && (
            <button onClick={handleCreate}
              className="px-5 py-2.5 bg-cubo-600 text-white rounded-lg hover:bg-cubo-700 transition-colors font-medium">
              Crear mi primera idea
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {ideas.map((idea) => {
              const status = statusConfig[idea.status] || statusConfig.draft
              const StatusIcon = status.icon
              return (
                <div key={idea.id} role="button" tabIndex={0}
                  onClick={() => navigate(`/ideas/${idea.id}`)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(`/ideas/${idea.id}`) } }}
                  className="p-5 bg-white border border-gray-200 rounded-xl hover:border-cubo-300 hover:shadow-sm cursor-pointer transition-all group focus:outline-none focus:ring-2 focus:ring-cubo-500">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-gray-900 line-clamp-1 flex-1 mr-2">{idea.title}</h3>
                    <button
                      onClick={(e) => { e.stopPropagation(); setDeleteTarget({ id: idea.id, title: idea.title }) }}
                      className="p-1 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity flex-shrink-0"
                      title="Eliminar"
                      aria-label={`Eliminar ${idea.title}`}>
                      <Trash2 size={15} />
                    </button>
                  </div>
                  <p className="text-sm text-gray-500 line-clamp-2 mb-3">{idea.description}</p>
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
                        idea.recommendation === 'agent' ? 'bg-orange-50 text-orange-600' : 'bg-blue-50 text-blue-600'
                      }`}>
                        {idea.recommendation === 'agent' ? 'Agent' : 'Plan'}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-3 text-xs text-gray-400">
                    {idea._count.attachments > 0 && <span>{idea._count.attachments} archivo(s)</span>}
                    {idea._count.diagrams > 0 && <span>{idea._count.diagrams} diagrama(s)</span>}
                    <span className="ml-auto">{new Date(idea.updatedAt).toLocaleDateString('es-MX')}</span>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 mt-8">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 text-gray-500 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed border border-gray-200 rounded-lg"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-sm text-gray-600">
                Página {page} de {totalPages} ({total} ideas)
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-2 text-gray-500 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed border border-gray-200 rounded-lg"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
