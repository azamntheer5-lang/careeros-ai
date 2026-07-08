import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, err, parseJson } from '@/lib/server'

/** Demo tenant seed: a realistic tech company with 3 departments and 8 employees. */
const ACME_DEPARTMENTS = ['Engineering', 'Product', 'Design'] as const

const SEED_EMPLOYEES = [
  {
    name: 'Sarah Chen',
    email: 'sarah.chen@acme.com',
    role: 'Senior Software Engineer',
    dept: 'Engineering',
    level: 'Senior',
    skills: ['TypeScript', 'React', 'Node.js', 'System Design'],
    goals: ['Lead a platform team', 'Mentor junior engineers'],
    growthScore: 88,
  },
  {
    name: 'Marcus Johnson',
    email: 'marcus.j@acme.com',
    role: 'Product Manager',
    dept: 'Product',
    level: 'Mid',
    skills: ['Strategy', 'Analytics', 'Roadmapping', 'User Research'],
    goals: ['Drive a 0→1 product launch', 'Present roadmap to board'],
    growthScore: 76,
  },
  {
    name: 'Priya Patel',
    email: 'priya.p@acme.com',
    role: 'UX Designer',
    dept: 'Design',
    level: 'Mid',
    skills: ['Figma', 'Design Systems', 'Prototyping', 'User Research'],
    goals: ['Own the design system', 'Speak at Config'],
    growthScore: 72,
  },
  {
    name: 'David Kim',
    email: 'david.kim@acme.com',
    role: 'Software Engineer',
    dept: 'Engineering',
    level: 'Junior',
    skills: ['Python', 'Django', 'PostgreSQL'],
    goals: ['Ship first feature solo', 'Learn TypeScript'],
    growthScore: 58,
  },
  {
    name: 'Elena Rodriguez',
    email: 'elena.r@acme.com',
    role: 'Engineering Manager',
    dept: 'Engineering',
    level: 'Lead',
    skills: ['Leadership', 'Architecture', 'TypeScript', 'Mentoring'],
    goals: ['Director track', 'Scale team to 20 engineers'],
    growthScore: 92,
  },
  {
    name: 'Tom Williams',
    email: 'tom.w@acme.com',
    role: 'Associate Product Manager',
    dept: 'Product',
    level: 'Junior',
    skills: ['Analytics', 'Notion', 'Roadmapping'],
    goals: ['Own a product line', 'Stakeholder management'],
    growthScore: 64,
  },
  {
    name: 'Aisha Mohammed',
    email: 'aisha.m@acme.com',
    role: 'Senior Product Designer',
    dept: 'Design',
    level: 'Senior',
    skills: ['Figma', 'Leadership', 'Design Systems', 'Research'],
    goals: ['Lead the design org', 'Mentor 3 designers'],
    growthScore: 81,
  },
  {
    name: 'James Park',
    email: 'james.p@acme.com',
    role: 'Staff Engineer',
    dept: 'Engineering',
    level: 'Staff',
    skills: ['Architecture', 'TypeScript', 'Mentoring', 'System Design'],
    goals: ['Principal track', 'Author architecture RFCs'],
    growthScore: 85,
  },
] as const

/** Serialize an Employee row (parse JSON skills/goals, attach departmentName). */
function serializeEmployee(
  emp: {
    id: string
    name: string
    email: string
    role: string | null
    departmentId: string | null
    level: string | null
    skills: string | null
    goals: string | null
    growthScore: number
  },
  deptMap: Map<string, string>
) {
  return {
    id: emp.id,
    name: emp.name,
    email: emp.email,
    role: emp.role,
    departmentId: emp.departmentId,
    departmentName: emp.departmentId ? deptMap.get(emp.departmentId) ?? null : null,
    level: emp.level,
    skills: parseJson<string[]>(emp.skills) ?? [],
    goals: parseJson<string[]>(emp.goals) ?? [],
    growthScore: emp.growthScore,
  }
}

/** GET the current user's tenant. Seeds a demo "Acme Corp" tenant if the user has none. */
export async function GET() {
  try {
    const user = await getCurrentUser()

    // Resolve or seed the tenant
    let tenant = user.tenantId
      ? await db.tenant.findUnique({ where: { id: user.tenantId } })
      : null

    if (!tenant) {
      tenant = await db.tenant.create({
        data: {
          name: 'Acme Corp',
          type: 'company',
          domain: 'acme.com',
          plan: 'enterprise',
          seats: 50,
        },
      })
      // Assign the current user to the new tenant + bump their plan
      await db.user.update({
        where: { id: user.id },
        data: { tenantId: tenant.id, plan: 'enterprise' },
      })

      // Create the three departments
      const deptRecords = await Promise.all(
        ACME_DEPARTMENTS.map((name) =>
          db.department.create({ data: { tenantId: tenant!.id, name, headcount: 0 } })
        )
      )
      const deptByName = new Map(deptRecords.map((d) => [d.name, d.id]))

      // Seed employees
      await Promise.all(
        SEED_EMPLOYEES.map((e) =>
          db.employee.create({
            data: {
              tenantId: tenant!.id,
              name: e.name,
              email: e.email,
              role: e.role,
              departmentId: deptByName.get(e.dept) ?? null,
              level: e.level,
              skills: JSON.stringify(e.skills),
              goals: JSON.stringify(e.goals),
              growthScore: e.growthScore,
            },
          })
        )
      )

      // Update headcount on each department
      await Promise.all(
        deptRecords.map((d) =>
          db.department.update({
            where: { id: d.id },
            data: {
              headcount: SEED_EMPLOYEES.filter((e) => e.dept === d.name).length,
            },
          })
        )
      )
    }

    // Always load fresh from DB (covers post-seed + subsequent calls)
    const fresh = tenant.id
      ? await db.tenant.findUnique({
          where: { id: tenant.id },
          include: {
            departments: true,
            employees: { orderBy: { growthScore: 'desc' } },
          },
        })
      : null

    if (!fresh) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }

    const deptMap = new Map<string, string>(fresh.departments.map((d: any) => [d.id, d.name] as [string, string]))
    const employees = fresh.employees.map((e) => serializeEmployee(e, deptMap))

    // Stats
    const totalEmployees = employees.length
    const totalDepartments = fresh.departments.length
    const avgGrowth = totalEmployees
      ? Math.round(
          employees.reduce((sum, e) => sum + e.growthScore, 0) / totalEmployees
        )
      : 0

    const skillCounts = new Map<string, number>()
    for (const e of employees) {
      for (const s of e.skills) {
        skillCounts.set(s, (skillCounts.get(s) ?? 0) + 1)
      }
    }
    const topSkill =
      [...skillCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null

    return NextResponse.json({
      tenant: {
        id: fresh.id,
        name: fresh.name,
        type: fresh.type,
        domain: fresh.domain,
        plan: fresh.plan,
        seats: fresh.seats,
        createdAt: fresh.createdAt,
      },
      departments: fresh.departments.map((d) => ({
        id: d.id,
        name: d.name,
        headcount: d.headcount,
      })),
      employees,
      stats: {
        totalEmployees,
        totalDepartments,
        avgGrowth,
        topSkill,
      },
    })
  } catch (e) {
    return err(e)
  }
}
