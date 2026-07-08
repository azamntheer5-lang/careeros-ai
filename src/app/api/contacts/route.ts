import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, err } from '@/lib/server'

/** List + create contacts (recruiters, hiring managers, referrals). */
export async function GET() {
  try {
    const user = await getCurrentUser()
    const contacts = await db.contact.findMany({ where: { userId: user.id }, orderBy: { updatedAt: 'desc' } })
    return NextResponse.json({ contacts })
  } catch (e) { return err(e) }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser()
    const body = await req.json()
    const contact = await db.contact.create({
      data: {
        userId: user.id,
        companyId: body.companyId || null,
        name: body.name,
        role: body.role || null,
        email: body.email || null,
        linkedin: body.linkedin || null,
        phone: body.phone || null,
        type: body.type || 'recruiter',
        notes: body.notes || null,
      },
    })
    return NextResponse.json({ contact })
  } catch (e) { return err(e) }
}
