/** Shared domain types for CareerOS AI. */

export type Contact = {
  name: string
  email: string
  phone: string
  location: string
  website: string
  linkedin: string
}

export type Experience = {
  id: string
  title: string
  company: string
  location: string
  startDate: string
  endDate: string
  bullets: string[]
}

export type Education = {
  id: string
  degree: string
  school: string
  location: string
  startDate: string
  endDate: string
  details: string
}

export type Project = {
  id: string
  name: string
  description: string
  link: string
}

export type Certification = {
  id: string
  name: string
  issuer: string
  date: string
}

export type ResumeData = {
  contact: Contact
  summary: string
  experience: Experience[]
  education: Education[]
  skills: string[]
  projects: Project[]
  certifications: Certification[]
}

export type ResumeMeta = {
  id: string
  title: string
  template: string
  accent: string
  font: string
  spacing: string
  atsScore: number | null
  version: number
  updatedAt: string
  data: ResumeData
}

export type Job = {
  id: string
  company: string
  role: string
  location: string | null
  salary: string | null
  url: string | null
  status: string
  priority: string
  notes: string | null
  deadline: string | null
  appliedAt: string | null
  updatedAt: string
}

export type CoverLetter = {
  id: string
  type: string
  company: string | null
  role: string | null
  content: string
  updatedAt: string
}

export type CoachMessage = { role: 'user' | 'assistant'; content: string }

export type CoachSession = {
  id: string
  title: string
  focus: string
  messages: CoachMessage[]
  updatedAt: string
}

export type InterviewMessage = {
  role: 'assistant' | 'user'
  content: string
  evaluation?: {
    score: number
    strengths: string[]
    improvements: string[]
    modelAnswer: string
    feedback: string
  }
}

export type Interview = {
  id: string
  type: string
  role: string
  company: string | null
  status: string
  messages: InterviewMessage[]
  score: number | null
  summary: string | null
  updatedAt: string
}

export const TEMPLATES = [
  { id: 'modern', name: 'Modern', desc: 'Clean single-column with subtle accents' },
  { id: 'executive', name: 'Executive', desc: 'Serif headers, centered name' },
  { id: 'technical', name: 'Technical', desc: 'Skill-forward, monospace touches' },
  { id: 'creative', name: 'Creative', desc: 'Two-column with sidebar' },
  { id: 'ats', name: 'ATS-Safe', desc: 'Plain, parser-friendly' },
  { id: 'minimal', name: 'Minimal', desc: 'Maximum whitespace' },
] as const

export const ACCENTS = [
  { id: 'emerald', hue: 162 },
  { id: 'teal', hue: 180 },
  { id: 'amber', hue: 70 },
  { id: 'rose', hue: 20 },
  { id: 'violet', hue: 300 },
  { id: 'slate', hue: 240 },
] as const

export function emptyResumeData(): ResumeData {
  return {
    contact: { name: '', email: '', phone: '', location: '', website: '', linkedin: '' },
    summary: '',
    experience: [],
    education: [],
    skills: [],
    projects: [],
    certifications: [],
  }
}

export function uid() {
  return Math.random().toString(36).slice(2, 10)
}

/** Ensures every list item has a stable id (seed/AI-generated data may omit them). */
export function normalizeResumeData(d: ResumeData): ResumeData {
  return {
    contact: { ...d.contact },
    summary: d.summary || '',
    experience: (d.experience || []).map((e) => ({ ...e, id: e.id || uid() })),
    education: (d.education || []).map((e) => ({ ...e, id: e.id || uid() })),
    projects: (d.projects || []).map((p) => ({ ...p, id: p.id || uid() })),
    certifications: (d.certifications || []).map((c) => ({ ...c, id: c.id || uid() })),
    skills: d.skills || [],
  }
}
