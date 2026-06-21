import type { GeometrySpec, GeometryModel, GeometryVertex, GeometryEdge, GeometryFace } from '@/types/geo-ai'
import { vec3, edgeLength, triangleArea } from '../types'
import { buildSpecialPoints } from '../compute/intersections'

export function buildPyramid(spec: GeometrySpec): GeometryModel {
  const a = spec.params.a ?? 1
  const h = spec.params.h ?? a

  const labels = spec.vertices.length >= 5 ? spec.vertices : ['A', 'B', 'C', 'D', 'S']
  const [vA, vB, vC, vD, vS] = labels as [string, string, string, string, string]

  const half = a / 2
  const posA = vec3(-half, 0, -half)
  const posB = vec3(half, 0, -half)
  const posC = vec3(half, 0, half)
  const posD = vec3(-half, 0, half)
  const posS = vec3(0, h, 0)

  // Base-centre anchor (foot of the height). Hidden node (empty label); used only
  // to draw the dashed height segment SO so the `h` dimension can be labelled.
  const vO = 'O'
  const posO = vec3(0, 0, 0)

  const vertices: Record<string, GeometryVertex> = {
    [vA]: { id: vA, position: posA, label: vA },
    [vB]: { id: vB, position: posB, label: vB },
    [vC]: { id: vC, position: posC, label: vC },
    [vD]: { id: vD, position: posD, label: vD },
    [vS]: { id: vS, position: posS, label: vS },
    [vO]: { id: vO, position: posO, label: '' },
  }

  const edges: GeometryEdge[] = [
    { id: `${vA}${vB}`, from: vA, to: vB, type: 'base', length: a, paramKey: 'a' },
    { id: `${vB}${vC}`, from: vB, to: vC, type: 'base', length: a },
    { id: `${vC}${vD}`, from: vC, to: vD, type: 'base', length: a },
    { id: `${vD}${vA}`, from: vD, to: vA, type: 'base', length: a },
    { id: `${vS}${vA}`, from: vS, to: vA, type: 'lateral', length: edgeLength(posS, posA) },
    { id: `${vS}${vB}`, from: vS, to: vB, type: 'lateral', length: edgeLength(posS, posB) },
    { id: `${vS}${vC}`, from: vS, to: vC, type: 'lateral', length: edgeLength(posS, posC) },
    { id: `${vS}${vD}`, from: vS, to: vD, type: 'lateral', length: edgeLength(posS, posD) },
    // Height segment (apex → base centre), drawn dashed; carries the `h` label
    { id: `${vS}${vO}`, from: vS, to: vO, type: 'radius', length: h, paramKey: 'h' },
  ]

  const baseArea = a * a
  const slantHeight = Math.sqrt(h * h + half * half)
  const lateralFaceArea = 0.5 * a * slantHeight

  const faces: GeometryFace[] = [
    {
      id: `${vA}${vB}${vC}${vD}`,
      vertices: [vA, vB, vC, vD],
      type: 'base',
      area: baseArea,
      normal: vec3(0, -1, 0),
    },
    {
      id: `${vS}${vA}${vB}`,
      vertices: [vS, vA, vB],
      type: 'lateral',
      area: triangleArea(posS, posA, posB),
    },
    {
      id: `${vS}${vB}${vC}`,
      vertices: [vS, vB, vC],
      type: 'lateral',
      area: triangleArea(posS, posB, posC),
    },
    {
      id: `${vS}${vC}${vD}`,
      vertices: [vS, vC, vD],
      type: 'lateral',
      area: triangleArea(posS, posC, posD),
    },
    {
      id: `${vS}${vD}${vA}`,
      vertices: [vS, vD, vA],
      type: 'lateral',
      area: triangleArea(posS, posD, posA),
    },
  ]

  const specialPoints = buildSpecialPoints(spec, vertices)

  const measurements = {
    volume: (baseArea * h) / 3,
    baseArea,
    lateralArea: 4 * lateralFaceArea,
    surfaceArea: baseArea + 4 * lateralFaceArea,
    height: h,
    slantHeight,
  }

  const constructionSteps = [
    {
      index: 0,
      description: `Dựng đáy hình vuông ${vA}${vB}${vC}${vD}`,
      narration: `Dựng hình vuông ${vA}${vB}${vC}${vD} cạnh a làm đáy.`,
      highlightVertices: [vA, vB, vC, vD],
      highlightEdges: [`${vA}${vB}`, `${vB}${vC}`, `${vC}${vD}`, `${vD}${vA}`],
      highlightFaces: [`${vA}${vB}${vC}${vD}`],
      visibleVertices: [vA, vB, vC, vD],
      visibleEdges: [`${vA}${vB}`, `${vB}${vC}`, `${vC}${vD}`, `${vD}${vA}`],
      visibleFaces: [`${vA}${vB}${vC}${vD}`],
    },
    {
      index: 1,
      description: `Dựng đỉnh ${vS}`,
      narration: `Dựng đỉnh ${vS} phía trên tâm đáy.`,
      highlightVertices: [vS],
      visibleVertices: [vA, vB, vC, vD, vS],
      visibleEdges: [`${vA}${vB}`, `${vB}${vC}`, `${vC}${vD}`, `${vD}${vA}`],
      visibleFaces: [`${vA}${vB}${vC}${vD}`],
    },
    {
      index: 2,
      description: `Nối các cạnh bên ${vS}${vA}, ${vS}${vB}, ${vS}${vC}, ${vS}${vD}`,
      narration: `Nối đỉnh ${vS} với bốn đỉnh của đáy.`,
      highlightEdges: [`${vS}${vA}`, `${vS}${vB}`, `${vS}${vC}`, `${vS}${vD}`],
      visibleVertices: [vA, vB, vC, vD, vS],
      visibleEdges: [`${vA}${vB}`, `${vB}${vC}`, `${vC}${vD}`, `${vD}${vA}`, `${vS}${vA}`, `${vS}${vB}`, `${vS}${vC}`, `${vS}${vD}`],
      visibleFaces: [`${vA}${vB}${vC}${vD}`, `${vS}${vA}${vB}`, `${vS}${vB}${vC}`, `${vS}${vC}${vD}`, `${vS}${vD}${vA}`],
    },
  ]

  return { spec, vertices, edges, faces, specialPoints, measurements, constructionSteps }
}
