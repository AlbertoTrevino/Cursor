import { useState, useEffect, useCallback } from 'react'
import { Plus, Trash2, Pencil, Key, Loader2, X, Check, Eye, EyeOff } from 'lucide-react'
import { apiKeysApi, type ApiKeyItem } from '@/api/apiKeys.api'
import toast from 'react-hot-toast'

type FormMode = 'idle' | 'create' | 'edit'

const PROVIDERS = [
  { value: 'openai', label: 'OpenAI' },
  { value: 'anthropic', label: 'Anthropic' },
] as const

export default function ApiKeyManager() {
  const [keys, setKeys] = useState<ApiKeyItem[]>([])
  const [loading, setLoading] = useState(true)
  const [formMode, setFormMode] = useState<FormMode>('idle')
  const [editId, setEditId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Form fields
  const [label, setLabel] = useState('')
  const [provider, setProvider] = useState<string>('openai')
  const [keyValue, setKeyValue] = useState('')
  const [showKey, setShowKey] = useState(false)

  const fetchKeys = useCallback(async () => {
    try {
      const { data } = await apiKeysApi.list()
      setKeys(data)
    } catch {
      toast.error('Error al cargar API keys')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchKeys()
  }, [fetchKeys])

  const resetForm = () => {
    setFormMode('idle')
    setEditId(null)
    setLabel('')
    setProvider('openai')
    setKeyValue('')
    setShowKey(false)
  }

  const openCreate = () => {
    resetForm()
    setFormMode('create')
  }

  const openEdit = (key: ApiKeyItem) => {
    setFormMode('edit')
    setEditId(key.id)
    setLabel(key.label)
    setProvider(key.provider)
    setKeyValue('')
    setShowKey(false)
  }

  const handleSubmit = async () => {
    if (!label.trim()) {
      toast.error('Escribe un nombre para la key')
      return
    }
    if (formMode === 'create' && keyValue.length < 10) {
      toast.error('La API key es demasiado corta')
      return
    }

    setSubmitting(true)
    try {
      if (formMode === 'create') {
        const { data } = await apiKeysApi.create({
          label: label.trim(),
          provider,
          key: keyValue,
        })
        setKeys((prev) => [data, ...prev])
        toast.success('API key agregada')
      } else if (formMode === 'edit' && editId) {
        const payload: { label?: string; key?: string } = { label: label.trim() }
        if (keyValue.length > 0) payload.key = keyValue
        const { data } = await apiKeysApi.update(editId, payload)
        setKeys((prev) => prev.map((k) => (k.id === editId ? data : k)))
        toast.success('API key actualizada')
      }
      resetForm()
    } catch {
      toast.error('Error al guardar')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta API key?')) return
    try {
      await apiKeysApi.delete(id)
      setKeys((prev) => prev.filter((k) => k.id !== id))
      if (editId === id) resetForm()
      toast.success('API key eliminada')
    } catch {
      toast.error('Error al eliminar')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={20} className="animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">API Keys</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Configura las keys de los proveedores de IA para ejecutar tus Cubos.
          </p>
        </div>
        {formMode === 'idle' && (
          <button
            onClick={openCreate}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-cubo-600 text-white rounded-lg hover:bg-cubo-700 transition-colors"
          >
            <Plus size={16} />
            Agregar key
          </button>
        )}
      </div>

      {/* Form (create or edit) */}
      {formMode !== 'idle' && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-700">
              {formMode === 'create' ? 'Nueva API Key' : 'Editar API Key'}
            </h3>
            <button
              onClick={resetForm}
              className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Cerrar formulario"
            >
              <X size={16} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Provider */}
            <div>
              <label htmlFor="apikey-provider" className="block text-xs font-medium text-gray-600 mb-1">
                Proveedor
              </label>
              <select
                id="apikey-provider"
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                disabled={formMode === 'edit'}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cubo-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-500"
              >
                {PROVIDERS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Label */}
            <div>
              <label htmlFor="apikey-label" className="block text-xs font-medium text-gray-600 mb-1">
                Nombre
              </label>
              <input
                id="apikey-label"
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Ej: Mi key de producción"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cubo-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Key value */}
          <div>
            <label htmlFor="apikey-value" className="block text-xs font-medium text-gray-600 mb-1">
              API Key {formMode === 'edit' && <span className="text-gray-400">(dejar vacío para no cambiar)</span>}
            </label>
            <div className="relative">
              <input
                id="apikey-value"
                type={showKey ? 'text' : 'password'}
                value={keyValue}
                onChange={(e) => setKeyValue(e.target.value)}
                placeholder={formMode === 'edit' ? '••••••••' : 'sk-...'}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-10 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-cubo-500 focus:border-transparent"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
                aria-label={showKey ? 'Ocultar API key' : 'Mostrar API key'}
              >
                {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <button
              onClick={resetForm}
              className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium bg-cubo-600 text-white rounded-lg hover:bg-cubo-700 disabled:opacity-50 transition-colors"
            >
              {submitting ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Check size={14} />
              )}
              {formMode === 'create' ? 'Guardar' : 'Actualizar'}
            </button>
          </div>
        </div>
      )}

      {/* Keys list */}
      {keys.length === 0 ? (
        <div className="text-center py-10 border border-dashed border-gray-300 rounded-xl">
          <Key size={32} className="mx-auto text-gray-300 mb-3" />
          <p className="text-sm text-gray-500">
            No tienes API keys configuradas.
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Agrega una key de OpenAI o Anthropic para ejecutar Cubos AI.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {keys.map((k) => (
            <div
              key={k.id}
              className={`flex items-center gap-3 px-4 py-3 bg-white border rounded-xl transition-colors group ${
                editId === k.id
                  ? 'border-cubo-300 bg-cubo-50/30'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              {/* Provider badge */}
              <span
                className={`flex-shrink-0 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md ${
                  k.provider === 'openai'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-orange-100 text-orange-700'
                }`}
              >
                {k.provider}
              </span>

              {/* Label + masked key */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">
                  {k.label}
                </p>
                <p className="text-xs text-gray-400 font-mono">
                  {k.maskedKey}
                </p>
              </div>

              {/* Date */}
              <span className="text-xs text-gray-400 flex-shrink-0 hidden sm:block">
                {new Date(k.createdAt).toLocaleDateString('es-MX', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </span>

              {/* Actions */}
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => openEdit(k)}
                  className="p-1.5 text-gray-400 hover:text-cubo-600 rounded-md hover:bg-cubo-50 transition-colors"
                  aria-label={`Editar ${k.label}`}
                >
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() => handleDelete(k.id)}
                  className="p-1.5 text-gray-400 hover:text-red-500 rounded-md hover:bg-red-50 transition-colors"
                  aria-label={`Eliminar ${k.label}`}
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
