import { NextResponse } from 'next/server'
import { run } from '@/lib/ai'
import { getCurrentUser, err, clipInput } from '@/lib/server'

/** Context-aware floating assistant — answers career questions with profile memory. */
export async function POST(req: Request) {
  try {
    const user = await getCurrentUser()
    const { message, context } = await req.json()
    if (!message?.trim()) return NextResponse.json({ error: 'Message required' }, { status: 400 })

    const clippedMessage = clipInput(message, 2000)
    const clippedModule = clipInput(context?.module, 50) || 'dashboard'
    const clippedRole = clipInput(context?.targetRole, 100)

    const { data: reply } = await run<string>(
      'coach',
      user.id,
      user.name || '',
      [{
        role: 'user',
        content: `The user is currently viewing the "${clippedModule}" module${clippedRole ? ` and their target role is ${clippedRole}` : ''}. Answer concisely (under 200 words). If they ask about actions, reference the relevant CareerOS module. Use markdown.\n\nUser: ${clippedMessage}`,
      }],
      { json: false }
    )
    return NextResponse.json({ reply })
  } catch (e) { return err(e) }
}
