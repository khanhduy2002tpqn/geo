import { describe, expect, it } from 'vitest'
import { GeometryEngine } from '@/lib/geo-ai/geometry-engine'
import { unfoldedVertexPosition } from './GeometryMesh'

const model = GeometryEngine.build({
  shape: 'rectangular_prism',
  vertices: [],
  params: { a: 4, b: 3, h: 2 },
  conditions: [],
})

describe('cuboid unfolding', () => {
  it('places all six faces on one plane without deforming them', () => {
    for (const face of model.faces) {
      const closed = face.vertices.map((id) => model.vertices[id]!.position)
      const open = face.vertices.map((id) =>
        unfoldedVertexPosition(face, model.vertices[id]!, model.vertices, 'full', 1),
      )

      expect(open.every((point) => Math.abs(point.z - 1.5) < 0.0001)).toBe(true)
      for (let index = 0; index < closed.length; index++) {
        const next = (index + 1) % closed.length
        const closedLength = Math.hypot(
          closed[next]!.x - closed[index]!.x,
          closed[next]!.y - closed[index]!.y,
          closed[next]!.z - closed[index]!.z,
        )
        expect(open[index]!.distanceTo(open[next]!)).toBeCloseTo(closedLength, 5)
      }
    }
  })

  it('places the four side faces into a flat strip', () => {
    const lateralFaces = model.faces.filter((face) => face.type === 'lateral')
    const openPoints = lateralFaces.flatMap((face) =>
      face.vertices.map((id) =>
        unfoldedVertexPosition(face, model.vertices[id]!, model.vertices, 'strip', 1),
      ),
    )

    expect(openPoints.every((point) => Math.abs(point.z - 1.5) < 0.0001)).toBe(true)
    const xValues = openPoints.map((point) => point.x)
    expect(Math.max(...xValues) - Math.min(...xValues)).toBeCloseTo(14, 5)
  })

  it('uses the textbook cuboid net order with caps attached to the middle face', () => {
    const front = model.faces.find((face) => face.id === 'ABB1A1')!
    const left = model.faces.find((face) => face.id === 'DAA1D1')!
    const top = model.faces.find((face) => face.id === 'A1B1C1D1')!
    const bottom = model.faces.find((face) => face.id === 'ABCD')!

    const frontA = unfoldedVertexPosition(front, model.vertices.A!, model.vertices, 'full', 1)
    const leftA = unfoldedVertexPosition(left, model.vertices.A!, model.vertices, 'full', 1)
    const frontB = unfoldedVertexPosition(front, model.vertices.B!, model.vertices, 'full', 1)
    const topA1 = unfoldedVertexPosition(top, model.vertices.A1!, model.vertices, 'full', 1)
    const topD1 = unfoldedVertexPosition(top, model.vertices.D1!, model.vertices, 'full', 1)
    const bottomA = unfoldedVertexPosition(bottom, model.vertices.A!, model.vertices, 'full', 1)
    const bottomD = unfoldedVertexPosition(bottom, model.vertices.D!, model.vertices, 'full', 1)

    expect(leftA.distanceTo(frontA)).toBeCloseTo(0, 5)
    expect(frontA.x).toBeCloseTo(-2, 5)
    expect(frontB.x).toBeCloseTo(2, 5)

    expect(topA1.x).toBeCloseTo(frontA.x, 5)
    expect(topA1.y).toBeCloseTo(2, 5)
    expect(topD1.y).toBeCloseTo(5, 5)

    expect(bottomA.x).toBeCloseTo(frontA.x, 5)
    expect(bottomA.y).toBeCloseTo(0, 5)
    expect(bottomD.y).toBeCloseTo(-3, 5)
  })
})
