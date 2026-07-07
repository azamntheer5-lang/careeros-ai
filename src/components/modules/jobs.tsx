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
import { Briefcase, Plus, Trash2, ChevronRight, ChevronLeft, ExternalLink, Building2, DollarSign, Calendar, Flag } from 'lucide-react'
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
