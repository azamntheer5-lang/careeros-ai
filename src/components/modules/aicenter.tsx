'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { api } from '@/lib/api-client'
import { useApp } from '@/components/app-provider'
import { useProfile } from '@/components/careeros/profile-context'
import { ModuleHeader } from '@/components/careeros/module-header'
import { LoadingScreen } from '@/components/careeros/loading'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Cpu, Activity, DollarSign, Coins, Database, BrainCircuit,
  CheckCircle2, AlertCircle,
} from 'lucide-react'
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar, PieChart, Pie, Cell,
} from 'recharts'

type PromptRow = {
  key: string
  version: number
  model: string
  temperature: number
}

type UsageRow = {
  id: string
  feature: string
  model: string | null
  tokens: number
  cost: number
  latencyMs: number | null
  success: boolean
  createdAt: string
}

type AicenterData = {
  prompts: PromptRow[]
  usage: UsageRow[]
  totals: { calls: number; tokens: number; cost: number; avgLatency: number }
  byFeature: { feature: string; calls: number }[]
  byModel: { model: string; calls: number }[]
  trend: { date: string; calls: number; tokens: number }[]
}

const TIER_COLORS: Record<string, string> = {
  fast: 'oklch(0.7 0.15 162)',
  balanced: 'oklch(0.7 0.13 200)',
  quality: 'oklch(0.75 0.15 80)',
}
const PIE_COLORS = [
  'oklch(0.7 0.15 162)',
  'oklch(0.7 0.13 200)',
  'oklch(0.75 0.15 80)',
  'oklch(0.65 0.2 300)',
  'oklch(0.68 0.2 30)',
  'oklch(0.6 0.1 240)',
]

const FEATURE_LABELS: Record<string, string> = {
  'resume-enhance': 'Resume AI',
  'ats-analyze': 'ATS',
  'cover-letter': 'Cover',
  interview: 'Interview',
  coach: 'Coach',
  skills: 'Skills',
}

export function AiCenterModule() {
  const { t } = useApp()
  const { profile } = useProfile()
  const [data, setData] = useState<AicenterData | null>(null)

  useEffect(() => {
    api<AicenterData>('/api/aicenter')
      .then(setData)
      .catch(() => {})
  }, [])

  if (!data) return <LoadingScreen label="Loading AI center…" />

  const kpis = [
    {
      label: 'Total calls',
      value: data.totals.calls.toLocaleString(),
      icon: Cpu,
      color: 'var(--brand)',
    },
    {
      label: 'Total tokens',
      value: data.totals.tokens.toLocaleString(),
      icon: Coins,
      color: 'oklch(0.7 0.13 200)',
    },
    {
      label: 'Est. cost',
      value: `$${data.totals.cost.toFixed(4)}`,
      icon: DollarSign,
      color: 'oklch(0.75 0.15 80)',
    },
    {
      label: 'Avg latency',
      value: `${data.totals.avgLatency} ms`,
      icon: Activity,
      color: 'oklch(0.65 0.2 30)',
    },
  ]

  const featureData = data.byFeature.map((f) => ({
    name: FEATURE_LABELS[f.feature] || f.feature,
    calls: f.calls,
  }))
  const modelData = data.byModel.map((m) => ({ name: m.model, value: m.calls }))

  const profileActive = !!profile
  const strengthsCount = profile?.strengths.length ?? 0
  const valuesCount = profile?.values.length ?? 0

  return (
    <div>
      <ModuleHeader title={t('aicenterTitle')} subtitle={t('aicenterSub')} icon={Cpu} />

      {/* KPI row */}
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

      {/* Usage over time + memory status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="h-4 w-4 text-brand" /> Usage · last 14 days
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.trend} margin={{ left: -10, right: 8, top: 8 }}>
                  <defs>
                    <linearGradient id="aiGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--brand)" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="var(--brand)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
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
                  <Area
                    type="monotone"
                    dataKey="calls"
                    stroke="var(--brand)"
                    strokeWidth={2.5}
                    fill="url(#aiGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Memory status */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <BrainCircuit className="h-4 w-4 text-brand" /> Memory Status
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2 space-y-3">
            <div className="flex items-center gap-2.5">
              {profileActive ? (
                <CheckCircle2 className="h-5 w-5 text-brand shrink-0" />
              ) : (
                <AlertCircle className="h-5 w-5 text-amber-500 shrink-0" />
              )}
              <div className="min-w-0">
                <div className="text-sm font-medium">
                  {profileActive ? 'Career Profile active' : 'No profile yet'}
                </div>
                <div className="text-[11px] text-muted-foreground truncate">
                  {profileActive
                    ? `${profile?.targetRole || 'Target role unset'} · ${profile?.seniority || 'seniority unset'}`
                    : 'Create a profile to enable AI memory.'}
                </div>
              </div>
            </div>
            <div className="rounded-lg bg-brand-soft/40 border border-brand/15 p-3 text-[11px] text-muted-foreground leading-relaxed">
              Every AI call injects your career profile as live memory — target
              role, seniority, industry, goals, strengths and values — so prompts
              are personalized end-to-end.
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-md border p-2">
                <div className="text-muted-foreground text-[10px] uppercase tracking-wide">
                  Strengths
                </div>
                <div className="font-semibold mt-0.5">{strengthsCount}</div>
              </div>
              <div className="rounded-md border p-2">
                <div className="text-muted-foreground text-[10px] uppercase tracking-wide">
                  Values
                </div>
                <div className="font-semibold mt-0.5">{valuesCount}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* By feature + by model */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              {t('featureUsage')} · by feature
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="h-48">
              {featureData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                  {t('empty')}
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={featureData} margin={{ left: -20, right: 8, top: 8 }}>
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

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Model tier routing</CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="h-48">
              {modelData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                  {t('empty')}
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={modelData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={42}
                      outerRadius={70}
                      paddingAngle={3}
                    >
                      {modelData.map((m, i) => (
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
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="flex flex-wrap justify-center gap-3 mt-2">
              {modelData.map((m) => (
                <div key={m.name} className="flex items-center gap-1.5 text-[11px]">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ background: TIER_COLORS[m.name] || 'var(--brand)' }}
                  />
                  <span className="capitalize">{m.name}</span>
                  <span className="text-muted-foreground">({m.value})</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Prompt registry + recent usage */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Database className="h-4 w-4 text-brand" /> {t('promptRegistry')}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="max-h-96 overflow-y-auto pe-1">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Key</TableHead>
                    <TableHead>Version</TableHead>
                    <TableHead>Model tier</TableHead>
                    <TableHead className="text-right">Temperature</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.prompts.map((p) => (
                    <TableRow key={p.key}>
                      <TableCell className="font-mono text-xs">{p.key}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
                          v{p.version}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span
                          className="capitalize text-xs font-medium"
                          style={{ color: TIER_COLORS[p.model] || 'var(--foreground)' }}
                        >
                          {p.model}
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-xs font-mono">
                        {p.temperature.toFixed(1)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{t('usage')} · recent</CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="space-y-2 max-h-96 overflow-y-auto pe-1">
              {data.usage.length === 0 ? (
                <p className="text-xs text-muted-foreground py-6 text-center">
                  {t('empty')}
                </p>
              ) : (
                data.usage.slice(0, 25).map((u) => (
                  <div key={u.id} className="flex items-center gap-2.5 text-xs">
                    <span
                      className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                        u.success ? 'bg-brand' : 'bg-amber-500'
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">
                        {FEATURE_LABELS[u.feature] || u.feature}
                      </div>
                      <div className="text-muted-foreground text-[10px]">
                        {new Date(u.createdAt).toLocaleString()} · {u.tokens} tok ·{' '}
                        {u.latencyMs ?? '—'}ms
                      </div>
                    </div>
                    <span className="text-[10px] capitalize text-muted-foreground shrink-0">
                      {u.model}
                    </span>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
