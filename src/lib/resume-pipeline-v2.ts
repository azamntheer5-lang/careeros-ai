import { run, sanitizePromptInput } from './ai'
import { getCurrentUser } from './server'

/**
 * Enhanced AI Resume Pipeline — v2
 *
 * Designed to handle the messiest inputs:
 * - WhatsApp document exports
 * - OCR text with broken lines
 * - Mixed Arabic + English
 * - Duplicated content (same info in two languages)
 * - Incomplete resumes
 * - Very short descriptions
 * - Random paragraphs with no structure
 *
 * Pipeline:
 * 1. DECODE: Detect language(s), decode URL encoding, fix broken lines
 * 2. PARSE: Extract structured data from messy text (bilingual aware)
 * 3. DEDUPLICATE: Remove Arabic/English duplicate content
 * 4. ENRICH: Professionally expand limited information (never invent facts)
 * 5. ATS OPTIMIZE: Rewrite for ATS compatibility
 * 6. SCORE: Resume quality + ATS score + completeness meter
 * 7. MISSING INFO: Identify what's missing and generate questions
 */

// ─── Types ─────────────────────────────────────────────────────────

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

export type ResumeScore = {
  overall: number
  atsScore: number
  completeness: number
  keywordScore: number
  formattingScore: number
  dimensions: { name: string; score: number; status: 'good' | 'warning' | 'bad' }[]
  quickWins: string[]
  missingCritical: string[]
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

export type PipelineResultV2 = {
  resume: BilingualResume
  score: ResumeScore
  missingInfo: MissingInfo
  keywords: KeywordAnalysis
  warnings: string[]
  enrichmentNotes: string[]
  detectedLanguage: string
  wasEnriched: boolean
}

// ─── Pipeline Steps ────────────────────────────────────────────────

/**
 * Pre-process raw text: fix common OCR/WhatsApp export issues.
 */
function preprocessText(raw: string): string {
  let text = raw

  // Decode URL encoding if detected
  if (text.includes('%0D') || text.includes('%0A') || text.includes('%20')) {
    try { text = decodeURIComponent(text) } catch {}
  }

  // Replace + with space (URL encoding artifact)
  text = text.replace(/\+/g, ' ')

  // Fix broken lines: "Taibah\n\nUniversity" → "Taibah University"
  text = text.replace(/(\w)\n\n(\w)/g, '$1 $2')

  // Fix pipe-separated content: "Academy |" → "Academy"
  text = text.replace(/\s*\|\s*/g, ' | ')

  // Remove WhatsApp document headers
  text = text.replace(/^DOC-\d+.*?\./m, '')

  // Normalize excessive blank lines
  text = text.replace(/\n{3,}/g, '\n\n')

  // Trim
  return text.trim()
}

/**
 * Step 1-2: Parse messy bilingual text into structured resume.
 * Handles mixed Arabic/English, duplicated content, broken formatting.
 */
async function parseBilingualResume(rawText: string): Promise<{ resume: BilingualResume; warnings: string[]; detectedLanguage: string }> {
  const cleaned = preprocessText(rawText)
  const warnings: string[] = []

  // Detect languages
  const hasArabic = /[\u0600-\u06FF]/.test(cleaned)
  const hasEnglish = /[a-zA-Z]/.test(cleaned)
  const detectedLanguage = hasArabic && hasEnglish ? 'bilingual' : hasArabic ? 'ar' : 'en'

  if (hasArabic && hasEnglish) {
    warnings.push('Bilingual content detected (Arabic + English) — will parse both and deduplicate')
  }

  const { data: resume } = await run<BilingualResume>(
    'resume_parse_bilingual',
    '', '',
    [{
      role: 'user',
      content: `Parse this resume text into a structured JSON profile. This text may be:
- Mixed Arabic and English (bilingual)
- From a WhatsApp document export or OCR scan
- Duplicated (same info in both languages)
- Messy with broken lines

Rules:
- Extract ALL information present in the text
- If content appears in both Arabic and English, keep BOTH versions (name + nameAr, objective + objectiveAr, degree + degreeAr)
- For experience/education/courses, if the text only has Arabic, fill the main fields; if both, prefer English for main fields
- NEVER invent information — if something is missing, set it to null
- Separate technical skills from soft skills
- Extract languages with proficiency levels
- Extract courses with provider, hours, and dates if available
- Fix obvious OCR errors (broken words across lines)

Text to parse:
${sanitizePromptInput(cleaned, 15000)}

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
}`,
    }],
    { json: true }
  )

  // Validate
  if (!resume.contact?.name && !resume.contact?.nameAr) warnings.push('No name found')
  if (!resume.contact?.email) warnings.push('No email found')
  if (!resume.objective && !resume.objectiveAr) warnings.push('No objective/summary found')
  if (!resume.experience?.length) warnings.push('No experience found')
  if (!resume.skills?.technical?.length && !resume.skills?.soft?.length) warnings.push('No skills found')

  return { resume, warnings, detectedLanguage }
}

/**
 * Step 4: Professional enrichment — expand limited information.
 * NEVER invents employers, companies, degrees, or certifications.
 * Only enriches text quality (summaries, bullet points, skills wording).
 */
async function enrichResume(resume: BilingualResume): Promise<{ resume: BilingualResume; notes: string[] }> {
  const notes: string[] = []

  const { data: enriched } = await run<BilingualResume>(
    'resume_enrich',
    '', '',
    [{
      role: 'user',
      content: `Professionally enrich this resume. Rules:
- IMPROVE: Rewrite weak summaries, improve objectives, strengthen bullet points, expand skill descriptions
- GENERATE: Add ATS-friendly bullet points for experience that lacks measurable impact (use "approx." for estimated metrics)
- NORMALIZE: Fix grammar, improve wording, increase recruiter appeal
- NEVER INVENT: Do NOT add fake employers, companies, degrees, certifications, or employment history
- NEVER ADD: Do NOT add skills that aren't supported by the input
- PRESERVE: Keep all factual information exactly as provided (names, dates, companies)
- BILINGUAL: If objectiveAr exists, keep it in sync with the improved objective

Resume to enrich:
${JSON.stringify(resume, null, 2)}

Return the same JSON shape with enriched content. Add a "enrichmentNotes" field is NOT needed — just return the improved resume.`,
    }],
    { json: true }
  )

  // Track what was enriched
  if (enriched.objective !== resume.objective) notes.push('Objective/summary was professionally rewritten')
  if (enriched.experience?.length && resume.experience?.length) {
    if (enriched.experience[0].bullets?.length > (resume.experience[0].bullets?.length || 0)) {
      notes.push('Experience bullets were expanded with ATS-friendly achievements')
    }
  }
  if (enriched.skills?.technical?.length > (resume.skills?.technical?.length || 0)) {
    notes.push('Technical skills were normalized and expanded')
  }

  return { resume: enriched, notes }
}

/**
 * Step 5: ATS optimization — rewrite for maximum ATS compatibility.
 */
async function optimizeATS(resume: BilingualResume, jobDescription?: string): Promise<BilingualResume> {
  if (!jobDescription?.trim()) return resume

  const { data: optimized } = await run<BilingualResume>(
    'resume_ats_optimize_v2',
    '', '',
    [{
      role: 'user',
      content: `ATS-optimize this resume against the job description.

Rules:
- Reorder skills by relevance to the job description
- Rewrite bullet points to include keywords from the JD (only if the skill genuinely exists)
- NEVER add skills from the JD that the candidate doesn't have
- Keep all factual information (names, dates, companies) exactly as provided
- Quantify impact with "approx." if the original text suggests numbers
- If objectiveAr exists, keep it in sync

Resume:
${JSON.stringify(resume, null, 2)}

Job Description:
${sanitizePromptInput(jobDescription, 10000)}

Return the same JSON shape with ATS-optimized content.`,
    }],
    { json: true }
  )

  return optimized
}

/**
 * Step 6: Score the resume across multiple dimensions.
 */
async function scoreResume(resume: BilingualResume, jobDescription?: string): Promise<ResumeScore> {
  const { data: score } = await run<ResumeScore>(
    'resume_score_v2',
    '', '',
    [{
      role: 'user',
      content: `Score this resume across multiple dimensions. Be rigorous and honest.

${jobDescription ? `Job Description (for ATS matching):\n${sanitizePromptInput(jobDescription, 5000)}\n` : ''}

Resume:
${JSON.stringify(resume, null, 2)}

Return JSON:
{
  "overall": number (0-100),
  "atsScore": number (0-100, ATS compatibility),
  "completeness": number (0-100, how complete is the resume),
  "keywordScore": number (0-100, keyword coverage${jobDescription ? ' vs JD' : ''}),
  "formattingScore": number (0-100, structure and formatting quality),
  "dimensions": [{ "name": string, "score": number, "status": "good"|"warning"|"bad" }],
  "quickWins": string[] (3 actionable improvements that take <5 min),
  "missingCritical": string[] (critical missing elements)
}`,
    }],
    { json: true }
  )

  return score
}

/**
 * Step 7: Identify missing information and generate questions.
 */
async function identifyMissingInfo(resume: BilingualResume, targetRole?: string): Promise<MissingInfo> {
  const { data } = await run<MissingInfo>(
    'resume_missing_info_v2',
    '', '',
    [{
      role: 'user',
      content: `Identify what critical information is missing from this resume${targetRole ? ` for a "${targetRole}" role` : ''}.

For each missing item:
- "field": specific field name
- "question": a clear, specific question to ask the user
- "priority": "high" (must have), "medium" (should have), "low" (nice to have)
- "suggestion": a helpful suggestion or example answer, or null

Resume:
${JSON.stringify(resume, null, 2)}

Return JSON array: [{ "field": string, "question": string, "priority": "high"|"medium"|"low", "suggestion": string|null }]`,
    }],
    { json: true }
  )

  return data || []
}

/**
 * Step 8: Keyword analysis.
 */
async function analyzeKeywords(resume: BilingualResume, jobDescription?: string): Promise<KeywordAnalysis> {
  const { data } = await run<KeywordAnalysis>(
    'resume_keyword_analyzer',
    '', '',
    [{
      role: 'user',
      content: `Analyze keywords in this resume${jobDescription ? ' against the job description' : ''}.

Resume:
${JSON.stringify(resume, null, 2)}

${jobDescription ? `Job Description:\n${sanitizePromptInput(jobDescription, 5000)}\n` : ''}

Return JSON:
{
  "detected": string[] (keywords found in the resume),
  "suggested": string[] (keywords that should be added based on the role/industry),
  "industryTerms": string[] (industry-standard terms present),
  "actionVerbs": string[] (action verbs used in bullets),
  "missingActionVerbs": string[] (strong action verbs that should be used)
}`,
    }],
    { json: true }
  )

  return data
}

// ─── Full Pipeline ─────────────────────────────────────────────────

/**
 * Run the complete enhanced resume generation pipeline.
 *
 * @param rawText - Messy text (WhatsApp export, OCR, notes, etc.)
 * @param jobDescription - Optional JD for ATS optimization
 * @param options - { enrich: boolean, optimizeATS: boolean }
 */
export async function generateResumeFromRawText(
  rawText: string,
  jobDescription?: string,
  options: { enrich?: boolean; optimizeATS?: boolean } = {}
): Promise<PipelineResultV2> {
  const { enrich = true, optimizeATS: shouldOptimize = true } = options

  // Step 1-2: Parse
  const { resume: parsed, warnings, detectedLanguage } = await parseBilingualResume(rawText)

  // Step 4: Enrich
  let resume = parsed
  let enrichmentNotes: string[] = []
  let wasEnriched = false
  if (enrich) {
    const result = await enrichResume(parsed)
    resume = result.resume
    enrichmentNotes = result.notes
    wasEnriched = enrichmentNotes.length > 0
  }

  // Step 5: ATS Optimize
  if (shouldOptimize && jobDescription?.trim()) {
    resume = await optimizeATS(resume, jobDescription)
  }

  // Step 6: Score
  const score = await scoreResume(resume, jobDescription)

  // Step 7: Missing info
  const missingInfo = await identifyMissingInfo(resume)

  // Step 8: Keywords
  const keywords = await analyzeKeywords(resume, jobDescription)

  return {
    resume,
    score,
    missingInfo,
    keywords,
    warnings,
    enrichmentNotes,
    detectedLanguage,
    wasEnriched,
  }
}

// ─── Section-level rewrite functions ───────────────────────────────

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
      content: `Rewrite ONLY the "${sectionNames[section]}" section of this resume to be more professional and ATS-friendly.

Rules:
- Keep ALL facts exactly as provided (names, dates, companies, degrees)
- Improve wording, grammar, and impact
- Add measurable achievements with "approx." where the text suggests impact
- Never invent new information
${jobDescription ? `- Optimize for keywords from this job description:\n${sanitizePromptInput(jobDescription, 3000)}` : ''}

Section content to rewrite:
${JSON.stringify(content, null, 2)}

Return the same JSON shape with improved content.`,
    }],
    { json: true }
  )

  return data
}

/**
 * Translate resume to another language.
 */
export async function translateResume(resume: BilingualResume, targetLang: 'ar' | 'en'): Promise<BilingualResume> {
  const { data } = await run<BilingualResume>(
    'resume_translate',
    '', '',
    [{
      role: 'user',
      content: `Translate this resume to ${targetLang === 'ar' ? 'Arabic' : 'English'}.

Rules:
- Translate ALL fields accurately
- Keep proper nouns (names, companies, institutions) in their original form if they have no standard translation
- For bilingual fields (name/nameAr, objective/objectiveAr), fill the empty one
- Preserve all JSON structure

Resume:
${JSON.stringify(resume, null, 2)}

Return the complete resume JSON with both languages filled.`,
    }],
    { json: true }
  )

  return data
}
