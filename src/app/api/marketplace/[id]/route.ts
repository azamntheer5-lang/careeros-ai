import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, err, parseJson } from '@/lib/server'

// ---------------------------------------------------------------------------
// Helpers (mirror of the list route)
// ---------------------------------------------------------------------------

function priceDisplay(price: number): string {
  if (!price || price <= 0) return 'Free'
  const dollars = price / 100
  return `$${dollars % 1 === 0 ? dollars.toFixed(0) : dollars.toFixed(2)}`
}

function serializeTemplate(t: any) {
  return {
    id: t.id,
    kind: 'template' as const,
    creatorId: t.creatorId,
    creatorName: t.creator?.name ?? null,
    creatorHeadline: t.creator?.headline ?? null,
    type: t.type,
    name: t.name,
    description: t.description ?? null,
    category: t.category ?? null,
    preview: t.preview ? parseJson<any>(t.preview) : null,
    config: t.config ? parseJson<any>(t.config) : null,
    price: t.price ?? 0,
    priceDisplay: priceDisplay(t.price ?? 0),
    downloads: t.downloads ?? 0,
    rating: t.rating ?? 0,
    published: t.published,
    featured: t.featured,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  }
}

function serializeContent(c: any) {
  return {
    id: c.id,
    kind: 'content' as const,
    creatorId: c.creatorId,
    creatorName: c.creator?.name ?? null,
    creatorHeadline: c.creator?.headline ?? null,
    type: c.type,
    title: c.title,
    description: c.description ?? null,
    content: c.content ?? '',
    price: c.price ?? 0,
    priceDisplay: priceDisplay(c.price ?? 0),
    tags: c.tags ? parseJson<string[]>(c.tags) : [],
    published: c.published,
    enrollments: c.enrollments ?? 0,
    rating: c.rating ?? 0,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  }
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

/** GET — a single Template OR CreatorContent by id (cuids are globally unique). */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    const tpl = await db.template.findUnique({
      where: { id },
      include: { creator: true },
    })
    if (tpl) return NextResponse.json({ item: serializeTemplate(tpl) })

    const content = await db.creatorContent.findUnique({
      where: { id },
      include: { creator: true },
    })
    if (content) return NextResponse.json({ item: serializeContent(content) })

    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  } catch (e) {
    return err(e)
  }
}

/** PUT — update a Template or CreatorContent owned by the current user. */
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const user = await getCurrentUser()
    const body = await req.json().catch(() => ({}))

    // Try Template first.
    const tpl = await db.template.findUnique({ where: { id } })
    if (tpl) {
      if (tpl.creatorId !== user.id) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 })
      }
      const updated = await db.template.update({
        where: { id },
        data: {
          name: body?.name != null ? String(body.name).trim() || tpl.name : tpl.name,
          description: body?.description != null ? (body.description ? String(body.description) : null) : tpl.description,
          category: body?.category != null ? (body.category ? String(body.category) : null) : tpl.category,
          config: body?.config != null
            ? typeof body.config === 'string' ? body.config : JSON.stringify(body.config)
            : tpl.config,
          preview: body?.preview != null
            ? typeof body.preview === 'string' ? body.preview : JSON.stringify(body.preview)
            : tpl.preview,
          price: body?.price != null ? Math.max(0, Math.floor(Number(body.price) || 0)) : tpl.price,
          published: typeof body?.published === 'boolean' ? body.published : tpl.published,
          featured: typeof body?.featured === 'boolean' ? body.featured : tpl.featured,
        },
        include: { creator: true },
      })

      try {
        await db.auditLog.create({
          data: { userId: user.id, action: 'template.update', entity: 'Template', entityId: id },
        })
      } catch {}

      return NextResponse.json({ item: serializeTemplate(updated) })
    }

    // Else try CreatorContent.
    const content = await db.creatorContent.findUnique({ where: { id } })
    if (content) {
      if (content.creatorId !== user.id) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 })
      }
      const updated = await db.creatorContent.update({
        where: { id },
        data: {
          title: body?.title != null ? String(body.title).trim() || content.title : content.title,
          description: body?.description != null ? (body.description ? String(body.description) : null) : content.description,
          content: body?.content != null ? String(body.content) : content.content,
          price: body?.price != null ? Math.max(0, Math.floor(Number(body.price) || 0)) : content.price,
          tags: body?.tags != null ? JSON.stringify(Array.isArray(body.tags) ? body.tags.map(String).filter(Boolean) : []) : content.tags,
          published: typeof body?.published === 'boolean' ? body.published : content.published,
        },
        include: { creator: true },
      })

      try {
        await db.auditLog.create({
          data: { userId: user.id, action: 'creator_content.update', entity: 'CreatorContent', entityId: id },
        })
      } catch {}

      return NextResponse.json({ item: serializeContent(updated) })
    }

    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  } catch (e) {
    return err(e)
  }
}

/** DELETE — remove a Template or CreatorContent owned by the current user. */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const user = await getCurrentUser()

    const tpl = await db.template.findUnique({ where: { id } })
    if (tpl) {
      if (tpl.creatorId !== user.id) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 })
      }
      await db.template.delete({ where: { id } })

      try {
        await db.auditLog.create({
          data: { userId: user.id, action: 'template.delete', entity: 'Template', entityId: id },
        })
      } catch {}

      return NextResponse.json({ ok: true })
    }

    const content = await db.creatorContent.findUnique({ where: { id } })
    if (content) {
      if (content.creatorId !== user.id) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 })
      }
      await db.creatorContent.delete({ where: { id } })

      try {
        await db.auditLog.create({
          data: { userId: user.id, action: 'creator_content.delete', entity: 'CreatorContent', entityId: id },
        })
      } catch {}

      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  } catch (e) {
    return err(e)
  }
}
