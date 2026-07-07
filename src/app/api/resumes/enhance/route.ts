import { NextResponse } from 'next/server'
import { ai } from '@/lib/ai'
import { err } from '@/lib/server'

/** AI-enhance a single resume bullet. */
export async function POST(req: Request) {
  try {
    const { text, mode } = await req.json()
    if (!text?.trim()) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 })
    }
    const enhanced = await ai.enhanceBullet(text, mode || 'rewrite')
    return NextResponse.json({ text: enhanced.trim() })
  } catch (e) {
    return err(e)
  }
}
