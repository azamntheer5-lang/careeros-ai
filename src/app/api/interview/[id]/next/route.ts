import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { ai } from '@/lib/ai'
import { getCurrentUser, parseJson, err, clipInput } from '@/lib/server'

/** Ask the AI interviewer for the next question, given the conversation so far. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const user = await getCurrentUser()
    const interview = await db.interview.findUnique({ where: { id } })
    if (!interview || interview.userId !== user.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    const body = await req.json().catch(() => ({}))
    const history = parseJson<any[]>(interview.messages)

    // If the user supplied an answer, evaluate it against the last question.
    let evaluation: any = null
    if (body.answer) {
      const lastQuestion = [...history].reverse().find((m) => m.role === 'assistant')
      if (lastQuestion) {
        try {
          const clippedAnswer = clipInput(body.answer, 5000)
          const { data } = await ai.interviewEvaluate(interview.type, interview.role || 'Software Engineer', lastQuestion.content, clippedAnswer)
          evaluation = data
        } catch {}
      }
      history.push({ role: 'user', content: body.answer, evaluation })
    }

    const nextQuestion = await ai.interviewNext(interview.type, interview.role || 'Software Engineer', history)
    history.push({ role: 'assistant', content: nextQuestion })

    await db.interview.update({ where: { id }, data: { messages: JSON.stringify(history) } })
    await db.aiUsage.create({ data: { userId: user.id, feature: 'interview', tokens: 1 } })
    return NextResponse.json({ question: nextQuestion, evaluation, history })
  } catch (e) {
    return err(e)
  }
}
