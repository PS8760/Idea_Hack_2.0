import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { ShieldAlert, Menu, X, ChevronRight, Sun, Moon } from 'lucide-react'

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const { user } = useAuth()
  const { theme, toggle } = useTheme()
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', fn)
    return () => window.removeEventListener('scroll', fn)
  }, [])

  const links = [
    { to: '/', label: 'Home' },
    { href: '#demo', label: 'How it Works' },
    { href: '#try-demo', label: 'Try Demo' },
    { href: '#features', label: 'Features' },
    { to: '/contact', label: 'Contact' },
  ]

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'backdrop-blur-xl' : 'bg-transparent'}`}
      style={scrolled ? { background: 'color-mix(in srgb, var(--bg-base) 90%, transparent)', borderBottom: '1px solid var(--border)' } : {}}
    >
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-lg bg-violet-600/20 border border-violet-500/30 flex items-center justify-center group-hover:bg-violet-600/30 transition-colors">
            <ShieldAlert size={16} className="text-violet-400" />
          </div>
          <span className="font-semibold text-sm tracking-tight" style={{ color: 'var(--text-primary)' }}>SmartResolve <span className="text-violet-400">AI</span></span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {links.map(l => (
            l.href ? (
              <a key={l.href} href={l.href}
                className="px-4 py-2 rounded-lg text-sm transition-colors hover:bg-slate-800/30"
                style={{ color: 'var(--text-secondary)' }}>
                {l.label}
              </a>
            ) : (
              <Link key={l.to} to={l.to}
                className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                  location.pathname === l.to ? 'bg-slate-800/60' : 'hover:bg-slate-800/30'
                }`}
                style={{ color: location.pathname === l.to ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                {l.label}
              </Link>
            )
          ))}
        </nav>

        {/* CTA */}
        <div className="hidden md:flex items-center gap-3">
          <button
            onClick={toggle}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-slate-800/40"
            style={{ color: 'var(--text-muted)' }}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          {user ? (
            <button
              onClick={() => navigate('/app')}
              className="flex items-center gap-1.5 text-sm bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Dashboard <ChevronRight size={14} />
            </button>
          ) : (
            <>
              <Link to="/login" className="text-sm text-slate-400 hover: px-4 py-2 rounded-lg transition-colors">
                Sign in
              </Link>
              <Link to="/register" className="text-sm bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-lg transition-colors">
                Get started
              </Link>
            </>
          )}
        </div>

        {/* Mobile toggle */}
        <div className="md:hidden flex items-center gap-2">
          <button
            onClick={toggle}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
            style={{ color: 'var(--text-muted)' }}
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <button onClick={() => setOpen(!open)} className="text-slate-400 hover:text-slate-100">
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden backdrop-blur-xl px-6 py-4 space-y-1" style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border)' }}>
          {links.map(l => (
            <Link key={l.to} to={l.to} onClick={() => setOpen(false)}
              className="block px-3 py-2.5 rounded-lg text-sm transition-colors hover:bg-slate-800/30"
              style={{ color: 'var(--text-secondary)' }}>
              {l.label}
            </Link>
          ))}
          <div className="pt-3 flex flex-col gap-2" style={{ borderTop: '1px solid var(--border)' }}>
            {user ? (
              <Link to="/app" onClick={() => setOpen(false)} className="btn-primary text-center">Dashboard</Link>
            ) : (
              <>
                <Link to="/login" onClick={() => setOpen(false)} className="btn-ghost text-center">Sign in</Link>
                <Link to="/register" onClick={() => setOpen(false)} className="btn-primary text-center">Get started</Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
