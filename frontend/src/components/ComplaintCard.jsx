import { useNavigate } from 'react-router-dom'
import { Clock, AlertTriangle, CheckCircle, Loader2, Copy, MessageSquare, Mail, Phone, Globe } from 'lucide-react'
import { timeAgo, slaLabel } from '../utils/date'

const priorityMap = {
  high:   { cls: 'text-red-500 bg-red-50 border-red-200',       dot: 'bg-red-500' },
  medium: { cls: 'text-yellow-600 bg-yellow-50 border-yellow-200', dot: 'bg-yellow-500' },
  low:    { cls: 'text-emerald-600 bg-emerald-50 border-emerald-200', dot: 'bg-emerald-500' },
}

const sentimentMap = {
  positive: 'text-emerald-600',
  neutral:  'text-slate-400',
  negative: 'text-red-500',
}

const statusMap = {
  open:          { icon: Loader2,       cls: 'text-blue-500',    spin: true },
  'in-progress': { icon: AlertTriangle, cls: 'text-yellow-600' },
  resolved:      { icon: CheckCircle,   cls: 'text-emerald-600' },
}

const channelIcons = {
  whatsapp: MessageSquare, email: Mail, phone: Phone, web: Globe, chat: MessageSquare,
}

export default function ComplaintCard({ complaint }) {
  const navigate = useNavigate()
  const { _id, title, category, priority, status, sentiment, sla_deadline, channel, is_duplicate, created_at } = complaint

  const p = priorityMap[priority] || priorityMap.medium
  const s = statusMap[status] || statusMap.open
  const StatusIcon = s.icon
  const ChannelIcon = channelIcons[channel] || Globe

  const sla = slaLabel(sla_deadline, status)

  return (
    <div
      onClick={() => navigate(`/app/complaints/${_id}`)}
      className="card card-hover rounded-2xl p-5 cursor-pointer group"
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <h3 className="font-medium text-sm line-clamp-2 leading-snug group-hover:text-violet-600 transition-colors"
          style={{ color: 'var(--text-primary)' }}>{title}</h3>
        {is_duplicate && (
          <span className="badge border border-orange-300 text-orange-600 bg-orange-50 shrink-0">Dup</span>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5 mb-4">
        <span className="badge border text-xs" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)', background: 'var(--bg-elevated)' }}>{category}</span>
        <span className={`badge border text-xs ${p.cls}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${p.dot}`} />{priority}
        </span>
        <span className={`text-xs ${sentimentMap[sentiment] || 'text-slate-400'}`}>{sentiment}</span>
      </div>

      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-3">
          <span className={`flex items-center gap-1 ${s.cls}`}>
            <StatusIcon size={12} className={s.spin ? 'animate-spin' : ''} />
            <span className="capitalize">{status}</span>
          </span>
          <span className="flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
            <ChannelIcon size={11} />
            <span className="capitalize">{channel}</span>
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Submitted time */}
          {created_at && (
            <span className="flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
              <Clock size={11} />
              {timeAgo(created_at)}
            </span>
          )}
          {/* SLA overdue indicator */}
          {sla?.overdue && (
            <span className="text-red-500 font-medium">{sla.label}</span>
          )}
        </div>
      </div>
    </div>
  )
}
