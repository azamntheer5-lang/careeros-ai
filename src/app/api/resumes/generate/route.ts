import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { ai } from '@/lib/ai'
import { getCurrentUser, err } from '@/lib/server'

/** AI-generate a complete resume draft from free-form context. */
export async function POST(req: Request) {
  try {
    const user = await getCurrentUser()
    const { context, title, template, accent } = await req.json()
    if (!context?.trim()) {
      return NextResponse.json({ error: 'Context is required' }, { status: 400 })
    }
    const { data } = await ai.generateResume(context)
    const resume = await db.resume.create({
      data: {
        userId: user.id,
        title: title || 'AI-Generated Resume',
        template: template || 'modern',
        accent: accent || 'emerald',
        data: JSON.stringify(data),
      },
    })
    await trackUsage(user.id, 'resume-enhance')
    return NextResponse.json({ resume })
  } catch (e) {
    return err(e)
  }
}

async function trackUsage(userId: string, feature: string) {
  try {
    await db.aiUsage.create({ data: { userId, feature, tokens: 1 } })
  } catch {}
}
