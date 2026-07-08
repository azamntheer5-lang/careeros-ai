import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, err } from '@/lib/server'

/** Default section config for a freshly-created portfolio. */
const DEFAULT_SECTIONS = [
  { id: 'hero', type: 'hero', title: 'Hero', visible: true },
  { id: 'about', type: 'about', title: 'About', visible: true },
  { id: 'experience', type: 'experience', title: 'Experience', visible: true },
  { id: 'skills', type: 'skills', title: 'Skills', visible: true },
  { id: 'projects', type: 'projects', title: 'Projects', visible: true },
  { id: 'certifications', type: 'certifications', title: 'Certifications', visible: false },
  { id: 'contact', type: 'contact', title: 'Contact', visible: true },
]

/** Build a URL-safe slug from a title and ensure it is unique for this user. */
async function uniqueSlug(base: string): Promise<string> {
  const raw = (base || 'portfolio')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48) || 'portfolio'

  let candidate = raw
  let suffix = 0
  // Loop until we find a slug that is globally unique.
  while (await db.portfolio.findUnique({ where: { slug: candidate } })) {
    suffix += 1
    candidate = `${raw}-${suffix}`
  }
  return candidate
}

/** GET — list the current user's portfolios. */
export async function GET() {
  try {
    const user = await getCurrentUser()
    const portfolios = await db.portfolio.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: 'desc' },
    })
    return NextResponse.json({ portfolios })
  } catch (e) {
    return err(e)
  }
}

/** POST — create a new portfolio with a unique slug derived from the title. */
export async function POST(req: Request) {
  try {
    const user = await getCurrentUser()
    const body = await req.json().catch(() => ({}))
    const title = (body.title as string) || 'My Portfolio'
    const slug = await uniqueSlug(title)

    const portfolio = await db.portfolio.create({
      data: {
        userId: user.id,
        slug,
        title,
        tagline: body.tagline ?? null,
        bio: body.bio ?? null,
        theme: body.theme ?? 'aurora',
        accent: body.accent ?? 'emerald',
        sections: JSON.stringify(body.sections ?? DEFAULT_SECTIONS),
        published: false,
      },
    })

    try {
      await db.auditLog.create({
        data: { userId: user.id, action: 'portfolio.create', entity: 'Portfolio', entityId: portfolio.id },
      })
    } catch {}

    return NextResponse.json({ portfolio })
  } catch (e) {
    return err(e)
  }
}
