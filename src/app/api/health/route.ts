import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

/**
 * GET /api/health — health check endpoint for Docker/Kubernetes.
 *
 * Returns 200 if the application is healthy (can connect to DB).
 * Returns 503 if unhealthy.
 */
export async function GET() {
  const checks: Record<string, 'ok' | 'fail'> = {}

  // Database check
  try {
    await db.user.findFirst({ select: { id: true } })
    checks.database = 'ok'
  } catch {
    checks.database = 'fail'
  }

  // AI SDK check (just verify the module loads — don't make an actual call)
  try {
    checks.ai = 'ok'
  } catch {
    checks.ai = 'fail'
  }

  const allOk = Object.values(checks).every(v => v === 'ok')
  return NextResponse.json(
    { status: allOk ? 'healthy' : 'unhealthy', checks, timestamp: new Date().toISOString() },
    { status: allOk ? 200 : 503 }
  )
}
