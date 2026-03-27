import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'
import {
  Send, MessageCircle, History, Sparkles, ChevronRight,
  Trash2, Check, CheckCheck, Zap, Globe
} from 'lucide-react'
import toast from 'react-hot-toast'

function formatTime(isoStr) {
  if (!isoStr) return ''
  return new Date(isoStr).toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata',
  })
}
function formatDateFull(isoStr) {
  if (!isoStr) return ''
  return new Date(isoStr).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata',
  })
}

function SystemMessage({ text }) {
  return (
    <div className="flex items-center gap-3 my-2">
      <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
      <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ color: 'var(--text-muted)', background: 'var(--bg-elevated)' }}>
        {text}
      </span>
      <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
    </div>
  )
}

function TypingBubble({ name }) {
  return (
    <div className="flex items-end gap-2 justify-start">
      <div className="w-6 h-6 rounded-full bg-violet-600/20 flex items-center justify-center text-[10px] font-bold text-violet-400 shrink-0">
        {name?.[0]?.toUpperCase() || '?'}
      </div>
      <div className="rounded-2xl rounded-bl-sm px-4 py-3" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
        <div className="flex items-center gap-1">
          {[0, 1, 2].map(i => (
            <motion.div key={i} className="w-1.5 h-1.5 rounded-full bg-violet-400"
              animate={{ y: [0, -4, 0] }}
              transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
            />
          ))}
        </div>
      </div>
      <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{name} is typing...</span>
    </div>
  )
}

function MessageBubble({ msg, isMine, canDelete, onDelete }) {
  const [hovering, setHovering] = useState(false)
  if (msg.msg_type === 'system') return <SystemMessage text={msg.text} />

  return (
    <div className={`flex items-end gap-1.5 ${isMine ? 'justify-end' : 'justify-start'}`}
      onMouseEnter={() => setHovering(true)} onMouseLeave={() => setHovering(false)}>
      {!isMine && (
        <div className="w-6 h-6 rounded-full bg-violet-600/20 flex items-center justify-center text-[10px] font-bold text-violet-400 shrink-0 mb-0.5">
          {msg.sender_name?.[0]?.toUpperCase() || '?'}
        </div>
      )}
      {isMine && canDelete && hovering && (
        <button onClick={() => onDelete(msg.id)}
          className="w-6 h-6 rounded-lg flex items-center justify-center hover:text-red-400 transition-colors shrink-0"
          style={{ color: 'var(--text-muted)' }}>
          <Trash2 size={11} />
        </button>
      )}
      <div className={`max-w-[72%] rounded-2xl px-3.5 py-2.5 ${isMine ? 'bg-violet-600 text-white rounded-br-sm' : 'rounded-bl-sm'}`}
        style={!isMine ? { background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)' } : {}}>
        {!isMine && (
          <div className="text-[10px] font-semibold mb-1 capitalize text-violet-400">{msg.sender_name}</div>
        )}
        <p className="text-xs leading-relaxed break-words">{msg.text}</p>
        <div className={`flex items-center justify-end gap-1 mt-1 ${isMine ? 'text-violet-200/60' : ''}`}
          style={!isMine ? { color: 'var(--text-muted)' } : {}}>
          <span className="text-[10px]">{formatTime(msg.at)}</span>
          {isMine && (
            msg.read
              ? <CheckCheck size={11} className="text-violet-200" />
              : <Check size={11} className="text-violet-200/50" />
          )}
        </div>
      </div>
    </div>
  )
}

function PastSession({ session }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <div className="rounded-xl overflow-hidden mb-2" style={{ border: '1px solid var(--border)' }}>
      <button onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center justify-between px-3 py-2.5 text-left transition-colors hover:bg-violet-500/5"
        style={{ background: 'var(--bg-elevated)' }}>
        <div className="flex items-center gap-2 min-w-0">
          <History size={11} style={{ color: 'var(--text-muted)' }} className="shrink-0" />
          <span className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{session.session_label}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-2">
          <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{formatDateFull(session.escalated_at)}</span>
          <ChevronRight size={11} className={`transition-transform ${expanded ? 'rotate-90' : ''}`} style={{ color: 'var(--text-muted)' }} />
        </div>
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
            {session.chat_summary && (
              <div className="flex items-start gap-2 px-3 py-2.5 bg-violet-500/5" style={{ borderBottom: '1px solid var(--border)' }}>
                <Sparkles size={10} className="text-violet-400 mt-0.5 shrink-0" />
                <p className="text-[11px] text-violet-400/80 leading-relaxed italic">{session.chat_summary}</p>
              </div>
            )}
            <div className="p-3 space-y-2 max-h-48 overflow-y-auto">
              {!session.messages?.length
                ? <p className="text-xs text-center py-3" style={{ color: 'var(--text-muted)' }}>No messages in this session.</p>
                : session.messages.map(msg => <MessageBubble key={msg.id} msg={msg} isMine={false} canDelete={false} />)
              }
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function ChatBox({ complaintId, assignedAgent, channel = 'web', readOnly = false }) {
  const { user } = useAuth()
  const [current, setCurrent] = useState([])
  const [pastSessions, setPastSessions] = useState([])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [typers, setTypers] = useState([])
  const [quickReplies, setQuickReplies] = useState([])
  const [loadingQR, setLoadingQR] = useState(false)
  const bottomRef = useRef(null)
  const pollRef = useRef(null)
  const typingRef = useRef(null)
  const isTypingRef = useRef(false)

  const isWebChannel = channel === 'web' || channel === 'chat'
  const canSend = !readOnly && (user?.role === 'user' || user?.role === 'agent')

  const fetchMessages = useCallback(async () => {
    try {
      const { data } = await api.get(`/complaints/${complaintId}/messages`)
      setCurrent(data.current || [])
      setPastSessions(data.past_sessions || [])
    } catch { }
  }, [complaintId])

  const fetchTyping = useCallback(async () => {
    try {
      const { data } = await api.get(`/complaints/${complaintId}/typing`)
      setTypers(data.typers || [])
    } catch { }
  }, [complaintId])

  const fetchQuickReplies = useCallback(async () => {
    if (!canSend || user?.role !== 'user') return
    setLoadingQR(true)
    try {
      const { data } = await api.get(`/complaints/${complaintId}/quick-replies`)
      setQuickReplies(data.suggestions || [])
    } catch { }
    finally { setLoadingQR(false) }
  }, [complaintId, canSend, user?.role])

  // Messages poll every 3s, typing poll every 2s separately
  useEffect(() => {
    fetchMessages()
    const msgPoll = setInterval(fetchMessages, 3000)
    const typingPoll = setInterval(fetchTyping, 2000)
    return () => { clearInterval(msgPoll); clearInterval(typingPoll) }
  }, [fetchMessages, fetchTyping])

  // Fetch quick replies when new agent message arrives
  useEffect(() => {
    const lastMsg = current[current.length - 1]
    if (lastMsg?.sender_role === 'agent') fetchQuickReplies()
  }, [current.length])

  // Scroll to bottom on new messages — scroll within chat container only
  useEffect(() => {
    if (bottomRef.current) {
      const container = bottomRef.current.closest('.overflow-y-auto')
      if (container) {
        container.scrollTop = container.scrollHeight
      }
    }
  }, [current, typers])

  // Typing indicator logic
  const sendTyping = useCallback(async (isTyping) => {
    try { await api.post(`/complaints/${complaintId}/typing`, { is_typing: isTyping }) } catch { }
  }, [complaintId])

  const handleTextChange = (e) => {
    setText(e.target.value)
    if (!isTypingRef.current) {
      isTypingRef.current = true
      sendTyping(true)
    }
    clearTimeout(typingRef.current)
    typingRef.current = setTimeout(() => {
      isTypingRef.current = false
      sendTyping(false)
    }, 6000)
  }

  const send = async (e, quickText) => {
    e?.preventDefault()
    const msg = quickText || text
    if (!msg.trim()) return
    setSending(true)
    clearTimeout(typingRef.current)
    isTypingRef.current = false
    sendTyping(false)
    try {
      const { data } = await api.post(`/complaints/${complaintId}/messages`, { text: msg })
      setCurrent(p => [...p, data])
      setText('')
      setQuickReplies([])
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to send')
    } finally { setSending(false) }
  }

  const deleteMsg = async (msgId) => {
    try {
      await api.delete(`/complaints/${complaintId}/messages/${msgId}`)
      setCurrent(p => p.filter(m => m.id !== msgId))
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Delete failed')
    }
  }

  const isMine = (msg) => msg.sender_id === user?.id
  const canDeleteMsg = (msg) => !readOnly && (user?.role === 'admin' || msg.sender_id === user?.id)
  const totalCount = current.length + pastSessions.reduce((s, p) => s + (p.messages?.length || 0), 0)

  return (
    <div className="rounded-2xl overflow-hidden flex flex-col" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', height: '520px' }}>

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 shrink-0" style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-elevated)' }}>
        <div className="w-8 h-8 rounded-xl bg-violet-600/15 flex items-center justify-center">
          <Globe size={15} className="text-violet-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              {readOnly ? 'Chat History' : 'Live Support Chat'}
            </span>
            {totalCount > 0 && (
              <span className="text-[10px] bg-violet-600 text-white px-1.5 py-0.5 rounded-full">{totalCount}</span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            {assignedAgent
              ? <><div className="w-1.5 h-1.5 rounded-full bg-emerald-400" /><span className="text-[10px] text-emerald-400">{assignedAgent} · Online</span></>
              : <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Waiting for agent assignment...</span>
            }
          </div>
        </div>
        {!readOnly && <MessageCircle size={14} className="text-violet-400 shrink-0" />}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {/* Past sessions */}
        {pastSessions.length > 0 && (
          <div className="mb-3">
            <p className="text-[10px] uppercase tracking-widest text-center mb-2" style={{ color: 'var(--text-muted)' }}>Previous Sessions</p>
            {pastSessions.map((s, i) => <PastSession key={i} session={s} />)}
            <SystemMessage text="Current Session" />
          </div>
        )}

        {current.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-8 text-center">
            <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center mb-3">
              <MessageCircle size={18} className="text-violet-400 opacity-60" />
            </div>
            <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
              {readOnly ? 'No messages yet.' : 'Start the conversation'}
            </p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {readOnly ? '' : assignedAgent ? `${assignedAgent} is assigned and will respond shortly.` : 'An agent will be assigned to your complaint soon.'}
            </p>
          </div>
        ) : (
          current.map(msg => (
            <MessageBubble key={msg.id} msg={msg}
              isMine={isMine(msg)} canDelete={canDeleteMsg(msg)} onDelete={deleteMsg} />
          ))
        )}

        {/* Typing indicator */}
        {typers.map((t, i) => <TypingBubble key={i} name={t.name} />)}
        <div ref={bottomRef} />
      </div>

      {/* Quick replies */}
      {canSend && user?.role === 'user' && quickReplies.length > 0 && (
        <div className="px-3 pb-2 flex gap-2 flex-wrap shrink-0" style={{ borderTop: '1px solid var(--border)', paddingTop: '8px' }}>
          <div className="flex items-center gap-1 w-full mb-1">
            <Zap size={10} className="text-violet-400" />
            <span className="text-[10px] text-violet-400 font-medium">Quick replies</span>
          </div>
          {quickReplies.map((qr, i) => (
            <button key={i} onClick={() => send(null, qr)}
              className="text-xs px-3 py-1.5 rounded-xl transition-colors hover:bg-violet-500/20 hover:text-violet-300"
              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
              {qr}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      {canSend && (
        <form onSubmit={send} className="flex items-center gap-2 p-3 shrink-0" style={{ borderTop: '1px solid var(--border)' }}>
          <input
            value={text}
            onChange={handleTextChange}
            placeholder={assignedAgent ? `Message ${assignedAgent}...` : 'Type a message...'}
            className="input-field flex-1 py-2 text-sm"
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send(e)}
          />
          <button type="submit" disabled={sending || !text.trim()}
            className="w-9 h-9 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-40 flex items-center justify-center transition-colors shrink-0">
            {sending
              ? <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : <Send size={14} />
            }
          </button>
        </form>
      )}
    </div>
  )
}
