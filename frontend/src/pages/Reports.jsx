import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import api from '../api/axios'
import toast from 'react-hot-toast'
import {
  FileText, Download, Loader2, Sparkles, AlertTriangle,
  CheckCircle2, Clock, TrendingUp, BarChart2, Shield,
  Filter, Calendar, RefreshCw, Printer,
  MessageSquare, Mail, Phone, Globe, MessageCircle, Activity
} from 'lucide-react'

const CHANNELS = ['all', 'web', 'email', 'whatsapp', 'phone', 'chat']
const STATUSES = ['all', 'open', 'in-progress', 'resolved']

const CHANNEL_ICONS = { web: Globe, email: Mail, whatsapp: MessageSquare, phone: Phone, chat: MessageCircle }

const STATUS_COLOR = {
  open:          'text-blue-400 bg-blue-400/10 border-blue-400/20',
  'in-progress': 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
  resolved:      'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
}
const PRIORITY_COLOR = {
  high:   'text-red-400',
  medium: 'text-yellow-400',
  low:    'text-emerald-400',
}
const SLA_COLOR = {
  'Met':        'text-emerald-400 bg-emerald-400/10',
  'Breached':   'text-red-400 bg-red-400/10',
  'Within SLA': 'text-blue-400 bg-blue-400/10',
  'N/A':        'text-slate-400 bg-slate-400/10',
}

function KPICard({ label, value, sub, color, bg, icon: Icon }) {
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{label}</span>
        <div className={`w-7 h-7 rounded-lg ${bg} flex items-center justify-center`}>
          <Icon size={13} className={color} />
        </div>
      </div>
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      {sub && <div className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{sub}</div>}
    </div>
  )
}

function BreakdownBar({ label, data, colorFn }) {
  const total = Object.values(data).reduce((a, b) => a + b, 0)
  if (!total) return null
  return (
    <div className="card p-4">
      <p className="text-xs font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>{label}</p>
      <div className="space-y-2">
        {Object.entries(data).sort((a, b) => b[1] - a[1]).map(([k, v]) => {
          const pct = Math.round((v / total) * 100)
          return (
            <div key={k}>
              <div className="flex justify-between text-[11px] mb-1">
                <span className="capitalize" style={{ color: 'var(--text-secondary)' }}>{k}</span>
                <span style={{ color: 'var(--text-muted)' }}>{v} ({pct}%)</span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-elevated)' }}>
                <motion.div
                  className={`h-full rounded-full ${colorFn ? colorFn(k) : 'bg-violet-500'}`}
                  initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function Reports() {
  const today = new Date().toISOString().split('T')[0]
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]

  const [filters, setFilters] = useState({ date_from: thirtyDaysAgo, date_to: today, channel: 'all', status: 'all' })
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const printRef = useRef(null)

  const setFilter = (k, v) => setFilters(p => ({ ...p, [k]: v }))

  const fetchReport = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/reports/preview', { params: filters })
      setReport(data)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to load report')
    } finally {
      setLoading(false)
    }
  }

  const downloadCSV = async () => {
    setDownloading(true)
    try {
      const resp = await api.get('/reports/export/csv', {
        params: filters,
        responseType: 'blob',
      })
      const url = URL.createObjectURL(new Blob([resp.data]))
      const a = document.createElement('a')
      a.href = url
      a.download = `complaint_report_${filters.date_from}_to_${filters.date_to}.csv`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('CSV downloaded')
    } catch {
      toast.error('CSV export failed')
    } finally {
      setDownloading(false)
    }
  }

  const handlePrint = () => window.print()

  const summary = report?.summary

  const kpis = summary ? [
    { label: 'Total Complaints',  value: summary.total,              color: 'text-violet-400',  bg: 'bg-violet-400/10',  icon: TrendingUp,    sub: `${filters.date_from} → ${filters.date_to}` },
    { label: 'Resolved',          value: summary.resolved,           color: 'text-emerald-400', bg: 'bg-emerald-400/10', icon: CheckCircle2,  sub: `${summary.total ? Math.round(summary.resolved / summary.total * 100) : 0}% resolution rate` },
    { label: 'SLA Compliance',    value: `${summary.sla_compliance_rate}%`, color: summary.sla_compliance_rate >= 90 ? 'text-emerald-400' : summary.sla_compliance_rate >= 70 ? 'text-yellow-400' : 'text-red-400', bg: 'bg-blue-400/10', icon: Shield, sub: `${summary.sla_breaches} breaches` },
    { label: 'Avg Resolution',    value: summary.avg_resolution_hours ? `${summary.avg_resolution_hours}h` : 'N/A', color: 'text-yellow-400', bg: 'bg-yellow-400/10', icon: Clock, sub: 'average time' },
    { label: 'Open',              value: summary.open,               color: 'text-blue-400',    bg: 'bg-blue-400/10',    icon: Activity,      sub: `${summary.in_progress} in progress` },
    { label: 'Escalated',         value: summary.escalated,          color: 'text-red-400',     bg: 'bg-red-400/10',     icon: AlertTriangle, sub: 'total escalations' },
  ] : []

  return (
    <div className="p-6 max-w-7xl mx-auto" ref={printRef}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-violet-400/10 flex items-center justify-center">
            <FileText size={18} className="text-violet-400" />
          </div>
          <div>
            <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>Complaint Reports</h1>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Regulatory reporting & audit trail</p>
          </div>
        </div>
        {report && (
          <div className="flex items-center gap-2">
            <button onClick={handlePrint}
              className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg border transition-colors hover:bg-slate-800/30"
              style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
              <Printer size={13} /> Print
            </button>
            <button onClick={downloadCSV} disabled={downloading}
              className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white transition-colors">
              {downloading ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
              Export CSV
            </button>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="card p-4 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Filter size={13} className="text-violet-400" />
          <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>Filters</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="text-[10px] block mb-1" style={{ color: 'var(--text-muted)' }}>From</label>
            <input type="date" value={filters.date_from}
              onChange={e => setFilter('date_from', e.target.value)}
              className="input-field text-xs py-1.5" />
          </div>
          <div>
            <label className="text-[10px] block mb-1" style={{ color: 'var(--text-muted)' }}>To</label>
            <input type="date" value={filters.date_to}
              onChange={e => setFilter('date_to', e.target.value)}
              className="input-field text-xs py-1.5" />
          </div>
          <div>
            <label className="text-[10px] block mb-1" style={{ color: 'var(--text-muted)' }}>Channel</label>
            <select value={filters.channel} onChange={e => setFilter('channel', e.target.value)}
              className="input-field text-xs py-1.5">
              {CHANNELS.map(c => <option key={c} value={c}>{c === 'all' ? 'All Channels' : c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] block mb-1" style={{ color: 'var(--text-muted)' }}>Status</label>
            <select value={filters.status} onChange={e => setFilter('status', e.target.value)}
              className="input-field text-xs py-1.5">
              {STATUSES.map(s => <option key={s} value={s}>{s === 'all' ? 'All Statuses' : s}</option>)}
            </select>
          </div>
        </div>
        <button onClick={fetchReport} disabled={loading}
          className="mt-3 flex items-center gap-2 text-xs px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white transition-colors">
          {loading ? <Loader2 size={13} className="animate-spin" /> : <BarChart2 size={13} />}
          Generate Report
        </button>
      </div>

      {/* Results */}
      <AnimatePresence>
        {report && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>

            {/* AI Summary */}
            {report.ai_summary && (
              <div className="card p-4 mb-5 border-violet-500/20"
                style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.06), rgba(59,130,246,0.04))' }}>
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles size={13} className="text-violet-400" />
                  <span className="text-xs font-semibold text-violet-400 uppercase tracking-widest">AI Executive Summary</span>
                </div>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}>{report.ai_summary}</p>
                <p className="text-[10px] mt-2" style={{ color: 'var(--text-muted)' }}>Generated at {report.generated_at}</p>
              </div>
            )}

            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-5">
              {kpis.map((k, i) => (
                <motion.div key={k.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                  <KPICard {...k} />
                </motion.div>
              ))}
            </div>

            {/* Breakdown charts */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
              {summary.by_category && Object.keys(summary.by_category).length > 0 && (
                <BreakdownBar label="By Category" data={summary.by_category} />
              )}
              {summary.by_channel && Object.keys(summary.by_channel).length > 0 && (
                <BreakdownBar label="By Channel" data={summary.by_channel}
                  colorFn={k => k === 'email' ? 'bg-blue-500' : k === 'whatsapp' ? 'bg-emerald-500' : k === 'phone' ? 'bg-yellow-500' : k === 'chat' ? 'bg-violet-500' : 'bg-slate-500'} />
              )}
              {summary.by_priority && Object.keys(summary.by_priority).length > 0 && (
                <BreakdownBar label="By Priority" data={summary.by_priority}
                  colorFn={k => k === 'high' ? 'bg-red-500' : k === 'medium' ? 'bg-yellow-500' : 'bg-emerald-500'} />
              )}
              {summary.by_sentiment && Object.keys(summary.by_sentiment).length > 0 && (
                <BreakdownBar label="By Sentiment" data={summary.by_sentiment}
                  colorFn={k => k === 'negative' ? 'bg-red-500' : k === 'positive' ? 'bg-emerald-500' : 'bg-slate-500'} />
              )}
            </div>

            {/* Top recurring issues */}
            {summary.top_issues?.length > 0 && (
              <div className="card p-4 mb-5">
                <p className="text-xs font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Top Recurring Issues</p>
                <div className="space-y-1.5">
                  {summary.top_issues.map((issue, i) => (
                    <div key={i} className="flex items-center justify-between text-xs py-1.5 border-b last:border-0" style={{ borderColor: 'var(--border)' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>{issue.title}</span>
                      <span className="badge border text-violet-400 bg-violet-400/10 border-violet-400/20">{issue.count}×</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Data table */}
            {report.rows?.length > 0 && (
              <div className="card overflow-hidden">
                <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--border)' }}>
                  <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                    Complaint Register
                    <span className="ml-2 font-normal" style={{ color: 'var(--text-muted)' }}>
                      showing {report.rows.length} of {report.total}
                    </span>
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-elevated)' }}>
                        {['Ref', 'Title', 'Category', 'Channel', 'Priority', 'Status', 'SLA', 'Agent', 'Resolution', 'Created'].map(h => (
                          <th key={h} className="text-left px-3 py-2.5 font-medium whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {report.rows.map((row, i) => {
                        const ChIcon = CHANNEL_ICONS[row.channel] || Globe
                        return (
                          <tr key={i} className="border-b transition-colors hover:bg-slate-800/20" style={{ borderColor: 'var(--border)' }}>
                            <td className="px-3 py-2.5 font-mono text-violet-400 whitespace-nowrap">{row.ref}</td>
                            <td className="px-3 py-2.5 max-w-[180px] truncate" style={{ color: 'var(--text-primary)' }} title={row.title}>{row.title}</td>
                            <td className="px-3 py-2.5 whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>{row.category}</td>
                            <td className="px-3 py-2.5">
                              <span className="flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                                <ChIcon size={11} /> {row.channel}
                              </span>
                            </td>
                            <td className={`px-3 py-2.5 font-medium whitespace-nowrap ${PRIORITY_COLOR[row.priority] || 'text-slate-400'}`}>{row.priority}</td>
                            <td className="px-3 py-2.5">
                              <span className={`badge border text-[10px] ${STATUS_COLOR[row.status] || 'text-slate-400'}`}>{row.status}</span>
                            </td>
                            <td className="px-3 py-2.5">
                              <span className={`badge text-[10px] px-1.5 py-0.5 rounded ${SLA_COLOR[row.sla_status] || 'text-slate-400'}`}>{row.sla_status}</span>
                            </td>
                            <td className="px-3 py-2.5 whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>{row.assigned_agent}</td>
                            <td className="px-3 py-2.5 whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>{row.resolution_time}</td>
                            <td className="px-3 py-2.5 whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>{row.created_at}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {report.total === 0 && (
              <div className="card p-12 text-center">
                <FileText size={32} className="mx-auto mb-3 text-slate-600" />
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No complaints found for the selected period.</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {!report && !loading && (
        <div className="card p-16 text-center">
          <BarChart2 size={40} className="mx-auto mb-4 text-slate-700" />
          <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>No report generated yet</p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Set your filters above and click Generate Report</p>
        </div>
      )}
    </div>
  )
}
