import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, err, parseJson } from '@/lib/server'

export const runtime = 'nodejs'

type ParsedResume = {
  contact?: {
    name?: string
    email?: string
    phone?: string
    location?: string
    website?: string
    linkedin?: string
  }
  summary?: string
  experience?: Array<{
    title?: string
    company?: string
    location?: string
    startDate?: string
    endDate?: string
    bullets?: string[]
  }>
  education?: Array<{
    degree?: string
    school?: string
    location?: string
    startDate?: string
    endDate?: string
    details?: string
  }>
  skills?: string[]
  projects?: Array<{ name?: string; description?: string; link?: string }>
  certifications?: Array<{ name?: string; issuer?: string; date?: string }>
}

/** POST — apply a parsed resume document to the user's career profile
 *  AND create a new Resume record the Resume Engine can edit. */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const user = await getCurrentUser()

    const doc = await db.document.findUnique({ where: { id } })
    if (!doc || doc.userId !== user.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    if (doc.status !== 'parsed' || !doc.parsed) {
      return NextResponse.json({ error: 'Document has not been parsed yet' }, { status: 400 })
    }

    const parsed = parseJson<ParsedResume>(doc.parsed)
    const skills = Array.isArray(parsed.skills) ? parsed.skills.filter(Boolean) : []
    const firstTitle = parsed.experience?.[0]?.title?.trim() || ''

    // 1) Update the career profile: merge skills into strengths and set target role.
    let profile = await db.careerProfile.findUnique({ where: { userId: user.id } })
    if (!profile) {
      profile = await db.careerProfile.create({ data: { userId: user.id } })
    }

    const existingStrengths: string[] = parseJson<string[]>(profile.strengths)
    const merged = Array.from(new Set([...existingStrengths, ...skills])).slice(0, 24)
    const patch: Record<string, unknown> = {
      strengths: JSON.stringify(merged),
    }
    if (firstTitle && !profile.targetRole) patch.targetRole = firstTitle
    if (parsed.summary && !profile.brandStatement) patch.brandStatement = parsed.summary
    if (parsed.contact?.location && !profile.location) patch.location = parsed.contact.location
    if (parsed.contact?.linkedin && !profile.linkedinUrl) patch.linkedinUrl = parsed.contact.linkedin
    if (parsed.contact?.website && !profile.portfolioUrl) patch.portfolioUrl = parsed.contact.website

    profile = await db.careerProfile.update({
      where: { userId: user.id },
      data: patch as any,
    })

    // 2) Create a new Resume the user can edit in the Resume Engine.
    const contactName = parsed.contact?.name?.trim() || user.name || 'Candidate'
    const titleBase = firstTitle || doc.filename.replace(/\.[^.]+$/, '') || 'Imported Resume'
    const resumeTitle = `${titleBase} — imported`.slice(0, 120)

    const resumeData = {
      contact: {
        name: parsed.contact?.name || '',
        email: parsed.contact?.email || '',
        phone: parsed.contact?.phone || '',
        location: parsed.contact?.location || '',
        website: parsed.contact?.website || '',
        linkedin: parsed.contact?.linkedin || '',
      },
      summary: parsed.summary || '',
      experience: (parsed.experience || []).map((e) => ({
        title: e.title || '',
        company: e.company || '',
        location: e.location || '',
        startDate: e.startDate || '',
        endDate: e.endDate || '',
        bullets: Array.isArray(e.bullets) ? e.bullets : [],
      })),
      education: (parsed.education || []).map((e) => ({
        degree: e.degree || '',
        school: e.school || '',
        location: e.location || '',
        startDate: e.startDate || '',
        endDate: e.endDate || '',
        details: e.details || '',
      })),
      skills,
      projects: (parsed.projects || []).map((p) => ({
        name: p.name || '',
        description: p.description || '',
        link: p.link || '',
      })),
      certifications: (parsed.certifications || []).map((c) => ({
        name: c.name || '',
        issuer: c.issuer || '',
        date: c.date || '',
      })),
    }

    const resume = await db.resume.create({
      data: {
        userId: user.id,
        title: resumeTitle,
        data: JSON.stringify(resumeData),
      },
    })

    try {
      await db.auditLog.create({
        data: {
          userId: user.id,
          action: 'document.apply',
          entity: 'Document',
          entityId: doc.id,
          meta: JSON.stringify({ resumeId: resume.id }),
        },
      })
    } catch {}

    return NextResponse.json({
      resume,
      profile,
      applied: {
        skillsAdded: skills.length,
        targetRole: (patch.targetRole as string) || null,
      },
    })
  } catch (e) {
    return err(e)
  }
}
