import { NextResponse } from 'next/server'
import { shapesRepository } from '@/db/repositories/shapesRepository'

export const runtime = 'nodejs'

/**
 * GET /api/geo-ai/shapes/showcase
 * Returns the ordered list of visible shapes with their visual params for the 3×3 showcase grid.
 */
export async function GET(): Promise<Response> {
  try {
    const shapes = await shapesRepository.findShowcase()
    return NextResponse.json({ shapes })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    const stack = error instanceof Error ? error.stack : undefined
    console.error('[api/geo-ai/shapes/showcase] failed:', error)
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
