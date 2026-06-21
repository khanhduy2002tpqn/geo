import { NextResponse } from 'next/server'
import { z } from 'zod'
import { GEOMETRY_EXAMPLES } from '@/lib/geo-ai/examples/examplesData'

export const runtime = 'nodejs'

// ---------------------------------------------------------------------------
// GET /api/geo-ai/examples
// Returns all example definitions with a hasGeometry flag derived from Turso.
// ---------------------------------------------------------------------------
export async function GET(): Promise<NextResponse> {
  let storedIds = new Set<string>()

  try {
    const { db } = await import('@/db/client')
    if (db) {
      const { geometryExamples } = await import('@/db/schema')
      const rows = await db
        .select({ id: geometryExamples.id })
        .from(geometryExamples)

      storedIds = new Set(rows.map((r) => r.id))
    }
  } catch {
    // DB unavailable — all examples report hasGeometry: false
  }

  const examples = GEOMETRY_EXAMPLES.map((ex) => ({
    id: ex.id,
    title: ex.title,
    description: ex.description,
    level: ex.level,
    hasGeometry: storedIds.has(ex.id),
  }))

  return NextResponse.json({ examples })
}

// ---------------------------------------------------------------------------
// POST /api/geo-ai/examples
// Body: { id: string }
// Returns { prompt } so the client can drive generation via the existing pipeline.
// If geometry is already stored in Turso, the geometry_json is also returned.
// ---------------------------------------------------------------------------
const PostSchema = z.object({
  id: z.string().min(1).max(200),
})

export async function POST(request: Request): Promise<NextResponse> {
  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = PostSchema.safeParse(payload)
  if (!parsed.success) {
    const message = parsed.error.issues.map((i) => i.message).join('; ')
    return NextResponse.json({ error: message }, { status: 400 })
  }

  const { id } = parsed.data

  const example = GEOMETRY_EXAMPLES.find((ex) => ex.id === id)
  if (!example) {
    return NextResponse.json({ error: `Unknown example id: ${id}` }, { status: 404 })
  }

  // Check Turso for an already-stored geometry_json
  try {
    const { db } = await import('@/db/client')
    if (db) {
      const { geometryExamples } = await import('@/db/schema')
      const { eq } = await import('drizzle-orm')

      const rows = await db
        .select()
        .from(geometryExamples)
        .where(eq(geometryExamples.id, id))
        .limit(1)

      const row = rows[0]
      if (row?.geometryJson) {
        return NextResponse.json({
          prompt: example.prompt,
          geometryJson: row.geometryJson,
        })
      }
    }
  } catch {
    // DB unavailable — fall through and return prompt only
  }

  // No stored geometry; return the prompt so the client can generate it
  return NextResponse.json({ prompt: example.prompt })
}
