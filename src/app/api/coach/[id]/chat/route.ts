import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { ai } from '@/lib/ai'
import { getCurrentUser, parseJson, err } from '@/lib/server'
import { rateLimitOr429 } from '@/lib/rate-limit'

/** Send a message to the career coach and get a reply (persists history). */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const user = await getCurrentUser()
    const limited = rateLimitOr429(user.id, 'ai_chat')
    if (limited) return limited
    const session = await db.coachSession.findUnique({ where: { id } })
    if (!session || session.userId !== user.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    const { message } = await req.json()
    if (!message?.trim()) {
      return NextResponse.json({ error: 'Message required' }, { status: 400 })
    }
    const history = parseJson<any[]>(session.messages)
    history.push({ role: 'user', content: message })

    const reply = await ai.coach(history, session.focus)
    history.push({ role: 'assistant', content: reply })

    await db.coachSession.update({
      where: { id },
      data: { messages: JSON.stringify(history), title: history.length <= 2 ? message.slice(0, 60) : session.title },
    })
    await db.aiUsage.create({ data: { userId: user.id, feature: 'coach', tokens: 1 } })
    return NextResponse.json({ reply, history })
  } catch (e) {
    return err(e)
  }
}
