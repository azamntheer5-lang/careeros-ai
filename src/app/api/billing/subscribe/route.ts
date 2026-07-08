import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, err } from '@/lib/server'
import { getPlan, PlanId } from '@/lib/billing'

/** POST to subscribe to a plan (simulated Stripe checkout). Uses transaction for atomicity. */
export async function POST(req: Request) {
  try {
    const user = await getCurrentUser()
    const { plan, interval } = await req.json()
    const planDef = getPlan(plan)
    if (!planDef) return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })

    const price = interval === 'annual' ? planDef.priceAnnual : planDef.priceMonthly
    const now = new Date()
    const periodEnd = new Date(now)
    if (interval === 'annual') periodEnd.setFullYear(periodEnd.getFullYear() + 1)
    else periodEnd.setMonth(periodEnd.getMonth() + 1)

    // Atomic transaction: user update + subscription upsert + invoice creation
    const result = await db.$transaction(async (tx) => {
      // Update user plan + credits
      await tx.user.update({
        where: { id: user.id },
        data: { plan: plan as PlanId, credits: planDef.credits === -1 ? -1 : planDef.credits, trialEndsAt: null },
      })

      // Upsert subscription
      const sub = await tx.subscription.upsert({
        where: { userId: user.id },
        create: {
          userId: user.id,
          plan: plan as PlanId,
          status: 'active',
          interval: interval || 'monthly',
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          stripeCustomerId: `cus_demo_${user.id.slice(-8)}`,
          stripeSubId: `sub_demo_${Date.now()}`,
        },
        update: {
          plan: plan as PlanId,
          status: 'active',
          interval: interval || 'monthly',
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          cancelAtPeriodEnd: false,
        },
      })

      // Generate invoice (except for free)
      if (price > 0) {
        await tx.invoice.create({
          data: {
            subscriptionId: sub.id,
            userId: user.id,
            amount: price,
            currency: 'USD',
            status: 'paid',
            description: `${planDef.name} — ${interval === 'annual' ? 'Annual' : 'Monthly'} subscription`,
            stripeInvoiceId: `in_demo_${Date.now()}`,
            periodStart: now,
            periodEnd,
          },
        })
      }

      try { await tx.auditLog.create({ data: { userId: user.id, action: `billing.subscribe.${plan}`, entity: 'Subscription', entityId: sub.id } }) } catch {}

      return sub
    })

    return NextResponse.json({ subscription: result, plan: planDef })
  } catch (e) { return err(e) }
}
