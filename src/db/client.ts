// HTTP-only entries: pure HTTPS (hrana over fetch). No WebSocket (avoids the
// @libsql/isomorphic-ws web.mjs issue) and no native bindings (avoids the
// "Neon: unsupported Linux architecture" crash on Cloudflare workerd).
// Turso over https:// never needs WebSocket.
import { createClient } from '@libsql/client/http'
import { drizzle } from 'drizzle-orm/libsql/http'
import * as schema from './schema'

function createDb() {
  const url = process.env.TURSO_URL
  const authToken = process.env.TURSO_AUTH_TOKEN

  if (!url) {
    return null
  }

  try {
    const client = createClient({ url, authToken })
    return drizzle(client, { schema })
  } catch (error) {
    // Never throw at import time — a module-eval throw on workerd produces an
    // opaque HTML 500 that bypasses every route-level try/catch.
    console.error('[db] createClient failed:', error)
    return null
  }
}

export type GeoAIDb = NonNullable<ReturnType<typeof createDb>>

const globalForDb = globalThis as unknown as { __geoAIDb?: GeoAIDb | null }
export const db = globalForDb.__geoAIDb ?? (globalForDb.__geoAIDb = createDb())
