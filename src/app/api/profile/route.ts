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

/** UPSERT the career profile. Only updates fields that are explicitly provided. */
export async function PUT(req: Request) {
  try {
    const user = await getCurrentUser()
    const body = await req.json()
    // Build update object — only include fields actually present in the body.
    // Using `undefined` (omitted) instead of `null` prevents wiping existing data
    // when callers do `save({})` or `save({ onboarded: true })`.
    const data: Record<string, unknown> = {}
    if ('targetRole' in body) data.targetRole = body.targetRole ?? null
    if ('industry' in body) data.industry = body.industry ?? null
    if ('seniority' in body) data.seniority = body.seniority ?? null
    if ('experienceYears' in body) data.experienceYears = typeof body.experienceYears === 'number' ? body.experienceYears : null
    if ('targetSalary' in body) data.targetSalary = body.targetSalary ?? null
    if ('currency' in body) data.currency = body.currency ?? 'USD'
    if ('location' in body) data.location = body.location ?? null
    if ('workMode' in body) data.workMode = body.workMode ?? null
    if ('careerGoals' in body) data.careerGoals = body.careerGoals ?? null
    if ('timeline' in body) data.timeline = body.timeline ?? null
    if ('linkedinUrl' in body) data.linkedinUrl = body.linkedinUrl ?? null
    if ('githubUrl' in body) data.githubUrl = body.githubUrl ?? null
    if ('portfolioUrl' in body) data.portfolioUrl = body.portfolioUrl ?? null
    if ('brandStatement' in body) data.brandStatement = body.brandStatement ?? null
    if ('strengths' in body) data.strengths = body.strengths ? JSON.stringify(body.strengths) : undefined
    if ('values' in body) data.values = body.values ? JSON.stringify(body.values) : undefined

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
