import { NextResponse } from 'next/server'
import { z } from 'zod'
import { resolveGeometry } from '@/lib/geo-ai/cache/geoAICache'
import { LruCache } from '@/services/cache/memoryCache'

export const runtime = 'nodejs'

// ---------------------------------------------------------------------------
// Rate limiting — tighter limit because each miss triggers an expensive
// AI call through the 4-level cache waterfall.
// ---------------------------------------------------------------------------
const RATE_WINDOW_MS = 60_000
const RATE_MAX = 60 // requests per minute per IP

const globalForRate = globalThis as unknown as { __geoAiParseRateCache?: LruCache<number[]> }
const rateCounts: LruCache<number[]> =
  globalForRate.__geoAiParseRateCache ??
  (globalForRate.__geoAiParseRateCache = new LruCache(2000))

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const timestamps = (rateCounts.get(ip) ?? []).filter((t) => now - t < RATE_WINDOW_MS)
  if (timestamps.length >= RATE_MAX) {
    rateCounts.set(ip, timestamps)
    return true
  }
  timestamps.push(now)
  rateCounts.set(ip, timestamps)
  return false
}

const ParseSchema = z.object({
  prompt: z.string().min(1).max(2000),
})

/**
 * POST /api/geo-ai/parse
 * Resolve a Vietnamese geometry prompt to a fully built GeometryModel.
 * Uses a 4-level cache waterfall: memory LRU → localStorage → Turso → DeepSeek/fallback.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const ip =
    request.headers.get('x-real-ip') ??
    request.headers.get('x-forwarded-for')?.split(',').at(-1)?.trim() ??
    'unknown'
  if (isRateLimited(ip)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = ParseSchema.safeParse(payload)
  if (!parsed.success) {
    const message = parsed.error.issues.map(i => i.message).join('; ')
    return NextResponse.json({ error: message }, { status: 400 })
  }

  const { prompt } = parsed.data

  try {
    const model = await resolveGeometry(prompt)

    // Extract measurement unit from prompt text and inject into spec
    // e.g. "cạnh 4 cm" → unit = 'cm'
    const unitMatch = prompt.match(/\b(\d+(?:[,.]\d+)?)\s*(mm|cm|dm|m)\b/i)
    const unit = unitMatch?.[2]?.toLowerCase()
    if (unit && !model.spec.params.unit) {
      // Shallow clone to avoid mutating cached object
      const patchedModel = {
        ...model,
        spec: { ...model.spec, params: { ...model.spec.params, unit } },
      }
      return NextResponse.json({ model: patchedModel })
    }

    return NextResponse.json({ model })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Không thể tạo mô hình hình học'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
