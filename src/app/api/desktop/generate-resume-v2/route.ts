import { NextResponse } from 'next/server'
import { getCurrentUser, err, clipInput } from '@/lib/server'
import { rateLimitOr429 } from '@/lib/rate-limit'
import { generateResumeV3 } from '@/lib/resume-pipeline-v2'

/**
 * POST /api/desktop/generate-resume-v2
 *
 * V3 Pipeline: 15-stage intelligent analysis → parse + grammar fix + industry-aware enrichment → quality check → score → keywords
 *
 * Body: { rawText: string, jobDescription?: string }
 */
export async function POST(req: Request) {
  try {
    const user = await getCurrentUser()
    const limited = rateLimitOr429(user.id, 'ai_generate')
    if (limited) return limited

    const body = await req.json()
    const { rawText, jobDescription } = body

    if (!rawText?.trim()) {
      return NextResponse.json({ error: 'Raw text is required' }, { status: 400 })
    }

    const clippedText = clipInput(rawText, 15000)
    const clippedJD = jobDescription ? clipInput(jobDescription, 10000) : undefined

    const result = await generateResumeV3(clippedText, clippedJD)

    return NextResponse.json(result)
  } catch (e) {
    return err(e)
  }
}
