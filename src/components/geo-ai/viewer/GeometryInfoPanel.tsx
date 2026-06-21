'use client'
import { useEffect, useRef } from 'react'
import katex from 'katex'
import 'katex/dist/katex.min.css'
import type { GeometryModel } from '@/types/geo-ai'
import { getFormulas } from '@/lib/geo-ai/data/index'

interface GeometryInfoPanelProps {
  model: GeometryModel | null
}

// ---------------------------------------------------------------------------
// KaTeX renderer
// ---------------------------------------------------------------------------

function KaTeXLine({ latex }: { latex: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    if (!ref.current) return
    try {
      katex.render(latex, ref.current, { displayMode: false, throwOnError: false })
    } catch {
      if (ref.current) ref.current.textContent = latex
    }
  }, [latex])
  return <span ref={ref} className="text-white" />
}

// ---------------------------------------------------------------------------
// Layout helpers
// ---------------------------------------------------------------------------

function InfoRow({ label, value }: { label: string; value: string | number | undefined }) {
  if (value === undefined || value === null) return null
  const display = typeof value === 'number'
    ? (Number.isInteger(value) ? value.toString() : value.toFixed(3))
    : value
  return (
    <div className="flex items-center justify-between py-1 border-b border-slate-800/50 last:border-0">
      <span className="text-xs text-slate-500">{label}</span>
      <span className="text-xs text-slate-200 font-mono">{display}</span>
    </div>
  )
}

function FormulaRow({ label, latex }: { label: string; latex: string }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-slate-800/50 last:border-0 gap-2">
      <span className="text-xs text-slate-500 flex-shrink-0">{label}</span>
      <span className="text-xs overflow-x-auto">
        <KaTeXLine latex={latex} />
      </span>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1 px-3">{title}</div>
      <div className="px-3">{children}</div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// LaTeX formula map per shape
// ---------------------------------------------------------------------------

// Formula data now lives in shapes-data.ts — accessed via getFormulas()

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function GeometryInfoPanel({ model }: GeometryInfoPanelProps) {
  if (!model) {
    return (
      <div className="p-4 text-center text-xs text-slate-600">
        Tạo mô hình để xem thông tin hình học.
      </div>
    )
  }

  const { vertices, edges, faces, measurements, spec } = model
  const vCount = Object.keys(vertices).length
  const eCount = edges.length
  const fCount = faces.length
  const formulas = getFormulas(spec.shape)

  const baseUnit = (spec.params.unit as string | undefined) ?? 'cm'
  function fmt(n: number | undefined, pow: 1 | 2 | 3 = 1): string | undefined {
    if (n === undefined) return undefined
    const val = Number.isInteger(n) ? n.toString() : n.toFixed(3)
    if (!baseUnit) return val
    const unit = pow === 3 ? `${baseUnit}³` : pow === 2 ? `${baseUnit}²` : baseUnit
    return `${val} ${unit}`
  }

  return (
    <div className="py-2 space-y-1">
      <Section title="Cấu trúc">
        <InfoRow label="Đỉnh" value={vCount} />
        <InfoRow label="Cạnh" value={eCount} />
        <InfoRow label="Mặt"  value={fCount} />
      </Section>

      <Section title="Số đo">
        <InfoRow label="Thể tích (V)"              value={fmt(measurements.volume, 3)} />
        <InfoRow label="Diện tích xung quanh (Sxq)" value={fmt(measurements.lateralArea, 2)} />
        <InfoRow label="Diện tích toàn phần (Stp)"  value={fmt(measurements.surfaceArea, 2)} />
        <InfoRow label="Diện tích đáy (Sđáy)"      value={fmt(measurements.baseArea, 2)} />
        <InfoRow label="Chiều cao (h)"              value={fmt(measurements.height)} />
        <InfoRow label="Đường sinh (l)"             value={fmt(measurements.slantHeight)} />
      </Section>

      {formulas && (
        <Section title="Công thức">
          {formulas.volume      && <FormulaRow label="Thể tích"             latex={formulas.volume.latex} />}
          {formulas.lateralArea && <FormulaRow label="D.tích xung quanh"   latex={formulas.lateralArea.latex} />}
          {formulas.surfaceArea && <FormulaRow label="D.tích toàn phần"    latex={formulas.surfaceArea.latex} />}
        </Section>
      )}

      <Section title="Đỉnh">
        <div className="flex flex-wrap gap-1 mt-1">
          {Object.keys(vertices).map(id => (
            <span key={id} className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono">
              {id}
            </span>
          ))}
        </div>
      </Section>
    </div>
  )
}
