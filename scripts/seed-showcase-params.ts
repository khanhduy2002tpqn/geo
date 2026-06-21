// Seed showcase visual params into geometry_shapes.fallback_spec.
// These params produce visually balanced shapes for the 3×3 showcase grid.
//
// Run: tsx --env-file=.env.local scripts/seed-showcase-params.ts

import { eq } from 'drizzle-orm'
import { db } from '../src/db/client'
import { geometryShapes } from '../src/db/schema'

if (!db) {
  console.error('TURSO_URL not configured — cannot seed')
  process.exit(1)
}

// Visual params tuned so each shape fills roughly the same apparent volume.
const SHOWCASE_PARAMS: Record<string, Record<string, number>> = {
  cube:               { a: 2 },
  cylinder:           { r: 1.4, h: 1.6 },
  cone:               { r: 1.2, h: 2.5 },
  sphere:             { r: 1.2 },
  square_pyramid:     { a: 2.2, h: 2.5 },
  rectangular_prism:  { a: 2.5, b: 1.5, h: 1.5 },
  triangular_prism:   { a: 2,   h: 2 },
  triangular_pyramid: { a: 2.2, h: 2.5 },
  tetrahedron:        { a: 2.2 },
}

let seeded = 0
let skipped = 0

for (const [shapeKey, params] of Object.entries(SHOWCASE_PARAMS)) {
  const [row] = await db
    .select({ fallbackSpec: geometryShapes.fallbackSpec })
    .from(geometryShapes)
    .where(eq(geometryShapes.shapeKey, shapeKey))
    .limit(1)

  if (!row) {
    console.warn(`  ⚠  "${shapeKey}" not in DB — skipping`)
    skipped++
    continue
  }

  const spec = JSON.parse(row.fallbackSpec) as Record<string, unknown>
  const merged = { ...spec, params: { ...(spec.params as Record<string, number> ?? {}), ...params } }

  await db
    .update(geometryShapes)
    .set({ fallbackSpec: JSON.stringify(merged) })
    .where(eq(geometryShapes.shapeKey, shapeKey))

  console.log(`  ✓  ${shapeKey}: ${JSON.stringify(params)}`)
  seeded++
}

console.log(`\nDone — ${seeded} seeded, ${skipped} skipped.`)
