import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import api from '../api/axios'
import toast from 'react-hot-toast'
import {
  ListChecks, CheckCircle2, Clock, Loader2, AlertTriangle,
  MessageSquare, Mail, Phone, Globe, MessageCircle,
  ChevronRight, Search, PlusCircle, Flame, ArrowUpDown,
  User, Sparkles, Copy, Trash2
} from 'lucide-react'

const STATUS_META = {
  open:          { label: 'Open',        color: 'text-blue-400',    bg: 'bg-blue-400/10',    border: 'border-blue-400/20',    icon: Loader2,       spin: true  },
  'in-progress': { label: 'In Progress', color: 'text-yellow-400',  bg: 'bg-yellow-400/10',  border: 'border-yellow-400/20',  icon: AlertTriangle, spin: false },
  resolved:      { label: 'Resolved',    color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/20', icon: CheckCircle2,  spin: false },
}
const PRIORITY_META = {
  high:   { color: 'text-red-400',     dot: 'bg-red-400',     label: 'High'   },
  medium: { color: 'text-yellow-400',  dot: 'bg-yellow-400',  label: 'Medium' },
  low:    { color: 'text-emerald-400', dot: 'bg-emerald-400', label: 'Low'    },
}
const CHANNEL_ICONS = { whatsapp: MessageSquare, email: Mail, phone: Phone, web: Globe, chat: MessageCircle }
const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 }
const TABS = [{ key: 'active', label: 'Active' }, { key: 'resolved', label: 'Resolved' }, { key: 'all', label: 'All' }]
const SORT_OPTIONS = [
  { key: 'newest',   label: 'Newest first' },
  { key: 'oldest',   label: 'Oldest first' },
  { key: 'priority', label: 'By priority'  },
  { key: 'sla',      label: 'SLA urgency'  },
]

function getSLA(deadline, status) {
  if (!deadline || status === 'resolved') return null
  const diff = new Date(deadline) - new Date()
  const hrs = Math.floor(diff / 3600000)
  if (diff < 0) return { label: 'Overdue', color: 'text-red-400', bg: 'bg-red-400/10', overdue: true }
  if (hrs < 4)  return { label: `${hrs}h left`, color: 'text-orange-400', bg: 'bg-orange-400/10', overdue: false }
  if (hrs < 24) return { label: `${hrs}h left`, color: 'text-yellow-400', bg: 'bg-yellow-400/10', overdue: false }
  return { label: `${Math.floor(hrs / 24)}d left`, color: 'text-slate-400', bg: 'bg-slate-400/10', overdue: false }
}

function isOverdue(c) {
  return c.status !== 'resolved' && c.sla_deadline && new Date(c.sla_deadline) < new Date()
}

function StatPill({ label, value, color, bg, icon: Icon }) {
  return (
    <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
      <div className={`w-7 h-7 rounded-lg ${bg} flex items-center justify-center shrink-0`}>
        <Icon size={13} className={color} />
      </div>
      <div>
        <div className={`text-xl font-bold leading-none ${color}`}>{value}</div>
        <div className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{label}</div>
      </div>
    </div>
  )
}

function ComplaintRow({ complaint, index, onDelete }) {
  const navigate = useNavigate()
  const { _id, title, summary, category, priority, status, sla_deadline, channel, assigned_agent, is_duplicate, created_at } = complaint
  const sm = STATUS_META[status] || STATUS_META.open
  const pm = PRIORITY_META[priority] || PRIORITY_META.medium
  const sla = getSLA(sla_deadline, status)
  const ChannelIcon = CHANNEL_ICONS[channel] || Globe
  const StatusIcon = sm.icon

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.03 }}
      onClick={() => navigate(`/app/complaints/${_id}`)}
      className="group flex items-start gap-4 px-5 py-4 cursor-pointer transition-colors"
      style={{ borderBottom: '1px solid var(--border)' }}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-elevated)'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      {/* Left indicator */}
      <div className="flex flex-col items-center gap-1.5 pt-1 shrink-0">
        <div className={`w-2.5 h-2.5 rounded-full ${pm.dot} ${priority === 'high' ? 'animate-pulse' : ''}`} />
        <ChannelIcon size={11} style={{ color: 'var(--text-muted)' }} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="text-sm font-medium truncate group-hover:text-violet-400 transition-colors" style={{ color: 'var(--text-primary)' }}>
            {title}
          </h3>
          {is_duplicate && (
            <span className="shrink-0 flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md text-orange-400 bg-orange-400/10 border border-orange-400/20">
              <Copy size={9} /> Dup
            </span>
          )}
        </div>

        {summary && (
          <p className="text-xs mb-2 line-clamp-1" style={{ color: 'var(--text-muted)' }}>
            <Sparkles size={9} className="inline mr-1 text-violet-400" />{summary}
          </p>
        )}

        <div className="flex items-center flex-wrap gap-2">
          <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full ${sm.bg} ${sm.color} border ${sm.border}`}>
            <StatusIcon size={9} className={sm.spin ? 'animate-spin' : ''} />{sm.label}
          </span>
          <span className={`text-[10px] font-medium ${pm.color}`}>{pm.label}</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
            {category}
          </span>
          {assigned_agent && (
            <span className="flex items-center gap-1 text-[10px] text-violet-400">
              <User size={9} />{assigned_agent}
            </span>
          )}
          <span className="text-[10px] ml-auto" style={{ color: 'var(--text-muted)' }}>
            {new Date(created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
          </span>
        </div>
      </div>

      {/* SLA + delete + arrow */}
      <div className="flex items-center gap-2 shrink-0">
        {sla && (
          <span className={`flex items-center gap-1 text-[10px] px-2.5 py-1.5 rounded-xl ${sla.bg} ${sla.color} font-medium`}>
            <Clock size={9} />{sla.label}
          </span>
        )}
        <button
          onClick={e => { e.stopPropagation(); onDelete(_id, title) }}
          className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-red-400/10 text-red-400"
          title="Delete complaint"
        >
          <Trash2 size={13} />
        </button>
        <ChevronRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity text-violet-400" />
      </div>
    </motion.div>
  )
}

export default function MyComplaints() {
  const navigate = useNavigate()
  const [complaints, setComplaints] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('active')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('newest')
  const [showSort, setShowSort] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null) // { id, title }
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    api.get('/complaints/mine')
      .then(({ data }) => setComplaints(data))
      .catch(() => toast.error('Failed to load your complaints'))
      .finally(() => setLoading(false))
  }, [])

  const handleDelete = (id, title) => setDeleteTarget({ id, title })

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await api.delete(`/complaints/${deleteTarget.id}`)
      setComplaints(prev => prev.filter(c => c._id !== deleteTarget.id))
      toast.success('Complaint deleted successfully')
      setDeleteTarget(null)
    } catch {
      toast.error('Failed to delete complaint')
    } finally {
      setDeleting(false)
    }
  }

  const stats = useMemo(() => ({
    total:    complaints.length,
    active:   complaints.filter(c => c.status !== 'resolved').length,
    resolved: complaints.filter(c => c.status === 'resolved').length,
    overdue:  complaints.filter(isOverdue).length,
  }), [complaints])

  const filtered = useMemo(() => {
    let list = [...complaints]
    if (tab === 'active')   list = list.filter(c => c.status !== 'resolved')
    if (tab === 'resolved') list = list.filter(c => c.status === 'resolved')
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(c => c.title?.toLowerCase().includes(q) || c.category?.toLowerCase().includes(q) || c.summary?.toLowerCase().includes(q))
    }
    if (sort === 'newest')   list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    if (sort === 'oldest')   list.sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    if (sort === 'priority') list.sort((a, b) => (PRIORITY_ORDER[a.priority] ?? 1) - (PRIORITY_ORDER[b.priority] ?? 1))
    if (sort === 'sla')      list.sort((a, b) => (a.sla_deadline ? new Date(a.sla_deadline) : Infinity) - (b.sla_deadline ? new Date(b.sla_deadline) : Infinity))
    return list
  }, [complaints, tab, search, sort])

  const overdueList = filtered.filter(isOverdue)
  const normalList  = filtered.filter(c => !isOverdue(c))
  const showGrouped = (tab === 'active' || tab === 'all') && overdueList.length > 0

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Delete confirmation modal */}
      <AnimatePresence>
        {deleteTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
            <motion.div initial={{ opacity: 0, scale: 0.93, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.93 }} className="w-full max-w-sm rounded-2xl p-6 shadow-2xl"
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
              <div className="w-12 h-12 rounded-2xl bg-red-400/10 flex items-center justify-center mx-auto mb-4">
                <Trash2 size={20} className="text-red-400" />
              </div>
              <h2 className="text-base font-semibold text-center mb-1" style={{ color: 'var(--text-primary)' }}>
                Delete Complaint?
              </h2>
              <p className="text-xs text-center mb-5" style={{ color: 'var(--text-muted)' }}>
                "{deleteTarget.title}" will be permanently removed and cannot be recovered.
              </p>
              <div className="flex gap-3">
                <button onClick={confirmDelete} disabled={deleting}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium text-white bg-red-500 hover:bg-red-600 transition-colors">
                  {deleting ? <><Loader2 size={13} className="animate-spin" />Deleting...</> : <><Trash2 size={13} />Delete</>}
                </button>
                <button onClick={() => setDeleteTarget(null)} className="btn-ghost px-5">Cancel</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-400/10 flex items-center justify-center">
            <ListChecks size={18} className="text-blue-400" />
          </div>
          <div>
            <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>My Complaints</h1>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Track and manage all your submitted complaints</p>
          </div>
        </div>
        <button onClick={() => navigate('/app/submit')} className="btn-primary flex items-center gap-2 text-sm">
          <PlusCircle size={14} /> New
        </button>
      </div>

      {/* Stats */}
      {!loading && complaints.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <StatPill label="Total"    value={stats.total}    color="text-violet-400"  bg="bg-violet-400/10"  icon={ListChecks}  />
          <StatPill label="Active"   value={stats.active}   color="text-blue-400"    bg="bg-blue-400/10"    icon={Loader2}     />
          <StatPill label="Resolved" value={stats.resolved} color="text-emerald-400" bg="bg-emerald-400/10" icon={CheckCircle2}/>
          <StatPill label="Overdue"  value={stats.overdue}  color="text-red-400"     bg="bg-red-400/10"     icon={Flame}       />
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="flex gap-1 rounded-xl p-1" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${tab === t.key ? 'bg-violet-600 text-white' : ''}`}
              style={tab !== t.key ? { color: 'var(--text-muted)' } : {}}>
              {t.label}
              {t.key === 'active' && stats.active > 0 && (
                <span className={`ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full ${tab === t.key ? 'bg-white/20' : 'bg-violet-500/20 text-violet-400'}`}>
                  {stats.active}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 flex-1 min-w-[160px] rounded-xl px-3 py-2" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
          <Search size={13} style={{ color: 'var(--text-muted)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by title, category..."
            className="text-xs bg-transparent outline-none flex-1" style={{ color: 'var(--text-primary)' }} />
        </div>

        <div className="relative">
          <button onClick={() => setShowSort(v => !v)}
            className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
            <ArrowUpDown size={12} />{SORT_OPTIONS.find(s => s.key === sort)?.label}
          </button>
          <AnimatePresence>
            {showSort && (
              <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                className="absolute right-0 top-10 w-44 rounded-xl overflow-hidden z-20 shadow-xl"
                style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
                {SORT_OPTIONS.map(s => (
                  <button key={s.key} onClick={() => { setSort(s.key); setShowSort(false) }}
                    className="w-full text-left px-4 py-2.5 text-xs transition-colors hover:bg-violet-500/10"
                    style={{ color: sort === s.key ? '#a78bfa' : 'var(--text-primary)' }}>
                    {s.label}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : complaints.length === 0 ? (
        <div className="text-center py-24">
          <div className="w-14 h-14 rounded-2xl bg-violet-400/10 flex items-center justify-center mx-auto mb-4">
            <ListChecks size={24} className="text-violet-400 opacity-40" />
          </div>
          <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>No complaints yet</p>
          <p className="text-xs mb-5" style={{ color: 'var(--text-muted)' }}>Submit your first complaint and track it here</p>
          <button onClick={() => navigate('/app/submit')} className="btn-primary flex items-center gap-2 mx-auto">
            <PlusCircle size={14} /> Submit a Complaint
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16" style={{ color: 'var(--text-muted)' }}>
          <Search size={28} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">No complaints match your search</p>
        </div>
      ) : (
        <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
          {showGrouped ? (
            <>
              <div className="flex items-center gap-2 px-5 py-2.5 bg-red-400/5" style={{ borderBottom: '1px solid rgba(248,113,113,0.15)' }}>
                <Flame size={12} className="text-red-400" />
                <span className="text-[10px] uppercase tracking-widest font-semibold text-red-400">
                  SLA Breached — {overdueList.length} overdue
                </span>
              </div>
              {overdueList.map((c, i) => <ComplaintRow key={c._id} complaint={c} index={i} onDelete={handleDelete} />)}
              {normalList.length > 0 && (
                <div className="flex items-center gap-2 px-5 py-2.5" style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-elevated)' }}>
                  <span className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: 'var(--text-muted)' }}>
                    Active — {normalList.length}
                  </span>
                </div>
              )}
              {normalList.map((c, i) => <ComplaintRow key={c._id} complaint={c} index={overdueList.length + i} onDelete={handleDelete} />)}
            </>
          ) : (
            filtered.map((c, i) => <ComplaintRow key={c._id} complaint={c} index={i} onDelete={handleDelete} />)
          )}
        </div>
      )}
    </div>
  )
}
