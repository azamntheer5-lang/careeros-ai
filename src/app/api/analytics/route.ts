import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, err, parseJson } from '@/lib/server'

// ---------------------------------------------------------------------------
// Plan pricing (USD/month). Used to derive MRR and revenue estimates from the
// Subscription table; combines real subscription data with simulated numbers
// so the analytics dashboards are populated for the single-tenant demo.
// ---------------------------------------------------------------------------
const PLAN_PRICE: Record<string, number> = {
  free: 0,
  starter: 19,
  professional: 49,
  career_pro: 99,
  enterprise: 299,
}

const FEATURE_LABELS: Record<string, string> = {
  'resume-enhance': 'Resume AI',
  'ats-analyze': 'ATS',
  'cover-letter': 'Cover',
  interview: 'Interview',
  coach: 'Coach',
  skills: 'Skills',
  branding: 'Branding',
  portfolio: 'Portfolio',
}

const JOB_STATUS_LABELS: Record<string, string> = {
  wishlist: 'Wishlist',
  applied: 'Applied',
  interviewing: 'Interviewing',
  offer: 'Offer',
  rejected: 'Rejected',
  accepted: 'Accepted',
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function dayKey(d: Date): string {
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`
}

function monthKey(d: Date): string {
  return `${MONTH_NAMES[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`
}

/** Deterministic pseudo-random generator so the simulated platform numbers
 * are stable across requests within the same day (no jitter on reload). */
function seededRand(seed: number) {
  let s = seed % 2147483647
  if (s <= 0) s += 2147483646
  return () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
}

export async function GET() {
  try {
    const user = await getCurrentUser()

    // -------------------------------------------------------------------------
    // USER — career progress (current user only)
    // -------------------------------------------------------------------------
    const [resumes, jobs, interviews, achievements, creditTxns, skillProfiles] =
      await Promise.all([
        db.resume.findMany({
          where: { userId: user.id },
          orderBy: { createdAt: 'asc' },
          select: { id: true, atsScore: true, aiScore: true, createdAt: true, title: true },
        }),
        db.job.findMany({
          where: { userId: user.id },
          select: { id: true, status: true, createdAt: true },
        }),
        db.interview.findMany({
          where: { userId: user.id },
          select: { id: true, status: true, score: true, createdAt: true },
        }),
        db.achievement.findMany({
          where: { userId: user.id },
          orderBy: { unlockedAt: 'desc' },
          take: 50,
          select: {
            id: true,
            type: true,
            title: true,
            description: true,
            value: true,
            unlockedAt: true,
          },
        }),
        db.creditTransaction.findMany({
          where: { userId: user.id },
          orderBy: { createdAt: 'asc' },
          select: { id: true, amount: true, reason: true, feature: true, createdAt: true },
        }),
        db.skillProfile.findMany({
          where: { userId: user.id },
          orderBy: { createdAt: 'asc' },
          select: { id: true, skills: true, createdAt: true },
        }),
      ])

    // Resumes over time — running cumulative count by creation date
    const resumesOverTime: { date: string; count: number }[] = []
    {
      const byDay = new Map<string, number>()
      for (const r of resumes) {
        const k = dayKey(new Date(r.createdAt))
        byDay.set(k, (byDay.get(k) ?? 0) + 1)
      }
      const days = [...byDay.entries()].sort((a, b) => a[0].localeCompare(b[0]))
      let running = 0
      for (const [date, c] of days) {
        running += c
        resumesOverTime.push({ date, count: running })
      }
      if (resumesOverTime.length === 0 && resumes.length > 0) {
        resumesOverTime.push({ date: dayKey(new Date()), count: resumes.length })
      }
    }

    // ATS score trend — best-so-far ATS score across resumes by creation date
    const atsTrend: { date: string; score: number }[] = []
    {
      let best = 0
      for (const r of resumes) {
        if (r.atsScore != null && r.atsScore > best) best = r.atsScore
        atsTrend.push({ date: dayKey(new Date(r.createdAt)), score: r.atsScore ?? best })
      }
      if (atsTrend.length === 0) {
        atsTrend.push({ date: dayKey(new Date()), score: 0 })
      }
    }

    // Applications by status
    const statusMap = new Map<string, number>()
    for (const j of jobs) {
      statusMap.set(j.status, (statusMap.get(j.status) ?? 0) + 1)
    }
    const applicationsByStatus = [...statusMap.entries()].map(([status, count]) => ({
      status: JOB_STATUS_LABELS[status] ?? status,
      count,
    }))

    // Skill growth — cumulative distinct skills captured over time
    const skillGrowth: { date: string; count: number }[] = []
    {
      const seen = new Set<string>()
      for (const sp of skillProfiles) {
        const skills = parseJson<string[]>(sp.skills) ?? []
        for (const s of skills) seen.add(s.trim().toLowerCase())
        skillGrowth.push({
          date: dayKey(new Date(sp.createdAt)),
          count: seen.size,
        })
      }
      if (skillGrowth.length === 0) {
        skillGrowth.push({ date: dayKey(new Date()), count: 0 })
      }
    }

    // Credit usage by feature (negative amount = usage)
    const creditUsageMap = new Map<string, number>()
    for (const tx of creditTxns) {
      if (tx.amount >= 0) continue
      const key = tx.feature || 'other'
      creditUsageMap.set(key, (creditUsageMap.get(key) ?? 0) + Math.abs(tx.amount))
    }
    const creditUsageByFeature = [...creditUsageMap.entries()]
      .map(([feature, amount]) => ({
        feature: FEATURE_LABELS[feature] ?? feature,
        amount,
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 8)

    const scoredResumes = resumes.filter((r) => r.atsScore != null)
    const avgAts = scoredResumes.length
      ? Math.round(scoredResumes.reduce((a, b) => a + (b.atsScore ?? 0), 0) / scoredResumes.length)
      : 0
    const interviewsCompleted = interviews.filter((i) => i.status === 'completed').length

    const userSection = {
      kpis: {
        resumes: resumes.length,
        avgAts,
        interviews: interviewsCompleted,
        applications: jobs.length,
        achievements: achievements.length,
      },
      resumesOverTime,
      atsTrend,
      applicationsByStatus,
      skillGrowth,
      achievements: achievements.map((a) => ({
        id: a.id,
        type: a.type,
        title: a.title,
        description: a.description,
        value: a.value,
        unlockedAt: a.unlockedAt,
      })),
      creditUsageByFeature,
    }

    // -------------------------------------------------------------------------
    // BUSINESS — revenue + retention (real + simulated platform numbers)
    // -------------------------------------------------------------------------
    const [invoices, subscriptions] = await Promise.all([
      db.invoice.findMany({
        where: { status: 'paid' },
        select: { amount: true, currency: true, createdAt: true, periodStart: true },
      }),
      db.subscription.findMany({
        select: {
          id: true,
          plan: true,
          status: true,
          interval: true,
          startedAt: true,
        },
      }),
    ])

    const totalRevenueCents = invoices.reduce((a, b) => a + b.amount, 0)
    const totalRevenue = totalRevenueCents / 100

    // Real MRR from active subs
    const activeSubs = subscriptions.filter(
      (s) => s.status === 'active' || s.status === 'trialing'
    )
    const realMrr = activeSubs.reduce((a, b) => {
      const price = PLAN_PRICE[b.plan] ?? 0
      const annualFactor = b.interval === 'annual' ? price / 12 : price
      return a + annualFactor
    }, 0)

    // Plan distribution (real)
    const planMap = new Map<string, number>()
    for (const s of subscriptions) {
      planMap.set(s.plan, (planMap.get(s.plan) ?? 0) + 1)
    }
    const planDistribution = [...planMap.entries()].map(([plan, count]) => ({
      plan: plan === 'career_pro'
        ? 'Career Pro'
        : plan.charAt(0).toUpperCase() + plan.slice(1),
      count,
    }))

    // Simulated platform-wide numbers — deterministic daily seed so reloads are stable
    const today = new Date()
    const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate()
    const rand = seededRand(seed)

    const SIM_BASE_USERS = 1280 + Math.floor(rand() * 120) // ~1.3-1.4k subs
    const SIM_MONTHLY_GROWTH = 0.08 + rand() * 0.04 // 8-12% MoM
    const SIM_CHURN = 0.035 + rand() * 0.02 // 3.5-5.5% monthly churn
    const SIM_ARPU = 41.2 + rand() * 6 // ~$41-47 ARPU

    // 6-month growth trend: revenue + MRR + users, with the latest month overlaid
    // from real invoices so the chart anchors to truth.
    const revenueTrend: { month: string; revenue: number; mrr: number; users: number }[] = []
    const realThisMonthRevenue = invoices
      .filter((inv) => {
        const d = new Date(inv.periodStart ?? inv.createdAt)
        return d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear()
      })
      .reduce((a, b) => a + b.amount / 100, 0)

    let users = SIM_BASE_USERS
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1)
      const mrr = users * SIM_ARPU
      const revenue =
        i === 0 ? realThisMonthRevenue + mrr * 0.92 : mrr * (0.92 + rand() * 0.06)
      revenueTrend.push({
        month: monthKey(d),
        revenue: Math.round(revenue),
        mrr: Math.round(mrr),
        users,
      })
      users = Math.round(users * (1 + SIM_MONTHLY_GROWTH - SIM_CHURN))
    }

    const simulatedMrr = revenueTrend[revenueTrend.length - 1]?.mrr ?? realMrr
    const mrr = Math.max(realMrr, simulatedMrr)
    const activeSubsTotal = Math.max(activeSubs.length, SIM_BASE_USERS)
    const avgRevenuePerUser = activeSubsTotal ? mrr / activeSubsTotal : 0
    const ltv = SIM_CHURN > 0 ? SIM_ARPU / SIM_CHURN : 0

    const growthFunnel = [
      { stage: 'Visitors', value: SIM_BASE_USERS * 14 },
      { stage: 'Signups', value: Math.round(SIM_BASE_USERS * 4.2) },
      { stage: 'Activated', value: Math.round(SIM_BASE_USERS * 2.6) },
      { stage: 'Paid', value: SIM_BASE_USERS },
      { stage: 'Retained', value: Math.round(SIM_BASE_USERS * (1 - SIM_CHURN)) },
    ]

    const businessSection = {
      kpis: {
        totalRevenue: Math.round(
          totalRevenue +
            (revenueTrend.reduce((a, b) => a + b.revenue, 0) - realThisMonthRevenue)
        ),
        mrr: Math.round(mrr),
        activeSubs: activeSubsTotal,
        avgRevenuePerUser: Number(avgRevenuePerUser.toFixed(2)),
      },
      revenueTrend,
      planDistribution:
        planDistribution.length > 0
          ? planDistribution
          : [
              { plan: 'Free', count: Math.round(SIM_BASE_USERS * 0.62) },
              { plan: 'Starter', count: Math.round(SIM_BASE_USERS * 0.18) },
              { plan: 'Professional', count: Math.round(SIM_BASE_USERS * 0.12) },
              { plan: 'Career Pro', count: Math.round(SIM_BASE_USERS * 0.06) },
              { plan: 'Enterprise', count: Math.round(SIM_BASE_USERS * 0.02) },
            ],
      growthFunnel,
      simulated: {
        churnRate: Number((SIM_CHURN * 100).toFixed(1)),
        growthRate: Number((SIM_MONTHLY_GROWTH * 100).toFixed(1)),
        ltv: Math.round(ltv),
        arpu: Number(SIM_ARPU.toFixed(2)),
      },
    }

    // -------------------------------------------------------------------------
    // AI — model performance (current user's usage rows)
    // -------------------------------------------------------------------------
    const aiUsages = await db.aiUsage.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        feature: true,
        model: true,
        tokens: true,
        cost: true,
        latencyMs: true,
        success: true,
        createdAt: true,
      },
      take: 2000,
    })

    const totalCalls = aiUsages.length
    const successCount = aiUsages.filter((u) => u.success).length
    const successRate = totalCalls ? (successCount / totalCalls) * 100 : 0
    const latencies = aiUsages.map((u) => u.latencyMs).filter((l): l is number => l != null)
    const avgLatency = latencies.length
      ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
      : 0
    const totalCost = aiUsages.reduce((a, b) => a + b.cost, 0)

    // Calls by model tier
    const modelMap = new Map<string, number>()
    for (const u of aiUsages) {
      const m = u.model || 'balanced'
      modelMap.set(m, (modelMap.get(m) ?? 0) + 1)
    }
    const callsByModel = [...modelMap.entries()].map(([model, calls]) => ({ model, calls }))

    // Latency by feature (avg)
    const latencyByFeatureMap = new Map<string, { sum: number; n: number }>()
    for (const u of aiUsages) {
      if (u.latencyMs == null) continue
      const cur = latencyByFeatureMap.get(u.feature) ?? { sum: 0, n: 0 }
      cur.sum += u.latencyMs
      cur.n += 1
      latencyByFeatureMap.set(u.feature, cur)
    }
    const latencyByFeature = [...latencyByFeatureMap.entries()]
      .map(([feature, v]) => ({
        feature: FEATURE_LABELS[feature] ?? feature,
        latency: v.n ? Math.round(v.sum / v.n) : 0,
      }))
      .sort((a, b) => b.latency - a.latency)

    // Cost by feature
    const costByFeatureMap = new Map<string, number>()
    for (const u of aiUsages) {
      costByFeatureMap.set(u.feature, (costByFeatureMap.get(u.feature) ?? 0) + u.cost)
    }
    const costByFeature = [...costByFeatureMap.entries()]
      .map(([feature, cost]) => ({
        feature: FEATURE_LABELS[feature] ?? feature,
        cost: Number(cost.toFixed(4)),
      }))
      .sort((a, b) => b.cost - a.cost)
      .slice(0, 8)

    // Tokens over last 14 days
    const tokensOverTime: { date: string; tokens: number }[] = []
    {
      const now = new Date()
      for (let i = 13; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i)
        const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i + 1)
        const sum = aiUsages
          .filter((u) => {
            const t = new Date(u.createdAt)
            return t >= d && t < next
          })
          .reduce((a, b) => a + b.tokens, 0)
        tokensOverTime.push({ date: dayKey(d), tokens: sum })
      }
    }

    // Top 5 features by call count
    const topFeaturesMap = new Map<string, { calls: number; tokens: number; cost: number }>()
    for (const u of aiUsages) {
      const cur = topFeaturesMap.get(u.feature) ?? { calls: 0, tokens: 0, cost: 0 }
      cur.calls += 1
      cur.tokens += u.tokens
      cur.cost += u.cost
      topFeaturesMap.set(u.feature, cur)
    }
    const topFeatures = [...topFeaturesMap.entries()]
      .map(([feature, v]) => ({
        feature: FEATURE_LABELS[feature] ?? feature,
        calls: v.calls,
        tokens: v.tokens,
        cost: Number(v.cost.toFixed(4)),
      }))
      .sort((a, b) => b.calls - a.calls)
      .slice(0, 5)

    const aiSection = {
      kpis: {
        totalCalls,
        avgLatency,
        successRate: Number(successRate.toFixed(1)),
        totalCost: Number(totalCost.toFixed(4)),
      },
      callsByModel,
      latencyByFeature,
      costByFeature,
      tokensOverTime,
      topFeatures,
    }

    return NextResponse.json({ user: userSection, business: businessSection, ai: aiSection })
  } catch (e) {
    return err(e)
  }
}
