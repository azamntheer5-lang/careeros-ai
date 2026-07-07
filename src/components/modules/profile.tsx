'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { UserCircle2, Target, MapPin, DollarSign, Link2, Sparkles, Save, Plus, X, Rocket, ShieldCheck } from 'lucide-react'

const SENIORITY = ['junior', 'mid', 'senior', 'staff', 'principal', 'lead', 'director', 'vp', 'c-suite']
const WORK_MODES = ['remote', 'hybrid', 'onsite']
const TIMELINES = ['3m', '6m', '1y', '2y', '5y']
const INDUSTRIES = ['Technology', 'Finance', 'Healthcare', 'Education', 'Media', 'Retail', 'Manufacturing', 'Government', 'Consulting', 'Other']

export function ProfileModule() {
  const { t } = useApp()
  const { profile, loading, save, user } = useProfile()
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<any>(null)
  const [strengthInput, setStrengthInput] = useState('')
  const [valueInput, setValueInput] = useState('')

  // sync form when profile loads
  useEffect(() => {
    if (profile && (!form || form._id !== profile.id)) {
      setForm({ _id: profile.id, ...profile, name: user?.name || '', headline: user?.headline || '' })
    }
  }, [profile, user, form])

  if (loading || !form) {
    return <div className="flex justify-center py-20"><Spinner className="h-6 w-6 text-brand" /></div>
  }

  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }))

  const saveAll = async () => {
    setSaving(true)
    try {
      await save({
        targetRole: form.targetRole, industry: form.industry, seniority: form.seniority,
        experienceYears: form.experienceYears ? Number(form.experienceYears) : null,
        targetSalary: form.targetSalary, location: form.location, workMode: form.workMode,
        careerGoals: form.careerGoals, timeline: form.timeline, linkedinUrl: form.linkedinUrl,
        githubUrl: form.githubUrl, portfolioUrl: form.portfolioUrl, brandStatement: form.brandStatement,
        strengths: form.strengths, values: form.values, name: form.name, headline: form.headline,
      })
      toast({ title: 'Profile saved', description: 'Every AI feature is now personalized to you.' })
    } catch (e) {
      toast({ title: 'Save failed', description: (e as Error).message, variant: 'destructive' })
    } finally { setSaving(false) }
  }

  const completeness = calcCompleteness(form)

  return (
    <div>
      <ModuleHeader
        title={t('profileTitle')}
        subtitle={t('profileSub')}
        icon={UserCircle2}
        actions={
          <Button onClick={saveAll} disabled={saving} className="rounded-full bg-brand text-brand-foreground hover:bg-brand/90">
            {saving ? <Spinner /> : <Save className="h-4 w-4" />} {t('save')}
          </Button>
        }
      />

      {/* Completeness banner */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mb-5">
        <Card className="overflow-hidden border-brand/20">
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className="relative h-14 w-14 shrink-0">
                <svg className="h-14 w-14 -rotate-90" viewBox="0 0 56 56">
                  <circle cx="28" cy="28" r="22" fill="none" stroke="var(--muted)" strokeWidth="5" />
                  <motion.circle cx="28" cy="28" r="22" fill="none" stroke="var(--brand)" strokeWidth="5" strokeLinecap="round"
                    strokeDasharray={2 * Math.PI * 22} initial={{ strokeDashoffset: 2 * Math.PI * 22 }}
                    animate={{ strokeDashoffset: 2 * Math.PI * 22 * (1 - completeness / 100) }} transition={{ duration: 0.8 }} />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center text-sm font-bold text-brand">{completeness}%</div>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-brand" />
                  <span className="text-sm font-semibold">Profile completeness</span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{completeness >= 80 ? 'Excellent — your AI is fully personalized.' : completeness >= 50 ? 'Good progress — add more to unlock richer AI.' : 'Complete your profile to power every AI feature.'}</p>
              </div>
              <div className="hidden sm:flex items-center gap-1.5 text-xs text-brand">
                <ShieldCheck className="h-3.5 w-3.5" /> Private to you
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Identity */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><UserCircle2 className="h-4 w-4 text-brand" /> Identity</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Field label="Full name" value={form.name} onChange={(v) => set('name', v)} />
            <Field label="Headline" value={form.headline || ''} onChange={(v) => set('headline', v)} placeholder="e.g. Senior Engineer → Staff" />
            <div className="grid grid-cols-2 gap-3">
              <SelectField label="Seniority" value={form.seniority || ''} options={SENIORITY} onChange={(v) => set('seniority', v)} />
              <Field label="Years of experience" type="number" value={form.experienceYears ?? ''} onChange={(v) => set('experienceYears', v)} />
            </div>
          </CardContent>
        </Card>

        {/* Target */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><Target className="h-4 w-4 text-brand" /> Career Target</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Field label="Target role" value={form.targetRole || ''} onChange={(v) => set('targetRole', v)} placeholder="e.g. Staff Software Engineer" />
            <div className="grid grid-cols-2 gap-3">
              <SelectField label="Industry" value={form.industry || ''} options={INDUSTRIES} onChange={(v) => set('industry', v)} />
              <SelectField label="Timeline" value={form.timeline || ''} options={TIMELINES} onChange={(v) => set('timeline', v)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Target salary" value={form.targetSalary || ''} onChange={(v) => set('targetSalary', v)} placeholder="$220k" icon={DollarSign} />
              <SelectField label="Work mode" value={form.workMode || ''} options={WORK_MODES} onChange={(v) => set('workMode', v)} />
            </div>
          </CardContent>
        </Card>

        {/* Location & links */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><Link2 className="h-4 w-4 text-brand" /> Presence</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Field label="Location" value={form.location || ''} onChange={(v) => set('location', v)} placeholder="San Francisco, CA" icon={MapPin} />
            <Field label="LinkedIn URL" value={form.linkedinUrl || ''} onChange={(v) => set('linkedinUrl', v)} placeholder="linkedin.com/in/you" />
            <Field label="GitHub URL" value={form.githubUrl || ''} onChange={(v) => set('githubUrl', v)} placeholder="github.com/you" />
            <Field label="Portfolio URL" value={form.portfolioUrl || ''} onChange={(v) => set('portfolioUrl', v)} placeholder="yoursite.dev" />
          </CardContent>
        </Card>

        {/* Goals & brand */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><Rocket className="h-4 w-4 text-brand" /> Goals & Narrative</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-xs text-muted-foreground">Career goals</Label>
              <Textarea value={form.careerGoals || ''} onChange={(e) => set('careerGoals', e.target.value)} rows={3} placeholder="What do you want to achieve in the next 1-2 years?" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Brand statement</Label>
              <Textarea value={form.brandStatement || ''} onChange={(e) => set('brandStatement', e.target.value)} rows={2} placeholder="One sentence that captures your professional identity." className="mt-1" />
            </div>
          </CardContent>
        </Card>

        {/* Strengths & values */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Strengths & Values</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground">Core strengths</Label>
              <div className="flex flex-wrap gap-1.5 my-2 min-h-[28px]">
                {(form.strengths || []).map((s: string, i: number) => (
                  <Badge key={i} variant="secondary" className="gap-1 pr-1">{s}<button onClick={() => set('strengths', form.strengths.filter((_: string, j: number) => j !== i))}><X className="h-3 w-3" /></button></Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input value={strengthInput} onChange={(e) => setStrengthInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && strengthInput.trim()) { set('strengths', [...(form.strengths || []), strengthInput.trim()]); setStrengthInput('') } }} placeholder="Add a strength" className="h-8 text-sm" />
                <Button size="sm" variant="outline" onClick={() => { if (strengthInput.trim()) { set('strengths', [...(form.strengths || []), strengthInput.trim()]); setStrengthInput('') } }}><Plus className="h-3.5 w-3.5" /></Button>
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Work values</Label>
              <div className="flex flex-wrap gap-1.5 my-2 min-h-[28px]">
                {(form.values || []).map((s: string, i: number) => (
                  <Badge key={i} variant="outline" className="gap-1 pr-1">{s}<button onClick={() => set('values', form.values.filter((_: string, j: number) => j !== i))}><X className="h-3 w-3" /></button></Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input value={valueInput} onChange={(e) => setValueInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && valueInput.trim()) { set('values', [...(form.values || []), valueInput.trim()]); setValueInput('') } }} placeholder="Add a value" className="h-8 text-sm" />
                <Button size="sm" variant="outline" onClick={() => { if (valueInput.trim()) { set('values', [...(form.values || []), valueInput.trim()]); setValueInput('') } }}><Plus className="h-3.5 w-3.5" /></Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function Field({ label, value, onChange, placeholder, type = 'text', icon: Icon }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string; icon?: any }) {
  return (
    <div>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="relative mt-1">
        {Icon && <Icon className="absolute start-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />}
        <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={`h-9 ${Icon ? 'ps-8' : ''}`} />
      </div>
    </div>
  )
}

function SelectField({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <div>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Select value={value || '__none'} onValueChange={(v) => onChange(v === '__none' ? '' : v)}>
        <SelectTrigger className="mt-1 h-9"><SelectValue placeholder="Select…" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="__none">—</SelectItem>
          {options.map((o) => <SelectItem key={o} value={o} className="capitalize">{o}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  )
}

function calcCompleteness(p: any): number {
  const fields = ['name', 'headline', 'targetRole', 'industry', 'seniority', 'experienceYears', 'location', 'workMode', 'careerGoals', 'brandStatement', 'linkedinUrl']
  let filled = 0
  for (const f of fields) if (p[f] !== null && p[f] !== undefined && p[f] !== '' && p[f] !== 0) filled++
  if ((p.strengths || []).length >= 3) filled++
  return Math.round((filled / (fields.length + 1)) * 100)
}
