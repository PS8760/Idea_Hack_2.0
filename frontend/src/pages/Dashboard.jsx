import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'
import ComplaintCard from '../components/ComplaintCard'
import { PlusCircle, RefreshCw, TrendingUp, Clock, AlertCircle, CheckCircle2 } from 'lucide-react'
import toast from 'react-hot-toast'

const STATUSES = ['all', 'open', 'in-progress', 'resolved']
const PRIORITIES = ['all', 'high', 'medium', 'low']

export default function Dashboard() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [complaints, setComplaints] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [search, setSearch] = useState('')

  const fetchComplaints = async () => {
    setLoading(true)
    try {
      const params = {}
      if (statusFilter !== 'all') params.status = statusFilter
      if (priorityFilter !== 'all') params.priority = priorityFilter
      if (search) params.search = search
      const { data } = await api.get('/complaints', { params })
      setComplaints(data)
    } catch {
      toast.error('Failed to load complaints')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchComplaints() }, [statusFilter, priorityFilter])

  const stats = [
    { label: 'Total',       value: complaints.length,                                          icon: TrendingUp,  color: 'text-violet-600', bg: 'bg-violet-50',  border: 'border-violet-200' },
    { label: 'Open',        value: complaints.filter(c => c.status === 'open').length,         icon: AlertCircle, color: 'text-blue-600',   bg: 'bg-blue-50',    border: 'border-blue-200' },
    { label: 'In Progress', value: complaints.filter(c => c.status === 'in-progress').length,  icon: Clock,       color: 'text-yellow-600', bg: 'bg-yellow-50',  border: 'border-yellow-200' },
    { label: 'Resolved',    value: complaints.filter(c => c.status === 'resolved').length,     icon: CheckCircle2,color: 'text-emerald-600',bg: 'bg-emerald-50', border: 'border-emerald-200' },
  ]

  const filtered = complaints.filter(c =>
    !search || c.title.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold">
            {user?.role === 'admin' ? 'Admin Dashboard' : user?.role === 'agent' ? 'Agent Dashboard' : 'My Dashboard'}
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        {user?.role === 'user' && (
          <button onClick={() => navigate('/app/submit')}
            className="btn-primary flex items-center gap-2">
            <PlusCircle size={15} /> New Complaint
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((s, i) => (
          <motion.div key={s.label}
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
            className={`rounded-2xl p-5 border ${s.border} ${s.bg}`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{s.label}</span>
              <div className={`w-8 h-8 rounded-xl bg-white/70 flex items-center justify-center`}>
                <s.icon size={15} className={s.color} />
              </div>
            </div>
            <div className={`text-3xl font-bold ${s.color}`}>{s.value}</div>
          </motion.div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <input
          type="text"
          placeholder="Search complaints..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && fetchComplaints()}
          className="input-field w-52"
        />
        <div className="flex gap-1 rounded-xl p-1" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
          {STATUSES.map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs capitalize transition-colors ${
                statusFilter === s ? 'bg-violet-600 text-white' : ''
              }`}
              style={statusFilter !== s ? { color: 'var(--text-muted)' } : {}}>{s}</button>
          ))}
        </div>
        <div className="flex gap-1 rounded-xl p-1" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
          {PRIORITIES.map(p => (
            <button key={p} onClick={() => setPriorityFilter(p)}
              className={`px-3 py-1.5 rounded-lg text-xs capitalize transition-colors ${
                priorityFilter === p ? 'bg-violet-600 text-white' : ''
              }`}
              style={priorityFilter !== p ? { color: 'var(--text-muted)' } : {}}>{p}</button>
          ))}
        </div>
        <button onClick={fetchComplaints} className="ml-auto text-slate-500 hover:text-slate-300 transition-colors">
          <RefreshCw size={15} />
        </button>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-slate-600">
          <AlertCircle size={32} className="mx-auto mb-3 opacity-40" />
          <p className="text-sm">No complaints found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((c, i) => (
            <motion.div key={c._id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
              <ComplaintCard complaint={c} />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
