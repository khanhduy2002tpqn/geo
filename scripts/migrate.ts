/**
 * Apply Drizzle migrations through libSQL's HTTP driver.
 *
 * This avoids loading the optional native libSQL binary, which is unnecessary
 * for a remote Turso database and can fail on unsupported local Node runtimes.
 */

import { createClient } from '@libsql/client/http'
import { drizzle } from 'drizzle-orm/libsql/http'
import { migrate } from 'drizzle-orm/libsql/migrator'

const url = process.env.TURSO_URL?.trim()
const authToken = process.env.TURSO_AUTH_TOKEN?.trim()

if (!url) {
  throw new Error('TURSO_URL is required in .env.local')
}

if (url.startsWith('libsql://') && !authToken) {
  throw new Error('TURSO_AUTH_TOKEN is required for a remote Turso database')
}

const client = createClient({ url, authToken })

try {
  const db = drizzle(client)
  await migrate(db, { migrationsFolder: './drizzle' })

  const result = await client.execute('SELECT COUNT(*) AS count FROM __drizzle_migrations')
  console.log(`Database is ready (${result.rows[0]?.count ?? 0} migrations applied)`)
} finally {
  client.close()
}
