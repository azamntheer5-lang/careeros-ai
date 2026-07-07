'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell,
} from 'recharts'
import { api } from '@/lib/api-client'
import { useApp } from '@/components/app-provider'
import { useProfile } from '@/components/careeros/profile-context'
import { useToast } from '@/hooks/use-toast'
import { ModuleHeader } from '@/components/careeros/module-header'
import { Spinner } from '@/components/careeros/loading'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  TrendingUp, TrendingDown, Minus, Sparkles, Search, Target,
  DollarSign, Brain, Building2, Lightbulb, Compass, CheckCircle2,
  AlertTriangle, ArrowRight, Clock, ExternalLink, History, Briefcase,
  Award, Gauge,
} from 'lucide-react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SearchHit = { title: string; url: string; snippet: string; host: string }

type SalaryInsights = {
  entry: string
  mid: string
  senior: string
  trend: 'rising' | 'stable' | 'falling'
  growth: string
}

type SkillDemand = {
  skill: string
  demand: 'very high' | 'high' | 'medium' | 'low'
  trend: string
}

type Prediction = { topic: string; prediction: string; timeframe: string }
type TopCompany = { name: string; hiring: boolean; note: string }

type MarketInsightData = {
  salaryInsights: SalaryInsights
  skillDemand: SkillDemand[]
  industryTrends: string[]
  predictions: Prediction[]
  topCompanies: TopCompany[]
  marketOutlook: string
  recommendation: string
}

type SavedInsight = {
  id: string
  query: string
  data: MarketInsightData
  createdAt: string
}

type JobMatch = {
  matchScore: number
  probabilityOfSuccess: number
  strengths: string[]
  gaps: string[]
  requiredImprovements: { area: string; action: string; priority: 'high' | 'medium' | 'low' }[]
  verdict: string
  advice: string
}

// ---------------------------------------------------------------------------
// Module
// ---------------------------------------------------------------------------

export function MarketModule() {
  const { t } = useApp()
  const { profile } = useProfile()

  return (
    <div>
      <ModuleHeader title={t('marketTitle')} subtitle={t('marketSub')} icon={TrendingUp} />
      <Tabs defaultValue="intel" className="w-full">
        <TabsList className="rounded-full p-1 bg-muted/60">
          <TabsTrigger value="intel" className="rounded-full">
            <Compass className="h-3.5 w-3.5 me-1.5" /> Market Intelligence
          </TabsTrigger>
          <TabsTrigger value="match" className="rounded-full">
            <Target className="h-3.5 w-3.5 me-1.5" /> Job Match
          </TabsTrigger>
        </TabsList>
        <TabsContent value="intel" className="mt-4">
          <IntelTab
            defaultRole={profile?.targetRole || ''}
            defaultLocation={profile?.location || ''}
          />
        </TabsContent>
        <TabsContent value="match" className="mt-4">
          <MatchTab defaultRole={profile?.targetRole || ''} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Tab 1 — Market Intelligence
// ---------------------------------------------------------------------------

function IntelTab({ defaultRole, defaultLocation }: { defaultRole: string; defaultLocation: string }) {
  const { t } = useApp()
  const { toast } = useToast()
  const [role, setRole] = useState(defaultRole || 'Software Engineer')
  const [location, setLocation] = useState(defaultLocation || 'United States')
  const [busy, setBusy] = useState(false)
  const [insight, setInsight] = useState<SavedInsight | null>(null)
  const [searchResults, setSearchResults] = useState<SearchHit[]>([])
  const [history, setHistory] = useState<SavedInsight[]>([])

  // Keep the inputs in sync once the profile lands.
  useEffect(() => {
    if (defaultRole) setRole((r) => (r ? r : defaultRole))
  }, [defaultRole])
  useEffect(() => {
    if (defaultLocation) setLocation((l) => (l ? l : defaultLocation))
  }, [defaultLocation])

  // Load saved insights for the sidebar.
  useEffect(() => {
    api<{ insights: SavedInsight[] }>('/api/market')
      .then(({ insights }) => setHistory(insights))
      .catch(() => {})
  }, [])

  const analyze = async () => {
    if (!role.trim()) {
      toast({ title: 'Role required', description: 'Enter a role to analyze.', variant: 'destructive' })
      return
    }
    setBusy(true); setInsight(null); setSearchResults([])
    try {
      const res = await api<{ insight: SavedInsight; searchResults: SearchHit[] }>('/api/market', {
        method: 'POST', body: { role: role.trim(), location: location.trim() },
      })
      setInsight(res.insight)
      setSearchResults(res.searchResults || [])
      setHistory((h) => [res.insight, ...h.filter((x) => x.id !== res.insight.id)].slice(0, 30))
    } catch (e) {
      toast({ title: 'Analysis failed', description: (e as Error).message, variant: 'destructive' })
    } finally { setBusy(false) }
  }

  const loadHistory = (item: SavedInsight) => {
    setInsight(item)
    setSearchResults([])
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1fr_280px] gap-4">
      {/* Main column */}
      <div className="space-y-4">
        {/* Input card */}
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-3 items-end">
              <div>
                <Label className="text-xs text-muted-foreground">{t('targetRole') || 'Role'}</Label>
                <Input value={role} onChange={(e) => setRole(e.target.value)} placeholder="e.g. Senior Product Designer" className="mt-1" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Location</Label>
                <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. London, Remote, Global" className="mt-1" />
              </div>
              <Button onClick={analyze} disabled={busy} className="bg-brand text-brand-foreground hover:bg-brand/90 rounded-full h-10">
                {busy ? <><Spinner /> Analyzing…</> : <><Sparkles className="h-4 w-4" /> Analyze Market</>}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Loading state */}
        {busy && (
          <Card>
            <CardContent className="p-8 flex flex-col items-center gap-3">
              <div className="relative">
                <div className="h-12 w-12 rounded-full border-4 border-brand/20 border-t-brand animate-spin" />
              </div>
              <p className="text-sm text-muted-foreground">Searching the live web and synthesizing market signals…</p>
            </CardContent>
          </Card>
        )}

        {/* Results */}
        {!busy && insight && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <InsightResults insight={insight} searchResults={searchResults} />
          </motion.div>
        )}

        {/* Empty state */}
        {!busy && !insight && (
          <Card>
            <CardContent className="p-10 flex flex-col items-center gap-3 text-center">
              <div className="h-14 w-14 rounded-2xl bg-brand-soft text-brand flex items-center justify-center ring-1 ring-brand/20">
                <TrendingUp className="h-7 w-7" />
              </div>
              <h3 className="text-base font-semibold">Real-time market intelligence</h3>
              <p className="text-sm text-muted-foreground max-w-md">
                Enter a role and location to surface live salary trends, in-demand skills, industry shifts, predictions and top hiring companies.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* History sidebar */}
      <Card className="h-fit xl:sticky xl:top-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <History className="h-4 w-4 text-brand" /> Past analyses
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {history.length === 0 ? (
            <p className="text-xs text-muted-foreground px-4 pb-4">Your saved market scans appear here.</p>
          ) : (
            <ScrollArea className="h-[420px] px-2 pb-2">
              <div className="space-y-1">
                {history.map((h) => (
                  <button
                    key={h.id}
                    onClick={() => loadHistory(h)}
                    className={`w-full text-start rounded-lg border p-2.5 transition hover:border-brand/40 hover:bg-brand-soft/40 ${insight?.id === h.id ? 'border-brand/40 bg-brand-soft/40' : 'border-border'}`}
                  >
                    <div className="text-xs font-medium truncate">{h.query}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
                      <Clock className="h-2.5 w-2.5" />
                      {new Date(h.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function InsightResults({ insight, searchResults }: { insight: SavedInsight; searchResults: SearchHit[] }) {
  const d = insight.data
  if (!d) return null

  return (
    <>
      {/* Market outlook banner */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="flex items-start gap-4 p-5 bg-gradient-to-r from-brand/10 to-transparent">
            <div className="h-12 w-12 rounded-xl bg-brand text-brand-foreground flex items-center justify-center shrink-0">
              <Lightbulb className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <div className="text-xs text-muted-foreground uppercase tracking-wide">Market Outlook · {insight.query}</div>
              <p className="text-sm mt-1 leading-relaxed">{d.marketOutlook}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Salary insights + chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-brand" /> Salary Insights
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <TrendBadge trend={d.salaryInsights.trend} />
              <span className="text-xs text-muted-foreground">{d.salaryInsights.growth}</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <SalaryPill label="Entry" value={d.salaryInsights.entry} />
              <SalaryPill label="Mid" value={d.salaryInsights.mid} highlight />
              <SalaryPill label="Senior" value={d.salaryInsights.senior} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Gauge className="h-4 w-4 text-brand" /> Salary Range
            </CardTitle>
          </CardHeader>
          <CardContent>
            <SalaryChart data={d.salaryInsights} />
          </CardContent>
        </Card>
      </div>

      {/* Skill demand */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Brain className="h-4 w-4 text-brand" /> Skill Demand
          </CardTitle>
        </CardHeader>
        <CardContent>
          {d.skillDemand.length === 0 ? (
            <p className="text-xs text-muted-foreground">No skill data.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[11px] text-muted-foreground uppercase tracking-wide">
                    <th className="text-start font-medium pb-2">Skill</th>
                    <th className="text-start font-medium pb-2">Demand</th>
                    <th className="text-start font-medium pb-2">Trend</th>
                  </tr>
                </thead>
                <tbody>
                  {d.skillDemand.map((s, i) => (
                    <tr key={i} className="border-t">
                      <td className="py-2.5 font-medium">{s.skill}</td>
                      <td className="py-2.5"><DemandBadge level={s.demand} /></td>
                      <td className="py-2.5 text-xs text-muted-foreground">{s.trend}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Industry trends */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-brand" /> Industry Trends
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {d.industryTrends.map((tr, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm">
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-brand shrink-0" />
                <span className="text-muted-foreground leading-relaxed">{tr}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Predictions */}
      {d.predictions.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Compass className="h-4 w-4 text-brand" /> Predictions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {d.predictions.map((p, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                  className="rounded-lg border p-3"
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-sm font-semibold">{p.topic}</span>
                    <Badge variant="secondary" className="text-[10px]">{p.timeframe}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{p.prediction}</p>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top companies + Recommendation */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {d.topCompanies.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Building2 className="h-4 w-4 text-brand" /> Top Companies Hiring
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {d.topCompanies.map((c, i) => (
                <div key={i} className="flex items-start gap-2.5 rounded-lg border p-2.5">
                  <div className="h-8 w-8 rounded-lg bg-brand-soft text-brand flex items-center justify-center shrink-0">
                    <Briefcase className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{c.name}</span>
                      {c.hiring ? (
                        <Badge className="bg-brand/15 text-brand border-brand/30 hover:bg-brand/20" variant="outline">Hiring</Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground">Slow</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{c.note}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div className="p-5 bg-gradient-to-br from-brand/10 to-transparent">
              <div className="flex items-center gap-2 mb-2">
                <Award className="h-4 w-4 text-brand" />
                <span className="text-xs text-muted-foreground uppercase tracking-wide">Recommendation</span>
              </div>
              <p className="text-sm leading-relaxed">{d.recommendation}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sources */}
      {searchResults.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Search className="h-4 w-4 text-brand" /> Live sources
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-72">
              <div className="space-y-2 pr-2">
                {searchResults.map((s, i) => (
                  <a
                    key={i}
                    href={s.url}
                    target="_blank"
                    rel="noreferrer"
                    className="block rounded-lg border p-2.5 hover:border-brand/40 hover:bg-brand-soft/40 transition"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs font-medium truncate">{s.title}</span>
                      <ExternalLink className="h-3 w-3 text-muted-foreground shrink-0 mt-0.5" />
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">{s.snippet}</p>
                    <div className="text-[10px] text-brand mt-1">{s.host}</div>
                  </a>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </>
  )
}

// ---------------------------------------------------------------------------
// Tab 2 — Job Match
// ---------------------------------------------------------------------------

function MatchTab({ defaultRole }: { defaultRole: string }) {
  const { t } = useApp()
  const { toast } = useToast()
  const [role, setRole] = useState(defaultRole || 'Senior Software Engineer')
  const [company, setCompany] = useState('')
  const [jd, setJd] = useState('')
  const [busy, setBusy] = useState(false)
  const [match, setMatch] = useState<JobMatch | null>(null)

  useEffect(() => {
    if (defaultRole) setRole((r) => (r ? r : defaultRole))
  }, [defaultRole])

  const calculate = async () => {
    if (!role.trim() || !jd.trim()) {
      toast({ title: 'Missing input', description: 'Provide the target role and paste the job description.', variant: 'destructive' })
      return
    }
    setBusy(true); setMatch(null)
    try {
      const { match } = await api<{ match: JobMatch }>('/api/market/match', {
        method: 'POST', body: { role: role.trim(), company: company.trim(), jobDescription: jd.trim() },
      })
      setMatch(match)
    } catch (e) {
      toast({ title: 'Match failed', description: (e as Error).message, variant: 'destructive' })
    } finally { setBusy(false) }
  }

  const matchColor = useMemo(() => {
    if (!match) return 'var(--brand)'
    const s = match.matchScore
    if (s >= 75) return 'oklch(0.7 0.15 162)'
    if (s >= 50) return 'oklch(0.75 0.15 80)'
    return 'oklch(0.7 0.16 50)'
  }, [match])

  return (
    <div className="space-y-4">
      {/* Inputs */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">{t('targetRole') || 'Role'}</Label>
              <Input value={role} onChange={(e) => setRole(e.target.value)} placeholder="e.g. Staff Engineer" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">{t('company') || 'Company'}</Label>
              <Input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="e.g. Stripe" className="mt-1" />
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Job description</Label>
            <Textarea
              value={jd}
              onChange={(e) => setJd(e.target.value)}
              rows={6}
              placeholder="Paste the full job description — responsibilities, requirements, qualifications…"
              className="mt-1"
            />
          </div>
          <Button onClick={calculate} disabled={busy} className="w-full sm:w-auto bg-brand text-brand-foreground hover:bg-brand/90 rounded-full">
            {busy ? <><Spinner /> Calculating match…</> : <><Sparkles className="h-4 w-4" /> Calculate Match</>}
          </Button>
        </CardContent>
      </Card>

      {/* Loading */}
      {busy && (
        <Card>
          <CardContent className="p-8 flex flex-col items-center gap-3">
            <div className="relative">
              <div className="h-12 w-12 rounded-full border-4 border-brand/20 border-t-brand animate-spin" />
            </div>
            <p className="text-sm text-muted-foreground">Loading your profile + latest resume and scoring fit…</p>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {!busy && match && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          {/* Score hero */}
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <div className="grid grid-cols-1 md:grid-cols-[200px_1fr]">
                <div
                  className="flex flex-col items-center justify-center p-6 border-b md:border-b-0 md:border-e"
                  style={{ background: `linear-gradient(135deg, color-mix(in oklch, ${matchColor} 16%, var(--card)), var(--card))` }}
                >
                  <ScoreRing score={match.matchScore} color={matchColor} />
                  <div className="mt-2 text-xs text-muted-foreground">Match Score</div>
                </div>
                <div className="p-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs text-muted-foreground mb-1.5">Probability of success</div>
                      <div className="flex items-center gap-3">
                        <div className="text-3xl font-bold" style={{ color: matchColor }}>
                          {match.probabilityOfSuccess}%
                        </div>
                      </div>
                      <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
                        <motion.div
                          className="h-full rounded-full"
                          style={{ background: matchColor }}
                          initial={{ width: 0 }}
                          animate={{ width: `${match.probabilityOfSuccess}%` }}
                          transition={{ duration: 0.9, ease: 'easeOut' }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground mb-1.5">Verdict</div>
                      <p className="text-sm leading-relaxed">{match.verdict}</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Strengths + Gaps */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-brand" /> Strengths
                </CardTitle>
              </CardHeader>
              <CardContent>
                {match.strengths.length === 0 ? (
                  <p className="text-xs text-muted-foreground">None identified.</p>
                ) : (
                  <ul className="space-y-1.5">
                    {match.strengths.map((s, i) => (
                      <li key={i} className="text-xs text-muted-foreground flex gap-1.5">
                        <span className="text-brand mt-0.5">✓</span><span>{s}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" /> Gaps
                </CardTitle>
              </CardHeader>
              <CardContent>
                {match.gaps.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No significant gaps — strong fit.</p>
                ) : (
                  <ul className="space-y-1.5">
                    {match.gaps.map((s, i) => (
                      <li key={i} className="text-xs text-muted-foreground flex gap-1.5">
                        <span className="text-amber-500 mt-0.5">!</span><span>{s}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Required improvements */}
          {match.requiredImprovements.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <ArrowRight className="h-4 w-4 text-brand" /> Required Improvements
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {match.requiredImprovements.map((r, i) => (
                    <div key={i} className="flex items-start gap-3 rounded-lg border p-3">
                      <Badge
                        variant="outline"
                        className={
                          r.priority === 'high'
                            ? 'bg-destructive/15 text-destructive border-destructive/30'
                            : r.priority === 'medium'
                            ? 'bg-amber-500/15 text-amber-600 border-amber-500/30'
                            : 'bg-brand/15 text-brand border-brand/30'
                        }
                      >
                        {r.priority}
                      </Badge>
                      <div className="min-w-0">
                        <div className="text-sm font-medium">{r.area}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{r.action}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Advice */}
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <div className="p-5 bg-gradient-to-br from-brand/10 to-transparent">
                <div className="flex items-center gap-2 mb-2">
                  <Lightbulb className="h-4 w-4 text-brand" />
                  <span className="text-xs text-muted-foreground uppercase tracking-wide">Advice</span>
                </div>
                <p className="text-sm leading-relaxed">{match.advice}</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Empty state */}
      {!busy && !match && (
        <Card>
          <CardContent className="p-10 flex flex-col items-center gap-3 text-center">
            <div className="h-14 w-14 rounded-2xl bg-brand-soft text-brand flex items-center justify-center ring-1 ring-brand/20">
              <Target className="h-7 w-7" />
            </div>
            <h3 className="text-base font-semibold">AI job match</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              Paste a job description and we'll score your fit against your saved profile and latest resume — strengths, gaps and an improvement playbook.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ScoreRing({ score, color }: { score: number; color: string }) {
  const r = 34
  const circ = 2 * Math.PI * r
  const offset = circ - (Math.min(100, Math.max(0, score)) / 100) * circ
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

function TrendBadge({ trend }: { trend: 'rising' | 'stable' | 'falling' }) {
  const map = {
    rising: { icon: TrendingUp, color: 'text-brand', label: 'Rising', cls: 'bg-brand/15 text-brand border-brand/30' },
    stable: { icon: Minus, color: 'text-muted-foreground', label: 'Stable', cls: 'bg-muted text-muted-foreground border-border' },
    falling: { icon: TrendingDown, color: 'text-destructive', label: 'Falling', cls: 'bg-destructive/15 text-destructive border-destructive/30' },
  } as const
  const m = map[trend] || map.stable
  const Icon = m.icon
  return (
    <Badge variant="outline" className={m.cls}>
      <Icon className="h-3 w-3 me-1" /> {m.label}
    </Badge>
  )
}

function DemandBadge({ level }: { level: 'very high' | 'high' | 'medium' | 'low' }) {
  const map: Record<string, string> = {
    'very high': 'bg-brand/15 text-brand border-brand/30',
    'high': 'bg-brand/10 text-brand border-brand/20',
    'medium': 'bg-amber-500/15 text-amber-600 border-amber-500/30',
    'low': 'bg-muted text-muted-foreground border-border',
  }
  return <Badge variant="outline" className={map[level] || map.medium}>{level}</Badge>
}

function SalaryPill({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-lg border p-2.5 text-center ${highlight ? 'border-brand/40 bg-brand-soft/40' : ''}`}>
      <div className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</div>
      <div className="text-sm font-semibold mt-1 truncate" title={value}>{value}</div>
    </div>
  )
}

/** Parse the first number (e.g. "$120k" → 120) from a salary string, in $k units. */
function parseSalaryK(s: string): number {
  if (!s) return 0
  const m = s.replace(/,/g, '').match(/(\d+(\.\d+)?)/)
  if (!m) return 0
  const n = parseFloat(m[1])
  // If the string contains "k" or value is small (e.g., 120 means $120k), assume $k units.
  if (/k\b/i.test(s) || n < 1000) return n
  // Looks like an absolute dollar amount — convert to $k.
  return Math.round(n / 1000)
}

function SalaryChart({ data }: { data: SalaryInsights }) {
  const rows = useMemo(() => {
    const entry = parseSalaryK(data.entry)
    const mid = parseSalaryK(data.mid)
    const senior = parseSalaryK(data.senior)
    // Fall back to a sensible default if AI returned non-numeric strings.
    const fallback = entry || mid || senior || 80
    return [
      { name: 'Entry', value: entry || fallback, raw: data.entry },
      { name: 'Mid', value: mid || (entry * 1.4) || fallback, raw: data.mid },
      { name: 'Senior', value: senior || (mid * 1.6) || fallback, raw: data.senior },
    ]
  }, [data])

  const colors = ['oklch(0.65 0.13 200)', 'var(--brand)', 'oklch(0.6 0.16 162)']

  return (
    <div className="h-[200px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
          <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
          <YAxis
            tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `$${v}k`}
            width={42}
          />
          <Tooltip
            cursor={{ fill: 'var(--muted)', opacity: 0.4 }}
            contentStyle={{
              background: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              fontSize: 12,
              color: 'var(--foreground)',
            }}
            formatter={(value: any, _name: any, props: any) => [props.payload.raw || `${value}k`, 'Salary']}
          />
          <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={64}>
            {rows.map((_, i) => (
              <Cell key={i} fill={colors[i % colors.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
