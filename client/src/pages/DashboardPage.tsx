import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Trash2 } from 'lucide-react'
import { workflowsApi, type WorkflowSummary } from '@/api/workflows.api'
import toast from 'react-hot-toast'

export default function DashboardPage() {
  const navigate = useNavigate()
  const [workflows, setWorkflows] = useState<WorkflowSummary[]>([])
  const [loading, setLoading] = useState(true)

  const fetchWorkflows = async () => {
    try {
      const { data } = await workflowsApi.list()
      setWorkflows(data)
    } catch {
      toast.error('Error al cargar los flujos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchWorkflows()
  }, [])

  const handleCreate = async () => {
    try {
      const { data } = await workflowsApi.create({
        name: 'Nuevo Flujo',
        description: '',
      })
      navigate(`/flujo/${data.id}`)
    } catch {
      toast.error('Error al crear el flujo')
    }
  }

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('¿Eliminar este flujo?')) return
    try {
      await workflowsApi.delete(id)
      setWorkflows((prev) => prev.filter((w) => w.id !== id))
      toast.success('Flujo eliminado')
    } catch {
      toast.error('Error al eliminar')
    }
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Mis Flujos</h1>
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 px-4 py-2 bg-cubo-600 text-white rounded-lg hover:bg-cubo-700 transition-colors"
        >
          <Plus size={18} />
          Nuevo Flujo
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-32 bg-gray-100 rounded-xl animate-pulse"
            />
          ))}
        </div>
      ) : workflows.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-500 mb-4">
            No tienes flujos todavía. ¡Crea tu primero!
          </p>
          <button
            onClick={handleCreate}
            className="px-4 py-2 bg-cubo-600 text-white rounded-lg hover:bg-cubo-700 transition-colors"
          >
            Crear Flujo
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {workflows.map((w) => (
            <div
              key={w.id}
              role="button"
              tabIndex={0}
              onClick={() => navigate(`/flujo/${w.id}`)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  navigate(`/flujo/${w.id}`)
                }
              }}
              className="p-5 bg-white border border-gray-200 rounded-xl hover:border-cubo-300 hover:shadow-sm cursor-pointer transition-all group focus:outline-none focus:ring-2 focus:ring-cubo-500 focus:border-cubo-300"
            >
              <div className="flex items-start justify-between">
                <h3 className="font-semibold text-gray-900">{w.name}</h3>
                <button
                  onClick={(e) => handleDelete(w.id, e)}
                  className="p-1 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                  title="Eliminar"
                  aria-label={`Eliminar ${w.name}`}
                >
                  <Trash2 size={16} />
                </button>
              </div>
              {w.description && (
                <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                  {w.description}
                </p>
              )}
              <p className="text-xs text-gray-400 mt-3">
                Actualizado:{' '}
                {new Date(w.updatedAt).toLocaleDateString('es-MX')}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
