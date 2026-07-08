import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, err, parseJson } from '@/lib/server'

/** Internal "open roles" used for mobility matching — derived from a typical tech org. */
const OPEN_ROLES: {
  title: string
  dept: string
  skills: string[]
}[] = [
  {
    title: 'Staff Engineer',
    dept: 'Engineering',
    skills: ['Architecture', 'System Design', 'TypeScript', 'Mentoring'],
  },
  {
    title: 'Engineering Manager',
    dept: 'Engineering',
    skills: ['Leadership', 'Mentoring', 'Architecture', 'TypeScript'],
  },
  {
    title: 'Lead Product Manager',
    dept: 'Product',
    skills: ['Strategy', 'Roadmapping', 'Analytics', 'Leadership'],
  },
  {
    title: 'Design Lead',
    dept: 'Design',
    skills: ['Figma', 'Design Systems', 'Leadership', 'Research'],
  },
]

type RawEmployee = {
  id: string
  name: string
  email: string
  role: string | null
  departmentId: string | null
  level: string | null
  skills: string | null
  goals: string | null
  growthScore: number
}

/** GET aggregate skill analytics for the current user's tenant. */
export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user.tenantId) {
      return NextResponse.json({
        topSkills: [],
        growthDistribution: [],
        departmentHeadcount: [],
        levelDistribution: [],
        mobilityCandidates: [],
      })
    }

    const [departments, employees] = await Promise.all([
      db.department.findMany({ where: { tenantId: user.tenantId } }),
      db.employee.findMany({ where: { tenantId: user.tenantId } }),
    ])

    const deptMap = new Map(departments.map((d) => [d.id, d.name]))
    const deptIdByName = new Map(departments.map((d) => [d.name, d.id]))

    const parsed = employees.map((e: RawEmployee) => ({
      id: e.id,
      name: e.name,
      role: e.role,
      departmentId: e.departmentId,
      departmentName: e.departmentId ? deptMap.get(e.departmentId) ?? null : null,
      level: e.level,
      skills: parseJson<string[]>(e.skills) ?? [],
      goals: parseJson<string[]>(e.goals) ?? [],
      growthScore: e.growthScore,
    }))

    // Top skills across the org
    const skillCounts = new Map<string, number>()
    for (const e of parsed) {
      for (const s of e.skills) {
        const key = s.trim()
        if (!key) continue
        skillCounts.set(key, (skillCounts.get(key) ?? 0) + 1)
      }
    }
    const topSkills = [...skillCounts.entries()]
      .map(([skill, count]) => ({ skill, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    // Growth score distribution (4 buckets)
    const buckets = [
      { bucket: '0-25', min: 0, max: 25 },
      { bucket: '26-50', min: 26, max: 50 },
      { bucket: '51-75', min: 51, max: 75 },
      { bucket: '76-100', min: 76, max: 100 },
    ]
    const growthDistribution = buckets.map((b) => ({
      bucket: b.bucket,
      count: parsed.filter((e) => e.growthScore >= b.min && e.growthScore <= b.max)
        .length,
    }))

    // Department headcount (from employees)
    const departmentHeadcount = departments
      .map((d) => ({
        name: d.name,
        headcount: parsed.filter((e) => e.departmentId === d.id).length,
      }))
      .filter((d) => d.headcount > 0)

    // Level distribution
    const levelCounts = new Map<string, number>()
    for (const e of parsed) {
      const key = e.level || 'Unspecified'
      levelCounts.set(key, (levelCounts.get(key) ?? 0) + 1)
    }
    const levelOrder = ['Junior', 'Mid', 'Senior', 'Staff', 'Lead', 'Unspecified']
    const levelDistribution = levelOrder
      .filter((lvl) => levelCounts.has(lvl))
      .map((level) => ({ level, count: levelCounts.get(level) ?? 0 }))

    // Internal mobility candidates:
    // For each employee, compute match score against each OPEN_ROLE in the same department
    // (or any department if they have no dept). Keep the best match where readinessScore >= 50
    // AND the employee's current level is below the target's implied level.
    const LEVEL_RANK: Record<string, number> = {
      Junior: 1,
      Mid: 2,
      Senior: 3,
      Staff: 4,
      Lead: 4,
    }
    const TARGET_LEVEL: Record<string, number> = {
      'Staff Engineer': 4,
      'Engineering Manager': 4,
      'Lead Product Manager': 4,
      'Design Lead': 4,
    }

    const mobilityCandidates = parsed
      .map((emp) => {
        const empSkillsLower = emp.skills.map((s) => s.toLowerCase())
        let best: {
          suggestedNextRole: string
          readinessScore: number
          matchedSkills: string[]
        } | null = null

        for (const role of OPEN_ROLES) {
          // Skip if the role's dept doesn't match the employee's dept (only consider same dept moves
          // OR cross-dept if employee has no department assigned).
          if (emp.departmentName && role.dept !== emp.departmentName) continue

          // Skip if the employee is already at/above the target's level
          const empRank = emp.level ? LEVEL_RANK[emp.level] ?? 2 : 2
          const targetRank = TARGET_LEVEL[role.title] ?? 4
          if (empRank >= targetRank) continue

          const matched = role.skills.filter((s) =>
            empSkillsLower.includes(s.toLowerCase())
          )
          const matchPct = role.skills.length
            ? matched.length / role.skills.length
            : 0
          // Readiness = weighted blend of growth score (40%) + skill match (60%)
          const readinessScore = Math.round(
            emp.growthScore * 0.4 + matchPct * 100 * 0.6
          )

          if (
            readinessScore >= 50 &&
            (!best || readinessScore > best.readinessScore)
          ) {
            best = {
              suggestedNextRole: role.title,
              readinessScore,
              matchedSkills: matched,
            }
          }
        }

        if (!best) return null
        return {
          employeeId: emp.id,
          name: emp.name,
          role: emp.role,
          departmentName: emp.departmentName,
          growthScore: emp.growthScore,
          suggestedNextRole: best.suggestedNextRole,
          readinessScore: best.readinessScore,
          matchedSkills: best.matchedSkills,
        }
      })
      .filter(
        (c): c is NonNullable<typeof c> => c !== null
      )
      .sort((a, b) => b.readinessScore - a.readinessScore)
      .slice(0, 6)

    // Reference: expose open roles count for the UI
    void deptIdByName

    return NextResponse.json({
      topSkills,
      growthDistribution,
      departmentHeadcount,
      levelDistribution,
      mobilityCandidates,
    })
  } catch (e) {
    return err(e)
  }
}
