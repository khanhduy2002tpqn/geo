import type { GeometrySpec, GeometryVertex, SpecialPoint, Vector3D } from '@/types/geo-ai'
import { midpoint } from '../types'

export function computeMidpoint(
  v1: GeometryVertex,
  v2: GeometryVertex,
  id: string,
  onEdge: string,
): SpecialPoint {
  const pos: Vector3D = midpoint(v1.position, v2.position)
  return {
    id,
    position: pos,
    label: id,
    description: `Trung điểm ${onEdge}`,
    onEdge,
  }
}

// Vietnamese midpoint pattern: "M là trung điểm BC"
const MIDPOINT_PATTERN = /(\w+)\s+là\s+trung\s+điểm\s+([A-Z]\d*[A-Z]\d*)/u

function parseMidpointCondition(
  condition: string,
): { pointId: string; edgeId: string } | null {
  const match = MIDPOINT_PATTERN.exec(condition)
  if (!match) return null
  const pointId = match[1] ?? ''
  const edgeId  = match[2] ?? ''
  if (!pointId || !edgeId) return null
  return { pointId, edgeId }
}

export function buildSpecialPoints(
  spec: GeometrySpec,
  vertexMap: Record<string, GeometryVertex>,
): SpecialPoint[] {
  const result: SpecialPoint[] = []
  const conditions = spec.conditions ?? []

  for (const condition of conditions) {
    const parsed = parseMidpointCondition(condition)
    if (!parsed) continue

    const { pointId, edgeId } = parsed
    if (edgeId.length < 2) continue

    // Split edge id into two vertex ids — handles single-char and digit-suffixed ids
    // Strategy: try all splits of the edge string into two known vertex ids
    const fromId = edgeId.slice(0, 1) ?? ''
    const toId   = edgeId.slice(1)    ?? ''

    const fromVertex = vertexMap[fromId]
    const toVertex   = vertexMap[toId]

    if (!fromVertex || !toVertex) continue

    result.push(computeMidpoint(fromVertex, toVertex, pointId, edgeId))
  }

  // Also handle explicit specialPoints declared in spec
  const declaredPoints = spec.specialPoints ?? []
  for (const sp of declaredPoints) {
    // Skip if already added from conditions
    if (result.some(r => r.id === sp.id)) continue

    if (sp.onEdge && sp.onEdge.length >= 2) {
      const fromId = sp.onEdge.slice(0, 1) ?? ''
      const toId   = sp.onEdge.slice(1)    ?? ''
      const fromVertex = vertexMap[fromId]
      const toVertex   = vertexMap[toId]
      if (fromVertex && toVertex) {
        result.push(computeMidpoint(fromVertex, toVertex, sp.id, sp.onEdge))
        continue
      }
    }

    // Fall back: no position computable — skip
  }

  return result
}
