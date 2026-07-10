import { NextResponse } from 'next/server'
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle } from 'docx'
import { getCurrentUser, err, safeContentDisposition } from '@/lib/server'
import { rateLimitOr429 } from '@/lib/rate-limit'

export const runtime = 'nodejs'

interface ResumeData {
  contact: { name?: string | null; email?: string | null; phone?: string | null; location?: string | null; linkedin?: string | null; website?: string | null }
  objective?: string | null
  experience?: { title?: string | null; company?: string | null; location?: string | null; startDate?: string | null; endDate?: string | null; bullets?: string[] }[]
  education?: { degree?: string | null; school?: string | null; startDate?: string | null; endDate?: string | null; details?: string | null }[]
  skills?: { technical?: string[]; soft?: string[]; languages?: { language: string; level: string }[] }
  courses?: { name?: string; provider?: string | null; hours?: string | null; date?: string | null }[]
  certifications?: { name?: string; issuer?: string | null; date?: string | null }[]
  projects?: { name?: string; description?: string; link?: string | null }[]
}

const ACCENT_COLOR = '10B981' // emerald-500

// SECURITY: cap the title length to prevent oversized Content-Disposition
// headers and avoid feeding megabytes of attacker-controlled text into docx.
const MAX_TITLE_LEN = 120
// SECURITY: cap entries / bullets to bound docx generation CPU + output size.
const MAX_EXPERIENCE_ENTRIES = 100
const MAX_BULLETS_PER_ENTRY = 50
const MAX_TEXT_FIELD_LEN = 5000
const MAX_SKILLS_PER_CATEGORY = 200

/** Coerce and clip a free-text resume field to a safe string. */
function clipStr(v: unknown, max = MAX_TEXT_FIELD_LEN): string {
  if (typeof v !== 'string') return ''
  return v.slice(0, max)
}

/** POST — generate a DOCX file from resume JSON. Body: { resume: ResumeData, title?: string } */
export async function POST(req: Request) {
  try {
    const user = await getCurrentUser()
    const limited = rateLimitOr429(user.id, 'ai_generate')
    if (limited) return limited

    const body = await req.json().catch(() => null)
    // SECURITY: validate body shape — `resume` must be a non-null object.
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }
    const resumeRaw: unknown = (body as any).resume
    if (!resumeRaw || typeof resumeRaw !== 'object' || Array.isArray(resumeRaw)) {
      return NextResponse.json({ error: 'Missing resume data' }, { status: 400 })
    }
    const resume = resumeRaw as ResumeData
    // SECURITY: clip title — also flows into the Content-Disposition header.
    const title: string = clipStr((body as any).title || resume.contact?.name || 'Resume', MAX_TITLE_LEN)

    const sections: Paragraph[] = []

    // ─── Header (Name) ───
    sections.push(new Paragraph({
      children: [new TextRun({ text: resume.contact?.name || title, bold: true, size: 36, color: ACCENT_COLOR })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
    }))

    // Contact line
    const contactParts: string[] = []
    if (resume.contact?.email) contactParts.push(resume.contact.email)
    if (resume.contact?.phone) contactParts.push(resume.contact.phone)
    if (resume.contact?.location) contactParts.push(resume.contact.location)
    if (resume.contact?.linkedin) contactParts.push(resume.contact.linkedin)
    if (resume.contact?.website) contactParts.push(resume.contact.website)
    if (contactParts.length > 0) {
      sections.push(new Paragraph({
        children: [new TextRun({ text: contactParts.join('  |  '), size: 18, color: '666666' })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: ACCENT_COLOR, space: 4 } },
      }))
    }

    // ─── Objective ───
    if (resume.objective) {
      sections.push(new Paragraph({
        children: [new TextRun({ text: 'OBJECTIVE', bold: true, size: 22, color: ACCENT_COLOR })],
        spacing: { before: 200, after: 80 },
      }))
      sections.push(new Paragraph({
        children: [new TextRun({ text: resume.objective, size: 20 })],
        spacing: { after: 120 },
      }))
    }

    // ─── Experience ───
    if (resume.experience?.length) {
      sections.push(new Paragraph({
        children: [new TextRun({ text: 'EXPERIENCE', bold: true, size: 22, color: ACCENT_COLOR })],
        spacing: { before: 200, after: 80 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC', space: 2 } },
      }))
      // SECURITY: cap entries to bound docx generation CPU + output size.
      for (const exp of resume.experience.slice(0, MAX_EXPERIENCE_ENTRIES)) {
        // Title row: "Software Engineer — Google"
        sections.push(new Paragraph({
          children: [
            new TextRun({ text: clipStr(exp.title, 200) || 'Role', bold: true, size: 22 }),
            ...(exp.company ? [new TextRun({ text: ` — ${clipStr(exp.company, 200)}`, size: 22, color: '444444' })] : []),
          ],
          spacing: { before: 100, after: 20 },
        }))
        // Date row
        const dateStr = [exp.startDate, exp.endDate].filter(Boolean).join(' – ')
        if (dateStr) {
          sections.push(new Paragraph({
            children: [new TextRun({ text: clipStr(dateStr, 100), italics: true, size: 18, color: '888888' })],
            spacing: { after: 60 },
          }))
        }
        // Bullets
        // SECURITY: cap bullets per entry.
        for (const bullet of (exp.bullets || []).slice(0, MAX_BULLETS_PER_ENTRY)) {
          sections.push(new Paragraph({
            children: [new TextRun({ text: clipStr(bullet), size: 20 })],
            bullet: { level: 0 },
            spacing: { after: 40 },
          }))
        }
      }
    }

    // ─── Education ───
    if (resume.education?.length) {
      sections.push(new Paragraph({
        children: [new TextRun({ text: 'EDUCATION', bold: true, size: 22, color: ACCENT_COLOR })],
        spacing: { before: 200, after: 80 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC', space: 2 } },
      }))
      for (const ed of resume.education.slice(0, 50)) {
        sections.push(new Paragraph({
          children: [
            new TextRun({ text: clipStr(ed.degree, 200) || 'Degree', bold: true, size: 22 }),
            ...(ed.school ? [new TextRun({ text: ` — ${clipStr(ed.school, 200)}`, size: 22, color: '444444' })] : []),
          ],
          spacing: { before: 80, after: 20 },
        }))
        const edDate = [ed.startDate, ed.endDate].filter(Boolean).join(' – ')
        if (edDate) {
          sections.push(new Paragraph({
            children: [new TextRun({ text: clipStr(edDate, 100), italics: true, size: 18, color: '888888' })],
            spacing: { after: 40 },
          }))
        }
        if (ed.details) {
          sections.push(new Paragraph({
            children: [new TextRun({ text: clipStr(ed.details), size: 20 })],
            spacing: { after: 40 },
          }))
        }
      }
    }

    // ─── Skills ───
    if (resume.skills?.technical?.length || resume.skills?.soft?.length || resume.skills?.languages?.length) {
      sections.push(new Paragraph({
        children: [new TextRun({ text: 'SKILLS', bold: true, size: 22, color: ACCENT_COLOR })],
        spacing: { before: 200, after: 80 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC', space: 2 } },
      }))
      if (resume.skills.technical?.length) {
        // SECURITY: cap skill count to prevent megabyte-sized join strings.
        const techText = resume.skills.technical.slice(0, MAX_SKILLS_PER_CATEGORY).map(s => clipStr(s, 100)).join(', ')
        sections.push(new Paragraph({
          children: [
            new TextRun({ text: 'Technical: ', bold: true, size: 20 }),
            new TextRun({ text: techText, size: 20 }),
          ],
          spacing: { after: 40 },
        }))
      }
      if (resume.skills.soft?.length) {
        const softText = resume.skills.soft.slice(0, MAX_SKILLS_PER_CATEGORY).map(s => clipStr(s, 100)).join(', ')
        sections.push(new Paragraph({
          children: [
            new TextRun({ text: 'Soft Skills: ', bold: true, size: 20 }),
            new TextRun({ text: softText, size: 20 }),
          ],
          spacing: { after: 40 },
        }))
      }
      if (resume.skills.languages?.length) {
        const langText = resume.skills.languages.slice(0, MAX_SKILLS_PER_CATEGORY).map(l => `${clipStr(l.language, 50)} (${clipStr(l.level, 30)})`).join(', ')
        sections.push(new Paragraph({
          children: [
            new TextRun({ text: 'Languages: ', bold: true, size: 20 }),
            new TextRun({ text: langText, size: 20 }),
          ],
          spacing: { after: 40 },
        }))
      }
    }

    // ─── Projects ───
    if (resume.projects?.length) {
      sections.push(new Paragraph({
        children: [new TextRun({ text: 'PROJECTS', bold: true, size: 22, color: ACCENT_COLOR })],
        spacing: { before: 200, after: 80 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC', space: 2 } },
      }))
      for (const proj of resume.projects.slice(0, 50)) {
        sections.push(new Paragraph({
          children: [new TextRun({ text: clipStr(proj.name, 200) || 'Project', bold: true, size: 22 })],
          spacing: { before: 80, after: 20 },
        }))
        if (proj.description) {
          sections.push(new Paragraph({
            children: [new TextRun({ text: clipStr(proj.description), size: 20 })],
            spacing: { after: 40 },
          }))
        }
        if (proj.link) {
          sections.push(new Paragraph({
            children: [new TextRun({ text: clipStr(proj.link, 500), size: 18, color: '0066CC', underline: {} })],
            spacing: { after: 40 },
          }))
        }
      }
    }

    // ─── Certifications ───
    if (resume.certifications?.length) {
      sections.push(new Paragraph({
        children: [new TextRun({ text: 'CERTIFICATIONS', bold: true, size: 22, color: ACCENT_COLOR })],
        spacing: { before: 200, after: 80 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC', space: 2 } },
      }))
      for (const cert of resume.certifications.slice(0, 100)) {
        sections.push(new Paragraph({
          children: [
            new TextRun({ text: clipStr(cert.name, 200) || 'Certification', bold: true, size: 20 }),
            ...(cert.issuer ? [new TextRun({ text: ` — ${clipStr(cert.issuer, 200)}`, size: 20, color: '444444' })] : []),
            ...(cert.date ? [new TextRun({ text: ` (${clipStr(cert.date, 50)})`, size: 18, color: '888888' })] : []),
          ],
          spacing: { after: 40 },
        }))
      }
    }

    // ─── Courses ───
    if (resume.courses?.length) {
      sections.push(new Paragraph({
        children: [new TextRun({ text: 'COURSES', bold: true, size: 22, color: ACCENT_COLOR })],
        spacing: { before: 200, after: 80 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC', space: 2 } },
      }))
      for (const course of resume.courses.slice(0, 100)) {
        const parts: string[] = [clipStr(course.name, 200) || 'Course']
        if (course.provider) parts.push(clipStr(course.provider, 200))
        if (course.hours) parts.push(`${clipStr(course.hours, 20)}h`)
        if (course.date) parts.push(clipStr(course.date, 50))
        sections.push(new Paragraph({
          children: [new TextRun({ text: parts.join(' — '), size: 20 })],
          spacing: { after: 40 },
        }))
      }
    }

    // Build the document with proper RTL support detection
    const hasArabic = JSON.stringify(resume).includes('\\u06') || /[\u0600-\u06FF]/.test(JSON.stringify(resume))
    const doc = new Document({
      styles: {
        default: {
          document: {
            run: { font: 'Calibri', size: 20 },
          },
        },
      },
      sections: [{
        properties: {
          page: {
            margin: { top: 720, bottom: 720, left: 720, right: 720 }, // 0.5 inch
          },
          ...(hasArabic ? { bidi: true } : {}),
        },
        children: sections,
      }],
    })

    const buffer = await Packer.toBuffer(doc)

    // Log the export
    try {
      const { db } = await import('@/lib/db')
      await db.auditLog.create({ data: { userId: user.id, action: 'resume.export_docx', entity: 'Resume', entityId: title } })
    } catch {}

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        // SECURITY: use the shared helper — strips CR/LF (header splitting),
        // path separators, control chars, and provides RFC 5987 UTF-8 fallback
        // so Arabic names render correctly without allowing raw quotes through.
        'Content-Disposition': safeContentDisposition(title, 'docx'),
      },
    })
  } catch (e) {
    return err(e)
  }
}
