import type { GeometrySpec, GeometryModel, GeometryVertex, GeometryEdge, GeometryFace } from '@/types/geo-ai'
import { vec3 } from '../types'
import { buildSpecialPoints } from '../compute/intersections'

export function buildCone(spec: GeometrySpec): GeometryModel {
  const r = spec.params.r ?? 0.5
  const h = spec.params.h ?? 1

  // Default labels: apex S, base center O
  const apexLabel = spec.apex ?? (spec.vertices.find(v => v === 'S') ?? 'S')
  const baseLabel  = spec.vertices.find(v => v !== apexLabel) ?? 'O'

  const vS = apexLabel
  const vO = baseLabel

  const posO = vec3(0, 0, 0)
  const posS = vec3(0, h, 0)

  const vR = 'R'
  const posR = vec3(r, 0, 0)

  const vertices: Record<string, GeometryVertex> = {
    [vO]: { id: vO, position: posO, label: vO },
    [vS]: { id: vS, position: posS, label: vS },
    [vR]: { id: vR, position: posR, label: '' },
  }

  const slantHeight = Math.sqrt(r * r + h * h)

  // Axis + radius edges — mesh handled by Three.js ConeGeometry
  const edges: GeometryEdge[] = [
    { id: `${vO}${vS}`, from: vO, to: vS, type: 'axis',    length: h, paramKey: 'h' },
    { id: `${vS}r`,     from: vS, to: vR, type: 'lateral', length: slantHeight },
    { id: `${vO}${vR}`, from: vO, to: vR, type: 'radius',  length: r, paramKey: 'r' },
  ]

  const faces: GeometryFace[] = [
    { id: 'base',    vertices: [vO],      type: 'base',    area: Math.PI * r * r },
    { id: 'lateral', vertices: [vO, vS],  type: 'lateral', area: Math.PI * r * slantHeight },
  ]

  const specialPoints = buildSpecialPoints(spec, vertices)

  const measurements = {
    volume: (Math.PI * r * r * h) / 3,
    lateralArea: Math.PI * r * slantHeight,
    baseArea: Math.PI * r * r,
    surfaceArea: Math.PI * r * r + Math.PI * r * slantHeight,
    height: h,
    slantHeight,
    radius: r,
  }

  const constructionSteps = [
    {
      index: 0,
      description: `Dựng đường tròn đáy bán kính r`,
      narration: `Dựng đường tròn đáy tâm ${vO} bán kính r.`,
      highlightVertices: [vO],
      highlightFaces: ['base'],
      visibleVertices: [vO],
      visibleEdges: [],
      visibleFaces: ['base'],
    },
    {
      index: 1,
      description: `Dựng đỉnh ${vS}`,
      narration: `Dựng đỉnh ${vS} phía trên tâm đáy, cách đáy h.`,
      highlightVertices: [vS],
      visibleVertices: [vO, vS],
      visibleEdges: [`${vO}${vS}`],
      visibleFaces: ['base'],
    },
    {
      index: 2,
      description: `Tạo mặt xung quanh`,
      narration: `Nối đỉnh ${vS} với mọi điểm trên đường tròn đáy tạo thành mặt nón.`,
      highlightFaces: ['lateral'],
      visibleVertices: [vO, vS],
      visibleEdges: [`${vO}${vS}`, `${vS}r`],
      visibleFaces: ['base', 'lateral'],
    },
  ]

  return { spec, vertices, edges, faces, specialPoints, measurements, constructionSteps }
}
