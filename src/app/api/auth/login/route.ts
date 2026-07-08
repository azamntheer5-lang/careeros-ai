import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyPassword, createSession, recordFailedAttempt, isLockedOut, clearFailedAttempts } from '@/lib/auth'
import { err } from '@/lib/server'
import { checkRateLimit } from '@/lib/rate-limit'

/** POST /api/auth/login — authenticate with email + password, create session. */
export async function POST(req: Request) {
  try {
    // Rate limit by IP to prevent brute force (5 attempts/min)
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    const { rateLimited } = checkRateLimit(`login:${ip}`, 5, 60000)
    if (rateLimited) return NextResponse.json({ error: 'Too many login attempts. Try again in 1 minute.' }, { status: 429 })

    const { email, password } = await req.json()
    if (!email?.trim() || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }

    const normalizedEmail = email.toLowerCase().trim()

    // Check account lockout
    if (isLockedOut(normalizedEmail)) {
      return NextResponse.json({ error: 'Account locked due to too many failed attempts. Try again in 15 minutes.' }, { status: 423 })
    }

    const user = await db.user.findUnique({ where: { email: normalizedEmail } })
    if (!user || !user.passwordHash) {
      const { remaining } = recordFailedAttempt(normalizedEmail)
      return NextResponse.json({ error: `Invalid email or password. ${remaining} attempts remaining.` }, { status: 401 })
    }

    if (!verifyPassword(password, user.passwordHash)) {
      const { remaining, locked } = recordFailedAttempt(normalizedEmail)
      if (locked) {
        return NextResponse.json({ error: 'Account locked due to too many failed attempts. Try again in 15 minutes.' }, { status: 423 })
      }
      return NextResponse.json({ error: `Invalid email or password. ${remaining} attempts remaining.` }, { status: 401 })
    }

    // Successful login — clear failed attempts
    clearFailedAttempts(normalizedEmail)
    await createSession(user.id)

    return NextResponse.json({
      user: { id: user.id, email: user.email, name: user.name, plan: user.plan, credits: user.credits },
    })
  } catch (e) { return err(e) }
}
