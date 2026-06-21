import { NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { checkAdminAuth, unauthorizedResponse } from '@/lib/adminAuth'
import { shapesRepository } from '@/db/repositories/shapesRepository'
import { parseShapeRecord } from '@/lib/geo-ai/admin/shapeRecordSchema'
import { invalidateShapeCache } from '@/lib/geo-ai/data/serverShapes'

export const runtime = 'nodejs'

function zodMessage(error: ZodError): string {
  return error.issues.map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`).join('; ')
}

/** GET /api/admin/shapes → summaries list + current version. */
export async function GET(request: Request): Promise<Response> {
  const auth = checkAdminAuth(request)
  if (!auth.ok) return unauthorizedResponse(auth.status)

  try {
    const [shapes, version] = await Promise.all([
      shapesRepository.findAllSummaries(),
      shapesRepository.getVersion(),
    ])
    return NextResponse.json({ shapes, version })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Lỗi không xác định'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/** POST /api/admin/shapes → create a new shape record. */
export async function POST(request: Request): Promise<Response> {
  const auth = checkAdminAuth(request)
  if (!auth.ok) return unauthorizedResponse(auth.status)

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  try {
    const record = parseShapeRecord(body)
    const existing = await shapesRepository.findByKey(record.shapeKey)
    if (existing) {
      return NextResponse.json(
        { error: `Hình "${record.shapeKey}" đã tồn tại` },
        { status: 409 },
      )
    }
    await shapesRepository.upsert(record)
    const version = await shapesRepository.bumpVersion()
    invalidateShapeCache(record.shapeKey)
    return NextResponse.json({ shapeKey: record.shapeKey, version }, { status: 201 })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: zodMessage(error) }, { status: 400 })
    }
    const message = error instanceof Error ? error.message : 'Lỗi không xác định'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
