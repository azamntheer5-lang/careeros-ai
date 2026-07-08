'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { api } from '@/lib/api-client'
import { useApp } from '@/components/app-provider'
import { ModuleHeader } from '@/components/careeros/module-header'
import { LoadingScreen } from '@/components/careeros/loading'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  BarChart3, FileText, Target, MessageSquare, Briefcase, Trophy,
  DollarSign, TrendingUp, Users, Wallet, Cpu, Activity, CheckCircle2,
  Zap, Award, LineChart as LineChartIcon, Gauge, Sparkles,
} from 'lucide-react'
import {
  ResponsiveContainer, LineChart, Line, AreaChart, Area, BarChart, Bar,
  PieChart, Pie, Cell, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts'

// ---------------------------------------------------------------------------
// Types — mirror the /api/analytics response shape
// ---------------------------------------------------------------------------
type Achievement = {
  id: string
  type: string
  title: string
  description: string | null
  value: number | null
  unlockedAt: string
}

type UserSection = {
  kpis: {
    resumes: number
    avgAts: number
    interviews: number
    applications: number
    achievements: number
  }
  resumesOverTime: { date: string; count: number }[]
  atsTrend: { date: string; score: number }[]
  applicationsByStatus: { status: string; count: number }[]
  skillGrowth: { date: string; count: number }[]
  achievements: Achievement[]
  creditUsageByFeature: { feature: string; amount: number }[]
}

type BusinessSection = {
  kpis: {
    totalRevenue: number
    mrr: number
    activeSubs: number
    avgRevenuePerUser: number
  }
  revenueTrend: { month: string; revenue: number; mrr: number; users: number }[]
  planDistribution: { plan: string; count: number }[]
  growthFunnel: { stage: string; value: number }[]
  simulated: {
    churnRate: number
    growthRate: number
    ltv: number
    arpu: number
  }
}

type AiSection = {
  kpis: {
    totalCalls: number
    avgLatency: number
    successRate: number
    totalCost: number
  }
  callsByModel: { model: string; calls: number }[]
  latencyByFeature: { feature: string; latency: number }[]
  costByFeature: { feature: string; cost: number }[]
  tokensOverTime: { date: string; tokens: number }[]
  topFeatures: { feature: string; calls: number; tokens: number; cost: number }[]
}

type AnalyticsData = { user: UserSection; business: BusinessSection; ai: AiSection }

// ---------------------------------------------------------------------------
// Palette (emerald-led, no indigo/blue primary)
// ---------------------------------------------------------------------------
const COLORS = {
  brand: 'oklch(0.7 0.15 162)',
  cyan: 'oklch(0.7 0.13 200)',
  amber: 'oklch(0.75 0.15 80)',
  violet: 'oklch(0.65 0.2 300)',
  orange: 'oklch(0.68 0.2 30)',
  rose: 'oklch(0.7 0.18 0)',
  teal: 'oklch(0.7 0.12 180)',
}

const PIE_COLORS = [
  COLORS.brand,
  COLORS.cyan,
  COLORS.amber,
  COLORS.violet,
  COLORS.orange,
  COLORS.rose,
  COLORS.teal,
]

const TIER_COLORS: Record<string, string> = {
  fast: COLORS.cyan,
  balanced: COLORS.brand,
  quality: COLORS.amber,
}

const TOOLTIP_STYLE = {
  background: 'var(--card)',
  border: '1px solid var(--border)',
  borderRadius: 10,
  fontSize: 12,
  color: 'var(--foreground)',
} as const

const ACHIEVEMENT_ICONS: Record<string, typeof Trophy> = {
  resume_created: FileText,
  ats_score: Target,
  interview_completed: MessageSquare,
  job_applied: Briefcase,
  skill_learned: Sparkles,
  streak: Zap,
  milestone: Trophy,
}

// ---------------------------------------------------------------------------
// Shared sub-components
// ---------------------------------------------------------------------------
function GradientKpi({
  label, value, sub, icon: Icon, color, delay = 0,
}: {
  label: string
  value: string | number
  sub?: string
  icon: React.ElementType
  color: string
  delay?: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.35 }}
    >
      <Card className="relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.07] pointer-events-none"
          style={{ background: `linear-gradient(135deg, ${color}, transparent 65%)` }}
        />
        <CardContent className="relative p-5">
          <div className="flex items-start justify-between">
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                {label}
              </p>
              <p className="text-2xl font-semibold tracking-tight mt-1.5 truncate">
                {value}
              </p>
              {sub && (
                <p className="text-[11px] text-muted-foreground mt-1 truncate">{sub}</p>
              )}
            </div>
            <div
              className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0"
              style={{
                backgroundColor: `color-mix(in oklch, ${color} 14%, transparent)`,
                color,
              }}
            >
              <Icon className="h-4 w-4" />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

function ChartCard({
  title, icon: Icon, children, className,
}: {
  title: string
  icon?: React.ElementType
  children: React.ReactNode
  className?: string
}) {
  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          {Icon && <Icon className="h-4 w-4 text-brand" />}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-2">{children}</CardContent>
    </Card>
  )
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
      {label}
    </div>
  )
}

// ---------------------------------------------------------------------------
// My Career tab
// ---------------------------------------------------------------------------
function CareerTab({ data }: { data: UserSection }) {
  const { t } = useApp()
  const k = data.kpis

  const statusColors: Record<string, string> = {
    Wishlist: COLORS.cyan,
    Applied: COLORS.brand,
    Interviewing: COLORS.amber,
    Offer: COLORS.violet,
    Rejected: COLORS.rose,
    Accepted: COLORS.teal,
  }

  return (
    <div className="space-y-4">
      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <GradientKpi label="Resumes" value={k.resumes} icon={FileText} color={COLORS.brand} delay={0} />
        <GradientKpi label="Avg ATS" value={k.avgAts || '—'} sub="best-fit score" icon={Target} color={COLORS.cyan} delay={0.05} />
        <GradientKpi label="Interviews" value={k.interviews} icon={MessageSquare} color={COLORS.amber} delay={0.1} />
        <GradientKpi label="Applications" value={k.applications} icon={Briefcase} color={COLORS.violet} delay={0.15} />
        <GradientKpi label="Achievements" value={k.achievements} icon={Trophy} color={COLORS.orange} delay={0.2} />
      </div>

      {/* ATS trend + applications by status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="ATS score trend" icon={LineChartIcon}>
          <div className="h-56">
            {data.atsTrend.length <= 1 ? (
              <EmptyState label={t('empty')} />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.atsTrend} margin={{ left: -16, right: 8, top: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Line type="monotone" dataKey="score" stroke={COLORS.brand} strokeWidth={2.5} dot={{ r: 3, fill: COLORS.brand }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </ChartCard>

        <ChartCard title="Applications by status" icon={Briefcase}>
          <div className="h-56">
            {data.applicationsByStatus.length === 0 ? (
              <EmptyState label={t('empty')} />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.applicationsByStatus} margin={{ left: -16, right: 8, top: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="status" tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {data.applicationsByStatus.map((s, i) => (
                      <Cell key={i} fill={statusColors[s.status] ?? PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </ChartCard>
      </div>

      {/* Skill growth + credit usage */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Skill growth over time" icon={Sparkles}>
          <div className="h-56">
            {data.skillGrowth.length <= 1 ? (
              <EmptyState label={t('empty')} />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.skillGrowth} margin={{ left: -16, right: 8, top: 8 }}>
                  <defs>
                    <linearGradient id="skillGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={COLORS.violet} stopOpacity={0.45} />
                      <stop offset="100%" stopColor={COLORS.violet} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Area type="monotone" dataKey="count" stroke={COLORS.violet} strokeWidth={2.5} fill="url(#skillGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </ChartCard>

        <ChartCard title="Credit usage by feature" icon={Wallet}>
          <div className="h-56">
            {data.creditUsageByFeature.length === 0 ? (
              <EmptyState label={t('empty')} />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data.creditUsageByFeature}
                  layout="vertical"
                  margin={{ left: 16, right: 16, top: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <YAxis
                    type="number"
                    dataKey="feature"
                    tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                    axisLine={false}
                    tickLine={false}
                    width={64}
                  />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Bar dataKey="amount" fill={COLORS.orange} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </ChartCard>
      </div>

      {/* Achievement timeline */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Trophy className="h-4 w-4 text-brand" /> Achievement timeline
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-2">
          {data.achievements.length === 0 ? (
            <p className="text-xs text-muted-foreground py-8 text-center">{t('empty')}</p>
          ) : (
            <ScrollArea className="max-h-96 pe-3">
              <div className="space-y-3">
                {data.achievements.map((a, i) => {
                  const Icon = ACHIEVEMENT_ICONS[a.type] ?? Award
                  return (
                    <motion.div
                      key={a.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: Math.min(i * 0.03, 0.3) }}
                      className="flex items-start gap-3"
                    >
                      <div className="relative flex flex-col items-center">
                        <div className="h-9 w-9 rounded-full bg-brand-soft text-brand ring-1 ring-brand/20 flex items-center justify-center shrink-0">
                          <Icon className="h-4 w-4" />
                        </div>
                        {i < data.achievements.length - 1 && (
                          <div className="w-px flex-1 bg-border my-1 min-h-6" />
                        )}
                      </div>
                      <div className="flex-1 pb-3 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium">{a.title}</p>
                          {a.value != null && (
                            <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
                              {a.value}
                            </Badge>
                          )}
                          <Badge variant="secondary" className="h-5 px-1.5 text-[10px] capitalize">
                            {a.type.replace(/_/g, ' ')}
                          </Badge>
                        </div>
                        {a.description && (
                          <p className="text-[11px] text-muted-foreground mt-0.5">{a.description}</p>
                        )}
                        <p className="text-[10px] text-muted-foreground/70 mt-0.5">
                          {new Date(a.unlockedAt).toLocaleDateString(undefined, {
                            month: 'short', day: 'numeric', year: 'numeric',
                          })}
                        </p>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Business tab
// ---------------------------------------------------------------------------
function BusinessTab({ data }: { data: BusinessSection }) {
  const { t } = useApp()
  const k = data.kpis
  const sim = data.simulated

  const funnelMax = Math.max(...data.growthFunnel.map((f) => f.value), 1)

  return (
    <div className="space-y-4">
      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <GradientKpi label="Total revenue" value={`$${k.totalRevenue.toLocaleString()}`} sub="all-time paid invoices" icon={DollarSign} color={COLORS.brand} delay={0} />
        <GradientKpi label="MRR" value={`$${k.mrr.toLocaleString()}`} sub={`ARPU $${sim.arpu}`} icon={TrendingUp} color={COLORS.cyan} delay={0.05} />
        <GradientKpi label="Active subs" value={k.activeSubs.toLocaleString()} sub={`+${sim.growthRate}% MoM`} icon={Users} color={COLORS.amber} delay={0.1} />
        <GradientKpi label="ARPU" value={`$${k.avgRevenuePerUser.toFixed(2)}`} sub={`LTV $${sim.ltv.toLocaleString()}`} icon={Wallet} color={COLORS.violet} delay={0.15} />
      </div>

      {/* Revenue trend + plan distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ChartCard title="Revenue trend · last 6 months" icon={TrendingUp} className="lg:col-span-2">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.revenueTrend} margin={{ left: -8, right: 8, top: 8 }}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={COLORS.brand} stopOpacity={0.45} />
                    <stop offset="100%" stopColor={COLORS.brand} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Area type="monotone" dataKey="revenue" stroke={COLORS.brand} strokeWidth={2.5} fill="url(#revGrad)" />
                <Line type="monotone" dataKey="mrr" stroke={COLORS.amber} strokeWidth={2} dot={false} strokeDasharray="4 4" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center gap-4 mt-2 text-[11px]">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full" style={{ background: COLORS.brand }} />
              <span className="text-muted-foreground">Revenue</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full" style={{ background: COLORS.amber }} />
              <span className="text-muted-foreground">MRR</span>
            </div>
          </div>
        </ChartCard>

        <ChartCard title="Plan distribution" icon={Users}>
          <div className="h-56">
            {data.planDistribution.length === 0 ? (
              <EmptyState label={t('empty')} />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.planDistribution}
                    dataKey="count"
                    nameKey="plan"
                    cx="50%"
                    cy="50%"
                    innerRadius={42}
                    outerRadius={70}
                    paddingAngle={3}
                  >
                    {data.planDistribution.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="flex flex-wrap justify-center gap-2 mt-2">
            {data.planDistribution.map((p, i) => (
              <div key={p.plan} className="flex items-center gap-1.5 text-[11px]">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ background: PIE_COLORS[i % PIE_COLORS.length] }}
                />
                <span className="text-muted-foreground">{p.plan}</span>
                <span className="text-muted-foreground/70">({p.count})</span>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

      {/* Growth funnel + retention KPIs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ChartCard title="Growth funnel" icon={Gauge} className="lg:col-span-2">
          <div className="space-y-2.5 pt-1">
            {data.growthFunnel.map((f, i) => {
              const pct = (f.value / funnelMax) * 100
              const conv = i === 0 ? 100 : (f.value / data.growthFunnel[i - 1].value) * 100
              return (
                <div key={f.stage}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-medium">{f.stage}</span>
                    <span className="text-muted-foreground">
                      {f.value.toLocaleString()}
                      {i > 0 && (
                        <span className="ml-1.5 text-[10px] text-muted-foreground/70">
                          ({conv.toFixed(0)}%)
                        </span>
                      )}
                    </span>
                  </div>
                  <Progress
                    value={pct}
                    className="h-2.5"
                    style={{
                      ['--progress-foreground' as string]: PIE_COLORS[i % PIE_COLORS.length],
                    }}
                  />
                </div>
              )
            })}
          </div>
        </ChartCard>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="h-4 w-4 text-brand" /> Retention snapshot
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2 space-y-3">
            <div className="rounded-lg border p-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground uppercase tracking-wide">Churn rate</span>
                <Badge variant="outline" className="h-5 px-1.5 text-[10px]">{sim.churnRate}%</Badge>
              </div>
              <p className="text-lg font-semibold mt-1">{sim.churnRate}% / mo</p>
            </div>
            <div className="rounded-lg border p-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground uppercase tracking-wide">Growth rate</span>
                <Badge variant="outline" className="h-5 px-1.5 text-[10px]">{sim.growthRate}%</Badge>
              </div>
              <p className="text-lg font-semibold mt-1">+{sim.growthRate}% MoM</p>
            </div>
            <div className="rounded-lg border p-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground uppercase tracking-wide">Net growth</span>
                <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
                  +{(sim.growthRate - sim.churnRate).toFixed(1)}%
                </Badge>
              </div>
              <p className="text-lg font-semibold mt-1">+{(sim.growthRate - sim.churnRate).toFixed(1)}% net</p>
            </div>
            <div className="rounded-lg bg-brand-soft/40 border border-brand/15 p-3 text-[11px] text-muted-foreground leading-relaxed">
              Platform-wide figures combine real invoice &amp; subscription data with a
              deterministic daily-seeded simulation for the demo single-tenant.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// AI Performance tab
// ---------------------------------------------------------------------------
function AiTab({ data }: { data: AiSection }) {
  const { t } = useApp()
  const k = data.kpis

  return (
    <div className="space-y-4">
      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <GradientKpi label="Total calls" value={k.totalCalls.toLocaleString()} icon={Cpu} color={COLORS.brand} delay={0} />
        <GradientKpi label="Avg latency" value={`${k.avgLatency} ms`} icon={Activity} color={COLORS.cyan} delay={0.05} />
        <GradientKpi label="Success rate" value={`${k.successRate.toFixed(1)}%`} icon={CheckCircle2} color={COLORS.amber} delay={0.1} />
        <GradientKpi label="Total cost" value={`$${k.totalCost.toFixed(4)}`} sub="est. inference spend" icon={DollarSign} color={COLORS.violet} delay={0.15} />
      </div>

      {/* Tokens over 14 days + calls by model tier */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ChartCard title="Tokens · last 14 days" icon={Activity} className="lg:col-span-2">
          <div className="h-56">
            {data.tokensOverTime.every((d) => d.tokens === 0) ? (
              <EmptyState label={t('empty')} />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.tokensOverTime} margin={{ left: -8, right: 8, top: 8 }}>
                  <defs>
                    <linearGradient id="tokGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={COLORS.cyan} stopOpacity={0.45} />
                      <stop offset="100%" stopColor={COLORS.cyan} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Area type="monotone" dataKey="tokens" stroke={COLORS.cyan} strokeWidth={2.5} fill="url(#tokGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </ChartCard>

        <ChartCard title="Calls by model tier" icon={Cpu}>
          <div className="h-56">
            {data.callsByModel.length === 0 ? (
              <EmptyState label={t('empty')} />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.callsByModel}
                    dataKey="calls"
                    nameKey="model"
                    cx="50%"
                    cy="50%"
                    innerRadius={42}
                    outerRadius={70}
                    paddingAngle={3}
                  >
                    {data.callsByModel.map((m, i) => (
                      <Cell key={i} fill={TIER_COLORS[m.model] ?? PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="flex flex-wrap justify-center gap-2 mt-2">
            {data.callsByModel.map((m) => (
              <div key={m.model} className="flex items-center gap-1.5 text-[11px]">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ background: TIER_COLORS[m.model] ?? 'var(--brand)' }}
                />
                <span className="capitalize text-muted-foreground">{m.model}</span>
                <span className="text-muted-foreground/70">({m.calls})</span>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

      {/* Latency by feature + cost by feature */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Avg latency by feature" icon={Gauge}>
          <div className="h-56">
            {data.latencyByFeature.length === 0 ? (
              <EmptyState label={t('empty')} />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.latencyByFeature} margin={{ left: -16, right: 8, top: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="feature" tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} unit="ms" />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Bar dataKey="latency" fill={COLORS.amber} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </ChartCard>

        <ChartCard title="Cost by feature" icon={DollarSign}>
          <div className="h-56">
            {data.costByFeature.length === 0 ? (
              <EmptyState label={t('empty')} />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data.costByFeature}
                  layout="vertical"
                  margin={{ left: 16, right: 16, top: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                  <YAxis
                    type="number"
                    dataKey="feature"
                    tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                    axisLine={false}
                    tickLine={false}
                    width={64}
                  />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Bar dataKey="cost" fill={COLORS.violet} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </ChartCard>
      </div>

      {/* Top 5 features table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Award className="h-4 w-4 text-brand" /> Top 5 features
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-2">
          {data.topFeatures.length === 0 ? (
            <p className="text-xs text-muted-foreground py-6 text-center">{t('empty')}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8">#</TableHead>
                  <TableHead>Feature</TableHead>
                  <TableHead className="text-right">Calls</TableHead>
                  <TableHead className="text-right">Tokens</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.topFeatures.map((f, i) => (
                  <TableRow key={f.feature}>
                    <TableCell className="font-mono text-xs text-muted-foreground">{i + 1}</TableCell>
                    <TableCell className="font-medium">{f.feature}</TableCell>
                    <TableCell className="text-right text-xs">{f.calls.toLocaleString()}</TableCell>
                    <TableCell className="text-right text-xs">{f.tokens.toLocaleString()}</TableCell>
                    <TableCell className="text-right text-xs font-mono">${f.cost.toFixed(4)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Root module
// ---------------------------------------------------------------------------
export function AnalyticsModule() {
  const { t } = useApp()
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [tab, setTab] = useState('career')

  useEffect(() => {
    api<AnalyticsData>('/api/analytics')
      .then(setData)
      .catch(() => {})
  }, [])

  if (!data) return <LoadingScreen label="Loading analytics…" />

  return (
    <div>
      <ModuleHeader title={t('analyticsTitle')} subtitle={t('analyticsSub')} icon={BarChart3} />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="career">My Career</TabsTrigger>
          <TabsTrigger value="business">Business</TabsTrigger>
          <TabsTrigger value="ai">AI Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="career" className="mt-4">
          <CareerTab data={data.user} />
        </TabsContent>
        <TabsContent value="business" className="mt-4">
          <BusinessTab data={data.business} />
        </TabsContent>
        <TabsContent value="ai" className="mt-4">
          <AiTab data={data.ai} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
