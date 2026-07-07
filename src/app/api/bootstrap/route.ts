import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

/** Ensures a single demo user exists and returns it (id used by the SPA). */
export async function GET() {
  try {
    let user = await db.user.findFirst({ orderBy: { createdAt: 'asc' } })
    if (!user) {
      user = await db.user.create({
        data: {
          email: 'founder@careeros.ai',
          name: 'Alex Rivera',
          headline: 'Senior Software Engineer → Staff',
          plan: 'premium',
          role: 'user',
        },
      })
      // seed a starter resume
      await db.resume.create({
        data: {
          userId: user.id,
          title: 'Software Engineer — Master Resume',
          template: 'modern',
          accent: 'emerald',
          data: JSON.stringify(SEED_RESUME),
        },
      })
      // seed a couple of jobs
      await db.job.createMany({
        data: [
          { userId: user.id, company: 'Vercel', role: 'Senior Frontend Engineer', location: 'Remote', status: 'interview', priority: 'high', salary: '$190k' },
          { userId: user.id, company: 'Linear', role: 'Staff Engineer', location: 'San Francisco', status: 'screening', priority: 'high', salary: '$220k' },
          { userId: user.id, company: 'Stripe', role: 'Product Engineer', location: 'Remote', status: 'applied', priority: 'medium', salary: '$200k' },
          { userId: user.id, company: 'Figma', role: 'Frontend Engineer', location: 'Remote', status: 'wishlist', priority: 'low' },
        ],
      })
    }
    return NextResponse.json({ user })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}

const SEED_RESUME = {
  contact: {
    name: 'Alex Rivera',
    email: 'alex.rivera@example.com',
    phone: '+1 (415) 555-0188',
    location: 'San Francisco, CA',
    website: 'alexrivera.dev',
    linkedin: 'linkedin.com/in/alexrivera',
  },
  summary:
    'Senior software engineer with 7+ years building performant, accessible web products used by millions. Specialized in React, TypeScript and design systems. Led teams that shipped 3 award-winning products and cut page load times by 60%.',
  experience: [
    {
      title: 'Senior Software Engineer',
      company: 'Notion',
      location: 'San Francisco, CA',
      startDate: '2021',
      endDate: 'Present',
      bullets: [
        'Led the rebuild of the editor collaboration layer, reducing sync latency by 47% for 30M+ users.',
        'Mentored 5 engineers; established the frontend testing strategy that cut regression bugs by 38%.',
        'Shipped the AI-assisted writing feature adopted by 18% of weekly active users in week one.',
      ],
    },
    {
      title: 'Software Engineer',
      company: 'Airbnb',
      location: 'San Francisco, CA',
      startDate: '2018',
      endDate: '2021',
      bullets: [
        'Built the trip itinerary redesign that lifted booking completion by 12%.',
        'Owned the design-system migration to TypeScript across 40+ surfaces.',
      ],
    },
  ],
  education: [
    {
      degree: 'B.S. Computer Science',
      school: 'UC Berkeley',
      location: 'Berkeley, CA',
      startDate: '2014',
      endDate: '2018',
      details: 'GPA 3.8 · ACM ICPC Regional Finalist',
    },
  ],
  skills: ['TypeScript', 'React', 'Next.js', 'Node.js', 'GraphQL', 'PostgreSQL', 'AWS', 'System Design'],
  projects: [
    {
      name: 'OpenMetrics',
      description: 'Open-source analytics dashboard (4.2k GitHub stars).',
      link: 'github.com/alex/openmetrics',
    },
  ],
  certifications: [
    { name: 'AWS Solutions Architect — Associate', issuer: 'Amazon', date: '2022' },
  ],
}
