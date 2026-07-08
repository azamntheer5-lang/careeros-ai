import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { run } from '@/lib/ai'
import { getCurrentUser, err } from '@/lib/server'

/** Competitor resume comparison: candidate vs a (synthesized) ideal competitor for the role. */
export async function POST(req: Request) {
  try {
    const user = await getCurrentUser()
    const { resumeId, resumeText, jobDescription } = await req.json()
    let content = resumeText || ''
    if (resumeId && !content) {
      const r = await db.resume.findUnique({ where: { id: resumeId } })
      if (r) content = JSON.stringify(JSON.parse(r.data))
    }
    if (!content.trim() || !jobDescription?.trim()) {
      return NextResponse.json({ error: 'Resume and job description required' }, { status: 400 })
    }
    const { data } = await run<any>(
      'ats_competitor',
      user.id, user.name || '',
      [{ role: 'user', content: `Compare this candidate's resume against an ideal competitor for the role described. Return JSON: { "candidateScore": number 0-100, "competitorScore": number 0-100, "edge": [{ "area": string, "candidate": string, "competitor": string, "winner": "candidate"|"competitor"|"tie" }], "hiddenKeywords": string[], "candidateGaps": string[], "advice": string }.\n\nRESUME:\n${content.slice(0, 3000)}\n\nJOB:\n${jobDescription.slice(0, 2000)}` }],
      { json: true }
    )
    return NextResponse.json({ comparison: data })
  } catch (e) { return err(e) }
}
