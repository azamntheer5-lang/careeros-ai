import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, err } from '@/lib/server'
import { rateLimitOr429 } from '@/lib/rate-limit'

/** POST — restore a resume to a specific version. Body: { versionId: string } */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const user = await getCurrentUser()
    // SECURITY: rate-limit restore to prevent write abuse.
    const limited = rateLimitOr429(user.id, 'standard')
    if (limited) return limited
    const body = await req.json().catch(() => ({}))

    // SECURITY: validate versionId shape before querying. Without this an
    // attacker could pass an object / array / non-string and trigger a
    // Prisma error or query with an unexpected type.
    const versionId = body?.versionId
    if (typeof versionId !== 'string' || !versionId.trim()) {
      return NextResponse.json(
        { error: 'versionId is required and must be a non-empty string' },
        { status: 400 }
      )
    }

    const resume = await db.resume.findUnique({ where: { id } })
    // SECURITY: ownership check — prevents IDOR.
    if (!resume || resume.userId !== user.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    // SECURITY: scoped to this resumeId so an attacker can't supply a
    // versionId from a different user's resume.
    const version = await db.resumeVersion.findFirst({
      where: { id: versionId, resumeId: id },
    })
    if (!version) {
      return NextResponse.json({ error: 'Version not found' }, { status: 404 })
    }

    // Save current state as a new version snapshot before restoring
    await db.resumeVersion.create({
      data: {
        resumeId: id,
        version: resume.version,
        data: resume.data,
        atsScore: resume.atsScore,
        aiScore: resume.aiScore,
        note: `Before restore to v${version.version}`,
      },
    })

    // Restore the old version's data
    const nextVersion = resume.version + 1
    const updated = await db.resume.update({
      where: { id },
      data: {
        data: version.data,
        atsScore: version.atsScore,
        aiScore: version.aiScore,
        version: nextVersion,
      },
    })

    try {
      await db.auditLog.create({
        data: { userId: user.id, action: 'resume.restore', entity: 'Resume', entityId: id },
      })
    } catch {}

    return NextResponse.json({ resume: updated })
  } catch (e) {
    return err(e)
  }
}
