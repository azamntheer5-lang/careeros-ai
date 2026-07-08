'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { api } from '@/lib/api-client'
import { useApp } from '@/components/app-provider'
import { useToast } from '@/hooks/use-toast'
import { ModuleHeader } from '@/components/careeros/module-header'
import { Spinner } from '@/components/careeros/loading'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Progress } from '@/components/ui/progress'
import {
  Briefcase, Plus, Trash2, Building2, MapPin, Eye, Users, Search, Sparkles,
  ArrowLeft, X, CheckCircle2, AlertTriangle, AlertCircle, Target, Brain,
  DollarSign, Wifi, FileText, ChevronRight, Zap, ShieldAlert, Lightbulb,
} from 'lucide-react'

// ---------------------------------------------------------------------------
// Types — mirror the API DTOs.
// ---------------------------------------------------------------------------

type Posting = {
  id: string
  title: string
  company: string
  location: string | null
  remote: boolean
  salary: string | null
  type: string
  description: string
  requirements: string[]
  skills: string[]
  status: string
  views: number
  applicationCount: number
  createdAt: string
}

type Application = {
  id: string
  status: string
  matchScore: number | null
  matchNotes: MatchResult | null
  coverLetter: string | null
  createdAt: string
  candidate: {
    id: string
    name: string
    headline: string | null
    email: string
  }
}

type Candidate = {
  id: string
  name: string
  headline: string
  email: string
  location: string | null
  targetRole: string | null
  seniority: string | null
  experienceYears: number | null
  skills: string[]
  summary: string
  experienceHighlights: string[]
  matchScore: number
  isSelf: boolean
}

type MatchResult = {
  matchScore: number
  verdict: string
  strengths: string[]
  gaps: string[]
  risks: string[]
  interviewFocus: string[]
  recommendation: string
}

// ---------------------------------------------------------------------------
// Visual constants
// ---------------------------------------------------------------------------

const STATUS_BADGE: Record<string, string> = {
  open: 'bg-brand/15 text-brand border-brand/30',
  closed: 'bg-destructive/15 text-destructive border-destructive/30',
  draft: 'bg-muted text-muted-foreground border-border',
}

const APP_STATUS_BADGE: Record<string, string> = {
  submitted: 'bg-sky-500/15 text-sky-600 border-sky-500/30',
  reviewed: 'bg-brand/15 text-brand border-brand/30',
  shortlisted: 'bg-violet-500/15 text-violet-600 border-violet-500/30',
  interview: 'bg-amber-500/15 text-amber-600 border-amber-500/30',
  rejected: 'bg-destructive/15 text-destructive border-destructive/30',
  hired: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30',
}

const TYPE_LABELS: Record<string, string> = {
  'full-time': 'Full-time',
  'part-time': 'Part-time',
  contract: 'Contract',
  internship: 'Internship',
}

const JOB_TYPES = ['full-time', 'part-time', 'contract', 'internship']

// ---------------------------------------------------------------------------
// Main module
// ---------------------------------------------------------------------------

export function RecruitModule() {
  const { t } = useApp()
  const { toast } = useToast()
  const [postings, setPostings] = useState<Posting[]>([])
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [loading, setLoading] = useState(true)
  const [showPostJob, setShowPostJob] = useState(false)
  const [selectedPostingId, setSelectedPostingId] = useState<string | null>(null)
  const [tab, setTab] = useState<'jobs' | 'search' | 'ai'>('jobs')

  // Pending preselections for cross-tab navigation
  const [aiJobId, setAiJobId] = useState<string>('')
  const [aiCandidateId, setAiCandidateId] = useState<string>('')

  const load = useCallback(async () => {
    try {
      const res = await api<{ postings: Posting[]; candidates: Candidate[] }>('/api/recruit')
      setPostings(res.postings)
      setCandidates(res.candidates)
    } catch (e) {
      toast({ title: 'Failed to load', description: (e as Error).message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    load()
  }, [load])

  const createPosting = async (form: PostingForm) => {
    try {
      const { posting } = await api<{ posting: Posting }>('/api/recruit', {
        method: 'POST',
        body: form,
      })
      setPostings((p) => [posting, ...p])
      setShowPostJob(false)
      toast({ title: 'Job posted', description: `${posting.title} at ${posting.company}` })
    } catch (e) {
      toast({ title: 'Failed to post', description: (e as Error).message, variant: 'destructive' })
    }
  }

  const updatePosting = async (id: string, patch: Partial<Posting>) => {
    try {
      const { posting } = await api<{ posting: Posting }>(`/api/recruit/${id}`, {
        method: 'PUT',
        body: patch,
      })
      setPostings((p) => p.map((x) => (x.id === id ? posting : x)))
      toast({ title: 'Posting updated' })
    } catch (e) {
      toast({ title: 'Update failed', description: (e as Error).message, variant: 'destructive' })
    }
  }

  const deletePosting = async (id: string) => {
    if (!confirm('Delete this job posting? All applications will be removed too.')) return
    try {
      await api(`/api/recruit/${id}`, { method: 'DELETE' })
      setPostings((p) => p.filter((x) => x.id !== id))
      if (selectedPostingId === id) setSelectedPostingId(null)
      toast({ title: 'Posting deleted' })
    } catch (e) {
      toast({ title: 'Delete failed', description: (e as Error).message, variant: 'destructive' })
    }
  }

  // Cross-tab navigation: jump from a candidate card to the AI Recruiter tab.
  const analyzeCandidate = (candidateId: string, jobPostingId?: string) => {
    setAiCandidateId(candidateId)
    if (jobPostingId) setAiJobId(jobPostingId)
    else if (!aiJobId && postings[0]) setAiJobId(postings[0].id)
    setTab('ai')
  }

  const selectedPosting = selectedPostingId
    ? postings.find((p) => p.id === selectedPostingId) ?? null
    : null

  return (
    <div>
      <ModuleHeader
        title={t('recruitTitle')}
        subtitle={t('recruitSub')}
        icon={Briefcase}
        actions={
          <Button
            size="sm"
            className="rounded-full bg-brand text-brand-foreground hover:bg-brand/90"
            onClick={() => setShowPostJob(true)}
          >
            <Plus className="h-4 w-4" /> {t('postJob')}
          </Button>
        }
      />

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-6 w-6 text-brand" />
        </div>
      ) : (
        <Tabs value={tab} onValueChange={(v) => setTab(v as 'jobs' | 'search' | 'ai')} className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-3 mb-4">
            <TabsTrigger value="jobs">My Jobs</TabsTrigger>
            <TabsTrigger value="search">{t('candidateSearch')}</TabsTrigger>
            <TabsTrigger value="ai">{t('aiRecruiter')}</TabsTrigger>
          </TabsList>

          <TabsContent value="jobs">
            <AnimatePresence mode="wait">
              {selectedPosting ? (
                <motion.div key="detail" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}>
                  <PostingDetail
                    posting={selectedPosting}
                    onBack={() => setSelectedPostingId(null)}
                    onUpdate={(patch) => updatePosting(selectedPosting.id, patch)}
                    onDelete={() => deletePosting(selectedPosting.id)}
                  />
                </motion.div>
              ) : (
                <motion.div key="list" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}>
                  <PostingsList
                    postings={postings}
                    onSelect={(id) => setSelectedPostingId(id)}
                    onDelete={deletePosting}
                    onToggleStatus={(p) =>
                      updatePosting(p.id, { status: p.status === 'open' ? 'closed' : 'open' })
                    }
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </TabsContent>

          <TabsContent value="search">
            <CandidateSearch
              candidates={candidates}
              postings={postings}
              onMatch={(candidateId, jobPostingId) => analyzeCandidate(candidateId, jobPostingId)}
            />
          </TabsContent>

          <TabsContent value="ai">
            <AIRecruiter
              postings={postings}
              candidates={candidates}
              preselectedJobId={aiJobId}
              preselectedCandidateId={aiCandidateId}
            />
          </TabsContent>
        </Tabs>
      )}

      <PostJobDialog
        open={showPostJob}
        onOpenChange={setShowPostJob}
        onCreate={createPosting}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// My Jobs — list + detail
// ---------------------------------------------------------------------------

function PostingsList({
  postings,
  onSelect,
  onDelete,
  onToggleStatus,
}: {
  postings: Posting[]
  onSelect: (id: string) => void
  onDelete: (id: string) => void
  onToggleStatus: (p: Posting) => void
}) {
  const { t } = useApp()
  if (postings.length === 0) {
    return (
      <Card>
        <CardContent className="p-10 text-center">
          <Briefcase className="h-10 w-10 mx-auto text-muted-foreground/40" />
          <p className="mt-3 text-sm text-muted-foreground">
            No job postings yet. Click “{t('postJob')}” to publish your first role.
          </p>
        </CardContent>
      </Card>
    )
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
      {postings.map((p, i) => (
        <motion.div
          key={p.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.04 }}
        >
          <PostingCard
            posting={p}
            onSelect={() => onSelect(p.id)}
            onDelete={() => onDelete(p.id)}
            onToggleStatus={() => onToggleStatus(p)}
          />
        </motion.div>
      ))}
    </div>
  )
}

function PostingCard({
  posting,
  onSelect,
  onDelete,
  onToggleStatus,
}: {
  posting: Posting
  onSelect: () => void
  onDelete: () => void
  onToggleStatus: () => void
}) {
  return (
    <Card className="group relative h-full overflow-hidden hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-semibold leading-tight truncate">{posting.title}</h3>
            <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
              <Building2 className="h-3 w-3" /> {posting.company}
            </div>
          </div>
          <Badge variant="outline" className={STATUS_BADGE[posting.status] ?? STATUS_BADGE.open}>
            {posting.status}
          </Badge>
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-[11px] text-muted-foreground">
          {posting.location && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" /> {posting.location}
            </span>
          )}
          {posting.remote && (
            <span className="flex items-center gap-1 text-brand">
              <Wifi className="h-3 w-3" /> Remote
            </span>
          )}
          {posting.salary && (
            <span className="flex items-center gap-1">
              <DollarSign className="h-3 w-3" /> {posting.salary}
            </span>
          )}
          <Badge variant="secondary" className="text-[10px] h-5">
            {TYPE_LABELS[posting.type] ?? posting.type}
          </Badge>
        </div>

        <p className="text-xs text-muted-foreground mt-3 line-clamp-2">{posting.description}</p>

        {posting.skills.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            {posting.skills.slice(0, 3).map((s) => (
              <Badge key={s} className="bg-brand/10 text-brand border-brand/20 text-[10px]">
                {s}
              </Badge>
            ))}
            {posting.skills.length > 3 && (
              <span className="text-[10px] text-muted-foreground self-center">
                +{posting.skills.length - 3}
              </span>
            )}
          </div>
        )}

        <div className="flex items-center justify-between mt-4 pt-3 border-t">
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <Eye className="h-3 w-3" /> {posting.views}
            </span>
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" /> {posting.applicationCount}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-[11px] rounded-full"
              onClick={onToggleStatus}
            >
              {posting.status === 'open' ? 'Close' : 'Reopen'}
            </Button>
            <button
              onClick={onDelete}
              className="opacity-0 group-hover:opacity-100 transition text-muted-foreground hover:text-destructive p-1"
              aria-label="Delete"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-[11px] rounded-full hover:bg-brand-soft hover:text-brand"
              onClick={onSelect}
            >
              View <ChevronRight className="h-3 w-3 flip-rtl" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function PostingDetail({
  posting,
  onBack,
  onUpdate,
  onDelete,
}: {
  posting: Posting
  onBack: () => void
  onUpdate: (patch: Partial<Posting>) => void
  onDelete: () => void
}) {
  const { t } = useApp()
  const [applications, setApplications] = useState<Application[]>([])
  const [loadingApps, setLoadingApps] = useState(true)

  useEffect(() => {
    let cancelled = false
    api<{ applications: Application[] }>(`/api/recruit/${posting.id}`)
      .then(({ applications }) => {
        if (!cancelled) setApplications(applications)
      })
      .catch(() => {})
      .finally(() => !cancelled && setLoadingApps(false))
    return () => {
      cancelled = true
    }
  }, [posting.id])

  return (
    <div className="space-y-4">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4 flip-rtl" /> Back to all jobs
      </button>

      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-semibold">{posting.title}</h2>
                <Badge variant="outline" className={STATUS_BADGE[posting.status] ?? STATUS_BADGE.open}>
                  {posting.status}
                </Badge>
                <Badge variant="secondary" className="text-[10px]">
                  {TYPE_LABELS[posting.type] ?? posting.type}
                </Badge>
              </div>
              <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                <Building2 className="h-4 w-4" /> {posting.company}
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
                {posting.location && (
                  <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {posting.location}</span>
                )}
                {posting.remote && (
                  <span className="flex items-center gap-1 text-brand"><Wifi className="h-3 w-3" /> Remote-friendly</span>
                )}
                {posting.salary && (
                  <span className="flex items-center gap-1"><DollarSign className="h-3 w-3" /> {posting.salary}</span>
                )}
                <span className="flex items-center gap-1"><Eye className="h-3 w-3" /> {posting.views} views</span>
                <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {posting.applicationCount} applications</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                className="rounded-full"
                onClick={() => onUpdate({ status: posting.status === 'open' ? 'closed' : 'open' })}
              >
                {posting.status === 'open' ? 'Close role' : 'Reopen role'}
              </Button>
              <Button size="sm" variant="outline" className="rounded-full text-destructive" onClick={onDelete}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="md:col-span-2">
              <SectionLabel icon={FileText}>Description</SectionLabel>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{posting.description}</p>

              {posting.requirements.length > 0 && (
                <>
                  <SectionLabel icon={CheckCircle2} className="mt-5">Requirements</SectionLabel>
                  <ul className="space-y-1.5">
                    {posting.requirements.map((r, i) => (
                      <li key={i} className="text-sm text-muted-foreground flex gap-2">
                        <span className="text-brand mt-0.5">•</span> {r}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
            <div>
              <SectionLabel icon={Target}>Required Skills</SectionLabel>
              <div className="flex flex-wrap gap-1.5">
                {posting.skills.length ? (
                  posting.skills.map((s) => (
                    <Badge key={s} className="bg-brand/15 text-brand border-brand/30">
                      {s}
                    </Badge>
                  ))
                ) : (
                  <span className="text-xs text-muted-foreground">None specified</span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Users className="h-4 w-4 text-brand" /> Applications
            <Badge variant="secondary" className="text-[10px] ml-1">{applications.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingApps ? (
            <div className="flex justify-center py-6"><Spinner className="h-5 w-5 text-brand" /></div>
          ) : applications.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">
              No applications yet. Run AI analysis from the {t('aiRecruiter')} tab to create match records.
            </p>
          ) : (
            <div className="max-h-96 overflow-y-auto space-y-2 pr-1 recruit-scroll">
              {applications.map((a) => (
                <ApplicationRow key={a.id} app={a} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function ApplicationRow({ app }: { app: Application }) {
  const [expanded, setExpanded] = useState(false)
  const hasMatch = app.matchScore != null && app.matchNotes
  return (
    <div className="rounded-lg border p-3">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-full bg-brand-soft text-brand flex items-center justify-center text-xs font-semibold shrink-0">
          {app.candidate.name.slice(0, 2).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium truncate">{app.candidate.name}</div>
          <div className="text-xs text-muted-foreground truncate">
            {app.candidate.headline || app.candidate.email}
          </div>
        </div>
        {app.matchScore != null && (
          <div className="text-end">
            <div className={`text-sm font-semibold ${
              app.matchScore >= 80 ? 'text-brand' : app.matchScore >= 65 ? 'text-amber-600' : 'text-muted-foreground'
            }`}>
              {app.matchScore}
            </div>
            <div className="text-[9px] text-muted-foreground uppercase tracking-wide">match</div>
          </div>
        )}
        <Badge variant="outline" className={APP_STATUS_BADGE[app.status] ?? APP_STATUS_BADGE.submitted}>
          {app.status}
        </Badge>
        {hasMatch && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-[11px] text-muted-foreground hover:text-brand px-1"
          >
            {expanded ? 'Hide' : 'View'}
          </button>
        )}
      </div>
      {expanded && hasMatch && app.matchNotes && (
        <div className="mt-3 pt-3 border-t grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div>
            <div className="text-brand font-medium mb-1">Strengths</div>
            <ul className="space-y-0.5">
              {app.matchNotes.strengths.slice(0, 3).map((s, i) => (
                <li key={i} className="text-muted-foreground">• {s}</li>
              ))}
            </ul>
          </div>
          <div>
            <div className="text-amber-600 font-medium mb-1">Gaps</div>
            <ul className="space-y-0.5">
              {app.matchNotes.gaps.slice(0, 3).map((s, i) => (
                <li key={i} className="text-muted-foreground">• {s}</li>
              ))}
            </ul>
          </div>
          <div>
            <div className="text-destructive font-medium mb-1">Risks</div>
            <ul className="space-y-0.5">
              {app.matchNotes.risks.length ? (
                app.matchNotes.risks.slice(0, 3).map((s, i) => (
                  <li key={i} className="text-muted-foreground">• {s}</li>
                ))
              ) : (
                <li className="text-muted-foreground">None flagged</li>
              )}
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Candidate Search tab
// ---------------------------------------------------------------------------

function CandidateSearch({
  candidates,
  postings,
  onMatch,
}: {
  candidates: Candidate[]
  postings: Posting[]
  onMatch: (candidateId: string, jobPostingId?: string) => void
}) {
  const [query, setQuery] = useState('')
  const [filterJobId, setFilterJobId] = useState<string>('')

  const filtered = candidates.filter((c) => {
    if (!query.trim()) return true
    const q = query.toLowerCase()
    return (
      c.name.toLowerCase().includes(q) ||
      c.headline.toLowerCase().includes(q) ||
      c.targetRole?.toLowerCase().includes(q) ||
      c.location?.toLowerCase().includes(q) ||
      c.skills.some((s) => s.toLowerCase().includes(q))
    )
  })

  // Re-score against the selected posting if one is chosen.
  const referenceSkills = filterJobId
    ? (postings.find((p) => p.id === filterJobId)?.skills ?? [])
    : []

  const recompute = (c: Candidate): number => {
    if (!referenceSkills.length) return c.matchScore
    if (!c.skills.length) return 40
    const jobSet = new Set(referenceSkills.map((s) => s.toLowerCase()))
    const hits = c.skills.filter((s) => jobSet.has(s.toLowerCase())).length
    return Math.min(96, Math.max(48, Math.round(55 + (hits / referenceSkills.length) * 40 + Math.min(hits * 2, 5))))
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name, role, skill or location…"
                className="ps-9"
              />
            </div>
            <div className="sm:w-64">
              <Select value={filterJobId} onValueChange={setFilterJobId}>
                <SelectTrigger><SelectValue placeholder="Score against: any role" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Any role</SelectItem>
                  {postings.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.title} · {p.company}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center text-sm text-muted-foreground">
            No candidates match “{query}”.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((c, i) => (
            <motion.div key={c.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
              <CandidateCard
                candidate={c}
                score={recompute(c)}
                onMatch={() => onMatch(c.id, filterJobId || undefined)}
              />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}

function CandidateCard({
  candidate,
  score,
  onMatch,
}: {
  candidate: Candidate
  score: number
  onMatch: () => void
}) {
  return (
    <Card className="h-full hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        <div className="flex items-start gap-3">
          <div className="h-11 w-11 rounded-full bg-brand-soft text-brand flex items-center justify-center text-sm font-semibold shrink-0 ring-2 ring-background">
            {candidate.name.slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="text-sm font-semibold truncate">{candidate.name}</h3>
              {candidate.isSelf && <Badge className="bg-violet-500/15 text-violet-600 border-violet-500/30 text-[9px]">You</Badge>}
            </div>
            <div className="text-xs text-muted-foreground truncate">{candidate.headline}</div>
            <div className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
              {candidate.location && (
                <>
                  <MapPin className="h-2.5 w-2.5" /> {candidate.location}
                </>
              )}
              {candidate.experienceYears != null && (
                <span className="ms-1">· {candidate.experienceYears}y exp</span>
              )}
            </div>
          </div>
          <MiniScoreRing score={score} />
        </div>

        <p className="text-xs text-muted-foreground mt-3 line-clamp-2">{candidate.summary}</p>

        {candidate.skills.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            {candidate.skills.slice(0, 4).map((s) => (
              <Badge key={s} variant="outline" className="text-[10px] border-brand/30 text-brand">
                {s}
              </Badge>
            ))}
            {candidate.skills.length > 4 && (
              <span className="text-[10px] text-muted-foreground self-center">+{candidate.skills.length - 4}</span>
            )}
          </div>
        )}

        <div className="flex items-center justify-between mt-4 pt-3 border-t">
          <div className="text-[10px] text-muted-foreground">
            {candidate.experienceHighlights.length} role{candidate.experienceHighlights.length === 1 ? '' : 's'}
          </div>
          <Button
            size="sm"
            className="rounded-full bg-brand text-brand-foreground hover:bg-brand/90 h-7 text-[11px]"
            onClick={onMatch}
          >
            <Sparkles className="h-3 w-3" /> Match with AI
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function MiniScoreRing({ score }: { score: number }) {
  const r = 16
  const circ = 2 * Math.PI * r
  const offset = circ - (Math.max(0, Math.min(100, score)) / 100) * circ
  const color = score >= 80 ? 'oklch(0.7 0.15 162)' : score >= 65 ? 'oklch(0.75 0.15 80)' : 'oklch(0.65 0.05 20)'
  return (
    <div className="relative h-12 w-12 shrink-0">
      <svg className="h-12 w-12 -rotate-90" viewBox="0 0 40 40">
        <circle cx="20" cy="20" r={r} fill="none" stroke="var(--muted)" strokeWidth="3" />
        <motion.circle
          cx="20" cy="20" r={r} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xs font-bold" style={{ color }}>{score}</span>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// AI Recruiter tab
// ---------------------------------------------------------------------------

function AIRecruiter({
  postings,
  candidates,
  preselectedJobId,
  preselectedCandidateId,
}: {
  postings: Posting[]
  candidates: Candidate[]
  preselectedJobId: string
  preselectedCandidateId: string
}) {
  const { toast } = useToast()
  const [jobId, setJobId] = useState(preselectedJobId)
  const [candidateId, setCandidateId] = useState(preselectedCandidateId)
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<MatchResult | null>(null)

  // Sync preselections when parent passes new values (e.g., from candidate card "Match" buttons).
  useEffect(() => {
    if (preselectedJobId) setJobId(preselectedJobId)
  }, [preselectedJobId])
  useEffect(() => {
    if (preselectedCandidateId) setCandidateId(preselectedCandidateId)
  }, [preselectedCandidateId])

  const selectedJob = postings.find((p) => p.id === jobId) ?? null
  const selectedCandidate = candidates.find((c) => c.id === candidateId) ?? null

  const runAnalysis = async () => {
    if (!jobId || !candidateId) {
      toast({ title: 'Selection required', description: 'Pick a job posting and a candidate first.', variant: 'destructive' })
      return
    }
    setRunning(true)
    setResult(null)
    try {
      const { match } = await api<{ match: MatchResult }>('/api/recruit/match', {
        method: 'POST',
        body: { jobPostingId: jobId, candidateId },
      })
      setResult(match)
      toast({ title: 'AI analysis complete', description: `Match score: ${match.matchScore}/100` })
    } catch (e) {
      toast({ title: 'Analysis failed', description: (e as Error).message, variant: 'destructive' })
    } finally {
      setRunning(false)
    }
  }

  if (postings.length === 0) {
    return (
      <Card>
        <CardContent className="p-10 text-center text-sm text-muted-foreground">
          Post a job first — the AI Recruiter needs a job posting to analyze candidates against.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-4">
      {/* Selector column */}
      <Card className="h-fit">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Brain className="h-4 w-4 text-brand" /> Configure Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-xs text-muted-foreground">Job posting</Label>
            <Select value={jobId} onValueChange={setJobId}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Select a role" /></SelectTrigger>
              <SelectContent>
                {postings.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.title} · {p.company}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Candidate</Label>
            <Select value={candidateId} onValueChange={setCandidateId}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Select a candidate" /></SelectTrigger>
              <SelectContent>
                {candidates.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}{c.isSelf ? ' (You)' : ''} — {c.headline}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedJob && selectedCandidate && (
            <div className="rounded-lg border bg-muted/30 p-3 space-y-1.5">
              <div className="text-[11px] text-muted-foreground">Match preview</div>
              <div className="text-sm font-medium">{selectedJob.title}</div>
              <div className="text-xs text-muted-foreground">at {selectedJob.company}</div>
              <div className="text-xs text-muted-foreground mt-1.5">vs</div>
              <div className="text-sm font-medium">{selectedCandidate.name}</div>
              <div className="text-xs text-muted-foreground">{selectedCandidate.headline}</div>
              {selectedJob.skills.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1.5">
                  {selectedJob.skills.slice(0, 4).map((s) => {
                    const has = selectedCandidate.skills.some((cs) => cs.toLowerCase() === s.toLowerCase())
                    return (
                      <Badge
                        key={s}
                        variant="outline"
                        className={`text-[9px] ${has ? 'border-brand/40 text-brand bg-brand/10' : 'text-muted-foreground'}`}
                      >
                        {has && <CheckCircle2 className="h-2.5 w-2.5 me-0.5" />}{s}
                      </Badge>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          <Button
            onClick={runAnalysis}
            disabled={running || !jobId || !candidateId}
            className="w-full bg-brand text-brand-foreground hover:bg-brand/90 rounded-full"
          >
            {running ? (
              <><Spinner /> Running AI analysis…</>
            ) : (
              <><Zap className="h-4 w-4" /> Run AI Analysis</>
            )}
          </Button>
          <p className="text-[10px] text-muted-foreground text-center">
            The AI loads the candidate's resume + profile, scores fit, flags risks, and recommends interview focus areas.
          </p>
        </CardContent>
      </Card>

      {/* Result column */}
      <div>
        {running ? (
          <Card>
            <CardContent className="p-10 flex flex-col items-center gap-3">
              <div className="h-12 w-12 rounded-full border-4 border-brand/20 border-t-brand animate-spin" />
              <p className="text-sm text-muted-foreground">Reading resume like a senior recruiter…</p>
            </CardContent>
          </Card>
        ) : result ? (
          <MatchResultPanel result={result} />
        ) : (
          <Card>
            <CardContent className="p-10 text-center">
              <Brain className="h-10 w-10 mx-auto text-muted-foreground/40" />
              <p className="mt-3 text-sm text-muted-foreground">
                Select a job and a candidate, then run AI analysis to see a deep match report here.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-6 max-w-md mx-auto">
                {[
                  { icon: Target, label: 'Match Score' },
                  { icon: CheckCircle2, label: 'Strengths & Gaps' },
                  { icon: ShieldAlert, label: 'Risks & Focus' },
                ].map(({ icon: I, label }) => (
                  <div key={label} className="rounded-lg border p-3 text-center">
                    <I className="h-4 w-4 mx-auto text-brand" />
                    <div className="text-[11px] text-muted-foreground mt-1">{label}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

function MatchResultPanel({ result }: { result: MatchResult }) {
  const color = result.matchScore >= 80 ? 'oklch(0.7 0.15 162)' : result.matchScore >= 65 ? 'oklch(0.75 0.15 80)' : 'oklch(0.65 0.05 20)'
  const verdictLabel = result.matchScore >= 80 ? 'Strong match' : result.matchScore >= 65 ? 'Worth exploring' : 'Stretch fit'
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      {/* Hero */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="grid grid-cols-1 md:grid-cols-[220px_1fr]">
            <div
              className="flex flex-col items-center justify-center p-6 border-b md:border-b-0 md:border-e"
              style={{ background: `linear-gradient(135deg, color-mix(in oklch, ${color} 18%, var(--card)), var(--card))` }}
            >
              <ScoreRing score={result.matchScore} color={color} />
              <Badge variant="outline" className="mt-3 border-current/30" style={{ color }}>
                {verdictLabel}
              </Badge>
            </div>
            <div className="p-5">
              <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-1">
                <Sparkles className="h-3.5 w-3.5 text-brand" /> AI Verdict
              </div>
              <p className="text-sm leading-relaxed">{result.verdict}</p>
              {result.recommendation && (
                <div className="mt-3 rounded-lg bg-brand-soft/40 border border-brand/20 p-3 text-sm">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-brand mb-1">
                    <Lightbulb className="h-3.5 w-3.5" /> Recommendation
                  </div>
                  <p className="text-foreground/90">{result.recommendation}</p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Strengths */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-brand" /> Strengths
            </CardTitle>
          </CardHeader>
          <CardContent>
            {result.strengths.length ? (
              <ul className="space-y-1.5">
                {result.strengths.map((s, i) => (
                  <li key={i} className="text-xs text-muted-foreground flex gap-2">
                    <span className="text-brand mt-0.5">•</span> {s}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-muted-foreground">None identified.</p>
            )}
          </CardContent>
        </Card>

        {/* Gaps */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" /> Gaps
            </CardTitle>
          </CardHeader>
          <CardContent>
            {result.gaps.length ? (
              <ul className="space-y-1.5">
                {result.gaps.map((s, i) => (
                  <li key={i} className="text-xs text-muted-foreground flex gap-2">
                    <span className="text-amber-500 mt-0.5">•</span> {s}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-muted-foreground">No significant gaps.</p>
            )}
          </CardContent>
        </Card>

        {/* Risks */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-destructive" /> Risks
            </CardTitle>
          </CardHeader>
          <CardContent>
            {result.risks.length ? (
              <ul className="space-y-1.5">
                {result.risks.map((s, i) => (
                  <li key={i} className="text-xs text-muted-foreground flex gap-2">
                    <span className="text-destructive mt-0.5">!</span> {s}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-muted-foreground">No risks flagged.</p>
            )}
          </CardContent>
        </Card>

        {/* Interview focus */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Target className="h-4 w-4 text-brand" /> Interview Focus Areas
            </CardTitle>
          </CardHeader>
          <CardContent>
            {result.interviewFocus.length ? (
              <div className="flex flex-wrap gap-1.5">
                {result.interviewFocus.map((s, i) => (
                  <Badge key={i} className="bg-brand/15 text-brand border-brand/30">
                    {s}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No focus areas suggested.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </motion.div>
  )
}

// ---------------------------------------------------------------------------
// Post a Job dialog
// ---------------------------------------------------------------------------

type PostingForm = {
  title: string
  company: string
  location: string
  remote: boolean
  salary: string
  type: string
  description: string
  requirements: string[]
  skills: string[]
}

function PostJobDialog({
  open,
  onOpenChange,
  onCreate,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onCreate: (form: PostingForm) => void
}) {
  const { t } = useApp()
  const [form, setForm] = useState<PostingForm>({
    title: '',
    company: '',
    location: '',
    remote: true,
    salary: '',
    type: 'full-time',
    description: '',
    requirements: [],
    skills: [],
  })

  const reset = () => setForm({
    title: '', company: '', location: '', remote: true, salary: '',
    type: 'full-time', description: '', requirements: [], skills: [],
  })

  const submit = () => {
    if (!form.title.trim() || !form.company.trim() || !form.description.trim()) {
      return
    }
    onCreate(form)
    reset()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset() }}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto recruit-scroll">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-brand" /> {t('postJob')}
          </DialogTitle>
          <DialogDescription>
            Publish a new role. The AI Recruiter will match candidates against this posting.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label className="text-xs text-muted-foreground">Job title *</Label>
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Senior Frontend Engineer"
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Company *</Label>
            <Input
              value={form.company}
              onChange={(e) => setForm({ ...form, company: e.target.value })}
              placeholder="Vercel"
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Location</Label>
            <Input
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              placeholder="Remote (Global)"
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Salary range</Label>
            <Input
              value={form.salary}
              onChange={(e) => setForm({ ...form, salary: e.target.value })}
              placeholder="$180k–$220k"
              className="mt-1"
            />
          </div>
          <div className="flex items-center justify-between rounded-md border p-2.5">
            <div>
              <Label className="text-xs">Remote-friendly</Label>
              <p className="text-[10px] text-muted-foreground">Tag the role as remote-eligible</p>
            </div>
            <Switch checked={form.remote} onCheckedChange={(v) => setForm({ ...form, remote: v })} />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Employment type</Label>
            <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {JOB_TYPES.map((tp) => (
                  <SelectItem key={tp} value={tp}>{TYPE_LABELS[tp]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label className="text-xs text-muted-foreground">Description *</Label>
          <Textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={4}
            placeholder="Describe the role, team, mission and what the candidate will own…"
            className="mt-1"
          />
        </div>

        <div>
          <Label className="text-xs text-muted-foreground">Requirements</Label>
          <p className="text-[10px] text-muted-foreground mb-1.5">Press Enter or comma to add.</p>
          <ChipInput
            value={form.requirements}
            onChange={(v) => setForm({ ...form, requirements: v })}
            placeholder="5+ years React experience"
          />
        </div>

        <div>
          <Label className="text-xs text-muted-foreground">Required skills</Label>
          <p className="text-[10px] text-muted-foreground mb-1.5">Press Enter or comma to add.</p>
          <ChipInput
            value={form.skills}
            onChange={(v) => setForm({ ...form, skills: v })}
            placeholder="React, TypeScript, Next.js"
          />
        </div>

        <DialogFooter>
          <Button variant="outline" className="rounded-full" onClick={() => onOpenChange(false)}>
            {t('cancel')}
          </Button>
          <Button
            className="rounded-full bg-brand text-brand-foreground hover:bg-brand/90"
            onClick={submit}
            disabled={!form.title.trim() || !form.company.trim() || !form.description.trim()}
          >
            <Plus className="h-4 w-4" /> Publish role
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Shared bits
// ---------------------------------------------------------------------------

function ScoreRing({ score, color }: { score: number; color: string }) {
  const r = 34
  const circ = 2 * Math.PI * r
  const offset = circ - (Math.max(0, Math.min(100, score)) / 100) * circ
  return (
    <div className="relative h-24 w-24">
      <svg className="h-24 w-24 -rotate-90" viewBox="0 0 80 80">
        <circle cx="40" cy="40" r={r} fill="none" stroke="var(--muted)" strokeWidth="6" />
        <motion.circle
          cx="40" cy="40" r={r} fill="none" stroke={color} strokeWidth="6" strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold" style={{ color }}>{score}</span>
        <span className="text-[9px] text-muted-foreground uppercase tracking-wide">/ 100</span>
      </div>
    </div>
  )
}

function SectionLabel({ icon: Icon, children, className }: { icon: React.ElementType; children: React.ReactNode; className?: string }) {
  return (
    <div className={`flex items-center gap-1.5 text-xs font-semibold text-foreground mb-2 ${className ?? ''}`}>
      <Icon className="h-3.5 w-3.5 text-brand" /> {children}
    </div>
  )
}

function ChipInput({
  value,
  onChange,
  placeholder,
}: {
  value: string[]
  onChange: (v: string[]) => void
  placeholder?: string
}) {
  const [input, setInput] = useState('')
  const add = () => {
    const v = input.trim().replace(/,+$/, '').trim()
    if (v && !value.includes(v)) onChange([...value, v])
    setInput('')
  }
  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-md border bg-background p-2 min-h-9 focus-within:ring-2 focus-within:ring-ring/30">
      {value.map((chip) => (
        <Badge key={chip} className="bg-brand/15 text-brand border-brand/30 gap-1 text-[11px]">
          {chip}
          <button
            type="button"
            onClick={() => onChange(value.filter((c) => c !== chip))}
            className="hover:bg-brand/20 rounded-full p-0.5"
            aria-label={`Remove ${chip}`}
          >
            <X className="h-2.5 w-2.5" />
          </button>
        </Badge>
      ))}
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault()
            add()
          } else if (e.key === 'Backspace' && !input && value.length) {
            onChange(value.slice(0, -1))
          }
        }}
        onBlur={add}
        placeholder={value.length === 0 ? placeholder : ''}
        className="flex-1 min-w-[140px] bg-transparent outline-none text-sm py-0.5"
      />
    </div>
  )
}
