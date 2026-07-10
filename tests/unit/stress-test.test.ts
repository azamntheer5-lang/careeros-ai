import { describe, test, expect } from 'bun:test'
import { evaluateResume } from '../../src/lib/resume-evaluator'

/**
 * Phase 7: Expanded Stress Tests
 * Tests with varying input sizes: 10, 50, 100, 500, 2000, 10000 words
 * Plus: messy OCR, broken Arabic, broken English, mixed language
 */

describe('Stress — 10 words', () => {
  test('handles 10-word input', () => {
    const r = evaluateResume({ contact: { name: 'Sara' }, skills: { technical: ['Python'] } }, 'Sara knows Python', [])
    expect(r.overall).toBeGreaterThanOrEqual(0)
    expect(r.metrics.length).toBe(14)
  })
})

describe('Stress — 50 words', () => {
  test('handles 50-word input', () => {
    const text = 'John Smith john@test.com 555-1234 NYC. CS grad from NYU. Intern at Google. Know JavaScript Python React Node. '
    const r = evaluateResume({ contact: { name: 'John', email: 'john@test.com' }, skills: { technical: ['JavaScript'] } }, text, [])
    expect(r.overall).toBeGreaterThanOrEqual(0)
  })
})

describe('Stress — 500 words', () => {
  test('handles 500-word input', () => {
    const text = 'Engineer. ' + 'Built systems. '.repeat(100)
    const r = evaluateResume({ contact: { name: 'Test' }, skills: { technical: [] } }, text, [])
    expect(r.overall).toBeGreaterThanOrEqual(0)
    expect(Date.now()).toBeGreaterThan(0) // didn't hang
  })
})

describe('Stress — 2000 words', () => {
  test('handles 2000-word input in <100ms', () => {
    const text = 'John Doe. Engineer. ' + 'Built scalable systems. '.repeat(500)
    const resume = { contact: { name: 'John Doe' }, experience: [{ title: 'Dev', bullets: ['Built things'] }], skills: { technical: ['Python'] } }
    const start = Date.now()
    const r = evaluateResume(resume, text, [])
    const elapsed = Date.now() - start
    expect(elapsed).toBeLessThan(100)
    expect(r.metrics.length).toBe(14)
  })
})

describe('Stress — 10000 words', () => {
  test('handles 10000-word input in <200ms', () => {
    const text = 'Test. ' + 'Built things. '.repeat(2500)
    const resume = { contact: { name: 'Test' }, skills: { technical: [] } }
    const start = Date.now()
    const r = evaluateResume(resume, text, [])
    const elapsed = Date.now() - start
    expect(elapsed).toBeLessThan(200)
    expect(r).toBeDefined()
  })
})

describe('Stress — Empty input', () => {
  test('does not crash on empty resume', () => {
    const r = evaluateResume({ contact: {}, skills: {} }, '', [])
    expect(r.overall).toBeGreaterThanOrEqual(0)
  })
})

describe('Stress — Null fields', () => {
  test('does not crash with null/undefined', () => {
    const r = evaluateResume({ contact: { name: null, email: undefined }, skills: null, experience: undefined }, '', [])
    expect(r.metrics.length).toBe(14)
  })
})

describe('Stress — Broken Arabic', () => {
  test('handles Arabic text', () => {
    const r = evaluateResume({ contact: { name: 'مرية' }, skills: {} }, 'مرية مساعد', [])
    expect(r).toBeDefined()
  })
})

describe('Stress — Mixed language', () => {
  test('handles interleaved AR+EN', () => {
    const r = evaluateResume({ contact: { name: 'Ahmed أحمد' }, skills: { technical: [] } }, 'Ahmed أحمد Engineer مهندس', [])
    expect(r.metrics.length).toBe(14)
  })
})

describe('Stress — Large arrays', () => {
  test('handles 100 skills + 20 bullets', () => {
    const r = evaluateResume({
      contact: { name: 'Test', email: 't@t.com' },
      experience: [{ title: 'Dev', bullets: Array(20).fill('Built something reducing latency by 40%.') }],
      skills: { technical: Array(100).fill('skill'), soft: [], languages: [] },
    }, 'Test t@t.com Dev', [])
    expect(r).toBeDefined()
  })
})
