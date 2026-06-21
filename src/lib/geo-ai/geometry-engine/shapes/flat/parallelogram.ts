import type { GeometrySpec, GeometryModel, GeometryVertex, GeometryEdge, GeometryFace } from '@/types/geo-ai'
import { vec3, edgeLength } from '../../types'

export function buildParallelogram(spec: GeometrySpec): GeometryModel {
  const a = spec.params.a ?? 5   // base
  const b = spec.shape === 'rhombus' ? a : (spec.params.b ?? 4)  // side (= a for rhombus)
  const h = spec.params.h ?? 3   // height (perpendicular)

  const offset = Math.sqrt(Math.max(0, b * b - h * h))

  const labels = spec.vertices.length >= 4 ? spec.vertices : ['A', 'B', 'C', 'D']
  const [vA, vB, vC, vD] = labels as [string, string, string, string]

  // ABCD: A at origin, B along +X, shear D and C upward
  const posA = vec3(0,        0, 0)
  const posB = vec3(a,        0, 0)
  const posC = vec3(a + offset, 0, h)
  const posD = vec3(offset,   0, h)

  // Height foot: perpendicular projection of D onto the base line (hidden anchor)
  const vH = 'H'
  const posH = vec3(offset, 0, 0)

  const vertices: Record<string, GeometryVertex> = {
    [vA]: { id: vA, position: posA, label: vA },
    [vB]: { id: vB, position: posB, label: vB },
    [vC]: { id: vC, position: posC, label: vC },
    [vD]: { id: vD, position: posD, label: vD },
    [vH]: { id: vH, position: posH, label: '' },
  }

  const lenAB = edgeLength(posA, posB)
  const lenBC = edgeLength(posB, posC)

  const edges: GeometryEdge[] = [
    { id: `${vA}${vB}`, from: vA, to: vB, type: 'base', length: lenAB },
    { id: `${vB}${vC}`, from: vB, to: vC, type: 'lateral', length: lenBC },
    { id: `${vC}${vD}`, from: vC, to: vD, type: 'base', length: lenAB },
    { id: `${vD}${vA}`, from: vD, to: vA, type: 'lateral', length: lenBC },
    // Dashed height segment carrying the `h` label
    { id: `${vD}${vH}`, from: vD, to: vH, type: 'radius', length: h, paramKey: 'h' },
  ]

  const area = a * h
  const perimeter = 2 * (lenAB + lenBC)

  const faces: GeometryFace[] = [
    {
      id: `${vA}${vB}${vC}${vD}`,
      vertices: [vA, vB, vC, vD],
      type: 'base',
      area,
      normal: vec3(0, 1, 0),
    },
  ]

  const isRhombus = spec.shape === 'rhombus'
  const shapeName = isRhombus ? 'hình thoi' : 'hình bình hành'

  return {
    spec,
    vertices,
    edges,
    faces,
    specialPoints: [],
    measurements: { area, perimeter, height: h },
    constructionSteps: [
      {
        index: 0,
        description: `Vẽ cạnh đáy ${vA}${vB}`,
        narration: `Vẽ cạnh đáy ${vA}${vB} = ${a} đơn vị.`,
        highlightVertices: [vA, vB],
        highlightEdges: [`${vA}${vB}`],
        visibleVertices: [vA, vB],
        visibleEdges: [`${vA}${vB}`],
        visibleFaces: [],
      },
      {
        index: 1,
        description: `Vẽ cạnh bên ${vA}${vD} và ${vB}${vC}`,
        narration: isRhombus
          ? `Vẽ hai cạnh bên bằng cạnh đáy (cạnh bằng a = ${a}), nghiêng cùng hướng, chiều cao ${h}.`
          : `Vẽ hai cạnh bên song song, dài ${b.toFixed(1)}, tạo chiều cao ${h}.`,
        highlightEdges: [`${vA}${vD}`, `${vB}${vC}`],
        visibleVertices: [vA, vB, vC, vD],
        visibleEdges: [`${vA}${vB}`, `${vA}${vD}`, `${vB}${vC}`],
        visibleFaces: [],
      },
      {
        index: 2,
        description: `Hoàn thiện ${shapeName} ${vA}${vB}${vC}${vD}`,
        narration: `Nối ${vD}${vC}. ${isRhombus ? `Hình thoi có bốn cạnh bằng nhau.` : `Hình bình hành: cạnh đối song song và bằng nhau.`} S = đáy × chiều cao = ${a} × ${h} = ${area}.`,
        highlightFaces: [`${vA}${vB}${vC}${vD}`],
        visibleVertices: [vA, vB, vC, vD],
        visibleEdges: [`${vA}${vB}`, `${vB}${vC}`, `${vC}${vD}`, `${vD}${vA}`],
        visibleFaces: [`${vA}${vB}${vC}${vD}`],
      },
    ],
  }
}
