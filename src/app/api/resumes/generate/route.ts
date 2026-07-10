import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { run, sanitizePromptInput } from '@/lib/ai'
import { getCurrentUser, err, clipInput } from '@/lib/server'
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

    // SECURITY: clip + sanitize the user-supplied context before interpolating
    // it into the LLM prompt. clipInput bounds cost; sanitizePromptInput strips
    // common prompt-injection patterns ("ignore previous instructions",
    // "[SYSTEM]", "you are now …", control chars) so an attacker can't
    // redirect the model away from its registered system prompt.
    const safeContext = sanitizePromptInput(clipInput(context, 15000), 15000)
    // SECURITY: clip and validate enum-style scalar fields before persisting.
    const safeTitle = clipInput(title, 200) || 'AI-Generated Resume'
    const safeTemplate = clipInput(template, 50) || 'modern'
    const safeAccent = clipInput(accent, 50) || 'emerald'
    const safeCareerMode = clipInput(careerMode, 100)

    const { data } = await run<any>(
      'resume_generate',
      user.id,
      user.name || '',
      [{
        role: 'user',
        content: `Create a complete resume from this context${safeCareerMode ? ` optimized for a ${safeCareerMode} career track` : ''}. Return JSON with shape: { "summary": string, "experience": [{ "title": string, "company": string, "location": string, "startDate": string, "endDate": string, "bullets": string[] }], "education": [{ "degree": string, "school": string, "location": string, "startDate": string, "endDate": string, "details": string }], "skills": string[], "projects": [{ "name": string, "description": string, "link": string }], "certifications": [{ "name": string, "issuer": string, "date": string }] }.\n\nContext: ${safeContext}`,
      }],
      { json: true }
    )
    const resume = await db.resume.create({
      data: {
        userId: user.id,
        title: safeTitle,
        template: safeTemplate,
        accent: safeAccent,
        careerMode: safeCareerMode || null,
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
