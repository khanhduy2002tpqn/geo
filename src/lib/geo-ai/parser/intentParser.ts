/**
 * Parses raw DeepSeek output into a validated GeometrySpec.
 *
 * DeepSeek is instructed to return only a JSON object, but it may
 * occasionally wrap it in markdown code fences or add a brief preamble.
 * This module handles those edge cases before validating the shape.
 *
 * Also exports parseGeoDataToModel which converts the richer GEO_DATA
 * format (with actual 3D coordinates) into a full GeometryModel.
 */

import type {
  GeometryModel,
  GeometrySpec,
  GeometryVertex,
  GeometryEdge,
  GeometryFace,
  ConstructionStep,
  SpecialPoint,
} from '@/types/geo-ai'

const VALID_SHAPES: ReadonlySet<GeometrySpec['shape']> = new Set([
  // 3D solids
  'square_pyramid',
  'triangular_pyramid',
  'cube',
  'rectangular_prism',
  'triangular_prism',
  'cylinder',
  'cone',
  'tetrahedron',
  'sphere',
  'hyperboloid',
  'paraboloid',
  'general_pyramid',
  // 2D flat shapes
  'point',
  'segment',
  'line',
  'ray',
  'angle',
  'triangle',
  'equilateral_triangle',
  'isosceles_triangle',
  'right_triangle',
  'right_isosceles_triangle',
  'rectangle',
  'square',
  'parallelogram',
  'rhombus',
  'trapezoid',
  'isosceles_trapezoid',
  'parallel_lines',
  'perpendicular_lines',
  'perpendicular_bisector',
  'angle_bisector',
  'circle',
  'sector',
])

const VALID_BASE_SHAPES: ReadonlySet<NonNullable<GeometrySpec['baseShape']>> = new Set([
  'square',
  'rectangle',
  'triangle',
  'hexagon',
  'circle',
])

/** Extract the first JSON object literal from a string. */
function extractJson(raw: string): string | null {
  // Strip markdown code fences
  const stripped = raw.replace(/```(?:json)?\s*/gi, '').replace(/```/g, '').trim()

  const start = stripped.indexOf('{')
  if (start === -1) return null

  let depth = 0
  for (let i = start; i < stripped.length; i++) {
    if (stripped[i] === '{') depth++
    else if (stripped[i] === '}') {
      depth--
      if (depth === 0) return stripped.slice(start, i + 1)
    }
  }
  return null
}

/** Validate and coerce an unknown object into a GeometrySpec, or return null. */
function validateSpec(raw: unknown): GeometrySpec | null {
  if (typeof raw !== 'object' || raw === null) return null

  const obj = raw as Record<string, unknown>

  // shape — required
  if (typeof obj['shape'] !== 'string' || !VALID_SHAPES.has(obj['shape'] as GeometrySpec['shape'])) {
    return null
  }
  const shape = obj['shape'] as GeometrySpec['shape']

  // baseShape — optional
  let baseShape: GeometrySpec['baseShape'] | undefined
  if (obj['baseShape'] != null && obj['baseShape'] !== '') {
    if (
      typeof obj['baseShape'] === 'string' &&
      VALID_BASE_SHAPES.has(obj['baseShape'] as NonNullable<GeometrySpec['baseShape']>)
    ) {
      baseShape = obj['baseShape'] as GeometrySpec['baseShape']
    }
  }

  // vertices — required array of strings
  if (!Array.isArray(obj['vertices'])) return null
  const vertices = (obj['vertices'] as unknown[]).filter(
    (v): v is string => typeof v === 'string'
  )

  // apex — optional string
  const apex =
    typeof obj['apex'] === 'string' && obj['apex'] !== '' ? obj['apex'] : undefined

  // params — object with optional numeric keys
  const rawParams =
    typeof obj['params'] === 'object' && obj['params'] !== null
      ? (obj['params'] as Record<string, unknown>)
      : {}

  const toNum = (v: unknown): number | undefined =>
    typeof v === 'number' && isFinite(v) && v > 0 ? v : undefined

  const params: GeometrySpec['params'] = {
    a: toNum(rawParams['a']) ?? 1,
    b: toNum(rawParams['b']),
    h: toNum(rawParams['h']),
    r: toNum(rawParams['r']),
    unit: typeof rawParams['unit'] === 'string' ? rawParams['unit'] : 'cm',
  }

  // conditions — optional string array
  const conditions: string[] = Array.isArray(obj['conditions'])
    ? (obj['conditions'] as unknown[]).filter((c): c is string => typeof c === 'string')
    : []

  // specialPoints — optional array
  const specialPoints: GeometrySpec['specialPoints'] = Array.isArray(obj['specialPoints'])
    ? (obj['specialPoints'] as unknown[]).flatMap((sp) => {
        if (typeof sp !== 'object' || sp === null) return []
        const s = sp as Record<string, unknown>
        if (typeof s['id'] !== 'string' || typeof s['description'] !== 'string') return []
        return [
          {
            id: s['id'],
            description: s['description'],
            onEdge: typeof s['onEdge'] === 'string' ? s['onEdge'] : undefined,
          },
        ]
      })
    : []

  return {
    shape,
    ...(baseShape !== undefined && { baseShape }),
    vertices,
    ...(apex !== undefined && { apex }),
    params,
    conditions,
    ...(specialPoints.length > 0 && { specialPoints }),
  }
}

/**
 * Parse a raw DeepSeek response string into a GeometrySpec.
 * Returns null if the response cannot be parsed or fails validation.
 */
export function parseIntent(response: string): GeometrySpec | null {
  const jsonStr = extractJson(response)
  if (!jsonStr) return null

  let parsed: unknown
  try {
    parsed = JSON.parse(jsonStr)
  } catch {
    return null
  }

  return validateSpec(parsed)
}

// ---------------------------------------------------------------------------
// GEO_DATA rich format — actual 3D coordinates from the new SYSTEM_PROMPT
// ---------------------------------------------------------------------------

/** Type for the raw GEO_DATA JSON from DeepSeek (new rich format). */
export interface GeoDataRaw {
  shape?: string
  surfaceType?: string
  vertices?: Record<string, { x: number; y: number; z: number }>
  edges?: [string, string][]
  faces?: Array<{ vertices: string[]; type?: string }>
  specialPoints?: Record<string, { x: number; y: number; z: number }>
  params?: Record<string, number | string>
  conditions?: string[]
  steps?: Array<{
    description?: string
    narration?: string
    highlightVertices?: string[]
    highlightEdges?: [string, string][]
  }>
}

/**
 * Assign a `paramKey` to one edge per given dimension so the renderer can show
 * dimension labels (e.g. "5 cm" on edge AB).
 *
 * GeoData coordinates are scaled into [-4,4], so edge lengths are in scaled
 * units while params (a, b, h, r) are real values. We derive the scale factor
 * from `maxEdgeLength / maxParam`, then match each param to the single closest
 * unused edge within tolerance. Returns new edge objects (immutable).
 */
function assignParamKeys(
  edges: GeometryEdge[],
  params: GeometrySpec['params']
): GeometryEdge[] {
  const entries = (['a', 'b', 'h', 'r'] as const)
    .map((k) => [k, params[k]] as const)
    .filter((e): e is ['a' | 'b' | 'h' | 'r', number] => typeof e[1] === 'number' && e[1] > 0)
  if (entries.length === 0 || edges.length === 0) return edges

  const maxParam = Math.max(...entries.map(([, v]) => v))
  const maxLen = Math.max(...edges.map((e) => e.length ?? 0))
  if (maxLen <= 0) return edges
  const scale = maxLen / maxParam // scaled units per real unit

  const assignment: Record<string, string> = {}
  for (const [key, val] of entries) {
    const target = scale * val
    let bestId: string | null = null
    let bestDiff = Infinity
    for (const e of edges) {
      if (assignment[e.id]) continue
      const diff = Math.abs((e.length ?? 0) - target)
      if (diff < bestDiff) {
        bestDiff = diff
        bestId = e.id
      }
    }
    // Accept match only when within 15% of the expected scaled length
    if (bestId && bestDiff <= target * 0.15) assignment[bestId] = key
  }

  return edges.map((e) => (assignment[e.id] ? { ...e, paramKey: assignment[e.id] } : e))
}

/**
 * Convert the new GEO_DATA JSON format (with real 3D coordinates) into a
 * full GeometryModel that the renderer can consume directly.
 */
export function parseGeoDataToModel(raw: GeoDataRaw, _originalPrompt: string): GeometryModel {
  const shape = (raw.shape ?? 'square_pyramid') as GeometrySpec['shape']

  const params: GeometrySpec['params'] = {
    a: typeof raw.params?.a === 'number' ? raw.params.a : undefined,
    b: typeof raw.params?.b === 'number' ? raw.params.b : undefined,
    h: typeof raw.params?.h === 'number' ? raw.params.h : undefined,
    r: typeof raw.params?.r === 'number' ? raw.params.r : undefined,
    unit: typeof raw.params?.unit === 'string' ? raw.params.unit : 'cm',
  }

  const spec: GeometrySpec = {
    shape,
    vertices: Object.keys(raw.vertices ?? {}),
    params,
    conditions: raw.conditions ?? [],
    specialPoints: [],
  }

  // Convert raw vertex positions → GeometryVertex map
  const vertices: Record<string, GeometryVertex> = {}
  for (const [id, pos] of Object.entries(raw.vertices ?? {})) {
    vertices[id] = { id, position: { x: pos.x, y: pos.y, z: pos.z }, label: id }
  }
  // Merge special points into the vertex map so the renderer can reference them
  for (const [id, pos] of Object.entries(raw.specialPoints ?? {})) {
    vertices[id] = { id, position: { x: pos.x, y: pos.y, z: pos.z }, label: id }
  }

  // Convert edges — compute length from coordinates when available
  const rawEdges: GeometryEdge[] = (raw.edges ?? []).map(([from, to]) => {
    const posA = raw.vertices?.[from] ?? raw.specialPoints?.[from]
    const posB = raw.vertices?.[to] ?? raw.specialPoints?.[to]
    let length = 1
    if (posA && posB) {
      length = Math.sqrt(
        (posA.x - posB.x) ** 2 + (posA.y - posB.y) ** 2 + (posA.z - posB.z) ** 2
      )
    }
    return { id: `${from}${to}`, from, to, type: 'lateral' as const, length }
  })

  // Tag edges with paramKey so the renderer can show dimension labels
  const edges = assignParamKeys(rawEdges, params)

  // Convert faces
  const faces: GeometryFace[] = (raw.faces ?? []).map((f) => ({
    id: f.vertices.join(''),
    vertices: f.vertices,
    type: (f.type === 'base' ? 'base' : 'lateral') as 'base' | 'lateral',
    area: 0,
  }))

  // Convert steps → ConstructionStep with cumulative visibility windows
  const constructionSteps: ConstructionStep[] = (raw.steps ?? []).map((s, i) => ({
    index: i,
    description: s.description ?? `Bước ${i + 1}`,
    narration: s.narration ?? s.description ?? `Bước ${i + 1}`,
    highlightVertices: s.highlightVertices ?? [],
    highlightEdges: (s.highlightEdges ?? []).map(([a, b]) => `${a}${b}`),
    visibleVertices: Object.keys(vertices).slice(0, i + 2),
    visibleEdges: edges.slice(0, i * 2 + 2).map((e) => e.id),
    visibleFaces: faces.slice(0, Math.max(0, i - 1)).map((f) => f.id),
  }))

  // Build SpecialPoint array from raw specialPoints map
  const specialPoints: SpecialPoint[] = Object.entries(raw.specialPoints ?? {}).map(([id, pos]) => ({
    id,
    position: { x: pos.x, y: pos.y, z: pos.z },
    label: id,
    description: id,
  }))

  const model: GeometryModel = {
    spec,
    vertices,
    edges,
    faces,
    specialPoints,
    measurements: {},
    constructionSteps,
  }

  if (raw.surfaceType) {
    model.surfaceType = raw.surfaceType as GeometryModel['surfaceType']
  }

  return model
}
