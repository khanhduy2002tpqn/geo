'use client'

import { useState, useMemo } from 'react'
import katex from 'katex'
import 'katex/dist/katex.min.css'
import type { GeometrySpec } from '@/types/geo-ai'
import type { LessonFormula, LessonObject } from '@/lib/geo-ai/data/types'
import { getShape } from '@/lib/geo-ai/data/index'

// ---------------------------------------------------------------------------
// KaTeX — synchronous, no flash
// ---------------------------------------------------------------------------

function KaTeX({ latex }: { latex: string }) {
  const html = useMemo(() => {
    try {
      return katex.renderToString(latex, { displayMode: false, throwOnError: false })
    } catch {
      return latex
    }
  }, [latex])
  return (
    <span
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: html }}
      className="text-white"
      style={{ fontSize: '0.9rem' }}
    />
  )
}

// ---------------------------------------------------------------------------
// Formula card — title + description + KaTeX
// ---------------------------------------------------------------------------

function FormulaCard({ item }: { item: LessonFormula }) {
  return (
    <div className="rounded-lg bg-slate-800/70 border border-slate-700 p-3 space-y-1.5">
      <p className="text-xs font-semibold text-indigo-300">{item.title}</p>
      {item.description && (
        <p className="text-xs text-slate-400 leading-relaxed">{item.description}</p>
      )}
      {item.latex && (
        <div className="overflow-x-auto rounded bg-slate-900/60 px-3 py-2 text-center">
          <KaTeX latex={item.latex} />
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Section definitions
// ---------------------------------------------------------------------------

const SECTIONS = [
  { id: 'recognition', label: 'Dấu hiệu nhận biết', icon: '🔍' },
  { id: 'objects',     label: 'Đối tượng hình học',  icon: '📐' },
  { id: 'theorems',    label: 'Định lý',               icon: '📖' },
  { id: 'formulas',    label: 'Công thức',             icon: '🧮' },
]

const LEVEL_LABEL: Record<string, { text: string; color: string }> = {
  cap2: { text: 'Cấp 2 (Lớp 8–9)',   color: 'text-sky-300 bg-sky-900/30 border-sky-700/40' },
  cap3: { text: 'Cấp 3 (Lớp 10–11)', color: 'text-violet-300 bg-violet-900/30 border-violet-700/40' },
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface FormulaDiscoveryProps {
  shape: GeometrySpec['shape'] | null
}

export default function FormulaDiscovery({ shape }: FormulaDiscoveryProps) {
  const [openSections, setOpenSections] = useState<ReadonlySet<string>>(new Set())

  function toggleSection(id: string) {
    setOpenSections((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const shapeData = shape ? getShape(shape) : undefined
  const lesson    = shapeData?.lessonContent
  const level     = shapeData?.level
  const levelMeta = level ? LEVEL_LABEL[level] : undefined

  if (!shape) {
    return (
      <div className="flex items-center justify-center h-32 text-slate-400 text-sm">
        Chọn một hình để xem bài học.
      </div>
    )
  }

  if (!lesson) {
    return (
      <div className="flex items-center justify-center h-32 text-slate-400 text-sm">
        Chưa có nội dung bài học. Chạy{' '}
        <code className="mx-1 px-1.5 py-0.5 rounded bg-slate-800 text-indigo-300 text-xs">
          pnpm update-lesson
        </code>{' '}
        để tạo.
      </div>
    )
  }

  function renderSection(id: string) {
    if (!lesson) return null

    if (id === 'recognition') {
      return (
        <ul className="space-y-2">
          {lesson.recognition.map((item, i) => (
            <li key={i} className="flex gap-2 text-sm text-slate-300 leading-relaxed">
              <span className="text-indigo-400 mt-0.5 flex-shrink-0">•</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )
    }

    if (id === 'objects') {
      return (
        <div className="space-y-2">
          {(lesson.objects as LessonObject[])
            .filter(g => !g.category.toLowerCase().includes('đặc trưng') && !g.category.toLowerCase().includes('tham số'))
            .map((group, gi) => (
            <div key={gi} className="flex gap-2 text-sm leading-relaxed">
              <span className="text-slate-400 font-medium whitespace-nowrap flex-shrink-0">
                {group.category}:
              </span>
              <span className="text-slate-300">
                {group.items.map(item => item.split(' — ')[0]?.trim() ?? item).join(', ')}
              </span>
            </div>
          ))}
        </div>
      )
    }

    if (id === 'theorems') {
      if (!lesson.theorems.length) {
        return <p className="text-sm text-slate-400">Chưa có định lý.</p>
      }
      return (
        <div className="space-y-2">
          {lesson.theorems.map((t, i) => <FormulaCard key={i} item={t} />)}
        </div>
      )
    }

    if (id === 'formulas') {
      if (!lesson.formulas.length) {
        return <p className="text-sm text-slate-400">Chưa có công thức.</p>
      }
      return (
        <div className="space-y-2">
          {lesson.formulas.map((f, i) => <FormulaCard key={i} item={f} />)}
        </div>
      )
    }

    return null
  }

  return (
    <div className="flex flex-col gap-1 mt-8">
      {/* Accordion */}
      <div className="divide-y divide-slate-800">
        {SECTIONS.map((sec) => {
          const isOpen = openSections.has(sec.id)
          return (
            <div key={sec.id}>
              <button
                type="button"
                onClick={() => toggleSection(sec.id)}
                className="w-full flex items-center justify-between px-1 py-2.5 text-left hover:bg-slate-800/50 rounded-lg transition-colors"
              >
                <span className="flex items-center gap-2">
                  <span className="text-sm">{sec.icon}</span>
                  <span className={`text-sm font-medium ${isOpen ? 'text-indigo-300' : 'text-slate-300'}`}>
                    {sec.label}
                  </span>
                </span>
                <svg
                  viewBox="0 0 16 16"
                  className={`w-3.5 h-3.5 text-slate-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                >
                  <path d="M4 6l4 4 4-4" />
                </svg>
              </button>

              {isOpen && (
                <div className="pb-3 px-1">
                  {renderSection(sec.id)}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
