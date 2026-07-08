import { db } from '@/lib/db'

/**
 * Career Knowledge Graph builder.
 * Reconstructs the user's professional identity as nodes + edges across
 * experience, skills, projects, education, certificates, goals, jobs,
 * companies, interviews and achievements.
 */

export type GraphNodeKind =
  | 'experience' | 'skill' | 'project' | 'education' | 'certificate'
  | 'goal' | 'job' | 'company' | 'interview' | 'achievement'

export type BuiltGraph = {
  nodes: { id: string; kind: GraphNodeKind; label: string; value?: any; weight: number }[]
  edges: { from: string; to: string; rel: string; weight: number }[]
  stats: { total: number; byKind: Record<string, number>; edges: number }
}

/** Build (and persist) the user's career graph from all their data. */
export async function buildUserGraph(userId: string): Promise<BuiltGraph> {
  const [profile, resumes, jobs, interviews, skillProfiles] = await Promise.all([
    db.careerProfile.findUnique({ where: { userId } }),
    db.resume.findMany({ where: { userId }, orderBy: { updatedAt: 'desc' } }),
    db.job.findMany({ where: { userId } }),
    db.interview.findMany({ where: { userId } }),
    db.skillProfile.findMany({ where: { userId } }),
  ])

  const nodes: BuiltGraph['nodes'] = []
  const edges: BuiltGraph['edges'] = []
  const nodeKey = new Map<string, string>() // kind|label -> temp id

  const addNode = (kind: GraphNodeKind, label: string, value?: any, weight = 1) => {
    const key = `${kind}|${label.toLowerCase()}`
    if (nodeKey.has(key)) {
      // increment weight for duplicates
      const existing = nodes.find((n) => n.kind === kind && n.label.toLowerCase() === label.toLowerCase())
      if (existing) existing.weight += 1
      return nodeKey.get(key)!
    }
    const id = `${kind}_${nodeKey.size}`
    nodeKey.set(key, id)
    nodes.push({ id, kind, label, value, weight })
    return id
  }
  const addEdge = (from: string, to: string, rel: string, weight = 1) => {
    if (from === to) return
    if (edges.some((e) => e.from === from && e.to === to && e.rel === rel)) {
      const e = edges.find((e) => e.from === from && e.to === to && e.rel === rel)!
      e.weight += 1
      return
    }
    edges.push({ from, to, rel, weight })
  }

  // Goal node (target role)
  if (profile?.targetRole) {
    const goalId = addNode('goal', profile.targetRole, { timeline: profile.timeline }, 5)
    if (profile.strengths) {
      try { JSON.parse(profile.strengths).forEach((s: string) => {
        const sid = addNode('skill', s, {}, 2)
        addEdge(sid, goalId, 'targets')
      }) } catch {}
    }
  }

  // From the most complete resume (the latest), build experience/skills/projects/education/certs
  if (resumes[0]) {
    try {
      const d = JSON.parse(resumes[0].data)
      for (const exp of d.experience || []) {
        const expId = addNode('experience', `${exp.title} @ ${exp.company}`, exp, 3)
        const compId = addNode('company', exp.company, { location: exp.location })
        addEdge(expId, compId, 'worked_at')
        // each bullet = achievement
        for (const b of exp.bullets || []) {
          const achId = addNode('achievement', b.slice(0, 80), { full: b })
          addEdge(achId, expId, 'achieved')
        }
      }
      for (const s of d.skills || []) {
        const sid = addNode('skill', s, {}, 2)
        // skills target the goal
        if (profile?.targetRole) {
          const goalId = nodeKey.get(`goal|${profile.targetRole.toLowerCase()}`)
          if (goalId) addEdge(sid, goalId, 'targets')
        }
        // skills used in experience
        for (const exp of d.experience || []) {
          const expId = nodeKey.get(`experience|${`${exp.title} @ ${exp.company}`.toLowerCase()}`)
          if (expId) addEdge(expId, sid, 'uses')
        }
      }
      for (const p of d.projects || []) {
        const pid = addNode('project', p.name, { description: p.description, link: p.link }, 2)
        if (profile?.targetRole) {
          const goalId = nodeKey.get(`goal|${profile.targetRole.toLowerCase()}`)
          if (goalId) addEdge(pid, goalId, 'targets')
        }
      }
      for (const ed of d.education || []) {
        const edId = addNode('education', `${ed.degree} @ ${ed.school}`, ed, 2)
        if (profile?.targetRole) {
          const goalId = nodeKey.get(`goal|${profile.targetRole.toLowerCase()}`)
          if (goalId) addEdge(edId, goalId, 'requires')
        }
      }
      for (const c of d.certifications || []) {
        const cid = addNode('certificate', c.name, { issuer: c.issuer, date: c.date })
        if (profile?.targetRole) {
          const goalId = nodeKey.get(`goal|${profile.targetRole.toLowerCase()}`)
          if (goalId) addEdge(cid, goalId, 'targets')
        }
      }
    } catch {}
  }

  // Jobs (applications)
  for (const job of jobs) {
    const jobId = addNode('job', `${job.role} @ ${job.company}`, { status: job.status, priority: job.priority })
    const compId = addNode('company', job.company)
    addEdge(jobId, compId, 'applied_to')
    if (profile?.targetRole) {
      const goalId = nodeKey.get(`goal|${profile.targetRole.toLowerCase()}`)
      if (goalId) addEdge(jobId, goalId, 'targets')
    }
  }

  // Interviews
  for (const iv of interviews) {
    const ivId = addNode('interview', `${iv.type} interview — ${iv.role}`, { score: iv.score, status: iv.status })
    if (iv.company) {
      const compId = addNode('company', iv.company)
      addEdge(ivId, compId, 'interviewed_at')
    }
  }

  // Skill gaps from skill profiles → required edges
  for (const sp of skillProfiles) {
    try {
      const gaps = JSON.parse(sp.gaps || '[]')
      for (const g of gaps) {
        const sid = addNode('skill', g.skill, { gap: g.gap, priority: g.priority }, 1)
        if (profile?.targetRole) {
          const goalId = nodeKey.get(`goal|${profile.targetRole.toLowerCase()}`)
          if (goalId) addEdge(goalId, sid, 'requires', 3)
        }
      }
    } catch {}
  }

  const byKind: Record<string, number> = {}
  for (const n of nodes) byKind[n.kind] = (byKind[n.kind] || 0) + 1

  return { nodes, edges, stats: { total: nodes.length, byKind, edges: edges.length } }
}

/** Persist the built graph to the DB (upsert nodes + replace edges). */
export async function persistGraph(userId: string, graph: BuiltGraph) {
  // Clear old nodes (cascades to edges)
  await db.graphNode.deleteMany({ where: { userId } })
  // Insert nodes, mapping temp ids -> real ids
  const idMap = new Map<string, string>()
  for (const n of graph.nodes) {
    const created = await db.graphNode.create({
      data: {
        userId,
        kind: n.kind,
        label: n.label,
        value: n.value ? JSON.stringify(n.value) : null,
        weight: n.weight,
      },
    })
    idMap.set(n.id, created.id)
  }
  // Insert edges
  for (const e of graph.edges) {
    const from = idMap.get(e.from)
    const to = idMap.get(e.to)
    if (!from || !to) continue
    try {
      await db.graphEdge.create({ data: { fromId: from, toId: to, rel: e.rel, weight: e.weight } })
    } catch {}
  }
}

/** Load the persisted graph from the DB (for display). */
export async function loadGraph(userId: string): Promise<BuiltGraph> {
  const [nodes, edges] = await Promise.all([
    db.graphNode.findMany({ where: { userId }, include: { edgesFrom: true, edgesTo: true } }),
    db.graphEdge.findMany({}),
  ])
  const idMap = new Map<string, string>()
  const dbNodes = nodes.map((n) => {
    const tempId = `n_${n.id.slice(-6)}`
    idMap.set(n.id, tempId)
    return {
      id: tempId,
      kind: n.kind as GraphNodeKind,
      label: n.label,
      value: n.value ? safeParse(n.value) : undefined,
      weight: n.weight,
    }
  })
  const dbEdges = edges
    .filter((e) => idMap.has(e.fromId) && idMap.has(e.toId))
    .map((e) => ({ from: idMap.get(e.fromId)!, to: idMap.get(e.toId)!, rel: e.rel, weight: e.weight }))
  const byKind: Record<string, number> = {}
  for (const n of dbNodes) byKind[n.kind] = (byKind[n.kind] || 0) + 1
  return { nodes: dbNodes, edges: dbEdges, stats: { total: dbNodes.length, byKind, edges: dbEdges.length } }
}

function safeParse(s: string): any { try { return JSON.parse(s) } catch { return s } }
