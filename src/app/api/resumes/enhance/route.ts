import { NextResponse } from 'next/server'
import { ai, sanitizePromptInput } from '@/lib/ai'
import { db } from '@/lib/db'
import { getCurrentUser, err, clipInput } from '@/lib/server'
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
    // SECURITY: clip + sanitize input to bound cost and strip common
    // prompt-injection patterns before the text reaches the LLM.
    const clipped = sanitizePromptInput(clipInput(text, 500), 500)
    // SECURITY: allow-list the mode so an attacker can't inject arbitrary
    // prompt directives through this enum-style field.
    const safeMode = ['rewrite', 'achievement', 'impact', 'keywords'].includes(mode)
      ? mode
      : 'rewrite'
    const enhanced = await ai.enhanceBullet(clipped, safeMode as any)
    try { await db.aiUsage.create({ data: { userId: user.id, feature: 'resume-enhance', tokens: 1 } }) } catch {}
    return NextResponse.json({ text: enhanced.trim() })
  } catch (e) {
    return err(e)
  }
}
