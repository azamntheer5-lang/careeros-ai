import { db } from '@/lib/db'
import { run } from '@/lib/ai'
import { buildUserGraph } from '@/lib/graph'

/**
 * AI Agent Ecosystem — 5 autonomous agents sharing one career memory.
 * Each agent analyzes the user's complete state and returns structured actions + insights.
 */

export type AgentId = 'career' | 'resume' | 'job' | 'interview' | 'learning'

export const AGENTS: { id: AgentId; name: string; icon: string; color: string; desc: string }[] = [
  { id: 'career', name: 'Career Agent', icon: 'Compass', color: 'oklch(0.7 0.15 162)', desc: 'Your chief of staff — tracks goals and suggests the highest-leverage next actions.' },
  { id: 'resume', name: 'Resume Agent', icon: 'FileText', color: 'oklch(0.7 0.13 200)', desc: 'Continuously improves resumes — detects stale info and weak bullets.' },
  { id: 'job', name: 'Job Agent', icon: 'Briefcase', color: 'oklch(0.75 0.15 80)', desc: 'Analyzes your pipeline — recommends follow-ups and new opportunities.' },
  { id: 'interview', name: 'Interview Agent', icon: 'Mic', color: 'oklch(0.65 0.2 300)', desc: 'Builds your daily practice plan based on gaps and past performance.' },
  { id: 'learning', name: 'Learning Agent', icon: 'GraduationCap', color: 'oklch(0.68 0.2 30)', desc: 'Ranks the next skills to learn for your target role, with courses.' },
]

const PROMPT_KEY: Record<AgentId, string> = {
  career: 'agent_career',
  resume: 'agent_resume',
  job: 'agent_job',
  interview: 'agent_interview',
  learning: 'agent_learning',
}

/** Build the shared career memory context all agents read. */
async function buildAgentContext(userId: string): Promise<string> {
  const [user, profile, resumes, jobs, interviews, skillProfiles, agentRuns] = await Promise.all([
    db.user.findUnique({ where: { id: userId } }),
    db.careerProfile.findUnique({ where: { userId } }),
    db.resume.findMany({ where: { userId }, orderBy: { updatedAt: 'desc' }, take: 3 }),
    db.job.findMany({ where: { userId } }),
    db.interview.findMany({ where: { userId }, take: 5 }),
    db.skillProfile.findMany({ where: { userId }, take: 1, orderBy: { updatedAt: 'desc' } }),
    db.agentRun.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 5 }),
  ])

  const parts: string[] = []
  if (profile) {
    parts.push(`TARGET: ${profile.targetRole || 'unset'} | SENIORITY: ${profile.seniority || 'unset'} | EXPERIENCE: ${profile.experienceYears || 0}y | INDUSTRY: ${profile.industry || 'unset'} | TIMELINE: ${profile.timeline || 'unset'}`)
    if (profile.careerGoals) parts.push(`GOALS: ${profile.careerGoals}`)
    if (profile.strengths) parts.push(`STRENGTHS: ${profile.strengths}`)
  }
  if (resumes[0]) {
    try {
      const d = JSON.parse(resumes[0].data)
      parts.push(`LATEST RESUME: ${resumes[0].title}, ${d.experience?.length || 0} roles, ${d.skills?.length || 0} skills, aiScore=${resumes[0].aiScore || 'n/a'}, atsScore=${resumes[0].atsScore || 'n/a'}`)
      if (d.experience?.[0]) parts.push(`CURRENT ROLE: ${d.experience[0].title} @ ${d.experience[0].company}`)
    } catch {}
  }
  if (jobs.length) {
    const byStatus: Record<string, number> = {}
    jobs.forEach((j) => { byStatus[j.status] = (byStatus[j.status] || 0) + 1 })
    parts.push(`JOBS: ${jobs.length} total — ${JSON.stringify(byStatus)}`)
  }
  if (interviews.length) {
    const avg = interviews.filter((i) => i.score).reduce((a, i) => a + (i.score || 0), 0) / (interviews.filter((i) => i.score).length || 1)
    parts.push(`INTERVIEWS: ${interviews.length} sessions, avg score=${Math.round(avg)}`)
  }
  if (skillProfiles[0]) {
    try {
      const sp = skillProfiles[0]
      const gaps = JSON.parse(sp.gaps || '[]')
      parts.push(`SKILL GAPS: ${gaps.length} identified — ${gaps.slice(0, 5).map((g: any) => g.skill).join(', ')}`)
    } catch {}
  }
  if (agentRuns.length) parts.push(`RECENT AGENT RUNS: ${agentRuns.length} (last: ${agentRuns[0]?.agent} ${agentRuns[0]?.status})`)
  return parts.join('\n')
}

const AGENT_PROMPT: Record<AgentId, string> = {
  career: `Based on the user's complete career state, return JSON: { "summary": string (1-2 sentence assessment), "actions": [{ "title": string, "why": string, "priority": "high"|"medium"|"low", "module": "resume"|"jobs"|"interview"|"skills"|"coach"|"ats" }], "insights": string[] (3 insights about their trajectory) }`,
  resume: `Analyze the user's resume state. Return JSON: { "summary": string, "actions": [{ "title": string, "why": string, "priority": "high"|"medium"|"low", "module": "resume" }], "insights": string[] (3 — e.g. stale info, weak bullets, missing keywords) }`,
  job: `Analyze the user's job pipeline. Return JSON: { "summary": string, "actions": [{ "title": string, "why": string, "priority": "high"|"medium"|"low", "module": "jobs" }], "insights": string[] (3 — stalled apps, follow-up needs, opportunity gaps) }`,
  interview: `Create a personalized daily practice plan. Return JSON: { "summary": string, "actions": [{ "title": string, "why": string, "priority": "high"|"medium"|"low", "module": "interview" }], "insights": string[] (3 — focus areas, question types to drill) }`,
  learning: `Recommend the next skills to learn. Return JSON: { "summary": string, "actions": [{ "title": string, "why": string, "priority": "high"|"medium"|"low", "module": "skills" }], "insights": string[] (3 — highest-ROI skills + courses) }`,
}

/** Run an agent: builds context, calls the LLM via the orchestrated gateway, persists the run. */
export async function runAgent(agent: AgentId, userId: string, trigger: string = 'manual') {
  const user = await db.user.findUnique({ where: { id: userId } })
  if (!user) throw new Error('User not found')

  const context = await buildAgentContext(userId)
  const graph = await buildUserGraph(userId).catch(() => null)
  const graphSummary = graph ? `CAREER GRAPH: ${graph.stats.total} nodes (${Object.entries(graph.stats.byKind).map(([k, v]) => `${k}:${v}`).join(', ')}), ${graph.stats.edges} connections` : ''

  const runRecord = await db.agentRun.create({
    data: { userId, agent, status: 'running', trigger },
  })

  try {
    const { data } = await run<any>(
      PROMPT_KEY[agent],
      userId,
      user.name || '',
      [{
        role: 'user',
        content: `AGENT CONTEXT:\n${context}\n${graphSummary}\n\n${AGENT_PROMPT[agent]}`,
      }],
      { json: true }
    )

    await db.agentRun.update({
      where: { id: runRecord.id },
      data: {
        status: 'done',
        summary: data.summary || 'Agent completed.',
        actions: JSON.stringify(data.actions || []),
        insights: JSON.stringify(data.insights || []),
      },
    })

    try { await db.auditLog.create({ data: { userId, action: `agent.run.${agent}`, entity: 'AgentRun', entityId: runRecord.id } }) } catch {}
    return { id: runRecord.id, agent, summary: data.summary, actions: data.actions || [], insights: data.insights || [] }
  } catch (e) {
    await db.agentRun.update({ where: { id: runRecord.id }, data: { status: 'error', summary: (e as Error).message } })
    throw e
  }
}
