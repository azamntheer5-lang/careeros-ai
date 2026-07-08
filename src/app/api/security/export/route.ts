import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, err } from '@/lib/server'

/** GDPR data export — returns ALL user data as JSON. */
export async function GET() {
  try {
    const user = await getCurrentUser()
    const [profile, resumes, coverLetters, interviews, coachSessions, jobs, skillProfiles, portfolios, brandings, careerPlans, agentRuns, networkProfile, posts, mentorProfile, bookings, subscription, creditTxns, assessments, briefings, achievements, auditLogs] = await Promise.all([
      db.careerProfile.findUnique({ where: { userId: user.id } }),
      db.resume.findMany({ where: { userId: user.id } }),
      db.coverLetter.findMany({ where: { userId: user.id } }),
      db.interview.findMany({ where: { userId: user.id } }),
      db.coachSession.findMany({ where: { userId: user.id } }),
      db.job.findMany({ where: { userId: user.id } }),
      db.skillProfile.findMany({ where: { userId: user.id } }),
      db.portfolio.findMany({ where: { userId: user.id } }),
      db.brandingAnalysis.findMany({ where: { userId: user.id } }),
      db.careerPlan.findMany({ where: { userId: user.id } }),
      db.agentRun.findMany({ where: { userId: user.id } }),
      db.networkProfile.findUnique({ where: { userId: user.id } }),
      db.post.findMany({ where: { userId: user.id } }),
      db.mentor.findUnique({ where: { userId: user.id } }),
      db.booking.findMany({ where: { userId: user.id } }),
      db.subscription.findUnique({ where: { userId: user.id } }),
      db.creditTransaction.findMany({ where: { userId: user.id } }),
      db.assessment.findMany({ where: { userId: user.id } }),
      db.careerBriefing.findMany({ where: { userId: user.id } }),
      db.achievement.findMany({ where: { userId: user.id } }),
      db.auditLog.findMany({ where: { userId: user.id }, take: 50 }),
    ])

    const exportData = {
      exportedAt: new Date().toISOString(),
      user: { id: user.id, email: user.email, name: user.name, headline: user.headline, plan: user.plan, createdAt: user.createdAt },
      profile, resumes, coverLetters, interviews, coachSessions, jobs, skillProfiles,
      portfolios, brandings, careerPlans, agentRuns, networkProfile, posts, mentorProfile,
      bookings, subscription, creditTxns, assessments, briefings, achievements, auditLogs,
    }

    try { await db.auditLog.create({ data: { userId: user.id, action: 'security.data_export', entity: 'User', entityId: user.id } }) } catch {}

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="careeros-data-export-${Date.now()}.json"`,
      },
    })
  } catch (e) { return err(e) }
}
