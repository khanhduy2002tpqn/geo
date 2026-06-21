import { NextResponse } from 'next/server'
import { shapesRepository } from '@/db/repositories/shapesRepository'

export const runtime = 'nodejs'

/** GET /api/geo-ai/shapes/version → cheap freshness check for the frontend cache. */
export async function GET(): Promise<Response> {
  try {
    const version = await shapesRepository.getVersion()
    return NextResponse.json({ version })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    const stack = error instanceof Error ? error.stack : undefined
    console.error('[api/geo-ai/shapes/version] failed:', error)
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
