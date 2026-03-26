import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { NotificationProvider } from './context/NotificationContext'
import { ThemeProvider } from './context/ThemeContext'
import { Toaster } from 'react-hot-toast'
import ErrorBoundary from './components/ErrorBoundary'

// Public pages
import Landing from './pages/Landing'
import Contact from './pages/Contact'
import Login from './pages/Login'
import Register from './pages/Register'

// Layout
import AppLayout from './components/AppLayout'

// App pages
import Dashboard from './pages/Dashboard'
import ComplaintDetail from './pages/ComplaintDetail'
import Insights from './pages/Insights'
import SubmitComplaint from './pages/SubmitComplaint'
import MyComplaints from './pages/MyComplaints'
import AgentQueue from './pages/AgentQueue'
import AdminPanel from './pages/AdminPanel'
import Profile from './pages/Profile'
import InternalChat from './pages/InternalChat'

function RoleRoute({ children, roles }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div className="flex items-center justify-center h-screen" style={{ background: 'var(--bg-base)' }}>
      <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
  if (!user) return <Navigate to="/login" replace />
  if (roles && !roles.includes(user.role)) return <Navigate to="/app" replace />
  return children
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <NotificationProvider>
            <Toaster
              position="top-right"
              toastOptions={{
                style: { background: 'var(--bg-surface)', color: 'var(--text-primary)', border: '1px solid var(--border)', fontSize: '0.875rem' },
                success: { iconTheme: { primary: '#7c3aed', secondary: '#fff' } },
              }}
            />
            <Routes>
          {/* Public */}
          <Route path="/" element={<Landing />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* App shell */}
          <Route path="/app" element={<RoleRoute><AppLayout /></RoleRoute>}>
            <Route index element={<Dashboard />} />
            <Route path="complaints/:id" element={<ComplaintDetail />} />
            <Route path="profile" element={<Profile />} />
            <Route path="insights" element={<RoleRoute roles={['admin','agent']}><Insights /></RoleRoute>} />

            {/* User */}
            <Route path="submit" element={<RoleRoute roles={['user']}><SubmitComplaint /></RoleRoute>} />
            <Route path="my-complaints" element={<RoleRoute roles={['user']}><MyComplaints /></RoleRoute>} />

            {/* Agent + Admin */}
            <Route path="queue" element={<RoleRoute roles={['agent','admin']}><AgentQueue /></RoleRoute>} />

            {/* Admin */}
            <Route path="admin" element={<RoleRoute roles={['admin']}><AdminPanel /></RoleRoute>} />
            <Route path="messages" element={<RoleRoute roles={['admin','agent']}><InternalChat /></RoleRoute>} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </NotificationProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  )
}
