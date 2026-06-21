/**
 * scripts/extract-topology.ts
 *
 * Runs the actual geometry engine for each shape to extract real vertex/edge/face IDs.
 * Outputs JSON to stdout — consumed by update-experiments.mjs.
 *
 * Run: npx tsx scripts/extract-topology.ts
 */

import { GeometryEngine } from '../src/lib/geo-ai/geometry-engine/index'
import type { GeometrySpec } from '../src/types/geo-ai'

const SPECS: Record<string, GeometrySpec> = {
  cylinder:          { shape: 'cylinder',          params: { r: 1, h: 2 }, vertices: [] },
  cone:              { shape: 'cone',               params: { r: 1, h: 2 }, vertices: [] },
  cube:              { shape: 'cube',               params: { a: 2 },       vertices: [] },
  rectangular_prism: { shape: 'rectangular_prism',  params: { a: 2, b: 1.5, h: 1 }, vertices: [] },
  square_pyramid:    { shape: 'square_pyramid',     params: { a: 2, h: 2 }, vertices: [] },
  triangular_pyramid:{ shape: 'triangular_pyramid', params: { a: 2, h: 2 }, vertices: [] },
  triangular_prism:  { shape: 'triangular_prism',   params: { a: 2, h: 2 }, vertices: [] },
  sphere:            { shape: 'sphere',             params: { r: 1 },       vertices: [] },
}

const topology: Record<string, {
  vertices: string[]
  edges: string[]
  faces: string[]
  edgesByType: Record<string, string[]>
  facesByType: Record<string, string[]>
}> = {}

for (const [key, spec] of Object.entries(SPECS)) {
  try {
    const model = GeometryEngine.build(spec)

    const edgesByType: Record<string, string[]> = {}
    for (const e of model.edges) {
      const bucket = edgesByType[e.type] ?? []
      bucket.push(e.id)
      edgesByType[e.type] = bucket
    }

    const facesByType: Record<string, string[]> = {}
    for (const f of model.faces) {
      const bucket = facesByType[f.type] ?? []
      bucket.push(f.id)
      facesByType[f.type] = bucket
    }

    topology[key] = {
      vertices: Object.keys(model.vertices),
      edges: model.edges.map(e => e.id),
      faces: model.faces.map(f => f.id),
      edgesByType,
      facesByType,
    }
  } catch (err) {
    process.stderr.write(`Failed to build ${key}: ${err}\n`)
    topology[key] = { vertices: [], edges: [], faces: [], edgesByType: {}, facesByType: {} }
  }
}

process.stdout.write(JSON.stringify(topology, null, 2))
