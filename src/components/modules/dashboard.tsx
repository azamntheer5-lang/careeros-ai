'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { api } from '@/lib/api-client'
import { useApp } from '@/components/app-provider'
import { useAppStore } from '@/lib/store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  FileText, Briefcase, Mic, Target, ArrowUpRight, Sparkles, Zap, TrendingUp,
  PenLine, ScanSearch, Mail, BrainCircuit, GraduationCap, Clock,
} from 'lucide-react'
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar, PieChart, Pie, Cell,
} from 'recharts'

type DashboardData = {
  stats: { resumes: number; jobs: number; interviews: number; letters: number; coachSessions: number; avgAts: number; aiCalls: number }
  pipeline: { status: string; count: number }[]
  featureUsage: Record<string, number>
  recent: { feature: string; at: string }[]
}

const FEATURE_LABELS: Record<string, string> = {
  'resume-enhance': 'Resume AI',
  'ats-analyze': 'ATS Analysis',
  'cover-letter': 'Cover Letter',
  interview: 'Interview',
  coach: 'Coach',
  skills: 'Skill Analysis',
}

const STATUS_ORDER = ['wishlist', 'applied', 'screening', 'interview', 'offer', 'accepted']

export function DashboardModule({ userName }: { userName: string }) {
  const { t } = useApp()
  const { set } = useAppStore()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api<DashboardData>('/api/dashboard')
      .then(setData)
      .finally(() => setLoading(false))
  }, [])

  const stats = [
    { key: 'resumes', label: t('statResumes'), value: data?.stats.resumes ?? 0, icon: FileText, color: 'var(--brand)' },
    { key: 'jobs', label: t('statApplications'), value: data?.stats.jobs ?? 0, icon: Briefcase, color: 'oklch(0.65 0.13 200)' },
    { key: 'interviews', label: t('statInterviews'), value: data?.stats.interviews ?? 0, icon: Mic, color: 'oklch(0.7 0.15 80)' },
    { key: 'avgAts', label: t('statAtsAvg'), value: data ? `${data.stats.avgAts}%` : '—', icon: Target, color: 'oklch(0.65 0.2 30)' },
  ]

  const quickActions = [
    { module: 'resume', icon: PenLine, label: t('newResume') },
    { module: 'ats', icon: ScanSearch, label: t('analyze') },
    { module: 'cover', icon: Mail, label: t('coverLetter') },
    { module: 'interview', icon: Mic, label: t('startInterview') },
    { module: 'coach', icon: BrainCircuit, label: t('newSession') },
    { module: 'skills', icon: GraduationCap, label: t('runAnalysis') },
  ] as const

  const pipelineData = STATUS_ORDER.map((s) => ({
    status: t(s as any),
    count: data?.pipeline.find((p) => p.status === s)?.count ?? 0,
  }))

  const usageData = Object.entries(data?.featureUsage ?? {}).map(([k, v]) => ({
    name: FEATURE_LABELS[k] || k,
    value: v,
  }))

  const aiCalls = data?.stats.aiCalls ?? 0

  return (
    <div className="space-y-6">
      {/* Hero greeting */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-brand/10 via-card to-card p-6 sm:p-8"
      >
        <div className="absolute inset-0 grid-bg opacity-40" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-4 w-4 text-brand" />
            <span className="text-xs font-medium uppercase tracking-wider text-brand">{t('careerPulse')}</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">
            {t('welcome')}, <span className="text-gradient">{userName.split(' ')[0]}</span> 👋
          </h2>
          <p className="text-sm text-muted-foreground mt-1.5 max-w-xl">{t('welcomeSub')}</p>
          <div className="flex flex-wrap items-center gap-2 mt-5">
            <Button onClick={() => set('resume')} className="bg-brand text-brand-foreground hover:bg-brand/90 rounded-full">
              <Zap className="h-4 w-4" /> {t('newResume')}
            </Button>
            <Button variant="outline" onClick={() => set('coach')} className="rounded-full">
              <BrainCircuit className="h-4 w-4" /> {t('newSession')}
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s, i) => {
          const Icon = s.icon
          return (
            <motion.div
              key={s.key}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
            >
              <Card className="relative overflow-hidden hover:shadow-md transition-shadow group">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground font-medium">{s.label}</p>
                      <p className="text-2xl sm:text-3xl font-semibold tracking-tight mt-1.5">
                        {loading ? <span className="inline-block h-8 w-12 rounded bg-muted animate-pulse" /> : s.value}
                      </p>
                    </div>
                    <div className="h-9 w-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: `color-mix(in oklch, ${s.color} 14%, transparent)`, color: s.color }}>
                      <Icon className="h-4 w-4" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-brand" /> {t('applicationsTrend')}
            </CardTitle>
            <Badge variant="secondary" className="text-[10px]">{pipelineData.reduce((a, b) => a + b.count, 0)} total</Badge>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={pipelineData} margin={{ left: -20, right: 8, top: 8 }}>
                  <defs>
                    <linearGradient id="pipeGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--brand)" stopOpacity={0.45} />
                      <stop offset="100%" stopColor="var(--brand)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="status" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 12 }} />
                  <Area type="monotone" dataKey="count" stroke="var(--brand)" strokeWidth={2.5} fill="url(#pipeGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{t('featureUsage')}</CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="h-56">
              {usageData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-muted-foreground">{t('empty')}</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={usageData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={42} outerRadius={70} paddingAngle={3}>
                      {usageData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick actions + recent */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Zap className="h-4 w-4 text-brand" /> {t('quickActions')}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {quickActions.map((a) => {
                const Icon = a.icon
                return (
                  <button
                    key={a.module}
                    onClick={() => set(a.module)}
                    className="group flex flex-col gap-2 rounded-xl border border-border bg-card p-4 text-start hover:border-brand/40 hover:bg-brand-soft/40 transition-all"
                  >
                    <div className="h-8 w-8 rounded-lg bg-brand-soft text-brand flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Icon className="h-4 w-4" />
                    </div>
                    <span className="text-sm font-medium leading-tight">{a.label}</span>
                  </button>
                )
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4 text-brand" /> {t('recentActivity')}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="space-y-2.5 max-h-56 overflow-y-auto pe-1">
              {(data?.recent ?? []).length === 0 ? (
                <p className="text-xs text-muted-foreground py-6 text-center">{t('empty')}</p>
              ) : (
                (data?.recent ?? []).map((r, i) => (
                  <div key={i} className="flex items-center gap-2.5 text-xs">
                    <div className="h-6 w-6 rounded-md bg-brand-soft text-brand flex items-center justify-center shrink-0">
                      <Sparkles className="h-3 w-3" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{FEATURE_LABELS[r.feature] || r.feature}</div>
                      <div className="text-muted-foreground text-[10px]">{new Date(r.at).toLocaleString()}</div>
                    </div>
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

const PIE_COLORS = ['oklch(0.7 0.15 162)', 'oklch(0.7 0.13 200)', 'oklch(0.75 0.15 80)', 'oklch(0.65 0.2 300)', 'oklch(0.68 0.2 30)', 'oklch(0.6 0.1 240)']
