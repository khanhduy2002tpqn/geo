'use client'
import { useState, useEffect } from 'react'
import { GeometryEngine } from '@/lib/geo-ai/geometry-engine'
import type { GeometryModel, GeometrySpec } from '@/types/geo-ai'

export interface ShowcaseItem {
  model: GeometryModel
  label: string
  position: [number, number, number]
  shapeKey: string
}

// Compute a centered grid for any number of shapes.
// Roughly square (cols = ceil(sqrt(n))). Row 0 = top (highest y), last row = bottom.
// All shapes at z=0 so perspective doesn't displace rows on screen.
function computeGridPositions(count: number, spacingX = 18, spacingY = 18, cols = 4): [number, number, number][] {
  const rows = Math.ceil(count / cols)
  const halfX = ((cols - 1) / 2) * spacingX
  const halfY = ((rows - 1) / 2) * spacingY
  return Array.from({ length: count }, (_, i) => {
    const row = Math.floor(i / cols)
    const col = i % cols
    return [col * spacingX - halfX, (rows - 1 - row) * spacingY - halfY, 0] as [number, number, number]
  })
}

interface ApiShape {
  shapeKey: string
  nameVi: string
  params: Record<string, number>
}

export function useShowcaseShapes(): ShowcaseItem[] {
  const [items, setItems] = useState<ShowcaseItem[]>([])

  useEffect(() => {
    let cancelled = false
    fetch('/api/geo-ai/shapes/showcase')
      .then(async (r) => {
        const data = (await r.json().catch(() => ({}))) as {
          shapes?: ApiShape[]
          error?: string
          stack?: string
          env?: unknown
        }
        if (!r.ok || data.error) {
          console.error('[useShowcaseShapes] /api/geo-ai/shapes/showcase →', r.status, data.error ?? '', data.env ?? '', data.stack ?? '')
        }
        return data
      })
      .then((data: { shapes?: ApiShape[] }) => {
        if (cancelled || !data.shapes || data.shapes.length === 0) return
        const cols = typeof window !== 'undefined' && window.innerWidth < 768 ? 3 : 4
        const positions = computeGridPositions(data.shapes.length, 18, 18, cols)
        const built: ShowcaseItem[] = []
        data.shapes.forEach((shape, i) => {
          try {
            const spec: GeometrySpec = {
              shape: shape.shapeKey as GeometrySpec['shape'],
              params: { ...shape.params, unit: 'cm' },
              vertices: [],
              conditions: [],
            }
            const model = GeometryEngine.build(spec)
            built.push({
              model,
              label: shape.nameVi,
              position: positions[i] ?? ([0, 0, 0] as [number, number, number]),
              shapeKey: shape.shapeKey,
            })
          } catch {
            // skip shapes whose builder throws
          }
        })
        setItems(built)
      })
      .catch((err) => console.error('[useShowcaseShapes] fetch failed:', err))
    return () => { cancelled = true }
  }, [])

  return items
}
