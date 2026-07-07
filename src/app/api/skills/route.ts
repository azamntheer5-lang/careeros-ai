import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { ai } from '@/lib/ai'
import { getCurrentUser, err } from '@/lib/server'

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser()
    const { currentSkills, targetRole } = await req.json()
    const skills = Array.isArray(currentSkills)
      ? currentSkills
      : String(currentSkills || '')
          .split(',')
          .map((s: string) => s.trim())
          .filter(Boolean)
    if (!targetRole?.trim() || skills.length === 0) {
      return NextResponse.json({ error: 'Target role and current skills are required' }, { status: 400 })
    }
    const { data } = await ai.skillAnalysis(skills, targetRole)
    const profile = await db.skillProfile.create({
      data: {
        userId: user.id,
        targetRole,
        skills: JSON.stringify(skills.map((s: string) => ({ name: s, level: 3, targetLevel: 5 }))),
        gaps: JSON.stringify(data.gaps || []),
        roadmap: JSON.stringify(data.roadmap || []),
      },
    })
    await db.aiUsage.create({ data: { userId: user.id, feature: 'skills', tokens: 1 } })
    return NextResponse.json({ profile, analysis: data })
  } catch (e) {
    return err(e)
  }
}
