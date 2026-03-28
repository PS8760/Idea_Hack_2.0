import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import { useGoogleLogin } from '@react-oauth/google'
import toast from 'react-hot-toast'
import { ShieldAlert, Eye, EyeOff, User, Headphones, Shield, Globe } from 'lucide-react'

const ROLES = [
  { value: 'user',  label: 'User',  desc: 'Submit & track complaints', icon: User,      color: 'border-blue-500/50 bg-blue-500/10 text-blue-600' },
  { value: 'agent', label: 'Agent', desc: 'Handle assigned tickets',   icon: Headphones, color: 'border-violet-500/50 bg-violet-500/10 text-violet-600' },
  { value: 'admin', label: 'Admin', desc: 'Full platform access',      icon: Shield,    color: 'border-emerald-500/50 bg-emerald-500/10 text-emerald-600' },
]

export default function Login() {
  const { login, loginWithGoogle, googleConfig } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '', role: 'user' })
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [showPw, setShowPw] = useState(false)

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const user = await login(form.email, form.password, form.role)
      toast.success(`Welcome back, ${user.name}`)
      navigate('/app')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Invalid credentials')
    } finally { setLoading(false) }
  }

  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
  const handleGoogleLogin = useGoogleLogin({
    onSuccess: async (codeResponse) => {
      setGoogleLoading(true)
      try {
        const result = await loginWithGoogle(codeResponse.access_token, form.role)
        if (result.success) {
          toast.success(`Welcome, ${result.user.name}!`)
          navigate('/app')
        } else {
          toast.error(result.error || 'Google login failed')
        }
      } catch (err) {
        toast.error('Google login error: ' + err.message)
      } finally { setGoogleLoading(false) }
    },
    onError: () => { setGoogleLoading(false); toast.error('Google login failed. Please try again.') },
    flow: 'implicit',
  })

  const selected = ROLES.find(r => r.value === form.role)

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
          <h1 className="text-xl font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Sign in</h1>
          <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>Select your role, then enter your credentials</p>

          {/* Role selector */}
          <div className="grid grid-cols-3 gap-2 mb-6">
            {ROLES.map(r => {
              const Icon = r.icon
              const active = form.role === r.value
              return (
                <button key={r.value} type="button" onClick={() => set('role', r.value)}
                  className={`p-3 rounded-xl border text-left transition-all ${active ? r.color : ''}`}
                  style={!active ? { borderColor: 'var(--border)', background: 'var(--bg-elevated)', color: 'var(--text-muted)' } : {}}>
                  <Icon size={15} className="mb-1.5 opacity-80" />
                  <div className="text-xs font-semibold">{r.label}</div>
                  <div className="text-[10px] opacity-60 leading-tight mt-0.5">{r.desc}</div>
                </button>
              )
            })}
          </div>

          {/* Role hint */}
          <div className={`flex items-center gap-2 text-xs px-3 py-2.5 rounded-xl border mb-5 ${selected?.color}`}>
            {selected && <selected.icon size={13} className="shrink-0" />}
            <span>Signing in as <span className="font-semibold">{selected?.label}</span> — your account must be registered with this role.</span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
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
                  className="input-field pr-10" placeholder="••••••••" />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: 'var(--text-muted)' }}>
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
              {loading
                ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Signing in...</span>
                : `Sign in as ${selected?.label}`}
            </button>
          </form>

          {/* Google OAuth */}
          {googleConfig?.google_oauth_enabled && googleClientId ? (
            <>
              <div className="flex items-center gap-3 my-5">
                <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Or continue with</span>
                <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
              </div>
              <motion.button type="button" disabled={googleLoading}
                onClick={() => handleGoogleLogin()}
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
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Or continue with</span>
                <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
              </div>
              <div className="w-full py-2.5 px-4 rounded-xl border text-center text-xs"
                style={{ borderColor: 'var(--border)', background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}>
                Google OAuth — add <code className="text-violet-600 font-mono">VITE_GOOGLE_CLIENT_ID</code> to <code className="font-mono">.env</code> to enable
              </div>
            </>
          )}

          <p className="text-sm text-center mt-5" style={{ color: 'var(--text-muted)' }}>
            No account?{' '}
            <Link to="/register" className="text-violet-600 hover:text-violet-700 transition-colors">Create one</Link>
          </p>
        </div>
      </motion.div>
    </div>
  )
}
