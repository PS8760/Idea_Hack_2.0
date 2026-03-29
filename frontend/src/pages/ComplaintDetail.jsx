import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'
import { useNotifications } from '../context/NotificationContext'
import SLABadge from '../components/SLABadge'
import ChatBox from '../components/ChatBox'
import toast from 'react-hot-toast'
import {
  ArrowLeft, Sparkles, Loader2, Copy, MessageSquare, Mail,
  Phone, Globe, GitBranch, Clock, User, Send, CheckCircle2,
  PlayCircle, AlertTriangle, ChevronRight, Zap, Target,
  ShieldAlert, Activity, Tag, TrendingUp, MessageCircle, Trash2,
  UserCheck, ArrowRightLeft
} from 'lucide-react'
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer } from 'recharts'

// ── helpers ───────────────────────────────────────────────────────────────────
const CHANNEL_ICONS = { whatsapp: MessageSquare, email: Mail, phone: Phone, web: Globe, chat: MessageCircle }
const PRIORITY_CFG  = {
  high:   { color: 'text-red-400',     bg: 'bg-red-400/10',     border: 'border-red-400/20',     bar: 'bg-red-400'     },
  medium: { color: 'text-yellow-400',  bg: 'bg-yellow-400/10',  border: 'border-yellow-400/20',  bar: 'bg-yellow-400'  },
  low:    { color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/20', bar: 'bg-emerald-400' },
}
const SENTIMENT_CFG = {
  negative: { color: 'text-red-400',     bg: 'bg-red-400/10',     border: 'border-red-400/20'     },
  positive: { color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/20' },
  neutral:  { color: 'text-slate-400',   bg: 'bg-slate-400/10',   border: 'border-slate-400/20'   },
}
const STATUS_CFG = {
  open:          { label: 'Open',      color: 'text-blue-400',    bg: 'bg-blue-400/10',    border: 'border-blue-400/20',    icon: AlertTriangle, step: 0 },
  'in-progress': { label: 'In Review', color: 'text-yellow-400',  bg: 'bg-yellow-400/10',  border: 'border-yellow-400/20',  icon: PlayCircle,    step: 1 },
  resolved:      { label: 'Resolved',  color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/20', icon: CheckCircle2,  step: 2 },
}

function fmt(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' })
}

// ── Complaint DNA Radar Chart ─────────────────────────────────────────────────
function ComplaintDNA({ complaint }) {
  const { severity_score, sentiment, priority, urgency_signals = [], escalation_history = [], key_issues = [] } = complaint

  const financialImpact = Math.min(10, (severity_score || 5) * 1.1)
  const emotionalIntensity = sentiment === 'negative' ? Math.min(10, (severity_score || 5) + 2) : sentiment === 'neutral' ? 5 : 3
  const urgency = urgency_signals.length > 0 ? Math.min(10, 5 + urgency_signals.length * 2) : priority === 'high' ? 8 : priority === 'medium' ? 5 : 3
  const complexity = Math.min(10, key_issues.length * 2 + escalation_history.length * 2 + 2)
  const recurrence = escalation_history.length > 0 ? Math.min(10, 4 + escalation_history.length * 2) : 3

  const data = [
    { subject: 'Financial', value: Math.round(financialImpact), fullMark: 10 },
    { subject: 'Emotional', value: Math.round(emotionalIntensity), fullMark: 10 },
    { subject: 'Urgency',   value: Math.round(urgency),           fullMark: 10 },
    { subject: 'Complexity',value: Math.round(complexity),        fullMark: 10 },
    { subject: 'Recurrence',value: Math.round(recurrence),        fullMark: 10 },
  ]

  const avgScore = Math.round(data.reduce((s, d) => s + d.value, 0) / data.length)
  const riskColor = avgScore >= 7 ? 'text-red-400' : avgScore >= 5 ? 'text-yellow-400' : 'text-emerald-400'
  const riskLabel = avgScore >= 7 ? 'High Risk' : avgScore >= 5 ? 'Medium Risk' : 'Low Risk'

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Activity size={13} className="text-violet-400" />
          <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>COMPLAINT DNA</span>
        </div>
        <div className="text-right">
          <div className={`text-sm font-bold ${riskColor}`}>{riskLabel}</div>
          <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>avg {avgScore}/10</div>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={180}>
        <RadarChart data={data}>
          <PolarGrid stroke="var(--border)" />
          <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
          <Radar dataKey="value" stroke="#7c3aed" fill="#7c3aed" fillOpacity={0.25} strokeWidth={2} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  )
}

// ── Severity Meter ────────────────────────────────────────────────────────────
function SeverityMeter({ score }) {
  const pct = Math.min(100, (score / 10) * 100)
  const color = score >= 8 ? 'bg-red-500' : score >= 5 ? 'bg-yellow-500' : 'bg-emerald-500'
  const label = score >= 8 ? 'Critical' : score >= 5 ? 'Moderate' : 'Low'
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: 'var(--text-muted)' }}>Severity</span>
        <span className={`text-sm font-bold ${score >= 8 ? 'text-red-400' : score >= 5 ? 'text-yellow-400' : 'text-emerald-400'}`}>
          {score}<span className="text-xs font-normal opacity-50">/10</span>
        </span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-elevated)' }}>
        <motion.div className={`h-full rounded-full ${color}`}
          initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8, ease: 'easeOut' }} />
      </div>
      <div className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>{label} severity</div>
    </div>
  )
}

// ── User Status Tracker ───────────────────────────────────────────────────────
function UserStatusTracker({ status }) {
  const steps = [
    { key: 'open',         label: 'Received',   icon: CheckCircle2  },
    { key: 'in-progress',  label: 'In Review',  icon: PlayCircle    },
    { key: 'resolved',     label: 'Resolved',   icon: CheckCircle2  },
  ]
  const currentStep = STATUS_CFG[status]?.step ?? 0
  return (
    <div className="card p-5">
      <p className="text-xs font-semibold mb-4" style={{ color: 'var(--text-muted)' }}>COMPLAINT STATUS</p>
      <div className="flex items-center">
        {steps.map((s, i) => {
          const done = i <= currentStep
          const active = i === currentStep
          const Icon = s.icon
          return (
            <div key={s.key} className="flex items-center flex-1">
              <div className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all ${
                  done ? 'bg-violet-600 border-violet-600' : ''
                }`} style={!done ? { borderColor: 'var(--border)', background: 'var(--bg-elevated)' } : {}}>
                  <Icon size={14} className={done ? 'text-white' : ''} style={!done ? { color: 'var(--text-muted)' } : {}} />
                </div>
                <span className={`text-[10px] mt-1.5 font-medium ${active ? 'text-violet-400' : ''}`}
                  style={!active ? { color: 'var(--text-muted)' } : {}}>{s.label}</span>
              </div>
              {i < steps.length - 1 && (
                <div className="flex-1 h-0.5 mx-2 mb-4 rounded-full transition-all"
                  style={{ background: i < currentStep ? '#7c3aed' : 'var(--border)' }} />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Status Workflow Panel (agent/admin) ───────────────────────────────────────
function StatusWorkflowPanel({ status, onUpdate, updating }) {
  const [showModal, setShowModal] = useState(false)
  const [targetStatus, setTargetStatus] = useState(null)
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const TRANSITIONS = {
    open: {
      next: 'in-progress', label: 'Start Review', icon: PlayCircle,
      btnClass: 'bg-yellow-500 hover:bg-yellow-600 text-white',
      description: 'Mark as under review. Customer will be notified by email.',
      emailPreview: '📧 "Your complaint is now under review by our team."',
    },
    'in-progress': {
      next: 'resolved', label: 'Mark Resolved', icon: CheckCircle2,
      btnClass: 'bg-emerald-500 hover:bg-emerald-600 text-white',
      description: 'Mark as resolved. Customer will receive a resolution email.',
      emailPreview: '📧 "Your complaint has been resolved. Thank you for your patience."',
    },
  }

  const current = STATUS_CFG[status] || STATUS_CFG.open
  const transition = TRANSITIONS[status]
  const CurrentIcon = current.icon

  const handleAction = async () => {
    setSubmitting(true)
    try { await onUpdate(targetStatus, note); setShowModal(false); setNote('') }
    finally { setSubmitting(false) }
  }

  return (
    <>
      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>STATUS</span>
          <span className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full ${current.bg} ${current.color} border ${current.border}`}>
            <CurrentIcon size={10} />{current.label}
          </span>
        </div>
        {/* Progress */}
        <div className="flex items-center gap-1 mb-4">
          {['open','in-progress','resolved'].map((s, i) => (
            <div key={s} className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${i <= current.step ? 'bg-violet-500' : ''}`}
              style={i > current.step ? { background: 'var(--bg-elevated)' } : {}} />
          ))}
        </div>
        {transition ? (
          <button onClick={() => { setTargetStatus(transition.next); setShowModal(true) }} disabled={updating}
            className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${transition.btnClass}`}>
            <div className="flex items-center gap-2"><transition.icon size={14} />{transition.label}</div>
            <ChevronRight size={13} />
          </button>
        ) : (
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-400/10 border border-emerald-400/20">
            <CheckCircle2 size={14} className="text-emerald-400" />
            <span className="text-sm text-emerald-400 font-medium">Complaint Resolved</span>
          </div>
        )}
        {status === 'resolved' && (
          <button onClick={() => { setTargetStatus('open'); setShowModal(true) }}
            className="w-full mt-2 text-xs py-1.5 rounded-xl transition-colors hover:bg-slate-800/20"
            style={{ color: 'var(--text-muted)' }}>Reopen complaint</button>
        )}
      </div>

      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
            <motion.div initial={{ opacity: 0, scale: 0.93, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.93 }} className="w-full max-w-md rounded-2xl p-6 shadow-2xl"
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
              <h2 className="text-base font-semibold text-center mb-1" style={{ color: 'var(--text-primary)' }}>
                {targetStatus === 'in-progress' ? 'Start Review?' : targetStatus === 'resolved' ? 'Mark as Resolved?' : 'Reopen?'}
              </h2>
              <p className="text-xs text-center mb-4" style={{ color: 'var(--text-muted)' }}>
                {TRANSITIONS[status]?.description}
              </p>
              {TRANSITIONS[status]?.emailPreview && (
                <div className="rounded-xl px-4 py-3 mb-4 text-xs" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                  {TRANSITIONS[status].emailPreview}
                </div>
              )}
              <div className="mb-4">
                <label className="text-xs mb-1.5 block" style={{ color: 'var(--text-muted)' }}>Note (optional — audit trail)</label>
                <textarea rows={3} value={note} onChange={e => setNote(e.target.value)}
                  placeholder="e.g. Verified transaction, refund initiated..." className="input-field resize-none text-sm" />
              </div>
              <div className="flex gap-3">
                <button onClick={handleAction} disabled={submitting}
                  className="btn-primary flex-1 flex items-center justify-center gap-2">
                  {submitting ? <><Loader2 size={13} className="animate-spin" />Updating...</> : <><Zap size={13} />Confirm</>}
                </button>
                <button onClick={() => { setShowModal(false); setNote('') }} className="btn-ghost px-5">Cancel</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}

// ── WhatsApp Box ──────────────────────────────────────────────────────────────
function WhatsAppBox({ complaint, canEdit }) {
  const contactNumber = complaint.contact_number?.replace(/\D/g, '') || ''
  const waLink = contactNumber ? `https://wa.me/${contactNumber}` : null

  // Build pre-filled WhatsApp message for agent
  const ref = `SR-${(complaint._id || '').slice(-6).toUpperCase()}`
  const agentWaMessage = encodeURIComponent(
    `Hello! I'm *${complaint.assigned_agent || 'your support agent'}* from SmartResolve AI 🛡️\n\n` +
    `I'm reaching out regarding your complaint:\n` +
    `📋 *${complaint.title}*\n\n` +
    `🔖 Reference: *${ref}*\n` +
    `📂 Category: ${complaint.category || ''}\n` +
    `⚡ Priority: ${(complaint.priority || '').toUpperCase()}\n\n` +
    `I'm here to help resolve this for you. Please reply to this message and I'll assist you right away.`
  )
  const agentWaLink = contactNumber ? `https://wa.me/${contactNumber}?text=${agentWaMessage}` : null

  // User-side: pre-fill with complaint context so they can follow up
  const userWaMessage = encodeURIComponent(
    `Hi, I'm following up on my complaint:\n` +
    `📋 *${complaint.title}*\n` +
    `🔖 Reference: *${ref}*\n` +
    `📊 Status: ${(complaint.status || '').replace('-', ' ').toUpperCase()}\n\n` +
    `Please update me on the resolution status.`
  )
  const userWaLink = contactNumber ? `https://wa.me/${contactNumber}?text=${userWaMessage}` : null

  return (
    <div className="card p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-400/10 flex items-center justify-center">
            <MessageSquare size={15} className="text-emerald-400" />
          </div>
          <div>
            <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>WhatsApp Channel</span>
            <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
              {contactNumber ? `+${contactNumber}` : 'No number provided'}
            </p>
          </div>
        </div>
        <span className="text-[10px] px-2 py-1 rounded-full bg-emerald-400/10 text-emerald-400 border border-emerald-400/20">
          WhatsApp
        </span>
      </div>

      {/* Contact info */}
      {contactNumber ? (
        <div className="rounded-xl p-4" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-emerald-400/15 flex items-center justify-center">
              <MessageSquare size={18} className="text-emerald-400" />
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>+{contactNumber}</p>
              <p className="text-[10px] text-emerald-400">WhatsApp registered</p>
            </div>
          </div>

          {canEdit ? (
            // Agent view — open WhatsApp to contact customer
            <div className="space-y-2">
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Click below to open WhatsApp and message the customer directly on their registered number.
              </p>
              <a href={agentWaLink} target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl font-medium text-sm text-white transition-all hover:opacity-90"
                style={{ background: '#25D366' }}>
                <MessageSquare size={15} />
                Open WhatsApp Chat
              </a>
            </div>
          ) : (
            // User view — just show status, no button needed
            <div className="rounded-xl p-3 bg-emerald-400/5 border border-emerald-400/20">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-medium text-emerald-400">WhatsApp contact registered</span>
              </div>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {complaint.assigned_agent
                  ? `${complaint.assigned_agent} will contact you on WhatsApp at +${contactNumber} shortly.`
                  : 'An agent will contact you on WhatsApp at this number shortly.'}
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-xl p-4 text-center" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            No WhatsApp number was provided with this complaint.
          </p>
        </div>
      )}

      {/* Message history from in-app chat */}
      {complaint.messages?.length > 0 && (
        <div>
          <p className="text-[10px] uppercase tracking-widest font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>
            In-app messages
          </p>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {complaint.messages.map((m, i) => (
              <div key={i} className="rounded-xl p-3 text-xs" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-emerald-400">{m.sender_name} · {m.sender_role}</span>
                  <span style={{ color: 'var(--text-muted)' }}>
                    {new Date(m.at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p style={{ color: 'var(--text-primary)' }}>{m.text}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
function EmailReplyBox({ complaintId, complaint }) {
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [generating, setGenerating] = useState(false)

  const generateDraft = async () => {
    setGenerating(true)
    try { const { data } = await api.post(`/complaints/${complaintId}/suggest-reply`); setReply(data.suggestion) }
    catch { toast.error('Failed to generate draft') }
    finally { setGenerating(false) }
  }

  const sendReply = async () => {
    if (!reply.trim()) return toast.error('Reply cannot be empty')
    setSending(true)
    try {
      await api.post(`/complaints/${complaintId}/email-reply`, { reply })
      setSent(true); toast.success('Email sent to customer')
      setTimeout(() => setSent(false), 4000); setReply('')
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed to send') }
    finally { setSending(false) }
  }

  const emailMessages = (complaint.messages || []).filter(m => m.msg_type === 'email' || m.sender_role === 'agent')

  return (
    <div className="card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Mail size={14} className="text-blue-400" />
          <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Email Thread</span>
        </div>
        <span className="text-[10px] px-2 py-1 rounded-full bg-blue-400/10 text-blue-400 border border-blue-400/20">Sends to customer</span>
      </div>
      {emailMessages.length > 0 && (
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {emailMessages.map((m, i) => (
            <div key={i} className="rounded-xl p-3 text-xs" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-blue-400">{m.sender_name}</span>
                <span style={{ color: 'var(--text-muted)' }}>{fmt(m.at)}</span>
              </div>
              <p style={{ color: 'var(--text-primary)' }} className="leading-relaxed whitespace-pre-wrap">{m.text}</p>
            </div>
          ))}
        </div>
      )}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs" style={{ color: 'var(--text-muted)' }}>Compose reply</label>
          <button onClick={generateDraft} disabled={generating}
            className="flex items-center gap-1.5 text-xs text-violet-400 hover:text-violet-300 transition-colors">
            {generating ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />} AI Draft
          </button>
        </div>
        <textarea rows={4} value={reply} onChange={e => setReply(e.target.value)}
          placeholder="Write your reply..." className="input-field resize-none text-sm" />
      </div>
      <button onClick={sendReply} disabled={sending || !reply.trim()}
        className="btn-primary w-full flex items-center justify-center gap-2 text-sm">
        {sending ? <><Loader2 size={13} className="animate-spin" />Sending...</>
          : sent ? <><CheckCircle2 size={13} />Sent!</>
          : <><Send size={13} />Send Email Reply</>}
      </button>
    </div>
  )
}

// ── Reassign Panel (admin only) ───────────────────────────────────────────────
function ReassignPanel({ complaint, onReassigned }) {
  const [agents, setAgents] = useState([])
  const [loading, setLoading] = useState(true)
  const [reassigning, setReassigning] = useState(false)
  const [selected, setSelected] = useState('')
  const [showConfirm, setShowConfirm] = useState(false)

  useEffect(() => {
    api.get('/admin/agents')
      .then(({ data }) => setAgents(data.filter(a => a.active !== false && a.id !== complaint.assigned_agent_id)))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [complaint.assigned_agent_id])

  const handleReassign = async () => {
    if (!selected) return
    setReassigning(true)
    try {
      const { data } = await api.patch(`/admin/complaints/${complaint._id}/reassign`, { agent_id: selected })
      toast.success(`Reassigned to ${data.assigned_agent}`)
      setShowConfirm(false)
      setSelected('')
      onReassigned(data)
    } catch { toast.error('Reassign failed') }
    finally { setReassigning(false) }
  }

  const selectedAgent = agents.find(a => a.id === selected)
  const history = complaint.reassign_history || []

  return (
    <div className="card p-5 space-y-4">
      <div className="flex items-center gap-2">
        <ArrowRightLeft size={14} className="text-violet-400" />
        <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Reassign Complaint</span>
      </div>

      {/* Current agent */}
      <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
        <User size={13} className="text-violet-400 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Currently assigned to</p>
          <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
            {complaint.assigned_agent || 'Unassigned'}
          </p>
        </div>
      </div>

      {/* Agent selector */}
      {loading ? (
        <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
          <Loader2 size={12} className="animate-spin" /> Loading agents...
        </div>
      ) : agents.length === 0 ? (
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>No other agents available.</p>
      ) : (
        <div className="space-y-1.5">
          {agents.map(a => (
            <button key={a.id} onClick={() => setSelected(a.id === selected ? '' : a.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all border ${
                selected === a.id ? 'border-violet-500/60 bg-violet-500/10' : ''
              }`}
              style={selected !== a.id ? { borderColor: 'var(--border)', background: 'var(--bg-elevated)' } : {}}>
              <div className="w-7 h-7 rounded-full bg-violet-600/20 flex items-center justify-center text-[11px] font-bold text-violet-400 shrink-0">
                {a.name[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{a.name}</p>
                <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                  {a.agent_channel} · {a.specialization || 'General'}
                </p>
              </div>
              {selected === a.id && <CheckCircle2 size={14} className="text-violet-400 shrink-0" />}
            </button>
          ))}
        </div>
      )}

      {selected && (
        <button onClick={() => setShowConfirm(true)}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium text-white bg-violet-600 hover:bg-violet-700 transition-colors">
          <UserCheck size={14} /> Assign to {selectedAgent?.name}
        </button>
      )}

      {/* Reassign history */}
      {history.length > 0 && (
        <div>
          <p className="text-[10px] uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>Reassign History</p>
          <div className="space-y-1.5">
            {history.map((h, i) => (
              <div key={i} className="flex items-start gap-2 text-xs px-3 py-2 rounded-xl" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                <ArrowRightLeft size={10} className="text-violet-400 mt-0.5 shrink-0" />
                <div style={{ color: 'var(--text-muted)' }}>
                  <span style={{ color: 'var(--text-primary)' }}>{h.from_agent_name}</span>
                  {' → '}
                  <span style={{ color: 'var(--text-primary)' }}>{h.to_agent_name}</span>
                  <span className="ml-1.5 text-[10px]">by {h.by_admin} · {new Date(h.at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Confirm modal */}
      <AnimatePresence>
        {showConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
            <motion.div initial={{ opacity: 0, scale: 0.93 }} animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.93 }} className="w-full max-w-sm rounded-2xl p-6 shadow-2xl"
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
              <div className="w-12 h-12 rounded-2xl bg-violet-400/10 flex items-center justify-center mx-auto mb-4">
                <UserCheck size={20} className="text-violet-400" />
              </div>
              <h2 className="text-base font-semibold text-center mb-1" style={{ color: 'var(--text-primary)' }}>
                Reassign Complaint?
              </h2>
              <p className="text-xs text-center mb-5" style={{ color: 'var(--text-muted)' }}>
                This will move the complaint from <span style={{ color: 'var(--text-primary)' }}>{complaint.assigned_agent || 'Unassigned'}</span> to <span style={{ color: 'var(--text-primary)' }}>{selectedAgent?.name}</span>. Both agents will be able to see this change.
              </p>
              <div className="flex gap-3">
                <button onClick={handleReassign} disabled={reassigning}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium text-white bg-violet-600 hover:bg-violet-700 transition-colors">
                  {reassigning ? <><Loader2 size={13} className="animate-spin" />Reassigning...</> : <><UserCheck size={13} />Confirm</>}
                </button>
                <button onClick={() => setShowConfirm(false)} className="btn-ghost px-5">Cancel</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function ComplaintDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { addNotification } = useNotifications()
  const [complaint, setComplaint] = useState(null)
  const [loading, setLoading] = useState(true)
  const [suggestion, setSuggestion] = useState('')
  const [suggesting, setSuggesting] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [escalating, setEscalating] = useState(false)
  const [similar, setSimilar] = useState([])
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    window.scrollTo(0, 0)
    api.get(`/complaints/${id}`)
      .then(({ data }) => {
        setComplaint(data)
        // Auto-generate draft for agents/admins
        const role = JSON.parse(localStorage.getItem('user') || '{}')?.role
        if (role === 'agent' || role === 'admin') {
          api.post(`/complaints/${id}/suggest-reply`)
            .then(({ data: d }) => setSuggestion(d.suggestion))
            .catch(() => {})
        }
      })
      .catch(() => toast.error('Failed to load complaint'))
      .finally(() => setLoading(false))
    api.get(`/complaints/${id}/similar`)
      .then(({ data }) => setSimilar(data.similar || []))
      .catch(() => {})
  }, [id])

  const getSuggestion = async () => {
    setSuggesting(true)
    try { const { data } = await api.post(`/complaints/${id}/suggest-reply`); setSuggestion(data.suggestion) }
    catch { toast.error('Failed to get suggestion') }
    finally { setSuggesting(false) }
  }

  const updateStatus = async (status, note = '') => {
    setUpdatingStatus(true)
    try {
      const { data } = await api.patch(`/complaints/${id}`, { status, note })
      setComplaint(data)
      toast.success(status === 'in-progress' ? '✓ Review started — customer notified' : status === 'resolved' ? '✓ Resolved — customer notified' : 'Status updated')
      if (status === 'resolved') addNotification({ type: 'resolved', message: 'Complaint resolved', detail: data.title, forRoles: ['user', 'admin'] })
    } catch { toast.error('Update failed') }
    finally { setUpdatingStatus(false) }
  }

  const escalate = async () => {
    setEscalating(true)
    try {
      const { data } = await api.post(`/complaints/${id}/escalate`)
      setComplaint(data)
      toast.success(`Escalated to ${data.escalated_to} agent`)
      addNotification({ type: 'escalation', message: `Escalated to ${data.escalated_to} agent`, detail: complaint?.title, forRoles: ['user', 'admin'] })
    } catch { toast.error('Escalation failed') }
    finally { setEscalating(false) }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await api.delete(`/complaints/${id}`)
      toast.success('Complaint deleted successfully')
      navigate('/app/complaints')
    } catch { toast.error('Failed to delete complaint') }
    finally { setDeleting(false) }
  }

  const handleReassigned = (updated) => setComplaint(updated)

  if (loading) return (
    <div className="flex items-center justify-center h-full py-32">
      <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
  if (!complaint) return <div className="p-6" style={{ color: 'var(--text-muted)' }}>Complaint not found.</div>

  const {
    title, description, category, product, priority, status, sentiment,
    summary, sla_deadline, channel, is_duplicate, escalation_history = [],
    assigned_agent, key_issues = [], urgency_signals = [],
    suggested_actions = [], severity_score, created_at
  } = complaint

  const ref = `SR-${id.slice(-6).toUpperCase()}`
  const ChannelIcon = CHANNEL_ICONS[channel] || Globe
  const pc = PRIORITY_CFG[priority] || PRIORITY_CFG.medium
  const sc = SENTIMENT_CFG[sentiment] || SENTIMENT_CFG.neutral
  const canEdit = user?.role === 'admin' || user?.role === 'agent'

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Delete confirmation modal */}
      <AnimatePresence>
        {showDeleteModal && (
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
                This complaint will be permanently removed and cannot be recovered.
              </p>
              <div className="flex gap-3">
                <button onClick={handleDelete} disabled={deleting}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium text-white bg-red-500 hover:bg-red-600 transition-colors">
                  {deleting ? <><Loader2 size={13} className="animate-spin" />Deleting...</> : <><Trash2 size={13} />Delete</>}
                </button>
                <button onClick={() => setShowDeleteModal(false)} className="btn-ghost px-5">Cancel</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Back + Reference */}
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm transition-colors hover:text-violet-400"
          style={{ color: 'var(--text-muted)' }}>
          <ArrowLeft size={15} /> Back
        </button>
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono font-bold text-violet-400 bg-violet-400/10 border border-violet-400/20 px-3 py-1 rounded-lg">{ref}</span>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{fmt(created_at)}</span>
          {(user?.role === 'user' || user?.role === 'admin') && (
            <button onClick={() => setShowDeleteModal(true)}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl text-red-400 bg-red-400/10 border border-red-400/20 hover:bg-red-400/20 transition-colors">
              <Trash2 size={12} /> Delete
            </button>
          )}
        </div>
      </div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>

        {/* Title + SLA */}
        <div className="flex items-start justify-between gap-4 mb-3">
          <h1 className="text-2xl font-bold leading-snug" style={{ color: 'var(--text-primary)' }}>{title}</h1>
          <SLABadge deadline={sla_deadline} status={status} />
        </div>

        {/* Channel + Agent + Duplicate */}
        <div className="flex flex-wrap items-center gap-2 mb-6">
          <span className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
            <ChannelIcon size={11} /> {channel}
          </span>
          {complaint.contact_number && (
            <span className="badge border border-theme text-slate-400  flex items-center gap-1">
              {channel === 'whatsapp' ? <MessageSquare size={11} /> : <Phone size={11} />} {complaint.contact_number}
            </span>
          )}
          {assigned_agent && (
            <span className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full text-violet-400 bg-violet-400/10 border border-violet-400/20">
              <User size={11} /> {assigned_agent}
            </span>
          )}
          {is_duplicate && (
            <span className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full text-orange-400 bg-orange-400/10 border border-orange-400/20">
              <Copy size={11} /> Possible duplicate
            </span>
          )}
        </div>

        {/* ── AI Intelligence Strip ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {/* Sentiment */}
          <div className={`rounded-xl p-3 border ${sc.bg} ${sc.border}`}>
            <div className="text-[9px] uppercase tracking-widest mb-1 opacity-60" style={{ color: 'var(--text-muted)' }}>Sentiment</div>
            <div className={`text-sm font-bold capitalize ${sc.color}`}>{sentiment}</div>
          </div>
          {/* Priority */}
          <div className={`rounded-xl p-3 border ${pc.bg} ${pc.border}`}>
            <div className="text-[9px] uppercase tracking-widest mb-1 opacity-60" style={{ color: 'var(--text-muted)' }}>Priority</div>
            <div className={`text-sm font-bold capitalize ${pc.color}`}>{priority}</div>
          </div>
          {/* Category */}
          <div className="rounded-xl p-3" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
            <div className="text-[9px] uppercase tracking-widest mb-1 opacity-60" style={{ color: 'var(--text-muted)' }}>Category</div>
            <div className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{category}</div>
          </div>
          {/* Product */}
          <div className="rounded-xl p-3" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
            <div className="text-[9px] uppercase tracking-widest mb-1 opacity-60" style={{ color: 'var(--text-muted)' }}>Product</div>
            <div className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{product || '—'}</div>
          </div>
        </div>

        {/* ── Two column layout ── */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

          {/* LEFT — 3 cols */}
          <div className="lg:col-span-3 space-y-4">

            {/* Description */}
            <div className="card p-5">
              <div className="text-[10px] uppercase tracking-widest font-semibold mb-3" style={{ color: 'var(--text-muted)' }}>Description</div>
              <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--text-primary)' }}>{description}</p>
            </div>

            {/* AI Summary */}
            {summary && (
              <div className="rounded-2xl p-5 bg-violet-500/5 border border-violet-500/15">
                <div className="flex items-center gap-1.5 text-xs text-violet-400 mb-3">
                  <Sparkles size={11} /> AI Summary
                </div>
                {canEdit ? (
                  // Admin/Agent: bullet points
                  Array.isArray(summary) ? (
                    <ul className="space-y-2">
                      {summary.map((point, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm" style={{ color: 'var(--text-primary)' }}>
                          <span className="w-1.5 h-1.5 rounded-full bg-violet-400 mt-1.5 shrink-0" />
                          {point}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}>{summary}</p>
                  )
                ) : (
                  // User: single sentence (join if array)
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}>
                    {Array.isArray(summary) ? summary.join('. ') : summary}
                  </p>
                )}
              </div>
            )}

            {/* AI Intelligence Panel — Key Issues + Urgency + Actions */}
            {(key_issues.length > 0 || urgency_signals.length > 0 || suggested_actions.length > 0) && (
              <div className="card p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <Activity size={14} className="text-violet-400" />
                  <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>AI Intelligence</span>
                </div>

                {key_issues.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1.5 mb-2">
                      <Target size={11} className="text-blue-400" />
                      <span className="text-[10px] uppercase tracking-widest font-semibold text-blue-400">Key Issues Extracted</span>
                    </div>
                    <div className="space-y-1.5">
                      {key_issues.map((issue, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs rounded-lg px-3 py-2"
                          style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)' }}>
                          <div className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                          {issue}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {urgency_signals.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1.5 mb-2">
                      <AlertTriangle size={11} className="text-orange-400" />
                      <span className="text-[10px] uppercase tracking-widest font-semibold text-orange-400">Urgency Signals</span>
                    </div>
                    <div className="space-y-1.5">
                      {urgency_signals.map((sig, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs rounded-lg px-3 py-2 bg-orange-400/5 border border-orange-400/15 text-orange-300">
                          <div className="w-1.5 h-1.5 rounded-full bg-orange-400 shrink-0" />
                          {sig}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {suggested_actions.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1.5 mb-2">
                      <Zap size={11} className="text-emerald-400" />
                      <span className="text-[10px] uppercase tracking-widest font-semibold text-emerald-400">Suggested Actions</span>
                    </div>
                    <div className="space-y-1.5">
                      {suggested_actions.map((action, i) => (
                        <div key={i} className="flex items-center gap-2.5 text-xs rounded-lg px-3 py-2"
                          style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)' }}>
                          <span className="text-[10px] font-bold text-emerald-400 shrink-0 w-4">{i + 1}</span>
                          {action}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Escalation History */}
            {escalation_history.length > 0 && (
              <div className="card p-5">
                <div className="flex items-center gap-2 mb-4">
                  <GitBranch size={14} className="text-violet-400" />
                  <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Escalation History</span>
                </div>
                <div className="space-y-4">
                  {escalation_history.map((e, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="flex flex-col items-center">
                        <div className="w-7 h-7 rounded-full bg-violet-400/10 border border-violet-400/20 flex items-center justify-center shrink-0">
                          <GitBranch size={11} className="text-violet-400" />
                        </div>
                        {i < escalation_history.length - 1 && <div className="w-px flex-1 mt-1" style={{ background: 'var(--border)', minHeight: '20px' }} />}
                      </div>
                      <div className="flex-1 pb-2">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                            <span className="capitalize">{e.from}</span> → <span className="text-violet-400 capitalize">{e.to}</span>
                          </span>
                          <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{fmt(e.at)}</span>
                        </div>
                        <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>{e.reason}</p>
                        {e.chat_summary && (
                          <div className="flex items-start gap-1.5 mt-2 rounded-lg px-3 py-2 bg-violet-500/5 border border-violet-500/15">
                            <Sparkles size={10} className="text-violet-400 mt-0.5 shrink-0" />
                            <p className="text-[11px] text-violet-400/80 italic leading-relaxed">{e.chat_summary}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Agent Assist */}
            {canEdit && (
              <div className="card p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Sparkles size={14} className="text-violet-400" />
                    <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Agent Assist</span>
                    {suggestion && !suggesting && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-400/10 text-violet-400 border border-violet-400/20">
                        Auto-generated
                      </span>
                    )}
                  </div>
                  <button onClick={getSuggestion} disabled={suggesting}
                    className="flex items-center gap-1.5 text-xs transition-colors hover:text-violet-300"
                    style={{ color: 'var(--text-muted)' }}>
                    {suggesting ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
                    {suggesting ? 'Generating...' : 'Regenerate'}
                  </button>
                </div>
                {suggesting ? (
                  <div className="space-y-2">
                    {[90, 70, 80].map((w, i) => (
                      <div key={i} className="h-3 rounded-full animate-pulse" style={{ background: 'var(--bg-elevated)', width: `${w}%` }} />
                    ))}
                    <p className="text-xs text-violet-400 flex items-center gap-1.5 mt-1">
                      <Sparkles size={10} /> AI drafting response...
                    </p>
                  </div>
                ) : suggestion ? (
                  <div className="relative">
                    <p className="text-sm leading-relaxed rounded-xl p-4 pr-10" style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)' }}>{suggestion}</p>
                    <button onClick={() => { navigator.clipboard.writeText(suggestion); toast.success('Copied') }}
                      className="absolute top-3 right-3 transition-colors hover:text-violet-400" style={{ color: 'var(--text-muted)' }}>
                      <Copy size={13} />
                    </button>
                  </div>
                ) : (
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    AI draft will appear here automatically.
                  </p>
                )}
              </div>
            )}

            {/* Communication — channel-aware */}
            {channel === 'email'
              ? canEdit
                ? <EmailReplyBox complaintId={id} complaint={complaint} />
                : (
                  <div className="card p-5">
                    <div className="flex items-center gap-2 mb-2">
                      <Mail size={14} className="text-blue-400" />
                      <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Email Thread</span>
                    </div>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      An agent will reply to your registered email address. Check your inbox for updates.
                    </p>
                  </div>
                )
              : channel === 'whatsapp'
              ? <WhatsAppBox complaint={complaint} canEdit={canEdit} />
              : <ChatBox complaintId={id} assignedAgent={assigned_agent} channel={channel} />
            }
          </div>

          {/* RIGHT — 2 cols */}
          <div className="lg:col-span-2 space-y-4">

            {/* User: status tracker / Agent+Admin: workflow panel */}
            {canEdit
              ? <StatusWorkflowPanel status={status} onUpdate={updateStatus} updating={updatingStatus} />
              : <UserStatusTracker status={status} />
            }

            {/* Reassign — admin only */}
            {user?.role === 'admin' && (
              <ReassignPanel complaint={complaint} onReassigned={handleReassigned} />
            )}

            {/* Reassign notice — context-aware for both old and new agent */}
            {user?.role === 'agent' && complaint.reassign_history?.length > 0 && (() => {
              const uid = user._id || user.id
              const latest = complaint.reassign_history[complaint.reassign_history.length - 1]
              const isNewAgent = latest.to_agent_id === uid || complaint.assigned_agent_id === uid
              const isOldAgent = latest.from_agent_id === uid

              return (
                <div className="card p-4 space-y-3">
                  {/* Highlighted notice for the newly assigned agent */}
                  {isNewAgent && (
                    <div className="flex items-start gap-3 px-3 py-3 rounded-xl bg-violet-500/10 border border-violet-500/25">
                      <UserCheck size={15} className="text-violet-400 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs font-semibold text-violet-400 mb-0.5">Assigned to you by {latest.by_admin}</p>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          Previously handled by <span style={{ color: 'var(--text-primary)' }}>{latest.from_agent_name || 'Unassigned'}</span>
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Notice for the old agent */}
                  {isOldAgent && !isNewAgent && (
                    <div className="flex items-start gap-3 px-3 py-3 rounded-xl bg-orange-500/10 border border-orange-500/25">
                      <ArrowRightLeft size={15} className="text-orange-400 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs font-semibold text-orange-400 mb-0.5">Complaint reassigned by {latest.by_admin}</p>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          Moved to <span style={{ color: 'var(--text-primary)' }}>{latest.to_agent_name}</span>
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Full history if more than one entry */}
                  {complaint.reassign_history.length > 1 && (
                    <div>
                      <p className="text-[10px] uppercase tracking-widest mb-1.5" style={{ color: 'var(--text-muted)' }}>Full History</p>
                      <div className="space-y-1.5">
                        {complaint.reassign_history.map((h, i) => (
                          <div key={i} className="flex items-start gap-2 text-xs px-3 py-2 rounded-xl" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                            <ArrowRightLeft size={10} className="text-violet-400 mt-0.5 shrink-0" />
                            <div style={{ color: 'var(--text-muted)' }}>
                              <span style={{ color: 'var(--text-primary)' }}>{h.from_agent_name}</span>
                              {' → '}
                              <span style={{ color: 'var(--text-primary)' }}>{h.to_agent_name}</span>
                              <span className="ml-1.5 text-[10px]">by {h.by_admin} · {new Date(h.at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })()}

            {/* SLA Panel */}
            <div className="card p-5">
              <div className="flex items-center gap-2 mb-3">
                <Clock size={13} className="text-violet-400" />
                <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>SLA TRACKING</span>
              </div>
              <SLABadge deadline={sla_deadline} status={status} />
              {sla_deadline && (
                <div className="mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                  Deadline: {fmt(sla_deadline)}
                </div>
              )}
            </div>

            {/* Severity */}
            {severity_score != null && (
              <div className="card p-5">
                <SeverityMeter score={severity_score} />
              </div>
            )}

            {/* Complaint DNA */}
            <ComplaintDNA complaint={complaint} />

            {/* Escalate — agent/admin only */}
            {canEdit && status !== 'resolved' && (
              <div className="card p-5">
                <div className="flex items-center gap-2 mb-2">
                  <GitBranch size={13} className="text-orange-400" />
                  <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>ESCALATION</span>
                </div>
                <p className="text-xs mb-3 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                  Escalate to the next channel agent. Full history and AI summary will be preserved.
                </p>
                <button onClick={escalate} disabled={escalating}
                  className="btn-ghost w-full flex items-center justify-center gap-2 text-xs">
                  {escalating ? <Loader2 size={12} className="animate-spin" /> : <GitBranch size={12} />}
                  Escalate Complaint
                </button>
              </div>
            )}

            {/* Complaint metadata */}
            <div className="card p-5">
              <div className="text-[10px] uppercase tracking-widest font-semibold mb-3" style={{ color: 'var(--text-muted)' }}>Details</div>
              <div className="space-y-2.5">
                {[
                  { label: 'Reference', value: ref, mono: true },
                  { label: 'Channel', value: channel },
                  { label: 'Category', value: category },
                  { label: 'Product', value: product || '—' },
                  { label: 'Submitted', value: fmt(created_at) },
                ].map(({ label, value, mono }) => (
                  <div key={label} className="flex items-center justify-between">
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</span>
                    <span className={`text-xs font-medium ${mono ? 'font-mono text-violet-400' : ''}`}
                      style={!mono ? { color: 'var(--text-primary)' } : {}}>{value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Similar Complaints — agent/admin only */}
            {canEdit && similar.length > 0 && (
              <div className="card p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles size={13} className="text-emerald-400" />
                  <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>SIMILAR RESOLVED CASES</span>
                </div>
                <p className="text-[11px] mb-3 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                  How similar complaints were resolved in the past:
                </p>
                <div className="space-y-3">
                  {similar.map((s, i) => (
                    <div key={i} className="rounded-xl p-3" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <p className="text-xs font-medium line-clamp-1" style={{ color: 'var(--text-primary)' }}>{s.title}</p>
                        <span className="text-[10px] shrink-0 text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded-md">
                          {s.similarity_score}% match
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[10px] capitalize" style={{ color: 'var(--text-muted)' }}>{s.category}</span>
                        <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>·</span>
                        <span className="text-[10px] capitalize" style={{ color: 'var(--text-muted)' }}>{s.channel}</span>
                      </div>
                      <div className="flex items-start gap-1.5 rounded-lg px-2.5 py-2 bg-emerald-500/5 border border-emerald-500/15">
                        <CheckCircle2 size={10} className="text-emerald-400 mt-0.5 shrink-0" />
                        <p className="text-[11px] text-emerald-400/80 leading-relaxed">{s.resolution_note}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>
      </motion.div>
    </div>
  )
}
