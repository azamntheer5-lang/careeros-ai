import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, err } from '@/lib/server'

/** List version snapshots for a resume. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const user = await getCurrentUser()
    const resume = await db.resume.findUnique({ where: { id } })
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
    const resume = await db.resume.findUnique({ where: { id } })
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
        note: note || `Version ${nextVersion}`,
      },
    })
    await db.resume.update({ where: { id }, data: { version: nextVersion } })
    return NextResponse.json({ version })
  } catch (e) {
    return err(e)
  }
}
