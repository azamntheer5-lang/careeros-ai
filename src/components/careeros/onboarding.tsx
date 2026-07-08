'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore } from '@/lib/store'
import { useApp } from '@/components/app-provider'
import { useProfile } from '@/components/careeros/profile-context'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Logo } from '@/components/careeros/logo'
import { Spinner } from '@/components/careeros/loading'
import { ChevronLeft, ChevronRight, Rocket, Target, Sparkles, Check } from 'lucide-react'

const SENIORITY = ['junior', 'mid', 'senior', 'staff', 'principal', 'lead', 'director', 'vp', 'c-suite']
const TIMELINES = [
  { id: '3m', label: '3 months' }, { id: '6m', label: '6 months' }, { id: '1y', label: '1 year' }, { id: '2y', label: '2 years' }, { id: '5y', label: '5 years' },
]

export function Onboarding() {
  const { onboardingOpen, setOnboarding } = useAppStore()
  const { t } = useApp()
  const { profile, user, save } = useProfile()
  const { toast } = useToast()
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<any>({
    name: '', headline: '', targetRole: '', seniority: '', industry: 'Technology',
    experienceYears: '', timeline: '1y', careerGoals: '', location: '', workMode: 'remote',
  })

  useEffect(() => {
    if (onboardingOpen && user) {
      setForm((f: any) => ({
        ...f, name: user.name || '', headline: user.headline || '',
        targetRole: profile?.targetRole || '', seniority: profile?.seniority || '',
        industry: profile?.industry || 'Technology', experienceYears: profile?.experienceYears ?? '',
        timeline: profile?.timeline || '1y', careerGoals: profile?.careerGoals || '',
        location: profile?.location || '', workMode: profile?.workMode || 'remote',
      }))
      setStep(0)
    }
  }, [onboardingOpen, user, profile])

  // Auto-trigger onboarding for new users (not yet onboarded) after profile loads.
  useEffect(() => {
    if (user && !user.onboarded && !onboardingOpen) {
      const t = setTimeout(() => setOnboarding(true), 800)
      return () => clearTimeout(t)
    }
  }, [user, onboardingOpen, setOnboarding])

  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }))

  const steps = [
    { title: 'Welcome', icon: Rocket },
    { title: 'About you', icon: Sparkles },
    { title: 'Your goal', icon: Target },
    { title: 'Done', icon: Check },
  ]

  const finish = async () => {
    setSaving(true)
    try {
      await save({
        name: form.name, headline: form.headline, targetRole: form.targetRole, seniority: form.seniority,
        industry: form.industry, experienceYears: form.experienceYears ? Number(form.experienceYears) : null,
        timeline: form.timeline, careerGoals: form.careerGoals, location: form.location, workMode: form.workMode,
        onboarded: true,
      })
      toast({ title: 'Profile ready 🎉', description: 'Every AI feature is now personalized to you.' })
      setOnboarding(false)
    } catch (e) {
      toast({ title: 'Failed', description: (e as Error).message, variant: 'destructive' })
    } finally { setSaving(false) }
  }

  const canNext = step === 0 || (step === 1 && form.name.trim()) || (step === 2 && form.targetRole.trim()) || step === 3

  return (
    <AnimatePresence>
      {onboardingOpen && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-md p-4"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ type: 'spring', stiffness: 240, damping: 24 }}
            className="w-full max-w-lg rounded-3xl border border-border bg-card shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="relative overflow-hidden p-6 bg-gradient-to-br from-brand/15 via-card to-card border-b">
              <div className="absolute inset-0 grid-bg opacity-30" />
              <div className="relative flex items-center gap-3">
                <Logo size={36} />
                <div>
                  <div className="font-semibold tracking-tight">{t('brand')}</div>
                  <div className="text-xs text-muted-foreground">{t('onboardingSub')}</div>
                </div>
              </div>
              {/* Step indicator */}
              <div className="relative flex items-center gap-1.5 mt-5">
                {steps.map((s, i) => (
                  <div key={i} className="flex items-center gap-1.5 flex-1">
                    <div className={`h-1.5 flex-1 rounded-full transition-colors ${i <= step ? 'bg-brand' : 'bg-muted'}`} />
                  </div>
                ))}
              </div>
              <div className="relative mt-2 text-xs text-muted-foreground flex items-center gap-1.5">
                {(() => { const Ico = steps[step].icon; return <Ico className="h-3.5 w-3.5 text-brand" /> })()}
                Step {step + 1} of {steps.length} · {steps[step].title}
              </div>
            </div>

            {/* Body */}
            <div className="p-6 min-h-[260px]">
              <AnimatePresence mode="wait">
                {step === 0 && (
                  <motion.div key="0" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }}>
                    <h3 className="text-xl font-semibold mb-1.5">{t('onboarding')}</h3>
                    <p className="text-sm text-muted-foreground mb-4">CareerOS AI is your career operating system. To make every AI feature — resumes, ATS, interviews, coaching — deeply personalized, we'll set up your career profile in 3 quick steps.</p>
                    <ul className="space-y-2 text-sm">
                      {['A unified profile that remembers your goals', 'AI that writes and coaches like it knows you', 'A single roadmap connecting skills, salary & promotions'].map((x, i) => (
                        <li key={i} className="flex items-center gap-2"><Check className="h-4 w-4 text-brand" /> {x}</li>
                      ))}
                    </ul>
                  </motion.div>
                )}
                {step === 1 && (
                  <motion.div key="1" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} className="space-y-3">
                    <h3 className="text-xl font-semibold mb-1">Tell us about you</h3>
                    <div><Label className="text-xs text-muted-foreground">Full name</Label><Input value={form.name} onChange={(e) => set('name', e.target.value)} className="mt-1" placeholder="Alex Rivera" /></div>
                    <div><Label className="text-xs text-muted-foreground">Headline</Label><Input value={form.headline} onChange={(e) => set('headline', e.target.value)} className="mt-1" placeholder="Senior Engineer → Staff" /></div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label className="text-xs text-muted-foreground">Seniority</Label>
                        <Select value={form.seniority || '__none'} onValueChange={(v) => set('seniority', v === '__none' ? '' : v)}>
                          <SelectTrigger className="mt-1"><SelectValue placeholder="Select…" /></SelectTrigger>
                          <SelectContent><SelectItem value="__none">—</SelectItem>{SENIORITY.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div><Label className="text-xs text-muted-foreground">Years of experience</Label><Input type="number" value={form.experienceYears} onChange={(e) => set('experienceYears', e.target.value)} className="mt-1" placeholder="7" /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label className="text-xs text-muted-foreground">Location</Label><Input value={form.location} onChange={(e) => set('location', e.target.value)} className="mt-1" placeholder="San Francisco, CA" /></div>
                      <div><Label className="text-xs text-muted-foreground">Work mode</Label>
                        <Select value={form.workMode} onValueChange={(v) => set('workMode', v)}>
                          <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                          <SelectContent>{['remote', 'hybrid', 'onsite'].map((w) => <SelectItem key={w} value={w} className="capitalize">{w}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                    </div>
                  </motion.div>
                )}
                {step === 2 && (
                  <motion.div key="2" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} className="space-y-3">
                    <h3 className="text-xl font-semibold mb-1">What's your next move?</h3>
                    <div><Label className="text-xs text-muted-foreground">Target role</Label><Input value={form.targetRole} onChange={(e) => set('targetRole', e.target.value)} className="mt-1" placeholder="Staff Software Engineer" /></div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label className="text-xs text-muted-foreground">Industry</Label>
                        <Select value={form.industry} onValueChange={(v) => set('industry', v)}>
                          <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                          <SelectContent>{['Technology', 'Finance', 'Healthcare', 'Education', 'Media', 'Retail', 'Manufacturing', 'Government', 'Consulting', 'Other'].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div><Label className="text-xs text-muted-foreground">Goal timeline</Label>
                        <Select value={form.timeline} onValueChange={(v) => set('timeline', v)}>
                          <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                          <SelectContent>{TIMELINES.map((tl) => <SelectItem key={tl.id} value={tl.id}>{tl.label}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div><Label className="text-xs text-muted-foreground">Career goals</Label><textarea value={form.careerGoals} onChange={(e) => set('careerGoals', e.target.value)} rows={3} placeholder="What do you want to achieve in the next 1-2 years?" className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" /></div>
                  </motion.div>
                )}
                {step === 3 && (
                  <motion.div key="3" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} className="text-center py-4">
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200, delay: 0.1 }} className="mx-auto h-16 w-16 rounded-full bg-brand-soft text-brand flex items-center justify-center mb-3"><Check className="h-8 w-8" /></motion.div>
                    <h3 className="text-xl font-semibold">You're all set{form.name ? `, ${form.name.split(' ')[0]}` : ''}!</h3>
                    <p className="text-sm text-muted-foreground mt-1.5 max-w-sm mx-auto">Your career profile is saved. Every AI feature — resumes, ATS, interviews, coach — now understands your journey toward <span className="text-brand font-medium">{form.targetRole || 'your next role'}</span>.</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between p-4 border-t bg-muted/30">
              <Button variant="ghost" size="sm" onClick={() => setOnboarding(false)} disabled={saving}>Skip for now</Button>
              <div className="flex gap-2">
                {step > 0 && <Button variant="outline" size="sm" onClick={() => setStep(step - 1)} disabled={saving}><ChevronLeft className="h-4 w-4 flip-rtl" /> Back</Button>}
                {step < 3 ? (
                  <Button size="sm" onClick={() => setStep(step + 1)} disabled={!canNext} className="bg-brand text-brand-foreground hover:bg-brand/90">Continue <ChevronRight className="h-4 w-4 flip-rtl" /></Button>
                ) : (
                  <Button size="sm" onClick={finish} disabled={saving} className="bg-brand text-brand-foreground hover:bg-brand/90">{saving ? <Spinner /> : <Rocket className="h-4 w-4" />} Enter CareerOS</Button>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
