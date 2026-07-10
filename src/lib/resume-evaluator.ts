/**
 * Resume Evaluation Framework
 *
 * Scores generated resumes across 14 measurable metrics.
 * Every metric is computed programmatically — no subjective scoring.
 */

export type EvaluationMetric = {
  name: string
  score: number        // 0-100
  details: string
  passed: boolean      // score >= threshold
}

export type EvaluationResult = {
  overall: number
  metrics: EvaluationMetric[]
  hallucinations: string[]
  missingFields: string[]
  recommendations: string[]
}

// ─── Thresholds ────────────────────────────────────────────────────

const THRESHOLDS = {
  extractionAccuracy: 70,
  sectionCompleteness: 60,
  atsKeywordCoverage: 50,
  professionalWording: 70,
  grammar: 80,
  formatting: 75,
  readability: 70,
  bulletQuality: 65,
  duplicateRemoval: 90,
  ocrCleanup: 80,
  bilingualConsistency: 80,
  translationQuality: 75,
  hallucinationDetection: 100, // must be 100% (zero hallucinations allowed)
  missingInfoDetection: 70,
}

// ─── Evaluation Functions ──────────────────────────────────────────

/** 1. Information Extraction Accuracy — % of expected fields that were extracted */
function evaluateExtraction(resume: any, expectedFields: string[]): EvaluationMetric {
  let found = 0
  for (const field of expectedFields) {
    const parts = field.split('.')
    let val = resume
    for (const p of parts) { val = val?.[p] }
    if (val !== null && val !== undefined && val !== '' && !(Array.isArray(val) && val.length === 0)) {
      found++
    }
  }
  const score = Math.round((found / expectedFields.length) * 100)
  return {
    name: 'Information Extraction Accuracy',
    score,
    details: `${found}/${expectedFields.length} expected fields extracted`,
    passed: score >= THRESHOLDS.extractionAccuracy,
  }
}

/** 2. Section Completeness — % of standard resume sections present and non-empty */
function evaluateCompleteness(resume: any): EvaluationMetric {
  const sections = [
    { name: 'contact.name', weight: 15 },
    { name: 'contact.email', weight: 10 },
    { name: 'contact.phone', weight: 10 },
    { name: 'contact.location', weight: 5 },
    { name: 'objective', weight: 10 },
    { name: 'experience', weight: 20 },
    { name: 'education', weight: 10 },
    { name: 'skills.technical', weight: 10 },
    { name: 'skills.soft', weight: 5 },
    { name: 'skills.languages', weight: 5 },
  ]
  let score = 0
  for (const s of sections) {
    const parts = s.name.split('.')
    let val = resume
    for (const p of parts) { val = val?.[p] }
    if (val !== null && val !== undefined && val !== '' && !(Array.isArray(val) && val.length === 0)) {
      score += s.weight
    }
  }
  return { name: 'Section Completeness', score, details: `${score}/100 weight covered`, passed: score >= THRESHOLDS.sectionCompleteness }
}

/** 3. ATS Keyword Coverage — checks for industry-standard keywords */
function evaluateATSKeywords(resume: any): EvaluationMetric {
  const text = JSON.stringify(resume).toLowerCase()
  const atsSignals = [
    'experience', 'education', 'skills', 'email', 'phone', 'degree',
    'university', 'certification', 'achievement', 'project', 'training',
    'responsibilities', 'professional', 'summary', 'objective',
  ]
  let found = 0
  for (const kw of atsSignals) {
    if (text.includes(kw)) found++
  }
  const score = Math.round((found / atsSignals.length) * 100)
  return { name: 'ATS Keyword Coverage', score, details: `${found}/${atsSignals.length} ATS signals present`, passed: score >= THRESHOLDS.atsKeywordCoverage }
}

/** 4. Professional Wording — checks for action verbs and professional language */
function evaluateProfessionalWording(resume: any): EvaluationMetric {
  const text = JSON.stringify(resume).toLowerCase()
  const actionVerbs = [
    'led', 'managed', 'developed', 'implemented', 'designed', 'created',
    'built', 'improved', 'achieved', 'delivered', 'optimized', 'established',
    'coordinated', 'analyzed', 'executed', 'launched', 'streamlined',
    'spearheaded', 'orchestrated', 'facilitated', 'participated', 'completed',
    'applied', 'acquired', 'demonstrated', 'contributed', 'maintained',
  ]
  let found = 0
  for (const verb of actionVerbs) {
    if (text.includes(verb)) found++
  }
  const score = Math.min(100, Math.round((found / 5) * 100)) // 5 action verbs = 100%
  return { name: 'Professional Wording', score, details: `${found} action verbs detected`, passed: score >= THRESHOLDS.professionalWording }
}

/** 5. Grammar — checks for common grammar issues */
function evaluateGrammar(resume: any): EvaluationMetric {
  const text = JSON.stringify(resume)
  let issues = 0

  // Check for double spaces
  if (text.includes('  ')) issues++
  // Check for missing periods at end of bullets
  if (resume.experience) {
    for (const exp of resume.experience) {
      if (exp.bullets) {
        for (const b of exp.bullets) {
          if (b.length > 20 && !b.endsWith('.') && !b.endsWith('!') && !b.endsWith('?')) issues++
        }
      }
    }
  }
  // Check for lowercase starting letters in bullets
  if (resume.experience) {
    for (const exp of resume.experience) {
      if (exp.bullets) {
        for (const b of exp.bullets) {
          if (b.length > 0 && b[0] !== b[0].toUpperCase() && !/^\d/.test(b)) issues++
        }
      }
    }
  }
  // Check for "I " (first person — should be omitted in resumes)
  if (/\bI\s+(am|have|was|did|worked|led|managed|created|built|developed)/i.test(text)) issues++

  const score = Math.max(0, 100 - (issues * 10))
  return { name: 'Grammar', score, details: `${issues} grammar issues found`, passed: score >= THRESHOLDS.grammar }
}

/** 6. Formatting — checks for structural consistency */
function evaluateFormatting(resume: any): EvaluationMetric {
  let issues = 0
  // Check experience entries have required fields
  if (resume.experience) {
    for (const exp of resume.experience) {
      if (!exp.title) issues++
      if (!exp.bullets || exp.bullets.length === 0) issues++
    }
  }
  // Check education entries have required fields
  if (resume.education) {
    for (const ed of resume.education) {
      if (!ed.degree) issues++
      if (!ed.school) issues++
    }
  }
  // Check skills are categorized
  if (resume.skills) {
    if (!resume.skills.technical && !resume.skills.soft) issues++
  }
  const score = Math.max(0, 100 - (issues * 15))
  return { name: 'Formatting', score, details: `${issues} formatting issues`, passed: score >= THRESHOLDS.formatting }
}

/** 7. Readability — checks bullet length and sentence structure */
function evaluateReadability(resume: any): EvaluationMetric {
  let totalLen = 0
  let count = 0
  let tooLong = 0

  if (resume.experience) {
    for (const exp of resume.experience) {
      if (exp.bullets) {
        for (const b of exp.bullets) {
          totalLen += b.length
          count++
          if (b.length > 200) tooLong++
          if (b.length < 20) tooLong++ // too short
        }
      }
    }
  }

  if (count === 0) return { name: 'Readability', score: 0, details: 'No bullets to evaluate', passed: false }

  const avgLen = totalLen / count
  // Ideal: 80-180 chars per bullet
  let score = 100
  if (avgLen < 40) score -= 30
  if (avgLen > 200) score -= 20
  score -= (tooLong * 10)
  score = Math.max(0, Math.min(100, score))

  return { name: 'Readability', score, details: `Avg bullet: ${Math.round(avgLen)} chars, ${tooLong} out of range`, passed: score >= THRESHOLDS.readability }
}

/** 8. Bullet Quality — checks for measurable impact */
function evaluateBulletQuality(resume: any): EvaluationMetric {
  let total = 0
  let withMetrics = 0

  if (resume.experience) {
    for (const exp of resume.experience) {
      if (exp.bullets) {
        for (const b of exp.bullets) {
          total++
          // Check for numbers, percentages, or "approx."
          if (/\d+%|\d+\s*(users|customers|projects|hours|clients|systems|reports|teams|people)|approx\.|approximately/i.test(b)) {
            withMetrics++
          }
        }
      }
    }
  }

  if (total === 0) return { name: 'Bullet Quality', score: 0, details: 'No bullets to evaluate', passed: false }

  const score = Math.round((withMetrics / total) * 100)
  return { name: 'Bullet Quality', score, details: `${withMetrics}/${total} bullets have measurable metrics`, passed: score >= THRESHOLDS.bulletQuality }
}

/** 9. Duplicate Removal — checks for duplicate content between AR/EN */
function evaluateDuplicateRemoval(resume: any): EvaluationMetric {
  // If bilingual, check that content isn't simply duplicated
  let duplicates = 0
  if (resume.contact?.name && resume.contact?.nameAr) {
    if (resume.contact.name === resume.contact.nameAr) duplicates++
  }
  if (resume.objective && resume.objectiveAr) {
    if (resume.objective === resume.objectiveAr) duplicates++
  }
  // Check for duplicate experience entries
  if (resume.experience && resume.experience.length > 1) {
    const titles = resume.experience.map((e: any) => e.title?.toLowerCase()).filter(Boolean)
    const unique = new Set(titles)
    duplicates += (titles.length - unique.size)
  }

  const score = Math.max(0, 100 - (duplicates * 25))
  return { name: 'Duplicate Removal', score, details: `${duplicates} duplicates found`, passed: score >= THRESHOLDS.duplicateRemoval }
}

/** 10. OCR Cleanup — checks for common OCR artifacts */
function evaluateOCRCleanup(resume: any): EvaluationMetric {
  const text = JSON.stringify(resume)
  let artifacts = 0

  // Check for broken words (single letters surrounded by spaces)
  if (/\b[a-z]\s+[a-z]\b/i.test(text)) artifacts++
  // Check for pipe characters (WhatsApp artifact)
  if (text.includes('|')) artifacts++
  // Check for "DOC-" prefix (WhatsApp document header)
  if (text.includes('DOC-')) artifacts++
  // Check for excessive newlines in fields
  if (/\n{3,}/.test(text)) artifacts++
  // Check for URL encoding artifacts
  if (text.includes('%0') || text.includes('%20')) artifacts++

  const score = Math.max(0, 100 - (artifacts * 20))
  return { name: 'OCR Cleanup', score, details: `${artifacts} OCR artifacts remaining`, passed: score >= THRESHOLDS.ocrCleanup }
}

/** 11. Bilingual Consistency — checks AR/EN fields are consistent */
function evaluateBilingualConsistency(resume: any): EvaluationMetric {
  if (!resume.contact?.nameAr && !resume.objectiveAr) {
    return { name: 'Bilingual Consistency', score: 100, details: 'Not bilingual — N/A', passed: true }
  }

  let issues = 0
  // If name exists but nameAr doesn't (or vice versa)
  if ((resume.contact?.name && !resume.contact?.nameAr) || (!resume.contact?.name && resume.contact?.nameAr)) issues++
  // If objective exists but objectiveAr doesn't (or vice versa)
  if ((resume.objective && !resume.objectiveAr) || (!resume.objective && resume.objectiveAr)) issues++
  // Check education bilingual fields
  if (resume.education) {
    for (const ed of resume.education) {
      if (ed.degree && !ed.degreeAr && resume.contact?.nameAr) issues++
    }
  }

  const score = Math.max(0, 100 - (issues * 20))
  return { name: 'Bilingual Consistency', score, details: `${issues} bilingual inconsistencies`, passed: score >= THRESHOLDS.bilingualConsistency }
}

/** 12. Translation Quality — checks if translation is present and non-empty */
function evaluateTranslationQuality(resume: any): EvaluationMetric {
  if (!resume.contact?.nameAr && !resume.objectiveAr) {
    return { name: 'Translation Quality', score: 100, details: 'No translation needed — N/A', passed: true }
  }

  let checks = 0
  let passed = 0

  if (resume.contact?.nameAr) { checks++; if (resume.contact.nameAr.length > 2) passed++ }
  if (resume.objectiveAr) { checks++; if (resume.objectiveAr.length > 20) passed++ }
  if (resume.education) {
    for (const ed of resume.education) {
      if (ed.degreeAr) { checks++; if (ed.degreeAr.length > 2) passed++ }
    }
  }

  const score = checks > 0 ? Math.round((passed / checks) * 100) : 100
  return { name: 'Translation Quality', score, details: `${passed}/${checks} translation checks passed`, passed: score >= THRESHOLDS.translationQuality }
}

/** 13. Hallucination Detection — compares resume fields against source text */
function evaluateHallucination(resume: any, sourceText: string): { metric: EvaluationMetric; hallucinations: string[] } {
  const hallucinations: string[] = []
  const sourceLower = sourceText.toLowerCase()

  // Check name
  if (resume.contact?.name) {
    const nameParts = resume.contact.name.toLowerCase().split(' ')
    const foundInSource = nameParts.some((p: string) => p.length > 2 && sourceLower.includes(p))
    if (!foundInSource) hallucinations.push(`Name "${resume.contact.name}" not found in source text`)
  }

  // Check email
  if (resume.contact?.email) {
    if (!sourceLower.includes(resume.contact.email.toLowerCase())) {
      hallucinations.push(`Email "${resume.contact.email}" not found in source text`)
    }
  }

  // Check phone
  if (resume.contact?.phone) {
    const digits = resume.contact.phone.replace(/\D/g, '')
    const sourceDigits = sourceText.replace(/\D/g, '')
    if (digits.length > 4 && !sourceDigits.includes(digits.slice(-8))) {
      hallucinations.push(`Phone "${resume.contact.phone}" not found in source text`)
    }
  }

  // Check companies in experience
  if (resume.experience) {
    for (const exp of resume.experience) {
      if (exp.company && exp.company !== 'null') {
        const companyLower = exp.company.toLowerCase()
        if (companyLower.length > 3 && !sourceLower.includes(companyLower)) {
          hallucinations.push(`Company "${exp.company}" not found in source text`)
        }
      }
    }
  }

  // Check schools in education
  if (resume.education) {
    for (const ed of resume.education) {
      if (ed.school && ed.school !== 'null') {
        const schoolLower = ed.school.toLowerCase()
        if (schoolLower.length > 3 && !sourceLower.includes(schoolLower)) {
          hallucinations.push(`School "${ed.school}" not found in source text`)
        }
      }
    }
  }

  const score = hallucinations.length === 0 ? 100 : 0
  return {
    metric: { name: 'Hallucination Detection', score, details: hallucinations.length === 0 ? 'No hallucinations detected' : `${hallucinations.length} potential hallucinations`, passed: score >= THRESHOLDS.hallucinationDetection },
    hallucinations,
  }
}

/** 14. Missing Information Detection — checks if pipeline identified missing fields */
function evaluateMissingInfoDetection(missingInfo: any[]): EvaluationMetric {
  const highPriority = missingInfo?.filter(m => m.priority === 'high').length || 0
  const total = missingInfo?.length || 0

  // Good detection = found missing items, especially high priority
  let score = 0
  if (total >= 3) score = 80
  if (total >= 5) score = 90
  if (highPriority >= 1) score = 100

  return { name: 'Missing Information Detection', score, details: `${total} missing items detected (${highPriority} high priority)`, passed: score >= THRESHOLDS.missingInfoDetection }
}

// ─── Main Evaluator ────────────────────────────────────────────────

export function evaluateResume(
  resume: any,
  sourceText: string,
  missingInfo: any[],
  expectedFields: string[] = ['contact.name', 'contact.email', 'contact.phone', 'objective', 'experience', 'education', 'skills.technical']
): EvaluationResult {
  const metrics: EvaluationMetric[] = []
  const hallucinations: string[] = []

  // Run all evaluations
  metrics.push(evaluateExtraction(resume, expectedFields))
  metrics.push(evaluateCompleteness(resume))
  metrics.push(evaluateATSKeywords(resume))
  metrics.push(evaluateProfessionalWording(resume))
  metrics.push(evaluateGrammar(resume))
  metrics.push(evaluateFormatting(resume))
  metrics.push(evaluateReadability(resume))
  metrics.push(evaluateBulletQuality(resume))
  metrics.push(evaluateDuplicateRemoval(resume))
  metrics.push(evaluateOCRCleanup(resume))
  metrics.push(evaluateBilingualConsistency(resume))
  metrics.push(evaluateTranslationQuality(resume))

  const hallucResult = evaluateHallucination(resume, sourceText)
  metrics.push(hallucResult.metric)
  hallucinations.push(...hallucResult.hallucinations)

  metrics.push(evaluateMissingInfoDetection(missingInfo))

  // Calculate overall
  const overall = Math.round(metrics.reduce((sum, m) => sum + m.score, 0) / metrics.length)

  // Identify missing fields
  const missingFields: string[] = []
  if (!resume.contact?.name) missingFields.push('name')
  if (!resume.contact?.email) missingFields.push('email')
  if (!resume.contact?.phone) missingFields.push('phone')
  if (!resume.objective) missingFields.push('objective')
  if (!resume.experience?.length) missingFields.push('experience')
  if (!resume.education?.length) missingFields.push('education')
  if (!resume.skills?.technical?.length) missingFields.push('technical skills')

  // Generate recommendations
  const recommendations: string[] = []
  for (const m of metrics) {
    if (!m.passed) {
      recommendations.push(`Improve ${m.name}: ${m.details}`)
    }
  }

  return { overall, metrics, hallucinations, missingFields, recommendations }
}
