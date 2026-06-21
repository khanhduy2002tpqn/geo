import type { GeometrySpec, GeometryModel, GeometryEdge, SpecialPoint } from '@/types/geo-ai'
import { vec3 } from '../../types'

export function buildSegment(spec: GeometrySpec): GeometryModel {
  const a = spec.params.a ?? 3
  const labels = spec.vertices.length >= 2 ? spec.vertices : ['A', 'B']
  const [vA, vB] = labels as [string, string]

  const posA = vec3(0, 0, 0)
  const posB = vec3(a, 0, 0)

  const vertices = {
    [vA]: { id: vA, position: posA, label: vA },
    [vB]: { id: vB, position: posB, label: vB },
  }

  const edges: GeometryEdge[] = [
    { id: `${vA}${vB}`, from: vA, to: vB, type: 'base', length: a },
  ]

  const specialPoints: SpecialPoint[] = []

  // For perpendicular_bisector: add midpoint M and perpendicular line
  if (spec.shape === 'perpendicular_bisector') {
    const vM = 'M'
    const midX = a / 2
    vertices[vM] = { id: vM, position: vec3(midX, 0, 0), label: vM }
    // Perpendicular bisector shown as a special edge through midpoint
    const vP1 = 'P'
    const vP2 = 'Q'
    const bisLen = a * 0.7
    vertices[vP1] = { id: vP1, position: vec3(midX, 0, -bisLen), label: '' }
    vertices[vP2] = { id: vP2, position: vec3(midX, 0,  bisLen), label: '' }
    edges.push({ id: `${vP1}${vP2}`, from: vP1, to: vP2, type: 'special', length: bisLen * 2 })
    specialPoints.push({
      id: vM,
      position: vec3(midX, 0, 0),
      label: vM,
      description: `Trung điểm ${vM} của đoạn ${vA}${vB}`,
      onEdge: `${vA}${vB}`,
    })
  }

  return {
    spec,
    vertices,
    edges,
    faces: [],
    specialPoints,
    measurements: { perimeter: a },
    constructionSteps: [
      {
        index: 0,
        description: `Xác định điểm ${vA}`,
        narration: `Xác định điểm đầu ${vA} của đoạn thẳng.`,
        highlightVertices: [vA],
        visibleVertices: [vA],
        visibleEdges: [],
        visibleFaces: [],
      },
      {
        index: 1,
        description: `Xác định điểm ${vB}`,
        narration: `Xác định điểm cuối ${vB}, cách ${vA} một khoảng bằng ${a}.`,
        highlightVertices: [vB],
        visibleVertices: [vA, vB],
        visibleEdges: [],
        visibleFaces: [],
      },
      {
        index: 2,
        description: `Vẽ đoạn thẳng ${vA}${vB}`,
        narration: `Nối hai điểm ${vA} và ${vB} để tạo thành đoạn thẳng ${vA}${vB} có độ dài ${a}.`,
        highlightEdges: [`${vA}${vB}`],
        visibleVertices: [vA, vB],
        visibleEdges: [`${vA}${vB}`],
        visibleFaces: [],
      },
    ],
  }
}
