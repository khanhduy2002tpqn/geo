import type { GeometrySpec, GeometryModel, GeometryEdge } from '@/types/geo-ai'
import { vec3 } from '../../types'

export function buildAngle(spec: GeometrySpec): GeometryModel {
  // a2 = angle in degrees
  const deg = spec.params.a2 ?? 60
  const armLen = spec.params.a ?? 3
  const rad = (deg * Math.PI) / 180

  const labels = spec.vertices.length >= 3 ? spec.vertices : ['B', 'A', 'C']
  const [vB, vA, vC] = labels as [string, string, string]

  // A is the vertex, B and C are endpoints of the two arms
  const posA = vec3(0, 0, 0)
  const posB = vec3(-armLen, 0, 0)          // first arm along -X
  const posC = vec3(                        // second arm at angle deg from first
    -armLen * Math.cos(rad),
    0,
    armLen * Math.sin(rad)
  )

  const vertices: Record<string, import('@/types/geo-ai').GeometryVertex> = {
    [vA]: { id: vA, position: posA, label: vA },
    [vB]: { id: vB, position: posB, label: vB },
    [vC]: { id: vC, position: posC, label: vC },
  }

  const edges: GeometryEdge[] = [
    { id: `${vA}${vB}`, from: vA, to: vB, type: 'base', length: armLen },
    { id: `${vA}${vC}`, from: vA, to: vC, type: 'base', length: armLen },
  ]

  // angle_bisector: add a ray along the bisector direction
  if (spec.shape === 'angle_bisector') {
    const bisRad = rad / 2
    const vD = 'D'
    const posD = vec3(-armLen * Math.cos(bisRad), 0, armLen * Math.sin(bisRad))
    vertices[vD] = { id: vD, position: posD, label: '' }
    edges.push({ id: `${vA}${vD}`, from: vA, to: vD, type: 'special', length: armLen })
  }

  return {
    spec,
    vertices,
    edges,
    faces: [],
    specialPoints: [],
    measurements: {},
    constructionSteps: [
      {
        index: 0,
        description: `Xác định đỉnh góc ${vA}`,
        narration: `Điểm ${vA} là đỉnh của góc.`,
        highlightVertices: [vA],
        visibleVertices: [vA], visibleEdges: [], visibleFaces: [],
      },
      {
        index: 1,
        description: `Vẽ cạnh ${vA}${vB}`,
        narration: `Vẽ cạnh đầu tiên ${vA}${vB} của góc.`,
        highlightEdges: [`${vA}${vB}`],
        visibleVertices: [vA, vB], visibleEdges: [`${vA}${vB}`], visibleFaces: [],
      },
      {
        index: 2,
        description: `Vẽ cạnh ${vA}${vC} tạo góc ${deg}°`,
        narration: `Vẽ cạnh ${vA}${vC} tạo với ${vA}${vB} một góc ${deg} độ. Góc ${vB}${vA}${vC} = ${deg}°.`,
        highlightEdges: [`${vA}${vC}`],
        visibleVertices: [vA, vB, vC], visibleEdges: [`${vA}${vB}`, `${vA}${vC}`], visibleFaces: [],
      },
    ],
  }
}
