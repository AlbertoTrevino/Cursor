import { memo } from 'react'

interface NodeBadgeProps {
  label: string
  color: 'amber' | 'purple' | 'green' | 'blue' | 'red' | 'gray'
}

const colorMap: Record<string, string> = {
  amber: 'bg-amber-100 text-amber-700 border-amber-200',
  purple: 'bg-purple-100 text-purple-700 border-purple-200',
  green: 'bg-green-100 text-green-700 border-green-200',
  blue: 'bg-blue-100 text-blue-700 border-blue-200',
  red: 'bg-red-100 text-red-700 border-red-200',
  gray: 'bg-gray-100 text-gray-600 border-gray-200',
}

function NodeBadge({ label, color }: NodeBadgeProps) {
  return (
    <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded border ${colorMap[color]}`}>
      {label}
    </span>
  )
}

export default memo(NodeBadge)
