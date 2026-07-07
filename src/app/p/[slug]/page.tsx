import { db } from '@/lib/db'
import { parseJson } from '@/lib/server'
import { Globe, Mail, MapPin, Github, Linkedin, Sparkles } from 'lucide-react'

export const dynamic = 'force-dynamic'

type Section = {
  id: string
  type: 'hero' | 'about' | 'experience' | 'skills' | 'projects' | 'certifications' | 'contact'
  title: string
  visible: boolean
}

type ResumeData = {
  contact?: { name?: string; email?: string; phone?: string; location?: string; website?: string; linkedin?: string; github?: string }
  summary?: string
  experience?: { id: string; title: string; company: string; location?: string; startDate?: string; endDate?: string; bullets?: string[] }[]
  education?: { id: string; degree: string; school: string; location?: string; startDate?: string; endDate?: string; details?: string }[]
  skills?: string[]
  projects?: { id: string; name: string; description?: string; link?: string }[]
  certifications?: { id: string; name: string; issuer?: string; date?: string }[]
}

/** Map accent id -> hex pair (foreground, soft). Kept in sync with types.ts ACCENTS. */
const ACCENTS: Record<string, { fg: string; soft: string; glow: string }> = {
  emerald: { fg: '#10b981', soft: 'rgba(16,185,129,0.12)', glow: 'rgba(16,185,129,0.35)' },
  teal: { fg: '#14b8a6', soft: 'rgba(20,184,166,0.12)', glow: 'rgba(20,184,166,0.35)' },
  amber: { fg: '#f59e0b', soft: 'rgba(245,158,11,0.12)', glow: 'rgba(245,158,11,0.35)' },
  rose: { fg: '#f43f5e', soft: 'rgba(244,63,94,0.12)', glow: 'rgba(244,63,94,0.35)' },
  violet: { fg: '#8b5cf6', soft: 'rgba(139,92,246,0.12)', glow: 'rgba(139,92,246,0.35)' },
  slate: { fg: '#64748b', soft: 'rgba(100,116,139,0.12)', glow: 'rgba(100,116,139,0.35)' },
}

type Props = { params: Promise<{ slug: string }> }

export default async function PublicPortfolioPage({ params }: Props) {
  const { slug } = await params
  const portfolio = await db.portfolio.findUnique({ where: { slug }, include: { user: true } })

  if (!portfolio || !portfolio.published) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="text-center max-w-md">
          <div className="mx-auto mb-4 h-14 w-14 rounded-2xl bg-brand-soft text-brand flex items-center justify-center">
            <Globe className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Portfolio not found</h1>
          <p className="text-muted-foreground mt-2 text-sm">
            This portfolio may have been unpublished or never existed.
          </p>
        </div>
      </div>
    )
  }

  // Increment views (best-effort).
  await db.portfolio.update({ where: { id: portfolio.id }, data: { views: { increment: 1 } } }).catch(() => {})

  // Pull the owner's latest resume for richer content.
  const resume = await db.resume.findFirst({
    where: { userId: portfolio.userId },
    orderBy: { updatedAt: 'desc' },
  })
  const resumeData: ResumeData | null = resume ? parseJson<ResumeData>(resume.data) : null

  const sections = parseJson<Section[]>(portfolio.sections)
  const visibleSections = sections.filter((s) => s.visible && s.type !== 'hero')
  const accent = ACCENTS[portfolio.accent] || ACCENTS.emerald
  const theme = portfolio.theme

  const ownerName = portfolio.user.name || 'Anonymous'
  const ownerHeadline = portfolio.user.headline || portfolio.tagline || ''
  const ownerBio = portfolio.bio || resumeData?.summary || portfolio.user.headline || ''
  const contact = resumeData?.contact || {}

  const cssVars = {
    ['--pf-accent' as string]: accent.fg,
    ['--pf-accent-soft' as string]: accent.soft,
    ['--pf-accent-glow' as string]: accent.glow,
  } as React.CSSProperties

  return (
    <div style={{ ...cssVars, background: pageBg(theme) }} className={themeWrapperClass(theme)}>
      {/* Sticky mini-nav */}
      <header className="sticky top-0 z-30 px-4 sm:px-6 py-3 backdrop-blur-md"
        style={{ background: navBg(theme), borderBottom: `1px solid ${navBorder(theme)}` }}>
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: accent.fg, color: '#fff' }}>
              <Sparkles className="h-4 w-4" />
            </div>
            <span className="font-semibold truncate text-sm">{portfolio.title}</span>
          </div>
          <a href="/?module=portfolio" className="text-xs px-3 py-1.5 rounded-full font-medium transition hover:opacity-80"
            style={{ background: accent.fg, color: '#fff' }}>
            Built with CareerOS
          </a>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <HeroBackground theme={theme} accent={accent.fg} />
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 py-20 sm:py-28 text-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium mb-5"
            style={{ background: accent.soft, color: accent.fg }}>
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: accent.fg }} /> {ownerHeadline || 'Available for opportunities'}
          </div>
          <h1 className={`font-bold tracking-tight ${theme === 'bold' ? 'text-6xl sm:text-7xl' : 'text-5xl sm:text-6xl'}`}
            style={{ color: heroText(theme) }}>
            {ownerName}
          </h1>
          {portfolio.tagline && (
            <p className="mt-4 text-xl sm:text-2xl font-medium" style={{ color: heroTextMuted(theme) }}>
              {portfolio.tagline}
            </p>
          )}
          {ownerBio && (
            <p className="mt-5 max-w-2xl mx-auto text-base sm:text-lg leading-relaxed" style={{ color: heroTextMuted(theme) }}>
              {ownerBio}
            </p>
          )}
          <div className="mt-7 flex flex-wrap items-center justify-center gap-2 text-sm">
            {contact.location && <Pill theme={theme}><MapPin className="h-3.5 w-3.5" /> {contact.location}</Pill>}
            {contact.email && <Pill theme={theme}><Mail className="h-3.5 w-3.5" /> {contact.email}</Pill>}
            {contact.linkedin && <Pill theme={theme}><Linkedin className="h-3.5 w-3.5" /> LinkedIn</Pill>}
            {contact.github && <Pill theme={theme}><Github className="h-3.5 w-3.5" /> GitHub</Pill>}
          </div>
        </div>
      </section>

      {/* Sections */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 pb-24 space-y-16">
        {visibleSections.map((section) => (
          <SectionRenderer key={section.id} section={section} resume={resumeData} theme={theme} email={portfolio.user.email} />
        ))}

        {visibleSections.length === 0 && (
          <p className="text-center text-muted-foreground py-12">No sections yet.</p>
        )}
      </main>

      <footer className="border-t py-6 px-4 sm:px-6 text-center text-xs" style={{ borderColor: navBorder(theme), color: heroTextMuted(theme) }}>
        <span>© {new Date().getFullYear()} {ownerName} · </span>
        <span>Crafted with CareerOS AI</span>
      </footer>
    </div>
  )
}

/* ---------------- Section renderer ---------------- */

function SectionRenderer({ section, resume, theme, email }: { section: Section; resume: ResumeData | null; theme: string; email: string }) {
  return (
    <section id={section.id}>
      <div className="flex items-center gap-3 mb-6">
        <div className="h-7 w-1.5 rounded-full" style={{ background: 'var(--pf-accent)' }} />
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight" style={{ color: heroText(theme) }}>{section.title}</h2>
      </div>

      {section.type === 'about' && (
        <Card theme={theme}>
          <p className="text-base leading-relaxed whitespace-pre-wrap" style={{ color: heroTextMuted(theme) }}>
            {resume?.summary || 'No bio yet.'}
          </p>
        </Card>
      )}

      {section.type === 'experience' && (
        <div className="space-y-4">
          {(resume?.experience || []).length === 0 && <Empty theme={theme} text="No experience listed yet." />}
          {(resume?.experience || []).map((e) => (
            <Card key={e.id} theme={theme}>
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-1.5 mb-2">
                <div>
                  <h3 className="font-semibold text-lg" style={{ color: heroText(theme) }}>{e.title}</h3>
                  <p className="text-sm font-medium" style={{ color: 'var(--pf-accent)' }}>{e.company}{e.location ? ` · ${e.location}` : ''}</p>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--pf-accent-soft)', color: 'var(--pf-accent)' }}>
                  {[e.startDate, e.endDate].filter(Boolean).join(' — ') || 'Present'}
                </span>
              </div>
              {e.bullets && e.bullets.length > 0 && (
                <ul className="mt-3 space-y-1.5">
                  {e.bullets.map((b, i) => (
                    <li key={i} className="flex gap-2 text-sm leading-relaxed" style={{ color: heroTextMuted(theme) }}>
                      <span className="mt-1.5 h-1 w-1 rounded-full shrink-0" style={{ background: 'var(--pf-accent)' }} />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          ))}
        </div>
      )}

      {section.type === 'skills' && (
        <Card theme={theme}>
          {(resume?.skills || []).length === 0 ? (
            <Empty theme={theme} text="No skills listed yet." />
          ) : (
            <div className="flex flex-wrap gap-2">
              {(resume?.skills || []).map((s, i) => (
                <span key={i} className="px-3 py-1.5 rounded-full text-sm font-medium border"
                  style={{ background: 'var(--pf-accent-soft)', color: 'var(--pf-accent)', borderColor: 'var(--pf-accent-glow)' }}>
                  {s}
                </span>
              ))}
            </div>
          )}
        </Card>
      )}

      {section.type === 'projects' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(resume?.projects || []).length === 0 && <Empty theme={theme} text="No projects listed yet." />}
          {(resume?.projects || []).map((p) => (
            <Card key={p.id} theme={theme}>
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-semibold" style={{ color: heroText(theme) }}>{p.name}</h3>
                {p.link && (
                  <a href={p.link} target="_blank" rel="noopener noreferrer"
                    className="text-xs px-2.5 py-1 rounded-full font-medium shrink-0 transition hover:opacity-80"
                    style={{ background: 'var(--pf-accent)', color: '#fff' }}>
                    Open
                  </a>
                )}
              </div>
              {p.description && (
                <p className="mt-2 text-sm leading-relaxed" style={{ color: heroTextMuted(theme) }}>{p.description}</p>
              )}
            </Card>
          ))}
        </div>
      )}

      {section.type === 'certifications' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {(resume?.certifications || []).length === 0 && <Empty theme={theme} text="No certifications listed yet." />}
          {(resume?.certifications || []).map((c) => (
            <Card key={c.id} theme={theme}>
              <h3 className="font-semibold" style={{ color: heroText(theme) }}>{c.name}</h3>
              <p className="text-sm mt-0.5" style={{ color: heroTextMuted(theme) }}>{[c.issuer, c.date].filter(Boolean).join(' · ')}</p>
            </Card>
          ))}
        </div>
      )}

      {section.type === 'contact' && (
        <Card theme={theme}>
          <div className="flex flex-wrap gap-4 text-sm">
            {email && (
              <a href={`mailto:${email}`} className="inline-flex items-center gap-2 hover:underline" style={{ color: 'var(--pf-accent)' }}>
                <Mail className="h-4 w-4" /> {email}
              </a>
            )}
            {resume?.contact?.linkedin && (
              <a href={resume.contact.linkedin} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 hover:underline" style={{ color: 'var(--pf-accent)' }}>
                <Linkedin className="h-4 w-4" /> LinkedIn
              </a>
            )}
            {resume?.contact?.github && (
              <a href={resume.contact.github} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 hover:underline" style={{ color: 'var(--pf-accent)' }}>
                <Github className="h-4 w-4" /> GitHub
              </a>
            )}
            {resume?.contact?.website && (
              <a href={resume.contact.website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 hover:underline" style={{ color: 'var(--pf-accent)' }}>
                <Globe className="h-4 w-4" /> Website
              </a>
            )}
          </div>
        </Card>
      )}
    </section>
  )
}

/* ---------------- Theme helpers ---------------- */

function themeWrapperClass(theme: string): string {
  switch (theme) {
    case 'dark':
    case 'bold':
      return 'min-h-screen text-white'
    case 'minimal':
      return 'min-h-screen text-zinc-900'
    case 'paper':
      return 'min-h-screen text-stone-800'
    case 'aurora':
    default:
      return 'min-h-screen text-zinc-900'
  }
}

function pageBg(theme: string): string {
  switch (theme) {
    case 'dark':
      return '#0a0a0f'
    case 'bold':
      return '#0a0a0f'
    case 'minimal':
      return '#fafafa'
    case 'paper':
      return '#f6f1e9'
    case 'aurora':
    default:
      return '#0b0d10'
  }
}

function heroText(theme: string): string {
  return theme === 'dark' || theme === 'bold' ? '#ffffff' : '#0a0a0a'
}
function heroTextMuted(theme: string): string {
  return theme === 'dark' || theme === 'bold' ? 'rgba(255,255,255,0.72)' : 'rgba(10,10,10,0.65)'
}
function navBg(theme: string): string {
  if (theme === 'dark' || theme === 'bold') return 'rgba(10,10,15,0.7)'
  if (theme === 'paper') return 'rgba(246,241,233,0.8)'
  return 'rgba(250,250,250,0.8)'
}
function navBorder(theme: string): string {
  return theme === 'dark' || theme === 'bold' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'
}

function HeroBackground({ theme, accent }: { theme: string; accent: string }) {
  if (theme === 'minimal') {
    return (
      <div className="absolute inset-0 -z-0"
        style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(0,0,0,0.04), transparent 60%)' }} />
    )
  }
  if (theme === 'paper') {
    return (
      <div className="absolute inset-0 -z-0"
        style={{ background: `radial-gradient(ellipse at 30% 0%, ${accent}22, transparent 55%)` }} />
    )
  }
  // aurora / dark / bold — gradient mesh
  return (
    <div className="absolute inset-0 -z-0 overflow-hidden">
      <div className="absolute -top-1/4 -left-1/4 h-[60vh] w-[60vh] rounded-full blur-3xl opacity-50"
        style={{ background: `radial-gradient(circle, ${accent}, transparent 70%)` }} />
      <div className="absolute -top-1/3 -right-1/4 h-[55vh] w-[55vh] rounded-full blur-3xl opacity-40"
        style={{ background: `radial-gradient(circle, ${accent}99, transparent 70%)` }} />
      <div className="absolute inset-0"
        style={{ background: theme === 'bold' ? 'linear-gradient(180deg, #0a0a0f, #0a0a0f 60%, transparent)' : 'linear-gradient(180deg, rgba(10,13,16,0.95), rgba(10,13,16,0.6) 70%, transparent)' }} />
    </div>
  )
}

function Card({ theme, children }: { theme: string; children: React.ReactNode }) {
  const isDark = theme === 'dark' || theme === 'bold'
  return (
    <div className="rounded-2xl p-5 sm:p-6"
      style={{
        background: isDark ? 'rgba(255,255,255,0.04)' : (theme === 'paper' ? 'rgba(255,253,248,0.7)' : 'rgba(255,255,255,0.75)'),
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
        backdropFilter: 'blur(10px)',
      }}>
      {children}
    </div>
  )
}

function Pill({ theme, children }: { theme: string; children: React.ReactNode }) {
  const isDark = theme === 'dark' || theme === 'bold'
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium"
      style={{
        background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
        color: isDark ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.7)',
      }}>
      {children}
    </span>
  )
}

function Empty({ theme, text }: { theme: string; text: string }) {
  return <p className="text-sm" style={{ color: heroTextMuted(theme) }}>{text}</p>
}
