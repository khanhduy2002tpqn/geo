import { NextResponse } from 'next/server'
import { checkAdminAuth, unauthorizedResponse } from '@/lib/adminAuth'
import { shapesRepository } from '@/db/repositories/shapesRepository'
import { GeometryEngine } from '@/lib/geo-ai/geometry-engine/index'
import { specFromFallback } from '@/db/shapeRecord'
import type { ShapeRecord } from '@/db/shapeRecord'
import { invalidateShapeCache } from '@/lib/geo-ai/data/serverShapes'

export const runtime = 'nodejs'

type Ctx = { params: Promise<{ shapeKey: string }> }

/**
 * POST /api/admin/shapes/[shapeKey]/rebuild
 * Re-run the geometry engine from the stored fallbackSpec and replace the
 * coordinate data (vertices/edges/faces/specialPoints/measurements/topology),
 * preserving the teaching content. Useful after editing the spec/params.
 */
export async function POST(request: Request, ctx: Ctx): Promise<Response> {
  const auth = checkAdminAuth(request)
  if (!auth.ok) return unauthorizedResponse(auth.status)

  const { shapeKey } = await ctx.params
  try {
    const record = await shapesRepository.findByKey(shapeKey)
    if (!record) return NextResponse.json({ error: 'Không tìm thấy hình' }, { status: 404 })

    const model = GeometryEngine.build(specFromFallback(record.fallbackSpec))
    const euler =
      model.faces.length > 0
        ? Object.keys(model.vertices).length - model.edges.length + model.faces.length
        : null

    const rebuilt: ShapeRecord = {
      ...record,
      topology: {
        vertices: Object.keys(model.vertices).length,
        edges: model.edges.length,
        faces: model.faces.length,
        euler,
      },
      vertices: Object.values(model.vertices),
      edges: model.edges,
      faces: model.faces,
      specialPoints: model.specialPoints,
      measurements: model.measurements,
      modelConstructionSteps: model.constructionSteps,
      surfaceType: model.surfaceType,
    }

    await shapesRepository.upsert(rebuilt)
    const version = await shapesRepository.bumpVersion()
    invalidateShapeCache(shapeKey)
    return NextResponse.json({ record: rebuilt, version })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Lỗi không xác định'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
