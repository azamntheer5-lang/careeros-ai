import { db } from '@/lib/db'
import { CREDIT_COSTS } from '@/lib/billing'

/**
 * AI Credit Ledger — deducts credits for AI usage and records transactions.
 * Returns false if the user has insufficient credits (caller should handle).
 */
export async function spendCredits(userId: string, feature: string, amount?: number): Promise<{ ok: boolean; balance: number; cost: number }> {
  const cost = amount ?? CREDIT_COSTS[feature] ?? 1
  const user = await db.user.findUnique({ where: { id: userId }, select: { credits: true, plan: true } })
  if (!user) return { ok: false, balance: 0, cost }

  // Enterprise + Career Pro have effectively unlimited (credits = -1)
  const isUnlimited = user.plan === 'enterprise' || (user.credits < 0)
  if (isUnlimited) return { ok: true, balance: -1, cost: 0 }

  if (user.credits < cost) {
    return { ok: false, balance: user.credits, cost }
  }

  const newBalance = user.credits - cost
  await db.user.update({ where: { id: userId }, data: { credits: newBalance } })
  await db.creditTransaction.create({
    data: {
      userId,
      amount: -cost,
      reason: 'usage',
      feature,
      balance: newBalance,
    },
  })
  return { ok: true, balance: newBalance, cost }
}

/** Grant credits (purchase, bonus, admin grant). */
export async function grantCredits(userId: string, amount: number, reason: string): Promise<number> {
  const user = await db.user.findUnique({ where: { id: userId }, select: { credits: true } })
  if (!user) return 0
  const newBalance = (user.credits < 0 ? 0 : user.credits) + amount
  await db.user.update({ where: { id: userId }, data: { credits: newBalance } })
  await db.creditTransaction.create({
    data: { userId, amount, reason, balance: newBalance },
  })
  return newBalance
}

/** Get the user's credit balance + recent transactions. */
export async function getCreditStatus(userId: string) {
  const user = await db.user.findUnique({ where: { id: userId }, select: { credits: true, plan: true } })
  if (!user) return { balance: 0, transactions: [], isUnlimited: false }
  const transactions = await db.creditTransaction.findMany({
    where: { userId }, orderBy: { createdAt: 'desc' }, take: 20,
  })
  return {
    balance: user.credits,
    isUnlimited: user.plan === 'enterprise' || user.credits < 0,
    transactions,
  }
}
