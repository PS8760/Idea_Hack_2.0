import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import api from '../api/axios'
import toast from 'react-hot-toast'
import {
  Inbox, Filter, PlayCircle, CheckCircle2, Clock, User,
  MessageSquare, Mail, Phone, Globe, MessageCircle,
  ChevronRight, RefreshCw, Flame, AlertTriangle, Loader2
} from 'lucide-react'

const STATUSES  = ['all', 'open', 'in-progress', 'resolved']
const CHANNELS  = ['all', 'web', 'email', 'whatsapp', 'phone', 'chat']
const CHANNEL_ICONS = { whatsapp: MessageSquare, email: Mail, phone: Phone, web: Globe, chat: MessageCircle }
const PRIORITY_META = {
  high:   { color: 'text-red-400',     dot: 'bg-red-400'     },
  medium: { color: 'text-yellow-400',  dot: 'bg-yellow-400'  },
  low:    { color: 'text-emerald-400', dot: 'bg-emerald-400' },
}
const STATUS_META = {
  open:          { color: 'text-blue-400',    bg: 'bg-blue-400/10',    label: 'Open',      icon: AlertTriangle },
  'in-progress': { color: 'text-yellow-400',  bg: 'bg-yellow-400/10',  label: 'In Review', icon: PlayCircle    },
  resolved:      { color: 'text-emerald-400', bg: 'bg-emerald-400/10', label: 'Resolved',  icon: CheckCircle2  },
}

function isOverdue(c) {
  return c.status !== 'resolved' && c.sla_deadline && new Date(c.sla_deadline) < new Date()
}

function getSLA(c) {
  if (c.status === 'resolved' || !c.sla_deadline) return null
  const diff = new Date(c.sla_deadline) - new Date()
  const hrs = Math.floor(diff / 3600000)
  if (diff < 0) return { label: 'Overdue', color: 'text-red-400' }
  if (hrs < 4)  return { label: `${hrs}h left`, color: 'text-orange-400' }
  if (hrs < 24) return { label: `${hrs}h left`, color: 'text-yellow-400' }
  return { label: `${Math.floor(hrs / 24)}d left`, color: 'text-slate-400' }
}

function QueueRow({ complaint, onStatusChange }) {
  const navigate = useNavigate()
  const [acting, setActing] = useState(false)
  const { _id, title, summary, category, priority, status, channel, assigned_agent, created_at } = complaint
  const pm = PRIORITY_META[priority] || PRIORITY_META.medium
  const sm = STATUS_META[status] || STATUS_META.open
  const ChannelIcon = CHANNEL_ICONS[channel] || Globe
  const StatusIcon = sm.icon
  const sla = getSLA(complaint)
  const overdue = isOverdue(complaint)

  const quickAction = async (e, newStatus) => {
    e.stopPropagation()
    setActing(true)
    try {
      await api.patch(`/complaints/${_id}`, { status: newStatus })
      toast.success(
        newStatus === 'in-progress' ? '✓ Review started — customer notified' :
        newStatus === 'resolved'    ? '✓ Resolved — customer notified' : 'Updated'
      )
      onStatusChange(_id, newStatus)
    } catch { toast.error('Failed to update') }
    finally { setActing(false) }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      onClick={() => navigate(`/app/complaints/${_id}`)}
      className="group flex items-start gap-4 px-5 py-4 cursor-pointer transition-colors"
      style={{ borderBottom: '1px solid var(--border)' }}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-elevated)'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      <div className="flex flex-col items-center gap-1.5 pt-1 shrink-0">
        <div className={`w-2.5 h-2.5 rounded-full ${status === 'resolved' ? 'bg-slate-600' : pm.dot} ${priority === 'high' && status !== 'resolved' ? 'animate-pulse' : ''}`} />
        <ChannelIcon size={11} style={{ color: 'var(--text-muted)' }} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="text-sm font-medium truncate group-hover:text-violet-400 transition-colors"
            style={{ color: 'var(--text-primary)' }}>{title}</h3>
          {overdue && (
            <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded-md text-red-400 bg-red-400/10 border border-red-400/20 flex items-center gap-1">
              <Flame size={9} /> Overdue
            </span>
          )}
        </div>
        {summary && <p className="text-xs mb-2 line-clamp-1" style={{ color: 'var(--text-muted)' }}>{summary}</p>}
        <div className="flex items-center flex-wrap gap-2">
          <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full ${sm.bg} ${sm.color}`}>
            <StatusIcon size={9} />{sm.label}
          </span>
          <span className={`text-[10px] font-medium ${pm.color}`}>{priority}</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full"
            style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
            {category}
          </span>
          {assigned_agent && (
            <span className="flex items-center gap-1 text-[10px] text-violet-400">
              <User size={9} />{assigned_agent}
            </span>
          )}
          <span className="text-[10px] ml-auto" style={{ color: 'var(--text-muted)' }}>
            {new Date(created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0" onClick={e => e.stopPropagation()}>
        {sla && (
          <span className={`text-[10px] font-medium flex items-center gap-1 ${sla.color}`}>
            <Clock size={9} />{sla.label}
          </span>
        )}
        {status === 'open' && (
          <button onClick={e => quickAction(e, 'in-progress')} disabled={acting}
            className="flex items-center gap-1.5 text-[11px] font-medium px-3 py-1.5 rounded-lg bg-yellow-500/15 text-yellow-400 border border-yellow-400/20 hover:bg-yellow-500/25 transition-colors">
            {acting ? <Loader2 size={10} className="animate-spin" /> : <PlayCircle size={11} />}
            Start Review
          </button>
        )}
        {status === 'in-progress' && (
          <button onClick={e => quickAction(e, 'resolved')} disabled={acting}
            className="flex items-center gap-1.5 text-[11px] font-medium px-3 py-1.5 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-400/20 hover:bg-emerald-500/25 transition-colors">
            {acting ? <Loader2 size={10} className="animate-spin" /> : <CheckCircle2 size={11} />}
            Resolve
          </button>
        )}
        <ChevronRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity text-violet-400" />
      </div>
    </motion.div>
  )
}

export default function AgentQueue() {
  const [complaints, setComplaints] = useState([])
  const [loading, setLoading] = useState(true)
  const [channel, setChannel] = useState('all')
  const [status, setStatus] = useState('all')

  const fetchQueue = useCallback(async () => {
    setLoading(true)
    try {
      const params = {}
      if (channel !== 'all') params.channel = channel
      if (status  !== 'all') params.status  = status
      const { data } = await api.get('/complaints', { params })
      setComplaints(data)
    } catch { toast.error('Failed to load queue') }
    finally { setLoading(false) }
  }, [channel, status])

  useEffect(() => { fetchQueue() }, [fetchQueue])

  const handleStatusChange = (id, newStatus) => {
    setComplaints(prev => prev.map(c => c._id === id ? { ...c, status: newStatus } : c))
  }

  const stats = {
    open:       complaints.filter(c => c.status === 'open').length,
    inProgress: complaints.filter(c => c.status === 'in-progress').length,
    resolved:   complaints.filter(c => c.status === 'resolved').length,
    overdue:    complaints.filter(isOverdue).length,
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-violet-400/10 flex items-center justify-center">
            <Inbox size={18} className="text-violet-400" />
          </div>
          <div>
            <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>Complaint Queue</h1>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              {complaints.length} total · {stats.open} open · {stats.inProgress} in review
            </p>
          </div>
        </div>
        <button onClick={fetchQueue} className="transition-colors hover:text-violet-400" style={{ color: 'var(--text-muted)' }}>
          <RefreshCw size={15} />
        </button>
      </div>

      {!loading && complaints.length > 0 && (
        <div className="grid grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Open',      value: stats.open,       color: 'text-blue-400',    bg: 'bg-blue-400/10',    icon: AlertTriangle },
            { label: 'In Review', value: stats.inProgress, color: 'text-yellow-400',  bg: 'bg-yellow-400/10',  icon: PlayCircle    },
            { label: 'Resolved',  value: stats.resolved,   color: 'text-emerald-400', bg: 'bg-emerald-400/10', icon: CheckCircle2  },
            { label: 'Overdue',   value: stats.overdue,    color: 'text-red-400',     bg: 'bg-red-400/10',     icon: Flame         },
          ].map(s => (
            <div key={s.label} className="flex items-center gap-2.5 px-4 py-3 rounded-xl"
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
              <div className={`w-7 h-7 rounded-lg ${s.bg} flex items-center justify-center shrink-0`}>
                <s.icon size={13} className={s.color} />
              </div>
              <div>
                <div className={`text-xl font-bold leading-none ${s.color}`}>{s.value}</div>
                <div className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex items-center gap-2">
          <Filter size={13} style={{ color: 'var(--text-muted)' }} />
          <div className="flex gap-1 rounded-xl p-1" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
            {CHANNELS.map(c => (
              <button key={c} onClick={() => setChannel(c)}
                className={`px-3 py-1.5 rounded-lg text-xs capitalize transition-colors ${channel === c ? 'bg-violet-600 text-white' : ''}`}
                style={channel !== c ? { color: 'var(--text-muted)' } : {}}>{c}</button>
            ))}
          </div>
        </div>
        <div className="flex gap-1 rounded-xl p-1" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
          {STATUSES.map(s => (
            <button key={s} onClick={() => setStatus(s)}
              className={`px-3 py-1.5 rounded-lg text-xs capitalize transition-colors ${status === s ? 'bg-violet-600 text-white' : ''}`}
              style={status !== s ? { color: 'var(--text-muted)' } : {}}>{s}</button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : complaints.length === 0 ? (
        <div className="text-center py-24" style={{ color: 'var(--text-muted)' }}>
          <Inbox size={32} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">Queue is empty</p>
        </div>
      ) : (
        <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
          {complaints.map((c, i) => (
            <QueueRow key={c._id} complaint={c} onStatusChange={handleStatusChange} />
          ))}
        </div>
      )}
    </div>
  )
}
