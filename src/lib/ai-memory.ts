import { db } from '@/lib/db'
import { ChatMessage } from '@/lib/ai'

/**
 * AI Memory System — builds a persistent career-profile context block that is
 * injected into every LLM call, so every module "remembers" the user.
 */
export type CareerProfileMemory = {
  name: string
  targetRole: string
  industry: string
  seniority: string
  experienceYears: number
  targetSalary: string
  location: string
  workMode: string
  careerGoals: string
  timeline: string
  strengths: string[]
  values: string[]
  brandStatement: string
  topSkills: string[]
  currentCompany: string
  currentTitle: string
}

export async function loadProfileMemory(userId: string): Promise<CareerProfileMemory | null> {
  const profile = await db.careerProfile.findUnique({ where: { userId } })
  if (!profile) return null

  // Pull top skills + current role from the most recent resume for richer memory.
  const latestResume = await db.resume.findFirst({
    where: { userId }, orderBy: { updatedAt: 'desc' },
  })
  let topSkills: string[] = []
  let currentCompany = ''
  let currentTitle = ''
  if (latestResume) {
    try {
      const d = JSON.parse(latestResume.data)
      topSkills = (d.skills || []).slice(0, 12)
      const exp = (d.experience || [])[0]
      if (exp) { currentTitle = exp.title; currentCompany = exp.company }
    } catch {}
  }

  return {
    name: '', // filled by caller from user record
    targetRole: profile.targetRole || '',
    industry: profile.industry || '',
    seniority: profile.seniority || '',
    experienceYears: profile.experienceYears ?? 0,
    targetSalary: profile.targetSalary || '',
    location: profile.location || '',
    workMode: profile.workMode || '',
    careerGoals: profile.careerGoals || '',
    timeline: profile.timeline || '',
    strengths: safeArr(profile.strengths),
    values: safeArr(profile.values),
    brandStatement: profile.brandStatement || '',
    topSkills,
    currentCompany,
    currentTitle,
  }
}

function safeArr(s: string | null | undefined): string[] {
  if (!s) return []
  try { const a = JSON.parse(s); return Array.isArray(a) ? a : [] } catch { return [] }
}

/** Build the system "memory" preamble injected into every prompt. */
export function memoryBlock(m: CareerProfileMemory, userName: string): string {
  const lines: string[] = [`CANDIDATE PROFILE MEMORY (use this to personalize every response):`]
  if (userName) lines.push(`- Name: ${userName}`)
  if (m.targetRole) lines.push(`- Target role: ${m.targetRole}`)
  if (m.seniority) lines.push(`- Seniority: ${m.seniority}`)
  if (m.experienceYears) lines.push(`- Experience: ${m.experienceYears} years`)
  if (m.industry) lines.push(`- Industry: ${m.industry}`)
  if (m.currentTitle || m.currentCompany) lines.push(`- Current: ${m.currentTitle || ''}${m.currentCompany ? ` at ${m.currentCompany}` : ''}`)
  if (m.location) lines.push(`- Location: ${m.location}`)
  if (m.workMode) lines.push(`- Work mode: ${m.workMode}`)
  if (m.targetSalary) lines.push(`- Target salary: ${m.targetSalary}`)
  if (m.timeline) lines.push(`- Goal timeline: ${m.timeline}`)
  if (m.topSkills.length) lines.push(`- Top skills: ${m.topSkills.join(', ')}`)
  if (m.strengths.length) lines.push(`- Strengths: ${m.strengths.join(', ')}`)
  if (m.values.length) lines.push(`- Values: ${m.values.join(', ')}`)
  if (m.careerGoals) lines.push(`- Career goals: ${m.careerGoals}`)
  if (m.brandStatement) lines.push(`- Brand statement: ${m.brandStatement}`)
  if (lines.length === 1) return ''
  return lines.join('\n')
}

// local import to avoid cycle
import { PROMPTS } from '@/lib/prompts'
function getPromptDef(key: string) {
  return PROMPTS[key] ?? { key, version: 1, model: 'balanced' as const, system: 'You are a helpful assistant.' }
}
