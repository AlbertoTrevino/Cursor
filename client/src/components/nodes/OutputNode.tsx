import { memo, useState, useCallback } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { FileSpreadsheet, Mail, Database, Download, Loader2 } from 'lucide-react'
import type { RunState } from '@shared/runState'
import { filesApi, downloadBlob } from '@/api/files.api'

const subTypeIcons: Record<string, React.ReactNode> = {
  excel: <FileSpreadsheet size={14} />,
  email: <Mail size={14} />,
  sql: <Database size={14} />,
}

const subTypeLabels: Record<string, string> = {
  excel: 'Excel',
  email: 'Email',
  sql: 'SQL',
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

function OutputNode({ data, selected }: NodeProps) {
  const subType = (data.subType as string) || 'excel'
  const runState = (data.runState as RunState) || 'idle'
  const label = (data.label as string) || 'Salida'
  const output = data.output as Record<string, string> | string | null
  const isLit = runState === 'success'
  const fileId = typeof output === 'object' && output?.fileId ? output.fileId : null
  const fileName = typeof output === 'object' && output?.fileName ? output.fileName : 'resultado.xlsx'

  const [downloading, setDownloading] = useState(false)
  const handleDownload = useCallback(async () => {
    if (!fileId) return
    setDownloading(true)
    try {
      const { data: blob } = await filesApi.download(fileId)
      downloadBlob(blob, fileName)
    } catch { /* silent */ }
    finally { setDownloading(false) }
  }, [fileId, fileName])

  return (
    <div
      className={`bg-white rounded-xl border-2 shadow-sm w-52 transition-all node-state-${runState} ${
        isLit ? 'node-output-lit' : ''
      } ${selected ? 'border-amber-500 shadow-md' : 'border-amber-200'}`}
    >
      {/* Input handle (left side) */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-amber-500 !border-2 !border-white"
      />

      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 rounded-t-[10px] border-b border-amber-100">
        <span className="text-amber-600 flex-shrink-0">
          {subTypeIcons[subType] || <FileSpreadsheet size={14} />}
        </span>
        <span className="text-xs font-semibold text-amber-800 truncate flex-1">
          {label}
        </span>
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${statusDotStyles[runState]}`} />
      </div>

      {/* Body */}
      <div className="px-3 py-2">
        <span className="text-[10px] font-medium text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
          {subTypeLabels[subType] || subType}
        </span>
        {output && runState === 'success' && (
          fileId ? (
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="mt-1.5 flex items-center gap-1 text-[10px] font-medium text-green-700 bg-green-50 hover:bg-green-100 px-2 py-1 rounded border border-green-200 transition-colors disabled:opacity-50"
            >
              {downloading ? <Loader2 size={10} className="animate-spin" /> : <Download size={10} />}
              Descargar {fileName}
            </button>
          ) : (
            <p className="text-[10px] text-green-600 mt-1.5 font-medium">
              Archivo generado
            </p>
          )
        )}
      </div>
    </div>
  )
}

export default memo(OutputNode)
