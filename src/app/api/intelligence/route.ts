import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { run } from '@/lib/ai'
import { getCurrentUser, err, parseJson } from '@/lib/server'

/** Shape of a generated career plan (mirrors the prompt contract). */
type RoadmapPhase = {
  phase: string
  duration: string
  focus: string
  milestones: string[]
  skills: string[]
  visibilityMoves: string[]
}
type SalaryStrategy = {
  current: string
  target: string
  steps: string[]
  negotiation: string
}
type PromotionPlan = {
  gapToNext: string
  scope: string[]
  evidence: string[]
  conversation: string
}
type MarketInsight = { topic: string; insight: string; action: string }
type CareerPlanPayload = {
  readinessScore: number
  targetRole: string
  roadmap: RoadmapPhase[]
  salaryStrategy: SalaryStrategy
  promotionPlan: PromotionPlan
  marketInsights: MarketInsight[]
  nextMoves: string[]
}

/** GET — list the user's past career plans, newest first. */
export async function GET() {
  try {
    const user = await getCurrentUser()
    const plans = await db.careerPlan.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
    const serialized = plans.map((p) => ({
      id: p.id,
      targetRole: p.targetRole,
      readinessScore: p.readinessScore,
      roadmap: parseJson<RoadmapPhase[]>(p.roadmap),
      salaryStrategy: parseJson<SalaryStrategy | null>(p.salaryStrategy),
      promotionPlan: parseJson<PromotionPlan | null>(p.promotionPlan),
      marketInsights: parseJson<MarketInsight[]>(p.marketInsights),
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    }))
    return NextResponse.json({ plans: serialized })
  } catch (e) {
    return err(e)
  }
}

/** POST — generate a fresh career plan from the user's profile + latest resume. */
export async function POST(req: Request) {
  try {
    const user = await getCurrentUser()
    const body = await req.json().catch(() => ({}))
    const overrideRole = (body?.targetRole as string | undefined)?.trim()

    // 1) Pull the career profile (single source of truth).
    const profile = await db.careerProfile.findUnique({ where: { userId: user.id } })

    // 2) Pull the latest resume for skills + current title context.
    const latestResume = await db.resume.findFirst({
      where: { userId: user.id },
      orderBy: { updatedAt: 'desc' },
    })
    let topSkills: string[] = []
    let currentTitle = ''
    if (latestResume) {
      try {
        const d = JSON.parse(latestResume.data)
        if (Array.isArray(d.skills)) topSkills = d.skills.slice(0, 12)
        const exp = Array.isArray(d.experience) ? d.experience[0] : null
        if (exp?.title) currentTitle = exp.title
      } catch {}
    }

    // 3) Resolve target role: explicit override > profile > fallback.
    const targetRole = overrideRole || profile?.targetRole || 'Senior role'
    const strengths = parseJson<string[]>(profile?.strengths)

    // 4) Build the orchestrated prompt.
    const promptText = `Candidate profile: targetRole=${targetRole}, seniority=${
      profile?.seniority ?? 'mid'
    }, experience=${profile?.experienceYears ?? 0}y, industry=${
      profile?.industry ?? ''
    }, currentTitle=${currentTitle}, topSkills=${topSkills.join(', ')}, strengths=${strengths.join(
      ', '
    )}, goals=${profile?.careerGoals ?? ''}, timeline=${profile?.timeline ?? ''}, targetSalary=${
      profile?.targetSalary ?? ''
    }, location=${profile?.location ?? ''}. Return JSON: { "readinessScore": number 0-100, "targetRole": string, "roadmap": [{ "phase": string, "duration": string, "focus": string, "milestones": string[], "skills": string[], "visibilityMoves": string[] }], "salaryStrategy": { "current": string, "target": string, "steps": string[], "negotiation": string }, "promotionPlan": { "gapToNext": string, "scope": string[], "evidence": string[], "conversation": string }, "marketInsights": [{ "topic": string, "insight": string, "action": string }], "nextMoves": string[] }`

    // 5) Call the orchestrated AI gateway (prompt registry: career_plan / quality tier).
    const { data, tokens, model, latencyMs } = await run<CareerPlanPayload>(
      'career_plan',
      user.id,
      user.name ?? '',
      [{ role: 'user', content: promptText }],
      { json: true }
    )

    // 6) Normalize the payload defensively (LLMs occasionally drop a field).
    const payload: CareerPlanPayload = {
      readinessScore: clampScore(data?.readinessScore),
      targetRole: String(data?.targetRole ?? targetRole),
      roadmap: Array.isArray(data?.roadmap) ? data.roadmap : [],
      salaryStrategy:
        data?.salaryStrategy && typeof data.salaryStrategy === 'object'
          ? {
              current: String(data.salaryStrategy.current ?? ''),
              target: String(data.salaryStrategy.target ?? ''),
              steps: Array.isArray(data.salaryStrategy.steps) ? data.salaryStrategy.steps : [],
              negotiation: String(data.salaryStrategy.negotiation ?? ''),
            }
          : { current: '', target: '', steps: [], negotiation: '' },
      promotionPlan:
        data?.promotionPlan && typeof data.promotionPlan === 'object'
          ? {
              gapToNext: String(data.promotionPlan.gapToNext ?? ''),
              scope: Array.isArray(data.promotionPlan.scope) ? data.promotionPlan.scope : [],
              evidence: Array.isArray(data.promotionPlan.evidence) ? data.promotionPlan.evidence : [],
              conversation: String(data.promotionPlan.conversation ?? ''),
            }
          : { gapToNext: '', scope: [], evidence: [], conversation: '' },
      marketInsights: Array.isArray(data?.marketInsights) ? data.marketInsights : [],
      nextMoves: Array.isArray(data?.nextMoves) ? data.nextMoves : [],
    }

    // 7) Persist the CareerPlan row.
    const plan = await db.careerPlan.create({
      data: {
        userId: user.id,
        targetRole: payload.targetRole,
        roadmap: JSON.stringify(payload.roadmap),
        salaryStrategy: JSON.stringify(payload.salaryStrategy),
        promotionPlan: JSON.stringify(payload.promotionPlan),
        marketInsights: JSON.stringify(payload.marketInsights),
        readinessScore: payload.readinessScore,
      },
    })

    try {
      await db.auditLog.create({
        data: {
          userId: user.id,
          action: 'intelligence.generate',
          entity: 'CareerPlan',
          entityId: plan.id,
          meta: JSON.stringify({ tokens, model, latencyMs }),
        },
      })
    } catch {}

    return NextResponse.json({
      plan: {
        id: plan.id,
        targetRole: plan.targetRole,
        readinessScore: plan.readinessScore,
        roadmap: payload.roadmap,
        salaryStrategy: payload.salaryStrategy,
        promotionPlan: payload.promotionPlan,
        marketInsights: payload.marketInsights,
        nextMoves: payload.nextMoves,
        createdAt: plan.createdAt,
        updatedAt: plan.updatedAt,
      },
      meta: { tokens, model, latencyMs },
    })
  } catch (e) {
    return err(e)
  }
}

function clampScore(n: unknown): number {
  const v = typeof n === 'number' ? n : Number(n)
  if (!Number.isFinite(v)) return 50
  return Math.max(0, Math.min(100, Math.round(v)))
}
