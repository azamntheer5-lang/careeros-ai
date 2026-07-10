import { NextResponse } from 'next/server'
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

const ACCENT: [number, number, number] = [16, 185, 129] // emerald-500
const DARK: [number, number, number] = [30, 30, 30]
const GRAY: [number, number, number] = [102, 102, 102]
const LIGHT_GRAY: [number, number, number] = [136, 136, 136]

// SECURITY: cap the title length to prevent oversized Content-Disposition
// headers and avoid feeding megabytes of attacker-controlled text into jsPDF.
const MAX_TITLE_LEN = 120
// SECURITY: cap the number of experience bullets / entries we render so a
// pathological resume object can't blow up CPU/memory during PDF generation.
const MAX_EXPERIENCE_ENTRIES = 100
const MAX_BULLETS_PER_ENTRY = 50
const MAX_TEXT_FIELD_LEN = 5000

/** Coerce and clip a free-text resume field to a safe string. */
function clipStr(v: unknown, max = MAX_TEXT_FIELD_LEN): string {
  if (typeof v !== 'string') return ''
  return v.slice(0, max)
}

/** POST — generate a pixel-perfect PDF from resume JSON. Body: { resume: ResumeData, title?: string } */
export async function POST(req: Request) {
  try {
    const user = await getCurrentUser()
    const limited = rateLimitOr429(user.id, 'ai_generate')
    if (limited) return limited

    const body = await req.json().catch(() => null)
    // SECURITY: validate body shape — `resume` must be a non-null object.
    // Without this, an attacker could send `null` / a string / a huge array
    // and trigger unhandled exceptions inside jsPDF or downstream.
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

    // Dynamic import jsPDF (it's a client-heavy lib but works in nodejs runtime)
    const { jsPDF } = await import('jspdf')

    const hasArabic = /[\u0600-\u06FF]/.test(JSON.stringify(resume))
    const doc = new jsPDF({
      unit: 'pt',
      format: 'a4',
      putOnlyUsedFonts: true,
    })

    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const margin = 40
    const contentWidth = pageWidth - margin * 2
    let y = margin

    const ensureSpace = (needed: number) => {
      if (y + needed > pageHeight - margin) {
        doc.addPage()
        y = margin
      }
    }

    const addSectionHeader = (text: string) => {
      ensureSpace(40)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(11)
      doc.setTextColor(...ACCENT)
      doc.text(text.toUpperCase(), margin, y)
      y += 4
      doc.setDrawColor(...ACCENT)
      doc.setLineWidth(0.5)
      doc.line(margin, y, margin + contentWidth, y)
      y += 12
    }

    // ─── Header ───
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(22)
    doc.setTextColor(...DARK)
    const name = resume.contact?.name || title
    doc.text(name, pageWidth / 2, y + 10, { align: 'center' })
    y += 24

    // Contact line
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(...GRAY)
    const contactParts: string[] = []
    if (resume.contact?.email) contactParts.push(resume.contact.email)
    if (resume.contact?.phone) contactParts.push(resume.contact.phone)
    if (resume.contact?.location) contactParts.push(resume.contact.location)
    if (resume.contact?.linkedin) contactParts.push(resume.contact.linkedin)
    if (resume.contact?.website) contactParts.push(resume.contact.website)
    if (contactParts.length > 0) {
      const contactStr = contactParts.join('  |  ')
      doc.text(contactStr, pageWidth / 2, y, { align: 'center' })
      y += 6
    }
    // Accent divider
    doc.setDrawColor(...ACCENT)
    doc.setLineWidth(1)
    doc.line(margin, y, margin + contentWidth, y)
    y += 16

    // ─── Objective ───
    if (resume.objective) {
      addSectionHeader('Objective')
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(10)
      doc.setTextColor(...DARK)
      const lines = doc.splitTextToSize(resume.objective, contentWidth) as string[]
      for (const line of lines) {
        ensureSpace(14)
        doc.text(line, margin, y)
        y += 14
      }
      y += 8
    }

    // ─── Experience ───
    // SECURITY: cap entries to prevent pathological resume from exhausting CPU/memory.
    if (resume.experience?.length) {
      addSectionHeader('Experience')
      for (const exp of resume.experience.slice(0, MAX_EXPERIENCE_ENTRIES)) {
        ensureSpace(30)
        // Title — Company
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(11)
        doc.setTextColor(...DARK)
        const titleStr = clipStr(exp.title, 200) || 'Role'
        doc.text(titleStr, margin, y)
        if (exp.company) {
          doc.setFont('helvetica', 'normal')
          doc.setTextColor(...GRAY)
          doc.text(`— ${exp.company}`, margin + doc.getTextWidth(titleStr) + 6, y)
        }
        y += 14
        // Date
        const dateStr = [exp.startDate, exp.endDate].filter(Boolean).join(' – ')
        if (dateStr) {
          doc.setFont('helvetica', 'italic')
          doc.setFontSize(9)
          doc.setTextColor(...LIGHT_GRAY)
          doc.text(dateStr, margin, y)
          y += 12
        }
        // Bullets
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(10)
        doc.setTextColor(...DARK)
        // SECURITY: cap bullets per entry.
        for (const bullet of (exp.bullets || []).slice(0, MAX_BULLETS_PER_ENTRY)) {
          const bulletLines = doc.splitTextToSize(`•  ${bullet}`, contentWidth - 10) as string[]
          for (let i = 0; i < bulletLines.length; i++) {
            ensureSpace(14)
            doc.text(bulletLines[i], margin + 4, y)
            y += 14
          }
        }
        y += 6
      }
    }

    // ─── Education ───
    if (resume.education?.length) {
      addSectionHeader('Education')
      for (const ed of resume.education) {
        ensureSpace(28)
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(10)
        doc.setTextColor(...DARK)
        const degreeStr = ed.degree || 'Degree'
        doc.text(degreeStr, margin, y)
        if (ed.school) {
          doc.setFont('helvetica', 'normal')
          doc.setTextColor(...GRAY)
          doc.text(`— ${ed.school}`, margin + doc.getTextWidth(degreeStr) + 6, y)
        }
        y += 12
        const edDate = [ed.startDate, ed.endDate].filter(Boolean).join(' – ')
        if (edDate) {
          doc.setFont('helvetica', 'italic')
          doc.setFontSize(9)
          doc.setTextColor(...LIGHT_GRAY)
          doc.text(edDate, margin, y)
          y += 10
        }
        if (ed.details) {
          doc.setFont('helvetica', 'normal')
          doc.setFontSize(9)
          doc.setTextColor(...DARK)
          const lines = doc.splitTextToSize(ed.details, contentWidth) as string[]
          for (const line of lines) {
            ensureSpace(12)
            doc.text(line, margin, y)
            y += 12
          }
        }
        y += 4
      }
    }

    // ─── Skills ───
    if (resume.skills?.technical?.length || resume.skills?.soft?.length || resume.skills?.languages?.length) {
      addSectionHeader('Skills')
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(10)
      doc.setTextColor(...DARK)
      if (resume.skills.technical?.length) {
        ensureSpace(14)
        doc.setFont('helvetica', 'bold')
        doc.text('Technical: ', margin, y)
        doc.setFont('helvetica', 'normal')
        const techText = resume.skills.technical.join(', ')
        const techLines = doc.splitTextToSize(techText, contentWidth - 60) as string[]
        doc.text(techLines, margin + 55, y)
        y += 14 * techLines.length
      }
      if (resume.skills.soft?.length) {
        ensureSpace(14)
        doc.setFont('helvetica', 'bold')
        doc.text('Soft Skills: ', margin, y)
        doc.setFont('helvetica', 'normal')
        const softText = resume.skills.soft.join(', ')
        const softLines = doc.splitTextToSize(softText, contentWidth - 70) as string[]
        doc.text(softLines, margin + 65, y)
        y += 14 * softLines.length
      }
      if (resume.skills.languages?.length) {
        ensureSpace(14)
        doc.setFont('helvetica', 'bold')
        doc.text('Languages: ', margin, y)
        doc.setFont('helvetica', 'normal')
        const langText = resume.skills.languages.map(l => `${l.language} (${l.level})`).join(', ')
        const langLines = doc.splitTextToSize(langText, contentWidth - 65) as string[]
        doc.text(langLines, margin + 60, y)
        y += 14 * langLines.length
      }
      y += 6
    }

    // ─── Projects ───
    if (resume.projects?.length) {
      addSectionHeader('Projects')
      for (const proj of resume.projects) {
        ensureSpace(24)
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(10)
        doc.setTextColor(...DARK)
        doc.text(proj.name || 'Project', margin, y)
        y += 12
        if (proj.description) {
          doc.setFont('helvetica', 'normal')
          doc.setFontSize(9)
          const lines = doc.splitTextToSize(proj.description, contentWidth) as string[]
          for (const line of lines) {
            ensureSpace(12)
            doc.text(line, margin, y)
            y += 12
          }
        }
        if (proj.link) {
          doc.setFont('helvetica', 'normal')
          doc.setFontSize(9)
          doc.setTextColor(0, 102, 204)
          doc.textWithLink(proj.link, margin, y, { url: proj.link })
          y += 12
        }
        y += 4
      }
    }

    // ─── Certifications ───
    if (resume.certifications?.length) {
      addSectionHeader('Certifications')
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(10)
      doc.setTextColor(...DARK)
      for (const cert of resume.certifications) {
        ensureSpace(14)
        doc.setFont('helvetica', 'bold')
        doc.text(cert.name || 'Certification', margin, y)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(...GRAY)
        const parts: string[] = []
        if (cert.issuer) parts.push(cert.issuer)
        if (cert.date) parts.push(cert.date)
        if (parts.length) {
          doc.text(parts.join(' — '), margin + doc.getTextWidth(cert.name || 'Certification') + 6, y)
        }
        y += 14
      }
      y += 6
    }

    // ─── Courses ───
    if (resume.courses?.length) {
      addSectionHeader('Courses')
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(10)
      doc.setTextColor(...DARK)
      for (const course of resume.courses) {
        ensureSpace(14)
        const parts: string[] = [course.name || 'Course']
        if (course.provider) parts.push(course.provider)
        if (course.hours) parts.push(`${course.hours}h`)
        if (course.date) parts.push(course.date)
        doc.text(parts.join(' — '), margin, y)
        y += 14
      }
    }

    const pdfBuffer = Buffer.from(doc.output('arraybuffer'))

    // Log the export
    try {
      const { db } = await import('@/lib/db')
      await db.auditLog.create({ data: { userId: user.id, action: 'resume.export_pdf', entity: 'Resume', entityId: title } })
    } catch {}

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        // SECURITY: use the shared helper — strips CR/LF (header splitting),
        // path separators, control chars, and provides RFC 5987 UTF-8 fallback
        // so Arabic names render correctly without allowing raw quotes through.
        'Content-Disposition': safeContentDisposition(title, 'pdf'),
      },
    })
  } catch (e) {
    return err(e)
  }
}
