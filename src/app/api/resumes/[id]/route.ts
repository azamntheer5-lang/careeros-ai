import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, err, clipInput } from '@/lib/server'
import { rateLimitOr429 } from '@/lib/rate-limit'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const user = await getCurrentUser()
    // SECURITY: rate-limit single-fetch to prevent IDOR-style enumeration.
    // NOTE: This GET endpoint already requires auth + ownership check below —
    // the previous "missing auth" issue is resolved.
    const limited = rateLimitOr429(user.id, 'standard')
    if (limited) return limited
    const resume = await db.resume.findUnique({ where: { id } })
    // SECURITY: ownership check — prevents IDOR (Insecure Direct Object Reference).
    // Returns 404 (not 403) to avoid leaking which IDs exist.
    if (!resume || resume.userId !== user.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    return NextResponse.json({ resume })
  } catch (e) {
    return err(e)
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const user = await getCurrentUser()
    // SECURITY: rate-limit update endpoint to prevent write abuse.
    const limited = rateLimitOr429(user.id, 'standard')
    if (limited) return limited
    const body = await req.json().catch(() => ({}))
    const existing = await db.resume.findUnique({ where: { id } })
    // SECURITY: ownership check — prevents IDOR write.
    if (!existing || existing.userId !== user.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const nextVersion = existing.version + 1

    // Save a version snapshot of the CURRENT state before overwriting
    await db.resumeVersion.create({
      data: {
        resumeId: id,
        version: existing.version,
        data: existing.data,
        atsScore: existing.atsScore,
        aiScore: existing.aiScore,
        note: clipInput(body.note, 500) || `Version ${existing.version}`,
      },
    })

    const resume = await db.resume.update({
      where: { id },
      data: {
        // SECURITY: clip all user-supplied string fields before persisting.
        // Only overwrite when the field is explicitly provided (preserves the
        // ?? semantics: undefined / null body fields keep the existing value).
        title: body.title != null ? (clipInput(body.title, 200) || existing.title) : existing.title,
        template: body.template != null ? (clipInput(body.template, 50) || existing.template) : existing.template,
        accent: body.accent != null ? (clipInput(body.accent, 50) || existing.accent) : existing.accent,
        font: body.font != null ? (clipInput(body.font, 50) || existing.font) : existing.font,
        spacing: body.spacing != null ? (clipInput(body.spacing, 50) || existing.spacing) : existing.spacing,
        data: body.data ? JSON.stringify(body.data) : existing.data,
        atsScore: typeof body.atsScore === 'number' ? body.atsScore : existing.atsScore,
        aiScore: typeof body.aiScore === 'number' ? body.aiScore : existing.aiScore,
        version: nextVersion,
      },
    })
    return NextResponse.json({ resume })
  } catch (e) {
    return err(e)
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const user = await getCurrentUser()
    // SECURITY: rate-limit delete endpoint to prevent destructive abuse.
    const limited = rateLimitOr429(user.id, 'standard')
    if (limited) return limited
    const existing = await db.resume.findUnique({ where: { id } })
    // SECURITY: ownership check — prevents IDOR delete.
    if (!existing || existing.userId !== user.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    await db.resume.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return err(e)
  }
}
