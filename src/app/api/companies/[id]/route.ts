import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, err } from '@/lib/server'

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const user = await getCurrentUser()
    const existing = await db.company.findUnique({ where: { id } })
    if (!existing || existing.userId !== user.id) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    await db.company.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (e) { return err(e) }
}
