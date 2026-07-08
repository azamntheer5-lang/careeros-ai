/**
 * In-memory rate limiter.
 *
 * Limits requests per user per time window. Uses a Map of timestamps.
 * For multi-instance production: replace with Redis-backed limiter
 * (same interface: checkRateLimit(userId, limit, windowMs) → boolean).
 *
 * Usage in API routes:
 *   const { rateLimited, remaining } = checkRateLimit(user.id, 10, 60000) // 10 req/min
 *   if (rateLimited) return Response.json({ error: 'Rate limit exceeded' }, { status: 429 })
 */

type RateBucket = { count: number; resetAt: number }

const buckets = new Map<string, RateBucket>()

// Cleanup old buckets every 5 minutes to prevent memory leaks
const CLEANUP_INTERVAL = 5 * 60 * 1000
let lastCleanup = Date.now()

function cleanup() {
  const now = Date.now()
  if (now - lastCleanup < CLEANUP_INTERVAL) return
  lastCleanup = now
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt < now) buckets.delete(key)
  }
}

/**
 * Check if a user has exceeded their rate limit.
 * @param userId - The user identifier
 * @param limit - Max requests allowed in the window
 * @param windowMs - Time window in milliseconds
 * @returns { rateLimited: boolean, remaining: number, resetAt: number }
 */
export function checkRateLimit(
  userId: string,
  limit: number = 10,
  windowMs: number = 60000
): { rateLimited: boolean; remaining: number; resetAt: number } {
  cleanup()
  const key = `${userId}`
  const now = Date.now()
  const bucket = buckets.get(key)

  if (!bucket || bucket.resetAt < now) {
    // New window
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return { rateLimited: false, remaining: limit - 1, resetAt: now + windowMs }
  }

  bucket.count++
  if (bucket.count > limit) {
    return { rateLimited: true, remaining: 0, resetAt: bucket.resetAt }
  }

  return { rateLimited: false, remaining: limit - bucket.count, resetAt: bucket.resetAt }
}

/** Rate limit presets for different feature types. */
export const RATE_LIMITS = {
  // AI generation endpoints (expensive)
  ai_generate: { limit: 10, windowMs: 60000 },   // 10/min
  ai_analyze: { limit: 15, windowMs: 60000 },     // 15/min
  ai_chat: { limit: 30, windowMs: 60000 },        // 30/min
  // Voice endpoints (very expensive)
  tts: { limit: 5, windowMs: 60000 },             // 5/min
  asr: { limit: 5, windowMs: 60000 },             // 5/min
  // Standard API
  standard: { limit: 60, windowMs: 60000 },        // 60/min
} as const

/** Check rate limit and return a 429 Response if exceeded. Returns null if OK. */
export function rateLimitOr429(userId: string, preset: keyof typeof RATE_LIMITS = 'standard') {
  const config = RATE_LIMITS[preset]
  const { rateLimited, remaining, resetAt } = checkRateLimit(userId, config.limit, config.windowMs)
  if (rateLimited) {
    return new Response(JSON.stringify({ error: 'Rate limit exceeded', retryAfter: Math.ceil((resetAt - Date.now()) / 1000) }), {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'X-RateLimit-Limit': String(config.limit),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': String(resetAt),
        'Retry-After': String(Math.ceil((resetAt - Date.now()) / 1000)),
      },
    })
  }
  return null
}
