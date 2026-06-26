/**
 * Import the legacy shape library into the normalized Turso schema.
 *
 * Run: pnpm db:seed
 */

import { GeometryEngine } from '@/lib/geo-ai/geometry-engine'
import { recordFromModel, specFromFallback, type ShapeRecord } from '@/db/shapeRecord'
import { shapesRepository } from '@/db/repositories/shapesRepository'
import shapesDatabase from '@/lib/geo-ai/data/shapes-data.seed'
import type { ExampleDef, ShapesDatabase } from '@/lib/geo-ai/data/types'

async function main(): Promise<void> {
  const database = shapesDatabase as unknown as ShapesDatabase
  const examplesByShape = new Map<string, ExampleDef[]>()

  for (const example of database.examples) {
    const shape = database.shapes[example.shapeKey]
    if (!shape) {
      console.warn(`Skipping example ${example.id}: unknown shape ${example.shapeKey}`)
      continue
    }

    const normalized: ExampleDef = {
      ...example,
      shapeNameVi: example.shapeNameVi || shape.nameVi,
    }
    const examples = examplesByShape.get(example.shapeKey) ?? []
    examples.push(normalized)
    examplesByShape.set(example.shapeKey, examples)
  }

  const originals: Record<string, ShapeRecord> = {}
  let importedExamples = 0

  for (const [shapeKey, shape] of Object.entries(database.shapes)) {
    const model = GeometryEngine.build(specFromFallback(shape.fallbackSpec))
    const examples = examplesByShape.get(shapeKey) ?? []
    const record = recordFromModel(shapeKey, shape, model, examples)

    await shapesRepository.upsert(record)
    originals[shapeKey] = record
    importedExamples += examples.length
    console.log(`Imported ${shapeKey} (${examples.length} examples)`)
  }

  const savedOriginals = await shapesRepository.seedOriginalsIfAbsent(originals)
  const version = await shapesRepository.bumpVersion()

  console.log(`Imported ${Object.keys(originals).length} shapes and ${importedExamples} examples`)
  console.log(`Original snapshot: ${savedOriginals ? 'created' : 'already exists'}`)
  console.log(`shapes_version=${version}`)
}

main().catch((error) => {
  console.error('Seed failed:', error)
  process.exitCode = 1
})
