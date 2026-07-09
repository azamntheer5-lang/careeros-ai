import { NextResponse } from 'next/server'
import { getCurrentUser, err } from '@/lib/server'

/**
 * GET /api/desktop/settings — get local desktop settings
 * POST /api/desktop/settings — save local desktop settings
 */

export async function GET() {
  try {
    await getCurrentUser()
    // In Electron, settings are stored via the preload bridge
    // This endpoint is a fallback for web mode
    return NextResponse.json({ settings: { theme: 'dark', language: 'en' } })
  } catch (e) {
    return err(e)
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser()
    const settings = await req.json()
    // In Electron, this would be saved via ipcRenderer to the main process
    // For web mode, we just acknowledge
    return NextResponse.json({ ok: true, settings })
  } catch (e) {
    return err(e)
  }
}
