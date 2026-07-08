import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, err } from '@/lib/server'
import { requireAdmin } from '@/lib/auth'

// Default flags seeded on first GET if the table is empty.
const DEFAULT_FLAGS = [
  {
    key: 'voice_interviews',
    description: 'Voice-mode interview simulator with confidence scoring',
    enabled: true,
    rollout: 100,
  },
  {
    key: 'portfolio_public',
    description: 'Public portfolio publishing with custom slug + QR code',
    enabled: true,
    rollout: 100,
  },
  {
    key: 'ai_coach',
    description: 'Career coach with multi-turn memory and profile awareness',
    enabled: true,
    rollout: 100,
  },
  {
    key: 'ats_v2',
    description: 'Next-gen ATS engine with competitor comparison',
    enabled: true,
    rollout: 100,
  },
  {
    key: 'ats_recruiter_sim',
    description: '6-second recruiter snap-judgment simulation',
    enabled: true,
    rollout: 100,
  },
  {
    key: 'career_intelligence',
    description: 'Unified career plan + market insights dashboard',
    enabled: true,
    rollout: 100,
  },
]

async function ensureSeeded() {
  const count = await db.featureFlag.count()
  if (count === 0) {
    await db.featureFlag.createMany({ data: DEFAULT_FLAGS })
  }
}

/** List all feature flags (seeds defaults if empty). */
export async function GET() {
  try {
    await getCurrentUser()
    await ensureSeeded()
    const flags = await db.featureFlag.findMany({ orderBy: { key: 'asc' } })
    return NextResponse.json({ flags })
  } catch (e) {
    return err(e)
  }
}

/** Update a flag's enabled state and/or rollout percentage. Admin-only. */
export async function PUT(req: Request) {
  try {
    const user = await getCurrentUser()
    requireAdmin(user)  // RBAC: only admins can toggle feature flags
    const body = await req.json()
    const key = String(body.key || '')
    if (!key) {
      return NextResponse.json({ error: 'key required' }, { status: 400 })
    }

    const data: { enabled?: boolean; rollout?: number } = {}
    if (typeof body.enabled === 'boolean') data.enabled = body.enabled
    if (typeof body.rollout === 'number') {
      data.rollout = Math.max(0, Math.min(100, Math.round(body.rollout)))
    }
    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'no fields to update' }, { status: 400 })
    }

    const flag = await db.featureFlag.update({ where: { key }, data })
    try {
      await db.auditLog.create({
        data: {
          userId: user.id,
          action: 'flag.update',
          entity: 'FeatureFlag',
          entityId: flag.id,
          meta: JSON.stringify({ key, ...data }),
        },
      })
    } catch {}
    return NextResponse.json({ flag })
  } catch (e) {
    return err(e)
  }
}
