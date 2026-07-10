import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, err, clipInput } from '@/lib/server'
import { rateLimitOr429 } from '@/lib/rate-limit'

/** List version snapshots for a resume. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const user = await getCurrentUser()
    // SECURITY: rate-limit to prevent version-enumeration scraping.
    const limited = rateLimitOr429(user.id, 'standard')
    if (limited) return limited
    const resume = await db.resume.findUnique({ where: { id } })
    // SECURITY: ownership check — prevents IDOR.
    if (!resume || resume.userId !== user.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    const versions = await db.resumeVersion.findMany({
      where: { resumeId: id },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({ versions, current: resume.version })
  } catch (e) {
    return err(e)
  }
}

/** Save a version snapshot (called when the user saves a meaningful edit). */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const user = await getCurrentUser()
    // SECURITY: rate-limit snapshot creation to prevent version-table flooding.
    const limited = rateLimitOr429(user.id, 'standard')
    if (limited) return limited
    const resume = await db.resume.findUnique({ where: { id } })
    // SECURITY: ownership check — prevents IDOR write.
    if (!resume || resume.userId !== user.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    const { note } = await req.json().catch(() => ({}))
    const nextVersion = resume.version + 1
    const version = await db.resumeVersion.create({
      data: {
        resumeId: id,
        version: nextVersion,
        data: resume.data,
        atsScore: resume.atsScore,
        aiScore: resume.aiScore,
        // SECURITY: clip user-supplied note.
        note: clipInput(note, 500) || `Version ${nextVersion}`,
      },
    })
    await db.resume.update({ where: { id }, data: { version: nextVersion } })
    return NextResponse.json({ version })
  } catch (e) {
    return err(e)
  }
}
