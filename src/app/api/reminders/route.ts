import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, err } from '@/lib/server'

/** List + create reminders (follow-ups, interviews, deadlines). */
export async function GET() {
  try {
    const user = await getCurrentUser()
    const reminders = await db.reminder.findMany({
      where: { userId: user.id },
      orderBy: { dueAt: 'asc' },
    })
    return NextResponse.json({ reminders })
  } catch (e) { return err(e) }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser()
    const body = await req.json()
    const reminder = await db.reminder.create({
      data: {
        userId: user.id,
        jobId: body.jobId || null,
        companyId: body.companyId || null,
        title: body.title,
        dueAt: new Date(body.dueAt),
        type: body.type || 'followup',
      },
    })
    return NextResponse.json({ reminder })
  } catch (e) { return err(e) }
}
