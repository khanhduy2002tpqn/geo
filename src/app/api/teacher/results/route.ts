import { NextResponse } from 'next/server'
import { desc, eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { learningUsers, studentSubmissions } from '@/db/schema'
import { requireLearningRole } from '@/lib/learningAuth'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  if (!db) return NextResponse.json({ error: 'Database chưa cấu hình.' }, { status: 503 })
  const auth = await requireLearningRole('teacher')
  if (!auth.ok) return NextResponse.json({ error: 'Chỉ giáo viên được xem kết quả.' }, { status: auth.status })

  const { searchParams } = new URL(request.url)
  const shapeKey = searchParams.get('shapeKey')

  const rows = await db
    .select({
      id: studentSubmissions.id,
      studentId: studentSubmissions.studentId,
      studentName: learningUsers.name,
      studentEmail: learningUsers.email,
      shapeKey: studentSubmissions.shapeKey,
      source: studentSubmissions.source,
      score: studentSubmissions.score,
      total: studentSubmissions.total,
      weakTopics: studentSubmissions.weakTopics,
      selfAssessment: studentSubmissions.selfAssessment,
      createdAt: studentSubmissions.createdAt,
    })
    .from(studentSubmissions)
    .leftJoin(learningUsers, eq(studentSubmissions.studentId, learningUsers.id))
    .where(shapeKey ? eq(studentSubmissions.shapeKey, shapeKey) : undefined)
    .orderBy(desc(studentSubmissions.createdAt))
    .limit(100)

  return NextResponse.json({
    results: rows.map((row) => ({
      ...row,
      weakTopics: JSON.parse(row.weakTopics || '[]') as string[],
    })),
  })
}
