import type { GeometrySpec, GeometryModel, GeometryEdge } from '@/types/geo-ai'
import { vec3 } from '../../types'

export function buildCircle(spec: GeometrySpec): GeometryModel {
  const r = spec.params.r ?? 3
  const isSector = spec.shape === 'sector'
  const angleDeg = spec.params.a2 ?? 90  // sector angle in degrees

  const vO = spec.vertices[0] ?? 'O'

  const vertices: Record<string, import('@/types/geo-ai').GeometryVertex> = {
    [vO]: { id: vO, position: vec3(0, 0, 0), label: vO },
  }

  const edges: GeometryEdge[] = []

  // For sector: add two radius edges to show the sector boundaries
  if (isSector) {
    const vA = 'A'
    const vB = 'B'
    const rad1 = 0
    const rad2 = (angleDeg * Math.PI) / 180
    vertices[vA] = { id: vA, position: vec3(r, 0, 0), label: vA }
    vertices[vB] = { id: vB, position: vec3(r * Math.cos(rad2), 0, r * Math.sin(rad2)), label: vB }
    edges.push(
      { id: `${vO}${vA}`, from: vO, to: vA, type: 'base',    length: r, paramKey: 'r' },
      { id: `${vO}${vB}`, from: vO, to: vB, type: 'lateral', length: r },
    )
  }

  const area = isSector
    ? (Math.PI * r * r * angleDeg) / 360
    : Math.PI * r * r

  const perimeter = isSector
    ? 2 * r + (2 * Math.PI * r * angleDeg) / 360
    : 2 * Math.PI * r

  return {
    spec,
    vertices,
    edges,
    faces: [],
    specialPoints: [],
    measurements: {
      area,
      perimeter,
      // Store radius for renderer to use
      ...(r !== undefined ? { height: r } : {}),
    },
    constructionSteps: isSector
      ? [
          {
            index: 0,
            description: `Xác định tâm ${vO} và bán kính r = ${r}`,
            narration: `Xác định tâm O và bán kính r = ${r} đơn vị.`,
            highlightVertices: [vO],
            visibleVertices: [vO], visibleEdges: [], visibleFaces: [],
          },
          {
            index: 1,
            description: `Vẽ hai bán kính tạo góc ${angleDeg}°`,
            narration: `Vẽ hai bán kính OA và OB tạo với nhau một góc ${angleDeg}°.`,
            highlightEdges: [`${vO}A`, `${vO}B`],
            visibleVertices: [vO, 'A', 'B'],
            visibleEdges: [`${vO}A`, `${vO}B`],
            visibleFaces: [],
          },
          {
            index: 2,
            description: `Vẽ cung tròn — hoàn thành hình quạt`,
            narration: `Vẽ cung tròn từ A đến B để hoàn thành hình quạt tròn. Diện tích = (${angleDeg}/360) × πr² = ${area.toFixed(2)}.`,
            visibleVertices: [vO, 'A', 'B'],
            visibleEdges: [`${vO}A`, `${vO}B`],
            visibleFaces: [],
          },
        ]
      : [
          {
            index: 0,
            description: `Xác định tâm ${vO}`,
            narration: `Xác định tâm O của đường tròn.`,
            highlightVertices: [vO],
            visibleVertices: [vO], visibleEdges: [], visibleFaces: [],
          },
          {
            index: 1,
            description: `Vẽ đường tròn bán kính r = ${r}`,
            narration: `Vẽ đường tròn tâm O bán kính r = ${r}. Đường tròn là tập hợp tất cả các điểm cách O một khoảng r.`,
            visibleVertices: [vO], visibleEdges: [], visibleFaces: [],
          },
          {
            index: 2,
            description: `Chu vi và diện tích`,
            narration: `Chu vi C = 2πr = ${perimeter.toFixed(2)}. Diện tích S = πr² = ${area.toFixed(2)}.`,
            visibleVertices: [vO], visibleEdges: [], visibleFaces: [],
          },
        ],
  }
}
