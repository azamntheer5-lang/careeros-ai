import { describe, test, expect } from 'bun:test'
import { evaluateResume } from '../../src/lib/resume-evaluator'

/**
 * Phase 7: Stress Testing the Evaluator
 *
 * Tests the evaluation framework with edge cases:
 * - 10 words, 50 words, 500 words, 2000 words, 10000 words
 * - Messy OCR, broken Arabic, broken English, mixed language
 * - Empty input, null fields, deeply nested garbage
 */

describe('Stress Test — Very Short Input (10 words)', () => {
  const resume = { contact: { name: 'Sara' }, skills: { technical: ['Python'] } }
  const source = 'Sara Al-Qahtani, CS student at KSU, know Python and Java.'

  test('does not crash', () => {
    const result = evaluateResume(resume, source, [])
    expect(result).toBeDefined()
    expect(result.overall).toBeGreaterThanOrEqual(0)
  })

  test('detects many missing fields', () => {
    const result = evaluateResume(resume, source, [])
    expect(result.missingFields.length).toBeGreaterThan(3)
  })
})

describe('Stress Test — Empty Input', () => {
  const emptyResume = { contact: {}, skills: {} }

  test('does not crash on empty resume', () => {
    const result = evaluateResume(emptyResume, '', [])
    expect(result).toBeDefined()
    expect(result.overall).toBeGreaterThanOrEqual(0)
    expect(result.metrics.length).toBe(14)
  })

  test('all metrics return valid scores', () => {
    const result = evaluateResume(emptyResume, '', [])
    for (const m of result.metrics) {
      expect(m.score).toBeGreaterThanOrEqual(0)
      expect(m.score).toBeLessThanOrEqual(100)
    }
  })
})

describe('Stress Test — Large Input (2000+ words)', () => {
  const largeText = 'John Doe. Software Engineer. ' + 'Built scalable systems. '.repeat(500)
  const largeResume = {
    contact: { name: 'John Doe', email: 'john@test.com' },
    objective: 'Software engineer',
    experience: Array(10).fill(null).map((_, i) => ({
      title: `Role ${i}`,
      company: `Company ${i}`,
      bullets: Array(20).fill('Built something amazing and reduced latency by 40%.'),
    })),
    education: [{ degree: 'BS CS', school: 'MIT' }],
    skills: { technical: ['Python', 'Java', 'Go'], soft: ['Leadership'], languages: [] },
  }

  test('does not crash on large resume', () => {
    const result = evaluateResume(largeResume, largeText, [])
    expect(result).toBeDefined()
    expect(result.overall).toBeGreaterThan(0)
  })

  test('completes in reasonable time (< 100ms)', () => {
    const start = Date.now()
    evaluateResume(largeResume, largeText, [])
    const elapsed = Date.now() - start
    expect(elapsed).toBeLessThan(100)
  })
})

describe('Stress Test — Broken Arabic', () => {
  const brokenArabic = 'مرية مساعد الجهن  مرايا@جميل.com  0551234'
  const resume = {
    contact: { name: 'مرية مساعد', email: 'مرايا@جميل.com', phone: '0551234' },
    skills: {},
  }

  test('does not crash with Arabic text', () => {
    const result = evaluateResume(resume, brokenArabic, [])
    expect(result).toBeDefined()
  })

  test('hallucination check works with Arabic', () => {
    const result = evaluateResume(resume, brokenArabic, [])
    expect(result.hallucinations).toBeDefined()
  })
})

describe('Stress Test — Mixed Language', () => {
  const mixedText = 'Ahmed أحمد. Software Engineer مهندس برمجيات. Built بنى systems.'
  const resume = {
    contact: { name: 'Ahmed أحمد' },
    objective: 'Software Engineer مهندس برمجيات',
    skills: { technical: [], soft: [], languages: [] },
  }

  test('does not crash with mixed text', () => {
    const result = evaluateResume(resume, mixedText, [])
    expect(result).toBeDefined()
    expect(result.metrics.length).toBe(14)
  })
})

describe('Stress Test — Null and Undefined Fields', () => {
  const nullResume = {
    contact: { name: null, email: undefined, phone: null },
    objective: null,
    experience: null,
    education: undefined,
    skills: null,
  }

  test('does not crash with null fields', () => {
    const result = evaluateResume(nullResume, '', [])
    expect(result).toBeDefined()
    expect(result.overall).toBeGreaterThanOrEqual(0)
  })
})

describe('Stress Test — Deeply Nested Garbage', () => {
  const garbageResume = {
    contact: { name: 'Test', email: 'test@test.com', phone: '123' },
    experience: [{
      title: 'Dev',
      company: 'Co',
      bullets: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't'],
    }],
    skills: { technical: Array(100).fill('skill'), soft: [], languages: [] },
  }

  test('handles large arrays without crashing', () => {
    const result = evaluateResume(garbageResume, 'Test test@test.com 123 Dev Co', [])
    expect(result).toBeDefined()
  })
})
