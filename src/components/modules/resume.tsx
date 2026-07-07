'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { api } from '@/lib/api-client'
import { useApp } from '@/components/app-provider'
import { useToast } from '@/hooks/use-toast'
import { ModuleHeader } from '@/components/careeros/module-header'
import { ResumePreview } from '@/components/careeros/resume-preview'
import { LoadingScreen, Spinner } from '@/components/careeros/loading'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  FileText, Plus, Sparkles, Wand2, Trash2, Save, ChevronLeft, GripVertical,
  PlusCircle, Briefcase, GraduationCap, Award, FolderGit2, X, RefreshCw,
} from 'lucide-react'
import {
  ResumeData, ResumeMeta, TEMPLATES, ACCENTS, emptyResumeData, normalizeResumeData, uid, Experience, Education, Project, Certification,
} from '@/lib/types'
import { cn } from '@/lib/utils'

export function ResumeModule() {
  const { t } = useApp()
  const { toast } = useToast()
  const [resumes, setResumes] = useState<ResumeMeta[]>([])
  const [active, setActive] = useState<ResumeMeta | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [showGenerate, setShowGenerate] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const { resumes } = await api<{ resumes: any[] }>('/api/resumes')
    const mapped: ResumeMeta[] = resumes.map((r) => ({
      ...r,
      data: normalizeResumeData(typeof r.data === 'string' ? JSON.parse(r.data) : r.data),
    }))
    setResumes(mapped)
    if (!active && mapped.length) setActive(mapped[0])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const update = (patch: Partial<ResumeMeta>) => {
    if (!active) return
    setActive({ ...active, ...patch })
    setDirty(true)
  }
  const updateData = (patch: Partial<ResumeData>) => {
    if (!active) return
    setActive({ ...active, data: { ...active.data, ...patch } })
    setDirty(true)
  }

  const save = async () => {
    if (!active) return
    setSaving(true)
    try {
      await api(`/api/resumes/${active.id}`, {
        method: 'PUT',
        body: {
          title: active.title, template: active.template, accent: active.accent,
          font: active.font, spacing: active.spacing, data: active.data,
        },
      })
      setDirty(false)
      toast({ title: 'Saved', description: 'Resume updated successfully.' })
      load()
    } catch (e) {
      toast({ title: 'Save failed', description: (e as Error).message, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const createBlank = async () => {
    const { resume } = await api<{ resume: any }>('/api/resumes', {
      method: 'POST',
      body: { title: 'Untitled Resume', template: 'modern', accent: 'emerald', data: emptyResumeData() },
    })
    await load()
    setActive({ ...resume, data: normalizeResumeData(typeof resume.data === 'string' ? JSON.parse(resume.data) : resume.data) })
  }

  const remove = async (id: string) => {
    await api(`/api/resumes/${id}`, { method: 'DELETE' })
    if (active?.id === id) setActive(null)
    load()
  }

  if (loading) return <LoadingScreen label="Loading resumes…" />

  return (
    <div>
      <ModuleHeader
        title={t('resumeTitle')}
        subtitle={t('resumeSub')}
        icon={FileText}
        actions={
          <>
            <Button variant="outline" size="sm" className="rounded-full" onClick={() => setShowGenerate(true)}>
              <Wand2 className="h-4 w-4" /> <span className="hidden sm:inline">{t('generateFromContext')}</span>
            </Button>
            <Button size="sm" className="rounded-full bg-brand text-brand-foreground hover:bg-brand/90" onClick={createBlank}>
              <Plus className="h-4 w-4" /> {t('newResume')}
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-4">
        {/* Resume list */}
        <Card className="h-fit lg:sticky lg:top-20">
          <CardContent className="p-3">
            <div className="text-xs font-medium text-muted-foreground px-2 py-1.5">{resumes.length} resumes</div>
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-1 pe-1">
                {resumes.map((r) => (
                  <div
                    key={r.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => { setActive(r); setDirty(false) }}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActive(r); setDirty(false) } }}
                    className={cn(
                      'group flex w-full items-start gap-2 rounded-lg p-2.5 text-start transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      active?.id === r.id ? 'bg-brand-soft' : 'hover:bg-accent'
                    )}
                  >
                    <div className={cn('mt-0.5 h-7 w-7 shrink-0 rounded-md flex items-center justify-center', active?.id === r.id ? 'bg-brand text-brand-foreground' : 'bg-muted text-muted-foreground')}>
                      <FileText className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{r.title}</div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Badge variant="outline" className="h-4 px-1 text-[9px] capitalize">{r.template}</Badge>
                        {r.atsScore != null && <span className="text-[10px] text-brand font-medium">{r.atsScore}% ATS</span>}
                      </div>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); remove(r.id) }}
                      className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition"
                      aria-label="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
                {resumes.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-6">{t('empty')}</p>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Editor */}
        {active ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 flex-wrap">
              <Input
                value={active.title}
                onChange={(e) => update({ title: e.target.value })}
                className="max-w-xs font-medium"
              />
              <Select value={active.template} onValueChange={(v) => update({ template: v })}>
                <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                <SelectContent>{TEMPLATES.map((tp) => <SelectItem key={tp.id} value={tp.id}>{tp.name}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={active.accent} onValueChange={(v) => update({ accent: v })}>
                <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
                <SelectContent>{ACCENTS.map((a) => <SelectItem key={a.id} value={a.id} className="capitalize">{a.id}</SelectItem>)}</SelectContent>
              </Select>
              <Button onClick={save} disabled={!dirty || saving} size="sm" className="ms-auto rounded-full bg-brand text-brand-foreground hover:bg-brand/90">
                {saving ? <Spinner /> : <Save className="h-4 w-4" />} {t('save')}
              </Button>
            </div>

            <Tabs defaultValue="edit" className="w-full">
              <TabsList className="grid w-full max-w-xs grid-cols-2">
                <TabsTrigger value="edit">Editor</TabsTrigger>
                <TabsTrigger value="preview">{t('livePreview')}</TabsTrigger>
              </TabsList>
              <TabsContent value="edit" className="mt-4">
                <ResumeEditor data={active.data} onChange={updateData} />
              </TabsContent>
              <TabsContent value="preview" className="mt-4">
                <Card className="overflow-hidden border shadow-sm">
                  <div className="max-h-[70vh] overflow-y-auto">
                    <ResumePreview data={active.data} template={active.template} accent={active.accent} />
                  </div>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        ) : (
          <Card>
            <CardContent className="p-12 text-center text-muted-foreground">
              <FileText className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p>Select a resume or create a new one to get started.</p>
            </CardContent>
          </Card>
        )}
      </div>

      <GenerateDialog open={showGenerate} onOpenChange={setShowGenerate} onDone={() => load()} />
    </div>
  )
}

function ResumeEditor({ data, onChange }: { data: ResumeData; onChange: (p: Partial<ResumeData>) => void }) {
  const { t } = useApp()
  return (
    <div className="space-y-4">
      {/* Contact */}
      <Card>
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><FileText className="h-4 w-4 text-brand" /> {t('contact')}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Full name" value={data.contact.name} onChange={(v) => onChange({ contact: { ...data.contact, name: v } })} />
            <Field label="Email" value={data.contact.email} onChange={(v) => onChange({ contact: { ...data.contact, email: v } })} />
            <Field label="Phone" value={data.contact.phone} onChange={(v) => onChange({ contact: { ...data.contact, phone: v } })} />
            <Field label="Location" value={data.contact.location} onChange={(v) => onChange({ contact: { ...data.contact, location: v } })} />
            <Field label="Website" value={data.contact.website} onChange={(v) => onChange({ contact: { ...data.contact, website: v } })} />
            <Field label="LinkedIn" value={data.contact.linkedin} onChange={(v) => onChange({ contact: { ...data.contact, linkedin: v } })} />
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold flex items-center gap-2"><Sparkles className="h-4 w-4 text-brand" /> {t('summary')}</h3>
            <Button variant="ghost" size="sm" className="text-brand hover:text-brand" onClick={async () => {
              const { text } = await api<{ text: string }>('/api/resumes/enhance', { method: 'POST', body: { text: data.summary || 'software engineer', mode: 'rewrite' } })
              onChange({ summary: text })
            }}>
              <Wand2 className="h-3.5 w-3.5" /> {t('enhance')}
            </Button>
          </div>
          <Textarea
            value={data.summary}
            onChange={(e) => onChange({ summary: e.target.value })}
            rows={3}
            placeholder="A concise, impact-driven summary of your career…"
          />
        </CardContent>
      </Card>

      {/* Experience */}
      <ExperienceSection data={data} onChange={onChange} />

      {/* Education */}
      <EducationSection data={data} onChange={onChange} />

      {/* Skills */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold flex items-center gap-2"><Award className="h-4 w-4 text-brand" /> {t('skills')}</h3>
          </div>
          <div className="flex flex-wrap gap-2 mb-2">
            {data.skills.map((s, i) => (
              <Badge key={i} variant="secondary" className="gap-1 pr-1">
                {s}
                <button onClick={() => onChange({ skills: data.skills.filter((_, j) => j !== i) })} className="rounded-full hover:bg-background p-0.5"><X className="h-3 w-3" /></button>
              </Badge>
            ))}
            {data.skills.length === 0 && <p className="text-xs text-muted-foreground">No skills added yet.</p>}
          </div>
          <SkillInput onAdd={(s) => onChange({ skills: [...data.skills, s] })} />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ProjectsSection data={data} onChange={onChange} />
        <CertsSection data={data} onChange={onChange} />
      </div>
    </div>
  )
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <Label className="text-[11px] text-muted-foreground">{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} className="h-9 mt-0.5" />
    </div>
  )
}

function ExperienceSection({ data, onChange }: { data: ResumeData; onChange: (p: Partial<ResumeData>) => void }) {
  const { t } = useApp()
  const { toast } = useToast()
  const add = () => onChange({ experience: [...data.experience, { id: uid(), title: '', company: '', location: '', startDate: '', endDate: '', bullets: [''] }] })
  const update = (id: string, patch: Partial<Experience>) => onChange({ experience: data.experience.map((e) => e.id === id ? { ...e, ...patch } : e) })
  const remove = (id: string) => onChange({ experience: data.experience.filter((e) => e.id !== id) })

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold flex items-center gap-2"><Briefcase className="h-4 w-4 text-brand" /> {t('experience')}</h3>
          <Button variant="outline" size="sm" onClick={add}><PlusCircle className="h-3.5 w-3.5" /> {t('addExperience')}</Button>
        </div>
        <div className="space-y-3">
          {data.experience.map((e) => (
            <div key={e.id} className="rounded-lg border p-3 bg-muted/30">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
                <Input placeholder="Title" value={e.title} onChange={(ev) => update(e.id, { title: ev.target.value })} className="h-8 text-sm col-span-2" />
                <Input placeholder="Company" value={e.company} onChange={(ev) => update(e.id, { company: ev.target.value })} className="h-8 text-sm" />
                <Input placeholder="Location" value={e.location} onChange={(ev) => update(e.id, { location: ev.target.value })} className="h-8 text-sm" />
                <Input placeholder="Start" value={e.startDate} onChange={(ev) => update(e.id, { startDate: ev.target.value })} className="h-8 text-sm" />
                <Input placeholder="End" value={e.endDate} onChange={(ev) => update(e.id, { endDate: ev.target.value })} className="h-8 text-sm" />
              </div>
              <div className="space-y-2">
                {e.bullets.map((b, i) => (
                  <BulletEditor
                    key={i}
                    value={b}
                    onChange={(v) => update(e.id, { bullets: e.bullets.map((x, j) => j === i ? v : x) })}
                    onRemove={() => update(e.id, { bullets: e.bullets.filter((_, j) => j !== i) })}
                    onEnhance={async (mode) => {
                      try {
                        const { text } = await api<{ text: string }>('/api/resumes/enhance', { method: 'POST', body: { text: b, mode } })
                        update(e.id, { bullets: e.bullets.map((x, j) => j === i ? text : x) })
                        toast({ title: 'Enhanced', description: 'AI rewrote your bullet.' })
                      } catch (err) { toast({ title: 'Failed', description: (err as Error).message, variant: 'destructive' }) }
                    }}
                  />
                ))}
                <Button variant="ghost" size="sm" className="text-xs" onClick={() => update(e.id, { bullets: [...e.bullets, ''] })}>
                  <Plus className="h-3 w-3" /> Add bullet
                </Button>
              </div>
              <button onClick={() => remove(e.id)} className="mt-2 text-xs text-muted-foreground hover:text-destructive flex items-center gap-1"><Trash2 className="h-3 w-3" /> Remove</button>
            </div>
          ))}
          {data.experience.length === 0 && <p className="text-xs text-muted-foreground text-center py-3">{t('empty')}</p>}
        </div>
      </CardContent>
    </Card>
  )
}

function BulletEditor({ value, onChange, onRemove, onEnhance }: {
  value: string; onChange: (v: string) => void; onRemove: () => void; onEnhance: (mode: string) => void
}) {
  const [busy, setBusy] = useState(false)
  const [menu, setMenu] = useState(false)
  return (
    <div className="flex items-start gap-2 group">
      <span className="mt-2 text-brand">▸</span>
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder="Describe an achievement with measurable impact…" className="h-8 text-sm flex-1" />
      <div className="relative">
        <Button
          variant="ghost" size="sm" className="h-8 px-2 text-brand hover:text-brand"
          disabled={busy || !value.trim()}
          onClick={() => { setMenu(!menu) }}
        >
          {busy ? <Spinner /> : <Wand2 className="h-3.5 w-3.5" />}
        </Button>
        {menu && (
          <div className="absolute end-0 top-9 z-20 w-40 rounded-lg border bg-popover p-1 shadow-md">
            {['rewrite', 'achievement', 'impact', 'keywords'].map((m) => (
              <button
                key={m}
                onClick={() => { setMenu(false); setBusy(true); onEnhance(m); setTimeout(() => setBusy(false), 400) }}
                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-xs hover:bg-accent capitalize"
              >
                <Sparkles className="h-3 w-3 text-brand" /> {m}
              </button>
            ))}
          </div>
        )}
      </div>
      <button onClick={onRemove} className="mt-1.5 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100"><X className="h-3.5 w-3.5" /></button>
    </div>
  )
}

function EducationSection({ data, onChange }: { data: ResumeData; onChange: (p: Partial<ResumeData>) => void }) {
  const { t } = useApp()
  const add = () => onChange({ education: [...data.education, { id: uid(), degree: '', school: '', location: '', startDate: '', endDate: '', details: '' }] })
  const update = (id: string, patch: Partial<Education>) => onChange({ education: data.education.map((e) => e.id === id ? { ...e, ...patch } : e) })
  const remove = (id: string) => onChange({ education: data.education.filter((e) => e.id !== id) })
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold flex items-center gap-2"><GraduationCap className="h-4 w-4 text-brand" /> {t('education')}</h3>
          <Button variant="outline" size="sm" onClick={add}><PlusCircle className="h-3.5 w-3.5" /> {t('addEducation')}</Button>
        </div>
        <div className="space-y-3">
          {data.education.map((ed) => (
            <div key={ed.id} className="rounded-lg border p-3 bg-muted/30">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <Input placeholder="Degree" value={ed.degree} onChange={(e) => update(ed.id, { degree: e.target.value })} className="h-8 text-sm col-span-2" />
                <Input placeholder="School" value={ed.school} onChange={(e) => update(ed.id, { school: e.target.value })} className="h-8 text-sm" />
                <Input placeholder="Location" value={ed.location} onChange={(e) => update(ed.id, { location: e.target.value })} className="h-8 text-sm" />
                <Input placeholder="Start" value={ed.startDate} onChange={(e) => update(ed.id, { startDate: e.target.value })} className="h-8 text-sm" />
                <Input placeholder="End" value={ed.endDate} onChange={(e) => update(ed.id, { endDate: e.target.value })} className="h-8 text-sm" />
              </div>
              <Input placeholder="Details (GPA, honors…)" value={ed.details} onChange={(e) => update(ed.id, { details: e.target.value })} className="h-8 text-sm mt-2" />
              <button onClick={() => remove(ed.id)} className="mt-2 text-xs text-muted-foreground hover:text-destructive flex items-center gap-1"><Trash2 className="h-3 w-3" /> Remove</button>
            </div>
          ))}
          {data.education.length === 0 && <p className="text-xs text-muted-foreground text-center py-3">{t('empty')}</p>}
        </div>
      </CardContent>
    </Card>
  )
}

function ProjectsSection({ data, onChange }: { data: ResumeData; onChange: (p: Partial<ResumeData>) => void }) {
  const { t } = useApp()
  const add = () => onChange({ projects: [...data.projects, { id: uid(), name: '', description: '', link: '' }] })
  const update = (id: string, patch: Partial<Project>) => onChange({ projects: data.projects.map((p) => p.id === id ? { ...p, ...patch } : p) })
  const remove = (id: string) => onChange({ projects: data.projects.filter((p) => p.id !== id) })
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold flex items-center gap-2"><FolderGit2 className="h-4 w-4 text-brand" /> {t('projects')}</h3>
          <Button variant="outline" size="sm" onClick={add}><PlusCircle className="h-3.5 w-3.5" /></Button>
        </div>
        <div className="space-y-2">
          {data.projects.map((p) => (
            <div key={p.id} className="rounded-lg border p-2.5 bg-muted/30 space-y-1.5">
              <Input placeholder="Project name" value={p.name} onChange={(e) => update(p.id, { name: e.target.value })} className="h-8 text-sm" />
              <Input placeholder="Link" value={p.link} onChange={(e) => update(p.id, { link: e.target.value })} className="h-8 text-sm" />
              <Textarea placeholder="Description" value={p.description} onChange={(e) => update(p.id, { description: e.target.value })} rows={2} className="text-sm" />
              <button onClick={() => remove(p.id)} className="text-xs text-muted-foreground hover:text-destructive flex items-center gap-1"><Trash2 className="h-3 w-3" /> Remove</button>
            </div>
          ))}
          {data.projects.length === 0 && <p className="text-xs text-muted-foreground text-center py-3">{t('empty')}</p>}
        </div>
      </CardContent>
    </Card>
  )
}

function CertsSection({ data, onChange }: { data: ResumeData; onChange: (p: Partial<ResumeData>) => void }) {
  const { t } = useApp()
  const add = () => onChange({ certifications: [...data.certifications, { id: uid(), name: '', issuer: '', date: '' }] })
  const update = (id: string, patch: Partial<Certification>) => onChange({ certifications: data.certifications.map((c) => c.id === id ? { ...c, ...patch } : c) })
  const remove = (id: string) => onChange({ certifications: data.certifications.filter((c) => c.id !== id) })
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold flex items-center gap-2"><Award className="h-4 w-4 text-brand" /> {t('certifications')}</h3>
          <Button variant="outline" size="sm" onClick={add}><PlusCircle className="h-3.5 w-3.5" /></Button>
        </div>
        <div className="space-y-2">
          {data.certifications.map((c) => (
            <div key={c.id} className="rounded-lg border p-2.5 bg-muted/30 space-y-1.5">
              <Input placeholder="Certification" value={c.name} onChange={(e) => update(c.id, { name: e.target.value })} className="h-8 text-sm" />
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="Issuer" value={c.issuer} onChange={(e) => update(c.id, { issuer: e.target.value })} className="h-8 text-sm" />
                <Input placeholder="Date" value={c.date} onChange={(e) => update(c.id, { date: e.target.value })} className="h-8 text-sm" />
              </div>
              <button onClick={() => remove(c.id)} className="text-xs text-muted-foreground hover:text-destructive flex items-center gap-1"><Trash2 className="h-3 w-3" /> Remove</button>
            </div>
          ))}
          {data.certifications.length === 0 && <p className="text-xs text-muted-foreground text-center py-3">{t('empty')}</p>}
        </div>
      </CardContent>
    </Card>
  )
}

function SkillInput({ onAdd }: { onAdd: (s: string) => void }) {
  const [v, setV] = useState('')
  return (
    <div className="flex gap-2">
      <Input value={v} onChange={(e) => setV(e.target.value)} placeholder="Type a skill and press Enter" className="h-8 text-sm"
        onKeyDown={(e) => { if (e.key === 'Enter' && v.trim()) { onAdd(v.trim()); setV('') } }} />
      <Button size="sm" onClick={() => { if (v.trim()) { onAdd(v.trim()); setV('') } }}><Plus className="h-3.5 w-3.5" /></Button>
    </div>
  )
}

function GenerateDialog({ open, onOpenChange, onDone }: { open: boolean; onOpenChange: (v: boolean) => void; onDone: () => void }) {
  const { t } = useApp()
  const { toast } = useToast()
  const [context, setContext] = useState('')
  const [busy, setBusy] = useState(false)

  const run = async () => {
    if (!context.trim()) return
    setBusy(true)
    try {
      await api('/api/resumes/generate', { method: 'POST', body: { context } })
      toast({ title: 'Resume generated', description: 'Your AI resume is ready to edit.' })
      onOpenChange(false)
      setContext('')
      onDone()
    } catch (e) {
      toast({ title: 'Generation failed', description: (e as Error).message, variant: 'destructive' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Wand2 className="h-4 w-4 text-brand" /> {t('generateFromContext')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">Paste anything about yourself — current role, achievements, skills, education — and the AI will draft a complete structured resume.</p>
          <Textarea
            value={context}
            onChange={(e) => setContext(e.target.value)}
            rows={8}
            placeholder="e.g. I'm a senior frontend engineer at a fintech. I led the migration to React 18, built a design system used by 60 engineers, reduced bundle size by 40%…"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t('cancel')}</Button>
          <Button onClick={run} disabled={busy || !context.trim()} className="bg-brand text-brand-foreground hover:bg-brand/90">
            {busy ? <><Spinner /> {t('generating')}</> : <><Sparkles className="h-4 w-4" /> {t('generate')}</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
