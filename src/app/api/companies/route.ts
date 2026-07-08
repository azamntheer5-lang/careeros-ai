import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, err } from '@/lib/server'
import { getZai } from '@/lib/ai'

/** List companies + POST to research a company via web search. */
export async function GET() {
  try {
    const user = await getCurrentUser()
    const companies = await db.company.findMany({ where: { userId: user.id }, orderBy: { updatedAt: 'desc' } })
    return NextResponse.json({ companies })
  } catch (e) { return err(e) }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser()
    const { name, domain } = await req.json()
    if (!name?.trim()) return NextResponse.json({ error: 'Company name required' }, { status: 400 })

    // web search for company research
    let research: any = null
    try {
      const zai = await getZai()
      const results: any[] = await zai.functions.invoke('web_search', { query: `${name} company ${domain ? domain : ''} culture size funding`, num: 6 })
      research = {
        sources: results.slice(0, 6).map((r) => ({ title: r.name, url: r.url, snippet: r.snippet, host: r.host_name })),
        summary: results.slice(0, 3).map((r) => r.snippet).join(' '),
      }
    } catch {}

    const company = await db.company.create({
      data: { userId: user.id, name, domain: domain || null, research: research ? JSON.stringify(research) : null },
    })
    try { await db.auditLog.create({ data: { userId: user.id, action: 'company.research', entity: 'Company', entityId: company.id } }) } catch {}
    return NextResponse.json({ company })
  } catch (e) { return err(e) }
}
