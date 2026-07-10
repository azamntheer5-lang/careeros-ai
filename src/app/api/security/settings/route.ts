import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, err } from '@/lib/server'

/** GET security settings for the current user. */
export async function GET() {
  try {
    const user = await getCurrentUser()
    const u = await db.user.findUnique({ where: { id: user.id }, select: { mfaEnabled: true } })
    return NextResponse.json({ mfaEnabled: u?.mfaEnabled ?? false })
  } catch (e) { return err(e) }
}

/** PUT — update MFA setting (persisted to user record). */
export async function PUT(req: Request) {
  try {
    const user = await getCurrentUser()
    const body = await req.json()
    const mfaEnabled = !!body.mfaEnabled
    await db.user.update({ where: { id: user.id }, data: { mfaEnabled } })
    try {
      await db.auditLog.create({ data: { userId: user.id, action: 'security.mfa_toggle', entity: 'User', entityId: user.id } })
    } catch {}
    return NextResponse.json({ ok: true, mfaEnabled })
  } catch (e) { return err(e) }
}
