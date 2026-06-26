import { createHmac, pbkdf2Sync, randomBytes, timingSafeEqual } from 'node:crypto'
import { cookies } from 'next/headers'
import { eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { learningUsers, type LearningUserRow } from '@/db/schema'

export type LearningRole = 'admin' | 'teacher' | 'student'

export type LearningSession = {
  id: string
  name: string
  email: string
  role: LearningRole
}

const COOKIE_NAME = 'geo_learning_session'
const MAX_AGE_SECONDS = 60 * 60 * 24 * 14

function authSecret() {
  return process.env.AUTH_SECRET || process.env.ADMIN_PASSWORD || 'geo-dev-secret-change-me'
}

function configuredAdmin(): LearningSession | null {
  const username = process.env.ADMIN_USERNAME?.trim()
  const password = process.env.ADMIN_PASSWORD?.trim()
  if (!username || !password) return null
  return {
    id: 'env-admin',
    name: 'Admin',
    email: username,
    role: 'admin',
  }
}

export function verifyEnvAdmin(identifier: string, password: string): LearningSession | null {
  const admin = configuredAdmin()
  if (!admin) return null
  if (identifier.trim().toLowerCase() !== admin.email.toLowerCase()) return null
  return password === process.env.ADMIN_PASSWORD ? admin : null
}

function base64url(input: string | Buffer) {
  return Buffer.from(input).toString('base64url')
}

function sign(payload: string) {
  return createHmac('sha256', authSecret()).update(payload).digest('base64url')
}

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString('base64url')
  const hash = pbkdf2Sync(password, salt, 120_000, 32, 'sha256').toString('base64url')
  return `${salt}.${hash}`
}

export function verifyPassword(password: string, stored: string) {
  const [salt, hash] = stored.split('.')
  if (!salt || !hash) return false
  const next = pbkdf2Sync(password, salt, 120_000, 32, 'sha256')
  const original = Buffer.from(hash, 'base64url')
  return original.length === next.length && timingSafeEqual(original, next)
}

export function createSessionToken(user: LearningSession) {
  const payload = base64url(JSON.stringify({ ...user, exp: Math.floor(Date.now() / 1000) + MAX_AGE_SECONDS }))
  return `${payload}.${sign(payload)}`
}

export function parseSessionToken(token?: string): LearningSession | null {
  if (!token) return null
  const [payload, signature] = token.split('.')
  if (!payload || !signature || sign(payload) !== signature) return null
  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as LearningSession & { exp?: number }
    if (!parsed.exp || parsed.exp < Math.floor(Date.now() / 1000)) return null
    if (parsed.role !== 'admin' && parsed.role !== 'teacher' && parsed.role !== 'student') return null
    return { id: parsed.id, name: parsed.name, email: parsed.email, role: parsed.role }
  } catch {
    return null
  }
}

export async function setLearningCookie(user: LearningSession) {
  const cookieStore = await cookies()
  cookieStore.set(COOKIE_NAME, createSessionToken(user), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: MAX_AGE_SECONDS,
  })
}

export async function clearLearningCookie() {
  const cookieStore = await cookies()
  cookieStore.delete(COOKIE_NAME)
}

export async function getLearningSession(): Promise<LearningSession | null> {
  const cookieStore = await cookies()
  return parseSessionToken(cookieStore.get(COOKIE_NAME)?.value)
}

export async function requireLearningRole(role?: LearningRole) {
  const session = await getLearningSession()
  if (!session) return { ok: false as const, status: 401 as const, session: null }
  if (session.role === 'admin' && role !== 'student') return { ok: true as const, status: 200 as const, session }
  if (role && session.role !== role) return { ok: false as const, status: 403 as const, session }
  return { ok: true as const, status: 200 as const, session }
}

export function publicUser(row: Pick<LearningUserRow, 'id' | 'name' | 'email' | 'role'>): LearningSession {
  return { id: row.id, name: row.name, email: row.email, role: row.role as LearningRole }
}

export async function findLearningUserByEmail(email: string) {
  if (!db) return null
  const [user] = await db
    .select()
    .from(learningUsers)
    .where(eq(learningUsers.email, email.toLowerCase()))
    .limit(1)
  return user ?? null
}
