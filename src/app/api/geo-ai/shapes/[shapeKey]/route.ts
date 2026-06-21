import { NextResponse } from 'next/server'
import { getShapeRecord, getShapesVersion } from '@/lib/geo-ai/data/serverShapes'

export const runtime = 'nodejs'

type Ctx = { params: Promise<{ shapeKey: string }> }

/**
 * GET /api/geo-ai/shapes/[shapeKey]
 * Public: full ShapeRecord (Turso, file fallback) + version stamp.
 */
export async function GET(_request: Request, ctx: Ctx): Promise<Response> {
  const { shapeKey } = await ctx.params
  try {
    const [record, version] = await Promise.all([getShapeRecord(shapeKey), getShapesVersion()])
    if (!record) return NextResponse.json({ error: 'Không tìm thấy hình' }, { status: 404 })
    return NextResponse.json({ record, version })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Lỗi không xác định'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
