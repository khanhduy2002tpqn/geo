/** Validate local configuration without printing secrets. */

const required = ['TURSO_URL', 'TURSO_AUTH_TOKEN'] as const
const missing = required.filter((name) => !process.env[name]?.trim())

if (missing.length > 0) {
  throw new Error(`Missing required environment variables: ${missing.join(', ')}`)
}

const tursoUrl = process.env.TURSO_URL!.trim()
if (!/^(libsql|https?):\/\//.test(tursoUrl)) {
  throw new Error('TURSO_URL must start with libsql://, https://, or http://')
}

const aiBaseUrl = process.env.OPENROUTER_BASE_URL?.trim()
if (aiBaseUrl) {
  try {
    new URL(aiBaseUrl)
  } catch {
    throw new Error('OPENROUTER_BASE_URL must be a valid URL')
  }
}

const adminUser = process.env.ADMIN_USERNAME?.trim()
const adminPassword = process.env.ADMIN_PASSWORD?.trim()
if (Boolean(adminUser) !== Boolean(adminPassword)) {
  console.warn('Admin disabled: set both ADMIN_USERNAME and ADMIN_PASSWORD to enable it')
}

const adminEnabled = Boolean(adminUser && adminPassword)

console.log('Configuration is valid')
console.log(`AI: ${process.env.OPENROUTER_API_KEY ? 'enabled' : 'local fallback'}`)
console.log(`TTS: ${process.env.GOOGLE_TTS_API_KEY ? 'enabled' : 'text only'}`)
console.log(`Admin: ${adminEnabled ? 'enabled' : 'disabled'}`)
