import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bot, X, Send, Loader2, Sparkles, RotateCcw } from 'lucide-react'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'

const WELCOME = "Hi! I'm your AI support assistant. I can help you understand your complaint status, guide you through next steps, or answer questions. What would you like to know?"

export default function AIAssistant({ complaintId, complaintTitle, complaintCategory }) {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [conversation, setConversation] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    if (open && conversation.length === 0) {
      setConversation([{ role: 'assistant', content: WELCOME }])
    }
  }, [open])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [conversation, loading])

  const send = async (text) => {
    if (!text.trim() || loading) return
    const userMsg = { role: 'user', content: text }
    const updated = [...conversation, userMsg]
    setConversation(updated)
    setInput('')
    setLoading(true)
    try {
      const { data } = await api.post(`/complaints/${complaintId}/assist`, {
        conversation: updated,
      })
      setConversation(prev => [...prev, { role: 'assistant', content: data.reply }])
    } catch {
      setConversation(prev => [...prev, {
        role: 'assistant',
        content: "Sorry, I'm having trouble connecting right now. Please try again in a moment."
      }])
    } finally {
      setLoading(false) }
  }

  const reset = () => setConversation([{ role: 'assistant', content: WELCOME }])

  // Quick suggestion chips
  const chips = [
    'What is the status of my complaint?',
    'How long will this take?',
    'What are my next steps?',
    'Can I escalate this?',
  ]

  if (!user || user.role !== 'user') return null

  return (
    <>
      {/* Floating button */}
      <motion.button
        onClick={() => setOpen(v => !v)}
        whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-2xl bg-violet-600 hover:bg-violet-700 text-white shadow-lg shadow-violet-500/30 flex items-center justify-center z-50 transition-colors"
        title="AI Assistant"
      >
        <AnimatePresence mode="wait">
          {open
            ? <motion.div key="x" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}><X size={22} /></motion.div>
            : <motion.div key="bot" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }}><Bot size={22} /></motion.div>
          }
        </AnimatePresence>
      </motion.button>

      {/* Chat panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-24 right-6 w-80 rounded-2xl shadow-xl z-50 flex flex-col overflow-hidden"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', maxHeight: '480px' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 shrink-0"
              style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-elevated)' }}>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-violet-600/15 flex items-center justify-center">
                  <Sparkles size={14} className="text-violet-600" />
                </div>
                <div>
                  <div className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>AI Assistant</div>
                  <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                    {complaintTitle ? `Re: ${complaintTitle.slice(0, 28)}…` : 'Step-by-step support'}
                  </div>
                </div>
              </div>
              <button onClick={reset} title="Reset conversation"
                className="w-6 h-6 rounded-lg flex items-center justify-center transition-colors"
                style={{ color: 'var(--text-muted)' }}>
                <RotateCcw size={12} />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {conversation.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.role === 'assistant' && (
                    <div className="w-6 h-6 rounded-full bg-violet-600/15 flex items-center justify-center shrink-0 mr-2 mt-0.5">
                      <Bot size={12} className="text-violet-600" />
                    </div>
                  )}
                  <div
                    className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-violet-600 text-white rounded-br-sm'
                        : 'rounded-bl-sm'
                    }`}
                    style={msg.role === 'assistant' ? {
                      background: 'var(--bg-elevated)',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border)'
                    } : {}}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="w-6 h-6 rounded-full bg-violet-600/15 flex items-center justify-center shrink-0 mr-2">
                    <Bot size={12} className="text-violet-600" />
                  </div>
                  <div className="rounded-2xl rounded-bl-sm px-3 py-2.5 flex items-center gap-1.5"
                    style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                    {[0, 1, 2].map(i => (
                      <span key={i} className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce"
                        style={{ animationDelay: `${i * 0.15}s` }} />
                    ))}
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Quick chips — show only at start */}
            {conversation.length <= 1 && (
              <div className="px-3 pb-2 flex flex-wrap gap-1.5 shrink-0">
                {chips.map(chip => (
                  <button key={chip} onClick={() => send(chip)}
                    className="text-[10px] px-2.5 py-1 rounded-full border transition-colors hover:border-violet-400 hover:text-violet-600"
                    style={{ borderColor: 'var(--border)', color: 'var(--text-muted)', background: 'var(--bg-elevated)' }}>
                    {chip}
                  </button>
                ))}
              </div>
            )}

            {/* Input */}
            <form onSubmit={e => { e.preventDefault(); send(input) }}
              className="flex items-center gap-2 p-3 shrink-0"
              style={{ borderTop: '1px solid var(--border)' }}>
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Ask me anything…"
                className="input-field flex-1 py-2 text-xs"
                disabled={loading}
              />
              <button type="submit" disabled={loading || !input.trim()}
                className="w-8 h-8 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-40 flex items-center justify-center transition-colors shrink-0">
                {loading ? <Loader2 size={13} className="animate-spin text-white" /> : <Send size={13} className="text-white" />}
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
