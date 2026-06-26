import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/db/client'
import { learningUsers } from '@/db/schema'
import { findLearningUserByEmail, hashPassword, publicUser, setLearningCookie } from '@/lib/learningAuth'

export const runtime = 'nodejs'

const schema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email().max(120),
  password: z.string().min(6).max(100),
})

export async function POST(request: Request) {
  if (!db) return NextResponse.json({ error: 'Database chưa cấu hình.' }, { status: 503 })
  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Dữ liệu đăng ký không hợp lệ.' }, { status: 400 })

  const email = parsed.data.email.toLowerCase()
  const existed = await findLearningUserByEmail(email)
  if (existed) return NextResponse.json({ error: 'Email này đã tồn tại.' }, { status: 409 })

  const user = {
    id: crypto.randomUUID(),
    name: parsed.data.name.trim(),
    email,
    passwordHash: hashPassword(parsed.data.password),
    role: 'student',
  }
  await db.insert(learningUsers).values(user)
  const session = publicUser(user)
  await setLearningCookie(session)
  return NextResponse.json({ user: session })
}
