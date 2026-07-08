'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { api } from '@/lib/api-client'
import { useApp } from '@/components/app-provider'
import { useToast } from '@/hooks/use-toast'
import { useProfile } from '@/components/careeros/profile-context'
import { ModuleHeader } from '@/components/careeros/module-header'
import { Spinner } from '@/components/careeros/loading'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  BadgeCheck,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  Target,
  Users,
  Copy,
  Check,
  History,
  Linkedin,
  Fingerprint,
  Hash,
  Network,
} from 'lucide-react'

// ---------------------------------------------------------------------------
// Types (mirror the API contract)
// ---------------------------------------------------------------------------
type ContentIdea = { topic: string; angle: string }
type NetworkingTarget = { type: string; who: string; why: string }

type LinkedInPayload = {
  score: number
  headlineScore: number
  aboutScore: number
  headline: string
  about: string
  strengths: string[]
  weaknesses: string[]
  contentIdeas: ContentIdea[]
  keywordGaps: string[]
}

type IdentityPayload = {
  score: number
  narrativeScore: number
  presenceScore: number
  differentiationScore: number
  analysis: string
  suggestions: string[]
  networkingTargets: NetworkingTarget[]
}

type Analysis = {
  id: string
  type: 'linkedin' | 'identity'
  headline: string | null
  about: string | null
  score: number | null
  data: LinkedInPayload | IdentityPayload
  createdAt: string
  updatedAt: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const d = Math.floor(diff / 86400000)
  if (d <= 0) return 'today'
  if (d === 1) return 'yesterday'
  if (d < 30) return `${d}d ago`
  const mo = Math.floor(d / 30)
  if (mo < 12) return `${mo}mo ago`
  return `${Math.floor(mo / 12)}y ago`
}

// ---------------------------------------------------------------------------
// Module
// ---------------------------------------------------------------------------
export function BrandingModule() {
  const { t } = useApp()
  const { toast } = useToast()
  const { profile, user } = useProfile()

  const [tab, setTab] = useState<'linkedin' | 'identity'>('linkedin')
  const [history, setHistory] = useState<Analysis[]>([])
  const [active, setActive] = useState<Analysis | null>(null)
  const [historyLoading, setHistoryLoading] = useState(true)

  // LinkedIn form state.
  const [liHeadline, setLiHeadline] = useState('')
  const [liAbout, setLiAbout] = useState('')
  const [liRole, setLiRole] = useState('')
  const [liExperience, setLiExperience] = useState('')
  const [busy, setBusy] = useState(false)

  // Pre-fill from profile on first load.
  useEffect(() => {
    if (!profile) return
    if (!liHeadline && user?.headline) setLiHeadline(user.headline)
    if (!liRole && profile.targetRole) setLiRole(profile.targetRole)
    if (!liAbout && profile.brandStatement) setLiAbout(profile.brandStatement)
  }, [profile, user, liHeadline, liRole, liAbout])

  // Load history.
  useEffect(() => {
    let cancelled = false
    setHistoryLoading(true)
    api<{ analyses: Analysis[] }>('/api/branding')
      .then((res) => {
        if (cancelled) return
        setHistory(res.analyses)
        if (res.analyses[0]) {
          setActive(res.analyses[0])
          setTab(res.analyses[0].type)
        }
      })
      .catch(() => {})
      .finally(() => !cancelled && setHistoryLoading(false))
    return () => {
      cancelled = true
    }
  }, [])

  const runLinkedIn = async () => {
    if (!liHeadline.trim() && !liAbout.trim()) {
      toast({
        title: 'Missing LinkedIn content',
        description: 'Add at least a current headline or about section to analyze.',
        variant: 'destructive',
      })
      return
    }
    setBusy(true)
    setActive(null)
    try {
      const { analysis } = await api<{ analysis: Analysis }>('/api/branding', {
        method: 'POST',
        body: {
          type: 'linkedin',
          profileData: {
            headline: liHeadline,
            about: liAbout,
            targetRole: liRole,
            experience: liExperience,
          },
        },
      })
      setActive(analysis)
      setTab('linkedin')
      setHistory((prev) => [analysis, ...prev.filter((h) => h.id !== analysis.id)])
      toast({
        title: 'LinkedIn optimized',
        description: `Brand score ${analysis.score ?? '—'}/100`,
      })
    } catch (e) {
      toast({ title: 'Analysis failed', description: (e as Error).message, variant: 'destructive' })
    } finally {
      setBusy(false)
    }
  }

  const runIdentity = async () => {
    setBusy(true)
    setActive(null)
    try {
      const { analysis } = await api<{ analysis: Analysis }>('/api/branding', {
        method: 'POST',
        body: {
          type: 'identity',
          profileData: {
            name: user?.name,
            headline: user?.headline,
            targetRole: profile?.targetRole,
            industry: profile?.industry,
            seniority: profile?.seniority,
            brandStatement: profile?.brandStatement,
            strengths: profile?.strengths ?? [],
            values: profile?.values ?? [],
            linkedinUrl: profile?.linkedinUrl,
            githubUrl: profile?.githubUrl,
            portfolioUrl: profile?.portfolioUrl,
            careerGoals: profile?.careerGoals,
          },
        },
      })
      setActive(analysis)
      setTab('identity')
      setHistory((prev) => [analysis, ...prev.filter((h) => h.id !== analysis.id)])
      toast({
        title: 'Brand audit complete',
        description: `Overall brand score ${analysis.score ?? '—'}/100`,
      })
    } catch (e) {
      toast({ title: 'Audit failed', description: (e as Error).message, variant: 'destructive' })
    } finally {
      setBusy(false)
    }
  }

  const openFromHistory = (a: Analysis) => {
    setActive(a)
    setTab(a.type)
  }

  // Resolve the active payload per tab. When the active analysis isn't of the
  // current tab's type, fall back to the most recent matching history entry so
  // each tab always shows the user's latest results.
  const activeLinkedIn: LinkedInPayload | null = (() => {
    if (active && active.type === 'linkedin') return active.data as LinkedInPayload
    const latest = history.find((h) => h.type === 'linkedin')
    return latest ? (latest.data as LinkedInPayload) : null
  })()
  const activeIdentity: IdentityPayload | null = (() => {
    if (active && active.type === 'identity') return active.data as IdentityPayload
    const latest = history.find((h) => h.type === 'identity')
    return latest ? (latest.data as IdentityPayload) : null
  })()

  return (
    <div>
      <ModuleHeader title={t('brandingTitle')} subtitle={t('brandingSub')} icon={BadgeCheck} />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-4">
        {/* MAIN COLUMN */}
        <div className="min-w-0">
          <Tabs value={tab} onValueChange={(v) => setTab(v as 'linkedin' | 'identity')}>
            <TabsList className="mb-4">
              <TabsTrigger value="linkedin">
                <Linkedin className="h-3.5 w-3.5" /> LinkedIn
              </TabsTrigger>
              <TabsTrigger value="identity">
                <Fingerprint className="h-3.5 w-3.5" /> Brand Identity
              </TabsTrigger>
            </TabsList>

            {/* ----------------------------------------------------------------- */}
            {/* LINKEDIN TAB                                                      */}
            {/* ----------------------------------------------------------------- */}
            <TabsContent value="linkedin" className="space-y-4">
              {/* INPUT CARD */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Linkedin className="h-4 w-4 text-brand" /> LinkedIn Optimizer
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Current headline</Label>
                    <Input
                      value={liHeadline}
                      onChange={(e) => setLiHeadline(e.target.value)}
                      placeholder="e.g. Senior Product Engineer @ Acme"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Target role</Label>
                    <Input
                      value={liRole}
                      onChange={(e) => setLiRole(e.target.value)}
                      placeholder="e.g. Staff Software Engineer"
                    />
                  </div>
                  <div className="md:col-span-2 space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Current about section</Label>
                    <Textarea
                      value={liAbout}
                      onChange={(e) => setLiAbout(e.target.value)}
                      rows={4}
                      placeholder="Paste your LinkedIn 'About' summary…"
                    />
                  </div>
                  <div className="md:col-span-2 space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Brief experience (optional)</Label>
                    <Textarea
                      value={liExperience}
                      onChange={(e) => setLiExperience(e.target.value)}
                      rows={3}
                      placeholder="One-liner on your current role + key wins for context…"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Button
                      onClick={runLinkedIn}
                      disabled={busy}
                      className="w-full bg-brand text-brand-foreground hover:bg-brand/90 rounded-full"
                    >
                      {busy ? (
                        <>
                          <Spinner /> {t('analyzing')}
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4" /> Analyze with AI
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {busy && tab === 'linkedin' && !activeLinkedIn && (
                <Card>
                  <CardContent className="p-8 flex flex-col items-center gap-3">
                    <div className="h-12 w-12 rounded-full border-4 border-brand/20 border-t-brand animate-spin" />
                    <p className="text-sm text-muted-foreground">
                      Reading your profile like a recruiter…
                    </p>
                  </CardContent>
                </Card>
              )}

              {activeLinkedIn && (
                <LinkedInResults payload={activeLinkedIn} />
              )}
            </TabsContent>

            {/* ----------------------------------------------------------------- */}
            {/* IDENTITY TAB                                                      */}
            {/* ----------------------------------------------------------------- */}
            <TabsContent value="identity" className="space-y-4">
              {/* HERO */}
              <Card className="overflow-hidden">
                <CardContent className="p-0">
                  <div className="relative grid-bg p-6">
                    <div className="relative z-10 flex flex-col sm:flex-row sm:items-end gap-4">
                      <div className="flex-1">
                        <div className="inline-flex items-center gap-2 rounded-full bg-brand/10 px-3 py-1 text-xs font-medium text-brand mb-3">
                          <Fingerprint className="h-3.5 w-3.5" /> Personal brand audit
                        </div>
                        <h3 className="text-xl sm:text-2xl font-semibold tracking-tight">
                          Run your brand audit
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1 max-w-md">
                          We pull your identity directly from your Career Profile — narrative,
                          presence, differentiation — and benchmark your professional brand.
                        </p>
                      </div>
                      <Button
                        onClick={runIdentity}
                        disabled={busy}
                        className="bg-brand text-brand-foreground hover:bg-brand/90 rounded-full h-10 md:w-auto"
                      >
                        {busy ? <Spinner /> : <Sparkles className="h-4 w-4" />}
                        {busy ? 'Auditing your brand…' : 'Run brand audit'}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {busy && tab === 'identity' && !activeIdentity && (
                <Card>
                  <CardContent className="p-8 flex flex-col items-center gap-3">
                    <div className="h-12 w-12 rounded-full border-4 border-brand/20 border-t-brand animate-spin" />
                    <p className="text-sm text-muted-foreground">
                      Scoring your narrative, presence &amp; differentiation…
                    </p>
                  </CardContent>
                </Card>
              )}

              {activeIdentity && <IdentityResults payload={activeIdentity} />}

              {/* Profile context preview */}
              {!activeIdentity && !busy && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Fingerprint className="h-4 w-4 text-brand" /> Profile context
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <ProfileRow label="Name" value={user?.name} />
                    <ProfileRow label="Headline" value={user?.headline} />
                    <ProfileRow label="Target role" value={profile?.targetRole} />
                    <ProfileRow label="Industry" value={profile?.industry} />
                    <ProfileRow label="Seniority" value={profile?.seniority} />
                    <ProfileRow
                      label="Strengths"
                      value={profile?.strengths?.length ? profile.strengths.join(', ') : undefined}
                    />
                    <ProfileRow
                      label="Values"
                      value={profile?.values?.length ? profile.values.join(', ') : undefined}
                    />
                    <ProfileRow label="LinkedIn URL" value={profile?.linkedinUrl} />
                    <ProfileRow label="GitHub URL" value={profile?.githubUrl} />
                    <ProfileRow label="Portfolio URL" value={profile?.portfolioUrl} />
                    <p className="text-xs text-muted-foreground pt-2">
                      Update any of these in your Career Profile to refine the audit.
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* HISTORY SIDEBAR */}
        <div className="lg:sticky lg:top-4 lg:self-start">
          <Card className="h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <History className="h-4 w-4 text-muted-foreground" /> Past analyses
              </CardTitle>
            </CardHeader>
            <CardContent>
              {historyLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Spinner className="text-brand" />
                </div>
              ) : history.length === 0 ? (
                <div className="py-8 text-center">
                  <BadgeCheck className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">No analyses yet.</p>
                  <p className="text-xs text-muted-foreground/70">Run your first audit to see history.</p>
                </div>
              ) : (
                <ScrollArea className="max-h-96 -me-2 pe-2">
                  <div className="space-y-1.5">
                    {history.map((h) => {
                      const isActive = active?.id === h.id
                      const Icon = h.type === 'linkedin' ? Linkedin : Fingerprint
                      return (
                        <button
                          key={h.id}
                          onClick={() => openFromHistory(h)}
                          className={`w-full text-start rounded-lg border p-2.5 transition-all hover:border-brand/40 ${
                            isActive
                              ? 'border-brand/50 bg-brand/5 ring-1 ring-brand/20'
                              : 'border-border bg-card hover:bg-muted/30'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <Icon className="h-3.5 w-3.5 text-brand shrink-0" />
                              <span className="text-xs font-semibold truncate capitalize">
                                {h.type === 'linkedin' ? 'LinkedIn' : 'Brand identity'}
                              </span>
                            </div>
                            {typeof h.score === 'number' && (
                              <Badge
                                variant="outline"
                                className="h-4 px-1 text-[9px] shrink-0 border-brand/40 text-brand"
                              >
                                {h.score}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                            <span className="truncate">{h.headline || 'Audit result'}</span>
                            <span className="shrink-0">{timeAgo(h.createdAt)}</span>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// LinkedIn results block
// ---------------------------------------------------------------------------
function LinkedInResults({ payload }: { payload: LinkedInPayload }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* SCORE HERO */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="grid grid-cols-1 md:grid-cols-[200px_1fr]">
            <div className="flex flex-col items-center justify-center p-6 border-b md:border-b-0 md:border-e bg-brand-soft/40">
              <ScoreRing score={payload.score} />
              <div className="mt-2 text-xs text-muted-foreground">Overall profile score</div>
            </div>
            <div className="p-5">
              <h3 className="text-sm font-semibold mb-3">Section breakdown</h3>
              <div className="space-y-3">
                <ScoreBar label="Headline" value={payload.headlineScore} />
                <ScoreBar label="About section" value={payload.aboutScore} />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* OPTIMIZED HEADLINE + ABOUT */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-brand" /> Optimized headline
              </span>
              <CopyButton text={payload.headline} label="headline" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            {payload.headline ? (
              <p className="text-sm leading-relaxed">{payload.headline}</p>
            ) : (
              <p className="text-sm text-muted-foreground">No optimized headline returned.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-brand" /> Optimized about
              </span>
              <CopyButton text={payload.about} label="about section" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            {payload.about ? (
              <p className="text-sm leading-relaxed whitespace-pre-line">{payload.about}</p>
            ) : (
              <p className="text-sm text-muted-foreground">No optimized about returned.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* STRENGTHS + WEAKNESSES */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-brand" /> Strengths
            </CardTitle>
          </CardHeader>
          <CardContent>
            {payload.strengths.length ? (
              <ul className="space-y-1.5">
                {payload.strengths.map((s, i) => (
                  <li key={i} className="text-xs text-muted-foreground flex gap-1.5">
                    <span className="text-brand">•</span>
                    {s}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-muted-foreground">No strengths returned.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" /> Weaknesses
            </CardTitle>
          </CardHeader>
          <CardContent>
            {payload.weaknesses.length ? (
              <ul className="space-y-1.5">
                {payload.weaknesses.map((s, i) => (
                  <li key={i} className="text-xs text-muted-foreground flex gap-1.5">
                    <span className="text-amber-500">•</span>
                    {s}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-muted-foreground">No weaknesses returned.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* KEYWORD GAPS */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Hash className="h-4 w-4 text-brand" /> Keyword gaps
          </CardTitle>
        </CardHeader>
        <CardContent>
          {payload.keywordGaps.length ? (
            <div className="flex flex-wrap gap-1.5">
              {payload.keywordGaps.map((k, i) => (
                <Badge
                  key={i}
                  variant="outline"
                  className="border-amber-500/40 text-amber-600 dark:text-amber-400"
                >
                  {k}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No keyword gaps detected.</p>
          )}
        </CardContent>
      </Card>

      {/* CONTENT IDEAS */}
      {payload.contentIdeas.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-brand" /> Content ideas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {payload.contentIdeas.map((c, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="rounded-lg border p-3 hover:border-brand/40 hover:bg-brand/5 transition-colors"
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <Target className="h-3.5 w-3.5 text-brand" />
                    <span className="text-xs font-semibold">{c.topic}</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{c.angle}</p>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </motion.div>
  )
}

// ---------------------------------------------------------------------------
// Brand identity results block
// ---------------------------------------------------------------------------
function IdentityResults({ payload }: { payload: IdentityPayload }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* SCORE HERO */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="grid grid-cols-1 md:grid-cols-[200px_1fr]">
            <div className="flex flex-col items-center justify-center p-6 border-b md:border-b-0 md:border-e bg-brand-soft/40">
              <ScoreRing score={payload.score} />
              <div className="mt-2 text-xs text-muted-foreground">Overall brand score</div>
            </div>
            <div className="p-5">
              <h3 className="text-sm font-semibold mb-3">Brand dimensions</h3>
              <div className="space-y-3">
                <ScoreBar label="Narrative" value={payload.narrativeScore} />
                <ScoreBar label="Presence" value={payload.presenceScore} />
                <ScoreBar label="Differentiation" value={payload.differentiationScore} />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ANALYSIS */}
      {payload.analysis && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Fingerprint className="h-4 w-4 text-brand" /> Brand analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-line">
              {payload.analysis}
            </p>
          </CardContent>
        </Card>
      )}

      {/* SUGGESTIONS */}
      {payload.suggestions.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-brand" /> Suggestions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              {payload.suggestions.map((s, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2 rounded-lg border p-2.5 hover:border-brand/40 hover:bg-brand/5 transition-colors"
                >
                  <span className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-brand/10 text-[9px] font-bold text-brand">
                    {i + 1}
                  </span>
                  <span className="text-xs leading-relaxed">{s}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* NETWORKING TARGETS */}
      {payload.networkingTargets.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Network className="h-4 w-4 text-brand" /> Networking targets
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {payload.networkingTargets.map((n, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="rounded-lg border p-3 hover:border-brand/40 hover:bg-brand/5 transition-colors"
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <Users className="h-3.5 w-3.5 text-brand" />
                    <span className="text-xs font-semibold truncate">{n.who}</span>
                    {n.type && (
                      <Badge
                        variant="outline"
                        className="ml-auto text-[9px] border-brand/30 text-brand"
                      >
                        {n.type}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{n.why}</p>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </motion.div>
  )
}

// ---------------------------------------------------------------------------
// Score ring (animated SVG, mirrors ats.tsx pattern)
// ---------------------------------------------------------------------------
function ScoreRing({ score }: { score: number }) {
  const v = Math.max(0, Math.min(100, score || 0))
  const r = 34
  const circ = 2 * Math.PI * r
  const offset = circ - (v / 100) * circ
  const tone =
    v >= 75 ? 'oklch(0.7 0.15 162)' : v >= 50 ? 'oklch(0.75 0.15 80)' : 'oklch(0.65 0.2 30)'
  return (
    <div className="relative h-24 w-24">
      <svg className="h-24 w-24 -rotate-90" viewBox="0 0 80 80">
        <circle cx="40" cy="40" r={r} fill="none" stroke="var(--muted)" strokeWidth="6" />
        <motion.circle
          cx="40"
          cy="40"
          r={r}
          fill="none"
          stroke={tone}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold" style={{ color: tone }}>
          {v}
        </span>
        <span className="text-[9px] text-muted-foreground uppercase tracking-wide">/ 100</span>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Score bar (Progress)
// ---------------------------------------------------------------------------
function ScoreBar({ label, value }: { label: string; value: number }) {
  const v = Math.max(0, Math.min(100, value || 0))
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{v}%</span>
      </div>
      <Progress value={v} className="h-1.5" />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Copy button
// ---------------------------------------------------------------------------
function CopyButton({ text, label }: { text: string; label: string }) {
  const { toast } = useToast()
  const [copied, setCopied] = useState(false)

  const onCopy = async () => {
    if (!text) {
      toast({ title: 'Nothing to copy', variant: 'destructive' })
      return
    }
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      toast({ title: `${label} copied`, description: 'Pasted-ready text is in your clipboard.' })
      setTimeout(() => setCopied(false), 1500)
    } catch {
      toast({ title: 'Copy failed', variant: 'destructive' })
    }
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onCopy}
      className="h-7 px-2 text-xs rounded-full hover:bg-brand/10 hover:text-brand"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-brand" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? 'Copied' : 'Copy'}
    </Button>
  )
}

// ---------------------------------------------------------------------------
// Profile row helper (brand identity preview)
// ---------------------------------------------------------------------------
function ProfileRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="grid grid-cols-[110px_1fr] gap-2 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className={value ? 'font-medium' : 'text-muted-foreground/60'}>
        {value || '—'}
      </span>
    </div>
  )
}
