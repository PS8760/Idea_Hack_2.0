import { Link } from 'react-router-dom'
import { ShieldAlert, GitFork, Globe, Rss } from 'lucide-react'

export default function Footer() {
  return (
    <footer style={{ borderTop: '1px solid var(--border)', background: 'var(--bg-surface)' }}>
      <div className="max-w-7xl mx-auto px-6 py-14">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-lg bg-violet-600/15 border border-violet-500/30 flex items-center justify-center">
                <ShieldAlert size={16} className="text-violet-600" />
              </div>
              <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>SmartResolve <span className="text-violet-600">AI</span></span>
            </div>
            <p className="text-sm leading-relaxed max-w-xs" style={{ color: 'var(--text-muted)' }}>
              AI-powered complaint management that centralizes, classifies, and resolves customer issues faster.
            </p>
            <div className="flex items-center gap-3 mt-5">
              {[GitFork, Globe, Rss].map((Icon, i) => (
                <a key={i} href="#" className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                  style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                  <Icon size={14} />
                </a>
              ))}
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: 'var(--text-muted)' }}>Product</div>
            <ul className="space-y-2.5">
              {['Features', 'Pricing', 'Changelog', 'Roadmap'].map(l => (
                <li key={l}><a href="#" className="text-sm transition-colors hover:text-violet-600" style={{ color: 'var(--text-muted)' }}>{l}</a></li>
              ))}
            </ul>
          </div>

          <div>
            <div className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: 'var(--text-muted)' }}>Company</div>
            <ul className="space-y-2.5">
              {[['About', '#'], ['Contact', '/contact'], ['Privacy', '#'], ['Terms', '#']].map(([l, href]) => (
                <li key={l}>
                  <Link to={href} className="text-sm transition-colors hover:text-violet-600" style={{ color: 'var(--text-muted)' }}>{l}</Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="pt-6 flex flex-col md:flex-row items-center justify-between gap-3" style={{ borderTop: '1px solid var(--border)' }}>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>© 2025 SmartResolve AI. All rights reserved.</p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Built for IdeaHack 2.0</p>
        </div>
      </div>
    </footer>
  )
}
