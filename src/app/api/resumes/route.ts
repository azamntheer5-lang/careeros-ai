import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, err, clipInput } from '@/lib/server'
import { rateLimitOr429 } from '@/lib/rate-limit'

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser()
    // SECURITY: rate-limit list endpoint to prevent enumeration / scraping.
    const limited = rateLimitOr429(user.id, 'standard')
    if (limited) return limited
    const url = new URL(req.url)
    // SECURITY: clip search param to prevent oversized queries.
    const search = clipInput(url.searchParams.get('search') || '', 200)
    const sortParam = url.searchParams.get('sort') || 'updated' // updated | created | title | score
    // SECURITY: allow-list the sort value to prevent arbitrary orderBy injection.
    const sort = ['updated', 'created', 'title', 'score'].includes(sortParam) ? sortParam : 'updated'

    const where: any = { userId: user.id }
    if (search.trim()) {
      where.title = { contains: search }
    }

    const orderBy: any =
      sort === 'created' ? { createdAt: 'desc' }
      : sort === 'title' ? { title: 'asc' }
      : sort === 'score' ? { aiScore: 'desc' }
      : { updatedAt: 'desc' }

    const resumes = await db.resume.findMany({ where, orderBy })
    return NextResponse.json({ resumes })
  } catch (e) {
    return err(e)
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser()
    // SECURITY: rate-limit create endpoint to prevent DB flooding.
    const limited = rateLimitOr429(user.id, 'standard')
    if (limited) return limited
    const body = await req.json().catch(() => ({}))
    // SECURITY: validate + clip top-level string fields before persisting.
    const title = clipInput(body.title, 200) || 'Untitled Resume'
    const template = clipInput(body.template, 50) || 'modern'
    const accent = clipInput(body.accent, 50) || 'emerald'
    const resume = await db.resume.create({
      data: {
        userId: user.id,
        title,
        template,
        accent,
        data: JSON.stringify(body.data || DEFAULT_DATA),
      },
    })
    return NextResponse.json({ resume })
  } catch (e) {
    return err(e)
  }
}

const DEFAULT_DATA = {
  contact: { name: '', email: '', phone: '', location: '', website: '', linkedin: '' },
  summary: '',
  experience: [],
  education: [],
  skills: [],
  projects: [],
  certifications: [],
}
