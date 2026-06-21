'use client'

// React hooks for the Turso-backed shape library. Each hook bootstraps
// synchronously from the static file (instant first paint, offline-safe) then
// refreshes from Turso via shapesStore (cached per version).

import { useEffect, useState } from 'react'
import { loadCatalog, loadShape, refreshVersion, subscribe } from '@/lib/geo-ai/data/shapesStore'
import { getShape as fileGetShape, getAllExamples as fileGetAllExamples } from '@/lib/geo-ai/data/index'
import { shapeDataFromRecord } from '@/db/shapeRecord'
import type { ExampleDef, ShapeData } from '@/lib/geo-ai/data/types'

/** ShapeData for a key — file bootstrap, then refreshed from Turso. */
export function useShapeData(shapeKey?: string): ShapeData | undefined {
  const [data, setData] = useState<ShapeData | undefined>(() =>
    shapeKey ? fileGetShape(shapeKey) : undefined,
  )

  useEffect(() => {
    if (!shapeKey) {
      setData(undefined)
      return
    }
    let alive = true
    const run = () => {
      loadShape(shapeKey)
        .then((record) => {
          if (alive && record) setData(shapeDataFromRecord(record))
        })
        .catch(() => {
          /* keep file fallback */
        })
    }
    // bootstrap immediately from file so render never blocks
    setData(fileGetShape(shapeKey))
    run()
    const unsub = subscribe(run) // reload when server version changes
    return () => {
      alive = false
      unsub()
    }
  }, [shapeKey])

  return data
}

/** All examples — file bootstrap, then refreshed from Turso. */
export function useExamples(): ExampleDef[] {
  const [examples, setExamples] = useState<ExampleDef[]>(() => fileGetAllExamples())

  useEffect(() => {
    let alive = true
    const run = () => {
      loadCatalog()
        .then((catalog) => {
          if (alive && catalog.examples.length) setExamples(catalog.examples)
        })
        .catch(() => {
          /* keep file fallback */
        })
    }
    // Force version re-check on mount so admin visibility changes propagate
    // without requiring a full page reload.
    refreshVersion().then(run).catch(run)
    const unsub = subscribe(run) // reload when server version changes
    return () => {
      alive = false
      unsub()
    }
  }, [])

  return examples
}
