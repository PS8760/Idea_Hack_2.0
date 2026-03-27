import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import api from '../api/axios'
import {
  Settings, AlertTriangle, CheckCircle2, Clock, TrendingUp,
  Trash2, Edit2, Save, X, MessageSquare, Mail, Phone, Globe,
  MessageCircle, Sparkles, Loader2, RefreshCw, Brain, Flame,
  Activity, Cpu, Target
} from 'lucide-react'
import toast from 'react-hot-toast'

const SPECIALIZATION_OPTIONS = [
  { value: 'Billing',   color: 'text-blue-400'    },
  { value: 'Technical', color: 'text-violet-400'  },
  { value: 'Delivery',  color: 'text-yellow-400'  },
  { value: 'Product',   color: 'text-pink-400'    },
  { value: 'Service',   color: 'text-orange-400'  },
  { value: 'Account',   color: 'text-emerald-400' },
  { value: 'General',   color: 'text-slate-400'   },
]

// ── AI Narrator ───────────────────────────────────────────────────────────────
function AINarrator() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [displayed, setDisplayed] = useState('')
  const [typing, setTyping] = useState(false)
  const typeRef = useRef(null)
  const isMounted = useRef(true)

  useEffect(() => {
    isMounted.current = true
    return () => { isMounted.current = false; clearInterval(typeRef.current) }
  }, [])

  const typewrite = (text) => {
    clearInterval(typeRef.current)
    setDisplayed('')
    setTyping(true)
    let i = 0
    typeRef.current = setInterval(() => {
      if (!isMounted.current) { clearInterval(typeRef.current); return }
      i++
      setDisplayed(text.slice(0, i))
      if (i >= text.length) {
        clearInterval(typeRef.current)
        setTyping(false)
      }
    }, 22)
  }

  const fetch = async () => {
    setLoading(true)
    try {
      const { data: d } = await api.get('/complaints/ai-narrator')
      if (!isMounted.current) return
      setData(d)
      typewrite(d.narrative)
    } catch { /* silent */ }
    finally { if (isMounted.current) setLoading(false) }
  }

  useEffect(() => {
    fetch()
    const t = setInterval(fetch, 5 * 60 * 1000)
    return () => clearInterval(t)
  }, [])

  return (
    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl p-5 mb-6 relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.08), rgba(59,130,246,0.05))', border: '1px solid rgba(124,58,237,0.2)' }}>
      {/* Ambient glow */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/5 rounded-full blur-2xl pointer-events-none" />

      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-violet-500/15 flex items-center justify-center shrink-0 mt-0.5">
            <Brain size={15} className="text-violet-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-semibold text-violet-400 uppercase tracking-widest">AI Analyst</span>
              {typing && <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />}
              {data?.generated_at && !loading && (
                <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                  Updated {new Date(data.generated_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' })}
                </span>
              )}
            </div>
            {loading ? (
              <div className="space-y-2">
                {[90, 70, 50].map((w, i) => (
                  <div key={i} className="h-3 rounded-full animate-pulse" style={{ background: 'var(--bg-elevated)', width: `${w}%` }} />
                ))}
              </div>
            ) : (
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}>
                {displayed}
                {typing && <span className="inline-block w-0.5 h-4 bg-violet-400 ml-0.5 animate-pulse align-middle" />}
              </p>
            )}

            {/* Quick stats pills */}
            {data?.stats && !loading && (
              <div className="flex flex-wrap gap-2 mt-3">
                {data.stats.today > 0 && (
                  <span className="text-[10px] px-2 py-1 rounded-lg bg-violet-500/10 text-violet-400 border border-violet-500/20">
                    {data.stats.today} today
                  </span>
                )}
                {data.stats.breaches > 0 && (
                  <span className="text-[10px] px-2 py-1 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 flex items-center gap-1">
                    <Flame size={9} /> {data.stats.breaches} SLA breach{data.stats.breaches > 1 ? 'es' : ''}
                  </span>
                )}
                {data.stats.high_priority > 0 && (
                  <span className="text-[10px] px-2 py-1 rounded-lg bg-orange-500/10 text-orange-400 border border-orange-500/20">
                    {data.stats.high_priority} high priority
                  </span>
                )}
                {data.stats.open > 0 && (
                  <span className="text-[10px] px-2 py-1 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    {data.stats.open} open
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
        <button onClick={fetch} disabled={loading}
          className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:bg-violet-500/10"
          style={{ color: 'var(--text-muted)' }}>
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>
    </motion.div>
  )
}

// ── Channel Performance ───────────────────────────────────────────────────────
const CHANNEL_META = {
  web:      { label: 'Web',       icon: Globe,          color: 'text-slate-400',   bg: 'bg-slate-400/10',   border: 'border-slate-400/20'   },
  email:    { label: 'Email',     icon: Mail,           color: 'text-blue-400',    bg: 'bg-blue-400/10',    border: 'border-blue-400/20'    },
  whatsapp: { label: 'WhatsApp',  icon: MessageSquare,  color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/20' },
  phone:    { label: 'Phone',     icon: Phone,          color: 'text-yellow-400',  bg: 'bg-yellow-400/10',  border: 'border-yellow-400/20'  },
  chat:     { label: 'Live Chat', icon: MessageCircle,  color: 'text-violet-400',  bg: 'bg-violet-400/10',  border: 'border-violet-400/20'  },
}

function ChannelPerformance({ data }) {
  if (!data || Object.keys(data).length === 0) return null

  const entries = Object.entries(data).sort((a, b) => b[1].total - a[1].total)
  const maxTotal = Math.max(...entries.map(([, v]) => v.total), 1)

  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 mb-5">
        <Activity size={14} className="text-violet-400" />
        <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Channel Performance</span>
        <span className="text-[10px] ml-auto" style={{ color: 'var(--text-muted)' }}>All time</span>
      </div>

      <div className="space-y-4">
        {entries.map(([ch, stats]) => {
          const meta = CHANNEL_META[ch] || CHANNEL_META.web
          const Icon = meta.icon
          const barPct = Math.round((stats.total / maxTotal) * 100)
          const slaColor = stats.sla_compliance >= 90 ? 'text-emerald-400' : stats.sla_compliance >= 70 ? 'text-yellow-400' : 'text-red-400'
          const slaBarColor = stats.sla_compliance >= 90 ? 'bg-emerald-500' : stats.sla_compliance >= 70 ? 'bg-yellow-500' : 'bg-red-500'

          return (
            <div key={ch}>
              {/* Channel header */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-lg ${meta.bg} flex items-center justify-center`}>
                    <Icon size={12} className={meta.color} />
                  </div>
                  <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{meta.label}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-md" style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}>
                    {stats.total} total
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[10px]">
                  {stats.sla_breaches > 0 && (
                    <span className="flex items-center gap-1 text-red-400">
                      <AlertTriangle size={9} /> {stats.sla_breaches} breach{stats.sla_breaches > 1 ? 'es' : ''}
                    </span>
                  )}
                  {stats.avg_resolution_hours && (
                    <span className="flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                      <Clock size={9} /> {stats.avg_resolution_hours}h avg
                    </span>
                  )}
                </div>
              </div>

              {/* Volume bar */}
              <div className="h-1.5 rounded-full overflow-hidden mb-1.5" style={{ background: 'var(--bg-elevated)' }}>
                <motion.div
                  className={`h-full rounded-full ${meta.bg.replace('/10', '/60')}`}
                  style={{ background: undefined }}
                  initial={{ width: 0 }}
                  animate={{ width: `${barPct}%` }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                >
                  <div className="h-full rounded-full" style={{
                    background: ch === 'web' ? '#94a3b8' : ch === 'email' ? '#60a5fa' : ch === 'whatsapp' ? '#34d399' : ch === 'phone' ? '#fbbf24' : '#a78bfa'
                  }} />
                </motion.div>
              </div>

              {/* Status breakdown + SLA */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-[10px]">
                  {stats.open > 0 && <span className="text-blue-400">{stats.open} open</span>}
                  {stats.in_progress > 0 && <span className="text-yellow-400">{stats.in_progress} in review</span>}
                  {stats.resolved > 0 && <span className="text-emerald-400">{stats.resolved} resolved</span>}
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>SLA</span>
                  <div className="w-16 h-1 rounded-full overflow-hidden" style={{ background: 'var(--bg-elevated)' }}>
                    <div className={`h-full rounded-full ${slaBarColor}`} style={{ width: `${stats.sla_compliance}%` }} />
                  </div>
                  <span className={`text-[10px] font-semibold ${slaColor}`}>{stats.sla_compliance}%</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

const CHANNEL_OPTIONS = [
  { value: 'whatsapp', label: 'WhatsApp', icon: MessageSquare, color: 'text-emerald-400' },
  { value: 'email',    label: 'Email',    icon: Mail,          color: 'text-blue-400' },
  { value: 'phone',    label: 'Phone',    icon: Phone,         color: 'text-yellow-400' },
  { value: 'chat',     label: 'Live Chat',icon: MessageCircle, color: 'text-violet-400' },
  { value: 'web',      label: 'Web',      icon: Globe,         color: 'text-slate-400' },
]

function AgentRow({ agent, onUpdate, onRemove }) {
  const [editing, setEditing] = useState(false)
  const [channel, setChannel] = useState(agent.agent_channel)
  const [specialization, setSpecialization] = useState(agent.specialization || 'General')
  const [saving, setSaving] = useState(false)

  const save = async () => {
    setSaving(true)
    try {
      await onUpdate(agent.id, { agent_channel: channel, specialization })
      setEditing(false)
      toast.success('Agent updated')
    } catch { toast.error('Update failed') }
    finally { setSaving(false) }
  }

  const ch = CHANNEL_OPTIONS.find(c => c.value === agent.agent_channel)
  const ChIcon = ch?.icon || Globe
  const sp = SPECIALIZATION_OPTIONS.find(s => s.value === (agent.specialization || 'General'))

  return (
    <div className="flex items-center justify-between py-3 border-b border-theme last:border-0">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-semibold text-slate-300">
          {agent.name[0]?.toUpperCase()}
        </div>
        <div>
          <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{agent.name}</div>
          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{agent.email}</div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {editing ? (
          <div className="flex items-center gap-2">
            <select value={channel} onChange={e => setChannel(e.target.value)}
              className="input-field py-1 text-xs w-28">
              {CHANNEL_OPTIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
            <select value={specialization} onChange={e => setSpecialization(e.target.value)}
              className="input-field py-1 text-xs w-28">
              {SPECIALIZATION_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.value}</option>)}
            </select>
            <button onClick={save} disabled={saving}
              className="w-7 h-7 rounded-lg bg-violet-600 hover:bg-violet-700 flex items-center justify-center transition-colors">
              {saving ? <span className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={12} />}
            </button>
            <button onClick={() => setEditing(false)}
              className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:bg-slate-800/30"
              style={{ color: 'var(--text-muted)' }}>
              <X size={12} />
            </button>
          </div>
        ) : (
          <>
            <span className={`flex items-center gap-1.5 text-xs badge border border-theme  ${ch?.color || 'text-slate-400'}`}>
              <ChIcon size={11} /> {ch?.label || agent.agent_channel}
            </span>
            <span className={`text-xs badge border border-theme  ${sp?.color || 'text-slate-400'}`}>
              <Target size={9} className="inline mr-1" />{agent.specialization || 'General'}
            </span>
          </>
        )}

        <span className={`text-xs badge border ${
          agent.active !== false
            ? 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20'
            : 'text-slate-500 bg-slate-800/30 border-slate-700'
        }`}>
          {agent.active !== false ? 'Active' : 'Inactive'}
        </span>

        {!editing && (
          <div className="flex items-center gap-1">
            <button onClick={() => setEditing(true)}
              className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:bg-slate-800/30"
              style={{ color: 'var(--text-muted)' }}>
              <Edit2 size={12} />
            </button>
            <button onClick={() => onRemove(agent.id)}
              className="w-7 h-7 rounded-lg hover:text-red-400 flex items-center justify-center transition-colors hover:bg-slate-800/30"
              style={{ color: 'var(--text-muted)' }}>
              <Trash2 size={12} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default function AdminPanel() {
  const [insights, setInsights] = useState(null)
  const [agents, setAgents] = useState([])
  const [loading, setLoading] = useState(true)
  const [modelInfo, setModelInfo] = useState(null)

  const fetchAll = async () => {
    setLoading(true)
    try {
      const [insRes, agRes, modelRes] = await Promise.all([
        api.get('/complaints/insights'),
        api.get('/admin/agents'),
        api.get('/complaints/model/info').catch(() => ({ data: null })),
      ])
      setInsights(insRes.data)
      setAgents(agRes.data)
      setModelInfo(modelRes.data)
    } catch { toast.error('Failed to load data') }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchAll() }, [])

  const handleUpdate = async (id, patch) => {
    const { data } = await api.patch(`/admin/agents/${id}`, patch)
    setAgents(prev => prev.map(a => a.id === id ? data : a))
  }

  const handleRemove = async (id) => {
    if (!confirm('Remove this agent? They will lose agent access.')) return
    await api.delete(`/admin/agents/${id}`)
    setAgents(prev => prev.filter(a => a.id !== id))
    toast.success('Agent removed')
  }

  if (loading) return (
    <div className="flex items-center justify-center py-32">
      <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const kpis = [
    { label: 'Total Complaints', value: insights?.total ?? 0,          icon: TrendingUp,   color: 'text-violet-400',  bg: 'bg-violet-400/10' },
    { label: 'SLA Breaches',     value: insights?.sla_breaches ?? 0,   icon: AlertTriangle, color: 'text-red-400',     bg: 'bg-red-400/10' },
    { label: 'Avg Resolution',   value: insights?.avg_resolution_time ? `${insights.avg_resolution_time}h` : 'N/A', icon: Clock, color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
    { label: 'Resolved',         value: insights?.by_status?.resolved ?? 0, icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
  ]

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 rounded-xl bg-emerald-400/10 flex items-center justify-center">
          <Settings size={18} className="text-emerald-400" />
        </div>
        <div>
          <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>Admin Panel</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Platform overview & agent management</p>
        </div>
      </div>

      {/* ML Accuracy Badge — front and center */}
      {modelInfo?.available && modelInfo?.accuracy && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4 rounded-2xl px-5 py-4 mb-5"
          style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.1), rgba(59,130,246,0.06))', border: '1px solid rgba(124,58,237,0.25)' }}>
          <div className="w-12 h-12 rounded-2xl bg-violet-500/15 flex items-center justify-center shrink-0">
            <Cpu size={22} className="text-violet-400" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-xs font-semibold text-violet-400 uppercase tracking-widest">ML Routing Model Active</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-400/10 text-emerald-400 border border-emerald-400/20">Live</span>
            </div>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              TF-IDF + Logistic Regression · {modelInfo.total_samples} training samples · Auto-routes every complaint
            </p>
          </div>
          <div className="text-right shrink-0">
            <div className="text-4xl font-bold text-violet-400">{modelInfo.accuracy}%</div>
            <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>routing accuracy</div>
          </div>
        </motion.div>
      )}

      {/* AI Narrator */}
      <AINarrator />

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {kpis.map((k, i) => (
          <motion.div key={k.label}
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
            className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-slate-500">{k.label}</span>
              <div className={`w-8 h-8 rounded-xl ${k.bg} flex items-center justify-center`}>
                <k.icon size={15} className={k.color} />
              </div>
            </div>
            <div className={`text-3xl font-bold ${k.color}`}>{k.value}</div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
        {/* Agent management */}
        <div className="card p-5">
          <div className="text-sm font-medium mb-4">Agents ({agents.length})</div>
          {agents.length === 0 ? (
            <p className="text-xs  py-4 text-center">No agents registered yet.</p>
          ) : (
            agents.map(a => (
              <AgentRow key={a.id} agent={a} onUpdate={handleUpdate} onRemove={handleRemove} />
            ))
          )}
        </div>

        {/* Category breakdown */}
        <div className="card p-5">
          <div className="text-sm font-medium mb-4">By Category</div>
          {insights?.by_category && Object.entries(insights.by_category).length > 0 ? (
            <div className="space-y-2.5">
              {Object.entries(insights.by_category).map(([k, v]) => {
                const total = Object.values(insights.by_category).reduce((a, b) => a + b, 0)
                const pct = total ? Math.round((v / total) * 100) : 0
                return (
                  <div key={k}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-400 capitalize">{k}</span>
                      <span className="text-slate-500">{v}</span>
                    </div>
                    <div className="h-1.5 bg-slate-800/30 rounded-full overflow-hidden">
                      <div className="h-full bg-violet-500 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          ) : <p className="text-xs text-slate-600">No data yet</p>}
        </div>
      </div>

      {/* Top issues */}
      {insights?.top_issues?.length > 0 && (
        <div className="card p-5 mb-5">
          <div className="text-sm font-medium mb-4" style={{ color: 'var(--text-primary)' }}>Frequent Issues</div>
          <div className="space-y-2">
            {insights.top_issues.map((issue, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-theme last:border-0">
                <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{issue.title}</span>
                <span className="badge border border-theme text-slate-500 ">{issue.count}×</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Channel Performance */}
      <ChannelPerformance data={insights?.channel_performance} />

      {/* ML Routing Model Info */}
      {modelInfo && (
        <div className="card p-5 mt-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-violet-400/10 flex items-center justify-center">
                <Cpu size={15} className="text-violet-400" />
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>ML Routing Model</p>
                <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                  {modelInfo.available ? `${modelInfo.model_type} · ${modelInfo.total_samples} training samples` : 'Model not trained'}
                </p>
              </div>
            </div>
            {modelInfo.available && modelInfo.accuracy && (
              <div className="text-right">
                <div className="text-2xl font-bold text-violet-400">{modelInfo.accuracy}%</div>
                <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>accuracy</div>
              </div>
            )}
          </div>

          {modelInfo.available && modelInfo.per_category ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {Object.entries(modelInfo.per_category).map(([cat, metrics]) => (
                <div key={cat} className="rounded-xl p-3" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                  <div className="text-xs font-medium mb-2" style={{ color: 'var(--text-primary)' }}>{cat}</div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px]">
                      <span style={{ color: 'var(--text-muted)' }}>Precision</span>
                      <span className="text-violet-400 font-medium">{metrics.precision}%</span>
                    </div>
                    <div className="flex justify-between text-[10px]">
                      <span style={{ color: 'var(--text-muted)' }}>Recall</span>
                      <span className="text-blue-400 font-medium">{metrics.recall}%</span>
                    </div>
                    <div className="flex justify-between text-[10px]">
                      <span style={{ color: 'var(--text-muted)' }}>F1</span>
                      <span className="text-emerald-400 font-medium">{metrics.f1}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl p-4 text-center" style={{ background: 'var(--bg-elevated)' }}>
              <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>Model not trained yet</p>
              <code className="text-xs text-violet-400">cd backend && python train_model.py</code>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
