import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, err } from '@/lib/server'

// Plan catalog: limits + pricing. `calls: null` = unlimited.
export const PLAN_LIMITS: Record<
  string,
  { calls: number | null; price: number; priceLabel: string; label: string }
> = {
  free: { calls: 50, price: 0, priceLabel: '$0', label: 'Free' },
  pro: { calls: 500, price: 29, priceLabel: '$29', label: 'Pro' },
  premium: { calls: 2000, price: 79, priceLabel: '$79', label: 'Premium' },
  enterprise: { calls: null, price: 0, priceLabel: 'Custom', label: 'Enterprise' },
}

/** Current billing cycle window (month-to-date). */
function cycleRange() {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  return { start, end }
}

export async function GET() {
  try {
    const user = await getCurrentUser()
    const { start, end } = cycleRange()

    const usages = await db.aiUsage.findMany({
      where: { userId: user.id, createdAt: { gte: start, lt: end } },
      select: { feature: true, tokens: true, cost: true, createdAt: true },
    })

    const calls = usages.length
    const tokens = usages.reduce((a, b) => a + b.tokens, 0)
    const cost = usages.reduce((a, b) => a + b.cost, 0)

    const byFeatureMap = usages.reduce<
      Record<string, { calls: number; tokens: number; cost: number }>
    >((acc, u) => {
      acc[u.feature] = acc[u.feature] || { calls: 0, tokens: 0, cost: 0 }
      acc[u.feature].calls++
      acc[u.feature].tokens += u.tokens
      acc[u.feature].cost += u.cost
      return acc
    }, {})

    const byFeature = Object.entries(byFeatureMap).map(([k, v]) => ({
      feature: k,
      calls: v.calls,
      tokens: v.tokens,
      cost: Number(v.cost.toFixed(6)),
    }))

    const plan = user.plan || 'free'
    const limits = PLAN_LIMITS[plan] ?? PLAN_LIMITS.free

    // Simulated invoices — last 6 months based on plan price
    const now = new Date()
    const invoices = Array.from({ length: 6 }).map((_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const month = String(d.getMonth() + 1).padStart(2, '0')
      return {
        id: `INV-${d.getFullYear()}${month}-${plan.slice(0, 3).toUpperCase()}`,
        date: d.toISOString(),
        amount: limits.price,
        plan,
        status: 'Paid',
      }
    })

    return NextResponse.json({
      plan,
      limits,
      usage: {
        calls,
        tokens,
        cost: Number(cost.toFixed(6)),
        byFeature,
      },
      cycleStart: start.toISOString(),
      cycleEnd: end.toISOString(),
      invoices,
      plans: Object.entries(PLAN_LIMITS).map(([key, v]) => ({ key, ...v })),
    })
  } catch (e) {
    return err(e)
  }
}

export async function PUT(req: Request) {
  try {
    const user = await getCurrentUser()
    const body = await req.json()
    const plan = String(body.plan || '').toLowerCase()
    if (!PLAN_LIMITS[plan]) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
    }
    const previous = user.plan
    await db.user.update({ where: { id: user.id }, data: { plan } })
    try {
      await db.auditLog.create({
        data: {
          userId: user.id,
          action: 'plan.change',
          entity: 'User',
          entityId: user.id,
          meta: JSON.stringify({ from: previous, to: plan }),
        },
      })
    } catch {}
    return NextResponse.json({ plan, limits: PLAN_LIMITS[plan] })
  } catch (e) {
    return err(e)
  }
}
