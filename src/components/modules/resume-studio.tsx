'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
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
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Sparkles, Wand2, FileText, Target, AlertCircle, CheckCircle2, Copy,
  Download, Globe, Zap, ChevronRight, RefreshCw, ArrowUp, ArrowDown,
  Trash2, Copy as Duplicate, Brain, Award, Languages, FileType, Save,
} from 'lucide-react'

// ─── Types ─────────────────────────────────────────────────────────

type StudioResult = {
  resume: any
  evaluation?: {
    overall: number
    metrics: { name: string; score: number; details: string; passed: boolean }[]
    hallucinations: string[]
    missingFields: string[]
    recommendations: string[]
  }
  score?: {
    overall: number
    atsScore: number
    completeness: number
    keywordScore: number
    formattingScore: number
    dimensions: { name: string; score: number; status: string }[]
    quickWins: string[]
    missingCritical: string[]
  }
  missingInfo: { field: string; question: string; priority: string; suggestion: string | null }[]
  keywords: {
    detected: string[]
    suggested: string[]
    industryTerms: string[]
    actionVerbs: string[]
    missingActionVerbs: string[]
  }
  warnings: string[]
  enrichmentNotes: string[]
  detectedLanguage: string
  wasEnriched: boolean
  profession?: string
  seniority?: string
  industry?: string
  confidence?: Record<string, 'high' | 'medium' | 'low'>
  aiCalls?: number
  tokensUsed?: number
  latencyMs?: number
}

type PipelineStage = 'idle' | 'parsing' | 'enriching' | 'optimizing' | 'scoring' | 'done'

const STAGES: { id: PipelineStage; label: string; icon: any }[] = [
  { id: 'parsing', label: 'OCR cleanup & language detection', icon: FileText },
  { id: 'enriching', label: 'AI parsing & enrichment', icon: Sparkles },
  { id: 'optimizing', label: 'Dedup & ATS optimization', icon: Target },
  { id: 'scoring', label: 'Quality scoring & keywords', icon: Award },
  { id: 'done', label: 'Complete', icon: CheckCircle2 },
]

// ─── Component ─────────────────────────────────────────────────────

export function ResumeStudioModule() {
  const { t } = useApp()
  const { toast } = useToast()
  const [rawText, setRawText] = useState('')
  const [jobDescription, setJobDescription] = useState('')
  const [showJD, setShowJD] = useState(false)
  const [result, setResult] = useState<StudioResult | null>(null)
  const [stage, setStage] = useState<PipelineStage>('idle')
  const [activeTab, setActiveTab] = useState('preview')
  const [sectionBusy, setSectionBusy] = useState<string | null>(null)
  const [undoStack, setUndoStack] = useState<StudioResult[]>([])
  const [saved, setSaved] = useState(false)
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([])

  // Clear all pending timers on unmount
  useEffect(() => () => { timersRef.current.forEach(clearTimeout); timersRef.current = [] }, [])

  const generate = async () => {
    if (!rawText.trim()) {
      toast({ title: 'Text required', description: 'Paste your raw text to generate a resume.', variant: 'destructive' })
      return
    }
    setResult(null)
    setUndoStack([])
    setSaved(false)
    setStage('parsing')

    // Animate through stages with realistic timing. Timers are tracked so they
    // can be cleared when the API returns (prevents stuck/wrong stage display).
    const stageTimers: [PipelineStage, number][] = [
      ['enriching', 4000],
      ['optimizing', 12000],
      ['scoring', 22000],
    ]
    timersRef.current.forEach(clearTimeout)
    timersRef.current = stageTimers.map(([s, ms]) => setTimeout(() => setStage(s), ms))

    try {
      const res = await api<StudioResult>('/api/desktop/generate-resume-v2', {
        method: 'POST',
        body: { rawText, jobDescription: jobDescription || undefined, runQualityCheck: false },
      })
      // Clear any pending stage timers — the real result is ready
      timersRef.current.forEach(clearTimeout)
      timersRef.current = []
      setResult(res)
      setStage('done')
      setActiveTab('preview')
      const overall = res.evaluation?.overall ?? res.score?.overall ?? 0
      toast({ title: 'Resume generated! 🎉', description: `Overall score: ${overall}/100 — ${res.aiCalls ?? 1} AI call, ${res.latencyMs ?? 0}ms` })
    } catch (e) {
      timersRef.current.forEach(clearTimeout)
      timersRef.current = []
      toast({ title: 'Generation failed', description: (e as Error).message, variant: 'destructive' })
      setStage('idle')
    }
  }

  const rewriteSection = async (section: string, content: any) => {
    if (!result) return
    setSectionBusy(section)
    // Push current state to undo stack before modifying
    setUndoStack((stack) => [...stack, result])
    try {
      const { result: rewritten } = await api<{ result: any }>('/api/desktop/rewrite-section', {
        method: 'POST', body: { section, content, jobDescription: jobDescription || undefined },
      })
      setResult((prev) => prev ? { ...prev, resume: { ...prev.resume, [section]: rewritten }, wasEnriched: true } : prev)
      setSaved(false) // Mark as unsaved after edit
      toast({ title: 'Section rewritten', description: `${section} updated with AI. Undo available.` })
    } catch (e) {
      // Rollback undo stack on failure
      setUndoStack((stack) => stack.slice(0, -1))
      toast({ title: 'Rewrite failed', description: (e as Error).message, variant: 'destructive' })
    }
    setSectionBusy(null)
  }

  const undo = () => {
    setUndoStack((stack) => {
      if (stack.length === 0) return stack
      const prev = stack[stack.length - 1]
      setResult(prev)
      setSaved(false)
      toast({ title: 'Undone', description: 'Reverted to previous version.' })
      return stack.slice(0, -1)
    })
  }

  const saveResume = async () => {
    if (!result) return
    setSectionBusy('save')
    try {
      const name = result.resume?.contact?.name || 'Untitled'
      await api('/api/resumes', {
        method: 'POST',
        body: { title: `${name} — AI Generated`, template: 'modern', accent: 'emerald', data: result.resume },
      })
      setSaved(true)
      toast({ title: 'Saved! ✅', description: 'Resume saved to your library. Find it in Resume Engine.' })
    } catch (e) {
      toast({ title: 'Save failed', description: (e as Error).message, variant: 'destructive' })
    }
    setSectionBusy(null)
  }

  const translateResume = async (targetLang: 'ar' | 'en') => {
    if (!result) return
    setSectionBusy('translate')
    try {
      const { resume: translated } = await api<{ resume: any }>('/api/desktop/translate-resume', {
        method: 'POST', body: { resume: result.resume, targetLang },
      })
      setResult({ ...result, resume: translated })
      toast({ title: 'Resume translated', description: `Translated to ${targetLang === 'ar' ? 'Arabic' : 'English'}.` })
    } catch (e) {
      toast({ title: 'Translation failed', description: (e as Error).message, variant: 'destructive' })
    }
    setSectionBusy(null)
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({ title: 'Copied', description: 'Content copied to clipboard.' })
  }

  const exportJSON = () => {
    if (!result) return
    const blob = new Blob([JSON.stringify(result.resume, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'resume.json'; a.click()
    URL.revokeObjectURL(url)
  }

  const exportMarkdown = () => {
    if (!result) return
    const r = result.resume
    let md = `# ${r.contact?.name || 'Resume'}\n\n`
    if (r.contact?.email) md += `📧 ${r.contact.email} | `
    if (r.contact?.phone) md += `📱 ${r.contact.phone} | `
    if (r.contact?.location) md += `📍 ${r.contact.location}\n\n`
    if (r.objective) md += `## Objective\n${r.objective}\n\n`
    if (r.experience?.length) {
      md += `## Experience\n`
      r.experience.forEach((e: any) => {
        md += `### ${e.title || ''} — ${e.company || ''}\n${e.startDate || ''} - ${e.endDate || ''}\n`
        e.bullets?.forEach((b: string) => { md += `- ${b}\n` })
        md += '\n'
      })
    }
    if (r.education?.length) {
      md += `## Education\n`
      r.education.forEach((e: any) => { md += `### ${e.degree || ''} — ${e.school || ''}\n${e.startDate || ''} - ${e.endDate || ''}\n\n` })
    }
    if (r.skills?.technical?.length) md += `## Technical Skills\n${r.skills.technical.join(', ')}\n\n`
    if (r.skills?.soft?.length) md += `## Soft Skills\n${r.skills.soft.join(', ')}\n\n`
    if (r.skills?.languages?.length) md += `## Languages\n${r.skills.languages.map((l: any) => `${l.language}: ${l.level}`).join(', ')}\n\n`
    if (r.courses?.length) {
      md += `## Courses\n`
      r.courses.forEach((c: any) => { md += `- ${c.name} (${c.provider || ''}, ${c.hours || ''}, ${c.date || ''})\n` })
    }

    const blob = new Blob([md], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'resume.md'; a.click()
    URL.revokeObjectURL(url)
  }

  const scoreColor = (score: number) => score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444'

  return (
    <div>
      <ModuleHeader title={t('studioTitle')} subtitle={t('studioSub')} icon={Sparkles}
        actions={result && stage === 'done' && (
          <div className="flex flex-wrap gap-2">
            {undoStack.length > 0 && (
              <Button variant="outline" size="sm" className="rounded-full" onClick={undo} title="Undo last change">
                <ArrowUp className="h-3.5 w-3.5" /> Undo
              </Button>
            )}
            <Button variant={saved ? 'outline' : 'default'} size="sm" className="rounded-full" onClick={saveResume} disabled={sectionBusy === 'save' || saved}>
              {sectionBusy === 'save' ? <Spinner /> : saved ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Save className="h-3.5 w-3.5" />}
              {saved ? 'Saved' : 'Save'}
            </Button>
            <Button variant="outline" size="sm" className="rounded-full" onClick={exportJSON}><Download className="h-3.5 w-3.5" /> JSON</Button>
            <Button variant="outline" size="sm" className="rounded-full" onClick={exportMarkdown}><FileType className="h-3.5 w-3.5" /> MD</Button>
            <Button variant="outline" size="sm" className="rounded-full" onClick={() => window.print()}><FileText className="h-3.5 w-3.5" /> PDF</Button>
          </div>
        )}
      />

      {/* Input section — shows when no result or during generation */}
      <AnimatePresence mode="wait">
        {stage === 'idle' && !result && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <Card className="mb-4">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-3">
                  <Brain className="h-5 w-5 text-brand" />
                  <h3 className="font-semibold">Paste anything — we'll build a professional resume</h3>
                </div>
                <Textarea
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  rows={10}
                  placeholder="Paste your raw text here: WhatsApp export, OCR scan, LinkedIn copy, notes, old resume, mixed Arabic+English…"
                  className="mb-3"
                />
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <Badge variant="secondary" className="text-[10px]">📄 OCR text</Badge>
                  <Badge variant="secondary" className="text-[10px]">💬 WhatsApp export</Badge>
                  <Badge variant="secondary" className="text-[10px]">🌐 Bilingual AR/EN</Badge>
                  <Badge variant="secondary" className="text-[10px]">📋 LinkedIn copy</Badge>
                  <Badge variant="secondary" className="text-[10px]">📝 Random notes</Badge>
                  <Badge variant="secondary" className="text-[10px]">🔧 Broken formatting</Badge>
                </div>

                {showJD && (
                  <div className="mb-3">
                    <Label className="text-xs text-muted-foreground">Job description (optional — enables ATS optimization)</Label>
                    <Textarea value={jobDescription} onChange={(e) => setJobDescription(e.target.value)} rows={4} className="mt-1" placeholder="Paste the job description for ATS keyword matching…" />
                  </div>
                )}
                {!showJD && (
                  <Button variant="ghost" size="sm" className="text-xs mb-3" onClick={() => setShowJD(true)}>
                    <Target className="h-3 w-3" /> Add job description for ATS optimization
                  </Button>
                )}

                <Button onClick={generate} disabled={!rawText.trim()} className="w-full bg-brand text-brand-foreground hover:bg-brand/90 rounded-full h-12 text-base">
                  <Wand2 className="h-5 w-5" /> Generate Professional Resume
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Pipeline progress */}
        {stage !== 'idle' && stage !== 'done' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Card>
              <CardContent className="p-8">
                <div className="space-y-4">
                  {STAGES.filter(s => s.id !== 'done').map((s, i) => {
                    const isActive = stage === s.id
                    const isPast = STAGES.findIndex(x => x.id === stage) > i
                    const Icon = s.icon
                    return (
                      <motion.div key={s.id} className="flex items-center gap-3"
                        animate={{ opacity: isActive ? 1 : isPast ? 0.5 : 0.3 }}>
                        <div className={`h-10 w-10 rounded-full flex items-center justify-center ${isActive ? 'bg-brand text-brand-foreground' : isPast ? 'bg-brand/20 text-brand' : 'bg-muted text-muted-foreground'}`}>
                          {isActive ? <Spinner /> : isPast ? <CheckCircle2 className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                        </div>
                        <div>
                          <div className="text-sm font-medium">{s.label}</div>
                          {isActive && <div className="text-xs text-brand">Processing…</div>}
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Results */}
        {result && stage === 'done' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            {/* Pipeline metadata bar */}
            <div className="flex flex-wrap items-center gap-2 mb-4 text-xs">
              {result.profession && <Badge variant="secondary">{result.profession}</Badge>}
              {result.seniority && <Badge variant="secondary">{result.seniority}</Badge>}
              {result.industry && <Badge variant="secondary">{result.industry}</Badge>}
              <Badge variant="outline" className="uppercase">{result.detectedLanguage}</Badge>
              {result.wasEnriched && <Badge className="bg-brand/15 text-brand border-brand/30"><Sparkles className="h-3 w-3" /> AI Enriched</Badge>}
              {result.aiCalls != null && <Badge variant="outline">{result.aiCalls} AI call{result.aiCalls !== 1 ? 's' : ''}</Badge>}
              {result.latencyMs != null && <Badge variant="outline">{(result.latencyMs / 1000).toFixed(1)}s</Badge>}
            </div>

            {/* Warnings (if any) */}
            {result.warnings?.length > 0 && (
              <Card className="mb-4 border-amber-500/30 bg-amber-500/5">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2 mb-1"><AlertCircle className="h-4 w-4 text-amber-500" /><span className="text-sm font-semibold text-amber-700 dark:text-amber-400">Attention Needed</span></div>
                  {result.warnings.map((w, i) => <div key={i} className="text-xs text-amber-700 dark:text-amber-400/80 flex gap-1.5"><span>•</span>{w}</div>)}
                </CardContent>
              </Card>
            )}

            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full max-w-2xl grid-cols-5 mb-4">
                <TabsTrigger value="preview">Preview</TabsTrigger>
                <TabsTrigger value="score">Score</TabsTrigger>
                <TabsTrigger value="keywords">Keywords</TabsTrigger>
                <TabsTrigger value="confidence">Confidence</TabsTrigger>
                <TabsTrigger value="missing">Missing Info</TabsTrigger>
              </TabsList>

              {/* ─── Preview Tab ─── */}
              <TabsContent value="preview" className="space-y-4">
                <div className="flex flex-wrap gap-2 mb-2">
                  <Button variant="outline" size="sm" className="rounded-full" onClick={() => translateResume('ar')} disabled={sectionBusy === 'translate'}>
                    {sectionBusy === 'translate' ? <Spinner /> : <Languages className="h-3.5 w-3.5" />} Translate to Arabic
                  </Button>
                  <Button variant="outline" size="sm" className="rounded-full" onClick={() => translateResume('en')} disabled={sectionBusy === 'translate'}>
                    <Languages className="h-3.5 w-3.5" /> Translate to English
                  </Button>
                  <Button variant="outline" size="sm" className="rounded-full" onClick={() => { setResult(null); setStage('idle'); setRawText('') }}>
                    <RefreshCw className="h-3.5 w-3.5" /> New Resume
                  </Button>
                </div>

                {/* Resume Preview Card */}
                <Card className="overflow-hidden">
                  <CardContent className="p-0">
                    <div className="bg-white text-neutral-900 p-6 sm:p-8 text-sm" style={{ fontFamily: 'var(--font-geist-sans)' }}>
                      {/* Header */}
                      <header className="border-b-2 pb-3 mb-4" style={{ borderColor: '#10b981' }}>
                        <h1 className="text-2xl font-bold">{result.resume.contact?.name || 'Your Name'}</h1>
                        <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-neutral-600 mt-1">
                          {result.resume.contact?.email && <span>{result.resume.contact.email}</span>}
                          {result.resume.contact?.phone && <span>· {result.resume.contact.phone}</span>}
                          {result.resume.contact?.location && <span>· {result.resume.contact.location}</span>}
                          {result.resume.contact?.linkedin && <span>· {result.resume.contact.linkedin}</span>}
                        </div>
                      </header>

                      {/* Objective */}
                      {result.resume.objective && (
                        <SectionCard title="Objective" onRewrite={() => rewriteSection('objective', result.resume.objective)} busy={sectionBusy === 'objective'} onCopy={() => copyToClipboard(result.resume.objective)}>
                          <p className="text-neutral-700">{result.resume.objective}</p>
                        </SectionCard>
                      )}

                      {/* Experience */}
                      {result.resume.experience?.length > 0 && (
                        <SectionCard title="Experience" onRewrite={() => rewriteSection('experience', result.resume.experience)} busy={sectionBusy === 'experience'} onCopy={() => copyToClipboard(JSON.stringify(result.resume.experience))}>
                          <div className="space-y-3">
                            {result.resume.experience.map((exp: any, i: number) => (
                              <div key={i}>
                                <div className="flex items-baseline justify-between">
                                  <span className="font-semibold">{exp.title || 'Role'}</span>
                                  <span className="text-xs text-neutral-500">{exp.startDate} – {exp.endDate}</span>
                                </div>
                                {exp.company && <div className="text-neutral-600 text-xs">{exp.company}</div>}
                                <ul className="list-disc ps-4 mt-1 space-y-0.5 text-neutral-700">
                                  {exp.bullets?.map((b: string, j: number) => <li key={j}>{b}</li>)}
                                </ul>
                              </div>
                            ))}
                          </div>
                        </SectionCard>
                      )}

                      {/* Education */}
                      {result.resume.education?.length > 0 && (
                        <SectionCard title="Education" onRewrite={() => rewriteSection('education', result.resume.education)} busy={sectionBusy === 'education'} onCopy={() => copyToClipboard(JSON.stringify(result.resume.education))}>
                          {result.resume.education.map((ed: any, i: number) => (
                            <div key={i} className="mb-1.5">
                              <span className="font-semibold">{ed.degree || 'Degree'}</span>
                              <span className="text-neutral-600"> · {ed.school || 'School'}</span>
                              <div className="text-xs text-neutral-500">{ed.startDate} – {ed.endDate}</div>
                            </div>
                          ))}
                        </SectionCard>
                      )}

                      {/* Skills */}
                      {result.resume.skills && (
                        <SectionCard title="Skills" onRewrite={() => rewriteSection('skills', result.resume.skills)} busy={sectionBusy === 'skills'} onCopy={() => copyToClipboard(JSON.stringify(result.resume.skills))}>
                          {result.resume.skills.technical?.length > 0 && (
                            <div className="mb-2">
                              <span className="text-xs font-bold uppercase text-neutral-500">Technical: </span>
                              <span className="text-neutral-700">{result.resume.skills.technical.join(', ')}</span>
                            </div>
                          )}
                          {result.resume.skills.soft?.length > 0 && (
                            <div className="mb-2">
                              <span className="text-xs font-bold uppercase text-neutral-500">Soft: </span>
                              <span className="text-neutral-700">{result.resume.skills.soft.join(', ')}</span>
                            </div>
                          )}
                          {result.resume.skills.languages?.length > 0 && (
                            <div>
                              <span className="text-xs font-bold uppercase text-neutral-500">Languages: </span>
                              <span className="text-neutral-700">{result.resume.skills.languages.map((l: any) => `${l.language} (${l.level})`).join(', ')}</span>
                            </div>
                          )}
                        </SectionCard>
                      )}

                      {/* Courses */}
                      {result.resume.courses?.length > 0 && (
                        <div className="mb-4">
                          <h3 className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: '#10b981' }}>Courses</h3>
                          <div className="space-y-0.5">
                            {result.resume.courses.map((c: any, i: number) => (
                              <div key={i} className="text-neutral-700 text-xs">{c.name} — {c.provider} {c.hours && `(${c.hours})`} {c.date && `· ${c.date}`}</div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ─── Score Tab ─── */}
              <TabsContent value="score" className="space-y-4">
                {(() => {
                  // Normalize: V4 returns evaluation.metrics, V3 returns score.dimensions
                  const overall = result.evaluation?.overall ?? result.score?.overall ?? 0
                  const metrics = result.evaluation?.metrics ?? []
                  const getMetric = (name: string) => metrics.find(m => m.name === name)?.score ?? 0
                  const atsScore = result.score?.atsScore ?? getMetric('ATS Keyword Coverage')
                  const completeness = result.score?.completeness ?? getMetric('Section Completeness')
                  const keywordScore = result.score?.keywordScore ?? getMetric('ATS Keyword Coverage')
                  const formattingScore = result.score?.formattingScore ?? getMetric('Formatting')
                  const dimensions = result.score?.dimensions ?? metrics.map(m => ({ name: m.name, score: m.score, status: m.passed ? 'good' : 'bad' }))
                  const quickWins = result.score?.quickWins ?? result.evaluation?.recommendations ?? []
                  const missingCritical = result.score?.missingCritical ?? result.evaluation?.missingFields ?? []

                  return (
                    <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <ScoreCard label="Overall" value={overall} color={scoreColor(overall)} icon={Award} />
                  <ScoreCard label="ATS Score" value={atsScore} color={scoreColor(atsScore)} icon={Target} />
                  <ScoreCard label="Completeness" value={completeness} color={scoreColor(completeness)} icon={CheckCircle2} />
                  <ScoreCard label="Keywords" value={keywordScore} color={scoreColor(keywordScore)} icon={Zap} />
                  <ScoreCard label="Formatting" value={formattingScore} color={scoreColor(formattingScore)} icon={FileText} />
                </div>

                {/* Dimensions */}
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Detailed Breakdown</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    {dimensions?.map((d: any, i: number) => (
                      <div key={i}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="capitalize">{d.name}</span>
                          <span className="font-medium" style={{ color: scoreColor(d.score) }}>{d.score}/100</span>
                        </div>
                        <Progress value={d.score} className="h-1.5" />
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Quick Wins */}
                {quickWins?.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><Zap className="h-4 w-4 text-brand" /> Quick Wins {'(< 5 min)'}</CardTitle></CardHeader>
                    <CardContent>
                      {quickWins.map((w: string, i: number) => <div key={i} className="text-xs text-muted-foreground flex gap-1.5 mb-1"><span className="text-brand">→</span>{w}</div>)}
                    </CardContent>
                  </Card>
                )}

                {/* Missing Critical */}
                {missingCritical?.length > 0 && (
                  <Card className="border-destructive/30">
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2 text-destructive"><AlertCircle className="h-4 w-4" /> Critical Missing Elements</CardTitle></CardHeader>
                    <CardContent>
                      {missingCritical.map((m: string, i: number) => <div key={i} className="text-xs text-muted-foreground flex gap-1.5 mb-1"><span className="text-destructive">!</span>{m}</div>)}
                    </CardContent>
                  </Card>
                )}
                    </>
                  )
                })()}
              </TabsContent>

              {/* ─── Keywords Tab ─── */}
              <TabsContent value="keywords" className="space-y-4">
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Detected Keywords</CardTitle></CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-1.5">
                      {result.keywords?.detected?.map((k, i) => <Badge key={i} className="bg-brand/15 text-brand border-brand/30">{k}</Badge>)}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Suggested Keywords</CardTitle></CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-1.5">
                      {result.keywords?.suggested?.map((k, i) => <Badge key={i} variant="outline" className="border-amber-500/40 text-amber-600">{k}</Badge>)}
                    </div>
                  </CardContent>
                </Card>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Action Verbs Used</CardTitle></CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-1.5">
                        {result.keywords?.actionVerbs?.map((k, i) => <Badge key={i} variant="secondary">{k}</Badge>)}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Missing Action Verbs</CardTitle></CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-1.5">
                        {result.keywords?.missingActionVerbs?.map((k, i) => <Badge key={i} variant="outline" className="text-muted-foreground">{k}</Badge>)}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* ─── Confidence Tab ─── */}
              <TabsContent value="confidence" className="space-y-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2"><Brain className="h-4 w-4 text-brand" /> AI Confidence Analysis</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p className="text-xs text-muted-foreground mb-3">Each field is rated by confidence: <span className="text-brand">high</span> (clearly stated in source), <span className="text-amber-500">medium</span> (inferred), <span className="text-destructive">low</span> (missing or uncertain). The AI never invents data — low-confidence fields need your input.</p>
                    {result.confidence && Object.entries(result.confidence).map(([field, level]) => (
                      <div key={field} className="flex items-center justify-between rounded-lg border p-2">
                        <span className="text-xs font-medium">{field}</span>
                        <Badge className={level === 'high' ? 'bg-brand/15 text-brand border-brand/30' : level === 'medium' ? 'bg-amber-500/15 text-amber-600 border-amber-500/30' : 'bg-destructive/15 text-destructive border-destructive/30'} variant="outline">
                          {level === 'high' ? <CheckCircle2 className="h-3 w-3" /> : level === 'medium' ? <AlertCircle className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />} {level}
                        </Badge>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Enrichment notes — what the AI changed */}
                {result.enrichmentNotes?.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><Sparkles className="h-4 w-4 text-brand" /> AI Modifications (transparency)</CardTitle></CardHeader>
                    <CardContent>
                      {result.enrichmentNotes.map((n, i) => (
                        <div key={i} className="text-xs text-muted-foreground flex gap-1.5 mb-1">
                          <CheckCircle2 className="h-3 w-3 text-brand mt-0.5 shrink-0" />{n}
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {/* Hallucination check */}
                {result.evaluation?.hallucinations?.length > 0 ? (
                  <Card className="border-destructive/30">
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2 text-destructive"><AlertCircle className="h-4 w-4" /> Potential Fabrications Detected</CardTitle></CardHeader>
                    <CardContent>
                      {result.evaluation.hallucinations.map((h, i) => <div key={i} className="text-xs text-destructive flex gap-1.5 mb-1"><span>!</span>{h}</div>)}
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="border-brand/30 bg-brand/5">
                    <CardContent className="p-3 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-brand" />
                      <span className="text-sm text-brand">No fabrications detected — all data is sourced from your input.</span>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* ─── Missing Info Tab ─── */}
              <TabsContent value="missing" className="space-y-4">
                {result.missingInfo?.length === 0 ? (
                  <Card className="border-brand/30 bg-brand/5">
                    <CardContent className="p-4 flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-brand" />
                      <span className="text-sm text-brand">All essential fields are present. Your resume is complete!</span>
                    </CardContent>
                  </Card>
                ) : (
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-3"><AlertCircle className="h-4 w-4 text-amber-500" /><span className="text-sm font-semibold">Information You Should Add</span></div>
                    <div className="space-y-3">
                      {result.missingInfo?.map((m, i) => (
                        <div key={i} className="rounded-lg border p-3">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge className={m.priority === 'high' ? 'bg-destructive/15 text-destructive border-destructive/30' : m.priority === 'medium' ? 'bg-amber-500/15 text-amber-600 border-amber-500/30' : 'bg-brand/15 text-brand border-brand/30'} variant="outline">{m.priority}</Badge>
                            <span className="text-sm font-medium">{m.field}</span>
                          </div>
                          <p className="text-xs text-muted-foreground">{m.question}</p>
                          {m.suggestion && <p className="text-xs text-brand mt-1">💡 {m.suggestion}</p>}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
                )}
              </TabsContent>
            </Tabs>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Helper Components ─────────────────────────────────────────────

function ScoreCard({ label, value, color, icon: Icon }: { label: string; value: number; color: string; icon: any }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-muted-foreground">{label}</span>
          <Icon className="h-4 w-4" style={{ color }} />
        </div>
        <div className="text-3xl font-bold" style={{ color }}>{value}</div>
        <Progress value={value} className="h-1.5 mt-2" />
        <div className="text-[10px] text-muted-foreground mt-1">/ 100</div>
      </CardContent>
    </Card>
  )
}

function SectionCard({ title, children, onRewrite, busy, onCopy }: { title: string; children: React.ReactNode; onRewrite: () => void; busy: boolean; onCopy: () => void }) {
  return (
    <div className="mb-4 group">
      <div className="flex items-center justify-between mb-1.5">
        <h3 className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#10b981' }}>{title}</h3>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
          <button onClick={onCopy} className="text-neutral-400 hover:text-neutral-700 p-1" aria-label="Copy"><Copy className="h-3 w-3" /></button>
          <button onClick={onRewrite} disabled={busy} className="text-neutral-400 hover:text-neutral-700 p-1" aria-label="AI Rewrite">
            {busy ? <Spinner /> : <Wand2 className="h-3 w-3" />}
          </button>
        </div>
      </div>
      {children}
    </div>
  )
}
