// ── Types for shapes-data.ts ─────────────────────────────────────────────

export interface FormulaSet {
  volume?: { text: string; latex: string }
  lateralArea?: { text: string; latex: string }
  surfaceArea?: { text: string; latex: string }
  area?: { text: string; latex: string }
  perimeter?: { text: string; latex: string }
}

export interface LessonFormula {
  title: string        // e.g. "Thể tích", "Diện tích xung quanh"
  description: string  // short plain-text explanation
  latex: string        // compact KaTeX formula (inline mode, no overflow)
}

export interface LessonObject {
  category: string  // "Đỉnh", "Cạnh đáy", "Cạnh bên", "Mặt", "Yếu tố đặc trưng"
  items: string[]   // specific names + brief role: "A — đỉnh góc đáy dưới trước trái"
}

export interface LessonContent {
  recognition: string[]      // Dấu hiệu nhận biết — bullet list
  objects: LessonObject[]    // Categorized geometric objects with specific labels
  theorems: LessonFormula[]  // Các định lý (level-appropriate)
  formulas: LessonFormula[]  // Các công thức (level-appropriate)
}

export type ShapeType = 'polyhedron' | 'curved' | 'flat'
export type ShapeLevel = 'cap2' | 'cap3'

export interface TopologyData {
  vertices: number
  edges: number
  faces: number
  euler: number | null
}

export interface FallbackSpec {
  shape: string
  vertices: string[]
  apex?: string
  baseShape?: string
  params: Record<string, number>
  conditions: string[]
}

export interface ObjectDescriptions {
  vertices?: Record<string, string>  // "A" → "đỉnh A, góc trước trái mặt đáy"
  edges?:    Record<string, string>  // "SA" → "cạnh bên SA nối đỉnh S với A"
  faces?:    Record<string, string>  // "ABCD" → "mặt đáy ABCD, hình vuông"
}

export interface ShapeData {
  nameVi: string
  type: ShapeType
  level: ShapeLevel
  /** false = hidden from student example library. undefined/true = visible (default). */
  visible?: boolean
  parserKeywords: string[]
  fallbackSpec: FallbackSpec
  topology: TopologyData
  formulas: FormulaSet
  lessonContent?: LessonContent
  objectDescriptions?: ObjectDescriptions
  suggestedQuestions: string[]
}

export interface ExampleDef {
  id: string
  shapeKey: string
  shapeNameVi: string
  title: string
  description: string
  level: 'basic' | 'intermediate' | 'advanced'
  grade: 'lop6' | 'lop7' | 'lop8' | 'lop9'
  prompt: string
  /** Direct params for instant client-side build via GeometryEngine (no API needed) */
  params?: Record<string, number>
  /** Which param keys are explicitly stated in the problem — only these get dimension labels on the figure */
  givenParams?: string[]
}

export interface ShapesDatabase {
  shapes: Record<string, ShapeData>
  examples: ExampleDef[]
}
