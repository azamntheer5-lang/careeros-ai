'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { api } from '@/lib/api-client'
import { useAppStore } from '@/lib/store'
import { useApp } from '@/components/app-provider'
import { useProfile } from '@/components/careeros/profile-context'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Logo } from '@/components/careeros/logo'
import { Spinner } from '@/components/careeros/loading'
import { ChevronLeft, ChevronRight, Sparkles, Check, Target, Briefcase, GraduationCap, DollarSign, Heart, Rocket, Brain } from 'lucide-react'

const STEPS = [
  { id: 'experience', title: 'Experience', icon: Briefcase, desc: 'Tell us about your current role and years of experience.' },
  { id: 'skills', title: 'Skills', icon: Sparkles, desc: 'List your top skills (comma-separated).' },
  { id: 'goals', title: 'Goals', icon: Target, desc: 'What role are you targeting and what do you want to achieve?' },
  { id: 'industry', title: 'Industry', icon: GraduationCap, desc: 'Which industry and what is your preferred work setup?' },
  { id: 'salary', title: 'Salary', icon: DollarSign, desc: 'What are your salary expectations?' },
  { id: 'personality', title: 'Personality', icon: Heart, desc: 'How do you work best?' },
  { id: 'ambition', title: 'Ambition', icon: Rocket, desc: 'How ambitious is your career timeline?' },
]

const INDUSTRIES = ['Technology', 'Finance', 'Healthcare', 'Education', 'Media', 'Retail', 'Manufacturing', 'Government', 'Consulting', 'Other']
const WORK_MODES = ['remote', 'hybrid', 'onsite']
const PERSONALITIES = ['Analytical & data-driven', 'Creative & experimental', 'Collaborative & people-focused', 'Independent & deep-focus', 'Strategic & big-picture', 'Hands-on & execution-focused']
const TIMELINES = [{ id: '3m', label: '3 months — aggressive' }, { id: '6m', label: '6 months — ambitious' }, { id: '1y', label: '1 year — steady' }, { id: '2y', label: '2 years — patient' }, { id: '5y', label: '5 years — long-term' }]

export function AssessmentOnboarding({ onComplete }: { onComplete?: () => void }) {
  const { t } = useApp()
  const { setOnboarding, onboardingOpen } = useAppStore()
  const { save } = useProfile()
  const { toast } = useToast()
  const [step, setStep] = useState(0)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [form, setForm] = useState({
    currentRole: '', company: '', experienceYears: '', targetRole: '', skills: '',
    goals: '', industry: 'Technology', workMode: 'remote', location: '',
    targetSalary: '', personality: '', timeline: '1y', ambition: '',
  })

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }))

  const submit = async () => {
    setBusy(true)
    try {
      const answers = {
        currentRole: form.currentRole, company: form.company, experienceYears: Number(form.experienceYears) || 0,
        targetRole: form.targetRole, skills: form.skills.split(',').map((s) => s.trim()).filter(Boolean),
        goals: form.goals, industry: form.industry, workMode: form.workMode, location: form.location,
        targetSalary: form.targetSalary, personality: form.personality, timeline: form.timeline, ambition: form.ambition,
      }
      const { assessment } = await api<{ assessment: any }>('/api/assessment', { method: 'POST', body: answers })
      setResult(assessment.result)
      save({}) // refresh profile
      toast({ title: 'Career profile generated! 🎉', description: `Clarity score: ${assessment.result.score}/100` })
    } catch (e) {
      toast({ title: 'Assessment failed', description: (e as Error).message, variant: 'destructive' })
    } finally { setBusy(false) }
  }

  const close = () => { setOnboarding(false); onComplete?.() }

  if (!onboardingOpen && !result) return null

  return (
    <AnimatePresence>
      {(onboardingOpen || result) && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
          <motion.div initial={{ opacity: 0, scale: 0.96, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 12 }} transition={{ type: 'spring', stiffness: 240, damping: 24 }} className="w-full max-w-2xl rounded-3xl border border-border bg-card shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="relative overflow-hidden p-6 bg-gradient-to-br from-brand/15 via-card to-card border-b">
              <div className="absolute inset-0 grid-bg opacity-30" />
              <div className="relative flex items-center gap-3">
                <Logo size={36} />
                <div>
                  <div className="font-semibold tracking-tight">{t('assessment')}</div>
                  <div className="text-xs text-muted-foreground">{t('assessmentSub')}</div>
                </div>
              </div>
              {!result && (
                <div className="relative mt-5">
                  <div className="flex items-center gap-1.5">
                    {STEPS.map((_, i) => <div key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${i <= step ? 'bg-brand' : 'bg-muted'}`} />)}
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">Step {step + 1} of {STEPS.length} · {STEPS[step].title}</div>
                </div>
              )}
            </div>

            {/* Body */}
            <div className="p-6">
              {result ? (
                <ResultView result={result} onClose={close} />
              ) : (
                <AnimatePresence mode="wait">
                  <motion.div key={step} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} className="space-y-4">
                    {(() => {
                      const s = STEPS[step]; const Icon = s.icon
                      return (
                        <div>
                          <div className="flex items-center gap-2.5 mb-1">
                            <div className="h-9 w-9 rounded-lg bg-brand-soft text-brand flex items-center justify-center"><Icon className="h-4.5 w-4.5" /></div>
                            <h3 className="text-lg font-semibold">{s.title}</h3>
                          </div>
                          <p className="text-sm text-muted-foreground mb-4">{s.desc}</p>
                        </div>
                      )
                    })()}

                    {step === 0 && (
                      <div className="space-y-3">
                        <div><Label className="text-xs text-muted-foreground">Current role</Label><Input value={form.currentRole} onChange={(e) => set('currentRole', e.target.value)} placeholder="Senior Software Engineer" className="mt-1" /></div>
                        <div><Label className="text-xs text-muted-foreground">Company (optional)</Label><Input value={form.company} onChange={(e) => set('company', e.target.value)} placeholder="Acme Corp" className="mt-1" /></div>
                        <div><Label className="text-xs text-muted-foreground">Years of experience</Label><Input type="number" value={form.experienceYears} onChange={(e) => set('experienceYears', e.target.value)} placeholder="7" className="mt-1" /></div>
                      </div>
                    )}
                    {step === 1 && (
                      <div><Label className="text-xs text-muted-foreground">Top skills (comma-separated)</Label><Textarea value={form.skills} onChange={(e) => set('skills', e.target.value)} rows={4} placeholder="React, TypeScript, System Design, Leadership..." className="mt-1" /></div>
                    )}
                    {step === 2 && (
                      <div className="space-y-3">
                        <div><Label className="text-xs text-muted-foreground">Target role</Label><Input value={form.targetRole} onChange={(e) => set('targetRole', e.target.value)} placeholder="Staff Software Engineer" className="mt-1" /></div>
                        <div><Label className="text-xs text-muted-foreground">Career goals</Label><Textarea value={form.goals} onChange={(e) => set('goals', e.target.value)} rows={3} placeholder="Lead a platform team, architect systems used by millions..." className="mt-1" /></div>
                      </div>
                    )}
                    {step === 3 && (
                      <div className="grid grid-cols-2 gap-3">
                        <div><Label className="text-xs text-muted-foreground">Industry</Label>
                          <Select value={form.industry} onValueChange={(v) => set('industry', v)}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent>{INDUSTRIES.map((x) => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent></Select>
                        </div>
                        <div><Label className="text-xs text-muted-foreground">Work mode</Label>
                          <Select value={form.workMode} onValueChange={(v) => set('workMode', v)}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent>{WORK_MODES.map((x) => <SelectItem key={x} value={x} className="capitalize">{x}</SelectItem>)}</SelectContent></Select>
                        </div>
                        <div className="col-span-2"><Label className="text-xs text-muted-foreground">Location</Label><Input value={form.location} onChange={(e) => set('location', e.target.value)} placeholder="San Francisco, CA" className="mt-1" /></div>
                      </div>
                    )}
                    {step === 4 && (
                      <div><Label className="text-xs text-muted-foreground">Target salary</Label><Input value={form.targetSalary} onChange={(e) => set('targetSalary', e.target.value)} placeholder="$220k" className="mt-1" /></div>
                    )}
                    {step === 5 && (
                      <div className="space-y-2">
                        {PERSONALITIES.map((p) => (
                          <button key={p} onClick={() => set('personality', p)} className={`flex w-full items-center gap-2.5 rounded-lg border p-3 text-start text-sm transition ${form.personality === p ? 'border-brand bg-brand-soft' : 'hover:bg-accent'}`}>
                            <div className={`h-4 w-4 rounded-full border-2 ${form.personality === p ? 'bg-brand border-brand' : 'border-muted-foreground/40'}`} />
                            {p}
                          </button>
                        ))}
                      </div>
                    )}
                    {step === 6 && (
                      <div className="space-y-3">
                        <div><Label className="text-xs text-muted-foreground">Timeline ambition</Label>
                          <Select value={form.timeline} onValueChange={(v) => set('timeline', v)}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent>{TIMELINES.map((x) => <SelectItem key={x.id} value={x.id}>{x.label}</SelectItem>)}</SelectContent></Select>
                        </div>
                        <div><Label className="text-xs text-muted-foreground">What drives your ambition? (optional)</Label><Textarea value={form.ambition} onChange={(e) => set('ambition', e.target.value)} rows={2} placeholder="I want to build systems that scale to millions of users..." className="mt-1" /></div>
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              )}
            </div>

            {/* Footer */}
            {!result && (
              <div className="flex items-center justify-between p-4 border-t bg-muted/30">
                <Button variant="ghost" size="sm" onClick={close}>Skip</Button>
                <div className="flex gap-2">
                  {step > 0 && <Button variant="outline" size="sm" onClick={() => setStep(step - 1)}><ChevronLeft className="h-4 w-4 flip-rtl" /> Back</Button>}
                  {step < STEPS.length - 1 ? (
                    <Button size="sm" onClick={() => setStep(step + 1)} className="bg-brand text-brand-foreground hover:bg-brand/90">Continue <ChevronRight className="h-4 w-4 flip-rtl" /></Button>
                  ) : (
                    <Button size="sm" onClick={submit} disabled={busy} className="bg-brand text-brand-foreground hover:bg-brand/90">{busy ? <><Spinner /> Generating…</> : <><Sparkles className="h-4 w-4" /> Generate my profile</>}</Button>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function ResultView({ result, onClose }: { result: any; onClose: () => void }) {
  const { t } = useApp()
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200 }} className="mx-auto h-16 w-16 rounded-full bg-brand-soft text-brand flex items-center justify-center mb-3">
        <Brain className="h-8 w-8" />
      </motion.div>
      <h3 className="text-xl font-semibold mb-1">Your career profile is ready</h3>
      <p className="text-sm text-muted-foreground mb-4">AI synthesized your answers into a complete professional identity.</p>

      <div className="grid grid-cols-2 gap-3 text-start mb-4">
        <div className="rounded-lg border p-3"><div className="text-[10px] text-muted-foreground uppercase">Target role</div><div className="font-medium text-sm">{result.targetRole || '—'}</div></div>
        <div className="rounded-lg border p-3"><div className="text-[10px] text-muted-foreground uppercase">Career stage</div><div className="font-medium text-sm">{result.careerStage || '—'}</div></div>
        <div className="rounded-lg border p-3"><div className="text-[10px] text-muted-foreground uppercase">Personality</div><div className="font-medium text-sm">{result.personality?.archetype || '—'}</div></div>
        <div className="rounded-lg border p-3"><div className="text-[10px] text-muted-foreground uppercase">Clarity score</div><div className="font-medium text-sm text-brand">{result.score}/100</div></div>
      </div>

      {result.brandStatement && <p className="text-sm italic text-muted-foreground mb-3 p-3 rounded-lg bg-muted/30">"{result.brandStatement}"</p>}

      {result.ninetyDayPriorities?.length > 0 && (
        <div className="text-start mb-4">
          <div className="text-xs font-semibold mb-2">Your 90-day priorities</div>
          {result.ninetyDayPriorities.map((p: string, i: number) => <div key={i} className="flex items-start gap-2 text-xs mb-1"><Check className="h-3.5 w-3.5 text-brand mt-0.5" />{p}</div>)}
        </div>
      )}

      {result.strengths?.length > 0 && (
        <div className="flex flex-wrap gap-1.5 justify-center mb-4">
          {result.strengths.map((s: string, i: number) => <Badge key={i} className="bg-brand/15 text-brand border-brand/30">{s}</Badge>)}
        </div>
      )}

      <Button onClick={onClose} className="w-full bg-brand text-brand-foreground hover:bg-brand/90 rounded-full"><Rocket className="h-4 w-4" /> Enter CareerOS</Button>
    </motion.div>
  )
}
