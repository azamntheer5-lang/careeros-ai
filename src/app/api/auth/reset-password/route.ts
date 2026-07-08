import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword, verifyResetToken, createSession } from '@/lib/auth'
import { err } from '@/lib/server'

/** POST /api/auth/reset-password — reset password using a token. */
export async function POST(req: Request) {
  try {
    const { token, password } = await req.json()
    if (!token || !password) {
      return NextResponse.json({ error: 'Token and new password are required' }, { status: 400 })
    }
    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
    }
    if (!verifyResetToken(token)) {
      return NextResponse.json({ error: 'Invalid or expired reset token' }, { status: 400 })
    }

    // In production: look up the token in DB to find the userId
    // For now, we require the email in the request body to find the user
    const { email } = await req.json().catch(() => ({}))
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const user = await db.user.findUnique({ where: { email: email.toLowerCase().trim() } })
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    await db.user.update({
      where: { id: user.id },
      data: { passwordHash: hashPassword(password), sessionToken: null },
    })

    await createSession(user.id)

    return NextResponse.json({ ok: true, message: 'Password reset successful' })
  } catch (e) { return err(e) }
}
