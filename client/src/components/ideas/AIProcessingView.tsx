import { Brain } from 'lucide-react'

interface Props {
  step: string
}

export default function AIProcessingView({ step }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl p-8 shadow-xl max-w-sm w-full mx-4 text-center">
        <div className="relative mx-auto w-16 h-16 mb-4">
          <Brain size={40} className="absolute inset-0 m-auto text-cubo-600" />
          <div className="w-16 h-16 border-4 border-cubo-200 border-t-cubo-600 rounded-full animate-spin" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Procesando con AI
        </h3>
        <p className="text-sm text-gray-500">
          {step || 'Preparando...'}
        </p>
        <div className="mt-4 flex items-center justify-center gap-1.5">
          <div className="w-1.5 h-1.5 bg-cubo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-1.5 h-1.5 bg-cubo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-1.5 h-1.5 bg-cubo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  )
}
