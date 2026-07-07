import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, err } from '@/lib/server'
import { WORKFLOWS, executeWorkflow, WorkflowId } from '@/lib/automation'

/** GET workflow registry + run history. */
export async function GET() {
  try {
    const user = await getCurrentUser()
    const runs = await db.workflowRun.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
    })
    return NextResponse.json({
      workflows: WORKFLOWS,
      runs: runs.map((r) => ({
        ...r,
        steps: r.steps ? JSON.parse(r.steps) : [],
        result: r.result ? JSON.parse(r.result) : null,
        trigger: r.trigger ? JSON.parse(r.trigger) : null,
      })),
    })
  } catch (e) { return err(e) }
}

/** POST to execute a workflow manually. */
export async function POST(req: Request) {
  try {
    const user = await getCurrentUser()
    const { workflow, payload } = await req.json()
    if (!WORKFLOWS.some((w) => w.id === workflow)) {
      return NextResponse.json({ error: 'Unknown workflow' }, { status: 400 })
    }
    const result = await executeWorkflow(workflow as WorkflowId, user.id, payload || {})
    return NextResponse.json({ run: result })
  } catch (e) { return err(e) }
}
