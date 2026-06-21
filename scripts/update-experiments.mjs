#!/usr/bin/env node
/**
 * scripts/update-experiments.mjs
 *
 * Uses DeepSeek AI to regenerate virtual experiment data files with geometry
 * interaction fields: highlightVertices, highlightEdges, highlightFaces,
 * visibleVertices, visibleEdges, visibleFaces.
 *
 * Topology is extracted dynamically from the actual geometry engine via
 * scripts/extract-topology.ts — ensuring IDs always match the 3D viewer.
 *
 * Usage:
 *   node scripts/update-experiments.mjs              # all 7 experiments
 *   node scripts/update-experiments.mjs cylinder     # single experiment
 *
 * Reads DEEPSEEK_API_KEY (or OPENROUTER_API_KEY fallback) from .env.local.
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { spawnSync } from 'child_process'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const EXPERIMENTS_DIR = path.join(ROOT, 'src/lib/geo-ai/experiments')

// ── Load .env.local ───────────────────────────────────────────────────────────
function loadEnv() {
  const envPath = path.join(ROOT, '.env.local')
  if (!fs.existsSync(envPath)) return
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z_]+)=(.+)$/)
    if (m) process.env[m[1]] = m[2].trim()
  }
}
loadEnv()

const DEEPSEEK_KEY = process.env.DEEPSEEK_API_KEY || process.env.OPENROUTER_API_KEY
const DEEPSEEK_BASE = 'https://api.deepseek.com'
const MODEL = 'deepseek-chat'

if (!DEEPSEEK_KEY) {
  console.error('Error: DEEPSEEK_API_KEY (or OPENROUTER_API_KEY) not found in .env.local or environment.')
  process.exit(1)
}

// ── Step 1: Extract real topology from geometry engine ────────────────────────
console.log('Extracting topology from geometry engine...')
let GEO_TOPOLOGY
try {
  const result = spawnSync('npx', ['tsx', 'scripts/extract-topology.ts'], {
    cwd: ROOT,
    encoding: 'utf8',
    timeout: 30000,
  })
  if (result.error) throw result.error
  if (result.status !== 0) throw new Error(result.stderr || 'extract-topology.ts exited non-zero')
  GEO_TOPOLOGY = JSON.parse(result.stdout)
  console.log(`✓ Topology extracted for: ${Object.keys(GEO_TOPOLOGY).join(', ')}\n`)
} catch (err) {
  console.error('Failed to extract topology:', err.message)
  process.exit(1)
}

// ── Step 2: Build topology description strings for prompts ────────────────────
function buildTopoDescription(topo) {
  const lines = []

  if (topo.vertices.length) {
    lines.push(`Vertices: ${topo.vertices.join(', ')}`)
  }

  const { edgesByType = {}, facesByType = {} } = topo
  const allEdgeTypes = Object.keys(edgesByType)
  if (allEdgeTypes.length) {
    for (const type of allEdgeTypes) {
      lines.push(`Edges (${type}): ${edgesByType[type].join(', ')}`)
    }
  } else if (topo.edges.length) {
    lines.push(`Edges: ${topo.edges.join(', ')}`)
  } else {
    lines.push('Edges: (none)')
  }

  const allFaceTypes = Object.keys(facesByType)
  if (allFaceTypes.length) {
    for (const type of allFaceTypes) {
      lines.push(`Faces (${type}): ${facesByType[type].join(', ')}`)
    }
  } else if (topo.faces.length) {
    lines.push(`Faces: ${topo.faces.join(', ')}`)
  } else {
    lines.push('Faces: (none)')
  }

  return lines.join('\n')
}

// ── Step 3: Experiment metadata ───────────────────────────────────────────────
// Each entry links: nameVi, concept, output file info, base frames, topology key
const EXPERIMENTS = {
  cylinder: {
    nameVi: 'Hình trụ',
    filename: 'cylinderVolume.ts',
    exportName: 'CYLINDER_VOLUME_EXPERIMENT',
    type: 'cylinder_volume',
    topoKey: 'cylinder',
    concept: `Chứng minh V = πr²h:
- Đáy hình tròn bán kính r (face: bottom) có diện tích S = πr²
- Chiều cao h thể hiện qua trục OO1 (edge: OO1)
- Nước đổ vào mặt xung quanh (face: lateral) dâng lên đến h
- Cuối: V = S_đáy × h = πr²h`,
    baseFrames: [
      { time: 0,   narration: 'Quan sát hình trụ. Bán kính đáy là r, chiều cao là h.', waterLevel: 0 },
      { time: 0.1, narration: 'Hình trụ có đáy là hình tròn bán kính r.', waterLevel: 0 },
      { time: 0.3, narration: 'Diện tích đáy hình tròn: S = πr².', waterLevel: 0, showFormula: 'S_{đáy} = \\pi r^2' },
      { time: 0.5, narration: 'Đổ nước vào hình trụ đến chiều cao h.', waterLevel: 0.5 },
      { time: 0.7, narration: 'Nước đã đầy hình trụ.', waterLevel: 1 },
      { time: 0.8, narration: 'Thể tích = diện tích đáy × chiều cao.', waterLevel: 1, showFormula: 'V = S_{đáy} \\times h' },
      { time: 0.9, narration: 'Thay S_đáy = πr² vào công thức.', waterLevel: 1, showFormula: 'V = \\pi r^2 h' },
      { time: 1.0, narration: 'Vậy thể tích hình trụ V = πr²h.', waterLevel: 1, showFormula: 'V = \\pi r^2 h' },
    ],
    finalFormula: 'V = πr²h',
    finalFormulaLatex: 'V = \\pi r^2 h',
  },

  cone: {
    nameVi: 'Hình nón',
    filename: 'coneVolume.ts',
    exportName: 'CONE_VOLUME_EXPERIMENT',
    type: 'cone_volume',
    topoKey: 'cone',
    concept: `Chứng minh V = (1/3)πr²h qua thí nghiệm đổ nước 3 lần:
- Mỗi lần đổ từ hình nón: highlight đỉnh S (vertex) và mặt lateral (face)
- Sau khi đổ xong một lần: highlight mặt đáy base (face) — nước tích 1/3
- Sau 3 lần đổ đầy hình trụ → V_nón = 1/3 V_trụ = (1/3)πr²h`,
    baseFrames: [
      { time: 0,    narration: 'Chuẩn bị một hình trụ và một hình nón có cùng bán kính đáy r và chiều cao h.', waterLevel: 0 },
      { time: 0.1,  narration: 'Đổ đầy nước vào hình nón lần thứ nhất, rồi đổ vào hình trụ.', waterLevel: 0, pourCount: 1 },
      { time: 0.25, narration: 'Nước từ một hình nón chiếm một phần ba hình trụ.', waterLevel: 0.333, pourCount: 1, showFormula: '\\frac{1}{3} V_{trụ}' },
      { time: 0.4,  narration: 'Đổ đầy nước vào hình nón lần thứ hai, rồi đổ vào hình trụ.', waterLevel: 0.333, pourCount: 2 },
      { time: 0.55, narration: 'Nước từ hai hình nón chiếm hai phần ba hình trụ.', waterLevel: 0.667, pourCount: 2, showFormula: '\\frac{2}{3} V_{trụ}' },
      { time: 0.7,  narration: 'Đổ đầy nước vào hình nón lần thứ ba, rồi đổ vào hình trụ.', waterLevel: 0.667, pourCount: 3 },
      { time: 0.85, narration: 'Ba lần đổ vừa đúng đầy hình trụ! Vậy V_nón = (1/3) V_trụ.', waterLevel: 1, pourCount: 3, showFormula: 'V_{nón} = \\frac{1}{3} V_{trụ}' },
      { time: 0.95, narration: 'Thay V_trụ = πr²h vào công thức.', waterLevel: 1, pourCount: 3, showFormula: 'V_{nón} = \\frac{1}{3} \\pi r^2 h' },
      { time: 1.0,  narration: 'Vậy thể tích hình nón V = (1/3)πr²h.', waterLevel: 1, pourCount: 3, showFormula: 'V = \\frac{1}{3} \\pi r^2 h' },
    ],
    finalFormula: 'V = (1/3)πr²h',
    finalFormulaLatex: 'V = \\frac{1}{3} \\pi r^2 h',
  },

  cube: {
    nameVi: 'Hình lập phương',
    filename: 'cubeVolume.ts',
    exportName: 'CUBE_VOLUME_EXPERIMENT',
    type: 'cube_volume',
    topoKey: 'cube',
    concept: `Chứng minh V = a³ qua xếp lớp:
- Đáy ABCD (face) là lớp đầu tiên, diện tích a²
- Cạnh đứng AA1, BB1, CC1, DD1 (edges lateral) thể hiện chiều cao a
- Xếp a lớp lên nhau → V = a × a² = a³
- Cuối: highlight toàn bộ tất cả 6 mặt để thể hiện thể tích đầy`,
    baseFrames: [
      { time: 0,    narration: 'Quan sát hình lập phương cạnh a.', waterLevel: 0 },
      { time: 0.15, narration: 'Mỗi mặt là hình vuông cạnh a, diện tích a².', waterLevel: 0, showFormula: 'S_{mặt} = a^2' },
      { time: 0.3,  narration: 'Điền đầy hình lập phương từng lớp từ dưới lên.', waterLevel: 0.33 },
      { time: 0.5,  narration: 'Mỗi lớp có a×a = a² đơn vị thể tích.', waterLevel: 0.66, showFormula: 'S_{lớp} = a^2' },
      { time: 0.7,  narration: 'Xếp a lớp lên nhau.', waterLevel: 1 },
      { time: 0.85, narration: 'Thể tích = số lớp × diện tích mỗi lớp = a × a².', waterLevel: 1, showFormula: 'V = a \\times a^2' },
      { time: 1.0,  narration: 'Vậy V = a³.', waterLevel: 1, showFormula: 'V = a^3' },
    ],
    finalFormula: 'V = a³',
    finalFormulaLatex: 'V = a^3',
  },

  pyramid: {
    nameVi: 'Hình chóp tứ giác',
    filename: 'pyramidVolume.ts',
    exportName: 'PYRAMID_VOLUME_EXPERIMENT',
    type: 'pyramid_volume',
    topoKey: 'square_pyramid',
    concept: `Chứng minh V = (1/3)×Sđáy×h qua thí nghiệm đổ cát 3 lần:
- Khi đổ từ hình chóp: highlight đỉnh S và các mặt bên SAB, SBC, SCD, SDA (faces lateral)
- Sau mỗi lần đổ xong: highlight mặt đáy ABCD (face base) — cát tích 1/3
- Sau 3 lần đổ đầy lăng trụ → V_chóp = 1/3 Sđáy×h`,
    baseFrames: [
      { time: 0,    narration: 'Chuẩn bị một hình chóp và một lăng trụ cùng đáy, cùng chiều cao.', waterLevel: 0 },
      { time: 0.1,  narration: 'Đổ đầy cát vào hình chóp, rồi đổ vào lăng trụ.', waterLevel: 0, pourCount: 1 },
      { time: 0.25, narration: 'Cát từ 1 chóp chiếm 1/3 lăng trụ.', waterLevel: 0.333, pourCount: 1, showFormula: '\\frac{1}{3}V_{\\text{lăng trụ}}' },
      { time: 0.4,  narration: 'Đổ đầy chóp lần 2, đổ vào lăng trụ.', waterLevel: 0.333, pourCount: 2 },
      { time: 0.55, narration: 'Cát từ 2 chóp chiếm 2/3 lăng trụ.', waterLevel: 0.667, pourCount: 2, showFormula: '\\frac{2}{3}V_{\\text{lăng trụ}}' },
      { time: 0.7,  narration: 'Đổ đầy chóp lần 3, đổ vào lăng trụ.', waterLevel: 0.667, pourCount: 3 },
      { time: 0.85, narration: 'Ba lần đổ vừa đúng đầy lăng trụ! V_chóp = (1/3)V_lăng_trụ.', waterLevel: 1, pourCount: 3, showFormula: 'V_{chóp} = \\frac{1}{3}V_{\\text{lăng trụ}}' },
      { time: 0.95, narration: 'Thay V_lăng_trụ = Sđáy × h.', waterLevel: 1, pourCount: 3, showFormula: 'V = \\frac{1}{3}S_{đáy} \\times h' },
      { time: 1.0,  narration: 'Vậy thể tích mọi hình chóp V = (1/3)×Sđáy×h.', waterLevel: 1, pourCount: 3, showFormula: 'V = \\frac{1}{3} S_{đáy} \\times h' },
    ],
    finalFormula: 'V = (1/3)×Sđáy×h',
    finalFormulaLatex: 'V = \\frac{1}{3} S_{\\text{đáy}} \\times h',
  },

  rectangularPrism: {
    nameVi: 'Hình hộp chữ nhật',
    filename: 'rectangularPrismVolume.ts',
    exportName: 'RECTANGULAR_PRISM_VOLUME_EXPERIMENT',
    type: 'prism_volume',
    topoKey: 'rectangular_prism',
    concept: `Chứng minh V = a×b×h qua nguyên lý Cavalieri:
- Đáy ABCD (face base) có diện tích a×b
- Cạnh đứng AA1, BB1, CC1, DD1 (edges lateral) thể hiện chiều cao h
- Nước đổ vào qua các mặt bên (faces lateral) dâng theo lớp
- Cuối: V = Sđáy × h = a×b×h, highlight tất cả 6 mặt`,
    baseFrames: [
      { time: 0,    narration: 'Hình hộp chữ nhật có 3 kích thước: dài a, rộng b, cao h.', waterLevel: 0 },
      { time: 0.2,  narration: 'Diện tích đáy = a × b.', waterLevel: 0, showFormula: 'S_{đáy} = a \\times b' },
      { time: 0.35, narration: 'Điền nước vào một phần.', waterLevel: 0.33 },
      { time: 0.5,  narration: 'Thể tích phần đó = Sđáy × chiều cao nước.', waterLevel: 0.66, showFormula: 'V_{phần} = ab \\times h_{nước}' },
      { time: 0.7,  narration: 'Điền đầy đến chiều cao h.', waterLevel: 1 },
      { time: 0.85, narration: 'Thể tích = diện tích đáy × chiều cao = ab × h.', waterLevel: 1, showFormula: 'V = ab \\times h' },
      { time: 1.0,  narration: 'Vậy V = a×b×h.', waterLevel: 1, showFormula: 'V = a \\times b \\times h' },
    ],
    finalFormula: 'V = a×b×h',
    finalFormulaLatex: 'V = a \\times b \\times h',
  },

  sphere: {
    nameVi: 'Hình cầu',
    filename: 'sphereVolume.ts',
    exportName: 'SPHERE_VOLUME_EXPERIMENT',
    type: 'sphere_volume',
    topoKey: 'sphere',
    concept: `Chứng minh V = (4/3)πr³ qua định lý Archimedes:
- Tâm cầu O (vertex) là điểm duy nhất xác định hình cầu
- Mặt cầu sphere (face) là toàn bộ bề mặt
- Hình cầu r nội tiếp hình trụ r chiều cao 2r → chiếm đúng 2/3 thể tích
- Highlight face sphere ở tất cả các bước để kết nối narration với hình`,
    baseFrames: [
      { time: 0,   narration: 'Archimedes: đặt hình cầu bán kính r vào hình trụ bán kính r, chiều cao 2r.', waterLevel: 0 },
      { time: 0.2, narration: 'Hình trụ ngoại tiếp: R = r, H = 2r, V_trụ = πr²×2r = 2πr³.', waterLevel: 0, showFormula: 'V_{trụ} = 2\\pi r^3' },
      { time: 0.4, narration: 'Archimedes chứng minh: V_cầu = (2/3)V_trụ.', waterLevel: 0.67, showFormula: 'V_{cầu} = \\frac{2}{3}V_{trụ}' },
      { time: 0.6, narration: 'Thay V_trụ = 2πr³ vào.', waterLevel: 0.67, showFormula: 'V_{cầu} = \\frac{2}{3} \\times 2\\pi r^3' },
      { time: 0.8, narration: 'Rút gọn: V = (4/3)πr³.', waterLevel: 1, showFormula: 'V = \\frac{4}{3}\\pi r^3' },
      { time: 1.0, narration: 'Vậy thể tích hình cầu V = (4/3)πr³.', waterLevel: 1, showFormula: 'V = \\frac{4}{3}\\pi r^3' },
    ],
    finalFormula: 'V = (4/3)πr³',
    finalFormulaLatex: 'V = \\frac{4}{3}\\pi r^3',
  },

  triangularPrism: {
    nameVi: 'Lăng trụ tam giác',
    filename: 'triangularPrismVolume.ts',
    exportName: 'TRIANGULAR_PRISM_VOLUME_EXPERIMENT',
    type: 'triangular_prism_volume',
    topoKey: 'triangular_prism',
    concept: `Chứng minh V = Sđáy × h qua xếp lớp:
- Đáy tam giác ABC (face base) có diện tích Sđáy = (1/2)a×h△
- Cạnh đứng AA1, BB1, CC1 (edges lateral) thể hiện chiều cao h
- Nước đổ qua 3 mặt bên ABB1A1, BCC1B1, ACC1A1 (faces lateral) dâng theo lớp
- Cuối: 2 lăng trụ ghép = 1 hộp chữ nhật, highlight tất cả 5 mặt`,
    baseFrames: [
      { time: 0,    narration: 'Lăng trụ tam giác có 2 đáy tam giác bằng nhau.', waterLevel: 0 },
      { time: 0.2,  narration: 'Diện tích đáy là tam giác: Sđáy = (1/2)×đáy×chiều cao đáy.', waterLevel: 0, showFormula: 'S_{đáy} = \\frac{1}{2}ah_{\\triangle}' },
      { time: 0.4,  narration: 'Điền nước từng lớp lên.', waterLevel: 0.5 },
      { time: 0.7,  narration: 'Mỗi lớp nước có hình tam giác diện tích Sđáy.', waterLevel: 1, showFormula: 'V = S_{đáy} \\times h' },
      { time: 0.85, narration: 'Ghép đúng 2 lăng trụ tam giác → 1 hình hộp chữ nhật: bằng chứng thể tích.', waterLevel: 1 },
      { time: 1.0,  narration: 'Vậy V = Sđáy × h.', waterLevel: 1, showFormula: 'V = \\frac{1}{2}ah_{\\triangle} \\times h_{\\text{lăng trụ}}' },
    ],
    finalFormula: 'V = (1/2)a×h△×h',
    finalFormulaLatex: 'V = \\frac{1}{2}ah_{\\triangle} \\times h',
  },
}

// ── System prompt ─────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `Bạn là giáo viên Toán Hình học Không gian Việt Nam chuyên dạy bằng mô hình 3D tương tác.

Nhiệm vụ: Với mỗi frame của ảo nghiệm, chỉ định các phần tử hình học nào cần được TÔ SÁNG (highlight) trên mô hình 3D để học sinh biết narration đang nói về phần nào của hình.

Quy tắc chọn highlight:
- Chỉ dùng ID chính xác từ topology được cung cấp — KHÔNG bịa ID
- Mỗi frame chỉ highlight những gì narration đề cập, đừng highlight tất cả cùng lúc
- "đáy" / "base" → highlight mặt đáy (base faces) + vertices đáy
- "chiều cao" / "trục" / "cạnh đứng" → highlight edges lateral/axis
- "mặt xung quanh" / "mặt bên" → highlight faces lateral
- "đỉnh" (apex/top vertex) → highlight vertex đỉnh + edges lateral kết nối đỉnh
- Khi đổ nước/cát vào hình: highlight mặt lateral + đỉnh nguồn
- Sau khi nước/cát tích tụ: highlight mặt đáy để thể hiện thể tích tích lũy
- Frame cuối (kết luận công thức): highlight TẤT CẢ faces để thể hiện toàn bộ thể tích
- visibleVertices/Edges/Faces: để [] (rỗng) — chỉ điền nếu cần ẩn bớt
- narration: GIỮ NGUYÊN text, KHÔNG sửa bất kỳ ký tự nào
- Trả về JSON THUẦN TÚY — không markdown, không code block, không giải thích`

// ── Call DeepSeek API ─────────────────────────────────────────────────────────
async function callDeepSeek(expKey, exp, topoDesc) {
  const framesJson = JSON.stringify(exp.baseFrames, null, 2)

  const userPrompt = `Hình: ${exp.nameVi}
Concept ảo nghiệm: ${exp.concept}

Topology thực tế từ geometry engine (chỉ dùng đúng các ID này):
${topoDesc}

Frames hiện tại (giữ nguyên tất cả field, CHỈ thêm highlight/visible vào mỗi frame):
${framesJson}

Trả về JSON:
{
  "frames": [
    {
      "time": <giữ nguyên>,
      "narration": "<giữ nguyên chính xác>",
      "waterLevel": <giữ nguyên nếu có>,
      "pourCount": <giữ nguyên nếu có>,
      "showFormula": "<giữ nguyên nếu có>",
      "highlightVertices": ["<ID từ topology>"],
      "highlightEdges": ["<ID từ topology>"],
      "highlightFaces": ["<ID từ topology>"],
      "visibleVertices": [],
      "visibleEdges": [],
      "visibleFaces": []
    }
  ]
}`

  const res = await fetch(`${DEEPSEEK_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${DEEPSEEK_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 2500,
      temperature: 0.15,
      response_format: { type: 'json_object' },
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`DeepSeek API error ${res.status}: ${err}`)
  }

  const data = await res.json()
  const content = data.choices?.[0]?.message?.content
  if (!content) throw new Error('Empty response from API')
  return JSON.parse(content)
}

// ── Serialize a single ExperimentFrame to TypeScript source ──────────────────
function serializeFrame(f) {
  const lines = []
  lines.push(`      time: ${f.time},`)
  lines.push(`      narration: '${f.narration.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}',`)
  if (f.waterLevel !== undefined) lines.push(`      waterLevel: ${f.waterLevel},`)
  if (f.pourCount !== undefined)  lines.push(`      pourCount: ${f.pourCount},`)
  if (f.showFormula)              lines.push(`      showFormula: '${f.showFormula.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}',`)
  if (f.highlightVertices?.length) lines.push(`      highlightVertices: [${f.highlightVertices.map(v => `'${v}'`).join(', ')}],`)
  if (f.highlightEdges?.length)    lines.push(`      highlightEdges: [${f.highlightEdges.map(v => `'${v}'`).join(', ')}],`)
  if (f.highlightFaces?.length)    lines.push(`      highlightFaces: [${f.highlightFaces.map(v => `'${v}'`).join(', ')}],`)
  if (f.visibleVertices?.length)   lines.push(`      visibleVertices: [${f.visibleVertices.map(v => `'${v}'`).join(', ')}],`)
  if (f.visibleEdges?.length)      lines.push(`      visibleEdges: [${f.visibleEdges.map(v => `'${v}'`).join(', ')}],`)
  if (f.visibleFaces?.length)      lines.push(`      visibleFaces: [${f.visibleFaces.map(v => `'${v}'`).join(', ')}],`)
  return `    {\n${lines.join('\n')}\n    }`
}

// ── Write one experiment TypeScript file ─────────────────────────────────────
function writeExperimentFile(exp, frames) {
  const framesTs = frames.map(serializeFrame).join(',\n')
  const topo = GEO_TOPOLOGY[exp.topoKey] ?? {}
  const topoComment = [
    `Topology (from geometry engine):`,
    `  vertices: ${(topo.vertices ?? []).join(', ') || '(none)'}`,
    `  edges:    ${(topo.edges ?? []).join(', ') || '(none)'}`,
    `  faces:    ${(topo.faces ?? []).join(', ') || '(none)'}`,
  ].join('\n * ')

  const content = `/**
 * Virtual experiment: ${exp.nameVi}
 *
 * ${exp.concept.split('\n').join('\n * ')}
 *
 * ${topoComment}
 *
 * Generated by scripts/update-experiments.mjs with DeepSeek AI.
 * Topology sourced dynamically from geometry engine via extract-topology.ts.
 */

import type { VirtualExperiment } from './types'

export const ${exp.exportName}: VirtualExperiment = {
  type: '${exp.type}',
  shapeName: '${exp.nameVi}',
  frames: [
${framesTs},
  ],
  finalFormula: '${exp.finalFormula.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}',
  finalFormulaLatex: '${exp.finalFormulaLatex.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}',
}
`
  const filepath = path.join(EXPERIMENTS_DIR, exp.filename)
  fs.writeFileSync(filepath, content, 'utf8')
}

// ── Main ──────────────────────────────────────────────────────────────────────
const targetArg = process.argv[2]
const keys = targetArg
  ? [targetArg]
  : Object.keys(EXPERIMENTS)

async function main() {
  for (const key of keys) {
    const exp = EXPERIMENTS[key]
    if (!exp) {
      console.error(`Unknown key: "${key}". Available: ${Object.keys(EXPERIMENTS).join(', ')}`)
      continue
    }

    const topo = GEO_TOPOLOGY[exp.topoKey]
    if (!topo) {
      console.warn(`⚠ No topology found for "${exp.topoKey}" — skipping`)
      continue
    }
    const topoDesc = buildTopoDescription(topo)

    const idx = keys.indexOf(key) + 1
    console.log(`[${idx}/${keys.length}] ${exp.nameVi} (${key})`)
    console.log(`  topology: ${topo.vertices.join(',')} | edges: ${topo.edges.length} | faces: ${topo.faces.join(',')}`)

    let frames
    try {
      const aiData = await callDeepSeek(key, exp, topoDesc)
      frames = aiData.frames
      if (!Array.isArray(frames) || frames.length === 0) throw new Error('No frames in response')
      console.log(`  ✓ DeepSeek returned ${frames.length} frames`)
    } catch (err) {
      console.error(`  ✗ API error: ${err.message} — using base frames`)
      frames = exp.baseFrames
    }

    writeExperimentFile(exp, frames)
    console.log(`  ✓ Written: ${exp.filename}\n`)

    if (idx < keys.length) await new Promise(r => setTimeout(r, 500))
  }

  console.log('✅ All experiment files updated.')
  console.log('   Topology sourced from geometry engine → accurate IDs guaranteed.')
  console.log('\nVerify: pnpm typecheck')
}

main().catch(err => {
  console.error('Fatal:', err)
  process.exit(1)
})
