import { NextResponse } from 'next/server'
import { getCurrentUser, err, clipInput } from '@/lib/server'
import { rateLimitOr429 } from '@/lib/rate-limit'
import { generateResumeFromRawText } from '@/lib/resume-pipeline-v2'

/**
 * POST /api/desktop/generate-resume-v2
 *
 * Enhanced AI resume generation pipeline.
 * Accepts: raw text (WhatsApp export, OCR, notes, mixed AR/EN, incomplete)
 * Returns: structured bilingual resume + score + missing info + keywords
 *
 * Body: {
 *   rawText: string,
 *   jobDescription?: string,
 *   enrich?: boolean (default true),
 *   optimizeATS?: boolean (default true)
 * }
 */
export async function POST(req: Request) {
  try {
    const user = await getCurrentUser()
    const limited = rateLimitOr429(user.id, 'ai_generate')
    if (limited) return limited

    const body = await req.json()
    const { rawText, jobDescription, enrich, optimizeATS } = body

    if (!rawText?.trim()) {
      return NextResponse.json({ error: 'Raw text is required' }, { status: 400 })
    }

    // Limit input size
    const clippedText = clipInput(rawText, 15000)
    const clippedJD = jobDescription ? clipInput(jobDescription, 10000) : undefined

    const result = await generateResumeFromRawText(clippedText, clippedJD, { enrich, optimizeATS })

    return NextResponse.json(result)
  } catch (e) {
    return err(e)
  }
}
