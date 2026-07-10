import { NextResponse } from 'next/server'
import { getCurrentUser, err, clipInput } from '@/lib/server'
import { rateLimitOr429 } from '@/lib/rate-limit'
import { generateResumeOptimized } from '@/lib/resume-pipeline-v4'

/**
 * POST /api/desktop/generate-resume-v2
 *
 * V4 Optimized Pipeline: 1-2 AI calls (down from 7)
 * - LOCAL: OCR cleanup, language detection, dedup, keyword extraction, scoring
 * - AI Call 1: Parse + Extract + Enrich + ATS optimize (single prompt)
 * - AI Call 2 (optional): Quality check + profession detection
 *
 * Body: { rawText: string, jobDescription?: string, runQualityCheck?: boolean }
 */
export async function POST(req: Request) {
  try {
    const user = await getCurrentUser()
    const limited = rateLimitOr429(user.id, 'ai_generate')
    if (limited) return limited

    const body = await req.json()
    const { rawText, jobDescription, runQualityCheck } = body

    if (!rawText?.trim()) {
      return NextResponse.json({ error: 'Raw text is required' }, { status: 400 })
    }

    const clippedText = clipInput(rawText, 15000)
    const clippedJD = jobDescription ? clipInput(jobDescription, 10000) : undefined

    const result = await generateResumeOptimized(clippedText, clippedJD, {
      runQualityCheck: runQualityCheck ?? false, // default: skip quality check for speed
    })

    return NextResponse.json(result)
  } catch (e) {
    return err(e)
  }
}
