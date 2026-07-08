import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { run } from '@/lib/ai'
import { getCurrentUser, err, parseJson } from '@/lib/server'
import { rateLimitOr429 } from '@/lib/rate-limit'

type JobMatch = {
  matchScore: number
  probabilityOfSuccess: number
  strengths: string[]
  gaps: string[]
  requiredImprovements: { area: string; action: string; priority: 'high' | 'medium' | 'low' }[]
  verdict: string
  advice: string
}

/** Build a compact candidate-context string from profile + most recent resume. */
async function buildCandidateContext(userId: string): Promise<string> {
  const profile = await db.careerProfile.findUnique({ where: { userId } })
  const resume = await db.resume.findFirst({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
  })

  const parts: string[] = []
  if (profile) {
    if (profile.targetRole) parts.push(`Target role: ${profile.targetRole}`)
    if (profile.industry) parts.push(`Industry: ${profile.industry}`)
    if (profile.seniority) parts.push(`Seniority: ${profile.seniority}`)
    if (profile.experienceYears != null) parts.push(`Years of experience: ${profile.experienceYears}`)
    if (profile.targetSalary) parts.push(`Target salary: ${profile.targetSalary} ${profile.currency}`)
    if (profile.location) parts.push(`Location: ${profile.location}`)
    if (profile.workMode) parts.push(`Work mode: ${profile.workMode}`)
    if (profile.brandStatement) parts.push(`Brand statement: ${profile.brandStatement}`)
    const strengths = parseJson<string[]>(profile.strengths)
    if (strengths.length) parts.push(`Strengths: ${strengths.join(', ')}`)
    const values = parseJson<string[]>(profile.values)
    if (values.length) parts.push(`Values: ${values.join(', ')}`)
    if (profile.careerGoals) parts.push(`Career goals: ${profile.careerGoals}`)
  }

  if (resume) {
    try {
      const r = JSON.parse(resume.data)
      if (r.summary) parts.push(`\nResume summary: ${r.summary}`)
      const skills: string[] = Array.isArray(r.skills) ? r.skills : []
      if (skills.length) parts.push(`Resume skills: ${skills.join(', ')}`)
      const exp = Array.isArray(r.experience) ? r.experience : []
      for (const e of exp.slice(0, 6)) {
        parts.push(
          `- ${e.title || ''} @ ${e.company || ''} (${e.startDate || ''} – ${e.endDate || 'present'})`
        )
        const bullets: string[] = Array.isArray(e.bullets) ? e.bullets : []
        for (const b of bullets.slice(0, 3)) parts.push(`    • ${b}`)
      }
      const edu = Array.isArray(r.education) ? r.education : []
      for (const e of edu.slice(0, 2)) {
        parts.push(`- ${e.degree || ''} @ ${e.school || ''}`)
      }
      const certs: string[] = Array.isArray(r.certifications)
        ? r.certifications.map((c: any) => (typeof c === 'string' ? c : c?.name)).filter(Boolean)
        : []
      if (certs.length) parts.push(`Certifications: ${certs.join(', ')}`)
    } catch {}
  }

  return parts.length ? parts.join('\n') : 'No detailed candidate profile on file.'
}

/** POST — AI job match: scores the user's fit for a specific role + JD. */
export async function POST(req: Request) {
  try {
    const user = await getCurrentUser()
    const limited = rateLimitOr429(user.id, 'ai_analyze')
    if (limited) return limited
    const { role, company, jobDescription } = await req.json()
    if (!role?.trim() || !jobDescription?.trim()) {
      return NextResponse.json(
        { error: 'Role and job description are required' },
        { status: 400 }
      )
    }

    const profileContext = await buildCandidateContext(user.id)

    const userMsg = `Candidate profile + resume:
${profileContext}

Target role: ${role}${company ? ` at ${company}` : ''}
Job description:
${jobDescription}

Return JSON: {
  "matchScore": number 0-100,
  "probabilityOfSuccess": number 0-100,
  "strengths": string[],
  "gaps": string[],
  "requiredImprovements": [{ "area": string, "action": string, "priority": "high"|"medium"|"low" }],
  "verdict": string,
  "advice": string
}`

    const { data } = await run<JobMatch>(
      'job_match',
      user.id,
      user.name || 'Candidate',
      [{ role: 'user', content: userMsg }],
      { json: true }
    )

    // Best-effort usage tracking.
    try {
      await db.aiUsage.create({
        data: {
          userId: user.id,
          feature: 'market-match',
          tokens: 1,
          success: true,
        },
      })
    } catch {}

    return NextResponse.json({ match: data })
  } catch (e) {
    return err(e)
  }
}
