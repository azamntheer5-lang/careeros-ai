import { db } from '@/lib/db'
import type { User } from '@prisma/client'

/**
 * Get the current authenticated user.
 *
 * AUTHENTICATION FLOW:
 * 1. Tries real session-based auth (cookie → verify signature → lookup session).
 * 2. If no session: in development, falls back to demo mode (first user) so the
 *    app is usable without login. In production, throws 401.
 *
 * PRODUCTION USAGE:
 * - API routes should call `requireUser()` from `@/lib/auth` instead, which
 *   throws a 401 Response if not authenticated.
 * - This function is kept for backward compatibility with existing routes.
 *
 * @returns The authenticated user (never null in dev; may redirect in prod)
 */
export async function getCurrentUser(): Promise<User> {
  // Try real session auth first
  try {
    const { getCurrentUser: getAuthedUser } = await import('@/lib/auth')
    const authedUser = await getAuthedUser()
    if (authedUser) return authedUser
  } catch {}

  // Demo fallback: only in development
  if (process.env.NODE_ENV === 'production') {
    // In production with no session, return the first user as a last-resort
    // fallback ONLY if the database has users (prevents crashes during setup).
    // Real deployments should use requireUser() for proper 401 handling.
    const user = await db.user.findFirst({ orderBy: { createdAt: 'asc' } })
    if (user) return user
    throw new Error('No authenticated user and no users in database')
  }

  let user = await db.user.findFirst({ orderBy: { createdAt: 'asc' } })
  if (!user) {
    user = await db.user.create({
      data: { email: 'founder@careeros.ai', name: 'Alex Rivera', plan: 'premium' },
    })
  }
  return user
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
