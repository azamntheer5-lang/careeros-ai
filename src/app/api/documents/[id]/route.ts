import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, err } from '@/lib/server'

export const runtime = 'nodejs'

/** GET — single document (includes raw base64 data for download). */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const user = await getCurrentUser()
    const doc = await db.document.findUnique({ where: { id } })
    if (!doc || doc.userId !== user.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    return NextResponse.json({ document: doc })
  } catch (e) {
    return err(e)
  }
}

/** DELETE — remove a document. */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const user = await getCurrentUser()
    const existing = await db.document.findUnique({ where: { id } })
    if (!existing || existing.userId !== user.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    await db.document.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return err(e)
  }
}
