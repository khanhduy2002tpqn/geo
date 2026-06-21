// src/lib/geo-ai/data/serverShapes.ts
// Server-only shape library loader. Reads from Turso (via shapesRepository) with
// an in-process LRU. Returns null / empty when Turso is unavailable.

import { LruCache } from '@/services/cache/memoryCache'
import { shapesRepository } from '@/db/repositories/shapesRepository'
import { type ShapeRecord, type ShapeSummary } from '@/db/shapeRecord'
import type { ExampleDef } from './types'

const recordCache = new LruCache<ShapeRecord>(64)

/** Full record for a shape — Turso only. Cached in-process. */
export async function getShapeRecord(shapeKey: string): Promise<ShapeRecord | null> {
  const cached = recordCache.get(shapeKey)
  if (cached) return cached

  try {
    const record = await shapesRepository.findByKey(shapeKey)
    if (record) {
      recordCache.set(shapeKey, record)
      return record
    }
  } catch {
    // Turso unavailable
  }

  return null
}

export async function getAllSummaries(): Promise<ShapeSummary[]> {
  try {
    return await shapesRepository.findAllSummaries()
  } catch {
    return []
  }
}

export async function getAllExamplesServer(): Promise<ExampleDef[]> {
  try {
    return await shapesRepository.findAllExamples()
  } catch {
    return []
  }
}

export async function getShapesVersion(): Promise<number> {
  try {
    return await shapesRepository.getVersion()
  } catch {
    return 0
  }
}

/** Invalidate the in-process record cache (call after admin mutations). */
export function invalidateShapeCache(shapeKey?: string): void {
  if (shapeKey) recordCache.delete(shapeKey)
  else recordCache.clear()
}
