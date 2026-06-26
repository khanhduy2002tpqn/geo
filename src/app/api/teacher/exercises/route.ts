import { NextResponse } from 'next/server'
import { z } from 'zod'
import { and, desc, eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { teacherExercises } from '@/db/schema'
import { requireLearningRole } from '@/lib/learningAuth'
import { matchingAnswerFromPairs, type MatchingPair } from '@/lib/geo-ai/practice/matching'

export const runtime = 'nodejs'

const schema = z.object({
  shapeKey: z.string().min(1).max(80),
  title: z.string().min(2).max(120),
  questionType: z.enum(['choice', 'blank', 'matching']),
  prompt: z.string().min(3).max(600),
  options: z.union([
    z.array(z.string().min(1).max(160)).max(6),
    z.array(z.object({ left: z.string().min(1).max(160), right: z.string().min(1).max(160) })).max(30),
  ]).optional(),
  answer: z.string().min(1).max(2000),
  topic: z.enum(['recognition', 'objects', 'formulas', 'self', 'custom']).default('custom'),
})

function matchingPairsFromOptions(options: unknown): MatchingPair[] | null {
  if (!Array.isArray(options)) return null
  if (!options.every((item) => item && typeof item === 'object' && 'left' in item && 'right' in item)) return null
  return options.map((item) => {
    const pair = item as MatchingPair
    return { left: String(pair.left).trim(), right: String(pair.right).trim() }
  })
}

function serialize(row: typeof teacherExercises.$inferSelect) {
  return {
    id: row.id,
    teacherId: row.teacherId,
    shapeKey: row.shapeKey,
    title: row.title,
    questionType: row.questionType,
    prompt: row.prompt,
    options: row.options ? JSON.parse(row.options) as string[] | MatchingPair[] : undefined,
    answer: row.answer,
    topic: row.topic,
    createdAt: row.createdAt,
  }
}

export async function GET(request: Request) {
  if (!db) return NextResponse.json({ error: 'Database chưa cấu hình.' }, { status: 503 })
  const { searchParams } = new URL(request.url)
  const shapeKey = searchParams.get('shapeKey')
  const auth = await requireLearningRole()
  if (!auth.ok) return NextResponse.json({ error: 'Bạn cần đăng nhập.' }, { status: auth.status })

  const rows = await db
    .select()
    .from(teacherExercises)
    .where(shapeKey ? eq(teacherExercises.shapeKey, shapeKey) : undefined)
    .orderBy(desc(teacherExercises.createdAt))
    .limit(50)

  return NextResponse.json({ exercises: rows.map(serialize) })
}

export async function POST(request: Request) {
  if (!db) return NextResponse.json({ error: 'Database chưa cấu hình.' }, { status: 503 })
  const auth = await requireLearningRole('teacher')
  if (!auth.ok) return NextResponse.json({ error: 'Chỉ giáo viên được soạn bài tập.' }, { status: auth.status })

  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Bài tập không hợp lệ.' }, { status: 400 })

  const data = parsed.data
  if (data.questionType === 'choice' && (!data.options || data.options.length !== 4)) {
    return NextResponse.json({ error: 'Trắc nghiệm cần đúng 4 đáp án.' }, { status: 400 })
  }
  const matchingPairs = data.questionType === 'matching' ? matchingPairsFromOptions(data.options) : null
  if (data.questionType === 'matching' && (!matchingPairs || matchingPairs.length < 4)) {
    return NextResponse.json({ error: 'Ghép cặp cần tối thiểu 4 cặp đúng để đủ 4 đáp án.' }, { status: 400 })
  }

  const row = {
    id: crypto.randomUUID(),
    teacherId: auth.session.id,
    shapeKey: data.shapeKey,
    title: data.title,
    questionType: data.questionType,
    prompt: data.prompt,
    options: data.questionType === 'choice' || data.questionType === 'matching' ? JSON.stringify(data.options ?? []) : null,
    answer: data.questionType === 'matching' && matchingPairs ? matchingAnswerFromPairs(matchingPairs) : data.answer,
    topic: data.topic,
  }
  await db.insert(teacherExercises).values(row)

  const rows = await db
    .select()
    .from(teacherExercises)
    .where(and(eq(teacherExercises.teacherId, auth.session.id), eq(teacherExercises.shapeKey, data.shapeKey)))
    .orderBy(desc(teacherExercises.createdAt))
    .limit(50)

  return NextResponse.json({ exercise: serialize(row as typeof teacherExercises.$inferSelect), exercises: rows.map(serialize) })
}
