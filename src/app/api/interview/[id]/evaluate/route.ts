import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { ai } from '@/lib/ai'
import { getCurrentUser, parseJson, err } from '@/lib/server'

/** Finalize an interview: produce an overall score + summary. */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const user = await getCurrentUser()
    const interview = await db.interview.findUnique({ where: { id } })
    if (!interview || interview.userId !== user.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    const history = parseJson<any[]>(interview.messages)
    const evaluations = history.filter((m) => m.evaluation).map((m) => m.evaluation)
    const scores = evaluations.map((e) => e.score).filter((s: number) => typeof s === 'number')
    const overall = scores.length ? Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length) : 0

    const summary = await ai.coach(
      [
        { role: 'system', content: `You are an interview coach. Summarize the candidate's performance in a ${interview.type} interview for ${interview.role}. Give 3 concrete improvement actions. Use markdown.` },
        { role: 'user', content: `Conversation + evaluations:\n${JSON.stringify({ history, evaluations }).slice(0, 6000)}` },
      ],
      'interview'
    )

    await db.interview.update({
      where: { id },
      data: { status: 'completed', score: overall, summary, messages: JSON.stringify(history) },
    })
    return NextResponse.json({ score: overall, summary, evaluations: evaluations.length })
  } catch (e) {
    return err(e)
  }
}
