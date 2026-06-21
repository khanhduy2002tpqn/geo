#!/usr/bin/env node
/**
 * scripts/update-cap2-shapes.mjs
 * Regenerates educational content for all Cấp 2 (lớp 6–9) geometry shapes
 * via DeepSeek API, then writes shapes-data.ts.
 *
 * Usage:
 *   node scripts/update-cap2-shapes.mjs
 *
 * Reads DEEPSEEK_API_KEY from .env.local (or process.env).
 * Only updates cap2 shapes; cap3/daihoc shapes are kept unchanged.
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

const API_KEY = process.env.DEEPSEEK_API_KEY ?? process.env.OPENROUTER_API_KEY
const BASE_URL = process.env.DEEPSEEK_BASE_URL ?? process.env.OPENROUTER_BASE_URL ?? 'https://api.deepseek.com'
const MODEL = process.env.DEEPSEEK_MODEL ?? process.env.OPENROUTER_MODEL ?? 'deepseek-chat'
const OUT_FILE = path.join(ROOT, 'src/lib/geo-ai/data/shapes-data.ts')

if (!API_KEY) {
  console.error('Error: DEEPSEEK_API_KEY or OPENROUTER_API_KEY not found in .env.local or environment.')
  process.exit(1)
}

// ── SYSTEM PROMPT ─────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `Bạn là giáo viên Toán THCS Việt Nam, chuyên dạy Hình học lớp 6–9.
Nhiệm vụ: tạo nội dung giáo dục chính xác, phù hợp cấp 2 (lớp 6–9).
Trả về JSON THUẦN TÚY duy nhất — không markdown, không code block, không giải thích.
Toàn bộ text bằng tiếng Việt.
LaTeX: dùng ký hiệu chuẩn (ví dụ \\pi, \\frac{1}{3}, \\sqrt{2}).
Không dùng tọa độ, vector, tích phân — chỉ công thức cơ bản cấp 2.`

const CAP2_GUIDE = `Cấp học: Cấp 2 / THCS (lớp 6–9).
- Ngôn ngữ đơn giản, gần gũi, dễ hiểu với học sinh 11–15 tuổi
- So sánh với đồ vật quen thuộc hàng ngày (hộp quà, lon nước, quả bóng...)
- Công thức cơ bản: V, S; không cần chứng minh phức tạp
- Bài tập thực hành: số nguyên nhỏ, tính tay được
- Kết nối thực tế với cuộc sống học sinh`

// ── STATIC DATA (technical, unchanged) ────────────────────────────────────────
const SHAPES_CAP2_STATIC = {
  cylinder: {
    nameVi: 'Hình trụ', type: 'curved', level: 'cap2',
    parserKeywords: ['hình trụ', 'trụ tròn xoay', 'khối trụ', 'cylinder'],
    fallbackSpec: { shape: 'cylinder', vertices: ['O', 'O1'], params: { r: 1, h: 2 }, conditions: [] },
    topology: { vertices: 0, edges: 2, faces: 3, euler: null },
    formulas: {
      volume:      { text: 'V = πr²h',        latex: 'V = \\pi r^2 h' },
      lateralArea: { text: 'Sxq = 2πrh',      latex: 'S_{xq} = 2\\pi rh' },
      surfaceArea: { text: 'Stp = 2πr(r + h)', latex: 'S_{tp} = 2\\pi r(r+h)' },
    },
    experiment: {
      type: 'cylinder_volume', shapeName: 'Hình trụ',
      finalFormula: 'V = πr²h', finalFormulaLatex: 'V = \\pi r^2 h',
      frames: [
        { time: 0.0, narration: 'Quan sát hình trụ. Bán kính đáy là r, chiều cao là h.', waterLevel: 0 },
        { time: 0.1, narration: 'Hình trụ có đáy là hình tròn bán kính r.', waterLevel: 0 },
        { time: 0.3, narration: 'Diện tích đáy hình tròn: S = πr².', waterLevel: 0, showFormula: 'S_{đáy} = \\pi r^2' },
        { time: 0.5, narration: 'Đổ nước vào hình trụ đến chiều cao h.', waterLevel: 0.5 },
        { time: 0.7, narration: 'Nước đã đầy hình trụ.', waterLevel: 1 },
        { time: 0.8, narration: 'Thể tích = diện tích đáy × chiều cao.', waterLevel: 1, showFormula: 'V = S_{đáy} \\times h' },
        { time: 0.9, narration: 'Thay Sđáy = πr² vào công thức.', waterLevel: 1, showFormula: 'V = \\pi r^2 h' },
        { time: 1.0, narration: 'Vậy thể tích hình trụ V = πr²h.', waterLevel: 1, showFormula: 'V = \\pi r^2 h' },
      ],
    },
    miniExperimentSteps: [
      { label: 'Lớp 1', fillLevel: 0.33, formula: 'S_{đáy} = \\pi r^2' },
      { label: 'Lớp 2', fillLevel: 0.66 },
      { label: 'Đầy',   fillLevel: 1.0,  formula: 'V = \\pi r^2 h' },
    ],
  },

  cone: {
    nameVi: 'Hình nón', type: 'curved', level: 'cap2',
    parserKeywords: ['hình nón', 'nón tròn xoay', 'khối nón', 'cone'],
    fallbackSpec: { shape: 'cone', vertices: ['O', 'S'], params: { r: 1, h: 2 }, conditions: [] },
    topology: { vertices: 1, edges: 1, faces: 2, euler: null },
    formulas: {
      volume:      { text: 'V = (1/3)πr²h', latex: 'V = \\dfrac{1}{3}\\pi r^2 h' },
      lateralArea: { text: 'Sxq = πrl',      latex: 'S_{xq} = \\pi rl' },
      surfaceArea: { text: 'Stp = πr(r + l)', latex: 'S_{tp} = \\pi r(r+l)' },
    },
    experiment: {
      type: 'cone_volume', shapeName: 'Hình nón',
      finalFormula: 'V = (1/3)πr²h', finalFormulaLatex: 'V = \\frac{1}{3}\\pi r^2 h',
      frames: [
        { time: 0.0,  narration: 'Chuẩn bị hình trụ và hình nón cùng bán kính r, chiều cao h.', waterLevel: 0 },
        { time: 0.25, narration: 'Nước từ 1 nón chiếm 1/3 hình trụ.', waterLevel: 0.333, pourCount: 1, showFormula: '\\frac{1}{3}V_{trụ}' },
        { time: 0.55, narration: 'Nước từ 2 nón chiếm 2/3 hình trụ.', waterLevel: 0.667, pourCount: 2, showFormula: '\\frac{2}{3}V_{trụ}' },
        { time: 0.85, narration: '3 lần đổ vừa đúng đầy hình trụ! V_nón = (1/3)V_trụ.', waterLevel: 1, pourCount: 3, showFormula: 'V_{nón} = \\frac{1}{3}V_{trụ}' },
        { time: 1.0,  narration: 'Vậy thể tích hình nón V = (1/3)πr²h.', waterLevel: 1, pourCount: 3, showFormula: 'V = \\frac{1}{3}\\pi r^2 h' },
      ],
    },
    miniExperimentSteps: [
      { label: 'Rót lần 1', fillLevel: 0.333, formula: '\\frac{1}{3}V_{trụ}' },
      { label: 'Rót lần 2', fillLevel: 0.667, formula: '\\frac{2}{3}V_{trụ}' },
      { label: 'Rót lần 3', fillLevel: 1.0,   formula: 'V = \\frac{1}{3}\\pi r^2 h' },
    ],
  },

  sphere: {
    nameVi: 'Hình cầu', type: 'curved', level: 'cap2',
    parserKeywords: ['hình cầu', 'khối cầu', 'sphere'],
    fallbackSpec: { shape: 'sphere', vertices: ['O'], params: { r: 1 }, conditions: [] },
    topology: { vertices: 0, edges: 0, faces: 1, euler: null },
    formulas: {
      volume:      { text: 'V = (4/3)πr³', latex: 'V = \\dfrac{4}{3}\\pi r^3' },
      surfaceArea: { text: 'S = 4πr²',     latex: 'S = 4\\pi r^2' },
    },
    experiment: {
      type: 'sphere_volume', shapeName: 'Hình cầu',
      finalFormula: 'V = (4/3)πr³', finalFormulaLatex: 'V = \\frac{4}{3}\\pi r^3',
      frames: [
        { time: 0.0, narration: 'Archimedes: đặt hình cầu bán kính r vào hình trụ bán kính r, chiều cao 2r.', waterLevel: 0 },
        { time: 0.2, narration: 'Hình trụ ngoại tiếp: V_trụ = πr² × 2r = 2πr³.', waterLevel: 0, showFormula: 'V_{trụ} = 2\\pi r^3' },
        { time: 0.4, narration: 'Archimedes chứng minh: V_cầu = (2/3)V_trụ.', waterLevel: 0.67, showFormula: 'V_{cầu} = \\frac{2}{3}V_{trụ}' },
        { time: 0.7, narration: 'Thay V_trụ = 2πr³: V = (2/3) × 2πr³ = (4/3)πr³.', waterLevel: 1, showFormula: 'V = \\frac{4}{3}\\pi r^3' },
        { time: 1.0, narration: 'Vậy thể tích hình cầu V = (4/3)πr³.', waterLevel: 1, showFormula: 'V = \\frac{4}{3}\\pi r^3' },
      ],
    },
    miniExperimentSteps: [
      { label: 'Đặt cầu vào trụ', fillLevel: 0.5,  formula: 'V_{trụ} = 2\\pi r^3' },
      { label: 'So sánh V',        fillLevel: 0.8,  formula: 'V_{cầu} = \\frac{2}{3}V_{trụ}' },
      { label: 'Kết luận',         fillLevel: 1.0,  formula: 'V = \\frac{4}{3}\\pi r^3' },
    ],
  },

  cube: {
    nameVi: 'Hình lập phương', type: 'polyhedron', level: 'cap2',
    parserKeywords: ['hình lập phương', 'cube'],
    fallbackSpec: { shape: 'cube', vertices: ['A', 'B', 'C', 'D', 'A1', 'B1', 'C1', 'D1'], params: { a: 1 }, conditions: [] },
    topology: { vertices: 8, edges: 12, faces: 6, euler: 2 },
    formulas: {
      volume:      { text: 'V = a³',   latex: 'V = a^3' },
      lateralArea: { text: 'Sxq = 4a²', latex: 'S_{xq} = 4a^2' },
      surfaceArea: { text: 'Stp = 6a²', latex: 'S_{tp} = 6a^2' },
    },
    experiment: {
      type: 'cube_volume', shapeName: 'Hình lập phương',
      finalFormula: 'V = a³', finalFormulaLatex: 'V = a^3',
      frames: [
        { time: 0.0, narration: 'Quan sát hình lập phương cạnh a.', waterLevel: 0 },
        { time: 0.3, narration: 'Điền đầy hình lập phương từng lớp từ dưới lên.', waterLevel: 0.33 },
        { time: 0.5, narration: 'Mỗi lớp có a×a = a² đơn vị thể tích.', waterLevel: 0.66, showFormula: 'S_{lớp} = a^2' },
        { time: 0.7, narration: 'Xếp a lớp lên nhau.', waterLevel: 1 },
        { time: 1.0, narration: 'Vậy V = a³.', waterLevel: 1, showFormula: 'V = a^3' },
      ],
    },
    miniExperimentSteps: [
      { label: 'Lớp 1', fillLevel: 0.33, formula: 'a \\times a \\text{ đv}' },
      { label: 'Lớp 2', fillLevel: 0.66 },
      { label: 'Lớp a', fillLevel: 1.0,  formula: 'V = a^3' },
    ],
  },

  rectangular_prism: {
    nameVi: 'Hình hộp chữ nhật', type: 'polyhedron', level: 'cap2',
    parserKeywords: ['hình hộp chữ nhật', 'hình hộp', 'lăng trụ tứ giác', 'rectangular prism'],
    fallbackSpec: { shape: 'rectangular_prism', baseShape: 'rectangle', vertices: ['A', 'B', 'C', 'D', 'A1', 'B1', 'C1', 'D1'], params: { a: 1, b: 1, h: 1 }, conditions: [] },
    topology: { vertices: 8, edges: 12, faces: 6, euler: 2 },
    formulas: {
      volume:      { text: 'V = abh',        latex: 'V = a \\cdot b \\cdot h' },
      lateralArea: { text: 'Sxq = 2(a+b)h',  latex: 'S_{xq} = 2(a+b)h' },
      surfaceArea: { text: 'Stp = 2(ab+bh+ah)', latex: 'S_{tp} = 2(ab+bh+ah)' },
    },
    experiment: {
      type: 'prism_volume', shapeName: 'Hình hộp chữ nhật',
      finalFormula: 'V = a×b×h', finalFormulaLatex: 'V = a \\times b \\times h',
      frames: [
        { time: 0.0, narration: 'Hình hộp chữ nhật có 3 kích thước: dài a, rộng b, cao h.', waterLevel: 0 },
        { time: 0.2, narration: 'Diện tích đáy = a × b.', waterLevel: 0, showFormula: 'S_{đáy} = a \\times b' },
        { time: 0.5, narration: 'Điền nước vào từng lớp.', waterLevel: 0.66 },
        { time: 1.0, narration: 'Vậy V = a×b×h.', waterLevel: 1, showFormula: 'V = a \\times b \\times h' },
      ],
    },
    miniExperimentSteps: [
      { label: 'Lớp 1', fillLevel: 0.33, formula: 'a \\times b \\text{ đv}' },
      { label: 'Lớp 2', fillLevel: 0.66 },
      { label: 'Đầy',   fillLevel: 1.0,  formula: 'V = a \\times b \\times h' },
    ],
  },

  triangular_prism: {
    nameVi: 'Lăng trụ tam giác', type: 'polyhedron', level: 'cap2',
    parserKeywords: ['lăng trụ tam giác', 'lăng trụ đứng tam giác', 'triangular prism'],
    fallbackSpec: { shape: 'triangular_prism', vertices: ['A', 'B', 'C', 'A1', 'B1', 'C1'], params: { a: 1, h: 2 }, conditions: [] },
    topology: { vertices: 6, edges: 9, faces: 5, euler: 2 },
    formulas: {
      volume:      { text: 'V = Sđáy × h',   latex: 'V = S_{đáy} \\times h' },
      lateralArea: { text: 'Sxq = chu vi đáy × h', latex: 'S_{xq} = C_{đáy} \\times h' },
      surfaceArea: { text: 'Stp = Sxq + 2×Sđáy', latex: 'S_{tp} = S_{xq} + 2S_{đáy}' },
    },
    experiment: {
      type: 'rectangular_prism_volume', shapeName: 'Lăng trụ tam giác',
      finalFormula: 'V = Sđáy × h', finalFormulaLatex: 'V = S_{đáy} \\times h',
      frames: [
        { time: 0.0, narration: 'Lăng trụ đứng: hai đáy là hai tam giác bằng nhau và song song.', waterLevel: 0 },
        { time: 0.3, narration: 'Diện tích đáy tam giác: Sđáy = (1/2) × đáy × chiều cao đáy.', waterLevel: 0, showFormula: 'S_{đáy} = \\frac{1}{2}ah' },
        { time: 0.6, narration: 'Đổ nước từ dưới lên theo chiều cao h.', waterLevel: 0.7 },
        { time: 1.0, narration: 'Thể tích = diện tích đáy × chiều cao.', waterLevel: 1, showFormula: 'V = S_{đáy} \\times h' },
      ],
    },
    miniExperimentSteps: [
      { label: 'Đáy tam giác', fillLevel: 0.33, formula: 'S_{đáy} = \\frac{1}{2}ah' },
      { label: 'Nửa đầy',     fillLevel: 0.66 },
      { label: 'Đầy',         fillLevel: 1.0,  formula: 'V = S_{đáy} \\times h' },
    ],
  },

  square_pyramid: {
    nameVi: 'Hình chóp tứ giác đều', type: 'polyhedron', level: 'cap2',
    parserKeywords: ['hình chóp tứ giác', 'hình chóp s.abcd', 'chóp tứ giác đều', 'hình chóp vuông'],
    fallbackSpec: { shape: 'square_pyramid', apex: 'S', vertices: ['A', 'B', 'C', 'D', 'S'], params: { a: 1, h: 1 }, conditions: [] },
    topology: { vertices: 5, edges: 8, faces: 5, euler: 2 },
    formulas: {
      volume:      { text: 'V = (1/3)a²h',  latex: 'V = \\dfrac{1}{3}a^2 h' },
      lateralArea: { text: 'Sxq = 2al',     latex: 'S_{xq} = 2al' },
      surfaceArea: { text: 'Stp = a² + 2al', latex: 'S_{tp} = a^2 + 2al' },
    },
    experiment: {
      type: 'pyramid_volume', shapeName: 'Hình chóp tứ giác đều',
      finalFormula: 'V = (1/3)a²h', finalFormulaLatex: 'V = \\frac{1}{3}a^2 h',
      frames: [
        { time: 0.0,  narration: 'Chuẩn bị hình hộp và hình chóp cùng đáy vuông cạnh a, cùng chiều cao h.', waterLevel: 0 },
        { time: 0.25, narration: 'Đổ cát từ chóp vào hộp: chiếm 1/3.', waterLevel: 0.333, pourCount: 1, showFormula: '\\frac{1}{3}V_{hộp}' },
        { time: 0.55, narration: 'Đổ lần 2: chiếm 2/3.', waterLevel: 0.667, pourCount: 2, showFormula: '\\frac{2}{3}V_{hộp}' },
        { time: 0.85, narration: 'Đổ lần 3: vừa đầy! V_chóp = 1/3 × V_hộp.', waterLevel: 1, pourCount: 3, showFormula: 'V = \\frac{1}{3}a^2 h' },
        { time: 1.0,  narration: 'Vậy thể tích hình chóp V = (1/3)a²h.', waterLevel: 1, pourCount: 3, showFormula: 'V = \\frac{1}{3}a^2 h' },
      ],
    },
    miniExperimentSteps: [
      { label: 'Đổ lần 1', fillLevel: 0.333, formula: '\\frac{1}{3}V_{hộp}' },
      { label: 'Đổ lần 2', fillLevel: 0.667 },
      { label: 'Đổ lần 3', fillLevel: 1.0, formula: 'V = \\frac{1}{3}a^2 h' },
    ],
  },

  triangular_pyramid: {
    nameVi: 'Hình chóp tam giác', type: 'polyhedron', level: 'cap2',
    parserKeywords: ['hình chóp tam giác', 's.abc', 'chóp tam giác', 'triangular pyramid'],
    fallbackSpec: { shape: 'triangular_pyramid', apex: 'S', vertices: ['A', 'B', 'C', 'S'], params: { a: 1, h: 1 }, conditions: [] },
    topology: { vertices: 4, edges: 6, faces: 4, euler: 2 },
    formulas: {
      volume: { text: 'V = (1/3)Sđáy×h', latex: 'V = \\dfrac{1}{3}S_{đáy} \\cdot h' },
    },
    experiment: {
      type: 'pyramid_volume', shapeName: 'Hình chóp tam giác',
      finalFormula: 'V = (1/3)Sđáy×h', finalFormulaLatex: 'V = \\frac{1}{3}S_{đáy} \\cdot h',
      frames: [
        { time: 0.0,  narration: 'Hình chóp S.ABC có đỉnh S và đáy ABC là tam giác.', waterLevel: 0 },
        { time: 0.25, narration: 'Đổ cát từ chóp vào lăng trụ cùng đáy: chiếm 1/3.', waterLevel: 0.333, pourCount: 1, showFormula: '\\frac{1}{3}V_{lăng trụ}' },
        { time: 0.55, narration: 'Đổ lần 2: chiếm 2/3.', waterLevel: 0.667, pourCount: 2 },
        { time: 0.85, narration: 'Đổ lần 3: vừa đầy! V_chóp = 1/3 × V_lăng trụ.', waterLevel: 1, pourCount: 3, showFormula: 'V = \\frac{1}{3}S_{đáy}h' },
        { time: 1.0,  narration: 'Vậy V = (1/3)Sđáy × h.', waterLevel: 1, pourCount: 3, showFormula: 'V = \\frac{1}{3}S_{đáy}h' },
      ],
    },
    miniExperimentSteps: [
      { label: 'Đổ lần 1', fillLevel: 0.333, formula: '\\frac{1}{3}V_{lăng trụ}' },
      { label: 'Đổ lần 2', fillLevel: 0.667 },
      { label: 'Đổ lần 3', fillLevel: 1.0, formula: 'V = \\frac{1}{3}S_{đáy}h' },
    ],
  },
}

// ── CAP3 SHAPES STATIC (kept unchanged, no AI regeneration) ───────────────────
const SHAPES_CAP3_STATIC = {
  tetrahedron: {
    nameVi: 'Tứ diện đều', type: 'polyhedron', level: 'cap3',
    parserKeywords: ['tứ diện đều', 'tứ diện', 'tetrahedron'],
    fallbackSpec: { shape: 'tetrahedron', vertices: ['A', 'B', 'C', 'D'], params: { a: 1 }, conditions: [] },
    topology: { vertices: 4, edges: 6, faces: 4, euler: 2 },
    formulas: {
      volume:      { text: 'V = a³/(6√2)', latex: 'V = \\dfrac{a^3}{6\\sqrt{2}}' },
      surfaceArea: { text: 'Stp = a²√3',   latex: 'S_{tp} = a^2\\sqrt{3}' },
    },
    experiment: {
      type: 'pyramid_volume', shapeName: 'Tứ diện đều',
      finalFormula: 'V = a³/(6√2)', finalFormulaLatex: 'V = \\frac{a^3}{6\\sqrt{2}}',
      frames: [
        { time: 0.0, narration: 'Tứ diện đều là hình chóp tam giác đặc biệt: mọi cạnh bằng a.', waterLevel: 0 },
        { time: 0.2, narration: 'Đáy ABC tam giác đều: Sđáy = (√3/4)a².', waterLevel: 0, showFormula: 'S_{đáy} = \\frac{\\sqrt{3}}{4}a^2' },
        { time: 0.5, narration: 'Chiều cao h = a×√(2/3).', waterLevel: 0.5, showFormula: 'h = a\\sqrt{\\frac{2}{3}}' },
        { time: 1.0, narration: 'Rút gọn: V = a³/(6√2).', waterLevel: 1, showFormula: 'V = \\frac{a^3}{6\\sqrt{2}}' },
      ],
    },
    miniExperimentSteps: [
      { label: 'Đổ lần 1', fillLevel: 0.333 },
      { label: 'Đổ lần 2', fillLevel: 0.667 },
      { label: 'Đổ lần 3', fillLevel: 1.0, formula: 'V = \\frac{a^3}{6\\sqrt{2}}' },
    ],
  },
  general_pyramid: {
    nameVi: 'Hình chóp tổng quát', type: 'polyhedron', level: 'cap3',
    parserKeywords: ['hình chóp', 'chóp tổng quát', 'general pyramid'],
    fallbackSpec: { shape: 'general_pyramid', baseShape: 'square', apex: 'S', vertices: ['A', 'B', 'C', 'D', 'S'], params: { a: 1, h: 1 }, conditions: [] },
    topology: { vertices: 5, edges: 8, faces: 5, euler: 2 },
    formulas: { volume: { text: 'V = (1/3)Sđáy×h', latex: 'V = \\dfrac{1}{3}S_{đáy} \\times h' } },
    experiment: {
      type: 'pyramid_volume', shapeName: 'Hình chóp',
      finalFormula: 'V = (1/3)×Sđáy×h', finalFormulaLatex: 'V = \\frac{1}{3}S_{đáy} \\times h',
      frames: [
        { time: 0.0,  narration: 'Chuẩn bị hình chóp và lăng trụ cùng đáy, cùng chiều cao.', waterLevel: 0 },
        { time: 0.25, narration: 'Đổ cát từ chóp vào lăng trụ: chiếm 1/3.', waterLevel: 0.333, pourCount: 1, showFormula: '\\frac{1}{3}' },
        { time: 0.55, narration: 'Đổ lần 2: chiếm 2/3.', waterLevel: 0.667, pourCount: 2, showFormula: '\\frac{2}{3}' },
        { time: 0.85, narration: 'Đổ lần 3: vừa đầy! V_chóp = 1/3 V_lăng trụ.', waterLevel: 1, pourCount: 3, showFormula: 'V = \\frac{1}{3}S_{đáy}h' },
        { time: 1.0,  narration: 'Đúng với mọi hình chóp, dù đáy là tam giác, tứ giác hay ngũ giác.', waterLevel: 1, pourCount: 3, showFormula: 'V = \\frac{1}{3}S_{đáy}h' },
      ],
    },
    miniExperimentSteps: [
      { label: 'Đổ lần 1', fillLevel: 0.333 },
      { label: 'Đổ lần 2', fillLevel: 0.667 },
      { label: 'Đổ lần 3', fillLevel: 1.0, formula: 'V = \\frac{1}{3}S_{đáy}h' },
    ],
  },
  hyperboloid: {
    nameVi: 'Mặt hyperboloid một tầng', type: 'curved', level: 'cap3',
    parserKeywords: ['hyperboloid', 'mặt hyperboloid', 'hyperboloid một tầng'],
    fallbackSpec: { shape: 'hyperboloid', vertices: ['O'], params: { a: 2, h: 1 }, conditions: [] },
    topology: { vertices: 0, edges: 0, faces: 1, euler: null },
    formulas: { volume: { text: 'x²/a² + y²/b² − z²/c² = 1', latex: '\\dfrac{x^2}{a^2} + \\dfrac{y^2}{b^2} - \\dfrac{z^2}{c^2} = 1' } },
    experiment: {
      type: 'sphere_volume', shapeName: 'Hyperboloid',
      finalFormula: 'x²/a² + y²/b² − z²/c² = 1', finalFormulaLatex: '\\frac{x^2}{a^2}+\\frac{y^2}{b^2}-\\frac{z^2}{c^2}=1',
      frames: [
        { time: 0.0, narration: 'Hyperboloid một tầng: x²/a² + y²/b² − z²/c² = 1.', waterLevel: 0 },
        { time: 0.5, narration: 'Thiết diện z = k là ellipse x²/a² + y²/b² = 1 + k²/c².', waterLevel: 0.5, showFormula: '\\frac{x^2}{a^2}+\\frac{y^2}{b^2}=1+\\frac{k^2}{c^2}' },
        { time: 1.0, narration: 'Mặt thu hẹp nhất tại z = 0: ellipse x²/a² + y²/b² = 1.', waterLevel: 1, showFormula: '\\frac{x^2}{a^2}+\\frac{y^2}{b^2}=1' },
      ],
    },
    miniExperimentSteps: [
      { label: 'Thiết diện z=0', fillLevel: 0.5, formula: '\\frac{x^2}{a^2}+\\frac{y^2}{b^2}=1' },
      { label: 'Mặt đầy đủ', fillLevel: 1.0, formula: '\\frac{x^2}{a^2}+\\frac{y^2}{b^2}-\\frac{z^2}{c^2}=1' },
    ],
  },
  paraboloid: {
    nameVi: 'Mặt paraboloid elliptic', type: 'curved', level: 'cap3',
    parserKeywords: ['paraboloid', 'mặt paraboloid', 'paraboloid elliptic'],
    fallbackSpec: { shape: 'paraboloid', vertices: ['O'], params: { a: 2, h: 3 }, conditions: [] },
    topology: { vertices: 0, edges: 0, faces: 1, euler: null },
    formulas: { volume: { text: 'z = x²/a² + y²/b²', latex: 'z = \\dfrac{x^2}{a^2} + \\dfrac{y^2}{b^2}' } },
    experiment: {
      type: 'sphere_volume', shapeName: 'Paraboloid',
      finalFormula: 'z = x²/a² + y²/b²', finalFormulaLatex: 'z = \\frac{x^2}{a^2}+\\frac{y^2}{b^2}',
      frames: [
        { time: 0.0, narration: 'Paraboloid elliptic: z = x²/a² + y²/b².', waterLevel: 0 },
        { time: 0.5, narration: 'Thiết diện z = k là ellipse x²/a² + y²/b² = k.', waterLevel: 0.5, showFormula: 'z = \\frac{x^2}{a^2}+\\frac{y^2}{b^2}' },
        { time: 1.0, narration: 'Đỉnh tại z=0; z tăng → ellipse thiết diện to hơn.', waterLevel: 1, showFormula: 'z = \\frac{x^2}{a^2}+\\frac{y^2}{b^2}' },
      ],
    },
    miniExperimentSteps: [
      { label: 'Đỉnh z=0', fillLevel: 0.3, formula: 'z=0' },
      { label: 'Mặt đầy đủ', fillLevel: 1.0, formula: 'z=\\frac{x^2}{a^2}+\\frac{y^2}{b^2}' },
    ],
  },
}

// ── 2D FLAT SHAPES STATIC ─────────────────────────────────────────────────────
const SHAPES_2D_STATIC = {
  point: { nameVi: 'Điểm', type: 'flat', level: 'cap2', parserKeywords: ['điểm', 'point'], fallbackSpec: { shape: 'point', vertices: ['A'], params: {}, conditions: [] }, topology: { vertices: 1, edges: 0, faces: 0, euler: null }, formulas: {}, experiment: { type: 'area_formula', shapeName: 'Điểm', finalFormula: '', finalFormulaLatex: '', frames: [{ time: 0, narration: 'Điểm A là vị trí trong không gian.', waterLevel: 0 }] }, miniExperimentSteps: [{ label: 'Điểm A', fillLevel: 1 }] },
  segment: { nameVi: 'Đoạn thẳng', type: 'flat', level: 'cap2', parserKeywords: ['đoạn thẳng', 'segment'], fallbackSpec: { shape: 'segment', vertices: ['A', 'B'], params: { a: 3 }, conditions: [] }, topology: { vertices: 2, edges: 1, faces: 0, euler: null }, formulas: { perimeter: { text: 'AB = a', latex: 'AB = a' } }, experiment: { type: 'area_formula', shapeName: 'Đoạn thẳng', finalFormula: 'AB = a', finalFormulaLatex: 'AB = a', frames: [{ time: 0, narration: 'Đoạn thẳng AB có độ dài a.', waterLevel: 0 }] }, miniExperimentSteps: [{ label: 'Đo AB', fillLevel: 1, formula: 'AB = a' }] },
  line: { nameVi: 'Đường thẳng', type: 'flat', level: 'cap2', parserKeywords: ['đường thẳng', 'line'], fallbackSpec: { shape: 'line', vertices: ['A', 'B'], params: { a: 4 }, conditions: [] }, topology: { vertices: 2, edges: 1, faces: 0, euler: null }, formulas: {}, experiment: { type: 'area_formula', shapeName: 'Đường thẳng', finalFormula: '', finalFormulaLatex: '', frames: [{ time: 0, narration: 'Đường thẳng qua hai điểm A và B, kéo dài vô tận.', waterLevel: 0 }] }, miniExperimentSteps: [{ label: 'Đường AB', fillLevel: 1 }] },
  ray: { nameVi: 'Tia', type: 'flat', level: 'cap2', parserKeywords: ['tia', 'ray'], fallbackSpec: { shape: 'ray', vertices: ['O', 'A'], params: { a: 4 }, conditions: [] }, topology: { vertices: 2, edges: 1, faces: 0, euler: null }, formulas: {}, experiment: { type: 'area_formula', shapeName: 'Tia', finalFormula: '', finalFormulaLatex: '', frames: [{ time: 0, narration: 'Tia OA có gốc tại O, đi qua A, kéo dài vô tận.', waterLevel: 0 }] }, miniExperimentSteps: [{ label: 'Tia OA', fillLevel: 1 }] },
  angle: { nameVi: 'Góc', type: 'flat', level: 'cap2', parserKeywords: ['góc', 'angle'], fallbackSpec: { shape: 'angle', vertices: ['B', 'A', 'C'], params: { a2: 60, a: 3 }, conditions: [] }, topology: { vertices: 3, edges: 2, faces: 0, euler: null }, formulas: {}, experiment: { type: 'area_formula', shapeName: 'Góc', finalFormula: 'α°', finalFormulaLatex: '\\alpha', frames: [{ time: 0, narration: 'Góc BAC tạo bởi hai tia AB và AC.', waterLevel: 0 }] }, miniExperimentSteps: [{ label: 'Góc α', fillLevel: 1 }] },
  triangle: { nameVi: 'Tam giác', type: 'flat', level: 'cap2', parserKeywords: ['tam giác', 'triangle'], fallbackSpec: { shape: 'triangle', vertices: ['A', 'B', 'C'], params: { a: 4, b: 3, h: 2.5 }, conditions: [] }, topology: { vertices: 3, edges: 3, faces: 1, euler: null }, formulas: { area: { text: 'S = (1/2)×đáy×h', latex: 'S = \\frac{1}{2}ah' }, perimeter: { text: 'P = a+b+c', latex: 'P = a+b+c' } }, experiment: { type: 'area_formula', shapeName: 'Tam giác', finalFormula: 'S = (1/2)ah', finalFormulaLatex: 'S = \\frac{1}{2}ah', frames: [{ time: 0, narration: 'Diện tích tam giác = nửa tích đáy và chiều cao.', waterLevel: 0 }] }, miniExperimentSteps: [{ label: 'Đáy×h', fillLevel: 0.5, formula: 'a \\times h' }, { label: 'S = ½ah', fillLevel: 1, formula: 'S = \\frac{1}{2}ah' }] },
  equilateral_triangle: { nameVi: 'Tam giác đều', type: 'flat', level: 'cap2', parserKeywords: ['tam giác đều', 'equilateral triangle'], fallbackSpec: { shape: 'equilateral_triangle', vertices: ['A', 'B', 'C'], params: { a: 4 }, conditions: [] }, topology: { vertices: 3, edges: 3, faces: 1, euler: null }, formulas: { area: { text: 'S = (√3/4)a²', latex: 'S = \\frac{\\sqrt{3}}{4}a^2' }, perimeter: { text: 'P = 3a', latex: 'P = 3a' } }, experiment: { type: 'area_formula', shapeName: 'Tam giác đều', finalFormula: 'S = (√3/4)a²', finalFormulaLatex: 'S = \\frac{\\sqrt{3}}{4}a^2', frames: [{ time: 0, narration: 'Tam giác đều: 3 cạnh bằng nhau, 3 góc 60°.', waterLevel: 0 }] }, miniExperimentSteps: [{ label: 'Cạnh a', fillLevel: 0.5 }, { label: 'S = (√3/4)a²', fillLevel: 1, formula: 'S = \\frac{\\sqrt{3}}{4}a^2' }] },
  isosceles_triangle: { nameVi: 'Tam giác cân', type: 'flat', level: 'cap2', parserKeywords: ['tam giác cân', 'isosceles triangle'], fallbackSpec: { shape: 'isosceles_triangle', vertices: ['A', 'B', 'C'], params: { a: 6, b: 5, h: 4 }, conditions: [] }, topology: { vertices: 3, edges: 3, faces: 1, euler: null }, formulas: { area: { text: 'S = (1/2)×a×h', latex: 'S = \\frac{1}{2}ah' }, perimeter: { text: 'P = a+2b', latex: 'P = a+2b' } }, experiment: { type: 'area_formula', shapeName: 'Tam giác cân', finalFormula: 'S = (1/2)ah', finalFormulaLatex: 'S = \\frac{1}{2}ah', frames: [{ time: 0, narration: 'Tam giác cân: 2 cạnh bên bằng nhau.', waterLevel: 0 }] }, miniExperimentSteps: [{ label: 'Đáy a', fillLevel: 0.5 }, { label: 'S = ½ah', fillLevel: 1, formula: 'S = \\frac{1}{2}ah' }] },
  right_triangle: { nameVi: 'Tam giác vuông', type: 'flat', level: 'cap2', parserKeywords: ['tam giác vuông', 'right triangle'], fallbackSpec: { shape: 'right_triangle', vertices: ['A', 'B', 'C'], params: { a: 3, b: 4 }, conditions: ['góc A = 90°'] }, topology: { vertices: 3, edges: 3, faces: 1, euler: null }, formulas: { area: { text: 'S = (1/2)×a×b', latex: 'S = \\frac{1}{2}ab' }, perimeter: { text: 'P = a+b+c; c²=a²+b²', latex: 'P=a+b+c,\\;c^2=a^2+b^2' } }, experiment: { type: 'area_formula', shapeName: 'Tam giác vuông', finalFormula: 'S = (1/2)ab', finalFormulaLatex: 'S = \\frac{1}{2}ab', frames: [{ time: 0, narration: 'Tam giác vuông tại A: AB⊥AC.', waterLevel: 0 }] }, miniExperimentSteps: [{ label: 'c²=a²+b²', fillLevel: 0.5, formula: 'c^2=a^2+b^2' }, { label: 'S = ½ab', fillLevel: 1, formula: 'S = \\frac{1}{2}ab' }] },
  right_isosceles_triangle: { nameVi: 'Tam giác vuông cân', type: 'flat', level: 'cap2', parserKeywords: ['tam giác vuông cân', 'right isosceles'], fallbackSpec: { shape: 'right_isosceles_triangle', vertices: ['A', 'B', 'C'], params: { a: 4 }, conditions: ['góc A = 90°', 'AB=AC'] }, topology: { vertices: 3, edges: 3, faces: 1, euler: null }, formulas: { area: { text: 'S = a²/2', latex: 'S = \\frac{a^2}{2}' }, perimeter: { text: 'P = 2a+a√2', latex: 'P = 2a+a\\sqrt{2}' } }, experiment: { type: 'area_formula', shapeName: 'Tam giác vuông cân', finalFormula: 'S = a²/2', finalFormulaLatex: 'S = \\frac{a^2}{2}', frames: [{ time: 0, narration: 'Tam giác vuông cân: góc 90°–45°–45°.', waterLevel: 0 }] }, miniExperimentSteps: [{ label: 'Cạnh a', fillLevel: 0.5 }, { label: 'S = a²/2', fillLevel: 1, formula: 'S = \\frac{a^2}{2}' }] },
  rectangle: { nameVi: 'Hình chữ nhật', type: 'flat', level: 'cap2', parserKeywords: ['hình chữ nhật', 'rectangle'], fallbackSpec: { shape: 'rectangle', vertices: ['A', 'B', 'C', 'D'], params: { a: 6, b: 4 }, conditions: [] }, topology: { vertices: 4, edges: 4, faces: 1, euler: null }, formulas: { area: { text: 'S = a×b', latex: 'S = a \\times b' }, perimeter: { text: 'P = 2(a+b)', latex: 'P = 2(a+b)' } }, experiment: { type: 'area_formula', shapeName: 'Hình chữ nhật', finalFormula: 'S = a×b', finalFormulaLatex: 'S = a \\times b', frames: [{ time: 0, narration: 'Diện tích hình chữ nhật = dài × rộng.', waterLevel: 0 }] }, miniExperimentSteps: [{ label: 'a×b', fillLevel: 0.5, formula: 'a \\times b' }, { label: 'S = ab', fillLevel: 1, formula: 'S = ab' }] },
  square: { nameVi: 'Hình vuông', type: 'flat', level: 'cap2', parserKeywords: ['hình vuông', 'square'], fallbackSpec: { shape: 'square', vertices: ['A', 'B', 'C', 'D'], params: { a: 5 }, conditions: [] }, topology: { vertices: 4, edges: 4, faces: 1, euler: null }, formulas: { area: { text: 'S = a²', latex: 'S = a^2' }, perimeter: { text: 'P = 4a', latex: 'P = 4a' } }, experiment: { type: 'area_formula', shapeName: 'Hình vuông', finalFormula: 'S = a²', finalFormulaLatex: 'S = a^2', frames: [{ time: 0, narration: 'Hình vuông: 4 cạnh bằng nhau, 4 góc vuông.', waterLevel: 0 }] }, miniExperimentSteps: [{ label: 'Cạnh a', fillLevel: 0.5 }, { label: 'S = a²', fillLevel: 1, formula: 'S = a^2' }] },
  parallelogram: { nameVi: 'Hình bình hành', type: 'flat', level: 'cap2', parserKeywords: ['hình bình hành', 'bình hành', 'parallelogram'], fallbackSpec: { shape: 'parallelogram', vertices: ['A', 'B', 'C', 'D'], params: { a: 5, b: 4, h: 3 }, conditions: [] }, topology: { vertices: 4, edges: 4, faces: 1, euler: null }, formulas: { area: { text: 'S = đáy×h', latex: 'S = a \\cdot h' }, perimeter: { text: 'P = 2(a+b)', latex: 'P = 2(a+b)' } }, experiment: { type: 'area_formula', shapeName: 'Hình bình hành', finalFormula: 'S = a×h', finalFormulaLatex: 'S = a \\cdot h', frames: [{ time: 0, narration: 'S hình bình hành = đáy × chiều cao.', waterLevel: 0 }] }, miniExperimentSteps: [{ label: 'Đáy×h', fillLevel: 0.5, formula: 'a \\times h' }, { label: 'S = ah', fillLevel: 1, formula: 'S = ah' }] },
  rhombus: { nameVi: 'Hình thoi', type: 'flat', level: 'cap2', parserKeywords: ['hình thoi', 'thoi', 'rhombus'], fallbackSpec: { shape: 'rhombus', vertices: ['A', 'B', 'C', 'D'], params: { a: 5, h: 4 }, conditions: [] }, topology: { vertices: 4, edges: 4, faces: 1, euler: null }, formulas: { area: { text: 'S = d₁×d₂/2', latex: 'S = \\frac{d_1 d_2}{2}' }, perimeter: { text: 'P = 4a', latex: 'P = 4a' } }, experiment: { type: 'area_formula', shapeName: 'Hình thoi', finalFormula: 'S = d₁d₂/2', finalFormulaLatex: 'S = \\frac{d_1 d_2}{2}', frames: [{ time: 0, narration: 'S hình thoi = tích hai đường chéo ÷ 2.', waterLevel: 0 }] }, miniExperimentSteps: [{ label: 'd₁×d₂', fillLevel: 0.5, formula: 'd_1 \\times d_2' }, { label: 'S = d₁d₂/2', fillLevel: 1, formula: 'S = \\frac{d_1 d_2}{2}' }] },
  trapezoid: { nameVi: 'Hình thang', type: 'flat', level: 'cap2', parserKeywords: ['hình thang', 'thang', 'trapezoid'], fallbackSpec: { shape: 'trapezoid', vertices: ['A', 'B', 'C', 'D'], params: { a: 8, b: 5, h: 4 }, conditions: [] }, topology: { vertices: 4, edges: 4, faces: 1, euler: null }, formulas: { area: { text: 'S = (a+b)/2×h', latex: 'S = \\frac{(a+b)}{2}h' }, perimeter: { text: 'P = a+b+c+d', latex: 'P = a+b+c+d' } }, experiment: { type: 'area_formula', shapeName: 'Hình thang', finalFormula: 'S = (a+b)h/2', finalFormulaLatex: 'S = \\frac{(a+b)h}{2}', frames: [{ time: 0, narration: 'S hình thang = (đáy lớn + đáy nhỏ)/2 × chiều cao.', waterLevel: 0 }] }, miniExperimentSteps: [{ label: '(a+b)/2', fillLevel: 0.5, formula: '(a+b)/2' }, { label: 'S = (a+b)h/2', fillLevel: 1, formula: 'S = \\frac{(a+b)h}{2}' }] },
  isosceles_trapezoid: { nameVi: 'Hình thang cân', type: 'flat', level: 'cap2', parserKeywords: ['hình thang cân', 'thang cân', 'isosceles trapezoid'], fallbackSpec: { shape: 'isosceles_trapezoid', vertices: ['A', 'B', 'C', 'D'], params: { a: 8, b: 4, h: 3 }, conditions: [] }, topology: { vertices: 4, edges: 4, faces: 1, euler: null }, formulas: { area: { text: 'S = (a+b)/2×h', latex: 'S = \\frac{(a+b)}{2}h' }, perimeter: { text: 'P = a+b+2c', latex: 'P = a+b+2c' } }, experiment: { type: 'area_formula', shapeName: 'Hình thang cân', finalFormula: 'S = (a+b)h/2', finalFormulaLatex: 'S = \\frac{(a+b)h}{2}', frames: [{ time: 0, narration: 'Hình thang cân: 2 cạnh bên bằng nhau.', waterLevel: 0 }] }, miniExperimentSteps: [{ label: '(a+b)/2', fillLevel: 0.5 }, { label: 'S = (a+b)h/2', fillLevel: 1, formula: 'S = \\frac{(a+b)h}{2}' }] },
  parallel_lines: { nameVi: 'Hai đường thẳng song song', type: 'flat', level: 'cap2', parserKeywords: ['hai đường thẳng song song', 'đường thẳng song song'], fallbackSpec: { shape: 'parallel_lines', vertices: ['A', 'B', 'C', 'D'], params: { a: 5, h: 2 }, conditions: ['a//b'] }, topology: { vertices: 4, edges: 2, faces: 0, euler: null }, formulas: {}, experiment: { type: 'area_formula', shapeName: 'Hai đường song song', finalFormula: 'a // b', finalFormulaLatex: 'a \\parallel b', frames: [{ time: 0, narration: 'Hai đường thẳng song song không cắt nhau.', waterLevel: 0 }] }, miniExperimentSteps: [{ label: 'a // b', fillLevel: 1, formula: 'a \\parallel b' }] },
  perpendicular_lines: { nameVi: 'Hai đường thẳng vuông góc', type: 'flat', level: 'cap2', parserKeywords: ['hai đường thẳng vuông góc', 'đường thẳng vuông góc'], fallbackSpec: { shape: 'perpendicular_lines', vertices: ['A', 'B', 'C', 'D'], params: { a: 4 }, conditions: ['a⊥b'] }, topology: { vertices: 4, edges: 2, faces: 0, euler: null }, formulas: {}, experiment: { type: 'area_formula', shapeName: 'Hai đường vuông góc', finalFormula: 'a ⊥ b', finalFormulaLatex: 'a \\perp b', frames: [{ time: 0, narration: 'Hai đường thẳng vuông góc tạo 4 góc vuông.', waterLevel: 0 }] }, miniExperimentSteps: [{ label: 'a ⊥ b', fillLevel: 1, formula: 'a \\perp b' }] },
  perpendicular_bisector: { nameVi: 'Đường trung trực', type: 'flat', level: 'cap2', parserKeywords: ['đường trung trực', 'trung trực'], fallbackSpec: { shape: 'perpendicular_bisector', vertices: ['A', 'B'], params: { a: 4 }, conditions: [] }, topology: { vertices: 4, edges: 2, faces: 0, euler: null }, formulas: {}, experiment: { type: 'area_formula', shapeName: 'Đường trung trực', finalFormula: 'MA = MB', finalFormulaLatex: 'MA = MB', frames: [{ time: 0, narration: 'Đường trung trực của AB: vuông góc với AB tại trung điểm M.', waterLevel: 0 }] }, miniExperimentSteps: [{ label: 'Trung điểm M', fillLevel: 0.5 }, { label: 'MA = MB', fillLevel: 1 }] },
  angle_bisector: { nameVi: 'Đường phân giác', type: 'flat', level: 'cap2', parserKeywords: ['đường phân giác', 'phân giác'], fallbackSpec: { shape: 'angle_bisector', vertices: ['B', 'A', 'C'], params: { a2: 60, a: 3 }, conditions: [] }, topology: { vertices: 4, edges: 3, faces: 0, euler: null }, formulas: {}, experiment: { type: 'area_formula', shapeName: 'Đường phân giác', finalFormula: '∠BAD = ∠DAC', finalFormulaLatex: '\\angle BAD = \\angle DAC', frames: [{ time: 0, narration: 'Tia phân giác AD chia góc BAC thành 2 phần bằng nhau.', waterLevel: 0 }] }, miniExperimentSteps: [{ label: 'Góc BAC', fillLevel: 0.5 }, { label: 'Phân giác AD', fillLevel: 1 }] },
  circle: { nameVi: 'Đường tròn', type: 'flat', level: 'cap2', parserKeywords: ['đường tròn', 'hình tròn', 'circle'], fallbackSpec: { shape: 'circle', vertices: ['O'], params: { r: 3 }, conditions: [] }, topology: { vertices: 1, edges: 0, faces: 1, euler: null }, formulas: { area: { text: 'S = πr²', latex: 'S = \\pi r^2' }, perimeter: { text: 'C = 2πr', latex: 'C = 2\\pi r' } }, experiment: { type: 'circle_area', shapeName: 'Đường tròn', finalFormula: 'S = πr²', finalFormulaLatex: 'S = \\pi r^2', frames: [{ time: 0, narration: 'Quan sát đường tròn tâm O bán kính r.', waterLevel: 0 }, { time: 0.5, narration: 'Diện tích hình tròn S = πr².', waterLevel: 0, showFormula: 'S = \\pi r^2' }, { time: 1, narration: 'Chu vi C = 2πr.', waterLevel: 0, showFormula: 'C = 2\\pi r' }] }, miniExperimentSteps: [{ label: 'Bán kính r', fillLevel: 0.5, formula: '\\pi r^2' }, { label: 'S = πr²', fillLevel: 1, formula: 'S = \\pi r^2' }] },
  sector: { nameVi: 'Hình quạt tròn', type: 'flat', level: 'cap2', parserKeywords: ['hình quạt', 'hình quạt tròn', 'sector'], fallbackSpec: { shape: 'sector', vertices: ['O'], params: { r: 4, a2: 90 }, conditions: [] }, topology: { vertices: 1, edges: 2, faces: 1, euler: null }, formulas: { area: { text: 'S = (α/360)×πr²', latex: 'S = \\frac{\\alpha}{360}\\pi r^2' }, perimeter: { text: 'l = (α/360)×2πr', latex: 'l = \\frac{\\alpha}{360} \\cdot 2\\pi r' } }, experiment: { type: 'circle_area', shapeName: 'Hình quạt tròn', finalFormula: 'S = (α/360)πr²', finalFormulaLatex: 'S = \\frac{\\alpha}{360}\\pi r^2', frames: [{ time: 0, narration: 'Hình quạt tròn: phần hình tròn với góc α.', waterLevel: 0 }, { time: 1, narration: 'S = (α/360)πr².', waterLevel: 0, showFormula: 'S = \\frac{\\alpha}{360}\\pi r^2' }] }, miniExperimentSteps: [{ label: 'α/360', fillLevel: 0.5, formula: '\\frac{\\alpha}{360}' }, { label: 'S quạt', fillLevel: 1, formula: 'S = \\frac{\\alpha}{360}\\pi r^2' }] },
}

// ── EXAMPLES (all grades lop6/lop7/lop8/lop9) ────────────────────────────────
const EXAMPLES = [
  // Lớp 6 — Hình hộp chữ nhật & Hình lập phương
  { id: 'rectangular-prism-basic', shapeKey: 'rectangular_prism', title: 'Hình hộp chữ nhật', description: 'Dài 5 cm, rộng 3 cm, cao 4 cm — nhận biết và đếm mặt, cạnh, đỉnh', level: 'basic', grade: 'lop6', prompt: 'Hình hộp chữ nhật có chiều dài 5 cm, chiều rộng 3 cm và chiều cao 4 cm.', params: { a: 5, b: 3, h: 4 } },
  { id: 'cube-basic', shapeKey: 'cube', title: 'Hình lập phương', description: 'Cạnh 4 cm — nhận biết và đếm mặt, cạnh, đỉnh', level: 'basic', grade: 'lop6', prompt: 'Hình lập phương có cạnh 4 cm.', params: { a: 4 } },
  { id: 'rectangular-prism-volume-lop6', shapeKey: 'rectangular_prism', title: 'Thể tích hộp chữ nhật', description: 'Hộp dài 6 cm, rộng 4 cm, cao 3 cm — tính thể tích', level: 'basic', grade: 'lop6', prompt: 'Hình hộp chữ nhật có chiều dài 6 cm, chiều rộng 4 cm, chiều cao 3 cm. Tính thể tích.', params: { a: 6, b: 4, h: 3 } },
  { id: 'cube-volume-lop6', shapeKey: 'cube', title: 'Thể tích hình lập phương', description: 'Cạnh 3 cm — tính thể tích', level: 'basic', grade: 'lop6', prompt: 'Hình lập phương có cạnh 3 cm. Tính thể tích.', params: { a: 3 } },
  { id: 'rectangular-prism-aquarium', shapeKey: 'rectangular_prism', title: 'Bể cá hình hộp chữ nhật', description: 'Bể dài 50 cm, rộng 25 cm, cao 30 cm — tính thể tích nước', level: 'basic', grade: 'lop6', prompt: 'Bể cá hình hộp chữ nhật có chiều dài 50 cm, chiều rộng 25 cm, chiều cao 30 cm. Tính thể tích bể.', params: { a: 50, b: 25, h: 30 } },
  { id: 'cube-surface-lop6', shapeKey: 'cube', title: 'Diện tích hình lập phương', description: 'Cạnh 5 cm — tính diện tích toàn phần', level: 'intermediate', grade: 'lop6', prompt: 'Hình lập phương có cạnh 5 cm. Tính diện tích toàn phần.', params: { a: 5 } },
  // Lớp 7 — Hình lăng trụ đứng
  { id: 'triangular-prism-right-angle', shapeKey: 'triangular_prism', title: 'Lăng trụ đứng đáy tam giác vuông', description: 'Đáy ABC vuông tại A: AB = 3 cm, AC = 4 cm, chiều cao 5 cm', level: 'basic', grade: 'lop7', prompt: "Lăng trụ đứng ABC.A'B'C' có đáy là tam giác vuông tại A, AB = 3 cm, AC = 4 cm. Chiều cao AA' = 5 cm.", params: { a: 3, h: 5 } },
  { id: 'triangular-prism-equilateral', shapeKey: 'triangular_prism', title: 'Lăng trụ đứng đáy tam giác đều', description: 'Đáy ABC đều cạnh 4 cm, chiều cao 6 cm', level: 'basic', grade: 'lop7', prompt: "Lăng trụ đứng ABC.A'B'C' có đáy ABC là tam giác đều cạnh 4 cm. Chiều cao AA' = 6 cm.", params: { a: 4, h: 6 } },
  { id: 'rectangular-prism-prism-lop7', shapeKey: 'rectangular_prism', title: 'Lăng trụ đứng đáy hình chữ nhật', description: 'Đáy chữ nhật 6×4 cm, chiều cao 5 cm', level: 'basic', grade: 'lop7', prompt: 'Lăng trụ đứng có đáy là hình chữ nhật dài 6 cm, rộng 4 cm. Chiều cao 5 cm.', params: { a: 6, b: 4, h: 5 } },
  { id: 'triangular-prism-surface-lop7', shapeKey: 'triangular_prism', title: 'Lăng trụ đứng — tính diện tích toàn phần', description: 'Đáy tam giác đều cạnh 5 cm, chiều cao 8 cm', level: 'intermediate', grade: 'lop7', prompt: 'Lăng trụ đứng có đáy là tam giác đều cạnh 5 cm, chiều cao 8 cm. Tính diện tích toàn phần và thể tích.', params: { a: 5, h: 8 } },
  { id: 'triangular-prism-house', shapeKey: 'triangular_prism', title: 'Mái nhà dạng lăng trụ tam giác', description: 'Đáy tam giác đều cạnh 6 m, chiều dài mái 8 m', level: 'intermediate', grade: 'lop7', prompt: 'Mái nhà dạng lăng trụ đứng, đáy tam giác đều cạnh 6 m, chiều dài mái 8 m.', params: { a: 6, h: 8 } },
  { id: 'rectangular-prism-storage', shapeKey: 'rectangular_prism', title: 'Thùng hàng lăng trụ tứ giác', description: 'Dài 80 cm, rộng 50 cm, cao 60 cm', level: 'intermediate', grade: 'lop7', prompt: 'Thùng hàng dạng lăng trụ đứng đáy hình chữ nhật: dài 80 cm, rộng 50 cm, cao 60 cm.', params: { a: 80, b: 50, h: 60 } },
  // Lớp 8 — Hình chóp đều
  { id: 'square-pyramid-standard', shapeKey: 'square_pyramid', title: 'Hình chóp tứ giác đều S.ABCD', description: 'Đáy vuông cạnh 6 cm, chiều cao 4 cm', level: 'basic', grade: 'lop8', prompt: 'Hình chóp tứ giác đều S.ABCD: đáy ABCD hình vuông cạnh 6 cm, chiều cao SO = 4 cm.', params: { a: 6, h: 4 } },
  { id: 'triangular-pyramid-standard', shapeKey: 'triangular_pyramid', title: 'Hình chóp tam giác đều S.ABC', description: 'Đáy ABC đều cạnh 4 cm, chiều cao SO = 3 cm', level: 'basic', grade: 'lop8', prompt: 'Hình chóp tam giác đều S.ABC: đáy ABC tam giác đều cạnh 4 cm, chiều cao SO = 3 cm.', params: { a: 4, h: 3 } },
  { id: 'square-pyramid-lateral', shapeKey: 'square_pyramid', title: 'Hình chóp S.ABCD — tính đường trung đoạn', description: 'Đáy vuông 4 cm, chiều cao 3 cm — tính S xung quanh', level: 'basic', grade: 'lop8', prompt: 'Hình chóp tứ giác đều S.ABCD: đáy vuông cạnh 4 cm, chiều cao 3 cm. Tính đường trung đoạn, diện tích xung quanh và thể tích.', params: { a: 4, h: 3 } },
  { id: 'triangular-pyramid-apothem', shapeKey: 'triangular_pyramid', title: 'Hình chóp S.ABC — đáy 6 cm, cao 4 cm', description: 'Đáy tam giác đều cạnh 6 cm, chiều cao 4 cm', level: 'intermediate', grade: 'lop8', prompt: 'Hình chóp tam giác đều S.ABC: đáy tam giác đều cạnh 6 cm, chiều cao SO = 4 cm. Tính đường trung đoạn, diện tích xung quanh và thể tích.', params: { a: 6, h: 4 } },
  { id: 'square-pyramid-roof', shapeKey: 'square_pyramid', title: 'Mái nhà dạng hình chóp tứ giác', description: 'Đáy vuông 8 m, cao 3 m — tính diện tích lợp mái', level: 'intermediate', grade: 'lop8', prompt: 'Mái nhà hình chóp tứ giác đều: đáy vuông cạnh 8 m, chiều cao 3 m. Tính diện tích cần lợp mái.', params: { a: 8, h: 3 } },
  { id: 'triangular-pyramid-sand', shapeKey: 'triangular_pyramid', title: 'Đống cát hình chóp tam giác', description: 'Đáy đều cạnh 3 m, cao 2 m — tính thể tích', level: 'intermediate', grade: 'lop8', prompt: 'Đống cát dạng hình chóp tam giác đều: đáy tam giác đều cạnh 3 m, chiều cao 2 m. Tính thể tích.', params: { a: 3, h: 2 } },
  // Lớp 9 — Hình trụ, Hình nón, Hình cầu
  { id: 'cylinder-basic', shapeKey: 'cylinder', title: 'Hình trụ tròn xoay', description: 'Bán kính r = 3 cm, chiều cao h = 6 cm', level: 'basic', grade: 'lop9', prompt: 'Hình trụ tròn xoay có bán kính đáy r = 3 cm và chiều cao h = 6 cm.', params: { r: 3, h: 6 } },
  { id: 'cone-basic', shapeKey: 'cone', title: 'Hình nón tròn xoay', description: 'Bán kính r = 3 cm, chiều cao h = 4 cm', level: 'basic', grade: 'lop9', prompt: 'Hình nón tròn xoay: bán kính r = 3 cm, chiều cao h = 4 cm.', params: { r: 3, h: 4 } },
  { id: 'sphere-basic', shapeKey: 'sphere', title: 'Hình cầu', description: 'Bán kính R = 5 cm', level: 'basic', grade: 'lop9', prompt: 'Hình cầu tâm O, bán kính R = 5 cm. Tính diện tích mặt cầu và thể tích.', params: { r: 5 } },
  { id: 'cylinder-can', shapeKey: 'cylinder', title: 'Lon nước dạng hình trụ', description: 'r = 4 cm, h = 10 cm — tính thể tích và diện tích tôn', level: 'basic', grade: 'lop9', prompt: 'Lon nước hình trụ: r = 4 cm, h = 10 cm. Tính thể tích nước và diện tích tôn làm lon.', params: { r: 4, h: 10 } },
  { id: 'cone-icecream', shapeKey: 'cone', title: 'Ốc quế kem hình nón', description: 'r = 2 cm, h = 8 cm — tính thể tích kem', level: 'basic', grade: 'lop9', prompt: 'Ốc quế kem hình nón: r = 2 cm, h = 8 cm. Tính thể tích kem chứa được.', params: { r: 2, h: 8 } },
  { id: 'cone-hat', shapeKey: 'cone', title: 'Nón lá dạng hình nón', description: 'r = 20 cm, h = 30 cm — tính diện tích vải', level: 'intermediate', grade: 'lop9', prompt: 'Nón lá hình nón: r = 20 cm, h = 30 cm. Tính đường sinh và diện tích vải may nón.', params: { r: 20, h: 30 } },
  { id: 'sphere-ball', shapeKey: 'sphere', title: 'Quả bóng đá', description: 'R = 11 cm — tính diện tích da và thể tích', level: 'intermediate', grade: 'lop9', prompt: 'Quả bóng đá hình cầu bán kính R = 11 cm. Tính diện tích da bọc và thể tích không khí bên trong.', params: { r: 11 } },
  { id: 'cylinder-pool', shapeKey: 'cylinder', title: 'Bể bơi hình trụ', description: 'r = 5 m, sâu 1,5 m — tính thể tích nước', level: 'intermediate', grade: 'lop9', prompt: 'Bể bơi hình trụ tròn: r = 5 m, h = 1,5 m. Tính thể tích nước cần đổ đầy bể.', params: { r: 5, h: 1.5 } },
  { id: 'sphere-earth', shapeKey: 'sphere', title: 'Mô hình Trái Đất', description: 'R = 6371 km — tính diện tích bề mặt', level: 'intermediate', grade: 'lop9', prompt: 'Trái Đất xấp xỉ hình cầu, R ≈ 6371 km. Tính diện tích bề mặt và thể tích Trái Đất.', params: { r: 6371 } },
  // ── LỚP 6 — 2D cơ bản ──
  { id: 'point-basic', shapeKey: 'point', title: 'Điểm A', description: 'Nhận biết và ký hiệu điểm', level: 'basic', grade: 'lop6', prompt: 'Vẽ điểm A trong mặt phẳng.', params: {} },
  { id: 'segment-basic', shapeKey: 'segment', title: 'Đoạn thẳng AB = 5 cm', description: 'Đoạn thẳng AB = 5 cm', level: 'basic', grade: 'lop6', prompt: 'Vẽ đoạn thẳng AB = 5 cm.', params: { a: 5 } },
  { id: 'line-basic', shapeKey: 'line', title: 'Đường thẳng AB', description: 'Đường thẳng qua A và B', level: 'basic', grade: 'lop6', prompt: 'Vẽ đường thẳng qua hai điểm A và B.', params: { a: 4 } },
  { id: 'ray-basic', shapeKey: 'ray', title: 'Tia Ox', description: 'Tia gốc O qua điểm A', level: 'basic', grade: 'lop6', prompt: 'Vẽ tia Ox gốc O qua A.', params: { a: 4 } },
  { id: 'angle-60', shapeKey: 'angle', title: 'Góc 60°', description: 'Góc nhọn BAC = 60°', level: 'basic', grade: 'lop6', prompt: 'Vẽ góc BAC = 60°.', params: { a2: 60, a: 3 } },
  { id: 'angle-90', shapeKey: 'angle', title: 'Góc vuông 90°', description: 'Góc vuông BAC = 90°', level: 'basic', grade: 'lop6', prompt: 'Vẽ góc vuông BAC = 90°.', params: { a2: 90, a: 3 } },
  { id: 'triangle-basic', shapeKey: 'triangle', title: 'Tam giác ABC', description: 'Tam giác ABC ba cạnh', level: 'basic', grade: 'lop6', prompt: 'Vẽ tam giác ABC.', params: { a: 4, b: 3, h: 2.5 } },
  { id: 'equilateral-triangle-basic', shapeKey: 'equilateral_triangle', title: 'Tam giác đều cạnh 4 cm', description: 'Tam giác đều ABC cạnh 4 cm', level: 'basic', grade: 'lop6', prompt: 'Vẽ tam giác đều ABC cạnh 4 cm.', params: { a: 4 } },
  { id: 'rectangle-basic', shapeKey: 'rectangle', title: 'Hình chữ nhật 6×4 cm', description: 'Hình chữ nhật ABCD dài 6, rộng 4', level: 'basic', grade: 'lop6', prompt: 'Vẽ hình chữ nhật ABCD dài 6 cm, rộng 4 cm.', params: { a: 6, b: 4 } },
  { id: 'square-basic', shapeKey: 'square', title: 'Hình vuông cạnh 5 cm', description: 'Hình vuông ABCD cạnh 5 cm', level: 'basic', grade: 'lop6', prompt: 'Vẽ hình vuông ABCD cạnh 5 cm.', params: { a: 5 } },
  // ── LỚP 7 — 2D tam giác đặc biệt & quan hệ đường thẳng ──
  { id: 'isosceles-triangle-basic', shapeKey: 'isosceles_triangle', title: 'Tam giác cân ABC', description: 'Đáy BC = 6 cm, cạnh bên = 5 cm', level: 'basic', grade: 'lop7', prompt: 'Vẽ tam giác cân ABC: đáy BC = 6 cm, AB = AC = 5 cm.', params: { a: 6, b: 5, h: 4 } },
  { id: 'right-triangle-basic', shapeKey: 'right_triangle', title: 'Tam giác vuông tại A', description: 'AB = 3 cm, AC = 4 cm', level: 'basic', grade: 'lop7', prompt: 'Vẽ tam giác vuông tại A: AB = 3 cm, AC = 4 cm.', params: { a: 3, b: 4 } },
  { id: 'right-isosceles-triangle', shapeKey: 'right_isosceles_triangle', title: 'Tam giác vuông cân', description: 'Góc vuông tại A, cạnh = 4 cm', level: 'basic', grade: 'lop7', prompt: 'Vẽ tam giác vuông cân tại A, cạnh góc vuông = 4 cm.', params: { a: 4 } },
  { id: 'parallel-lines-basic', shapeKey: 'parallel_lines', title: 'Hai đường thẳng song song', description: 'AB // CD', level: 'basic', grade: 'lop7', prompt: 'Vẽ hai đường thẳng song song AB và CD.', params: { a: 5, h: 2 } },
  { id: 'perpendicular-lines-basic', shapeKey: 'perpendicular_lines', title: 'Hai đường thẳng vuông góc', description: 'AB ⊥ CD', level: 'basic', grade: 'lop7', prompt: 'Vẽ hai đường thẳng AB và CD vuông góc nhau.', params: { a: 4 } },
  { id: 'perpendicular-bisector-lop7', shapeKey: 'perpendicular_bisector', title: 'Đường trung trực của AB', description: 'Đoạn AB = 6 cm và đường trung trực', level: 'intermediate', grade: 'lop7', prompt: 'Vẽ đoạn AB = 6 cm và đường trung trực.', params: { a: 6 } },
  { id: 'angle-bisector-lop7', shapeKey: 'angle_bisector', title: 'Phân giác góc 60°', description: 'Góc 60° và tia phân giác', level: 'intermediate', grade: 'lop7', prompt: 'Vẽ góc BAC = 60° và tia phân giác AD.', params: { a2: 60, a: 3 } },
  // ── LỚP 8 — 2D tứ giác ──
  { id: 'parallelogram-basic', shapeKey: 'parallelogram', title: 'Hình bình hành ABCD', description: 'Đáy 6, cạnh bên 4, cao 3', level: 'basic', grade: 'lop8', prompt: 'Vẽ hình bình hành ABCD: đáy 6 cm, cạnh bên 4 cm, chiều cao 3 cm.', params: { a: 6, b: 4, h: 3 } },
  { id: 'parallelogram-area', shapeKey: 'parallelogram', title: 'Hình bình hành — tính S', description: 'Đáy 10, cao 5 cm', level: 'intermediate', grade: 'lop8', prompt: 'Hình bình hành đáy 10 cm, cao 5 cm. Tính diện tích.', params: { a: 10, b: 6, h: 5 } },
  { id: 'rhombus-basic', shapeKey: 'rhombus', title: 'Hình thoi ABCD', description: 'Cạnh 5 cm, cao 4 cm', level: 'basic', grade: 'lop8', prompt: 'Vẽ hình thoi ABCD cạnh 5 cm, chiều cao 4 cm.', params: { a: 5, h: 4 } },
  { id: 'rhombus-diagonal', shapeKey: 'rhombus', title: 'Hình thoi — đường chéo 6 và 8 cm', description: 'Đường chéo d₁=6, d₂=8', level: 'intermediate', grade: 'lop8', prompt: 'Hình thoi đường chéo AC = 6 cm, BD = 8 cm. Tính diện tích và chu vi.' },
  { id: 'trapezoid-basic', shapeKey: 'trapezoid', title: 'Hình thang ABCD', description: 'Đáy lớn 8, đáy nhỏ 5, cao 4', level: 'basic', grade: 'lop8', prompt: 'Vẽ hình thang ABCD: đáy lớn 8 cm, đáy nhỏ 5 cm, cao 4 cm.', params: { a: 8, b: 5, h: 4 } },
  { id: 'isosceles-trapezoid-basic', shapeKey: 'isosceles_trapezoid', title: 'Hình thang cân ABCD', description: 'Đáy 8, đáy nhỏ 4, cao 3', level: 'basic', grade: 'lop8', prompt: 'Vẽ hình thang cân ABCD: đáy lớn 8, đáy nhỏ 4, cao 3 cm.', params: { a: 8, b: 4, h: 3 } },
  { id: 'isosceles-trapezoid-problem', shapeKey: 'isosceles_trapezoid', title: 'Hình thang cân — tính S và chu vi', description: 'Đáy 10, đáy nhỏ 6, cao 4', level: 'intermediate', grade: 'lop8', prompt: 'Hình thang cân: đáy lớn 10 cm, đáy nhỏ 6 cm, cao 4 cm. Tính S và chu vi.', params: { a: 10, b: 6, h: 4 } },
  // ── LỚP 9 — 2D đường tròn ──
  { id: 'circle-basic', shapeKey: 'circle', title: 'Đường tròn R = 5 cm', description: 'Đường tròn (O;5) — tính C và S', level: 'basic', grade: 'lop9', prompt: 'Vẽ đường tròn tâm O bán kính R = 5 cm. Tính chu vi và diện tích.', params: { r: 5 } },
  { id: 'circle-radius', shapeKey: 'circle', title: 'Bán kính và đường kính', description: 'R = 4 cm — phân biệt OA và AB', level: 'basic', grade: 'lop9', prompt: 'Đường tròn (O;4): vẽ bán kính OA và đường kính AB.', params: { r: 4 } },
  { id: 'circle-chord', shapeKey: 'circle', title: 'Dây cung CD', description: 'Đường tròn R = 6, dây cung CD = 8', level: 'intermediate', grade: 'lop9', prompt: 'Đường tròn (O;6). Vẽ dây cung CD = 8 cm. Tính khoảng cách từ O đến CD.' },
  { id: 'circle-tangent', shapeKey: 'circle', title: 'Tiếp tuyến tại điểm A', description: 'Tiếp tuyến vuông góc với bán kính OA', level: 'intermediate', grade: 'lop9', prompt: 'Đường tròn (O;5). Vẽ tiếp tuyến tại A trên đường tròn.' },
  { id: 'circle-secant', shapeKey: 'circle', title: 'Cát tuyến từ điểm ngoài', description: 'Cát tuyến từ M ngoài đường tròn', level: 'intermediate', grade: 'lop9', prompt: 'Đường tròn (O;4). Điểm M ngoài đường tròn. Vẽ cát tuyến từ M cắt tại A và B.' },
  { id: 'sector-90', shapeKey: 'sector', title: 'Hình quạt 90°, R = 4 cm', description: 'Hình quạt góc 90°', level: 'basic', grade: 'lop9', prompt: 'Hình quạt tròn (O;4), góc ở tâm 90°. Tính S và độ dài cung.', params: { r: 4, a2: 90 } },
  { id: 'sector-120', shapeKey: 'sector', title: 'Hình quạt 120°, R = 6 cm', description: 'Hình quạt góc 120°', level: 'intermediate', grade: 'lop9', prompt: 'Hình quạt tròn (O;6), góc ở tâm 120°. Tính S và cung.', params: { r: 6, a2: 120 } },
]

// ── DEEPSEEK CALL ──────────────────────────────────────────────────────────────
async function callDeepSeek(shapeKey, shapeMeta) {
  const GRADE_MAP = {
    // 3D shapes
    cube: '6', rectangular_prism: '6 và 7',
    triangular_prism: '7', square_pyramid: '8',
    triangular_pyramid: '8', cylinder: '9',
    cone: '9', sphere: '9',
    // 2D shapes
    point: '6', segment: '6', line: '6', ray: '6', angle: '6',
    triangle: '6', equilateral_triangle: '6', rectangle: '6', square: '6',
    isosceles_triangle: '7', right_triangle: '7', right_isosceles_triangle: '7',
    parallel_lines: '7', perpendicular_lines: '7',
    perpendicular_bisector: '7', angle_bisector: '7',
    parallelogram: '8', rhombus: '8', trapezoid: '8', isosceles_trapezoid: '8',
    circle: '9', sector: '9',
  }
  const is2D = !!(SHAPES_2D_STATIC && shapeKey in SHAPES_2D_STATIC)
  const experimentContext = is2D
    ? '- Bài tập thực hành: dùng thước, ê-ke, giấy kẻ ô li, compa để vẽ và đo\n- Không dùng ví dụ đổ nước — dùng ví dụ cắt giấy, vẽ hình'
    : '- Thí nghiệm đổ nước/cát để khám phá thể tích'
  const userPrompt = `${CAP2_GUIDE}

Tạo nội dung giáo dục cho hình: ${shapeMeta.nameVi} (${shapeKey})
Lớp: ${GRADE_MAP[shapeKey] ?? '7-9'}

Công thức chính:
${Object.entries(shapeMeta.formulas).map(([k, v]) => `- ${k}: ${v.text}`).join('\n')}

Trả về JSON với cấu trúc CHÍNH XÁC sau (không thêm trường khác):
{
  "statsProperties": [
    "đặc điểm 1 — nhận biết hình, dùng ngôn ngữ lớp cấp 2",
    "đặc điểm 2",
    "đặc điểm 3"
  ],
  "constructionSteps": [
    {"index": 0, "description": "Mô tả ngắn gọn bước 1", "narration": "Giải thích như thầy cô đang nói với học sinh (1-2 câu tự nhiên)"},
    {"index": 1, "description": "Mô tả bước 2", "narration": "Giải thích bước 2"},
    {"index": 2, "description": "Mô tả bước 3", "narration": "Giải thích bước 3"}
  ],
  "formulaContent": {
    "observationBullets": ["Vật quen thuộc 1", "Vật quen thuộc 2", "Vật quen thuộc 3", "Vật quen thuộc 4"],
    "explorationBullets": ["Tính toán/đo đạc 1", "Tính toán 2", "Tính toán 3", "Tính toán 4"],
    "experimentBullets": ["Bước thực hành 1", "Bước 2", "Bước 3", "Bước 4"],
    "discovery": {"text": "Phát hiện chính (1-2 câu)", "latex": "công_thức_LaTeX"},
    "formula": {"text": "Giới thiệu công thức (1 câu)", "latex": "công_thức_1 \\\\[4pt] công_thức_2"},
    "practice": {
      "question": "Bài toán với số nguyên nhỏ",
      "steps": ["Bước 1: ...", "Bước 2: ...", "Bước 3: ...", "Kết quả: ..."],
      "blanks": ["đáp_án_1", "đáp_án_2"]
    }
  },
  "lessonContent": {
    "recognition": ["Dấu hiệu nhận biết 1", "Dấu hiệu 2", "Dấu hiệu 3", "Ví dụ thực tế: ..."],
    "objects": [
      {"category": "Đỉnh", "items": ["A — mô tả vai trò", "B — mô tả"]},
      {"category": "Cạnh đáy", "items": ["AB — cạnh đáy nối A và B"]},
      {"category": "Mặt đáy", "items": ["ABCD — mặt đáy"]}
    ],
    "theorems": [
      {"title": "Tên định lý/nguyên lý", "description": "Mô tả ngắn cấp 2", "latex": ""}
    ],
    "formulas": [
      {"title": "Tên công thức", "description": "Mô tả ngắn", "latex": "công_thức_LaTeX"}
    ]
  },
  "objectDescriptions": {
    "vertices": {"A": "Đây là đỉnh A, ..."},
    "edges": {"AB": "Đây là cạnh AB, ..."},
    "faces": {"ABCD": "Đây là mặt ABCD, ..."}
  },
  "suggestedQuestions": ["Câu hỏi 1?", "Câu hỏi 2?"],
  "qa": [
    {"q": "Câu hỏi quan trọng 1?", "a": "Trả lời ngắn gọn."},
    {"q": "Câu hỏi 2?", "a": "Trả lời."}
  ]
}

Lưu ý quan trọng:
- Tên cạnh/đỉnh liền nhau (không có khoảng trắng): AB, AA1, SA (không phải A B, A A1)
- narration trong constructionSteps: không chứa công thức LaTeX, chỉ dùng chữ viết
- blanks trong practice: luôn là string
- objectDescriptions: chỉ liệt kê đối tượng thực sự có trong hình này
${experimentContext}`

  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 4000,
      temperature: 0.2,
      response_format: { type: 'json_object' },
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`DeepSeek API error ${res.status}: ${err}`)
  }

  const data = await res.json()
  const content = data.choices?.[0]?.message?.content
  if (!content) throw new Error('Empty response from DeepSeek')

  return JSON.parse(content)
}

// ── TYPESCRIPT SERIALIZER ──────────────────────────────────────────────────────
function serializeValue(val, indent = 0) {
  const pad = '  '.repeat(indent)
  const pad1 = '  '.repeat(indent + 1)

  if (val === null) return 'null'
  if (typeof val === 'boolean') return String(val)
  if (typeof val === 'number') return String(val)
  if (typeof val === 'string') {
    // Use double quotes if string contains single quotes (e.g. prime notation A', B'C')
    if (val.includes("'")) {
      const escaped = val.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
      return `"${escaped}"`
    }
    const escaped = val.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
    return `'${escaped}'`
  }
  if (Array.isArray(val)) {
    if (val.length === 0) return '[]'
    const items = val.map(v => `${pad1}${serializeValue(v, indent + 1)}`)
    return `[\n${items.join(',\n')},\n${pad}]`
  }
  if (typeof val === 'object') {
    const entries = Object.entries(val)
    if (entries.length === 0) return '{}'
    const lines = entries.map(([k, v]) => {
      const isSimple = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(k)
      const key = isSimple ? k : `'${k.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`
      return `${pad1}${key}: ${serializeValue(v, indent + 1)}`
    })
    return `{\n${lines.join(',\n')},\n${pad}}`
  }
  return String(val)
}

const COMMENT_MAP = {
  // 3D shapes
  cylinder: 'CYLINDER',
  cone: 'CONE',
  sphere: 'SPHERE',
  cube: 'CUBE',
  rectangular_prism: 'RECTANGULAR PRISM',
  triangular_prism: 'TRIANGULAR PRISM',
  square_pyramid: 'SQUARE PYRAMID',
  triangular_pyramid: 'TRIANGULAR PYRAMID',
  tetrahedron: 'TETRAHEDRON',
  general_pyramid: 'GENERAL PYRAMID',
  hyperboloid: 'HYPERBOLOID',
  paraboloid: 'PARABOLOID',
  // 2D flat shapes
  point: 'POINT — ĐIỂM',
  segment: 'SEGMENT — ĐOẠN THẲNG',
  line: 'LINE — ĐƯỜNG THẲNG',
  ray: 'RAY — TIA',
  angle: 'ANGLE — GÓC',
  triangle: 'TRIANGLE — TAM GIÁC',
  equilateral_triangle: 'EQUILATERAL TRIANGLE — TAM GIÁC ĐỀU',
  isosceles_triangle: 'ISOSCELES TRIANGLE — TAM GIÁC CÂN',
  right_triangle: 'RIGHT TRIANGLE — TAM GIÁC VUÔNG',
  right_isosceles_triangle: 'RIGHT ISOSCELES TRIANGLE — TAM GIÁC VUÔNG CÂN',
  rectangle: 'RECTANGLE — HÌNH CHỮ NHẬT',
  square: 'SQUARE — HÌNH VUÔNG',
  parallelogram: 'PARALLELOGRAM — HÌNH BÌNH HÀNH',
  rhombus: 'RHOMBUS — HÌNH THOI',
  trapezoid: 'TRAPEZOID — HÌNH THANG',
  isosceles_trapezoid: 'ISOSCELES TRAPEZOID — HÌNH THANG CÂN',
  parallel_lines: 'PARALLEL LINES — HAI ĐƯỜNG THẲNG SONG SONG',
  perpendicular_lines: 'PERPENDICULAR LINES — HAI ĐƯỜNG THẲNG VUÔNG GÓC',
  perpendicular_bisector: 'PERPENDICULAR BISECTOR — ĐƯỜNG TRUNG TRỰC',
  angle_bisector: 'ANGLE BISECTOR — ĐƯỜNG PHÂN GIÁC',
  circle: 'CIRCLE — ĐƯỜNG TRÒN',
  sector: 'SECTOR — HÌNH QUẠT TRÒN',
}

function buildShapeTs(shapeKey, staticData, aiData) {
  const merged = { ...staticData, ...(aiData || {}) }
  const label = COMMENT_MAP[shapeKey] || shapeKey.toUpperCase()
  const dashes = '─'.repeat(Math.max(0, 67 - label.length))
  const comment = `    // ── ${label} ${dashes}`
  return `${comment}\n    ${shapeKey}: ${serializeValue(merged, 2)},`
}

// ── MAIN ──────────────────────────────────────────────────────────────────────
async function main() {
  const cap2Keys = Object.keys(SHAPES_CAP2_STATIC)
  const flatKeys = Object.keys(SHAPES_2D_STATIC)
  const cap3Keys = Object.keys(SHAPES_CAP3_STATIC)
  const allKeys = [...cap2Keys, ...flatKeys, ...cap3Keys]
  const aiResults = {}

  const aiKeys = [...cap2Keys, ...flatKeys]
  console.log(`\nRegenerating ${aiKeys.length} cap2+2D shapes via DeepSeek...\n`)

  for (const shapeKey of aiKeys) {
    const staticData = SHAPES_CAP2_STATIC[shapeKey] ?? SHAPES_2D_STATIC[shapeKey]
    const idx = aiKeys.indexOf(shapeKey) + 1
    console.log(`[${idx}/${aiKeys.length}] ${staticData.nameVi} (${shapeKey})...`)

    try {
      aiResults[shapeKey] = await callDeepSeek(shapeKey, staticData)
      console.log(`  ✓ constructionSteps: ${aiResults[shapeKey].constructionSteps?.length ?? 0}`)
    } catch (err) {
      console.error(`  ✗ Error: ${err.message}. Skipping.`)
      aiResults[shapeKey] = {}
    }

    await new Promise(r => setTimeout(r, 500))
  }

  // cap3 shapes: no AI regeneration
  for (const shapeKey of cap3Keys) {
    aiResults[shapeKey] = {}
  }

  const shapeBlocks = allKeys.map(key => {
    const staticData = SHAPES_CAP2_STATIC[key] ?? SHAPES_2D_STATIC[key] ?? SHAPES_CAP3_STATIC[key]
    return buildShapeTs(key, staticData, aiResults[key])
  })

  const PARAM_KEYWORDS = {
    a: ['chiều dài', 'cạnh đáy', 'cạnh', 'đáy lớn', 'đáy', 'bán kính'],
    b: ['chiều rộng', 'cạnh bên', 'đáy nhỏ', 'rộng'],
    h: ['chiều cao', 'cao'],
    r: ['bán kính', 'r =', 'r≈'],
    a2: ['góc', '°'],
  }
  const enrichedExamples = EXAMPLES.map(ex => {
    if (ex.givenParams) return ex
    const params = ex.params ?? {}
    const promptLower = (ex.prompt ?? '').toLowerCase()
    const given = []
    for (const [key, value] of Object.entries(params)) {
      const keywords = PARAM_KEYWORDS[key]
      if (!keywords) { given.push(key); continue }
      const valueStr = String(value)
      const isExplicit = keywords.some(kw => {
        const idx = promptLower.indexOf(kw.toLowerCase())
        if (idx === -1) return false
        const nearby = promptLower.slice(Math.max(0, idx - 5), idx + kw.length + 20)
        return nearby.includes(valueStr)
      })
      if (isExplicit) given.push(key)
    }
    return { ...ex, givenParams: given.length > 0 ? given : Object.keys(params) }
  })

  const examplesTs = `  // ── EXAMPLES ────────────────────────────────────────────────────────────\n  examples: ${serializeValue(enrichedExamples, 1)},`

  const output = `import type { ShapesDatabase } from './types'

const shapesDatabase: ShapesDatabase = {
  shapes: {

${shapeBlocks.join('\n\n')}

  },

${examplesTs}
}

export default shapesDatabase
`

  fs.writeFileSync(OUT_FILE, output, 'utf8')
  console.log(`\n✅ Done! Written to: ${OUT_FILE}`)
  console.log('Run: pnpm typecheck to verify')
}

main().catch(err => {
  console.error('Fatal:', err)
  process.exit(1)
})
