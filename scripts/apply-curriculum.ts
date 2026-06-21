/**
 * scripts/apply-curriculum.ts
 *
 * Set DB visibility: curriculum shapes visible=1, all others visible=0.
 * Insert any missing curriculum shapes using default geometry.
 *
 * Run: pnpm tsx --env-file=.env.local scripts/apply-curriculum.ts
 */

import { existsSync } from 'node:fs'
import { GeometryEngine } from '@/lib/geo-ai/geometry-engine/index'
import { shapesRepository } from '@/db/repositories/shapesRepository'
import { recordFromModel } from '@/db/shapeRecord'
import { CURRICULUM_SHAPES } from '@/lib/geo-ai/data/curriculum'
import type { ShapeData } from '@/lib/geo-ai/data/types'
import type { GeometrySpec } from '@/types/geo-ai'

const envFile = existsSync('.env.local') ? '.env.local' : '.env'
if (existsSync(envFile) && typeof process.loadEnvFile === 'function') {
  process.loadEnvFile(envFile)
}

interface CurriculumMeta {
  nameVi: string
  type: ShapeData['type']
  parserKeywords: string[]
  spec: GeometrySpec
}

const CURRICULUM_META: Record<string, CurriculumMeta> = {
  rectangular_prism: {
    nameVi: 'Hình hộp chữ nhật',
    type: 'polyhedron',
    parserKeywords: ['hình hộp chữ nhật', 'hộp chữ nhật', 'hình hộp'],
    spec: { shape: 'rectangular_prism', vertices: [], params: { a: 4, b: 3, h: 5 }, conditions: [] },
  },
  cube: {
    nameVi: 'Hình lập phương',
    type: 'polyhedron',
    parserKeywords: ['hình lập phương', 'lập phương'],
    spec: { shape: 'cube', vertices: [], params: { a: 4 }, conditions: [] },
  },
  triangular_prism: {
    nameVi: 'Hình lăng trụ đứng tam giác',
    type: 'polyhedron',
    parserKeywords: ['lăng trụ đứng', 'lăng trụ tam giác', 'hình lăng trụ'],
    spec: { shape: 'triangular_prism', vertices: [], params: { a: 4, h: 6 }, conditions: [] },
  },
  triangular_pyramid: {
    nameVi: 'Hình chóp tam giác đều',
    type: 'polyhedron',
    parserKeywords: ['chóp tam giác đều', 'hình chóp tam giác', 'tứ diện đều'],
    spec: { shape: 'triangular_pyramid', vertices: [], params: { a: 4, h: 5 }, conditions: [] },
  },
  square_pyramid: {
    nameVi: 'Hình chóp tứ giác đều',
    type: 'polyhedron',
    parserKeywords: ['chóp tứ giác đều', 'hình chóp tứ giác', 'hình chóp vuông'],
    spec: { shape: 'square_pyramid', vertices: [], params: { a: 4, h: 5 }, conditions: [] },
  },
  cylinder: {
    nameVi: 'Hình trụ',
    type: 'curved',
    parserKeywords: ['hình trụ', 'trụ tròn'],
    spec: { shape: 'cylinder', vertices: [], params: { r: 3, h: 5 }, conditions: [] },
  },
  cone: {
    nameVi: 'Hình nón',
    type: 'curved',
    parserKeywords: ['hình nón', 'nón tròn'],
    spec: { shape: 'cone', vertices: [], params: { r: 3, h: 5 }, conditions: [] },
  },
  sphere: {
    nameVi: 'Hình cầu',
    type: 'curved',
    parserKeywords: ['hình cầu', 'quả cầu', 'mặt cầu'],
    spec: { shape: 'sphere', vertices: [], params: { r: 3 }, conditions: [] },
  },
}

async function main(): Promise<void> {
  if (!process.env.TURSO_URL) {
    console.error('✗ TURSO_URL not set')
    process.exit(1)
  }

  // 1. Find which curriculum shapes are missing from DB
  const summaries = await shapesRepository.findAllSummaries()
  const existingKeys = new Set(summaries.map((s) => s.shapeKey))

  console.log(`DB has ${existingKeys.size} shapes. Curriculum: ${CURRICULUM_SHAPES.size} shapes.\n`)

  // 2. Insert missing curriculum shapes
  for (const shapeKey of CURRICULUM_SHAPES) {
    if (existingKeys.has(shapeKey)) continue
    const meta = CURRICULUM_META[shapeKey]
    if (!meta) { console.warn(`  ⚠ No meta for ${shapeKey} — skipping insert`); continue }

    try {
      const model = GeometryEngine.build(meta.spec)
      const vCount = Object.keys(model.vertices).length
      const euler = model.faces.length > 0
        ? vCount - model.edges.length + model.faces.length
        : null
      const shapeData: ShapeData = {
        nameVi: meta.nameVi,
        type: meta.type,
        level: 'cap2',
        visible: true,
        parserKeywords: meta.parserKeywords,
        fallbackSpec: {
          shape: shapeKey,
          vertices: [],
          params: meta.spec.params as Record<string, number>,
          conditions: [],
        },
        topology: { vertices: vCount, edges: model.edges.length, faces: model.faces.length, euler },
        formulas: {},
        suggestedQuestions: [],
      }
      const record = recordFromModel(shapeKey, shapeData, model, [])
      await shapesRepository.upsert(record)
      console.log(`  ✓ Added   ${shapeKey.padEnd(24)} (${vCount}v ${model.edges.length}e ${model.faces.length}f)`)
    } catch (e) {
      console.warn(`  ✗ Failed  ${shapeKey}: ${e instanceof Error ? e.message : e}`)
    }
  }

  // 3. Set visibility for ALL shapes (curriculum=1, others=0)
  const allSummaries = await shapesRepository.findAllSummaries()
  console.log(`\nSetting visibility for ${allSummaries.length} shapes:`)

  for (const s of allSummaries) {
    const visible = CURRICULUM_SHAPES.has(s.shapeKey)
    await shapesRepository.setVisible(s.shapeKey, visible)
    console.log(`  ${visible ? '● ' : '○ '}${s.shapeKey}`)
  }

  const version = await shapesRepository.bumpVersion()
  console.log(`\nDone. shapes_version=${version}`)
  process.exit(0)
}

main().catch((e) => {
  console.error('Failed:', e)
  process.exit(1)
})
