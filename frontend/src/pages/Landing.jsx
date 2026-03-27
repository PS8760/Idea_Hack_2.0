import { Link } from 'react-router-dom'
import { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import axios from 'axios'
import {
  Zap, Shield, BarChart3, MessageSquare, GitMerge, Clock,
  ChevronRight, CheckCircle, Star, ArrowRight, Sparkles,
  Loader2, AlertTriangle, Target, Brain, Activity, Mail,
  Phone, Globe, MessageCircle, User, CheckCircle2, Bell,
  Search, ShieldCheck
} from 'lucide-react'

// ── Demo data ─────────────────────────────────────────────────────────────────
const DEMO_EXAMPLES = [
  "My payment of ₹2500 was deducted twice but my order was never confirmed. This is the third time this has happened.",
  "The app keeps crashing every time I try to login. I have tried reinstalling but the issue persists.",
  "My order was supposed to be delivered 5 days ago but tracking shows it is still in transit.",
  "I was charged for a premium subscription I never signed up for. Please refund immediately.",
]
const CHANNELS_DEMO = [
  { value: 'web',      label: 'Web',       icon: Globe,         color: 'text-slate-400'   },
  { value: 'email',    label: 'Email',     icon: Mail,          color: 'text-blue-400'    },
  { value: 'whatsapp', label: 'WhatsApp',  icon: MessageSquare, color: 'text-emerald-400' },
  { value: 'phone',    label: 'Phone',     icon: Phone,         color: 'text-yellow-400'  },
  { value: 'chat',     label: 'Live Chat', icon: MessageCircle, color: 'text-violet-400'  },
]
const SENTIMENT_CFG = {
  negative: { color: 'text-red-400',     bg: 'bg-red-400/10',     border: 'border-red-400/20',     label: 'Negative' },
  positive: { color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/20', label: 'Positive' },
  neutral:  { color: 'text-slate-400',   bg: 'bg-slate-400/10',   border: 'border-slate-400/20',   label: 'Neutral'  },
}
const PRIORITY_CFG = {
  high:   { color: 'text-red-400',     bg: 'bg-red-400/10',     bar: 'bg-red-500',     sla: '4 hours'  },
  medium: { color: 'text-yellow-400',  bg: 'bg-yellow-400/10',  bar: 'bg-yellow-500',  sla: '24 hours' },
  low:    { color: 'text-emerald-400', bg: 'bg-emerald-400/10', bar: 'bg-emerald-500', sla: '72 hours' },
}
const CATEGORY_SPECIALIST = {
  Billing: 'Billing Specialist', Technical: 'Technical Specialist',
  Delivery: 'Delivery Specialist', Product: 'Product Specialist',
  Service: 'Service Specialist', Account: 'Account Specialist',
  Refund: 'Billing Specialist', Other: 'General Agent',
}

// ── Journey builder ───────────────────────────────────────────────────────────
function buildJourney(result, channel) {
  const now = new Date()
  const pc = PRIORITY_CFG[result.priority] || PRIORITY_CFG.medium
  const specialist = CATEGORY_SPECIALIST[result.category] || 'General Agent'
  const channelLabel = CHANNELS_DEMO.find(c => c.value === channel)?.label || 'Web'
  const slaTime = new Date(now.getTime() + (result.priority === 'high' ? 4 : result.priority === 'medium' ? 24 : 72) * 3600000)
  return [
    { icon: CheckCircle2, color: 'text-violet-400', bg: 'bg-violet-400/10', border: 'border-violet-400/20',
      title: 'Complaint Received', tag: 'Instant', tagColor: 'text-violet-400 bg-violet-400/10',
      desc: `Submitted via ${channelLabel} at ${now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}` },
    { icon: Brain, color: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-400/20',
      title: 'AI Analysis Complete', tag: '< 2 seconds', tagColor: 'text-blue-400 bg-blue-400/10',
      desc: `Classified as ${result.category} · ${result.sentiment} sentiment · Severity ${result.severity_score}/10`,
      detail: result.summary },
    { icon: Search, color: 'text-orange-400', bg: 'bg-orange-400/10', border: 'border-orange-400/20',
      title: 'Duplicate Check', tag: result.is_duplicate ? 'Duplicate flagged' : 'Unique',
      tagColor: result.is_duplicate ? 'text-orange-400 bg-orange-400/10' : 'text-emerald-400 bg-emerald-400/10',
      desc: result.is_duplicate ? 'Similar complaint detected — linked to existing ticket' : 'No duplicates found — unique complaint registered' },
    { icon: User, color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/20',
      title: 'Agent Assigned', tag: 'Auto-assigned', tagColor: 'text-emerald-400 bg-emerald-400/10',
      desc: `Routed to ${specialist} on ${channelLabel} channel using ML-powered smart routing` },
    { icon: Clock, color: 'text-yellow-400', bg: 'bg-yellow-400/10', border: 'border-yellow-400/20',
      title: 'SLA Deadline Set', tag: `${pc.sla} SLA`, tagColor: `${pc.color} ${pc.bg}`,
      desc: `${result.priority.charAt(0).toUpperCase() + result.priority.slice(1)} priority → must resolve by ${slaTime.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}` },
    { icon: Zap, color: 'text-violet-400', bg: 'bg-violet-400/10', border: 'border-violet-400/20',
      title: 'Resolution Plan Generated', tag: 'AI suggested', tagColor: 'text-violet-400 bg-violet-400/10',
      desc: result.suggested_actions?.[0] || 'Agent will review and respond with resolution steps',
      detail: result.suggested_actions?.slice(1, 3).join(' · ') },
    { icon: Bell, color: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-400/20',
      title: 'Customer Notified', tag: 'Email sent', tagColor: 'text-blue-400 bg-blue-400/10',
      desc: 'Confirmation email sent with reference ID, assigned agent name, and SLA deadline' },
    { icon: ShieldCheck, color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/20',
      title: 'Resolution & Closure', tag: 'End state', tagColor: 'text-emerald-400 bg-emerald-400/10',
      desc: 'Agent resolves → customer notified → complaint closed → regulatory log updated automatically' },
  ]
}

function JourneyTimeline({ result, channel }) {
  const [visibleSteps, setVisibleSteps] = useState(0)
  const steps = buildJourney(result, channel)
  useEffect(() => {
    setVisibleSteps(0)
    let i = 0
    const interval = setInterval(() => {
      i++; setVisibleSteps(i)
      if (i >= steps.length) clearInterval(interval)
    }, 380)
    return () => clearInterval(interval)
  }, [result, channel])

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mt-10">
      <div className="flex items-center gap-3 mb-8">
        <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
        <div className="flex items-center gap-2 px-4 py-2 rounded-full" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
          <Activity size={12} className="text-violet-400" />
          <span className="text-xs font-semibold text-violet-400">Resolution Journey</span>
          <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>— live simulation</span>
        </div>
        <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
      </div>
      <div className="max-w-2xl mx-auto relative">
        <div className="absolute left-5 top-0 bottom-0 w-px" style={{ background: 'var(--border)' }} />
        <div className="space-y-0">
          {steps.map((step, i) => {
            const Icon = step.icon
            if (i >= visibleSteps) return null
            return (
              <motion.div key={i} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }} className="flex items-start gap-4 pb-5 relative">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 z-10 border ${step.bg} ${step.border}`}>
                  <Icon size={16} className={step.color} />
                </div>
                <div className="flex-1 min-w-0 pt-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{step.title}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${step.tagColor}`}>{step.tag}</span>
                  </div>
                  <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>{step.desc}</p>
                  {step.detail && <p className="text-[11px] mt-1 italic" style={{ color: 'var(--text-muted)' }}>{step.detail}</p>}
                </div>
              </motion.div>
            )
          })}
        </div>
        {visibleSteps >= steps.length && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="ml-14 rounded-xl px-4 py-3 bg-emerald-400/5 border border-emerald-400/20">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={14} className="text-emerald-400" />
              <span className="text-sm font-semibold text-emerald-400">Complete resolution path mapped</span>
            </div>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              This entire journey happens automatically — from submission to resolution, powered by AI at every step.
            </p>
          </motion.div>
        )}
      </div>
    </motion.div>
  )
}

// ── Live Demo Widget ──────────────────────────────────────────────────────────
function LiveDemoWidget() {
  const [text, setText] = useState('')
  const [channel, setChannel] = useState('web')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [charCount, setCharCount] = useState(0)
  const [showJourney, setShowJourney] = useState(false)
  const debounceRef = useRef(null)
  const isMounted = useRef(true)

  useEffect(() => { isMounted.current = true; return () => { isMounted.current = false } }, [])

  const analyze = useCallback(async (input) => {
    if (input.trim().length < 15) { setResult(null); setShowJourney(false); return }
    setLoading(true); setShowJourney(false)
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000'
      const { data } = await axios.post(`${apiUrl}/complaints/demo/analyze`, { text: input })
      if (isMounted.current) {
        setResult(data)
        setTimeout(() => { if (isMounted.current) setShowJourney(true) }, 400)
      }
    } catch { }
    finally { if (isMounted.current) setLoading(false) }
  }, [])

  const handleChange = (e) => {
    const val = e.target.value; setText(val); setCharCount(val.length)
    clearTimeout(debounceRef.current)
    if (val.trim().length < 15) { setResult(null); setShowJourney(false); return }
    debounceRef.current = setTimeout(() => analyze(val), 800)
  }

  const tryExample = (example) => {
    setText(example); setCharCount(example.length)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => analyze(example), 100)
  }

  // When channel changes and result exists — re-trigger journey with new channel
  const handleChannelChange = (val) => {
    setChannel(val)
    if (result) {
      setShowJourney(false)
      setTimeout(() => { if (isMounted.current) setShowJourney(true) }, 100)
    }
  }

  const reset = () => {
    clearTimeout(debounceRef.current)
    setText(''); setCharCount(0); setResult(null); setShowJourney(false); setChannel('web')
  }

  const sc = SENTIMENT_CFG[result?.sentiment] || SENTIMENT_CFG.neutral
  const pc = PRIORITY_CFG[result?.priority] || PRIORITY_CFG.medium
  const severityPct = result ? Math.min(100, (result.severity_score / 10) * 100) : 0
  const severityColor = result?.severity_score >= 8 ? 'bg-red-500' : result?.severity_score >= 5 ? 'bg-yellow-500' : 'bg-emerald-500'

  return (
    <div className="max-w-5xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input side */}
        <div>
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Type any complaint</label>
              <span className="text-xs">
                {charCount >= 15
                  ? <span className="flex items-center gap-1 text-emerald-400"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />AI active</span>
                  : <span style={{ color: 'var(--text-muted)' }}>{Math.max(0, 15 - charCount)} more chars</span>}
              </span>
            </div>
            <textarea value={text} onChange={handleChange} rows={5}
              placeholder="e.g. My payment was deducted twice but order was not placed..."
              className="input-field resize-none text-sm" />
          </div>
          <div className="mb-4">
            <label className="text-xs font-medium block mb-2" style={{ color: 'var(--text-muted)' }}>Preferred channel</label>
            <div className="grid grid-cols-5 gap-1.5">
              {CHANNELS_DEMO.map(({ value, label, icon: Icon, color }) => (
                <button key={value} type="button" onClick={() => handleChannelChange(value)}
                  className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border text-center transition-all text-xs ${channel === value ? 'border-violet-500/60 bg-violet-500/10 text-violet-300' : ''}`}
                  style={channel !== value ? { borderColor: 'var(--border)', background: 'var(--bg-elevated)', color: 'var(--text-muted)' } : {}}>
                  <Icon size={14} className={channel === value ? 'text-violet-400' : color} />
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>Try an example:</p>
              <div className="flex flex-wrap gap-2">
                {['Billing issue', 'Technical bug', 'Delivery delay', 'Refund request'].map((label, i) => (
                  <button key={label} onClick={() => tryExample(DEMO_EXAMPLES[i])}
                    className="text-xs px-3 py-1.5 rounded-xl transition-all hover:bg-violet-500/20 hover:text-violet-300"
                    style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
            {(result || text) && (
              <button onClick={reset}
                className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl transition-all hover:bg-red-500/10 hover:text-red-400 shrink-0 ml-3"
                style={{ border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                ↺ Reset
              </button>
            )}
          </div>
        </div>

        {/* Results side */}
        <div>
          <AnimatePresence mode="wait">
            {!result && !loading ? (
              <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="h-full flex flex-col items-center justify-center rounded-2xl p-8 text-center"
                style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', minHeight: '280px' }}>
                <div className="w-12 h-12 rounded-2xl bg-violet-500/10 flex items-center justify-center mb-4">
                  <Brain size={22} className="text-violet-400 opacity-60" />
                </div>
                <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>AI Intelligence Ready</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Start typing to see real-time analysis</p>
                {charCount > 0 && charCount < 15 && (
                  <div className="mt-4 w-full max-w-32">
                    <div className="h-1 rounded-full overflow-hidden" style={{ background: 'var(--bg-elevated)' }}>
                      <motion.div className="h-full bg-violet-500 rounded-full" animate={{ width: `${(charCount / 15) * 100}%` }} />
                    </div>
                  </div>
                )}
              </motion.div>
            ) : loading ? (
              <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="rounded-2xl p-6 space-y-4"
                style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', minHeight: '280px' }}>
                <div className="flex items-center gap-2 mb-2">
                  <Loader2 size={14} className="text-violet-400 animate-spin" />
                  <span className="text-xs text-violet-400 font-medium">Analyzing with Groq LLaMA 3.3...</span>
                </div>
                {[85, 65, 75, 55, 70].map((w, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded animate-pulse shrink-0" style={{ background: 'var(--bg-elevated)' }} />
                    <div className="h-3 rounded-full animate-pulse" style={{ background: 'var(--bg-elevated)', width: `${w}%` }} />
                  </div>
                ))}
              </motion.div>
            ) : (
              <motion.div key="result" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl p-5 space-y-4"
                style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
                <div className="flex items-center gap-2">
                  <Sparkles size={13} className="text-violet-400" />
                  <span className="text-xs font-semibold text-violet-400 uppercase tracking-widest">AI Analysis</span>
                  <span className="text-[10px] ml-auto px-2 py-0.5 rounded-full bg-emerald-400/10 text-emerald-400 border border-emerald-400/20">✓ Complete</span>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: 'var(--text-muted)' }}>Severity Score</span>
                    <span className={`text-sm font-bold ${result.severity_score >= 8 ? 'text-red-400' : result.severity_score >= 5 ? 'text-yellow-400' : 'text-emerald-400'}`}>
                      {result.severity_score}<span className="text-xs font-normal opacity-50">/10</span>
                    </span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-elevated)' }}>
                    <motion.div className={`h-full rounded-full ${severityColor}`}
                      initial={{ width: 0 }} animate={{ width: `${severityPct}%` }} transition={{ duration: 0.7, ease: 'easeOut' }} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className={`rounded-xl p-3 border ${sc.bg} ${sc.border}`}>
                    <div className="text-[9px] uppercase tracking-wider opacity-60 mb-1" style={{ color: 'var(--text-muted)' }}>Sentiment</div>
                    <div className={`text-sm font-bold ${sc.color}`}>{sc.label}</div>
                  </div>
                  <div className={`rounded-xl p-3 ${pc.bg}`} style={{ border: '1px solid var(--border)' }}>
                    <div className="text-[9px] uppercase tracking-wider opacity-60 mb-1" style={{ color: 'var(--text-muted)' }}>Priority</div>
                    <div className={`text-sm font-bold capitalize ${pc.color}`}>{result.priority}</div>
                  </div>
                  <div className="rounded-xl p-3" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                    <div className="text-[9px] uppercase tracking-wider opacity-60 mb-1" style={{ color: 'var(--text-muted)' }}>Category</div>
                    <div className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{result.category}</div>
                  </div>
                  <div className="rounded-xl p-3" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                    <div className="text-[9px] uppercase tracking-wider opacity-60 mb-1" style={{ color: 'var(--text-muted)' }}>Product</div>
                    <div className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{result.product || '—'}</div>
                  </div>
                </div>
                {result.key_issues?.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1.5 mb-2">
                      <Target size={10} className="text-blue-400" />
                      <span className="text-[10px] uppercase tracking-widest font-semibold text-blue-400">Key Issues</span>
                    </div>
                    <div className="space-y-1">
                      {result.key_issues.slice(0, 3).map((issue, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs rounded-lg px-2.5 py-1.5"
                          style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)' }}>
                          <div className="w-1 h-1 rounded-full bg-blue-400 shrink-0" />{issue}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {result.urgency_signals?.length > 0 && (
                  <div className="flex items-start gap-2 rounded-xl px-3 py-2.5 bg-orange-400/5 border border-orange-400/15">
                    <AlertTriangle size={11} className="text-orange-400 mt-0.5 shrink-0" />
                    <div className="space-y-0.5">
                      {result.urgency_signals.slice(0, 2).map((sig, i) => (
                        <p key={i} className="text-xs text-orange-300">{sig}</p>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      {showJourney && result && <JourneyTimeline result={result} channel={channel} />}
    </div>
  )
}

// ── Static data ───────────────────────────────────────────────────────────────
const features = [
  { icon: Zap, title: 'AI Classification', desc: 'Groq LLM instantly classifies complaints by sentiment, priority, and category.', color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
  { icon: Shield, title: 'Duplicate Detection', desc: 'Semantic similarity catches duplicate complaints before they pile up.', color: 'text-violet-400', bg: 'bg-violet-400/10' },
  { icon: Clock, title: 'SLA Tracking', desc: 'Automatic deadlines with escalation alerts so nothing slips through the cracks.', color: 'text-blue-400', bg: 'bg-blue-400/10' },
  { icon: MessageSquare, title: 'Agent Assist', desc: 'AI-generated reply suggestions with full complaint history for every agent.', color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
  { icon: GitMerge, title: 'Multi-channel', desc: 'Complaints from WhatsApp, email, calls, and web — all in one unified dashboard.', color: 'text-pink-400', bg: 'bg-pink-400/10' },
  { icon: BarChart3, title: 'Live Insights', desc: 'Trend charts, sentiment breakdowns, and SLA breach reports in real time.', color: 'text-orange-400', bg: 'bg-orange-400/10' },
]
const roles = [
  { role: 'User', color: 'border-blue-500/30 bg-blue-500/5', accent: 'text-blue-400', dot: 'bg-blue-400',
    points: ['Submit complaints via any channel', 'Track status in real time', 'Get notified on resolution'] },
  { role: 'Agent', color: 'border-violet-500/30 bg-violet-500/5', accent: 'text-violet-400', dot: 'bg-violet-400',
    points: ['View assigned complaint queue', 'AI-suggested replies with history', 'Escalate or resolve tickets'] },
  { role: 'Admin', color: 'border-emerald-500/30 bg-emerald-500/5', accent: 'text-emerald-400', dot: 'bg-emerald-400',
    points: ['Full dashboard & analytics', 'Manage agents and assignments', 'Configure SLA rules & escalations'] },
]
const stats = [
  { value: '3×', label: 'Faster resolution' },
  { value: '94%', label: 'SLA compliance' },
  { value: '60%', label: 'Fewer duplicates' },
  { value: '< 2s', label: 'AI response time' },
]
const fade = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }

// ── Main Landing Page ─────────────────────────────────────────────────────────
export default function Landing() {
  return (
    <div className="min-h-screen page-bg">
      <Navbar />

      {/* Hero — compact, gets out of the way fast */}
      <section className="relative flex items-center justify-center overflow-hidden grid-bg pt-24 pb-16">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-blue-600/8 rounded-full blur-3xl pointer-events-none" />
        <div className="relative max-w-4xl mx-auto px-6 text-center">
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 bg-violet-500/10 border border-violet-500/20 text-violet-300 text-xs px-4 py-2 rounded-full mb-6">
            <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-pulse" />
            Powered by Groq LLM + ML Routing Model
          </motion.div>
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }}
            className="text-5xl md:text-6xl font-bold tracking-tight leading-[1.1] mb-5">
            From complaint to resolution<br /><span className="gradient-text">AI handles the rest</span>
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }}
            className="text-base max-w-xl mx-auto mb-8 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            SmartResolve AI classifies, routes, tracks, and resolves customer complaints — automatically, across every channel.
          </motion.p>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/register" className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-7 py-3.5 rounded-xl font-medium text-sm transition-all hover:shadow-lg hover:shadow-violet-500/25 hover:-translate-y-0.5">
              Start for free <ArrowRight size={16} />
            </Link>
            <Link to="/contact" className="flex items-center gap-2 px-7 py-3.5 rounded-xl font-medium text-sm transition-all hover:-translate-y-0.5"
              style={{ color: 'var(--text-primary)', border: '1px solid var(--border)' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-elevated)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              Talk to us
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Live AI Demo — FIRST thing after hero */}
      <section className="py-16 px-6" style={{ background: 'var(--bg-elevated)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
        <div className="max-w-5xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="text-center mb-10">
            <div className="inline-flex items-center gap-2 bg-violet-500/10 border border-violet-500/20 text-violet-400 text-xs px-4 py-2 rounded-full mb-4">
              <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-pulse" />
              Live Demo — No login required
            </div>
            <h2 className="text-3xl font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
              Watch AI analyze & resolve a complaint in real time
            </h2>
            <p className="text-sm max-w-lg mx-auto" style={{ color: 'var(--text-secondary)' }}>
              Type any complaint, pick a channel, and see the full resolution journey — from AI classification to agent assignment to closure.
            </p>
          </motion.div>
          <LiveDemoWidget />
        </div>
      </section>

      {/* Stats — after demo, now they mean something */}
      <section className="py-14 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((s, i) => (
              <motion.div key={s.label} variants={fade} initial="hidden" whileInView="show"
                viewport={{ once: true }} transition={{ delay: i * 0.07 }} className="text-center">
                <div className="text-4xl font-bold gradient-text mb-1">{s.value}</div>
                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{s.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-6" style={{ background: 'var(--bg-elevated)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
        <div className="max-w-6xl mx-auto">
          <motion.div variants={fade} initial="hidden" whileInView="show" viewport={{ once: true }} className="text-center mb-12">
            <div className="text-xs text-violet-400 font-semibold uppercase tracking-widest mb-3">Features</div>
            <h2 className="text-4xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Everything you need to resolve faster</h2>
            <p className="max-w-xl mx-auto text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              From intake to resolution, every step is powered by AI — so your team spends time solving, not sorting.
            </p>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f, i) => (
              <motion.div key={f.title} variants={fade} initial="hidden" whileInView="show"
                viewport={{ once: true }} transition={{ delay: i * 0.07 }}
                className="card-hover rounded-2xl p-6" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
                <div className={`w-10 h-10 rounded-xl ${f.bg} flex items-center justify-center mb-4`}>
                  <f.icon size={20} className={f.color} />
                </div>
                <h3 className="font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>{f.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Roles */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <motion.div variants={fade} initial="hidden" whileInView="show" viewport={{ once: true }} className="text-center mb-12">
            <div className="text-xs text-violet-400 font-semibold uppercase tracking-widest mb-3">Roles</div>
            <h2 className="text-4xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Built for every stakeholder</h2>
            <p className="text-sm max-w-lg mx-auto" style={{ color: 'var(--text-secondary)' }}>Three distinct portals, one unified platform.</p>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {roles.map((r, i) => (
              <motion.div key={r.role} variants={fade} initial="hidden" whileInView="show"
                viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                className={`rounded-2xl border p-6 ${r.color}`}>
                <div className={`text-sm font-semibold ${r.accent} mb-4 flex items-center gap-2`}>
                  <span className={`w-2 h-2 rounded-full ${r.dot}`} />{r.role}
                </div>
                <ul className="space-y-3">
                  {r.points.map(p => (
                    <li key={p} className="flex items-start gap-2.5 text-sm" style={{ color: 'var(--text-primary)' }}>
                      <CheckCircle size={14} className={`${r.accent} mt-0.5 shrink-0`} />{p}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6" style={{ background: 'var(--bg-elevated)', borderTop: '1px solid var(--border)' }}>
        <motion.div variants={fade} initial="hidden" whileInView="show" viewport={{ once: true }}
          className="max-w-3xl mx-auto text-center bg-gradient-to-br from-violet-600/10 to-blue-600/5 border border-violet-500/20 rounded-3xl p-14">
          <div className="flex items-center justify-center gap-1 mb-4">
            {[...Array(5)].map((_, i) => <Star key={i} size={14} className="text-yellow-400 fill-yellow-400" />)}
          </div>
          <h2 className="text-4xl font-bold mb-4">Ready to resolve smarter?</h2>
          <p className="text-sm mb-8 max-w-md mx-auto" style={{ color: 'var(--text-secondary)' }}>
            Join teams using SmartResolve AI to cut resolution time and keep customers happy.
          </p>
          <Link to="/register" className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-8 py-3.5 rounded-xl font-medium text-sm transition-all hover:shadow-lg hover:shadow-violet-500/25">
            Get started free <ChevronRight size={16} />
          </Link>
        </motion.div>
      </section>

      <Footer />
    </div>
  )
}
