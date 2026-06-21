'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { ShapeRecord, ShapeSummary } from '@/db/shapeRecord'
import { useUrlParam } from '@/hooks/useUrlParam'
import { ShapeEditor } from './ShapeEditor'
import {
  createShape,
  deleteShape,
  generateFromProblem,
  getOriginals,
  getShape,
  listShapes,
  rebuildShape,
  resetShape,
  saveOriginals,
  setCurriculumDefaults,
  setShapeVisible,
  updateShape,
} from './adminApi'

function emptyRecord(): ShapeRecord {
  return {
    shapeKey: '',
    nameVi: '',
    type: 'polyhedron',
    level: 'cap3',
    topology: { vertices: 0, edges: 0, faces: 0, euler: null },
    fallbackSpec: { shape: '', vertices: [], params: {}, conditions: [] },
    formulas: {},
    suggestedQuestions: [],
    parserKeywords: [],
    examples: [],
    vertices: [],
    edges: [],
    faces: [],
    specialPoints: [],
    measurements: {},
    modelConstructionSteps: [],
  }
}

type Banner = { kind: 'ok' | 'err'; text: string } | null

const GRADES = ['lop6', 'lop7', 'lop8', 'lop9'] as const

export function AdminShapesClient() {
  const [shapes, setShapes] = useState<ShapeSummary[]>([])
  const [version, setVersion] = useState(0)
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [shapeParam, setShapeParam] = useUrlParam('shape')
  const [editing, setEditing] = useState<ShapeRecord | null>(null)
  const [editingIsNew, setEditingIsNew] = useState(false)
  const [busy, setBusy] = useState(false)
  const [banner, setBanner] = useState<Banner>(null)
  const [search, setSearch] = useState('')

  // View: shape editor vs originals JSON manager
  const [view, setView] = useState<'shapes' | 'originals'>('shapes')
  const [originalsText, setOriginalsText] = useState('')
  const [originalsBusy, setOriginalsBusy] = useState(false)

  // Generate-from-problem panel
  const [showGen, setShowGen] = useState(false)
  const [genPrompt, setGenPrompt] = useState('')
  const [genShapeKey, setGenShapeKey] = useState('')
  const [genGrade, setGenGrade] = useState<(typeof GRADES)[number]>('lop9')
  const [genBusy, setGenBusy] = useState(false)

  const refreshList = useCallback(async () => {
    try {
      const data = await listShapes()
      setShapes(data.shapes.sort((a, b) => a.shapeKey.localeCompare(b.shapeKey)))
      setVersion(data.version)
    } catch (e) {
      setBanner({ kind: 'err', text: e instanceof Error ? e.message : 'Không tải được danh sách' })
    }
  }, [])

  useEffect(() => {
    void refreshList()
  }, [refreshList])

  const openShape = useCallback(async (key: string) => {
    setBusy(true)
    setBanner(null)
    try {
      const record = await getShape(key)
      setEditing(record)
      setEditingIsNew(false)
      setSelectedKey(key)
      setShapeParam(key)
      setShowGen(false)
      setView('shapes')
    } catch (e) {
      setBanner({ kind: 'err', text: e instanceof Error ? e.message : 'Không tải được hình' })
    } finally {
      setBusy(false)
    }
  }, [setShapeParam])

  function openNew() {
    setEditing(emptyRecord())
    setEditingIsNew(true)
    setSelectedKey(null)
    setShapeParam(null)
    setShowGen(false)
    setView('shapes')
    setBanner(null)
  }

  // Restore selection from URL (?shape=<shapeKey>) on first load / F5.
  const restoredRef = useRef(false)
  useEffect(() => {
    if (restoredRef.current) return
    if (shapes.length === 0) return
    restoredRef.current = true
    if (shapeParam && shapes.some((s) => s.shapeKey === shapeParam)) {
      void openShape(shapeParam)
    }
  }, [shapes, shapeParam, openShape])

  async function handleSave(record: ShapeRecord) {
    setBusy(true)
    setBanner(null)
    try {
      if (editingIsNew) await createShape(record)
      else await updateShape(record)
      await refreshList()
      await openShape(record.shapeKey)
      setBanner({ kind: 'ok', text: `Đã lưu "${record.shapeKey}"` })
    } catch (e) {
      setBanner({ kind: 'err', text: e instanceof Error ? e.message : 'Lưu thất bại' })
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete() {
    if (!editing || editingIsNew) return
    if (!window.confirm(`Xóa hình "${editing.shapeKey}"? Không thể hoàn tác.`)) return
    setBusy(true)
    try {
      await deleteShape(editing.shapeKey)
      setEditing(null)
      setSelectedKey(null)
      await refreshList()
      setBanner({ kind: 'ok', text: 'Đã xóa' })
    } catch (e) {
      setBanner({ kind: 'err', text: e instanceof Error ? e.message : 'Xóa thất bại' })
    } finally {
      setBusy(false)
    }
  }

  async function handleRebuild() {
    if (!editing || editingIsNew) return
    setBusy(true)
    try {
      const record = await rebuildShape(editing.shapeKey)
      setEditing(record)
      setBanner({ kind: 'ok', text: 'Đã dựng lại hình học từ fallbackSpec' })
    } catch (e) {
      setBanner({ kind: 'err', text: e instanceof Error ? e.message : 'Dựng lại thất bại' })
    } finally {
      setBusy(false)
    }
  }

  async function handleReset() {
    if (!editing || editingIsNew) return
    if (!window.confirm(`Khôi phục "${editing.shapeKey}" về dữ liệu gốc? Thay đổi hiện tại sẽ mất.`)) return
    setBusy(true)
    try {
      const record = await resetShape(editing.shapeKey)
      setEditing(record)
      await refreshList()
      setBanner({ kind: 'ok', text: `Đã khôi phục "${record.shapeKey}" về bản gốc` })
    } catch (e) {
      setBanner({ kind: 'err', text: e instanceof Error ? e.message : 'Khôi phục thất bại' })
    } finally {
      setBusy(false)
    }
  }

  const openOriginals = useCallback(async () => {
    setView('originals')
    setEditing(null)
    setSelectedKey(null)
    setShowGen(false)
    setBanner(null)
    setOriginalsBusy(true)
    try {
      const json = await getOriginals()
      // pretty-print for editing
      try {
        setOriginalsText(JSON.stringify(JSON.parse(json), null, 2))
      } catch {
        setOriginalsText(json)
      }
    } catch (e) {
      setBanner({ kind: 'err', text: e instanceof Error ? e.message : 'Không tải được dữ liệu gốc' })
    } finally {
      setOriginalsBusy(false)
    }
  }, [])

  async function handleSaveOriginals() {
    setOriginalsBusy(true)
    setBanner(null)
    try {
      await saveOriginals(originalsText)
      setBanner({ kind: 'ok', text: 'Đã lưu dữ liệu gốc' })
    } catch (e) {
      setBanner({ kind: 'err', text: e instanceof Error ? e.message : 'Lưu dữ liệu gốc thất bại' })
    } finally {
      setOriginalsBusy(false)
    }
  }

  async function handleGenerate() {
    if (!genPrompt.trim()) return
    setGenBusy(true)
    setBanner(null)
    try {
      const result = await generateFromProblem({
        prompt: genPrompt.trim(),
        shapeKey: genShapeKey.trim() || undefined,
        grade: genGrade,
      })
      const exists = shapes.some((s) => s.shapeKey === result.record.shapeKey)
      setEditing(result.record)
      setEditingIsNew(!exists)
      setSelectedKey(exists ? result.record.shapeKey : null)
      setShowGen(false)
      const note = result.usedAI ? 'AI đã tạo nội dung. ' : 'Dùng nội dung mẫu (không có AI). '
      setBanner({
        kind: 'ok',
        text: note + 'Kiểm tra & chỉnh sửa rồi bấm Lưu.' + (result.warnings.length ? ' ⚠ ' + result.warnings.join(' ') : ''),
      })
    } catch (e) {
      setBanner({ kind: 'err', text: e instanceof Error ? e.message : 'Tạo dữ liệu thất bại' })
    } finally {
      setGenBusy(false)
    }
  }

  async function handleCurriculumDefaults() {
    if (busy) return
    if (!confirm('Đặt lại hiển thị theo chương trình học (lớp 7–9)?\n8 hình cơ bản sẽ hiện, các hình còn lại ẩn.')) return
    setBusy(true)
    try {
      await setCurriculumDefaults()
      await refreshList()
      setBanner({ kind: 'ok', text: 'Đã đặt mặc định chương trình học' })
    } catch (e) {
      setBanner({ kind: 'err', text: e instanceof Error ? e.message : 'Lỗi' })
    } finally {
      setBusy(false)
    }
  }

  async function handleToggleVisible(shapeKey: string, currentVisible: boolean) {
    try {
      await setShapeVisible(shapeKey, !currentVisible)
      setShapes((prev) => prev.map((s) => s.shapeKey === shapeKey ? { ...s, visible: !currentVisible } : s))
    } catch (e) {
      setBanner({ kind: 'err', text: e instanceof Error ? e.message : 'Không thể đổi hiển thị' })
    }
  }

  const q = search.trim().toLowerCase()
  const filteredShapes = q
    ? shapes.filter(
        (s) => s.nameVi.toLowerCase().includes(q) || s.shapeKey.toLowerCase().includes(q),
      )
    : shapes

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 px-6 py-4">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-black tracking-tight">Thư viện hình học · Quản trị</h1>
          <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-400">v{version}</span>
          <nav className="ml-4 flex gap-1 rounded-lg border border-slate-800 p-0.5">
            <button
              onClick={() => setView('shapes')}
              className={'rounded-md px-3 py-1 text-sm font-semibold ' + (view === 'shapes' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200')}
            >
              Hình
            </button>
            <button
              onClick={openOriginals}
              className={'rounded-md px-3 py-1 text-sm font-semibold ' + (view === 'originals' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200')}
            >
              Dữ liệu gốc (JSON)
            </button>
          </nav>
          <span className="ml-auto text-sm text-slate-500">{shapes.length} hình</span>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="h-[calc(100vh-65px)] w-64 shrink-0 overflow-y-auto border-r border-slate-800 p-3">
          <div className="mb-3 flex gap-2">
            <button
              onClick={openNew}
              className="flex-1 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-bold text-white hover:bg-indigo-500"
            >
              + Hình mới
            </button>
            <button
              onClick={() => { setShowGen(true); setEditing(null); setSelectedKey(null) }}
              className="flex-1 rounded-lg border border-emerald-700 bg-emerald-900/30 px-3 py-2 text-sm font-bold text-emerald-200 hover:bg-emerald-900/60"
            >
              ✨ Từ đề bài
            </button>
          </div>
          <button
            onClick={handleCurriculumDefaults}
            disabled={busy}
            className="mb-2 w-full rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-400 hover:bg-slate-800 hover:text-slate-200 disabled:opacity-50"
          >
            Mặc định CT học (7–9)
          </button>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm hình… (tên / shapeKey)"
            className="mb-2 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none"
          />
          <ul className="space-y-0.5">
            {filteredShapes.length === 0 ? (
              <li className="px-2 py-3 text-center text-xs text-slate-600">Không có hình khớp</li>
            ) : null}
            {filteredShapes.map((s) => {
              const isVisible = s.visible !== false
              return (
                <li key={s.shapeKey} className="flex items-center gap-0.5">
                  <button
                    onClick={() => openShape(s.shapeKey)}
                    className={
                      'min-w-0 flex-1 rounded-md px-2 py-1.5 text-left text-sm transition ' +
                      (selectedKey === s.shapeKey ? 'bg-indigo-600/30 text-indigo-100' : 'text-slate-300 hover:bg-slate-800')
                    }
                  >
                    <span className="block truncate font-medium">{s.nameVi}</span>
                    <span className="block truncate font-mono text-xs text-slate-500">{s.shapeKey}</span>
                  </button>
                  <button
                    title={isVisible ? 'Đang hiện — click để ẩn' : 'Đang ẩn — click để hiện'}
                    onClick={() => handleToggleVisible(s.shapeKey, isVisible)}
                    className="shrink-0 rounded p-1 text-xs hover:bg-slate-700"
                  >
                    <span className={isVisible ? 'text-emerald-400' : 'text-slate-600'}>
                      {isVisible ? '●' : '○'}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </aside>

        {/* Main */}
        <main className="h-[calc(100vh-65px)] flex-1 overflow-y-auto p-6">
          {banner ? (
            <div
              className={
                'mb-4 rounded-lg px-4 py-2 text-sm ' +
                (banner.kind === 'ok'
                  ? 'border border-emerald-700 bg-emerald-950/50 text-emerald-200'
                  : 'border border-rose-700 bg-rose-950/50 text-rose-200')
              }
            >
              {banner.text}
            </div>
          ) : null}

          {view === 'originals' ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div>
                  <h2 className="text-lg font-bold">Dữ liệu gốc (1 cục JSON)</h2>
                  <p className="text-sm text-slate-400">
                    Toàn bộ thư viện lưu trong 1 record JSON. Dùng để khôi phục khi sửa/xoá nhầm. Sửa trực tiếp rồi lưu.
                  </p>
                </div>
                <button
                  onClick={handleSaveOriginals}
                  disabled={originalsBusy}
                  className="ml-auto rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-500 disabled:opacity-50"
                >
                  {originalsBusy ? 'Đang lưu…' : 'Lưu dữ liệu gốc'}
                </button>
              </div>
              <textarea
                className="h-[calc(100vh-220px)] w-full rounded-lg border border-slate-800 bg-slate-900 p-3 font-mono text-xs text-slate-100 focus:border-indigo-500 focus:outline-none"
                value={originalsText}
                onChange={(e) => setOriginalsText(e.target.value)}
                spellCheck={false}
                placeholder={originalsBusy ? 'Đang tải…' : ''}
              />
            </div>
          ) : showGen ? (
            <div className="mx-auto max-w-2xl rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
              <h2 className="mb-1 text-lg font-bold">Tạo dữ liệu từ đề bài</h2>
              <p className="mb-4 text-sm text-slate-400">
                Nhập đề bài tiếng Việt. Hệ thống dựng hình học và sinh nội dung dạy học để giáo viên đỡ phải nhập tay.
                Kết quả là bản nháp — kiểm tra rồi lưu.
              </p>
              <textarea
                className="mb-3 min-h-[120px] w-full rounded-lg border border-slate-700 bg-slate-900 p-3 text-sm focus:border-indigo-500 focus:outline-none"
                placeholder="VD: Cho hình chóp S.ABCD có đáy là hình vuông cạnh 4cm, chiều cao 6cm…"
                value={genPrompt}
                onChange={(e) => setGenPrompt(e.target.value)}
              />
              <div className="mb-4 flex flex-wrap gap-3">
                <div>
                  <label className="mb-1 block text-xs text-slate-400">shapeKey (tuỳ chọn)</label>
                  <input
                    className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 font-mono text-sm focus:border-indigo-500 focus:outline-none"
                    placeholder="tự nhận diện"
                    value={genShapeKey}
                    onChange={(e) => setGenShapeKey(e.target.value)}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-slate-400">Lớp</label>
                  <select
                    className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-sm focus:border-indigo-500 focus:outline-none"
                    value={genGrade}
                    onChange={(e) => setGenGrade(e.target.value as (typeof GRADES)[number])}
                  >
                    {GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleGenerate}
                  disabled={genBusy || !genPrompt.trim()}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-500 disabled:opacity-50"
                >
                  {genBusy ? 'Đang tạo…' : 'Tạo bản nháp'}
                </button>
                <button onClick={() => setShowGen(false)} className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800">
                  Hủy
                </button>
              </div>
            </div>
          ) : editing ? (
            <ShapeEditor
              key={(editingIsNew ? 'new:' : 'edit:') + editing.shapeKey}
              initial={editing}
              isNew={editingIsNew}
              busy={busy}
              onSave={handleSave}
              onDelete={handleDelete}
              onRebuild={handleRebuild}
              onReset={handleReset}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-slate-600">
              Chọn một hình bên trái, tạo hình mới, hoặc tạo từ đề bài.
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
