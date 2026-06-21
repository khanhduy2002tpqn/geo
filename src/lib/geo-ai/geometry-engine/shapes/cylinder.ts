import type { GeometrySpec, GeometryModel, GeometryVertex, GeometryEdge, GeometryFace } from '@/types/geo-ai'
import { vec3 } from '../types'
import { buildSpecialPoints } from '../compute/intersections'

export function buildCylinder(spec: GeometrySpec): GeometryModel {
  const r = spec.params.r ?? 0.5
  const h = spec.params.h ?? 1

  const labels = spec.vertices.length >= 2 ? spec.vertices : ['O', 'O1']
  const vO  = labels[0] ?? 'O'
  const vO1 = labels[1] ?? 'O1'

  const posO  = vec3(0, 0, 0)
  const posO1 = vec3(0, h, 0)

  const vR = 'R'
  const posR = vec3(r, 0, 0)

  const vertices: Record<string, GeometryVertex> = {
    [vO]:  { id: vO,  position: posO,  label: vO  },
    [vO1]: { id: vO1, position: posO1, label: vO1 },
    [vR]:  { id: vR,  position: posR,  label: '' },
  }

  // Axis + radius edges — mesh handled by Three.js CylinderGeometry
  const edges: GeometryEdge[] = [
    { id: `${vO}${vO1}`, from: vO,  to: vO1, type: 'axis',   length: h, paramKey: 'h' },
    { id: `${vO}${vR}`,  from: vO,  to: vR,  type: 'radius', length: r, paramKey: 'r' },
  ]

  const faces: GeometryFace[] = [
    { id: 'bottom', vertices: [vO],  type: 'base', area: Math.PI * r * r },
    { id: 'top',    vertices: [vO1], type: 'top',  area: Math.PI * r * r },
    { id: 'lateral', vertices: [vO, vO1], type: 'lateral', area: 2 * Math.PI * r * h },
  ]

  const specialPoints = buildSpecialPoints(spec, vertices)

  const measurements = {
    volume: Math.PI * r * r * h,
    lateralArea: 2 * Math.PI * r * h,
    baseArea: Math.PI * r * r,
    surfaceArea: 2 * Math.PI * r * r + 2 * Math.PI * r * h,
    height: h,
    radius: r,
  }

  const constructionSteps = [
    {
      index: 0,
      description: `Dựng đường tròn đáy bán kính r`,
      narration: `Dựng đường tròn đáy tâm ${vO} bán kính r.`,
      highlightVertices: [vO],
      highlightFaces: ['bottom'],
      visibleVertices: [vO],
      visibleEdges: [],
      visibleFaces: ['bottom'],
    },
    {
      index: 1,
      description: `Dựng đường tròn trên bán kính r`,
      narration: `Dựng đường tròn trên tâm ${vO1} bán kính r song song với đáy, cách đáy h.`,
      highlightVertices: [vO1],
      highlightFaces: ['top'],
      visibleVertices: [vO, vO1],
      visibleEdges: [],
      visibleFaces: ['bottom', 'top'],
    },
    {
      index: 2,
      description: `Nối hai đường tròn bằng mặt xung quanh`,
      narration: `Nối hai đường tròn bằng mặt xung quanh hình trụ.`,
      highlightEdges: [`${vO}${vO1}`],
      highlightFaces: ['lateral'],
      visibleVertices: [vO, vO1],
      visibleEdges: [`${vO}${vO1}`],
      visibleFaces: ['bottom', 'top', 'lateral'],
    },
  ]

  return { spec, vertices, edges, faces, specialPoints, measurements, constructionSteps }
}
