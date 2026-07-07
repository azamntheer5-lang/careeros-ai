import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, err, parseJson } from '@/lib/server'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type PostingDTO = {
  id: string
  title: string
  company: string
  location: string | null
  remote: boolean
  salary: string | null
  type: string
  description: string
  requirements: string[]
  skills: string[]
  status: string
  views: number
  applicationCount: number
  createdAt: string
}

type CandidateDTO = {
  id: string
  name: string
  headline: string
  email: string
  location: string | null
  targetRole: string | null
  seniority: string | null
  experienceYears: number | null
  skills: string[]
  summary: string
  experienceHighlights: string[]
  matchScore: number // heuristic, against the most recent open posting
  isSelf: boolean
}

// ---------------------------------------------------------------------------
// Seed data — 3 sample job postings
// ---------------------------------------------------------------------------

const SAMPLE_POSTINGS = [
  {
    title: 'Senior Frontend Engineer',
    company: 'Vercel',
    location: 'Remote (Global)',
    remote: true,
    salary: '$180k–$220k',
    type: 'full-time',
    description:
      'We are looking for a Senior Frontend Engineer to lead the next iteration of our dashboard. You will own complex features end-to-end, mentor other engineers, and push the boundaries of what is possible on the web with React Server Components, Edge rendering, and streaming UI.',
    requirements: [
      '5+ years building production React applications',
      'Expert-level TypeScript',
      'Deep experience with Next.js or another SSR framework',
      'Strong CS fundamentals (algorithms, data structures, browser internals)',
      'Track record of mentoring and leading projects',
    ],
    skills: ['React', 'TypeScript', 'Next.js', 'Tailwind CSS', 'GraphQL', 'Accessibility'],
  },
  {
    title: 'Backend Engineer, Payments',
    company: 'Stripe',
    location: 'San Francisco, CA',
    remote: false,
    salary: '$170k–$210k',
    type: 'full-time',
    description:
      'Build the payments infrastructure of the internet. You will design and operate distributed services that move billions of dollars, with a relentless focus on correctness, observability, and developer experience.',
    requirements: [
      '4+ years building backend systems at scale',
      'Experience with distributed systems and idempotent APIs',
      'Strong SQL skills (PostgreSQL preferred)',
      'Familiarity with event-driven architectures',
      'Bias toward operational excellence',
    ],
    skills: ['Go', 'Node.js', 'PostgreSQL', 'Redis', 'AWS', 'gRPC'],
  },
  {
    title: 'Product Designer',
    company: 'Figma',
    location: 'Remote (US)',
    remote: true,
    salary: '$140k–$185k',
    type: 'full-time',
    description:
      'Shape the future of design tools. You will partner with engineers and PMs to ship delightful, accessible product experiences for millions of designers worldwide. You should care deeply about craft, systems thinking, and the details that make products feel magical.',
    requirements: [
      '3+ years designing consumer or prosumer SaaS products',
      'Strong portfolio shipped from concept to launch',
      'Experience with design systems and component libraries',
      'Comfort with prototyping and user research',
    ],
    skills: ['Figma', 'Design Systems', 'User Research', 'Prototyping', 'Visual Design'],
  },
]

// ---------------------------------------------------------------------------
// Seed data — 7 diverse synthetic candidates
// (the current user is appended as an 8th candidate at runtime)
// ---------------------------------------------------------------------------

const SYNTHETIC_CANDIDATES = [
  {
    name: 'Maya Patel',
    email: 'maya.patel@candidate.demo',
    headline: 'Senior Frontend Engineer',
    location: 'Austin, TX',
    targetRole: 'Senior Frontend Engineer',
    seniority: 'senior',
    experienceYears: 6,
    skills: ['React', 'TypeScript', 'Next.js', 'Tailwind CSS', 'GraphQL', 'Jest', 'Accessibility'],
    summary:
      'Frontend engineer with 6 years building accessible, high-performance web apps at scale. Led the migration of a 200k LOC app from CRA to Next.js, cutting LCP by 40%.',
    experienceHighlights: [
      'Senior Frontend Engineer @ Airbnb — led CRA→Next.js migration, LCP -40%',
      'Frontend Engineer @ Shopify — shipped checkout improvements driving +2% conversion',
      'Built a design system adopted by 80+ engineers across 5 product teams',
    ],
  },
  {
    name: 'Daniel Kim',
    email: 'daniel.kim@candidate.demo',
    headline: 'Backend Engineer',
    location: 'Seattle, WA',
    targetRole: 'Backend Engineer',
    seniority: 'mid',
    experienceYears: 4,
    skills: ['Go', 'Node.js', 'PostgreSQL', 'Redis', 'AWS', 'Kubernetes', 'gRPC'],
    summary:
      'Backend engineer focused on payments and distributed systems. Built idempotent payment APIs processing $400M/yr at scale with 99.99% uptime.',
    experienceHighlights: [
      'Software Engineer @ Plaid — owned payment-linking API (10k req/s)',
      'Backend Engineer @ Twilio — migrated monolith to gRPC microservices',
      'Open-source contributor to a popular Go job-queue library (2.4k stars)',
    ],
  },
  {
    name: 'Aisha Okonkwo',
    email: 'aisha.okonkwo@candidate.demo',
    headline: 'Full-Stack Engineer',
    location: 'Remote (Lagos, NG)',
    targetRole: 'Full-Stack Engineer',
    seniority: 'senior',
    experienceYears: 7,
    skills: ['React', 'Node.js', 'GraphQL', 'PostgreSQL', 'TypeScript', 'Docker', 'AWS'],
    summary:
      'Full-stack engineer who has shipped products end-to-end at fast-growing startups. Comfortable owning features from schema to UI to on-call.',
    experienceHighlights: [
      'Staff Engineer @ Andela — led real-time collaboration features (CRDT-based)',
      'Senior Engineer @ Paystack — built merchant dashboard handling 100k MAU',
      'Founded a dev-tooling startup (acquired 2023)',
    ],
  },
  {
    name: 'Carlos Mendez',
    email: 'carlos.mendez@candidate.demo',
    headline: 'ML Engineer',
    location: 'Toronto, ON',
    targetRole: 'Machine Learning Engineer',
    seniority: 'senior',
    experienceYears: 5,
    skills: ['Python', 'TensorFlow', 'PyTorch', 'scikit-learn', 'Pandas', 'AWS SageMaker', 'MLOps'],
    summary:
      'ML engineer with 5 years shipping production ML systems. Specializes in NLP and recommendation systems with a focus on reproducibility and model monitoring.',
    experienceHighlights: [
      'ML Engineer @ Shopify — built product recommendation system (+12% AOV)',
      'Data Scientist @ RBC — fraud detection model (recall 0.92 in production)',
      'Published 3 papers at NeurIPS workshops on representation learning',
    ],
  },
  {
    name: 'Priya Sharma',
    email: 'priya.sharma@candidate.demo',
    headline: 'DevOps Engineer',
    location: 'San Francisco, CA',
    targetRole: 'DevOps / Platform Engineer',
    seniority: 'senior',
    experienceYears: 6,
    skills: ['Kubernetes', 'Terraform', 'AWS', 'Docker', 'CI/CD', 'Prometheus', 'Grafana'],
    summary:
      'Platform engineer passionate about developer experience. Migrated a 200-engineer org to GitOps, cutting deploy time from 45 min to 6 min.',
    experienceHighlights: [
      'Senior Platform Engineer @ Coinbase — owned multi-region K8s rollout',
      'DevOps Engineer @ Atlassian — built internal developer platform (IDP)',
      'Spoke at KubeCon 2023 on cost-aware autoscaling',
    ],
  },
  {
    name: 'Elena Rossi',
    email: 'elena.rossi@candidate.demo',
    headline: 'Product Designer',
    location: 'Lisbon, Portugal',
    targetRole: 'Senior Product Designer',
    seniority: 'senior',
    experienceYears: 8,
    skills: ['Figma', 'Design Systems', 'User Research', 'Prototyping', 'Visual Design', 'Accessibility'],
    summary:
      'Product designer with 8 years across consumer and prosumer SaaS. Led the redesign of a 4M-MAU product, lifting activation 18%.',
    experienceHighlights: [
      'Lead Designer @ Notion — owned core editor experience across web+mobile',
      'Senior Designer @ Spotify — redesigned artist analytics dashboard',
      'Built a cross-platform design system used by 9 product teams',
    ],
  },
  {
    name: 'James Chen',
    email: 'james.chen@candidate.demo',
    headline: 'Data Scientist',
    location: 'New York, NY',
    targetRole: 'Senior Data Scientist',
    seniority: 'mid',
    experienceYears: 4,
    skills: ['Python', 'SQL', 'Pandas', 'scikit-learn', 'Tableau', 'Statistics', 'Experimentation'],
    summary:
      'Data scientist with 4 years driving growth through experimentation and predictive modeling. Comfortable translating ambiguous business questions into rigorous analyses.',
    experienceHighlights: [
      'Data Scientist @ Meta — owned activation experiments (lifted D7 retention 4%)',
      'Analyst @ Duolingo — built churn model driving $1.2M ARR retention',
      'Top 1% Kaggle grandmaster (focus: tabular, NLP)',
    ],
  },
]

// ---------------------------------------------------------------------------
// Seed helpers
// ---------------------------------------------------------------------------

async function seedPostings(employerId: string) {
  for (const p of SAMPLE_POSTINGS) {
    await db.jobPosting.create({
      data: {
        employerId,
        title: p.title,
        company: p.company,
        location: p.location,
        remote: p.remote,
        salary: p.salary,
        type: p.type,
        description: p.description,
        requirements: JSON.stringify(p.requirements),
        skills: JSON.stringify(p.skills),
        status: 'open',
      },
    })
  }
}

async function seedCandidates() {
  const now = Date.now()
  for (let i = 0; i < SYNTHETIC_CANDIDATES.length; i++) {
    const c = SYNTHETIC_CANDIDATES[i]
    // Stagger createdAt so the main employer user stays oldest (getCurrentUser
    // returns the first user by createdAt asc).
    const created = new Date(now + (i + 1) * 1000)
    const user = await db.user.create({
      data: {
        email: c.email,
        name: c.name,
        headline: c.headline,
        role: 'candidate',
        plan: 'free',
        createdAt: created,
        updatedAt: created,
      },
    })
    const resumeData = {
      contact: {
        name: c.name,
        email: c.email,
        phone: '',
        location: c.location,
        website: '',
        linkedin: '',
      },
      summary: c.summary,
      experience: c.experienceHighlights.map((line, idx) => {
        const [title, company] = line.split(' @ ')
        return {
          id: `exp-${i}-${idx}`,
          title: title || '',
          company: company || '',
          location: '',
          startDate: '',
          endDate: '',
          bullets: [line],
        }
      }),
      education: [],
      skills: c.skills,
      projects: [],
      certifications: [],
    }
    await db.resume.create({
      data: {
        userId: user.id,
        title: `${c.headline} — Resume`,
        template: 'modern',
        data: JSON.stringify(resumeData),
      },
    })
    await db.careerProfile.create({
      data: {
        userId: user.id,
        targetRole: c.targetRole,
        industry: null,
        seniority: c.seniority,
        experienceYears: c.experienceYears,
        location: c.location,
        brandStatement: c.summary,
        strengths: JSON.stringify(c.skills.slice(0, 4)),
        values: JSON.stringify([]),
      },
    })
  }
}

// ---------------------------------------------------------------------------
// DTO builders
// ---------------------------------------------------------------------------

function toPostingDTO(p: any): PostingDTO {
  return {
    id: p.id,
    title: p.title,
    company: p.company,
    location: p.location,
    remote: p.remote,
    salary: p.salary,
    type: p.type,
    description: p.description,
    requirements: parseJson<string[]>(p.requirements),
    skills: parseJson<string[]>(p.skills),
    status: p.status,
    views: p.views ?? 0,
    applicationCount: p._count?.applications ?? 0,
    createdAt: p.createdAt,
  }
}

/** Heuristic skill-overlap match score for the candidate-search grid. */
function heuristicMatch(candidateSkills: string[], postingSkills: string[]): number {
  if (!postingSkills.length) return 60
  const jobSet = new Set(postingSkills.map((s) => s.toLowerCase()))
  const hits = candidateSkills.filter((s) => jobSet.has(s.toLowerCase())).length
  const ratio = hits / postingSkills.length
  // Base 55 + up to 40 from skill overlap + 5 from absolute hit count (capped).
  const score = Math.round(55 + ratio * 40 + Math.min(hits * 2, 5))
  return Math.min(96, Math.max(48, score))
}

async function buildCandidateList(employerId: string, postingSkills: string[]): Promise<CandidateDTO[]> {
  const out: CandidateDTO[] = []

  // 1. The employer themselves (single-tenant demo) — uses their own resume/profile.
  try {
    const employer = await db.user.findUnique({
      where: { id: employerId },
      include: {
        profile: true,
        resumes: { take: 1, orderBy: { updatedAt: 'desc' } },
      },
    })
    if (employer) {
      let skills: string[] = []
      let summary = ''
      let experienceHighlights: string[] = []
      if (employer.resumes[0]) {
        try {
          const r = JSON.parse(employer.resumes[0].data)
          if (Array.isArray(r.skills)) skills = r.skills
          if (r.summary) summary = r.summary
          if (Array.isArray(r.experience)) {
            experienceHighlights = r.experience
              .slice(0, 3)
              .map((e: any) => `${e.title || ''} @ ${e.company || ''}`.trim())
              .filter(Boolean)
          }
        } catch {}
      }
      if (employer.profile) {
        if (!summary && employer.profile.brandStatement) summary = employer.profile.brandStatement
        const ps = parseJson<string[]>(employer.profile.strengths)
        if (!skills.length && ps.length) skills = ps
      }
      out.push({
        id: employer.id,
        name: employer.name || 'You',
        headline: employer.headline || employer.profile?.targetRole || 'CareerOS User',
        email: employer.email,
        location: employer.profile?.location ?? null,
        targetRole: employer.profile?.targetRole ?? null,
        seniority: employer.profile?.seniority ?? null,
        experienceYears: employer.profile?.experienceYears ?? null,
        skills,
        summary: summary || 'No resume summary on file yet — add one in the Resume Engine to enrich AI matching.',
        experienceHighlights,
        matchScore: heuristicMatch(skills, postingSkills),
        isSelf: true,
      })
    }
  } catch {}

  // 2. Synthetic candidates
  const synth = await db.user.findMany({
    where: { role: 'candidate' },
    include: {
      profile: true,
      resumes: { take: 1, orderBy: { updatedAt: 'desc' } },
    },
    orderBy: { createdAt: 'asc' },
  })
  for (const u of synth) {
    let skills: string[] = []
    let summary = ''
    let experienceHighlights: string[] = []
    if (u.resumes[0]) {
      try {
        const r = JSON.parse(u.resumes[0].data)
        if (Array.isArray(r.skills)) skills = r.skills
        if (r.summary) summary = r.summary
        if (Array.isArray(r.experience)) {
          experienceHighlights = r.experience
            .slice(0, 3)
            .map((e: any) => `${e.title || ''} @ ${e.company || ''}`.trim())
            .filter(Boolean)
        }
      } catch {}
    }
    out.push({
      id: u.id,
      name: u.name || 'Anonymous Candidate',
      headline: u.headline || u.profile?.targetRole || 'Candidate',
      email: u.email,
      location: u.profile?.location ?? null,
      targetRole: u.profile?.targetRole ?? null,
      seniority: u.profile?.seniority ?? null,
      experienceYears: u.profile?.experienceYears ?? null,
      skills,
      summary,
      experienceHighlights,
      matchScore: heuristicMatch(skills, postingSkills),
      isSelf: false,
    })
  }

  return out
}

// ---------------------------------------------------------------------------
// Route handlers
// ---------------------------------------------------------------------------

/** GET — list employer's job postings (with application counts) + candidate pool.
 *  Seeds 3 sample postings + 7 synthetic candidates on first call. */
export async function GET() {
  try {
    const user = await getCurrentUser()

    // Ensure postings exist
    let postings = await db.jobPosting.findMany({
      where: { employerId: user.id },
      include: { _count: { select: { applications: true } } },
      orderBy: { createdAt: 'desc' },
    })
    if (postings.length === 0) {
      await seedPostings(user.id)
      postings = await db.jobPosting.findMany({
        where: { employerId: user.id },
        include: { _count: { select: { applications: true } } },
        orderBy: { createdAt: 'desc' },
      })
    }

    // Ensure synthetic candidates exist
    const existingCandidates = await db.user.count({ where: { role: 'candidate' } })
    if (existingCandidates === 0) {
      await seedCandidates()
    }

    // Pick the skills of the most recent open posting for heuristic scoring
    const referencePosting = postings.find((p) => p.status === 'open') ?? postings[0]
    const refSkills = referencePosting ? parseJson<string[]>(referencePosting.skills) : []
    const candidates = await buildCandidateList(user.id, refSkills)

    return NextResponse.json({
      postings: postings.map(toPostingDTO),
      candidates,
    })
  } catch (e) {
    return err(e)
  }
}

/** POST — create a new job posting for the current employer. */
export async function POST(req: Request) {
  try {
    const user = await getCurrentUser()
    const body = await req.json()

    if (!body.title?.trim() || !body.company?.trim() || !body.description?.trim()) {
      return NextResponse.json(
        { error: 'Title, company and description are required' },
        { status: 400 }
      )
    }

    const requirements: string[] = Array.isArray(body.requirements) ? body.requirements.filter(Boolean) : []
    const skills: string[] = Array.isArray(body.skills) ? body.skills.filter(Boolean) : []

    const posting = await db.jobPosting.create({
      data: {
        employerId: user.id,
        title: body.title.trim(),
        company: body.company.trim(),
        location: body.location?.trim() || null,
        remote: !!body.remote,
        salary: body.salary?.trim() || null,
        type: body.type || 'full-time',
        description: body.description.trim(),
        requirements: JSON.stringify(requirements),
        skills: JSON.stringify(skills),
        status: body.status || 'open',
      },
      include: { _count: { select: { applications: true } } },
    })

    return NextResponse.json({ posting: toPostingDTO(posting) })
  } catch (e) {
    return err(e)
  }
}
