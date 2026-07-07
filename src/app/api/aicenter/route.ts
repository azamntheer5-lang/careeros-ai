import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, err } from '@/lib/server'
import { listPrompts } from '@/lib/prompts'

export async function GET() {
  try {
    const user = await getCurrentUser()

    const usage = await db.aiUsage.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })

    const calls = usage.length
    const tokens = usage.reduce((a, b) => a + b.tokens, 0)
    const cost = usage.reduce((a, b) => a + b.cost, 0)
    const latencies = usage
      .map((u) => u.latencyMs)
      .filter((l): l is number => l != null)
    const avgLatency = latencies.length
      ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
      : 0

    const byFeatureMap = usage.reduce<Record<string, number>>((acc, u) => {
      acc[u.feature] = (acc[u.feature] || 0) + 1
      return acc
    }, {})
    const byModelMap = usage.reduce<Record<string, number>>((acc, u) => {
      const m = u.model || 'balanced'
      acc[m] = (acc[m] || 0) + 1
      return acc
    }, {})

    // 14-day usage series
    const trend: { date: string; calls: number; tokens: number }[] = []
    const now = new Date()
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i)
      const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i + 1)
      const dayRows = usage.filter((u) => {
        const t = new Date(u.createdAt)
        return t >= d && t < next
      })
      trend.push({
        date: `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`,
        calls: dayRows.length,
        tokens: dayRows.reduce((a, b) => a + b.tokens, 0),
      })
    }

    return NextResponse.json({
      prompts: listPrompts(),
      usage: usage.map((u) => ({
        id: u.id,
        feature: u.feature,
        model: u.model,
        tokens: u.tokens,
        cost: u.cost,
        latencyMs: u.latencyMs,
        success: u.success,
        createdAt: u.createdAt,
      })),
      totals: {
        calls,
        tokens,
        cost: Number(cost.toFixed(6)),
        avgLatency,
      },
      byFeature: Object.entries(byFeatureMap).map(([k, v]) => ({
        feature: k,
        calls: v,
      })),
      byModel: Object.entries(byModelMap).map(([k, v]) => ({
        model: k,
        calls: v,
      })),
      trend,
    })
  } catch (e) {
    return err(e)
  }
}
