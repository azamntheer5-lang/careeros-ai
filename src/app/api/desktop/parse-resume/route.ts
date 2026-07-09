import { NextResponse } from 'next/server'
import { getCurrentUser, err } from '@/lib/server'
import { runResumePipeline } from '@/lib/resume-pipeline'

/**
 * POST /api/desktop/parse-resume
 * Enhanced AI resume pipeline: parse messy text → structured profile → missing info → ATS optimize
 *
 * Body: { rawText: string, jobDescription?: string }
 * Returns: { profile, missingInfo, optimized, warnings }
 */
export async function POST(req: Request) {
  try {
    const user = await getCurrentUser()
    const { rawText, jobDescription } = await req.json()

    if (!rawText?.trim()) {
      return NextResponse.json({ error: 'Raw text is required' }, { status: 400 })
    }

    const result = await runResumePipeline(rawText, jobDescription, user.id, user.name || '')

    return NextResponse.json(result)
  } catch (e) {
    return err(e)
  }
}
