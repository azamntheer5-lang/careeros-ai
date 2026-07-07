import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, err } from '@/lib/server'

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const user = await getCurrentUser()
    const existing = await db.job.findUnique({ where: { id } })
    if (!existing || existing.userId !== user.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    const body = await req.json()
    const job = await db.job.update({
      where: { id },
      data: {
        company: body.company ?? existing.company,
        role: body.role ?? existing.role,
        location: body.location ?? existing.location,
        salary: body.salary ?? existing.salary,
        url: body.url ?? existing.url,
        status: body.status ?? existing.status,
        priority: body.priority ?? existing.priority,
        notes: body.notes ?? existing.notes,
        deadline: body.deadline ? new Date(body.deadline) : existing.deadline,
        appliedAt: body.status === 'applied' && !existing.appliedAt ? new Date() : existing.appliedAt,
      },
    })
    return NextResponse.json({ job })
  } catch (e) {
    return err(e)
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const user = await getCurrentUser()
    const existing = await db.job.findUnique({ where: { id } })
    if (!existing || existing.userId !== user.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    await db.job.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return err(e)
  }
}
