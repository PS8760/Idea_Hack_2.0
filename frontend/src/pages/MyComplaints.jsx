import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import api from '../api/axios'
import ComplaintCard from '../components/ComplaintCard'
import { ListChecks, AlertCircle, Trash2, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

export default function MyComplaints() {
  const [complaints, setComplaints] = useState([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState(null)

  useEffect(() => {
    api.get('/complaints/mine')
      .then(({ data }) => setComplaints(data))
      .catch(() => toast.error('Failed to load your complaints'))
      .finally(() => setLoading(false))
  }, [])

  const handleDelete = async (id, e) => {
    e.preventDefault()
    e.stopPropagation()
    if (!window.confirm('Delete this complaint? This cannot be undone.')) return
    setDeletingId(id)
    try {
      await api.delete(`/complaints/${id}`)
      setComplaints(prev => prev.filter(c => c._id !== id))
      toast.success('Complaint deleted')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Delete failed')
    } finally { setDeletingId(null) }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-9 h-9 rounded-xl bg-blue-400/10 flex items-center justify-center">
          <ListChecks size={18} className="text-blue-400" />
        </div>
        <div>
          <h1 className="text-xl font-semibold">My Complaints</h1>
          <p className="text-xs text-slate-500 mt-0.5">{complaints.length} total</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : complaints.length === 0 ? (
        <div className="text-center py-20 text-slate-600">
          <AlertCircle size={32} className="mx-auto mb-3 opacity-40" />
          <p className="text-sm">You haven't submitted any complaints yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {complaints.map((c, i) => (
            <motion.div key={c._id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="relative group">
              <ComplaintCard complaint={c} />
              <button
                onClick={(e) => handleDelete(c._id, e)}
                disabled={deletingId === c._id}
                className="absolute top-3 right-3 w-7 h-7 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all text-red-400 hover:bg-red-500/10 border border-red-500/20"
                title="Delete complaint"
              >
                {deletingId === c._id
                  ? <Loader2 size={12} className="animate-spin" />
                  : <Trash2 size={12} />}
              </button>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
