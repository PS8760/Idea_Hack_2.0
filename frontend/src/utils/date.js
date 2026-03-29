/**
 * Format a date string/object into a readable local date+time.
 * e.g. "27 Mar 2026, 10:45 AM"
 */
export function formatDate(value) {
  if (!value) return '—'
  const d = new Date(value)
  if (isNaN(d)) return '—'
  return d.toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  })
}

/**
 * Format just the date portion.
 * e.g. "27 Mar 2026"
 */
export function formatDateOnly(value) {
  if (!value) return '—'
  const d = new Date(value)
  if (isNaN(d)) return '—'
  return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

/**
 * Relative time from now — "2 hours ago", "just now", "in 3 hours"
 */
export function timeAgo(value) {
  if (!value) return '—'
  const d = new Date(value)
  if (isNaN(d)) return '—'
  const diff = Date.now() - d.getTime()
  const abs = Math.abs(diff)
  const future = diff < 0

  const mins  = Math.floor(abs / 60000)
  const hours = Math.floor(abs / 3600000)
  const days  = Math.floor(abs / 86400000)

  let label
  if (abs < 60000)        label = 'just now'
  else if (mins < 60)     label = `${mins}m ago`
  else if (hours < 24)    label = `${hours}h ago`
  else if (days < 7)      label = `${days}d ago`
  else                    label = formatDateOnly(value)

  if (future && abs >= 60000) {
    if (mins < 60)   label = `in ${mins}m`
    else if (hours < 24) label = `in ${hours}h`
    else             label = `in ${days}d`
  }

  return label
}

/**
 * SLA deadline display — shows relative time and overdue state.
 */
export function slaLabel(deadline, status) {
  if (!deadline) return null
  const d = new Date(deadline)
  if (isNaN(d)) return null
  const overdue = d < new Date() && status !== 'resolved'
  const rel = timeAgo(deadline)
  return { label: overdue ? `Overdue ${rel.replace(' ago', '')}` : rel, overdue }
}
