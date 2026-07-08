import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, err } from '@/lib/server'

/** GET the career profile (the single source of truth for AI memory). */
export async function GET() {
  try {
    const user = await getCurrentUser()
    let profile = await db.careerProfile.findUnique({ where: { userId: user.id } })
    if (!profile) {
      profile = await db.careerProfile.create({ data: { userId: user.id } })
    }
    return NextResponse.json({ profile, user })
  } catch (e) { return err(e) }
}

/** UPSERT the career profile. */
export async function PUT(req: Request) {
  try {
    const user = await getCurrentUser()
    const body = await req.json()
    const data = {
      targetRole: body.targetRole ?? null,
      industry: body.industry ?? null,
      seniority: body.seniority ?? null,
      experienceYears: typeof body.experienceYears === 'number' ? body.experienceYears : null,
      targetSalary: body.targetSalary ?? null,
      currency: body.currency ?? 'USD',
      location: body.location ?? null,
      workMode: body.workMode ?? null,
      careerGoals: body.careerGoals ?? null,
      timeline: body.timeline ?? null,
      linkedinUrl: body.linkedinUrl ?? null,
      githubUrl: body.githubUrl ?? null,
      portfolioUrl: body.portfolioUrl ?? null,
      brandStatement: body.brandStatement ?? null,
      strengths: body.strengths ? JSON.stringify(body.strengths) : undefined,
      values: body.values ? JSON.stringify(body.values) : undefined,
    }
    const profile = await db.careerProfile.upsert({
      where: { userId: user.id },
      create: { userId: user.id, ...data },
      update: data,
    })
    if (body.onboarded) {
      await db.user.update({ where: { id: user.id }, data: { onboarded: true, name: body.name || user.name, headline: body.headline || user.headline } })
    } else if (body.name || body.headline) {
      await db.user.update({ where: { id: user.id }, data: { name: body.name || user.name, headline: body.headline || user.headline } })
    }
    try {
      await db.auditLog.create({ data: { userId: user.id, action: 'profile.update', entity: 'CareerProfile', entityId: profile.id } })
    } catch {}
    return NextResponse.json({ profile })
  } catch (e) { return err(e) }
}
