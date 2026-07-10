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

/**
 * Build a safe Content-Disposition header value for a download.
 *
 * SECURITY: Prevents HTTP header injection and filename XSS by:
 * 1. Stripping CR/LF (and all control chars) — blocks header splitting.
 * 2. Stripping path separators — blocks path traversal in saved filename.
 * 3. Limiting to 100 chars — prevents oversized headers / DoS.
 * 4. Producing BOTH an ASCII-safe fallback (`filename="..."`) and a
 *    RFC 5987 / 6266 UTF-8 encoded value (`filename*=UTF-8''...`) so
 *    non-ASCII names (Arabic, etc.) render correctly in modern browsers
 *    without ever allowing raw quotes / semicolons / newlines through.
 *
 * @param rawName - User-supplied filename (without extension)
 * @param ext - File extension WITHOUT leading dot, e.g. "pdf" or "docx"
 */
export function safeContentDisposition(rawName: unknown, ext: string): string {
  const EXT = String(ext || 'bin').replace(/[^a-zA-Z0-9]/g, '').toLowerCase().slice(0, 5)
  // Coerce to string and strip control chars + path separators.
  let name = typeof rawName === 'string' ? rawName : (rawName == null ? '' : String(rawName))
  name = name.replace(/[\x00-\x1f\x7f\r\n]/g, '').replace(/[\\/]/g, '').trim()
  if (!name) name = 'download'
  // Hard cap at 100 chars (post-trim) to prevent header-overflow DoS.
  if (name.length > 100) name = name.slice(0, 100).trim() || 'download'

  // ASCII fallback: keep only printable ASCII that's safe inside a quoted
  // string. Replace anything else with underscores, then collapse runs.
  const ascii = name.replace(/[^\x20-\x7e]/g, '_').replace(/[";]/g, '_').replace(/_+/g, '_').trim() || 'download'

  // RFC 5987 UTF-8 encoded value for modern browsers (preserves Arabic, etc.)
  const utf8encoded = encodeURIComponent(name)
    .replace(/['()]/g, escape) // escape chars that encodeURIComponent leaves alone
    .replace(/\*/g, '%2A')

  return `attachment; filename="${ascii}.${EXT}"; filename*=UTF-8''${utf8encoded}.${EXT}`
}
