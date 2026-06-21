#!/usr/bin/env npx tsx
/**
 * scripts/update-object-descriptions.ts
 *
 * Generates objectDescriptions for each shape: rich educational TTS narration
 * for every vertex, edge, and face shown in the 3D viewer.
 *
 * Usage:
 *   npx tsx scripts/update-object-descriptions.ts              # all shapes
 *   npx tsx scripts/update-object-descriptions.ts cylinder     # single shape
 *
 * Requires DEEPSEEK_API_KEY (or OPENROUTER_API_KEY) in .env.local
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { GeometryEngine } from '../src/lib/geo-ai/geometry-engine/index'
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
if (!API_KEY) { console.error('Missing DEEPSEEK_API_KEY'); process.exit(1) }

// ── Shape build specs ──────────────────────────────────────────────────────────
const SPECS: Record<string, GeometrySpec> = {
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

const SHAPE_INFO: Record<string, { nameVi: string; level: string }> = {
  cylinder:           { nameVi: 'Hình trụ',               level: 'cap2' },
  cone:               { nameVi: 'Hình nón',               level: 'cap2' },
  sphere:             { nameVi: 'Hình cầu',               level: 'cap2' },
  cube:               { nameVi: 'Hình lập phương',        level: 'cap2' },
  rectangular_prism:  { nameVi: 'Hình hộp chữ nhật',     level: 'cap2' },
  triangular_prism:   { nameVi: 'Lăng trụ tam giác',     level: 'cap3' },
  square_pyramid:     { nameVi: 'Hình chóp tứ giác đều', level: 'cap3' },
  triangular_pyramid: { nameVi: 'Hình chóp tam giác',    level: 'cap3' },
  tetrahedron:        { nameVi: 'Tứ diện đều',           level: 'cap3' },
  general_pyramid:    { nameVi: 'Hình chóp tổng quát',   level: 'cap3' },
  hyperboloid:        { nameVi: 'Mặt hyperboloid',        level: 'cap3' },
  paraboloid:         { nameVi: 'Mặt paraboloid',         level: 'cap3' },
}

// ── System prompt ─────────────────────────────────────────────────────────────
const SYSTEM = `Bạn là giáo viên Toán Hình học Không gian Việt Nam, giải thích các yếu tố hình học cho học sinh khi họ click vào mô hình 3D.

Nhiệm vụ: viết giải thích ngắn (1-2 câu) cho mỗi đỉnh/cạnh/mặt — học sinh click vào thì nghe giải thích đó.

Cấu trúc câu: bắt đầu bằng "Đây là [tên], [vai trò + đặc điểm]." — tất cả gộp thành một câu liền mạch, không tách thành hai câu kiểu "Đây là X. Nó là Y."

Ví dụ CẤU TRÚC TỐT (chú ý khoảng cách giữa chữ cái):
- "Đây là mặt đáy A B C, tam giác nằm phía dưới làm nền cho toàn bộ hình chóp."
- "Đây là đỉnh S, đỉnh chóp nằm thẳng phía trên tâm mặt đáy và cách đều các đỉnh đáy."
- "Đây là cạnh S A, cạnh bên nối đỉnh chóp S xuống đỉnh A ở đáy."
- "Đây là mặt bên S A B, tam giác cân có cạnh đáy A B và hai cạnh bên S A, S B bằng nhau."
- "Đây là mặt bên AC, C1A1, hình chữ nhật tạo bởi cạnh đáy AC và hai cạnh bên AA1, CC1."
- "Đây là mặt bên AB, B1A1, hình chữ nhật tạo bởi cạnh đáy AB và hai cạnh bên AA1, BB1."
- "Đây là đường tròn đáy, vòng tròn nằm phía dưới giới hạn phần dưới của hình trụ."

Ví dụ CẤU TRÚC XẤU (tránh):
- "Đây là mặt đáy A B C, một tam giác. Nó là mặt phẳng chứa ba đỉnh..." ← câu 2 lặp câu 1
- "Đây là cạnh A B. Cạnh này nối hai đỉnh A và B." ← tách vô nghĩa
- "Đây là mặt AB B1A1..." ← thiếu dấu phẩy giữa cặp cạnh
- "Đây là mặt A B, B1 A1..." ← thêm khoảng trắng thừa trong tên cạnh
- "Đây là đỉnh A." ← quá ngắn, không thông tin

Yêu cầu:
- Câu bắt đầu bằng "Đây là [tên đối tượng],"
- Sau dấu phẩy: vai trò + 1 đặc điểm hình học hữu ích trong cùng một mệnh đề
- Nếu cần câu 2: câu 2 phải thêm thông tin MỚI (tính chất, quan hệ), không lặp câu 1
- Ngôn ngữ NÓI (TTS): không ký hiệu toán học, không công thức, không số tính toán
- QUAN TRỌNG — cách viết tên trong câu (viết liền từng cạnh, không thêm khoảng trắng trong cạnh):
  • Đỉnh đơn: "đỉnh A", "đỉnh A1", "đỉnh B1"
  • Cạnh (2 đỉnh): viết liền — "cạnh AB", "cạnh AA1", "cạnh B1C1"
  • Mặt tam giác: viết liền — "mặt SAB", "mặt ABC"
  • Mặt tứ giác bên (lăng trụ/hộp): TÁCH THÀNH 2 CẶP CẠNH SONG SONG, ngăn bằng dấu phẩy
    "ABB1A1" → viết là "AB, B1A1"   (cạnh đáy AB và cạnh trên B1A1)
    "ACC1A1" → viết là "AC, C1A1"
    "BCC1B1" → viết là "BC, C1B1"
  • Mặt đáy đa giác: viết liền — "ABCD", "A1B1C1D1", "ABC"
- Cấp 2 (lớp 6-9): đơn giản, trực quan
- Cấp 3 (lớp 10-11): chính xác hơn, có thể đề cập tính chất hình học

Trả về JSON THUẦN TÚY, không markdown.`

// ── Build topology description for prompt ────────────────────────────────────
function buildTopoDesc(model: GeometryModel, shapeKey: string): string {
  const lines: string[] = []

  // Vertices
  const vIds = Object.keys(model.vertices)
  if (vIds.length) lines.push(`Đỉnh: ${vIds.join(', ')}`)

  // Edges by type
  const edgesByType: Record<string, string[]> = {}
  for (const e of model.edges) {
    edgesByType[e.type] ??= []
    edgesByType[e.type]!.push(e.id)
  }
  for (const [type, ids] of Object.entries(edgesByType)) {
    lines.push(`Cạnh ${type}: ${ids.join(', ')}`)
  }

  // Faces by type
  const facesByType: Record<string, string[]> = {}
  for (const f of model.faces) {
    facesByType[f.type] ??= []
    facesByType[f.type]!.push(f.id)
  }
  for (const [type, ids] of Object.entries(facesByType)) {
    lines.push(`Mặt ${type}: ${ids.join(', ')}`)
  }

  return lines.join('\n')
}

// ── Call DeepSeek ─────────────────────────────────────────────────────────────
async function generateDescriptions(
  shapeKey: string,
  model: GeometryModel,
): Promise<{ vertices: Record<string, string>; edges: Record<string, string>; faces: Record<string, string> }> {
  const info = SHAPE_INFO[shapeKey]!
  const topoDesc = buildTopoDesc(model, shapeKey)

  const vIds    = Object.keys(model.vertices)
  const eIds    = model.edges.map(e => e.id)
  const fIds    = model.faces.map(f => f.id)

  const userPrompt = `Hình: ${info.nameVi}
Cấp học: ${info.level === 'cap2' ? 'Cấp 2 (Lớp 6-9)' : 'Cấp 3 (Lớp 10-11)'}

Các đối tượng trong mô hình 3D:
${topoDesc}

Viết giải thích TTS cho từng đối tượng. Học sinh click vào → nghe câu này ngay.

JSON trả về:
{
  "vertices": {
    ${vIds.map(id => `"${id}": "<1-2 câu giải thích vai trò của đỉnh ${id} trong ${info.nameVi}>"`).join(',\n    ')}
  },
  "edges": {
    ${eIds.map(id => {
      const e = model.edges.find(x => x.id === id)
      return `"${id}": "<1-2 câu giải thích vai trò của cạnh ${id} (${e?.type ?? ''}) trong ${info.nameVi}>"`
    }).join(',\n    ')}
  },
  "faces": {
    ${fIds.map(id => {
      const f = model.faces.find(x => x.id === id)
      return `"${id}": "<1-2 câu giải thích vai trò của mặt ${id} (${f?.type ?? ''}) trong ${info.nameVi}>"`
    }).join(',\n    ')}
  }
}`

  const res = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${API_KEY}` },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 2000,
      temperature: 0.2,
      response_format: { type: 'json_object' },
    }),
  })

  if (!res.ok) throw new Error(`DeepSeek ${res.status}: ${await res.text().then(t => t.slice(0, 200))}`)
  const data = await res.json() as { choices: Array<{ message: { content: string } }> }
  const content = data.choices?.[0]?.message?.content
  if (!content) throw new Error('Empty response')

  const parsed = JSON.parse(content) as {
    vertices?: Record<string, string>
    edges?: Record<string, string>
    faces?: Record<string, string>
  }
  return {
    vertices: parsed.vertices ?? {},
    edges:    parsed.edges    ?? {},
    faces:    parsed.faces    ?? {},
  }
}

// ── Serialize to TypeScript ───────────────────────────────────────────────────
function esc(s: string) {
  return String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'")
}

function serializeObjectDescriptions(desc: { vertices: Record<string, string>; edges: Record<string, string>; faces: Record<string, string> }): string {
  const i = '        '
  const i2 = i + '  '

  const fmtRecord = (rec: Record<string, string>) => {
    const entries = Object.entries(rec)
    if (!entries.length) return ''
    return entries.map(([k, v]) => `${i2}'${esc(k)}': '${esc(v)}'`).join(',\n') + ','
  }

  return `${i}objectDescriptions: {
${i2}vertices: {
${fmtRecord(desc.vertices)}
${i2}},
${i2}edges: {
${fmtRecord(desc.edges)}
${i2}},
${i2}faces: {
${fmtRecord(desc.faces)}
${i2}},
${i}},`
}

// ── Patch shapes-data.ts ──────────────────────────────────────────────────────
function patchShape(src: string, shapeKey: string, newTs: string): string {
  const shapeStart = new RegExp(`\\n    ${shapeKey}:\\s*\\{`)
  const match = shapeStart.exec(src)
  if (!match) { console.warn(`  ⚠ "${shapeKey}" not found`); return src }
  const blockStart = match.index

  // Shape block closes at \n    }, (4-space indent)
  const shapeClose = src.indexOf('\n    },', blockStart + match[0].length)
  if (shapeClose === -1) { console.warn(`  ⚠ Close brace not found for "${shapeKey}"`); return src }

  // Check for existing objectDescriptions within this block
  const existingAt = src.indexOf('\n        objectDescriptions:', blockStart)
  if (existingAt !== -1 && existingAt < shapeClose) {
    // Replace existing block — find its close
    const nextField = src.indexOf('\n        ', existingAt + 1)
    // Find the }, that closes objectDescriptions
    const openBraceAt = src.indexOf('{', existingAt)
    let depth = 0, i = openBraceAt
    while (i < src.length && i < shapeClose + 50) {
      if (src[i] === '{') depth++
      else if (src[i] === '}') { depth--; if (depth === 0) break }
      i++
    }
    const commaAt = src.indexOf(',', i)
    return src.slice(0, existingAt + 1) + newTs + src.slice(commaAt + 1)
  }

  // Insert before shape close \n    },
  return src.slice(0, shapeClose) + '\n' + newTs + src.slice(shapeClose)
}

// ── Main ──────────────────────────────────────────────────────────────────────
const targetArg = process.argv[2]
const keys = targetArg ? [targetArg] : Object.keys(SPECS)

async function main() {
  let src = fs.readFileSync(OUT_FILE, 'utf8')

  for (const key of keys) {
    const spec = SPECS[key]
    if (!spec) { console.error(`Unknown shape: "${key}"`); continue }

    const info = SHAPE_INFO[key]!
    const idx = keys.indexOf(key) + 1
    console.log(`[${idx}/${keys.length}] ${info.nameVi} (${key}) ...`)

    const model = GeometryEngine.build(spec)
    const vCount = Object.keys(model.vertices).length
    const eCount = model.edges.length
    const fCount = model.faces.length
    console.log(`  topology: ${vCount} vertices, ${eCount} edges, ${fCount} faces`)

    let desc
    try {
      desc = await generateDescriptions(key, model)
      console.log(`  ✓ DeepSeek: ${Object.keys(desc.vertices).length}V + ${Object.keys(desc.edges).length}E + ${Object.keys(desc.faces).length}F descriptions`)
    } catch (err) {
      console.error(`  ✗ ${(err as Error).message} — skipping`)
      continue
    }

    src = patchShape(src, key, serializeObjectDescriptions(desc))
    console.log(`  ✓ Patched "${key}"`)

    if (idx < keys.length) await new Promise(r => setTimeout(r, 400))
  }

  fs.writeFileSync(OUT_FILE, src, 'utf8')
  console.log(`\n✅ Done — objectDescriptions updated for ${keys.length} shape(s).`)
  console.log('   Run: pnpm typecheck')
}

main().catch((err: Error) => { console.error('Fatal:', err.message); process.exit(1) })
