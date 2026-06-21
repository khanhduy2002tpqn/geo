import type { GeometrySpec, GeometryModel } from '@/types/geo-ai'
import { buildPyramid } from './shapes/pyramid'
import { buildCube } from './shapes/cube'
import { buildTetrahedron } from './shapes/tetrahedron'
import { buildPrism } from './shapes/prism'
import { buildCylinder } from './shapes/cylinder'
import { buildCone } from './shapes/cone'
import { buildSphere } from './shapes/sphere'
// 2D flat shape builders
import { buildPoint } from './shapes/flat/point'
import { buildSegment } from './shapes/flat/segment'
import { buildLine } from './shapes/flat/line'
import { buildAngle } from './shapes/flat/angle'
import { buildFlatTriangle } from './shapes/flat/triangle'
import { buildRectangle } from './shapes/flat/rectangle'
import { buildParallelogram } from './shapes/flat/parallelogram'
import { buildTrapezoid } from './shapes/flat/trapezoid'
import { buildCircle } from './shapes/flat/circle'

export class GeometryEngine {
  static build(spec: GeometrySpec): GeometryModel {
    return autoFillParamKeys(GeometryEngine.dispatch(spec))
  }

  private static dispatch(spec: GeometrySpec): GeometryModel {
    switch (spec.shape) {
      // ── 3D Solids ──────────────────────────────────────────────────────────
      case 'square_pyramid':
      case 'general_pyramid':
        return buildPyramid(spec)

      case 'triangular_pyramid':
        return buildTriangularPyramid(spec)

      case 'cube':
        return buildCube(spec)

      case 'rectangular_prism':
        return buildRectangularPrism(spec)

      case 'triangular_prism':
        return buildPrism(spec)

      case 'tetrahedron':
        return buildTetrahedron(spec)

      case 'cylinder':
        return buildCylinder(spec)

      case 'cone':
        return buildCone(spec)

      case 'sphere':
        return buildSphere(spec)

      case 'hyperboloid':
      case 'paraboloid':
        return buildCurvedSurface(spec)

      // ── 2D Flat Shapes ─────────────────────────────────────────────────────
      case 'point':
        return buildPoint(spec)

      case 'segment':
      case 'perpendicular_bisector':
        return buildSegment(spec)

      case 'line':
      case 'ray':
      case 'parallel_lines':
      case 'perpendicular_lines':
        return buildLine(spec)

      case 'angle':
      case 'angle_bisector':
        return buildAngle(spec)

      case 'triangle':
      case 'equilateral_triangle':
      case 'isosceles_triangle':
      case 'right_triangle':
      case 'right_isosceles_triangle':
        return buildFlatTriangle(spec)

      case 'rectangle':
      case 'square':
        return buildRectangle(spec)

      case 'parallelogram':
      case 'rhombus':
        return buildParallelogram(spec)

      case 'trapezoid':
      case 'isosceles_trapezoid':
        return buildTrapezoid(spec)

      case 'circle':
      case 'sector':
        return buildCircle(spec)
    }
  }
}

/**
 * Fill in `paramKey` for the planar side dimensions `a` and `b` by matching each
 * to an edge of the same length, when a builder didn't set them explicitly.
 *
 * Engine builders use real coordinates (unlike the scaled GeoData path), so edge
 * lengths equal the param values exactly — a tight 2% tolerance avoids accidental
 * matches. Only fills gaps: params a builder already keyed are left untouched, and
 * `radius`-type reference segments (height/radius) are never used here. `h`, `r`,
 * and angle params are intentionally excluded — those are handled by dedicated
 * reference segments in their builders, not by length matching.
 */
function autoFillParamKeys(model: GeometryModel): GeometryModel {
  const p = model.spec.params
  const targets: Array<['a' | 'b', number]> = []
  if (typeof p.a === 'number' && p.a > 0) targets.push(['a', p.a])
  if (typeof p.b === 'number' && p.b > 0) targets.push(['b', p.b])
  if (targets.length === 0) return model

  const alreadyKeyed = new Set(model.edges.filter((e) => e.paramKey).map((e) => e.paramKey))
  const usedEdgeIds = new Set(model.edges.filter((e) => e.paramKey).map((e) => e.id))
  const assign: Record<string, 'a' | 'b'> = {}

  for (const [key, val] of targets) {
    if (alreadyKeyed.has(key)) continue
    let bestId: string | null = null
    let bestDiff = Infinity
    for (const e of model.edges) {
      if (e.type === 'radius' || usedEdgeIds.has(e.id) || assign[e.id]) continue
      const diff = Math.abs((e.length ?? 0) - val)
      if (diff < bestDiff) {
        bestDiff = diff
        bestId = e.id
      }
    }
    if (bestId && bestDiff <= val * 0.02) assign[bestId] = key
  }

  if (Object.keys(assign).length === 0) return model
  return {
    ...model,
    edges: model.edges.map((e) => (assign[e.id] ? { ...e, paramKey: assign[e.id] } : e)),
  }
}

// Re-export utilities for external consumers
export { computeMeasurements, formulaText } from './compute/measurements'
export { buildSpecialPoints, computeMidpoint } from './compute/intersections'
export { vec3, edgeLength, midpoint, triangleArea } from './types'

// ── Inline builders for shapes that don't warrant a dedicated file ─────────

import { vec3, edgeLength, triangleArea } from './types'
import type { GeometryVertex, GeometryEdge, GeometryFace, ShapeMeasurements, ConstructionStep } from '@/types/geo-ai'
import { buildSpecialPoints } from './compute/intersections'

function buildTriangularPyramid(spec: GeometrySpec): GeometryModel {
  const a = spec.params.a ?? 1
  const h = spec.params.h ?? a

  const labels = spec.vertices.length >= 4 ? spec.vertices : ['A', 'B', 'C', 'S']
  const [vA, vB, vC, vS] = labels as [string, string, string, string]

  // Equilateral triangle base centred at origin on XZ plane
  const r = a / Math.sqrt(3)
  const posA = vec3(0,      0,  r)
  const posB = vec3(-a / 2, 0, -r / 2)
  const posC = vec3(a / 2,  0, -r / 2)
  const posS = vec3(0,      h,  0)

  // Base-centre anchor (foot of height) — hidden node for the dashed height segment
  const vO = 'O'
  const posO = vec3(0, 0, 0)

  const vertices: Record<string, GeometryVertex> = {
    [vA]: { id: vA, position: posA, label: vA },
    [vB]: { id: vB, position: posB, label: vB },
    [vC]: { id: vC, position: posC, label: vC },
    [vS]: { id: vS, position: posS, label: vS },
    [vO]: { id: vO, position: posO, label: '' },
  }

  const edges: GeometryEdge[] = [
    { id: `${vA}${vB}`, from: vA, to: vB, type: 'base',    length: a, paramKey: 'a' },
    { id: `${vB}${vC}`, from: vB, to: vC, type: 'base',    length: a },
    { id: `${vA}${vC}`, from: vA, to: vC, type: 'base',    length: a },
    { id: `${vS}${vA}`, from: vS, to: vA, type: 'lateral', length: edgeLength(posS, posA) },
    { id: `${vS}${vB}`, from: vS, to: vB, type: 'lateral', length: edgeLength(posS, posB) },
    { id: `${vS}${vC}`, from: vS, to: vC, type: 'lateral', length: edgeLength(posS, posC) },
    { id: `${vS}${vO}`, from: vS, to: vO, type: 'radius',  length: h, paramKey: 'h' },
  ]

  const baseArea = triangleArea(posA, posB, posC)
  const slantHeight = Math.sqrt(h * h + (a / (2 * Math.sqrt(3))) ** 2)

  const faces: GeometryFace[] = [
    { id: `${vA}${vB}${vC}`, vertices: [vA, vB, vC], type: 'base',    area: baseArea },
    { id: `${vS}${vA}${vB}`, vertices: [vS, vA, vB], type: 'lateral', area: triangleArea(posS, posA, posB) },
    { id: `${vS}${vB}${vC}`, vertices: [vS, vB, vC], type: 'lateral', area: triangleArea(posS, posB, posC) },
    { id: `${vS}${vA}${vC}`, vertices: [vS, vA, vC], type: 'lateral', area: triangleArea(posS, posA, posC) },
  ]

  const specialPoints = buildSpecialPoints(spec, vertices)

  const measurements: ShapeMeasurements = {
    volume:      (baseArea * h) / 3,
    baseArea,
    lateralArea: triangleArea(posS, posA, posB) + triangleArea(posS, posB, posC) + triangleArea(posS, posA, posC),
    surfaceArea: baseArea + triangleArea(posS, posA, posB) + triangleArea(posS, posB, posC) + triangleArea(posS, posA, posC),
    height:      h,
    slantHeight,
  }

  const baseEdges = [`${vA}${vB}`, `${vB}${vC}`, `${vA}${vC}`]
  const lateralEdges = [`${vS}${vA}`, `${vS}${vB}`, `${vS}${vC}`]
  const baseFace = [`${vA}${vB}${vC}`]
  const lateralFaces = [`${vS}${vA}${vB}`, `${vS}${vB}${vC}`, `${vS}${vA}${vC}`]

  const constructionSteps: ConstructionStep[] = [
    {
      index: 0,
      description: `Dựng đáy tam giác đều ${vA}${vB}${vC}`,
      narration:   `Dựng tam giác đều ${vA}${vB}${vC} cạnh a làm đáy.`,
      highlightVertices: [vA, vB, vC],
      highlightFaces:    baseFace,
      visibleVertices:   [vA, vB, vC],
      visibleEdges:      baseEdges,
      visibleFaces:      baseFace,
    },
    {
      index: 1,
      description: `Dựng đỉnh ${vS}`,
      narration:   `Dựng đỉnh ${vS} phía trên tâm đáy ở chiều cao h.`,
      highlightVertices: [vS],
      visibleVertices:   [vA, vB, vC, vS],
      visibleEdges:      baseEdges,
      visibleFaces:      baseFace,
    },
    {
      index: 2,
      description: `Nối các cạnh bên ${vS}${vA}, ${vS}${vB}, ${vS}${vC}`,
      narration:   `Nối đỉnh ${vS} với ba đỉnh đáy để hoàn thiện hình chóp.`,
      highlightEdges: lateralEdges,
      visibleVertices: [vA, vB, vC, vS],
      visibleEdges:    [...baseEdges, ...lateralEdges],
      visibleFaces:    [...baseFace, ...lateralFaces],
    },
  ]

  return { spec, vertices, edges, faces, specialPoints, measurements, constructionSteps }
}

function buildRectangularPrism(spec: GeometrySpec): GeometryModel {
  const a = spec.params.a ?? 1
  const b = spec.params.b ?? 1
  const h = spec.params.h ?? 1

  const labels = spec.vertices.length >= 8
    ? spec.vertices
    : ['A', 'B', 'C', 'D', 'A1', 'B1', 'C1', 'D1']

  const [vA, vB, vC, vD, vA1, vB1, vC1, vD1] = labels as [
    string, string, string, string, string, string, string, string
  ]

  const positions: Record<string, ReturnType<typeof vec3>> = {
    [vA]:  vec3(0, 0, 0),
    [vB]:  vec3(a, 0, 0),
    [vC]:  vec3(a, 0, b),
    [vD]:  vec3(0, 0, b),
    [vA1]: vec3(0, h, 0),
    [vB1]: vec3(a, h, 0),
    [vC1]: vec3(a, h, b),
    [vD1]: vec3(0, h, b),
  }

  const vertices: Record<string, GeometryVertex> = {}
  for (const [id, position] of Object.entries(positions)) {
    vertices[id] = { id, position, label: id }
  }

  const edges: GeometryEdge[] = [
    { id: `${vA}${vB}`,   from: vA,  to: vB,  type: 'base',    length: a, paramKey: 'a' },
    { id: `${vB}${vC}`,   from: vB,  to: vC,  type: 'base',    length: b, paramKey: 'b' },
    { id: `${vC}${vD}`,   from: vC,  to: vD,  type: 'base',    length: a },
    { id: `${vD}${vA}`,   from: vD,  to: vA,  type: 'base',    length: b },
    { id: `${vA1}${vB1}`, from: vA1, to: vB1, type: 'base',    length: a },
    { id: `${vB1}${vC1}`, from: vB1, to: vC1, type: 'base',    length: b },
    { id: `${vC1}${vD1}`, from: vC1, to: vD1, type: 'base',    length: a },
    { id: `${vD1}${vA1}`, from: vD1, to: vA1, type: 'base',    length: b },
    { id: `${vA}${vA1}`,  from: vA,  to: vA1, type: 'lateral', length: h, paramKey: 'h' },
    { id: `${vB}${vB1}`,  from: vB,  to: vB1, type: 'lateral', length: h },
    { id: `${vC}${vC1}`,  from: vC,  to: vC1, type: 'lateral', length: h },
    { id: `${vD}${vD1}`,  from: vD,  to: vD1, type: 'lateral', length: h },
  ]

  const baseArea = a * b

  const faces: GeometryFace[] = [
    { id: `${vA}${vB}${vC}${vD}`,     vertices: [vA, vB, vC, vD],     type: 'base',    area: baseArea,  normal: vec3(0, -1, 0) },
    { id: `${vA1}${vB1}${vC1}${vD1}`, vertices: [vA1, vB1, vC1, vD1], type: 'top',     area: baseArea,  normal: vec3(0,  1, 0) },
    { id: `${vA}${vB}${vB1}${vA1}`,   vertices: [vA, vB, vB1, vA1],   type: 'lateral', area: a * h },
    { id: `${vB}${vC}${vC1}${vB1}`,   vertices: [vB, vC, vC1, vB1],   type: 'lateral', area: b * h },
    { id: `${vC}${vD}${vD1}${vC1}`,   vertices: [vC, vD, vD1, vC1],   type: 'lateral', area: a * h },
    { id: `${vD}${vA}${vA1}${vD1}`,   vertices: [vD, vA, vA1, vD1],   type: 'lateral', area: b * h },
  ]

  const specialPoints = buildSpecialPoints(spec, vertices)

  const measurements: ShapeMeasurements = {
    volume:      a * b * h,
    baseArea,
    lateralArea: 2 * (a + b) * h,
    surfaceArea: 2 * baseArea + 2 * (a + b) * h,
    height:      h,
  }

  const baseEdgeIds  = [`${vA}${vB}`, `${vB}${vC}`, `${vC}${vD}`, `${vD}${vA}`]
  const topEdgeIds   = [`${vA1}${vB1}`, `${vB1}${vC1}`, `${vC1}${vD1}`, `${vD1}${vA1}`]
  const lateralEdgeIds = [`${vA}${vA1}`, `${vB}${vB1}`, `${vC}${vC1}`, `${vD}${vD1}`]
  const baseFaceId   = `${vA}${vB}${vC}${vD}`
  const topFaceId    = `${vA1}${vB1}${vC1}${vD1}`
  const lateralFaceIds = [`${vA}${vB}${vB1}${vA1}`, `${vB}${vC}${vC1}${vB1}`, `${vC}${vD}${vD1}${vC1}`, `${vD}${vA}${vA1}${vD1}`]

  const constructionSteps: ConstructionStep[] = [
    {
      index: 0,
      description: `Dựng đáy hình chữ nhật ${vA}${vB}${vC}${vD}`,
      narration:   `Dựng hình chữ nhật ${vA}${vB}${vC}${vD} kích thước a×b làm đáy.`,
      highlightVertices: [vA, vB, vC, vD],
      highlightFaces:    [baseFaceId],
      visibleVertices:   [vA, vB, vC, vD],
      visibleEdges:      baseEdgeIds,
      visibleFaces:      [baseFaceId],
    },
    {
      index: 1,
      description: 'Dựng các cạnh đứng',
      narration:   'Từ mỗi đỉnh đáy, dựng cạnh đứng có độ dài h hướng lên trên.',
      highlightEdges: lateralEdgeIds,
      visibleVertices: [vA, vB, vC, vD, vA1, vB1, vC1, vD1],
      visibleEdges:    [...baseEdgeIds, ...lateralEdgeIds],
      visibleFaces:    [baseFaceId],
    },
    {
      index: 2,
      description: `Nối mặt trên ${vA1}${vB1}${vC1}${vD1}`,
      narration:   `Nối các đỉnh trên thành mặt hình chữ nhật ${vA1}${vB1}${vC1}${vD1} để hoàn thiện hình hộp.`,
      highlightVertices: [vA1, vB1, vC1, vD1],
      highlightFaces:    [topFaceId],
      visibleVertices:   [vA, vB, vC, vD, vA1, vB1, vC1, vD1],
      visibleEdges:      [...baseEdgeIds, ...topEdgeIds, ...lateralEdgeIds],
      visibleFaces:      [baseFaceId, topFaceId, ...lateralFaceIds],
    },
  ]

  return { spec, vertices, edges, faces, specialPoints, measurements, constructionSteps }
}

function buildCurvedSurface(spec: GeometrySpec): GeometryModel {
  const r = spec.params.r ?? 1
  const h = spec.params.h ?? 1
  const centerLabel = spec.vertices[0] ?? 'O'

  const vertices: Record<string, GeometryVertex> = {
    [centerLabel]: { id: centerLabel, position: vec3(0, 0, 0), label: centerLabel },
  }

  const measurements: ShapeMeasurements = { radius: r, height: h }

  return {
    spec,
    vertices,
    edges: [],
    faces: [],
    specialPoints: [],
    measurements,
    constructionSteps: [],
  }
}
