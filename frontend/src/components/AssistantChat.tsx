import { useState, useRef, useEffect } from 'react'
import { api } from '../services/api'

interface Msg { role: 'user' | 'assistant'; text: string; time: string }

function nowTime() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

const SUGGESTIONS = [
  'How much energy did I use this week?',
  "What's my bill forecast?",
  'When are my peak hours?',
  'How can I save electricity?',
  'Any anomalies detected?',
]

export default function AssistantChat({ ratePerKwh }: { ratePerKwh: number }) {
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: 'assistant',
      text: "Hi! I'm your VOLT Energy Assistant 🤖\nAsk me anything about your consumption, forecast, bill, or how to save energy.",
      time: nowTime(),
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef  = useRef<HTMLInputElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, loading])

  async function send(question: string) {
    if (!question.trim() || loading) return
    const q = question.trim()
    setMessages(m => [...m, { role: 'user', text: q, time: nowTime() }])
    setInput('')
    setLoading(true)
    try {
      const res = await api.ask(q, ratePerKwh)
      setMessages(m => [...m, { role: 'assistant', text: res.answer, time: nowTime() }])
    } catch {
      setMessages(m => [...m, { role: 'assistant', text: "I couldn't reach the backend right now — please try again in a moment.", time: nowTime() }])
    } finally {
      setLoading(false)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }

  return (
    <div className="flex flex-col h-full" style={{ minHeight: 0 }}>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-4 pr-1 mb-3" style={{ minHeight: 0 }}>
        {messages.map((m, i) => (
          <div key={i} className={`flex items-end gap-2 fade-in ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
            style={{ animationDelay: `${i * 30}ms` }}>

            {/* Avatar */}
            <div className={`h-7 w-7 rounded-full shrink-0 flex items-center justify-center text-sm ${
              m.role === 'user'
                ? 'bg-volt/20 border border-volt/40'
                : 'bg-cyan/10 border border-cyan/30'
            }`}>
              {m.role === 'user' ? '👤' : '🤖'}
            </div>

            {/* Bubble */}
            <div className={`max-w-[78%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
              m.role === 'user' ? 'bubble-user rounded-br-md' : 'bubble-bot rounded-bl-md'
            }`}>
              <p className="whitespace-pre-wrap">{m.text}</p>
              <p className={`text-[9px] mt-1.5 font-display tracking-wide ${
                m.role === 'user' ? 'text-white/40 text-right' : 'text-muted/70'
              }`}>{m.time}</p>
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {loading && (
          <div className="flex items-end gap-2 fade-in">
            <div className="h-7 w-7 rounded-full bg-cyan/10 border border-cyan/30 flex items-center justify-center text-sm shrink-0">🤖</div>
            <div className="bubble-bot rounded-bl-md px-4 py-3 flex items-center gap-1.5">
              <div className="typing-dot h-2 w-2 rounded-full bg-muted" />
              <div className="typing-dot h-2 w-2 rounded-full bg-muted" />
              <div className="typing-dot h-2 w-2 rounded-full bg-muted" />
            </div>
          </div>
        )}
      </div>

      {/* Suggestion chips — only show when no messages beyond initial */}
      {messages.length <= 1 && (
        <div className="flex flex-wrap gap-1.5 mb-3 fade-in">
          {SUGGESTIONS.map(s => (
            <button key={s} onClick={() => send(s)}
              className="text-[10px] px-2.5 py-1.5 rounded-full border border-edge text-muted hover:text-cyan hover:border-cyan/40 transition-colors font-display leading-none">
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input row */}
      <form onSubmit={e => { e.preventDefault(); send(input) }}
        className="flex gap-2 items-center shrink-0">
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Ask about your energy…"
          disabled={loading}
          className="flex-1 bg-panel2 border border-edge rounded-2xl px-4 py-3 text-sm outline-none focus:border-volt/50 placeholder:text-muted/50 text-white disabled:opacity-60 transition-colors"
          style={{ background: 'rgba(19,19,58,0.80)' }}
        />
        <button type="submit" disabled={loading || !input.trim()}
          className="h-11 w-11 rounded-2xl flex items-center justify-center shrink-0 transition-all active:scale-90 disabled:opacity-40"
          style={{ background: 'linear-gradient(135deg, #a78bfa, #60a5fa)' }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
            <line x1="22" y1="2" x2="11" y2="13"/>
            <polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
        </button>
      </form>
    </div>
  )
}
