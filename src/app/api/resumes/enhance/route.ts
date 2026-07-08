import { NextResponse } from 'next/server'
import { ai } from '@/lib/ai'
import { getCurrentUser, err } from '@/lib/server'

/** AI-enhance a single resume bullet (auth required). */
export async function POST(req: Request) {
  try {
    const user = await getCurrentUser()
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

import { db } from '@/lib/db'
