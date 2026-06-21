/**
 * Client-side cache for example geometry JSON.
 *
 * Two layers:
 *   L1: in-process Map (cleared on page reload)
 *   L2: localStorage (persisted across sessions)
 *
 * Keys use the pattern: geo-example-<id>
 *
 * Only runs in browser environments; all operations are no-ops on the server.
 */

const memCache = new Map<string, string>()

function getLocalStorageKey(id: string): string {
  return `geo-example-${id}`
}

/**
 * Retrieve cached geometry JSON for the given example id.
 * Returns null when no cached value exists.
 */
export function getCachedGeometry(id: string): string | null {
  // L1: in-process memory
  const memHit = memCache.get(id)
  if (memHit !== undefined) return memHit

  // L2: localStorage (browser only)
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(getLocalStorageKey(id))
      if (stored !== null) {
        memCache.set(id, stored)
        return stored
      }
    } catch {
      // Storage access denied or unavailable — ignore
    }
  }

  return null
}

/**
 * Persist geometry JSON for the given example id into both cache layers.
 */
export function setCachedGeometry(id: string, json: string): void {
  memCache.set(id, json)

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(getLocalStorageKey(id), json)
    } catch {
      // Quota exceeded or private mode — swallow silently
    }
  }
}

/**
 * Remove a single cached entry from both layers.
 */
export function clearCachedGeometry(id: string): void {
  memCache.delete(id)

  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(getLocalStorageKey(id))
    } catch {
      // Swallow silently
    }
  }
}
