import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, err } from '@/lib/server'

/** PUT — update a portfolio owned by the current user. */
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const user = await getCurrentUser()
    const existing = await db.portfolio.findUnique({ where: { id } })
    if (!existing || existing.userId !== user.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    const body = await req.json().catch(() => ({}))

    // Slug stays stable across edits unless explicitly provided + globally unique.
    let slug = existing.slug
    if (typeof body.slug === 'string' && body.slug && body.slug !== existing.slug) {
      const conflict = await db.portfolio.findUnique({ where: { slug: body.slug } })
      if (!conflict) slug = body.slug
    }

    const portfolio = await db.portfolio.update({
      where: { id },
      data: {
        title: body.title ?? existing.title,
        tagline: body.tagline ?? existing.tagline,
        bio: body.bio ?? existing.bio,
        theme: body.theme ?? existing.theme,
        accent: body.accent ?? existing.accent,
        sections: body.sections ? JSON.stringify(body.sections) : existing.sections,
        published: typeof body.published === 'boolean' ? body.published : existing.published,
        slug,
      },
    })

    try {
      await db.auditLog.create({
        data: { userId: user.id, action: 'portfolio.update', entity: 'Portfolio', entityId: id },
      })
    } catch {}

    return NextResponse.json({ portfolio })
  } catch (e) {
    return err(e)
  }
}

/** DELETE — remove a portfolio owned by the current user. */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const user = await getCurrentUser()
    const existing = await db.portfolio.findUnique({ where: { id } })
    if (!existing || existing.userId !== user.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    await db.portfolio.delete({ where: { id } })

    try {
      await db.auditLog.create({
        data: { userId: user.id, action: 'portfolio.delete', entity: 'Portfolio', entityId: id },
      })
    } catch {}

    return NextResponse.json({ ok: true })
  } catch (e) {
    return err(e)
  }
}
