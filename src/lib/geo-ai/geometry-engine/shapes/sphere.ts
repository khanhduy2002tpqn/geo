import type { GeometrySpec, GeometryModel, GeometryVertex, GeometryEdge, GeometryFace } from '@/types/geo-ai'
import { vec3 } from '../types'
import { buildSpecialPoints } from '../compute/intersections'

export function buildSphere(spec: GeometrySpec): GeometryModel {
  const r = spec.params.r ?? 1

  const centerLabel = spec.vertices[0] ?? 'O'
  const vO = centerLabel

  const posO = vec3(0, 0, 0)

  const vR = 'R'
  const posR = vec3(r, 0, 0)

  const vertices: Record<string, GeometryVertex> = {
    [vO]: { id: vO, position: posO, label: vO },
    [vR]: { id: vR, position: posR, label: '' },
  }

  // Radius reference segment (dashed) carrying the `r` dimension label
  const edges: GeometryEdge[] = [
    { id: `${vO}${vR}`, from: vO, to: vR, type: 'radius', length: r, paramKey: 'r' },
  ]

  const faces: GeometryFace[] = [
    { id: 'sphere', vertices: [vO], type: 'lateral', area: 4 * Math.PI * r * r },
  ]

  const specialPoints = buildSpecialPoints(spec, vertices)

  const measurements = {
    volume: (4 / 3) * Math.PI * r ** 3,
    surfaceArea: 4 * Math.PI * r * r,
    radius: r,
  }

  const constructionSteps = [
    {
      index: 0,
      description: `Dựng tâm ${vO}`,
      narration: `Xác định tâm ${vO} của mặt cầu.`,
      highlightVertices: [vO],
      visibleVertices: [vO],
      visibleEdges: [],
      visibleFaces: [],
    },
    {
      index: 1,
      description: `Dựng mặt cầu bán kính r`,
      narration: `Mặt cầu là tập hợp tất cả điểm cách tâm ${vO} một khoảng bằng r.`,
      highlightFaces: ['sphere'],
      visibleVertices: [vO],
      visibleEdges: [],
      visibleFaces: ['sphere'],
    },
  ]

  return { spec, vertices, edges, faces, specialPoints, measurements, constructionSteps }
}
