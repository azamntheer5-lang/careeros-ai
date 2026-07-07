import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { err, parseJson } from '@/lib/server'

export type PublicSection = {
  id: string
  type: 'hero' | 'about' | 'experience' | 'skills' | 'projects' | 'certifications' | 'contact'
  title: string
  visible: boolean
}

/** GET — public fetch by slug. Increments view count when published. */
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params
    const portfolio = await db.portfolio.findUnique({ where: { slug }, include: { user: true } })
    if (!portfolio || !portfolio.published) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    // Increment views (non-blocking, best-effort).
    await db.portfolio.update({ where: { id: portfolio.id }, data: { views: { increment: 1 } } })

    // Pull the user's most recently updated resume to enrich the portfolio.
    const resume = await db.resume.findFirst({
      where: { userId: portfolio.userId },
      orderBy: { updatedAt: 'desc' },
    })
    const resumeData = resume ? parseJson<any>(resume.data) : null

    return NextResponse.json({
      portfolio: {
        id: portfolio.id,
        slug: portfolio.slug,
        title: portfolio.title,
        tagline: portfolio.tagline,
        bio: portfolio.bio,
        theme: portfolio.theme,
        accent: portfolio.accent,
        sections: parseJson<PublicSection[]>(portfolio.sections),
        views: portfolio.views + 1,
        updatedAt: portfolio.updatedAt,
      },
      owner: {
        name: portfolio.user.name,
        headline: portfolio.user.headline,
        email: portfolio.user.email,
      },
      resume: resumeData,
    })
  } catch (e) {
    return err(e)
  }
}
