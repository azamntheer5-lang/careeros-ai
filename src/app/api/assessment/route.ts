import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { runWithCredits } from '@/lib/ai'
import { getCurrentUser, err } from '@/lib/server'

/** GET past assessments. */
export async function GET() {
  try {
    const user = await getCurrentUser()
    const assessments = await db.assessment.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' }, take: 10 })
    return NextResponse.json({ assessments })
  } catch (e) { return err(e) }
}

/** POST assessment answers → AI generates a complete career profile + saves it. */
export async function POST(req: Request) {
  try {
    const user = await getCurrentUser()
    const answers = await req.json()

    const { data: result, balance, cost } = await runWithCredits<any>(
      'career_assessment',
      user.id,
      user.name || '',
      [{
        role: 'user',
        content: `Synthesize a complete career profile from these assessment answers. Return JSON: {
  "targetRole": string,
  "industry": string,
  "seniority": string,
  "experienceYears": number,
  "targetSalary": string,
  "location": string,
  "workMode": string,
  "careerGoals": string,
  "timeline": string,
  "brandStatement": string,
  "strengths": string[],
  "values": string[],
  "personality": { "archetype": string, "description": string, "workStyle": string },
  "careerStage": string,
  "recommendedPath": string,
  "ninetyDayPriorities": string[],
  "score": number (0-100 career clarity score)
}

Assessment answers:
${JSON.stringify(answers, null, 2)}`,
      }],
      { json: true, feature: 'career_assessment' }
    )

    // Save the assessment
    const assessment = await db.assessment.create({
      data: {
        userId: user.id,
        type: 'career',
        answers: JSON.stringify(answers),
        result: JSON.stringify(result),
        score: result.score ?? 0,
      },
    })

    // Auto-build the career profile from the assessment result
    await db.careerProfile.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        targetRole: result.targetRole || null,
        industry: result.industry || null,
        seniority: result.seniority || null,
        experienceYears: result.experienceYears ?? null,
        targetSalary: result.targetSalary || null,
        location: result.location || null,
        workMode: result.workMode || null,
        careerGoals: result.careerGoals || null,
        timeline: result.timeline || null,
        brandStatement: result.brandStatement || null,
        strengths: JSON.stringify(result.strengths || []),
        values: JSON.stringify(result.values || []),
      },
      update: {
        targetRole: result.targetRole || undefined,
        industry: result.industry || undefined,
        seniority: result.seniority || undefined,
        experienceYears: result.experienceYears ?? undefined,
        targetSalary: result.targetSalary || undefined,
        location: result.location || undefined,
        workMode: result.workMode || undefined,
        careerGoals: result.careerGoals || undefined,
        timeline: result.timeline || undefined,
        brandStatement: result.brandStatement || undefined,
        strengths: JSON.stringify(result.strengths || []),
        values: JSON.stringify(result.values || []),
      },
    })

    // Mark user as onboarded
    await db.user.update({ where: { id: user.id }, data: { onboarded: true } })

    // Unlock an achievement
    await db.achievement.create({ data: { userId: user.id, type: 'milestone', title: 'Career Assessment Complete', description: `Career clarity score: ${result.score}/100` } }).catch(() => {})

    try { await db.auditLog.create({ data: { userId: user.id, action: 'assessment.complete', entity: 'Assessment', entityId: assessment.id } }) } catch {}
    return NextResponse.json({ assessment: { ...assessment, result }, balance, cost })
  } catch (e) { return err(e) }
}
