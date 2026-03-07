interface Props {
  text: string
}

export default function HandoffDisplay({ text }: Props) {
  const lines = text.split('\n')

  return (
    <div className="bg-gray-900 rounded-xl p-5 overflow-auto max-h-[600px]">
      <pre className="text-sm text-gray-100 whitespace-pre-wrap font-mono leading-relaxed">
        {lines.map((line, i) => {
          if (line.startsWith('# ')) {
            return (
              <span key={i} className="text-cubo-300 font-bold text-base">
                {line}
                {'\n'}
              </span>
            )
          }
          if (line.startsWith('## ')) {
            return (
              <span key={i} className="text-cubo-400 font-semibold">
                {line}
                {'\n'}
              </span>
            )
          }
          if (line.startsWith('### ')) {
            return (
              <span key={i} className="text-purple-300 font-semibold">
                {line}
                {'\n'}
              </span>
            )
          }
          if (line.startsWith('**') && line.endsWith('**')) {
            return (
              <span key={i} className="text-amber-300 font-semibold">
                {line}
                {'\n'}
              </span>
            )
          }
          if (line.startsWith('- ') || line.startsWith('* ')) {
            return (
              <span key={i} className="text-gray-300">
                {line}
                {'\n'}
              </span>
            )
          }
          if (line.startsWith('---')) {
            return (
              <span key={i} className="text-gray-600">
                {line}
                {'\n'}
              </span>
            )
          }
          return (
            <span key={i}>
              {line}
              {'\n'}
            </span>
          )
        })}
      </pre>
    </div>
  )
}
