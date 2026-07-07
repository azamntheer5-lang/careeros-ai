import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, err, parseJson } from '@/lib/server'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const DEFAULT_RESUME_DATA = {
  contact: { name: '', email: '', phone: '', location: '', website: '', linkedin: '' },
  summary: '',
  experience: [],
  education: [],
  skills: [],
  projects: [],
  certifications: [],
}

function slugify(s: string): string {
  return (s || 'portfolio')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'portfolio'
}

async function uniquePortfolioSlug(base: string, userId: string): Promise<string> {
  const root = slugify(base) || 'portfolio'
  let candidate = `${root}-${userId.slice(-6)}`
  let n = 0
  while (await db.portfolio.findUnique({ where: { slug: candidate } })) {
    n += 1
    candidate = `${root}-${userId.slice(-6)}-${n}`
  }
  return candidate
}

// ---------------------------------------------------------------------------
// POST — install/download a Template or enroll in CreatorContent.
// For resume templates, this creates a new Resume from the template config.
// For portfolio templates, this creates a new Portfolio from the config.
// For cover_letter templates, this creates a new CoverLetter from the sample.
// For CreatorContent, this increments enrollments.
// ---------------------------------------------------------------------------

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const user = await getCurrentUser()

    // --- Template? ---
    const tpl = await db.template.findUnique({ where: { id }, include: { creator: true } })
    if (tpl) {
      const updated = await db.template.update({
        where: { id },
        data: { downloads: { increment: 1 } },
      })

      const config = tpl.config ? parseJson<any>(tpl.config) : {}
      let created: { kind: string; id: string; title?: string } | null = null

      if (tpl.type === 'resume') {
        const sampleData = config?.sampleData ?? DEFAULT_RESUME_DATA
        const resume = await db.resume.create({
          data: {
            userId: user.id,
            title: `${tpl.name}`,
            template: config?.template || 'modern',
            accent: config?.accent || 'emerald',
            font: config?.font || 'inter',
            spacing: config?.spacing || 'normal',
            careerMode: config?.careerMode || null,
            data: JSON.stringify(sampleData),
          },
        })
        created = { kind: 'resume', id: resume.id, title: resume.title }
      } else if (tpl.type === 'portfolio') {
        const sections = config?.sections ?? [
          { type: 'hero', title: 'Your headline here' },
          { type: 'projects', title: 'Projects' },
          { type: 'contact', title: 'Contact' },
        ]
        const slug = await uniquePortfolioSlug(tpl.name, user.id)
        const portfolio = await db.portfolio.create({
          data: {
            userId: user.id,
            slug,
            title: tpl.name,
            tagline: tpl.description?.slice(0, 120) ?? null,
            theme: config?.theme || 'aurora',
            accent: config?.accent || 'emerald',
            sections: JSON.stringify(sections),
            published: false,
          },
        })
        created = { kind: 'portfolio', id: portfolio.id, title: portfolio.title }
      } else if (tpl.type === 'cover_letter') {
        const letter = await db.coverLetter.create({
          data: {
            userId: user.id,
            type: 'cover',
            content: config?.sampleContent || '',
          },
        })
        created = { kind: 'cover_letter', id: letter.id }
      }

      try {
        await db.auditLog.create({
          data: { userId: user.id, action: 'template.install', entity: 'Template', entityId: id },
        })
      } catch {}

      return NextResponse.json({
        ok: true,
        installed: 'template',
        templateId: id,
        downloads: updated.downloads,
        created,
      })
    }

    // --- CreatorContent? ---
    const content = await db.creatorContent.findUnique({ where: { id }, include: { creator: true } })
    if (content) {
      const updated = await db.creatorContent.update({
        where: { id },
        data: { enrollments: { increment: 1 } },
      })

      try {
        await db.auditLog.create({
          data: { userId: user.id, action: 'content.enroll', entity: 'CreatorContent', entityId: id },
        })
      } catch {}

      return NextResponse.json({
        ok: true,
        installed: 'content',
        contentId: id,
        enrollments: updated.enrollments,
        content: content.content,
      })
    }

    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  } catch (e) {
    return err(e)
  }
}
