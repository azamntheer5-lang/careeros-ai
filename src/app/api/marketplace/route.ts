import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, err, parseJson } from '@/lib/server'

// ---------------------------------------------------------------------------
// Helpers
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
    type: t.type, // resume | portfolio | cover_letter
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
    type: c.type, // course | guide | template | coaching_pack
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
// Seed data — diverse templates + creator content, lazily created on first GET
// when the marketplace has no published items.
// ---------------------------------------------------------------------------

type CreatorSeed = { email: string; name: string; headline: string }

const CREATORS: CreatorSeed[] = [
  { email: 'jordan.blake@creators.careeros.ai', name: 'Jordan Blake', headline: 'Principal Engineer · Resume Strategist' },
  { email: 'marisol.vance@creators.careeros.ai', name: 'Marisol Vance', headline: 'Executive Career Coach · ex-CPO' },
  { email: 'liam.park@creators.careeros.ai', name: 'Liam Park', headline: 'Design Director · Portfolio Specialist' },
  { email: 'priya.anand@creators.careeros.ai', name: 'Priya Anand', headline: 'Staff Engineer · Developer Advocate' },
  { email: 'diego.costa@creators.careeros.ai', name: 'Diego Costa', headline: 'Indie Hacker · Minimalist' },
  { email: 'sarah.chen@creators.careeros.ai', name: 'Sarah Chen', headline: 'Staff Engineer @ Stripe · Interviewer' },
  { email: 'marcus.webb@creators.careeros.ai', name: 'Marcus Webb', headline: 'Engineering Director @ Linear' },
  { email: 'priya.patel@creators.careeros.ai', name: 'Priya Patel', headline: 'Principal PM @ Figma · Leadership Coach' },
  { email: 'david.kim@creators.careeros.ai', name: 'David Kim', headline: 'Staff UX Designer · Brand Strategist' },
]

async function ensureCreator(seed: CreatorSeed) {
  let user = await db.user.findUnique({ where: { email: seed.email } })
  if (!user) {
    user = await db.user.create({
      data: { email: seed.email, name: seed.name, headline: seed.headline, role: 'creator' },
    })
  }
  return user
}

type TemplateSeed = {
  creatorEmail: string
  type: 'resume' | 'portfolio' | 'cover_letter'
  name: string
  description: string
  category: string
  accent: string
  price: number
  downloads: number
  rating: number
  featured: boolean
  config: Record<string, unknown>
  preview: Record<string, unknown>
}

const TEMPLATE_SEEDS: TemplateSeed[] = [
  {
    creatorEmail: 'jordan.blake@creators.careeros.ai',
    type: 'resume',
    name: 'Tech Resume Pro',
    description:
      'A clean, recruiter-tested resume template tuned for software engineers. Two-column header, strong bullet hierarchy, ATS-safe typography. Used by engineers hired at Stripe, Vercel and Linear.',
    category: 'Engineering',
    accent: 'emerald',
    price: 0,
    downloads: 12453,
    rating: 4.9,
    featured: true,
    config: {
      template: 'modern',
      accent: 'emerald',
      font: 'inter',
      spacing: 'normal',
      careerMode: 'developer',
      sampleData: {
        contact: { name: 'Your Name', email: 'you@example.com', phone: '+1 555 0123', location: 'San Francisco, CA', website: '', linkedin: 'linkedin.com/in/you' },
        summary: 'Senior software engineer specializing in distributed systems and developer experience.',
        experience: [
          { title: 'Senior Engineer', company: 'Acme Corp', location: 'Remote', start: '2022', end: 'Present', bullets: ['Led migration to event-driven architecture, cutting p99 latency by 40%.', 'Mentored 4 engineers; introduced design review process.'] },
        ],
        education: [{ school: 'University', degree: 'B.S. Computer Science', start: '2014', end: '2018' }],
        skills: ['TypeScript', 'Go', 'Kubernetes', 'Postgres', 'Distributed Systems'],
        projects: [],
        certifications: [],
      },
    },
    preview: { accent: 'emerald', layout: 'two-column-header', font: 'inter' },
  },
  {
    creatorEmail: 'marisol.vance@creators.careeros.ai',
    type: 'resume',
    name: 'Executive Elegant',
    description:
      'A refined single-column resume for directors, VPs and C-suite. Serif typography, generous whitespace, and a leadership-first narrative arc.',
    category: 'Executive',
    accent: 'slate',
    price: 1900,
    downloads: 8721,
    rating: 4.8,
    featured: true,
    config: {
      template: 'executive',
      accent: 'slate',
      font: 'serif',
      spacing: 'relaxed',
      careerMode: 'executive',
      sampleData: {
        contact: { name: 'Your Name', email: 'you@example.com', phone: '+1 555 0199', location: 'New York, NY', website: '', linkedin: 'linkedin.com/in/you' },
        summary: 'Product executive with 15+ years scaling B2B SaaS from $5M to $200M ARR.',
        experience: [
          { title: 'VP Product', company: 'Northwind', location: 'New York', start: '2020', end: 'Present', bullets: ['Grew ARR from $20M to $140M in 4 years.', 'Built and led a 38-person product org across 4 time zones.'] },
        ],
        education: [{ school: 'Wharton', degree: 'MBA', start: '2008', end: '2010' }],
        skills: ['Product Strategy', 'Executive Leadership', 'P&L', 'Go-to-Market'],
        projects: [],
        certifications: [],
      },
    },
    preview: { accent: 'slate', layout: 'single-column', font: 'serif' },
  },
  {
    creatorEmail: 'liam.park@creators.careeros.ai',
    type: 'resume',
    name: 'Creative Bold',
    description:
      'For designers, brand strategists and creative directors. A confident accent bar, type-forward hierarchy, and room for a portfolio link.',
    category: 'Design',
    accent: 'fuchsia',
    price: 900,
    downloads: 6543,
    rating: 4.7,
    featured: false,
    config: {
      template: 'creative',
      accent: 'fuchsia',
      font: 'inter',
      spacing: 'normal',
      careerMode: 'designer',
      sampleData: {
        contact: { name: 'Your Name', email: 'you@example.com', phone: '', location: 'Berlin', website: 'yourname.design', linkedin: '' },
        summary: 'Senior product designer crafting brand-led digital experiences.',
        experience: [
          { title: 'Senior Designer', company: 'Studio', location: 'Berlin', start: '2021', end: 'Present', bullets: ['Led 0→1 brand system for a Series A fintech.', 'Shipped 12 marketing sites with avg. Lighthouse 98.'] },
        ],
        education: [{ school: 'RISD', degree: 'BFA Graphic Design', start: '2013', end: '2017' }],
        skills: ['Brand Systems', 'Figma', 'Webflow', 'Type Design'],
        projects: [],
        certifications: [],
      },
    },
    preview: { accent: 'fuchsia', layout: 'accent-bar', font: 'inter' },
  },
  {
    creatorEmail: 'jordan.blake@creators.careeros.ai',
    type: 'resume',
    name: 'ATS Optimized',
    description:
      'A no-frills, single-column resume engineered to parse cleanly in every ATS. Tested against Greenhouse, Lever and Workday.',
    category: 'ATS',
    accent: 'emerald',
    price: 0,
    downloads: 18902,
    rating: 4.9,
    featured: false,
    config: {
      template: 'ats',
      accent: 'emerald',
      font: 'inter',
      spacing: 'normal',
      careerMode: 'general',
      sampleData: {
        contact: { name: 'Your Name', email: 'you@example.com', phone: '+1 555 0100', location: 'Austin, TX', website: '', linkedin: 'linkedin.com/in/you' },
        summary: 'Software engineer with 6 years building scalable web platforms.',
        experience: [
          { title: 'Software Engineer', company: 'Globex', location: 'Austin, TX', start: '2020', end: 'Present', bullets: ['Built CI pipeline reducing deploy time by 60%.', 'Owned auth service serving 2M users.'] },
        ],
        education: [{ school: 'UT Austin', degree: 'B.S. Computer Science', start: '2014', end: '2018' }],
        skills: ['Python', 'React', 'AWS', 'PostgreSQL', 'CI/CD'],
        projects: [],
        certifications: [],
      },
    },
    preview: { accent: 'emerald', layout: 'single-column', font: 'inter' },
  },
  {
    creatorEmail: 'priya.anand@creators.careeros.ai',
    type: 'portfolio',
    name: 'Aurora',
    description:
      'A developer portfolio with an animated gradient hero, project showcase grid and a code-snippet section. Built for speed and SEO.',
    category: 'Developer',
    accent: 'emerald',
    price: 0,
    downloads: 5421,
    rating: 4.8,
    featured: true,
    config: {
      theme: 'aurora',
      accent: 'emerald',
      sections: [
        { type: 'hero', title: 'Hi, I build things for the web.' },
        { type: 'projects', title: 'Selected Work' },
        { type: 'skills', title: 'Stack' },
        { type: 'contact', title: 'Get in touch' },
      ],
    },
    preview: { accent: 'emerald', theme: 'aurora', hero: 'gradient' },
  },
  {
    creatorEmail: 'diego.costa@creators.careeros.ai',
    type: 'portfolio',
    name: 'Minimal Dev',
    description:
      'A minimalist, monochrome portfolio for engineers who let the work speak. Mono typography, generous whitespace, zero distractions.',
    category: 'Developer',
    accent: 'slate',
    price: 0,
    downloads: 3210,
    rating: 4.6,
    featured: false,
    config: {
      theme: 'minimal',
      accent: 'slate',
      sections: [
        { type: 'hero', title: 'Engineer. Shipping quietly.' },
        { type: 'projects', title: 'Work' },
        { type: 'writing', title: 'Writing' },
        { type: 'contact', title: 'Contact' },
      ],
    },
    preview: { accent: 'slate', theme: 'minimal', hero: 'mono' },
  },
  {
    creatorEmail: 'liam.park@creators.careeros.ai',
    type: 'portfolio',
    name: 'Bold Studio',
    description:
      'A high-contrast, type-forward portfolio for designers and studios. Large imagery, animated case-study cards, and a sticky case index.',
    category: 'Designer',
    accent: 'fuchsia',
    price: 1200,
    downloads: 2103,
    rating: 4.7,
    featured: false,
    config: {
      theme: 'bold',
      accent: 'fuchsia',
      sections: [
        { type: 'hero', title: 'Design with conviction.' },
        { type: 'caseStudies', title: 'Case Studies' },
        { type: 'about', title: 'Studio' },
        { type: 'contact', title: 'Start a project' },
      ],
    },
    preview: { accent: 'fuchsia', theme: 'bold', hero: 'type-forward' },
  },
  {
    creatorEmail: 'marisol.vance@creators.careeros.ai',
    type: 'cover_letter',
    name: 'Polished Pro',
    description:
      'A professional cover letter template with a strong opening hook, role-mapping middle paragraph, and a confident close. Recruiter-approved tone.',
    category: 'Professional',
    accent: 'amber',
    price: 0,
    downloads: 7890,
    rating: 4.8,
    featured: false,
    config: {
      tone: 'professional',
      structure: 'hook-match-close',
      sampleContent:
        'Dear Hiring Manager,\n\nI was excited to see the {role} opening at {company}. Over the past {years} years, I have {achievement_1} and {achievement_2} — both of which map directly to the challenges outlined in your job description.\n\nIn my current role at {current_company}, I {recent_win}. I am drawn to {company} because {reason}, and I would welcome the chance to contribute.\n\nThank you for your time,\n{your_name}',
    },
    preview: { accent: 'amber', tone: 'professional' },
  },
]

type ContentSeed = {
  creatorEmail: string
  type: 'course' | 'guide' | 'template' | 'coaching_pack'
  title: string
  description: string
  price: number
  tags: string[]
  enrollments: number
  rating: number
  content: string
}

const CONTENT_SEEDS: ContentSeed[] = [
  {
    creatorEmail: 'sarah.chen@creators.careeros.ai',
    type: 'guide',
    title: 'System Design Interview Guide',
    description:
      'A 60-page guide covering the exact framework senior engineers use to ace system design interviews. Includes 8 worked examples (URL shortener, news feed, chat, rate limiter and more) with trade-off analysis.',
    price: 2900,
    tags: ['Interviews', 'System Design', 'Engineering'],
    enrollments: 3201,
    rating: 4.9,
    content:
      '# System Design Interview Guide\n\n## Framework\n1. Clarify requirements (functional + non-functional)\n2. Estimate scale\n3. Draw the high-level architecture\n4. Deep-dive each component\n5. Identify bottlenecks + trade-offs\n\n## Worked Example: URL Shortener\n... (full guide inside)',
  },
  {
    creatorEmail: 'marcus.webb@creators.careeros.ai',
    type: 'guide',
    title: 'Salary Negotiation Playbook',
    description:
      'A step-by-step playbook for negotiating a new offer or a raise. Includes exact scripts, counter-offer templates, and a market-data framework. Average reader increase: $24k.',
    price: 1900,
    tags: ['Salary', 'Negotiation', 'Career'],
    enrollments: 5410,
    rating: 4.8,
    content:
      '# Salary Negotiation Playbook\n\n## The 5-step framework\n1. Anchor on market data, not your current salary\n2. Make the first number when you can\n3. Counter with a specific, justified figure\n4. Negotiate the package, not just base\n5. Get it in writing\n\n## Scripts\n... (full playbook inside)',
  },
  {
    creatorEmail: 'priya.patel@creators.careeros.ai',
    type: 'course',
    title: 'From IC to Manager',
    description:
      'A 6-module course for senior engineers transitioning to engineering management. Covers the mindset shift, 1:1 frameworks, hiring, performance, and the first 90 days.',
    price: 7900,
    tags: ['Leadership', 'Management', 'Career'],
    enrollments: 1230,
    rating: 4.7,
    content:
      '# From IC to Manager\n\n## Modules\n1. The mindset shift\n2. Running great 1:1s\n3. Hiring your team\n4. Performance + feedback\n5. Strategic planning\n6. Your first 90 days\n\n... (full course inside)',
  },
  {
    creatorEmail: 'david.kim@creators.careeros.ai',
    type: 'guide',
    title: 'LinkedIn Branding Masterclass',
    description:
      'A practical guide to turning your LinkedIn profile into a magnet for recruiters and founders. Includes a headline formula, about-section template, and a 30-day posting plan.',
    price: 1500,
    tags: ['Branding', 'LinkedIn', 'Networking'],
    enrollments: 4321,
    rating: 4.9,
    content:
      '# LinkedIn Branding Masterclass\n\n## The headline formula\n[I help X achieve Y through Z]\n\n## About section template\n... (full masterclass inside)',
  },
]

async function seedMarketplaceIfNeeded() {
  const tCount = await db.template.count({ where: { published: true } })
  const cCount = await db.creatorContent.count({ where: { published: true } })
  if (tCount + cCount > 0) return

  // Resolve creators once.
  const creatorMap = new Map<string, string>()
  for (const c of CREATORS) {
    const u = await ensureCreator(c)
    creatorMap.set(c.email, u.id)
  }

  for (const seed of TEMPLATE_SEEDS) {
    const creatorId = creatorMap.get(seed.creatorEmail)
    if (!creatorId) continue
    await db.template.create({
      data: {
        creatorId,
        type: seed.type,
        name: seed.name,
        description: seed.description,
        category: seed.category,
        preview: JSON.stringify(seed.preview),
        config: JSON.stringify(seed.config),
        price: seed.price,
        downloads: seed.downloads,
        rating: seed.rating,
        published: true,
        featured: seed.featured,
      },
    })
  }

  for (const seed of CONTENT_SEEDS) {
    const creatorId = creatorMap.get(seed.creatorEmail)
    if (!creatorId) continue
    await db.creatorContent.create({
      data: {
        creatorId,
        type: seed.type,
        title: seed.title,
        description: seed.description,
        content: seed.content,
        price: seed.price,
        tags: JSON.stringify(seed.tags),
        published: true,
        enrollments: seed.enrollments,
        rating: seed.rating,
      },
    })
  }
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

/** GET — list all published Templates + CreatorContent (seeds if empty) + the user's own items. */
export async function GET() {
  try {
    const user = await getCurrentUser()
    await seedMarketplaceIfNeeded()

    const [templates, content, myTemplates, myContent] = await Promise.all([
      db.template.findMany({
        where: { published: true },
        include: { creator: true },
        orderBy: [{ featured: 'desc' }, { downloads: 'desc' }, { rating: 'desc' }],
      }),
      db.creatorContent.findMany({
        where: { published: true },
        include: { creator: true },
        orderBy: [{ enrollments: 'desc' }, { rating: 'desc' }],
      }),
      db.template.findMany({
        where: { creatorId: user.id },
        include: { creator: true },
        orderBy: { createdAt: 'desc' },
      }),
      db.creatorContent.findMany({
        where: { creatorId: user.id },
        include: { creator: true },
        orderBy: { createdAt: 'desc' },
      }),
    ])

    return NextResponse.json({
      templates: templates.map(serializeTemplate),
      content: content.map(serializeContent),
      mine: {
        templates: myTemplates.map(serializeTemplate),
        content: myContent.map(serializeContent),
      },
    })
  } catch (e) {
    return err(e)
  }
}

/** POST — create a Template or CreatorContent as the current user. */
export async function POST(req: Request) {
  try {
    const user = await getCurrentUser()
    const body = await req.json().catch(() => ({}))
    const kind = body?.kind === 'content' ? 'content' : 'template'

    if (kind === 'template') {
      const type = ['resume', 'portfolio', 'cover_letter'].includes(body?.type) ? body.type : 'resume'
      const name = (body?.name ?? '').toString().trim()
      if (!name) {
        return NextResponse.json({ error: 'Name is required' }, { status: 400 })
      }
      const config =
        typeof body?.config === 'string' ? body.config : JSON.stringify(body?.config ?? {})
      const preview =
        typeof body?.preview === 'string' ? body.preview : JSON.stringify(body?.preview ?? {})

      const tpl = await db.template.create({
        data: {
          creatorId: user.id,
          type,
          name,
          description: body?.description ? String(body.description).trim() : null,
          category: body?.category ? String(body.category).trim() : null,
          preview,
          config,
          price: Math.max(0, Math.floor(Number(body?.price ?? 0) || 0)),
          published: typeof body?.published === 'boolean' ? body.published : true,
          featured: typeof body?.featured === 'boolean' ? body.featured : false,
        },
        include: { creator: true },
      })

      try {
        await db.auditLog.create({
          data: { userId: user.id, action: 'template.create', entity: 'Template', entityId: tpl.id },
        })
      } catch {}

      return NextResponse.json({ template: serializeTemplate(tpl) })
    }

    // kind === 'content'
    const type = ['course', 'guide', 'template', 'coaching_pack'].includes(body?.type) ? body.type : 'guide'
    const title = (body?.title ?? '').toString().trim()
    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }
    const contentStr = (body?.content ?? '').toString()
    if (!contentStr.trim()) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 })
    }
    const tags = Array.isArray(body?.tags) ? body.tags.map(String).filter(Boolean) : []

    const item = await db.creatorContent.create({
      data: {
        creatorId: user.id,
        type,
        title,
        description: body?.description ? String(body.description).trim() : null,
        content: contentStr,
        price: Math.max(0, Math.floor(Number(body?.price ?? 0) || 0)),
        tags: JSON.stringify(tags),
        published: typeof body?.published === 'boolean' ? body.published : true,
      },
      include: { creator: true },
    })

    try {
      await db.auditLog.create({
        data: { userId: user.id, action: 'creator_content.create', entity: 'CreatorContent', entityId: item.id },
      })
    } catch {}

    return NextResponse.json({ content: serializeContent(item) })
  } catch (e) {
    return err(e)
  }
}
