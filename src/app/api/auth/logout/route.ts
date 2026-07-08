import { NextResponse } from 'next/server'
import { clearSession } from '@/lib/auth'

/** POST /api/auth/logout — clear the session cookie. */
export async function POST() {
  try {
    await clearSession()
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: true })
  }
}
