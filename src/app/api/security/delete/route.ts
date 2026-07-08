import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, err } from '@/lib/server'

/** GDPR data deletion — permanently deletes ALL user data (account closure). */
export async function POST() {
  try {
    const user = await getCurrentUser()
    // Cascade deletes handle most relations; explicit deletes for safety.
    await Promise.all([
      db.careerProfile.deleteMany({ where: { userId: user.id } }),
      db.resume.deleteMany({ where: { userId: user.id } }),
      db.coverLetter.deleteMany({ where: { userId: user.id } }),
      db.interview.deleteMany({ where: { userId: user.id } }),
      db.coachSession.deleteMany({ where: { userId: user.id } }),
      db.job.deleteMany({ where: { userId: user.id } }),
      db.skillProfile.deleteMany({ where: { userId: user.id } }),
      db.portfolio.deleteMany({ where: { userId: user.id } }),
      db.brandingAnalysis.deleteMany({ where: { userId: user.id } }),
      db.careerPlan.deleteMany({ where: { userId: user.id } }),
      db.agentRun.deleteMany({ where: { userId: user.id } }),
      db.networkProfile.deleteMany({ where: { userId: user.id } }),
      db.post.deleteMany({ where: { userId: user.id } }),
      db.mentor.deleteMany({ where: { userId: user.id } }),
      db.booking.deleteMany({ where: { userId: user.id } }),
      db.subscription.deleteMany({ where: { userId: user.id } }),
      db.creditTransaction.deleteMany({ where: { userId: user.id } }),
      db.assessment.deleteMany({ where: { userId: user.id } }),
      db.careerBriefing.deleteMany({ where: { userId: user.id } }),
      db.achievement.deleteMany({ where: { userId: user.id } }),
      db.company.deleteMany({ where: { userId: user.id } }),
      db.contact.deleteMany({ where: { userId: user.id } }),
      db.reminder.deleteMany({ where: { userId: user.id } }),
      db.aiUsage.deleteMany({ where: { userId: user.id } }),
      db.notification.deleteMany({ where: { userId: user.id } }),
      db.graphNode.deleteMany({ where: { userId: user.id } }),
      db.workflowRun.deleteMany({ where: { userId: user.id } }),
    ])
    // Audit log entry (kept anonymously)
    try { await db.auditLog.create({ data: { userId: null, action: 'security.account_deleted', entity: 'User', entityId: user.id, meta: JSON.stringify({ email: user.email }) } }) } catch {}
    // Finally delete the user
    await db.user.delete({ where: { id: user.id } })
    return NextResponse.json({ ok: true, message: 'Account and all data permanently deleted.' })
  } catch (e) { return err(e) }
}
