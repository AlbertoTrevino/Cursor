import { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import {
  FileText,
  FileSpreadsheet,
  Database,
  FileAudio,
  FileType,
} from 'lucide-react'
import type { RunState } from '@shared/runState'

const subTypeIcons: Record<string, React.ReactNode> = {
  text: <FileText size={14} />,
  excel: <FileSpreadsheet size={14} />,
  sql: <Database size={14} />,
  pdf: <FileType size={14} />,
  audio: <FileAudio size={14} />,
}

const subTypeLabels: Record<string, string> = {
  text: 'Texto',
  excel: 'Excel',
  sql: 'SQL',
  pdf: 'PDF',
  audio: 'Audio',
}

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

function InputNode({ data, selected }: NodeProps) {
  const subType = (data.subType as string) || 'text'
  const runState = (data.runState as RunState) || 'idle'
  const label = (data.label as string) || 'Entrada'
  const output = data.output as string | null

  return (
    <div
      className={`bg-white rounded-xl border-2 shadow-sm w-52 transition-all node-state-${runState} ${
        selected ? 'border-emerald-500 shadow-md' : 'border-emerald-200'
      }`}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 rounded-t-[10px] border-b border-emerald-100">
        <span className="text-emerald-600 flex-shrink-0">
          {subTypeIcons[subType] || <FileText size={14} />}
        </span>
        <span className="text-xs font-semibold text-emerald-800 truncate flex-1">
          {label}
        </span>
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${statusDotStyles[runState]}`} />
      </div>

      {/* Body */}
      <div className="px-3 py-2">
        <span className="text-[10px] font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
          {subTypeLabels[subType] || subType}
        </span>
        {output && (
          <p className="text-[10px] text-gray-500 mt-1.5 line-clamp-2 leading-tight">
            {typeof output === 'string' ? output.slice(0, 80) : 'Datos cargados'}
          </p>
        )}
      </div>

      {/* Output handle (right side) */}
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-emerald-500 !border-2 !border-white"
      />
    </div>
  )
}

export default memo(InputNode)
