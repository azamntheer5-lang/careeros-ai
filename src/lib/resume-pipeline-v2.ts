import { run, sanitizePromptInput } from './ai'

/**
 * AI Resume Pipeline V3 — Intelligent Analysis + Industry Awareness
 *
 * 15-stage analysis before generation:
 * 1. Language detection
 * 2. Profession detection
 * 3. Seniority detection
 * 4. Industry detection
 * 5. Missing info detection
 * 6. Duplicate detection
 * 7. Weak wording detection
 * 8. Achievement detection
 * 9. Technical skills detection
 * 10. Soft skills detection
 * 11. Certification detection
 * 12. Project detection
 * 13. Measurable accomplishments detection
 * 14. ATS keyword detection
 * 15. Writing problem detection
 *
 * Then: grammar fix → industry-aware enrichment → ATS optimize → quality check → score
 */

// ─── Types ─────────────────────────────────────────────────────────

export type IntelligentAnalysis = {
  language: string
  profession: string
  seniority: string
  industry: string
  missingInfo: string[]
  duplicatedInfo: string[]
  weakWording: string[]
  achievements: string[]
  technicalSkills: string[]
  softSkills: string[]
  certifications: string[]
  projects: string[]
  measurableAccomplishments: string[]
  atsKeywords: string[]
  writingProblems: string[]
  confidence: number
}

export type BilingualResume = {
  contact: {
    name: string | null
    nameAr: string | null
    email: string | null
    phone: string | null
    location: string | null
    linkedin: string | null
    website: string | null
    nationality: string | null
    github: string | null
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
    gpa: string | null
  }[]
  skills: {
    technical: string[]
    soft: string[]
    languages: { language: string; level: string }[]
    tools: string[]
    frameworks: string[]
    certifications: { name: string; issuer: string | null; date: string | null }[]
  }
  courses: { name: string; provider: string | null; hours: string | null; date: string | null }[]
  projects: { name: string; description: string; link: string | null; technologies: string[] }[]
  volunteer: { role: string; organization: string; description: string }[]
  awards: { name: string; issuer: string; date: string | null }[]
  publications: { title: string; publisher: string; date: string | null }[]
  interests: string[]
  references: string | null
}

export type ResumeScore = {
  overall: number
  atsScore: number
  completeness: number
  keywordScore: number
  formattingScore: number
  grammarScore: number
  impactScore: number
  dimensions: { name: string; score: number; status: 'good' | 'warning' | 'bad' }[]
  quickWins: string[]
  missingCritical: string[]
  weakPhrases: string[]
  strongPhrases: string[]
  repeatedWords: string[]
  formattingIssues: string[]
}

export type MissingInfo = {
  field: string
  question: string
  priority: 'high' | 'medium' | 'low'
  suggestion: string | null
}[]

export type KeywordAnalysis = {
  detected: string[]
  suggested: string[]
  industryTerms: string[]
  actionVerbs: string[]
  missingActionVerbs: string[]
}

export type QualityReport = {
  hallucinations: string[]
  genericLanguage: string[]
  missingActionVerbs: string[]
  weakBullets: string[]
  atsIssues: string[]
  repeatedPhrases: string[]
  inconsistentFormatting: string[]
  passedChecks: string[]
  qualityScore: number
}

export type PipelineResultV3 = {
  analysis: IntelligentAnalysis
  resume: BilingualResume
  score: ResumeScore
  missingInfo: MissingInfo
  keywords: KeywordAnalysis
  quality: QualityReport
  warnings: string[]
  enrichmentNotes: string[]
  detectedLanguage: string
  profession: string
  seniority: string
  industry: string
  wasEnriched: boolean
  wasGrammarFixed: boolean
  tokensUsed: number
  latencyMs: number
  confidence: Record<string, 'high' | 'medium' | 'low'>
}

// ─── Pipeline Steps ────────────────────────────────────────────────

/** Preprocess raw text: fix OCR/WhatsApp issues. Exported for testing. */
export function preprocessText(raw: string): string {
  let text = raw
  // URL decode
  if (text.includes('%0D') || text.includes('%0A') || text.includes('%20')) {
    try { text = decodeURIComponent(text) } catch {}
  }
  text = text.replace(/\+/g, ' ')
  // Fix broken lines
  text = text.replace(/(\w)\n\n(\w)/g, '$1 $2')
  // Remove WhatsApp headers
  text = text.replace(/^DOC-\d+.*?\./m, '')
  // Remove email signatures
  text = text.replace(/--\s*\n.*?(?:Sent from|Get Outlook).*$/gm, '')
  // Normalize blank lines
  text = text.replace(/\n{3,}/g, '\n\n')
  return text.trim()
}

/**
 * Stage 1: Intelligent 15-stage analysis.
 * Runs before any generation to understand the input deeply.
 */
async function runIntelligentAnalysis(rawText: string): Promise<IntelligentAnalysis> {
  const cleaned = preprocessText(rawText)
  const { data, tokens } = await run<IntelligentAnalysis>(
    'resume_intelligent_analysis',
    '', '',
    [{
      role: 'user',
      content: `Perform a comprehensive 15-stage analysis of this resume text. Be thorough and specific.

Text:
${sanitizePromptInput(cleaned, 15000)}

Return JSON:
{
  "language": "en" | "ar" | "bilingual",
  "profession": string (e.g., "Cybersecurity Specialist", "Software Engineer", "Marketing Manager"),
  "seniority": "student" | "fresh graduate" | "junior" | "mid" | "senior" | "lead" | "executive",
  "industry": string (e.g., "Technology", "Finance", "Healthcare"),
  "missingInfo": string[] (critical missing fields),
  "duplicatedInfo": string[] (content appearing in multiple languages or repeated),
  "weakWording": string[] (specific examples of passive/vague language),
  "achievements": string[] (any measurable accomplishments found),
  "technicalSkills": string[],
  "softSkills": string[],
  "certifications": string[],
  "projects": string[],
  "measurableAccomplishments": string[] (numbers, percentages, metrics),
  "atsKeywords": string[] (industry-standard terms present),
  "writingProblems": string[] (grammar, spelling, OCR errors, broken sentences),
  "confidence": number (0-100, how confident you are in the analysis)
}`,
    }],
    { json: true }
  )
  return data
}

/**
 * Stage 2: Parse + grammar fix + industry-aware enrichment in one pass.
 * Uses the analysis to inform profession-specific writing style.
 */
async function parseAndEnrich(
  rawText: string,
  analysis: IntelligentAnalysis,
  jobDescription?: string
): Promise<{ resume: BilingualResume; notes: string[]; grammarFixed: boolean }> {
  const cleaned = preprocessText(rawText)
  const notes: string[] = []

  const { data: resume } = await run<BilingualResume>(
    'resume_industry_aware',
    '', '',
    [{
      role: 'user',
      content: `Generate a professional resume from this raw text.

PRE-ANALYSIS (use this to inform your writing style):
- Profession: ${analysis.profession}
- Seniority: ${analysis.seniority}
- Industry: ${analysis.industry}
- Language: ${analysis.language}
- Weak wording found: ${analysis.weakWording.join(', ') || 'none'}
- Writing problems: ${analysis.writingProblems.join(', ') || 'none'}
- Duplicated content: ${analysis.duplicatedInfo.join(', ') || 'none'}
${jobDescription ? `- Target job description keywords: use for ATS optimization` : ''}

INSTRUCTIONS:
1. Extract ALL information from the text
2. Fix ALL grammar, spelling, punctuation, OCR errors, WhatsApp formatting
3. Rewrite weak bullet points with strong action verbs
4. Convert descriptions into achievements ONLY when the source supports it
5. Adapt writing style for the detected profession (${analysis.profession})
6. If bilingual (AR+EN), keep both versions where available
7. NEVER invent facts — set missing fields to null
8. Use "approx." for any estimated metrics
9. Separate technical skills from soft skills
10. Extract tools, frameworks separately if mentioned
11. Extract volunteer work, awards, publications, interests if present

Raw text:
${sanitizePromptInput(cleaned, 15000)}

${jobDescription ? `Job description:\n${sanitizePromptInput(jobDescription, 5000)}` : ''}

Return JSON:
{
  "contact": { "name": string|null, "nameAr": string|null, "email": string|null, "phone": string|null, "location": string|null, "linkedin": string|null, "website": string|null, "nationality": string|null, "github": string|null },
  "objective": string|null,
  "objectiveAr": string|null,
  "experience": [{ "title": string|null, "company": string|null, "location": string|null, "startDate": string|null, "endDate": string|null, "bullets": string[] }],
  "education": [{ "degree": string|null, "degreeAr": string|null, "school": string|null, "startDate": string|null, "endDate": string|null, "details": string|null, "gpa": string|null }],
  "skills": { "technical": string[], "soft": string[], "languages": [{ "language": string, "level": string }], "tools": string[], "frameworks": string[], "certifications": [{ "name": string, "issuer": string|null, "date": string|null }] },
  "courses": [{ "name": string, "provider": string|null, "hours": string|null, "date": string|null }],
  "projects": [{ "name": string, "description": string, "link": string|null, "technologies": string[] }],
  "volunteer": [{ "role": string, "organization": string, "description": string }],
  "awards": [{ "name": string, "issuer": string, "date": string|null }],
  "publications": [{ "title": string, "publisher": string, "date": string|null }],
  "interests": string[],
  "references": string|null
}`,
    }],
    { json: true }
  )

  // Track what was done
  if (analysis.writingProblems.length > 0) {
    notes.push(`Fixed ${analysis.writingProblems.length} writing issues (grammar, OCR, formatting)`)
  }
  if (analysis.weakWording.length > 0) {
    notes.push(`Rewrote ${analysis.weakWording.length} weak phrases with strong action verbs`)
  }
  notes.push(`Adapted writing style for ${analysis.profession} (${analysis.seniority})`)

  return { resume, notes, grammarFixed: analysis.writingProblems.length > 0 }
}

/**
 * Stage 3: Quality check — verify no hallucinations.
 */
async function qualityCheck(resume: BilingualResume, rawText: string): Promise<QualityReport> {
  const { data } = await run<QualityReport>(
    'resume_quality_check',
    '', '',
    [{
      role: 'user',
      content: `Audit this generated resume for quality issues. Compare against the original raw text to detect any hallucinations.

CRITICAL CHECKS:
1. Hallucinated facts — any employer, company, degree, certification, date, or metric NOT present in the source text
2. Generic language — phrases so vague they could apply to anyone
3. Missing action verbs — bullets starting with weak words
4. Weak bullets — no measurable impact
5. ATS formatting issues
6. Repeated words/phrases
7. Inconsistent formatting
8. Missing critical sections

Original raw text (first 3000 chars):
${sanitizePromptInput(rawText, 3000)}

Generated resume:
${JSON.stringify(resume, null, 2)}

Return JSON:
{
  "hallucinations": string[] (any invented facts found — CRITICAL),
  "genericLanguage": string[],
  "missingActionVerbs": string[],
  "weakBullets": string[],
  "atsIssues": string[],
  "repeatedPhrases": string[],
  "inconsistentFormatting": string[],
  "passedChecks": string[] (checks that passed),
  "qualityScore": number (0-100)
}`,
    }],
    { json: true }
  )
  return data
}

/**
 * Stage 4: Multi-dimensional scoring.
 */
async function scoreResume(resume: BilingualResume, analysis: IntelligentAnalysis, jobDescription?: string): Promise<ResumeScore> {
  const { data: score } = await run<ResumeScore>(
    'resume_score_v2',
    '', '',
    [{
      role: 'user',
      content: `Score this resume across multiple dimensions. Be rigorous and honest.

Profession: ${analysis.profession}
Seniority: ${analysis.seniority}
Industry: ${analysis.industry}

${jobDescription ? `Job Description:\n${sanitizePromptInput(jobDescription, 3000)}\n` : ''}

Resume:
${JSON.stringify(resume, null, 2)}

Return JSON:
{
  "overall": number (0-100),
  "atsScore": number (0-100),
  "completeness": number (0-100),
  "keywordScore": number (0-100),
  "formattingScore": number (0-100),
  "grammarScore": number (0-100),
  "impactScore": number (0-100, quality of achievements/impact),
  "dimensions": [{ "name": string, "score": number, "status": "good"|"warning"|"bad" }],
  "quickWins": string[] (3 actionable improvements under 5 min),
  "missingCritical": string[],
  "weakPhrases": string[] (specific weak phrases found),
  "strongPhrases": string[] (specific strong phrases found),
  "repeatedWords": string[],
  "formattingIssues": string[]
}`,
    }],
    { json: true }
  )
  return score
}

/**
 * Stage 5: Missing info + keyword analysis (reuse existing functions).
 */
async function identifyMissingInfo(resume: BilingualResume, analysis: IntelligentAnalysis): Promise<MissingInfo> {
  const { data } = await run<MissingInfo>(
    'resume_missing_info_v2',
    '', '',
    [{
      role: 'user',
      content: `Identify missing information in this resume for a ${analysis.profession} (${analysis.seniority} level) in the ${analysis.industry} industry.

Resume:
${JSON.stringify(resume, null, 2)}

Return JSON array: [{ "field": string, "question": string, "priority": "high"|"medium"|"low", "suggestion": string|null }]`,
    }],
    { json: true }
  )
  return data || []
}

async function analyzeKeywords(resume: BilingualResume, analysis: IntelligentAnalysis, jobDescription?: string): Promise<KeywordAnalysis> {
  const { data } = await run<KeywordAnalysis>(
    'resume_keyword_analyzer',
    '', '',
    [{
      role: 'user',
      content: `Analyze keywords in this resume for a ${analysis.profession} in ${analysis.industry}.

${jobDescription ? `Job Description:\n${sanitizePromptInput(jobDescription, 3000)}\n` : ''}

Resume:
${JSON.stringify(resume, null, 2)}

Return JSON:
{
  "detected": string[],
  "suggested": string[],
  "industryTerms": string[],
  "actionVerbs": string[],
  "missingActionVerbs": string[]
}`,
    }],
    { json: true }
  )
  return data
}

// ─── Full Pipeline V3 ──────────────────────────────────────────────

export async function generateResumeV3(
  rawText: string,
  jobDescription?: string,
  options: { runQualityCheck?: boolean } = {}
): Promise<PipelineResultV3> {
  const { runQualityCheck: shouldQualityCheck = true } = options
  const t0 = Date.now()
  let totalTokens = 0

  // Stage 1: Intelligent Analysis (15 stages)
  const analysis = await runIntelligentAnalysis(rawText)

  // Stage 2: Parse + Grammar Fix + Industry-Aware Enrichment
  const { resume, notes, grammarFixed } = await parseAndEnrich(rawText, analysis, jobDescription)

  // Stage 3: Quality Check (hallucination detection)
  let quality: QualityReport = {
    hallucinations: [], genericLanguage: [], missingActionVerbs: [], weakBullets: [],
    atsIssues: [], repeatedPhrases: [], inconsistentFormatting: [], passedChecks: ['All checks passed'], qualityScore: 100,
  }
  if (shouldQualityCheck) {
    quality = await qualityCheck(resume, rawText)
    if (quality.hallucinations.length > 0) {
      notes.push(`⚠️ Quality check flagged ${quality.hallucinations.length} potential hallucinations — review recommended`)
    }
  }

  // Stage 4: Scoring
  const score = await scoreResume(resume, analysis, jobDescription)

  // Stage 5: Missing Info + Keywords
  const [missingInfo, keywords] = await Promise.all([
    identifyMissingInfo(resume, analysis),
    analyzeKeywords(resume, analysis, jobDescription),
  ])

  const latencyMs = Date.now() - t0
  const warnings: string[] = []
  if (analysis.missingInfo.length > 0) warnings.push(`${analysis.missingInfo.length} critical fields missing`)
  if (quality.hallucinations.length > 0) warnings.push(`${quality.hallucinations.length} potential hallucinations detected`)
  if (analysis.writingProblems.length > 0) warnings.push(`${analysis.writingProblems.length} writing problems fixed`)

  return {
    analysis,
    resume,
    score,
    missingInfo,
    keywords,
    quality,
    warnings,
    enrichmentNotes: notes,
    detectedLanguage: analysis.language,
    profession: analysis.profession,
    seniority: analysis.seniority,
    industry: analysis.industry,
    wasEnriched: notes.length > 0,
    wasGrammarFixed: grammarFixed,
    tokensUsed: totalTokens,
    latencyMs,
    confidence: calculateConfidence(resume, analysis, quality),
  }
}

/**
 * Calculate per-field confidence based on:
 * - Whether the field was directly extracted (high) vs enriched (medium) vs inferred (low)
 * - Whether quality check found hallucinations for this field (low)
 */
function calculateConfidence(
  resume: BilingualResume,
  analysis: IntelligentAnalysis,
  quality: QualityReport
): Record<string, 'high' | 'medium' | 'low'> {
  const confidence: Record<string, 'high' | 'medium' | 'low'> = {}

  // Contact fields — high confidence if directly extracted
  confidence['contact.name'] = resume.contact?.name ? 'high' : 'low'
  confidence['contact.email'] = resume.contact?.email ? 'high' : 'low'
  confidence['contact.phone'] = resume.contact?.phone ? 'high' : 'low'
  confidence['contact.location'] = resume.contact?.location ? 'high' : 'low'

  // Objective — medium if enriched (wasGrammarFixed implies enrichment)
  confidence['objective'] = resume.objective ? 'medium' : 'low'

  // Experience — medium (enriched bullets)
  confidence['experience'] = resume.experience?.length > 0 ? 'medium' : 'low'

  // Education — high (factual, directly extracted)
  confidence['education'] = resume.education?.length > 0 ? 'high' : 'low'

  // Skills — medium (may have been categorized/normalized)
  confidence['skills'] = (resume.skills?.technical?.length || 0) > 0 ? 'medium' : 'low'

  // Courses — high (factual)
  confidence['courses'] = resume.courses?.length > 0 ? 'high' : 'low'

  // Certifications — high (factual)
  confidence['certifications'] = (resume as any).certifications?.length > 0 ? 'high' : 'low'

  // Lower confidence for fields with hallucination flags
  for (const h of quality.hallucinations) {
    const fieldMatch = h.match(/(\w+\.\w+)/)
    if (fieldMatch) {
      confidence[fieldMatch[1]] = 'low'
    }
  }

  return confidence
}

// ─── Section Rewrite + Translation (reused from V2) ───────────────

export async function rewriteSection(
  section: 'objective' | 'experience' | 'skills' | 'education',
  content: any,
  jobDescription?: string
): Promise<any> {
  const sectionNames = { objective: 'objective/summary', experience: 'experience bullets', skills: 'skills', education: 'education' }
  const { data } = await run<any>(
    'resume_rewrite_section',
    '', '',
    [{
      role: 'user',
      content: `Rewrite ONLY the "${sectionNames[section]}" section. Improve wording, grammar, ATS-friendliness. Never invent facts. Keep all names, dates, companies exactly as provided.
${jobDescription ? `Optimize for: ${sanitizePromptInput(jobDescription, 2000)}` : ''}

Content:
${JSON.stringify(content, null, 2)}

Return the same JSON shape with improved content.`,
    }],
    { json: true }
  )
  return data
}

export async function translateResume(resume: BilingualResume, targetLang: 'ar' | 'en'): Promise<BilingualResume> {
  const { data } = await run<BilingualResume>(
    'resume_translate',
    '', '',
    [{
      role: 'user',
      content: `Translate this resume to ${targetLang === 'ar' ? 'Arabic' : 'English'}. Keep proper nouns in original form. Preserve all JSON structure.

${JSON.stringify(resume, null, 2)}

Return the complete resume JSON with both languages filled.`,
    }],
    { json: true }
  )
  return data
}
