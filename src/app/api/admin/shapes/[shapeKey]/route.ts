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

type Ctx = { params: Promise<{ shapeKey: string }> }

/** GET /api/admin/shapes/[shapeKey] → full record. */
export async function GET(request: Request, ctx: Ctx): Promise<Response> {
  const auth = checkAdminAuth(request)
  if (!auth.ok) return unauthorizedResponse(auth.status)

  const { shapeKey } = await ctx.params
  try {
    const record = await shapesRepository.findByKey(shapeKey)
    if (!record) return NextResponse.json({ error: 'Không tìm thấy hình' }, { status: 404 })
    return NextResponse.json({ record })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Lỗi không xác định'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/** PUT /api/admin/shapes/[shapeKey] → update existing record. */
export async function PUT(request: Request, ctx: Ctx): Promise<Response> {
  const auth = checkAdminAuth(request)
  if (!auth.ok) return unauthorizedResponse(auth.status)

  const { shapeKey } = await ctx.params
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  try {
    const record = parseShapeRecord(body)
    if (record.shapeKey !== shapeKey) {
      return NextResponse.json(
        { error: 'shapeKey trong body không khớp với URL' },
        { status: 400 },
      )
    }
    await shapesRepository.upsert(record)
    const version = await shapesRepository.bumpVersion()
    invalidateShapeCache(shapeKey)
    return NextResponse.json({ shapeKey, version })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: zodMessage(error) }, { status: 400 })
    }
    const message = error instanceof Error ? error.message : 'Lỗi không xác định'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/** PATCH /api/admin/shapes/[shapeKey] → partial update (e.g. visible toggle). */
export async function PATCH(request: Request, ctx: Ctx): Promise<Response> {
  const auth = checkAdminAuth(request)
  if (!auth.ok) return unauthorizedResponse(auth.status)

  const { shapeKey } = await ctx.params
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  try {
    const { visible } = body as { visible?: boolean }
    if (typeof visible === 'boolean') {
      await shapesRepository.setVisible(shapeKey, visible)
      const version = await shapesRepository.bumpVersion()
      invalidateShapeCache(shapeKey)
      return NextResponse.json({ shapeKey, visible, version })
    }
    return NextResponse.json({ error: 'Không có field nào hợp lệ để cập nhật' }, { status: 400 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Lỗi không xác định'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/** DELETE /api/admin/shapes/[shapeKey]. */
export async function DELETE(request: Request, ctx: Ctx): Promise<Response> {
  const auth = checkAdminAuth(request)
  if (!auth.ok) return unauthorizedResponse(auth.status)

  const { shapeKey } = await ctx.params
  try {
    await shapesRepository.delete(shapeKey)
    const version = await shapesRepository.bumpVersion()
    invalidateShapeCache(shapeKey)
    return NextResponse.json({ shapeKey, version })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Lỗi không xác định'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
