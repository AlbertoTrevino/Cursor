import { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { Box } from 'lucide-react'
import { PROVIDER_LABELS } from '@shared/providers'
import type { RunState } from '@shared/runState'
import NodeBadge from './NodeBadge'

const statusDotStyles: Record<RunState, string> = {
  idle: 'bg-gray-300',
  waiting: 'bg-gray-400 animate-pulse',
  ready: 'bg-green-400',
  running: 'bg-blue-500 animate-pulse',
  success: 'bg-green-500',
  error: 'bg-red-500',
  waiting_review: 'bg-purple-500 animate-pulse',
  waiting_data_edit: 'bg-amber-500 animate-pulse',
}

function CuboAINode({ data, selected }: NodeProps) {
  const label = (data.label as string) || 'Cubo AI'
  const runState = (data.runState as RunState) || 'idle'
  const provider = (data.provider as string) || 'openai'
  const output = data.output as string | null

  return (
    <div
      className={[
        'rounded-xl border-2 shadow-sm w-56 transition-all',
        `node-state-${runState}`,
        selected
          ? 'border-cubo-500 shadow-md bg-white'
          : 'border-cubo-200 bg-white',
      ].join(' ')}
    >
      {/* Data input handle (left side) */}
      <Handle
        type="target"
        position={Position.Left}
        id="data"
        className="!w-3 !h-3 !bg-cubo-500 !border-2 !border-white"
      />

      {/* Feedback input handle (top) */}
      <Handle
        type="target"
        position={Position.Top}
        id="feedback"
        className="!w-3 !h-3 !bg-indigo-500 !border-2 !border-white"
      />

      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-t-[10px] border-b bg-cubo-50 border-cubo-100">
        <Box size={14} className="text-cubo-600 flex-shrink-0" />
        <span className="text-xs font-semibold text-cubo-800 truncate flex-1">
          {label}
        </span>
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${statusDotStyles[runState]}`} />
      </div>

      {/* Body */}
      <div className="px-3 py-2 space-y-1.5">
        <div className="flex items-center gap-1 flex-wrap">
          <span className="text-[10px] font-medium text-cubo-600 bg-cubo-50 px-1.5 py-0.5 rounded">
            {PROVIDER_LABELS[provider] || provider}
          </span>
        </div>

        {/* Run state badges */}
        {runState === 'success' && output && <NodeBadge label="Output Listo" color="green" />}

        {/* Output preview */}
        {output && (
          <p className="text-[10px] text-gray-500 line-clamp-2 leading-tight">
            {typeof output === 'string' ? output.slice(0, 100) : 'Resultado disponible'}
          </p>
        )}
      </div>

      {/* Output handle (right side) */}
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-cubo-500 !border-2 !border-white"
      />
    </div>
  )
}

export default memo(CuboAINode)
