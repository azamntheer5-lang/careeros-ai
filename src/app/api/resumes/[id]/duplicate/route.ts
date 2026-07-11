import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, err } from '@/lib/server'
import { rateLimitOr429 } from '@/lib/rate-limit'

/** POST — duplicate a resume (creates a copy with "(Copy)" suffix). */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const user = await getCurrentUser()
    // SECURITY: rate-limit duplicate to prevent DB-row flooding.
    const limited = rateLimitOr429(user.id, 'standard')
    if (limited) return limited
    const original = await db.resume.findUnique({ where: { id } })
    // SECURITY: ownership check — prevents IDOR (copying another user's resume).
    if (!original || original.userId !== user.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const copy = await db.resume.create({
      data: {
        userId: user.id,
        title: `${original.title} (Copy)`,
        template: original.template,
        accent: original.accent,
        font: original.font,
        spacing: original.spacing,
        careerMode: original.careerMode,
        data: original.data,
        atsScore: original.atsScore,
        aiScore: original.aiScore,
        version: 1,
      },
    })

    try {
      await db.auditLog.create({
        data: { userId: user.id, action: 'resume.duplicate', entity: 'Resume', entityId: copy.id },
      })
    } catch {}

    return NextResponse.json({ resume: copy })
  } catch (e) {
    return err(e)
  }
}
