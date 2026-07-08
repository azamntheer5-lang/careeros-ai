import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, err } from '@/lib/server'

/** GET employees for the current user's tenant. */
export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user.tenantId) return NextResponse.json({ employees: [] })
    const employees = await db.employee.findMany({
      where: { tenantId: user.tenantId },
      include: { department: true },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({ employees })
  } catch (e) { return err(e) }
}

/** POST to add an employee. */
export async function POST(req: Request) {
  try {
    const user = await getCurrentUser()
    if (!user.tenantId) return NextResponse.json({ error: 'No tenant' }, { status: 400 })
    const body = await req.json()
    const employee = await db.employee.create({
      data: {
        tenantId: user.tenantId,
        name: body.name,
        email: body.email,
        role: body.role || null,
        departmentId: body.departmentId || null,
        level: body.level || null,
        skills: body.skills ? JSON.stringify(body.skills) : null,
        goals: body.goals ? JSON.stringify(body.goals) : null,
        growthScore: body.growthScore ?? Math.floor(Math.random() * 40 + 40),
      },
    })
    try { await db.auditLog.create({ data: { userId: user.id, action: 'enterprise.employee.add', entity: 'Employee', entityId: employee.id } }) } catch {}
    return NextResponse.json({ employee })
  } catch (e) { return err(e) }
}
