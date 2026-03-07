import { useCallback, useState } from 'react'
import { Upload, X, FileText, Image, Database, File } from 'lucide-react'
import { ideasApi } from '@/api/ideas.api'
import type { IdeaAttachment } from '@/types/idea'
import toast from 'react-hot-toast'

interface Props {
  ideaId: string
  attachments: IdeaAttachment[]
  onChanged: () => void
}

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith('image/')) return Image
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || mimeType === 'text/csv') return Database
  if (mimeType.includes('pdf') || mimeType.includes('text')) return FileText
  return File
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function FileUploadZone({ ideaId, attachments, onChanged }: Props) {
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)

  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return

    setUploading(true)
    let successCount = 0

    for (const file of Array.from(files)) {
      try {
        await ideasApi.uploadAttachment(ideaId, file)
        successCount++
      } catch {
        toast.error(`Error al subir ${file.name}`)
      }
    }

    if (successCount > 0) {
      toast.success(`${successCount} archivo(s) subido(s)`)
      onChanged()
    }
    setUploading(false)
  }, [ideaId, onChanged])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    handleFiles(e.dataTransfer.files)
  }, [handleFiles])

  const handleDelete = async (attachmentId: string, name: string) => {
    if (!confirm(`¿Eliminar ${name}?`)) return
    try {
      await ideasApi.deleteAttachment(ideaId, attachmentId)
      onChanged()
      toast.success('Archivo eliminado')
    } catch {
      toast.error('Error al eliminar')
    }
  }

  return (
    <div>
      <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1.5">
        <Upload size={15} />
        Archivos Adjuntos
      </h3>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors ${
          dragOver
            ? 'border-cubo-400 bg-cubo-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
      >
        <Upload size={24} className="mx-auto text-gray-400 mb-2" />
        <p className="text-sm text-gray-500 mb-1">
          Arrastra archivos aquí o{' '}
          <label className="text-cubo-600 hover:text-cubo-700 cursor-pointer font-medium">
            selecciona
            <input
              type="file"
              multiple
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />
          </label>
        </p>
        <p className="text-xs text-gray-400">
          Excel, imágenes, PDF, CSV, bases de datos, SVG...
        </p>
        {uploading && (
          <p className="text-xs text-cubo-600 mt-2 animate-pulse">Subiendo...</p>
        )}
      </div>

      {/* Attached files list */}
      {attachments.length > 0 && (
        <div className="mt-3 space-y-1.5">
          {attachments.map((att) => {
            const Icon = getFileIcon(att.mimeType)
            return (
              <div
                key={att.id}
                className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg group"
              >
                <Icon size={16} className="text-gray-400 flex-shrink-0" />
                <span className="text-sm text-gray-700 flex-1 truncate">
                  {att.originalName}
                </span>
                <span className="text-xs text-gray-400">{formatSize(att.sizeBytes)}</span>
                <button
                  onClick={() => handleDelete(att.id, att.originalName)}
                  className="p-1 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Eliminar"
                >
                  <X size={14} />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
