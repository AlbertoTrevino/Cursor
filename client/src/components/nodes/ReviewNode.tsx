import { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { Eye } from 'lucide-react'
import type { RunState } from '@shared/runState'

const statusDotStyles: Record<RunState, string> = {
  idle: 'bg-gray-300',
  waiting: 'bg-gray-400 animate-pulse',
  ready: 'bg-green-400',
  running: 'bg-purple-500 animate-pulse',
  success: 'bg-green-500',
  error: 'bg-red-500',
  waiting_review: 'bg-purple-500 animate-pulse',
  waiting_data_edit: 'bg-amber-500 animate-pulse',
}

function ReviewNode({ data, selected }: NodeProps) {
  const label = (data.label as string) || 'Revisión'
  const runState = (data.runState as RunState) || 'idle'
  const output = data.output as string | null

  return (
    <div
      className={`bg-white rounded-xl border-2 shadow-sm w-52 transition-all node-state-${runState} ${
        selected ? 'border-purple-500 shadow-md' : 'border-purple-200'
      }`}
    >
      {/* Input handle (left) — receives output from CuboAI */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-purple-500 !border-2 !border-white"
      />

      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 bg-purple-50 rounded-t-[10px] border-b border-purple-100">
        <span className="text-purple-600 flex-shrink-0">
          <Eye size={14} />
        </span>
        <span className="text-xs font-semibold text-purple-800 truncate flex-1">
          {label}
        </span>
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${statusDotStyles[runState]}`} />
      </div>

      {/* Body */}
      <div className="px-3 py-2">
        {runState === 'waiting_review' && (
          <span className="text-[10px] font-medium text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded animate-pulse">
            Esperando revisión
          </span>
        )}
        {runState !== 'waiting_review' && (
          <span className="text-[10px] font-medium text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded">
            Revisión
          </span>
        )}
        {output && (
          <p className="text-[10px] text-gray-500 mt-1.5 line-clamp-2 leading-tight">
            {typeof output === 'string' ? output.slice(0, 80) : 'Resultado recibido'}
          </p>
        )}
      </div>

      {/* Output handle: continue (right-top) */}
      <Handle
        type="source"
        position={Position.Right}
        id="continue"
        className="!w-3 !h-3 !bg-green-500 !border-2 !border-white"
        style={{ top: '35%' }}
      />

      {/* Output handle: promptFeedback (right-bottom) */}
      <Handle
        type="source"
        position={Position.Right}
        id="promptFeedback"
        className="!w-3 !h-3 !bg-indigo-500 !border-2 !border-white"
        style={{ top: '65%' }}
      />
    </div>
  )
}

export default memo(ReviewNode)
