'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { api } from '@/lib/api-client'
import { useApp } from '@/components/app-provider'
import { useProfile } from '@/components/careeros/profile-context'
import { useToast } from '@/hooks/use-toast'
import { ModuleHeader } from '@/components/careeros/module-header'
import { Spinner } from '@/components/careeros/loading'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { CreditCard, Zap, Check, Sparkles, TrendingUp, Receipt, Coins } from 'lucide-react'

type PlanDef = { id: string; name: string; priceMonthly: number; priceAnnual: number; credits: number; features: string[]; highlight?: boolean; badge?: string }
type Subscription = { id: string; plan: string; status: string; interval: string | null; currentPeriodEnd: string | null; invoices: any[] }

export function PlansModule() {
  const { t } = useApp()
  const { user, save } = useProfile()
  const { toast } = useToast()
  const [plans, setPlans] = useState<PlanDef[]>([])
  const [sub, setSub] = useState<Subscription | null>(null)
  const [currentPlan, setCurrentPlan] = useState<string>('free')
  const [credits, setCredits] = useState(0)
  const [interval, setInterval] = useState<'monthly' | 'annual'>('monthly')
  const [busy, setBusy] = useState<string | null>(null)
  const [creditPkgs, setCreditPkgs] = useState<any[]>([])
  const [creditTxns, setCreditTxns] = useState<any[]>([])

  useEffect(() => {
    api<{ plans: PlanDef[]; subscription: Subscription; currentPlan: any; userPlan: string; credits: number }>('/api/billing').then((res) => {
      setPlans(res.plans); setSub(res.subscription); setCurrentPlan(res.userPlan); setCredits(res.credits)
    })
    api<{ packages: any[]; transactions: any[] }>('/api/billing/credits').then((res) => { setCreditPkgs(res.packages); setCreditTxns(res.transactions || []) })
  }, [])

  const subscribe = async (planId: string) => {
    setBusy(planId)
    try {
      const { subscription } = await api<{ subscription: Subscription }>('/api/billing/subscribe', { method: 'POST', body: { plan: planId, interval } })
      setSub(subscription); setCurrentPlan(planId)
      const plan = plans.find((p) => p.id === planId)
      setCredits(plan?.credits === -1 ? -1 : plan?.credits || 0)
      save({}) // refresh profile
      toast({ title: `Subscribed to ${plan?.name}`, description: interval === 'annual' ? 'Annual plan active' : 'Monthly plan active' })
    } catch (e) { toast({ title: 'Failed', description: (e as Error).message, variant: 'destructive' }) }
    finally { setBusy(null) }
  }

  const buyCredits = async (pkgId: string) => {
    setBusy(`credit-${pkgId}`)
    try {
      const { balance, creditsAdded } = await api<{ balance: number; creditsAdded: number }>('/api/billing/credits/purchase', { method: 'POST', body: { packageId: pkgId } })
      setCredits(balance)
      toast({ title: `${creditsAdded} credits added`, description: `New balance: ${balance < 0 ? '∞' : balance}` })
    } catch (e) { toast({ title: 'Failed', description: (e as Error).message, variant: 'destructive' }) }
    finally { setBusy(null) }
  }

  const fmt = (cents: number) => cents === 0 ? '$0' : `$${(cents / 100).toFixed(0)}`

  return (
    <div>
      <ModuleHeader title={t('plansTitle')} subtitle={t('plansSub')} icon={CreditCard} />

      <Tabs defaultValue="plans" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-3 mb-4">
          <TabsTrigger value="plans">Plans</TabsTrigger>
          <TabsTrigger value="credits">Credits</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
        </TabsList>

        {/* Plans tab */}
        <TabsContent value="plans" className="space-y-4">
          {/* Interval toggle */}
          <div className="flex items-center justify-center gap-3">
            <button onClick={() => setInterval('monthly')} className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${interval === 'monthly' ? 'bg-brand text-brand-foreground' : 'bg-muted hover:bg-accent'}`}>Monthly</button>
            <button onClick={() => setInterval('annual')} className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${interval === 'annual' ? 'bg-brand text-brand-foreground' : 'bg-muted hover:bg-accent'}`}>Annual <span className="text-[10px] opacity-80">{t('saveAnnual')}</span></button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
            {plans.map((p, i) => {
              const isCurrent = currentPlan === p.id
              const price = interval === 'annual' ? p.priceAnnual : p.priceMonthly
              return (
                <motion.div key={p.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                  <Card className={`h-full flex flex-col ${p.highlight ? 'border-brand shadow-md ring-1 ring-brand/20' : ''} ${isCurrent ? 'ring-2 ring-brand' : ''}`}>
                    <CardContent className="p-5 flex flex-col h-full">
                      {p.badge && <Badge className="self-start mb-2 bg-brand/15 text-brand border-brand/30">{p.badge}</Badge>}
                      <h3 className="font-semibold text-base">{p.name}</h3>
                      <div className="mt-2 mb-1">
                        <span className="text-2xl font-bold">{p.id === 'enterprise' ? 'Custom' : fmt(price)}</span>
                        {p.id !== 'enterprise' && price > 0 && <span className="text-xs text-muted-foreground">{interval === 'annual' ? t('perYear') : t('perMonth')}</span>}
                      </div>
                      <div className="text-xs text-brand font-medium mb-3">{p.credits === -1 ? 'Unlimited AI credits' : `${p.credits} AI credits / mo`}</div>
                      <ul className="space-y-1.5 mb-4 flex-1">
                        {p.features.map((f, j) => (
                          <li key={j} className="flex items-start gap-1.5 text-xs"><Check className="h-3.5 w-3.5 text-brand shrink-0 mt-0.5" />{f}</li>
                        ))}
                      </ul>
                      <Button
                        onClick={() => subscribe(p.id)}
                        disabled={isCurrent || busy === p.id}
                        className={`w-full rounded-full ${p.highlight ? 'bg-brand text-brand-foreground hover:bg-brand/90' : ''}`}
                        variant={p.highlight ? 'default' : 'outline'}
                      >
                        {busy === p.id ? <Spinner /> : isCurrent ? <><Check className="h-4 w-4" /> Current</> : p.id === 'enterprise' ? 'Contact Sales' : `Choose ${p.name}`}
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </div>
        </TabsContent>

        {/* Credits tab */}
        <TabsContent value="credits" className="space-y-4">
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <div className="flex items-center gap-4 p-5 bg-gradient-to-r from-brand/15 to-transparent">
                <div className="h-14 w-14 rounded-xl bg-brand text-brand-foreground flex items-center justify-center"><Coins className="h-7 w-7" /></div>
                <div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wide">Credit balance</div>
                  <div className="text-2xl font-bold">{credits < 0 ? '∞ Unlimited' : credits}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {creditPkgs.map((pkg) => (
              <Card key={pkg.id} className="text-center">
                <CardContent className="p-5">
                  <div className="text-3xl font-bold text-brand">{pkg.credits}</div>
                  <div className="text-xs text-muted-foreground mb-1">credits</div>
                  {pkg.bonus > 0 && <Badge className="mb-3 bg-amber-500/15 text-amber-600 border-amber-500/30">+{pkg.bonus} bonus</Badge>}
                  <div className="text-lg font-semibold mb-3">{fmt(pkg.price)}</div>
                  <Button onClick={() => buyCredits(pkg.id)} disabled={busy === `credit-${pkg.id}`} className="w-full rounded-full bg-brand text-brand-foreground hover:bg-brand/90">
                    {busy === `credit-${pkg.id}` ? <Spinner /> : <Zap className="h-4 w-4" />} {t('buyCredits')}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {creditTxns.length > 0 && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Recent transactions</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-1.5 max-h-60 overflow-y-auto">
                  {creditTxns.slice(0, 10).map((tx) => (
                    <div key={tx.id} className="flex items-center justify-between text-xs py-1.5 border-b last:border-0">
                      <div className="flex items-center gap-2">
                        <Badge variant={tx.amount > 0 ? 'default' : 'outline'} className={tx.amount > 0 ? 'bg-brand/15 text-brand' : ''}>{tx.amount > 0 ? '+' : ''}{tx.amount}</Badge>
                        <span className="capitalize">{tx.reason}</span>
                        {tx.feature && <span className="text-muted-foreground">· {tx.feature}</span>}
                      </div>
                      <span className="text-muted-foreground">{new Date(tx.createdAt).toLocaleDateString()}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Billing tab */}
        <TabsContent value="billing" className="space-y-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><Receipt className="h-4 w-4 text-brand" /> Invoices</CardTitle></CardHeader>
            <CardContent>
              {sub?.invoices && sub.invoices.length > 0 ? (
                <div className="space-y-1.5">
                  {sub.invoices.map((inv) => (
                    <div key={inv.id} className="flex items-center justify-between text-xs py-2 border-b last:border-0">
                      <div>
                        <div className="font-medium">{inv.description}</div>
                        <div className="text-muted-foreground">{new Date(inv.createdAt).toLocaleDateString()} · {inv.status}</div>
                      </div>
                      <div className="font-semibold">{fmt(inv.amount)} {inv.currency}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-6">No invoices yet. Subscribe to a paid plan to see invoices here.</p>
              )}
            </CardContent>
          </Card>
          {sub && (
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wide">Current subscription</div>
                    <div className="font-semibold capitalize">{sub.plan} · {sub.interval || 'monthly'}</div>
                    {sub.currentPeriodEnd && <div className="text-xs text-muted-foreground">Renews {new Date(sub.currentPeriodEnd).toLocaleDateString()}</div>}
                  </div>
                  <Badge variant={sub.status === 'active' ? 'default' : 'outline'} className={sub.status === 'active' ? 'bg-brand/15 text-brand' : ''}>{sub.status}</Badge>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
