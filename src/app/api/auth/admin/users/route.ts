import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/db/client'
import { learningUsers } from '@/db/schema'
import { findLearningUserByEmail, hashPassword, publicUser, requireLearningRole } from '@/lib/learningAuth'

export const runtime = 'nodejs'

const schema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email().max(120),
  password: z.string().min(6).max(100),
  role: z.enum(['teacher', 'student']),
})

export async function POST(request: Request) {
  if (!db) return NextResponse.json({ error: 'Database chưa cấu hình.' }, { status: 503 })

  const auth = await requireLearningRole('admin')
  if (!auth.ok || auth.session.role !== 'admin') {
    return NextResponse.json({ error: 'Chỉ admin được tạo tài khoản theo role.' }, { status: 403 })
  }

  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Dữ liệu tài khoản không hợp lệ.' }, { status: 400 })

  const email = parsed.data.email.toLowerCase()
  const existed = await findLearningUserByEmail(email)
  if (existed) return NextResponse.json({ error: 'Email này đã tồn tại.' }, { status: 409 })

  const user = {
    id: crypto.randomUUID(),
    name: parsed.data.name.trim(),
    email,
    passwordHash: hashPassword(parsed.data.password),
    role: parsed.data.role,
  }
  await db.insert(learningUsers).values(user)

  return NextResponse.json({ user: publicUser(user) })
}
