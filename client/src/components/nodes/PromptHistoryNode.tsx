import { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { History } from 'lucide-react'
import type { RunState } from '@shared/runState'

const statusDotStyles: Record<RunState, string> = {
  idle: 'bg-gray-300',
  waiting: 'bg-gray-400 animate-pulse',
  ready: 'bg-green-400',
  running: 'bg-indigo-500 animate-pulse',
  success: 'bg-green-500',
  error: 'bg-red-500',
  waiting_review: 'bg-purple-500 animate-pulse',
  waiting_data_edit: 'bg-amber-500 animate-pulse',
}

function PromptHistoryNode({ data, selected }: NodeProps) {
  const label = (data.label as string) || 'Historial Prompt'
  const runState = (data.runState as RunState) || 'idle'
  const output = data.output as Record<string, unknown> | null

  const feedbackCount = (output?.feedbackCount as number) || 0

  return (
    <div
      className={`bg-white rounded-xl border-2 shadow-sm w-52 transition-all node-state-${runState} ${
        selected ? 'border-indigo-500 shadow-md' : 'border-indigo-200'
      }`}
    >
      {/* Input handle (right) — receives prompt feedback from Review */}
      <Handle
        type="target"
        position={Position.Right}
        className="!w-3 !h-3 !bg-indigo-500 !border-2 !border-white"
      />

      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 bg-indigo-50 rounded-t-[10px] border-b border-indigo-100">
        <span className="text-indigo-600 flex-shrink-0">
          <History size={14} />
        </span>
        <span className="text-xs font-semibold text-indigo-800 truncate flex-1">
          {label}
        </span>
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${statusDotStyles[runState]}`} />
      </div>

      {/* Body */}
      <div className="px-3 py-2">
        <span className="text-[10px] font-medium text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
          {feedbackCount > 0 ? `${feedbackCount} feedbacks` : 'Historial'}
        </span>
        {output?.suggestedPrompt != null && (
          <p className="text-[10px] text-gray-500 mt-1.5 line-clamp-2 leading-tight">
            Sugerencia lista
          </p>
        )}
      </div>

      {/* Output handle (bottom) — sends suggestion to CuboAI feedback handle (Top) */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !bg-indigo-500 !border-2 !border-white"
      />
    </div>
  )
}

export default memo(PromptHistoryNode)
