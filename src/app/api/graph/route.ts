import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, err } from '@/lib/server'
import { buildUserGraph, persistGraph, loadGraph } from '@/lib/graph'

/** GET the user's career knowledge graph (builds + persists if stale). */
export async function GET() {
  try {
    const user = await getCurrentUser()
    let graph = await loadGraph(user.id)
    // If empty or stale (no nodes), rebuild
    if (graph.nodes.length === 0) {
      const built = await buildUserGraph(user.id)
      await persistGraph(user.id, built)
      graph = await loadGraph(user.id)
    }
    return NextResponse.json({ graph })
  } catch (e) { return err(e) }
}

/** POST to rebuild the graph from scratch. */
export async function POST() {
  try {
    const user = await getCurrentUser()
    const built = await buildUserGraph(user.id)
    await persistGraph(user.id, built)
    const graph = await loadGraph(user.id)
    try { await db.auditLog.create({ data: { userId: user.id, action: 'graph.rebuild', entity: 'GraphNode' } }) } catch {}
    return NextResponse.json({ graph })
  } catch (e) { return err(e) }
}
