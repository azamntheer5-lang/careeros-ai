import { NextResponse } from 'next/server'
import ZAI from 'z-ai-web-dev-sdk'
import { db } from '@/lib/db'
import { getCurrentUser, err } from '@/lib/server'
import { rateLimitOr429 } from '@/lib/rate-limit'

export const runtime = 'nodejs'

type DocType = 'resume' | 'certificate' | 'portfolio' | 'other'

const RESUME_PROMPT =
  'Extract structured resume data from this document image. Return JSON: { contact:{name,email,phone,location,website,linkedin}, summary, experience:[{title,company,location,startDate,endDate,bullets:[]}], education:[{degree,school,location,startDate,endDate,details}], skills:[], projects:[{name,description,link}], certifications:[{name,issuer,date}] }'

const CERTIFICATE_PROMPT =
  'Extract certificate info. Return JSON: { name, issuer, date, holderName, credentialId }'

/** Strip optional data-URL prefix from a base64 string. */
function stripDataUrl(s: string): string {
  const i = s.indexOf('base64,')
  return i >= 0 ? s.slice(i + 7) : s
}

/** Best-effort JSON extraction from a model response. */
function extractJson(text: string): unknown | null {
  if (!text) return null
  const cleaned = text
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim()
  try {
    return JSON.parse(cleaned)
  } catch {
    const m = cleaned.match(/(\{[\s\S]*\}|\[[\s\S]*\])/)
    if (!m) return null
    try {
      return JSON.parse(m[1])
    } catch {
      return null
    }
  }
}

async function runVision(prompt: string, dataUrl: string): Promise<unknown | null> {
  const zai = await ZAI.create()
  const response = await zai.chat.completions.createVision({
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: dataUrl } },
        ],
      },
    ],
    thinking: { type: 'disabled' },
  } as any)
  const text = (response as any)?.choices?.[0]?.message?.content ?? ''
  return extractJson(typeof text === 'string' ? text : JSON.stringify(text))
}

/** GET — list the current user's documents (without the heavy base64 payload). */
export async function GET() {
  try {
    const user = await getCurrentUser()
    const limited = rateLimitOr429(user.id, 'tts')
    if (limited) return limited
    const docs = await db.document.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        userId: true,
        type: true,
        filename: true,
        mimeType: true,
        parsed: true,
        status: true,
        createdAt: true,
      },
    })
    return NextResponse.json({ documents: docs })
  } catch (e) {
    return err(e)
  }
}

/** POST — accept { filename, mimeType, base64, type } and run VLM OCR parsing. */
export async function POST(req: Request) {
  try {
    const user = await getCurrentUser()
    const body = await req.json()
    const filename: string = String(body.filename || 'untitled')
    const mimeType: string = String(body.mimeType || 'application/octet-stream')
    const rawB64: string = String(body.base64 || '')
    const typeInput: string = String(body.type || 'other')
    const type: DocType = (['resume', 'certificate', 'portfolio', 'other'].includes(typeInput)
      ? typeInput
      : 'other') as DocType

    if (!rawB64) {
      return NextResponse.json({ error: 'Missing base64 payload' }, { status: 400 })
    }
    const b64 = stripDataUrl(rawB64)

    // Persist the document first with status=pending so we have a record even
    // if the VLM call fails.
    const doc = await db.document.create({
      data: {
        userId: user.id,
        type,
        filename,
        mimeType,
        data: b64,
        status: 'pending',
      },
    })

    try {
      const dataUrl = `data:${mimeType};base64,${b64}`
      const prompt = type === 'certificate' ? CERTIFICATE_PROMPT : RESUME_PROMPT
      const parsed = await runVision(prompt, dataUrl)

      if (parsed) {
        const updated = await db.document.update({
          where: { id: doc.id },
          data: { parsed: JSON.stringify(parsed), status: 'parsed' },
        })
        return NextResponse.json({ document: updated, parsed })
      }

      const failed = await db.document.update({
        where: { id: doc.id },
        data: { status: 'error' },
      })
      return NextResponse.json(
        { document: failed, parsed: null, error: 'Failed to parse document content' },
        { status: 200 }
      )
    } catch (parseErr) {
      await db.document.update({
        where: { id: doc.id },
        data: { status: 'error' },
      })
      return NextResponse.json(
        {
          document: { ...doc, status: 'error' },
          parsed: null,
          error: (parseErr as Error).message,
        },
        { status: 200 }
      )
    }
  } catch (e) {
    return err(e)
  }
}
