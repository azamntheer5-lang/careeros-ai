import { db } from '@/lib/db'

/**
 * Get the current authenticated user.
 *
 * AUTHENTICATION FLOW:
 * 1. Reads the `careeros_session` HTTP-only cookie.
 * 2. Verifies the HMAC signature on the session token.
 * 3. Looks up the user by the session token hash stored in the DB.
 * 4. Checks session expiry (7 days).
 * 5. Returns the user.
 *
 * DEVELOPMENT FALLBACK:
 * In development (NODE_ENV !== 'production'), if no session exists, returns
 * the first user so the app is usable without login.
 *
 * PRODUCTION:
 * If no valid session exists, throws a 401 Response (caught by err() handler).
 * This ensures unauthenticated requests never reach business logic.
 *
 * @returns The authenticated user (never null — throws 401 if unauthenticated in prod)
 */
export async function getCurrentUser() {
  // Try real session auth first
  try {
    const { getCurrentUser: getAuthedUser } = await import('@/lib/auth')
    const authedUser = await getAuthedUser()
    if (authedUser) return authedUser
  } catch {}

  // Demo fallback: ONLY in development
  if (process.env.NODE_ENV !== 'production') {
    let user = await db.user.findFirst({ orderBy: { createdAt: 'asc' } })
    if (!user) {
      user = await db.user.create({
        data: { email: 'founder@careeros.ai', name: 'Alex Rivera', plan: 'premium' },
      })
    }
    return user
  }

  // PRODUCTION: no session = 401 Unauthorized
  throw new Response(JSON.stringify({ error: 'Unauthorized' }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' },
  })
}

export function parseJson<T = unknown>(text: string | null | undefined): T {
  if (!text) return [] as unknown as T
  try {
    return JSON.parse(text) as T
  } catch {
    return [] as unknown as T
  }
}

export function err(e: unknown) {
  // Handle Response throws (from requireUser/requireOwnership in auth.ts)
  if (e instanceof Response) return e
  return Response.json({ error: (e as Error).message }, { status: 500 })
}

/** Validate and clip a string input to prevent AI cost abuse. */
export function clipInput(text: string | undefined | null, maxLen: number = 5000): string {
  if (!text || typeof text !== 'string') return ''
  return text.slice(0, maxLen)
}

/** Validate that a required string field is present and non-empty. */
export function requireField(value: any, name: string): string {
  if (!value || typeof value !== 'string' || !value.trim()) {
    throw new Error(`${name} is required`)
  }
  return value
}
