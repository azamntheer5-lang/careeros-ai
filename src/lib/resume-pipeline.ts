import { run, sanitizePromptInput, ChatMessage } from './ai'
import { getCurrentUser } from './server'

/**
 * Enhanced AI Resume Pipeline for Desktop Edition.
 *
 * Flow:
 * 1. Parse: messy text → structured JSON profile
 * 2. Validate: check for missing critical fields
 * 3. Ask: generate questions for missing info
 * 4. ATS Optimize: rewrite for ATS compatibility against a job description
 * 5. Generate: produce final professional resume
 *
 * Core principle: NEVER invent facts. Only use information the user provided.
 */

export type ParsedProfile = {
  contact: {
    name: string | null
    email: string | null
    phone: string | null
    location: string | null
    website: string | null
    linkedin: string | null
  }
  summary: string | null
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
    school: string | null
    location: string | null
    startDate: string | null
    endDate: string | null
    details: string | null
  }[]
  skills: string[]
  projects: { name: string | null; description: string | null; link: string | null }[]
  certifications: { name: string | null; issuer: string | null; date: string | null }[]
}

export type MissingInfo = {
  field: string
  question: string
  priority: 'high' | 'medium' | 'low'
}[]

export type ATSOptimizedResume = {
  summary: string
  experience: {
    title: string
    company: string
    location: string
    startDate: string
    endDate: string
    bullets: string[]
  }[]
  skills: string[]
  missingInfo: string[]
  atsTips: string[]
}

export type PipelineResult = {
  profile: ParsedProfile
  missingInfo: MissingInfo
  optimized: ATSOptimizedResume | null
  warnings: string[]
}

/**
 * Step 1: Parse messy text into a structured profile.
 * Only extracts information actually present — never invents.
 */
export async function parseResumeText(rawText: string): Promise<{ profile: ParsedProfile; warnings: string[] }> {
  const warnings: string[] = []
  const cleaned = sanitizePromptInput(rawText, 10000)

  if (!cleaned.trim()) {
    warnings.push('Input text is empty')
  }

  const { data: profile, tokens } = await run<ParsedProfile>(
    'resume_parse',
    '', '', // userId and name handled by caller
    [{
      role: 'user',
      content: `Parse this resume text and extract structured data. Return ONLY information explicitly present in the text. If something is not mentioned, set it to null (for strings) or empty array (for lists). NEVER invent or guess.

Text to parse:
${cleaned}

Return JSON with this exact shape:
{
  "contact": { "name": string|null, "email": string|null, "phone": string|null, "location": string|null, "website": string|null, "linkedin": string|null },
  "summary": string|null,
  "experience": [{ "title": string|null, "company": string|null, "location": string|null, "startDate": string|null, "endDate": string|null, "bullets": string[] }],
  "education": [{ "degree": string|null, "school": string|null, "location": string|null, "startDate": string|null, "endDate": string|null, "details": string|null }],
  "skills": string[],
  "projects": [{ "name": string|null, "description": string|null, "link": string|null }],
  "certifications": [{ "name": string|null, "issuer": string|null, "date": string|null }]
}`,
    }],
    { json: true }
  )

  // Validate: flag fields that are null
  if (!profile.contact?.name) warnings.push('Name not found in text')
  if (!profile.contact?.email) warnings.push('Email not found in text')
  if (!profile.contact?.phone) warnings.push('Phone not found in text')
  if (!profile.summary) warnings.push('No professional summary found')
  if (!profile.experience?.length) warnings.push('No work experience found')
  if (!profile.skills?.length) warnings.push('No skills found')

  return { profile, warnings }
}

/**
 * Step 2: Identify missing critical information.
 * Returns specific questions the user should answer.
 */
export async function identifyMissingInfo(profile: ParsedProfile, targetRole?: string): Promise<MissingInfo> {
  const { data } = await run<MissingInfo>(
    'resume_missing_info',
    '', '',
    [{
      role: 'user',
      content: `Given this resume profile${targetRole ? ` targeting a "${targetRole}" role` : ''}, identify what critical information is missing.

For each missing item, provide:
- "field": the field name (e.g., "email", "experience.bullets", "skills")
- "question": a specific question to ask the user (e.g., "What is your email address?")
- "priority": "high" (must have), "medium" (should have), or "low" (nice to have)

Profile:
${JSON.stringify(profile, null, 2)}

Return JSON array: [{ "field": string, "question": string, "priority": "high"|"medium"|"low" }]`,
    }],
    { json: true }
  )

  return data || []
}

/**
 * Step 3: ATS-optimize the resume for a specific job description.
 * Rewrites content for keyword matching while keeping all facts accurate.
 */
export async function optimizeForATS(
  profile: ParsedProfile,
  jobDescription: string
): Promise<ATSOptimizedResume> {
  const cleanedJD = sanitizePromptInput(jobDescription, 10000)

  const { data } = await run<ATSOptimizedResume>(
    'resume_ats_optimize',
    '', '',
    [{
      role: 'user',
      content: `Optimize this resume for ATS compatibility against the job description below.

Rules:
- Use ONLY the facts in the profile. NEVER invent metrics, skills, or experiences.
- Rewrite bullet points to include keywords from the job description where the skill genuinely exists.
- If a skill from the JD is NOT in the profile, add it to "missingInfo" — do NOT add it to skills.
- Keep all dates, company names, and titles exactly as provided.
- Quantify impact only if the original text mentions numbers.

Resume Profile:
${JSON.stringify(profile, null, 2)}

Job Description:
${cleanedJD}

Return JSON:
{
  "summary": string (rewritten ATS-optimized summary),
  "experience": [{ "title": string, "company": string, "location": string, "startDate": string, "endDate": string, "bullets": string[] (ATS-optimized) }],
  "skills": string[] (reordered by JD relevance, no new skills added),
  "missingInfo": string[] (skills/keywords in the JD that the candidate doesn't have),
  "atsTips": string[] (3 actionable tips to improve ATS score)
}`,
    }],
    { json: true }
  )

  return data
}

/**
 * Full pipeline: Parse → Validate → Identify Missing → (Optionally) ATS Optimize
 */
export async function runResumePipeline(
  rawText: string,
  jobDescription?: string,
  userId?: string,
  userName?: string
): Promise<PipelineResult> {
  // Step 1: Parse
  const { profile, warnings } = await parseResumeText(rawText)

  // Step 2: Identify missing info
  const missingInfo = await identifyMissingInfo(profile, jobDescription)

  // Step 3: ATS optimize (if JD provided)
  let optimized: ATSOptimizedResume | null = null
  if (jobDescription?.trim()) {
    optimized = await optimizeForATS(profile, jobDescription)
  }

  return {
    profile,
    missingInfo,
    optimized,
    warnings,
  }
}
