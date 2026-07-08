import { NextResponse } from 'next/server'
import { ai } from '@/lib/ai'
import { db } from '@/lib/db'
import { getCurrentUser, err } from '@/lib/server'
import { rateLimitOr429 } from '@/lib/rate-limit'

/** AI-enhance a single resume bullet (auth required). */
export async function POST(req: Request) {
  try {
    const user = await getCurrentUser()
    const limited = rateLimitOr429(user.id, 'ai_chat')
    if (limited) return limited
    const { text, mode } = await req.json()
    if (!text?.trim()) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 })
    }
    // Limit input length to prevent abuse
    const clipped = text.slice(0, 500)
    const enhanced = await ai.enhanceBullet(clipped, mode || 'rewrite')
    try { await db.aiUsage.create({ data: { userId: user.id, feature: 'resume-enhance', tokens: 1 } }) } catch {}
    return NextResponse.json({ text: enhanced.trim() })
  } catch (e) {
    return err(e)
  }
}
