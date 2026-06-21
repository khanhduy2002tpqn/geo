import { NextResponse } from 'next/server'
import { checkAdminAuth, unauthorizedResponse } from '@/lib/adminAuth'
import { shapesRepository } from '@/db/repositories/shapesRepository'
import { invalidateShapeCache } from '@/lib/geo-ai/data/serverShapes'
import { CURRICULUM_SHAPES } from '@/lib/geo-ai/data/curriculum'

export const runtime = 'nodejs'

/**
 * POST /api/admin/shapes/curriculum-defaults
 * Bulk-set visibility: curriculum shapes → visible=1, all others → visible=0.
 * Idempotent — safe to re-run.
 */
export async function POST(request: Request): Promise<Response> {
  const auth = checkAdminAuth(request)
  if (!auth.ok) return unauthorizedResponse(auth.status)

  try {
    const summaries = await shapesRepository.findAllSummaries()

    await Promise.all(
      summaries.map((s) =>
        shapesRepository.setVisible(s.shapeKey, CURRICULUM_SHAPES.has(s.shapeKey)),
      ),
    )

    const version = await shapesRepository.bumpVersion()
    invalidateShapeCache()

    const visible = summaries.filter((s) => CURRICULUM_SHAPES.has(s.shapeKey)).map((s) => s.shapeKey)
    const hidden = summaries.filter((s) => !CURRICULUM_SHAPES.has(s.shapeKey)).map((s) => s.shapeKey)

    return NextResponse.json({ version, visible, hidden })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Lỗi không xác định'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
