import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, err } from '@/lib/server'

export async function GET() {
  try {
    const user = await getCurrentUser()
    const interviews = await db.interview.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: 'desc' },
    })
    return NextResponse.json({ interviews })
  } catch (e) {
    return err(e)
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser()
    const { type, role, company } = await req.json()
    const interview = await db.interview.create({
      data: {
        userId: user.id,
        type: type || 'technical',
        role: role || 'Software Engineer',
        company: company || null,
        status: 'active',
        messages: JSON.stringify([]),
      },
    })
    return NextResponse.json({ interview })
  } catch (e) {
    return err(e)
  }
}
