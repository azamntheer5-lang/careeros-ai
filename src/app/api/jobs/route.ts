import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, err } from '@/lib/server'

export async function GET() {
  try {
    const user = await getCurrentUser()
    const jobs = await db.job.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: 'desc' },
    })
    return NextResponse.json({ jobs })
  } catch (e) {
    return err(e)
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser()
    const body = await req.json()
    const job = await db.job.create({
      data: {
        userId: user.id,
        company: body.company,
        role: body.role,
        location: body.location || null,
        salary: body.salary || null,
        url: body.url || null,
        status: body.status || 'wishlist',
        priority: body.priority || 'medium',
        notes: body.notes || null,
        deadline: body.deadline ? new Date(body.deadline) : null,
        appliedAt: body.appliedAt ? new Date(body.appliedAt) : null,
      },
    })
    return NextResponse.json({ job })
  } catch (e) {
    return err(e)
  }
}
