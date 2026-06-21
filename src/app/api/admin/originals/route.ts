import { NextResponse } from 'next/server'
import { checkAdminAuth, unauthorizedResponse } from '@/lib/adminAuth'
import { shapesRepository } from '@/db/repositories/shapesRepository'

export const runtime = 'nodejs'

/** GET /api/admin/originals → the whole originals blob as raw JSON text. */
export async function GET(request: Request): Promise<Response> {
  const auth = checkAdminAuth(request)
  if (!auth.ok) return unauthorizedResponse(auth.status)
  try {
    const json = await shapesRepository.getOriginalsRaw()
    return NextResponse.json({ json })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Lỗi không xác định'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/** PUT /api/admin/originals → overwrite the whole originals blob. Body: { json }. */
export async function PUT(request: Request): Promise<Response> {
  const auth = checkAdminAuth(request)
  if (!auth.ok) return unauthorizedResponse(auth.status)

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const json = (body as { json?: unknown }).json
  if (typeof json !== 'string') {
    return NextResponse.json({ error: 'Thiếu trường "json" (chuỗi)' }, { status: 400 })
  }
  // Validate it parses to an object map
  try {
    const parsed = JSON.parse(json)
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return NextResponse.json({ error: 'JSON phải là object { shapeKey: record }' }, { status: 400 })
    }
  } catch (e) {
    return NextResponse.json(
      { error: `JSON không hợp lệ: ${e instanceof Error ? e.message : ''}` },
      { status: 400 },
    )
  }

  try {
    await shapesRepository.saveOriginalsRaw(json)
    return NextResponse.json({ ok: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Lỗi không xác định'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
