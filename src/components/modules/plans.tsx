'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { api } from '@/lib/api-client'
import { useApp } from '@/components/app-provider'
import { useProfile } from '@/components/careeros/profile-context'
import { useToast } from '@/hooks/use-toast'
import { ModuleHeader } from '@/components/careeros/module-header'
import { LoadingScreen } from '@/components/careeros/loading'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { CreditCard, Check, Sparkles, Zap, Crown, Building2 } from 'lucide-react'

type PlanDef = {
  key: string
  calls: number | null // null = unlimited
  price: number
  priceLabel: string
  label: string
}

type Invoice = {
  id: string
  date: string
  amount: number
  plan: string
  status: string
}

type ByFeature = { feature: string; calls: number; tokens: number; cost: number }

type PlansData = {
  plan: string
  limits: PlanDef
  usage: {
    calls: number
    tokens: number
    cost: number
    byFeature: ByFeature[]
  }
  cycleStart: string
  cycleEnd: string
  invoices: Invoice[]
  plans: PlanDef[]
}

const PLAN_FEATURES: Record<string, string[]> = {
  free: [
    '50 AI calls / month',
    '1 resume',
    'Basic ATS analysis',
    'Cover letters (3/mo)',
    'Community support',
  ],
  pro: [
    '500 AI calls / month',
    'Unlimited resumes',
    'Advanced ATS + recruiter sim',
    'Unlimited cover letters',
    'Interview simulator',
    'Email support',
  ],
  premium: [
    '2,000 AI calls / month',
    'All resume templates',
    'Priority AI models',
    'Career coach (unlimited)',
    'Skill intelligence + roadmap',
    'Portfolio builder',
  ],
  enterprise: [
    'Unlimited AI calls',
    'SSO & SAML',
    'Dedicated success manager',
    'Custom integrations & SLA',
    'Audit logs & compliance',
    'Onboarding & training',
  ],
}

const PLAN_ICONS: Record<string, React.ElementType> = {
  free: Sparkles,
  pro: Zap,
  premium: Crown,
  enterprise: Building2,
}

const PLAN_ACCENTS: Record<string, string> = {
  free: 'oklch(0.7 0.13 200)',
  pro: 'oklch(0.7 0.15 162)',
  premium: 'oklch(0.75 0.15 80)',
  enterprise: 'oklch(0.65 0.2 300)',
}

export function PlansModule() {
  const { t } = useApp()
  const { user, refresh } = useProfile()
  const { toast } = useToast()
  const [data, setData] = useState<PlansData | null>(null)
  const [switching, setSwitching] = useState<string | null>(null)

  const load = () => api<PlansData>('/api/plans').then(setData)
  useEffect(() => {
    load().catch(() => {})
  }, [])

  if (!data) return <LoadingScreen label="Loading plans…" />

  const currentPlan = user?.plan || data.plan
  const limit = data.limits.calls
  const usagePct = limit ? Math.min((data.usage.calls / limit) * 100, 100) : 0
  const daysLeft = Math.max(
    0,
    Math.ceil((new Date(data.cycleEnd).getTime() - Date.now()) / 86400000)
  )

  const switchPlan = async (key: string) => {
    if (key === currentPlan) return
    setSwitching(key)
    try {
      await api('/api/plans', { method: 'PUT', body: { plan: key } })
      await refresh()
      await load()
      toast({
        title: 'Plan updated',
        description: `You are now on the ${key.charAt(0).toUpperCase() + key.slice(1)} plan.`,
      })
    } catch (e) {
      toast({
        title: 'Update failed',
        description: (e as Error).message,
        variant: 'destructive',
      })
    } finally {
      setSwitching(null)
    }
  }

  return (
    <div>
      <ModuleHeader title={t('plansTitle')} subtitle={t('plansSub')} icon={CreditCard} />

      {/* Current plan + usage this cycle */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-5"
      >
        <Card className="overflow-hidden border-brand/20">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row gap-6">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                  <Badge className="bg-brand-soft text-brand border-brand/20 capitalize">
                    {currentPlan}
                  </Badge>
                  <span className="text-xs text-muted-foreground">Current plan</span>
                </div>
                <h3 className="text-2xl font-semibold tracking-tight">
                  {data.limits.priceLabel}
                  {data.limits.price > 0 && (
                    <span className="text-sm font-normal text-muted-foreground">/mo</span>
                  )}
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  {limit
                    ? `${limit.toLocaleString()} AI calls per billing cycle`
                    : 'Unlimited AI calls'}{' '}
                  · resets in {daysLeft} days
                </p>
              </div>
              <div className="flex-[1.4] min-w-0">
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="font-medium">AI calls this cycle</span>
                  <span className="text-muted-foreground">
                    {data.usage.calls.toLocaleString()}
                    {limit ? ` / ${limit.toLocaleString()}` : ''}
                  </span>
                </div>
                <Progress value={usagePct} className="h-2" />
                <div className="grid grid-cols-3 gap-3 mt-4 text-xs">
                  <div>
                    <div className="text-muted-foreground text-[10px] uppercase tracking-wide">
                      Tokens
                    </div>
                    <div className="font-semibold mt-0.5">
                      {data.usage.tokens.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground text-[10px] uppercase tracking-wide">
                      Est. cost
                    </div>
                    <div className="font-semibold mt-0.5">
                      ${data.usage.cost.toFixed(4)}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground text-[10px] uppercase tracking-wide">
                      Features used
                    </div>
                    <div className="font-semibold mt-0.5">
                      {data.usage.byFeature.length}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Plan comparison */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        {data.plans.map((p, i) => {
          const isCurrent = p.key === currentPlan
          const Icon = PLAN_ICONS[p.key] || Sparkles
          const accent = PLAN_ACCENTS[p.key] || 'var(--brand)'
          return (
            <motion.div
              key={p.key}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card
                className={`relative h-full flex flex-col ${
                  isCurrent ? 'border-brand ring-1 ring-brand/30' : ''
                }`}
              >
                <CardContent className="p-5 flex flex-col flex-1">
                  <div className="flex items-center justify-between mb-3">
                    <div
                      className="h-9 w-9 rounded-lg flex items-center justify-center"
                      style={{
                        backgroundColor: `color-mix(in oklch, ${accent} 14%, transparent)`,
                        color: accent,
                      }}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    {isCurrent && (
                      <Badge className="bg-brand text-brand-foreground text-[10px]">
                        Current
                      </Badge>
                    )}
                  </div>
                  <h3 className="text-lg font-semibold tracking-tight">{p.label}</h3>
                  <div className="mt-1 mb-3">
                    <span className="text-2xl font-bold tracking-tight">
                      {p.priceLabel}
                    </span>
                    {p.price > 0 && (
                      <span className="text-xs text-muted-foreground">/mo</span>
                    )}
                  </div>
                  <ul className="space-y-1.5 text-xs flex-1 mb-4">
                    {(PLAN_FEATURES[p.key] || []).map((f) => (
                      <li key={f} className="flex items-start gap-2">
                        <Check
                          className="h-3.5 w-3.5 shrink-0 mt-0.5"
                          style={{ color: accent }}
                        />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    variant={isCurrent ? 'outline' : 'default'}
                    disabled={isCurrent || switching === p.key}
                    onClick={() => switchPlan(p.key)}
                    className={`w-full rounded-full ${
                      !isCurrent
                        ? 'bg-brand text-brand-foreground hover:bg-brand/90'
                        : ''
                    }`}
                  >
                    {switching === p.key
                      ? 'Switching…'
                      : isCurrent
                        ? 'Current plan'
                        : `Switch to ${p.label}`}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </div>

      {/* Invoices */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-brand" /> Invoices
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-2">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.invoices.map((inv) => (
                <TableRow key={inv.id}>
                  <TableCell className="font-mono text-xs">{inv.id}</TableCell>
                  <TableCell className="text-xs">
                    {new Date(inv.date).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </TableCell>
                  <TableCell className="capitalize text-xs">{inv.plan}</TableCell>
                  <TableCell className="text-right text-xs">
                    {inv.amount > 0 ? `$${inv.amount}` : '—'}
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge
                      variant="outline"
                      className="border-brand/40 text-brand text-[10px]"
                    >
                      {inv.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
