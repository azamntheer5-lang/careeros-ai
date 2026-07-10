import { NextResponse } from 'next/server'
import { getCurrentUser, err } from '@/lib/server'
import { rateLimitOr429 } from '@/lib/rate-limit'
import { translateResume, BilingualResume } from '@/lib/resume-operations'

/**
 * POST /api/desktop/translate-resume
 * Translate a resume between Arabic and English.
 *
 * Body: { resume: BilingualResume, targetLang: 'ar' | 'en' }
 */
export async function POST(req: Request) {
  try {
    const user = await getCurrentUser()
    const limited = rateLimitOr429(user.id, 'ai_analyze')
    if (limited) return limited

    const { resume, targetLang } = await req.json()

    if (!resume || !targetLang) {
      return NextResponse.json({ error: 'Resume and target language are required' }, { status: 400 })
    }

    if (!['ar', 'en'].includes(targetLang)) {
      return NextResponse.json({ error: 'targetLang must be "ar" or "en"' }, { status: 400 })
    }

    const translated = await translateResume(resume as BilingualResume, targetLang as 'ar' | 'en')

    return NextResponse.json({ resume: translated })
  } catch (e) {
    return err(e)
  }
}
