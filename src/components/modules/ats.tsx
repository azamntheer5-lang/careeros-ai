'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { api } from '@/lib/api-client'
import { useApp } from '@/components/app-provider'
import { useToast } from '@/hooks/use-toast'
import { ModuleHeader } from '@/components/careeros/module-header'
import { Spinner } from '@/components/careeros/loading'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { ScanSearch, Sparkles, CheckCircle2, AlertTriangle, XCircle, TrendingUp, FileSearch, Target } from 'lucide-react'

type Analysis = {
  score: number; grade: string
  matchedKeywords: string[]; missingKeywords: string[]
  strengths: string[]; weaknesses: string[]
  formattingIssues: string[]
  recommendations: { priority: string; area: string; suggestion: string }[]
  readabilityScore: number; keywordScore: number; experienceScore: number
}

const GRADE_COLOR: Record<string, string> = {
  A: 'oklch(0.7 0.15 162)', B: 'oklch(0.7 0.13 200)', C: 'oklch(0.75 0.15 80)',
  D: 'oklch(0.7 0.16 50)', F: 'oklch(0.65 0.2 30)',
}

export function AtsModule() {
  const { t } = useApp()
  const { toast } = useToast()
  const [resumes, setResumes] = useState<{ id: string; title: string }[]>([])
  const [resumeId, setResumeId] = useState<string>('')
  const [resumeText, setResumeText] = useState('')
  const [job, setJob] = useState('')
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    api<{ resumes: any[] }>('/api/resumes').then(({ resumes }) => {
      setResumes(resumes.map((r) => ({ id: r.id, title: r.title })))
      if (resumes[0]) setResumeId(resumes[0].id)
    })
  }, [])

  const analyze = async () => {
    if (!job.trim() || (!resumeId && !resumeText.trim())) {
      toast({ title: 'Missing input', description: 'Select a resume and paste the job description.', variant: 'destructive' })
      return
    }
    setBusy(true); setAnalysis(null)
    try {
      const { analysis } = await api<{ analysis: Analysis }>('/api/ats', {
        method: 'POST', body: { resumeId: resumeId || undefined, resumeText: resumeText || undefined, jobDescription: job },
      })
      setAnalysis(analysis)
    } catch (e) {
      toast({ title: 'Analysis failed', description: (e as Error).message, variant: 'destructive' })
    } finally { setBusy(false) }
  }

  return (
    <div>
      <ModuleHeader title={t('atsTitle')} subtitle={t('atsSub')} icon={ScanSearch} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2"><FileSearch className="h-4 w-4 text-brand" /> Resume</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-xs text-muted-foreground">Source resume</Label>
              <Select value={resumeId} onValueChange={setResumeId}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select resume" /></SelectTrigger>
                <SelectContent>{resumes.map((r) => <SelectItem key={r.id} value={r.id}>{r.title}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">…or paste resume text directly</Label>
              <Textarea value={resumeText} onChange={(e) => setResumeText(e.target.value)} rows={6} placeholder="Optional — overrides the selected resume" className="mt-1" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2"><Target className="h-4 w-4 text-brand" /> {t('pasteJob')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea value={job} onChange={(e) => setJob(e.target.value)} rows={9} placeholder="Paste the full job description here — title, responsibilities, requirements…" />
            <Button onClick={analyze} disabled={busy} className="w-full bg-brand text-brand-foreground hover:bg-brand/90 rounded-full">
              {busy ? <><Spinner /> {t('analyzing')}</> : <><Sparkles className="h-4 w-4" /> {t('analyze')}</>}
            </Button>
          </CardContent>
        </Card>
      </div>

      {busy && (
        <Card className="mt-4">
          <CardContent className="p-8 flex flex-col items-center gap-3">
            <div className="relative">
              <div className="h-12 w-12 rounded-full border-4 border-brand/20 border-t-brand animate-spin" />
            </div>
            <p className="text-sm text-muted-foreground">{t('analyzing')} Reading your resume like an ATS…</p>
          </CardContent>
        </Card>
      )}

      {analysis && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mt-4 space-y-4">
          {/* Score hero */}
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <div className="grid grid-cols-1 md:grid-cols-[200px_1fr]">
                <div className="flex flex-col items-center justify-center p-6 border-b md:border-b-0 md:border-e" style={{ background: `linear-gradient(135deg, color-mix(in oklch, ${GRADE_COLOR[analysis.grade] || 'var(--brand)'} 16%, var(--card)), var(--card))` }}>
                  <ScoreRing score={analysis.score} color={GRADE_COLOR[analysis.grade] || 'var(--brand)'} />
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-2xl font-bold" style={{ color: GRADE_COLOR[analysis.grade] }}>{analysis.grade}</span>
                    <span className="text-xs text-muted-foreground">grade</span>
                  </div>
                </div>
                <div className="p-5">
                  <h3 className="text-sm font-semibold mb-3">{t('matchScore')} Breakdown</h3>
                  <div className="space-y-3">
                    <ScoreBar label={t('keywordMatch')} value={analysis.keywordScore} />
                    <ScoreBar label="Experience" value={analysis.experienceScore} />
                    <ScoreBar label="Readability" value={analysis.readabilityScore} />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Keywords */}
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Keywords</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <div className="text-xs text-muted-foreground mb-1.5">{t('matchedKeywords')}</div>
                  <div className="flex flex-wrap gap-1.5">
                    {analysis.matchedKeywords.length ? analysis.matchedKeywords.map((k, i) => (
                      <Badge key={i} className="bg-brand/15 text-brand border-brand/30 hover:bg-brand/20">{k}</Badge>
                    )) : <span className="text-xs text-muted-foreground">None</span>}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1.5">{t('missingKeywords')}</div>
                  <div className="flex flex-wrap gap-1.5">
                    {analysis.missingKeywords.length ? analysis.missingKeywords.map((k, i) => (
                      <Badge key={i} variant="outline" className="border-destructive/40 text-destructive">{k}</Badge>
                    )) : <span className="text-xs text-muted-foreground">None — great coverage!</span>}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Strengths & Weaknesses */}
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Assessment</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-medium text-brand mb-1.5"><CheckCircle2 className="h-3.5 w-3.5" /> {t('strengths')}</div>
                  <ul className="space-y-1">{analysis.strengths.map((s, i) => <li key={i} className="text-xs text-muted-foreground flex gap-1.5"><span className="text-brand">•</span>{s}</li>)}</ul>
                </div>
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-medium text-amber-500 mb-1.5"><AlertTriangle className="h-3.5 w-3.5" /> {t('weaknesses')}</div>
                  <ul className="space-y-1">{analysis.weaknesses.map((s, i) => <li key={i} className="text-xs text-muted-foreground flex gap-1.5"><span className="text-amber-500">•</span>{s}</li>)}</ul>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Formatting issues */}
          {analysis.formattingIssues.length > 0 && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><XCircle className="h-4 w-4 text-destructive" /> {t('formattingIssues')}</CardTitle></CardHeader>
              <CardContent>
                <ul className="space-y-1.5">{analysis.formattingIssues.map((s, i) => <li key={i} className="text-xs text-muted-foreground flex gap-1.5"><span className="text-destructive">!</span>{s}</li>)}</ul>
              </CardContent>
            </Card>
          )}

          {/* Recommendations */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><TrendingUp className="h-4 w-4 text-brand" /> {t('recommendations')}</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {analysis.recommendations.map((r, i) => (
                  <div key={i} className="flex items-start gap-3 rounded-lg border p-3">
                    <Badge className={
                      r.priority === 'high' ? 'bg-destructive/15 text-destructive border-destructive/30' :
                      r.priority === 'medium' ? 'bg-amber-500/15 text-amber-600 border-amber-500/30' :
                      'bg-brand/15 text-brand border-brand/30'
                    } variant="outline">{r.priority}</Badge>
                    <div>
                      <div className="text-sm font-medium">{r.area}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{r.suggestion}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  )
}

function ScoreRing({ score, color }: { score: number; color: string }) {
  const r = 34
  const circ = 2 * Math.PI * r
  const offset = circ - (score / 100) * circ
  return (
    <div className="relative h-24 w-24">
      <svg className="h-24 w-24 -rotate-90" viewBox="0 0 80 80">
        <circle cx="40" cy="40" r={r} fill="none" stroke="var(--muted)" strokeWidth="6" />
        <motion.circle
          cx="40" cy="40" r={r} fill="none" stroke={color} strokeWidth="6" strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold" style={{ color }}>{score}</span>
        <span className="text-[9px] text-muted-foreground uppercase tracking-wide">/ 100</span>
      </div>
    </div>
  )
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex justify-between text-xs mb-1"><span className="text-muted-foreground">{label}</span><span className="font-medium">{value}%</span></div>
      <Progress value={value} className="h-1.5" />
    </div>
  )
}
