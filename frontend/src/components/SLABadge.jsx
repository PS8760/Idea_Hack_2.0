import { Clock } from 'lucide-react'

export default function SLABadge({ deadline, status }) {
  if (!deadline) return null
  const d = new Date(deadline)
  if (isNaN(d)) return null

  const diffMs  = d - Date.now()
  const diffHrs = Math.floor(Math.abs(diffMs) / 3600000)
  const diffMin = Math.floor((Math.abs(diffMs) % 3600000) / 60000)
  const isOverdue = diffMs < 0 && status !== 'resolved'
  const isResolved = status === 'resolved'
  const isWarning = !isOverdue && diffHrs < 4

  let cls, label
  if (isResolved)      { cls = 'text-emerald-600 bg-emerald-50 border-emerald-200'; label = 'SLA Met' }
  else if (isOverdue)  { cls = 'text-red-600 bg-red-50 border-red-200';             label = `Breached ${diffHrs}h ago` }
  else if (isWarning)  { cls = 'text-yellow-600 bg-yellow-50 border-yellow-200';    label = diffHrs > 0 ? `${diffHrs}h ${diffMin}m left` : `${diffMin}m left` }
  else                 { cls = 'text-emerald-600 bg-emerald-50 border-emerald-200'; label = `${diffHrs}h remaining` }

  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border font-medium ${cls}`}>
      <Clock size={11} /> {label}
    </span>
  )
}
