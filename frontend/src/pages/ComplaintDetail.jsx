import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'
import { useNotifications } from '../context/NotificationContext'
import SLABadge from '../components/SLABadge'
import toast from 'react-hot-toast'
import ChatBox from '../components/ChatBox'
import {
  ArrowLeft, Sparkles, Loader2, Copy, MessageSquare,
  Mail, Phone, Globe, GitBranch, Clock, User, Trash2, List, ChevronDown,
  CheckCircle2, Circle, AlertTriangle
} from 'lucide-react'
import { formatDate, timeAgo, slaLabel } from '../utils/date'
import AIAssistant from '../components/AIAssistant'

const STATUS_OPTIONS = ['open', 'in-progress', 'resolved']

const channelIcons = { whatsapp: MessageSquare, email: Mail, phone: Phone, web: Globe, chat: MessageSquare }

// Workflow step definitions matching the "How It Works" demo
const WORKFLOW_STEPS = [
  { key: 'submitted',   label: 'Submitted',    icon: MessageSquare },
  { key: 'classified',  label: 'AI Classified', icon: Sparkles },
  { key: 'assigned',    label: 'Agent Assigned',icon: User },
  { key: 'in-progress', label: 'In Progress',   icon: Clock },
  { key: 'escalated',   label: 'Escalated',     icon: GitBranch, optional: true },
  { key: 'resolved',    label: 'Resolved',      icon: CheckCircle2 },
]

function WorkflowTracker({ complaint }) {
  const { status, assigned_agent, escalation_history = [], category, priority } = complaint

  // Determine which steps are done
  const isDone = (key) => {
    if (key === 'submitted')   return true
    if (key === 'classified')  return !!category
    if (key === 'assigned')    return !!assigned_agent
    if (key === 'in-progress') return status === 'in-progress' || status === 'resolved'
    if (key === 'escalated')   return escalation_history.length > 0
    if (key === 'resolved')    return status === 'resolved'
    return false
  }

  const isCurrent = (key) => {
    if (key === 'in-progress') return status === 'in-progress'
    if (key === 'assigned')    return status === 'open' && !!assigned_agent
    if (key === 'escalated')   return escalation_history.length > 0 && status !== 'resolved'
    return false
  }

  // Filter out optional steps that haven't happened
  const steps = WORKFLOW_STEPS.filter(s => !s.optional || isDone(s.key))

  return (
    <div className="rounded-2xl p-5 mb-6" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
      <div className="text-xs font-medium mb-4" style={{ color: 'var(--text-muted)' }}>Complaint Journey</div>
      <div className="flex items-center gap-0">
        {steps.map((step, i) => {
          const done = isDone(step.key)
          const current = isCurrent(step.key)
          const Icon = step.icon
          const isLast = i === steps.length - 1

          return (
            <div key={step.key} className="flex items-center flex-1 min-w-0">
              {/* Step node */}
              <div className="flex flex-col items-center shrink-0">
                <motion.div
                  initial={{ scale: 0.8 }} animate={{ scale: 1 }}
                  className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all ${
                    done
                      ? 'bg-violet-600 border-violet-600 text-white'
                      : current
                        ? 'bg-violet-50 border-violet-400 text-violet-600'
                        : 'border-slate-200 text-slate-300'
                  }`}
                  style={!done && !current ? { background: 'var(--bg-elevated)' } : {}}
                >
                  {done && !current
                    ? <CheckCircle2 size={14} />
                    : <Icon size={13} className={current ? 'animate-pulse' : ''} />
                  }
                </motion.div>
                <span className={`text-[9px] mt-1.5 text-center leading-tight max-w-[56px] ${
                  done ? 'text-violet-600 font-medium' : current ? 'text-violet-500' : ''
                }`} style={!done && !current ? { color: 'var(--text-muted)' } : {}}>
                  {step.label}
                </span>
              </div>

              {/* Connector line */}
              {!isLast && (
                <div className="flex-1 h-0.5 mx-1 mb-5 rounded-full transition-all"
                  style={{ background: done ? '#7c3aed' : 'var(--border)' }} />
              )}
            </div>
          )
        })}
      </div>
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
  const [deleting, setDeleting] = useState(false)
  const [bulletPoints, setBulletPoints] = useState([])
  const [loadingBullets, setLoadingBullets] = useState(false)
  const [availableAgents, setAvailableAgents] = useState([])
  const [showEscalateMenu, setShowEscalateMenu] = useState(false)
  const [escalatingTo, setEscalatingTo] = useState(null)
  const [escalateReason, setEscalateReason] = useState('')

  const getSuggestion = async () => {
    setSuggesting(true)
    try {
      const { data } = await api.post(`/complaints/${id}/suggest-reply`)
      setSuggestion(data.suggestion)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'AI service unavailable — check GROQ_API_KEY')
    } finally { setSuggesting(false) }
  }

  useEffect(() => {
    api.get(`/complaints/${id}`)
      .then(({ data }) => {
        setComplaint(data)
        // Auto-generate AI suggestion for agents
        if (user?.role === 'admin' || user?.role === 'agent') {
          getSuggestion()
        }
      })
      .catch(() => toast.error('Failed to load complaint'))
      .finally(() => setLoading(false))
  }, [id])

  const updateStatus = async (status) => {
    setUpdatingStatus(true)
    try {
      const { data } = await api.patch(`/complaints/${id}`, { status })
      setComplaint(data)
      toast.success('Status updated')
      if (status === 'resolved') {
        addNotification({
          type: 'resolved',
          message: 'Your complaint has been resolved',
          detail: data.title,
          forRoles: ['user', 'admin'],
        })
      }
    } catch { toast.error('Update failed') }
    finally { setUpdatingStatus(false) }
  }

  const deleteComplaint = async () => {
    if (!window.confirm('Delete this complaint? This cannot be undone.')) return
    setDeleting(true)
    try {
      await api.delete(`/complaints/${id}`)
      toast.success('Complaint deleted')
      navigate(-1)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Delete failed')
    } finally { setDeleting(false) }
  }

  const getBulletSummary = async () => {
    setLoadingBullets(true)
    try {
      const { data } = await api.get(`/complaints/${id}/bullet-summary`)
      setBulletPoints(data.points || [])
    } catch { toast.error('Failed to generate summary') }
    finally { setLoadingBullets(false) }
  }

  const loadAgents = async () => {
    try {
      const { data } = await api.get(`/complaints/${id}/available-agents`)
      setAvailableAgents(data)
    } catch { /* silent */ }
  }

  const escalateToAgent = async (agentId, agentName) => {
    if (!escalateReason.trim()) {
      toast.error('Please provide a reason for escalation')
      return
    }
    setEscalatingTo(agentId)
    setShowEscalateMenu(false)
    try {
      const { data } = await api.post(`/complaints/${id}/escalate-to`, {
        target_agent_id: agentId,
        reason: escalateReason.trim(),
      })
      setComplaint(data)
      setEscalateReason('')
      toast.success(`Escalated to ${agentName}`)
      addNotification({
        type: 'escalation',
        message: `Complaint escalated to ${agentName}`,
        detail: complaint?.title,
        forRoles: ['user', 'admin'],
      })
    } catch (err) { toast.error(err.response?.data?.detail || 'Escalation failed') }
    finally { setEscalatingTo(null) }
  }

  const escalate = async () => {    setEscalating(true)
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
    assigned_agent, created_at, updated_at
  } = complaint

  const ChannelIcon = channelIcons[channel] || Globe

  const canEdit = user?.role === 'admin' || user?.role === 'agent'
  const canDelete = user?.role === 'admin' || user?.role === 'user'

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <button onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-100 mb-6 transition-colors">
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
          <span className={`badge border ${
            priority === 'high' ? 'text-red-600 bg-red-50 border-red-200' :
            priority === 'medium' ? 'text-yellow-600 bg-yellow-50 border-yellow-200' :
            'text-emerald-600 bg-emerald-50 border-emerald-200'
          }`}>{priority} priority</span>
          <span className={`badge border ${
            sentiment === 'negative' ? 'text-red-600 bg-red-50 border-red-200' :
            sentiment === 'positive' ? 'text-emerald-600 bg-emerald-50 border-emerald-200' :
            'text-slate-500 bg-slate-50 border-slate-200'
          }`}>{sentiment}</span>
          <span className="badge border" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)', background: 'var(--bg-elevated)' }}>{category}</span>
          <span className="badge border flex items-center gap-1" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)', background: 'var(--bg-elevated)' }}>
            <ChannelIcon size={11} /> {channel}
          </span>
          {assigned_agent && (
            <span className="badge border border-violet-300 text-violet-600 bg-violet-50 flex items-center gap-1">
              <User size={11} /> {assigned_agent}
            </span>
          )}
        </div>

        {/* Workflow progress tracker */}
        <WorkflowTracker complaint={complaint} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Left column */}
          <div className="lg:col-span-2 space-y-4">
            {/* Description */}
            <div className="rounded-2xl p-5" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
              <div className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>Description</div>
              <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--text-secondary)' }}>{description}</p>
            </div>

            {/* AI Summary */}
            {summary && (
              <div className="rounded-2xl p-5" style={{ background: 'rgba(124,58,237,0.05)', border: '1px solid rgba(124,58,237,0.15)' }}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-1.5 text-xs text-violet-600">
                    <Sparkles size={12} /> AI Summary
                  </div>
                  <button onClick={getBulletSummary} disabled={loadingBullets}
                    className="flex items-center gap-1 text-[10px] text-violet-600 hover:text-violet-700 transition-colors">
                    {loadingBullets ? <Loader2 size={10} className="animate-spin" /> : <List size={10} />}
                    Key points
                  </button>
                </div>
                <p className="text-sm leading-relaxed mb-3" style={{ color: 'var(--text-secondary)' }}>{summary}</p>
                {bulletPoints.length > 0 && (
                  <ul className="space-y-1.5 pt-3" style={{ borderTop: '1px solid rgba(124,58,237,0.15)' }}>
                    {bulletPoints.map((pt, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                        <span className="w-1.5 h-1.5 rounded-full bg-violet-500 mt-1.5 shrink-0" />
                        {pt}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {/* Escalation history */}
            {escalation_history.length > 0 && (
              <div className="rounded-2xl p-5" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
                <div className="flex items-center gap-1.5 text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
                  <GitBranch size={12} /> Escalation History
                </div>
                <div className="space-y-4">
                  {escalation_history.map((e, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-violet-500 mt-1.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm" style={{ color: 'var(--text-primary)' }}>
                          Escalated to <span className="text-violet-600 font-medium">{e.to}</span> agent
                          {e.escalated_by_name && <span style={{ color: 'var(--text-muted)' }}> by {e.escalated_by_name}</span>}
                        </div>
                        <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{e.reason}</div>
                        <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }} title={formatDate(e.at)}>{timeAgo(e.at)}</div>
                        {/* Chat summary for the new agent */}
                        {e.chat_summary && (
                          <div className="mt-2 p-2.5 rounded-xl text-xs italic leading-relaxed"
                            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                            <span className="flex items-center gap-1 text-violet-600 not-italic font-medium mb-1">
                              <Sparkles size={10} /> Previous session summary
                            </span>
                            {e.chat_summary}
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
              <div className="rounded-2xl p-5" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
                <div className="flex items-center justify-between mb-4">
                  <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Agent Assist</div>
                  {suggesting && (
                    <div className="flex items-center gap-1.5 text-xs text-violet-600">
                      <Loader2 size={12} className="animate-spin" />
                      Generating...
                    </div>
                  )}
                </div>
                {suggesting ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 size={20} className="animate-spin text-violet-600" />
                  </div>
                ) : suggestion ? (
                  <div className="relative">
                    <p className="text-sm leading-relaxed rounded-xl p-4 pr-10" style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>{suggestion}</p>
                    <button
                      onClick={() => { navigator.clipboard.writeText(suggestion); toast.success('Copied') }}
                      className="absolute top-3 right-3 transition-colors"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      <Copy size={14} />
                    </button>
                  </div>
                ) : (
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>AI-generated reply will appear here automatically.</p>
                )}
              </div>
            )}

            {/* Chat */}
            <ChatBox complaintId={id} assignedAgent={assigned_agent} />
          </div>

          {/* Right column */}
          <div className="space-y-4">
            {/* Status control */}
            {canEdit && (
              <div className="rounded-2xl p-5" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
                <div className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>Update Status</div>
                <div className="space-y-1.5">
                  {STATUS_OPTIONS.map(s => (
                    <button key={s} disabled={updatingStatus} onClick={() => updateStatus(s)}
                      className={`w-full px-3 py-2 rounded-xl text-xs capitalize text-left transition-colors border ${
                        status === s ? 'bg-violet-600/15 text-violet-600 border-violet-500/30' : 'border-transparent'
                      }`}
                      style={status !== s ? { color: 'var(--text-muted)' } : {}}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Escalate — agent picker with reason */}
            {canEdit && status !== 'resolved' && (
              <div className="rounded-2xl p-5" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
                <div className="text-xs font-medium mb-3" style={{ color: 'var(--text-primary)' }}>Escalate Complaint</div>

                {/* Reason input */}
                <div className="mb-3">
                  <label className="text-xs mb-1.5 block" style={{ color: 'var(--text-muted)' }}>
                    Reason for escalation <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows={2}
                    value={escalateReason}
                    onChange={e => setEscalateReason(e.target.value)}
                    placeholder="e.g. Issue requires billing specialist, customer unresponsive..."
                    className="input-field resize-none text-xs"
                  />
                </div>

                <div className="relative">
                  <button
                    onClick={() => { setShowEscalateMenu(v => !v); if (!showEscalateMenu) loadAgents() }}
                    className="btn-ghost w-full flex items-center justify-center gap-2 text-xs"
                  >
                    <GitBranch size={12} />
                    Choose Agent
                    <ChevronDown size={12} className={`ml-auto transition-transform ${showEscalateMenu ? 'rotate-180' : ''}`} />
                  </button>

                  {showEscalateMenu && (
                    <div className="absolute top-full left-0 right-0 mt-1 rounded-xl shadow-lg z-20 overflow-hidden"
                      style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
                      {availableAgents.length === 0 ? (
                        <div className="p-3 text-xs text-center" style={{ color: 'var(--text-muted)' }}>
                          No other agents available
                        </div>
                      ) : availableAgents.map(a => (
                        <button key={a.id}
                          onClick={() => escalateToAgent(a.id, a.name)}
                          disabled={!!escalatingTo}
                          className="w-full flex items-center gap-3 px-3 py-2.5 text-left text-xs transition-colors"
                          style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-primary)' }}
                          onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-elevated)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                          <div className="w-7 h-7 rounded-full bg-violet-100 flex items-center justify-center text-violet-700 font-semibold text-xs shrink-0">
                            {a.name[0]?.toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">{a.name}</div>
                            <div className="capitalize text-[10px]" style={{ color: 'var(--text-muted)' }}>
                              {a.channel} · {a.specialization}
                            </div>
                          </div>
                          {escalatingTo === a.id && <Loader2 size={12} className="animate-spin text-violet-600 shrink-0" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* SLA info */}
            <div className="rounded-2xl p-5" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
              <div className="text-xs mb-3 flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}><Clock size={12} /> SLA</div>
              <SLABadge deadline={sla_deadline} status={status} />
              {sla_deadline && (
                <div className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
                  Deadline: {formatDate(sla_deadline)}
                </div>
              )}
            </div>

            {/* Timestamps */}
            <div className="rounded-2xl p-5 space-y-2" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
              <div className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>Timeline</div>
              {created_at && (
                <div className="flex justify-between text-xs">
                  <span style={{ color: 'var(--text-muted)' }}>Submitted</span>
                  <span style={{ color: 'var(--text-secondary)' }} title={formatDate(created_at)}>{timeAgo(created_at)}</span>
                </div>
              )}
              {updated_at && (
                <div className="flex justify-between text-xs">
                  <span style={{ color: 'var(--text-muted)' }}>Last updated</span>
                  <span style={{ color: 'var(--text-secondary)' }} title={formatDate(updated_at)}>{timeAgo(updated_at)}</span>
                </div>
              )}
              {status === 'resolved' && updated_at && created_at && (
                <div className="flex justify-between text-xs">
                  <span style={{ color: 'var(--text-muted)' }}>Resolution time</span>
                  <span className="text-emerald-600">
                    {(() => {
                      const ms = new Date(updated_at) - new Date(created_at)
                      const h = Math.floor(ms / 3600000)
                      const m = Math.floor((ms % 3600000) / 60000)
                      return h > 0 ? `${h}h ${m}m` : `${m}m`
                    })()}
                  </span>
                </div>
              )}
            </div>

            {/* Delete */}
            {canDelete && (
              <div className="rounded-2xl p-5" style={{ background: 'var(--bg-surface)', border: '1px solid rgba(239,68,68,0.2)' }}>
                <div className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>Danger Zone</div>
                <button onClick={deleteComplaint} disabled={deleting}
                  className="w-full flex items-center justify-center gap-2 text-xs py-2 px-3 rounded-xl border border-red-400/30 text-red-500 hover:bg-red-50 transition-colors">
                  {deleting ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                  Delete Complaint
                </button>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* AI Assistant floating chatbot — only for complaint owners */}
      <AIAssistant
        complaintId={id}
        complaintTitle={title}
        complaintCategory={category}
      />
    </div>
  )
}
