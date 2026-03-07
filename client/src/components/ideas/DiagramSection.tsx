import { useState, useRef, useCallback } from 'react'
import { PenTool, Upload, Trash2, Plus, X, Image, Edit3 } from 'lucide-react'
import { ideasApi } from '@/api/ideas.api'
import type { IdeaDiagram } from '@/types/idea'
import DiagramCanvas from './DiagramCanvas'
import toast from 'react-hot-toast'

interface Props {
  ideaId: string
  diagrams: IdeaDiagram[]
  onChanged: () => void
}

export default function DiagramSection({ ideaId, diagrams, onChanged }: Props) {
  const [showCanvas, setShowCanvas] = useState(false)
  const [editingDiagram, setEditingDiagram] = useState<IdeaDiagram | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleSaveCanvas = useCallback(async (imageData: string, diagramData: any) => {
    try {
      if (editingDiagram) {
        await ideasApi.updateDiagram(ideaId, editingDiagram.id, {
          imageData,
          diagramData,
        })
      } else {
        await ideasApi.saveDiagram(ideaId, {
          name: `Diagrama ${diagrams.length + 1}`,
          imageData,
          diagramData,
          sourceType: 'excalidraw',
        })
      }
      setShowCanvas(false)
      setEditingDiagram(null)
      onChanged()
      toast.success('Diagrama guardado')
    } catch {
      toast.error('Error al guardar diagrama')
    }
  }, [ideaId, diagrams.length, editingDiagram, onChanged])

  const handleUploadImage = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return
    setUploading(true)

    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/') && !file.type.includes('svg')) {
        toast.error(`${file.name} no es una imagen`)
        continue
      }

      try {
        const reader = new FileReader()
        const imageData = await new Promise<string>((resolve) => {
          reader.onload = () => resolve(reader.result as string)
          reader.readAsDataURL(file)
        })

        await ideasApi.saveDiagram(ideaId, {
          name: file.name,
          imageData,
          sourceType: 'upload',
        })
      } catch {
        toast.error(`Error al subir ${file.name}`)
      }
    }

    onChanged()
    setUploading(false)
  }, [ideaId, onChanged])

  const handleDelete = async (diagramId: string, name: string) => {
    if (!confirm(`¿Eliminar ${name}?`)) return
    try {
      await ideasApi.deleteDiagram(ideaId, diagramId)
      onChanged()
      toast.success('Diagrama eliminado')
    } catch {
      toast.error('Error al eliminar')
    }
  }

  const handleEdit = (diagram: IdeaDiagram) => {
    if (diagram.sourceType === 'excalidraw') {
      setEditingDiagram(diagram)
      setShowCanvas(true)
    }
  }

  return (
    <div>
      <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1.5">
        <PenTool size={15} />
        Diagramas
      </h3>

      {/* Canvas overlay */}
      {showCanvas && (
        <div className="fixed inset-0 z-50 bg-white">
          <div className="h-full flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white">
              <h3 className="font-semibold text-gray-900">
                {editingDiagram ? 'Editar Diagrama' : 'Nuevo Diagrama'}
              </h3>
              <button
                onClick={() => { setShowCanvas(false); setEditingDiagram(null) }}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded"
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex-1">
              <DiagramCanvas
                initialData={editingDiagram?.diagramData}
                onSave={handleSaveCanvas}
                onCancel={() => { setShowCanvas(false); setEditingDiagram(null) }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2 mb-3">
        <button
          onClick={() => { setEditingDiagram(null); setShowCanvas(true) }}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700"
        >
          <Plus size={14} />
          Dibujar
        </button>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700"
        >
          <Upload size={14} />
          Subir Imagen
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.svg,.drawio"
          multiple
          className="hidden"
          onChange={(e) => handleUploadImage(e.target.files)}
        />
        {uploading && (
          <span className="text-xs text-cubo-600 animate-pulse self-center">Subiendo...</span>
        )}
      </div>

      {/* Diagram gallery */}
      {diagrams.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {diagrams.map((d) => (
            <div key={d.id} className="relative group border border-gray-200 rounded-xl overflow-hidden bg-gray-50">
              {d.imageData ? (
                <img
                  src={d.imageData}
                  alt={d.name}
                  className="w-full h-32 object-contain p-2"
                />
              ) : (
                <div className="w-full h-32 flex items-center justify-center">
                  <Image size={32} className="text-gray-300" />
                </div>
              )}
              <div className="absolute bottom-0 left-0 right-0 bg-white/90 px-2 py-1.5 flex items-center justify-between">
                <span className="text-xs text-gray-600 truncate flex-1">{d.name}</span>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {d.sourceType === 'excalidraw' && (
                    <button
                      onClick={() => handleEdit(d)}
                      className="p-1 text-gray-400 hover:text-cubo-600"
                      title="Editar"
                    >
                      <Edit3 size={12} />
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(d.id, d.name)}
                    className="p-1 text-gray-400 hover:text-red-500"
                    title="Eliminar"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
