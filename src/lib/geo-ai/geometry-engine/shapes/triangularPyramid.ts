import type { GeometrySpec, GeometryModel, GeometryVertex, GeometryEdge, GeometryFace, ShapeMeasurements, ConstructionStep } from '@/types/geo-ai'
import { vec3, edgeLength, triangleArea } from '../types'
import { buildSpecialPoints } from '../compute/intersections'

export function buildTriangularPyramid(spec: GeometrySpec): GeometryModel {
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

  const vertices: Record<string, GeometryVertex> = {
    [vA]: { id: vA, position: posA, label: vA },
    [vB]: { id: vB, position: posB, label: vB },
    [vC]: { id: vC, position: posC, label: vC },
    [vS]: { id: vS, position: posS, label: vS },
  }

  const edges: GeometryEdge[] = [
    { id: `${vA}${vB}`, from: vA, to: vB, type: 'base',    length: a, paramKey: 'a' },
    { id: `${vB}${vC}`, from: vB, to: vC, type: 'base',    length: a },
    { id: `${vA}${vC}`, from: vA, to: vC, type: 'base',    length: a },
    { id: `${vS}${vA}`, from: vS, to: vA, type: 'lateral', length: edgeLength(posS, posA) },
    { id: `${vS}${vB}`, from: vS, to: vB, type: 'lateral', length: edgeLength(posS, posB) },
    { id: `${vS}${vC}`, from: vS, to: vC, type: 'lateral', length: edgeLength(posS, posC) },
  ]

  const baseArea = triangleArea(posA, posB, posC)
  // Use apothem (inradius) for slant height: a / (2 * sqrt(3))
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

  const constructionSteps: ConstructionStep[] = [
    {
      index: 0,
      description: `Dựng đáy tam giác đều ${vA}${vB}${vC}`,
      narration:   `Dựng tam giác đều ${vA}${vB}${vC} cạnh a làm đáy.`,
      highlightVertices: [vA, vB, vC],
      highlightFaces:    [`${vA}${vB}${vC}`],
      visibleVertices: [vA, vB, vC],
      visibleEdges:    [`${vA}${vB}`, `${vB}${vC}`, `${vA}${vC}`],
      visibleFaces:    [`${vA}${vB}${vC}`],
    },
    {
      index: 1,
      description: `Dựng đỉnh ${vS}`,
      narration:   `Dựng đỉnh ${vS} phía trên tâm đáy.`,
      highlightVertices: [vS],
      visibleVertices: [vA, vB, vC, vS],
      visibleEdges:    [`${vA}${vB}`, `${vB}${vC}`, `${vA}${vC}`],
      visibleFaces:    [`${vA}${vB}${vC}`],
    },
    {
      index: 2,
      description: `Nối các cạnh bên ${vS}${vA}, ${vS}${vB}, ${vS}${vC}`,
      narration:   `Nối đỉnh ${vS} với ba đỉnh của đáy.`,
      highlightEdges: [`${vS}${vA}`, `${vS}${vB}`, `${vS}${vC}`],
      visibleVertices: [vA, vB, vC, vS],
      visibleEdges:    [`${vA}${vB}`, `${vB}${vC}`, `${vA}${vC}`, `${vS}${vA}`, `${vS}${vB}`, `${vS}${vC}`],
      visibleFaces:    [`${vA}${vB}${vC}`, `${vS}${vA}${vB}`, `${vS}${vB}${vC}`, `${vS}${vA}${vC}`],
    },
  ]

  return { spec, vertices, edges, faces, specialPoints, measurements, constructionSteps }
}
