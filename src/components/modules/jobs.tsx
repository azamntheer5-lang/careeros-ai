'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { api } from '@/lib/api-client'
import { useApp } from '@/components/app-provider'
import { useToast } from '@/hooks/use-toast'
import { ModuleHeader } from '@/components/careeros/module-header'
import { Spinner } from '@/components/careeros/loading'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Briefcase, Plus, Trash2, ChevronRight, ChevronLeft, ExternalLink, Building2, DollarSign, Calendar, Flag, Search, CheckCircle2 } from 'lucide-react'
import { Job } from '@/lib/types'

const COLUMNS = ['wishlist', 'applied', 'screening', 'interview', 'offer', 'accepted', 'rejected'] as const
const NEXT: Record<string, string | null> = {
  wishlist: 'applied', applied: 'screening', screening: 'interview', interview: 'offer', offer: 'accepted', accepted: null, rejected: null,
}
const PREV: Record<string, string | null> = {
  wishlist: null, applied: 'wishlist', screening: 'applied', interview: 'screening', offer: 'interview', accepted: 'offer', rejected: 'interview',
}
const COL_COLOR: Record<string, string> = {
  wishlist: 'oklch(0.6 0.06 240)', applied: 'oklch(0.65 0.13 200)', screening: 'oklch(0.7 0.14 80)',
  interview: 'oklch(0.7 0.15 162)', offer: 'oklch(0.7 0.15 50)', accepted: 'oklch(0.65 0.18 150)', rejected: 'oklch(0.6 0.05 20)',
}

export function JobsModule() {
  const { t } = useApp()
  const { toast } = useToast()
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ company: '', role: '', location: '', salary: '', url: '', priority: 'medium', notes: '' })

  const load = useCallback(async () => {
    const { jobs } = await api<{ jobs: Job[] }>('/api/jobs')
    setJobs(jobs)
    setLoading(false)
  }, [])

  useEffect(() => {
    api<{ jobs: Job[] }>('/api/jobs').then(({ jobs }) => {
      setJobs(jobs)
      setLoading(false)
    })
  }, [])

  const add = async () => {
    if (!form.company.trim() || !form.role.trim()) {
      toast({ title: 'Missing fields', description: 'Company and role are required.', variant: 'destructive' })
      return
    }
    await api('/api/jobs', { method: 'POST', body: { ...form, status: 'wishlist' } })
    setForm({ company: '', role: '', location: '', salary: '', url: '', priority: 'medium', notes: '' })
    setShowAdd(false)
    load()
    toast({ title: 'Job added', description: `${form.role} at ${form.company}` })
  }

  const move = async (job: Job, status: string) => {
    await api(`/api/jobs/${job.id}`, { method: 'PUT', body: { status } })
    load()
  }

  const update = async (job: Job, patch: Partial<Job>) => {
    await api(`/api/jobs/${job.id}`, { method: 'PUT', body: patch })
    load()
  }

  const remove = async (id: string) => {
    await api(`/api/jobs/${id}`, { method: 'DELETE' })
    load()
  }

  const byCol = (col: string) => jobs.filter((j) => j.status === col)

  return (
    <div>
      <ModuleHeader
        title={t('jobsTitle')}
        subtitle={t('jobsSub')}
        icon={Briefcase}
        actions={
          <Button size="sm" className="rounded-full bg-brand text-brand-foreground hover:bg-brand/90" onClick={() => setShowAdd(true)}>
            <Plus className="h-4 w-4" /> {t('addJob')}
          </Button>
        }
      />

      {loading ? (
        <div className="flex justify-center py-16"><Spinner className="h-6 w-6 text-brand" /></div>
      ) : (
        <Tabs defaultValue="pipeline" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-4 mb-4">
            <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
            <TabsTrigger value="companies">Companies</TabsTrigger>
            <TabsTrigger value="contacts">Contacts</TabsTrigger>
            <TabsTrigger value="reminders">Reminders</TabsTrigger>
          </TabsList>
          <TabsContent value="pipeline">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7 gap-3">
              {COLUMNS.map((col) => {
                const items = byCol(col)
                const color = COL_COLOR[col]
                return (
                  <div key={col} className="flex flex-col rounded-xl border bg-card/50 min-h-[200px]">
                    <div className="flex items-center justify-between px-3 py-2.5 border-b">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
                        <span className="text-xs font-semibold">{t(col as any)}</span>
                      </div>
                      <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">{items.length}</Badge>
                    </div>
                    <div className="flex-1 p-2 space-y-2 min-h-[100px]">
                      {items.map((job) => (
                        <JobCard key={job.id} job={job} onMove={move} onUpdate={update} onDelete={remove} />
                      ))}
                      {items.length === 0 && (
                        <div className="text-center py-6 text-[11px] text-muted-foreground">—</div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </TabsContent>
          <TabsContent value="companies"><CompaniesPanel /></TabsContent>
          <TabsContent value="contacts"><ContactsPanel /></TabsContent>
          <TabsContent value="reminders"><RemindersPanel /></TabsContent>
        </Tabs>
      )}

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowAdd(false)}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-card border rounded-2xl p-6 w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><Briefcase className="h-5 w-5 text-brand" /> {t('addJob')}</h3>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs text-muted-foreground">{t('company')}</Label><Input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} className="mt-1" /></div>
              <div><Label className="text-xs text-muted-foreground">{t('role')}</Label><Input value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="mt-1" /></div>
              <div><Label className="text-xs text-muted-foreground">{t('location')}</Label><Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="mt-1" /></div>
              <div><Label className="text-xs text-muted-foreground">{t('salary')}</Label><Input value={form.salary} onChange={(e) => setForm({ ...form, salary: e.target.value })} placeholder="$180k" className="mt-1" /></div>
              <div><Label className="text-xs text-muted-foreground">URL</Label><Input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} className="mt-1" /></div>
              <div>
                <Label className="text-xs text-muted-foreground">{t('priority')}</Label>
                <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{['low', 'medium', 'high'].map((p) => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="mt-3"><Label className="text-xs text-muted-foreground">{t('notes')}</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} className="mt-1" /></div>
            <div className="flex gap-2 mt-5">
              <Button variant="outline" className="flex-1" onClick={() => setShowAdd(false)}>{t('cancel')}</Button>
              <Button className="flex-1 bg-brand text-brand-foreground hover:bg-brand/90" onClick={add}>{t('addJob')}</Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}

function JobCard({ job, onMove, onUpdate, onDelete }: { job: Job; onMove: (j: Job, s: string) => void; onUpdate: (j: Job, p: Partial<Job>) => void; onDelete: (id: string) => void }) {
  const { t } = useApp()
  const [expanded, setExpanded] = useState(false)
  const PRIO_COLOR: Record<string, string> = { high: 'text-destructive', medium: 'text-amber-500', low: 'text-muted-foreground' }
  const next = NEXT[job.status]
  const prev = PREV[job.status]

  return (
    <motion.div layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="group rounded-lg border bg-background p-2.5 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between gap-1.5">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold truncate">{job.role}</div>
          <div className="text-xs text-muted-foreground flex items-center gap-1 truncate"><Building2 className="h-3 w-3" /> {job.company}</div>
        </div>
        <Flag className={`h-3 w-3 shrink-0 ${PRIO_COLOR[job.priority]}`} />
      </div>

      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1.5 text-[10px] text-muted-foreground">
        {job.location && <span className="flex items-center gap-0.5">{job.location}</span>}
        {job.salary && <span className="flex items-center gap-0.5"><DollarSign className="h-2.5 w-2.5" />{job.salary}</span>}
      </div>

      <div className="flex items-center gap-1 mt-2">
        <button onClick={() => prev && onMove(job, prev)} disabled={!prev} className="h-6 w-6 rounded-md border flex items-center justify-center disabled:opacity-30 hover:bg-accent" aria-label="Previous stage"><ChevronLeft className="h-3 w-3 flip-rtl" /></button>
        <select
          value={job.priority}
          onChange={(e) => onUpdate(job, { priority: e.target.value })}
          className="text-[10px] bg-transparent border rounded px-1 py-0.5 flex-1"
        >
          <option value="low">Low</option>
          <option value="medium">Med</option>
          <option value="high">High</option>
        </select>
        <button onClick={() => next && onMove(job, next)} disabled={!next} className="h-6 w-6 rounded-md border flex items-center justify-center disabled:opacity-30 hover:bg-accent bg-brand/10 text-brand" aria-label="Next stage"><ChevronRight className="h-3 w-3 flip-rtl" /></button>
      </div>

      <div className="flex items-center gap-1 mt-1.5 opacity-0 group-hover:opacity-100 transition">
        {job.url && <a href={job.url} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-brand" aria-label="Open"><ExternalLink className="h-3 w-3" /></a>}
        <button onClick={() => setExpanded(!expanded)} className="text-[10px] text-muted-foreground hover:text-foreground">{t('notes')}</button>
        <button onClick={() => onDelete(job.id)} className="ms-auto text-muted-foreground hover:text-destructive" aria-label="Delete"><Trash2 className="h-3 w-3" /></button>
      </div>

      {expanded && (
        <textarea
          value={job.notes || ''}
          onChange={(e) => onUpdate(job, { notes: e.target.value })}
          placeholder="Notes…"
          rows={2}
          className="mt-1.5 w-full text-[10px] rounded border bg-muted/30 p-1.5 resize-none"
        />
      )}
    </motion.div>
  )
}

/** Company Research panel — search the web for company intelligence. */
function CompaniesPanel() {
  const { toast } = useToast()
  const [companies, setCompanies] = useState<any[]>([])
  const [name, setName] = useState('')
  const [domain, setDomain] = useState('')
  const [busy, setBusy] = useState(false)

  const load = async () => {
    const { companies } = await api<{ companies: any[] }>('/api/companies')
    setCompanies(companies.map((c) => ({ ...c, research: c.research ? JSON.parse(c.research) : null })))
  }
  useEffect(() => {
    api<{ companies: any[] }>('/api/companies').then(({ companies }) => setCompanies(companies.map((c) => ({ ...c, research: c.research ? JSON.parse(c.research) : null }))))
  }, [])

  const research = async () => {
    if (!name.trim()) return
    setBusy(true)
    try {
      await api('/api/companies', { method: 'POST', body: { name, domain } })
      setName(''); setDomain('')
      toast({ title: 'Researched', description: 'Company added with web research.' })
      load()
    } catch (e) { toast({ title: 'Failed', description: (e as Error).message, variant: 'destructive' }) }
    finally { setBusy(false) }
  }
  const remove = async (id: string) => { await api(`/api/companies/${id}`, { method: 'DELETE' }); load() }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-wrap items-end gap-2 mb-4">
          <div><Label className="text-xs text-muted-foreground">Company name</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Vercel" className="mt-1 h-9 w-40" /></div>
          <div><Label className="text-xs text-muted-foreground">Domain (optional)</Label><Input value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="vercel.com" className="mt-1 h-9 w-40" /></div>
          <Button onClick={research} disabled={busy || !name.trim()} className="bg-brand text-brand-foreground hover:bg-brand/90 rounded-full h-9">
            {busy ? <><Spinner /> Researching…</> : <><Search className="h-4 w-4" /> Research</>}
          </Button>
        </div>
        <div className="space-y-2">
          {companies.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">No companies researched yet. Add one to pull web intelligence.</p>
          ) : companies.map((c) => (
            <div key={c.id} className="rounded-lg border p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-brand" />
                  <span className="font-medium text-sm">{c.name}</span>
                  {c.domain && <span className="text-xs text-muted-foreground">{c.domain}</span>}
                </div>
                <button onClick={() => remove(c.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
              {c.research?.summary && <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">{c.research.summary}</p>}
              {c.research?.sources?.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {c.research.sources.slice(0, 4).map((s: any, i: number) => (
                    <a key={i} href={s.url} target="_blank" rel="noreferrer" className="text-[10px] rounded-full border px-2 py-0.5 hover:bg-accent flex items-center gap-1">
                      <ExternalLink className="h-2.5 w-2.5" /> {s.host}
                    </a>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

/** Contacts panel — recruiters, hiring managers, referrals. */
function ContactsPanel() {
  const { toast } = useToast()
  const [contacts, setContacts] = useState<any[]>([])
  const [form, setForm] = useState({ name: '', role: '', email: '', linkedin: '', type: 'recruiter', notes: '' })

  const load = async () => { const { contacts } = await api<{ contacts: any[] }>('/api/contacts'); setContacts(contacts) }
  useEffect(() => { api<{ contacts: any[] }>('/api/contacts').then(({ contacts }) => setContacts(contacts)) }, [])

  const add = async () => {
    if (!form.name.trim()) return
    await api('/api/contacts', { method: 'POST', body: form })
    setForm({ name: '', role: '', email: '', linkedin: '', type: 'recruiter', notes: '' })
    toast({ title: 'Contact added' })
    load()
  }
  const remove = async (id: string) => { await api(`/api/contacts/${id}`, { method: 'DELETE' }); load() }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-4 p-3 rounded-lg bg-muted/30">
          <Input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="h-9 text-sm" />
          <Input placeholder="Role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="h-9 text-sm" />
          <Input placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="h-9 text-sm" />
          <Input placeholder="LinkedIn" value={form.linkedin} onChange={(e) => setForm({ ...form, linkedin: e.target.value })} className="h-9 text-sm" />
          <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
            <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>{['recruiter', 'hiring_manager', 'peer', 'referral', 'mentor'].map((tp) => <SelectItem key={tp} value={tp} className="capitalize">{tp.replace('_', ' ')}</SelectItem>)}</SelectContent>
          </Select>
          <Button onClick={add} disabled={!form.name.trim()} className="bg-brand text-brand-foreground hover:bg-brand/90 h-9 rounded-full"><Plus className="h-4 w-4" /> Add</Button>
        </div>
        <div className="space-y-1.5">
          {contacts.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">No contacts yet. Track recruiters, hiring managers and referrals here.</p>
          ) : contacts.map((c) => (
            <div key={c.id} className="group flex items-center gap-3 rounded-lg border p-2.5">
              <div className="h-8 w-8 rounded-full bg-brand-soft text-brand flex items-center justify-center text-xs font-semibold">{c.name.slice(0, 2).toUpperCase()}</div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{c.name}</div>
                <div className="text-xs text-muted-foreground truncate">{c.role}{c.email ? ` · ${c.email}` : ''}</div>
              </div>
              <Badge variant="outline" className="text-[9px] capitalize">{c.type.replace('_', ' ')}</Badge>
              {c.linkedin && <a href={c.linkedin} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-brand"><ExternalLink className="h-3.5 w-3.5" /></a>}
              <button onClick={() => remove(c.id)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

/** Reminders panel — follow-ups, interviews, deadlines. */
function RemindersPanel() {
  const { toast } = useToast()
  const [reminders, setReminders] = useState<any[]>([])
  const [form, setForm] = useState({ title: '', dueAt: '', type: 'followup' })

  const load = async () => { const { reminders } = await api<{ reminders: any[] }>('/api/reminders'); setReminders(reminders) }
  useEffect(() => { api<{ reminders: any[] }>('/api/reminders').then(({ reminders }) => setReminders(reminders)) }, [])

  const add = async () => {
    if (!form.title.trim() || !form.dueAt) return
    await api('/api/reminders', { method: 'POST', body: form })
    setForm({ title: '', dueAt: '', type: 'followup' })
    toast({ title: 'Reminder added' })
    load()
  }
  const toggle = async (r: any) => { await api(`/api/reminders/${r.id}`, { method: 'PUT', body: { done: !r.done } }); load() }
  const remove = async (id: string) => { await api(`/api/reminders/${id}`, { method: 'DELETE' }); load() }

  const fmt = (d: string) => {
    const date = new Date(d)
    const now = new Date()
    const diff = date.getTime() - now.getTime()
    const days = Math.ceil(diff / 86400000)
    if (days < 0) return `${Math.abs(days)}d overdue`
    if (days === 0) return 'Today'
    if (days === 1) return 'Tomorrow'
    return `${days}d · ${date.toLocaleDateString()}`
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto] gap-2 mb-4 p-3 rounded-lg bg-muted/30">
          <Input placeholder="Reminder title (e.g. Follow up with Vercel recruiter)" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="h-9 text-sm" />
          <Input type="datetime-local" value={form.dueAt} onChange={(e) => setForm({ ...form, dueAt: e.target.value })} className="h-9 text-sm" />
          <Button onClick={add} disabled={!form.title.trim() || !form.dueAt} className="bg-brand text-brand-foreground hover:bg-brand/90 h-9 rounded-full"><Plus className="h-4 w-4" /> Add</Button>
        </div>
        <div className="space-y-1.5">
          {reminders.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">No reminders. Schedule follow-ups, interviews and deadlines.</p>
          ) : reminders.map((r) => (
            <div key={r.id} className={`group flex items-center gap-3 rounded-lg border p-2.5 ${r.done ? 'opacity-50' : ''}`}>
              <button onClick={() => toggle(r)} className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${r.done ? 'bg-brand border-brand' : 'border-muted-foreground/40 hover:border-brand'}`}>
                {r.done && <CheckCircle2 className="h-3 w-3 text-white" />}
              </button>
              <div className="flex-1 min-w-0">
                <div className={`text-sm ${r.done ? 'line-through' : 'font-medium'}`}>{r.title}</div>
                <div className="text-[10px] text-muted-foreground capitalize">{r.type}</div>
              </div>
              <Badge variant="outline" className={`text-[9px] ${new Date(r.dueAt) < new Date() && !r.done ? 'border-destructive/40 text-destructive' : 'border-brand/40 text-brand'}`}>{fmt(r.dueAt)}</Badge>
              <button onClick={() => remove(r.id)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
