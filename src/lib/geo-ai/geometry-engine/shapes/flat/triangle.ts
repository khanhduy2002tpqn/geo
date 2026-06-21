import type { GeometrySpec, GeometryModel, GeometryVertex, GeometryEdge, GeometryFace } from '@/types/geo-ai'
import { vec3, edgeLength, triangleArea } from '../../types'

export function buildFlatTriangle(spec: GeometrySpec): GeometryModel {
  const a = spec.params.a ?? 3  // base
  const b = spec.params.b ?? a  // second side
  const h = spec.params.h ?? computeHeight(spec, a, b)

  const labels = spec.vertices.length >= 3 ? spec.vertices : ['A', 'B', 'C']
  const [vA, vB, vC] = labels as [string, string, string]

  let posA = vec3(0, 0, 0)
  let posB = vec3(a, 0, 0)
  let posC: ReturnType<typeof vec3>

  switch (spec.shape) {
    case 'equilateral_triangle': {
      const side = a
      posC = vec3(side / 2, 0, (side * Math.sqrt(3)) / 2)
      break
    }
    case 'right_triangle': {
      // Right angle at A: legs AB (horizontal) = a, AC (vertical) = b
      posA = vec3(0, 0, 0)
      posB = vec3(a, 0, 0)
      posC = vec3(0, 0, b)
      break
    }
    case 'right_isosceles_triangle': {
      // Right angle at A, both legs = a
      posA = vec3(0, 0, 0)
      posB = vec3(a, 0, 0)
      posC = vec3(0, 0, a)
      break
    }
    case 'isosceles_triangle': {
      // Base AB = a, equal legs AC = BC = b, symmetric
      posC = vec3(a / 2, 0, h)
      break
    }
    default: {
      // Generic triangle: base AB = a, apex at (b_x, 0, h) for given proportions
      posC = vec3(a / 3, 0, h)
      break
    }
  }

  // For triangles defined by a perpendicular height (isosceles / generic), draw a
  // dashed height segment from apex C down to its foot on base AB so `h` can show.
  const hasHeight = spec.shape === 'isosceles_triangle' || spec.shape === 'triangle'
  const vH = 'H'
  const posH = vec3(posC.x, 0, 0)

  const vertices: Record<string, GeometryVertex> = {
    [vA]: { id: vA, position: posA, label: vA },
    [vB]: { id: vB, position: posB, label: vB },
    [vC]: { id: vC, position: posC, label: vC },
    ...(hasHeight ? { [vH]: { id: vH, position: posH, label: '' } } : {}),
  }

  const lenAB = edgeLength(posA, posB)
  const lenBC = edgeLength(posB, posC)
  const lenAC = edgeLength(posA, posC)

  const edges: GeometryEdge[] = [
    { id: `${vA}${vB}`, from: vA, to: vB, type: 'base',    length: lenAB },
    { id: `${vB}${vC}`, from: vB, to: vC, type: 'lateral', length: lenBC },
    { id: `${vA}${vC}`, from: vA, to: vC, type: 'lateral', length: lenAC },
    ...(hasHeight ? [{ id: `${vC}${vH}`, from: vC, to: vH, type: 'radius' as const, length: h, paramKey: 'h' }] : []),
  ]

  const area = triangleArea(posA, posB, posC)
  const perimeter = lenAB + lenBC + lenAC

  const faces: GeometryFace[] = [
    {
      id: `${vA}${vB}${vC}`,
      vertices: [vA, vB, vC],
      type: 'base',
      area,
      normal: vec3(0, 1, 0),
    },
  ]

  const shapeName = shapeDisplayName(spec.shape)

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
        narration: `Vẽ cạnh đáy ${vA}${vB} có độ dài ${a.toFixed(1)} đơn vị.`,
        highlightVertices: [vA, vB],
        highlightEdges: [`${vA}${vB}`],
        visibleVertices: [vA, vB],
        visibleEdges: [`${vA}${vB}`],
        visibleFaces: [],
      },
      {
        index: 1,
        description: `Xác định đỉnh ${vC}`,
        narration: buildApexNarration(spec.shape, vA, vB, vC, a, b, h),
        highlightVertices: [vC],
        visibleVertices: [vA, vB, vC],
        visibleEdges: [`${vA}${vB}`],
        visibleFaces: [],
      },
      {
        index: 2,
        description: `Hoàn thiện ${shapeName} ${vA}${vB}${vC}`,
        narration: `Nối ${vB}${vC} và ${vA}${vC} để hoàn thành ${shapeName}. Diện tích S = ${area.toFixed(2)}, chu vi = ${perimeter.toFixed(2)}.`,
        highlightFaces: [`${vA}${vB}${vC}`],
        visibleVertices: [vA, vB, vC],
        visibleEdges: [`${vA}${vB}`, `${vB}${vC}`, `${vA}${vC}`],
        visibleFaces: [`${vA}${vB}${vC}`],
      },
    ],
  }
}

function computeHeight(spec: GeometrySpec, a: number, b: number): number {
  switch (spec.shape) {
    case 'equilateral_triangle': return (a * Math.sqrt(3)) / 2
    case 'right_triangle':       return b
    case 'right_isosceles_triangle': return a
    case 'isosceles_triangle':   return Math.sqrt(Math.max(0, b * b - (a / 2) ** 2))
    default:                     return a * 0.75
  }
}

function shapeDisplayName(shape: string): string {
  switch (shape) {
    case 'equilateral_triangle':      return 'tam giác đều'
    case 'isosceles_triangle':        return 'tam giác cân'
    case 'right_triangle':            return 'tam giác vuông'
    case 'right_isosceles_triangle':  return 'tam giác vuông cân'
    default:                          return 'tam giác'
  }
}

function buildApexNarration(shape: string, vA: string, vB: string, vC: string, a: number, b: number, h: number): string {
  switch (shape) {
    case 'equilateral_triangle':
      return `Xác định đỉnh ${vC} sao cho ${vA}${vC} = ${vB}${vC} = ${a.toFixed(1)} — tam giác đều có ba cạnh bằng nhau.`
    case 'isosceles_triangle':
      return `Xác định đỉnh ${vC} là trung điểm của đáy ${vA}${vB} theo chiều ngang, cách đáy ${h.toFixed(2)} — tam giác cân có ${vA}${vC} = ${vB}${vC}.`
    case 'right_triangle':
      return `Đặt đỉnh ${vC} tại vị trí tạo góc vuông tại ${vA}: ${vA}${vC} = ${b.toFixed(1)}, vuông góc với ${vA}${vB}.`
    case 'right_isosceles_triangle':
      return `Đặt đỉnh ${vC} vuông góc với ${vA}${vB} tại ${vA}, ${vA}${vC} = ${vA}${vB} = ${a.toFixed(1)}.`
    default:
      return `Xác định đỉnh ${vC} để tạo thành tam giác ${vA}${vB}${vC}.`
  }
}
