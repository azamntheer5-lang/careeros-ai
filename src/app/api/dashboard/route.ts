import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, err } from '@/lib/server'

export async function GET() {
  try {
    const user = await getCurrentUser()
    const [resumes, jobs, interviews, letters, coachSessions, usages] = await Promise.all([
      db.resume.count({ where: { userId: user.id } }),
      db.job.count({ where: { userId: user.id } }),
      db.interview.count({ where: { userId: user.id } }),
      db.coverLetter.count({ where: { userId: user.id } }),
      db.coachSession.count({ where: { userId: user.id } }),
      db.aiUsage.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' }, take: 200 }),
    ])

    const resumesAll = await db.resume.findMany({ where: { userId: user.id }, select: { atsScore: true, updatedAt: true, title: true } })
    const atsScores = resumesAll.map((r) => r.atsScore).filter((s): s is number => s != null)
    const avgAts = atsScores.length ? Math.round(atsScores.reduce((a, b) => a + b, 0) / atsScores.length) : 0

    const jobsByStatus = await db.job.groupBy({ by: ['status'], where: { userId: user.id }, _count: true })
    const pipeline = jobsByStatus.map((s) => ({ status: s.status, count: s._count }))

    // feature usage counts
    const featureUsage = (usages as any[]).reduce<Record<string, number>>((acc, u) => {
      acc[u.feature] = (acc[u.feature] || 0) + 1
      return acc
    }, {})

    return NextResponse.json({
      stats: {
        resumes,
        jobs,
        interviews,
        letters,
        coachSessions,
        avgAts,
        aiCalls: usages.length,
      },
      pipeline,
      featureUsage,
      recent: usages.slice(0, 8).map((u) => ({ feature: u.feature, at: u.createdAt })),
    })
  } catch (e) {
    return err(e)
  }
}
