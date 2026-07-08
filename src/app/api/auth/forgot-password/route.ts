import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { err } from '@/lib/server'
import { generateResetToken } from '@/lib/auth'
import { checkRateLimit } from '@/lib/rate-limit'

/** POST /api/auth/forgot-password — initiate password reset flow. */
export async function POST(req: Request) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    const { rateLimited } = checkRateLimit(`reset:${ip}`, 3, 60000)
    if (rateLimited) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

    const { email } = await req.json()
    if (!email?.trim()) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const user = await db.user.findUnique({ where: { email: email.toLowerCase().trim() } })
    if (!user) {
      // Don't reveal whether the email exists
      return NextResponse.json({ ok: true, message: 'If the email exists, a reset link has been sent.' })
    }

    // Generate reset token (in production: store in DB + send via email)
    const { token, expiresAt } = generateResetToken(user.id)
    // In production: db.passwordReset.create({ data: { userId: user.id, token, expiresAt } })
    // In production: sendEmail(user.email, 'Reset your password', `${process.env.NEXTAUTH_URL}/reset?token=${token}`)

    return NextResponse.json({ ok: true, message: 'If the email exists, a reset link has been sent.' })
  } catch (e) { return err(e) }
}
