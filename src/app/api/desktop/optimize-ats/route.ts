import { NextResponse } from 'next/server'
import { getCurrentUser, err } from '@/lib/server'
import { optimizeForATS } from '@/lib/resume-pipeline'

/**
 * POST /api/desktop/optimize-ats
 * ATS-optimize an existing resume profile against a job description.
 *
 * Body: { profile: ParsedProfile, jobDescription: string }
 */
export async function POST(req: Request) {
  try {
    const user = await getCurrentUser()
    const { profile, jobDescription } = await req.json()

    if (!profile || !jobDescription?.trim()) {
      return NextResponse.json({ error: 'Profile and job description are required' }, { status: 400 })
    }

    const optimized = await optimizeForATS(profile, jobDescription)

    return NextResponse.json({ optimized })
  } catch (e) {
    return err(e)
  }
}
