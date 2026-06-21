import type { GeometrySpec, GeometryModel, GeometryVertex, GeometryEdge, GeometryFace, ShapeMeasurements, ConstructionStep } from '@/types/geo-ai'
import { vec3 } from '../types'
import { buildSpecialPoints } from '../compute/intersections'

export function buildRectangularPrism(spec: GeometrySpec): GeometryModel {
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

  const constructionSteps: ConstructionStep[] = [
    {
      index: 0,
      description: `Dựng đáy hình chữ nhật ${vA}${vB}${vC}${vD}`,
      narration:   `Dựng hình chữ nhật ${vA}${vB}${vC}${vD} kích thước a×b làm đáy.`,
      highlightVertices: [vA, vB, vC, vD],
      highlightFaces:    [`${vA}${vB}${vC}${vD}`],
      visibleVertices: [vA, vB, vC, vD],
      visibleEdges: [`${vA}${vB}`, `${vB}${vC}`, `${vC}${vD}`, `${vD}${vA}`],
      visibleFaces: [`${vA}${vB}${vC}${vD}`],
    },
    {
      index: 1,
      description: 'Dựng các cạnh đứng',
      narration:   'Từ mỗi đỉnh đáy, dựng cạnh đứng có độ dài h hướng lên trên.',
      highlightEdges: [`${vA}${vA1}`, `${vB}${vB1}`, `${vC}${vC1}`, `${vD}${vD1}`],
      visibleVertices: [vA, vB, vC, vD, vA1, vB1, vC1, vD1],
      visibleEdges: [
        `${vA}${vB}`, `${vB}${vC}`, `${vC}${vD}`, `${vD}${vA}`,
        `${vA}${vA1}`, `${vB}${vB1}`, `${vC}${vC1}`, `${vD}${vD1}`,
      ],
      visibleFaces: [`${vA}${vB}${vC}${vD}`],
    },
    {
      index: 2,
      description: `Nối mặt trên ${vA1}${vB1}${vC1}${vD1}`,
      narration:   `Nối các đỉnh trên thành mặt hình chữ nhật ${vA1}${vB1}${vC1}${vD1}.`,
      highlightVertices: [vA1, vB1, vC1, vD1],
      highlightFaces:    [`${vA1}${vB1}${vC1}${vD1}`],
      visibleVertices: [vA, vB, vC, vD, vA1, vB1, vC1, vD1],
      visibleEdges: [
        `${vA}${vB}`, `${vB}${vC}`, `${vC}${vD}`, `${vD}${vA}`,
        `${vA1}${vB1}`, `${vB1}${vC1}`, `${vC1}${vD1}`, `${vD1}${vA1}`,
        `${vA}${vA1}`, `${vB}${vB1}`, `${vC}${vC1}`, `${vD}${vD1}`,
      ],
      visibleFaces: [
        `${vA}${vB}${vC}${vD}`,
        `${vA1}${vB1}${vC1}${vD1}`,
        `${vA}${vB}${vB1}${vA1}`,
        `${vB}${vC}${vC1}${vB1}`,
        `${vC}${vD}${vD1}${vC1}`,
        `${vD}${vA}${vA1}${vD1}`,
      ],
    },
  ]

  return { spec, vertices, edges, faces, specialPoints, measurements, constructionSteps }
}
