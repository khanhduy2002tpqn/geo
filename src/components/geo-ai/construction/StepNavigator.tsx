'use client'

interface StepNavigatorProps {
  total: number
  current: number
  onPrev: () => void
  onNext: () => void
  onShowAll: () => void
}

export default function StepNavigator({
  total,
  current,
  onPrev,
  onNext,
  onShowAll,
}: StepNavigatorProps) {
  const isFirst = current === 0
  const isLast = current === total - 1

  return (
    <div className="flex flex-col gap-1.5 px-3 py-2">
      {/* Row 1: Navigation */}
      <div className="flex items-center gap-2">
        <button type="button" onClick={onPrev} disabled={isFirst} aria-label="Bước trước"
          className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400
                     hover:bg-slate-800 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed
                     transition-colors duration-150 border border-slate-700 text-sm">
          ←
        </button>
        <span className="flex-1 text-center text-sm font-medium text-slate-300 tabular-nums">
          Bước {total === 0 ? 0 : current + 1}/{total}
        </span>
        <button type="button" onClick={onNext} disabled={isLast || total === 0} aria-label="Bước tiếp"
          className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400
                     hover:bg-slate-800 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed
                     transition-colors duration-150 border border-slate-700 text-sm">
          →
        </button>
      </div>
      {/* Row 2: Show all */}
      <button type="button" onClick={onShowAll}
        className="w-full py-1.5 rounded-lg text-xs font-medium text-indigo-400 bg-indigo-600/15
                   hover:bg-indigo-600/25 border border-indigo-700 transition-colors duration-150">
        Xem tất cả
      </button>
    </div>
  )
}
