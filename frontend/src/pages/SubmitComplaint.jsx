import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import api from '../api/axios'
import toast from 'react-hot-toast'
import { useNotifications } from '../context/NotificationContext'
import { Sparkles, Loader2, PlusCircle, MessageSquare, Mail, Phone, Globe, MessageCircle, User } from 'lucide-react'

const CATEGORIES = ['Billing', 'Technical', 'Delivery', 'Product', 'Service', 'Other']

const CHANNELS = [
  { value: 'web',      label: 'Web',       icon: Globe },
  { value: 'email',    label: 'Email',     icon: Mail },
  { value: 'whatsapp', label: 'WhatsApp',  icon: MessageSquare },
  { value: 'phone',    label: 'Phone',     icon: Phone },
  { value: 'chat',     label: 'Live Chat', icon: MessageCircle },
]

export default function SubmitComplaint() {
  const navigate = useNavigate()
  const { addNotification } = useNotifications()
  const [form, setForm] = useState({ title: '', description: '', category: 'Technical', channel: 'web' })
  const [loading, setLoading] = useState(false)
  const [aiPreview, setAiPreview] = useState(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [agents, setAgents] = useState([])   // agents for selected channel

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  // Fetch available agents when channel changes
  useEffect(() => {
    api.get('/admin/agents')
      .then(({ data }) => setAgents(data.filter(a => a.agent_channel === form.channel && a.active !== false)))
      .catch(() => setAgents([]))
  }, [form.channel])

  const analyzePreview = async () => {
    if (!form.description.trim()) return toast.error('Add a description first')
    setAnalyzing(true)
    try {
      const { data } = await api.post('/complaints/analyze-preview', { text: form.description })
      setAiPreview(data)
    } catch { toast.error('AI analysis failed — check your connection') }
    finally { setAnalyzing(false) }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { data } = await api.post('/complaints', form)
      toast.success(data.assigned_agent ? `Assigned to ${data.assigned_agent}` : 'Complaint submitted')
      if (data.assigned_agent) {
        addNotification({
          type: 'assignment',
          message: `New complaint assigned to ${data.assigned_agent}`,
          detail: data.title,
          forRoles: ['agent', 'admin'],
        })
      }
      navigate(`/app/complaints/${data._id}`)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Submission failed')
    } finally { setLoading(false) }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-9 h-9 rounded-xl bg-violet-400/10 flex items-center justify-center">
          <PlusCircle size={18} className="text-violet-400" />
        </div>
        <div>
          <h1 className="text-xl font-semibold">Submit Complaint</h1>
          <p className="text-xs text-slate-500 mt-0.5">AI will classify and route to the right agent automatically</p>
        </div>
      </div>

      <motion.form initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="text-xs text-slate-500 block mb-1.5">Title</label>
          <input required value={form.title} onChange={e => set('title', e.target.value)}
            className="input-field" placeholder="Brief summary of the issue" />
        </div>

        <div>
          <label className="text-xs text-slate-500 block mb-1.5">Description</label>
          <textarea required rows={5} value={form.description} onChange={e => set('description', e.target.value)}
            className="input-field resize-none" placeholder="Describe your issue in detail..." />
          <button type="button" onClick={analyzePreview} disabled={analyzing}
            className="mt-2 flex items-center gap-1.5 text-xs text-violet-400 hover:text-violet-300 transition-colors">
            {analyzing ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
            Analyze with AI
          </button>
        </div>

        <AnimatePresence>
          {aiPreview && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="bg-violet-500/5 border border-violet-500/15 rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-1.5 text-xs text-violet-400">
                <Sparkles size={12} /> AI Analysis Preview
              </div>
              <div className="grid grid-cols-3 gap-3 text-xs">
                {[['Sentiment', aiPreview.sentiment], ['Priority', aiPreview.priority], ['Category', aiPreview.category]].map(([l, v]) => (
                  <div key={l} className="bg-slate-800/50 rounded-xl p-3">
                    <div className="text-slate-500 mb-1">{l}</div>
                    <div className="text-slate-200 font-medium capitalize">{v}</div>
                  </div>
                ))}
              </div>
              {aiPreview.summary && <p className="text-xs text-slate-400 leading-relaxed">{aiPreview.summary}</p>}
              {aiPreview.is_duplicate && <p className="text-orange-400 text-xs">⚠ Possible duplicate detected</p>}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Channel selector */}
        <div>
          <label className="text-xs text-slate-500 block mb-2">Channel — choose how you want to be contacted</label>
          <div className="grid grid-cols-5 gap-2">
            {CHANNELS.map(({ value, label, icon: Icon }) => (
              <button key={value} type="button" onClick={() => set('channel', value)}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-xs transition-all ${
                  form.channel === value
                    ? 'border-violet-500/60 bg-violet-500/10 text-violet-300'
                    : 'border-slate-700/60 bg-slate-800/30 text-slate-500 hover:border-slate-600 hover:text-slate-300'
                }`}>
                <Icon size={16} />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Available agents for this channel */}
        <AnimatePresence>
          {agents.length > 0 && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden">
              <div className="bg-slate-900/50 border border-slate-800/50 rounded-xl p-3">
                <p className="text-xs text-slate-500 mb-2">Available agents for this channel</p>
                <div className="flex flex-wrap gap-2">
                  {agents.map(a => (
                    <span key={a.id} className="flex items-center gap-1.5 text-xs bg-slate-800 border border-slate-700/50 text-slate-300 px-2.5 py-1 rounded-lg">
                      <User size={11} className="text-violet-400" /> {a.name}
                    </span>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
          {agents.length === 0 && form.channel && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-slate-600">
              No agents currently available for this channel — your complaint will be queued.
            </motion.p>
          )}
        </AnimatePresence>

        <div>
          <label className="text-xs text-slate-500 block mb-1.5">Category</label>
          <select value={form.category} onChange={e => set('category', e.target.value)} className="input-field">
            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>

        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading
            ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Submitting...</span>
            : 'Submit Complaint'}
        </button>
      </motion.form>
    </div>
  )
}
