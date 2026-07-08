import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { ai } from '@/lib/ai'
import { getCurrentUser, err, clipInput } from '@/lib/server'

/** ATS analysis: compare a resume against a job description. */
export async function POST(req: Request) {
  try {
    const user = await getCurrentUser()
    const { resumeId, resumeText, jobDescription } = await req.json()

    let resumeContent = resumeText || ''
    if (resumeId && !resumeContent) {
      const resume = await db.resume.findUnique({ where: { id: resumeId } })
      if (resume) {
        const data = JSON.parse(resume.data)
        resumeContent = resumeToText(data)
      }
    }
    if (!resumeContent.trim() || !jobDescription?.trim()) {
      return NextResponse.json(
        { error: 'Both resume content and job description are required' },
        { status: 400 }
      )
    }

    // Input length limits to prevent AI cost abuse
    const clippedResume = clipInput(resumeContent, 10000)
    const clippedJob = clipInput(jobDescription, 10000)

    const { data } = await ai.analyzeAts(clippedResume, clippedJob)

    // persist score on the resume if tied to one
    if (resumeId && typeof data.score === 'number') {
      try {
        await db.resume.update({ where: { id: resumeId }, data: { atsScore: data.score } })
      } catch {}
    }
    await db.aiUsage.create({ data: { userId: user.id, feature: 'ats-analyze', tokens: 1 } })
    return NextResponse.json({ analysis: data })
  } catch (e) {
    return err(e)
  }
}

function resumeToText(d: any): string {
  const parts: string[] = []
  if (d.contact?.name) parts.push(d.contact.name)
  if (d.summary) parts.push(d.summary)
  for (const e of d.experience || []) {
    parts.push(`${e.title} at ${e.company}`)
    for (const b of e.bullets || []) parts.push(b)
  }
  for (const ed of d.education || []) parts.push(`${ed.degree} at ${ed.school}`)
  if (d.skills?.length) parts.push(`Skills: ${d.skills.join(', ')}`)
  for (const p of d.projects || []) parts.push(`${p.name} — ${p.description}`)
  for (const c of d.certifications || []) parts.push(`${c.name} (${c.issuer})`)
  return parts.join('\n')
}
