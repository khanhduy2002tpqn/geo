import { existsSync } from 'node:fs'
import { defineConfig } from 'drizzle-kit'

// drizzle-kit CLI does not auto-load .env.local — load it explicitly.
const envFile = existsSync('.env.local') ? '.env.local' : '.env'
if (existsSync(envFile) && typeof process.loadEnvFile === 'function') {
  process.loadEnvFile(envFile)
}

const url = process.env.TURSO_URL
if (!url) {
  throw new Error('TURSO_URL is not set — add it to .env.local before running drizzle-kit')
}

export default defineConfig({
  dialect: 'turso',
  schema: './src/db/schema.ts',
  out: './drizzle',
  dbCredentials: {
    url,
    authToken: process.env.TURSO_AUTH_TOKEN,
  },
})
