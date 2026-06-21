import type { GeometrySpec, GeometryModel, GeometryVertex, GeometryEdge, GeometryFace } from '@/types/geo-ai'
import { vec3 } from '../../types'

export function buildRectangle(spec: GeometrySpec): GeometryModel {
  const a = spec.params.a ?? 4  // width
  const b = spec.shape === 'square' ? a : (spec.params.b ?? 3)  // height

  const labels = spec.vertices.length >= 4 ? spec.vertices : ['A', 'B', 'C', 'D']
  const [vA, vB, vC, vD] = labels as [string, string, string, string]

  const posA = vec3(0, 0, 0)
  const posB = vec3(a, 0, 0)
  const posC = vec3(a, 0, b)
  const posD = vec3(0, 0, b)

  const vertices: Record<string, GeometryVertex> = {
    [vA]: { id: vA, position: posA, label: vA },
    [vB]: { id: vB, position: posB, label: vB },
    [vC]: { id: vC, position: posC, label: vC },
    [vD]: { id: vD, position: posD, label: vD },
  }

  const edges: GeometryEdge[] = [
    { id: `${vA}${vB}`, from: vA, to: vB, type: 'base', length: a },
    { id: `${vB}${vC}`, from: vB, to: vC, type: 'base', length: b },
    { id: `${vC}${vD}`, from: vC, to: vD, type: 'base', length: a },
    { id: `${vD}${vA}`, from: vD, to: vA, type: 'base', length: b },
  ]

  const area = a * b
  const perimeter = 2 * (a + b)

  const faces: GeometryFace[] = [
    {
      id: `${vA}${vB}${vC}${vD}`,
      vertices: [vA, vB, vC, vD],
      type: 'base',
      area,
      normal: vec3(0, 1, 0),
    },
  ]

  const isSquare = spec.shape === 'square'
  const shapeName = isSquare ? 'hình vuông' : 'hình chữ nhật'

  return {
    spec,
    vertices,
    edges,
    faces,
    specialPoints: [],
    measurements: { area, perimeter },
    constructionSteps: [
      {
        index: 0,
        description: `Vẽ cạnh đáy ${vA}${vB}`,
        narration: `Vẽ cạnh ${vA}${vB} = ${a} đơn vị.`,
        highlightVertices: [vA, vB],
        highlightEdges: [`${vA}${vB}`],
        visibleVertices: [vA, vB],
        visibleEdges: [`${vA}${vB}`],
        visibleFaces: [],
      },
      {
        index: 1,
        description: `Vẽ hai cạnh bên ${vA}${vD} và ${vB}${vC}`,
        narration: isSquare
          ? `Dựng hai cạnh vuông góc với ${vA}${vB} có độ dài bằng cạnh đáy ${a}.`
          : `Dựng hai cạnh ${vA}${vD} và ${vB}${vC} vuông góc với đáy, chiều cao = ${b}.`,
        highlightEdges: [`${vA}${vD}`, `${vB}${vC}`],
        visibleVertices: [vA, vB, vC, vD],
        visibleEdges: [`${vA}${vB}`, `${vA}${vD}`, `${vB}${vC}`],
        visibleFaces: [],
      },
      {
        index: 2,
        description: `Hoàn thiện ${shapeName} ${vA}${vB}${vC}${vD}`,
        narration: `Nối ${vD}${vC} để hoàn thành ${shapeName}. Diện tích S = ${a} × ${b} = ${area}, chu vi = ${perimeter}.`,
        highlightFaces: [`${vA}${vB}${vC}${vD}`],
        visibleVertices: [vA, vB, vC, vD],
        visibleEdges: [`${vA}${vB}`, `${vB}${vC}`, `${vC}${vD}`, `${vD}${vA}`],
        visibleFaces: [`${vA}${vB}${vC}${vD}`],
      },
    ],
  }
}
