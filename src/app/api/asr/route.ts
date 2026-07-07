import { NextResponse } from 'next/server'
import ZAI from 'z-ai-web-dev-sdk'

let zaiInstance: Awaited<ReturnType<typeof ZAI.create>> | null = null
async function getZai() {
  if (!zaiInstance) zaiInstance = await ZAI.create()
  return zaiInstance
}

/** Speech-to-Text: accepts a base64-encoded audio blob, returns transcribed text. */
export async function POST(req: Request) {
  try {
    const { audio } = await req.json()
    if (!audio) return NextResponse.json({ error: 'Audio (base64) required' }, { status: 400 })
    const zai = await getZai()
    const response: any = await zai.audio.asr.create({ file_base64: audio })
    return NextResponse.json({ text: response.text || '' })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
