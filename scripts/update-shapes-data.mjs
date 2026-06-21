#!/usr/bin/env node
/**
 * scripts/update-shapes-data.mjs
 * Calls DeepSeek API once per shape to regenerate educational content,
 * then writes the updated shapes-data.ts.
 *
 * Usage:
 *   node scripts/update-shapes-data.mjs
 *
 * Reads OPENROUTER_API_KEY from .env.local (or process.env).
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')

// Load API key from .env.local
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

// ── SYSTEM PROMPT ────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `Bạn là chuyên gia giáo dục Toán Việt Nam, chuyên Hình học Không gian.
Nhiệm vụ: tạo nội dung giáo dục chính xác, phù hợp đúng cấp học (cấp 2 hoặc cấp 3).
Trả về JSON THUẦN TÚY duy nhất — không markdown, không giải thích, không code block.
Toàn bộ text bằng tiếng Việt.
LaTeX: dùng ký hiệu chuẩn (ví dụ \\pi, \\frac{1}{3}, \\sqrt{2}).`

const LEVEL_CONTEXT = {
  cap2: `Cấp học: Cấp 2 / THCS (lớp 8–9).
- Ngôn ngữ đơn giản, gần gũi, tránh thuật ngữ hình học giải tích
- Không dùng tọa độ, vector, tích phân
- So sánh với đồ vật hàng ngày (hộp quà, lon nước, quả bóng...)
- Công thức cơ bản: V và S; không cần chứng minh phức tạp
- Practice: số nguyên nhỏ, tính tay được`,
  cap3: `Cấp học: Cấp 3 / THPT (lớp 11–12).
- Có thể dùng thuật ngữ toán học: tọa độ, vector, đường trung đoạn, định lý Cavalieri
- Tham chiếu mặt phẳng, hệ trục Oxyz khi phù hợp
- Kiểm tra Euler (V - E + F = 2) với hình đa diện
- Công thức đầy đủ: V, Sxq, Stp, đường chéo
- Practice: bài toán SGK lớp 11–12 điển hình`,
}

// ── SHAPE STATIC DATA (technical, keep unchanged) ───────────────────────────
const SHAPES_STATIC = {
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
        { time: 0.0,  narration: 'Quan sát hình lập phương cạnh a.', waterLevel: 0 },
        { time: 0.3,  narration: 'Điền đầy hình lập phương từng lớp từ dưới lên.', waterLevel: 0.33 },
        { time: 0.5,  narration: 'Mỗi lớp có a×a = a² đơn vị thể tích.', waterLevel: 0.66, showFormula: 'S_{lớp} = a^2' },
        { time: 0.7,  narration: 'Xếp a lớp lên nhau.', waterLevel: 1 },
        { time: 1.0,  narration: 'Vậy V = a³.', waterLevel: 1, showFormula: 'V = a^3' },
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
    fallbackSpec: {
      shape: 'rectangular_prism', baseShape: 'rectangle',
      vertices: ['A', 'B', 'C', 'D', 'A1', 'B1', 'C1', 'D1'],
      params: { a: 1, b: 1, h: 1 }, conditions: [],
    },
    topology: { vertices: 8, edges: 12, faces: 6, euler: 2 },
    formulas: {
      volume:      { text: 'V = abh',          latex: 'V = a \\cdot b \\cdot h' },
      lateralArea: { text: 'Sxq = 2(a+b)h',    latex: 'S_{xq} = 2(a+b)h' },
      surfaceArea: { text: 'Stp = 2(ab+bh+ah)', latex: 'S_{tp} = 2(ab+bh+ah)' },
    },
    experiment: {
      type: 'prism_volume', shapeName: 'Hình hộp chữ nhật',
      finalFormula: 'V = a×b×h', finalFormulaLatex: 'V = a \\times b \\times h',
      frames: [
        { time: 0.0,  narration: 'Hình hộp chữ nhật có 3 kích thước: dài a, rộng b, cao h.', waterLevel: 0 },
        { time: 0.2,  narration: 'Diện tích đáy = a × b.', waterLevel: 0, showFormula: 'S_{đáy} = a \\times b' },
        { time: 0.5,  narration: 'Điền nước vào từng lớp.', waterLevel: 0.66 },
        { time: 1.0,  narration: 'Vậy V = a×b×h.', waterLevel: 1, showFormula: 'V = a \\times b \\times h' },
      ],
    },
    miniExperimentSteps: [
      { label: 'Lớp 1', fillLevel: 0.33, formula: 'a \\times b \\text{ đv}' },
      { label: 'Lớp 2', fillLevel: 0.66 },
      { label: 'Đầy',   fillLevel: 1.0,  formula: 'V = a \\times b \\times h' },
    ],
  },

  triangular_prism: {
    nameVi: 'Lăng trụ tam giác', type: 'polyhedron', level: 'cap3',
    parserKeywords: ['lăng trụ tam giác', 'lăng trụ đứng tam giác', 'triangular prism'],
    fallbackSpec: {
      shape: 'triangular_prism', baseShape: 'triangle',
      vertices: ['A', 'B', 'C', 'A1', 'B1', 'C1'],
      params: { a: 1, h: 1 }, conditions: [],
    },
    topology: { vertices: 6, edges: 9, faces: 5, euler: 2 },
    formulas: {
      volume:      { text: 'V = Sđáy × h',     latex: 'V = S_{đáy} \\cdot h' },
      lateralArea: { text: 'Sxq = (a+b+c)×h',  latex: 'S_{xq} = (a+b+c)h' },
      surfaceArea: { text: 'Stp = 2Sđáy + Sxq', latex: 'S_{tp} = 2S_{đáy} + S_{xq}' },
    },
    experiment: {
      type: 'triangular_prism_volume', shapeName: 'Lăng trụ tam giác',
      finalFormula: 'V = Sđáy × h', finalFormulaLatex: 'V = S_{đáy} \\times h',
      frames: [
        { time: 0.0, narration: 'Lăng trụ tam giác có 2 đáy tam giác bằng nhau.', waterLevel: 0 },
        { time: 0.2, narration: 'Diện tích đáy Sđáy = (1/2)×đáy×chiều cao tam giác.', waterLevel: 0, showFormula: 'S_{đáy} = \\frac{1}{2}ah_{\\triangle}' },
        { time: 0.7, narration: 'Mỗi lớp nước có diện tích Sđáy.', waterLevel: 1, showFormula: 'V = S_{đáy} \\times h' },
        { time: 1.0, narration: 'Vậy V = Sđáy × h.', waterLevel: 1, showFormula: 'V = S_{đáy} \\times h' },
      ],
    },
    miniExperimentSteps: [
      { label: 'Lớp 1', fillLevel: 0.33 },
      { label: 'Lớp 2', fillLevel: 0.66 },
      { label: 'Đầy',   fillLevel: 1.0, formula: 'V = S_{đáy} \\times h' },
    ],
  },

  square_pyramid: {
    nameVi: 'Hình chóp tứ giác đều', type: 'polyhedron', level: 'cap3',
    parserKeywords: ['hình chóp tứ giác', 'hình chóp s.abcd', 'chóp tứ giác đều', 'hình chóp vuông'],
    fallbackSpec: {
      shape: 'square_pyramid', baseShape: 'square', apex: 'S',
      vertices: ['A', 'B', 'C', 'D', 'S'],
      params: { a: 1, h: 1 }, conditions: [],
    },
    topology: { vertices: 5, edges: 8, faces: 5, euler: 2 },
    formulas: {
      volume:      { text: 'V = (1/3)a²h',  latex: 'V = \\dfrac{1}{3}a^2 h' },
      lateralArea: { text: 'Sxq = 2am',      latex: 'S_{xq} = 2am' },
      surfaceArea: { text: 'Stp = a² + 2am', latex: 'S_{tp} = a^2 + 2am' },
    },
    experiment: {
      type: 'pyramid_volume', shapeName: 'Hình chóp tứ giác',
      finalFormula: 'V = (1/3)a²h', finalFormulaLatex: 'V = \\frac{1}{3}a^2 h',
      frames: [
        { time: 0.0,  narration: 'Chuẩn bị hình chóp và hình hộp cùng đáy, cùng chiều cao.', waterLevel: 0 },
        { time: 0.25, narration: 'Cát từ 1 chóp chiếm 1/3 hình hộp.', waterLevel: 0.333, pourCount: 1, showFormula: '\\frac{1}{3}V_{hộp}' },
        { time: 0.55, narration: 'Cát từ 2 chóp chiếm 2/3 hình hộp.', waterLevel: 0.667, pourCount: 2, showFormula: '\\frac{2}{3}V_{hộp}' },
        { time: 0.85, narration: '3 lần đổ vừa đúng đầy hình hộp! V_chóp = (1/3)V_hộp.', waterLevel: 1, pourCount: 3, showFormula: 'V = \\frac{1}{3}a^2 h' },
        { time: 1.0,  narration: 'Vậy V = (1/3)a²h.', waterLevel: 1, pourCount: 3, showFormula: 'V = \\frac{1}{3}a^2 h' },
      ],
    },
    miniExperimentSteps: [
      { label: 'Đổ lần 1', fillLevel: 0.333, formula: '\\frac{1}{3}' },
      { label: 'Đổ lần 2', fillLevel: 0.667, formula: '\\frac{2}{3}' },
      { label: 'Đổ lần 3', fillLevel: 1.0,   formula: 'V = \\frac{1}{3}a^2 h' },
    ],
  },

  triangular_pyramid: {
    nameVi: 'Hình chóp tam giác', type: 'polyhedron', level: 'cap3',
    parserKeywords: ['hình chóp tam giác', 's.abc', 'chóp tam giác', 'triangular pyramid'],
    fallbackSpec: {
      shape: 'triangular_pyramid', baseShape: 'triangle', apex: 'S',
      vertices: ['A', 'B', 'C', 'S'],
      params: { a: 1, h: 1 }, conditions: [],
    },
    topology: { vertices: 4, edges: 6, faces: 4, euler: 2 },
    formulas: {
      volume: { text: 'V = (1/3)Sđáy×h', latex: 'V = \\dfrac{1}{3}S_{đáy} \\cdot h' },
    },
    experiment: {
      type: 'pyramid_volume', shapeName: 'Hình chóp tam giác',
      finalFormula: 'V = (1/3)Sđáy×h', finalFormulaLatex: 'V = \\frac{1}{3}S_{đáy} \\times h',
      frames: [
        { time: 0.0,  narration: 'Chuẩn bị hình chóp tam giác và lăng trụ cùng đáy, cùng chiều cao.', waterLevel: 0 },
        { time: 0.25, narration: 'Chiếm 1/3 lăng trụ.', waterLevel: 0.333, pourCount: 1, showFormula: '\\frac{1}{3}V_{lăng trụ}' },
        { time: 0.55, narration: 'Lần 2: 2/3 lăng trụ.', waterLevel: 0.667, pourCount: 2, showFormula: '\\frac{2}{3}V_{lăng trụ}' },
        { time: 0.85, narration: 'Lần 3: vừa đầy! V_chóp = (1/3)V_lăng trụ.', waterLevel: 1, pourCount: 3, showFormula: 'V = \\frac{1}{3}S_{đáy}h' },
        { time: 1.0,  narration: 'Vậy V = (1/3)×Sđáy×h.', waterLevel: 1, pourCount: 3, showFormula: 'V = \\frac{1}{3}S_{đáy}h' },
      ],
    },
    miniExperimentSteps: [
      { label: 'Đổ lần 1', fillLevel: 0.333 },
      { label: 'Đổ lần 2', fillLevel: 0.667 },
      { label: 'Đổ lần 3', fillLevel: 1.0, formula: 'V = \\frac{1}{3}S_{đáy}h' },
    ],
  },

  tetrahedron: {
    nameVi: 'Tứ diện đều', type: 'polyhedron', level: 'cap3',
    parserKeywords: ['tứ diện đều', 'tứ diện', 'tetrahedron'],
    fallbackSpec: { shape: 'tetrahedron', vertices: ['A', 'B', 'C', 'D'], params: { a: 1 }, conditions: [] },
    topology: { vertices: 4, edges: 6, faces: 4, euler: 2 },
    formulas: {
      volume:      { text: 'V = a³/(6√2)',   latex: 'V = \\dfrac{a^3}{6\\sqrt{2}}' },
      surfaceArea: { text: 'Stp = a²√3',     latex: 'S_{tp} = a^2\\sqrt{3}' },
    },
    experiment: {
      type: 'pyramid_volume', shapeName: 'Tứ diện đều',
      finalFormula: 'V = a³/(6√2)', finalFormulaLatex: 'V = \\frac{a^3}{6\\sqrt{2}}',
      frames: [
        { time: 0.0,  narration: 'Tứ diện đều là hình chóp tam giác đặc biệt: mọi cạnh bằng a.', waterLevel: 0 },
        { time: 0.2,  narration: 'Đáy ABC tam giác đều: Sđáy = (√3/4)a².', waterLevel: 0, showFormula: 'S_{đáy} = \\frac{\\sqrt{3}}{4}a^2' },
        { time: 0.5,  narration: 'Chiều cao h = a×√(2/3).', waterLevel: 0.5, showFormula: 'h = a\\sqrt{\\frac{2}{3}}' },
        { time: 1.0,  narration: 'Rút gọn: V = a³/(6√2).', waterLevel: 1, showFormula: 'V = \\frac{a^3}{6\\sqrt{2}}' },
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
    fallbackSpec: {
      shape: 'general_pyramid', baseShape: 'square', apex: 'S',
      vertices: ['A', 'B', 'C', 'D', 'S'],
      params: { a: 1, h: 1 }, conditions: [],
    },
    topology: { vertices: 5, edges: 8, faces: 5, euler: 2 },
    formulas: {
      volume: { text: 'V = (1/3)Sđáy×h', latex: 'V = \\dfrac{1}{3}S_{đáy} \\times h' },
    },
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
    formulas: {
      volume: { text: 'x²/a² + y²/b² − z²/c² = 1', latex: '\\dfrac{x^2}{a^2} + \\dfrac{y^2}{b^2} - \\dfrac{z^2}{c^2} = 1' },
    },
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
      { label: 'Mặt đầy đủ',   fillLevel: 1.0, formula: '\\frac{x^2}{a^2}+\\frac{y^2}{b^2}-\\frac{z^2}{c^2}=1' },
    ],
  },

  paraboloid: {
    nameVi: 'Mặt paraboloid elliptic', type: 'curved', level: 'cap3',
    parserKeywords: ['paraboloid', 'mặt paraboloid', 'paraboloid elliptic'],
    fallbackSpec: { shape: 'paraboloid', vertices: ['O'], params: { a: 2, h: 3 }, conditions: [] },
    topology: { vertices: 0, edges: 0, faces: 1, euler: null },
    formulas: {
      volume: { text: 'z = x²/a² + y²/b²', latex: 'z = \\dfrac{x^2}{a^2} + \\dfrac{y^2}{b^2}' },
    },
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
      { label: 'Đỉnh z=0',  fillLevel: 0.3, formula: 'z=0' },
      { label: 'Mặt đầy đủ', fillLevel: 1.0, formula: 'z=\\frac{x^2}{a^2}+\\frac{y^2}{b^2}' },
    ],
  },
}

// ── EXAMPLES (unchanged) ─────────────────────────────────────────────────────
const EXAMPLES = [
  { id: 'triangular-pyramid-sabc', shapeKey: 'triangular_pyramid', title: 'Hình chóp tam giác đều S.ABC', description: 'Đáy ABC tam giác đều cạnh 4 cm, SA ⊥ đáy, SA = 3 cm', level: 'basic', prompt: 'Cho hình chóp S.ABC có đáy ABC là tam giác đều cạnh 4 cm. SA vuông góc với mặt phẳng đáy (ABC). SA = 3 cm.' },
  { id: 'square-pyramid-sabcd', shapeKey: 'square_pyramid', title: 'Hình chóp tứ giác đều S.ABCD', description: 'Đáy ABCD hình vuông cạnh 4 cm, SA ⊥ đáy, SA = 4 cm', level: 'basic', prompt: 'Cho hình chóp tứ giác đều S.ABCD có đáy ABCD là hình vuông cạnh 4 cm. SA vuông góc với mặt phẳng đáy (ABCD). SA = 4 cm.' },
  { id: 'triangular-prism-abcabc', shapeKey: 'triangular_prism', title: "Lăng trụ đứng tam giác ABC.A'B'C'", description: "Đáy ABC vuông tại A: AB = 3 cm, AC = 4 cm, AA' = 5 cm", level: 'basic', prompt: "Cho lăng trụ đứng tam giác ABC.A'B'C'. Đáy là tam giác vuông tại A, AB = 3 cm, AC = 4 cm. Chiều cao lăng trụ AA' = 5 cm." },
  { id: 'rectangular-prism-abcdabcd', shapeKey: 'rectangular_prism', title: "Hình hộp chữ nhật ABCD.A'B'C'D'", description: "AB = 4 cm, AD = 3 cm, AA' = 5 cm", level: 'basic', prompt: "Cho hình hộp chữ nhật ABCD.A'B'C'D'. Kích thước: AB = 4 cm, AD = 3 cm, AA' = 5 cm." },
  { id: 'tetrahedron-regular', shapeKey: 'tetrahedron', title: 'Tứ diện đều ABCD', description: 'Tứ diện đều cạnh 4 cm', level: 'basic', prompt: 'Cho tứ diện đều ABCD. Tất cả các cạnh bằng nhau và bằng 4 cm.' },
  { id: 'cube-abcdefgh', shapeKey: 'cube', title: "Hình lập phương ABCD.A'B'C'D'", description: 'Hình lập phương cạnh 4 cm', level: 'basic', prompt: "Cho hình lập phương ABCD.A'B'C'D' có cạnh bằng 4 cm." },
  { id: 'pyramid-midpoints', shapeKey: 'square_pyramid', title: 'Hình chóp S.ABCD — Điểm trên cạnh', description: 'M, N, P lần lượt là trung điểm SA, SB, SC', level: 'intermediate', prompt: 'Cho hình chóp S.ABCD có đáy ABCD là hình vuông cạnh 4 cm. SA vuông góc với mặt phẳng đáy, SA = 4 cm. M là trung điểm của SA, N là trung điểm của SB, P là trung điểm của SC.' },
  { id: 'cylinder-standard', shapeKey: 'cylinder', title: 'Hình trụ tròn xoay', description: 'Bán kính đáy r = 3 cm, chiều cao h = 6 cm', level: 'intermediate', prompt: 'Cho hình trụ tròn xoay có bán kính đáy r = 3 cm và chiều cao h = 6 cm.' },
  { id: 'cone-standard', shapeKey: 'cone', title: 'Hình nón tròn xoay', description: 'Bán kính đáy r = 3 cm, chiều cao h = 4 cm', level: 'intermediate', prompt: 'Cho hình nón tròn xoay có đỉnh S, bán kính đáy r = 3 cm, chiều cao h = 4 cm. O là tâm đáy, SO vuông góc với mặt phẳng đáy.' },
  { id: 'sphere-standard', shapeKey: 'sphere', title: 'Hình cầu', description: 'Hình cầu tâm O, bán kính R = 5 cm', level: 'intermediate', prompt: 'Cho hình cầu tâm O, bán kính R = 5 cm.' },
  { id: 'triangular-prism-equilateral', shapeKey: 'triangular_prism', title: "Lăng trụ tam giác đều ABC.A'B'C'", description: "Đáy ABC tam giác đều cạnh 4 cm, chiều cao AA' = 6 cm", level: 'intermediate', prompt: "Cho lăng trụ đứng tam giác đều ABC.A'B'C'. Đáy ABC là tam giác đều cạnh 4 cm. Chiều cao lăng trụ AA' = 6 cm." },
  { id: 'hyperboloid-one-sheet', shapeKey: 'hyperboloid', title: 'Mặt hyperboloid một tầng', description: 'x²/4 + y²/4 − z²/9 = 1', level: 'advanced', prompt: 'Vẽ mặt hyperboloid một tầng trong hệ tọa độ Oxyz với phương trình x²/4 + y²/4 − z²/9 = 1. Đây là mặt bậc hai dạng hyperboloid.' },
  { id: 'paraboloid-elliptic', shapeKey: 'paraboloid', title: 'Mặt paraboloid elliptic', description: 'z = x²/4 + y²/4', level: 'advanced', prompt: 'Vẽ mặt paraboloid elliptic trong hệ tọa độ Oxyz với phương trình z = x²/4 + y²/4. Đây là mặt bậc hai dạng paraboloid.' },
  { id: 'pyramid-isosceles-sabc', shapeKey: 'triangular_pyramid', title: 'Hình chóp cân S.ABC', description: 'SA = SB = SC = 5 cm, đáy ABC đều cạnh 4 cm', level: 'advanced', prompt: 'Cho hình chóp S.ABC có đáy ABC là tam giác đều cạnh 4 cm. SA = SB = SC = 5 cm. Tính chiều cao của hình chóp.' },
]

// ── DEEPSEEK CALL ────────────────────────────────────────────────────────────
async function callDeepSeek(shapeKey, shapeMeta) {
  const levelGuide = LEVEL_CONTEXT[shapeMeta.level] ?? LEVEL_CONTEXT.cap3
  const userPrompt = `${levelGuide}

Tạo nội dung giáo dục cho hình: ${shapeMeta.nameVi} (${shapeKey})

Công thức chính:
${Object.entries(shapeMeta.formulas).map(([k,v]) => `- ${k}: ${v.text}`).join('\n')}

Yêu cầu trả về JSON với đúng cấu trúc sau:
{
  "statsProperties": [
    "đặc điểm 1",
    "đặc điểm 2",
    "đặc điểm 3"
  ],
  "constructionSteps": [
    {"index": 0, "description": "Mô tả ngắn bước 1", "narration": "Giải thích chi tiết bước 1 để đọc to (1-2 câu tiếng Việt tự nhiên)"},
    {"index": 1, "description": "Mô tả ngắn bước 2", "narration": "Giải thích chi tiết bước 2"},
    {"index": 2, "description": "Mô tả ngắn bước 3", "narration": "Giải thích chi tiết bước 3"}
  ],
  "formulaContent": {
    "observationBullets": [
      "Quan sát thực tế 1 (so sánh với vật quen thuộc)",
      "Quan sát thực tế 2",
      "Quan sát thực tế 3",
      "Quan sát thực tế 4"
    ],
    "explorationBullets": [
      "Khám phá toán học 1 (tính toán, đo đạc)",
      "Khám phá toán học 2",
      "Khám phá toán học 3",
      "Khám phá toán học 4"
    ],
    "experimentBullets": [
      "Bước thực nghiệm 1",
      "Bước thực nghiệm 2",
      "Bước thực nghiệm 3",
      "Bước thực nghiệm 4"
    ],
    "discovery": {
      "text": "Phát hiện chính từ thực nghiệm (1-2 câu)",
      "latex": "công_thức_LaTeX_chính"
    },
    "formula": {
      "text": "Giới thiệu công thức (1 câu)",
      "latex": "tất_cả_công_thức_LaTeX_trên_nhiều_dòng_dùng_\\\\\\\\[4pt]"
    },
    "practice": {
      "question": "Bài toán cụ thể với số liệu",
      "steps": [
        "Bước 1: ...",
        "Bước 2: ...",
        "Bước 3: ...",
        "Kết quả: ..."
      ],
      "blanks": ["đáp_án_1", "đáp_án_2"]
    }
  },
  "suggestedQuestions": [
    "Câu hỏi học sinh thường hỏi 1?",
    "Câu hỏi học sinh thường hỏi 2?"
  ],
  "qa": [
    {"q": "Câu hỏi quan trọng 1?", "a": "Câu trả lời rõ ràng, ngắn gọn."},
    {"q": "Câu hỏi quan trọng 2?", "a": "Câu trả lời rõ ràng, ngắn gọn."}
  ]
}

Lưu ý:
- constructionSteps: narration phải tự nhiên, như thầy cô đang nói với học sinh
- Dùng con số thực tế trong practice (ví dụ r=3, h=4)
- LaTeX trong formula.latex dùng \\\\[4pt] để xuống dòng
- Tất cả đáp án trong blanks phải là string`

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
      max_tokens: 3000,
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

// ── TYPESCRIPT SERIALIZER ─────────────────────────────────────────────────────
function serializeValue(val, indent = 0) {
  const pad = '  '.repeat(indent)
  const pad1 = '  '.repeat(indent + 1)

  if (val === null) return 'null'
  if (typeof val === 'boolean') return String(val)
  if (typeof val === 'number') return String(val)
  if (typeof val === 'string') {
    // Escape backticks and backslashes for template literal would be complex; use single quotes
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
      const key = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(k) ? k : `'${k}'`
      return `${pad1}${key}: ${serializeValue(v, indent + 1)}`
    })
    return `{\n${lines.join(',\n')},\n${pad}}`
  }
  return String(val)
}

function buildShapeTs(shapeKey, staticData, aiData) {
  const merged = { ...staticData, ...aiData }
  const commentMap = {
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
  }
  const dashes = '─'.repeat(Math.max(0, 67 - (commentMap[shapeKey] || shapeKey).length))
  const comment = `    // ── ${commentMap[shapeKey] || shapeKey.toUpperCase()} ${dashes}`

  const lines = [comment]
  lines.push(`    ${shapeKey}: ${serializeValue(merged, 2)},`)
  return lines.join('\n')
}

// ── MAIN ─────────────────────────────────────────────────────────────────────
const SHAPE_KEYS = Object.keys(SHAPES_STATIC)

async function main() {
  const results = {}

  for (const shapeKey of SHAPE_KEYS) {
    const staticData = SHAPES_STATIC[shapeKey]
    console.log(`\n[${SHAPE_KEYS.indexOf(shapeKey) + 1}/${SHAPE_KEYS.length}] Calling DeepSeek for: ${staticData.nameVi} (${shapeKey})...`)

    let aiData
    try {
      aiData = await callDeepSeek(shapeKey, staticData)
      console.log(`  ✓ Got response, constructionSteps: ${aiData.constructionSteps?.length ?? 0} steps`)
    } catch (err) {
      console.error(`  ✗ Error: ${err.message}. Using fallback.`)
      aiData = {}
    }

    results[shapeKey] = { static: staticData, ai: aiData }

    // Small delay to avoid rate limiting
    await new Promise(r => setTimeout(r, 500))
  }

  // ── BUILD shapes-data.ts ────────────────────────────────────────────────────
  const shapeBlocks = SHAPE_KEYS.map(key => buildShapeTs(key, results[key].static, results[key].ai))

  const examplesTs = `  examples: ${serializeValue(EXAMPLES, 1)},`

  const output = `import type { ShapesDatabase } from './types'

const shapesDatabase: ShapesDatabase = {
  shapes: {

${shapeBlocks.join('\n\n')}

  },

  // ── EXAMPLES ────────────────────────────────────────────────────────────
${examplesTs}
}

export default shapesDatabase
`

  fs.writeFileSync(OUT_FILE, output, 'utf8')
  console.log(`\n✅ Done! Written to: ${OUT_FILE}`)
}

main().catch(err => {
  console.error('Fatal:', err)
  process.exit(1)
})
