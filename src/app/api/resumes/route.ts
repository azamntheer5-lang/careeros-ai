import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, err } from '@/lib/server'

export async function GET() {
  try {
    const user = await getCurrentUser()
    const resumes = await db.resume.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: 'desc' },
    })
    return NextResponse.json({ resumes })
  } catch (e) {
    return err(e)
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser()
    const body = await req.json()
    const resume = await db.resume.create({
      data: {
        userId: user.id,
        title: body.title || 'Untitled Resume',
        template: body.template || 'modern',
        accent: body.accent || 'emerald',
        data: JSON.stringify(body.data || DEFAULT_DATA),
      },
    })
    return NextResponse.json({ resume })
  } catch (e) {
    return err(e)
  }
}

const DEFAULT_DATA = {
  contact: { name: '', email: '', phone: '', location: '', website: '', linkedin: '' },
  summary: '',
  experience: [],
  education: [],
  skills: [],
  projects: [],
  certifications: [],
}
