// src/lib/geo-ai/data/shapesStore.ts
// Client-side shape cache. Fetches the library from the public API and caches it
// in memory + localStorage, gated by a server version stamp so a tab hits the DB
// at most once per shape per version. The static shapes-data.ts (via data/index)
// is used as the synchronous bootstrap/offline fallback by the hooks layer.

import type { ExampleDef } from './types'
import type { ShapeRecord, ShapeSummary } from '@/db/shapeRecord'
import { shapeDataFromRecord } from '@/db/shapeRecord'
import { registerShapeData, registerExamples } from './index'

/** Push a freshly resolved record into the sync accessor registry (data/index). */
function hydrateRecord(record: ShapeRecord): void {
  try {
    registerShapeData(record.shapeKey, shapeDataFromRecord(record))
  } catch {
    // non-fatal
  }
}

const VERSION_LS = 'geo-ai-shapes-version'
const CATALOG_LS = 'geo-ai-shapes-catalog'
const SHAPE_LS_PREFIX = 'geo-ai-shape-'

interface Catalog {
  version: number
  summaries: ShapeSummary[]
  examples: ExampleDef[]
}

const recordMem = new Map<string, ShapeRecord>()
let catalogMem: Catalog | null = null
let versionPromise: Promise<number> | null = null

const hasWindow = (): boolean => typeof window !== 'undefined'

function lsGet(key: string): string | null {
  if (!hasWindow()) return null
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}
function lsSet(key: string, value: string): void {
  if (!hasWindow()) return
  try {
    window.localStorage.setItem(key, value)
  } catch {
    // quota / privacy mode — ignore
  }
}
function lsRemove(key: string): void {
  if (!hasWindow()) return
  try {
    window.localStorage.removeItem(key)
  } catch {
    // ignore
  }
}
function lsGetJson<T>(key: string): T | null {
  const raw = lsGet(key)
  if (!raw) return null
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) {
    // Surface the server's real error (message + stack + env flags) instead of
    // only the status — the route now returns JSON diagnostics on 500.
    let detail = ''
    try {
      const body = (await res.json()) as { error?: string; stack?: string; env?: unknown }
      if (body?.error) {
        detail = ` — ${body.error}`
        console.error(`[shapesStore] ${url} → ${res.status}:`, body.error, body.env ?? '', body.stack ?? '')
      }
    } catch {
      // non-JSON error body (e.g. HTML 500) — nothing extra to extract
    }
    throw new Error(`GET ${url} → ${res.status}${detail}`)
  }
  return (await res.json()) as T
}

/** Remove all per-shape localStorage entries (on version change). */
function purgeShapeEntries(): void {
  if (!hasWindow()) return
  try {
    const keys: string[] = []
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i)
      if (k && k.startsWith(SHAPE_LS_PREFIX)) keys.push(k)
    }
    keys.forEach((k) => window.localStorage.removeItem(k))
  } catch {
    // ignore
  }
}

let knownVersion: number | null = null

// Subscribers (hooks) re-run their loaders when the version changes.
const listeners = new Set<() => void>()
export function subscribe(fn: () => void): () => void {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}
function notify(): void {
  listeners.forEach((fn) => fn())
}

async function fetchAndApplyVersion(): Promise<number> {
  let version = 0
  try {
    const data = await fetchJson<{ version: number }>('/api/geo-ai/shapes/version')
    version = data.version ?? 0
  } catch {
    // offline — keep whatever is cached
    const stored = lsGet(VERSION_LS)
    return stored ? Number(stored) || 0 : 0
  }
  const stored = lsGet(VERSION_LS)
  if (stored === null || Number(stored) !== version) {
    purgeShapeEntries()
    lsRemove(CATALOG_LS)
    recordMem.clear()
    catalogMem = null
    lsSet(VERSION_LS, String(version))
  }
  knownVersion = version
  return version
}

/** Resolve the current server version (memoized per tab session). */
export async function ensureVersion(): Promise<number> {
  if (versionPromise) return versionPromise
  versionPromise = fetchAndApplyVersion()
  return versionPromise
}

/**
 * Re-check the server version (e.g. on tab focus). If it changed since last
 * known, caches are purged and subscribers are notified to reload.
 */
export async function refreshVersion(): Promise<void> {
  const prev = knownVersion
  versionPromise = null // force a fresh fetch
  const next = await ensureVersion()
  if (prev !== null && next !== prev) notify()
}

// Revalidate when the user returns to the tab (e.g. after editing in /admin).
if (hasWindow()) {
  window.addEventListener('focus', () => void refreshVersion())
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) void refreshVersion()
  })
}

/** Catalog (summaries + examples). Cached in memory + localStorage by version. */
export async function loadCatalog(): Promise<Catalog> {
  const version = await ensureVersion()
  if (catalogMem && catalogMem.version === version) return catalogMem

  const cached = lsGetJson<Catalog>(CATALOG_LS)
  if (cached && cached.version === version) {
    catalogMem = cached
    registerExamples(cached.examples)
    return cached
  }

  const data = await fetchJson<{ shapes: ShapeSummary[]; examples: ExampleDef[]; version: number }>(
    '/api/geo-ai/shapes',
  )
  const catalog: Catalog = {
    version: data.version ?? version,
    summaries: data.shapes ?? [],
    examples: data.examples ?? [],
  }
  catalogMem = catalog
  registerExamples(catalog.examples)
  lsSet(CATALOG_LS, JSON.stringify(catalog))
  lsSet(VERSION_LS, String(catalog.version))
  return catalog
}

/** Full ShapeRecord for a key. memory → localStorage(version) → API. */
export async function loadShape(shapeKey: string): Promise<ShapeRecord | null> {
  const version = await ensureVersion()

  const mem = recordMem.get(shapeKey)
  if (mem) return mem

  const cached = lsGetJson<{ version: number; record: ShapeRecord }>(SHAPE_LS_PREFIX + shapeKey)
  if (cached && cached.version === version) {
    recordMem.set(shapeKey, cached.record)
    hydrateRecord(cached.record)
    return cached.record
  }

  try {
    const data = await fetchJson<{ record: ShapeRecord; version: number }>(
      `/api/geo-ai/shapes/${encodeURIComponent(shapeKey)}`,
    )
    if (!data?.record) return null
    recordMem.set(shapeKey, data.record)
    hydrateRecord(data.record)
    lsSet(SHAPE_LS_PREFIX + shapeKey, JSON.stringify({ version: data.version ?? version, record: data.record }))
    return data.record
  } catch {
    return null
  }
}
