import { db } from '@/lib/db'
import { cookies } from 'next/headers'
import crypto from 'crypto'

/**
 * Authentication system — session-based with signed HTTP-only cookies.
 *
 * Flow:
 * 1. User registers or logs in via /api/auth/login or /api/auth/register
 * 2. Server creates a session token (random 32-byte hex) + HMAC signature
 * 3. Token stored in `Session` table + set as HTTP-only cookie
 * 4. On every request, getCurrentUser() reads the cookie, verifies the signature,
 *    looks up the session, and returns the user
 * 5. If no valid session → returns null (caller should 401)
 *
 * Security:
 * - Cookies are HTTP-only (no JS access), Secure (HTTPS only in prod), SameSite=Lax
 * - Session tokens are cryptographically random + HMAC-signed
 * - Sessions expire after 7 days
 * - Passwords are hashed with scrypt + salt (never stored in plaintext)
 */

const SESSION_COOKIE = 'careeros_session'
const SESSION_MAX_AGE = 7 * 24 * 60 * 60 * 1000 // 7 days

/** Get the HMAC secret from env (or derive a dev fallback). */
function getSecret(): string {
  return process.env.NEXTAUTH_SECRET || process.env.SESSION_SECRET || 'careeros-dev-secret-change-in-production'
}

/** Create an HMAC signature for a token. */
function sign(token: string): string {
  return crypto.createHmac('sha256', getSecret()).update(token).digest('hex')
}

/** Verify a token's signature. */
function verify(token: string, signature: string): boolean {
  const expected = sign(token)
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
  } catch {
    return false
  }
}

/** Hash a password with scrypt + salt. */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

/** Verify a password against a stored hash. */
export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':')
  if (!salt || !hash) return false
  const verify = crypto.scryptSync(password, salt, 64).toString('hex')
  try {
    return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(verify))
  } catch {
    return false
  }
}

/** Create a session for a user and set the cookie. */
export async function createSession(userId: string): Promise<void> {
  const token = crypto.randomBytes(32).toString('hex')
  const signature = sign(token)
  const sessionToken = `${token}.${signature}`
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE)

  // Store in DB (upsert session table via user field — we use a simple approach)
  // Since we don't have a Session model, we store the session token hash on the user.
  // In production, use a dedicated Session table with Redis.
  const tokenHash = crypto.createHash('sha256').update(sessionToken).digest('hex')
  await db.user.update({
    where: { id: userId },
    data: { sessionToken: tokenHash, sessionExpiresAt: expiresAt } as any,
  })

  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE / 1000,
  })
}

/** Clear the session cookie. */
export async function clearSession(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE)
}

/**
 * Get the current authenticated user from the session cookie.
 * Returns null if no valid session exists.
 *
 * This REPLACES the old mocked getCurrentUser() that returned the first user.
 */
export async function getCurrentUser() {
  try {
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get(SESSION_COOKIE)?.value
    if (!sessionToken) return null

    // Verify format: token.signature
    const parts = sessionToken.split('.')
    if (parts.length !== 2) return null
    const [token, signature] = parts
    if (!verify(token, signature)) return null

    // Look up user by session token hash
    const tokenHash = crypto.createHash('sha256').update(sessionToken).digest('hex')
    const user = await db.user.findFirst({
      where: { sessionToken: tokenHash } as any,
    })
    if (!user) return null

    // Check expiry
    const expiresAt = (user as any).sessionExpiresAt
    if (expiresAt && new Date(expiresAt) < new Date()) {
      return null
    }

    return user
  } catch {
    return null
  }
}

/**
 * Require authentication — throws 401 if not authenticated.
 * Use in API routes that MUST have a logged-in user.
 */
export async function requireUser() {
  const user = await getCurrentUser()
  if (!user) {
    throw new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  return user
}

/** Check if the current user owns a resource. */
export function requireOwnership(resourceUserId: string, user: { id: string }): void {
  if (resourceUserId !== user.id) {
    throw new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

/**
 * Require a specific role — throws 403 if the user doesn't have it.
 * Roles: user < admin < owner
 */
export function requireRole(user: { role: string }, ...allowedRoles: string[]): void {
  if (!allowedRoles.includes(user.role)) {
    throw new Response(JSON.stringify({ error: 'Forbidden — insufficient permissions' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

/** Require admin or owner role. */
export function requireAdmin(user: { role: string }): void {
  requireRole(user, 'admin', 'owner')
}
