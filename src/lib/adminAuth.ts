// src/lib/adminAuth.ts
// Edge-safe HTTP Basic Auth helpers shared by middleware (Edge runtime) and the
// admin API routes (nodejs runtime, defense-in-depth). Uses atob() — NOT Buffer —
// so it runs on Cloudflare Workers / workerd.

export interface AdminAuthResult {
  ok: boolean
  /** 401 = bad/missing credentials, 503 = admin not configured */
  status?: 401 | 503
}

/** Length-aware constant-ish string compare (reduces trivial timing leaks). */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

/** Validate the Authorization header against ADMIN_USERNAME / ADMIN_PASSWORD. */
export function checkAdminAuth(request: Request): AdminAuthResult {
  const expectedUser = process.env.ADMIN_USERNAME
  const expectedPass = process.env.ADMIN_PASSWORD
  if (!expectedUser || !expectedPass) {
    return { ok: false, status: 503 }
  }

  const header = request.headers.get('authorization') ?? ''
  const [scheme, encoded] = header.split(' ')
  if (scheme !== 'Basic' || !encoded) {
    return { ok: false, status: 401 }
  }

  let decoded: string
  try {
    decoded = atob(encoded)
  } catch {
    return { ok: false, status: 401 }
  }

  const sep = decoded.indexOf(':')
  if (sep === -1) return { ok: false, status: 401 }
  const user = decoded.slice(0, sep)
  const pass = decoded.slice(sep + 1)

  if (safeEqual(user, expectedUser) && safeEqual(pass, expectedPass)) {
    return { ok: true }
  }
  return { ok: false, status: 401 }
}

/** Standard 401 challenge response. */
export function unauthorizedResponse(status: 401 | 503 = 401): Response {
  if (status === 503) {
    return new Response('Admin not configured (set ADMIN_USERNAME / ADMIN_PASSWORD)', {
      status: 503,
    })
  }
  return new Response('Unauthorized', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="Admin", charset="UTF-8"' },
  })
}
