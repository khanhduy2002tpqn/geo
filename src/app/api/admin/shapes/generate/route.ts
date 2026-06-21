import { NextResponse } from 'next/server'
import { z, ZodError } from 'zod'
import { checkAdminAuth, unauthorizedResponse } from '@/lib/adminAuth'
import { generateShapeRecord } from '@/lib/geo-ai/admin/generateShapeRecord'

export const runtime = 'nodejs'

const GenerateSchema = z.object({
  prompt: z.string().min(1).max(2000),
  shapeKey: z
    .string()
    .regex(/^[a-z0-9_]+$/, 'shapeKey chỉ gồm chữ thường, số và dấu gạch dưới')
    .optional(),
  grade: z.enum(['lop6', 'lop7', 'lop8', 'lop9']).optional(),
})

/**
 * POST /api/admin/shapes/generate
 * Generate a DRAFT ShapeRecord from a Vietnamese problem statement. Does NOT
 * persist — the teacher reviews/edits in the admin, then saves via POST/PUT.
 */
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
    const input = GenerateSchema.parse(body)
    const result = await generateShapeRecord(input)
    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof ZodError) {
      const message = error.issues.map((i) => i.message).join('; ')
      return NextResponse.json({ error: message }, { status: 400 })
    }
    const message = error instanceof Error ? error.message : 'Không thể tạo dữ liệu'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
