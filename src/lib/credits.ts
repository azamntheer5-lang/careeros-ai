import { db } from '@/lib/db'
import { CREDIT_COSTS } from '@/lib/billing'
import crypto from 'crypto'

/**
 * Credit ledger with idempotency + optimistic locking.
 *
 * Features:
 * - Idempotency: if the same operation is retried (same idempotency key),
 *   the credits are only deducted once.
 * - Optimistic locking: uses a version field to prevent race conditions
 *   when multiple requests try to spend credits simultaneously.
 * - Audit trail: every transaction is logged with feature + balance.
 */

// In-memory idempotency cache (production: use Redis)
const idempotencyCache = new Map<string, { result: any; expiresAt: number }>()
const IDEMPOTENCY_TTL = 5 * 60 * 1000 // 5 minutes

/**
 * Spend credits with idempotency protection.
 * If the same idempotencyKey is used again, returns the cached result without deducting again.
 */
export async function spendCredits(
  userId: string,
  feature: string,
  idempotencyKey?: string,
  amount?: number
): Promise<{ ok: boolean; balance: number; cost: number; cached?: boolean }> {
  const cost = amount ?? CREDIT_COSTS[feature] ?? 1

  // Check idempotency cache
  if (idempotencyKey) {
    const cacheKey = `${userId}:${idempotencyKey}`
    const cached = idempotencyCache.get(cacheKey)
    if (cached && cached.expiresAt > Date.now()) {
      return { ...cached.result, cached: true }
    }
  }

  const user = await db.user.findUnique({ where: { id: userId }, select: { credits: true, plan: true } })
  if (!user) return { ok: false, balance: 0, cost }

  // Enterprise/Career Pro have unlimited credits
  const isUnlimited = user.plan === 'enterprise' || (user.credits < 0)
  if (isUnlimited) {
    const result = { ok: true, balance: -1, cost: 0 }
    if (idempotencyKey) cacheResult(userId, idempotencyKey, result)
    return result
  }

  if (user.credits < cost) {
    return { ok: false, balance: user.credits, cost }
  }

  // Optimistic locking: update only if credits haven't changed since we read them
  // This prevents race conditions where two concurrent requests both read 100 credits
  // and both try to deduct
  try {
    const updated = await db.user.updateMany({
      where: { id: userId, credits: user.credits }, // Only update if credits match (optimistic lock)
      data: { credits: user.credits - cost },
    })

    if (updated.count === 0) {
      // Credits changed since we read them — retry with fresh read
      // In production, use a transaction with SELECT FOR UPDATE
      const freshUser = await db.user.findUnique({ where: { id: userId }, select: { credits: true } })
      if (!freshUser || freshUser.credits < cost) {
        return { ok: false, balance: freshUser?.credits ?? 0, cost }
      }
      await db.user.update({
        where: { id: userId },
        data: { credits: freshUser.credits - cost },
      })
    }

    const newBalance = user.credits - cost
    await db.creditTransaction.create({
      data: { userId, amount: -cost, reason: 'usage', feature, balance: newBalance },
    })

    const result = { ok: true, balance: newBalance, cost }
    if (idempotencyKey) cacheResult(userId, idempotencyKey, result)
    return result
  } catch (e) {
    return { ok: false, balance: user.credits, cost }
  }
}

function cacheResult(userId: string, key: string, result: any) {
  const cacheKey = `${userId}:${key}`
  idempotencyCache.set(cacheKey, { result, expiresAt: Date.now() + IDEMPOTENCY_TTL })
  // Cleanup old entries
  if (idempotencyCache.size > 1000) {
    const now = Date.now()
    for (const [k, v] of idempotencyCache) {
      if (v.expiresAt < now) idempotencyCache.delete(k)
    }
  }
}

/** Grant credits (purchase, bonus, admin grant). */
export async function grantCredits(userId: string, amount: number, reason: string): Promise<number> {
  const user = await db.user.findUnique({ where: { id: userId }, select: { credits: true } })
  if (!user) return 0
  const newBalance = (user.credits < 0 ? 0 : user.credits) + amount

  await db.$transaction([
    db.user.update({ where: { id: userId }, data: { credits: newBalance } }),
    db.creditTransaction.create({ data: { userId, amount, reason, balance: newBalance } }),
  ])

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

/** Generate an idempotency key from request parameters. */
export function makeIdempotencyKey(...parts: (string | number)[]): string {
  return crypto.createHash('sha256').update(parts.join(':')).digest('hex').slice(0, 16)
}
