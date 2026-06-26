import { NextResponse } from 'next/server'
import { clearLearningCookie } from '@/lib/learningAuth'

export const runtime = 'nodejs'

export async function POST() {
  await clearLearningCookie()
  return NextResponse.json({ ok: true })
}
