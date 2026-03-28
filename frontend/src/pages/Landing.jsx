import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import {
  Zap, Shield, BarChart3, MessageSquare, GitMerge, Clock,
  ChevronRight, CheckCircle, ArrowRight, Globe,
  Sparkles, User, Headphones, Settings, CheckCircle2, Brain
} from 'lucide-react'

const features = [
  { icon: Zap,       title: 'AI Classification',   desc: 'Groq LLM instantly classifies complaints by sentiment, priority, and category.',           color: 'text-yellow-600', bg: 'bg-yellow-50 border-yellow-200' },
  { icon: Shield,    title: 'Duplicate Detection', desc: 'Semantic similarity catches duplicate complaints before they pile up.',                     color: 'text-violet-600', bg: 'bg-violet-50 border-violet-200' },
  { icon: Clock,     title: 'SLA Tracking',        desc: 'Automatic deadlines with escalation alerts so nothing slips through the cracks.',          color: 'text-blue-600',   bg: 'bg-blue-50 border-blue-200' },
  { icon: Brain,     title: 'Agent Assist',        desc: 'AI-generated reply suggestions with full complaint history for every agent.',               color: 'text-emerald-600',bg: 'bg-emerald-50 border-emerald-200' },
  { icon: GitMerge,  title: 'Multi-channel',       desc: 'Complaints from WhatsApp, email, calls, and web — all in one unified dashboard.',          color: 'text-pink-600',   bg: 'bg-pink-50 border-pink-200' },
  { icon: BarChart3, title: 'Live Insights',       desc: 'Trend charts, sentiment breakdowns, and SLA breach reports in real time.',                 color: 'text-orange-600', bg: 'bg-orange-50 border-orange-200' },
]

const roles = [
  { role: 'User',  icon: User,      color: 'border-blue-200 bg-blue-50',    accent: 'text-blue-600',    dot: 'bg-blue-500',    points: ['Submit complaints via any channel', 'Track status in real time', 'Get notified on resolution'] },
  { role: 'Agent', icon: Headphones,color: 'border-violet-200 bg-violet-50',accent: 'text-violet-600',  dot: 'bg-violet-500',  points: ['View assigned complaint queue', 'AI-suggested replies with history', 'Escalate or resolve tickets'] },
  { role: 'Admin', icon: Settings,  color: 'border-emerald-200 bg-emerald-50',accent:'text-emerald-600',dot: 'bg-emerald-500', points: ['Full dashboard & analytics', 'Manage agents and assignments', 'Configure SLA rules & escalations'] },
]

const stats = [
  { value: '3×',  label: 'Faster resolution' },
  { value: '94%', label: 'SLA compliance' },
  { value: '60%', label: 'Fewer duplicates' },
  { value: '< 2s',label: 'AI response time' },
]

const DEMO_STEPS = [
  {
    id: 1, icon: MessageSquare, label: 'Submit', activeBg: 'bg-blue-600',
    color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200',
    title: 'Customer submits a complaint',
    preview: { type: 'complaint' },
  },
  {
    id: 2, icon: Sparkles, label: 'AI Analysis', activeBg: 'bg-violet-600',
    color: 'text-violet-600', bg: 'bg-violet-50', border: 'border-violet-200',
    title: 'AI classifies & prioritizes instantly',
    preview: { type: 'analysis' },
  },
  {
    id: 3, icon: User, label: 'Assignment', activeBg: 'bg-emerald-600',
    color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200',
    title: 'Routed to the right agent',
    preview: { type: 'assignment' },
  },
  {
    id: 4, icon: Brain, label: 'Agent Assist', activeBg: 'bg-pink-600',
    color: 'text-pink-600', bg: 'bg-pink-50', border: 'border-pink-200',
    title: 'AI drafts a reply for the agent',
    preview: { type: 'reply' },
  },
  {
    id: 5, icon: CheckCircle2, label: 'Resolved', activeBg: 'bg-teal-600',
    color: 'text-teal-600', bg: 'bg-teal-50', border: 'border-teal-200',
    title: 'Complaint resolved & closed',
    preview: { type: 'resolved' },
  },
]

function DemoPreview({ type }) {
  if (type === 'complaint') return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-xs text-slate-500"><Globe size={12} /> Web · Just now</div>
      <div className="font-semibold text-slate-800">Payment deducted but order not placed</div>
      <p className="text-sm text-slate-600 leading-relaxed">I was charged ₹2,499 for an order but it never went through. The money was deducted from my account.</p>
      <div className="flex gap-2 pt-1">
        <span className="text-[10px] px-2 py-1 rounded-full bg-slate-100 text-slate-500">Billing</span>
        <span className="text-[10px] px-2 py-1 rounded-full bg-slate-100 text-slate-500">Web</span>
      </div>
    </div>
  )
  if (type === 'analysis') return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-1.5 text-xs text-violet-600 font-medium mb-3"><Sparkles size={12} /> AI Analysis Complete</div>
      {[
        { label: 'Category',  value: 'Billing',  color: 'bg-blue-100 text-blue-700' },
        { label: 'Priority',  value: 'High',     color: 'bg-red-100 text-red-700' },
        { label: 'Sentiment', value: 'Negative', color: 'bg-orange-100 text-orange-700' },
        { label: 'Summary',   value: 'Customer charged ₹2,499 for a failed order — refund required.', color: 'bg-slate-100 text-slate-700' },
      ].map(item => (
        <div key={item.label} className="flex items-start gap-3">
          <span className="text-xs text-slate-400 w-16 shrink-0 pt-0.5">{item.label}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${item.color}`}>{item.value}</span>
        </div>
      ))}
    </div>
  )
  if (type === 'assignment') return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50 border border-emerald-200">
        <div className="w-9 h-9 rounded-full bg-emerald-200 flex items-center justify-center text-emerald-700 font-semibold text-sm">P</div>
        <div>
          <div className="text-sm font-semibold text-slate-800">Priya Sharma</div>
          <div className="text-xs text-slate-500">Billing Specialist</div>
        </div>
        <span className="ml-auto text-[10px] px-2 py-1 rounded-full bg-yellow-100 text-yellow-700 font-medium">In Progress</span>
      </div>
      <div className="flex gap-3 text-xs">
        <div className="flex-1 p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-center">
          <div className="text-slate-400 mb-0.5">SLA Deadline</div>
          <div className="font-semibold text-slate-700">4 hours</div>
        </div>
        <div className="flex-1 p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-center">
          <div className="text-slate-400 mb-0.5">Priority</div>
          <div className="font-semibold text-red-600">High</div>
        </div>
      </div>
    </div>
  )
  if (type === 'reply') return (
    <div className="space-y-3">
      <div className="flex items-center gap-1.5 text-xs text-pink-600 font-medium"><Brain size={12} /> AI-Generated Reply</div>
      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-700 leading-relaxed italic">
        "Dear Customer, we sincerely apologize for the inconvenience. We have identified the failed transaction and initiated a full refund of ₹2,499. It will reflect within 3–5 business days."
      </div>
      <div className="flex gap-2">
        <button className="text-xs px-3 py-1.5 rounded-lg bg-violet-600 text-white font-medium">Send Reply</button>
        <button className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600">Edit</button>
      </div>
    </div>
  )
  if (type === 'resolved') return (
    <div className="space-y-3 text-center">
      <div className="w-14 h-14 rounded-full bg-teal-100 flex items-center justify-center mx-auto">
        <CheckCircle2 size={28} className="text-teal-600" />
      </div>
      <div className="font-semibold text-slate-800">Complaint Resolved</div>
      <div className="flex justify-center gap-4 text-xs">
        <div className="text-center"><div className="text-slate-400 mb-0.5">Resolution Time</div><div className="font-bold text-slate-700">2h 14m</div></div>
        <div className="text-center"><div className="text-slate-400 mb-0.5">SLA Status</div><div className="font-bold text-teal-600">Met</div></div>
      </div>
      <div className="flex justify-center gap-1 pt-1">
        {[...Array(5)].map((_, i) => <span key={i} className="text-yellow-400 text-base">★</span>)}
      </div>
      <div className="text-xs text-slate-400">Customer rated 5/5</div>
    </div>
  )
  return null
}

const fade = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }

export default function Landing() {
  const [activeStep, setActiveStep] = useState(0)

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-base)', color: 'var(--text-primary)' }}>
      <Navbar />

      {/* Hero */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden grid-bg pt-16">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-500/8 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-blue-500/6 rounded-full blur-3xl pointer-events-none" />
        <div className="relative max-w-5xl mx-auto px-6 text-center">
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 bg-violet-500/10 border border-violet-500/20 text-violet-600 text-xs px-4 py-2 rounded-full mb-8">
            <span className="w-1.5 h-1.5 bg-violet-500 rounded-full animate-pulse" />
            Powered by Groq LLM + HuggingFace Transformers
          </motion.div>
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }}
            className="text-5xl md:text-7xl font-bold tracking-tight leading-[1.1] mb-6">
            Resolve complaints<br /><span className="gradient-text">10× smarter</span>
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg max-w-2xl mx-auto mb-10 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            SmartResolve AI centralizes customer complaints from every channel, classifies them instantly with AI, and routes them to the right agent — with full context.
          </motion.p>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/register" className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-7 py-3.5 rounded-xl font-medium text-sm transition-all hover:shadow-lg hover:shadow-violet-500/20 hover:-translate-y-0.5">
              Start for free <ArrowRight size={16} />
            </Link>
            <Link to="/contact" className="flex items-center gap-2 px-7 py-3.5 rounded-xl font-medium text-sm transition-all hover:-translate-y-0.5"
              style={{ color: 'var(--text-secondary)', border: '1px solid var(--border)', background: 'var(--bg-surface)' }}>
              Talk to us
            </Link>
          </motion.div>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, delay: 0.5 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-20 max-w-3xl mx-auto">
            {stats.map(s => (
              <div key={s.label} className="text-center">
                <div className="text-3xl font-bold gradient-text mb-1">{s.value}</div>
                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{s.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Interactive Process Demo */}
      <section className="py-28 px-6" style={{ background: 'var(--bg-elevated)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
        <div className="max-w-6xl mx-auto">
          <motion.div variants={fade} initial="hidden" whileInView="show" viewport={{ once: true }} className="text-center mb-14">
            <div className="text-xs text-violet-600 font-semibold uppercase tracking-widest mb-3">Live Demo</div>
            <h2 className="text-4xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>See how a complaint gets resolved</h2>
            <p className="text-sm max-w-xl mx-auto" style={{ color: 'var(--text-muted)' }}>
              Click each step to see exactly what happens from submission to resolution.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
            {/* Steps */}
            <div className="space-y-3">
              {DEMO_STEPS.map((step, i) => {
                const Icon = step.icon
                const isActive = activeStep === i
                return (
                  <motion.button key={step.id} onClick={() => setActiveStep(i)} whileHover={{ x: 4 }}
                    className={`w-full text-left p-4 rounded-2xl border transition-all flex items-center gap-4 ${isActive ? step.border : ''}`}
                    style={!isActive ? { background: 'var(--bg-surface)', borderColor: 'var(--border)' } : { background: 'white' }}>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all ${isActive ? `${step.activeBg} text-white shadow-md` : `${step.bg} ${step.color}`}`}>
                      <Icon size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className={`text-[10px] font-bold uppercase tracking-widest ${isActive ? step.color : ''}`}
                        style={!isActive ? { color: 'var(--text-muted)' } : {}}>Step {step.id}</span>
                      <div className="text-sm font-semibold mt-0.5"
                        style={{ color: isActive ? '#1e293b' : 'var(--text-secondary)' }}>{step.title}</div>
                    </div>
                    {isActive && <ChevronRight size={16} className={step.color} />}
                  </motion.button>
                )
              })}
            </div>

            {/* Preview */}
            <div className="sticky top-24">
              <AnimatePresence mode="wait">
                <motion.div key={activeStep}
                  initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.25 }}
                  className="rounded-2xl border p-6 shadow-sm min-h-[280px]"
                  style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
                  <div className="flex items-center gap-2 mb-5 pb-4" style={{ borderBottom: '1px solid var(--border)' }}>
                    {(() => { const Icon = DEMO_STEPS[activeStep].icon; return (
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${DEMO_STEPS[activeStep].bg}`}>
                        <Icon size={14} className={DEMO_STEPS[activeStep].color} />
                      </div>
                    )})()}
                    <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {DEMO_STEPS[activeStep].title}
                    </span>
                  </div>
                  <DemoPreview type={DEMO_STEPS[activeStep].preview.type} />
                </motion.div>
              </AnimatePresence>
              <div className="flex justify-center gap-2 mt-4">
                {DEMO_STEPS.map((step, i) => (
                  <button key={i} onClick={() => setActiveStep(i)}
                    className={`rounded-full transition-all ${activeStep === i ? `w-6 h-2 ${step.activeBg}` : 'w-2 h-2 bg-slate-300'}`} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-28 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div variants={fade} initial="hidden" whileInView="show" viewport={{ once: true }} className="text-center mb-16">
            <div className="text-xs text-violet-600 font-semibold uppercase tracking-widest mb-3">Features</div>
            <h2 className="text-4xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Everything you need to resolve faster</h2>
            <p className="text-sm max-w-xl mx-auto leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              From intake to resolution, every step is powered by AI — so your team spends time solving, not sorting.
            </p>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f, i) => (
              <motion.div key={f.title} variants={fade} initial="hidden" whileInView="show"
                viewport={{ once: true }} transition={{ delay: i * 0.07 }}
                className={`card-hover rounded-2xl border p-6 ${f.bg}`}>
                <div className={`w-10 h-10 rounded-xl border flex items-center justify-center mb-4 bg-white`}>
                  <f.icon size={20} className={f.color} />
                </div>
                <h3 className="font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>{f.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Roles */}
      <section className="py-24 px-6" style={{ background: 'var(--bg-elevated)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
        <div className="max-w-5xl mx-auto">
          <motion.div variants={fade} initial="hidden" whileInView="show" viewport={{ once: true }} className="text-center mb-14">
            <div className="text-xs text-violet-600 font-semibold uppercase tracking-widest mb-3">Roles</div>
            <h2 className="text-4xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Built for every stakeholder</h2>
            <p className="text-sm max-w-lg mx-auto" style={{ color: 'var(--text-muted)' }}>Three distinct portals, one unified platform.</p>
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
                    <li key={p} className="flex items-start gap-2.5 text-sm" style={{ color: 'var(--text-secondary)' }}>
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
      <section className="py-24 px-6">
        <motion.div variants={fade} initial="hidden" whileInView="show" viewport={{ once: true }}
          className="max-w-3xl mx-auto text-center rounded-3xl p-14 border"
          style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.06), rgba(59,130,246,0.04))', borderColor: 'rgba(124,58,237,0.2)' }}>
          <h2 className="text-4xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Ready to resolve smarter?</h2>
          <p className="text-sm mb-8 max-w-md mx-auto" style={{ color: 'var(--text-muted)' }}>
            Join teams using SmartResolve AI to cut resolution time and keep customers happy.
          </p>
          <Link to="/register" className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-8 py-3.5 rounded-xl font-medium text-sm transition-all hover:shadow-lg hover:shadow-violet-500/20">
            Get started free <ChevronRight size={16} />
          </Link>
        </motion.div>
      </section>

      <Footer />
    </div>
  )
}
