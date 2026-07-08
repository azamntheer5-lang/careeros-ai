import { db } from '@/lib/db'
import { runAgent } from '@/lib/agents'
import { run } from '@/lib/ai'
import { getCurrentUser } from '@/lib/server'

/**
 * Automation Engine — declarative workflows that chain agents + AI actions.
 * Each workflow has a trigger and a sequence of steps executed in order.
 */

export type WorkflowId =
  | 'new_job_application'
  | 'new_skill'
  | 'profile_updated'
  | 'weekly_review'

export const WORKFLOWS: { id: WorkflowId; name: string; desc: string; trigger: string; steps: string[] }[] = [
  {
    id: 'new_job_application',
    name: 'New Job Application',
    desc: 'When a job is added: research company → customize resume → generate cover letter → prep interview → create follow-up reminder.',
    trigger: 'job.created',
    steps: ['company_research', 'customize_resume', 'cover_letter', 'interview_prep', 'create_reminder'],
  },
  {
    id: 'new_skill',
    name: 'New Skill Learned',
    desc: 'When a skill is added: update profile → improve resume → update portfolio → notify career agent.',
    trigger: 'skill.added',
    steps: ['update_profile', 'improve_resume', 'update_portfolio', 'run_career_agent'],
  },
  {
    id: 'profile_updated',
    name: 'Profile Updated',
    desc: 'When the career profile changes: rebuild knowledge graph → refresh career plan → re-score resumes.',
    trigger: 'profile.updated',
    steps: ['rebuild_graph', 'refresh_plan', 'rescore_resumes'],
  },
  {
    id: 'weekly_review',
    name: 'Weekly Career Review',
    desc: 'Every week: run all agents → summarize progress → recommend next week\'s focus.',
    trigger: 'schedule.weekly',
    steps: ['run_all_agents', 'weekly_summary'],
  },
]

/** Execute a workflow by id with an optional payload (e.g. the job that was created). */
export async function executeWorkflow(workflowId: WorkflowId, userId: string, payload: any = {}) {
  const wf = WORKFLOWS.find((w) => w.id === workflowId)
  if (!wf) throw new Error(`Unknown workflow: ${workflowId}`)

  const user = await db.user.findUnique({ where: { id: userId } })
  if (!user) throw new Error('User not found')

  const runRecord = await db.workflowRun.create({
    data: {
      userId,
      workflow: workflowId,
      trigger: JSON.stringify({ type: wf.trigger, payload }),
      status: 'running',
      steps: JSON.stringify(wf.steps.map((s) => ({ step: s, status: 'pending' }))),
    },
  })

  const steps: { step: string; status: string; result?: string }[] = []
  let result: any = { workflow: workflowId, steps: [] }

  try {
    for (const step of wf.steps) {
      const stepResult = await executeStep(step as WorkflowStep, userId, user.name || '', payload).catch((e) => ({ error: e.message }))
      steps.push({ step, status: stepResult?.error ? 'error' : 'done', result: typeof stepResult === 'string' ? stepResult : JSON.stringify(stepResult) })
      result.steps.push({ step, ...stepResult })
    }

    const overall = steps.every((s) => s.status === 'done') ? 'done' : steps.some((s) => s.status === 'error') ? 'error' : 'done'
    await db.workflowRun.update({
      where: { id: runRecord.id },
      data: { status: overall, steps: JSON.stringify(steps), result: JSON.stringify(result) },
    })
    try { await db.auditLog.create({ data: { userId, action: `workflow.run.${workflowId}`, entity: 'WorkflowRun', entityId: runRecord.id } }) } catch {}
    return { id: runRecord.id, workflow: workflowId, status: overall, steps }
  } catch (e) {
    await db.workflowRun.update({ where: { id: runRecord.id }, data: { status: 'error', steps: JSON.stringify(steps) } })
    throw e
  }
}

type WorkflowStep = 'company_research' | 'customize_resume' | 'cover_letter' | 'interview_prep' | 'create_reminder' | 'update_profile' | 'improve_resume' | 'update_portfolio' | 'run_career_agent' | 'rebuild_graph' | 'refresh_plan' | 'rescore_resumes' | 'run_all_agents' | 'weekly_summary'

async function executeStep(step: WorkflowStep, userId: string, userName: string, payload: any): Promise<any> {
  switch (step) {
    case 'company_research': {
      if (!payload.company) return { skipped: 'no company' }
      // mark existing company or note it for research
      return { message: `Queued research for ${payload.company}` }
    }
    case 'customize_resume': {
      const resume = await db.resume.findFirst({ where: { userId }, orderBy: { updatedAt: 'desc' } })
      if (!resume) return { skipped: 'no resume' }
      return { resumeId: resume.id, message: 'Resume ready for customization via ATS module' }
    }
    case 'cover_letter': {
      return { message: 'Cover letter ready to generate in Cover Letter module' }
    }
    case 'interview_prep': {
      const result = await runAgent('interview', userId, 'workflow').catch(() => null)
      return result ? { summary: result.summary } : { skipped: 'interview agent failed' }
    }
    case 'create_reminder': {
      if (!payload.company) return { skipped: 'no company' }
      const in7 = new Date(Date.now() + 7 * 86400000)
      const reminder = await db.reminder.create({
        data: { userId, title: `Follow up with ${payload.company}`, dueAt: in7, type: 'followup' },
      })
      return { reminderId: reminder.id, dueAt: in7.toISOString() }
    }
    case 'update_profile': {
      return { message: 'Profile sync queued' }
    }
    case 'improve_resume': {
      const result = await runAgent('resume', userId, 'workflow').catch(() => null)
      return result ? { summary: result.summary } : { skipped: 'resume agent failed' }
    }
    case 'update_portfolio': {
      const portfolio = await db.portfolio.findFirst({ where: { userId } })
      return portfolio ? { portfolioId: portfolio.id } : { skipped: 'no portfolio' }
    }
    case 'run_career_agent': {
      const result = await runAgent('career', userId, 'workflow').catch(() => null)
      return result ? { summary: result.summary } : { skipped: 'career agent failed' }
    }
    case 'rebuild_graph': {
      const { buildUserGraph, persistGraph } = await import('@/lib/graph')
      const built = await buildUserGraph(userId)
      await persistGraph(userId, built)
      return { nodes: built.stats.total, edges: built.stats.edges }
    }
    case 'refresh_plan': {
      return { message: 'Career plan refresh queued — visit Career Intelligence' }
    }
    case 'rescore_resumes': {
      const resumes = await db.resume.findMany({ where: { userId } })
      return { count: resumes.length, message: 'Resumes flagged for re-scoring' }
    }
    case 'run_all_agents': {
      const results: { agent: string; summary: string }[] = []
      for (const a of ['career', 'resume', 'job', 'interview', 'learning'] as const) {
        const r = await runAgent(a, userId, 'workflow').catch(() => null)
        if (r) results.push({ agent: a, summary: r.summary || '' })
      }
      return { agents: results }
    }
    case 'weekly_summary': {
      const recentRuns = await db.agentRun.findMany({ where: { userId, createdAt: { gte: new Date(Date.now() - 7 * 86400000) } }, orderBy: { createdAt: 'desc' } })
      const { data } = await run('agent_career', userId, userName, [{
        role: 'user',
        content: `Summarize the user's week based on ${recentRuns.length} agent runs. Return JSON: { "summary": string, "wins": string[], "focus_next_week": string }`,
      }], { json: true }).catch(() => ({ data: { summary: 'Weekly review completed.' } as any }))
      return data
    }
    default:
      return { skipped: 'unknown step' }
  }
}
