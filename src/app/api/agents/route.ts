import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, err } from '@/lib/server'
import { AGENTS, runAgent, AgentId } from '@/lib/agents'
import { rateLimitOr429 } from '@/lib/rate-limit'

/** GET agent run history + agent definitions. */
export async function GET() {
  try {
    const user = await getCurrentUser()
    const limited = rateLimitOr429(user.id, 'ai_analyze')
    if (limited) return limited
    const runs = await db.agentRun.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 30,
    })
    return NextResponse.json({
      agents: AGENTS,
      runs: runs.map((r) => ({
        ...r,
        actions: r.actions ? JSON.parse(r.actions) : [],
        insights: r.insights ? JSON.parse(r.insights) : [],
      })),
    })
  } catch (e) { return err(e) }
}

/** POST to run a specific agent. */
export async function POST(req: Request) {
  try {
    const user = await getCurrentUser()
    const { agent, trigger } = await req.json()
    if (!AGENTS.some((a) => a.id === agent)) {
      return NextResponse.json({ error: 'Unknown agent' }, { status: 400 })
    }
    const result = await runAgent(agent as AgentId, user.id, trigger || 'manual')
    return NextResponse.json({ run: result })
  } catch (e) { return err(e) }
}
