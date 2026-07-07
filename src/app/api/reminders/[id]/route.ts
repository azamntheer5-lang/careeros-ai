import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, err } from '@/lib/server'

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const user = await getCurrentUser()
    const existing = await db.reminder.findUnique({ where: { id } })
    if (!existing || existing.userId !== user.id) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const body = await req.json()
    const reminder = await db.reminder.update({ where: { id }, data: { done: body.done ?? existing.done } })
    return NextResponse.json({ reminder })
  } catch (e) { return err(e) }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const user = await getCurrentUser()
    const existing = await db.reminder.findUnique({ where: { id } })
    if (!existing || existing.userId !== user.id) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    await db.reminder.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (e) { return err(e) }
}
