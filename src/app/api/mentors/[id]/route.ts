import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, err, parseJson } from '@/lib/server'

function serializeMentor(m: any) {
  return {
    ...m,
    expertise: parseJson<string[]>(m.expertise),
    industries: parseJson<string[]>(m.industries),
    availability: parseJson<any[]>(m.availability),
  }
}

function serializeBooking(b: any) {
  return {
    ...b,
    feedback: b.feedback ? parseJson(b.feedback) : null,
  }
}

// GET — single mentor with their bookings (read-only; anyone may view).
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const mentor = await db.mentor.findUnique({
      where: { id },
      include: {
        user: true,
        bookings: {
          include: { user: true },
          orderBy: { scheduledAt: 'asc' },
        },
      },
    })
    if (!mentor) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    return NextResponse.json({
      mentor: serializeMentor(mentor),
      bookings: mentor.bookings.map(serializeBooking),
    })
  } catch (e) {
    return err(e)
  }
}

// PUT — update the current user's OWN mentor profile only.
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const user = await getCurrentUser()
    const existing = await db.mentor.findUnique({ where: { id } })
    if (!existing || existing.userId !== user.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    const body = await req.json()

    // If slug is changing, ensure uniqueness.
    let nextSlug = existing.slug
    if (body.slug && body.slug !== existing.slug) {
      const candidate = await uniqueSlug(body.slug)
      nextSlug = candidate
    }

    const mentor = await db.mentor.update({
      where: { id },
      data: {
        title: body.title ?? existing.title,
        expertise: body.expertise ? JSON.stringify(body.expertise) : existing.expertise,
        industries: body.industries ? JSON.stringify(body.industries) : existing.industries,
        experience: body.experience ?? existing.experience,
        rate: body.rate !== undefined ? Number(body.rate) : existing.rate,
        currency: body.currency ?? existing.currency,
        bio: body.bio ?? existing.bio,
        availability: body.availability ? JSON.stringify(body.availability) : existing.availability,
        slug: nextSlug,
      },
    })

    try {
      await db.auditLog.create({
        data: {
          userId: user.id,
          action: 'mentor.update',
          entity: 'Mentor',
          entityId: mentor.id,
          meta: JSON.stringify({ fields: Object.keys(body) }),
        },
      })
    } catch {}

    return NextResponse.json({ mentor: serializeMentor(mentor) })
  } catch (e) {
    return err(e)
  }
}

async function uniqueSlug(base: string): Promise<string> {
  const raw =
    (base || 'mentor')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 48) || 'mentor'
  let candidate = raw
  let suffix = 0
  while (await db.mentor.findUnique({ where: { slug: candidate } })) {
    suffix += 1
    candidate = `${raw}-${suffix}`
  }
  return candidate
}
