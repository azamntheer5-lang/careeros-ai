import { NextResponse } from 'next/server'
import ZAI from 'z-ai-web-dev-sdk'
import { getCurrentUser } from '@/lib/server'

let zaiInstance: Awaited<ReturnType<typeof ZAI.create>> | null = null
async function getZai() {
  if (!zaiInstance) zaiInstance = await ZAI.create()
  return zaiInstance
}

/** Text-to-Speech: returns a WAV audio buffer for the given text (auth required). */
export async function POST(req: Request) {
  try {
    const user = await getCurrentUser()
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
