import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { run } from '@/lib/ai'
import { getCurrentUser, err } from '@/lib/server'

/** Recruiter 6-second simulation: what a busy recruiter sees, skips, and judges. */
export async function POST(req: Request) {
  try {
    const user = await getCurrentUser()
    const { resumeId, resumeText } = await req.json()
    let content = resumeText || ''
    if (resumeId && !content) {
      const r = await db.resume.findUnique({ where: { id: resumeId } })
      if (r) content = JSON.stringify(JSON.parse(r.data))
    }
    if (!content.trim()) return NextResponse.json({ error: 'Resume required' }, { status: 400 })
    const { data } = await run<any>(
      'ats_recruiter_sim',
      user.id, user.name || '',
      [{ role: 'user', content: `Simulate a 6-second recruiter screen of this resume. Return JSON: { "firstImpression": string, "verdict": "advance"|"maybe"|"pass", "confidenceScore": number 0-100, "whatStoodOut": string[], "whatWasSkipped": string[], "snapJudgment": string, "readabilityScore": number, "redFlags": string[] }.\n\nRESUME:\n${content.slice(0, 4000)}` }],
      { json: true }
    )
    return NextResponse.json({ simulation: data })
  } catch (e) { return err(e) }
}
