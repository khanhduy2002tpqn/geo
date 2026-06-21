import { NextResponse } from 'next/server'
import { shapesRepository } from '@/db/repositories/shapesRepository'

export const runtime = 'nodejs'

/**
 * GET /api/geo-ai/shapes
 * Public catalog: lightweight shape summaries + all examples + current version.
 * Feeds the frontend cache (shape picker, example library).
 *
 * NOTE: calls the repository directly (not the swallowing serverShapes
 * wrappers) so any Turso/config error surfaces as a JSON 500 with a real
 * message + stack instead of an opaque HTML 500. Revert to serverShapes once
 * the prod issue is resolved if graceful empty-fallback is preferred.
 */
export async function GET(): Promise<Response> {
  try {
    const [shapes, examples, version] = await Promise.all([
      shapesRepository.findAllSummaries(),
      shapesRepository.findAllExamples(),
      shapesRepository.getVersion(),
    ])
    return NextResponse.json({ shapes, examples, version })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    const stack = error instanceof Error ? error.stack : undefined
    console.error('[api/geo-ai/shapes] failed:', error)
    return NextResponse.json(
      {
        error: message,
        stack,
        env: {
          hasTursoUrl: Boolean(process.env.TURSO_URL),
          hasTursoToken: Boolean(process.env.TURSO_AUTH_TOKEN),
        },
      },
      { status: 500 },
    )
  }
}
