'use client'
import type { MeasurementMode } from '@/hooks/geo-ai/useMeasurementTool'

interface MeasurementPanelProps {
  mode: MeasurementMode
  points: string[]
  result: number | null
  requiredPoints: number
  onActivateDistance: () => void
  onActivateAngle: () => void
  onDeactivate: () => void
  onClear: () => void
}

export function MeasurementPanel({
  mode, points, result, requiredPoints,
  onActivateDistance, onActivateAngle, onDeactivate, onClear,
}: MeasurementPanelProps) {
  const remaining = Math.max(0, requiredPoints - points.length)

  return (
    <div className="p-3 space-y-3">
      {/* Tool buttons */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={mode === 'distance' ? onDeactivate : onActivateDistance}
          title="Đo khoảng cách (D)"
          className={[
            'flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-colors',
            mode === 'distance'
              ? 'bg-cyan-600/20 border-cyan-600 text-cyan-300'
              : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white hover:bg-slate-700',
          ].join(' ')}
        >
          <span>📏</span> Khoảng cách <kbd className="text-slate-500 text-[10px]">D</kbd>
        </button>

        <button
          type="button"
          onClick={mode === 'angle' ? onDeactivate : onActivateAngle}
          title="Đo góc (A)"
          className={[
            'flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-colors',
            mode === 'angle'
              ? 'bg-indigo-600/20 border-indigo-600 text-indigo-300'
              : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white hover:bg-slate-700',
          ].join(' ')}
        >
          <span>📐</span> Góc <kbd className="text-slate-500 text-[10px]">A</kbd>
        </button>
      </div>

      {/* Active tool status */}
      {mode !== 'none' && (
        <div className="rounded-lg bg-slate-800 border border-slate-700 p-3 space-y-2">
          {/* Selected points */}
          <div className="text-xs text-slate-400">
            Điểm đã chọn ({points.length}/{requiredPoints}):
          </div>
          <div className="flex flex-wrap gap-1">
            {points.map(p => (
              <span key={p} className="px-2 py-0.5 rounded bg-cyan-600/20 border border-cyan-700 text-cyan-300 text-xs font-mono">
                {p}
              </span>
            ))}
            {Array.from({ length: remaining }).map((_, i) => (
              <span key={i} className="px-2 py-0.5 rounded border border-dashed border-slate-700 text-slate-600 text-xs">
                ?
              </span>
            ))}
          </div>

          {/* Instruction */}
          {remaining > 0 && (
            <p className="text-xs text-slate-500">
              {mode === 'distance'
                ? 'Nhấp một cạnh hoặc chọn 2 đỉnh để đo.'
                : 'Nhấp 2 cạnh chung đỉnh hoặc chọn 3 đỉnh. Góc tính tại đỉnh giữa.'}
            </p>
          )}

          {/* Result */}
          {result !== null && (
            <div className="rounded-md bg-slate-900 px-3 py-2 border border-slate-700">
              <span className="text-xs text-slate-400">Kết quả: </span>
              <span className="text-sm font-mono text-white">
                {points.length >= 2 && mode === 'distance' && `${points[0]}${points[1]} = ${result.toFixed(4)} a`}
                {points.length >= 3 && mode === 'angle' && `∠${points[0]}${points[1]}${points[2]} = ${result.toFixed(2)}°`}
              </span>
            </div>
          )}

          <button type="button" onClick={onClear} className="text-xs text-slate-600 hover:text-slate-400">
            Xóa lựa chọn
          </button>
        </div>
      )}

      {mode === 'none' && (
        <p className="text-xs text-slate-600 text-center">
          Chọn công cụ để đo khoảng cách hoặc góc giữa các đỉnh.
        </p>
      )}

      {/* Keyboard shortcut hint */}
      <div className="border-t border-slate-800 pt-2">
        <p className="text-xs text-slate-700">
          Phím tắt: ← → điều hướng · R reset · D đo cách · A đo góc
        </p>
      </div>
    </div>
  )
}
