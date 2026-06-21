import type { GeometrySpec, GeometryModel, GeometryVertex, GeometryEdge, GeometryFace } from '@/types/geo-ai'
import { vec3, edgeLength, triangleArea } from '../types'
import { buildSpecialPoints } from '../compute/intersections'

export function buildPrism(spec: GeometrySpec): GeometryModel {
  const a = spec.params.a ?? 1
  const h = spec.params.h ?? 1
  // When `b` is supplied, the base is a right triangle (right angle at A) with
  // legs AB = a and AC = b. Otherwise the base is equilateral with side a.
  const b = spec.params.b
  const isRightTriangle = typeof b === 'number' && b > 0

  // Default labels: A B C A1 B1 C1
  const labels = spec.vertices.length >= 6 ? spec.vertices : ['A', 'B', 'C', 'A1', 'B1', 'C1']
  const [vA, vB, vC, vA1, vB1, vC1] = labels as [string, string, string, string, string, string]

  // Triangle base on XZ plane (Y=0)
  const posA  = vec3(0, 0, 0)
  const posB  = vec3(a, 0, 0)
  const posC  = isRightTriangle
    ? vec3(0, 0, b)                          // right angle at A: AC ⟂ AB
    : vec3(a / 2, 0, (a * Math.sqrt(3)) / 2) // equilateral

  const posA1 = vec3(posA.x, h, posA.z)
  const posB1 = vec3(posB.x, h, posB.z)
  const posC1 = vec3(posC.x, h, posC.z)

  const vertices: Record<string, GeometryVertex> = {
    [vA]:  { id: vA,  position: posA,  label: vA  },
    [vB]:  { id: vB,  position: posB,  label: vB  },
    [vC]:  { id: vC,  position: posC,  label: vC  },
    [vA1]: { id: vA1, position: posA1, label: vA1 },
    [vB1]: { id: vB1, position: posB1, label: vB1 },
    [vC1]: { id: vC1, position: posC1, label: vC1 },
  }

  // Base edge lengths: AB = a always; for a right triangle AC = b and BC is the
  // hypotenuse (left unlabeled so students derive it via Pythagoras).
  const lenBC = isRightTriangle ? Math.sqrt(a * a + b * b) : a
  const lenAC = isRightTriangle ? b : a

  const edges: GeometryEdge[] = [
    // Bottom triangle
    { id: `${vA}${vB}`,   from: vA,  to: vB,  type: 'base',    length: a,     paramKey: 'a' },
    { id: `${vB}${vC}`,   from: vB,  to: vC,  type: 'base',    length: lenBC },
    { id: `${vA}${vC}`,   from: vA,  to: vC,  type: 'base',    length: lenAC, ...(isRightTriangle ? { paramKey: 'b' } : {}) },
    // Top triangle
    { id: `${vA1}${vB1}`, from: vA1, to: vB1, type: 'base',    length: a },
    { id: `${vB1}${vC1}`, from: vB1, to: vC1, type: 'base',    length: lenBC },
    { id: `${vA1}${vC1}`, from: vA1, to: vC1, type: 'base',    length: lenAC },
    // Lateral edges
    { id: `${vA}${vA1}`,  from: vA,  to: vA1, type: 'lateral', length: h, paramKey: 'h' },
    { id: `${vB}${vB1}`,  from: vB,  to: vB1, type: 'lateral', length: h },
    { id: `${vC}${vC1}`,  from: vC,  to: vC1, type: 'lateral', length: h },
  ]

  const baseTriArea = triangleArea(posA, posB, posC)
  // Lateral faces are rectangles: (base edge length) × prism height
  const faceAB = a * h
  const faceBC = lenBC * h
  const faceAC = lenAC * h
  const diagLen = edgeLength(posA, posB1)

  const faces: GeometryFace[] = [
    { id: `${vA}${vB}${vC}`,       vertices: [vA, vB, vC],       type: 'base',    area: baseTriArea },
    { id: `${vA1}${vB1}${vC1}`,    vertices: [vA1, vB1, vC1],    type: 'top',     area: baseTriArea },
    { id: `${vA}${vB}${vB1}${vA1}`, vertices: [vA, vB, vB1, vA1], type: 'lateral', area: faceAB },
    { id: `${vB}${vC}${vC1}${vB1}`, vertices: [vB, vC, vC1, vB1], type: 'lateral', area: faceBC },
    { id: `${vA}${vC}${vC1}${vA1}`, vertices: [vA, vC, vC1, vA1], type: 'lateral', area: faceAC },
  ]

  const specialPoints = buildSpecialPoints(spec, vertices)

  // Right triangle: base area = ½·a·b. Equilateral: (√3/4)a².
  const baseArea = isRightTriangle ? (a * b) / 2 : (Math.sqrt(3) / 4) * a * a
  const measurements = {
    volume: baseArea * h,
    baseArea,
    lateralArea: faceAB + faceBC + faceAC,
    surfaceArea: 2 * baseArea + faceAB + faceBC + faceAC,
    height: h,
    _diagonalEdge: diagLen,
  }

  const constructionSteps = [
    {
      index: 0,
      description: `Dựng đáy tam giác đều ${vA}${vB}${vC}`,
      narration: `Dựng tam giác đều ${vA}${vB}${vC} cạnh a làm mặt đáy.`,
      highlightVertices: [vA, vB, vC],
      highlightFaces: [`${vA}${vB}${vC}`],
      visibleVertices: [vA, vB, vC],
      visibleEdges: [`${vA}${vB}`, `${vB}${vC}`, `${vA}${vC}`],
      visibleFaces: [`${vA}${vB}${vC}`],
    },
    {
      index: 1,
      description: `Dựng các cạnh bên`,
      narration: `Từ mỗi đỉnh đáy, dựng cạnh bên vuông góc với đáy có độ dài h.`,
      highlightEdges: [`${vA}${vA1}`, `${vB}${vB1}`, `${vC}${vC1}`],
      visibleVertices: [vA, vB, vC, vA1, vB1, vC1],
      visibleEdges: [
        `${vA}${vB}`, `${vB}${vC}`, `${vA}${vC}`,
        `${vA}${vA1}`, `${vB}${vB1}`, `${vC}${vC1}`,
      ],
      visibleFaces: [`${vA}${vB}${vC}`],
    },
    {
      index: 2,
      description: `Nối mặt trên ${vA1}${vB1}${vC1}`,
      narration: `Nối ba đỉnh trên tạo thành mặt tam giác đều ${vA1}${vB1}${vC1}.`,
      highlightVertices: [vA1, vB1, vC1],
      highlightFaces: [`${vA1}${vB1}${vC1}`],
      visibleVertices: [vA, vB, vC, vA1, vB1, vC1],
      visibleEdges: [
        `${vA}${vB}`, `${vB}${vC}`, `${vA}${vC}`,
        `${vA1}${vB1}`, `${vB1}${vC1}`, `${vA1}${vC1}`,
        `${vA}${vA1}`, `${vB}${vB1}`, `${vC}${vC1}`,
      ],
      visibleFaces: [
        `${vA}${vB}${vC}`,
        `${vA1}${vB1}${vC1}`,
        `${vA}${vB}${vB1}${vA1}`,
        `${vB}${vC}${vC1}${vB1}`,
        `${vA}${vC}${vC1}${vA1}`,
      ],
    },
  ]

  return { spec, vertices, edges, faces, specialPoints, measurements, constructionSteps }
}
