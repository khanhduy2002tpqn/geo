// src/middleware.ts
// Server-side guards:
// - /admin and /api/admin keep the existing HTTP Basic Auth.
// - learning pages/APIs require the signed learning session cookie so direct
//   links cannot bypass the client login gate.
//
// Runs on the Edge runtime, so keep this file free of Node-only APIs.

import { NextResponse } from 'next/server'
import { checkAdminAuth, unauthorizedResponse } from '@/lib/adminAuth'

const COOKIE_NAME = 'geo_learning_session'

function base64UrlToBytes(value: string): Uint8Array {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=')
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index)
  return bytes
}

function bytesToBase64Url(bytes: ArrayBuffer): string {
  const binary = String.fromCharCode(...new Uint8Array(bytes))
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function authSecret() {
  return process.env.AUTH_SECRET || process.env.ADMIN_PASSWORD || 'geo-dev-secret-change-me'
}

async function sign(payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(authSecret()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload))
  return bytesToBase64Url(signature)
}

async function hasLearningSession(request: Request): Promise<boolean> {
  const header = request.headers.get('cookie') ?? ''
  const token = header
    .split(';')
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${COOKIE_NAME}=`))
    ?.slice(COOKIE_NAME.length + 1)

  if (!token) return false
  const [payload, signature] = token.split('.')
  if (!payload || !signature) return false
  if ((await sign(payload)) !== signature) return false

  try {
    const parsed = JSON.parse(new TextDecoder().decode(base64UrlToBytes(payload))) as { exp?: number; role?: string }
    if (!parsed.exp || parsed.exp < Math.floor(Date.now() / 1000)) return false
    return parsed.role === 'admin' || parsed.role === 'teacher' || parsed.role === 'student'
  } catch {
    return false
  }
}

function isAuthRoute(pathname: string) {
  return pathname.startsWith('/api/auth/')
}

function isAdminRoute(pathname: string) {
  return pathname === '/admin' || pathname.startsWith('/admin/') || pathname.startsWith('/api/admin/')
}

function isProtectedApi(pathname: string) {
  return pathname.startsWith('/api/geo-ai/')
    || pathname.startsWith('/api/geogebra/')
    || pathname.startsWith('/api/teacher/')
    || pathname.startsWith('/api/student/')
}

export async function middleware(request: Request): Promise<Response> {
  const url = new URL(request.url)
  const { pathname } = url

  if (isAdminRoute(pathname)) {
    const result = checkAdminAuth(request)
    return result.ok ? NextResponse.next() : unauthorizedResponse(result.status)
  }

  if (isAuthRoute(pathname)) return NextResponse.next()

  const ok = await hasLearningSession(request)

  if (isProtectedApi(pathname) && !ok) {
    return NextResponse.json({ error: 'Bạn cần đăng nhập.' }, { status: 401 })
  }

  // The home page itself renders the login screen. Any exact/deep page link is
  // redirected home first when unauthenticated, so content cannot be shown.
  if (pathname !== '/' && !pathname.startsWith('/api/') && !ok) {
    const loginUrl = new URL('/', request.url)
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/api/:path*',
    '/geo-v1/:path*',
    '/((?!_next/static|_next/image|favicon.ico|icon.svg|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|css|js|map|txt|csv|json)$).*)',
  ],
}
