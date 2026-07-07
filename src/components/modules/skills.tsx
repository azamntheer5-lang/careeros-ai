'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { api } from '@/lib/api-client'
import { useApp } from '@/components/app-provider'
import { useToast } from '@/hooks/use-toast'
import { ModuleHeader } from '@/components/careeros/module-header'
import { Spinner } from '@/components/careeros/loading'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { GraduationCap, Sparkles, Target, AlertTriangle, BookOpen, Award, Clock, CheckCircle2, ArrowRight, Compass } from 'lucide-react'

type Analysis = {
  gaps: { skill: string; priority: string; gap: string }[]
  roadmap: { phase: string; duration: string; focus: string; actions: string[]; courses: { name: string; provider: string; reason: string }[] }[]
  certifications: { name: string; issuer: string; value: string }[]
  estimatedTimeToReady: string
}

export function SkillsModule() {
  const { t } = useApp()
  const { toast } = useToast()
  const [target, setTarget] = useState('Staff Software Engineer')
  const [skills, setSkills] = useState('TypeScript, React, Next.js, Node.js, PostgreSQL, AWS')
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [busy, setBusy] = useState(false)

  const run = async () => {
    if (!target.trim() || !skills.trim()) {
      toast({ title: 'Missing input', description: 'Provide your target role and current skills.', variant: 'destructive' })
      return
    }
    setBusy(true); setAnalysis(null)
    try {
      const { analysis } = await api<{ analysis: Analysis }>('/api/skills', {
        method: 'POST', body: { targetRole: target, currentSkills: skills },
      })
      setAnalysis(analysis)
    } catch (e) {
      toast({ title: 'Failed', description: (e as Error).message, variant: 'destructive' })
    } finally { setBusy(false) }
  }

  return (
    <div>
      <ModuleHeader title={t('skillsTitle')} subtitle={t('skillsSub')} icon={GraduationCap} />

      <Card className="mb-4">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr_auto] gap-3 items-end">
            <div>
              <Label className="text-xs text-muted-foreground">{t('targetRole')}</Label>
              <Input value={target} onChange={(e) => setTarget(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">{t('currentSkills')}</Label>
              <Textarea value={skills} onChange={(e) => setSkills(e.target.value)} rows={2} className="mt-1" />
            </div>
            <Button onClick={run} disabled={busy} className="bg-brand text-brand-foreground hover:bg-brand/90 rounded-full h-10">
              {busy ? <><Spinner /> {t('analyzing')}</> : <><Sparkles className="h-4 w-4" /> {t('runAnalysis')}</>}
            </Button>
          </div>
        </CardContent>
      </Card>

      {busy && (
        <Card>
          <CardContent className="p-8 flex flex-col items-center gap-3">
            <div className="relative"><div className="h-12 w-12 rounded-full border-4 border-brand/20 border-t-brand animate-spin" /></div>
            <p className="text-sm text-muted-foreground">Analyzing your skill landscape and building a roadmap…</p>
          </CardContent>
        </Card>
      )}

      {analysis && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          {/* Ready-in banner */}
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <div className="flex items-center gap-4 p-5 bg-gradient-to-r from-brand/10 to-transparent">
                <div className="h-12 w-12 rounded-xl bg-brand text-brand-foreground flex items-center justify-center"><Clock className="h-6 w-6" /></div>
                <div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wide">{t('readyIn')}</div>
                  <div className="text-xl font-semibold">{analysis.estimatedTimeToReady}</div>
                </div>
                <div className="ms-auto text-end">
                  <div className="text-xs text-muted-foreground">{analysis.gaps.length} gaps · {analysis.roadmap.length} phases</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Gaps */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-500" /> {t('skillGaps')}</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {analysis.gaps.map((g, i) => (
                  <div key={i} className="flex items-start gap-2.5 rounded-lg border p-3">
                    <Target className={`h-4 w-4 mt-0.5 ${g.priority === 'high' ? 'text-destructive' : g.priority === 'medium' ? 'text-amber-500' : 'text-brand'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{g.skill}</span>
                        <Badge variant="outline" className={`h-4 px-1 text-[9px] ${g.priority === 'high' ? 'border-destructive/40 text-destructive' : g.priority === 'medium' ? 'border-amber-500/40 text-amber-600' : 'border-brand/40 text-brand'}`}>{g.priority}</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">{g.gap}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Roadmap */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><Compass className="h-4 w-4 text-brand" /> {t('roadmap')}</CardTitle></CardHeader>
            <CardContent>
              <div className="relative ps-6">
                <div className="absolute start-2 top-2 bottom-2 w-0.5 bg-border" />
                {analysis.roadmap.map((phase, i) => (
                  <motion.div key={i} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }} className="relative pb-5 last:pb-0">
                    <div className="absolute -start-[18px] top-1 h-3.5 w-3.5 rounded-full bg-brand ring-4 ring-brand/20" />
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold">{phase.phase}</span>
                      <Badge variant="secondary" className="text-[10px]">{phase.duration}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">{phase.focus}</p>
                    <div className="space-y-1 mb-2">
                      {phase.actions.map((a, j) => (
                        <div key={j} className="flex items-start gap-1.5 text-xs"><CheckCircle2 className="h-3 w-3 text-brand mt-0.5 shrink-0" /><span>{a}</span></div>
                      ))}
                    </div>
                    {phase.courses.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {phase.courses.map((c, j) => (
                          <div key={j} className="flex items-center gap-1.5 rounded-md border bg-muted/30 px-2 py-1">
                            <BookOpen className="h-3 w-3 text-brand" />
                            <span className="text-[11px] font-medium">{c.name}</span>
                            <span className="text-[10px] text-muted-foreground">· {c.provider}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Certifications */}
          {analysis.certifications.length > 0 && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><Award className="h-4 w-4 text-brand" /> {t('recommendedCerts')}</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {analysis.certifications.map((c, i) => (
                    <div key={i} className="rounded-lg border p-3">
                      <div className="flex items-center gap-2">
                        <Award className="h-4 w-4 text-brand" />
                        <span className="text-sm font-medium">{c.name}</span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">{c.issuer}</div>
                      <div className="text-xs mt-1">{c.value}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </motion.div>
      )}
    </div>
  )
}
