import { NextResponse } from 'next/server'
import { checkAdminAuth, unauthorizedResponse } from '@/lib/adminAuth'
import { shapesRepository } from '@/db/repositories/shapesRepository'
import { invalidateShapeCache } from '@/lib/geo-ai/data/serverShapes'

export const runtime = 'nodejs'

type Ctx = { params: Promise<{ shapeKey: string }> }

/**
 * POST /api/admin/shapes/[shapeKey]/reset
 * Restore a shape to its original snapshot (from the originals blob).
 */
export async function POST(request: Request, ctx: Ctx): Promise<Response> {
  const auth = checkAdminAuth(request)
  if (!auth.ok) return unauthorizedResponse(auth.status)

  const { shapeKey } = await ctx.params
  try {
    const original = await shapesRepository.getOriginal(shapeKey)
    if (!original) {
      return NextResponse.json({ error: 'Không có dữ liệu gốc cho hình này' }, { status: 404 })
    }
    await shapesRepository.upsert(original)
    const version = await shapesRepository.bumpVersion()
    invalidateShapeCache(shapeKey)
    return NextResponse.json({ record: original, version })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Lỗi không xác định'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
