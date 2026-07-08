import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, err, parseJson } from '@/lib/server'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function slugify(name: string): string {
  return (name || 'member')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'member'
}

/** Ensure the current user has a NetworkProfile (creates one with slug from name if missing). */
async function ensureOwnProfile(userId: string, name: string, headline: string | null) {
  const existing = await db.networkProfile.findUnique({ where: { userId } })
  if (existing) return existing

  let slug = slugify(name)
  let attempt = slug
  let n = 0
  // Guarantee slug uniqueness against any other profile.
  while (await db.networkProfile.findUnique({ where: { slug: attempt } })) {
    n += 1
    attempt = `${slug}-${n}`
  }
  return db.networkProfile.create({
    data: {
      userId,
      slug: attempt,
      headline: headline || (name ? `${name}` : 'CareerOS Member'),
      bio: null,
      tags: JSON.stringify([]),
      visibility: 'public',
    },
  })
}

type SynthSeed = {
  email: string
  name: string
  headline: string
  bio: string
  tags: string[]
  posts: { type: string; title: string; content: string; tags: string[] }[]
}

// Deterministic synthetic professionals so the Discover feed always has content
// in this single-tenant demo. Created lazily on first GET if missing.
const SYNTHETIC: SynthSeed[] = [
  {
    email: 'sarah.chen@network.careeros.ai',
    name: 'Sarah Chen',
    headline: 'Staff Engineer @ Stripe',
    bio: 'Distributed systems & payments infrastructure. ex-Stripe, ex-Cloudflare. I write about scaling systems and the teams that build them.',
    tags: ['Distributed Systems', 'Fintech', 'Go'],
    posts: [
      {
        type: 'post',
        title: 'On idempotency at scale',
        content:
          'Idempotency keys aren\'t a checkbox — they\'re a contract. Three lessons from shipping payments infra at scale: (1) store the key + response before doing the work, (2) never reuse a key for a different intent, (3) TTLs are load-bearing. Get these right and 3am pages drop by 80%.',
        tags: ['Distributed Systems', 'Payments'],
      },
      {
        type: 'achievement',
        title: 'Sharded the ledger',
        content:
          'Migrated our 12TB payments ledger to a sharded topology with zero downtime. P99 writes dropped from 420ms to 38ms. Humbled by the team that made it happen.',
        tags: ['Scaling', 'Databases'],
      },
    ],
  },
  {
    email: 'marcus.webb@network.careeros.ai',
    name: 'Marcus Webb',
    headline: 'Engineering Director @ Linear',
    bio: 'Building the future of project tools. Passionate about developer experience and high-leverage teams. Previously @ Notion, @ Stripe.',
    tags: ['Engineering Leadership', 'SaaS', 'TypeScript'],
    posts: [
      {
        type: 'post',
        title: 'Hiring is a product',
        content:
          'Treat your hiring loop like a product funnel. Measure time-to-offer, drop-off per stage, and candidate NPS. The fastest lever on team velocity isn\'t a new framework — it\'s who you say no to and how fast you say yes.',
        tags: ['Hiring', 'Leadership'],
      },
      {
        type: 'question',
        title: 'How do you structure staff+ IC growth?',
        content:
          'Curious how other orgs define the boundary between Senior and Staff. We tried "scope = team" vs "scope = multi-team" but it feels too coarse. What has worked for you?',
        tags: ['Career Growth', 'Staff Engineer'],
      },
    ],
  },
  {
    email: 'priya.nair@network.careeros.ai',
    name: 'Priya Nair',
    headline: 'Principal PM @ Figma',
    bio: '0→1 product builder, writer, and mentor to early-stage founders. Previously @ Notion. I care about taste, speed, and craft.',
    tags: ['Product Management', 'Design Tools', '0→1'],
    posts: [
      {
        type: 'post',
        title: 'The product manager\'s job is not to write tickets',
        content:
          'It\'s to make the next decision obvious. The best PMs I\'ve worked with write 10x fewer docs but every one of them changes how the team thinks about the problem. Aim for fewer, sharper artifacts.',
        tags: ['Product', 'Craft'],
      },
      {
        type: 'opportunity',
        title: 'Looking for a founding PM',
        content:
          'A good friend is hiring a founding PM at a Series A dev-tools company. Remote-friendly, strong equity, exceptional team. DM if interested and I\'ll intro.',
        tags: ['Hiring', 'DevTools'],
      },
    ],
  },
  {
    email: 'diego.alvarez@network.careeros.ai',
    name: 'Diego Alvarez',
    headline: 'VP Engineering @ Vercel',
    bio: 'Edge compute, frontend infrastructure, and developer experience. I care about milliseconds. Previously @ Cloudflare, @ Google.',
    tags: ['Frontend Infra', 'Edge', 'Next.js'],
    posts: [
      {
        type: 'post',
        title: 'Edge-first is a mindset, not a runtime',
        content:
          'Moving compute to the edge only helps if your data model follows. Most teams ship edge functions that round-trip to a single-region DB and wonder why TTFB didn\'t improve. Co-locate data, then push compute outward.',
        tags: ['Edge', 'Performance'],
      },
      {
        type: 'achievement',
        title: 'Next.js 16 shipped',
        content:
          'After 9 months of work, Next.js 16 is out. Partial pre-rendering is stable, the dev server is 2x faster, and React 19 streaming is first-class. Proud of this team beyond words.',
        tags: ['Next.js', 'Open Source'],
      },
    ],
  },
]

/** Lazily seed synthetic professionals + their posts so the Network has content. */
async function seedSyntheticIfNeeded() {
  for (const seed of SYNTHETIC) {
    let user = await db.user.findUnique({ where: { email: seed.email } })
    if (!user) {
      user = await db.user.create({ data: { email: seed.email, name: seed.name, headline: seed.headline } })
    }
    let profile = await db.networkProfile.findUnique({ where: { userId: user.id } })
    if (!profile) {
      const slug = slugify(seed.name)
      let attempt = slug
      let n = 0
      while (await db.networkProfile.findUnique({ where: { slug: attempt } })) {
        n += 1
        attempt = `${slug}-${n}`
      }
      profile = await db.networkProfile.create({
        data: {
          userId: user.id,
          slug: attempt,
          headline: seed.headline,
          bio: seed.bio,
          tags: JSON.stringify(seed.tags),
          visibility: 'public',
          followers: Math.floor(Math.random() * 800) + 120,
        },
      })
    }
    // Seed posts only if this profile has none yet.
    const count = await db.post.count({ where: { userId: user.id } })
    if (count === 0) {
      for (const p of seed.posts) {
        await db.post.create({
          data: {
            userId: user.id,
            type: p.type,
            title: p.title,
            content: p.content,
            tags: JSON.stringify(p.tags),
            likes: Math.floor(Math.random() * 240) + 12,
            comments: Math.floor(Math.random() * 18) + 1,
          },
        })
      }
    }
  }
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
    authorHeadline: p.user?.headline ?? p.networkProfile?.headline ?? null,
  }
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

/** GET — current user's NetworkProfile + recent feed + suggested professionals. */
export async function GET() {
  try {
    const user = await getCurrentUser()

    // Ensure synthetic profiles exist (so Discover + Feed have content).
    await seedSyntheticIfNeeded()

    const profile = await ensureOwnProfile(user.id, user.name || 'member', user.headline)
    // Attach the user relation so serializeProfile can read name/headline.
    const profileWithUser = { ...profile, user: { name: user.name, headline: user.headline } }

    // Recent posts from all users (feed), with author info.
    const rawPosts = await db.post.findMany({
      include: { user: true },
      orderBy: { createdAt: 'desc' },
      take: 40,
    })
    const posts = rawPosts.map(serializePost)

    // Suggested professionals: every NetworkProfile that isn't the current user's.
    const allProfiles = await db.networkProfile.findMany({
      where: { userId: { not: user.id } },
      include: { user: true },
    })
    // Current user's existing connections (who they follow).
    const connections = await db.connection.findMany({
      where: { followerId: profile.id },
      select: { followeeId: true },
    })
    const followingSet = new Set(connections.map((c) => c.followeeId))
    const suggested = allProfiles.map((p) => ({
      ...serializeProfile(p),
      isFollowing: followingSet.has(p.id),
    }))

    return NextResponse.json({ profile: serializeProfile(profileWithUser), posts, suggested })
  } catch (e) {
    return err(e)
  }
}

/** POST — create a new post from the current user. */
export async function POST(req: Request) {
  try {
    const user = await getCurrentUser()
    const body = await req.json()
    const content = (body?.content ?? '').toString().trim()
    if (!content) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 })
    }
    const type = ['post', 'achievement', 'question', 'opportunity'].includes(body?.type)
      ? body.type
      : 'post'
    const title = body?.title ? String(body.title).trim() : null
    const tags = Array.isArray(body?.tags) ? body.tags.map(String).filter(Boolean) : []

    const post = await db.post.create({
      data: {
        userId: user.id,
        type,
        title,
        content,
        tags: JSON.stringify(tags),
      },
      include: { user: true },
    })
    return NextResponse.json({ post: serializePost(post) })
  } catch (e) {
    return err(e)
  }
}
