import { useState } from 'react'
import { MessageSquareMore, Send } from 'lucide-react'
import { ideasApi } from '@/api/ideas.api'
import type { IdeaClarification } from '@/types/idea'
import toast from 'react-hot-toast'

interface Props {
  ideaId: string
  questions: IdeaClarification[]
  onAnswered: () => void
}

export default function ClarificationDialog({ ideaId, questions, onAnswered }: Props) {
  const [answers, setAnswers] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {}
    for (const q of questions) {
      init[q.id] = q.answer || ''
    }
    return init
  })
  const [submitting, setSubmitting] = useState(false)

  const unanswered = questions.filter(q => !q.answer)

  const handleSubmit = async () => {
    const toSubmit = unanswered
      .filter(q => answers[q.id]?.trim())
      .map(q => ({ id: q.id, answer: answers[q.id].trim() }))

    if (toSubmit.length === 0) {
      toast.error('Responde al menos una pregunta')
      return
    }

    setSubmitting(true)
    try {
      await ideasApi.answerClarifications(ideaId, toSubmit)
      onAnswered()
    } catch {
      toast.error('Error al enviar respuestas')
    } finally {
      setSubmitting(false)
    }
  }

  if (unanswered.length === 0 && questions.length > 0) {
    return (
      <div className="p-4 bg-green-50 rounded-xl border border-green-200">
        <p className="text-sm text-green-700 font-medium">
          Todas las preguntas han sido respondidas. Puedes procesar la idea.
        </p>
      </div>
    )
  }

  return (
    <div className="p-5 bg-amber-50 rounded-xl border border-amber-200">
      <div className="flex items-center gap-2 mb-3">
        <MessageSquareMore size={20} className="text-amber-600" />
        <h3 className="font-semibold text-amber-800">
          La AI necesita aclaraciones
        </h3>
      </div>
      <p className="text-sm text-amber-700 mb-4">
        Responde estas preguntas para que la AI pueda generar una mejor descripción.
      </p>

      <div className="space-y-4">
        {questions.map((q, idx) => (
          <div key={q.id}>
            <label className="block text-sm font-medium text-gray-800 mb-1">
              {idx + 1}. {q.question}
            </label>
            {q.answer ? (
              <p className="text-sm text-gray-600 bg-white rounded-lg px-3 py-2 border border-gray-200">
                {q.answer}
              </p>
            ) : (
              <textarea
                value={answers[q.id] || ''}
                onChange={(e) => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                rows={2}
                placeholder="Tu respuesta..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-400 focus:border-amber-400 outline-none resize-y text-sm"
              />
            )}
          </div>
        ))}
      </div>

      {unanswered.length > 0 && (
        <div className="flex justify-end mt-4">
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 transition-colors text-sm font-medium"
          >
            <Send size={14} />
            {submitting ? 'Enviando...' : 'Enviar Respuestas'}
          </button>
        </div>
      )}
    </div>
  )
}
