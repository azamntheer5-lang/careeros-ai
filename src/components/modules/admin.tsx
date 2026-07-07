'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { api } from '@/lib/api-client'
import { useApp } from '@/components/app-provider'
import { useToast } from '@/hooks/use-toast'
import { ModuleHeader } from '@/components/careeros/module-header'
import { LoadingScreen } from '@/components/careeros/loading'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  ShieldCheck, Users, Cpu, DollarSign, Activity, Server, TrendingUp,
  Zap, ScrollText, Flag, Coins,
} from 'lucide-react'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  AreaChart, Area, PieChart, Pie, Cell,
} from 'recharts'

const FEATURE_LABELS: Record<string, string> = {
  'resume-enhance': 'Resume AI',
  'ats-analyze': 'ATS',
  'cover-letter': 'Cover',
  interview: 'Interview',
  coach: 'Coach',
  skills: 'Skills',
}

type DashboardData = {
  stats: {
    resumes: number
    jobs: number
    interviews: number
    letters: number
    coachSessions: number
    avgAts: number
    aiCalls: number
  }
  featureUsage: Record<string, number>
}

type AuditEntry = {
  id: string
  userId: string | null
  userName: string | null
  action: string
  entity: string
  entityId: string | null
  meta: string | null
  createdAt: string
}

type FeatureFlag = {
  id: string
  key: string
  enabled: boolean
  description: string | null
  rollout: number
  updatedAt: string
}

type AiCenter = {
  usage: {
    id: string
    feature: string
    model: string | null
    tokens: number
    cost: number
    latencyMs: number | null
    success: boolean
    createdAt: string
  }[]
  totals: { calls: number; tokens: number; cost: number; avgLatency: number }
}

const PIE_COLORS = [
  'oklch(0.7 0.15 162)',
  'oklch(0.7 0.13 200)',
  'oklch(0.75 0.15 80)',
  'oklch(0.65 0.2 300)',
  'oklch(0.68 0.2 30)',
  'oklch(0.6 0.1 240)',
]

const TIER_COLORS: Record<string, string> = {
  fast: 'oklch(0.7 0.15 162)',
  balanced: 'oklch(0.7 0.13 200)',
  quality: 'oklch(0.75 0.15 80)',
}

export function AdminModule() {
  const { t } = useApp()
  const { toast } = useToast()
  const [data, setData] = useState<DashboardData | null>(null)
  const [audits, setAudits] = useState<AuditEntry[]>([])
  const [flags, setFlags] = useState<FeatureFlag[]>([])
  const [ai, setAi] = useState<AiCenter | null>(null)

  useEffect(() => {
    api<DashboardData>('/api/dashboard').then(setData).catch(() => {})
    api<{ logs: AuditEntry[] }>('/api/audit?limit=12')
      .then((r) => setAudits(r.logs))
      .catch(() => {})
    api<{ flags: FeatureFlag[] }>('/api/flags')
      .then((r) => setFlags(r.flags))
      .catch(() => {})
    api<AiCenter>('/api/aicenter').then(setAi).catch(() => {})
  }, [])

  if (!data) return <LoadingScreen label="Loading platform data…" />

  const usageData = Object.entries(data.featureUsage).map(([k, v]) => ({
    name: FEATURE_LABELS[k] || k,
    calls: v,
  }))

  // Simulated platform KPIs (single-tenant demo)
  const platformUsers = 12480 + data.stats.aiCalls * 3
  const mrr = 38420 + data.stats.aiCalls * 12
  const activeNow = 340 + (data.stats.aiCalls % 60)

  const kpis = [
    {
      label: t('totalUsers'),
      value: platformUsers.toLocaleString(),
      icon: Users,
      delta: '+12.4%',
      color: 'var(--brand)',
    },
    {
      label: t('aiCalls'),
      value: (data.stats.aiCalls + 48210).toLocaleString(),
      icon: Cpu,
      delta: '+8.1%',
      color: 'oklch(0.7 0.13 200)',
    },
    {
      label: t('mrr'),
      value: `$${mrr.toLocaleString()}`,
      icon: DollarSign,
      delta: '+18.7%',
      color: 'oklch(0.75 0.15 80)',
    },
    {
      label: t('activeNow'),
      value: activeNow.toString(),
      icon: Activity,
      delta: 'live',
      color: 'oklch(0.65 0.2 30)',
    },
  ]

  const revenueTrend = [
    { m: 'Jan', v: 22100 },
    { m: 'Feb', v: 26800 },
    { m: 'Mar', v: 29400 },
    { m: 'Apr', v: 33200 },
    { m: 'May', v: 35100 },
    { m: 'Jun', v: mrr },
  ]

  const planDistribution = [
    { plan: 'Free', pct: 62 },
    { plan: 'Pro', pct: 24 },
    { plan: 'Premium', pct: 11 },
    { plan: 'Enterprise', pct: 3 },
  ]

  // AI cost monitoring computations (from aicenter usage rows)
  const usageRows = ai?.usage ?? []
  const totalCost = ai?.totals.cost ?? 0
  const costByModelMap = usageRows.reduce<Record<string, number>>((acc, u) => {
    const m = u.model || 'balanced'
    acc[m] = (acc[m] || 0) + u.cost
    return acc
  }, {})
  const costByModel = Object.entries(costByModelMap).map(([k, v]) => ({
    name: k,
    value: Number(v.toFixed(4)),
  }))
  const costByFeatureMap = usageRows.reduce<Record<string, number>>((acc, u) => {
    acc[u.feature] = (acc[u.feature] || 0) + u.cost
    return acc
  }, {})
  const topFeatures = Object.entries(costByFeatureMap)
    .map(([k, v]) => ({
      name: FEATURE_LABELS[k] || k,
      value: Number(v.toFixed(4)),
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5)
  const maxFeatureCost = topFeatures[0]?.value || 1

  const toggleFlag = async (key: string, enabled: boolean) => {
    setFlags((fs) =>
      fs.map((f) => (f.key === key ? { ...f, enabled } : f))
    )
    try {
      await api('/api/flags', { method: 'PUT', body: { key, enabled } })
      toast({
        title: `Flag ${enabled ? 'enabled' : 'disabled'}`,
        description: key,
      })
    } catch (e) {
      setFlags((fs) =>
        fs.map((f) => (f.key === key ? { ...f, enabled: !enabled } : f))
      )
      toast({
        title: 'Update failed',
        description: (e as Error).message,
        variant: 'destructive',
      })
    }
  }

  const setRollout = async (key: string, rollout: number) => {
    setFlags((fs) =>
      fs.map((f) => (f.key === key ? { ...f, rollout } : f))
    )
    try {
      await api('/api/flags', { method: 'PUT', body: { key, rollout } })
    } catch (e) {
      toast({
        title: 'Rollout update failed',
        description: (e as Error).message,
        variant: 'destructive',
      })
    }
  }

  return (
    <div>
      <ModuleHeader title={t('adminTitle')} subtitle={t('adminSub')} icon={ShieldCheck} />

      {/* KPI cards (KEPT) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        {kpis.map((k, i) => {
          const Icon = k.icon
          return (
            <motion.div
              key={k.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground font-medium">
                        {k.label}
                      </p>
                      <p className="text-2xl font-semibold tracking-tight mt-1.5">
                        {k.value}
                      </p>
                      <div className="flex items-center gap-1 mt-1">
                        <TrendingUp className="h-3 w-3 text-brand" />
                        <span className="text-[11px] text-brand font-medium">
                          {k.delta}
                        </span>
                      </div>
                    </div>
                    <div
                      className="h-9 w-9 rounded-lg flex items-center justify-center"
                      style={{
                        backgroundColor: `color-mix(in oklch, ${k.color} 14%, transparent)`,
                        color: k.color,
                      }}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </div>

      {/* Charts (KEPT) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Revenue Trend</CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueTrend} margin={{ left: -10, right: 8, top: 8 }}>
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--brand)" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="var(--brand)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis
                    dataKey="m"
                    tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    contentStyle={{
                      background: 'var(--card)',
                      border: '1px solid var(--border)',
                      borderRadius: 10,
                      fontSize: 12,
                    }}
                    formatter={(v: number) => [`$${v.toLocaleString()}`, 'MRR']}
                  />
                  <Area
                    type="monotone"
                    dataKey="v"
                    stroke="var(--brand)"
                    strokeWidth={2.5}
                    fill="url(#revGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Plan Distribution</CardTitle>
          </CardHeader>
          <CardContent className="pt-2 space-y-3">
            {planDistribution.map((p) => (
              <div key={p.plan}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-medium">{p.plan}</span>
                  <span className="text-muted-foreground">{p.pct}%</span>
                </div>
                <Progress value={p.pct} className="h-1.5" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* Feature usage (KEPT) */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Zap className="h-4 w-4 text-brand" /> {t('featureUsage')}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="h-48">
              {usageData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                  {t('empty')}
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={usageData} margin={{ left: -20, right: 8, top: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                      axisLine={false}
                      tickLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip
                      contentStyle={{
                        background: 'var(--card)',
                        border: '1px solid var(--border)',
                        borderRadius: 10,
                        fontSize: 12,
                      }}
                    />
                    <Bar dataKey="calls" fill="var(--brand)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        {/* System health (KEPT) */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Server className="h-4 w-4 text-brand" /> System Health
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2 space-y-3">
            {[
              { label: 'API Gateway', value: 99.98, status: 'Operational' },
              { label: 'AI Gateway', value: 99.91, status: 'Operational' },
              { label: 'Database', value: 100, status: 'Operational' },
              { label: 'Background Workers', value: 98.4, status: 'Degraded' },
            ].map((s) => (
              <div key={s.label} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className={`h-2 w-2 rounded-full ${s.value > 99 ? 'bg-brand' : 'bg-amber-500'}`}
                  />
                  <span className="text-sm">{s.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{s.value}%</span>
                  <Badge
                    variant="outline"
                    className={`h-5 px-1.5 text-[9px] ${
                      s.value > 99
                        ? 'border-brand/40 text-brand'
                        : 'border-amber-500/40 text-amber-600'
                    }`}
                  >
                    {s.status}
                  </Badge>
                </div>
              </div>
            ))}
            <div className="pt-2 border-t mt-2">
              <div className="text-xs text-muted-foreground mb-1.5">Your AI usage</div>
              <div className="flex items-center gap-2">
                <Progress
                  value={Math.min((data.stats.aiCalls / 200) * 100, 100)}
                  className="h-2 flex-1"
                />
                <span className="text-xs font-medium">{data.stats.aiCalls} / 200</span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">
                Premium plan · resets in 14 days
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* NEW: Audit Log + Feature Flags */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* Audit Log */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <ScrollText className="h-4 w-4 text-brand" /> {t('auditLog')}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="max-h-80 overflow-y-auto pe-1">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Action</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead className="text-right">When</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {audits.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-xs text-muted-foreground py-6">
                        {t('empty')}
                      </TableCell>
                    </TableRow>
                  ) : (
                    audits.map((a) => (
                      <TableRow key={a.id}>
                        <TableCell className="font-mono text-[11px]">{a.action}</TableCell>
                        <TableCell className="text-xs">
                          <span className="text-muted-foreground">{a.entity}</span>
                          {a.entityId && (
                            <span className="text-[10px] text-muted-foreground/70 block">
                              {a.entityId.slice(0, 8)}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs">{a.userName ?? 'system'}</TableCell>
                        <TableCell className="text-right text-[11px] text-muted-foreground">
                          {new Date(a.createdAt).toLocaleString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Feature Flags */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Flag className="h-4 w-4 text-brand" /> {t('featureFlags')}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="max-h-80 overflow-y-auto pe-1 space-y-3">
              {flags.length === 0 ? (
                <p className="text-xs text-muted-foreground py-6 text-center">
                  {t('empty')}
                </p>
              ) : (
                flags.map((f) => (
                  <div
                    key={f.key}
                    className="rounded-lg border p-3 hover:border-brand/30 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-medium truncate">
                            {f.key}
                          </span>
                          <Badge
                            variant="outline"
                            className={`h-5 px-1.5 text-[9px] ${
                              f.enabled
                                ? 'border-brand/40 text-brand'
                                : 'border-muted-foreground/30 text-muted-foreground'
                            }`}
                          >
                            {f.enabled ? 'ON' : 'OFF'}
                          </Badge>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">
                          {f.description || '—'}
                        </p>
                      </div>
                      <Switch
                        checked={f.enabled}
                        onCheckedChange={(v) => toggleFlag(f.key, v)}
                        aria-label={`Toggle ${f.key}`}
                      />
                    </div>
                    <div className="mt-2.5 flex items-center gap-3">
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wide shrink-0">
                        Rollout
                      </span>
                      <Slider
                        value={[f.rollout]}
                        min={0}
                        max={100}
                        step={5}
                        onValueChange={(v) => setRollout(f.key, v[0])}
                        className="flex-1"
                        aria-label={`Rollout ${f.key}`}
                      />
                      <span className="text-[11px] font-medium tabular-nums w-9 text-right">
                        {f.rollout}%
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* NEW: AI Cost Monitoring */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Coins className="h-4 w-4 text-brand" /> AI Cost Monitoring
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Total + cost by model */}
            <div className="space-y-3">
              <div className="rounded-lg border border-brand/20 bg-brand-soft/30 p-4">
                <div className="text-xs text-muted-foreground uppercase tracking-wide">
                  Total cost (recent)
                </div>
                <div className="text-3xl font-bold tracking-tight mt-1 text-brand">
                  ${totalCost.toFixed(4)}
                </div>
                <div className="text-[11px] text-muted-foreground mt-1">
                  Across {usageRows.length} AI calls
                </div>
              </div>
              <div>
                <div className="text-xs font-medium mb-2">Cost by model tier</div>
                {costByModel.length === 0 ? (
                  <p className="text-xs text-muted-foreground">{t('empty')}</p>
                ) : (
                  <div className="h-40">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={costByModel}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={36}
                          outerRadius={62}
                          paddingAngle={3}
                        >
                          {costByModel.map((m, i) => (
                            <Cell
                              key={i}
                              fill={TIER_COLORS[m.name] || PIE_COLORS[i % PIE_COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            background: 'var(--card)',
                            border: '1px solid var(--border)',
                            borderRadius: 10,
                            fontSize: 12,
                          }}
                          formatter={(v: number) => [`$${v.toFixed(4)}`, 'Cost']}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
                <div className="flex flex-wrap justify-center gap-3 mt-2">
                  {costByModel.map((m) => (
                    <div key={m.name} className="flex items-center gap-1.5 text-[11px]">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ background: TIER_COLORS[m.name] || 'var(--brand)' }}
                      />
                      <span className="capitalize">{m.name}</span>
                      <span className="text-muted-foreground">${m.value.toFixed(4)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Top 5 features by cost */}
            <div className="lg:col-span-2">
              <div className="text-xs font-medium mb-3">Top 5 features by cost</div>
              {topFeatures.length === 0 ? (
                <p className="text-xs text-muted-foreground py-12 text-center">
                  {t('empty')}
                </p>
              ) : (
                <div className="space-y-3">
                  {topFeatures.map((f) => (
                    <div key={f.name}>
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="font-medium">{f.name}</span>
                        <span className="text-muted-foreground tabular-nums">
                          ${f.value.toFixed(4)}
                        </span>
                      </div>
                      <Progress
                        value={Math.max((f.value / maxFeatureCost) * 100, 2)}
                        className="h-2"
                      />
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-5 pt-4 border-t grid grid-cols-3 gap-3 text-xs">
                <div>
                  <div className="text-muted-foreground text-[10px] uppercase tracking-wide">
                    Avg latency
                  </div>
                  <div className="font-semibold mt-0.5">
                    {ai?.totals.avgLatency ?? 0} ms
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground text-[10px] uppercase tracking-wide">
                    Total tokens
                  </div>
                  <div className="font-semibold mt-0.5">
                    {(ai?.totals.tokens ?? 0).toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground text-[10px] uppercase tracking-wide">
                    Cost / 1k calls
                  </div>
                  <div className="font-semibold mt-0.5">
                    ${ai && ai.totals.calls > 0
                      ? ((ai.totals.cost / ai.totals.calls) * 1000).toFixed(4)
                      : '0.0000'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
