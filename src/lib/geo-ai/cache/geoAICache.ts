/**
 * 4-level geometry resolution waterfall:
 *
 *   L1: in-process LRU (memory)
 *   L2: browser localStorage (7-day TTL)
 *   L3: Turso DB (persistent server cache)
 *   L4: DeepSeek API → parse intent → build geometry model
 *
 * Falls back to local keyword templates when DeepSeek is unavailable.
 */

import type { GeometryModel, GeometrySpec } from '@/types/geo-ai'
import { LruCache } from '@/services/cache/memoryCache'
import { localStorageCache } from './localStorageCache'
import { callDeepSeek } from '../parser/deepseek'
import { parseIntent, parseGeoDataToModel, type GeoDataRaw } from '../parser/intentParser'
import { matchFallback } from '../parser/fallbackTemplates'
import { logger } from '@/lib/logger'

// ---------------------------------------------------------------------------
// Lazy geometry-engine builder import — avoids hard dependency at module load
// ---------------------------------------------------------------------------
type BuildFn = (spec: GeometrySpec) => GeometryModel

async function loadBuilder(spec: GeometrySpec): Promise<BuildFn | null> {
  try {
    switch (spec.shape) {
      case 'square_pyramid':
      case 'general_pyramid': {
        const m = await import('../geometry-engine/shapes/pyramid')
        return m.buildPyramid
      }
      case 'triangular_pyramid': {
        const m = await import('../geometry-engine/shapes/triangularPyramid')
        return m.buildTriangularPyramid
      }
      case 'cube': {
        const m = await import('../geometry-engine/shapes/cube')
        return m.buildCube
      }
      case 'rectangular_prism': {
        const m = await import('../geometry-engine/shapes/rectangularPrism')
        return m.buildRectangularPrism
      }
      case 'triangular_prism': {
        const m = await import('../geometry-engine/shapes/prism')
        return m.buildPrism
      }
      case 'tetrahedron': {
        const m = await import('../geometry-engine/shapes/tetrahedron')
        return m.buildTetrahedron
      }
      case 'cylinder': {
        const m = await import('../geometry-engine/shapes/cylinder')
        return m.buildCylinder
      }
      case 'cone': {
        const m = await import('../geometry-engine/shapes/cone')
        return m.buildCone
      }
      case 'sphere': {
        const m = await import('../geometry-engine/shapes/sphere')
        return m.buildSphere
      }
      case 'hyperboloid':
      case 'paraboloid':
        // No dedicated builder for curved surfaces; return null to surface a clear error
        return null
      default:
        return null
    }
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Prompt hash (fast djb2-style, no crypto dependency needed)
// ---------------------------------------------------------------------------
function hashPrompt(prompt: string): string {
  const normalized = prompt.toLowerCase().replace(/\s+/g, ' ').trim()
  let h = 0
  for (const c of normalized) {
    h = (Math.imul(31, h) + c.charCodeAt(0)) | 0
  }
  return h.toString(36)
}

// ---------------------------------------------------------------------------
// L1: in-process LRU (100 entries)
// ---------------------------------------------------------------------------
const memCache = new LruCache<{ spec: GeometrySpec; model: GeometryModel }>(100)

// ---------------------------------------------------------------------------
// L3: Turso DB helpers (server-side only)
// ---------------------------------------------------------------------------
async function dbGet(
  hash: string
): Promise<{ spec: GeometrySpec; model: GeometryModel } | null> {
  try {
    const { db } = await import('@/db/client')
    if (!db) return null

    const { geometryCache } = await import('@/db/schema')
    const { eq } = await import('drizzle-orm')

    const rows = await db
      .select()
      .from(geometryCache)
      .where(eq(geometryCache.hash, hash))
      .limit(1)

    const row = rows[0]
    if (!row) return null

    const spec = parseIntent(row.spec)
    if (!spec) return null
    const model = JSON.parse(row.model) as GeometryModel
    return { spec, model }
  } catch {
    return null
  }
}

async function dbSet(
  hash: string,
  prompt: string,
  spec: GeometrySpec,
  model: GeometryModel
): Promise<void> {
  try {
    const { db } = await import('@/db/client')
    if (!db) return

    const { geometryCache } = await import('@/db/schema')

    await db
      .insert(geometryCache)
      .values({
        hash,
        prompt,
        spec: JSON.stringify(spec),
        model: JSON.stringify(model),
      })
      .onConflictDoNothing()
  } catch {
    // Swallow DB errors — cache is best-effort
  }
}

// ---------------------------------------------------------------------------
// GEO_DATA format detection
// ---------------------------------------------------------------------------

/**
 * Returns true when the parsed JSON looks like the new rich GEO_DATA format
 * (vertices are objects with x/y/z numbers) rather than the old format
 * (vertices is an array of strings).
 */
function isGeoDataFormat(json: unknown): json is GeoDataRaw {
  if (typeof json !== 'object' || json === null) return false
  const obj = json as Record<string, unknown>
  if (!obj.vertices || typeof obj.vertices !== 'object') return false
  // Old format: vertices is an array of strings ["A","B","C"]
  if (Array.isArray(obj.vertices)) return false
  const verts = obj.vertices as Record<string, unknown>
  const first = Object.values(verts)[0]
  // New format: each vertex is an object with {x, y, z}
  return first !== null && typeof first === 'object' && 'x' in (first as object)
}

// ---------------------------------------------------------------------------
// L4: resolve via DeepSeek or fallback templates
// ---------------------------------------------------------------------------

/**
 * Resolve via AI.  Returns either:
 * - { kind: 'model', model } when the new GEO_DATA format is detected, or
 * - { kind: 'spec',  spec  } when the old GeometrySpec format is returned.
 * Falls back to keyword templates when DeepSeek is unavailable.
 */
async function resolveViaAI(
  prompt: string
): Promise<{ kind: 'model'; model: GeometryModel } | { kind: 'spec'; spec: GeometrySpec } | null> {
  try {
    const rawText = await callDeepSeek(prompt)

    // Strip potential markdown fences before JSON.parse
    const stripped = rawText.replace(/```(?:json)?\s*/gi, '').replace(/```/g, '').trim()
    const jsonStart = stripped.indexOf('{')
    const jsonStr = jsonStart !== -1 ? stripped.slice(jsonStart) : stripped

    let parsed: unknown
    try {
      parsed = JSON.parse(jsonStr)
    } catch {
      parsed = null
    }

    if (parsed !== null && isGeoDataFormat(parsed)) {
      const model = parseGeoDataToModel(parsed, prompt)
      return { kind: 'model', model }
    }

    // Fall back to old spec parser
    const spec = parseIntent(rawText)
    if (spec) return { kind: 'spec', spec }
  } catch {
    // DeepSeek unavailable — fall through to keyword fallback
  }

  const spec = await matchFallback(prompt)
  if (spec) return { kind: 'spec', spec }
  return null
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Resolve a Vietnamese geometry prompt to a fully built GeometryModel.
 *
 * Resolution order: memory LRU → localStorage → Turso → DeepSeek/fallback.
 * All resolved results are stored back into higher-level caches.
 *
 * Throws only when the geometry cannot be resolved at any level.
 */
export async function resolveGeometry(prompt: string): Promise<GeometryModel> {
  const hash = hashPrompt(prompt)

  // L1: memory (always fresh — rebuilt from spec on L3 hits below)
  const memHit = memCache.get(hash)
  if (memHit) return memHit.model

  // L2: localStorage (browser only — no-op on server)
  const lsHit = localStorageCache.get(hash)
  if (lsHit) {
    memCache.set(hash, lsHit)
    return lsHit.model
  }

  // L3: Turso DB — rebuild model from spec to pick up builder improvements
  const dbHit = await dbGet(hash)
  if (dbHit) {
    let { spec, model } = dbHit
    const buildFn = await loadBuilder(spec)
    if (buildFn) {
      try {
        model = buildFn(spec)
      } catch {
        // builder failed — use cached model as-is
      }
    }
    memCache.set(hash, { spec, model })
    localStorageCache.set(hash, spec, model)
    return model
  }

  // L4: AI resolution
  const aiResult = await resolveViaAI(prompt)
  if (!aiResult) {
    logger.warn('Unable to resolve geometry for prompt', { hash, promptLength: prompt.length })
    throw new Error('Unable to resolve geometry for the given prompt')
  }

  let spec: GeometrySpec
  let model: GeometryModel

  if (aiResult.kind === 'model') {
    // New GEO_DATA path: model is already built from rich coordinates
    model = aiResult.model
    spec = model.spec
  } else {
    // Old path: build model from spec via geometry engine
    spec = aiResult.spec
    const buildFn = await loadBuilder(spec)
    if (!buildFn) {
      throw new Error(`No geometry builder available for shape: "${spec.shape}"`)
    }
    model = buildFn(spec)
  }

  // Write back to all cache levels
  memCache.set(hash, { spec, model })
  localStorageCache.set(hash, spec, model)
  await dbSet(hash, prompt, spec, model)

  return model
}
