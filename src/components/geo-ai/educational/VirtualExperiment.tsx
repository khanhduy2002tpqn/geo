'use client'

import { useRef, useMemo } from 'react'
import katex from 'katex'
import 'katex/dist/katex.min.css'
import type { VirtualExperiment as VirtualExperimentType, ExperimentFrame } from '@/types/geo-ai'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function KaTeXFormula({ latex }: { latex: string }) {
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
      style={{ color: 'white', fontSize: '1rem' }}
    />
  )
}

function WaterFill({ level }: { level: number }) {
  const pct = Math.round(Math.max(0, Math.min(1, level)) * 100)
  return (
    <div className="relative w-full h-16 rounded-lg overflow-hidden bg-slate-800 border border-slate-700">
      {/* water */}
      <div
        className="absolute bottom-0 left-0 right-0 bg-blue-400/70 transition-all duration-500 ease-out"
        style={{ height: `${pct}%` }}
      />
      {/* label */}
      <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-slate-300">
        {pct}%
      </span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Current frame derived from progress + frames array
// ---------------------------------------------------------------------------

function resolveFrame(
  frames: ExperimentFrame[],
  progress: number,
): ExperimentFrame | null {
  if (!frames.length) return null
  // Find the last frame whose time <= progress
  let best: ExperimentFrame = frames[0]!
  for (const f of frames) {
    if (f.time <= progress) best = f
  }
  return best
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface VirtualExperimentProps {
  experiment: VirtualExperimentType | null
  isPlaying: boolean
  progress: number
  onPlay: () => void
  onPause: () => void
  onReset: () => void
}

export default function VirtualExperiment({
  experiment,
  isPlaying,
  progress,
  onPlay,
  onPause,
  onReset,
}: VirtualExperimentProps) {
  if (!experiment) {
    return (
      <div className="flex items-center justify-center h-32 text-slate-400 text-sm">
        Chưa có thí nghiệm cho hình này.
      </div>
    )
  }

  const frame = resolveFrame(experiment.frames, progress)
  const progressPct = Math.round(progress * 100)

  // Keep last formula visible while fading out — avoids KaTeX remount flash
  const lastFormulaRef = useRef<string | null>(null)
  if (frame?.showFormula) lastFormulaRef.current = frame.showFormula
  const formulaVisible = !!frame?.showFormula
  const pourVisible = typeof frame?.pourCount === 'number'

  return (
    <div className="flex flex-col gap-3">
      {/* Title */}
      <h3 className="text-sm font-semibold text-white">
        Thí nghiệm: {experiment.shapeName}
      </h3>

      {/* Water fill — always mounted, level animates smoothly */}
      <WaterFill level={frame?.waterLevel ?? 0} />

      {/* Narration */}
      <div className="rounded-lg bg-amber-900/20 border border-amber-700/40 p-3 min-h-[3.5rem]">
        <p className="text-sm text-amber-300 leading-relaxed">
          {frame?.narration ?? '...'}
        </p>
      </div>

      {/* Formula — always mounted, opacity fades, KaTeX never remounts */}
      <div
        className="rounded-lg border p-3 overflow-x-auto text-center text-white"
        style={{
          opacity: formulaVisible ? 1 : 0,
          background: 'rgba(79,70,229,0.12)',
          borderColor: formulaVisible ? 'rgba(99,102,241,0.4)' : 'transparent',
          minHeight: '3.5rem',
          pointerEvents: formulaVisible ? 'auto' : 'none',
          transition: 'opacity 0.4s ease, border-color 0.4s ease',
        }}
      >
        {lastFormulaRef.current && <KaTeXFormula latex={lastFormulaRef.current} />}
      </div>

      {/* Pour count — always mounted, opacity fades */}
      <div
        className="flex items-center gap-1.5"
        style={{ opacity: pourVisible ? 1 : 0, minHeight: '1.75rem', transition: 'opacity 0.3s ease' }}
      >
        <span className="text-xs text-slate-400">Lần đổ:</span>
        {Array.from({ length: 3 }).map((_, i) => (
          <span
            key={i}
            className={[
              'w-5 h-5 rounded-full border-2 transition-colors duration-300 flex items-center justify-center text-xs font-bold',
              i < (frame?.pourCount ?? 0)
                ? 'border-blue-400 bg-blue-500 text-white'
                : 'border-slate-600 bg-slate-800 text-slate-500',
            ].join(' ')}
          >
            {i + 1}
          </span>
        ))}
      </div>

      {/* Controls — single button, no swap */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={isPlaying ? onPause : onPlay}
          className={[
            'flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
            isPlaying
              ? 'bg-slate-700 text-slate-200 hover:bg-slate-600'
              : 'bg-indigo-600 text-white hover:bg-indigo-700',
          ].join(' ')}
        >
          <span>{isPlaying ? '⏸' : '▶'}</span>
          {isPlaying ? 'Dừng' : 'Bắt đầu'}
        </button>

        <button
          type="button"
          onClick={onReset}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium
                     bg-slate-800 text-slate-400 hover:bg-slate-700 transition-colors"
        >
          <span>↺</span> Làm lại
        </button>
      </div>

      {/* Progress bar */}
      <div className="space-y-1">
        <div className="h-2 rounded-full bg-slate-700 overflow-hidden">
          <div
            className="h-full bg-indigo-500 rounded-full transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-slate-400">
          <span>0%</span>
          <span>{progressPct}%</span>
          <span>100%</span>
        </div>
      </div>

      {/* Final formula — always mounted, opacity-only transition (no cold-mount flash) */}
      <div
        className="rounded-lg border p-3 overflow-x-auto text-center text-white transition-all duration-500"
        style={{
          opacity: progress >= 1 ? 1 : 0,
          background: progress >= 1 ? 'rgba(22,163,74,0.15)' : 'transparent',
          borderColor: progress >= 1 ? 'rgba(34,197,94,0.4)' : 'transparent',
          pointerEvents: progress >= 1 ? 'auto' : 'none',
        }}
      >
        <p className="text-xs font-semibold text-green-400 mb-2">Kết quả:</p>
        <KaTeXFormula latex={experiment.finalFormulaLatex} />
      </div>
    </div>
  )
}
