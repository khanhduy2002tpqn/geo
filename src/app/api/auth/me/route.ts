import { NextResponse } from 'next/server'
import { getLearningSession } from '@/lib/learningAuth'

export const runtime = 'nodejs'

export async function GET() {
  const user = await getLearningSession()
  return NextResponse.json({ user })
}
