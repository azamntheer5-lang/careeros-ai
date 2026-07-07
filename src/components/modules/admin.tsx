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
import { ShieldCheck, Users, Cpu, DollarSign, Activity, Server, TrendingUp, Zap } from 'lucide-react'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  AreaChart, Area,
} from 'recharts'

const FEATURE_LABELS: Record<string, string> = {
  'resume-enhance': 'Resume AI', 'ats-analyze': 'ATS', 'cover-letter': 'Cover',
  interview: 'Interview', coach: 'Coach', skills: 'Skills',
}

export function AdminModule() {
  const { t } = useApp()
  const [data, setData] = useState<any>(null)

  useEffect(() => {
    api('/api/dashboard').then(setData)
  }, [])

  if (!data) return <LoadingScreen label="Loading platform data…" />

  const usageData = Object.entries(data.featureUsage as Record<string, number>).map(([k, v]) => ({
    name: FEATURE_LABELS[k] || k, calls: v,
  }))

  // Simulated platform KPIs (single-tenant demo)
  const platformUsers = 12480 + data.stats.aiCalls * 3
  const mrr = 38420 + data.stats.aiCalls * 12
  const activeNow = 340 + (data.stats.aiCalls % 60)

  const kpis = [
    { label: t('totalUsers'), value: platformUsers.toLocaleString(), icon: Users, delta: '+12.4%', color: 'var(--brand)' },
    { label: t('aiCalls'), value: (data.stats.aiCalls + 48210).toLocaleString(), icon: Cpu, delta: '+8.1%', color: 'oklch(0.7 0.13 200)' },
    { label: t('mrr'), value: `$${mrr.toLocaleString()}`, icon: DollarSign, delta: '+18.7%', color: 'oklch(0.75 0.15 80)' },
    { label: t('activeNow'), value: activeNow.toString(), icon: Activity, delta: 'live', color: 'oklch(0.65 0.2 30)' },
  ]

  const revenueTrend = [
    { m: 'Jan', v: 22100 }, { m: 'Feb', v: 26800 }, { m: 'Mar', v: 29400 },
    { m: 'Apr', v: 33200 }, { m: 'May', v: 35100 }, { m: 'Jun', v: mrr },
  ]

  const planDistribution = [
    { plan: 'Free', pct: 62 }, { plan: 'Pro', pct: 24 }, { plan: 'Premium', pct: 11 }, { plan: 'Enterprise', pct: 3 },
  ]

  return (
    <div>
      <ModuleHeader title={t('adminTitle')} subtitle={t('adminSub')} icon={ShieldCheck} />

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        {kpis.map((k, i) => {
          const Icon = k.icon
          return (
            <motion.div key={k.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground font-medium">{k.label}</p>
                      <p className="text-2xl font-semibold tracking-tight mt-1.5">{k.value}</p>
                      <div className="flex items-center gap-1 mt-1">
                        <TrendingUp className="h-3 w-3 text-brand" />
                        <span className="text-[11px] text-brand font-medium">{k.delta}</span>
                      </div>
                    </div>
                    <div className="h-9 w-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: `color-mix(in oklch, ${k.color} 14%, transparent)`, color: k.color }}>
                      <Icon className="h-4 w-4" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Revenue Trend</CardTitle></CardHeader>
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
                  <XAxis dataKey="m" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 12 }} formatter={(v: number) => [`$${v.toLocaleString()}`, 'MRR']} />
                  <Area type="monotone" dataKey="v" stroke="var(--brand)" strokeWidth={2.5} fill="url(#revGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Plan Distribution</CardTitle></CardHeader>
          <CardContent className="pt-2 space-y-3">
            {planDistribution.map((p) => (
              <div key={p.plan}>
                <div className="flex justify-between text-xs mb-1"><span className="font-medium">{p.plan}</span><span className="text-muted-foreground">{p.pct}%</span></div>
                <Progress value={p.pct} className="h-1.5" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Feature usage */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><Zap className="h-4 w-4 text-brand" /> {t('featureUsage')}</CardTitle></CardHeader>
          <CardContent className="pt-2">
            <div className="h-48">
              {usageData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-muted-foreground">{t('empty')}</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={usageData} margin={{ left: -20, right: 8, top: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 12 }} />
                    <Bar dataKey="calls" fill="var(--brand)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        {/* System health */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><Server className="h-4 w-4 text-brand" /> System Health</CardTitle></CardHeader>
          <CardContent className="pt-2 space-y-3">
            {[
              { label: 'API Gateway', value: 99.98, status: 'Operational' },
              { label: 'AI Gateway', value: 99.91, status: 'Operational' },
              { label: 'Database', value: 100, status: 'Operational' },
              { label: 'Background Workers', value: 98.4, status: 'Degraded' },
            ].map((s) => (
              <div key={s.label} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${s.value > 99 ? 'bg-brand' : 'bg-amber-500'}`} />
                  <span className="text-sm">{s.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{s.value}%</span>
                  <Badge variant="outline" className={`h-5 px-1.5 text-[9px] ${s.value > 99 ? 'border-brand/40 text-brand' : 'border-amber-500/40 text-amber-600'}`}>{s.status}</Badge>
                </div>
              </div>
            ))}
            <div className="pt-2 border-t mt-2">
              <div className="text-xs text-muted-foreground mb-1.5">Your AI usage</div>
              <div className="flex items-center gap-2">
                <Progress value={Math.min((data.stats.aiCalls / 200) * 100, 100)} className="h-2 flex-1" />
                <span className="text-xs font-medium">{data.stats.aiCalls} / 200</span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">Premium plan · resets in 14 days</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
