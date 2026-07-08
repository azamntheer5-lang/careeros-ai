import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/server'
import { rateLimitOr429 } from '@/lib/rate-limit'
import { getZai } from '@/lib/ai'

/** Text-to-Speech: returns a WAV audio buffer for the given text (auth + rate limited). */
export async function POST(req: Request) {
  try {
    const user = await getCurrentUser()
    // Rate limit: 5 TTS requests per minute
    const limited = rateLimitOr429(user.id, 'tts')
    if (limited) return limited
    const { text, voice = 'tongtong', speed = 1.0 } = await req.json()
    if (!text?.trim()) return NextResponse.json({ error: 'Text required' }, { status: 400 })
    // Input validation + length limit to prevent abuse
    const clipped = text.slice(0, 1000)
    const validSpeed = Math.min(Math.max(Number(speed) || 1.0, 0.5), 2.0)
    const zai = await getZai()
    const response = await zai.audio.tts.create({
      input: clipped,
      voice,
      speed: validSpeed,
      response_format: 'wav',
      stream: false,
    } as any)
    const arrayBuffer = await (response as any).arrayBuffer()
    const buffer = Buffer.from(new Uint8Array(arrayBuffer))
    return new NextResponse(buffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'audio/wav',
        'Content-Length': buffer.length.toString(),
        'Cache-Control': 'no-cache',
      },
    })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
