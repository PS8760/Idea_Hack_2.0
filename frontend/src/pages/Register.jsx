import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import { useGoogleLogin } from '@react-oauth/google'
import toast from 'react-hot-toast'
import { ShieldAlert, Eye, EyeOff, MessageSquare, Mail, Phone, Globe, MessageCircle } from 'lucide-react'

const ROLES = [
  { value: 'user',  label: 'User',  desc: 'Submit & track complaints' },
  { value: 'agent', label: 'Agent', desc: 'Handle assigned tickets' },
  { value: 'admin', label: 'Admin', desc: 'Full platform access' },
]

const AGENT_CHANNELS = [
  { value: 'whatsapp', label: 'WhatsApp', icon: MessageSquare, color: 'text-emerald-600 border-emerald-500/40 bg-emerald-500/10' },
  { value: 'email',    label: 'Email',    icon: Mail,          color: 'text-blue-600 border-blue-500/40 bg-blue-500/10' },
  { value: 'phone',    label: 'Phone',    icon: Phone,         color: 'text-yellow-600 border-yellow-500/40 bg-yellow-500/10' },
  { value: 'chat',     label: 'Live Chat',icon: MessageCircle, color: 'text-violet-600 border-violet-500/40 bg-violet-500/10' },
  { value: 'web',      label: 'Web',      icon: Globe,         color: 'text-slate-600 border-slate-500/40 bg-slate-500/10' },
]

export default function Register() {
  const { register, loginWithGoogle, googleConfig } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'user', agent_channel: 'whatsapp' })
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [showPw, setShowPw] = useState(false)

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (form.password.length < 6) return toast.error('Password must be at least 6 characters')
    setLoading(true)
    try {
      const payload = { ...form }
      if (form.role !== 'agent') delete payload.agent_channel
      const user = await register(payload.name, payload.email, payload.password, payload.role, payload.agent_channel)
      toast.success(`Welcome, ${user.name}`)
      navigate('/app')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Registration failed')
    } finally { setLoading(false) }
  }

  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
  const handleGoogleRegister = useGoogleLogin({
    onSuccess: async (codeResponse) => {
      setGoogleLoading(true)
      try {
        const result = await loginWithGoogle(codeResponse.access_token, form.role)
        if (result.success) {
          toast.success(`Welcome, ${result.user.name}!`)
          navigate('/app')
        } else {
          toast.error(result.error || 'Google sign-up failed')
        }
      } catch (err) {
        toast.error('Google sign-up error: ' + err.message)
      } finally { setGoogleLoading(false) }
    },
    onError: () => { setGoogleLoading(false); toast.error('Google sign-up failed.') },
    flow: 'implicit',
  })

  return (
    <div className="min-h-screen grid-bg flex items-center justify-center p-4" style={{ background: 'var(--bg-base)' }}>
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 bg-violet-600/6 rounded-full blur-3xl pointer-events-none" />

      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
        className="relative w-full max-w-md">

        <Link to="/" className="flex items-center justify-center gap-2.5 mb-8">
          <div className="w-9 h-9 rounded-xl bg-violet-600/15 border border-violet-500/30 flex items-center justify-center">
            <ShieldAlert size={18} className="text-violet-600" />
          </div>
          <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>SmartResolve <span className="text-violet-600">AI</span></span>
        </Link>

        <div className="rounded-2xl p-8 shadow-sm" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
          <h1 className="text-xl font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Create account</h1>
          <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>Select your role to get the right experience</p>

          {/* Role selector */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            {ROLES.map(r => (
              <button key={r.value} type="button" onClick={() => set('role', r.value)}
                className={`p-3 rounded-xl border text-left transition-all ${
                  form.role === r.value
                    ? 'border-violet-500/60 bg-violet-500/10 text-violet-700'
                    : ''
                }`}
                style={form.role !== r.value ? { borderColor: 'var(--border)', background: 'var(--bg-elevated)', color: 'var(--text-muted)' } : {}}>
                <div className="text-xs font-semibold mb-0.5">{r.label}</div>
                <div className="text-[10px] opacity-70 leading-tight">{r.desc}</div>
              </button>
            ))}
          </div>

          <AnimatePresence>
            {form.role === 'agent' && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden mb-4">
                <div className="pt-1 pb-3">
                  <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>Select your channel specialisation</p>
                  <div className="grid grid-cols-5 gap-1.5">
                    {AGENT_CHANNELS.map(({ value, label, icon: Icon, color }) => (
                      <button key={value} type="button" onClick={() => set('agent_channel', value)}
                        className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border text-center transition-all ${
                          form.agent_channel === value ? color : ''
                        }`}
                        style={form.agent_channel !== value ? { borderColor: 'var(--border)', background: 'var(--bg-elevated)', color: 'var(--text-muted)' } : {}}>
                        <Icon size={15} />
                        <span className="text-[9px] leading-tight">{label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs block mb-1.5" style={{ color: 'var(--text-muted)' }}>Full name</label>
              <input required value={form.name} onChange={e => set('name', e.target.value)}
                className="input-field" placeholder="Your name" />
            </div>
            <div>
              <label className="text-xs block mb-1.5" style={{ color: 'var(--text-muted)' }}>Email</label>
              <input type="email" required value={form.email} onChange={e => set('email', e.target.value)}
                className="input-field" placeholder="you@example.com" />
            </div>
            <div>
              <label className="text-xs block mb-1.5" style={{ color: 'var(--text-muted)' }}>Password</label>
              <div className="relative">
                <input type={showPw ? 'text' : 'password'} required value={form.password}
                  onChange={e => set('password', e.target.value)}
                  className="input-field pr-10" placeholder="Min 6 characters" />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: 'var(--text-muted)' }}>
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
              {loading
                ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Creating...</span>
                : 'Create account'}
            </button>
          </form>

          {/* Google OAuth */}
          {googleConfig?.google_oauth_enabled && googleClientId ? (
            <>
              <div className="flex items-center gap-3 my-5">
                <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Or sign up with</span>
                <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
              </div>
              <motion.button type="button" disabled={googleLoading}
                onClick={() => handleGoogleRegister()}
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                className="w-full py-2.5 px-4 rounded-xl border transition-all flex items-center justify-center gap-2 font-medium text-sm"
                style={{ borderColor: 'var(--border)', background: 'var(--bg-elevated)', color: 'var(--text-primary)' }}>
                {googleLoading
                  ? <><span className="w-3.5 h-3.5 border-2 border-slate-400/30 border-t-slate-600 rounded-full animate-spin" />Connecting...</>
                  : <><Globe size={16} className="text-blue-500" />Continue with Google</>}
              </motion.button>
            </>
          ) : (
            <>
              <div className="flex items-center gap-3 my-5">
                <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Or sign up with</span>
                <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
              </div>
              <div className="w-full py-2.5 px-4 rounded-xl border text-center text-xs"
                style={{ borderColor: 'var(--border)', background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}>
                Google OAuth — add <code className="text-violet-600 font-mono">VITE_GOOGLE_CLIENT_ID</code> to <code className="font-mono">.env</code> to enable
              </div>
            </>
          )}

          <p className="text-sm text-center mt-5" style={{ color: 'var(--text-muted)' }}>
            Already have an account?{' '}
            <Link to="/login" className="text-violet-600 hover:text-violet-700 transition-colors">Sign in</Link>
          </p>
        </div>
      </motion.div>
    </div>
  )
}
