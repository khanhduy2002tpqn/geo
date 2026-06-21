import type { GeometrySpec, GeometryModel, GeometryVertex, GeometryEdge, GeometryFace } from '@/types/geo-ai'
import { vec3, edgeLength } from '../../types'

export function buildTrapezoid(spec: GeometrySpec): GeometryModel {
  const a = spec.params.a ?? 8   // bottom base (larger)
  const b = spec.params.b ?? 5   // top base (smaller)
  const h = spec.params.h ?? 4   // height

  const isIsosceles = spec.shape === 'isosceles_trapezoid'
  const offset = isIsosceles
    ? (a - b) / 2                // symmetric for isosceles
    : spec.params.a ?? (a - b) * 0.3  // asymmetric for regular

  const labels = spec.vertices.length >= 4 ? spec.vertices : ['A', 'B', 'C', 'D']
  const [vA, vB, vC, vD] = labels as [string, string, string, string]

  // AB = bottom base, DC = top base
  const posA = vec3(0,          0, 0)
  const posB = vec3(a,          0, 0)
  const posC = vec3(a - offset, 0, h)
  const posD = vec3(offset,     0, h)

  // Height foot: perpendicular projection of D onto the bottom base (hidden anchor)
  const vH = 'H'
  const posH = vec3(offset, 0, 0)

  const vertices: Record<string, GeometryVertex> = {
    [vA]: { id: vA, position: posA, label: vA },
    [vB]: { id: vB, position: posB, label: vB },
    [vC]: { id: vC, position: posC, label: vC },
    [vD]: { id: vD, position: posD, label: vD },
    [vH]: { id: vH, position: posH, label: '' },
  }

  const lenAB = a
  const lenDC = b
  const lenBC = edgeLength(posB, posC)
  const lenAD = edgeLength(posA, posD)

  const edges: GeometryEdge[] = [
    { id: `${vA}${vB}`, from: vA, to: vB, type: 'base',    length: lenAB },
    { id: `${vB}${vC}`, from: vB, to: vC, type: 'lateral', length: lenBC },
    { id: `${vD}${vC}`, from: vD, to: vC, type: 'base',    length: lenDC },
    { id: `${vA}${vD}`, from: vA, to: vD, type: 'lateral', length: lenAD },
    // Dashed height segment carrying the `h` label
    { id: `${vD}${vH}`, from: vD, to: vH, type: 'radius',  length: h, paramKey: 'h' },
  ]

  const area = ((a + b) / 2) * h
  const perimeter = lenAB + lenBC + lenDC + lenAD

  const faces: GeometryFace[] = [
    {
      id: `${vA}${vB}${vC}${vD}`,
      vertices: [vA, vB, vC, vD],
      type: 'base',
      area,
      normal: vec3(0, 1, 0),
    },
  ]

  const shapeName = isIsosceles ? 'hình thang cân' : 'hình thang'

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
        description: `Vẽ đáy lớn ${vA}${vB} = ${a}`,
        narration: `Vẽ cạnh đáy lớn ${vA}${vB} = ${a} đơn vị.`,
        highlightVertices: [vA, vB],
        highlightEdges: [`${vA}${vB}`],
        visibleVertices: [vA, vB],
        visibleEdges: [`${vA}${vB}`],
        visibleFaces: [],
      },
      {
        index: 1,
        description: `Xác định đáy nhỏ ${vD}${vC} = ${b}`,
        narration: isIsosceles
          ? `Vẽ đáy nhỏ ${vD}${vC} = ${b} song song với ${vA}${vB}, đặt đối xứng — hình thang cân có hai cạnh bên bằng nhau.`
          : `Vẽ đáy nhỏ ${vD}${vC} = ${b} song song với ${vA}${vB}, cách ${h} đơn vị.`,
        highlightEdges: [`${vD}${vC}`],
        visibleVertices: [vA, vB, vC, vD],
        visibleEdges: [`${vA}${vB}`, `${vD}${vC}`],
        visibleFaces: [],
      },
      {
        index: 2,
        description: `Hoàn thiện ${shapeName}`,
        narration: `Nối ${vA}${vD} và ${vB}${vC} để hoàn thành ${shapeName}. S = (${a} + ${b}) / 2 × ${h} = ${area.toFixed(1)}.`,
        highlightFaces: [`${vA}${vB}${vC}${vD}`],
        visibleVertices: [vA, vB, vC, vD],
        visibleEdges: [`${vA}${vB}`, `${vB}${vC}`, `${vD}${vC}`, `${vA}${vD}`],
        visibleFaces: [`${vA}${vB}${vC}${vD}`],
      },
    ],
  }
}
