'use client'

import { useState, useEffect, useCallback } from 'react'
import { type ExampleDef } from '@/lib/geo-ai/examples/examplesData'
import { getCachedGeometry, setCachedGeometry } from '@/lib/geo-ai/cache/examplesCache'
import { useExamples } from '@/hooks/geo-ai/useShapeData'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Grade = 'all' | 'lop6' | 'lop7' | 'lop8' | 'lop9'

interface ExampleLibraryPanelProps {
  onSelectExample: (example: ExampleDef) => void
  selectedId?: string
  isResolving?: boolean
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const GRADE_TABS: { key: Grade; label: string }[] = [
  { key: 'all', label: 'Tất cả' },
  { key: 'lop6', label: 'Lớp 6' },
  { key: 'lop7', label: 'Lớp 7' },
  { key: 'lop8', label: 'Lớp 8' },
  { key: 'lop9', label: 'Lớp 9' },
]

const GRADE_BADGE: Record<ExampleDef['grade'], string> = {
  lop6: 'bg-orange-900/60 text-orange-300 border border-orange-700/50',
  lop7: 'bg-yellow-900/60 text-yellow-300 border border-yellow-700/50',
  lop8: 'bg-sky-900/60 text-sky-300 border border-sky-700/50',
  lop9: 'bg-emerald-900/60 text-emerald-300 border border-emerald-700/50',
}

const GRADE_LABEL: Record<ExampleDef['grade'], string> = {
  lop6: 'Lớp 6',
  lop7: 'Lớp 7',
  lop8: 'Lớp 8',
  lop9: 'Lớp 9',
}

// ---------------------------------------------------------------------------
// Subcomponents
// ---------------------------------------------------------------------------

function GradeBadge({ grade }: { grade: ExampleDef['grade'] }) {
  return (
    <span
      className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium leading-none ${GRADE_BADGE[grade]}`}
    >
      {GRADE_LABEL[grade]}
    </span>
  )
}

function SpinnerIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4 animate-spin text-indigo-400"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function ExampleLibraryPanel({ onSelectExample, selectedId, isResolving = false }: ExampleLibraryPanelProps) {
  const [activeGrade, setActiveGrade] = useState<Grade>('all')
  const [search, setSearch] = useState('')
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [cachedIds, setCachedIds] = useState<Set<string>>(new Set())
  const examples = useExamples()

  // Detect which examples are already in localStorage (re-run as the library loads)
  useEffect(() => {
    const cached = new Set<string>()
    for (const ex of examples) {
      if (getCachedGeometry(ex.id) !== null) {
        cached.add(ex.id)
      }
    }
    setCachedIds(cached)
  }, [examples])

  const q = search.trim().toLowerCase()
  const filteredExamples = (() => {
    const seen = new Set<string>()
    return examples
      .filter((ex) => {
        if (activeGrade !== 'all' && ex.grade !== activeGrade) return false
        if (!q) {
          if (seen.has(ex.shapeKey)) return false
          seen.add(ex.shapeKey)
          return true
        }
        return ex.title.toLowerCase().includes(q) || ex.description.toLowerCase().includes(q)
      })
      .sort((a, b) => a.grade.localeCompare(b.grade) || a.id.localeCompare(b.id))
  })()

  const handleSelect = useCallback(
    async (example: ExampleDef) => {
      if (loadingId !== null) return

      // Always show spinner first so user gets immediate feedback
      setLoadingId(example.id)
      // Yield one frame so the spinner actually paints before any sync work
      await new Promise<void>((r) => setTimeout(r, 16))

      try {
        // Only fetch from API if not already available locally
        const needsFetch = !example.params && getCachedGeometry(example.id) === null
        if (needsFetch) {
          const response = await fetch('/api/geo-ai/examples', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: example.id }),
          })

          if (response.ok) {
            const data = (await response.json()) as { prompt: string; geometryJson?: string }
            if (data.geometryJson) {
              setCachedGeometry(example.id, data.geometryJson)
              setCachedIds((prev) => new Set([...prev, example.id]))
            }
          }
        }
      } catch {
        // ignore — parent will handle via resolve()
      } finally {
        setLoadingId(null)
      }

      onSelectExample(example)
    },
    [loadingId, onSelectExample],
  )

  return (
    <section aria-label="Thư viện ví dụ" className="flex h-full flex-col gap-3 p-4">
      {/* Search */}
      <div className="relative">
        <svg
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.6}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500"
        >
          <circle cx={8.5} cy={8.5} r={5} />
          <path d="M13 13l3 3" />
        </svg>
        <input
          type="search"
          placeholder="Tìm ví dụ…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-slate-700 bg-slate-800 py-1.5 pl-8 pr-3 text-xs text-slate-200 placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>
      {/* Grade filter tabs */}
      <nav aria-label="Lọc theo lớp" className="flex flex-wrap gap-1">
        {GRADE_TABS.map((tab) => {
          const isActive = activeGrade === tab.key
          return (
            <button
              key={tab.key}
              type="button"
              aria-pressed={isActive}
              onClick={() => setActiveGrade(tab.key)}
              className={[
                'rounded-md px-2 py-1.5 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500',
                isActive
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200',
              ].join(' ')}
            >
              {tab.label}
            </button>
          )
        })}
      </nav>

      {/* Example list */}
      <ul
        role="list"
        className="flex flex-col gap-1.5 overflow-y-auto"
        aria-live="polite"
        aria-label="Danh sách ví dụ"
      >
        {filteredExamples.map((example) => {
          const isSelected = selectedId === example.id
          const isLoading = loadingId === example.id || (isResolving && isSelected)
          const isCached = cachedIds.has(example.id)
          const isDisabled = (loadingId !== null || isResolving) && !isLoading

          return (
            <li key={example.id}>
              <button
                type="button"
                disabled={isDisabled}
                onClick={() => handleSelect(example)}
                aria-busy={isLoading}
                aria-pressed={isSelected}
                className={[
                  'group w-full rounded-lg border px-3 py-2.5 text-left transition-colors',
                  'focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500',
                  isDisabled
                    ? 'cursor-not-allowed opacity-50'
                    : 'hover:border-indigo-600 hover:bg-slate-700',
                  isSelected
                    ? 'border-indigo-500 bg-indigo-950/60 ring-1 ring-indigo-500/40'
                    : isLoading
                      ? 'border-indigo-700/70 bg-slate-800'
                      : 'border-transparent bg-slate-800',
                ].join(' ')}
              >
                <div className="flex items-start justify-between gap-2">
                  {/* Title + description */}
                  <div className="min-w-0 flex-1">
                    <span className={[
                      'block truncate text-sm font-medium',
                      isSelected ? 'text-indigo-200' : 'text-slate-200 group-hover:text-white',
                    ].join(' ')}>
                      {q ? example.title : example.shapeNameVi}
                    </span>
                    <span className={[
                      'mt-0.5 block truncate text-xs',
                      isSelected ? 'text-indigo-400/70' : 'text-slate-500 group-hover:text-slate-400',
                    ].join(' ')}>
                      {example.description}
                    </span>
                  </div>

                  {/* Right column: spinner, check, or badge */}
                  <div className="flex shrink-0 flex-col items-end gap-1 pt-0.5">
                    {isLoading ? (
                      <SpinnerIcon />
                    ) : (
                      <>
                        <GradeBadge grade={example.grade} />
                        {/* Always in DOM — opacity prevents layout shift on selection */}
                        <svg
                          viewBox="0 0 16 16"
                          fill="currentColor"
                          className={`h-3.5 w-3.5 text-indigo-400 transition-opacity duration-150 ${isSelected ? 'opacity-100' : 'opacity-0'}`}
                          aria-hidden={!isSelected}
                        >
                          <path d="M12.207 4.793a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0l-2-2a1 1 0 011.414-1.414L6.5 9.086l4.293-4.293a1 1 0 011.414 0z" />
                        </svg>
                      </>
                    )}
                  </div>
                </div>
              </button>
            </li>
          )
        })}

        {filteredExamples.length === 0 && (
          <li className="py-8 text-center text-sm text-slate-600">
            {q ? `Không tìm thấy "${search}"` : 'Không có ví dụ nào cho lớp này.'}
          </li>
        )}
      </ul>
    </section>
  )
}
