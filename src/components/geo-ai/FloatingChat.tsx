'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import type { GeometrySpec } from '@/types/geo-ai'
import { getShape } from '@/lib/geo-ai/data/index'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Message {
  id: number
  role: 'user' | 'ai'
  text: string
}

interface FloatingChatProps {
  currentShape: GeometrySpec['shape'] | null
  contextObject: string | null
}

// Suggested questions now come from shapes-data.ts

// ---------------------------------------------------------------------------
// TypingDots — AI thinking indicator
// ---------------------------------------------------------------------------

function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-3 py-2">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// FloatingChat
// ---------------------------------------------------------------------------

let msgId = 0

export function FloatingChat({ currentShape, contextObject }: FloatingChatProps) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [question, setQuestion] = useState('')
  const [loading, setLoading] = useState(false)

  // Draggable: start in 3D viewer area (avoid right panel ~280px wide)
  const [pos, setPos] = useState({ right:30, bottom: 140 })
  const dragging = useRef(false)
  const [isDragging, setIsDragging] = useState(false)
  const dragOffset = useRef({ dx: 0, dy: 0 })

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const buttonRef = useRef<HTMLDivElement>(null)

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  // Drag handlers — attach to window so drag works outside button bounds
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return
    dragging.current = true
    setIsDragging(true)
    const rect = buttonRef.current?.getBoundingClientRect()
    if (!rect) return
    dragOffset.current = { dx: e.clientX - rect.left, dy: e.clientY - rect.top }
    e.preventDefault()
  }, [])

  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      if (!dragging.current) return
      const vpW = window.innerWidth
      const vpH = window.innerHeight
      const btnW = 56
      const btnH = 56
      const newLeft = e.clientX - dragOffset.current.dx
      const newTop = e.clientY - dragOffset.current.dy
      setPos({
        right: Math.max(8, Math.min(vpW - btnW - 8, vpW - newLeft - btnW)),
        bottom: Math.max(8, Math.min(vpH - btnH - 8, vpH - newTop - btnH)),
      })
    }

    function onMouseUp() {
      if (!dragging.current) return
      dragging.current = false
      setIsDragging(false)
      // Snap to nearest horizontal edge (iPhone accessibility style)
      const vpW = window.innerWidth
      const btnW = 48
      const MARGIN = 16
      const MIN_BOTTOM = 140
      setPos((prev) => {
        const centerX = vpW - prev.right - btnW / 2
        return {
          right: centerX < vpW / 2 ? vpW - btnW - MARGIN : MARGIN,
          bottom: Math.max(MIN_BOTTOM, prev.bottom),
        }
      })
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [])

  // Submit question
  const submit = useCallback(async (q: string) => {
    const trimmed = q.trim()
    if (!trimmed || loading) return

    const userMsg: Message = { id: ++msgId, role: 'user', text: trimmed }
    setMessages((prev) => [...prev, userMsg])
    setQuestion('')
    setLoading(true)

    try {
      const res = await fetch('/api/geo-ai/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: trimmed,
          shape: currentShape ?? 'general_pyramid',
          contextObject,
        }),
      })
      const data = (await res.json()) as { answer?: string; error?: string }
      const text = data.answer ?? data.error ?? 'Không có câu trả lời.'
      setMessages((prev) => [...prev, { id: ++msgId, role: 'ai', text }])
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: ++msgId, role: 'ai', text: 'Có lỗi xảy ra. Vui lòng thử lại.' },
      ])
    } finally {
      setLoading(false)
    }
  }, [loading, currentShape, contextObject])

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit(question)
    }
  }

  const suggestions = currentShape ? (getShape(currentShape)?.suggestedQuestions ?? []) : []

  // Chat window position: above the button
  const chatBottom = pos.bottom + 64 + 8 // button height + gap

  return (
    <>
      {/* ── Chat popup ─────────────────────────────────────────────────── */}
      {open && (
        <div
          className="fixed z-40 flex flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl"
          style={{
            width: 320,
            height: 460,
            bottom: chatBottom,
            right: pos.right,
          }}
        >
          {/* Header */}
          <div className="flex flex-shrink-0 items-center justify-between bg-slate-800 px-4 py-3 border-b border-slate-700">
            <div className="flex items-center gap-2">
              <span className="text-lg">🤖</span>
              <div>
                <p className="text-sm font-semibold text-white leading-tight">Gia Sư AI</p>
                <p className="text-xs text-slate-400 leading-tight">
                  {currentShape ? `Đang xem: ${getShape(currentShape)?.nameVi ?? currentShape.replace('_', ' ')}` : 'Hỏi về hình học'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-700 hover:text-white transition-colors"
            >
              ✕
            </button>
          </div>

          {/* Messages area */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 min-h-0">
            {messages.length === 0 && (
              <div className="text-center py-6 text-slate-500 text-sm">
                Đặt câu hỏi về hình học đang hiển thị.
              </div>
            )}

            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={[
                    'max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed',
                    msg.role === 'user'
                      ? 'bg-indigo-600 text-white rounded-br-sm'
                      : 'bg-slate-800 text-slate-200 rounded-bl-sm border border-slate-700',
                  ].join(' ')}
                >
                  {msg.text}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-slate-800 border border-slate-700 rounded-2xl rounded-bl-sm">
                  <TypingDots />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Suggested questions — only show when no messages yet */}
          {messages.length === 0 && suggestions.length > 0 && (
            <div className="flex-shrink-0 px-3 pb-2 flex flex-wrap gap-1.5">
              {suggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => submit(s)}
                  className="text-xs px-2.5 py-1 rounded-full bg-indigo-600/20 border border-indigo-700 text-indigo-300 hover:bg-indigo-600/35 transition-colors text-left leading-snug"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Input area */}
          <div className="flex-shrink-0 flex items-end gap-2 border-t border-slate-700 bg-slate-800/50 px-3 py-2.5">
            <textarea
              ref={inputRef}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={handleKey}
              rows={2}
              placeholder="Nhập câu hỏi… (Enter để gửi)"
              disabled={loading}
              className="flex-1 resize-none rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50 transition-shadow"
            />
            <button
              type="button"
              onClick={() => submit(question)}
              disabled={loading || !question.trim()}
              className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-xl bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path d="M3.105 2.289a.75.75 0 00-.826.95l1.903 6.557H13.5a.75.75 0 010 1.5H4.182l-1.903 6.557a.75.75 0 00.826.95 28.896 28.896 0 0015.293-7.154.75.75 0 000-1.115A28.897 28.897 0 003.105 2.289z" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* ── Floating button ────────────────────────────────────────────── */}
      <div
        ref={buttonRef}
        className="group fixed z-50 select-none"
        style={{
          right: pos.right,
          bottom: pos.bottom,
          transition: isDragging ? 'none' : 'right 0.35s cubic-bezier(0.34,1.56,0.64,1), bottom 0.35s cubic-bezier(0.34,1.56,0.64,1)',
        }}
        onMouseDown={onMouseDown}
      >
        {!open && (
          <span className="pointer-events-none absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs font-bold text-white animate-pulse group-hover:animate-none group-hover:opacity-100">
            Gia Sư AI
          </span>
        )}
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          title="Hỏi AI Gia sư"
          className={[
            'w-10 h-10 rounded-2xl shadow-xl flex items-center justify-center transition-all duration-200',
            'cursor-pointer hover:scale-105 active:scale-95',
            'opacity-40 hover:opacity-100',
            open
              ? 'bg-slate-700/90 border border-slate-600 text-slate-300'
              : 'bg-indigo-600/90 border border-indigo-400/60 text-white hover:bg-indigo-500',
          ].join(' ')}
        >
          {open ? (
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
              <path d="M4 4l12 12M16 4L4 16" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              <path d="M8 10h8M8 13h5" strokeOpacity={0.7} />
            </svg>
          )}
        </button>

        {/* Unread dot when chat has no messages opened yet */}
        {!open && messages.length === 0 && currentShape && (
          <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-red-500 border-2 border-slate-950 animate-pulse" />
        )}
      </div>
    </>
  )
}
