'use client'

import { useState, useRef, useEffect } from 'react'
import katex from 'katex'
import 'katex/dist/katex.min.css'
import type { GeometrySpec } from '@/types/geo-ai'

// ---------------------------------------------------------------------------
// Suggested questions per shape
// ---------------------------------------------------------------------------

const SUGGESTED: Partial<Record<GeometrySpec['shape'], string[]>> = {
  cylinder: [
    'Tại sao Sxq = chu vi đáy × chiều cao?',
    'Làm thế nào để tính thể tích hình trụ?',
    'Sxq và Stp khác nhau thế nào?',
  ],
  cone: [
    'Tại sao V = 1/3 thể tích hình trụ?',
    'Đường sinh của hình nón là gì?',
    'Làm sao tính diện tích mặt xung quanh hình nón?',
  ],
  square_pyramid: [
    'Đỉnh hình chóp là gì?',
    'Tại sao thể tích hình chóp bằng 1/3 hình lăng trụ?',
    'Đường trung đoạn của hình chóp là gì?',
  ],
  cube: [
    'Tại sao V = a³?',
    'Hình lập phương có bao nhiêu mặt, cạnh, đỉnh?',
    'Diện tích toàn phần tính thế nào?',
  ],
  rectangular_prism: [
    'Tại sao V = dài × rộng × cao?',
    'Nguyên lý Cavalieri là gì?',
    'Tính diện tích toàn phần hình hộp chữ nhật thế nào?',
  ],
  triangular_prism: [
    'Thể tích lăng trụ tam giác tính thế nào?',
    'Lăng trụ và hình hộp khác nhau thế nào?',
  ],
  triangular_pyramid: [
    'Tứ diện đều là gì?',
    'Công thức thể tích hình chóp tam giác là gì?',
  ],
  general_pyramid: [
    'Đỉnh hình chóp là gì?',
    'Công thức thể tích chóp tổng quát?',
  ],
}

// ---------------------------------------------------------------------------
// KaTeX renderer
// ---------------------------------------------------------------------------

function KaTeXBlock({ latex }: { latex: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    if (!ref.current) return
    try {
      katex.render(latex, ref.current, { displayMode: true, throwOnError: false })
    } catch {
      if (ref.current) ref.current.textContent = latex
    }
  }, [latex])
  return <span ref={ref} />
}

// ---------------------------------------------------------------------------
// Parse answer text — detect $...$ or $$...$$ segments and render with KaTeX
// ---------------------------------------------------------------------------

function AnswerText({ text }: { text: string }) {
  // Split on $$...$$ first (display math), then $...$ (inline math).
  // The $$...$$  arm must be listed FIRST in the alternation to avoid the
  // $...$ arm partially matching a $$ delimiter.
  const parts = text.split(/(\$\$[\s\S]+?\$\$|\$[^$\n]+?\$)/g)
  return (
    <div className="text-sm text-slate-800 leading-relaxed space-y-1">
      {parts.map((part, i) => {
        if (part.startsWith('$$') && part.endsWith('$$')) {
          const latex = part.slice(2, -2).trim()
          return (
            <div key={`${i}-${part.slice(0, 16)}`} className="overflow-x-auto text-center py-1">
              <KaTeXBlock latex={latex} />
            </div>
          )
        }
        if (part.startsWith('$') && part.endsWith('$')) {
          const latex = part.slice(1, -1).trim()
          return <KaTeXBlock key={`${i}-${part.slice(0, 16)}`} latex={latex} />
        }
        return <span key={`${i}-${part.slice(0, 16)}`}>{part}</span>
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface QAPanelProps {
  currentShape: GeometrySpec['shape'] | null
  contextObject: string | null
}

interface AnswerState {
  text: string
  error?: boolean
}

export default function QAPanel({ currentShape, contextObject }: QAPanelProps) {
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState<AnswerState | null>(null)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const suggestions = currentShape ? (SUGGESTED[currentShape] ?? []) : []

  async function submit(q: string) {
    const trimmed = q.trim()
    if (!trimmed || loading) return

    setLoading(true)
    setAnswer(null)

    try {
      const res = await fetch('/api/geo-ai/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: trimmed,
          shape: currentShape,
          contextObject,
        }),
      })

      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = (await res.json()) as { answer?: string; error?: string }
      setAnswer({ text: data.answer ?? data.error ?? 'Không có câu trả lời.' })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Có lỗi xảy ra. Vui lòng thử lại.'
      setAnswer({ text: msg, error: true })
    } finally {
      setLoading(false)
    }
  }

  function handleSubmit() {
    submit(question)
  }

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  function handleSuggestion(s: string) {
    setQuestion(s)
    submit(s)
    inputRef.current?.focus()
  }

  if (!currentShape) {
    return (
      <div className="flex items-center justify-center py-4 text-slate-400 text-xs text-center px-3">
        Chọn một hình để đặt câu hỏi.
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Suggested questions */}
      {suggestions.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => handleSuggestion(s)}
              className="text-xs px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700
                         border border-indigo-200 hover:bg-indigo-100 transition-colors
                         text-left leading-snug"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="flex gap-2 items-end">
        <textarea
          ref={inputRef}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={handleKey}
          rows={2}
          placeholder="Đặt câu hỏi bằng tiếng Việt..."
          className="flex-1 resize-none rounded-lg border border-slate-200 bg-white px-3 py-2
                     text-sm text-slate-800 placeholder-slate-400 focus:outline-none
                     focus:ring-2 focus:ring-indigo-400 focus:border-transparent
                     transition-shadow"
          disabled={loading}
        />
        <button
          type="submit"
          onClick={handleSubmit}
          disabled={loading || !question.trim() || !currentShape}
          className="flex-shrink-0 px-4 py-2 rounded-lg text-sm font-semibold
                     bg-indigo-600 text-white hover:bg-indigo-700
                     disabled:opacity-40 disabled:cursor-not-allowed
                     transition-colors"
        >
          Hỏi
        </button>
      </div>

      {/* Answer area */}
      {loading && (
        <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-4 flex items-center gap-2">
          <span className="inline-block w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-slate-500">Đang tìm câu trả lời...</span>
        </div>
      )}

      {answer && !loading && (
        <div
          className={[
            'rounded-lg border px-3 py-3',
            answer.error
              ? 'bg-red-50 border-red-200'
              : 'bg-white border-slate-200',
          ].join(' ')}
        >
          <AnswerText text={answer.text} />
        </div>
      )}
    </div>
  )
}
