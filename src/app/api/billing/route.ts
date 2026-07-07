import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, err } from '@/lib/server'
import { PLANS, getPlan, PlanId } from '@/lib/billing'

/** GET current subscription + plan details + all available plans. */
export async function GET() {
  try {
    const user = await getCurrentUser()
    let sub = await db.subscription.findUnique({ where: { userId: user.id }, include: { invoices: { orderBy: { createdAt: 'desc' }, take: 12 } } })
    if (!sub) {
      sub = await db.subscription.create({ data: { userId: user.id, plan: user.plan as PlanId, status: 'active' } })
    }
    return NextResponse.json({
      subscription: sub,
      currentPlan: getPlan(sub.plan),
      plans: PLANS,
      userPlan: user.plan,
      credits: user.credits,
    })
  } catch (e) { return err(e) }
}
