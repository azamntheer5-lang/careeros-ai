import { NextResponse } from 'next/server'
import { getCurrentUser, err, clipInput } from '@/lib/server'
import { rateLimitOr429 } from '@/lib/rate-limit'
import { rewriteSection } from '@/lib/resume-operations'

/**
 * POST /api/desktop/rewrite-section
 * Rewrite a specific section of a resume (objective, experience, skills, education).
 *
 * Body: { section: 'objective'|'experience'|'skills'|'education', content: any, jobDescription?: string }
 */
export async function POST(req: Request) {
  try {
    const user = await getCurrentUser()
    const limited = rateLimitOr429(user.id, 'ai_chat')
    if (limited) return limited

    const { section, content, jobDescription } = await req.json()

    if (!section || !content) {
      return NextResponse.json({ error: 'Section and content are required' }, { status: 400 })
    }

    const validSections = ['objective', 'experience', 'skills', 'education']
    if (!validSections.includes(section)) {
      return NextResponse.json({ error: 'Invalid section' }, { status: 400 })
    }

    const result = await rewriteSection(
      section as 'objective' | 'experience' | 'skills' | 'education',
      content,
      jobDescription ? clipInput(jobDescription, 3000) : undefined
    )

    return NextResponse.json({ result })
  } catch (e) {
    return err(e)
  }
}
