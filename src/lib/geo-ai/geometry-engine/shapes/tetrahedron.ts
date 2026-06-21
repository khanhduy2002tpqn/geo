import type { GeometrySpec, GeometryModel, GeometryVertex, GeometryEdge, GeometryFace } from '@/types/geo-ai'
import { vec3, edgeLength, triangleArea } from '../types'
import { buildSpecialPoints } from '../compute/intersections'

export function buildTetrahedron(spec: GeometrySpec): GeometryModel {
  const a = spec.params.a ?? 1

  const labels = spec.vertices.length >= 4 ? spec.vertices : ['A', 'B', 'C', 'D']
  const [vA, vB, vC, vD] = labels as [string, string, string, string]

  // Equilateral triangle ABC on XZ plane (Y=0), centred at origin
  const r = a / Math.sqrt(3)           // circumradius of equilateral triangle
  const posA = vec3(0,           0, r)
  const posB = vec3(-a / 2,      0, -r / 2)
  const posC = vec3(a / 2,       0, -r / 2)

  // Apex D above centroid
  const apexH = a * Math.sqrt(2 / 3)
  const posD = vec3(0, apexH, 0)

  const vertices: Record<string, GeometryVertex> = {
    [vA]: { id: vA, position: posA, label: vA },
    [vB]: { id: vB, position: posB, label: vB },
    [vC]: { id: vC, position: posC, label: vC },
    [vD]: { id: vD, position: posD, label: vD },
  }

  const sideLen = edgeLength(posA, posB) // should equal a

  const edges: GeometryEdge[] = [
    { id: `${vA}${vB}`, from: vA, to: vB, type: 'base',    length: sideLen, paramKey: 'a' },
    { id: `${vB}${vC}`, from: vB, to: vC, type: 'base',    length: sideLen },
    { id: `${vA}${vC}`, from: vA, to: vC, type: 'base',    length: sideLen },
    { id: `${vD}${vA}`, from: vD, to: vA, type: 'lateral', length: edgeLength(posD, posA) },
    { id: `${vD}${vB}`, from: vD, to: vB, type: 'lateral', length: edgeLength(posD, posB) },
    { id: `${vD}${vC}`, from: vD, to: vC, type: 'lateral', length: edgeLength(posD, posC) },
  ]

  const faceArea = triangleArea(posA, posB, posC)

  const faces: GeometryFace[] = [
    { id: `${vA}${vB}${vC}`, vertices: [vA, vB, vC], type: 'base',    area: faceArea, normal: vec3(0, -1, 0) },
    { id: `${vD}${vA}${vB}`, vertices: [vD, vA, vB], type: 'lateral', area: triangleArea(posD, posA, posB) },
    { id: `${vD}${vB}${vC}`, vertices: [vD, vB, vC], type: 'lateral', area: triangleArea(posD, posB, posC) },
    { id: `${vD}${vA}${vC}`, vertices: [vD, vA, vC], type: 'lateral', area: triangleArea(posD, posA, posC) },
  ]

  const specialPoints = buildSpecialPoints(spec, vertices)

  // V = a³ / (6√2), S = √3 × a²
  const measurements = {
    volume: (a ** 3) / (6 * Math.sqrt(2)),
    surfaceArea: Math.sqrt(3) * a * a,
    baseArea: faceArea,
    lateralArea: 3 * triangleArea(posD, posA, posB),
    height: apexH,
  }

  const constructionSteps = [
    {
      index: 0,
      description: `Dựng tam giác đều ${vA}${vB}${vC}`,
      narration: `Dựng tam giác đều ${vA}${vB}${vC} cạnh a làm mặt đáy.`,
      highlightVertices: [vA, vB, vC],
      highlightFaces: [`${vA}${vB}${vC}`],
      visibleVertices: [vA, vB, vC],
      visibleEdges: [`${vA}${vB}`, `${vB}${vC}`, `${vA}${vC}`],
      visibleFaces: [`${vA}${vB}${vC}`],
    },
    {
      index: 1,
      description: `Dựng đỉnh ${vD}`,
      narration: `Dựng đỉnh ${vD} phía trên tâm tam giác đáy.`,
      highlightVertices: [vD],
      visibleVertices: [vA, vB, vC, vD],
      visibleEdges: [`${vA}${vB}`, `${vB}${vC}`, `${vA}${vC}`],
      visibleFaces: [`${vA}${vB}${vC}`],
    },
    {
      index: 2,
      description: `Nối các cạnh bên`,
      narration: `Nối đỉnh ${vD} với ba đỉnh đáy để tạo tứ diện đều.`,
      highlightEdges: [`${vD}${vA}`, `${vD}${vB}`, `${vD}${vC}`],
      visibleVertices: [vA, vB, vC, vD],
      visibleEdges: [`${vA}${vB}`, `${vB}${vC}`, `${vA}${vC}`, `${vD}${vA}`, `${vD}${vB}`, `${vD}${vC}`],
      visibleFaces: [`${vA}${vB}${vC}`, `${vD}${vA}${vB}`, `${vD}${vB}${vC}`, `${vD}${vA}${vC}`],
    },
  ]

  return { spec, vertices, edges, faces, specialPoints, measurements, constructionSteps }
}
