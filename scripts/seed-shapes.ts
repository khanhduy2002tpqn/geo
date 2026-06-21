/**
 * scripts/seed-shapes.ts
 *
 * The static shapes-data.ts source file has been removed.
 * Shapes are now managed exclusively through the admin UI and Turso database.
 *
 * Run: pnpm db:seed   (no-op — prints a message and exits)
 */

async function main(): Promise<void> {
  console.log('shapes-data.ts has been removed. Manage shapes via the admin UI at /admin.')
  console.log('No seeding required — data lives in Turso.')
  process.exit(0)
}

main().catch((error) => {
  console.error('Seed failed:', error)
  process.exit(1)
})
