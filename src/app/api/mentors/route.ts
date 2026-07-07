import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, err, parseJson } from '@/lib/server'

// ---------------------------------------------------------------------------
// Seed mentor profiles — only inserted when the marketplace is empty so the
// first visit shows a populated directory. Each mentor is owned by a synthetic
// seed user (unique email) so the relation is valid.
// ---------------------------------------------------------------------------
type SeedMentor = {
  email: string
  name: string
  headline: string
  title: string
  slug: string
  expertise: string[]
  industries: string[]
  experience: number
  rate: number // cents per 60-min session
  rating: number
  sessions: number
  bio: string
  availability: { day: string; slots: string[] }[]
  verified: boolean
}

const SEED_MENTORS: SeedMentor[] = [
  {
    email: 'sarah.chen@careeros.ai',
    name: 'Sarah Chen',
    headline: 'Principal Engineer, Google Cloud',
    title: 'Principal Engineer @ Google',
    slug: 'sarah-chen',
    expertise: ['System Design', 'Distributed Systems', 'Tech Leadership', 'Career Growth'],
    industries: ['Cloud Infrastructure', 'Big Tech'],
    experience: 12,
    rate: 20000,
    rating: 4.9,
    sessions: 124,
    bio: 'Principal Engineer leading infrastructure for Google Cloud. I help senior engineers level up to staff and beyond — system design interviews, architecture reviews, and the political navigation of large orgs.',
    availability: [
      { day: 'Mon', slots: ['17:00', '18:00', '19:00'] },
      { day: 'Wed', slots: ['17:00', '18:00'] },
      { day: 'Thu', slots: ['19:00', '20:00'] },
    ],
    verified: true,
  },
  {
    email: 'marcus.johnson@careeros.ai',
    name: 'Marcus Johnson',
    headline: 'Engineering Manager, Stripe',
    title: 'Engineering Manager @ Stripe',
    slug: 'marcus-johnson',
    expertise: ['Engineering Management', 'Hiring', 'Career Growth', '1:1 Coaching'],
    industries: ['Fintech', 'SaaS'],
    experience: 10,
    rate: 18000,
    rating: 4.8,
    sessions: 89,
    bio: 'EM at Stripe leading the Payments platform team. I coach first-time managers, review org design, and prep engineers for the transition from IC to management.',
    availability: [
      { day: 'Tue', slots: ['16:00', '17:00', '18:00'] },
      { day: 'Wed', slots: ['12:00', '13:00'] },
      { day: 'Fri', slots: ['15:00', '16:00'] },
    ],
    verified: true,
  },
  {
    email: 'priya.patel@careeros.ai',
    name: 'Priya Patel',
    headline: 'Senior PM, Airbnb',
    title: 'Senior Product Manager @ Airbnb',
    slug: 'priya-patel',
    expertise: ['Product Strategy', 'User Research', 'Roadmapping', 'Stakeholder Mgmt'],
    industries: ['Travel', 'Consumer Tech'],
    experience: 8,
    rate: 15000,
    rating: 4.7,
    sessions: 67,
    bio: 'Senior PM at Airbnb. I help engineers pivot into product, review case-study interviews, and sharpen product sense for high-growth startups.',
    availability: [
      { day: 'Mon', slots: ['10:00', '11:00'] },
      { day: 'Thu', slots: ['14:00', '15:00', '16:00'] },
    ],
    verified: true,
  },
  {
    email: 'david.kim@careeros.ai',
    name: 'David Kim',
    headline: 'Staff UX Designer, Figma',
    title: 'Staff UX Designer @ Figma',
    slug: 'david-kim',
    expertise: ['Design Systems', 'UX Research', 'Portfolio Review', 'Design Critique'],
    industries: ['Design Tools', 'SaaS'],
    experience: 9,
    rate: 16000,
    rating: 4.9,
    sessions: 102,
    bio: 'Staff designer at Figma. I review design portfolios, run mock design critiques, and help IC designers break into staff and design leadership.',
    availability: [
      { day: 'Tue', slots: ['18:00', '19:00'] },
      { day: 'Wed', slots: ['18:00', '19:00', '20:00'] },
      { day: 'Sat', slots: ['10:00', '11:00'] },
    ],
    verified: true,
  },
  {
    email: 'emily.rodriguez@careeros.ai',
    name: 'Emily Rodriguez',
    headline: 'Director of Data Science, Netflix',
    title: 'Director of Data Science @ Netflix',
    slug: 'emily-rodriguez',
    expertise: ['Machine Learning', 'Statistics', 'Career Pivots', 'Team Building'],
    industries: ['Streaming', 'AI/ML'],
    experience: 14,
    rate: 22000,
    rating: 5.0,
    sessions: 45,
    bio: 'Director of Data Science at Netflix leading the Recommendations ML org. I coach ML engineers transitioning to management and review research portfolios.',
    availability: [
      { day: 'Mon', slots: ['09:00', '10:00'] },
      { day: 'Fri', slots: ['13:00', '14:00'] },
    ],
    verified: true,
  },
  {
    email: 'james.obrien@careeros.ai',
    name: "James O'Brien",
    headline: 'VP of Engineering, Shopify',
    title: 'VP of Engineering @ Shopify',
    slug: 'james-obrien',
    expertise: ['Executive Coaching', 'Org Design', 'Hiring', 'Strategy'],
    industries: ['E-commerce', 'SaaS'],
    experience: 18,
    rate: 30000,
    rating: 4.9,
    sessions: 38,
    bio: 'VP Eng at Shopify. I coach directors and VPs on org design, executive presence, and the leap from running teams to running orgs of 200+.',
    availability: [
      { day: 'Tue', slots: ['08:00', '09:00'] },
      { day: 'Thu', slots: ['08:00', '09:00'] },
    ],
    verified: true,
  },
]

async function seedMentors() {
  for (const m of SEED_MENTORS) {
    const user = await db.user.create({
      data: { email: m.email, name: m.name, headline: m.headline, plan: 'premium' },
    })
    await db.mentor.create({
      data: {
        userId: user.id,
        slug: m.slug,
        title: m.title,
        expertise: JSON.stringify(m.expertise),
        industries: JSON.stringify(m.industries),
        experience: m.experience,
        rate: m.rate,
        currency: 'USD',
        rating: m.rating,
        sessions: m.sessions,
        bio: m.bio,
        availability: JSON.stringify(m.availability),
        verified: m.verified,
      },
    })
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function serializeMentor(m: any) {
  return {
    ...m,
    expertise: parseJson<string[]>(m.expertise),
    industries: parseJson<string[]>(m.industries),
    availability: parseJson<any[]>(m.availability),
    rateDisplay: `$${(m.rate / 100).toFixed(0)}`,
  }
}

function serializeBooking(b: any) {
  return {
    ...b,
    feedback: b.feedback ? parseJson(b.feedback) : null,
    mentor: b.mentor ? serializeMentor(b.mentor) : null,
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

// ---------------------------------------------------------------------------
// GET — list all mentors (seeds 6 on first visit) + current user's own
// mentor profile (if any) + the user's bookings.
// ---------------------------------------------------------------------------
export async function GET() {
  try {
    const user = await getCurrentUser()

    const count = await db.mentor.count()
    if (count === 0) {
      await seedMentors()
    }

    const [mentors, ownMentor, myBookings] = await Promise.all([
      db.mentor.findMany({
        include: { user: true },
        orderBy: [{ verified: 'desc' }, { rating: 'desc' }, { sessions: 'desc' }],
      }),
      db.mentor.findUnique({ where: { userId: user.id } }),
      db.booking.findMany({
        where: { userId: user.id },
        include: { mentor: { include: { user: true } } },
        orderBy: { scheduledAt: 'asc' },
      }),
    ])

    return NextResponse.json({
      mentors: mentors.map(serializeMentor),
      ownMentor: ownMentor ? serializeMentor(ownMentor) : null,
      myBookings: myBookings.map(serializeBooking),
    })
  } catch (e) {
    return err(e)
  }
}

// ---------------------------------------------------------------------------
// POST — create the current user's own mentor profile. Idempotent: if the
// user already has one, returns the existing record.
// ---------------------------------------------------------------------------
export async function POST(req: Request) {
  try {
    const user = await getCurrentUser()
    const body = await req.json().catch(() => ({}))

    const existing = await db.mentor.findUnique({ where: { userId: user.id } })
    if (existing) {
      return NextResponse.json({ mentor: serializeMentor(existing) })
    }

    const slug = await uniqueSlug(body.slug || user.name || 'mentor')
    const mentor = await db.mentor.create({
      data: {
        userId: user.id,
        slug,
        title: body.title || 'Career Mentor',
        expertise: JSON.stringify(body.expertise || []),
        industries: JSON.stringify(body.industries || []),
        experience: body.experience ?? null,
        rate: Number(body.rate) || 0,
        currency: body.currency || 'USD',
        bio: body.bio || null,
        availability: JSON.stringify(body.availability || []),
        verified: false,
      },
    })

    try {
      await db.auditLog.create({
        data: {
          userId: user.id,
          action: 'mentor.create',
          entity: 'Mentor',
          entityId: mentor.id,
          meta: JSON.stringify({ slug }),
        },
      })
    } catch {}

    return NextResponse.json({ mentor: serializeMentor(mentor) })
  } catch (e) {
    return err(e)
  }
}
