import { useState, useEffect } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useNotifications } from '../context/NotificationContext'
import { useTheme } from '../context/ThemeContext'
import NotificationPanel from './NotificationPanel'
import {
  LayoutDashboard, PlusCircle, BarChart2, LogOut, ShieldAlert,
  ListChecks, Settings, Inbox, ChevronLeft, ChevronRight,
  User, Bell, MessageSquare, FileText, Sun, Moon, HelpCircle
} from 'lucide-react'

const navByRole = {
  user: [
    { to: '/app',               label: 'Dashboard',    icon: LayoutDashboard, end: true },
    { to: '/app/submit',        label: 'New Complaint', icon: PlusCircle },
    { to: '/app/my-complaints', label: 'My Complaints', icon: ListChecks },
    { to: '/app/how-it-works',  label: 'How It Works',  icon: HelpCircle },
  ],
  agent: [
    { to: '/app',               label: 'Dashboard',   icon: LayoutDashboard, end: true },
    { to: '/app/queue',         label: 'My Queue',    icon: Inbox },
    { to: '/app/insights',      label: 'Insights',    icon: BarChart2 },
    { to: '/app/messages',      label: 'Messages',    icon: MessageSquare, badge: true },
    { to: '/app/how-it-works',  label: 'How It Works',icon: HelpCircle },
  ],
  admin: [
    { to: '/app',               label: 'Dashboard',   icon: LayoutDashboard, end: true },
    { to: '/app/queue',         label: 'All Tickets', icon: Inbox },
    { to: '/app/insights',      label: 'Insights',    icon: BarChart2 },
    { to: '/app/messages',      label: 'Messages',    icon: MessageSquare, badge: true },
    { to: '/app/admin',         label: 'Admin Panel', icon: Settings },
    { to: '/app/reports',       label: 'Reports',     icon: FileText },
    { to: '/app/how-it-works',  label: 'How It Works',icon: HelpCircle },
  ],
}

const roleColors = {
  user:  'text-blue-600 bg-blue-50 border-blue-200',
  agent: 'text-violet-600 bg-violet-50 border-violet-200',
  admin: 'text-emerald-600 bg-emerald-50 border-emerald-200',
}

const agentChannelLabel = {
  whatsapp: 'WhatsApp Agent', email: 'Email Agent',
  phone: 'Phone Agent', chat: 'Chat Agent', web: 'Web Agent',
}

export default function AppLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { unreadForRole } = useNotifications()
  const { theme, toggle } = useTheme()
  const unreadCount = unreadForRole(user?.role)
  const [collapsed, setCollapsed] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [msgUnread, setMsgUnread] = useState(0)

  useEffect(() => {
    if (!user || user.role === 'user') return
    const fetchUnread = async () => {
      try {
        const { data } = await import('../api/axios').then(m => m.default.get('/internal/unread'))
        setMsgUnread(data.unread || 0)
      } catch { /* silent */ }
    }
    fetchUnread()
    const t = setInterval(fetchUnread, 10000)
    return () => clearInterval(t)
  }, [user])

  const items = navByRole[user?.role] || navByRole.user
  const handleLogout = () => { logout(); navigate('/') }
  const displayRole = user?.role === 'agent' && user?.agent_channel
    ? (agentChannelLabel[user.agent_channel] || `${user.agent_channel} Agent`)
    : user?.role

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg-base)', color: 'var(--text-primary)' }}>

      {/* Sidebar */}
      <aside
        className={`relative flex flex-col border-r transition-all duration-300 ${collapsed ? 'w-16' : 'w-60'}`}
        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
      >
        {/* Logo */}
        <div className="h-14 flex items-center px-4 gap-3 shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="w-7 h-7 rounded-lg bg-violet-600/15 border border-violet-500/30 flex items-center justify-center shrink-0">
            <ShieldAlert size={14} className="text-violet-600" />
          </div>
          {!collapsed && (
            <span className="font-semibold text-sm tracking-tight truncate" style={{ color: 'var(--text-primary)' }}>
              SmartResolve <span className="text-violet-600">AI</span>
            </span>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
          {items.map(({ to, label, icon: Icon, end, badge }) => (
            <NavLink key={to} to={to} end={end}
              title={collapsed ? label : undefined}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                  isActive ? 'nav-active font-medium' : ''
                } ${collapsed ? 'justify-center' : ''}`
              }
              style={({ isActive }) => isActive ? {} : { color: 'var(--text-muted)' }}
            >
              <div className="relative shrink-0">
                <Icon size={17} />
                {badge && msgUnread > 0 && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-violet-500 rounded-full" />
                )}
              </div>
              {!collapsed && <span className="truncate flex-1">{label}</span>}
              {!collapsed && badge && msgUnread > 0 && (
                <span className="text-[10px] bg-violet-600 text-white px-1.5 py-0.5 rounded-full shrink-0">{msgUnread}</span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Bottom */}
        <div className="p-3 space-y-2" style={{ borderTop: '1px solid var(--border)' }}>
          <NavLink to="/app/profile"
            title={collapsed ? 'Profile' : undefined}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all w-full ${
                isActive ? 'nav-active font-medium' : ''
              } ${collapsed ? 'justify-center' : ''}`
            }
            style={({ isActive }) => isActive ? {} : { color: 'var(--text-muted)' }}
          >
            <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
              <User size={12} style={{ color: 'var(--text-muted)' }} />
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <div className="text-xs font-medium truncate leading-tight" style={{ color: 'var(--text-primary)' }}>{user?.name}</div>
                <div className={`badge border text-[9px] mt-0.5 ${roleColors[user?.role]}`}>{displayRole}</div>
              </div>
            )}
          </NavLink>

          <button onClick={handleLogout} title="Logout"
            className={`flex items-center gap-2 text-xs w-full px-3 py-1.5 rounded-xl transition-colors hover:text-red-500 ${collapsed ? 'justify-center' : ''}`}
            style={{ color: 'var(--text-muted)' }}
          >
            <LogOut size={14} />
            {!collapsed && 'Logout'}
          </button>
        </div>

        {/* Collapse toggle */}
        <button onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-16 w-6 h-6 rounded-full flex items-center justify-center transition-colors z-10"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
        >
          {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
        </button>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 shrink-0 flex items-center justify-end px-6"
          style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-surface)' }}>
          <div className="flex items-center gap-2">
            <button onClick={toggle}
              className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors"
              style={{ color: 'var(--text-muted)' }}
              title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
            >
              {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
            </button>
            <div className="relative">
              <button onClick={() => setNotifOpen(v => !v)}
                className="relative w-9 h-9 rounded-xl flex items-center justify-center transition-colors"
                style={{ color: 'var(--text-muted)' }}
              >
                <Bell size={17} />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-violet-500 rounded-full" />
                )}
              </button>
              <NotificationPanel open={notifOpen} onClose={() => setNotifOpen(false)} />
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto" style={{ background: 'var(--bg-base)' }}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
