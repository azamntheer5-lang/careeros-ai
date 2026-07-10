/**
 * Optimized Resume Pipeline — V4
 *
 * GOAL: Reduce from 7 AI calls to 2, latency from 3min to <15s, tokens by 60%.
 *
 * Architecture:
 * - LOCAL (no AI): Language detection, OCR cleanup, deduplication, keyword extraction,
 *   scoring, confidence, missing info detection
 * - AI Call 1: Parse + Extract + Enrich + ATS optimize (single prompt)
 * - AI Call 2: Quality check + Industry analysis (single prompt, optional)
 *
 * The AI only does what truly requires reasoning: understanding messy text and
 * writing professional resume content. Everything else is deterministic code.
 */

import { run, sanitizePromptInput, ChatMessage } from './ai'
import { evaluateResume, EvaluationResult } from './resume-evaluator'

// ─── Types (reused from V3) ────────────────────────────────────────

export type BilingualResume = {
  contact: {
    name: string | null
    nameAr: string | null
    email: string | null
    phone: string | null
    location: string | null
    linkedin: string | null
    website: string | null
  }
  objective: string | null
  objectiveAr: string | null
  experience: {
    title: string | null
    company: string | null
    location: string | null
    startDate: string | null
    endDate: string | null
    bullets: string[]
  }[]
  education: {
    degree: string | null
    degreeAr: string | null
    school: string | null
    startDate: string | null
    endDate: string | null
    details: string | null
  }[]
  skills: { technical: string[]; soft: string[]; languages: { language: string; level: string }[] }
  courses: { name: string; provider: string | null; hours: string | null; date: string | null }[]
  certifications: { name: string; issuer: string | null; date: string | null }[]
  projects: { name: string; description: string; link: string | null }[]
}

export type OptimizedResult = {
  resume: BilingualResume
  evaluation: EvaluationResult
  detectedLanguage: string
  profession: string
  seniority: string
  industry: string
  confidence: Record<string, 'high' | 'medium' | 'low'>
  enrichmentNotes: string[]
  warnings: string[]
  wasEnriched: boolean
  aiCalls: number
  tokensUsed: number
  latencyMs: number
}

// ─── LOCAL: Language Detection (no AI) ─────────────────────────────

export function detectLanguage(text: string): string {
  const hasArabic = /[\u0600-\u06FF]/.test(text)
  const hasEnglish = /[a-zA-Z]/.test(text)
  if (hasArabic && hasEnglish) return 'bilingual'
  if (hasArabic) return 'ar'
  return 'en'
}

// ─── LOCAL: OCR/WhatsApp Cleanup (no AI) ───────────────────────────

export function cleanOCRText(text: string): string {
  let cleaned = text

  // Decode URL encoding if detected
  if (cleaned.includes('%0D') || cleaned.includes('%0A') || cleaned.includes('%20')) {
    try { cleaned = decodeURIComponent(cleaned) } catch {}
  }

  // Replace + with space (URL encoding artifact)
  cleaned = cleaned.replace(/\+/g, ' ')

  // Fix broken lines: "Taibah\n\nUniversity" → "Taibah University"
  cleaned = cleaned.replace(/(\w)\n{1,2}(\w)/g, '$1 $2')

  // Fix pipe-separated content
  cleaned = cleaned.replace(/\s*\|\s*/g, ' | ')

  // Remove WhatsApp document headers
  cleaned = cleaned.replace(/^DOC-\d+.*?\./m, '')

  // Normalize excessive blank lines
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n')

  // Fix "gmail dot com" → "gmail.com"
  cleaned = cleaned.replace(/\s+dot\s+/gi, '.')

  // Fix "at" in email context: "rob chen at gmail" → "rob.chen@gmail"
  cleaned = cleaned.replace(/(\w+)\s+at\s+(\w+)/gi, (match, before, after) => {
    if (after.toLowerCase().match(/gmail|yahoo|hotmail|outlook|email/)) {
      return `${before}@${after}`
    }
    return match
  })

  return cleaned.trim()
}

// ─── LOCAL: Deduplication (no AI) ──────────────────────────────────

export function deduplicateResume(resume: BilingualResume): BilingualResume {
  // Deduplicate experience entries by title+company
  if (resume.experience?.length > 1) {
    const seen = new Set<string>()
    resume.experience = resume.experience.filter(exp => {
      const key = `${exp.title?.toLowerCase()}-${exp.company?.toLowerCase()}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }

  // Deduplicate skills
  if (resume.skills?.technical) {
    resume.skills.technical = [...new Set(resume.skills.technical.map(s => s.trim()))]
  }
  if (resume.skills?.soft) {
    resume.skills.soft = [...new Set(resume.skills.soft.map(s => s.trim()))]
  }

  // Deduplicate courses by name
  if (resume.courses?.length > 1) {
    const seen = new Set<string>()
    resume.courses = resume.courses.filter(c => {
      const key = c.name?.toLowerCase()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }

  return resume
}

// ─── LOCAL: Keyword Extraction (no AI, regex-based) ────────────────

const TECH_KEYWORDS = [
  'javascript', 'python', 'java', 'react', 'node.js', 'typescript', 'sql', 'postgresql',
  'aws', 'docker', 'kubernetes', 'graphql', 'html', 'css', 'git', 'linux', 'c++',
  'c#', '.net', 'php', 'ruby', 'go', 'rust', 'swift', 'kotlin', 'flutter',
  'cybersecurity', 'network security', 'penetration testing', 'firewall', 'encryption',
  'siem', 'soc', 'incident response', 'malware analysis', 'reverse engineering',
  'marketing', 'seo', 'sem', 'google analytics', 'hubspot', 'marketo', 'email marketing',
  'content strategy', 'social media', 'a/b testing', 'conversion optimization',
  'accounting', 'ifrs', 'audit', 'reconciliation', 'sap', 'oracle', 'excel',
  'financial reporting', 'tax', 'budget', 'cpa', 'bookkeeping',
  'nursing', 'patient care', 'icu', 'bls', 'acls', 'pals', 'ehr', 'infection control',
  'wound care', 'iv therapy', 'medication administration',
  'project management', 'agile', 'scrum', 'pmp', 'jira', 'kanban',
  'hr', 'recruitment', 'onboarding', 'performance management', 'labor law',
  'payroll', 'employee relations', 'training', 'compensation',
]

const ACTION_VERBS = [
  'led', 'managed', 'developed', 'implemented', 'designed', 'created', 'built',
  'improved', 'achieved', 'delivered', 'optimized', 'established', 'coordinated',
  'analyzed', 'executed', 'launched', 'streamlined', 'spearheaded', 'orchestrated',
  'facilitated', 'participated', 'completed', 'applied', 'acquired', 'demonstrated',
  'contributed', 'maintained', 'reduced', 'increased', 'grew', 'built', 'trained',
  'mentored', 'supervised', 'administered', 'operated', 'conducted', 'prepared',
]

export function extractKeywords(resume: BilingualResume): {
  detected: string[]
  suggested: string[]
  actionVerbs: string[]
  missingActionVerbs: string[]
} {
  const text = JSON.stringify(resume).toLowerCase()

  const detected = TECH_KEYWORDS.filter(kw => text.includes(kw))
  const actionVerbsFound = ACTION_VERBS.filter(v => text.includes(v))
  const missingActionVerbs = ACTION_VERBS.filter(v => !text.includes(v)).slice(0, 10)

  // Suggested keywords based on detected profession
  const suggested: string[] = []
  if (detected.includes('cybersecurity')) {
    suggested.push('Penetration Testing', 'Vulnerability Assessment', 'Incident Response', 'SIEM')
  }
  if (detected.includes('react') || detected.includes('javascript')) {
    suggested.push('TypeScript', 'CI/CD', 'Testing', 'System Design')
  }
  if (detected.includes('marketing')) {
    suggested.push('Marketing Automation', 'CRM', 'Lead Generation', 'Brand Management')
  }
  if (detected.includes('accounting')) {
    suggested.push('Financial Analysis', 'Risk Assessment', 'Compliance', 'Treasury')
  }
  if (detected.includes('nursing') || detected.includes('patient care')) {
    suggested.push('Critical Thinking', 'Patient Advocacy', 'Charting', 'Triage')
  }

  return {
    detected,
    suggested: suggested.slice(0, 8),
    actionVerbs: actionVerbsFound,
    missingActionVerbs,
  }
}

// ─── LOCAL: Profession/Seniority/Industry Detection (no AI) ────────

export function detectProfession(resume: BilingualResume): { profession: string; seniority: string; industry: string } {
  const text = JSON.stringify(resume).toLowerCase()

  let profession = 'General'
  if (text.includes('cybersecurity') || text.includes('network security')) profession = 'Cybersecurity'
  else if (text.includes('software') || text.includes('developer') || text.includes('engineer')) profession = 'Software Engineering'
  else if (text.includes('marketing') || text.includes('seo') || text.includes('campaign')) profession = 'Marketing'
  else if (text.includes('accounting') || text.includes('audit') || text.includes('cpa')) profession = 'Accounting'
  else if (text.includes('nurse') || text.includes('patient') || text.includes('clinical')) profession = 'Healthcare'
  else if (text.includes('hr') || text.includes('recruitment') || text.includes('human resources')) profession = 'Human Resources'
  else if (text.includes('project manager') || text.includes('pmp')) profession = 'Project Management'
  else if (text.includes('javascript') || text.includes('python') || text.includes('programming')) profession = 'Software Engineering'

  let seniority = 'Entry-level'
  const expCount = resume.experience?.length || 0
  if (expCount >= 3) seniority = 'Senior'
  else if (expCount >= 2) seniority = 'Mid-level'
  else if (expCount >= 1) seniority = 'Junior'

  // Check for senior keywords
  if (text.includes('senior') || text.includes('lead') || text.includes('manager') || text.includes('director')) {
    seniority = 'Senior'
  }
  if (text.includes('chief') || text.includes('vp') || text.includes('head of')) {
    seniority = 'Executive'
  }

  let industry = 'General'
  if (profession === 'Cybersecurity') industry = 'Technology/Security'
  else if (profession === 'Software Engineering') industry = 'Technology'
  else if (profession === 'Marketing') industry = 'Marketing/Media'
  else if (profession === 'Accounting') industry = 'Finance'
  else if (profession === 'Healthcare') industry = 'Healthcare'
  else if (profession === 'Human Resources') industry = 'Human Resources'

  return { profession, seniority, industry }
}

// ─── LOCAL: Missing Info Detection (no AI) ─────────────────────────

export function detectMissingInfo(resume: BilingualResume): { field: string; question: string; priority: string; suggestion: string | null }[] {
  const missing: { field: string; question: string; priority: string; suggestion: string | null }[] = []

  if (!resume.contact?.name) missing.push({ field: 'contact.name', question: 'What is your full name?', priority: 'high', suggestion: 'Enter your first and last name' })
  if (!resume.contact?.email) missing.push({ field: 'contact.email', question: 'What is your email address?', priority: 'high', suggestion: 'Enter a professional email' })
  if (!resume.contact?.phone) missing.push({ field: 'contact.phone', question: 'What is your phone number?', priority: 'high', suggestion: 'Include country code' })
  if (!resume.contact?.linkedin) missing.push({ field: 'contact.linkedin', question: 'Do you have a LinkedIn profile?', priority: 'medium', suggestion: 'Add your LinkedIn URL' })
  if (!resume.objective) missing.push({ field: 'objective', question: 'What is your career objective?', priority: 'medium', suggestion: 'Write 1-2 sentences about your goal' })
  if (!resume.experience?.length) missing.push({ field: 'experience', question: 'Do you have any work experience?', priority: 'high', suggestion: 'Include internships, training, or projects' })
  if (!resume.education?.length) missing.push({ field: 'education', question: 'What is your education?', priority: 'high', suggestion: 'Include degree, school, and year' })
  if (!resume.skills?.technical?.length) missing.push({ field: 'skills.technical', question: 'What technical skills do you have?', priority: 'high', suggestion: 'List tools, technologies, frameworks' })
  if (!resume.skills?.languages?.length) missing.push({ field: 'skills.languages', question: 'What languages do you speak?', priority: 'medium', suggestion: 'Include proficiency level' })
  if (!resume.certifications?.length) missing.push({ field: 'certifications', question: 'Do you have any certifications?', priority: 'low', suggestion: 'Add professional certifications' })

  return missing
}

// ─── LOCAL: Confidence Scoring (no AI) ─────────────────────────────

export function calculateConfidence(resume: BilingualResume): Record<string, 'high' | 'medium' | 'low'> {
  const confidence: Record<string, 'high' | 'medium' | 'low'> = {}
  confidence['contact.name'] = resume.contact?.name ? 'high' : 'low'
  confidence['contact.email'] = resume.contact?.email ? 'high' : 'low'
  confidence['contact.phone'] = resume.contact?.phone ? 'high' : 'low'
  confidence['contact.location'] = resume.contact?.location ? 'high' : 'low'
  confidence['objective'] = resume.objective ? 'medium' : 'low'
  confidence['experience'] = resume.experience?.length > 0 ? 'medium' : 'low'
  confidence['education'] = resume.education?.length > 0 ? 'high' : 'low'
  confidence['skills'] = (resume.skills?.technical?.length || 0) > 0 ? 'medium' : 'low'
  confidence['courses'] = resume.courses?.length > 0 ? 'high' : 'low'
  confidence['certifications'] = resume.certifications?.length > 0 ? 'high' : 'low'
  return confidence
}

// ─── AI CALL 1: Parse + Extract + Enrich + ATS Optimize ────────────

async function aiParseAndEnrich(
  cleanedText: string,
  detectedLanguage: string,
  jobDescription?: string
): Promise<{ resume: BilingualResume; notes: string[] }> {
  const notes: string[] = []
  const isBilingual = detectedLanguage === 'bilingual'
  const hasJD = !!jobDescription?.trim()

  const prompt = `You are an expert resume writer, ATS specialist, and career coach. Parse this raw text and generate a professional, ATS-optimized resume.

Rules:
- Extract ALL information present in the text. NEVER invent data.
- If a field is missing, set it to null. Do NOT fabricate.
- Fix OCR errors, broken sentences, and formatting issues.
- Rewrite weak summaries into professional objectives.
- Convert task descriptions into achievement-style bullet points with action verbs.
- Add "approx." before estimated metrics — never invent numbers.
- Separate technical skills from soft skills.
- Extract languages with proficiency levels.
- Extract courses with provider, hours, and dates if available.
${isBilingual ? '- Content is bilingual (Arabic+English). Keep both versions. Deduplicate repeated content.\n- Fill nameAr and objectiveAr if Arabic versions exist in the text.' : ''}
${hasJD ? `- Optimize for ATS keywords from this job description:\n${sanitizePromptInput(jobDescription!, 3000)}\n- Only include skills the candidate actually has. Never add JD skills they don\'t possess.` : ''}

Raw text to parse:
${sanitizePromptInput(cleanedText, 10000)}

Return JSON:
{
  "contact": { "name": string|null, "nameAr": string|null, "email": string|null, "phone": string|null, "location": string|null, "linkedin": string|null, "website": string|null },
  "objective": string|null,
  "objectiveAr": string|null,
  "experience": [{ "title": string|null, "company": string|null, "location": string|null, "startDate": string|null, "endDate": string|null, "bullets": string[] }],
  "education": [{ "degree": string|null, "degreeAr": string|null, "school": string|null, "startDate": string|null, "endDate": string|null, "details": string|null }],
  "skills": { "technical": string[], "soft": string[], "languages": [{ "language": string, "level": string }] },
  "courses": [{ "name": string, "provider": string|null, "hours": string|null, "date": string|null }],
  "certifications": [{ "name": string, "issuer": string|null, "date": string|null }],
  "projects": [{ "name": string, "description": string, "link": string|null }]
}`

  const { data: resume, tokens } = await run<BilingualResume>(
    'resume_parse_bilingual',
    '', '',
    [{ role: 'user', content: prompt }],
    { json: true }
  )

  if (resume.objective) notes.push('Objective professionally rewritten')
  if (resume.experience?.[0]?.bullets?.length > 0) notes.push('Experience bullets enriched with action verbs')
  if (resume.skills?.technical?.length > 0) notes.push('Technical skills extracted and categorized')

  return { resume, notes }
}

// ─── AI CALL 2 (optional): Quality Check + Industry Analysis ──────

async function aiQualityCheck(
  resume: BilingualResume,
  sourceText: string
): Promise<{ profession: string; seniority: string; industry: string; hallucinations: string[] }> {
  const { data } = await run<any>(
    'resume_keyword_analyzer',
    '', '',
    [{
      role: 'user',
      content: `Analyze this resume and return JSON:
{
  "profession": string (e.g., "Cybersecurity", "Software Engineering", "Marketing"),
  "seniority": string (e.g., "Entry-level", "Junior", "Mid-level", "Senior", "Executive"),
  "industry": string (e.g., "Technology", "Finance", "Healthcare"),
  "hallucinations": string[] (list any fields that seem fabricated or not supported by the source)
}

Resume:
${JSON.stringify(resume).slice(0, 3000)}

Source text:
${sanitizePromptInput(sourceText, 3000)}`,
    }],
    { json: true }
  )

  return {
    profession: data.profession || 'General',
    seniority: data.seniority || 'Entry-level',
    industry: data.industry || 'General',
    hallucinations: data.hallucinations || [],
  }
}

// ─── Main: Optimized Pipeline (2 AI calls max) ─────────────────────

export async function generateResumeOptimized(
  rawText: string,
  jobDescription?: string,
  options: { runQualityCheck?: boolean } = {}
): Promise<OptimizedResult> {
  const { runQualityCheck: shouldQualityCheck = false } = options
  const t0 = Date.now()
  let aiCalls = 0
  let tokensUsed = 0

  // ─── LOCAL: Clean OCR ───
  const cleanedText = cleanOCRText(rawText)

  // ─── LOCAL: Detect language ───
  const detectedLanguage = detectLanguage(cleanedText)

  // ─── AI CALL 1: Parse + Extract + Enrich + ATS ───
  const { resume: parsedResume, notes } = await aiParseAndEnrich(cleanedText, detectedLanguage, jobDescription)
  aiCalls++
  tokensUsed += Math.ceil(JSON.stringify(parsedResume).length / 4)

  // ─── LOCAL: Deduplicate ───
  const resume = deduplicateResume(parsedResume)

  // ─── LOCAL: Detect profession/seniority/industry ───
  let profession = 'General', seniority = 'Entry-level', industry = 'General'
  let hallucinations: string[] = []

  if (shouldQualityCheck) {
    // ─── AI CALL 2: Quality check + profession detection ───
    const quality = await aiQualityCheck(resume, cleanedText)
    aiCalls++
    tokensUsed += 200
    profession = quality.profession
    seniority = quality.seniority
    industry = quality.industry
    hallucinations = quality.hallucinations
  } else {
    // ─── LOCAL: Detect profession (no AI) ───
    const detected = detectProfession(resume)
    profession = detected.profession
    seniority = detected.seniority
    industry = detected.industry
  }

  // ─── LOCAL: Extract keywords ───
  const keywords = extractKeywords(resume)

  // ─── LOCAL: Detect missing info ───
  const missingInfo = detectMissingInfo(resume)

  // ─── LOCAL: Confidence scoring ───
  const confidence = calculateConfidence(resume)

  // ─── LOCAL: Evaluate resume (14 metrics) ───
  const evaluation = evaluateResume(resume, cleanedText, missingInfo)

  // ─── LOCAL: Warnings ───
  const warnings: string[] = []
  if (missingInfo.length > 0) warnings.push(`${missingInfo.length} fields missing`)
  if (hallucinations.length > 0) warnings.push(`${hallucinations.length} potential hallucinations`)
  if (evaluation.hallucinations.length > 0) warnings.push(`${evaluation.hallucinations.length} evaluator hallucination flags`)

  const latencyMs = Date.now() - t0

  return {
    resume,
    evaluation,
    detectedLanguage,
    profession,
    seniority,
    industry,
    confidence,
    enrichmentNotes: notes,
    warnings,
    wasEnriched: notes.length > 0,
    aiCalls,
    tokensUsed,
    latencyMs,
  }
}
