import type { GeometrySpec, GeometryModel } from '@/types/geo-ai'
import { vec3 } from '../../types'

export function buildPoint(spec: GeometrySpec): GeometryModel {
  const label = spec.vertices[0] ?? 'A'

  const vertices = {
    [label]: { id: label, position: vec3(0, 0, 0), label },
  }

  return {
    spec,
    vertices,
    edges: [],
    faces: [],
    specialPoints: [],
    measurements: {},
    constructionSteps: [
      {
        index: 0,
        description: `Xác định điểm ${label}`,
        narration: `Điểm ${label} là một vị trí xác định trong không gian, không có kích thước.`,
        highlightVertices: [label],
        visibleVertices: [label],
        visibleEdges: [],
        visibleFaces: [],
      },
    ],
  }
}
