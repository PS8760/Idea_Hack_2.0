import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'
import {
  Send, MessageSquare, ChevronLeft, Circle, Search,
  Mail, Phone, Globe, MessageCircle, Zap, Users
} from 'lucide-react'
import toast from 'react-hot-toast'

const CHANNEL_ICONS = {
  whatsapp: MessageSquare, email: Mail, phone: Phone,
  web: Globe, chat: MessageCircle,
}
const SPEC_COLORS = {
  Billing: 'text-blue-400', Technical: 'text-violet-400',
  Delivery: 'text-yellow-400', Product: 'text-pink-400',
  Service: 'text-orange-400', Account: 'text-emerald-400',
  General: 'text-slate-400',
}

function fmt(isoStr) {
  if (!isoStr) return ''
  return new Date(isoStr).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
    timeZone: 'Asia/Kolkata',
  })
}
function timeAgo(isoStr) {
  if (!isoStr) return ''
  const diff = Math.floor((Date.now() - new Date(isoStr)) / 1000)
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

export default function InternalChat() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'

  const [threads, setThreads] = useState([])
  const [activeThread, setActiveThread] = useState(null)
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [loadingThreads, setLoadingThreads] = useState(true)
  const [loadingMsgs, setLoadingMsgs] = useState(false)
  const [search, setSearch] = useState('')
  const bottomRef = useRef(null)
  const pollRef = useRef(null)
  const inputRef = useRef(null)

  const agentThreadId = isAdmin ? activeThread : user?.id

  const fetchThreads = useCallback(async () => {
    try {
      const { data } = await api.get('/internal/threads')
      setThreads(data)
      if (!isAdmin && data.length > 0 && !activeThread) {
        setActiveThread(data[0].agent_id)
      }
    } catch { }
    finally { setLoadingThreads(false) }
  }, [isAdmin])

  const fetchMessages = useCallback(async (threadId) => {
    if (!threadId) return
    setLoadingMsgs(true)
    try {
      const { data } = await api.get(`/internal/threads/${threadId}/messages`)
      setMessages(data)
      setThreads(prev => prev.map(t => t.agent_id === threadId ? { ...t, unread: 0 } : t))
    } catch { }
    finally { setLoadingMsgs(false) }
  }, [])

  useEffect(() => { fetchThreads() }, [fetchThreads])

  useEffect(() => {
    if (!isAdmin && user?.id) setActiveThread(user.id)
  }, [isAdmin, user?.id])

  useEffect(() => {
    if (!agentThreadId) return
    fetchMessages(agentThreadId)
    pollRef.current = setInterval(() => fetchMessages(agentThreadId), 4000)
    return () => clearInterval(pollRef.current)
  }, [agentThreadId, fetchMessages])

  useEffect(() => {
    if (bottomRef.current) {
      const container = bottomRef.current.closest('.overflow-y-auto')
      if (container) container.scrollTop = container.scrollHeight
    }
  }, [messages])

  const openThread = (agentId) => {
    setActiveThread(agentId)
    setMessages([])
    setTimeout(() => inputRef.current?.focus(), 100)
  }

  const send = async (e) => {
    e.preventDefault()
    if (!text.trim() || !agentThreadId) return
    setSending(true)
    try {
      const { data } = await api.post(`/internal/threads/${agentThreadId}/messages`, { text })
      setMessages(p => [...p, data])
      setText('')
      fetchThreads()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to send')
    } finally { setSending(false) }
  }

  const isMine = (msg) => msg.sender_id === user?.id
  const activeThreadData = threads.find(t => t.agent_id === agentThreadId)

  const filteredThreads = threads.filter(t =>
    !search || t.agent_name?.toLowerCase().includes(search.toLowerCase()) ||
    t.specialization?.toLowerCase().includes(search.toLowerCase())
  )

  const unreadTotal = threads.reduce((s, t) => s + (t.unread || 0), 0)

  return (
    <div className="flex h-full" style={{ background: 'var(--bg-base)' }}>

      {/* ── Sidebar ── */}
      {isAdmin && (
        <div className="w-72 shrink-0 border-r flex flex-col" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>

          {/* Header */}
          <div className="px-4 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Users size={15} className="text-violet-400" />
                <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Agent Messages</span>
              </div>
              {unreadTotal > 0 && (
                <span className="text-[10px] bg-violet-600 text-white px-2 py-0.5 rounded-full font-semibold">
                  {unreadTotal} new
                </span>
              )}
            </div>
            {/* Search */}
            <div className="flex items-center gap-2 rounded-xl px-3 py-2" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
              <Search size={12} style={{ color: 'var(--text-muted)' }} />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search agents..."
                className="text-xs bg-transparent outline-none flex-1"
                style={{ color: 'var(--text-primary)' }} />
            </div>
          </div>

          {/* Thread list */}
          <div className="flex-1 overflow-y-auto">
            {loadingThreads ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-5 h-5 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : filteredThreads.length === 0 ? (
              <div className="text-center py-12 px-4">
                <Users size={24} className="mx-auto mb-2 opacity-30" style={{ color: 'var(--text-muted)' }} />
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>No agents found</p>
              </div>
            ) : (
              filteredThreads.map(t => {
                const ChannelIcon = CHANNEL_ICONS[t.agent_channel] || Globe
                const specColor = SPEC_COLORS[t.specialization] || 'text-slate-400'
                const isActive = activeThread === t.agent_id
                return (
                  <button key={t.agent_id} onClick={() => openThread(t.agent_id)}
                    className="w-full flex items-start gap-3 px-4 py-3.5 text-left transition-colors"
                    style={{
                      borderBottom: '1px solid var(--border)',
                      background: isActive ? 'var(--bg-elevated)' : 'transparent',
                      borderLeft: isActive ? '2px solid #7c3aed' : '2px solid transparent',
                    }}
                    onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--bg-elevated)' }}
                    onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
                  >
                    {/* Avatar */}
                    <div className="relative shrink-0">
                      <div className="w-9 h-9 rounded-full bg-violet-600/20 flex items-center justify-center text-sm font-bold text-violet-400">
                        {t.agent_name?.[0]?.toUpperCase() || '?'}
                      </div>
                      <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2"
                        style={{ borderColor: 'var(--bg-surface)' }} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{t.agent_name}</span>
                        <div className="flex items-center gap-1.5 shrink-0 ml-1">
                          {t.unread > 0 && (
                            <span className="text-[10px] bg-violet-600 text-white px-1.5 py-0.5 rounded-full font-semibold">{t.unread}</span>
                          )}
                          {t.last_at && <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{timeAgo(t.last_at)}</span>}
                        </div>
                      </div>

                      {/* Channel + Specialization */}
                      <div className="flex items-center gap-1.5 mb-1">
                        <ChannelIcon size={10} style={{ color: 'var(--text-muted)' }} />
                        <span className="text-[10px] capitalize" style={{ color: 'var(--text-muted)' }}>{t.agent_channel}</span>
                        <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>·</span>
                        <span className={`text-[10px] font-medium ${specColor}`}>{t.specialization}</span>
                      </div>

                      {/* Last message or CTA */}
                      {t.last_msg ? (
                        <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{t.last_msg}</p>
                      ) : (
                        <p className="text-xs italic" style={{ color: 'var(--text-muted)' }}>Click to start conversation</p>
                      )}
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}

      {/* ── Chat area ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {!agentThreadId ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-violet-500/10 flex items-center justify-center">
              <MessageSquare size={28} className="text-violet-400 opacity-60" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>Select an agent to message</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {threads.length > 0 ? `${threads.length} agent${threads.length > 1 ? 's' : ''} available` : 'No agents registered yet'}
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Thread header */}
            <div className="h-14 shrink-0 flex items-center gap-3 px-5" style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-surface)' }}>
              {isAdmin && (
                <button onClick={() => setActiveThread(null)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:bg-slate-800/30 mr-1"
                  style={{ color: 'var(--text-muted)' }}>
                  <ChevronLeft size={15} />
                </button>
              )}
              <div className="relative">
                <div className="w-8 h-8 rounded-full bg-violet-600/20 flex items-center justify-center text-xs font-bold text-violet-400">
                  {isAdmin ? (activeThreadData?.agent_name?.[0]?.toUpperCase() || '?') : 'A'}
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2"
                  style={{ borderColor: 'var(--bg-surface)' }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {isAdmin ? (activeThreadData?.agent_name || 'Agent') : 'Admin'}
                </p>
                <div className="flex items-center gap-2">
                  <Circle size={6} className="text-emerald-400 fill-emerald-400" />
                  <span className="text-[10px] text-emerald-400">Online</span>
                  {isAdmin && activeThreadData?.specialization && (
                    <>
                      <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>·</span>
                      <span className={`text-[10px] font-medium ${SPEC_COLORS[activeThreadData.specialization] || 'text-slate-400'}`}>
                        {activeThreadData.specialization} Specialist
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              {loadingMsgs ? (
                <div className="flex items-center justify-center py-16">
                  <div className="w-5 h-5 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-16 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-violet-500/10 flex items-center justify-center mb-3">
                    <Zap size={20} className="text-violet-400 opacity-60" />
                  </div>
                  <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>Start the conversation</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {isAdmin
                      ? `Send a message to ${activeThreadData?.agent_name || 'this agent'}`
                      : 'Send a message to the admin team'}
                  </p>
                </div>
              ) : (
                messages.map((msg, i) => {
                  const mine = isMine(msg)
                  const showDate = i === 0 || new Date(messages[i-1].at).toDateString() !== new Date(msg.at).toDateString()
                  return (
                    <div key={msg.id}>
                      {showDate && (
                        <div className="flex items-center gap-3 my-4">
                          <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
                          <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ color: 'var(--text-muted)', background: 'var(--bg-elevated)' }}>
                            {new Date(msg.at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', timeZone: 'Asia/Kolkata' })}
                          </span>
                          <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
                        </div>
                      )}
                      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                        className={`flex items-end gap-2 ${mine ? 'justify-end' : 'justify-start'}`}>
                        {!mine && (
                          <div className="w-6 h-6 rounded-full bg-violet-600/20 flex items-center justify-center text-[10px] font-bold text-violet-400 shrink-0 mb-0.5">
                            {msg.sender_name?.[0]?.toUpperCase() || '?'}
                          </div>
                        )}
                        <div className={`max-w-[68%] rounded-2xl px-4 py-2.5 ${mine ? 'bg-violet-600 text-white rounded-br-sm' : 'rounded-bl-sm'}`}
                          style={!mine ? { background: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-primary)' } : {}}>
                          {!mine && (
                            <p className="text-[10px] font-semibold mb-1 text-violet-400">{msg.sender_name}</p>
                          )}
                          <p className="text-sm leading-relaxed break-words">{msg.text}</p>
                          <p className={`text-[10px] mt-1.5 ${mine ? 'text-violet-200/60' : ''}`}
                            style={!mine ? { color: 'var(--text-muted)' } : {}}>
                            {fmt(msg.at)}
                          </p>
                        </div>
                      </motion.div>
                    </div>
                  )
                })
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <form onSubmit={send} className="flex items-center gap-3 px-5 py-4 shrink-0"
              style={{ borderTop: '1px solid var(--border)', background: 'var(--bg-surface)' }}>
              <input ref={inputRef} value={text} onChange={e => setText(e.target.value)}
                placeholder={`Message ${isAdmin ? (activeThreadData?.agent_name || 'agent') : 'admin'}...`}
                className="input-field flex-1"
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send(e)}
              />
              <button type="submit" disabled={sending || !text.trim()}
                className="w-10 h-10 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-40 flex items-center justify-center transition-colors shrink-0">
                {sending
                  ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : <Send size={15} />
                }
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
