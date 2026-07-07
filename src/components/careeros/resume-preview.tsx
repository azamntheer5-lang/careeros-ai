'use client'

import { ResumeData } from '@/lib/types'
import { cn } from '@/lib/utils'

const ACCENT_CSS: Record<string, string> = {
  emerald: 'oklch(0.62 0.14 162)',
  teal: 'oklch(0.62 0.1 180)',
  amber: 'oklch(0.72 0.14 70)',
  rose: 'oklch(0.62 0.18 20)',
  violet: 'oklch(0.6 0.17 300)',
  slate: 'oklch(0.4 0.02 240)',
}

export function ResumePreview({
  data,
  template = 'modern',
  accent = 'emerald',
  className,
}: {
  data: ResumeData
  template?: string
  accent?: string
  className?: string
}) {
  const color = ACCENT_CSS[accent] || ACCENT_CSS.emerald
  const c = data.contact

  if (template === 'ats') {
    return <AtsTemplate data={data} color={color} className={className} />
  }
  if (template === 'executive') {
    return <ExecutiveTemplate data={data} color={color} className={className} />
  }
  if (template === 'creative') {
    return <CreativeTemplate data={data} color={color} className={className} />
  }
  return <ModernTemplate data={data} color={color} className={className} />
}

function SectionTitle({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <h3 className="text-[10px] font-bold uppercase tracking-[0.16em] mb-1.5" style={{ color }}>
      {children}
    </h3>
  )
}

function ModernTemplate({ data, color, className }: { data: ResumeData; color: string; className?: string }) {
  const c = data.contact
  return (
    <div className={cn('bg-white text-neutral-900 p-6 sm:p-8 text-[11px] leading-relaxed font-sans', className)} style={{ fontFamily: 'var(--font-geist-sans)' }}>
      <header className="border-b-2 pb-3 mb-4" style={{ borderColor: color }}>
        <h1 className="text-2xl font-bold tracking-tight">{c.name || 'Your Name'}</h1>
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-neutral-600 mt-1">
          {c.email && <span>{c.email}</span>}
          {c.phone && <span>· {c.phone}</span>}
          {c.location && <span>· {c.location}</span>}
          {c.website && <span>· {c.website}</span>}
          {c.linkedin && <span>· {c.linkedin}</span>}
        </div>
      </header>

      {data.summary && (
        <section className="mb-4">
          <SectionTitle color={color}>Summary</SectionTitle>
          <p className="text-neutral-700">{data.summary}</p>
        </section>
      )}

      {data.experience.length > 0 && (
        <section className="mb-4">
          <SectionTitle color={color}>Experience</SectionTitle>
          <div className="space-y-3">
            {data.experience.map((e) => (
              <div key={e.id}>
                <div className="flex items-baseline justify-between gap-2">
                  <div>
                    <span className="font-semibold">{e.title || 'Role'}</span>
                    <span className="text-neutral-600"> · {e.company || 'Company'}</span>
                  </div>
                  <span className="text-[10px] text-neutral-500 shrink-0">{e.startDate} – {e.endDate}</span>
                </div>
                {e.location && <div className="text-[10px] text-neutral-500 mb-0.5">{e.location}</div>}
                <ul className="list-disc ps-4 mt-0.5 space-y-0.5 text-neutral-700">
                  {e.bullets.filter(Boolean).map((b, i) => <li key={i}>{b}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="grid grid-cols-2 gap-4">
        {data.education.length > 0 && (
          <section>
            <SectionTitle color={color}>Education</SectionTitle>
            <div className="space-y-2">
              {data.education.map((ed) => (
                <div key={ed.id}>
                  <div className="font-semibold">{ed.degree || 'Degree'}</div>
                  <div className="text-neutral-600">{ed.school}{ed.location ? ` · ${ed.location}` : ''}</div>
                  <div className="text-[10px] text-neutral-500">{ed.startDate} – {ed.endDate}</div>
                  {ed.details && <div className="text-neutral-600 text-[10px] mt-0.5">{ed.details}</div>}
                </div>
              ))}
            </div>
          </section>
        )}

        {data.skills.length > 0 && (
          <section>
            <SectionTitle color={color}>Skills</SectionTitle>
            <div className="flex flex-wrap gap-1">
              {data.skills.filter(Boolean).map((s, i) => (
                <span key={i} className="px-1.5 py-0.5 rounded text-[9px] font-medium" style={{ backgroundColor: `color-mix(in oklch, ${color} 14%, white)`, color }}>
                  {s}
                </span>
              ))}
            </div>
          </section>
        )}
      </div>

      {data.projects.length > 0 && (
        <section className="mt-4">
          <SectionTitle color={color}>Projects</SectionTitle>
          <div className="space-y-1">
            {data.projects.map((p) => (
              <div key={p.id}>
                <span className="font-semibold">{p.name}</span>
                {p.link && <span className="text-[10px] text-neutral-500"> · {p.link}</span>}
                {p.description && <div className="text-neutral-700">{p.description}</div>}
              </div>
            ))}
          </div>
        </section>
      )}

      {data.certifications.length > 0 && (
        <section className="mt-4">
          <SectionTitle color={color}>Certifications</SectionTitle>
          <div className="space-y-0.5">
            {data.certifications.map((cert) => (
              <div key={cert.id} className="text-neutral-700">
                <span className="font-medium">{cert.name}</span> · {cert.issuer} {cert.date && `(${cert.date})`}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function ExecutiveTemplate({ data, color, className }: { data: ResumeData; color: string; className?: string }) {
  const c = data.contact
  return (
    <div className={cn('bg-white text-neutral-900 p-6 sm:p-8 text-[11px] leading-relaxed', className)}>
      <header className="text-center border-b pb-3 mb-4" style={{ borderColor: color }}>
        <h1 className="text-2xl font-bold tracking-[0.04em]" style={{ color }}>{c.name || 'YOUR NAME'}</h1>
        <div className="text-[10px] text-neutral-600 mt-1 flex flex-wrap justify-center gap-x-2">
          {[c.email, c.phone, c.location, c.website].filter(Boolean).map((x, i) => (
            <span key={i}>{i > 0 && '· '}{x}</span>
          ))}
        </div>
      </header>
      {data.summary && <p className="text-center text-neutral-700 italic mb-4">{data.summary}</p>}
      <div className="space-y-3">
        {data.experience.map((e) => (
          <div key={e.id}>
            <div className="flex justify-between"><span className="font-bold">{e.title}</span><span className="text-[10px] text-neutral-500">{e.startDate}–{e.endDate}</span></div>
            <div className="text-neutral-600 mb-0.5">{e.company}</div>
            <ul className="list-disc ps-4 space-y-0.5 text-neutral-700">{e.bullets.filter(Boolean).map((b, i) => <li key={i}>{b}</li>)}</ul>
          </div>
        ))}
      </div>
    </div>
  )
}

function CreativeTemplate({ data, color, className }: { data: ResumeData; color: string; className?: string }) {
  const c = data.contact
  return (
    <div className={cn('bg-white text-neutral-900 text-[11px] leading-relaxed flex', className)}>
      <aside className="w-1/3 p-4 text-white" style={{ backgroundColor: color }}>
        <h1 className="text-xl font-bold leading-tight">{c.name || 'Your Name'}</h1>
        <div className="mt-2 space-y-0.5 text-[10px] opacity-90">
          {c.email && <div>{c.email}</div>}
          {c.phone && <div>{c.phone}</div>}
          {c.location && <div>{c.location}</div>}
          {c.website && <div>{c.website}</div>}
          {c.linkedin && <div>{c.linkedin}</div>}
        </div>
        {data.skills.length > 0 && (
          <div className="mt-4">
            <h3 className="text-[9px] font-bold uppercase tracking-wider opacity-80 mb-1.5">Skills</h3>
            <div className="space-y-0.5 text-[10px]">{data.skills.filter(Boolean).map((s, i) => <div key={i}>· {s}</div>)}</div>
          </div>
        )}
        {data.education.length > 0 && (
          <div className="mt-4">
            <h3 className="text-[9px] font-bold uppercase tracking-wider opacity-80 mb-1.5">Education</h3>
            {data.education.map((ed) => (
              <div key={ed.id} className="mb-1.5 text-[10px]">
                <div className="font-semibold">{ed.degree}</div>
                <div className="opacity-80">{ed.school}</div>
                <div className="opacity-70 text-[9px]">{ed.startDate}–{ed.endDate}</div>
              </div>
            ))}
          </div>
        )}
      </aside>
      <main className="flex-1 p-5">
        {data.summary && <p className="mb-3 text-neutral-700">{data.summary}</p>}
        <h3 className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color }}>Experience</h3>
        <div className="space-y-2.5">
          {data.experience.map((e) => (
            <div key={e.id}>
              <div className="font-bold">{e.title} <span className="font-normal text-neutral-600">· {e.company}</span></div>
              <ul className="list-disc ps-4 mt-0.5 space-y-0.5 text-neutral-700">{e.bullets.filter(Boolean).map((b, i) => <li key={i}>{b}</li>)}</ul>
            </div>
          ))}
        </div>
        {data.projects.length > 0 && (
          <>
            <h3 className="text-[10px] font-bold uppercase tracking-wider mt-3 mb-1.5" style={{ color }}>Projects</h3>
            {data.projects.map((p) => <div key={p.id}><span className="font-semibold">{p.name}</span> — {p.description}</div>)}
          </>
        )}
      </main>
    </div>
  )
}

function AtsTemplate({ data, color, className }: { data: ResumeData; color: string; className?: string }) {
  const c = data.contact
  return (
    <div className={cn('bg-white text-neutral-900 p-6 text-[11px] leading-relaxed', className)}>
      <h1 className="text-xl font-bold">{c.name || 'Your Name'}</h1>
      <p className="text-[10px] text-neutral-600">{[c.email, c.phone, c.location].filter(Boolean).join(' | ')}</p>
      {data.summary && (<><h2 className="font-bold mt-3 border-b border-neutral-300">SUMMARY</h2><p className="mt-1">{data.summary}</p></>)}
      {data.experience.length > 0 && (<><h2 className="font-bold mt-3 border-b border-neutral-300">EXPERIENCE</h2>{data.experience.map((e) => (<div key={e.id} className="mt-1"><div className="font-semibold">{e.title}, {e.company}</div><div className="text-[10px] text-neutral-500">{e.startDate} - {e.endDate}</div><ul className="list-disc ps-4 mt-0.5">{e.bullets.filter(Boolean).map((b, i) => <li key={i}>{b}</li>)}</ul></div>))}</>)}
      {data.education.length > 0 && (<><h2 className="font-bold mt-3 border-b border-neutral-300">EDUCATION</h2>{data.education.map((ed) => (<div key={ed.id} className="mt-1"><div className="font-semibold">{ed.degree}, {ed.school}</div></div>))}</>)}
      {data.skills.length > 0 && (<><h2 className="font-bold mt-3 border-b border-neutral-300">SKILLS</h2><p className="mt-1">{data.skills.join(', ')}</p></>)}
    </div>
  )
}
