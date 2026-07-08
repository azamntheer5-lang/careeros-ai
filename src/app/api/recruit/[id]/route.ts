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

type ApplicationDTO = {
  id: string
  status: string
  matchScore: number | null
  matchNotes: any | null
  coverLetter: string | null
  createdAt: string
  candidate: {
    id: string
    name: string
    headline: string | null
    email: string
  }
}

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

function toApplicationDTO(a: any): ApplicationDTO {
  let notes: any = null
  if (a.matchNotes) {
    try {
      notes = JSON.parse(a.matchNotes)
    } catch {
      notes = null
    }
  }
  return {
    id: a.id,
    status: a.status,
    matchScore: a.matchScore,
    matchNotes: notes,
    coverLetter: a.coverLetter,
    createdAt: a.createdAt,
    candidate: {
      id: a.candidate?.id ?? '',
      name: a.candidate?.name ?? 'Anonymous',
      headline: a.candidate?.headline ?? null,
      email: a.candidate?.email ?? '',
    },
  }
}

// ---------------------------------------------------------------------------
// Route handlers
// ---------------------------------------------------------------------------

/** GET — single posting with its applications. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const user = await getCurrentUser()

    const posting = await db.jobPosting.findUnique({
      where: { id },
      include: {
        applications: {
          include: { candidate: true },
          orderBy: { createdAt: 'desc' },
        },
        _count: { select: { applications: true } },
      },
    })

    if (!posting || posting.employerId !== user.id) {
      return NextResponse.json({ error: 'Posting not found' }, { status: 404 })
    }

    return NextResponse.json({
      posting: toPostingDTO(posting),
      applications: posting.applications.map(toApplicationDTO),
    })
  } catch (e) {
    return err(e)
  }
}

/** PUT — update a posting (partial). */
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const user = await getCurrentUser()

    const existing = await db.jobPosting.findUnique({ where: { id } })
    if (!existing || existing.employerId !== user.id) {
      return NextResponse.json({ error: 'Posting not found' }, { status: 404 })
    }

    const body = await req.json()

    // Optional: increment views when explicitly requested (default no-op).
    const data: any = {}
    if (body.title !== undefined) data.title = String(body.title).trim()
    if (body.company !== undefined) data.company = String(body.company).trim()
    if (body.location !== undefined) data.location = body.location ? String(body.location) : null
    if (body.remote !== undefined) data.remote = !!body.remote
    if (body.salary !== undefined) data.salary = body.salary ? String(body.salary) : null
    if (body.type !== undefined) data.type = body.type
    if (body.description !== undefined) data.description = String(body.description).trim()
    if (body.status !== undefined) data.status = body.status
    if (body.requirements !== undefined) {
      const arr = Array.isArray(body.requirements) ? body.requirements.filter(Boolean) : []
      data.requirements = JSON.stringify(arr)
    }
    if (body.skills !== undefined) {
      const arr = Array.isArray(body.skills) ? body.skills.filter(Boolean) : []
      data.skills = JSON.stringify(arr)
    }
    if (body.incrementViews) {
      data.views = { increment: 1 }
    }

    const updated = await db.jobPosting.update({
      where: { id },
      data,
      include: { _count: { select: { applications: true } } },
    })

    return NextResponse.json({ posting: toPostingDTO(updated) })
  } catch (e) {
    return err(e)
  }
}

/** DELETE — remove a posting (cascades to applications). */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const user = await getCurrentUser()

    const existing = await db.jobPosting.findUnique({ where: { id } })
    if (!existing || existing.employerId !== user.id) {
      return NextResponse.json({ error: 'Posting not found' }, { status: 404 })
    }

    await db.jobPosting.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return err(e)
  }
}
