import { describe, test, expect } from 'bun:test'
import {
  detectLanguage,
  cleanOCRText,
  deduplicateResume,
  extractKeywords,
  detectProfession,
  detectMissingInfo,
  calculateConfidence,
} from '../../src/lib/resume-pipeline-v4'

describe('V4 — Language Detection (local)', () => {
  test('detects English', () => {
    expect(detectLanguage('Hello World')).toBe('en')
  })
  test('detects Arabic', () => {
    expect(detectLanguage('مرحبا بالعالم')).toBe('ar')
  })
  test('detects bilingual', () => {
    expect(detectLanguage('Hello مرحبا')).toBe('bilingual')
  })
  test('handles empty text', () => {
    expect(detectLanguage('')).toBe('en')
  })
})

describe('V4 — OCR Cleanup (local)', () => {
  test('decodes URL encoding', () => {
    expect(cleanOCRText('hello%20world')).toBe('hello world')
  })
  test('removes WhatsApp headers', () => {
    expect(cleanOCRText('DOC-20260623-WA0028. Hello')).toBe('Hello')
  })
  test('fixes broken lines', () => {
    expect(cleanOCRText('Taibah\n\nUniversity')).toBe('Taibah University')
  })
  test('fixes "gmail dot com"', () => {
    expect(cleanOCRText('rob at gmail dot com')).toBe('rob@gmail.com')
  })
  test('replaces + with spaces', () => {
    expect(cleanOCRText('hello+world')).toBe('hello world')
  })
})

describe('V4 — Deduplication (local)', () => {
  test('removes duplicate experience entries', () => {
    const resume = {
      contact: {}, objective: null, objectiveAr: null,
      experience: [
        { title: 'Developer', company: 'Google', location: null, startDate: null, endDate: null, bullets: [] },
        { title: 'Developer', company: 'Google', location: null, startDate: null, endDate: null, bullets: [] },
      ],
      education: [], skills: { technical: [], soft: [], languages: [] },
      courses: [], certifications: [], projects: [],
    }
    const result = deduplicateResume(resume as any)
    expect(result.experience.length).toBe(1)
  })

  test('removes duplicate skills', () => {
    const resume = {
      contact: {}, objective: null, objectiveAr: null,
      experience: [], education: [],
      skills: { technical: ['Python', 'Python', 'Java'], soft: [], languages: [] },
      courses: [], certifications: [], projects: [],
    }
    const result = deduplicateResume(resume as any)
    expect(result.skills.technical.length).toBe(2)
  })

  test('removes duplicate courses', () => {
    const resume = {
      contact: {}, objective: null, objectiveAr: null, experience: [], education: [],
      skills: { technical: [], soft: [], languages: [] },
      courses: [
        { name: 'JavaScript', provider: 'Cisco', hours: '40', date: '2025' },
        { name: 'JavaScript', provider: 'Cisco', hours: '40', date: '2025' },
      ],
      certifications: [], projects: [],
    }
    const result = deduplicateResume(resume as any)
    expect(result.courses.length).toBe(1)
  })
})

describe('V4 — Keyword Extraction (local)', () => {
  test('extracts technical keywords from resume', () => {
    const resume = {
      contact: { name: 'Test' }, objective: 'Software engineer', objectiveAr: null,
      experience: [{ title: 'Dev', company: 'Co', location: null, startDate: null, endDate: null, bullets: ['Built React app with TypeScript'] }],
      education: [], skills: { technical: ['React', 'TypeScript', 'Python'], soft: [], languages: [] },
      courses: [], certifications: [], projects: [],
    }
    const result = extractKeywords(resume as any)
    expect(result.detected).toContain('react')
    expect(result.detected).toContain('typescript')
    expect(result.detected).toContain('python')
  })

  test('detects action verbs', () => {
    const resume = {
      contact: { name: 'Test' }, objective: null, objectiveAr: null,
      experience: [{ title: 'Dev', company: 'Co', location: null, startDate: null, endDate: null, bullets: ['Led team of 5', 'Built scalable systems'] }],
      education: [], skills: { technical: [], soft: [], languages: [] },
      courses: [], certifications: [], projects: [],
    }
    const result = extractKeywords(resume as any)
    expect(result.actionVerbs).toContain('led')
    expect(result.actionVerbs).toContain('built')
  })

  test('suggests keywords based on profession', () => {
    const resume = {
      contact: { name: 'Test' }, objective: 'Cybersecurity specialist', objectiveAr: null,
      experience: [], education: [],
      skills: { technical: ['cybersecurity', 'network security'], soft: [], languages: [] },
      courses: [], certifications: [], projects: [],
    }
    const result = extractKeywords(resume as any)
    expect(result.suggested).toContain('Penetration Testing')
  })
})

describe('V4 — Profession Detection (local)', () => {
  test('detects cybersecurity', () => {
    const resume = {
      contact: { name: 'Test' }, objective: 'Cybersecurity professional', objectiveAr: null,
      experience: [], education: [],
      skills: { technical: ['cybersecurity'], soft: [], languages: [] },
      courses: [], certifications: [], projects: [],
    }
    expect(detectProfession(resume as any).profession).toBe('Cybersecurity')
  })

  test('detects software engineering', () => {
    const resume = {
      contact: { name: 'Test' }, objective: 'Software engineer', objectiveAr: null,
      experience: [], education: [],
      skills: { technical: ['react', 'javascript'], soft: [], languages: [] },
      courses: [], certifications: [], projects: [],
    }
    expect(detectProfession(resume as any).profession).toBe('Software Engineering')
  })

  test('detects senior seniority with 3+ experience entries', () => {
    const resume = {
      contact: { name: 'Test' }, objective: null, objectiveAr: null,
      experience: [
        { title: 'Senior Dev', company: 'A', location: null, startDate: null, endDate: null, bullets: [] },
        { title: 'Dev', company: 'B', location: null, startDate: null, endDate: null, bullets: [] },
        { title: 'Junior', company: 'C', location: null, startDate: null, endDate: null, bullets: [] },
      ],
      education: [], skills: { technical: [], soft: [], languages: [] },
      courses: [], certifications: [], projects: [],
    }
    expect(detectProfession(resume as any).seniority).toBe('Senior')
  })

  test('defaults to entry-level with no experience', () => {
    const resume = {
      contact: { name: 'Test' }, objective: null, objectiveAr: null,
      experience: [], education: [],
      skills: { technical: [], soft: [], languages: [] },
      courses: [], certifications: [], projects: [],
    }
    expect(detectProfession(resume as any).seniority).toBe('Entry-level')
  })
})

describe('V4 — Missing Info Detection (local)', () => {
  test('detects all missing fields in empty resume', () => {
    const resume = {
      contact: {}, objective: null, objectiveAr: null,
      experience: [], education: [],
      skills: { technical: [], soft: [], languages: [] },
      courses: [], certifications: [], projects: [],
    }
    const missing = detectMissingInfo(resume as any)
    expect(missing.length).toBeGreaterThanOrEqual(8)
    expect(missing.some(m => m.field === 'contact.name' && m.priority === 'high')).toBe(true)
    expect(missing.some(m => m.field === 'contact.email' && m.priority === 'high')).toBe(true)
  })

  test('returns fewer items for complete resume', () => {
    const resume = {
      contact: { name: 'John', email: 'john@test.com', phone: '123', linkedin: 'linkedin.com/in/john' },
      objective: 'Software engineer',
      objectiveAr: null,
      experience: [{ title: 'Dev', company: 'Co', location: null, startDate: null, endDate: null, bullets: ['Built things'] }],
      education: [{ degree: 'BS', school: 'MIT', location: null, startDate: null, endDate: null, details: null }],
      skills: { technical: ['Python'], soft: [], languages: [{ language: 'English', level: 'Native' }] },
      courses: [], certifications: [], projects: [],
    }
    const missing = detectMissingInfo(resume as any)
    expect(missing.length).toBeLessThan(5)
  })
})

describe('V4 — Confidence Scoring (local)', () => {
  test('returns high for present fields, low for missing', () => {
    const resume = {
      contact: { name: 'John', email: 'john@test.com', phone: null, location: null },
      objective: 'Developer', objectiveAr: null,
      experience: [], education: [],
      skills: { technical: [], soft: [], languages: [] },
      courses: [], certifications: [], projects: [],
    }
    const confidence = calculateConfidence(resume as any)
    expect(confidence['contact.name']).toBe('high')
    expect(confidence['contact.email']).toBe('high')
    expect(confidence['contact.phone']).toBe('low')
    expect(confidence['contact.location']).toBe('low')
    expect(confidence['objective']).toBe('medium')
    expect(confidence['experience']).toBe('low')
  })
})
