import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { run } from '@/lib/ai'
import { getCurrentUser, err } from '@/lib/server'
import { rateLimitOr429 } from '@/lib/rate-limit'

/** AI quality score for a resume across impact, clarity, keywords, formatting, quantification. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const user = await getCurrentUser()
    const limited = rateLimitOr429(user.id, 'ai_generate')
    if (limited) return limited
    const resume = await db.resume.findUnique({ where: { id } })
    if (!resume || resume.userId !== user.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    const data = JSON.parse(resume.data)
    const text = resumeToText(data)
    const { data: score } = await run<any>(
      'resume_score',
      user.id,
      user.name || '',
      [{
        role: 'user',
        content: `Score this resume across 5 dimensions (0-100 each): impact, clarity, keywords, formatting, quantification. Also give an overall score and 3 quick wins. Return JSON: { "overall": number, "dimensions": [{ "name": string, "score": number }], "quickWins": string[], "weaknesses": string[] }.\n\nRESUME:\n${text}`,
      }],
      { json: true }
    )
    await db.resume.update({ where: { id }, data: { aiScore: score.overall } })
    return NextResponse.json({ score })
  } catch (e) {
    return err(e)
  }
}

function resumeToText(d: any): string {
  const parts: string[] = []
  if (d.contact?.name) parts.push(d.contact.name)
  if (d.summary) parts.push(d.summary)
  for (const e of d.experience || []) { parts.push(`${e.title} at ${e.company}`); for (const b of e.bullets || []) parts.push(b) }
  for (const ed of d.education || []) parts.push(`${ed.degree} at ${ed.school}`)
  if (d.skills?.length) parts.push(`Skills: ${d.skills.join(', ')}`)
  for (const p of d.projects || []) parts.push(`${p.name} — ${p.description}`)
  for (const c of d.certifications || []) parts.push(`${c.name} (${c.issuer})`)
  return parts.join('\n')
}
