import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import api from '../api/axios'
import toast from 'react-hot-toast'
import { useNotifications } from '../context/NotificationContext'
import {
  Sparkles, Loader2, MessageSquare, Mail, Phone, Globe,
  MessageCircle, User, AlertTriangle, CheckCircle2, Zap,
  Tag, ShieldAlert, TrendingUp, Copy, ChevronRight,
  Brain, Target, Clock, Activity, ArrowRight, X
} from 'lucide-react'

function DuplicateModal({ data, onView, onDismiss }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 16 }}
        className="w-full max-w-md rounded-2xl p-6 shadow-2xl"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
      >
        {/* Icon */}
        <div className="w-12 h-12 rounded-2xl bg-orange-400/10 border border-orange-400/20 flex items-center justify-center mx-auto mb-4">
          <Copy size={22} className="text-orange-400" />
        </div>

        <h2 className="text-base font-semibold text-center mb-1" style={{ color: 'var(--text-primary)' }}>
          Complaint Already Exists
        </h2>
        <p className="text-xs text-center mb-5" style={{ color: 'var(--text-muted)' }}>
          We found an active complaint that matches your issue. Submitting again won't speed up resolution.
        </p>

        {/* Existing complaint card */}
        <div className="rounded-xl p-4 mb-5" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
            <span className="text-[10px] uppercase tracking-widest font-semibold text-orange-400">
              {data.existing_status === 'in-progress' ? 'In Progress' : 'Open'} — Being Processed
            </span>
          </div>
          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{data.existing_title}</p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            Your complaint is already in our system and an agent {data.existing_status === 'in-progress' ? 'is actively working on it' : 'will be assigned shortly'}.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onView}
            className="btn-primary flex-1 flex items-center justify-center gap-2 text-sm"
          >
            View Existing <ArrowRight size={14} />
          </button>
          <button
            onClick={onDismiss}
            className="btn-ghost flex items-center justify-center gap-2 text-sm px-4"
          >
            <X size={14} /> Dismiss
          </button>
        </div>
      </motion.div>
    </div>
  )
}

const CHANNELS = [
  { value: 'web',      label: 'Web',       icon: Globe,          color: 'text-slate-400' },
  { value: 'email',    label: 'Email',     icon: Mail,           color: 'text-blue-400' },
  { value: 'whatsapp', label: 'WhatsApp',  icon: MessageSquare,  color: 'text-emerald-400' },
  { value: 'phone',    label: 'Phone',     icon: Phone,          color: 'text-yellow-400' },

]

const SENTIMENT_CONFIG = {
  positive: { color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/20', label: 'Positive' },
  neutral:  { color: 'text-slate-400',   bg: 'bg-slate-400/10',   border: 'border-slate-400/20',   label: 'Neutral'  },
  negative: { color: 'text-red-400',     bg: 'bg-red-400/10',     border: 'border-red-400/20',     label: 'Negative' },
}

const PRIORITY_CONFIG = {
  high:   { color: 'text-red-400',     bg: 'bg-red-400/10',     bar: 'bg-red-400',     label: 'High',   score: 90 },
  medium: { color: 'text-yellow-400',  bg: 'bg-yellow-400/10',  bar: 'bg-yellow-400',  label: 'Medium', score: 55 },
  low:    { color: 'text-emerald-400', bg: 'bg-emerald-400/10', bar: 'bg-emerald-400', label: 'Low',    score: 20 },
}

const COUNTRY_CODES = [
  { code: '+91', label: '🇮🇳 India (+91)' },
  { code: '+1',  label: '🇺🇸 USA (+1)' },
  { code: '+44', label: '🇬🇧 UK (+44)' },
  { code: '+971',label: '🇦🇪 UAE (+971)' },
  { code: '+61', label: '🇦🇺 Australia (+61)' },
  { code: '+65', label: '🇸🇬 Singapore (+65)' },
  { code: '+49', label: '🇩🇪 Germany (+49)' },
]

function SeverityMeter({ score }) {
  const pct = Math.min(100, Math.max(0, (score / 10) * 100))
  const color = score >= 8 ? 'bg-red-500' : score >= 5 ? 'bg-yellow-500' : 'bg-emerald-500'
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Severity Score</span>
        <span className={`text-sm font-bold ${score >= 8 ? 'text-red-400' : score >= 5 ? 'text-yellow-400' : 'text-emerald-400'}`}>{score}<span className="text-xs font-normal opacity-50">/10</span></span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-elevated)' }}>
        <motion.div
          className={`h-full rounded-full ${color}`}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      </div>
    </div>
  )
}

function AIPanel({ analysis, analyzing, charCount }) {
  const hasAnalysis = !!analysis

  return (
    <div className="sticky top-6 space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <div className="w-7 h-7 rounded-lg bg-violet-500/15 flex items-center justify-center">
          <Brain size={14} className="text-violet-400" />
        </div>
        <div>
          <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>AI Intelligence</div>
          <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
            {analyzing ? 'Analyzing...' : hasAnalysis ? 'Analysis complete' : 'Start typing to activate'}
          </div>
        </div>
        {analyzing && <Loader2 size={13} className="text-violet-400 animate-spin ml-auto" />}
      </div>

      <AnimatePresence mode="wait">
        {!hasAnalysis && !analyzing ? (
          <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="rounded-2xl p-6 text-center" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
            <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center mx-auto mb-3">
              <Sparkles size={18} className="text-violet-400 opacity-50" />
            </div>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Type at least 20 characters and AI will automatically analyze your complaint
            </p>
            {charCount > 0 && (
              <div className="mt-3">
                <div className="h-1 rounded-full overflow-hidden" style={{ background: 'var(--bg-elevated)' }}>
                  <motion.div className="h-full bg-violet-500 rounded-full" style={{ width: `${Math.min(100, (charCount / 20) * 100)}%` }} />
                </div>
                <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>{charCount}/20 characters</p>
              </div>
            )}
          </motion.div>
        ) : analyzing ? (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="rounded-2xl p-5 space-y-3" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
            {[80, 60, 90, 50].map((w, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-lg animate-pulse" style={{ background: 'var(--bg-elevated)' }} />
                <div className="h-2.5 rounded-full animate-pulse flex-1" style={{ background: 'var(--bg-elevated)', width: `${w}%` }} />
              </div>
            ))}
          </motion.div>
        ) : (
          <motion.div key="result" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="space-y-3">

            {/* Severity meter */}
            <div className="rounded-2xl p-4" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
              <SeverityMeter score={analysis.severity_score || 5} />
            </div>

            {/* Classification grid */}
            <div className="rounded-2xl p-4 space-y-3" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
              <p className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: 'var(--text-muted)' }}>Classification</p>
              <div className="grid grid-cols-2 gap-2">
                {/* Sentiment */}
                {(() => { const s = SENTIMENT_CONFIG[analysis.sentiment] || SENTIMENT_CONFIG.neutral; return (
                  <div className={`rounded-xl p-3 ${s.bg} border ${s.border}`}>
                    <div className="text-[9px] uppercase tracking-wider opacity-60 mb-1">Sentiment</div>
                    <div className={`text-xs font-semibold ${s.color}`}>{s.label}</div>
                  </div>
                )})()}
                {/* Priority */}
                {(() => { const p = PRIORITY_CONFIG[analysis.priority] || PRIORITY_CONFIG.medium; return (
                  <div className={`rounded-xl p-3 ${p.bg}`} style={{ border: '1px solid var(--border)' }}>
                    <div className="text-[9px] uppercase tracking-wider opacity-60 mb-1" style={{ color: 'var(--text-muted)' }}>Priority</div>
                    <div className={`text-xs font-semibold ${p.color}`}>{p.label}</div>
                  </div>
                )})()}
                {/* Category */}
                <div className="rounded-xl p-3" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                  <div className="text-[9px] uppercase tracking-wider opacity-60 mb-1" style={{ color: 'var(--text-muted)' }}>Category</div>
                  <div className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{analysis.category}</div>
                </div>
                {/* Product */}
                <div className="rounded-xl p-3" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                  <div className="text-[9px] uppercase tracking-wider opacity-60 mb-1" style={{ color: 'var(--text-muted)' }}>Product</div>
                  <div className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{analysis.product || '—'}</div>
                </div>
              </div>
            </div>

            {/* AI Summary */}
            {analysis.summary && (
              <div className="rounded-2xl p-4" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
                <div className="flex items-center gap-1.5 mb-2">
                  <Sparkles size={11} className="text-violet-400" />
                  <span className="text-[10px] uppercase tracking-widest font-semibold text-violet-400">AI Summary</span>
                </div>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{analysis.summary}</p>
              </div>
            )}

            {/* Key Issues extracted */}
            {analysis.key_issues?.length > 0 && (
              <div className="rounded-2xl p-4" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
                <div className="flex items-center gap-1.5 mb-3">
                  <Target size={11} className="text-blue-400" />
                  <span className="text-[10px] uppercase tracking-widest font-semibold text-blue-400">Key Issues Extracted</span>
                </div>
                <div className="space-y-1.5">
                  {analysis.key_issues.map((issue, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="w-1 h-1 rounded-full bg-blue-400 shrink-0" />
                      <span className="text-xs" style={{ color: 'var(--text-primary)' }}>{issue}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Urgency signals */}
            {analysis.urgency_signals?.length > 0 && (
              <div className="rounded-2xl p-4 bg-orange-400/5 border border-orange-400/20">
                <div className="flex items-center gap-1.5 mb-3">
                  <AlertTriangle size={11} className="text-orange-400" />
                  <span className="text-[10px] uppercase tracking-widest font-semibold text-orange-400">Urgency Signals</span>
                </div>
                <div className="space-y-1.5">
                  {analysis.urgency_signals.map((sig, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="w-1 h-1 rounded-full bg-orange-400 shrink-0" />
                      <span className="text-xs text-orange-300">{sig}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Suggested next actions */}
            {analysis.suggested_actions?.length > 0 && (
              <div className="rounded-2xl p-4" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
                <div className="flex items-center gap-1.5 mb-3">
                  <Zap size={11} className="text-emerald-400" />
                  <span className="text-[10px] uppercase tracking-widest font-semibold text-emerald-400">Suggested Actions</span>
                </div>
                <div className="space-y-2">
                  {analysis.suggested_actions.map((action, i) => (
                    <div key={i} className="flex items-center gap-2 rounded-lg px-2.5 py-2" style={{ background: 'var(--bg-elevated)' }}>
                      <span className="text-[10px] font-bold text-emerald-400 shrink-0">{i + 1}</span>
                      <span className="text-xs" style={{ color: 'var(--text-primary)' }}>{action}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Duplicate warning */}
            {analysis.is_duplicate && (
              <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
                className="rounded-2xl p-4 bg-orange-400/8 border border-orange-400/25">
                <div className="flex items-start gap-2.5">
                  <Copy size={13} className="text-orange-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-orange-400 mb-0.5">Possible Duplicate Detected</p>
                    <p className="text-[11px] text-orange-300/70">A similar complaint already exists in the system. Your submission will still be processed.</p>
                  </div>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function SubmitComplaint() {
  const navigate = useNavigate()
  const { addNotification } = useNotifications()
  const [form, setForm] = useState({ title: '', description: '', channel: 'web', contact_number: '', countryCode: '+91' })
  const [loading, setLoading] = useState(false)
  const [analysis, setAnalysis] = useState(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [agents, setAgents] = useState([])
  const [dupModal, setDupModal] = useState(null)
  const debounceRef = useRef(null)

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  // Fetch agents when channel changes
  useEffect(() => {
    api.get('/admin/agents/available', { params: { channel: form.channel } })
      .then(({ data }) => setAgents(data))
      .catch(() => setAgents([]))
  }, [form.channel])

  // Auto-analyze with debounce as user types
  const runAnalysis = useCallback(async (text) => {
    if (text.trim().length < 20) return
    setAnalyzing(true)
    try {
      const { data } = await api.post('/complaints/analyze-preview', { text })
      setAnalysis(data)
      // auto-populate title from AI
      if (data.title) setForm(p => ({ ...p, title: data.title }))
    } catch { /* silent — don't interrupt typing */ }
    finally { setAnalyzing(false) }
  }, [])

  useEffect(() => {
    const text = form.description.trim()
    clearTimeout(debounceRef.current)
    if (text.length < 20) { setAnalysis(null); setForm(p => ({ ...p, title: '' })); return }
    debounceRef.current = setTimeout(() => runAnalysis(text), 900)
    return () => clearTimeout(debounceRef.current)
  }, [form.description, runAnalysis])

  const handleSubmit = async (e) => {
    e.preventDefault()

    const fullContactNumber = (form.channel === 'whatsapp' || form.channel === 'phone')
      ? `${form.countryCode}${form.contact_number.replace(/\D/g, '')}`
      : ''

    setLoading(true)
    try {
      const { data } = await api.post('/complaints', { ...form, contact_number: fullContactNumber })
      toast.success(data.assigned_agent ? `Assigned to ${data.assigned_agent}` : 'Complaint submitted')
      
      if (data.assigned_agent) {
        addNotification({
          type: 'assignment',
          message: `New complaint assigned to ${data.assigned_agent}`,
          detail: data.title,
          forRoles: ['agent', 'admin'],
        })
      }

      // ── Channel-specific triggers ─────────────────────────────────────────
      if (form.channel === 'whatsapp') {
        const text = encodeURIComponent(
          `*New Complaint: ${data.title}*\n\n` +
          `*ID:* ${data._id}\n` +
          `*Description:* ${form.description.substring(0, 100)}...\n\n` +
          `*Status:* Being processed by ${data.assigned_agent || 'our team'}.`
        )
        const waUrl = `https://wa.me/${fullContactNumber.replace(/\D/g, '')}?text=${text}`
        window.open(waUrl, '_blank')
      } else if (form.channel === 'phone') {
        window.location.href = `tel:${fullContactNumber}`
      }

      navigate(`/app/complaints/${data._id}`)
    } catch (err) {
      const detail = err.response?.data?.detail
      if (err.response?.status === 409 && detail?.type === 'duplicate') {
        setDupModal(detail)
      } else {
        toast.error(detail || 'Submission failed')
      }
    } finally { setLoading(false) }
  }

  const charCount = form.description.length

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Duplicate modal */}
      <AnimatePresence>
        {dupModal && (
          <DuplicateModal
            data={dupModal}
            onView={() => navigate(`/app/complaints/${dupModal.existing_id}`)}
            onDismiss={() => setDupModal(null)}
          />
        )}
      </AnimatePresence>
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-9 h-9 rounded-xl bg-violet-400/10 flex items-center justify-center">
          <Activity size={18} className="text-violet-400" />
        </div>
        <div>
          <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>New Complaint</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            AI analyzes your complaint in real-time — classifying, extracting issues, and routing automatically
          </p>
        </div>
      </div>

      {/* Two-panel layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        {/* LEFT — Form (3 cols) */}
        <motion.form
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          onSubmit={handleSubmit}
          className="lg:col-span-3 space-y-5"
        >
          {/* AI-generated title */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                Complaint Title
              </label>
              <span className="flex items-center gap-1 text-[10px] text-violet-400">
                <Sparkles size={9} /> AI generated
              </span>
            </div>
            <div className={`input-field flex items-center gap-2 min-h-[42px] ${!form.title ? 'opacity-50' : ''}`}
              style={{ cursor: 'default' }}>
              {analyzing && !form.title
                ? <><Loader2 size={13} className="text-violet-400 animate-spin shrink-0" /><span className="text-xs" style={{ color: 'var(--text-muted)' }}>Generating title...</span></>
                : form.title
                ? <><Sparkles size={13} className="text-violet-400 shrink-0" /><span className="text-sm" style={{ color: 'var(--text-primary)' }}>{form.title}</span></>
                : <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Title will appear after you describe your issue...</span>
              }
            </div>
          </div>

          {/* Description */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                Describe Your Issue
              </label>
              <span className="text-[10px]" style={{ color: charCount >= 20 ? 'var(--text-muted)' : 'var(--text-faint)' }}>
                {charCount} chars {charCount < 20 ? `(${20 - charCount} more for AI)` : '· AI active'}
              </span>
            </div>
            <textarea
              required
              rows={7}
              value={form.description}
              onChange={e => set('description', e.target.value)}
              className="input-field resize-none"
              placeholder="Describe your issue in detail. Include order numbers, dates, amounts, or any relevant information. The more detail you provide, the better AI can classify and route your complaint..."
            />
            {charCount >= 20 && (
              <div className="flex items-center gap-1.5 mt-1.5">
                {analyzing
                  ? <><Loader2 size={11} className="text-violet-400 animate-spin" /><span className="text-[11px] text-violet-400">AI analyzing...</span></>
                  : analysis
                  ? <><CheckCircle2 size={11} className="text-emerald-400" /><span className="text-[11px] text-emerald-400">Analysis ready — see panel →</span></>
                  : null
                }
              </div>
            )}
          </div>

          {/* Channel selector */}
          <div>
            <label className="text-xs font-medium block mb-2" style={{ color: 'var(--text-muted)' }}>
              Preferred Contact Channel
            </label>
            <div className="grid grid-cols-4 gap-2">
              {CHANNELS.map(({ value, label, icon: Icon, color }) => (
                <button
                  key={value} type="button" onClick={() => set('channel', value)}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-xs transition-all ${
                    form.channel === value ? 'border-violet-500/60 bg-violet-500/10 text-violet-300' : ''
                  }`}
                  style={form.channel !== value ? { borderColor: 'var(--border)', background: 'var(--bg-elevated)', color: 'var(--text-muted)' } : {}}
                >
                  <Icon size={16} className={form.channel === value ? 'text-violet-400' : color} />
                  {label}
                </button>
              ))}
            </div>
            {/* Contact Number (WhatsApp/Phone only) */}
            <AnimatePresence>
              {(form.channel === 'whatsapp' || form.channel === 'phone') && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                  className="mt-4 overflow-hidden"
                >
                  <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--text-muted)' }}>
                    Your {form.channel === 'whatsapp' ? 'WhatsApp' : 'Phone'} Number
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={form.countryCode}
                      onChange={e => set('countryCode', e.target.value)}
                      className="h-[42px] px-3 rounded-xl border text-xs outline-none transition-all"
                      style={{ 
                        width: '85px',
                        borderColor: 'var(--border)', 
                        background: 'var(--bg-elevated)',
                        color: 'var(--text-primary)'
                      }}
                    >
                      {COUNTRY_CODES.map(c => (
                        <option key={c.code} value={c.code} style={{ background: 'var(--bg-surface)' }}>{c.code}</option>
                      ))}
                    </select>
                    <div className="relative flex-1">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                        {form.channel === 'whatsapp' ? <MessageSquare size={14} /> : <Phone size={14} />}
                      </div>
                      <input
                        type="tel"
                        required
                        value={form.contact_number}
                        onChange={e => set('contact_number', e.target.value)}
                        placeholder="e.g. 98765 43210"
                        className="input-field pl-10 w-full"
                      />
                    </div>
                  </div>
                  <p className="text-[10px] mt-1.5" style={{ color: 'var(--text-faint)' }}>
                    {form.channel === 'whatsapp' 
                      ? "We'll send your complaint details to this number on WhatsApp."
                      : "Our agents will call you on this number for resolution."}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
            {/* Available agents */}
            <AnimatePresence>
              {agents.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden mt-2"
                >
                  <div className="rounded-xl p-3" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
                    <p className="text-[10px] uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>
                      Available agents for this channel
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {agents.map(a => (
                        <span key={a.id} className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg"
                          style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
                          <User size={11} className="text-violet-400" /> {a.name}
                        </span>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
              {agents.length === 0 && form.channel && (
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="text-[11px] mt-2" style={{ color: 'var(--text-muted)' }}>
                  No agents available for this channel — your complaint will be queued.
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          {/* SLA preview based on AI priority */}
          {analysis && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="flex items-center gap-3 rounded-xl px-4 py-3"
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
              <Clock size={14} className="text-violet-400 shrink-0" />
              <div>
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Estimated SLA: </span>
                <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {analysis.priority === 'high' ? '4 hours' : analysis.priority === 'medium' ? '24 hours' : '72 hours'}
                </span>
                <span className="text-xs ml-2" style={{ color: 'var(--text-muted)' }}>
                  based on {analysis.priority} priority
                </span>
              </div>
            </motion.div>
          )}

          {/* Submit */}
          <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
            {loading
              ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Submitting...</>
              : <><Zap size={15} /> Submit Complaint</>
            }
          </button>

          <p className="text-[11px] text-center" style={{ color: 'var(--text-muted)' }}>
            Your complaint will be automatically classified, assigned, and tracked with SLA monitoring
          </p>
        </motion.form>

        {/* RIGHT — AI Intelligence Panel (2 cols) */}
        <motion.div
          initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}
          className="lg:col-span-2"
        >
          <AIPanel analysis={analysis} analyzing={analyzing} charCount={charCount} />
        </motion.div>
      </div>
    </div>
  )
}
