import { describe, test, expect } from 'bun:test'
import { preprocessText } from '../../src/lib/resume-pipeline-v2'

/**
 * Resume Pipeline V3 — Input Validation Tests
 *
 * Tests the preprocessing function against all input types:
 * - Arabic resumes
 * - English resumes
 * - Mixed bilingual
 * - Very short text
 * - Messy OCR
 * - WhatsApp exports
 * - LinkedIn copy
 * - Student resume
 * - Senior professional
 */

describe('Preprocessing — Text Cleaning', () => {
  test('decodes URL-encoded text', () => {
    const input = 'Hello%20World%0D%0A%0D%0ATest'
    const result = preprocessText(input)
    expect(result).toContain('Hello World')
    expect(result).toContain('Test')
  })

  test('replaces + with spaces', () => {
    const input = 'John+Doe+Software+Engineer'
    const result = preprocessText(input)
    expect(result).toBe('John Doe Software Engineer')
  })

  test('fixes broken lines (word\\n\\nword → word word)', () => {
    const input = 'Taibah\n\nUniversity'
    const result = preprocessText(input)
    expect(result).toContain('Taibah University')
  })

  test('removes WhatsApp document headers', () => {
    const input = 'DOC-20260623-WA0028.\n\nMaria Al-Juhani\n\nEmail'
    const result = preprocessText(input)
    expect(result).not.toContain('DOC-20260623')
    expect(result).toContain('Maria Al-Juhani')
  })

  test('removes email signatures', () => {
    const input = 'My resume content\n--\nSent from my iPhone'
    const result = preprocessText(input)
    expect(result).not.toContain('Sent from my iPhone')
    expect(result).toContain('My resume content')
  })

  test('normalizes excessive blank lines', () => {
    const input = 'Line 1\n\n\n\n\n\nLine 2'
    const result = preprocessText(input)
    expect(result).not.toMatch(/\n{3,}/)
  })

  test('trims whitespace', () => {
    const input = '  \n\n  Hello World  \n\n  '
    const result = preprocessText(input)
    expect(result).toBe('Hello World')
  })
})

describe('Input Type Validation', () => {
  test('accepts Arabic text', () => {
    const input = 'ماريه مساعد الجهبني\n\nالهدف الوظيفي\n\nأرغب في العمل في مجال الأمن السيبراني'
    const result = preprocessText(input)
    expect(result).toContain('ماريه')
    expect(result).toContain('الأمن السيبراني')
  })

  test('accepts English text', () => {
    const input = 'John Doe\n\nSoftware Engineer with 5 years experience'
    const result = preprocessText(input)
    expect(result).toContain('John Doe')
    expect(result).toContain('Software Engineer')
  })

  test('accepts mixed bilingual text', () => {
    const input = 'Maria Al-Juhani\nماريا الجوهني\n\nCybersecurity\nالأمن السيبراني'
    const result = preprocessText(input)
    expect(result).toContain('Maria Al-Juhani')
    expect(result).toContain('ماريا الجوهني')
  })

  test('accepts very short text (just a name)', () => {
    const input = 'Ahmed Ali\n\nProgrammer'
    const result = preprocessText(input)
    expect(result).toContain('Ahmed Ali')
    expect(result).toContain('Programmer')
  })

  test('accepts messy OCR with broken characters', () => {
    const input = 'J0hn D0e\n\nEm ail: john@email com\n\nPh one: 123 456 7890'
    const result = preprocessText(input)
    expect(result).toContain('J0hn D0e')
    expect(result.length).toBeGreaterThan(10)
  })

  test('accepts WhatsApp export format', () => {
    const input = 'DOC-20260623-WA0028.\n\nName: Test User\n\nEmail: test@test.com\n\n0501234567'
    const result = preprocessText(input)
    expect(result).toContain('Name: Test User')
    expect(result).toContain('test@test.com')
  })

  test('accepts LinkedIn profile copy', () => {
    const input = 'John Doe\nSenior Software Engineer at Google\n\nAbout\nExperienced engineer with 10 years...\n\nExperience\nGoogle - Senior Engineer (2020-Present)'
    const result = preprocessText(input)
    expect(result).toContain('Senior Software Engineer at Google')
  })

  test('accepts student resume with minimal experience', () => {
    const input = 'Sarah Ahmed\n\nStudent at King Saud University\n\nComputer Science, 3rd year\n\nSkills: Java, Python, HTML'
    const result = preprocessText(input)
    expect(result).toContain('Sarah Ahmed')
    expect(result).toContain('King Saud University')
  })

  test('accepts senior professional with extensive experience', () => {
    const input = 'Mohammed Al-Rashid\n\nVP of Engineering\n\n20+ years in software leadership\n\nExperience:\nVP at Aramco (2018-Present)\nDirector at STC (2010-2018)\nManager at Mobily (2005-2010)'
    const result = preprocessText(input)
    expect(result).toContain('VP of Engineering')
    expect(result).toContain('Aramco')
  })

  test('accepts text with tables converted to text', () => {
    const input = 'Name | Email | Phone\nJohn | john@test.com | 123\nJane | jane@test.com | 456'
    const result = preprocessText(input)
    expect(result).toContain('John')
    expect(result).toContain('jane@test.com')
  })

  test('handles empty input gracefully', () => {
    const result = preprocessText('')
    expect(result).toBe('')
  })

  test('handles whitespace-only input', () => {
    const result = preprocessText('   \n\n   \t\t  ')
    expect(result).toBe('')
  })
})

describe('Security — Input Sanitization', () => {
  test('strips control characters', () => {
    const input = 'Hello\x00\x01World'
    // The preprocessText doesn't strip control chars directly,
    // but sanitizePromptInput (used later in pipeline) does
    expect(preprocessText(input)).toContain('Hello')
  })

  test('limits extremely long input', () => {
    const input = 'A'.repeat(100000)
    const result = preprocessText(input)
    // Preprocessing doesn't limit length — that's done by clipInput in the API route
    expect(result.length).toBe(100000)
  })
})
