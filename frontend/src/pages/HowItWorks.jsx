import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  MessageSquare, Sparkles, User, Brain, CheckCircle2,
  ChevronRight, ChevronLeft, Globe, Mail, Phone,
  AlertTriangle, Clock, GitBranch, BarChart2, Shield, ArrowRight
} from 'lucide-react'

const STEPS = [
  {
    id: 1, icon: MessageSquare, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', active: 'bg-blue-600',
    title: 'Submit Your Complaint',
    subtitle: 'Any channel, any time',
    desc: 'Submit via Web, WhatsApp, Email, Phone, or Live Chat. Describe your issue in detail — the more context, the better the AI can help.',
    tips: ['Be specific about the issue', 'Include order/transaction IDs if relevant', 'Mention what you already tried'],
    demo: { type: 'submit' },
    cta: { label: 'Submit a complaint', to: '/app/submit' },
  },
  {
    id: 2, icon: Sparkles, color: 'text-violet-600', bg: 'bg-violet-50', border: 'border-violet-200', active: 'bg-violet-600',
    title: 'AI Analyzes Instantly',
    subtitle: 'Groq LLM in < 2 seconds',
    desc: 'Our AI reads your complaint and automatically determines the category, priority level, sentiment, and generates a concise summary.',
    tips: ['No manual tagging needed', 'Duplicate complaints are detected', 'Priority set based on urgency'],
    demo: { type: 'analysis' },
  },
  {
    id: 3, icon: User, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', active: 'bg-emerald-600',
    title: 'Routed to the Right Agent',
    subtitle: 'Smart channel matching',
    desc: 'Based on your chosen channel and complaint category, the system assigns the most suitable available agent with the right specialization.',
    tips: ['Agents matched by channel & skill', 'SLA timer starts immediately', 'You get notified on assignment'],
    demo: { type: 'routing' },
  },
  {
    id: 4, icon: Brain, color: 'text-pink-600', bg: 'bg-pink-50', border: 'border-pink-200', active: 'bg-pink-600',
    title: 'Agent Gets AI Assistance',
    subtitle: 'Faster, better responses',
    desc: 'The assigned agent sees your full complaint history and gets an AI-generated reply suggestion. They can send it as-is or customize it.',
    tips: ['AI drafts contextual replies', 'Full escalation history visible', 'Chat directly with your agent'],
    demo: { type: 'agent' },
  },
  {
    id: 5, icon: GitBranch, color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200', active: 'bg-orange-600',
    title: 'Escalation if Needed',
    subtitle: 'Nothing gets dropped',
    desc: 'If unresolved within the SLA window, the complaint escalates to the next channel agent — with the full chat history and AI summary intact.',
    tips: ['You get an email notification', 'New agent sees full context', 'SLA resets for new agent'],
    demo: { type: 'escalation' },
  },
  {
    id: 6, icon: CheckCircle2, color: 'text-teal-600', bg: 'bg-teal-50', border: 'border-teal-200', active: 'bg-teal-600',
    title: 'Resolved & Closed',
    subtitle: 'Tracked end-to-end',
    desc: 'Once resolved, the complaint is closed with a full audit trail. Admins can view resolution time, SLA compliance, and generate reports.',
    tips: ['Resolution time is tracked', 'SLA compliance recorded', 'Admins can export reports'],
    demo: { type: 'resolved' },
    cta: { label: 'View my complaints', to: '/app/my-complaints' },
  },
]

function DemoPanel({ type }) {
  if (type === 'submit') return (
    <div className="space-y-3">
      <p className="text-xs font-medium mb-3" style={{ color: 'var(--text-muted)' }}>Choose your channel</p>
      <div className="grid grid-cols-5 gap-2">
        {[
          { icon: Globe, label: 'Web', active: true },
          { icon: Mail, label: 'Email' },
          { icon: MessageSquare, label: 'WhatsApp' },
          { icon: Phone, label: 'Phone' },
          { icon: MessageSquare, label: 'Chat' },
        ].map(({ icon: Icon, label, active }) => (
          <div key={label} className={`flex flex-col items-center gap-1 p-2 rounded-xl border text-center text-[10px] ${active ? 'border-violet-400 bg-violet-50 text-violet-700' : ''}`}
            style={!active ? { borderColor: 'var(--border)', color: 'var(--text-muted)', background: 'var(--bg-elevated)' } : {}}>
            <Icon size={14} />
            {label}
          </div>
        ))}
      </div>
      <div className="rounded-xl p-3 text-xs" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
        <div className="font-medium mb-1" style={{ color: 'var(--text-primary)' }}>Payment deducted but order not placed</div>
        <div style={{ color: 'var(--text-muted)' }}>I was charged ₹2,499 but the order never went through...</div>
      </div>
      <button className="text-xs flex items-center gap-1.5 text-violet-600 font-medium">
        <Sparkles size={11} /> Analyze with AI
      </button>
    </div>
  )

  if (type === 'analysis') return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-1.5 text-xs text-violet-600 font-medium mb-3">
        <Sparkles size={12} /> Analysis complete in 1.2s
      </div>
      {[
        { label: 'Category',  value: 'Billing',   color: 'bg-blue-100 text-blue-700' },
        { label: 'Priority',  value: 'High',      color: 'bg-red-100 text-red-700' },
        { label: 'Sentiment', value: 'Negative',  color: 'bg-orange-100 text-orange-700' },
        { label: 'Duplicate', value: 'No',        color: 'bg-emerald-100 text-emerald-700' },
        { label: 'Summary',   value: 'Customer charged ₹2,499 for a failed order.', color: 'bg-slate-100 text-slate-700' },
      ].map(item => (
        <div key={item.label} className="flex items-start gap-3">
          <span className="text-xs w-16 shrink-0 pt-0.5" style={{ color: 'var(--text-muted)' }}>{item.label}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${item.color}`}>{item.value}</span>
        </div>
      ))}
    </div>
  )

  if (type === 'routing') return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 p-3 rounded-xl border border-emerald-200 bg-emerald-50">
        <div className="w-9 h-9 rounded-full bg-emerald-200 flex items-center justify-center text-emerald-700 font-bold text-sm">P</div>
        <div>
          <div className="text-sm font-semibold text-slate-800">Priya Sharma</div>
          <div className="text-xs text-slate-500">Billing Specialist · Web Channel</div>
        </div>
        <span className="ml-auto text-[10px] px-2 py-1 rounded-full bg-yellow-100 text-yellow-700">Assigned</span>
      </div>
      <div className="flex gap-2 text-xs">
        <div className="flex-1 p-2.5 rounded-lg text-center" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
          <div style={{ color: 'var(--text-muted)' }}>SLA</div>
          <div className="font-bold text-red-600">4 hours</div>
        </div>
        <div className="flex-1 p-2.5 rounded-lg text-center" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
          <div style={{ color: 'var(--text-muted)' }}>Status</div>
          <div className="font-bold text-yellow-600">In Progress</div>
        </div>
      </div>
    </div>
  )

  if (type === 'agent') return (
    <div className="space-y-3">
      <div className="flex items-center gap-1.5 text-xs text-pink-600 font-medium"><Brain size={12} /> AI Reply Suggestion</div>
      <div className="p-3 rounded-xl text-xs italic leading-relaxed" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
        "Dear Customer, we sincerely apologize. We've identified the failed transaction and initiated a full refund of ₹2,499. It will reflect within 3–5 business days."
      </div>
      <div className="flex gap-2">
        <button className="text-xs px-3 py-1.5 rounded-lg bg-violet-600 text-white">Send Reply</button>
        <button className="text-xs px-3 py-1.5 rounded-lg border" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>Customize</button>
        <button className="text-xs px-3 py-1.5 rounded-lg border" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>Regenerate</button>
      </div>
    </div>
  )

  if (type === 'escalation') return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-xs text-orange-600 font-medium"><AlertTriangle size={12} /> SLA approaching — escalating</div>
      <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
        <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 text-slate-600"><Globe size={11} /> Web Agent</div>
        <ArrowRight size={12} />
        <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-100 text-blue-600"><Mail size={11} /> Email Agent</div>
      </div>
      <div className="p-3 rounded-xl text-xs" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
        <div className="font-medium mb-1" style={{ color: 'var(--text-primary)' }}>Chat summary passed to new agent:</div>
        <div style={{ color: 'var(--text-muted)' }}>"Customer reported billing issue. Refund initiated but not confirmed. Requires follow-up."</div>
      </div>
    </div>
  )

  if (type === 'resolved') return (
    <div className="space-y-3 text-center">
      <div className="w-14 h-14 rounded-full bg-teal-100 flex items-center justify-center mx-auto">
        <CheckCircle2 size={28} className="text-teal-600" />
      </div>
      <div className="font-semibold" style={{ color: 'var(--text-primary)' }}>Complaint Resolved</div>
      <div className="flex justify-center gap-4 text-xs">
        <div><div style={{ color: 'var(--text-muted)' }}>Resolution Time</div><div className="font-bold" style={{ color: 'var(--text-primary)' }}>2h 14m</div></div>
        <div><div style={{ color: 'var(--text-muted)' }}>SLA Status</div><div className="font-bold text-teal-600">Met</div></div>
        <div><div style={{ color: 'var(--text-muted)' }}>Rating</div><div className="font-bold text-yellow-500">★★★★★</div></div>
      </div>
    </div>
  )
  return null
}

export default function HowItWorks() {
  const { user } = useAuth()
  const [active, setActive] = useState(0)

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-9 h-9 rounded-xl bg-violet-400/10 flex items-center justify-center">
          <BarChart2 size={18} className="text-violet-600" />
        </div>
        <div>
          <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>How It Works</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            A step-by-step walkthrough of the complaint resolution process
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* Steps list */}
        <div className="space-y-2">
          {STEPS.map((step, i) => {
            const Icon = step.icon
            const isActive = active === i
            return (
              <motion.button key={step.id} onClick={() => setActive(i)}
                whileHover={{ x: 3 }}
                className={`w-full text-left p-4 rounded-2xl border transition-all flex items-start gap-4 ${isActive ? step.border : ''}`}
                style={!isActive ? { background: 'var(--bg-surface)', borderColor: 'var(--border)' } : { background: 'var(--bg-surface)' }}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 transition-all ${isActive ? `${step.active} text-white shadow-md` : `${step.bg} ${step.color}`}`}>
                  <Icon size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold uppercase tracking-widest ${isActive ? step.color : ''}`}
                      style={!isActive ? { color: 'var(--text-muted)' } : {}}>Step {step.id}</span>
                  </div>
                  <div className="text-sm font-semibold mt-0.5" style={{ color: 'var(--text-primary)' }}>{step.title}</div>
                  <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{step.subtitle}</div>
                </div>
                {isActive && <ChevronRight size={16} className={`${step.color} shrink-0 mt-2`} />}
              </motion.button>
            )
          })}
        </div>

        {/* Detail panel */}
        <div className="sticky top-6">
          <AnimatePresence mode="wait">
            <motion.div key={active}
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="rounded-2xl border p-6 shadow-sm"
              style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
            >
              {/* Step header */}
              <div className="flex items-center gap-3 mb-5 pb-4" style={{ borderBottom: '1px solid var(--border)' }}>
                {(() => { const Icon = STEPS[active].icon; return (
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${STEPS[active].bg}`}>
                    <Icon size={18} className={STEPS[active].color} />
                  </div>
                )})()}
                <div>
                  <div className="font-semibold" style={{ color: 'var(--text-primary)' }}>{STEPS[active].title}</div>
                  <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{STEPS[active].subtitle}</div>
                </div>
              </div>

              {/* Description */}
              <p className="text-sm leading-relaxed mb-4" style={{ color: 'var(--text-secondary)' }}>
                {STEPS[active].desc}
              </p>

              {/* Tips */}
              <div className="space-y-1.5 mb-5">
                {STEPS[active].tips.map(tip => (
                  <div key={tip} className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                    <CheckCircle2 size={12} className={STEPS[active].color} />
                    {tip}
                  </div>
                ))}
              </div>

              {/* Live demo preview */}
              <div className="rounded-xl p-4 mb-4" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                <div className="text-[10px] font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>
                  Live Preview
                </div>
                <DemoPanel type={STEPS[active].demo.type} />
              </div>

              {/* CTA */}
              {STEPS[active].cta && (
                <Link to={STEPS[active].cta.to}
                  className="inline-flex items-center gap-2 text-sm font-medium text-violet-600 hover:text-violet-700 transition-colors">
                  {STEPS[active].cta.label} <ArrowRight size={14} />
                </Link>
              )}

              {/* Navigation */}
              <div className="flex items-center justify-between mt-5 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
                <button onClick={() => setActive(v => Math.max(0, v - 1))} disabled={active === 0}
                  className="flex items-center gap-1.5 text-xs disabled:opacity-30 transition-colors"
                  style={{ color: 'var(--text-muted)' }}>
                  <ChevronLeft size={14} /> Previous
                </button>
                <div className="flex gap-1.5">
                  {STEPS.map((_, i) => (
                    <button key={i} onClick={() => setActive(i)}
                      className={`rounded-full transition-all ${active === i ? `w-5 h-2 ${STEPS[i].active}` : 'w-2 h-2 bg-slate-300'}`} />
                  ))}
                </div>
                <button onClick={() => setActive(v => Math.min(STEPS.length - 1, v + 1))} disabled={active === STEPS.length - 1}
                  className="flex items-center gap-1.5 text-xs disabled:opacity-30 transition-colors"
                  style={{ color: 'var(--text-muted)' }}>
                  Next <ChevronRight size={14} />
                </button>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
