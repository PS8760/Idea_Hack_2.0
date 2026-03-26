import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'
import { useNotifications } from '../context/NotificationContext'
import SLABadge from '../components/SLABadge'
import toast from 'react-hot-toast'
import ChatBox from '../components/ChatBox'
import {
  ArrowLeft, Sparkles, Loader2, Copy, MessageSquare,
  Mail, Phone, Globe, GitBranch, Clock, User, Send,
  CheckCircle2, PlayCircle, XCircle, AlertTriangle,
  ChevronRight, FileText, Zap
} from 'lucide-react'

// ── Status Workflow Panel ─────────────────────────────────────────────────────
function StatusWorkflowPanel({ status, onUpdate, updating, complaint }) {
  const [showModal, setShowModal] = useState(false)
  const [targetStatus, setTargetStatus] = useState(null)
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const TRANSITIONS = {
    open: {
      next: 'in-progress',
      label: 'Start Review',
      icon: PlayCircle,
      color: 'text-yellow-400',
      bg: 'bg-yellow-400/10',
      border: 'border-yellow-400/20',
      btnClass: 'bg-yellow-500 hover:bg-yellow-600',
      description: 'Mark this complaint as under review. The customer will be notified by email that their complaint is being processed.',
      emailPreview: '📧 Email to customer: "Your complaint is now under review by our team."',
    },
    'in-progress': {
      next: 'resolved',
      label: 'Mark Resolved',
      icon: CheckCircle2,
      color: 'text-emerald-400',
      bg: 'bg-emerald-400/10',
      border: 'border-emerald-400/20',
      btnClass: 'bg-emerald-500 hover:bg-emerald-600',
      description: 'Mark this complaint as resolved. The customer will receive a resolution confirmation email.',
      emailPreview: '📧 Email to customer: "Your complaint has been resolved. Thank you for your patience."',
    },
  }

  const STATUS_META = {
    open:          { label: 'Open',        color: 'text-blue-400',    bg: 'bg-blue-400/10',    border: 'border-blue-400/20',    icon: AlertTriangle },
    'in-progress': { label: 'In Review',   color: 'text-yellow-400',  bg: 'bg-yellow-400/10',  border: 'border-yellow-400/20',  icon: PlayCircle    },
    resolved:      { label: 'Resolved',    color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/20', icon: CheckCircle2  },
  }

  const current = STATUS_META[status] || STATUS_META.open
  const transition = TRANSITIONS[status]
  const CurrentIcon = current.icon

  const handleAction = async () => {
    setSubmitting(true)
    try {
      await onUpdate(targetStatus, note)
      setShowModal(false)
      setNote('')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <div className="card p-5">
        {/* Current status */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Current Status</span>
          <span className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full ${current.bg} ${current.color} border ${current.border}`}>
            <CurrentIcon size={11} />
            {current.label}
          </span>
        </div>

        {/* Progress bar */}
        <div className="flex items-center gap-1.5 mb-5">
          {['open', 'in-progress', 'resolved'].map((s, i) => {
            const steps = ['open', 'in-progress', 'resolved']
            const currentIdx = steps.indexOf(status)
            const isActive = i <= currentIdx
            return (
              <div key={s} className="flex items-center gap-1.5 flex-1">
                <div className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${isActive ? 'bg-violet-500' : ''}`}
                  style={!isActive ? { background: 'var(--bg-elevated)' } : {}} />
                {i < 2 && <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${isActive ? 'bg-violet-500' : ''}`}
                  style={!isActive ? { background: 'var(--bg-elevated)' } : {}} />}
              </div>
            )
          })}
        </div>

        {/* Next action button */}
        {transition ? (
          <button
            onClick={() => { setTargetStatus(transition.next); setShowModal(true) }}
            disabled={updating}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-white text-sm font-medium transition-all ${transition.btnClass}`}
          >
            <div className="flex items-center gap-2">
              <transition.icon size={15} />
              {transition.label}
            </div>
            <ChevronRight size={14} />
          </button>
        ) : (
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-400/10 border border-emerald-400/20">
            <CheckCircle2 size={15} className="text-emerald-400" />
            <span className="text-sm text-emerald-400 font-medium">Complaint Resolved</span>
          </div>
        )}

        {/* Reopen option for resolved */}
        {status === 'resolved' && (
          <button onClick={() => { setTargetStatus('open'); setShowModal(true) }}
            className="w-full mt-2 text-xs py-2 rounded-xl transition-colors hover:bg-slate-800/30"
            style={{ color: 'var(--text-muted)' }}>
            Reopen complaint
          </button>
        )}
      </div>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
            <motion.div
              initial={{ opacity: 0, scale: 0.93, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.93 }}
              className="w-full max-w-md rounded-2xl p-6 shadow-2xl"
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
            >
              {/* Icon */}
              {targetStatus && (() => {
                const t = TRANSITIONS[status]
                const Icon = t?.icon || CheckCircle2
                return (
                  <div className={`w-12 h-12 rounded-2xl ${t?.bg || 'bg-violet-400/10'} border ${t?.border || 'border-violet-400/20'} flex items-center justify-center mx-auto mb-4`}>
                    <Icon size={22} className={t?.color || 'text-violet-400'} />
                  </div>
                )
              })()}

              <h2 className="text-base font-semibold text-center mb-1" style={{ color: 'var(--text-primary)' }}>
                {targetStatus === 'in-progress' ? 'Start Review?' : targetStatus === 'resolved' ? 'Mark as Resolved?' : 'Reopen Complaint?'}
              </h2>
              <p className="text-xs text-center mb-5" style={{ color: 'var(--text-muted)' }}>
                {TRANSITIONS[status]?.description || 'This will update the complaint status.'}
              </p>

              {/* Email preview */}
              {TRANSITIONS[status]?.emailPreview && (
                <div className="rounded-xl px-4 py-3 mb-4 text-xs" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                  {TRANSITIONS[status].emailPreview}
                </div>
              )}

              {/* Note field */}
              <div className="mb-5">
                <label className="text-xs mb-1.5 block" style={{ color: 'var(--text-muted)' }}>
                  Add a note <span className="opacity-50">(optional — for internal audit trail)</span>
                </label>
                <textarea
                  rows={3}
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder="e.g. Verified transaction, refund initiated..."
                  className="input-field resize-none text-sm"
                />
              </div>

              <div className="flex gap-3">
                <button onClick={handleAction} disabled={submitting}
                  className="btn-primary flex-1 flex items-center justify-center gap-2">
                  {submitting
                    ? <><Loader2 size={14} className="animate-spin" /> Updating...</>
                    : <><Zap size={14} /> Confirm</>
                  }
                </button>
                <button onClick={() => { setShowModal(false); setNote('') }}
                  className="btn-ghost px-5">
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}

const channelIcons = { whatsapp: MessageSquare, email: Mail, phone: Phone, web: Globe, chat: MessageSquare }
function EmailReplyBox({ complaintId, complaint }) {
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [generating, setGenerating] = useState(false)

  const generateDraft = async () => {
    setGenerating(true)
    try {
      const { data } = await api.post(`/complaints/${complaintId}/suggest-reply`)
      setReply(data.suggestion)
    } catch { toast.error('Failed to generate draft') }
    finally { setGenerating(false) }
  }

  const sendReply = async () => {
    if (!reply.trim()) return toast.error('Reply cannot be empty')
    setSending(true)
    try {
      await api.post(`/complaints/${complaintId}/email-reply`, { reply })
      setSent(true)
      toast.success('Email reply sent to customer')
      setTimeout(() => setSent(false), 4000)
      setReply('')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to send')
    } finally { setSending(false) }
  }

  const emailMessages = (complaint.messages || []).filter(m => m.msg_type === 'email' || m.sender_role === 'agent')

  return (
    <div className="card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Mail size={15} className="text-blue-400" />
          <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Email Reply</span>
        </div>
        <span className="text-[10px] px-2 py-1 rounded-full bg-blue-400/10 text-blue-400 border border-blue-400/20">
          Sends to customer's email
        </span>
      </div>

      {emailMessages.length > 0 && (
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {emailMessages.map((m, i) => (
            <div key={i} className="rounded-xl p-3 text-xs" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-blue-400">{m.sender_name} · {m.sender_role}</span>
                <span style={{ color: 'var(--text-muted)' }}>
                  {new Date(m.at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </span>
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
            {generating ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
            AI Draft
          </button>
        </div>
        <textarea rows={5} value={reply} onChange={e => setReply(e.target.value)}
          placeholder="Write your reply to the customer..." className="input-field resize-none text-sm" />
      </div>

      <button onClick={sendReply} disabled={sending || !reply.trim()}
        className="btn-primary w-full flex items-center justify-center gap-2 text-sm">
        {sending
          ? <><Loader2 size={14} className="animate-spin" /> Sending...</>
          : sent
          ? <><CheckCircle2 size={14} /> Sent!</>
          : <><Send size={14} /> Send Email Reply</>
        }
      </button>
    </div>
  )
}

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

  useEffect(() => {
    api.get(`/complaints/${id}`)
      .then(({ data }) => setComplaint(data))
      .catch(() => toast.error('Failed to load complaint'))
      .finally(() => setLoading(false))
  }, [id])

  const getSuggestion = async () => {
    setSuggesting(true)
    try {
      const { data } = await api.post(`/complaints/${id}/suggest-reply`)
      setSuggestion(data.suggestion)
    } catch { toast.error('Failed to get suggestion') }
    finally { setSuggesting(false) }
  }

  const updateStatus = async (status, note = '') => {
    setUpdatingStatus(true)
    try {
      const { data } = await api.patch(`/complaints/${id}`, { status, note })
      setComplaint(data)
      toast.success(
        status === 'in-progress' ? '✓ Review started — customer notified' :
        status === 'resolved'    ? '✓ Complaint resolved — customer notified' :
        'Status updated'
      )
      if (status === 'resolved') {
        addNotification({
          type: 'resolved',
          message: 'Complaint marked as resolved',
          detail: data.title,
          forRoles: ['user', 'admin'],
        })
      }
    } catch { toast.error('Update failed') }
    finally { setUpdatingStatus(false) }
  }

  const escalate = async () => {
    setEscalating(true)
    try {
      const { data } = await api.post(`/complaints/${id}/escalate`)
      setComplaint(data)
      toast.success(`Escalated to ${data.escalated_to} agent`)
      addNotification({
        type: 'escalation',
        message: `Complaint escalated to ${data.escalated_to} agent`,
        detail: complaint?.title,
        forRoles: ['user', 'admin'],
      })
    } catch { toast.error('Escalation failed') }
    finally { setEscalating(false) }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-full py-32">
      <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
  if (!complaint) return <div className="p-6 text-slate-500">Complaint not found.</div>

  const {
    title, description, category, priority, status, sentiment,
    summary, sla_deadline, channel, is_duplicate, escalation_history = [],
    assigned_agent
  } = complaint

  const ChannelIcon = channelIcons[channel] || Globe

  const priorityCls = {
    high: 'text-red-400 bg-red-400/10 border-red-400/20',
    medium: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
    low: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
  }[priority] || 'text-slate-400 bg-slate-800 border-slate-700'

  const sentimentCls = { negative: 'text-red-400 bg-red-400/10 border-red-400/20', positive: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20', neutral: 'text-slate-400 bg-slate-800 border-slate-700' }[sentiment] || 'text-slate-400 bg-slate-800 border-slate-700'

  const canEdit = user?.role === 'admin' || user?.role === 'agent'

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <button onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-sm text-slate-500 hover: mb-6 transition-colors">
        <ArrowLeft size={15} /> Back
      </button>

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        {/* Title row */}
        <div className="flex items-start justify-between gap-4 mb-4">
          <h1 className="text-xl font-semibold leading-snug">{title}</h1>
          <SLABadge deadline={sla_deadline} status={status} />
        </div>

        {/* Duplicate warning */}
        {is_duplicate && (
          <div className="flex items-center gap-2 bg-orange-400/8 border border-orange-400/20 text-orange-300 text-sm rounded-xl px-4 py-3 mb-4">
            <Copy size={14} className="shrink-0" />
            This complaint may be a duplicate of an existing ticket.
          </div>
        )}

        {/* Meta badges */}
        <div className="flex flex-wrap gap-2 mb-6">
          <span className={`badge border ${priorityCls}`}>{priority} priority</span>
          <span className={`badge border ${sentimentCls}`}>{sentiment}</span>
          <span className="badge border border-slate-700/50 text-slate-400 bg-slate-800/50">{category}</span>
          <span className="badge border border-slate-700/50 text-slate-400 bg-slate-800/50 flex items-center gap-1">
            <ChannelIcon size={11} /> {channel}
          </span>
          {complaint.contact_number && (
            <span className="badge border border-slate-700/50 text-slate-400 bg-slate-800/50 flex items-center gap-1">
              {channel === 'whatsapp' ? <MessageSquare size={11} /> : <Phone size={11} />} {complaint.contact_number}
            </span>
          )}
          {assigned_agent && (
            <span className="badge border border-violet-500/20 text-violet-400 bg-violet-400/10 flex items-center gap-1">
              <User size={11} /> {assigned_agent}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Left column */}
          <div className="lg:col-span-2 space-y-4">
            {/* Description */}
            <div className="card p-5">
              <div className="text-xs text-slate-500 mb-3">Description</div>
              <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--text-primary)' }}>{description}</p>
            </div>

            {/* AI Summary */}
            {summary && (
              <div className="bg-violet-500/5 border border-violet-500/15 rounded-2xl p-5">
                <div className="flex items-center gap-1.5 text-xs text-violet-400 mb-2">
                  <Sparkles size={12} /> AI Summary
                </div>
                <p className="text-sm text-slate-300 leading-relaxed">{summary}</p>
              </div>
            )}

            {/* Escalation history */}
            {escalation_history.length > 0 && (
              <div className="card p-5">
                <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-3">
                  <GitBranch size={12} /> Escalation History
                </div>
                <div className="space-y-3">
                  {escalation_history.map((e, i) => (
                    <div key={i} className="flex items-start gap-3 text-sm">
                      <div className="w-1.5 h-1.5 rounded-full bg-violet-400 mt-1.5 shrink-0" />
                      <div>
                        <span className="text-slate-300">Escalated to <span className="text-violet-400">{e.to}</span> agent</span>
                        <div className="text-xs text-slate-600 mt-0.5">{e.reason}</div>
                        <div className="text-xs text-slate-700">{new Date(e.at).toLocaleString()}</div>
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
                  <div className="text-sm font-medium">Agent Assist</div>
                  <button onClick={getSuggestion} disabled={suggesting}
                    className="btn-primary flex items-center gap-1.5 text-xs py-1.5 px-3">
                    {suggesting ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                    Generate Reply
                  </button>
                </div>
                {suggestion ? (
                  <div className="relative">
                    <p className="text-sm leading-relaxed bg-slate-800/30 rounded-xl p-4 pr-10" style={{ color: 'var(--text-primary)' }}>{suggestion}</p>
                    <button
                      onClick={() => { navigator.clipboard.writeText(suggestion); toast.success('Copied') }}
                      className="absolute top-3 right-3 text-slate-500 hover:text-slate-300 transition-colors"
                    >
                      <Copy size={14} />
                    </button>
                  </div>
                ) : (
                  <p className="text-xs text-slate-600">AI will generate a contextual reply based on the complaint and its history.</p>
                )}
              </div>
            )}

            {/* Chat / Email Reply — channel-aware */}
            {channel === 'email'
              ? canEdit
                ? <EmailReplyBox complaintId={id} complaint={complaint} />
                : (
                  <div className="card p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <Mail size={14} className="text-blue-400" />
                      <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Email Thread</span>
                    </div>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      An agent will reply to your registered email address. Check your inbox for updates.
                    </p>
                  </div>
                )
              : <ChatBox complaintId={id} assignedAgent={assigned_agent} channel={channel} />
            }
          </div>

          {/* Right column */}
          <div className="space-y-4">
            {/* Status workflow */}
            {canEdit && (
              <StatusWorkflowPanel
                status={status}
                onUpdate={updateStatus}
                updating={updatingStatus}
                complaint={complaint}
              />
            )}

            {/* Escalate */}
            {canEdit && status !== 'resolved' && (
              <div className="card p-5">
                <div className="text-xs text-slate-500 mb-3">Escalation</div>
                <p className="text-xs text-slate-600 mb-3 leading-relaxed">
                  Escalate to another channel agent. They'll receive the full complaint history.
                </p>
                <button onClick={escalate} disabled={escalating}
                  className="btn-ghost w-full flex items-center justify-center gap-2 text-xs">
                  {escalating ? <Loader2 size={12} className="animate-spin" /> : <GitBranch size={12} />}
                  Escalate Complaint
                </button>
              </div>
            )}

            {/* SLA info */}
            <div className="card p-5">
              <div className="text-xs text-slate-500 mb-3 flex items-center gap-1.5"><Clock size={12} /> SLA</div>
              <SLABadge deadline={sla_deadline} status={status} />
              {sla_deadline && (
                <div className="text-xs text-slate-600 mt-2">
                  Deadline: {new Date(sla_deadline).toLocaleString()}
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
