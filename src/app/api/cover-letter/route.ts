import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { ai } from '@/lib/ai'
import { getCurrentUser, err } from '@/lib/server'

export async function GET() {
  try {
    const user = await getCurrentUser()
    const letters = await db.coverLetter.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: 'desc' },
    })
    return NextResponse.json({ letters })
  } catch (e) {
    return err(e)
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser()
    const { type, tone, company, role, jobContext, resumeContext, resumeId } = await req.json()

    let ctx = resumeContext || ''
    if (resumeId && !ctx) {
      const r = await db.resume.findUnique({ where: { id: resumeId } })
      if (r) ctx = JSON.stringify(JSON.parse(r.data))
    }
    if (!ctx.trim() || !jobContext?.trim()) {
      return NextResponse.json({ error: 'Background and target context are required' }, { status: 400 })
    }

    const content = await ai.generateLetter(type || 'cover', ctx, `${company ? `Company: ${company}. ` : ''}${role ? `Role: ${role}. ` : ''}${jobContext}`, tone || 'professional')

    const letter = await db.coverLetter.create({
      data: {
        userId: user.id,
        resumeId: resumeId || null,
        type: type || 'cover',
        company: company || null,
        role: role || null,
        content,
      },
    })
    await db.aiUsage.create({ data: { userId: user.id, feature: 'cover-letter', tokens: 1 } })
    return NextResponse.json({ letter })
  } catch (e) {
    return err(e)
  }
}
