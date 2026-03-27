import { useState } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'
import toast from 'react-hot-toast'
import {
  User, Mail, Phone, MessageSquare, Globe, MessageCircle,
  Save, ShieldCheck
} from 'lucide-react'

const channelLabels = {
  whatsapp: { label: 'WhatsApp Agent', icon: MessageSquare, color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' },
  email:    { label: 'Email Agent',    icon: Mail,          color: 'text-blue-400 bg-blue-400/10 border-blue-400/20' },
  phone:    { label: 'Phone Agent',    icon: Phone,         color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20' },
  chat:     { label: 'Chat Agent',     icon: MessageCircle, color: 'text-violet-400 bg-violet-400/10 border-violet-400/20' },
  web:      { label: 'Web Agent',      icon: Globe,         color: 'text-slate-400 bg-slate-400/10 border-slate-400/20' },
}

const roleColors = {
  user:  'text-blue-400 bg-blue-400/10 border-blue-400/20',
  agent: 'text-violet-400 bg-violet-400/10 border-violet-400/20',
  admin: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
}

export default function Profile() {
  const { user, login } = useAuth()
  const [form, setForm] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    whatsapp: user?.whatsapp || '',
    email: user?.email || '',
    bio: user?.bio || '',
  })
  const [loading, setLoading] = useState(false)

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const handleSave = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { data } = await api.patch('/auth/profile', form)
      // Update stored user
      const stored = JSON.parse(localStorage.getItem('user') || '{}')
      const updated = { ...stored, ...data }
      localStorage.setItem('user', JSON.stringify(updated))
      toast.success('Profile updated')
    } catch {
      toast.error('Failed to update profile')
    } finally {
      setLoading(false)
    }
  }

  const agentInfo = user?.agent_channel ? channelLabels[user.agent_channel] : null

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-9 h-9 rounded-xl bg-violet-400/10 flex items-center justify-center">
          <User size={18} className="text-violet-400" />
        </div>
        <div>
          <h1 className="text-xl font-semibold">Profile</h1>
          <p className="text-xs text-slate-500 mt-0.5">Manage your account details</p>
        </div>
      </div>

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
        {/* Avatar + role card */}
        <div className="card p-6 flex items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-600/30 to-blue-600/20 border border-violet-500/20 flex items-center justify-center shrink-0">
            <span className="text-2xl font-bold text-violet-300">
              {(user?.name || 'U')[0].toUpperCase()}
            </span>
          </div>
          <div>
            <div className="font-semibold text-lg">{user?.name}</div>
            <div className="text-sm text-slate-500 mb-2">{user?.email}</div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`badge border ${roleColors[user?.role]}`}>
                <ShieldCheck size={10} /> {user?.role}
              </span>
              {agentInfo && (
                <span className={`badge border ${agentInfo.color} flex items-center gap-1`}>
                  <agentInfo.icon size={10} /> {agentInfo.label}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Edit form */}
        <div className="card p-6">
          <h2 className="text-sm font-medium mb-5">Personal Information</h2>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-slate-500 block mb-1.5 flex items-center gap-1.5">
                  <User size={11} /> Full Name
                </label>
                <input value={form.name} onChange={e => set('name', e.target.value)}
                  className="input-field" placeholder="Your name" />
              </div>
              <div>
                <label className="text-xs text-slate-500 block mb-1.5 flex items-center gap-1.5">
                  <Mail size={11} /> Email
                </label>
                <input type="email" value={form.email} disabled
                  className="input-field opacity-50 cursor-not-allowed" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-slate-500 block mb-1.5 flex items-center gap-1.5">
                  <Phone size={11} /> Phone Number
                </label>
                <input value={form.phone} onChange={e => set('phone', e.target.value)}
                  className="input-field" placeholder="+1 234 567 8900" />
              </div>
              <div>
                <label className="text-xs text-slate-500 block mb-1.5 flex items-center gap-1.5">
                  <MessageSquare size={11} /> WhatsApp Number
                </label>
                <input value={form.whatsapp} onChange={e => set('whatsapp', e.target.value)}
                  className="input-field" placeholder="+1 234 567 8900" />
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-500 block mb-1.5">Bio (optional)</label>
              <textarea rows={3} value={form.bio} onChange={e => set('bio', e.target.value)}
                className="input-field resize-none" placeholder="A short description about yourself..." />
            </div>

            <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2">
              {loading
                ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <Save size={14} />
              }
              Save changes
            </button>
          </form>
        </div>

        {/* Contact channels summary */}
        <div className="card p-6">
          <h2 className="text-sm font-medium mb-4">Contact Channels</h2>
          <div className="space-y-3">
            {[
              { icon: Mail, label: 'Email', value: form.email || user?.email },
              { icon: Phone, label: 'Phone', value: form.phone || '—' },
              { icon: MessageSquare, label: 'WhatsApp', value: form.whatsapp || '—' },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-center gap-3 py-2 border-b border-theme last:border-0">
                <div className="w-7 h-7 rounded-lg bg-slate-800/30 flex items-center justify-center shrink-0">
                  <Icon size={13} className="text-slate-400" />
                </div>
                <div className="flex-1">
                  <div className="text-[10px] text-slate-600">{label}</div>
                  <div className="text-xs text-slate-300">{value}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  )
}
