// src/middleware.ts
// HTTP Basic Auth guard for /admin and /api/admin. Runs on the Edge runtime
// (default — no `runtime` export) so it is bundled into the Cloudflare Worker by
// @opennextjs/cloudflare. Must stay edge-safe (atob, no Buffer/Node APIs).

import { NextResponse } from 'next/server'
import { checkAdminAuth, unauthorizedResponse } from '@/lib/adminAuth'

export function middleware(request: Request): Response {
  const result = checkAdminAuth(request)
  if (result.ok) {
    return NextResponse.next()
  }
  return unauthorizedResponse(result.status)
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
}
