import { useExecutionStore } from '@/store/executionStore'
import type { RunState } from '@shared/runState'

const stateLabels: Record<RunState, string> = {
  idle: 'Inactivo',
  waiting: 'Esperando',
  ready: 'Listo',
  running: 'Ejecutando...',
  success: 'Completado',
  error: 'Error',
  waiting_review: 'Esperando revisión',
  waiting_data_edit: 'Esperando edición',
}

const stateColors: Record<RunState, string> = {
  idle: 'text-gray-500 bg-gray-100',
  waiting: 'text-gray-600 bg-gray-100',
  ready: 'text-green-600 bg-green-100',
  running: 'text-blue-600 bg-blue-100',
  success: 'text-green-700 bg-green-100',
  error: 'text-red-600 bg-red-100',
  waiting_review: 'text-purple-600 bg-purple-100',
  waiting_data_edit: 'text-amber-600 bg-amber-100',
}

interface InspectionPanelProps {
  nodeId: string
  nodeType: string
}

export default function InspectionPanel({ nodeId }: InspectionPanelProps) {
  const runState = useExecutionStore((s) => s.nodeRunStates[nodeId]) || 'idle'
  const output = useExecutionStore((s) => s.nodeOutputs[nodeId])

  return (
    <div className="space-y-4">
      {/* Run state badge */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          Estado de ejecución
        </label>
        <span className={`inline-block text-[10px] font-semibold px-2 py-1 rounded ${stateColors[runState]}`}>
          {stateLabels[runState]}
        </span>
      </div>

      {/* Current output */}
      {output ? (
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Resultado
          </label>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs text-gray-700 max-h-40 overflow-y-auto whitespace-pre-wrap">
            {String(typeof output === 'string'
              ? output
              : JSON.stringify(output, null, 2))}
          </div>
        </div>
      ) : null}
    </div>
  )
}
