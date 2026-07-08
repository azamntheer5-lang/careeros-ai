import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { run } from '@/lib/ai'
import { getCurrentUser, err, parseJson } from '@/lib/server'
import { rateLimitOr429 } from '@/lib/rate-limit'

// ---------------------------------------------------------------------------
// Types — mirror the prompt contract for both LinkedIn + Brand Identity.
// ---------------------------------------------------------------------------
type ContentIdea = { topic: string; angle: string }
type NetworkingTarget = { type: string; who: string; why: string }

type LinkedInPayload = {
  score: number
  headlineScore: number
  aboutScore: number
  headline: string
  about: string
  strengths: string[]
  weaknesses: string[]
  contentIdeas: ContentIdea[]
  keywordGaps: string[]
}

type IdentityPayload = {
  score: number
  narrativeScore: number
  presenceScore: number
  differentiationScore: number
  analysis: string
  suggestions: string[]
  networkingTargets: NetworkingTarget[]
}

type ProfileData = {
  headline?: string
  about?: string
  targetRole?: string
  experience?: string
  name?: string
  industry?: string
  seniority?: string
  brandStatement?: string
  strengths?: string[]
  values?: string[]
  linkedinUrl?: string
  githubUrl?: string
  portfolioUrl?: string
  [k: string]: unknown
}

// ---------------------------------------------------------------------------
// GET — list the user's branding analyses, newest first.
// ---------------------------------------------------------------------------
export async function GET() {
  try {
    const user = await getCurrentUser()
    const limited = rateLimitOr429(user.id, 'ai_generate')
    if (limited) return limited
    const rows = await db.brandingAnalysis.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
    const analyses = rows.map((r) => ({
      id: r.id,
      type: r.type,
      headline: r.headline,
      about: r.about,
      score: r.score,
      data:
        r.type === 'linkedin'
          ? parseJson<LinkedInPayload>(r.data)
          : parseJson<IdentityPayload>(r.data),
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }))
    return NextResponse.json({ analyses })
  } catch (e) {
    return err(e)
  }
}

// ---------------------------------------------------------------------------
// POST — run AI analysis (linkedin | identity) + persist + audit log.
// ---------------------------------------------------------------------------
export async function POST(req: Request) {
  try {
    const user = await getCurrentUser()
    const body = await req.json().catch(() => ({}))
    const type: string = body?.type === 'identity' ? 'identity' : 'linkedin'
    const profileData: ProfileData = (body?.profileData && typeof body.profileData === 'object')
      ? body.profileData
      : {}

    if (type === 'linkedin') {
      const promptText =
        'Analyze this LinkedIn profile data and generate optimized alternatives. ' +
        'Current headline: ' + (profileData.headline || '') + '. ' +
        'Current about: ' + (profileData.about || '') + '. ' +
        'Target role: ' + (profileData.targetRole || '') + '. ' +
        'Experience: ' + (profileData.experience || '') + '. ' +
        'Return JSON: { "score": number 0-100, "headlineScore": number, "aboutScore": number, ' +
        '"headline": string (optimized), "about": string (optimized), "strengths": string[], ' +
        '"weaknesses": string[], "contentIdeas": [{ "topic": string, "angle": string }], ' +
        '"keywordGaps": string[] }'

      const { data, tokens, model, latencyMs } = await run<LinkedInPayload>(
        'linkedin_optimize',
        user.id,
        user.name || '',
        [{ role: 'user', content: promptText }],
        { json: true }
      )

      const payload: LinkedInPayload = {
        score: clampScore(data?.score),
        headlineScore: clampScore(data?.headlineScore),
        aboutScore: clampScore(data?.aboutScore),
        headline: String(data?.headline ?? ''),
        about: String(data?.about ?? ''),
        strengths: Array.isArray(data?.strengths) ? data.strengths.map(String) : [],
        weaknesses: Array.isArray(data?.weaknesses) ? data.weaknesses.map(String) : [],
        contentIdeas: Array.isArray(data?.contentIdeas)
          ? data.contentIdeas.map((c) => ({
              topic: String(c?.topic ?? ''),
              angle: String(c?.angle ?? ''),
            }))
          : [],
        keywordGaps: Array.isArray(data?.keywordGaps) ? data.keywordGaps.map(String) : [],
      }

      const row = await db.brandingAnalysis.create({
        data: {
          userId: user.id,
          type: 'linkedin',
          headline: payload.headline,
          about: payload.about,
          score: payload.score,
          data: JSON.stringify(payload),
        },
      })

      try {
        await db.auditLog.create({
          data: {
            userId: user.id,
            action: 'branding.linkedin',
            entity: 'BrandingAnalysis',
            entityId: row.id,
            meta: JSON.stringify({ tokens, model, latencyMs }),
          },
        })
      } catch {}

      return NextResponse.json({
        analysis: {
          id: row.id,
          type: row.type,
          headline: row.headline,
          about: row.about,
          score: row.score,
          data: payload,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
        },
        meta: { tokens, model, latencyMs },
      })
    }

    // --- identity ---
    const promptText =
      'Assess this professional brand identity. Profile: ' +
      JSON.stringify(profileData) +
      '. Return JSON: { "score": number 0-100, "narrativeScore": number, "presenceScore": number, ' +
      '"differentiationScore": number, "analysis": string, "suggestions": string[], ' +
      '"networkingTargets": [{ "type": string, "who": string, "why": string }] }'

    const { data, tokens, model, latencyMs } = await run<IdentityPayload>(
      'brand_identity',
      user.id,
      user.name || '',
      [{ role: 'user', content: promptText }],
      { json: true }
    )

    const payload: IdentityPayload = {
      score: clampScore(data?.score),
      narrativeScore: clampScore(data?.narrativeScore),
      presenceScore: clampScore(data?.presenceScore),
      differentiationScore: clampScore(data?.differentiationScore),
      analysis: String(data?.analysis ?? ''),
      suggestions: Array.isArray(data?.suggestions) ? data.suggestions.map(String) : [],
      networkingTargets: Array.isArray(data?.networkingTargets)
        ? data.networkingTargets.map((n) => ({
            type: String(n?.type ?? ''),
            who: String(n?.who ?? ''),
            why: String(n?.why ?? ''),
          }))
        : [],
    }

    const row = await db.brandingAnalysis.create({
      data: {
        userId: user.id,
        type: 'identity',
        score: payload.score,
        data: JSON.stringify(payload),
      },
    })

    try {
      await db.auditLog.create({
        data: {
          userId: user.id,
          action: 'branding.identity',
          entity: 'BrandingAnalysis',
          entityId: row.id,
          meta: JSON.stringify({ tokens, model, latencyMs }),
        },
      })
    } catch {}

    return NextResponse.json({
      analysis: {
        id: row.id,
        type: row.type,
        headline: row.headline,
        about: row.about,
        score: row.score,
        data: payload,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      },
      meta: { tokens, model, latencyMs },
    })
  } catch (e) {
    return err(e)
  }
}

// ---------------------------------------------------------------------------
function clampScore(n: unknown): number {
  const v = typeof n === 'number' ? n : Number(n)
  if (!Number.isFinite(v)) return 50
  return Math.max(0, Math.min(100, Math.round(v)))
}
