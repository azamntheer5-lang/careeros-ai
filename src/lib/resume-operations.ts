/**
 * Resume Section Operations — rewrite and translate.
 *
 * Extracted from the legacy V2 pipeline. Only the two functions still in use
 * (rewriteSection, translateResume) remain — the V3 generation logic was
 * superseded by resume-pipeline-v4.ts and has been removed.
 */

import { run, sanitizePromptInput } from './ai'
import type { BilingualResume } from './resume-pipeline-v4'

export type { BilingualResume }

/** Rewrite a single resume section with AI. Never invents facts — only improves wording. */
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

/** Translate a complete resume to Arabic or English. Preserves proper nouns and JSON structure. */
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
