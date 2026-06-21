'use client'

import { useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import { specFromFallback, type ShapeRecord } from '@/db/shapeRecord'
import { GeometryEngine } from '@/lib/geo-ai/geometry-engine/index'
import type {
  GeometryEdge,
  GeometryFace,
  GeometryModel,
  GeometrySpec,
  GeometryVertex,
  SpecialPoint,
} from '@/types/geo-ai'

// 3D preview — client-only (three/fiber). Reuses the same viewer as /geo-ai.
const Scene3D = dynamic(
  () => import('@/components/geo-ai/viewer/Scene3D').then((m) => ({ default: m.Scene3D })),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center text-sm text-slate-600">Đang tải 3D…</div>
    ),
  },
)

function safeParse<T>(text: string, fallback: T): T {
  const t = text.trim()
  if (!t) return fallback
  try {
    return JSON.parse(t) as T
  } catch {
    return fallback
  }
}

// ---------------------------------------------------------------------------
// Small field primitives
// ---------------------------------------------------------------------------

const inputCls =
  'w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-sm text-slate-100 ' +
  'focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500'
const labelCls = 'mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400'
const numCls = inputCls + ' text-right tabular-nums'

function Section({ title, children, hint }: { title: string; children: React.ReactNode; hint?: string }) {
  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
      <h3 className="mb-3 text-sm font-bold text-slate-200">
        {title}
        {hint ? <span className="ml-2 font-normal text-slate-500">{hint}</span> : null}
      </h3>
      {children}
    </section>
  )
}

function LineListField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string[]
  onChange: (next: string[]) => void
}) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      <textarea
        className={inputCls + ' min-h-[80px] font-mono text-xs'}
        value={value.join('\n')}
        onChange={(e) => onChange(e.target.value.split('\n').map((s) => s.trim()).filter(Boolean))}
        placeholder="Mỗi dòng một mục"
      />
    </div>
  )
}

function JsonField({
  label,
  text,
  error,
  onChange,
}: {
  label: string
  text: string
  error?: string
  onChange: (next: string) => void
}) {
  return (
    <div>
      <label className={labelCls}>
        {label}
        {error ? <span className="ml-2 text-rose-400">JSON lỗi: {error}</span> : null}
      </label>
      <textarea
        className={
          inputCls +
          ' min-h-[120px] font-mono text-xs ' +
          (error ? 'border-rose-500' : '')
        }
        value={text}
        onChange={(e) => onChange(e.target.value)}
        spellCheck={false}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// JSON-edited fields
// ---------------------------------------------------------------------------

const JSON_FIELDS = [
  'fallbackSpec',
  'formulas',
  'lessonContent',
  'objectDescriptions',
  'examples',
  'modelConstructionSteps',
] as const
type JsonField = (typeof JSON_FIELDS)[number]

function stringify(value: unknown): string {
  if (value === undefined || value === null) return ''
  return JSON.stringify(value, null, 2)
}

// ---------------------------------------------------------------------------
// Editor
// ---------------------------------------------------------------------------

export interface ShapeEditorProps {
  initial: ShapeRecord
  isNew: boolean
  busy: boolean
  onSave: (record: ShapeRecord) => void
  onDelete?: () => void
  onRebuild?: () => void
  onReset?: () => void
}

export function ShapeEditor({ initial, isNew, busy, onSave, onDelete, onRebuild, onReset }: ShapeEditorProps) {
  const [shapeKey, setShapeKey] = useState(initial.shapeKey)
  const [nameVi, setNameVi] = useState(initial.nameVi)
  const [type, setType] = useState<ShapeRecord['type']>(initial.type)
  const [level, setLevel] = useState<ShapeRecord['level']>(initial.level)
  const [surfaceType, setSurfaceType] = useState(initial.surfaceType ?? '')

  const [vertices, setVertices] = useState<GeometryVertex[]>(initial.vertices)
  const [edges, setEdges] = useState<GeometryEdge[]>(initial.edges)
  const [faces, setFaces] = useState<GeometryFace[]>(initial.faces)
  const [specialPoints, setSpecialPoints] = useState<SpecialPoint[]>(initial.specialPoints)
  const [measurements, setMeasurements] = useState<Array<{ key: string; value: number }>>(
    Object.entries(initial.measurements).map(([key, value]) => ({ key, value: value ?? 0 })),
  )

  const [parserKeywords, setParserKeywords] = useState<string[]>(initial.parserKeywords)
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>(initial.suggestedQuestions)

  const [jsonText, setJsonText] = useState<Record<JsonField, string>>(() => {
    const obj = {} as Record<JsonField, string>
    for (const f of JSON_FIELDS) obj[f] = stringify(initial[f])
    return obj
  })
  const [formError, setFormError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  // Preview source: 'edit' = current editor coords; otherwise an example id
  // (rebuilds via the SAME engine path /geo-ai uses, so they match exactly).
  const [previewSource, setPreviewSource] = useState<string>(
    () => initial.examples[0]?.id ?? 'edit',
  )

  // Live model assembled from the current editor state → drives the 3D preview.
  const liveModel = useMemo<GeometryModel>(() => {
    const verts: Record<string, GeometryVertex> = {}
    for (const v of vertices) if (v.id) verts[v.id] = v
    const meas: Record<string, number> = {}
    for (const m of measurements) if (m.key.trim()) meas[m.key.trim()] = m.value
    return {
      spec: specFromFallback(safeParse(jsonText.fallbackSpec, initial.fallbackSpec)),
      vertices: verts,
      edges,
      faces,
      specialPoints,
      measurements: meas,
      constructionSteps: [],
      surfaceType: (surfaceType.trim() || undefined) as GeometryModel['surfaceType'],
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vertices, edges, faces, specialPoints, measurements, surfaceType, jsonText.fallbackSpec])

  // Preview model: when an example is selected, rebuild via the geometry engine
  // using fallbackSpec + example.params + unit:'cm' — IDENTICAL to /geo-ai's
  // handleExampleSelect — so the admin preview matches the student view exactly.
  const previewModel = useMemo<GeometryModel>(() => {
    if (previewSource === 'edit') return liveModel
    const example = initial.examples.find((e) => e.id === previewSource)
    if (!example?.params) return liveModel
    try {
      const fallback = safeParse(jsonText.fallbackSpec, initial.fallbackSpec)
      const spec = { ...fallback, params: { ...example.params, unit: 'cm' } } as GeometrySpec
      return GeometryEngine.build(spec)
    } catch {
      return liveModel
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewSource, liveModel, jsonText.fallbackSpec])

  const activeExample = initial.examples.find((e) => e.id === previewSource)

  // Validate JSON fields live → map of field → error
  const jsonErrors = useMemo(() => {
    const errs: Partial<Record<JsonField, string>> = {}
    for (const f of JSON_FIELDS) {
      const txt = jsonText[f].trim()
      if (!txt) continue
      try {
        JSON.parse(txt)
      } catch (e) {
        errs[f] = e instanceof Error ? e.message : 'invalid'
      }
    }
    return errs
  }, [jsonText])

  const hasJsonError = Object.keys(jsonErrors).length > 0

  function parseJson<T>(f: JsonField, fallback: T): T {
    const txt = jsonText[f].trim()
    if (!txt) return fallback
    return JSON.parse(txt) as T
  }

  function handleSave() {
    setFormError(null)
    if (!shapeKey.trim()) return setFormError('shapeKey không được trống')
    if (hasJsonError) return setFormError('Có trường JSON không hợp lệ — sửa trước khi lưu')

    try {
      const measurementsObj: Record<string, number> = {}
      for (const m of measurements) if (m.key.trim()) measurementsObj[m.key.trim()] = m.value

      const euler = faces.length > 0 ? vertices.length - edges.length + faces.length : initial.topology.euler

      const record: ShapeRecord = {
        shapeKey: shapeKey.trim(),
        nameVi,
        type,
        level,
        topology: { vertices: vertices.length, edges: edges.length, faces: faces.length, euler },
        fallbackSpec: parseJson('fallbackSpec', initial.fallbackSpec),
        formulas: parseJson('formulas', initial.formulas),
        lessonContent: parseJson('lessonContent', undefined),
        objectDescriptions: parseJson('objectDescriptions', undefined),
        suggestedQuestions,
        parserKeywords,
        examples: parseJson('examples', initial.examples),
        vertices,
        edges,
        faces,
        specialPoints,
        measurements: measurementsObj,
        modelConstructionSteps: parseJson('modelConstructionSteps', initial.modelConstructionSteps),
        surfaceType: (surfaceType.trim() || undefined) as ShapeRecord['surfaceType'],
      }
      onSave(record)
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Lỗi khi lắp ráp dữ liệu')
    }
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="sticky top-0 z-10 flex flex-wrap items-center gap-2 rounded-xl border border-slate-800 bg-slate-950/80 p-3 backdrop-blur">
        <h2 className="mr-auto text-lg font-bold text-slate-100">
          {isNew ? 'Hình mới' : initial.nameVi}
          <span className="ml-2 font-mono text-sm text-slate-500">{shapeKey}</span>
        </h2>
        {onReset && !isNew ? (
          <button
            onClick={onReset}
            disabled={busy}
            className="rounded-lg border border-sky-700 bg-sky-900/30 px-3 py-1.5 text-sm font-semibold text-sky-200 hover:bg-sky-900/60 disabled:opacity-50"
          >
            ↺ Khôi phục gốc
          </button>
        ) : null}
        {onRebuild && !isNew ? (
          <button
            onClick={onRebuild}
            disabled={busy}
            className="rounded-lg border border-amber-700 bg-amber-900/30 px-3 py-1.5 text-sm font-semibold text-amber-200 hover:bg-amber-900/60 disabled:opacity-50"
          >
            ⟳ Dựng lại hình học
          </button>
        ) : null}
        {onDelete && !isNew ? (
          <button
            onClick={onDelete}
            disabled={busy}
            className="rounded-lg border border-rose-800 bg-rose-900/30 px-3 py-1.5 text-sm font-semibold text-rose-200 hover:bg-rose-900/60 disabled:opacity-50"
          >
            Xóa
          </button>
        ) : null}
        <button
          onClick={handleSave}
          disabled={busy || hasJsonError}
          className="rounded-lg bg-indigo-600 px-4 py-1.5 text-sm font-bold text-white hover:bg-indigo-500 disabled:opacity-50"
        >
          {busy ? 'Đang lưu…' : 'Lưu'}
        </button>
      </div>

      {formError ? (
        <div className="rounded-lg border border-rose-700 bg-rose-950/50 px-3 py-2 text-sm text-rose-200">
          {formError}
        </div>
      ) : null}

      {/* Live 3D preview */}
      <Section title="Xem trước 3D" hint="giống hệt /geo-ai">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Hiển thị theo
          </label>
          <select
            className={inputCls + ' max-w-xs'}
            value={previewSource}
            onChange={(e) => setPreviewSource(e.target.value)}
          >
            {initial.examples.map((ex) => (
              <option key={ex.id} value={ex.id}>
                {ex.title} ({Object.entries(ex.params ?? {}).map(([k, v]) => `${k}=${v}`).join(', ') || 'mặc định'})
              </option>
            ))}
            <option value="edit">Toạ độ đang sửa (baseline)</option>
          </select>
          {activeExample ? (
            <span className="text-xs text-slate-500">
              Dựng bằng engine từ params của đề — khớp 100% với /geo-ai
            </span>
          ) : (
            <span className="text-xs text-slate-500">Hiển thị toạ độ gốc trong record</span>
          )}
        </div>
        <div className="h-[440px] w-full overflow-hidden rounded-lg border border-slate-800 bg-slate-900">
          <Scene3D
            model={previewModel}
            containerId="admin-scene3d-container"
            selectedObjectId={selectedId}
            onObjectSelect={(id) => setSelectedId(id)}
            unfoldProgress={0}
            autoFit
            showAxes
            showGrid
            showLabels
            showFaces
          />
        </div>
        {selectedId ? (
          <p className="mt-2 text-xs text-slate-400">
            Đang chọn: <span className="font-mono text-indigo-300">{selectedId}</span>
          </p>
        ) : null}
      </Section>

      {/* Metadata */}
      <Section title="Thông tin chung">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <div>
            <label className={labelCls}>shapeKey</label>
            <input
              className={inputCls + ' font-mono'}
              value={shapeKey}
              disabled={!isNew}
              onChange={(e) => setShapeKey(e.target.value)}
            />
          </div>
          <div>
            <label className={labelCls}>Tên (vi)</label>
            <input className={inputCls} value={nameVi} onChange={(e) => setNameVi(e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Loại</label>
            <select className={inputCls} value={type} onChange={(e) => setType(e.target.value as ShapeRecord['type'])}>
              <option value="polyhedron">polyhedron</option>
              <option value="curved">curved</option>
              <option value="flat">flat</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Cấp</label>
            <select className={inputCls} value={level} onChange={(e) => setLevel(e.target.value as ShapeRecord['level'])}>
              <option value="cap2">cap2</option>
              <option value="cap3">cap3</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>surfaceType</label>
            <input className={inputCls} value={surfaceType} onChange={(e) => setSurfaceType(e.target.value)} placeholder="(trống)" />
          </div>
        </div>
      </Section>

      {/* Vertices */}
      <Section title="Đỉnh (vertices)" hint="toạ độ chỉnh trực tiếp">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-slate-500">
              <th className="pb-1">id</th><th>x</th><th>y</th><th>z</th><th>label</th><th></th>
            </tr>
          </thead>
          <tbody>
            {vertices.map((v, i) => (
              <tr key={i}>
                <td className="pr-2 py-0.5"><input className={inputCls + ' font-mono'} value={v.id} onChange={(e) => setVertices(vertices.map((x, j) => j === i ? { ...x, id: e.target.value } : x))} /></td>
                {(['x', 'y', 'z'] as const).map((axis) => (
                  <td key={axis} className="pr-2"><input type="number" step="0.1" className={numCls} value={v.position[axis]} onChange={(e) => setVertices(vertices.map((x, j) => j === i ? { ...x, position: { ...x.position, [axis]: Number(e.target.value) } } : x))} /></td>
                ))}
                <td className="pr-2"><input className={inputCls} value={v.label} onChange={(e) => setVertices(vertices.map((x, j) => j === i ? { ...x, label: e.target.value } : x))} /></td>
                <td><button onClick={() => setVertices(vertices.filter((_, j) => j !== i))} className="px-2 text-rose-400 hover:text-rose-300">✕</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        <button onClick={() => setVertices([...vertices, { id: '', position: { x: 0, y: 0, z: 0 }, label: '' }])} className="mt-2 rounded-md border border-slate-700 px-2 py-1 text-xs text-slate-300 hover:bg-slate-800">+ Thêm đỉnh</button>
      </Section>

      {/* Edges */}
      <Section title="Cạnh (edges)">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-xs text-slate-500"><th className="pb-1">id</th><th>from</th><th>to</th><th>type</th><th>length</th><th>paramKey</th><th></th></tr></thead>
          <tbody>
            {edges.map((e, i) => (
              <tr key={i}>
                <td className="pr-2 py-0.5"><input className={inputCls + ' font-mono'} value={e.id} onChange={(ev) => setEdges(edges.map((x, j) => j === i ? { ...x, id: ev.target.value } : x))} /></td>
                <td className="pr-2"><input className={inputCls + ' font-mono'} value={e.from} onChange={(ev) => setEdges(edges.map((x, j) => j === i ? { ...x, from: ev.target.value } : x))} /></td>
                <td className="pr-2"><input className={inputCls + ' font-mono'} value={e.to} onChange={(ev) => setEdges(edges.map((x, j) => j === i ? { ...x, to: ev.target.value } : x))} /></td>
                <td className="pr-2">
                  <select className={inputCls} value={e.type} onChange={(ev) => setEdges(edges.map((x, j) => j === i ? { ...x, type: ev.target.value as GeometryEdge['type'] } : x))}>
                    {['base', 'lateral', 'diagonal', 'axis', 'radius', 'special'].map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </td>
                <td className="pr-2"><input type="number" step="0.1" className={numCls} value={e.length ?? ''} onChange={(ev) => setEdges(edges.map((x, j) => j === i ? { ...x, length: ev.target.value === '' ? undefined : Number(ev.target.value) } : x))} /></td>
                <td className="pr-2"><input className={inputCls + ' font-mono'} value={e.paramKey ?? ''} onChange={(ev) => setEdges(edges.map((x, j) => j === i ? { ...x, paramKey: ev.target.value || undefined } : x))} /></td>
                <td><button onClick={() => setEdges(edges.filter((_, j) => j !== i))} className="px-2 text-rose-400 hover:text-rose-300">✕</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        <button onClick={() => setEdges([...edges, { id: '', from: '', to: '', type: 'base' }])} className="mt-2 rounded-md border border-slate-700 px-2 py-1 text-xs text-slate-300 hover:bg-slate-800">+ Thêm cạnh</button>
      </Section>

      {/* Faces */}
      <Section title="Mặt (faces)" hint="vertices: id cách nhau bởi dấu phẩy">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-xs text-slate-500"><th className="pb-1">id</th><th>vertices</th><th>type</th><th>area</th><th></th></tr></thead>
          <tbody>
            {faces.map((f, i) => (
              <tr key={i}>
                <td className="pr-2 py-0.5"><input className={inputCls + ' font-mono'} value={f.id} onChange={(ev) => setFaces(faces.map((x, j) => j === i ? { ...x, id: ev.target.value } : x))} /></td>
                <td className="pr-2"><input className={inputCls + ' font-mono'} value={f.vertices.join(',')} onChange={(ev) => setFaces(faces.map((x, j) => j === i ? { ...x, vertices: ev.target.value.split(',').map((s) => s.trim()).filter(Boolean) } : x))} /></td>
                <td className="pr-2">
                  <select className={inputCls} value={f.type} onChange={(ev) => setFaces(faces.map((x, j) => j === i ? { ...x, type: ev.target.value as GeometryFace['type'] } : x))}>
                    {['base', 'lateral', 'top', 'cross_section'].map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </td>
                <td className="pr-2"><input type="number" step="0.1" className={numCls} value={f.area ?? ''} onChange={(ev) => setFaces(faces.map((x, j) => j === i ? { ...x, area: ev.target.value === '' ? undefined : Number(ev.target.value) } : x))} /></td>
                <td><button onClick={() => setFaces(faces.filter((_, j) => j !== i))} className="px-2 text-rose-400 hover:text-rose-300">✕</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        <button onClick={() => setFaces([...faces, { id: '', vertices: [], type: 'base' }])} className="mt-2 rounded-md border border-slate-700 px-2 py-1 text-xs text-slate-300 hover:bg-slate-800">+ Thêm mặt</button>
      </Section>

      {/* Special points + measurements */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="Điểm đặc biệt (specialPoints)">
          {specialPoints.map((sp, i) => (
            <div key={i} className="mb-2 grid grid-cols-[1fr_repeat(3,4rem)_auto] gap-1">
              <input className={inputCls + ' font-mono'} placeholder="id" value={sp.id} onChange={(e) => setSpecialPoints(specialPoints.map((x, j) => j === i ? { ...x, id: e.target.value } : x))} />
              {(['x', 'y', 'z'] as const).map((axis) => (
                <input key={axis} type="number" step="0.1" className={numCls} value={sp.position[axis]} onChange={(e) => setSpecialPoints(specialPoints.map((x, j) => j === i ? { ...x, position: { ...x.position, [axis]: Number(e.target.value) } } : x))} />
              ))}
              <button onClick={() => setSpecialPoints(specialPoints.filter((_, j) => j !== i))} className="px-2 text-rose-400">✕</button>
            </div>
          ))}
          <button onClick={() => setSpecialPoints([...specialPoints, { id: '', position: { x: 0, y: 0, z: 0 }, label: '', description: '' }])} className="rounded-md border border-slate-700 px-2 py-1 text-xs text-slate-300 hover:bg-slate-800">+ Thêm điểm</button>
        </Section>

        <Section title="Số đo (measurements)">
          {measurements.map((m, i) => (
            <div key={i} className="mb-2 flex gap-1">
              <input className={inputCls + ' font-mono'} placeholder="key" value={m.key} onChange={(e) => setMeasurements(measurements.map((x, j) => j === i ? { ...x, key: e.target.value } : x))} />
              <input type="number" step="0.01" className={numCls + ' w-32'} value={m.value} onChange={(e) => setMeasurements(measurements.map((x, j) => j === i ? { ...x, value: Number(e.target.value) } : x))} />
              <button onClick={() => setMeasurements(measurements.filter((_, j) => j !== i))} className="px-2 text-rose-400">✕</button>
            </div>
          ))}
          <button onClick={() => setMeasurements([...measurements, { key: '', value: 0 }])} className="rounded-md border border-slate-700 px-2 py-1 text-xs text-slate-300 hover:bg-slate-800">+ Thêm số đo</button>
        </Section>
      </div>

      {/* String lists */}
      <Section title="Danh sách văn bản">
        <div className="grid gap-3 md:grid-cols-3">
          <LineListField label="parserKeywords" value={parserKeywords} onChange={setParserKeywords} />
          <LineListField label="suggestedQuestions" value={suggestedQuestions} onChange={setSuggestedQuestions} />
        </div>
      </Section>

      {/* JSON content */}
      <Section title="Nội dung dạy học (JSON)" hint="chỉnh trực tiếp JSON">
        <div className="grid gap-3 md:grid-cols-2">
          {JSON_FIELDS.map((f) => (
            <JsonField
              key={f}
              label={f}
              text={jsonText[f]}
              error={jsonErrors[f]}
              onChange={(next) => setJsonText({ ...jsonText, [f]: next })}
            />
          ))}
        </div>
      </Section>
    </div>
  )
}
