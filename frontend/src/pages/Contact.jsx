import { useState } from 'react'
import { motion } from 'framer-motion'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { Mail, MessageSquare, Phone, MapPin, Send } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../api/axios'

const info = [
  { icon: Mail,         label: 'Email',     value: 'spranav0812@gmail.com' },
  { icon: Phone,        label: 'Phone',     value: '+91 9004677177' },
  { icon: MapPin,       label: 'Location',  value: 'Mumbai, India' },
  { icon: MessageSquare,label: 'Live Chat', value: 'Available 9am – 6pm IST' },
]

export default function Contact() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' })
  const [loading, setLoading] = useState(false)

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await api.post('/contact', form)
      toast.success("Message sent! We'll get back to you soon.")
      setForm({ name: '', email: '', subject: '', message: '' })
    } catch {
      toast.error('Failed to send message. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen page-bg">
      <Navbar />

      <section className="pt-32 pb-20 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="text-center mb-16"
          >
            <div className="text-xs text-violet-400 font-semibold uppercase tracking-widest mb-3">Contact</div>
            <h1 className="text-5xl font-bold mb-4">Get in touch</h1>
            <p className="text-slate-400 max-w-md mx-auto text-sm leading-relaxed">
              Have a question or want to see a demo? We'd love to hear from you.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            {/* Info */}
            <motion.div
              initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}
              className="lg:col-span-2 space-y-4"
            >
              {info.map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-start gap-4 rounded-2xl p-5" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
                  <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center shrink-0">
                    <Icon size={18} className="text-violet-400" />
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 mb-0.5">{label}</div>
                    <div className="text-sm text-slate-200">{value}</div>
                  </div>
                </div>
              ))}
            </motion.div>

            {/* Form */}
            <motion.div
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }}
              className="lg:col-span-3 rounded-2xl p-8" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
            >
              <h2 className="text-lg font-semibold mb-6">Send a message</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-slate-500 block mb-1.5">Name</label>
                    <input required value={form.name} onChange={e => set('name', e.target.value)}
                      className="input-field" placeholder="Your name" />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 block mb-1.5">Email</label>
                    <input required type="email" value={form.email} onChange={e => set('email', e.target.value)}
                      className="input-field" placeholder="you@example.com" />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-slate-500 block mb-1.5">Subject</label>
                  <input required value={form.subject} onChange={e => set('subject', e.target.value)}
                    className="input-field" placeholder="How can we help?" />
                </div>
                <div>
                  <label className="text-xs text-slate-500 block mb-1.5">Message</label>
                  <textarea required rows={5} value={form.message} onChange={e => set('message', e.target.value)}
                    className="input-field resize-none" placeholder="Tell us more..." />
                </div>
                <button type="submit" disabled={loading}
                  className="btn-primary w-full flex items-center justify-center gap-2">
                  {loading ? (
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <><Send size={15} /> Send message</>
                  )}
                </button>
              </form>
            </motion.div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
