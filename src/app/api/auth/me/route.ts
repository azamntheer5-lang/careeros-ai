import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'

/** GET /api/auth/me — return the current authenticated user or 401. */
export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    return NextResponse.json({
      user: { id: user.id, email: user.email, name: user.name, plan: user.plan, credits: user.credits },
    })
  } catch {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }
}
