#!/usr/bin/env node
/**
 * scripts/update-lesson-content.mjs
 *
 * Generates `lessonContent` for each shape in shapes-data.ts using DeepSeek AI.
 * Content is level-aware (cap2 = Lớp 8–9, cap3 = Lớp 10–11) and includes:
 *   - recognition   : Dấu hiệu nhận biết
 *   - objects       : Các đối tượng hình học
 *   - theorems      : Các định lý (title + description + compact LaTeX)
 *   - formulas      : Công thức (title + description + compact LaTeX, no overflow)
 *
 * Usage:
 *   node scripts/update-lesson-content.mjs              # all shapes
 *   node scripts/update-lesson-content.mjs cylinder     # single shape
 *
 * Requires DEEPSEEK_API_KEY (or OPENROUTER_API_KEY) in .env.local
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { spawnSync } from 'child_process'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const OUT_FILE = path.join(ROOT, 'src/lib/geo-ai/data/shapes-data.ts')

// ── Load .env.local ───────────────────────────────────────────────────────────
function loadEnv() {
  const p = path.join(ROOT, '.env.local')
  if (!fs.existsSync(p)) return
  for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z_]+)=(.+)$/)
    if (m) process.env[m[1]] = m[2].trim()
  }
}
loadEnv()

const DEEPSEEK_KEY = process.env.DEEPSEEK_API_KEY || process.env.OPENROUTER_API_KEY
if (!DEEPSEEK_KEY) {
  console.error('Missing DEEPSEEK_API_KEY or OPENROUTER_API_KEY in .env.local')
  process.exit(1)
}

// ── Get topology from geometry engine ─────────────────────────────────────────
console.log('Extracting topology from geometry engine...')
const topoResult = spawnSync('npx', ['tsx', 'scripts/extract-topology.ts'], {
  cwd: ROOT, encoding: 'utf8', timeout: 30000,
})
if (topoResult.error || topoResult.status !== 0) {
  console.error('Failed to extract topology:', topoResult.stderr || topoResult.error?.message)
  process.exit(1)
}
const GEO_TOPO = JSON.parse(topoResult.stdout)
console.log(`✓ Topology ready for: ${Object.keys(GEO_TOPO).join(', ')}\n`)

// ── Shape metadata ─────────────────────────────────────────────────────────────
// Maps shape key → Vietnamese name + level + extra curriculum context
const SHAPE_META = {
  cylinder: {
    nameVi: 'Hình trụ',
    level: 'cap2',
    levelLabel: 'Lớp 8–9 (Cấp 2)',
    curriculumNote: 'Chương trình Toán lớp 9 — Hình học không gian cơ bản',
    knownFormulas: ['V = πr²h', 'S_{xq} = 2πrh', 'S_{tp} = 2πr(r+h)', 'C_{đáy} = 2πr'],
  },
  cone: {
    nameVi: 'Hình nón',
    level: 'cap2',
    levelLabel: 'Lớp 8–9 (Cấp 2)',
    curriculumNote: 'Chương trình Toán lớp 9 — Hình học không gian cơ bản',
    knownFormulas: ['V = \\frac{1}{3}\\pi r^2 h', 'S_{xq} = \\pi r l', 'S_{tp} = \\pi r(r+l)', 'l = \\sqrt{r^2+h^2}'],
  },
  sphere: {
    nameVi: 'Hình cầu',
    level: 'cap2',
    levelLabel: 'Lớp 8–9 (Cấp 2)',
    curriculumNote: 'Chương trình Toán lớp 9 — Hình học không gian cơ bản',
    knownFormulas: ['V = \\frac{4}{3}\\pi r^3', 'S = 4\\pi r^2', 'C = 2\\pi r'],
  },
  cube: {
    nameVi: 'Hình lập phương',
    level: 'cap2',
    levelLabel: 'Lớp 6–7 (Cấp 2)',
    curriculumNote: 'Chương trình Toán lớp 7 — Hình học cơ bản',
    knownFormulas: ['V = a^3', 'S_{tp} = 6a^2', 'S_{xq} = 4a^2', 'd = a\\sqrt{3}'],
  },
  rectangular_prism: {
    nameVi: 'Hình hộp chữ nhật',
    level: 'cap2',
    levelLabel: 'Lớp 6–7 (Cấp 2)',
    curriculumNote: 'Chương trình Toán lớp 7 — Hình học cơ bản',
    knownFormulas: ['V = abc', 'S_{tp} = 2(ab+bc+ca)', 'S_{xq} = 2(a+b)c', 'd = \\sqrt{a^2+b^2+c^2}'],
  },
  triangular_prism: {
    nameVi: 'Lăng trụ tam giác',
    level: 'cap3',
    levelLabel: 'Lớp 10–11 (Cấp 3)',
    curriculumNote: 'Chương trình Toán lớp 11 — Hình học không gian',
    knownFormulas: ['V = S_{đáy} \\cdot h', 'S_{xq} = C_{đáy} \\cdot h', 'S_{đáy} = \\frac{1}{2}ah_{\\triangle}'],
  },
  square_pyramid: {
    nameVi: 'Hình chóp tứ giác đều',
    level: 'cap3',
    levelLabel: 'Lớp 10–11 (Cấp 3)',
    curriculumNote: 'Chương trình Toán lớp 11 — Hình học không gian',
    knownFormulas: ['V = \\frac{1}{3}a^2 h', 'S_{xq} = 2al', 'S_{tp} = a^2 + 2al', 'l = \\sqrt{h^2+(a/2)^2}'],
  },
  triangular_pyramid: {
    nameVi: 'Hình chóp tam giác',
    level: 'cap3',
    levelLabel: 'Lớp 10–11 (Cấp 3)',
    curriculumNote: 'Chương trình Toán lớp 11 — Hình học không gian',
    knownFormulas: ['V = \\frac{1}{3}S_{đáy} h', 'S_{đáy} = \\frac{\\sqrt{3}}{4}a^2'],
  },
  tetrahedron: {
    nameVi: 'Tứ diện đều',
    level: 'cap3',
    levelLabel: 'Lớp 10–11 (Cấp 3)',
    curriculumNote: 'Chương trình Toán lớp 11 — Hình học không gian nâng cao',
    knownFormulas: ['V = \\frac{a^3\\sqrt{2}}{12}', 'S_{tp} = a^2\\sqrt{3}', 'h = a\\sqrt{\\tfrac{2}{3}}'],
  },
  general_pyramid: {
    nameVi: 'Hình chóp tổng quát',
    level: 'cap3',
    levelLabel: 'Lớp 10–11 (Cấp 3)',
    curriculumNote: 'Chương trình Toán lớp 11 — Hình học không gian',
    knownFormulas: ['V = \\frac{1}{3}S_{đáy} h'],
  },
  hyperboloid: {
    nameVi: 'Mặt hyperboloid',
    level: 'cap3',
    levelLabel: 'Lớp 10–12 (Cấp 3 nâng cao)',
    curriculumNote: 'Toán nâng cao / chuyên — Mặt bậc hai',
    knownFormulas: ['\\frac{x^2}{a^2}+\\frac{y^2}{b^2}-\\frac{z^2}{c^2}=1'],
  },
  paraboloid: {
    nameVi: 'Mặt paraboloid',
    level: 'cap3',
    levelLabel: 'Lớp 10–12 (Cấp 3 nâng cao)',
    curriculumNote: 'Toán nâng cao / chuyên — Mặt bậc hai',
    knownFormulas: ['z = \\frac{x^2}{a^2}+\\frac{y^2}{b^2}'],
  },
}

// ── System prompt ─────────────────────────────────────────────────────────────
const SYSTEM = `Bạn là giáo viên Toán Hình học Không gian Việt Nam chuyên soạn giáo án theo chuẩn chương trình THCS/THPT.

Nhiệm vụ: Soạn nội dung "Bài học" theo 4 mục cho một hình hình học, phù hợp đúng cấp học được chỉ định.

Quy tắc viết công thức LaTeX:
- Dùng ký hiệu NGẮN GỌN, inline: ví dụ "V = \\pi r^2 h" thay vì display math dài
- KHÔNG dùng \\displaystyle, \\dfrac — dùng \\frac bình thường
- Mỗi công thức chỉ 1 dòng, không quá 40 ký tự LaTeX
- Dùng ký hiệu chuẩn tiếng Việt: S_{đáy}, S_{xq}, S_{tp}, h_{\\triangle}

Trả về JSON THUẦN TÚY — không markdown, không code block.`

// ── Call DeepSeek ─────────────────────────────────────────────────────────────
async function callDeepSeek(key, meta, topo) {
  const topoLines = []
  if (topo) {
    if (topo.vertices?.length) topoLines.push(`Vertices: ${topo.vertices.join(', ')}`)
    if (topo.edges?.length)    topoLines.push(`Edges (${topo.edges.length}): ${topo.edges.join(', ')}`)
    if (topo.faces?.length)    topoLines.push(`Faces: ${topo.faces.join(', ')}`)
  }

  const prompt = `Hình: ${meta.nameVi}
Cấp học: ${meta.levelLabel}
Chương trình: ${meta.curriculumNote}
Công thức tham khảo: ${meta.knownFormulas.join(' | ')}
${topoLines.length ? '\nTopology 3D:\n' + topoLines.join('\n') : ''}

Soạn nội dung bài học theo 4 mục:

1. recognition (Dấu hiệu nhận biết): 4–5 bullet string, mỗi bullet 1 câu ngắn, đặc trưng nhận biết hình này
   - Cấp 2: dấu hiệu trực quan, hình ảnh thực tế
   - Cấp 3: dấu hiệu hình học chính xác, điều kiện toán học

2. objects (Đối tượng hình học): mảng 6–10 tên yếu tố (đỉnh, cạnh, mặt, đường kính, đường cao, v.v.)
   - Tên ngắn gọn, không có dấu ngoặc

3. theorems (Định lý): mảng 2–4 định lý quan trọng
   - Cấp 2: định lý đơn giản, dễ hiểu
   - Cấp 3: định lý chặt chẽ hơn, có thể kèm điều kiện
   - Mỗi định lý: { title, description (1 câu), latex (công thức ngắn nếu có, nếu không để "") }

4. formulas (Công thức): mảng 3–6 công thức quan trọng nhất
   - Ưu tiên: thể tích, diện tích xung quanh, diện tích toàn phần, chu vi đáy, đường cao, đường sinh, đường chéo
   - Mỗi công thức: { title (tên VN), description (ý nghĩa ngắn), latex (công thức ngắn gọn, inline) }

JSON trả về:
{
  "recognition": ["...", "..."],
  "objects": ["...", "..."],
  "theorems": [{ "title": "...", "description": "...", "latex": "..." }],
  "formulas": [{ "title": "...", "description": "...", "latex": "..." }]
}`

  const res = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${DEEPSEEK_KEY}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: prompt },
      ],
      max_tokens: 1800,
      temperature: 0.25,
      response_format: { type: 'json_object' },
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`DeepSeek ${res.status}: ${err.slice(0, 200)}`)
  }
  const data = await res.json()
  const content = data.choices?.[0]?.message?.content
  if (!content) throw new Error('Empty response')
  return JSON.parse(content)
}

// ── Serialize LessonContent to TypeScript source ───────────────────────────────
function escapeStr(s) {
  return String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n')
}

function serializeFormula(f) {
  const title  = escapeStr(f.title  ?? '')
  const desc   = escapeStr(f.description ?? '')
  const latex  = escapeStr(f.latex  ?? '')
  return `          { title: '${title}', description: '${desc}', latex: '${latex}' }`
}

function serializeLessonContent(data) {
  const recognition = (data.recognition ?? []).map(s => `          '${escapeStr(s)}'`).join(',\n')
  const objects     = (data.objects     ?? []).map(s => `          '${escapeStr(s)}'`).join(',\n')
  const theorems    = (data.theorems    ?? []).map(serializeFormula).join(',\n')
  const formulas    = (data.formulas    ?? []).map(serializeFormula).join(',\n')

  return `        lessonContent: {
          recognition: [
${recognition},
          ],
          objects: [
${objects},
          ],
          theorems: [
${theorems},
          ],
          formulas: [
${formulas},
          ],
        },`
}

// ── Patch shapes-data.ts: insert/replace lessonContent for one shape ──────────
function patchShape(src, shapeKey, lessonTs) {
  // Find start of this shape's block: "  shapeKey: {"
  const shapeStart = new RegExp(`\\n    ${shapeKey}:\\s*\\{`)
  const match = shapeStart.exec(src)
  if (!match) {
    console.warn(`  ⚠ Shape "${shapeKey}" not found`)
    return src
  }
  const blockStart = match.index

  // If lessonContent already exists in this block, replace it
  const existingStart = src.indexOf('\n        lessonContent:', blockStart)
  const nextShapePos = src.indexOf('\n    ', blockStart + match[0].length)
  if (existingStart !== -1 && (nextShapePos === -1 || existingStart < nextShapePos)) {
    // Find end of existing lessonContent block (closing },)
    const openBrace = src.indexOf('{', existingStart + '\n        lessonContent:'.length)
    if (openBrace === -1) return src
    let depth = 0; let i = openBrace
    while (i < src.length) {
      if (src[i] === '{') depth++
      else if (src[i] === '}') { depth--; if (depth === 0) break }
      i++
    }
    // i is at closing }; the full entry ends at i+1 (the },)
    const entryEnd = src.indexOf(',', i)
    const before = src.slice(0, existingStart + 1) // keep newline
    const after  = src.slice(entryEnd + 1)
    return before + lessonTs + after
  }

  // Not yet present — find "qa: [...]" close and insert after it
  const qaPos = src.indexOf('\n      qa:', blockStart)
  if (qaPos === -1) {
    console.warn(`  ⚠ qa field not found for "${shapeKey}"`)
    return src
  }
  const bracketOpen = src.indexOf('[', qaPos)
  if (bracketOpen === -1) return src
  let depth = 0; let j = bracketOpen
  while (j < src.length) {
    if (src[j] === '[') depth++
    else if (src[j] === ']') { depth--; if (depth === 0) break }
    j++
  }
  // j is at closing ]; insert after the "],\n" or "],"
  const insertAt = j + 1  // after ]
  // skip optional comma and whitespace to find newline
  let k = insertAt
  while (k < src.length && (src[k] === ',' || src[k] === ' ')) k++
  // k is at newline before "    }," (shape close)
  return src.slice(0, k) + '\n' + lessonTs + src.slice(k)
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

    const topo = GEO_TOPO[key] ?? GEO_TOPO[key === 'square_pyramid' ? 'square_pyramid' : key]
    const idx = keys.indexOf(key) + 1
    console.log(`[${idx}/${keys.length}] ${meta.nameVi} (${meta.levelLabel}) ...`)

    let aiData
    try {
      aiData = await callDeepSeek(key, meta, topo)
      const nR = (aiData.recognition ?? []).length
      const nF = (aiData.formulas   ?? []).length
      const nT = (aiData.theorems   ?? []).length
      console.log(`  ✓ DeepSeek: ${nR} recognition, ${nT} theorems, ${nF} formulas`)
    } catch (err) {
      console.error(`  ✗ Error: ${err.message} — skipping`)
      continue
    }

    const lessonTs = serializeLessonContent(aiData)
    src = patchShape(src, key, lessonTs)
    console.log(`  ✓ Patched ${key} in shapes-data.ts`)

    if (idx < keys.length) await new Promise(r => setTimeout(r, 500))
  }

  fs.writeFileSync(OUT_FILE, src, 'utf8')
  console.log(`\n✅ Done — shapes-data.ts updated with lessonContent for ${keys.length} shape(s).`)
  console.log('   Verify: pnpm typecheck')
}

main().catch(err => {
  console.error('Fatal:', err)
  process.exit(1)
})
