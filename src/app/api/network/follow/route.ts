import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, err } from '@/lib/server'

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

/** POST { followeeId } — toggle follow/unfollow on a NetworkProfile. */
export async function POST(req: Request) {
  try {
    const user = await getCurrentUser()
    const { followeeId } = await req.json()
    if (typeof followeeId !== 'string' || !followeeId) {
      return NextResponse.json({ error: 'followeeId is required' }, { status: 400 })
    }

    const follower = await ensureOwnProfile(user.id, user.name || 'member', user.headline)
    const followee = await db.networkProfile.findUnique({ where: { id: followeeId } })
    if (!followee || followee.id === follower.id) {
      return NextResponse.json({ error: 'Invalid followee' }, { status: 400 })
    }

    const existing = await db.connection.findUnique({
      where: { followerId_followeeId: { followerId: follower.id, followeeId: followee.id } },
    })

    if (existing) {
      // Unfollow
      await db.connection.delete({ where: { id: existing.id } })
      await db.networkProfile.update({ where: { id: follower.id }, data: { following: { decrement: 1 } } })
      await db.networkProfile.update({ where: { id: followee.id }, data: { followers: { decrement: 1 } } })
      return NextResponse.json({ following: false, followers: Math.max(0, followee.followers - 1) })
    }

    // Follow
    await db.connection.create({ data: { followerId: follower.id, followeeId: followee.id } })
    await db.networkProfile.update({ where: { id: follower.id }, data: { following: { increment: 1 } } })
    await db.networkProfile.update({ where: { id: followee.id }, data: { followers: { increment: 1 } } })
    return NextResponse.json({ following: true, followers: followee.followers + 1 })
  } catch (e) {
    return err(e)
  }
}
