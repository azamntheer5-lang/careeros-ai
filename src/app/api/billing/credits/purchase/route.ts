import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, err } from '@/lib/server'
import { grantCredits } from '@/lib/credits'
import { CREDIT_PACKAGES } from '@/lib/billing'

/** POST to purchase a credit package (simulated Stripe payment). */
export async function POST(req: Request) {
  try {
    const user = await getCurrentUser()
    const { packageId } = await req.json()
    const pkg = CREDIT_PACKAGES.find((p) => p.id === packageId)
    if (!pkg) return NextResponse.json({ error: 'Invalid package' }, { status: 400 })

    const totalCredits = pkg.credits + pkg.bonus
    const newBalance = await grantCredits(user.id, totalCredits, 'purchase')

    // Generate invoice for credit purchase
    const sub = await db.subscription.findUnique({ where: { userId: user.id } })
    if (sub) {
      await db.invoice.create({
        data: {
          subscriptionId: sub.id,
          userId: user.id,
          amount: pkg.price,
          currency: 'USD',
          status: 'paid',
          description: `${pkg.label} credits`,
          stripeInvoiceId: `in_credits_${Date.now()}`,
          periodStart: new Date(),
          periodEnd: new Date(),
        },
      })
    }

    try { await db.auditLog.create({ data: { userId: user.id, action: `billing.credits.purchase.${packageId}`, entity: 'CreditTransaction' } }) } catch {}
    return NextResponse.json({ balance: newBalance, creditsAdded: totalCredits })
  } catch (e) { return err(e) }
}
