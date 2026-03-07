import { AlertTriangle, X } from 'lucide-react'
import type { NamingSuggestion } from '@/types/idea'

interface Props {
  suggestions: NamingSuggestion[]
  onDismiss: () => void
}

export default function NamingSuggestions({ suggestions, onDismiss }: Props) {
  if (suggestions.length === 0) return null

  return (
    <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <AlertTriangle size={18} className="text-blue-600" />
          <h3 className="font-semibold text-blue-800 text-sm">
            Sugerencias de Nombres
          </h3>
        </div>
        <button
          onClick={onDismiss}
          className="p-1 text-blue-400 hover:text-blue-600"
          title="Cerrar"
        >
          <X size={16} />
        </button>
      </div>

      <div className="space-y-2">
        {suggestions.map((s, i) => (
          <div key={i} className="bg-white rounded-lg p-3 border border-blue-100 text-sm">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-red-500 line-through">{s.original}</span>
              <span className="text-gray-400">→</span>
              <span className="text-green-600 font-medium">{s.suggested}</span>
            </div>
            <p className="text-xs text-gray-500">{s.reason}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
