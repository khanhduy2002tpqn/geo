import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/db/client'
import { findLearningUserByEmail, publicUser, setLearningCookie, verifyEnvAdmin, verifyPassword } from '@/lib/learningAuth'

export const runtime = 'nodejs'

const schema = z.object({
  email: z.string().min(1),
  password: z.string().min(1),
})

export async function POST(request: Request) {
  if (!db) return NextResponse.json({ error: 'Database chưa cấu hình.' }, { status: 503 })
  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Email hoặc mật khẩu không hợp lệ.' }, { status: 400 })

  const admin = verifyEnvAdmin(parsed.data.email, parsed.data.password)
  if (admin) {
    await setLearningCookie(admin)
    return NextResponse.json({ user: admin })
  }

  const email = z.string().email().safeParse(parsed.data.email)
  if (!email.success) return NextResponse.json({ error: 'Sai email hoặc mật khẩu.' }, { status: 401 })

  const user = await findLearningUserByEmail(email.data)
  if (!user || !verifyPassword(parsed.data.password, user.passwordHash)) {
    return NextResponse.json({ error: 'Sai email hoặc mật khẩu.' }, { status: 401 })
  }

  const session = publicUser(user)
  await setLearningCookie(session)
  return NextResponse.json({ user: session })
}
