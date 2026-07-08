import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, err } from '@/lib/server'

/** List recent audit log entries (accept ?limit query, capped at 200). */
export async function GET(req: Request) {
  try {
    await getCurrentUser()
    const url = new URL(req.url)
    const raw = parseInt(url.searchParams.get('limit') || '50', 10)
    const limit = Number.isFinite(raw) ? Math.min(Math.max(raw, 1), 200) : 50

    const logs = await db.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: { user: { select: { name: true } } },
    })

    return NextResponse.json({
      logs: logs.map((l) => ({
        id: l.id,
        userId: l.userId,
        userName: l.user?.name ?? null,
        action: l.action,
        entity: l.entity,
        entityId: l.entityId,
        meta: l.meta,
        createdAt: l.createdAt,
      })),
    })
  } catch (e) {
    return err(e)
  }
}

/** Optionally create a manual audit log entry. */
export async function POST(req: Request) {
  try {
    const user = await getCurrentUser()
    const body = await req.json()
    const log = await db.auditLog.create({
      data: {
        userId: user.id,
        action: String(body.action || 'manual'),
        entity: String(body.entity || 'System'),
        entityId: body.entityId ? String(body.entityId) : null,
        meta: body.meta ? JSON.stringify(body.meta) : null,
      },
    })
    return NextResponse.json({ log })
  } catch (e) {
    return err(e)
  }
}
