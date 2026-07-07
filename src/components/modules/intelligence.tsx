'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { api } from '@/lib/api-client'
import { useApp } from '@/components/app-provider'
import { useToast } from '@/hooks/use-toast'
import { useProfile } from '@/components/careeros/profile-context'
import { useAppStore } from '@/lib/store'
import { ModuleHeader } from '@/components/careeros/module-header'
import { Spinner } from '@/components/careeros/loading'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Compass,
  Sparkles,
  Target,
  TrendingUp,
  CircleDollarSign,
  Rocket,
  Lightbulb,
  CheckCircle2,
  ArrowRight,
  Eye,
  Quote,
  History,
  Clock,
  AlertCircle,
  ChevronRight,
} from 'lucide-react'

// ---------------------------------------------------------------------------
// Types (mirror the API contract)
// ---------------------------------------------------------------------------
type RoadmapPhase = {
  phase: string
  duration: string
  focus: string
  milestones: string[]
  skills: string[]
  visibilityMoves: string[]
}
type SalaryStrategy = {
  current: string
  target: string
  steps: string[]
  negotiation: string
}
type PromotionPlan = {
  gapToNext: string
  scope: string[]
  evidence: string[]
  conversation: string
}
type MarketInsight = { topic: string; insight: string; action: string }
type Plan = {
  id: string
  targetRole: string
  readinessScore: number | null
  roadmap: RoadmapPhase[]
  salaryStrategy: SalaryStrategy | null
  promotionPlan: PromotionPlan | null
  marketInsights: MarketInsight[]
  nextMoves?: string[]
  createdAt: string
  updatedAt: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function sumMonths(phases: RoadmapPhase[]): string {
  let total = 0
  let matched = 0
  for (const p of phases) {
    const m = p.duration?.match?.(/(\d+)\s*mo/i)
    if (m) { total += Number(m[1]); matched++ }
  }
  if (!matched) return phases.length ? `${phases.length} phases` : '—'
  return total >= 12 ? `${(total / 12).toFixed(1).replace('.0', '')}y` : `${total}m`
}

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
export function IntelligenceModule() {
  const { t } = useApp()
  const { toast } = useToast()
  const { profile, loading: profileLoading } = useProfile()
  const setModule = useAppStore((s) => s.set)

  const [targetRole, setTargetRole] = useState('')
  const [plans, setPlans] = useState<Plan[]>([])
  const [active, setActive] = useState<Plan | null>(null)
  const [busy, setBusy] = useState(false)
  const [historyLoading, setHistoryLoading] = useState(true)

  // Pre-fill from profile.
  useEffect(() => {
    if (profile?.targetRole) setTargetRole(profile.targetRole)
  }, [profile?.targetRole])

  // Load plan history.
  useEffect(() => {
    let cancelled = false
    setHistoryLoading(true)
    api<{ plans: Plan[] }>('/api/intelligence')
      .then((res) => {
        if (cancelled) return
        setPlans(res.plans)
        if (res.plans[0]) setActive(res.plans[0])
      })
      .catch(() => {})
      .finally(() => !cancelled && setHistoryLoading(false))
    return () => { cancelled = true }
  }, [])

  const generate = async () => {
    const role = targetRole.trim() || profile?.targetRole || ''
    if (!role) {
      toast({
        title: 'Set a target role first',
        description: 'Add your target role in Career Profile to power your roadmap.',
        variant: 'destructive',
      })
      setModule('profile')
      return
    }
    setBusy(true)
    try {
      const { plan } = await api<{ plan: Plan }>('/api/intelligence', {
        method: 'POST',
        body: { targetRole: role },
      })
      setActive(plan)
      setPlans((prev) => [plan, ...prev])
      toast({
        title: 'Roadmap ready',
        description: `${plan.roadmap.length} phases · readiness ${plan.readinessScore ?? '—'}/100`,
      })
    } catch (e) {
      toast({ title: 'Generation failed', description: (e as Error).message, variant: 'destructive' })
    } finally {
      setBusy(false)
    }
  }

  const noProfileRole = !profileLoading && !profile?.targetRole

  return (
    <div>
      <ModuleHeader
        title={t('intelligenceTitle')}
        subtitle={t('intelligenceSub')}
        icon={Compass}
        actions={
          active ? (
            <Button
              onClick={generate}
              disabled={busy}
              className="bg-brand text-brand-foreground hover:bg-brand/90 rounded-full h-9"
            >
              {busy ? <Spinner /> : <Sparkles className="h-4 w-4" />}
              <span className="hidden sm:inline">Regenerate</span>
            </Button>
          ) : undefined
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-4">
        {/* MAIN COLUMN */}
        <div className="space-y-4 min-w-0">
          {/* HERO / GENERATE CARD */}
          {!active && (
            <Card className="overflow-hidden">
              <CardContent className="p-0">
                <div className="relative grid-bg p-6 sm:p-8">
                  <div className="relative z-10 flex flex-col sm:flex-row sm:items-end gap-4">
                    <div className="flex-1">
                      <div className="inline-flex items-center gap-2 rounded-full bg-brand/10 px-3 py-1 text-xs font-medium text-brand mb-3">
                        <Compass className="h-3.5 w-3.5" /> Unified career roadmap
                      </div>
                      <h3 className="text-xl sm:text-2xl font-semibold tracking-tight">
                        Generate my roadmap
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1 max-w-md">
                        One AI pass combines skills, salary, promotion and market moves into a
                        time-boxed plan to your target role.
                      </p>
                    </div>
                  </div>

                  <div className="relative z-10 mt-5 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 items-end">
                    <div>
                      <Label className="text-xs text-muted-foreground">{t('targetRole')}</Label>
                      <Input
                        value={targetRole}
                        onChange={(e) => setTargetRole(e.target.value)}
                        placeholder="e.g. Staff Software Engineer"
                        className="mt-1"
                      />
                      {noProfileRole && (
                        <button
                          onClick={() => setModule('profile')}
                          className="mt-2 inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 hover:underline"
                        >
                          <AlertCircle className="h-3.5 w-3.5" />
                          Set your career profile for a richer plan
                          <ChevronRight className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                    <Button
                      onClick={generate}
                      disabled={busy}
                      className="bg-brand text-brand-foreground hover:bg-brand/90 rounded-full h-10 md:w-auto"
                    >
                      {busy ? <Spinner /> : <Sparkles className="h-4 w-4" />}
                      {busy ? 'Building your roadmap…' : 'Generate roadmap'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* LOADING STATE */}
          {busy && !active && (
            <Card>
              <CardContent className="p-8 flex flex-col items-center gap-3">
                <div className="h-12 w-12 rounded-full border-4 border-brand/20 border-t-brand animate-spin" />
                <p className="text-sm text-muted-foreground text-center">
                  Orchestrating skills, salary, promotion & market signals…
                </p>
              </CardContent>
            </Card>
          )}

          {/* RESULTS DASHBOARD */}
          {active && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              {/* HERO STATS */}
              <Card className="overflow-hidden">
                <CardContent className="p-0">
                  <div className="grid grid-cols-1 sm:grid-cols-[auto_1fr] gap-4 p-5">
                    <ReadinessRing score={active.readinessScore ?? 0} />
                    <div className="flex flex-col justify-center gap-3 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs uppercase tracking-wide text-muted-foreground">
                          Target
                        </span>
                        <Badge className="bg-brand/10 text-brand border-brand/20 hover:bg-brand/10">
                          {active.targetRole}
                        </Badge>
                        <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                          <Clock className="h-3 w-3" /> {sumMonths(active.roadmap)} to target
                        </span>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground mb-1.5">Next moves</div>
                        <div className="flex flex-wrap gap-1.5">
                          {(active.nextMoves ?? []).slice(0, 3).map((m, i) => (
                            <span
                              key={i}
                              className="inline-flex items-center gap-1 rounded-full border bg-muted/40 px-2.5 py-1 text-xs font-medium"
                            >
                              <span className="h-1.5 w-1.5 rounded-full bg-brand" />
                              {m}
                            </span>
                          ))}
                          {(active.nextMoves ?? []).length === 0 && (
                            <span className="text-xs text-muted-foreground">No quick moves</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* ROADMAP TIMELINE */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Compass className="h-4 w-4 text-brand" /> Roadmap
                    <Badge variant="secondary" className="text-[10px]">
                      {active.roadmap.length} phases
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {active.roadmap.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">
                      No roadmap phases returned.
                    </p>
                  ) : (
                    <div className="relative ps-6">
                      <div className="absolute start-2 top-2 bottom-2 w-0.5 bg-border" />
                      {active.roadmap.map((phase, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.08 }}
                          className="relative pb-6 last:pb-0"
                        >
                          <div className="absolute -start-[18px] top-1 h-3.5 w-3.5 rounded-full bg-brand ring-4 ring-brand/20" />
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="text-sm font-semibold">{phase.phase}</span>
                            <Badge variant="secondary" className="text-[10px]">
                              {phase.duration}
                            </Badge>
                          </div>
                          {phase.focus && (
                            <p className="text-xs text-muted-foreground mb-2">{phase.focus}</p>
                          )}
                          {phase.milestones?.length > 0 && (
                            <div className="space-y-1 mb-2">
                              {phase.milestones.map((m, j) => (
                                <div key={j} className="flex items-start gap-1.5 text-xs">
                                  <CheckCircle2 className="h-3 w-3 text-brand mt-0.5 shrink-0" />
                                  <span>{m}</span>
                                </div>
                              ))}
                            </div>
                          )}
                          {phase.skills?.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-2">
                              {phase.skills.map((s, j) => (
                                <span
                                  key={j}
                                  className="inline-flex items-center rounded-md bg-muted/50 px-1.5 py-0.5 text-[10px] font-medium"
                                >
                                  {s}
                                </span>
                              ))}
                            </div>
                          )}
                          {phase.visibilityMoves?.length > 0 && (
                            <div className="rounded-lg border border-brand/20 bg-brand/5 p-2.5">
                              <div className="flex items-center gap-1 mb-1 text-[10px] font-semibold uppercase tracking-wide text-brand">
                                <Eye className="h-3 w-3" /> Visibility moves
                              </div>
                              <div className="space-y-1">
                                {phase.visibilityMoves.map((v, j) => (
                                  <div key={j} className="flex items-start gap-1.5 text-xs">
                                    <ArrowRight className="h-3 w-3 text-brand mt-0.5 shrink-0" />
                                    <span>{v}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </motion.div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* SALARY + PROMOTION GRID */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* SALARY STRATEGY */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <CircleDollarSign className="h-4 w-4 text-brand" /> Salary strategy
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {active.salaryStrategy ? (
                      <>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="rounded-lg border p-2.5">
                            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                              Current
                            </div>
                            <div className="text-sm font-semibold mt-0.5">
                              {active.salaryStrategy.current || '—'}
                            </div>
                          </div>
                          <div className="rounded-lg border border-brand/30 bg-brand/5 p-2.5">
                            <div className="text-[10px] uppercase tracking-wide text-brand">
                              Target
                            </div>
                            <div className="text-sm font-semibold mt-0.5">
                              {active.salaryStrategy.target || '—'}
                            </div>
                          </div>
                        </div>
                        {active.salaryStrategy.steps?.length > 0 && (
                          <div>
                            <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1.5">
                              Steps
                            </div>
                            <div className="space-y-1">
                              {active.salaryStrategy.steps.map((s, i) => (
                                <div key={i} className="flex items-start gap-1.5 text-xs">
                                  <span className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-brand/10 text-[9px] font-bold text-brand">
                                    {i + 1}
                                  </span>
                                  <span>{s}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {active.salaryStrategy.negotiation && (
                          <div className="rounded-lg bg-muted/40 p-2.5">
                            <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                              Negotiation tip
                            </div>
                            <p className="text-xs leading-relaxed">
                              {active.salaryStrategy.negotiation}
                            </p>
                          </div>
                        )}
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground py-2">No salary strategy.</p>
                    )}
                  </CardContent>
                </Card>

                {/* PROMOTION PLAN */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Rocket className="h-4 w-4 text-brand" /> Promotion plan
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {active.promotionPlan ? (
                      <>
                        {active.promotionPlan.gapToNext && (
                          <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-2.5">
                            <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400 mb-0.5">
                              <Target className="h-3 w-3" /> Gap to next level
                            </div>
                            <p className="text-xs">{active.promotionPlan.gapToNext}</p>
                          </div>
                        )}
                        {active.promotionPlan.scope?.length > 0 && (
                          <div>
                            <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1.5">
                              Scope expansion
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {active.promotionPlan.scope.map((s, i) => (
                                <span
                                  key={i}
                                  className="inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px]"
                                >
                                  {s}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        {active.promotionPlan.evidence?.length > 0 && (
                          <div>
                            <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1.5">
                              Evidence to build
                            </div>
                            <div className="space-y-1">
                              {active.promotionPlan.evidence.map((e, i) => (
                                <div key={i} className="flex items-start gap-1.5 text-xs">
                                  <CheckCircle2 className="h-3 w-3 text-brand mt-0.5 shrink-0" />
                                  <span>{e}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {active.promotionPlan.conversation && (
                          <div className="rounded-lg bg-brand/5 border border-brand/20 p-2.5">
                            <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-brand mb-1">
                              <Quote className="h-3 w-3" /> Conversation script
                            </div>
                            <p className="text-xs leading-relaxed italic">
                              {active.promotionPlan.conversation}
                            </p>
                          </div>
                        )}
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground py-2">No promotion plan.</p>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* MARKET INSIGHTS */}
              {active.marketInsights.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Lightbulb className="h-4 w-4 text-brand" /> Market insights
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {active.marketInsights.map((m, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.06 }}
                          className="rounded-lg border p-3 hover:border-brand/40 hover:bg-brand/5 transition-colors"
                        >
                          <div className="flex items-center gap-1.5 mb-1">
                            <TrendingUp className="h-3.5 w-3.5 text-brand" />
                            <span className="text-xs font-semibold">{m.topic}</span>
                          </div>
                          <p className="text-xs text-muted-foreground mb-1.5 leading-relaxed">
                            {m.insight}
                          </p>
                          {m.action && (
                            <div className="flex items-start gap-1 text-[11px] font-medium text-brand">
                              <ArrowRight className="h-3 w-3 mt-0.5 shrink-0" />
                              <span>{m.action}</span>
                            </div>
                          )}
                        </motion.div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </motion.div>
          )}
        </div>

        {/* HISTORY SIDEBAR */}
        <div className="lg:sticky lg:top-4 lg:self-start">
          <Card className="h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <History className="h-4 w-4 text-muted-foreground" /> Plan history
              </CardTitle>
            </CardHeader>
            <CardContent>
              {historyLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Spinner className="text-brand" />
                </div>
              ) : plans.length === 0 ? (
                <div className="py-8 text-center">
                  <Compass className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">No plans yet.</p>
                  <p className="text-xs text-muted-foreground/70">Generate your first roadmap.</p>
                </div>
              ) : (
                <ScrollArea className="max-h-96 -me-2 pe-2">
                  <div className="space-y-1.5">
                    {plans.map((p) => {
                      const isActive = active?.id === p.id
                      return (
                        <button
                          key={p.id}
                          onClick={() => setActive(p)}
                          className={`w-full text-start rounded-lg border p-2.5 transition-all hover:border-brand/40 ${
                            isActive
                              ? 'border-brand/50 bg-brand/5 ring-1 ring-brand/20'
                              : 'border-border bg-card hover:bg-muted/30'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="text-xs font-semibold truncate">{p.targetRole}</span>
                            {typeof p.readinessScore === 'number' && (
                              <Badge
                                variant="outline"
                                className="h-4 px-1 text-[9px] shrink-0 border-brand/40 text-brand"
                              >
                                {p.readinessScore}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                            <span>{p.roadmap?.length ?? 0} phases</span>
                            <span>{timeAgo(p.createdAt)}</span>
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
// Readiness ring (SVG, animated)
// ---------------------------------------------------------------------------
function ReadinessRing({ score }: { score: number }) {
  const v = Math.max(0, Math.min(100, score || 0))
  const r = 34
  const c = 2 * Math.PI * r
  const offset = c - (v / 100) * c
  const tone =
    v >= 75 ? 'text-brand' : v >= 50 ? 'text-amber-500' : 'text-destructive'
  return (
    <div className="relative h-24 w-24 shrink-0 mx-auto sm:mx-0">
      <svg viewBox="0 0 80 80" className="h-full w-full -rotate-90">
        <circle cx="40" cy="40" r={r} fill="none" stroke="currentColor" strokeWidth="6" className="text-muted/30" />
        <motion.circle
          cx="40"
          cy="40"
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: 'easeOut' }}
          className={tone}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-xl font-bold ${tone}`}>{v}</span>
        <span className="text-[9px] uppercase tracking-wide text-muted-foreground">ready</span>
      </div>
    </div>
  )
}
