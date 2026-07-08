import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { run } from '@/lib/ai'
import { getCurrentUser, err } from '@/lib/server'
import { rateLimitOr429 } from '@/lib/rate-limit'

/** GET recent briefings. */
export async function GET() {
  try {
    const user = await getCurrentUser()
    const limited = rateLimitOr429(user.id, 'ai_analyze')
    if (limited) return limited
    const briefings = await db.careerBriefing.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' }, take: 7 })
    return NextResponse.json({ briefings })
  } catch (e) { return err(e) }
}

/** POST to generate a daily or weekly briefing. */
export async function POST(req: Request) {
  try {
    const user = await getCurrentUser()
    const { type } = await req.json() // daily | weekly

    // Gather context: jobs, reminders, interviews, recent agent runs
    const [jobs, reminders, interviews, recentRuns] = await Promise.all([
      db.job.findMany({ where: { userId: user.id }, orderBy: { updatedAt: 'desc' }, take: 10 }),
      db.reminder.findMany({ where: { userId: user.id, done: false, dueAt: { lte: new Date(Date.now() + 7 * 86400000) } }, orderBy: { dueAt: 'asc' }, take: 5 }),
      db.interview.findMany({ where: { userId: user.id }, orderBy: { updatedAt: 'desc' }, take: 3 }),
      db.agentRun.findMany({ where: { userId: user.id, status: 'done' }, orderBy: { createdAt: 'desc' }, take: 3 }),
    ])

    const context = [
      `JOBS (${jobs.length}): ${jobs.map((j) => `${j.role}@${j.company}(${j.status})`).join(', ')}`,
      `UPCOMING REMINDERS (${reminders.length}): ${reminders.map((r) => `${r.title} due ${r.dueAt.toISOString().slice(0, 10)}`).join('; ')}`,
      `RECENT INTERVIEWS (${interviews.length}): ${interviews.map((i) => `${i.type} score=${i.score || 'n/a'}`).join(', ')}`,
      `RECENT AGENT INSIGHTS: ${recentRuns.map((r) => r.summary).join(' | ')}`,
    ].join('\n')

    let content: any
    if (type === 'weekly') {
      const { data } = await run<any>('weekly_plan', user.id, user.name || '', [{
        role: 'user',
        content: `User context:\n${context}\n\nReturn JSON: { "theme": string, "days": [{ "day": "Monday", "focus": string, "action": string }], "skillToPractice": string, "weeklyGoal": string, "summary": string }`,
      }], { json: true })
      content = data
    } else {
      const { data } = await run<string>('daily_briefing', user.id, user.name || '', [{
        role: 'user',
        content: `User context:\n${context}\n\nGenerate today's daily briefing.`,
      }])
      content = { summary: data, type: 'daily' }
    }

    const briefing = await db.careerBriefing.create({
      data: { userId: user.id, type: type || 'daily', content: JSON.stringify(content) },
    })

    return NextResponse.json({ briefing: { ...briefing, content } })
  } catch (e) { return err(e) }
}
