import { useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'
import {
  PlusCircle, TrendingUp, Clock, AlertCircle, CheckCircle2,
  Flame, AlertTriangle, PlayCircle, ChevronRight, RefreshCw,
  Brain, Sparkles, Loader2, User, MessageSquare, Mail, Phone,
  Globe, MessageCircle, Zap, Target, Activity, BarChart2,
  ArrowRight, Shield
} from 'lucide-react'

const CHANNEL_ICONS = { whatsapp: MessageSquare, email: Mail, phone: Phone, web: Globe, chat: MessageCircle }
const PRIORITY_META = {
  high:   { color: 'text-red-400',     dot: 'bg-red-400',     bg: 'bg-red-400/10'     },
  medium: { color: 'text-yellow-400',  dot: 'bg-yellow-400',  bg: 'bg-yellow-400/10'  },
  low:    { color: 'text-emerald-400', dot: 'bg-emerald-400', bg: 'bg-emerald-400/10' },
}

function isOverdue(c) {
  return c.status !== 'resolved' && c.sla_deadline && new Date(c.sla_deadline) < new Date()
}
function getSLALabel(c) {
  if (c.status === 'resolved' || !c.sla_deadline) return null
  const diff = new Date(c.sla_deadline) - new Date()
  const hrs = Math.floor(diff / 3600000)
  if (diff < 0) return { label: 'Overdue', color: 'text-red-400' }
  if (hrs < 4)  return { label: `${hrs}h left`, color: 'text-orange-400' }
  if (hrs < 24) return { label: `${hrs}h left`, color: 'text-yellow-400' }
  return { label: `${Math.floor(hrs / 24)}d left`, color: 'text-slate-400' }
}

// ── ADMIN DASHBOARD ───────────────────────────────────────────────────────────
function AdminDashboard() {
  const navigate = useNavigate()
  const [insights, setInsights] = useState(null)
  const [complaints, setComplaints] = useState([])
  const [agents, setAgents] = useState([])
  const [narrator, setNarrator] = useState(null)
  const [narratorLoading, setNarratorLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState(null)
  const pollRef = useRef(null)

  const fetchData = useCallback(async () => {
    try {
      const [insRes, cmpRes, agRes] = await Promise.all([
        api.get('/complaints/insights'),
        api.get('/complaints'),
        api.get('/admin/agents'),
      ])
      setInsights(insRes.data)
      setComplaints(cmpRes.data)
      setAgents(agRes.data)
      setLastUpdated(new Date())
    } catch { }
  }, [])

  const fetchNarrator = useCallback(async () => {
    setNarratorLoading(true)
    try {
      const { data } = await api.get('/complaints/ai-narrator')
      setNarrator(data)
    } catch { }
    finally { setNarratorLoading(false) }
  }, [])

  useEffect(() => {
    fetchData()
    fetchNarrator()
    pollRef.current = setInterval(fetchData, 30000) // live refresh every 30s
    return () => clearInterval(pollRef.current)
  }, [fetchData, fetchNarrator])

  const needsAttention = complaints.filter(c =>
    c.status !== 'resolved' && (isOverdue(c) || c.priority === 'high')
  ).slice(0, 5)

  const unassigned = complaints.filter(c => !c.assigned_agent && c.status !== 'resolved').length
  const breaches   = complaints.filter(isOverdue).length
  const highPrio   = complaints.filter(c => c.priority === 'high' && c.status !== 'resolved').length

  // Agent workload
  const agentWorkload = agents.map(a => ({
    ...a,
    open: complaints.filter(c => c.assigned_agent === a.name && c.status !== 'resolved').length,
    resolved_today: complaints.filter(c =>
      c.assigned_agent === a.name && c.status === 'resolved' &&
      new Date(c.updated_at) > new Date(Date.now() - 86400000)
    ).length,
  })).sort((a, b) => b.open - a.open)

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Operations Center</h1>
          <div className="flex items-center gap-2 mt-1">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs text-emerald-400">Live</span>
            {lastUpdated && (
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                · Updated {lastUpdated.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>
        </div>
        <button onClick={fetchData} className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl transition-colors hover:bg-violet-500/10 text-violet-400">
          <RefreshCw size={12} /> Refresh
        </button>
      </div>

      {/* AI Narrator */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl p-5 mb-6 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.08), rgba(59,130,246,0.05))', border: '1px solid rgba(124,58,237,0.2)' }}>
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-violet-500/15 flex items-center justify-center shrink-0">
            <Brain size={15} className="text-violet-400" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-xs font-semibold text-violet-400 uppercase tracking-widest">AI Analyst</span>
              {narratorLoading && <div className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />}
            </div>
            {narratorLoading ? (
              <div className="space-y-2">
                {[90, 70, 50].map((w, i) => <div key={i} className="h-3 rounded-full animate-pulse" style={{ background: 'var(--bg-elevated)', width: `${w}%` }} />)}
              </div>
            ) : (
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}>{narrator?.narrative}</p>
            )}
            {narrator?.stats && (
              <div className="flex flex-wrap gap-2 mt-3">
                {narrator.stats.today > 0 && <span className="text-[10px] px-2 py-1 rounded-lg bg-violet-500/10 text-violet-400 border border-violet-500/20">{narrator.stats.today} today</span>}
                {narrator.stats.breaches > 0 && <span className="text-[10px] px-2 py-1 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 flex items-center gap-1"><Flame size={9} />{narrator.stats.breaches} SLA breach{narrator.stats.breaches > 1 ? 'es' : ''}</span>}
                {narrator.stats.high_priority > 0 && <span className="text-[10px] px-2 py-1 rounded-lg bg-orange-500/10 text-orange-400 border border-orange-500/20">{narrator.stats.high_priority} high priority</span>}
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Alert strip — only if issues exist */}
      {(breaches > 0 || unassigned > 0) && (
        <div className="flex items-center gap-3 rounded-xl px-4 py-3 mb-6 bg-red-400/5 border border-red-400/20">
          <AlertTriangle size={15} className="text-red-400 shrink-0" />
          <div className="flex-1 text-sm" style={{ color: 'var(--text-primary)' }}>
            {breaches > 0 && <span className="text-red-400 font-semibold">{breaches} SLA breach{breaches > 1 ? 'es'  : ''}</span>}
            {breaches > 0 && unassigned > 0 && <span style={{ color: 'var(--text-muted)' }}> · </span>}
            {unassigned > 0 && <span className="text-orange-400 font-semibold">{unassigned} unassigned</span>}
            <span style={{ color: 'var(--text-muted)' }}> — immediate action required</span>
          </div>
          <button onClick={() => navigate('/app/queue')} className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 shrink-0">
            View all <ChevronRight size={12} />
          </button>
        </div>
      )}

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total', value: complaints.length, color: 'text-violet-400', bg: 'bg-violet-400/10', icon: BarChart2 },
          { label: 'Open', value: complaints.filter(c => c.status === 'open').length, color: 'text-blue-400', bg: 'bg-blue-400/10', icon: AlertCircle },
          { label: 'SLA Breaches', value: breaches, color: 'text-red-400', bg: 'bg-red-400/10', icon: Flame },
          { label: 'Resolved Today', value: complaints.filter(c => c.status === 'resolved' && new Date(c.updated_at) > new Date(Date.now() - 86400000)).length, color: 'text-emerald-400', bg: 'bg-emerald-400/10', icon: CheckCircle2 },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
            className="rounded-2xl p-5" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{s.label}</span>
              <div className={`w-7 h-7 rounded-xl ${s.bg} flex items-center justify-center`}>
                <s.icon size={13} className={s.color} />
              </div>
            </div>
            <div className={`text-3xl font-bold ${s.color}`}>{s.value}</div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Needs Attention */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Flame size={14} className="text-red-400" />
              <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Needs Attention</span>
            </div>
            <button onClick={() => navigate('/app/queue')} className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1">
              View all <ChevronRight size={11} />
            </button>
          </div>
          <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
            {needsAttention.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10">
                <CheckCircle2 size={24} className="text-emerald-400 mb-2" />
                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>All clear</p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>No urgent complaints right now</p>
              </div>
            ) : needsAttention.map((c, i) => {
              const pm = PRIORITY_META[c.priority] || PRIORITY_META.medium
              const sla = getSLALabel(c)
              const ChannelIcon = CHANNEL_ICONS[c.channel] || Globe
              return (
                <div key={c._id} onClick={() => navigate(`/app/complaints/${c._id}`)}
                  className="flex items-center gap-3 px-4 py-3.5 cursor-pointer transition-colors"
                  style={{ borderBottom: i < needsAttention.length - 1 ? '1px solid var(--border)' : 'none' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-elevated)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <div className={`w-2 h-2 rounded-full ${pm.dot} shrink-0 ${c.priority === 'high' ? 'animate-pulse' : ''}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{c.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <ChannelIcon size={10} style={{ color: 'var(--text-muted)' }} />
                      <span className="text-[10px] capitalize" style={{ color: 'var(--text-muted)' }}>{c.channel}</span>
                      {c.assigned_agent && <span className="text-[10px] text-violet-400">· {c.assigned_agent}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {isOverdue(c) && <span className="text-[10px] text-red-400 bg-red-400/10 px-2 py-0.5 rounded-md flex items-center gap-1"><Flame size={9} />Overdue</span>}
                    {sla && !isOverdue(c) && <span className={`text-[10px] ${sla.color}`}>{sla.label}</span>}
                    <ChevronRight size={13} style={{ color: 'var(--text-muted)' }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Agent Workload */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <User size={14} className="text-violet-400" />
            <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Agent Workload</span>
          </div>
          <div className="rounded-2xl p-4 space-y-3" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
            {agentWorkload.length === 0 ? (
              <p className="text-xs text-center py-4" style={{ color: 'var(--text-muted)' }}>No agents registered</p>
            ) : agentWorkload.map(a => {
              const maxOpen = Math.max(...agentWorkload.map(x => x.open), 1)
              const pct = Math.round((a.open / maxOpen) * 100)
              return (
                <div key={a.id}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-violet-600/20 flex items-center justify-center text-[10px] font-bold text-violet-400">
                        {a.name[0]?.toUpperCase()}
                      </div>
                      <div>
                        <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{a.name}</span>
                        <span className="text-[10px] ml-1.5" style={{ color: 'var(--text-muted)' }}>{a.agent_channel}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`text-xs font-bold ${a.open > 3 ? 'text-red-400' : a.open > 1 ? 'text-yellow-400' : 'text-emerald-400'}`}>{a.open}</span>
                      <span className="text-[10px] ml-1" style={{ color: 'var(--text-muted)' }}>open</span>
                    </div>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-elevated)' }}>
                    <motion.div className={`h-full rounded-full ${a.open > 3 ? 'bg-red-500' : a.open > 1 ? 'bg-yellow-500' : 'bg-emerald-500'}`}
                      initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.6 }} />
                  </div>
                  {a.resolved_today > 0 && (
                    <p className="text-[10px] mt-1 text-emerald-400">✓ {a.resolved_today} resolved today</p>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── AGENT DASHBOARD ───────────────────────────────────────────────────────────
function AgentQueueRow({ complaint: c, index: i, total, onAction, navigate }) {
  const [acting, setActing] = useState(false)
  const pm = PRIORITY_META[c.priority] || PRIORITY_META.medium
  const sla = getSLALabel(c)
  const ChannelIcon = CHANNEL_ICONS[c.channel] || Globe

  const quickAction = async (e, newStatus) => {
    e.stopPropagation()
    setActing(true)
    await onAction(c._id, newStatus)
    setActing(false)
  }

  return (
    <div onClick={() => navigate(`/app/complaints/${c._id}`)}
      className="flex items-center gap-4 px-5 py-4 cursor-pointer transition-colors"
      style={{ borderBottom: i < total - 1 ? '1px solid var(--border)' : 'none' }}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-elevated)'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
      <div className="flex flex-col items-center gap-1 shrink-0">
        <div className={`w-2.5 h-2.5 rounded-full ${pm.dot} ${c.priority === 'high' ? 'animate-pulse' : ''}`} />
        <ChannelIcon size={10} style={{ color: 'var(--text-muted)' }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{c.title}</p>
        <div className="flex items-center gap-2 mt-0.5">
          {isOverdue(c) && <span className="text-[10px] text-red-400 flex items-center gap-0.5"><Flame size={9} />Overdue</span>}
          {sla && !isOverdue(c) && <span className={`text-[10px] ${sla.color}`}>{sla.label}</span>}
          <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{c.category}</span>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0" onClick={e => e.stopPropagation()}>
        {c.status === 'open' && (
          <button onClick={e => quickAction(e, 'in-progress')} disabled={acting}
            className="flex items-center gap-1 text-[11px] font-medium px-3 py-1.5 rounded-lg bg-yellow-500/15 text-yellow-400 border border-yellow-400/20 hover:bg-yellow-500/25 transition-colors">
            {acting ? <Loader2 size={10} className="animate-spin" /> : <PlayCircle size={10} />} Start
          </button>
        )}
        {c.status === 'in-progress' && (
          <button onClick={e => quickAction(e, 'resolved')} disabled={acting}
            className="flex items-center gap-1 text-[11px] font-medium px-3 py-1.5 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-400/20 hover:bg-emerald-500/25 transition-colors">
            {acting ? <Loader2 size={10} className="animate-spin" /> : <CheckCircle2 size={10} />} Resolve
          </button>
        )}
      </div>
    </div>
  )
}

function AgentDashboard() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [complaints, setComplaints] = useState([])
  const [loading, setLoading] = useState(true)
  const [narrator, setNarrator] = useState(null)
  const [narratorLoading, setNarratorLoading] = useState(true)
  const pollRef = useRef(null)

  const fetchQueue = useCallback(async () => {
    try {
      const { data } = await api.get('/complaints')
      setComplaints(data)
    } catch { }
    finally { setLoading(false) }
  }, [])

  const fetchNarrator = useCallback(async () => {
    setNarratorLoading(true)
    try {
      const { data } = await api.get('/complaints/ai-narrator')
      setNarrator(data)
    } catch { }
    finally { setNarratorLoading(false) }
  }, [])

  useEffect(() => {
    fetchQueue()
    fetchNarrator()
    pollRef.current = setInterval(fetchQueue, 20000)
    return () => clearInterval(pollRef.current)
  }, [fetchQueue, fetchNarrator])

  const handleStatusChange = async (id, newStatus) => {
    try {
      await api.patch(`/complaints/${id}`, { status: newStatus })
      setComplaints(prev => prev.map(c => c._id === id ? { ...c, status: newStatus } : c))
    } catch { }
  }

  const myOpen     = complaints.filter(c => c.status === 'open')
  const myInProg   = complaints.filter(c => c.status === 'in-progress')
  const resolvedToday = complaints.filter(c => c.status === 'resolved' && new Date(c.updated_at) > new Date(Date.now() - 86400000))
  const overdue    = complaints.filter(isOverdue)

  // Sort: overdue first, then high priority, then by SLA
  const prioritized = [...myOpen, ...myInProg].sort((a, b) => {
    if (isOverdue(a) && !isOverdue(b)) return -1
    if (!isOverdue(a) && isOverdue(b)) return 1
    const pOrder = { high: 0, medium: 1, low: 2 }
    return (pOrder[a.priority] ?? 1) - (pOrder[b.priority] ?? 1)
  })

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
          Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}, {user?.name?.split(' ')[0]}
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
          Here's what needs your attention today
        </p>
      </div>

      {/* AI Analyst */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl p-5 mb-6 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.08), rgba(59,130,246,0.05))', border: '1px solid rgba(124,58,237,0.2)' }}>
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-violet-500/15 flex items-center justify-center shrink-0">
            <Brain size={15} className="text-violet-400" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-xs font-semibold text-violet-400 uppercase tracking-widest">AI Analyst</span>
              {narratorLoading && <div className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />}
            </div>
            {narratorLoading ? (
              <div className="space-y-2">
                {[90, 70, 50].map((w, i) => <div key={i} className="h-3 rounded-full animate-pulse" style={{ background: 'var(--bg-elevated)', width: `${w}%` }} />)}
              </div>
            ) : (
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}>{narrator?.narrative}</p>
            )}
            {narrator?.stats && (
              <div className="flex flex-wrap gap-2 mt-3">
                {narrator.stats.today > 0 && <span className="text-[10px] px-2 py-1 rounded-lg bg-violet-500/10 text-violet-400 border border-violet-500/20">{narrator.stats.today} today</span>}
                {narrator.stats.breaches > 0 && <span className="text-[10px] px-2 py-1 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 flex items-center gap-1"><Flame size={9} />{narrator.stats.breaches} SLA breach{narrator.stats.breaches > 1 ? 'es' : ''}</span>}
                {narrator.stats.high_priority > 0 && <span className="text-[10px] px-2 py-1 rounded-lg bg-orange-500/10 text-orange-400 border border-orange-500/20">{narrator.stats.high_priority} high priority</span>}
              </div>
            )}
          </div>
          <button onClick={fetchNarrator} disabled={narratorLoading}
            className="shrink-0 p-1.5 rounded-lg hover:bg-violet-500/10 transition-colors text-violet-400 disabled:opacity-40">
            <RefreshCw size={12} className={narratorLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-6">        {[
          { label: 'Open',         value: myOpen.length,       color: 'text-blue-400',    bg: 'bg-blue-400/10',    icon: AlertCircle  },
          { label: 'In Review',    value: myInProg.length,     color: 'text-yellow-400',  bg: 'bg-yellow-400/10',  icon: PlayCircle   },
          { label: 'Resolved Today', value: resolvedToday.length, color: 'text-emerald-400', bg: 'bg-emerald-400/10', icon: CheckCircle2 },
          { label: 'Overdue',      value: overdue.length,      color: 'text-red-400',     bg: 'bg-red-400/10',     icon: Flame        },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
            className="rounded-2xl p-4" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between mb-2">
              <div className={`w-7 h-7 rounded-xl ${s.bg} flex items-center justify-center`}>
                <s.icon size={13} className={s.color} />
              </div>
            </div>
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{s.label}</div>
          </motion.div>
        ))}
      </div>

      {/* My Queue — action-first */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Zap size={14} className="text-violet-400" />
          <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Your Queue</span>
          {prioritized.length > 0 && (
            <span className="text-[10px] bg-violet-600 text-white px-2 py-0.5 rounded-full">{prioritized.length}</span>
          )}
        </div>
        <button onClick={() => navigate('/app/queue')} className="text-xs text-violet-400 flex items-center gap-1">
          Full queue <ChevronRight size={11} />
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : prioritized.length === 0 ? (
        <div className="rounded-2xl p-10 text-center" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
          <CheckCircle2 size={32} className="text-emerald-400 mx-auto mb-3" />
          <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>Queue is clear</p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>No open complaints assigned to you right now</p>
        </div>
      ) : (
        <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
          {prioritized.slice(0, 8).map((c, i) => (
            <AgentQueueRow key={c._id} complaint={c} index={i} total={Math.min(prioritized.length, 8)} onAction={handleStatusChange} navigate={navigate} />
          ))}
        </div>
      )}
    </div>
  )
}

// ── USER DASHBOARD ────────────────────────────────────────────────────────────
function UserDashboard() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [complaints, setComplaints] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/complaints/mine')
      .then(({ data }) => setComplaints(data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const active   = complaints.filter(c => c.status !== 'resolved')
  const resolved = complaints.filter(c => c.status === 'resolved')
  const overdue  = complaints.filter(isOverdue)
  const mostUrgent = active.sort((a, b) => {
    if (isOverdue(a) && !isOverdue(b)) return -1
    if (!isOverdue(a) && isOverdue(b)) return 1
    const p = { high: 0, medium: 1, low: 2 }
    return (p[a.priority] ?? 1) - (p[b.priority] ?? 1)
  })[0]

  const STATUS_STEPS = [
    { key: 'open',         label: 'Received',  color: 'bg-blue-500'    },
    { key: 'in-progress',  label: 'In Review', color: 'bg-yellow-500'  },
    { key: 'resolved',     label: 'Resolved',  color: 'bg-emerald-500' },
  ]

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Hello, {user?.name?.split(' ')[0]}
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        <button onClick={() => navigate('/app/submit')} className="btn-primary flex items-center gap-2">
          <PlusCircle size={14} /> New Complaint
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : complaints.length === 0 ? (
        /* First-time user */
        <div className="rounded-2xl p-10 text-center" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
          <div className="w-16 h-16 rounded-2xl bg-violet-500/10 flex items-center justify-center mx-auto mb-4">
            <Shield size={28} className="text-violet-400" />
          </div>
          <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>You're all set</h2>
          <p className="text-sm mb-6 max-w-sm mx-auto" style={{ color: 'var(--text-muted)' }}>
            Submit a complaint and our AI will classify it, assign the right agent, and track it until resolved.
          </p>
          <button onClick={() => navigate('/app/submit')} className="btn-primary flex items-center gap-2 mx-auto">
            <PlusCircle size={14} /> Submit your first complaint
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Active', value: active.length, color: 'text-blue-400', bg: 'bg-blue-400/10', icon: Clock },
              { label: 'Resolved', value: resolved.length, color: 'text-emerald-400', bg: 'bg-emerald-400/10', icon: CheckCircle2 },
              { label: 'Overdue', value: overdue.length, color: 'text-red-400', bg: 'bg-red-400/10', icon: Flame },
            ].map((s, i) => (
              <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
                className="rounded-2xl p-4" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
                <div className={`w-7 h-7 rounded-xl ${s.bg} flex items-center justify-center mb-2`}>
                  <s.icon size={13} className={s.color} />
                </div>
                <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                <div className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{s.label}</div>
              </motion.div>
            ))}
          </div>

          {/* Most urgent complaint */}
          {mostUrgent && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle size={13} className="text-orange-400" />
                <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Most Urgent</span>
              </div>
              <div onClick={() => navigate(`/app/complaints/${mostUrgent._id}`)}
                className="rounded-2xl p-5 cursor-pointer transition-all hover:-translate-y-0.5"
                style={{ background: 'var(--bg-surface)', border: isOverdue(mostUrgent) ? '1px solid rgba(248,113,113,0.3)' : '1px solid var(--border)' }}>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{mostUrgent.title}</p>
                    {mostUrgent.summary && <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{mostUrgent.summary}</p>}
                  </div>
                  <ChevronRight size={16} className="text-violet-400 shrink-0 mt-0.5" />
                </div>
                {/* Status progress */}
                <div className="flex items-center gap-2 mb-3">
                  {STATUS_STEPS.map((s, i) => {
                    const stepIdx = STATUS_STEPS.findIndex(x => x.key === mostUrgent.status)
                    const done = i <= stepIdx
                    return (
                      <div key={s.key} className="flex items-center gap-2 flex-1">
                        <div className={`h-1.5 flex-1 rounded-full ${done ? s.color : ''}`}
                          style={!done ? { background: 'var(--bg-elevated)' } : {}} />
                        {i < STATUS_STEPS.length - 1 && (
                          <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${done ? s.color : ''}`}
                            style={!done ? { background: 'var(--bg-elevated)' } : {}} />
                        )}
                      </div>
                    )
                  })}
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span style={{ color: 'var(--text-muted)' }}>
                    {mostUrgent.assigned_agent ? `Assigned to ${mostUrgent.assigned_agent}` : 'Awaiting assignment'}
                  </span>
                  {isOverdue(mostUrgent)
                    ? <span className="text-red-400 flex items-center gap-1"><Flame size={10} />SLA Breached</span>
                    : getSLALabel(mostUrgent) && <span className={getSLALabel(mostUrgent).color}>{getSLALabel(mostUrgent).label}</span>
                  }
                </div>
              </div>
            </div>
          )}

          {/* Recent complaints timeline */}
          {complaints.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Activity size={13} className="text-violet-400" />
                  <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Recent Activity</span>
                </div>
                <button onClick={() => navigate('/app/my-complaints')} className="text-xs text-violet-400 flex items-center gap-1">
                  View all <ChevronRight size={11} />
                </button>
              </div>
              <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
                {complaints.slice(0, 5).map((c, i) => {
                  const statusColor = { open: 'bg-blue-400', 'in-progress': 'bg-yellow-400', resolved: 'bg-emerald-400' }[c.status] || 'bg-slate-400'
                  return (
                    <div key={c._id} onClick={() => navigate(`/app/complaints/${c._id}`)}
                      className="flex items-center gap-3 px-4 py-3.5 cursor-pointer transition-colors"
                      style={{ borderBottom: i < Math.min(complaints.length, 5) - 1 ? '1px solid var(--border)' : 'none' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-elevated)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <div className={`w-2 h-2 rounded-full ${statusColor} shrink-0`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate" style={{ color: 'var(--text-primary)' }}>{c.title}</p>
                        <p className="text-[10px] mt-0.5 capitalize" style={{ color: 'var(--text-muted)' }}>
                          {c.status.replace('-', ' ')} · {c.category}
                        </p>
                      </div>
                      <ChevronRight size={13} style={{ color: 'var(--text-muted)' }} />
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main export — role router ─────────────────────────────────────────────────
export default function Dashboard() {
  const { user } = useAuth()
  if (user?.role === 'admin') return <AdminDashboard />
  if (user?.role === 'agent') return <AgentDashboard />
  return <UserDashboard />
}
