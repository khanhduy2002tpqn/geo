// src/db/shapeRecord.ts
// Domain representation of a fully-assembled library shape (metadata + teaching
// content + real geometry coords) plus converters to/from GeometryModel and the
// legacy ShapeData shape. Reused by the repository, seed script, admin, and the
// runtime shapes store.

import type {
  ExampleDef,
  FallbackSpec,
  FormulaSet,
  LessonContent,
  ObjectDescriptions,
  ShapeData,
  ShapeLevel,
  ShapeType,
  TopologyData,
} from '@/lib/geo-ai/data/types'
import type {
  ConstructionStep,
  GeometryEdge,
  GeometryFace,
  GeometryModel,
  GeometrySpec,
  GeometryVertex,
  ShapeMeasurements,
  SpecialPoint,
} from '@/types/geo-ai'

/** Fully-assembled library shape — one per `shapeKey`. */
export interface ShapeRecord {
  shapeKey: string
  nameVi: string
  type: ShapeType
  level: ShapeLevel
  /** false = hidden from student example library. undefined/true = visible. */
  visible?: boolean
  topology: TopologyData

  // Non-coordinate nested content (stored as JSON columns)
  fallbackSpec: FallbackSpec
  formulas: FormulaSet
  lessonContent?: LessonContent
  objectDescriptions?: ObjectDescriptions
  suggestedQuestions: string[]

  // List-like related content
  parserKeywords: string[]
  examples: ExampleDef[]

  // Coordinate-bearing geometry (editable row tables)
  vertices: GeometryVertex[]
  edges: GeometryEdge[]
  faces: GeometryFace[]
  specialPoints: SpecialPoint[]
  measurements: ShapeMeasurements

  // GeometryModel-level extras
  modelConstructionSteps: ConstructionStep[] // animation steps
  surfaceType?: GeometryModel['surfaceType']
}

/** Lightweight list entry for pickers / admin table. */
export interface ShapeSummary {
  shapeKey: string
  nameVi: string
  type: ShapeType
  level: ShapeLevel
  visible?: boolean
}

/** Build a GeometrySpec from a stored FallbackSpec (canonical library spec). */
export function specFromFallback(fallback: FallbackSpec): GeometrySpec {
  return {
    shape: fallback.shape as GeometrySpec['shape'],
    baseShape: fallback.baseShape as GeometrySpec['baseShape'],
    vertices: fallback.vertices ?? [],
    apex: fallback.apex,
    params: (fallback.params ?? {}) as GeometrySpec['params'],
    conditions: fallback.conditions ?? [],
  }
}

/** Compose a ShapeRecord from a ShapeData entry + freshly built GeometryModel. */
export function recordFromModel(
  shapeKey: string,
  shape: ShapeData,
  model: GeometryModel,
  examples: ExampleDef[] = [],
): ShapeRecord {
  return {
    shapeKey,
    nameVi: shape.nameVi,
    type: shape.type,
    level: shape.level,
    visible: shape.visible,
    topology: shape.topology,
    fallbackSpec: shape.fallbackSpec,
    formulas: shape.formulas,
    lessonContent: shape.lessonContent,
    objectDescriptions: shape.objectDescriptions,
    suggestedQuestions: shape.suggestedQuestions ?? [],
    parserKeywords: shape.parserKeywords ?? [],
    examples,
    vertices: Object.values(model.vertices),
    edges: model.edges,
    faces: model.faces,
    specialPoints: model.specialPoints,
    measurements: model.measurements,
    modelConstructionSteps: model.constructionSteps,
    surfaceType: model.surfaceType,
  }
}

/** Reconstruct a GeometryModel (what the 3D viewer consumes) from a record. */
export function modelFromRecord(record: ShapeRecord): GeometryModel {
  const vertices: Record<string, GeometryVertex> = {}
  for (const v of record.vertices) vertices[v.id] = v

  return {
    spec: specFromFallback(record.fallbackSpec),
    vertices,
    edges: record.edges,
    faces: record.faces,
    specialPoints: record.specialPoints,
    measurements: record.measurements,
    constructionSteps: record.modelConstructionSteps,
    surfaceType: record.surfaceType,
  }
}

/** Project a record back to the legacy ShapeData shape (for accessor compat). */
export function shapeDataFromRecord(record: ShapeRecord): ShapeData {
  return {
    nameVi: record.nameVi,
    type: record.type,
    level: record.level,
    visible: record.visible,
    parserKeywords: record.parserKeywords,
    fallbackSpec: record.fallbackSpec,
    topology: record.topology,
    formulas: record.formulas,
    lessonContent: record.lessonContent,
    objectDescriptions: record.objectDescriptions,
    suggestedQuestions: record.suggestedQuestions,
  }
}

/** Flatten measurements object → row-friendly entries (numeric values only). */
export function measurementEntries(
  measurements: ShapeMeasurements,
): Array<{ metricKey: string; value: number }> {
  const out: Array<{ metricKey: string; value: number }> = []
  for (const [metricKey, value] of Object.entries(measurements)) {
    if (typeof value === 'number' && Number.isFinite(value)) {
      out.push({ metricKey, value })
    }
  }
  return out
}

/** Rebuild a measurements object from row entries. */
export function measurementsFromEntries(
  entries: Array<{ metricKey: string; value: number }>,
): ShapeMeasurements {
  const out: ShapeMeasurements = {}
  for (const { metricKey, value } of entries) out[metricKey] = value
  return out
}
