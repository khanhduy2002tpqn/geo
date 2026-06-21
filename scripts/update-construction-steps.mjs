#!/usr/bin/env node
/**
 * scripts/update-construction-steps.mjs
 *
 * Regenerates ONLY the `constructionSteps` field for each shape in shapes-data.ts.
 * Uses a focused prompt that provides geometric topology (vertex/edge/face IDs) so
 * DeepSeek generates narration that matches the actual 3D progressive construction.
 *
 * Usage:
 *   node scripts/update-construction-steps.mjs           # all shapes
 *   node scripts/update-construction-steps.mjs cylinder  # single shape
 *
 * Reads OPENROUTER_API_KEY from .env.local (or process.env).
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')

function loadEnv() {
  const envPath = path.join(ROOT, '.env.local')
  if (!fs.existsSync(envPath)) return
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z_]+)=(.+)$/)
    if (m) process.env[m[1]] = m[2].trim()
  }
}
loadEnv()

const API_KEY = process.env.OPENROUTER_API_KEY
const BASE_URL = process.env.OPENROUTER_BASE_URL ?? 'https://api.deepseek.com'
const MODEL = process.env.OPENROUTER_MODEL ?? 'deepseek-chat'
const OUT_FILE = path.join(ROOT, 'src/lib/geo-ai/data/shapes-data.ts')

if (!API_KEY) {
  console.error('Error: OPENROUTER_API_KEY not found in .env.local or environment.')
  process.exit(1)
}

// ── GEOMETRY TOPOLOGY: vertex/edge/face IDs per shape ───────────────────────
// These match the geometry engine builders exactly so narration references
// the correct labels that appear in the 3D viewer.
const SHAPE_TOPOLOGY = {
  cylinder: {
    nameVi: 'Hình trụ',
    description: 'Hình trụ tròn xoay — hai đáy tròn bằng nhau, nối bởi mặt xung quanh',
    vertices: ['O (tâm đáy dưới)', 'O1 (tâm đáy trên)'],
    steps: [
      { index: 0, geometry: 'Vẽ đường tròn đáy dưới tâm O, bán kính r trên mặt phẳng nằm ngang' },
      { index: 1, geometry: 'Vẽ đường tròn đáy trên tâm O1, song song cách O1 khoảng h theo trục thẳng đứng' },
      { index: 2, geometry: 'Vẽ mặt xung quanh (đường sinh) nối hai đường tròn đáy, tạo bề mặt hình trụ hoàn chỉnh' },
    ],
  },
  cone: {
    nameVi: 'Hình nón',
    description: 'Hình nón tròn xoay — đáy tròn tâm O, đỉnh S phía trên',
    vertices: ['O (tâm đáy)', 'S (đỉnh nón)'],
    steps: [
      { index: 0, geometry: 'Vẽ đường tròn đáy tâm O bán kính r trên mặt phẳng nằm ngang' },
      { index: 1, geometry: 'Xác định đỉnh S trên trục OO1, cách O khoảng h theo chiều đứng (SO ⊥ đáy)' },
      { index: 2, geometry: 'Vẽ các đường sinh từ S tới các điểm trên đường tròn đáy để tạo mặt xung quanh hình nón' },
    ],
  },
  sphere: {
    nameVi: 'Hình cầu',
    description: 'Hình cầu — tập hợp điểm cách tâm O một khoảng bằng r',
    vertices: ['O (tâm cầu)'],
    steps: [
      { index: 0, geometry: 'Xác định tâm O trong không gian' },
      { index: 1, geometry: 'Vẽ đường tròn lớn (great circle) qua tâm O với bán kính r — đây là mặt cắt chính' },
      { index: 2, geometry: 'Quay đường tròn quanh đường kính để tạo mặt cầu hoàn chỉnh tâm O bán kính r' },
    ],
  },
  cube: {
    nameVi: 'Hình lập phương',
    description: 'Hình lập phương — 8 đỉnh, 12 cạnh bằng nhau, 6 mặt vuông bằng nhau',
    vertices: ['A, B, C, D (đáy dưới theo chiều kim đồng hồ)', "A', B', C', D' (đỉnh tương ứng trên)"],
    steps: [
      { index: 0, geometry: "Dựng hình vuông đáy ABCD cạnh a (A-B-C-D theo thứ tự, DA và BC song song)" },
      { index: 1, geometry: "Từ mỗi đỉnh A, B, C, D dựng cạnh đứng AA', BB', CC', DD' có độ dài a hướng lên trên" },
      { index: 2, geometry: "Nối A'B'C'D' thành mặt trên hình vuông, hoàn thiện hình lập phương với 6 mặt vuông bằng nhau" },
    ],
  },
  rectangular_prism: {
    nameVi: 'Hình hộp chữ nhật',
    description: 'Hình hộp chữ nhật — 8 đỉnh, 12 cạnh, 6 mặt chữ nhật',
    vertices: ['A, B, C, D (đáy dưới)', "A', B', C', D' (đáy trên tương ứng)"],
    steps: [
      { index: 0, geometry: "Dựng hình chữ nhật đáy ABCD kích thước a×b (AB=CD=a, BC=DA=b)" },
      { index: 1, geometry: "Từ A, B, C, D dựng các cạnh đứng AA', BB', CC', DD' có độ dài h, song song và bằng nhau" },
      { index: 2, geometry: "Nối A'B'C'D' thành mặt trên, hoàn thiện hình hộp với đầy đủ 6 mặt chữ nhật" },
    ],
  },
  triangular_prism: {
    nameVi: 'Lăng trụ tam giác',
    description: "Lăng trụ đứng tam giác — hai đáy tam giác bằng nhau, ba mặt bên là hình chữ nhật",
    vertices: ["A, B, C (đáy dưới)", "A', B', C' (đáy trên tương ứng)"],
    steps: [
      { index: 0, geometry: "Dựng tam giác đáy ABC (thường là tam giác đều hoặc vuông cạnh a)" },
      { index: 1, geometry: "Từ A, B, C dựng các cạnh đứng AA', BB', CC' có độ dài h, song song và bằng nhau (AA' ⊥ mặt phẳng ABC)" },
      { index: 2, geometry: "Nối A'B'C' thành đáy trên, vẽ 3 mặt bên AA'B'B, BB'C'C, CC'A'A hoàn thiện lăng trụ" },
    ],
  },
  square_pyramid: {
    nameVi: 'Hình chóp tứ giác đều S.ABCD',
    description: 'Hình chóp tứ giác đều — đáy ABCD hình vuông, đỉnh S trên trục đối xứng vuông góc đáy',
    vertices: ['A, B, C, D (đáy vuông, theo thứ tự)', 'S (đỉnh chóp, SO ⊥ đáy, O là tâm ABCD)'],
    steps: [
      { index: 0, geometry: 'Dựng hình vuông đáy ABCD cạnh a, tâm O là giao điểm hai đường chéo' },
      { index: 1, geometry: 'Dựng đỉnh S phía trên tâm O, SO ⊥ mặt phẳng ABCD, SO = h (chiều cao chóp)' },
      { index: 2, geometry: 'Nối SA, SB, SC, SD tạo 4 mặt bên tam giác cân SAB, SBC, SCD, SDA — hoàn thiện hình chóp' },
    ],
  },
  triangular_pyramid: {
    nameVi: 'Hình chóp tam giác S.ABC',
    description: 'Hình chóp tam giác — đáy ABC tam giác đều, đỉnh S',
    vertices: ['A, B, C (đáy tam giác đều, cạnh a)', 'S (đỉnh chóp)'],
    steps: [
      { index: 0, geometry: 'Dựng tam giác đều ABC cạnh a làm đáy, xác định tâm G của tam giác' },
      { index: 1, geometry: 'Dựng đỉnh S phía trên tâm G ở chiều cao h, SG ⊥ mặt phẳng đáy ABC' },
      { index: 2, geometry: 'Nối SA, SB, SC tạo 3 mặt bên tam giác SAB, SBC, SAC — hoàn thiện hình chóp tam giác' },
    ],
  },
  tetrahedron: {
    nameVi: 'Tứ diện đều ABCD',
    description: 'Tứ diện đều — 4 đỉnh, 6 cạnh bằng nhau a, 4 mặt tam giác đều bằng nhau',
    vertices: ['A, B, C (đáy tam giác đều)', 'D (đỉnh trên, DA=DB=DC=AB=BC=CA=a)'],
    steps: [
      { index: 0, geometry: 'Dựng tam giác đều ABC cạnh a làm đáy — mọi cạnh đều bằng a' },
      { index: 1, geometry: 'Xác định tâm G của ABC, dựng đỉnh D phía trên ở chiều cao h = a√(2/3), DG ⊥ đáy' },
      { index: 2, geometry: 'Nối DA, DB, DC tạo 3 mặt bên tam giác đều DAB, DBC, DAC — cả 4 mặt đều là tam giác đều' },
    ],
  },
  general_pyramid: {
    nameVi: 'Hình chóp tổng quát S.ABCD',
    description: 'Hình chóp bất kỳ — đáy đa giác, các mặt bên là tam giác có chung đỉnh S',
    vertices: ['A, B, C, D (các đỉnh đáy)', 'S (đỉnh chóp)'],
    steps: [
      { index: 0, geometry: 'Dựng đa giác đáy ABCD (có thể là vuông, chữ nhật, hoặc đa giác bất kỳ)' },
      { index: 1, geometry: 'Dựng đỉnh S phía trên hoặc bên cạnh đáy ở vị trí xác định theo bài toán' },
      { index: 2, geometry: 'Nối S với tất cả các đỉnh đáy (SA, SB, SC, SD) tạo các mặt bên tam giác, hoàn thành hình chóp' },
    ],
  },
  hyperboloid: {
    nameVi: 'Mặt hyperboloid một tầng',
    description: 'Mặt hyperboloid một tầng — x²/a² + y²/b² − z²/c² = 1, mặt bậc 2 lõm ở giữa',
    vertices: ['O (tâm đối xứng tại gốc toạ độ)'],
    steps: [
      { index: 0, geometry: 'Vẽ ellipse thắt cổ chai tại z=0: x²/a² + y²/b² = 1 — đây là tiết diện nhỏ nhất' },
      { index: 1, geometry: 'Tại z=±k, vẽ các ellipse lớn dần: x²/a² + y²/b² = 1 + k²/c² — mặt nở ra hai phía' },
      { index: 2, geometry: 'Nối các ellipse bằng đường sinh thẳng (hyperboloid một tầng là mặt kẻ) để hoàn thiện mặt cong' },
    ],
  },
  paraboloid: {
    nameVi: 'Mặt paraboloid elliptic',
    description: 'Mặt paraboloid elliptic — z = x²/a² + y²/b², mở lên trên từ đỉnh z=0',
    vertices: ['O (đỉnh paraboloid tại gốc toạ độ z=0)'],
    steps: [
      { index: 0, geometry: 'Đặt đỉnh O tại gốc tọa độ (0,0,0) — điểm thấp nhất của mặt cong' },
      { index: 1, geometry: 'Tại z=k (k>0), vẽ ellipse thiết diện x²/a² + y²/b² = k — ellipse lớn dần khi z tăng' },
      { index: 2, geometry: 'Nối các ellipse thiết diện từ dưới lên tạo mặt cong paraboloid mở lên theo chiều dương z' },
    ],
  },
}

// ── SYSTEM PROMPT ────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `Bạn là giáo viên Toán Hình học Không gian Việt Nam dạy trực quan qua mô hình 3D tương tác.
Nhiệm vụ: tạo narration cho từng bước dựng hình — lời thầy/cô nói khi chỉ vào mô hình 3D để học sinh hiểu.

TUYỆT ĐỐI KHÔNG:
- Không viết công thức toán học (sqrt, ², ×, ÷, =, ≈, ...)
- Không tính toán số học (SH = sqrt(5² - ...), h ≈ 4.35, ...)
- Không viết ký hiệu toán học trong narration
- Narration là lời NÓI, phải đọc to nghe tự nhiên, không phải bảng đen

Trả về JSON THUẦN TÚY — không markdown, không code block.
Tất cả text bằng tiếng Việt chuẩn.`

// ── CALL DEEPSEEK ─────────────────────────────────────────────────────────────
async function callDeepSeek(shapeKey, topo) {
  const stepsSpec = topo.steps.map(s =>
    `  - Bước ${s.index}: ${s.geometry}`
  ).join('\n')

  const userPrompt = `Hình: ${topo.nameVi}
Mô tả: ${topo.description}
Các đỉnh/nhãn: ${topo.vertices.join(', ')}

Các bước dựng hình (geometry cố định, CHỈ viết narration):
${stepsSpec}

Trả về JSON với đúng cấu trúc:
{
  "constructionSteps": [
    {
      "index": 0,
      "description": "Mô tả ngắn (≤10 từ) tên hành động bước này",
      "narration": "Giải thích chi tiết 1-2 câu tiếng Việt tự nhiên như thầy/cô đang nói với học sinh lớp 11, tham chiếu đúng tên đỉnh/điểm (${topo.vertices.slice(0,2).join(', ')}...) và ý nghĩa hình học"
    }
  ]
}

Yêu cầu narration:
- Lời NÓI tự nhiên như thầy/cô đang dạy trực tiếp trước lớp
- Tham chiếu tên đỉnh/điểm cụ thể (A, B, O, S, ...) thay vì nói chung
- Nêu ý nghĩa hình học: tại sao cần bước này, quan hệ giữa các điểm
- 1-2 câu ngắn, không có công thức, không có số tính toán
- Không bắt đầu bằng "Bước N:" hay số thứ tự
- Ví dụ tốt: "Dựng đỉnh S phía trên tâm đáy sao cho SA vuông góc với mặt phẳng đáy."
- Ví dụ xấu (KHÔNG làm): "Dựng đỉnh S, tính SH = sqrt(5² - ...) ≈ 4.35 cm"`

  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 800,
      temperature: 0.3,
      response_format: { type: 'json_object' },
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`DeepSeek API error ${res.status}: ${err}`)
  }

  const data = await res.json()
  const content = data.choices?.[0]?.message?.content
  if (!content) throw new Error('Empty response')
  return JSON.parse(content)
}

// ── PATCH shapes-data.ts: replace constructionSteps for one shape ─────────────
function patchConstructionSteps(src, shapeKey, newSteps) {
  // Serialize new steps
  const indent = '        '
  const inner = newSteps.map(s => {
    const desc = s.description.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
    const nar  = s.narration.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
    return `${indent}{\n${indent}  index: ${s.index},\n${indent}  description: '${desc}',\n${indent}  narration: '${nar}',\n${indent}}`
  }).join(',\n')
  const replacement = `constructionSteps: [\n${inner},\n      ]`

  // Match the block for this specific shape key (look for `shapeKey: {` then `constructionSteps: [...]`)
  // Strategy: find the shape block boundary, replace only within it
  const shapeBlockStart = new RegExp(`(\\b${shapeKey}:\\s*\\{)`)
  const match = shapeBlockStart.exec(src)
  if (!match) {
    console.warn(`  ⚠ Shape key "${shapeKey}" not found in source — skipping patch`)
    return src
  }

  // Find the constructionSteps block after the shape key position
  const afterKey = src.indexOf(match[0])
  const searchFrom = afterKey
  const csStart = src.indexOf('constructionSteps:', searchFrom)
  if (csStart === -1) {
    console.warn(`  ⚠ constructionSteps not found for "${shapeKey}" — skipping patch`)
    return src
  }

  // Find matching closing bracket
  const bracketOpen = src.indexOf('[', csStart)
  if (bracketOpen === -1) return src

  let depth = 0
  let i = bracketOpen
  while (i < src.length) {
    if (src[i] === '[') depth++
    else if (src[i] === ']') { depth--; if (depth === 0) break }
    i++
  }
  const bracketClose = i // index of the closing ]

  const before = src.slice(0, csStart)
  const after  = src.slice(bracketClose + 1)
  return `${before}${replacement}${after}`
}

// ── MAIN ─────────────────────────────────────────────────────────────────────
const targetArg = process.argv[2]
const shapeKeys = targetArg
  ? [targetArg]
  : Object.keys(SHAPE_TOPOLOGY)

async function main() {
  let src = fs.readFileSync(OUT_FILE, 'utf8')

  for (const shapeKey of shapeKeys) {
    const topo = SHAPE_TOPOLOGY[shapeKey]
    if (!topo) {
      console.error(`Unknown shape key: "${shapeKey}". Available: ${Object.keys(SHAPE_TOPOLOGY).join(', ')}`)
      continue
    }

    console.log(`\n[${shapeKeys.indexOf(shapeKey) + 1}/${shapeKeys.length}] ${topo.nameVi} (${shapeKey})...`)

    let aiData
    try {
      aiData = await callDeepSeek(shapeKey, topo)
      const steps = aiData.constructionSteps ?? []
      console.log(`  ✓ ${steps.length} steps received`)
      src = patchConstructionSteps(src, shapeKey, steps)
    } catch (err) {
      console.error(`  ✗ Error: ${err.message} — skipping`)
    }

    await new Promise(r => setTimeout(r, 400))
  }

  fs.writeFileSync(OUT_FILE, src, 'utf8')
  console.log(`\n✅ Done! Updated: ${OUT_FILE}`)
}

main().catch(err => {
  console.error('Fatal:', err)
  process.exit(1)
})
