import ReactMarkdown from 'react-markdown'

interface Props {
  text: string
}

export default function HandoffDisplay({ text }: Props) {
  return (
    <div className="bg-gray-900 rounded-xl p-5 overflow-auto max-h-[600px] prose prose-invert prose-sm max-w-none">
      <ReactMarkdown
        components={{
          h1: ({ children }) => <h1 className="text-cubo-300 text-lg font-bold border-b border-gray-700 pb-2">{children}</h1>,
          h2: ({ children }) => <h2 className="text-cubo-400 text-base font-semibold mt-4">{children}</h2>,
          h3: ({ children }) => <h3 className="text-purple-300 text-sm font-semibold mt-3">{children}</h3>,
          strong: ({ children }) => <strong className="text-amber-300">{children}</strong>,
          li: ({ children }) => <li className="text-gray-300">{children}</li>,
          p: ({ children }) => <p className="text-gray-200 leading-relaxed">{children}</p>,
          code: ({ children, className }) => {
            const isBlock = className?.includes('language-')
            if (isBlock) {
              return <code className="block bg-gray-800 rounded p-3 text-xs overflow-x-auto">{children}</code>
            }
            return <code className="bg-gray-800 px-1 py-0.5 rounded text-xs">{children}</code>
          },
          hr: () => <hr className="border-gray-700 my-4" />,
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  )
}
