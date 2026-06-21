/**
 * Browser localStorage cache for GeometrySpec / GeometryModel pairs.
 *
 * Key: geo-ai-cache-v4
 * Value: JSON map of hash → { spec, model, createdAt }
 * TTL: 7 days
 *
 * Runs only in browser environments (guard: typeof window !== 'undefined').
 * Quota errors are swallowed silently to never break the caller.
 */

import type { GeometryModel, GeometrySpec } from '@/types/geo-ai'

const LS_KEY = 'geo-ai-cache-v4'
const TTL_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

interface CacheEntry {
  spec: GeometrySpec
  model: GeometryModel
  createdAt: number
}

type CacheStore = Record<string, CacheEntry>

function isAvailable(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function readStore(): CacheStore {
  if (!isAvailable()) return {}
  try {
    const raw = window.localStorage.getItem(LS_KEY)
    if (!raw) return {}
    return JSON.parse(raw) as CacheStore
  } catch {
    return {}
  }
}

function writeStore(store: CacheStore): void {
  if (!isAvailable()) return
  try {
    window.localStorage.setItem(LS_KEY, JSON.stringify(store))
  } catch {
    // Quota exceeded or private mode — swallow silently
  }
}

function pruneExpired(store: CacheStore): CacheStore {
  const now = Date.now()
  const pruned: CacheStore = {}
  for (const [hash, entry] of Object.entries(store)) {
    if (now - entry.createdAt < TTL_MS) {
      pruned[hash] = entry
    }
  }
  return pruned
}

export const localStorageCache = {
  get(hash: string): { spec: GeometrySpec; model: GeometryModel } | null {
    const store = pruneExpired(readStore())
    const entry = store[hash]
    if (!entry) return null
    return { spec: entry.spec, model: entry.model }
  },

  set(hash: string, spec: GeometrySpec, model: GeometryModel): void {
    const store = pruneExpired(readStore())
    store[hash] = { spec, model, createdAt: Date.now() }
    writeStore(store)
  },

  clear(): void {
    if (!isAvailable()) return
    try {
      window.localStorage.removeItem(LS_KEY)
    } catch {
      // Swallow silently
    }
  },
}
