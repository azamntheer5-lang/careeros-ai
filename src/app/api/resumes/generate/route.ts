import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { run } from '@/lib/ai'
import { getCurrentUser, err } from '@/lib/server'
import { rateLimitOr429 } from '@/lib/rate-limit'

/** AI-generate a complete, profile-aware resume draft from free-form context. */
export async function POST(req: Request) {
  try {
    const user = await getCurrentUser()
    const limited = rateLimitOr429(user.id, 'ai_generate')
    if (limited) return limited
    const { context, title, template, accent, careerMode } = await req.json()
    if (!context?.trim()) {
      return NextResponse.json({ error: 'Context is required' }, { status: 400 })
    }
    const { data } = await run<any>(
      'resume_generate',
      user.id,
      user.name || '',
      [{
        role: 'user',
        content: `Create a complete resume from this context${careerMode ? ` optimized for a ${careerMode} career track` : ''}. Return JSON with shape: { "summary": string, "experience": [{ "title": string, "company": string, "location": string, "startDate": string, "endDate": string, "bullets": string[] }], "education": [{ "degree": string, "school": string, "location": string, "startDate": string, "endDate": string, "details": string }], "skills": string[], "projects": [{ "name": string, "description": string, "link": string }], "certifications": [{ "name": string, "issuer": string, "date": string }] }.\n\nContext: ${context}`,
      }],
      { json: true }
    )
    const resume = await db.resume.create({
      data: {
        userId: user.id,
        title: title || 'AI-Generated Resume',
        template: template || 'modern',
        accent: accent || 'emerald',
        careerMode: careerMode || null,
        data: JSON.stringify(data),
        version: 1,
      },
    })
    // seed first version snapshot
    await db.resumeVersion.create({ data: { resumeId: resume.id, version: 1, data: JSON.stringify(data), note: 'AI-generated draft' } })
    return NextResponse.json({ resume })
  } catch (e) {
    return err(e)
  }
}
