import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { run, getZai } from '@/lib/ai'
import { getCurrentUser, err, parseJson } from '@/lib/server'
import { rateLimitOr429 } from '@/lib/rate-limit'

type SearchHit = {
  title: string
  url: string
  snippet: string
  host: string
}

type SalaryInsights = {
  entry: string
  mid: string
  senior: string
  trend: 'rising' | 'stable' | 'falling'
  growth: string
}

type SkillDemand = { skill: string; demand: 'very high' | 'high' | 'medium' | 'low'; trend: string }

type Prediction = { topic: string; prediction: string; timeframe: string }

type TopCompany = { name: string; hiring: boolean; note: string }

type MarketInsightData = {
  salaryInsights: SalaryInsights
  skillDemand: SkillDemand[]
  industryTrends: string[]
  predictions: Prediction[]
  topCompanies: TopCompany[]
  marketOutlook: string
  recommendation: string
}

/** GET — list the current user's saved job-market insights (most recent first). */
export async function GET() {
  try {
    const user = await getCurrentUser()
    const limited = rateLimitOr429(user.id, 'ai_analyze')
    if (limited) return limited
    const rows = await db.jobMarketInsight.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 30,
    })
    const insights = rows.map((r) => ({
      id: r.id,
      query: r.query,
      data: parseJson<MarketInsightData>(r.data),
      createdAt: r.createdAt,
    }))
    return NextResponse.json({ insights })
  } catch (e) {
    return err(e)
  }
}

/** POST — generate fresh market intelligence for { role, location }. */
export async function POST(req: Request) {
  try {
    const user = await getCurrentUser()
    const { role, location } = await req.json()
    if (!role?.trim()) {
      return NextResponse.json({ error: 'Role is required' }, { status: 400 })
    }
    const loc = (location || '').trim()
    const where = loc || 'global'

    // 1) Three web searches to gather fresh market signals.
    const queries = [
      `${role} ${where} salary trends 2024 2025 demand`,
      `${role} skills in demand`,
      `${role} job market outlook`,
    ]

    const searchResults: SearchHit[] = []
    try {
      const zai = await getZai()
      await Promise.all(
        queries.map(async (q) => {
          try {
            const hits: any[] = await zai.functions.invoke('web_search', { query: q, num: 8 })
            for (const h of hits || []) {
              searchResults.push({
                title: String(h.name || h.title || '').slice(0, 200),
                url: String(h.url || h.link || ''),
                snippet: String(h.snippet || h.description || '').slice(0, 500),
                host: String(h.host_name || h.host || ''),
              })
            }
          } catch {}
        })
      )
    } catch {}

    // Deduplicate by URL (preserve order), cap at ~18 results.
    const seen = new Set<string>()
    const deduped = searchResults.filter((r) => {
      if (!r.url || seen.has(r.url)) return false
      seen.add(r.url)
      return true
    }).slice(0, 18)

    const snippets = deduped.length
      ? deduped.map((r, i) => `(${i + 1}) ${r.title}\n${r.snippet}`).join('\n\n')
      : 'No live web results available — rely on your training knowledge.'

    // 2) Synthesize with the job_market prompt.
    const userMsg = `Role: ${role}, Location: ${where}

Web research:
${snippets}

Return JSON: {
  "salaryInsights": { "entry": string, "mid": string, "senior": string, "trend": "rising"|"stable"|"falling", "growth": string },
  "skillDemand": [{ "skill": string, "demand": "very high"|"high"|"medium"|"low", "trend": string }],
  "industryTrends": string[],
  "predictions": [{ "topic": string, "prediction": string, "timeframe": string }],
  "topCompanies": [{ "name": string, "hiring": boolean, "note": string }],
  "marketOutlook": string,
  "recommendation": string
}`

    const { data } = await run<MarketInsightData>(
      'job_market',
      user.id,
      user.name || 'Candidate',
      [{ role: 'user', content: userMsg }],
      { json: true }
    )

    // 3) Persist the insight for this user.
    const query = `${role} · ${where}`
    const row = await db.jobMarketInsight.create({
      data: {
        userId: user.id,
        query,
        data: JSON.stringify(data),
      },
    })

    return NextResponse.json({
      insight: {
        id: row.id,
        query: row.query,
        data,
        createdAt: row.createdAt,
      },
      searchResults: deduped,
    })
  } catch (e) {
    return err(e)
  }
}
