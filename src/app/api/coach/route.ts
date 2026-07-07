import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, err } from '@/lib/server'

export async function GET() {
  try {
    const user = await getCurrentUser()
    const sessions = await db.coachSession.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: 'desc' },
    })
    return NextResponse.json({ sessions })
  } catch (e) {
    return err(e)
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser()
    const { focus, title } = await req.json()
    const session = await db.coachSession.create({
      data: {
        userId: user.id,
        focus: focus || 'career-planning',
        title: title || 'New Coaching Session',
        messages: JSON.stringify([
          {
            role: 'assistant',
            content:
              "Hi! I'm your CareerOS AI Coach. I can help you plan your next move, prepare for a promotion, negotiate salary, map skills, or pivot industries. What's on your mind today?",
          },
        ]),
      },
    })
    return NextResponse.json({ session })
  } catch (e) {
    return err(e)
  }
}
