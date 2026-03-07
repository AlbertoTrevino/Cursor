import { useRef, useState, useEffect, useCallback } from 'react'
import {
  Pencil, Square, Circle, ArrowRight, Type, Eraser,
  Save, Undo2, Trash2, Minus
} from 'lucide-react'

interface DrawElement {
  type: 'freehand' | 'rect' | 'ellipse' | 'arrow' | 'text' | 'line'
  points?: number[][]
  x?: number
  y?: number
  w?: number
  h?: number
  text?: string
  color: string
  size: number
}

interface Props {
  initialData?: any
  onSave: (imageData: string, diagramData: any) => void
  onCancel: () => void
}

const TOOLS = [
  { id: 'freehand', icon: Pencil, label: 'Lápiz' },
  { id: 'line', icon: Minus, label: 'Línea' },
  { id: 'rect', icon: Square, label: 'Rectángulo' },
  { id: 'ellipse', icon: Circle, label: 'Elipse' },
  { id: 'arrow', icon: ArrowRight, label: 'Flecha' },
  { id: 'text', icon: Type, label: 'Texto' },
  { id: 'eraser', icon: Eraser, label: 'Borrador' },
] as const

const COLORS = ['#000000', '#ef4444', '#3b82f6', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899', '#6b7280']

export default function DiagramCanvas({ initialData, onSave, onCancel }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [elements, setElements] = useState<DrawElement[]>(initialData?.elements || [])
  const [tool, setTool] = useState<string>('freehand')
  const [color, setColor] = useState('#000000')
  const [lineWidth, setLineWidth] = useState(2)
  const [drawing, setDrawing] = useState(false)
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null)
  const [currentPoints, setCurrentPoints] = useState<number[][]>([])
  const [textInput, setTextInput] = useState<{ x: number; y: number; value: string } | null>(null)

  const redraw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    for (const el of elements) {
      ctx.strokeStyle = el.color
      ctx.fillStyle = el.color
      ctx.lineWidth = el.size
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'

      if (el.type === 'freehand' && el.points) {
        ctx.beginPath()
        for (let i = 0; i < el.points.length; i++) {
          const [x, y] = el.points[i]
          if (i === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        }
        ctx.stroke()
      } else if (el.type === 'line' && el.x !== undefined && el.y !== undefined && el.w !== undefined && el.h !== undefined) {
        ctx.beginPath()
        ctx.moveTo(el.x, el.y)
        ctx.lineTo(el.x + el.w, el.y + el.h)
        ctx.stroke()
      } else if (el.type === 'rect' && el.x !== undefined && el.y !== undefined && el.w !== undefined && el.h !== undefined) {
        ctx.strokeRect(el.x, el.y, el.w, el.h)
      } else if (el.type === 'ellipse' && el.x !== undefined && el.y !== undefined && el.w !== undefined && el.h !== undefined) {
        ctx.beginPath()
        ctx.ellipse(
          el.x + el.w / 2, el.y + el.h / 2,
          Math.abs(el.w / 2), Math.abs(el.h / 2),
          0, 0, Math.PI * 2
        )
        ctx.stroke()
      } else if (el.type === 'arrow' && el.x !== undefined && el.y !== undefined && el.w !== undefined && el.h !== undefined) {
        const endX = el.x + el.w
        const endY = el.y + el.h
        ctx.beginPath()
        ctx.moveTo(el.x, el.y)
        ctx.lineTo(endX, endY)
        ctx.stroke()

        const angle = Math.atan2(el.h, el.w)
        const headLen = 12
        ctx.beginPath()
        ctx.moveTo(endX, endY)
        ctx.lineTo(
          endX - headLen * Math.cos(angle - Math.PI / 6),
          endY - headLen * Math.sin(angle - Math.PI / 6)
        )
        ctx.moveTo(endX, endY)
        ctx.lineTo(
          endX - headLen * Math.cos(angle + Math.PI / 6),
          endY - headLen * Math.sin(angle + Math.PI / 6)
        )
        ctx.stroke()
      } else if (el.type === 'text' && el.x !== undefined && el.y !== undefined && el.text) {
        ctx.font = `${el.size * 6}px sans-serif`
        ctx.fillText(el.text, el.x, el.y)
      }
    }
  }, [elements])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const resizeCanvas = () => {
      canvas.width = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
      redraw()
    }

    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)
    return () => window.removeEventListener('resize', resizeCanvas)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    redraw()
  }, [elements, redraw])

  const getPos = (e: React.MouseEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    const pos = getPos(e)

    if (tool === 'text') {
      setTextInput({ x: pos.x, y: pos.y, value: '' })
      return
    }

    if (tool === 'eraser') {
      const threshold = 20
      setElements(prev => prev.filter(el => {
        if (el.type === 'freehand' && el.points) {
          return !el.points.some(([px, py]) =>
            Math.abs(px - pos.x) < threshold && Math.abs(py - pos.y) < threshold
          )
        }
        if (el.x !== undefined && el.y !== undefined && el.w !== undefined && el.h !== undefined) {
          return !(pos.x >= el.x && pos.x <= el.x + el.w &&
                   pos.y >= el.y && pos.y <= el.y + el.h)
        }
        return true
      }))
      return
    }

    setDrawing(true)
    setStartPos(pos)

    if (tool === 'freehand') {
      setCurrentPoints([[pos.x, pos.y]])
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!drawing) return
    const pos = getPos(e)

    if (tool === 'freehand') {
      setCurrentPoints(prev => [...prev, [pos.x, pos.y]])

      const canvas = canvasRef.current
      const ctx = canvas?.getContext('2d')
      if (ctx && currentPoints.length > 0) {
        const prev = currentPoints[currentPoints.length - 1]
        ctx.strokeStyle = color
        ctx.lineWidth = lineWidth
        ctx.lineCap = 'round'
        ctx.beginPath()
        ctx.moveTo(prev[0], prev[1])
        ctx.lineTo(pos.x, pos.y)
        ctx.stroke()
      }
    }
  }

  const handleMouseUp = (e: React.MouseEvent) => {
    if (!drawing || !startPos) {
      setDrawing(false)
      return
    }

    const pos = getPos(e)

    if (tool === 'freehand') {
      setElements(prev => [...prev, {
        type: 'freehand',
        points: [...currentPoints, [pos.x, pos.y]],
        color,
        size: lineWidth,
      }])
      setCurrentPoints([])
    } else if (['rect', 'ellipse', 'arrow', 'line'].includes(tool)) {
      setElements(prev => [...prev, {
        type: tool as DrawElement['type'],
        x: startPos.x,
        y: startPos.y,
        w: pos.x - startPos.x,
        h: pos.y - startPos.y,
        color,
        size: lineWidth,
      }])
    }

    setDrawing(false)
    setStartPos(null)
  }

  const handleUndo = () => {
    setElements(prev => prev.slice(0, -1))
  }

  const handleClear = () => {
    setElements([])
  }

  const handleTextInputConfirm = () => {
    if (textInput && textInput.value.trim()) {
      setElements(prev => [...prev, {
        type: 'text' as const,
        x: textInput.x,
        y: textInput.y,
        text: textInput.value.trim(),
        color,
        size: lineWidth,
      }])
    }
    setTextInput(null)
  }

  const handleSave = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const imageData = canvas.toDataURL('image/png')
    onSave(imageData, { elements })
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-2 bg-white border-b border-gray-200 flex-wrap">
        {/* Tools */}
        <div className="flex gap-0.5 bg-gray-100 p-0.5 rounded-lg">
          {TOOLS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTool(t.id)}
              className={`p-2 rounded-md transition-colors ${
                tool === t.id
                  ? 'bg-cubo-600 text-white'
                  : 'text-gray-600 hover:bg-gray-200'
              }`}
              title={t.label}
            >
              <t.icon size={16} />
            </button>
          ))}
        </div>

        <div className="w-px h-6 bg-gray-300" />

        {/* Colors */}
        <div className="flex gap-1">
          {COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className={`w-6 h-6 rounded-full border-2 transition-all ${
                color === c ? 'border-gray-800 scale-110' : 'border-transparent'
              }`}
              style={{ backgroundColor: c }}
              title={c}
            />
          ))}
        </div>

        <div className="w-px h-6 bg-gray-300" />

        {/* Line width */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-gray-500">Grosor:</span>
          <input
            type="range"
            min="1"
            max="8"
            value={lineWidth}
            onChange={(e) => setLineWidth(Number(e.target.value))}
            className="w-20"
          />
        </div>

        <div className="w-px h-6 bg-gray-300" />

        {/* Actions */}
        <button onClick={handleUndo} className="p-2 text-gray-500 hover:text-gray-700 rounded" title="Deshacer">
          <Undo2 size={16} />
        </button>
        <button onClick={handleClear} className="p-2 text-gray-500 hover:text-red-500 rounded" title="Limpiar">
          <Trash2 size={16} />
        </button>

        <div className="flex-1" />

        <button
          onClick={onCancel}
          className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800"
        >
          Cancelar
        </button>
        <button
          onClick={handleSave}
          className="flex items-center gap-1.5 px-4 py-1.5 bg-cubo-600 text-white rounded-lg hover:bg-cubo-700 text-sm font-medium"
        >
          <Save size={14} />
          Guardar Diagrama
        </button>
      </div>

      {/* Text input overlay */}
      {textInput && (
        <div className="absolute z-10 bg-white border border-gray-300 rounded-lg shadow-lg p-2 flex gap-1"
             style={{ left: textInput.x + 64, top: textInput.y + 48 }}>
          <input
            autoFocus
            type="text"
            value={textInput.value}
            onChange={(e) => setTextInput({ ...textInput, value: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleTextInputConfirm()
              if (e.key === 'Escape') setTextInput(null)
            }}
            placeholder="Texto..."
            className="px-2 py-1 border border-gray-200 rounded text-sm w-40 outline-none focus:ring-1 focus:ring-cubo-500"
          />
          <button
            onClick={handleTextInputConfirm}
            className="px-2 py-1 bg-cubo-600 text-white rounded text-xs"
          >
            OK
          </button>
        </div>
      )}

      {/* Canvas */}
      <div className="flex-1 overflow-hidden">
        <canvas
          ref={canvasRef}
          className="w-full h-full cursor-crosshair"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={() => {
            if (drawing) {
              setDrawing(false)
              setStartPos(null)
              setCurrentPoints([])
            }
          }}
        />
      </div>
    </div>
  )
}
