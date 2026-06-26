import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/db/client'
import { studentSubmissions } from '@/db/schema'
import { requireLearningRole } from '@/lib/learningAuth'

export const runtime = 'nodejs'

const schema = z.object({
  shapeKey: z.string().min(1).max(80),
  source: z.enum(['lesson_practice', 'teacher_exercise']),
  exerciseId: z.string().max(120).optional(),
  score: z.number().int().min(0),
  total: z.number().int().min(1),
  weakTopics: z.array(z.string().min(1).max(40)).max(20),
  answers: z.unknown(),
  selfAssessment: z.string().max(120).optional(),
})

export async function POST(request: Request) {
  if (!db) return NextResponse.json({ error: 'Database chưa cấu hình.' }, { status: 503 })
  const auth = await requireLearningRole('student')
  if (!auth.ok) return NextResponse.json({ error: 'Chỉ học sinh mới nộp kết quả học tập.' }, { status: auth.status })

  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Kết quả không hợp lệ.' }, { status: 400 })
  const data = parsed.data

  await db.insert(studentSubmissions).values({
    id: crypto.randomUUID(),
    studentId: auth.session.id,
    shapeKey: data.shapeKey,
    source: data.source,
    exerciseId: data.exerciseId,
    score: data.score,
    total: data.total,
    weakTopics: JSON.stringify(data.weakTopics),
    answers: JSON.stringify(data.answers),
    selfAssessment: data.selfAssessment,
  })

  return NextResponse.json({ ok: true })
}
