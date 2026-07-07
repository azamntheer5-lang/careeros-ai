import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { run } from '@/lib/ai'
import { getCurrentUser, err, parseJson } from '@/lib/server'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type MatchResult = {
  matchScore: number
  verdict: string
  strengths: string[]
  gaps: string[]
  risks: string[]
  interviewFocus: string[]
  recommendation: string
}

// ---------------------------------------------------------------------------
// Candidate context builder — mirrors /api/market/match but for an arbitrary
// candidate userId (synthetic candidates have Resume + CareerProfile rows).
// ---------------------------------------------------------------------------

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
    if (profile.location) parts.push(`Location: ${profile.location}`)
    if (profile.workMode) parts.push(`Work mode: ${profile.workMode}`)
    if (profile.brandStatement) parts.push(`Brand statement: ${profile.brandStatement}`)
    const strengths = parseJson<string[]>(profile.strengths)
    if (strengths.length) parts.push(`Strengths: ${strengths.join(', ')}`)
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

// ---------------------------------------------------------------------------
// Route handler — POST { jobPostingId, candidateId } → AI match analysis
// ---------------------------------------------------------------------------

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser()
    const { jobPostingId, candidateId } = await req.json()

    if (!jobPostingId || !candidateId) {
      return NextResponse.json(
        { error: 'jobPostingId and candidateId are required' },
        { status: 400 }
      )
    }

    // Load job posting — must belong to the current employer.
    const jobRow = await db.jobPosting.findUnique({ where: { id: jobPostingId } })
    if (!jobRow || jobRow.employerId !== user.id) {
      return NextResponse.json({ error: 'Job posting not found' }, { status: 404 })
    }

    // Load candidate user (any user — synthetic or self).
    const candidate = await db.user.findUnique({ where: { id: candidateId } })
    if (!candidate) {
      return NextResponse.json({ error: 'Candidate not found' }, { status: 404 })
    }

    const candidateContext = await buildCandidateContext(candidateId)

    const jobContext = JSON.stringify({
      title: jobRow.title,
      company: jobRow.company,
      location: jobRow.location,
      remote: jobRow.remote,
      type: jobRow.type,
      salary: jobRow.salary,
      description: jobRow.description,
      requirements: parseJson<string[]>(jobRow.requirements),
      skills: parseJson<string[]>(jobRow.skills),
    })

    const userMsg = `Job: ${jobContext}\nCandidate resume + profile:\n${candidateContext}\n\nReturn JSON: { "matchScore": number 0-100, "verdict": string, "strengths": string[], "gaps": string[], "risks": string[], "interviewFocus": string[], "recommendation": string }`

    const { data } = await run<MatchResult>(
      'ai_recruiter',
      user.id,
      user.name || 'Recruiter',
      [{ role: 'user', content: userMsg }],
      { json: true }
    )

    // Clamp + defensively normalize the AI output before persisting + returning.
    const safe: MatchResult = {
      matchScore: Math.max(0, Math.min(100, Math.round(Number(data?.matchScore) || 0))),
      verdict: String(data?.verdict ?? 'Review candidate').slice(0, 400),
      strengths: Array.isArray(data?.strengths) ? data.strengths.map(String) : [],
      gaps: Array.isArray(data?.gaps) ? data.gaps.map(String) : [],
      risks: Array.isArray(data?.risks) ? data.risks.map(String) : [],
      interviewFocus: Array.isArray(data?.interviewFocus) ? data.interviewFocus.map(String) : [],
      recommendation: String(data?.recommendation ?? '').slice(0, 1200),
    }

    // Upsert the CandidateApplication with the AI match results.
    try {
      await db.candidateApplication.upsert({
        where: { jobPostingId_candidateId: { jobPostingId, candidateId } },
        create: {
          jobPostingId,
          candidateId,
          status: 'reviewed',
          matchScore: safe.matchScore,
          matchNotes: JSON.stringify(safe),
        },
        update: {
          matchScore: safe.matchScore,
          matchNotes: JSON.stringify(safe),
          status: 'reviewed',
        },
      })
    } catch {
      // Non-fatal — the AI result is still returned to the caller.
    }

    // Best-effort usage tracking (recruit is an employer feature, not credit-gated).
    try {
      await db.aiUsage.create({
        data: {
          userId: user.id,
          feature: 'recruit-match',
          tokens: 1,
          success: true,
        },
      })
    } catch {}

    return NextResponse.json({ match: safe })
  } catch (e) {
    return err(e)
  }
}
