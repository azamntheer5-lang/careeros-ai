/**
 * POST /api/resumes/import
 *
 * Unified resume import endpoint. Accepts an uploaded resume file (TXT, DOCX,
 * PDF, or image) and returns extracted raw text + detected language.
 *
 * Supported request shapes:
 *   1. multipart/form-data  →  field "file" = File
 *   2. application/json     →  { base64: string, filename: string, mimeType: string }
 *
 * Response (200):
 *   {
 *     text: string,                // raw extracted text (cleaned + clipped to 15000 chars)
 *     detectedLanguage: string,    // 'en' | 'ar' | 'bilingual'
 *     filename: string,            // sanitized basename
 *     fileSize: number,            // bytes
 *     mimeType: string             // normalized MIME type
 *   }
 *
 * Security:
 *   - 10MB max file size
 *   - MIME type allow-list
 *   - Magic-byte verification (declared MIME must match actual file signature)
 *   - Filename sanitization (basename only, no path traversal)
 *   - Rate-limited as 'ai_generate' (10/min)
 *   - All imports recorded to AuditLog
 */

import { NextResponse } from 'next/server'
import { Buffer } from 'node:buffer'
import ZAI from 'z-ai-web-dev-sdk'
import { db } from '@/lib/db'
import { getCurrentUser, err, clipInput } from '@/lib/server'
import { rateLimitOr429 } from '@/lib/rate-limit'
import { cleanOCRText, detectLanguage } from '@/lib/resume-pipeline-v4'

export const runtime = 'nodejs'
export const maxDuration = 60

// ─── Constants ────────────────────────────────────────────────────────

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB

const ALLOWED_MIME = new Set<string>([
  'text/plain',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
])

// MIME type → expected magic-byte signature (at file start).
// A null entry means "no reliable magic bytes" — we still trust the declared
// MIME for text/plain (TXT) because it has no universal signature.
const MAGIC_BYTES: Record<string, (buf: Uint8Array) => boolean> = {
  'application/pdf': (b) => b.length >= 4 &&
    b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46, // %PDF
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': (b) =>
    b.length >= 2 && b[0] === 0x50 && b[1] === 0x4b, // PK (ZIP)
  'image/png': (b) => b.length >= 4 &&
    b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47, // \x89PNG
  'image/jpeg': (b) => b.length >= 3 &&
    b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff, // \xFF\xD8\xFF
  'image/webp': (b) =>
    // RIFF....WEBP
    b.length >= 12 &&
    b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
    b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50,
}

const IMAGE_MIME = new Set<string>(['image/png', 'image/jpeg', 'image/webp'])

const VLM_OCR_PROMPT =
  'Extract all text from this document image exactly as written. Return only the raw text, no JSON, no commentary.'

// ─── Zip bomb protection (DOCX is a ZIP archive) ──────────────────────
// A tiny DOCX could decompress to gigabytes, exhausting server memory.
// We pre-scan the ZIP central directory and reject archives that exceed
// sane uncompressed-size or entry-count limits before handing the buffer
// to mammoth. See: https://en.wikipedia.org/wiki/Zip_bomb
const DOCX_MAX_UNCOMPRESSED_SIZE = 100 * 1024 * 1024 // 100 MB total uncompressed
const DOCX_MAX_ENTRIES = 500 // reject archives with too many entries

/** Sum the uncompressed sizes from a ZIP's central directory. Throws on zip-bomb. */
function assertSafeZip(buf: Uint8Array): void {
  // Find the End-of-Central-Directory (EOCD) record: PK\x05\x06
  // Scan from the end (the EOCD is in the last 64KB + comment).
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength)
  const minEocd = Math.max(0, buf.byteLength - 65536 - 22)
  let eocdOffset = -1
  for (let i = buf.byteLength - 22; i >= minEocd; i--) {
    if (
      buf[i] === 0x50 && buf[i + 1] === 0x4b &&
      buf[i + 2] === 0x05 && buf[i + 3] === 0x06
    ) {
      eocdOffset = i
      break
    }
  }
  if (eocdOffset < 0) {
    throw new Error('Invalid DOCX: End-of-Central-Directory record not found')
  }

  const totalEntries = view.getUint16(eocdOffset + 10, true)
  const cdSize = view.getUint32(eocdOffset + 12, true)
  const cdOffset = view.getUint32(eocdOffset + 16, true)

  if (totalEntries > DOCX_MAX_ENTRIES) {
    throw new Error(`Zip bomb detected: ${totalEntries} entries (max ${DOCX_MAX_ENTRIES})`)
  }

  // Walk the central directory and sum uncompressed sizes.
  let totalUncompressed = 0
  let offset = cdOffset
  const cdEnd = cdOffset + cdSize
  for (let i = 0; i < totalEntries; i++) {
    if (offset + 46 > cdEnd) break
    // Verify central-directory file header signature: PK\x01\x02
    if (
      buf[offset] !== 0x50 || buf[offset + 1] !== 0x4b ||
      buf[offset + 2] !== 0x01 || buf[offset + 3] !== 0x02
    ) {
      throw new Error('Invalid DOCX: corrupt central directory entry')
    }
    const uncompressedSize = view.getUint32(offset + 24, true)
    const compressedSize = view.getUint32(offset + 20, true)
    // Per-entry sanity: no single entry may exceed the global cap.
    if (uncompressedSize > DOCX_MAX_UNCOMPRESSED_SIZE) {
      throw new Error(`Zip bomb detected: single entry uncompressed size ${uncompressedSize} exceeds limit`)
    }
    // Detection ratio: if any entry has a compression ratio > 500:1, treat as bomb.
    // (A normal DOCX has ~5:1 to 50:1 ratio; zip bombs are typically 1000:1+.)
    if (compressedSize > 0 && uncompressedSize / compressedSize > 500) {
      throw new Error(
        `Zip bomb detected: entry compression ratio ${(uncompressedSize / compressedSize).toFixed(0)}:1 exceeds safe limit`
      )
    }
    totalUncompressed += uncompressedSize
    if (totalUncompressed > DOCX_MAX_UNCOMPRESSED_SIZE) {
      throw new Error(
        `Zip bomb detected: total uncompressed size ${totalUncompressed} exceeds limit ${DOCX_MAX_UNCOMPRESSED_SIZE}`
      )
    }
    // Advance to next central-directory entry.
    const fnLen = view.getUint16(offset + 28, true)
    const extraLen = view.getUint16(offset + 30, true)
    const commentLen = view.getUint16(offset + 32, true)
    offset += 46 + fnLen + extraLen + commentLen
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────

/** Decode a UTF-8 Uint8Array / Buffer to a string. */
function decodeUtf8(buf: Uint8Array | ArrayBuffer): string {
  const bytes = buf instanceof ArrayBuffer ? new Uint8Array(buf) : buf
  try {
    // Prefer the platform TextDecoder (available in runtime=nodejs)
    const td = new TextDecoder('utf-8', { fatal: false })
    return td.decode(bytes)
  } catch {
    // Fallback: Buffer.from
    return Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength).toString('utf-8')
  }
}

/** Strip optional data-URL prefix from a base64 string. */
function stripDataUrl(s: string): string {
  const i = s.indexOf('base64,')
  return i >= 0 ? s.slice(i + 7) : s
}

/** Convert a base64 string to a Uint8Array. */
function base64ToUint8(b64: string): Uint8Array {
  const clean = stripDataUrl(b64)
  const bin = atob(clean)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

/**
 * Sanitize a filename: keep only the basename, strip directory components,
 * and remove control characters. Falls back to "untitled" if empty.
 */
function sanitizeFilename(name: string | undefined | null): string {
  if (!name || typeof name !== 'string') return 'untitled'
  // Strip any path separators (handle both / and \ and remove .. traversal)
  const base = name.split(/[\\/]/).pop() || name
  // Remove control chars and null bytes
  const cleaned = base.replace(/[\x00-\x1f\x7f]/g, '').trim()
  return cleaned || 'untitled'
}

/** Verify the declared MIME type matches the file's actual magic bytes. */
function verifyMagicBytes(mimeType: string, buf: Uint8Array): boolean {
  const check = MAGIC_BYTES[mimeType]
  if (!check) return true // text/plain has no universal signature — accept
  try {
    return check(buf)
  } catch {
    return false
  }
}

/** Normalize a few common MIME aliases to our canonical allow-list values. */
function normalizeMime(declared: string): string {
  const m = declared.toLowerCase().trim()
  // Common DOCX aliases
  if (m === 'application/docx' || m === 'application/x-docx' || m.endsWith('.docx')) {
    return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  }
  // Common PDF aliases
  if (m === 'application/x-pdf') return 'application/pdf'
  // Common image aliases
  if (m === 'image/jpg') return 'image/jpeg'
  // TXT aliases
  if (m === 'text/plain; charset=utf-8' || m.startsWith('text/plain')) return 'text/plain'
  return m
}

// ─── Text extractors per file type ────────────────────────────────────

async function extractTxt(buf: Uint8Array): Promise<string> {
  return decodeUtf8(buf)
}

async function extractDocx(buf: Uint8Array): Promise<string> {
  // SECURITY: Pre-scan the ZIP central directory to reject zip bombs
  // (DOCX is a ZIP archive; a tiny file could decompress to gigabytes).
  assertSafeZip(buf)
  const mammoth = await import('mammoth')
  const nodeBuf = Buffer.from(buf.buffer, buf.byteOffset, buf.byteLength)
  const result = await mammoth.extractRawText({ buffer: nodeBuf })
  // Final safety: cap the extracted text length so a pathological DOCX
  // can't return a multi-MB string that gets clipped later anyway.
  const MAX_DOCX_TEXT = 200_000
  return (result.value || '').slice(0, MAX_DOCX_TEXT)
}

async function extractPdf(buf: Uint8Array): Promise<string> {
  // pdf-parse v2 exposes the PDFParse class.
  // We disable workers / set verbosity to keep the Node.js runtime quiet.
  const { PDFParse } = await import('pdf-parse')
  const parser = new PDFParse({
    data: buf,
    // Silence pdfjs warnings in logs
    verbosity: 0,
    disableWorker: true,
    isEvalSupported: false,
    useSystemFonts: true,
  } as any)
  try {
    const result = await parser.getText()
    // result.text is the concatenated document text
    return result?.text || ''
  } finally {
    try { await parser.destroy() } catch {}
  }
}

async function extractImage(buf: Uint8Array, mimeType: string): Promise<string> {
  const nodeBuf = Buffer.from(buf.buffer, buf.byteOffset, buf.byteLength)
  const b64 = nodeBuf.toString('base64')
  const dataUrl = `data:${mimeType};base64,${b64}`

  const zai = await ZAI.create()
  const response = await zai.chat.completions.createVision({
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: VLM_OCR_PROMPT },
          { type: 'image_url', image_url: { url: dataUrl } },
        ],
      },
    ],
    thinking: { type: 'disabled' },
  } as any)

  const content = (response as any)?.choices?.[0]?.message?.content
  if (!content) return ''
  // The VLM may return either a string or a structured content array.
  if (typeof content === 'string') return content
  if (Array.isArray(content)) {
    return content
      .map((c: any) => (typeof c === 'string' ? c : c?.text || ''))
      .join('\n')
      .trim()
  }
  return String(content || '')
}

// ─── Main POST handler ────────────────────────────────────────────────

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser()

    // Rate limit (10/min for AI-generation tier — image OCR counts as AI call)
    const limited = rateLimitOr429(user.id, 'ai_generate')
    if (limited) return limited

    // ─── Parse request: multipart OR JSON ───────────────────────────
    let filename: string
    let mimeType: string
    let fileBuf: Uint8Array

    const contentType = (req.headers.get('content-type') || '').toLowerCase()

    if (contentType.includes('multipart/form-data')) {
      // ─── Multipart path ───
      const form = await req.formData()
      const file = form.get('file')
      if (!file || !(file instanceof File)) {
        return NextResponse.json(
          { error: 'Missing "file" field in multipart form data' },
          { status: 400 }
        )
      }
      filename = file.name || 'untitled'
      mimeType = file.type || 'application/octet-stream'
      const ab = await file.arrayBuffer()
      fileBuf = new Uint8Array(ab)
    } else if (contentType.includes('application/json')) {
      // ─── JSON path (client converted to base64) ───
      const body = await req.json().catch(() => null)
      if (!body || typeof body !== 'object') {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
      }
      const rawB64 = String(body.base64 || '')
      if (!rawB64) {
        return NextResponse.json(
          { error: 'Missing "base64" field in JSON body' },
          { status: 400 }
        )
      }
      filename = String(body.filename || 'untitled')
      mimeType = String(body.mimeType || 'application/octet-stream')
      try {
        fileBuf = base64ToUint8(rawB64)
      } catch {
        return NextResponse.json(
          { error: 'Invalid base64 payload' },
          { status: 400 }
        )
      }
    } else {
      return NextResponse.json(
        { error: 'Unsupported Content-Type. Use multipart/form-data or application/json.' },
        { status: 400 }
      )
    }

    const fileSize = fileBuf.byteLength

    // ─── Size validation ───
    if (fileSize === 0) {
      return NextResponse.json({ error: 'File is empty' }, { status: 400 })
    }
    if (fileSize > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large. Max size is ${MAX_FILE_SIZE / (1024 * 1024)}MB` },
        { status: 413 }
      )
    }

    // ─── MIME normalization & allow-list ───
    const normalizedMime = normalizeMime(mimeType)
    if (!ALLOWED_MIME.has(normalizedMime)) {
      return NextResponse.json(
        {
          error: `Unsupported file type: ${normalizedMime}. Allowed: TXT, DOCX, PDF, PNG, JPEG, WEBP.`,
        },
        { status: 400 }
      )
    }

    // ─── Magic-byte verification ───
    if (!verifyMagicBytes(normalizedMime, fileBuf)) {
      return NextResponse.json(
        {
          error:
            'File signature does not match the declared MIME type. The file may be corrupted or mislabeled.',
        },
        { status: 400 }
      )
    }

    // ─── Filename sanitization ───
    const safeFilename = sanitizeFilename(filename)

    // ─── Extract text by type ───
    let rawText = ''
    try {
      if (normalizedMime === 'text/plain') {
        rawText = await extractTxt(fileBuf)
      } else if (
        normalizedMime ===
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ) {
        rawText = await extractDocx(fileBuf)
      } else if (normalizedMime === 'application/pdf') {
        rawText = await extractPdf(fileBuf)
      } else if (IMAGE_MIME.has(normalizedMime)) {
        rawText = await extractImage(fileBuf, normalizedMime)
      } else {
        // Defensive — should never reach here due to allow-list above
        return NextResponse.json(
          { error: 'Unsupported file type' },
          { status: 400 }
        )
      }
    } catch (extractErr) {
      const msg = (extractErr as Error).message || 'Unknown extraction error'
      // Write audit log even on failure
      try {
        await db.auditLog.create({
          data: {
            userId: user.id,
            action: 'resume.import.failed',
            entity: 'Resume',
            meta: JSON.stringify({
              filename: safeFilename,
              mimeType: normalizedMime,
              fileSize,
              error: msg,
            }),
          },
        })
      } catch {}

      // For PDF failures, give the user a clear hint about manual paste.
      if (normalizedMime === 'application/pdf') {
        return NextResponse.json(
          {
            error:
              'Failed to extract text from this PDF (it may be a scanned image or use unsupported encoding). Please copy and paste the text manually.',
            detail: msg,
          },
          { status: 422 }
        )
      }

      return NextResponse.json(
        { error: `Failed to extract text from file: ${msg}` },
        { status: 422 }
      )
    }

    if (!rawText || !rawText.trim()) {
      // No text extracted — record and return empty result so the UI can
      // prompt the user to paste manually.
      try {
        await db.auditLog.create({
          data: {
            userId: user.id,
            action: 'resume.import.empty',
            entity: 'Resume',
            meta: JSON.stringify({
              filename: safeFilename,
              mimeType: normalizedMime,
              fileSize,
            }),
          },
        })
      } catch {}

      return NextResponse.json(
        {
          text: '',
          detectedLanguage: 'en',
          filename: safeFilename,
          fileSize,
          mimeType: normalizedMime,
          warning:
            'No text could be extracted from this file. If it is a scanned PDF or image, the OCR may have found no text. Please try pasting the content manually.',
        },
        { status: 200 }
      )
    }

    // ─── Clean + detect + clip ───
    const cleaned = cleanOCRText(rawText)
    const detectedLanguage = detectLanguage(cleaned)
    const clipped = clipInput(cleaned, 15000)

    // ─── Audit log (success) ───
    try {
      await db.auditLog.create({
        data: {
          userId: user.id,
          action: 'resume.import',
          entity: 'Resume',
          meta: JSON.stringify({
            filename: safeFilename,
            mimeType: normalizedMime,
            fileSize,
            detectedLanguage,
            extractedChars: clipped.length,
            // Don't log the full text — audit logs should stay compact.
            textPreview: clipped.slice(0, 200),
          }),
        },
      })
    } catch {}

    return NextResponse.json(
      {
        text: clipped,
        detectedLanguage,
        filename: safeFilename,
        fileSize,
        mimeType: normalizedMime,
      },
      { status: 200 }
    )
  } catch (e) {
    return err(e)
  }
}
