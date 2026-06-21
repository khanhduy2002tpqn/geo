import type { GeometrySpec, GeometryModel, GeometryEdge } from '@/types/geo-ai'
import { vec3 } from '../../types'

export function buildLine(spec: GeometrySpec): GeometryModel {
  const a = spec.params.a ?? 4

  switch (spec.shape) {
    case 'parallel_lines':
      return buildParallelLines(spec, a)
    case 'perpendicular_lines':
      return buildPerpendicularLines(spec, a)
    case 'ray':
      return buildRay(spec, a)
    default:
      return buildSingleLine(spec, a)
  }
}

function buildSingleLine(spec: GeometrySpec, a: number): GeometryModel {
  const labels = spec.vertices.length >= 2 ? spec.vertices : ['A', 'B']
  const [vA, vB] = labels as [string, string]

  const vertices = {
    [vA]: { id: vA, position: vec3(-a / 2, 0, 0), label: vA },
    [vB]: { id: vB, position: vec3( a / 2, 0, 0), label: vB },
  }

  const edges: GeometryEdge[] = [
    { id: `${vA}${vB}`, from: vA, to: vB, type: 'base', length: a },
  ]

  return {
    spec, vertices, edges, faces: [], specialPoints: [],
    measurements: {},
    constructionSteps: [
      {
        index: 0,
        description: `Xác định hai điểm ${vA} và ${vB}`,
        narration: `Đường thẳng được xác định bởi hai điểm ${vA} và ${vB}.`,
        highlightVertices: [vA, vB],
        visibleVertices: [vA, vB], visibleEdges: [], visibleFaces: [],
      },
      {
        index: 1,
        description: `Vẽ đường thẳng qua ${vA}${vB}`,
        narration: `Vẽ đường thẳng qua ${vA} và ${vB} — đường thẳng kéo dài vô tận về hai phía.`,
        highlightEdges: [`${vA}${vB}`],
        visibleVertices: [vA, vB], visibleEdges: [`${vA}${vB}`], visibleFaces: [],
      },
    ],
  }
}

function buildRay(spec: GeometrySpec, a: number): GeometryModel {
  const labels = spec.vertices.length >= 2 ? spec.vertices : ['O', 'A']
  const [vO, vA] = labels as [string, string]

  const vertices = {
    [vO]: { id: vO, position: vec3(0, 0, 0), label: vO },
    [vA]: { id: vA, position: vec3(a, 0, 0), label: vA },
  }

  const edges: GeometryEdge[] = [
    { id: `${vO}${vA}`, from: vO, to: vA, type: 'base', length: a },
  ]

  return {
    spec, vertices, edges, faces: [], specialPoints: [],
    measurements: {},
    constructionSteps: [
      {
        index: 0,
        description: `Xác định gốc tia ${vO}`,
        narration: `Điểm ${vO} là gốc của tia — điểm xuất phát.`,
        highlightVertices: [vO],
        visibleVertices: [vO], visibleEdges: [], visibleFaces: [],
      },
      {
        index: 1,
        description: `Xác định hướng tia qua ${vA}`,
        narration: `Tia ${vO}${vA} bắt đầu tại ${vO}, đi qua ${vA} và kéo dài vô tận về một phía.`,
        highlightEdges: [`${vO}${vA}`],
        visibleVertices: [vO, vA], visibleEdges: [`${vO}${vA}`], visibleFaces: [],
      },
    ],
  }
}

function buildParallelLines(spec: GeometrySpec, a: number): GeometryModel {
  const gap = spec.params.h ?? 2
  const [vA, vB] = ['A', 'B']
  const [vC, vD] = ['C', 'D']

  const vertices = {
    [vA]: { id: vA, position: vec3(-a / 2, 0,  0),    label: vA },
    [vB]: { id: vB, position: vec3( a / 2, 0,  0),    label: vB },
    [vC]: { id: vC, position: vec3(-a / 2, 0,  gap),  label: vC },
    [vD]: { id: vD, position: vec3( a / 2, 0,  gap),  label: vD },
  }

  const edges: GeometryEdge[] = [
    { id: `${vA}${vB}`, from: vA, to: vB, type: 'base',    length: a },
    { id: `${vC}${vD}`, from: vC, to: vD, type: 'lateral', length: a },
  ]

  return {
    spec, vertices, edges, faces: [], specialPoints: [],
    measurements: {},
    constructionSteps: [
      {
        index: 0,
        description: `Vẽ đường thẳng thứ nhất ${vA}${vB}`,
        narration: `Vẽ đường thẳng ${vA}${vB}.`,
        highlightEdges: [`${vA}${vB}`],
        visibleVertices: [vA, vB], visibleEdges: [`${vA}${vB}`], visibleFaces: [],
      },
      {
        index: 1,
        description: `Vẽ đường thẳng song song ${vC}${vD}`,
        narration: `Vẽ đường thẳng ${vC}${vD} song song với ${vA}${vB}, cách ${gap} đơn vị.`,
        highlightEdges: [`${vC}${vD}`],
        visibleVertices: [vA, vB, vC, vD], visibleEdges: [`${vA}${vB}`, `${vC}${vD}`], visibleFaces: [],
      },
    ],
  }
}

function buildPerpendicularLines(spec: GeometrySpec, a: number): GeometryModel {
  const [vA, vB] = ['A', 'B']
  const [vC, vD] = ['C', 'D']
  const half = a / 2

  const vertices = {
    [vA]: { id: vA, position: vec3(-half, 0, 0),  label: vA },
    [vB]: { id: vB, position: vec3( half, 0, 0),  label: vB },
    [vC]: { id: vC, position: vec3(0, 0, -half),  label: vC },
    [vD]: { id: vD, position: vec3(0, 0,  half),  label: vD },
  }

  const edges: GeometryEdge[] = [
    { id: `${vA}${vB}`, from: vA, to: vB, type: 'base',    length: a },
    { id: `${vC}${vD}`, from: vC, to: vD, type: 'lateral', length: a },
  ]

  return {
    spec, vertices, edges, faces: [], specialPoints: [],
    measurements: {},
    constructionSteps: [
      {
        index: 0,
        description: `Vẽ đường thẳng thứ nhất ${vA}${vB}`,
        narration: `Vẽ đường thẳng ${vA}${vB} nằm ngang.`,
        highlightEdges: [`${vA}${vB}`],
        visibleVertices: [vA, vB], visibleEdges: [`${vA}${vB}`], visibleFaces: [],
      },
      {
        index: 1,
        description: `Vẽ đường thẳng vuông góc ${vC}${vD}`,
        narration: `Vẽ đường thẳng ${vC}${vD} vuông góc với ${vA}${vB} tại giao điểm O.`,
        highlightEdges: [`${vC}${vD}`],
        visibleVertices: [vA, vB, vC, vD], visibleEdges: [`${vA}${vB}`, `${vC}${vD}`], visibleFaces: [],
      },
    ],
  }
}
