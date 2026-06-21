#!/usr/bin/env npx tsx
/**
 * scripts/update-lesson-content.ts
 *
 * Generates lessonContent for all shapes in shapes-data.ts using DeepSeek AI.
 * Imports geometry engine and shapes-data directly — no separate topology step.
 *
 * Usage:
 *   npx tsx scripts/update-lesson-content.ts              # all shapes
 *   npx tsx scripts/update-lesson-content.ts cylinder     # single shape
 *
 * Requires DEEPSEEK_API_KEY (or OPENROUTER_API_KEY) in .env.local
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { GeometryEngine } from '../src/lib/geo-ai/geometry-engine/index'
import { getShape } from '../src/lib/geo-ai/data/index'
import { generateLessonContent, type LessonInput, type ShapeTopology, type ShapeExample } from '../src/lib/geo-ai/generateLesson'
import type { GeometrySpec, GeometryModel } from '../src/types/geo-ai'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const OUT_FILE = path.join(ROOT, 'src/lib/geo-ai/data/shapes-data.ts')

// ── Load .env.local ───────────────────────────────────────────────────────────
function loadEnv() {
  const p = path.join(ROOT, '.env.local')
  if (!fs.existsSync(p)) return
  for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z_]+)=(.+)$/)
    if (m && m[1] && m[2]) process.env[m[1]] = m[2].trim()
  }
}
loadEnv()

const API_KEY = process.env.DEEPSEEK_API_KEY || process.env.OPENROUTER_API_KEY || ''
if (!API_KEY) {
  console.error('Missing DEEPSEEK_API_KEY or OPENROUTER_API_KEY in .env.local')
  process.exit(1)
}

// ── Default specs to build topology ──────────────────────────────────────────
const DEFAULT_SPECS: Record<string, GeometrySpec> = {
  cylinder:           { shape: 'cylinder',          params: { r: 2, h: 4 },       vertices: [] },
  cone:               { shape: 'cone',              params: { r: 2, h: 4 },       vertices: [] },
  sphere:             { shape: 'sphere',            params: { r: 2 },             vertices: [] },
  cube:               { shape: 'cube',              params: { a: 3 },             vertices: [] },
  rectangular_prism:  { shape: 'rectangular_prism', params: { a: 4, b: 3, h: 5 }, vertices: [] },
  triangular_prism:   { shape: 'triangular_prism',  params: { a: 3, h: 5 },       vertices: [] },
  square_pyramid:     { shape: 'square_pyramid',    params: { a: 4, h: 5 },       vertices: [] },
  triangular_pyramid: { shape: 'triangular_pyramid',params: { a: 4, h: 5 },       vertices: [] },
  tetrahedron:        { shape: 'tetrahedron',       params: { a: 4 },             vertices: [] },
  general_pyramid:    { shape: 'general_pyramid',   params: { a: 4, h: 5 },       vertices: [] },
  hyperboloid:        { shape: 'hyperboloid',       params: { r: 1, h: 3 },       vertices: [] },
  paraboloid:         { shape: 'paraboloid',        params: { r: 1, h: 3 },       vertices: [] },
}

// ── Vertex descriptions per shape ─────────────────────────────────────────────
// Maps vertex ID → role description in Vietnamese
const VERTEX_DESC: Record<string, Record<string, string>> = {
  cylinder:           { O: 'tâm đáy dưới', O1: 'tâm đáy trên' },
  cone:               { O: 'tâm đáy', S: 'đỉnh nón' },
  sphere:             { O: 'tâm cầu' },
  cube:               { A: 'đáy dưới góc trước trái', B: 'đáy dưới góc trước phải', C: 'đáy dưới góc sau phải', D: 'đáy dưới góc sau trái', A1: 'đỉnh trên tương ứng A', B1: 'đỉnh trên tương ứng B', C1: 'đỉnh trên tương ứng C', D1: 'đỉnh trên tương ứng D' },
  rectangular_prism:  { A: 'đáy dưới góc trước trái', B: 'đáy dưới góc trước phải', C: 'đáy dưới góc sau phải', D: 'đáy dưới góc sau trái', A1: 'đỉnh trên tương ứng A', B1: 'đỉnh trên tương ứng B', C1: 'đỉnh trên tương ứng C', D1: 'đỉnh trên tương ứng D' },
  triangular_prism:   { A: 'đáy dưới tam giác', B: 'đáy dưới tam giác', C: 'đáy dưới tam giác', A1: 'đáy trên tương ứng A', B1: 'đáy trên tương ứng B', C1: 'đáy trên tương ứng C' },
  square_pyramid:     { A: 'đáy hình vuông', B: 'đáy hình vuông', C: 'đáy hình vuông', D: 'đáy hình vuông', S: 'đỉnh chóp (trên trục đối xứng)' },
  triangular_pyramid: { A: 'đáy tam giác', B: 'đáy tam giác', C: 'đáy tam giác', S: 'đỉnh chóp' },
  tetrahedron:        { A: 'đáy tam giác đều', B: 'đáy tam giác đều', C: 'đáy tam giác đều', D: 'đỉnh tứ diện' },
  general_pyramid:    { A: 'đáy đa giác', B: 'đáy đa giác', C: 'đáy đa giác', D: 'đáy đa giác', S: 'đỉnh chóp' },
  hyperboloid:        { O: 'tâm đối xứng' },
  paraboloid:         { O: 'đỉnh paraboloid (điểm thấp nhất)' },
}

// ── Edge descriptions per shape ───────────────────────────────────────────────
function buildEdgeDesc(model: GeometryModel): Record<string, string> {
  const desc: Record<string, string> = {}
  for (const e of model.edges) {
    desc[e.id] = `nối ${e.from}–${e.to} (${e.type})`
  }
  return desc
}

// ── Face descriptions per shape ───────────────────────────────────────────────
const FACE_DESC_OVERRIDE: Record<string, Record<string, string>> = {
  cylinder: { bottom: 'mặt đáy dưới hình tròn', top: 'mặt đáy trên hình tròn', lateral: 'mặt xung quanh (khai triển = hình chữ nhật)' },
  cone:     { base: 'mặt đáy hình tròn', lateral: 'mặt xung quanh hình nón' },
  sphere:   { sphere: 'toàn bộ mặt cầu' },
}

function buildFaceDesc(shapeKey: string, model: GeometryModel): Record<string, string> {
  const override = FACE_DESC_OVERRIDE[shapeKey] ?? {}
  const desc: Record<string, string> = { ...override }
  for (const f of model.faces) {
    if (!desc[f.id]) {
      desc[f.id] = `mặt ${f.type}, đỉnh: ${f.vertices.join('-')}`
    }
  }
  return desc
}

// ── Shape metadata ────────────────────────────────────────────────────────────
const SHAPE_META: Record<string, Omit<LessonInput, 'topology' | 'vertexDescriptions' | 'edgeDescriptions' | 'faceDescriptions' | 'examples'>> = {
  cylinder: {
    shapeKey: 'cylinder', nameVi: 'Hình trụ', level: 'cap2',
    levelLabel: 'Lớp 8–9 (Cấp 2)',
    curriculumNote: 'Toán lớp 9 — Hình học không gian cơ bản',
    knownFormulas: ['V = \\pi r^2 h', 'S_{xq} = 2\\pi rh', 'S_{tp} = 2\\pi r(r+h)', 'C = 2\\pi r'],
  },
  cone: {
    shapeKey: 'cone', nameVi: 'Hình nón', level: 'cap2',
    levelLabel: 'Lớp 8–9 (Cấp 2)',
    curriculumNote: 'Toán lớp 9 — Hình học không gian cơ bản',
    knownFormulas: ['V = \\frac{1}{3}\\pi r^2 h', 'S_{xq} = \\pi rl', 'S_{tp} = \\pi r(r+l)', 'l = \\sqrt{r^2+h^2}'],
  },
  sphere: {
    shapeKey: 'sphere', nameVi: 'Hình cầu', level: 'cap2',
    levelLabel: 'Lớp 8–9 (Cấp 2)',
    curriculumNote: 'Toán lớp 9 — Hình học không gian cơ bản',
    knownFormulas: ['V = \\frac{4}{3}\\pi r^3', 'S = 4\\pi r^2'],
  },
  cube: {
    shapeKey: 'cube', nameVi: 'Hình lập phương', level: 'cap2',
    levelLabel: 'Lớp 6–7 (Cấp 2)',
    curriculumNote: 'Toán lớp 7 — Hình học cơ bản',
    knownFormulas: ['V = a^3', 'S_{tp} = 6a^2', 'S_{xq} = 4a^2', 'd = a\\sqrt{3}'],
  },
  rectangular_prism: {
    shapeKey: 'rectangular_prism', nameVi: 'Hình hộp chữ nhật', level: 'cap2',
    levelLabel: 'Lớp 6–7 (Cấp 2)',
    curriculumNote: 'Toán lớp 7 — Hình học cơ bản',
    knownFormulas: ['V = abc', 'S_{tp} = 2(ab+bc+ca)', 'S_{xq} = 2(a+b)c', 'd = \\sqrt{a^2+b^2+c^2}'],
  },
  triangular_prism: {
    shapeKey: 'triangular_prism', nameVi: 'Lăng trụ tam giác', level: 'cap3',
    levelLabel: 'Lớp 10–11 (Cấp 3)',
    curriculumNote: 'Toán lớp 11 — Hình học không gian',
    knownFormulas: ['V = S_{đáy}\\cdot h', 'S_{xq} = C_{đáy}\\cdot h', 'S_{đáy} = \\frac{1}{2}ah_{\\triangle}'],
  },
  square_pyramid: {
    shapeKey: 'square_pyramid', nameVi: 'Hình chóp tứ giác đều S.ABCD', level: 'cap3',
    levelLabel: 'Lớp 10–11 (Cấp 3)',
    curriculumNote: 'Toán lớp 11 — Hình học không gian',
    knownFormulas: ['V = \\frac{1}{3}a^2 h', 'S_{xq} = 2al', 'S_{tp} = a^2+2al', 'l = \\sqrt{h^2+(a/2)^2}'],
  },
  triangular_pyramid: {
    shapeKey: 'triangular_pyramid', nameVi: 'Hình chóp tam giác S.ABC', level: 'cap3',
    levelLabel: 'Lớp 10–11 (Cấp 3)',
    curriculumNote: 'Toán lớp 11 — Hình học không gian',
    knownFormulas: ['V = \\frac{1}{3}S_{đáy}h', 'S_{đáy} = \\frac{\\sqrt{3}}{4}a^2'],
  },
  tetrahedron: {
    shapeKey: 'tetrahedron', nameVi: 'Tứ diện đều ABCD', level: 'cap3',
    levelLabel: 'Lớp 10–11 (Cấp 3)',
    curriculumNote: 'Toán lớp 11 — Hình học không gian nâng cao',
    knownFormulas: ['V = \\frac{a^3\\sqrt{2}}{12}', 'S_{tp} = a^2\\sqrt{3}', 'h = a\\sqrt{\\tfrac{2}{3}}'],
  },
  general_pyramid: {
    shapeKey: 'general_pyramid', nameVi: 'Hình chóp tổng quát', level: 'cap3',
    levelLabel: 'Lớp 10–11 (Cấp 3)',
    curriculumNote: 'Toán lớp 11 — Hình học không gian',
    knownFormulas: ['V = \\frac{1}{3}S_{đáy}h'],
  },
  hyperboloid: {
    shapeKey: 'hyperboloid', nameVi: 'Mặt hyperboloid một tầng', level: 'cap3',
    levelLabel: 'Lớp 10–12 nâng cao',
    curriculumNote: 'Toán nâng cao / chuyên — Mặt bậc hai',
    knownFormulas: ['\\frac{x^2}{a^2}+\\frac{y^2}{b^2}-\\frac{z^2}{c^2}=1'],
  },
  paraboloid: {
    shapeKey: 'paraboloid', nameVi: 'Mặt paraboloid elliptic', level: 'cap3',
    levelLabel: 'Lớp 10–12 nâng cao',
    curriculumNote: 'Toán nâng cao / chuyên — Mặt bậc hai',
    knownFormulas: ['z = \\frac{x^2}{a^2}+\\frac{y^2}{b^2}'],
  },
}

// ── Serialize LessonContent → TypeScript source ───────────────────────────────
function esc(s: string) {
  return String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n')
}

function serializeLesson(lesson: ReturnType<typeof JSON.parse>): string {
  const indent = '        '
  const i2 = indent + '  '
  const i3 = i2 + '  '

  const recognition = (lesson.recognition as string[] ?? [])
    .map((s: string) => `${i2}'${esc(s)}'`).join(',\n')

  const objects = (lesson.objects as Array<{category: string; items: string[]}> ?? []).map(g => {
    const items = (g.items ?? []).map((it: string) => `${i3}'${esc(it)}'`).join(',\n')
    return `${i2}{\n${i2}  category: '${esc(g.category)}',\n${i2}  items: [\n${items},\n${i2}  ],\n${i2}}`
  }).join(',\n')

  const fmtFormula = (f: {title: string; description: string; latex: string}) =>
    `${i2}{ title: '${esc(f.title)}', description: '${esc(f.description)}', latex: '${esc(f.latex)}' }`

  const theorems = (lesson.theorems as Array<{title: string; description: string; latex: string}> ?? [])
    .map(fmtFormula).join(',\n')
  const formulas = (lesson.formulas as Array<{title: string; description: string; latex: string}> ?? [])
    .map(fmtFormula).join(',\n')

  return `${indent}lessonContent: {
${i2}recognition: [
${recognition},
${i2}],
${i2}objects: [
${objects},
${i2}],
${i2}theorems: [
${theorems},
${i2}],
${i2}formulas: [
${formulas},
${i2}],
${indent}},`
}

// ── Patch shapes-data.ts ──────────────────────────────────────────────────────
function patchShape(src: string, shapeKey: string, lessonTs: string): string {
  const shapeStart = new RegExp(`\\n    ${shapeKey}:\\s*\\{`)
  const match = shapeStart.exec(src)
  if (!match) { console.warn(`  ⚠ Shape "${shapeKey}" not found`); return src }
  const blockStart = match.index

  // Find this shape's closing '    },' — the FIRST '\n    },' after blockStart
  const shapeClose = src.indexOf('\n    },', blockStart + match[0].length)
  if (shapeClose === -1) { console.warn(`  ⚠ Shape close not found for "${shapeKey}"`); return src }

  // Check if lessonContent already exists within this shape's block
  const existingAt = src.indexOf('\n        lessonContent:', blockStart)
  if (existingAt !== -1 && existingAt < shapeClose) {
    // Replace from '\n        lessonContent:' up to (but not including) '\n    },'
    return src.slice(0, existingAt + 1) + lessonTs + src.slice(shapeClose)
  }

  // Insert lessonTs just before the shape's closing '\n    },'
  return src.slice(0, shapeClose) + '\n' + lessonTs + src.slice(shapeClose)
}

// ── Build topology from geometry engine ───────────────────────────────────────
function buildTopology(model: GeometryModel): ShapeTopology {
  const edgesByType: Record<string, string[]> = {}
  for (const e of model.edges) {
    edgesByType[e.type] = edgesByType[e.type] ?? []
    edgesByType[e.type]!.push(e.id)
  }
  const facesByType: Record<string, string[]> = {}
  for (const f of model.faces) {
    facesByType[f.type] = facesByType[f.type] ?? []
    facesByType[f.type]!.push(f.id)
  }
  return {
    vertices: Object.keys(model.vertices),
    edges: model.edges.map(e => e.id),
    faces: model.faces.map(f => f.id),
    edgesByType,
    facesByType,
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────
const targetArg = process.argv[2]
const keys = targetArg ? [targetArg] : Object.keys(SHAPE_META)

async function main() {
  let src = fs.readFileSync(OUT_FILE, 'utf8')

  for (const key of keys) {
    const meta = SHAPE_META[key]
    if (!meta) {
      console.error(`Unknown shape: "${key}". Available: ${Object.keys(SHAPE_META).join(', ')}`)
      continue
    }

    const spec = DEFAULT_SPECS[key]
    if (!spec) continue

    const idx = keys.indexOf(key) + 1
    console.log(`[${idx}/${keys.length}] ${meta.nameVi} (${meta.levelLabel}) ...`)

    // Build model from geometry engine
    const model = GeometryEngine.build(spec)
    const topology = buildTopology(model)

    // Get examples from shapes-data
    const shapeData = getShape(key as GeometrySpec['shape'])
    const examples: ShapeExample[] = [] // shape examples not stored per-shape currently

    const input: LessonInput = {
      ...meta,
      topology,
      vertexDescriptions: VERTEX_DESC[key] ?? {},
      edgeDescriptions: buildEdgeDesc(model),
      faceDescriptions: buildFaceDesc(key, model),
      examples,
    }

    let lesson
    try {
      lesson = await generateLessonContent(input, API_KEY)
      const nR = (lesson.recognition ?? []).length
      const nO = (lesson.objects as unknown[])?.length ?? 0
      const nT = (lesson.theorems ?? []).length
      const nF = (lesson.formulas ?? []).length
      console.log(`  ✓ DeepSeek: ${nR} recognition, ${nO} object groups, ${nT} theorems, ${nF} formulas`)
    } catch (err) {
      console.error(`  ✗ Error: ${(err as Error).message} — skipping`)
      continue
    }

    const lessonTs = serializeLesson(lesson)
    src = patchShape(src, key, lessonTs)
    console.log(`  ✓ Patched "${key}"`)

    if (idx < keys.length) await new Promise(r => setTimeout(r, 500))
  }

  fs.writeFileSync(OUT_FILE, src, 'utf8')
  console.log(`\n✅ Done — lessonContent updated for ${keys.length} shape(s).`)
  console.log('   Run: pnpm typecheck')
}

main().catch((err: Error) => {
  console.error('Fatal:', err.message)
  process.exit(1)
})
