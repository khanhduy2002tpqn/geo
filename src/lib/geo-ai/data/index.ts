import type { ShapeData, ExampleDef, FormulaSet } from './types'

export type { ShapeData, ExampleDef, FormulaSet }

// ── Runtime override registry ──────────────────────────────────────────────
// Populated by shapesStore when Turso data loads. All accessors return empty
// defaults until then — no static file fallback.
const runtimeShapes = new Map<string, ShapeData>()
let runtimeExamples: ExampleDef[] | null = null

export function registerShapeData(key: string, data: ShapeData): void {
  runtimeShapes.set(key, data)
}

export function registerExamples(examples: ExampleDef[]): void {
  runtimeExamples = examples
}

export function getShape(key: string): ShapeData | undefined {
  return runtimeShapes.get(key)
}

export function getAllShapes(): Record<string, ShapeData> {
  return Object.fromEntries(runtimeShapes)
}

export function getFormulas(key: string): FormulaSet | undefined {
  return getShape(key)?.formulas
}

export function getExample(id: string): ExampleDef | undefined {
  return getAllExamples().find((e) => e.id === id)
}

export function getAllExamples(): ExampleDef[] {
  return runtimeExamples ?? []
}

export function getExamplesByLevel(level: ExampleDef['level']): ExampleDef[] {
  return getAllExamples().filter((e) => e.level === level)
}

export function getShapeContext(key: string): string {
  const shape = getShape(key)
  if (!shape) return ''
  const f = shape.formulas
  const formulaLines = [
    f.volume      ? `Thể tích: ${f.volume.text}` : null,
    f.lateralArea ? `Diện tích xq: ${f.lateralArea.text}` : null,
    f.surfaceArea ? `Diện tích tp: ${f.surfaceArea.text}` : null,
  ].filter(Boolean).join('; ')

  return [
    `Hình: ${shape.nameVi}`,
    `Loại: ${shape.type === 'polyhedron' ? 'Đa diện' : 'Mặt cong'}`,
    formulaLines ? `Công thức: ${formulaLines}` : null,
    shape.topology.euler !== null
      ? `Cấu trúc: ${shape.topology.vertices} đỉnh, ${shape.topology.edges} cạnh, ${shape.topology.faces} mặt`
      : null,
  ].filter(Boolean).join('\n')
}
