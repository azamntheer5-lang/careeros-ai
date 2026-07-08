import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, err, parseJson } from '@/lib/server'

function slugify(name: string): string {
  return (name || 'member')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'member'
}

async function ensureOwnProfile(userId: string, name: string, headline: string | null) {
  const existing = await db.networkProfile.findUnique({ where: { userId } })
  if (existing) return existing
  let slug = slugify(name)
  let attempt = slug
  let n = 0
  while (await db.networkProfile.findUnique({ where: { slug: attempt } })) {
    n += 1
    attempt = `${slug}-${n}`
  }
  return db.networkProfile.create({
    data: {
      userId,
      slug: attempt,
      headline: headline || (name ? `${name}` : 'CareerOS Member'),
      tags: JSON.stringify([]),
      visibility: 'public',
    },
  })
}

function serializeProfile(p: any) {
  return {
    id: p.id,
    userId: p.userId,
    slug: p.slug,
    bio: p.bio,
    headline: p.headline,
    tags: parseJson<string[]>(p.tags),
    visibility: p.visibility,
    followers: p.followers,
    following: p.following,
    userName: p.user?.name ?? null,
    userHeadline: p.user?.headline ?? null,
  }
}

function serializePost(p: any) {
  return {
    id: p.id,
    type: p.type,
    title: p.title,
    content: p.content,
    tags: parseJson<string[]>(p.tags),
    likes: p.likes,
    comments: p.comments,
    createdAt: p.createdAt,
    authorId: p.userId,
    authorName: p.user?.name ?? null,
    authorHeadline: p.user?.headline ?? null,
  }
}

/** GET — public NetworkProfile by slug (with their posts + follower/following counts). */
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params
    const profile = await db.networkProfile.findUnique({
      where: { slug },
      include: { user: true },
    })
    if (!profile || profile.visibility === 'private') {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }
    const posts = await db.post.findMany({
      where: { userId: profile.userId },
      include: { user: true },
      orderBy: { createdAt: 'desc' },
      take: 20,
    })
    return NextResponse.json({
      profile: serializeProfile(profile),
      posts: posts.map(serializePost),
    })
  } catch (e) {
    return err(e)
  }
}

/** PUT — update the current user's own profile (matched by slug). */
export async function PUT(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params
    const user = await getCurrentUser()
    const own = await ensureOwnProfile(user.id, user.name || 'member', user.headline)
    if (own.slug !== slug) {
      return NextResponse.json({ error: 'You can only edit your own profile' }, { status: 403 })
    }
    const body = await req.json()
    const data: Record<string, unknown> = {}
    if (typeof body.bio === 'string') data.bio = body.bio.trim() ? body.bio.trim() : null
    if (typeof body.headline === 'string') data.headline = body.headline.trim() ? body.headline.trim() : null
    if (Array.isArray(body.tags)) data.tags = JSON.stringify(body.tags.map(String).filter(Boolean))
    if (body.visibility === 'public' || body.visibility === 'private') data.visibility = body.visibility

    const updated = await db.networkProfile.update({
      where: { id: own.id },
      data,
      include: { user: true },
    })
    return NextResponse.json({ profile: serializeProfile(updated) })
  } catch (e) {
    return err(e)
  }
}
