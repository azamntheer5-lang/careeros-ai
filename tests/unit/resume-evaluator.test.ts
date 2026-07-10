import { describe, test, expect } from 'bun:test'
import { evaluateResume, EvaluationResult } from '../../src/lib/resume-evaluator'
import { BENCHMARK_FIXTURES, BenchmarkFixture } from '../fixtures/benchmarks'

/**
 * Phase 3: AI Resume Pipeline Evaluation Tests
 *
 * These tests run the evaluation framework on simulated pipeline outputs
 * (since the real AI pipeline requires the dev server + live AI calls).
 * The evaluation metrics are tested against known-good and known-bad resumes.
 */

// ─── Simulated Pipeline Output (good extraction) ───────────────────

const GOOD_RESUME = {
  contact: {
    name: 'Maria Msaad Al-Juhani',
    email: 'mariaaljuhani890@gmail.com',
    phone: '0504157855',
    location: 'Yanbu',
    linkedin: null,
    website: null,
  },
  objective: 'Motivated cybersecurity professional seeking to leverage technical expertise and innovative problem-solving skills in a dynamic environment.',
  objectiveAr: null,
  experience: [{
    title: 'Field Training',
    company: null,
    location: null,
    startDate: null,
    endDate: null,
    bullets: [
      'Participated in comprehensive cybersecurity field training with hands-on project execution',
      'Completed Cisco Networking Academy certifications, demonstrating proficiency in network defense',
      'Applied network protection fundamentals and cyber defense techniques to secure approximately 50+ network endpoints',
    ],
  }],
  education: [{
    degree: 'Diploma in Cybersecurity',
    degreeAr: null,
    school: 'Taibah University, Applied College',
    startDate: null,
    endDate: '2026',
    details: 'GPA: 4.0/5.0',
  }],
  skills: {
    technical: ['JavaScript', 'Cybersecurity', 'Network Protection', 'Cyber Defense'],
    soft: ['Ability to work under pressure', 'Accuracy and precision', 'Innovation and creativity', 'Time management'],
    languages: [{ language: 'Arabic', level: 'Native' }, { language: 'English', level: 'Intermediate' }],
  },
  courses: [
    { name: 'JavaScript Essentials 1', provider: 'Cisco Networking Academy', hours: '40 hrs', date: '23 Apr 2025' },
    { name: 'JavaScript Essentials 2', provider: 'Cisco Networking Academy', hours: '50 hrs', date: '02 May 2025' },
    { name: 'Introduction to Cybersecurity', provider: 'Cisco Networking Academy', hours: '6 hrs', date: '24 Apr 2025' },
    { name: 'Network Defense', provider: 'Cisco Networking Academy', hours: '27 hrs', date: '05 May 2025' },
  ],
  certifications: [],
  projects: [],
}

const GOOD_SOURCE_TEXT = BENCHMARK_FIXTURES[0].rawText

// ─── Simulated Pipeline Output (with hallucination) ────────────────

const HALLUCINATED_RESUME = {
  ...GOOD_RESUME,
  contact: { ...GOOD_RESUME.contact, name: 'John Fake Name' },
  experience: [{
    ...GOOD_RESUME.experience[0],
    company: 'Google', // Not in source text
  }],
}

// ─── Tests ─────────────────────────────────────────────────────────

describe('Resume Evaluator — Extraction Accuracy', () => {
  test('scores 100% when all expected fields are present', () => {
    const result = evaluateResume(GOOD_RESUME, GOOD_SOURCE_TEXT, [], [
      'contact.name', 'contact.email', 'contact.phone', 'contact.location', 'objective', 'experience', 'education', 'skills.technical'
    ])
    const extractionMetric = result.metrics.find(m => m.name === 'Information Extraction Accuracy')
    expect(extractionMetric?.score).toBe(100)
    expect(extractionMetric?.passed).toBe(true)
  })

  test('scores lower when fields are missing', () => {
    const resumeWithMissing = { ...GOOD_RESUME, contact: { ...GOOD_RESUME.contact, email: null } }
    const result = evaluateResume(resumeWithMissing, GOOD_SOURCE_TEXT, [], [
      'contact.name', 'contact.email', 'contact.phone'
    ])
    const extractionMetric = result.metrics.find(m => m.name === 'Information Extraction Accuracy')
    expect(extractionMetric?.score).toBeLessThan(100)
    expect(extractionMetric?.details).toContain('2/3')
  })
})

describe('Resume Evaluator — Hallucination Detection', () => {
  test('passes when all data comes from source text', () => {
    const result = evaluateResume(GOOD_RESUME, GOOD_SOURCE_TEXT, [])
    const hallucMetric = result.metrics.find(m => m.name === 'Hallucination Detection')
    expect(hallucMetric?.score).toBe(100)
    expect(hallucMetric?.passed).toBe(true)
    expect(result.hallucinations).toHaveLength(0)
  })

  test('detects fabricated name', () => {
    const result = evaluateResume(HALLUCINATED_RESUME, GOOD_SOURCE_TEXT, [])
    const hallucMetric = result.metrics.find(m => m.name === 'Hallucination Detection')
    expect(hallucMetric?.score).toBe(0)
    expect(hallucMetric?.passed).toBe(false)
    expect(result.hallucinations.some(h => h.includes('John Fake Name'))).toBe(true)
  })

  test('detects fabricated company', () => {
    const result = evaluateResume(HALLUCINATED_RESUME, GOOD_SOURCE_TEXT, [])
    expect(result.hallucinations.some(h => h.includes('Google'))).toBe(true)
  })

  test('does not flag valid data as hallucination', () => {
    const result = evaluateResume(GOOD_RESUME, GOOD_SOURCE_TEXT, [])
    expect(result.hallucinations).toHaveLength(0)
  })
})

describe('Resume Evaluator — Section Completeness', () => {
  test('scores high for complete resume', () => {
    const result = evaluateResume(GOOD_RESUME, GOOD_SOURCE_TEXT, [])
    const completenessMetric = result.metrics.find(m => m.name === 'Section Completeness')
    expect(completenessMetric?.score).toBeGreaterThanOrEqual(80)
    expect(completenessMetric?.passed).toBe(true)
  })

  test('scores low for empty resume', () => {
    const emptyResume = { contact: {}, skills: {} }
    const result = evaluateResume(emptyResume, '', [])
    const completenessMetric = result.metrics.find(m => m.name === 'Section Completeness')
    expect(completenessMetric?.score).toBe(0)
    expect(completenessMetric?.passed).toBe(false)
  })
})

describe('Resume Evaluator — Professional Wording', () => {
  test('detects action verbs in enriched bullets', () => {
    const result = evaluateResume(GOOD_RESUME, GOOD_SOURCE_TEXT, [])
    const wordingMetric = result.metrics.find(m => m.name === 'Professional Wording')
    expect(wordingMetric?.score).toBeGreaterThan(0)
    expect(wordingMetric?.details).toContain('action verbs')
  })

  test('scores 0 for resume with no action verbs', () => {
    const weakResume = {
      ...GOOD_RESUME,
      experience: [{ title: 'Role', company: 'Co', bullets: ['Was at the office', 'Did things'] }],
    }
    const result = evaluateResume(weakResume, GOOD_SOURCE_TEXT, [])
    const wordingMetric = result.metrics.find(m => m.name === 'Professional Wording')
    expect(wordingMetric?.score).toBeLessThanOrEqual(20)
  })
})

describe('Resume Evaluator — Grammar', () => {
  test('penalizes first person usage', () => {
    const firstPersonResume = {
      ...GOOD_RESUME,
      experience: [{ title: 'Role', company: 'Co', bullets: ['I managed a team of 5 people'] }],
    }
    const result = evaluateResume(firstPersonResume, GOOD_SOURCE_TEXT, [])
    const grammarMetric = result.metrics.find(m => m.name === 'Grammar')
    expect(grammarMetric?.score).toBeLessThan(100)
  })

  test('passes for clean grammar', () => {
    const result = evaluateResume(GOOD_RESUME, GOOD_SOURCE_TEXT, [])
    const grammarMetric = result.metrics.find(m => m.name === 'Grammar')
    // GOOD_RESUME bullets don't end with periods, so grammar score is < 80 but should be >= 60
    expect(grammarMetric?.score).toBeGreaterThanOrEqual(60)
  })
})

describe('Resume Evaluator — Bullet Quality', () => {
  test('rewards measurable metrics in bullets', () => {
    const result = evaluateResume(GOOD_RESUME, GOOD_SOURCE_TEXT, [])
    const bulletMetric = result.metrics.find(m => m.name === 'Bullet Quality')
    expect(bulletMetric?.score).toBeGreaterThan(0)
  })

  test('scores 0 for bullets without metrics', () => {
    const noMetricsResume = {
      ...GOOD_RESUME,
      experience: [{ title: 'Role', company: 'Co', bullets: ['Did some work', 'Helped the team'] }],
    }
    const result = evaluateResume(noMetricsResume, GOOD_SOURCE_TEXT, [])
    const bulletMetric = result.metrics.find(m => m.name === 'Bullet Quality')
    expect(bulletMetric?.score).toBe(0)
  })
})

describe('Resume Evaluator — OCR Cleanup', () => {
  test('penalizes remaining OCR artifacts', () => {
    const dirtyResume = {
      ...GOOD_RESUME,
      contact: { ...GOOD_RESUME.contact, name: 'DOC-20260623 Maria' },
    }
    const result = evaluateResume(dirtyResume, GOOD_SOURCE_TEXT, [])
    const ocrMetric = result.metrics.find(m => m.name === 'OCR Cleanup')
    expect(ocrMetric?.score).toBeLessThan(100)
  })

  test('passes for clean resume', () => {
    const result = evaluateResume(GOOD_RESUME, GOOD_SOURCE_TEXT, [])
    const ocrMetric = result.metrics.find(m => m.name === 'OCR Cleanup')
    expect(ocrMetric?.score).toBe(100)
  })
})

describe('Resume Evaluator — Duplicate Removal', () => {
  test('detects duplicate experience entries', () => {
    const dupResume = {
      ...GOOD_RESUME,
      experience: [
        { title: 'Developer', company: 'A', bullets: ['Built things'] },
        { title: 'Developer', company: 'B', bullets: ['Built more things'] },
      ],
    }
    const result = evaluateResume(dupResume, GOOD_SOURCE_TEXT, [])
    const dupMetric = result.metrics.find(m => m.name === 'Duplicate Removal')
    expect(dupMetric?.score).toBeLessThan(100)
  })

  test('passes for unique entries', () => {
    const result = evaluateResume(GOOD_RESUME, GOOD_SOURCE_TEXT, [])
    const dupMetric = result.metrics.find(m => m.name === 'Duplicate Removal')
    expect(dupMetric?.score).toBe(100)
  })
})

describe('Resume Evaluator — Missing Info Detection', () => {
  test('rewards detecting multiple missing items', () => {
    const missingInfo = [
      { field: 'email', question: 'What is your email?', priority: 'high', suggestion: 'Add your email' },
      { field: 'linkedin', question: 'LinkedIn?', priority: 'medium', suggestion: null },
      { field: 'experience.company', question: 'Which company?', priority: 'high', suggestion: null },
      { field: 'website', question: 'Portfolio URL?', priority: 'low', suggestion: null },
      { field: 'skills', question: 'More skills?', priority: 'medium', suggestion: null },
    ]
    const result = evaluateResume(GOOD_RESUME, GOOD_SOURCE_TEXT, missingInfo)
    const missingMetric = result.metrics.find(m => m.name === 'Missing Information Detection')
    expect(missingMetric?.score).toBeGreaterThanOrEqual(90)
    expect(missingMetric?.passed).toBe(true)
  })

  test('scores lower when no missing info detected', () => {
    const result = evaluateResume(GOOD_RESUME, GOOD_SOURCE_TEXT, [])
    const missingMetric = result.metrics.find(m => m.name === 'Missing Information Detection')
    expect(missingMetric?.score).toBeLessThan(80)
  })
})

describe('Resume Evaluator — Overall Score', () => {
  test('calculates overall as average of all metrics', () => {
    const result = evaluateResume(GOOD_RESUME, GOOD_SOURCE_TEXT, [
      { field: 'email', question: 'Email?', priority: 'high', suggestion: null },
      { field: 'linkedin', question: 'LinkedIn?', priority: 'medium', suggestion: null },
      { field: 'company', question: 'Company?', priority: 'high', suggestion: null },
    ])
    expect(result.overall).toBeGreaterThan(0)
    expect(result.overall).toBeLessThanOrEqual(100)
    expect(result.metrics.length).toBe(14) // all 14 metrics
  })

  test('generates recommendations for failed metrics', () => {
    const weakResume = { contact: {}, skills: {} }
    const result = evaluateResume(weakResume, '', [])
    expect(result.recommendations.length).toBeGreaterThan(0)
  })
})

describe('Resume Evaluator — Bilingual', () => {
  test('passes for non-bilingual resume', () => {
    const result = evaluateResume(GOOD_RESUME, GOOD_SOURCE_TEXT, [])
    const bilingualMetric = result.metrics.find(m => m.name === 'Bilingual Consistency')
    expect(bilingualMetric?.score).toBe(100)
    expect(bilingualMetric?.passed).toBe(true)
  })

  test('detects bilingual inconsistencies', () => {
    const inconsistentResume = {
      ...GOOD_RESUME,
      contact: { ...GOOD_RESUME.contact, nameAr: 'ماري' }, // Arabic name but no Arabic objective
      objectiveAr: null,
    }
    const result = evaluateResume(inconsistentResume, GOOD_SOURCE_TEXT, [])
    const bilingualMetric = result.metrics.find(m => m.name === 'Bilingual Consistency')
    expect(bilingualMetric?.score).toBeLessThan(100)
  })
})

describe('Benchmark Fixtures', () => {
  test('has at least 10 fixtures', () => {
    expect(BENCHMARK_FIXTURES.length).toBeGreaterThanOrEqual(10)
  })

  test('each fixture has required fields', () => {
    for (const fixture of BENCHMARK_FIXTURES) {
      expect(fixture.id).toBeTruthy()
      expect(fixture.label).toBeTruthy()
      expect(fixture.rawText).toBeTruthy()
      expect(fixture.expectedFields.length).toBeGreaterThan(0)
      expect(['en', 'ar', 'bilingual']).toContain(fixture.expectedLanguage)
    }
  })

  test('covers diverse categories', () => {
    const categories = new Set(BENCHMARK_FIXTURES.map(f => f.category))
    expect(categories.has('cybersecurity')).toBe(true)
    expect(categories.has('hr')).toBe(true)
    expect(categories.has('healthcare')).toBe(true)
    expect(categories.has('marketing')).toBe(true)
    expect(categories.has('accounting')).toBe(true)
    expect(categories.has('ocr')).toBe(true)
    expect(categories.has('bilingual')).toBe(true)
    expect(categories.has('student')).toBe(true)
    expect(categories.has('fresh-graduate')).toBe(true)
  })

  test('includes ultra-short input', () => {
    const shortFixture = BENCHMARK_FIXTURES.find(f => f.id === 'student-10-words')
    expect(shortFixture).toBeTruthy()
    expect(shortFixture!.rawText.split(' ').length).toBeLessThan(20)
  })

  test('includes messy OCR', () => {
    const ocrFixture = BENCHMARK_FIXTURES.find(f => f.id === 'messy-ocr')
    expect(ocrFixture).toBeTruthy()
    expect(ocrFixture!.rawText.includes('|')).toBe(true)
  })
})
