import { useState, useEffect } from 'react'
import { Database, Plus, Trash2, RefreshCw, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { fabricApi } from '@/api/fabric.api'
import type { FabricConnection } from '@/types/idea'
import toast from 'react-hot-toast'

const FABRIC_FIELDS = [
  { key: 'endpoint', label: 'Endpoint URL', placeholder: 'https://api.fabric.microsoft.com/v1', required: true },
  { key: 'workspaceId', label: 'Workspace ID', placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx', required: true },
  { key: 'tenantId', label: 'Tenant ID (Azure AD)', placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx', required: false },
  { key: 'clientId', label: 'Client ID (App Registration)', placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx', required: false },
  { key: 'clientSecret', label: 'Client Secret', placeholder: '***', required: false },
]

export default function FabricWizard() {
  const [connections, setConnections] = useState<FabricConnection[]>([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [newName, setNewName] = useState('')
  const [newConfig, setNewConfig] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState<string | null>(null)

  const fetchConnections = async () => {
    try {
      const { data } = await fabricApi.list()
      setConnections(data)
    } catch {
      toast.error('Error al cargar conexiones')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchConnections()
  }, [])

  const handleCreate = async () => {
    if (!newName.trim()) {
      toast.error('Nombre requerido')
      return
    }
    setSaving(true)
    try {
      await fabricApi.create({
        name: newName.trim(),
        config: newConfig,
      })
      setShowNew(false)
      setNewName('')
      setNewConfig({})
      fetchConnections()
      toast.success('Conexión creada')
    } catch {
      toast.error('Error al crear conexión')
    } finally {
      setSaving(false)
    }
  }

  const handleTest = async (id: string) => {
    setTesting(id)
    try {
      const { data } = await fabricApi.test(id)
      if (data.success) {
        toast.success(data.message)
      } else {
        toast.error(data.message)
      }
      fetchConnections()
    } catch {
      toast.error('Error al probar conexión')
    } finally {
      setTesting(null)
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`¿Eliminar conexión "${name}"?`)) return
    try {
      await fabricApi.delete(id)
      fetchConnections()
      toast.success('Conexión eliminada')
    } catch {
      toast.error('Error al eliminar')
    }
  }

  const statusIcon = (status: string) => {
    if (status === 'connected') return <CheckCircle size={16} className="text-green-500" />
    if (status === 'error') return <XCircle size={16} className="text-red-500" />
    return <AlertCircle size={16} className="text-gray-400" />
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Database size={20} className="text-cubo-600" />
          Microsoft Fabric
        </h2>
        <button
          onClick={() => setShowNew(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-cubo-600 text-white rounded-lg hover:bg-cubo-700"
        >
          <Plus size={14} />
          Nueva Conexión
        </button>
      </div>

      <p className="text-sm text-gray-500">
        Conecta a Microsoft Fabric para acceder a tus datos y usarlos como contexto en tus ideas.
      </p>

      {/* New connection form */}
      {showNew && (
        <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-3">
          <h3 className="font-medium text-sm text-gray-800">Nueva Conexión Fabric</h3>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Nombre</label>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Mi conexión Fabric"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-cubo-500 focus:border-cubo-500 outline-none"
            />
          </div>
          {FABRIC_FIELDS.map((field) => (
            <div key={field.key}>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                {field.label}
                {field.required && <span className="text-red-400 ml-0.5">*</span>}
              </label>
              <input
                type={field.key === 'clientSecret' ? 'password' : 'text'}
                value={newConfig[field.key] || ''}
                onChange={(e) => setNewConfig(prev => ({ ...prev, [field.key]: e.target.value }))}
                placeholder={field.placeholder}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-cubo-500 focus:border-cubo-500 outline-none"
              />
            </div>
          ))}
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => { setShowNew(false); setNewName(''); setNewConfig({}) }}
              className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800"
            >
              Cancelar
            </button>
            <button
              onClick={handleCreate}
              disabled={saving}
              className="px-4 py-1.5 text-sm bg-cubo-600 text-white rounded-lg hover:bg-cubo-700 disabled:opacity-50"
            >
              {saving ? 'Guardando...' : 'Crear'}
            </button>
          </div>
        </div>
      )}

      {/* Connections list */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2].map(i => (
            <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : connections.length === 0 && !showNew ? (
        <div className="text-center py-8 text-gray-400 text-sm">
          No hay conexiones configuradas
        </div>
      ) : (
        <div className="space-y-2">
          {connections.map((conn) => (
            <div key={conn.id} className="p-4 bg-white border border-gray-200 rounded-xl flex items-center gap-3">
              {statusIcon(conn.status)}
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-sm text-gray-900">{conn.name}</h4>
                {conn.lastError && (
                  <p className="text-xs text-red-500 mt-0.5 truncate">{conn.lastError}</p>
                )}
              </div>
              <div className="flex gap-1.5">
                <button
                  onClick={() => handleTest(conn.id)}
                  disabled={testing === conn.id}
                  className="p-1.5 text-gray-400 hover:text-cubo-600 rounded"
                  title="Probar conexión"
                >
                  <RefreshCw size={14} className={testing === conn.id ? 'animate-spin' : ''} />
                </button>
                <button
                  onClick={() => handleDelete(conn.id, conn.name)}
                  className="p-1.5 text-gray-400 hover:text-red-500 rounded"
                  title="Eliminar"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
