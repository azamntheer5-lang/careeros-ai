import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, err } from '@/lib/server'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const resume = await db.resume.findUnique({ where: { id } })
    return NextResponse.json({ resume })
  } catch (e) {
    return err(e)
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const user = await getCurrentUser()
    const body = await req.json()
    const existing = await db.resume.findUnique({ where: { id } })
    if (!existing || existing.userId !== user.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    const resume = await db.resume.update({
      where: { id },
      data: {
        title: body.title ?? existing.title,
        template: body.template ?? existing.template,
        accent: body.accent ?? existing.accent,
        font: body.font ?? existing.font,
        spacing: body.spacing ?? existing.spacing,
        data: body.data ? JSON.stringify(body.data) : existing.data,
        atsScore: body.atsScore ?? existing.atsScore,
        version: { increment: 1 },
      },
    })
    return NextResponse.json({ resume })
  } catch (e) {
    return err(e)
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const user = await getCurrentUser()
    const existing = await db.resume.findUnique({ where: { id } })
    if (!existing || existing.userId !== user.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    await db.resume.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return err(e)
  }
}
