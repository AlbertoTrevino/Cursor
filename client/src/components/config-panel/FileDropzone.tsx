import { useState, useCallback, useRef } from 'react'
import { Upload, X, FileCheck, Loader2 } from 'lucide-react'
import { filesApi } from '@/api/files.api'
import toast from 'react-hot-toast'

interface FileDropzoneProps {
  accept: string           // e.g. ".xlsx,.xls,.csv" or ".pdf" or ".mp3,.wav,.m4a,.webm,.ogg"
  fileId: string | null    // currently uploaded file ID
  fileName: string | null  // currently uploaded file name
  disabled?: boolean
  onFileUploaded: (fileId: string, fileName: string) => void
  onFileRemoved: () => void
}

export default function FileDropzone({
  accept,
  fileId,
  fileName,
  disabled,
  onFileUploaded,
  onFileRemoved,
}: FileDropzoneProps) {
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleUpload = useCallback(async (file: File) => {
    setUploading(true)
    try {
      const { data } = await filesApi.upload(file)
      onFileUploaded(data.id, data.originalName)
      toast.success('Archivo subido')
    } catch {
      toast.error('Error al subir archivo')
    } finally {
      setUploading(false)
    }
  }, [onFileUploaded])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    if (disabled || uploading) return
    const file = e.dataTransfer.files[0]
    if (file) handleUpload(file)
  }, [disabled, uploading, handleUpload])

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleUpload(file)
    e.target.value = '' // reset so same file can be re-selected
  }, [handleUpload])

  const handleRemove = useCallback(async () => {
    if (fileId) {
      try {
        await filesApi.delete(fileId)
      } catch {
        toast.error('Error al eliminar archivo')
      }
    }
    onFileRemoved()
  }, [fileId, onFileRemoved])

  if (fileId && fileName) {
    return (
      <div className="flex items-center gap-2 px-3 py-2.5 bg-emerald-50 border border-emerald-200 rounded-lg">
        <FileCheck size={16} className="text-emerald-600 flex-shrink-0" />
        <span className="text-xs text-emerald-800 truncate flex-1">{fileName}</span>
        {!disabled && (
          <button
            onClick={handleRemove}
            className="p-0.5 text-gray-400 hover:text-red-500 transition-colors"
            aria-label="Quitar archivo"
          >
            <X size={14} />
          </button>
        )}
      </div>
    )
  }

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-label="Arrastra un archivo o haz click para seleccionar"
      onDragOver={(e) => { e.preventDefault(); if (!disabled) setDragOver(true) }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      onClick={() => !disabled && !uploading && inputRef.current?.click()}
      onKeyDown={(e) => {
        if ((e.key === 'Enter' || e.key === ' ') && !disabled && !uploading) {
          e.preventDefault()
          inputRef.current?.click()
        }
      }}
      className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
        dragOver
          ? 'border-cubo-400 bg-cubo-50'
          : disabled
            ? 'border-gray-200 bg-gray-50 cursor-not-allowed'
            : 'border-gray-300 hover:border-cubo-300 hover:bg-gray-50'
      }`}
    >
      {uploading ? (
        <>
          <Loader2 size={24} className="mx-auto text-cubo-500 mb-2 animate-spin" />
          <p className="text-xs text-gray-500">Subiendo archivo...</p>
        </>
      ) : (
        <>
          <Upload size={24} className="mx-auto text-gray-400 mb-2" />
          <p className="text-xs text-gray-500">
            Arrastra un archivo o haz click para seleccionar
          </p>
        </>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleInputChange}
        className="hidden"
      />
    </div>
  )
}
