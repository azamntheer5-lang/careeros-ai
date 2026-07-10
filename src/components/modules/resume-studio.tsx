'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { api } from '@/lib/api-client'
import { useApp } from '@/components/app-provider'
import { useToast } from '@/hooks/use-toast'
import { ModuleHeader } from '@/components/careeros/module-header'
import { Spinner } from '@/components/careeros/loading'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Sparkles, Wand2, FileText, Target, AlertCircle, CheckCircle2, Copy,
  Download, Globe, Zap, ChevronRight, RefreshCw, ArrowUp, ArrowDown,
  Trash2, Brain, Award, Languages, FileType, Save, Upload, FileUp,
  History, Search, SortAsc, Plus, X, Loader2, FileImage, FileSpreadsheet,
  Undo2, Redo2, Clock, Layers, Eye, ArrowLeft,
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

type PipelineStage = 'idle' | 'parsing' | 'enriching' | 'optimizing' | 'scoring' | 'done' | 'error'

type SavedResume = {
  id: string
  title: string
  template: string
  accent: string
  data: string
  atsScore: number | null
  aiScore: number | null
  version: number
  createdAt: string
  updatedAt: string
}

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

  // Undo/Redo stacks
  const [undoStack, setUndoStack] = useState<StudioResult[]>([])
  const [redoStack, setRedoStack] = useState<StudioResult[]>([])

  // Save state
  const [savedResumeId, setSavedResumeId] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true)
  const [lastAutoSave, setLastAutoSave] = useState<Date | null>(null)

  // Project library
  const [showLibrary, setShowLibrary] = useState(false)
  const [savedResumes, setSavedResumes] = useState<SavedResume[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'updated' | 'created' | 'title' | 'score'>('updated')

  // Version history
  const [showHistory, setShowHistory] = useState(false)
  const [versions, setVersions] = useState<any[]>([])

  // Export state
  const [exporting, setExporting] = useState<string | null>(null)

  // Import state
  const [importing, setImporting] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Timer cleanup ref
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([])

  useEffect(() => () => { timersRef.current.forEach(clearTimeout); timersRef.current = [] }, [])

  // ─── Import ───

  const handleFileImport = async (file: File) => {
    setImporting(true)
    try {
      // Read file as base64
      const arrayBuffer = await file.arrayBuffer()
      const bytes = new Uint8Array(arrayBuffer)
      let binary = ''
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
      const base64 = btoa(binary)

      const res = await fetch('/api/resumes/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          base64,
          filename: file.name,
          mimeType: file.type || 'application/octet-stream',
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `Import failed (HTTP ${res.status})`)
      }
      const data = await res.json()
      if (!data.text || data.text.trim().length < 10) {
        throw new Error('No readable text found in this file. Try pasting the text manually.')
      }
      setRawText(data.text)
      toast({
        title: 'File imported ✅',
        description: `${file.name} — ${data.detectedLanguage === 'ar' ? 'Arabic' : data.detectedLanguage === 'bilingual' ? 'Bilingual' : 'English'} • ${(data.text.length / 1000).toFixed(1)}k chars extracted`,
      })
    } catch (e) {
      toast({ title: 'Import failed', description: (e as Error).message, variant: 'destructive' })
    } finally {
      setImporting(false)
    }
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFileImport(file)
  }, [])

  const onPaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items
    if (!items) return
    for (const item of items) {
      if (item.kind === 'file') {
        const file = item.getAsFile()
        if (file) {
          e.preventDefault()
          handleFileImport(file)
          return
        }
      }
    }
    // If no file, let the default paste happen (text)
  }, [])

  // ─── Generate ───

  const generate = async () => {
    if (!rawText.trim()) {
      toast({ title: 'Text required', description: 'Paste your raw text or import a file to generate a resume.', variant: 'destructive' })
      return
    }
    setResult(null)
    setUndoStack([])
    setRedoStack([])
    setSaved(false)
    setSavedResumeId(null)
    setStage('parsing')

    // Animate through stages with realistic timing. Timers tracked for cleanup.
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
      timersRef.current.forEach(clearTimeout)
      timersRef.current = []
      setResult(res)
      setStage('done')
      setActiveTab('preview')
      const overall = res.evaluation?.overall ?? res.score?.overall ?? 0
      toast({ title: 'Resume generated! 🎉', description: `Score: ${overall}/100 • ${res.aiCalls ?? 1} AI call • ${((res.latencyMs ?? 0) / 1000).toFixed(1)}s` })
    } catch (e) {
      timersRef.current.forEach(clearTimeout)
      timersRef.current = []
      setStage('error')
      toast({ title: 'Generation failed', description: (e as Error).message, variant: 'destructive' })
    }
  }

  // ─── Section rewrite (with undo) ───

  const rewriteSection = async (section: string, content: any) => {
    if (!result) return
    setSectionBusy(section)
    setUndoStack((s) => [...s, result])
    setRedoStack([]) // Clear redo on new action
    try {
      const { result: rewritten } = await api<{ result: any }>('/api/desktop/rewrite-section', {
        method: 'POST', body: { section, content, jobDescription: jobDescription || undefined },
      })
      setResult((prev) => prev ? { ...prev, resume: { ...prev.resume, [section]: rewritten }, wasEnriched: true } : prev)
      setSaved(false)
      toast({ title: 'Section rewritten', description: `${section} updated. Undo available.` })
    } catch (e) {
      setUndoStack((s) => s.slice(0, -1))
      toast({ title: 'Rewrite failed', description: (e as Error).message, variant: 'destructive' })
    }
    setSectionBusy(null)
  }

  // ─── Undo / Redo ───

  const undo = () => {
    setUndoStack((stack) => {
      if (stack.length === 0) return stack
      const prev = stack[stack.length - 1]
      setRedoStack((r) => [...r, result!])
      setResult(prev)
      setSaved(false)
      toast({ title: 'Undone', description: `${stack.length - 1} undo(s) remaining.` })
      return stack.slice(0, -1)
    })
  }

  const redo = () => {
    setRedoStack((stack) => {
      if (stack.length === 0) return stack
      const next = stack[stack.length - 1]
      setUndoStack((u) => [...u, result!])
      setResult(next)
      setSaved(false)
      toast({ title: 'Redone', description: `${stack.length - 1} redo(s) remaining.` })
      return stack.slice(0, -1)
    })
  }

  // ─── Translate ───

  const translateResume = async (targetLang: 'ar' | 'en') => {
    if (!result) return
    setSectionBusy('translate')
    setUndoStack((s) => [...s, result])
    setRedoStack([])
    try {
      const { resume: translated } = await api<{ resume: any }>('/api/desktop/translate-resume', {
        method: 'POST', body: { resume: result.resume, targetLang },
      })
      setResult((prev) => prev ? { ...prev, resume: translated } : prev)
      setSaved(false)
      toast({ title: 'Resume translated', description: `Translated to ${targetLang === 'ar' ? 'Arabic' : 'English'}.` })
    } catch (e) {
      setUndoStack((s) => s.slice(0, -1))
      toast({ title: 'Translation failed', description: (e as Error).message, variant: 'destructive' })
    }
    setSectionBusy(null)
  }

  // ─── Save / Auto-save ───

  const saveResume = async (silent = false) => {
    if (!result) return
    if (!silent) setSectionBusy('save')
    try {
      const name = result.resume?.contact?.name || 'Untitled'
      const payload = {
        title: `${name} — AI Generated`,
        template: 'modern',
        accent: 'emerald',
        data: result.resume,
        atsScore: result.evaluation?.overall ?? result.score?.overall ?? null,
        aiScore: result.evaluation?.overall ?? result.score?.overall ?? null,
      }
      if (savedResumeId) {
        // Update existing
        await api(`/api/resumes/${savedResumeId}`, { method: 'PUT', body: { ...payload, note: 'Auto-saved edit' } })
      } else {
        // Create new
        const { resume } = await api<{ resume: SavedResume }>('/api/resumes', { method: 'POST', body: payload })
        setSavedResumeId(resume.id)
      }
      setSaved(true)
      setLastAutoSave(new Date())
      if (!silent) toast({ title: 'Saved! ✅', description: 'Resume saved to your library.' })
    } catch (e) {
      if (!silent) toast({ title: 'Save failed', description: (e as Error).message, variant: 'destructive' })
    }
    if (!silent) setSectionBusy(null)
  }

  // Auto-save every 30s when there are unsaved changes and auto-save is enabled
  useEffect(() => {
    if (!autoSaveEnabled || !result || saved || stage !== 'done') return
    const timer = setTimeout(() => {
      if (!saved) saveResume(true)
    }, 30000)
    return () => clearTimeout(timer)
  }, [result, saved, autoSaveEnabled, stage])

  // Mark unsaved when result changes (after first save)
  useEffect(() => {
    if (savedResumeId && result) setSaved(false)
  }, [result])

  // ─── Export ───

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
    const contactParts: string[] = []
    if (r.contact?.email) contactParts.push(`📧 ${r.contact.email}`)
    if (r.contact?.phone) contactParts.push(`📱 ${r.contact.phone}`)
    if (r.contact?.location) contactParts.push(`📍 ${r.contact.location}`)
    if (contactParts.length) md += contactParts.join(' | ') + '\n\n'
    if (r.objective) md += `## Objective\n${r.objective}\n\n`
    if (r.experience?.length) {
      md += `## Experience\n`
      r.experience.forEach((e: any) => {
        md += `### ${e.title || ''} — ${e.company || ''}\n*${e.startDate || ''} - ${e.endDate || ''}*\n`
        e.bullets?.forEach((b: string) => { md += `- ${b}\n` })
        md += '\n'
      })
    }
    if (r.education?.length) {
      md += `## Education\n`
      r.education.forEach((e: any) => { md += `### ${e.degree || ''} — ${e.school || ''}\n*${e.startDate || ''} - ${e.endDate || ''}*\n\n` })
    }
    if (r.skills?.technical?.length) md += `## Technical Skills\n${r.skills.technical.join(', ')}\n\n`
    if (r.skills?.soft?.length) md += `## Soft Skills\n${r.skills.soft.join(', ')}\n\n`
    if (r.skills?.languages?.length) md += `## Languages\n${r.skills.languages.map((l: any) => `${l.language}: ${l.level}`).join(', ')}\n\n`
    if (r.projects?.length) {
      md += `## Projects\n`
      r.projects.forEach((p: any) => { md += `### ${p.name}\n${p.description}\n${p.link ? `[${p.link}](${p.link})\n` : ''}\n` })
    }
    if (r.certifications?.length) {
      md += `## Certifications\n`
      r.certifications.forEach((c: any) => { md += `- ${c.name}${c.issuer ? ` — ${c.issuer}` : ''}${c.date ? ` (${c.date})` : ''}\n` })
    }
    if (r.courses?.length) {
      md += `## Courses\n`
      r.courses.forEach((c: any) => { md += `- ${c.name}${c.provider ? ` — ${c.provider}` : ''}${c.hours ? ` (${c.hours}h)` : ''}${c.date ? ` · ${c.date}` : ''}\n` })
    }
    const blob = new Blob([md], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'resume.md'; a.click()
    URL.revokeObjectURL(url)
  }

  const exportPDF = async () => {
    if (!result) return
    setExporting('pdf')
    try {
      const res = await fetch('/api/resumes/export-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resume: result.resume, title: result.resume?.contact?.name || 'Resume' }),
      })
      if (!res.ok) throw new Error(`Export failed (HTTP ${res.status})`)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = 'resume.pdf'; a.click()
      URL.revokeObjectURL(url)
      toast({ title: 'PDF exported ✅', description: 'Pixel-perfect PDF downloaded.' })
    } catch (e) {
      toast({ title: 'PDF export failed', description: (e as Error).message, variant: 'destructive' })
    }
    setExporting(null)
  }

  const exportDOCX = async () => {
    if (!result) return
    setExporting('docx')
    try {
      const res = await fetch('/api/resumes/export-docx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resume: result.resume, title: result.resume?.contact?.name || 'Resume' }),
      })
      if (!res.ok) throw new Error(`Export failed (HTTP ${res.status})`)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = 'resume.docx'; a.click()
      URL.revokeObjectURL(url)
      toast({ title: 'DOCX exported ✅', description: 'Word document downloaded.' })
    } catch (e) {
      toast({ title: 'DOCX export failed', description: (e as Error).message, variant: 'destructive' })
    }
    setExporting(null)
  }

  // ─── Library ───

  const loadLibrary = async () => {
    try {
      const params = new URLSearchParams()
      if (searchQuery) params.set('search', searchQuery)
      params.set('sort', sortBy)
      const { resumes } = await api<{ resumes: SavedResume[] }>(`/api/resumes?${params}`)
      setSavedResumes(resumes)
    } catch (e) {
      toast({ title: 'Failed to load library', description: (e as Error).message, variant: 'destructive' })
    }
  }

  const continueEditing = async (resume: SavedResume) => {
    try {
      const data = typeof resume.data === 'string' ? JSON.parse(resume.data) : resume.data
      setResult({
        resume: data,
        detectedLanguage: 'en',
        wasEnriched: false,
        warnings: [],
        enrichmentNotes: [],
        missingInfo: [],
        keywords: { detected: [], suggested: [], industryTerms: [], actionVerbs: [], missingActionVerbs: [] },
      })
      setSavedResumeId(resume.id)
      setSaved(true)
      setStage('done')
      setActiveTab('preview')
      setShowLibrary(false)
      toast({ title: 'Resume loaded', description: `Editing "${resume.title}" — continue where you left off.` })
    } catch (e) {
      toast({ title: 'Failed to load resume', description: (e as Error).message, variant: 'destructive' })
    }
  }

  const duplicateResume = async (resume: SavedResume) => {
    try {
      await api(`/api/resumes/${resume.id}/duplicate`, { method: 'POST' })
      toast({ title: 'Duplicated ✅', description: `"${resume.title}" copied.` })
      loadLibrary()
    } catch (e) {
      toast({ title: 'Duplicate failed', description: (e as Error).message, variant: 'destructive' })
    }
  }

  const deleteResume = async (resume: SavedResume) => {
    if (!confirm(`Delete "${resume.title}"? This cannot be undone.`)) return
    try {
      await api(`/api/resumes/${resume.id}`, { method: 'DELETE' })
      toast({ title: 'Deleted', description: `"${resume.title}" removed.` })
      loadLibrary()
    } catch (e) {
      toast({ title: 'Delete failed', description: (e as Error).message, variant: 'destructive' })
    }
  }

  // ─── Version history ───

  const loadVersions = async () => {
    if (!savedResumeId) return
    try {
      const { versions, current } = await api<{ versions: any[]; current: number }>(`/api/resumes/${savedResumeId}/versions`)
      setVersions(versions)
      setShowHistory(true)
    } catch (e) {
      toast({ title: 'Failed to load history', description: (e as Error).message, variant: 'destructive' })
    }
  }

  const restoreVersion = async (versionId: string) => {
    if (!savedResumeId) return
    if (!confirm('Restore this version? Your current state will be saved as a new version first.')) return
    try {
      const { resume } = await api<{ resume: SavedResume }>(`/api/resumes/${savedResumeId}/restore`, {
        method: 'POST', body: { versionId },
      })
      const data = typeof resume.data === 'string' ? JSON.parse(resume.data) : resume.data
      setResult((prev) => prev ? { ...prev, resume: data } : prev)
      setSaved(true)
      toast({ title: 'Version restored ✅', description: `Restored to version ${resume.version}.` })
      setShowHistory(false)
    } catch (e) {
      toast({ title: 'Restore failed', description: (e as Error).message, variant: 'destructive' })
    }
  }

  // ─── Helpers ───

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({ title: 'Copied', description: 'Content copied to clipboard.' })
  }

  const scoreColor = (score: number) => score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444'

  const newResume = () => {
    setResult(null)
    setStage('idle')
    setRawText('')
    setUndoStack([])
    setRedoStack([])
    setSaved(false)
    setSavedResumeId(null)
    setJobDescription('')
    setShowJD(false)
  }

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        if (result && stage === 'done') saveResume()
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        if (undoStack.length > 0) undo()
      }
      if ((e.metaKey || e.ctrlKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault()
        if (redoStack.length > 0) redo()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [result, stage, undoStack, redoStack])

  return (
    <div
      onDrop={onDrop}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
      onDragLeave={() => setDragOver(false)}
      className={`relative ${dragOver ? 'ring-2 ring-brand ring-offset-4 ring-offset-background rounded-xl' : ''}`}
    >
      <ModuleHeader title={t('studioTitle')} subtitle={t('studioSub')} icon={Sparkles}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" className="rounded-full" onClick={() => { setShowLibrary(true); loadLibrary() }}>
              <Layers className="h-3.5 w-3.5" /> Library
            </Button>
            {result && stage === 'done' && (
              <>
                {undoStack.length > 0 && (
                  <Button variant="outline" size="sm" className="rounded-full" onClick={undo} title="Undo (Ctrl+Z)">
                    <Undo2 className="h-3.5 w-3.5" /> Undo
                  </Button>
                )}
                {redoStack.length > 0 && (
                  <Button variant="outline" size="sm" className="rounded-full" onClick={redo} title="Redo (Ctrl+Y)">
                    <Redo2 className="h-3.5 w-3.5" /> Redo
                  </Button>
                )}
                {savedResumeId && (
                  <Button variant="outline" size="sm" className="rounded-full" onClick={loadVersions}>
                    <History className="h-3.5 w-3.5" /> History
                  </Button>
                )}
                <Button variant={saved ? 'outline' : 'default'} size="sm" className="rounded-full" onClick={() => saveResume()} disabled={sectionBusy === 'save' || saved} title="Save (Ctrl+S)">
                  {sectionBusy === 'save' ? <Spinner /> : saved ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Save className="h-3.5 w-3.5" />}
                  {saved ? 'Saved' : 'Save'}
                </Button>
              </>
            )}
          </div>
        }
      />

      {/* Drag overlay */}
      {dragOver && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-brand/10 backdrop-blur-sm rounded-xl pointer-events-none">
          <div className="flex flex-col items-center gap-2 text-brand">
            <FileUp className="h-12 w-12" />
            <span className="text-lg font-semibold">Drop your file to import</span>
            <span className="text-xs text-muted-foreground">TXT, DOCX, PDF, PNG, JPG supported</span>
          </div>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept=".txt,.docx,.pdf,.png,.jpg,.jpeg,.webp"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileImport(f); e.target.value = '' }}
      />

      <AnimatePresence mode="wait">
        {/* ─── Input + Import ─── */}
        {stage === 'idle' && !result && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <Card className="mb-4">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-3">
                  <Brain className="h-5 w-5 text-brand" />
                  <h3 className="font-semibold">Paste text or import a file — we'll build a professional resume</h3>
                </div>

                {/* Import buttons */}
                <div className="flex flex-wrap gap-2 mb-3">
                  <Button variant="outline" size="sm" className="rounded-full" onClick={() => fileInputRef.current?.click()} disabled={importing}>
                    {importing ? <Spinner /> : <FileUp className="h-3.5 w-3.5" />} Import file
                  </Button>
                  <Button variant="ghost" size="sm" className="rounded-full" onClick={async () => {
                    try {
                      const text = await navigator.clipboard.readText()
                      if (text) { setRawText(text); toast({ title: 'Pasted from clipboard' }) }
                      else toast({ title: 'Clipboard empty', variant: 'destructive' })
                    } catch { toast({ title: 'Clipboard access denied', variant: 'destructive' }) }
                  }}>
                    <Copy className="h-3.5 w-3.5" /> Paste clipboard
                  </Button>
                </div>

                <Textarea
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  onPaste={onPaste}
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
                  <Badge variant="secondary" className="text-[10px]">📁 DOCX / PDF / Images</Badge>
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

                <Button onClick={generate} disabled={!rawText.trim() || importing} className="w-full bg-brand text-brand-foreground hover:bg-brand/90 rounded-full h-12 text-base">
                  <Wand2 className="h-5 w-5" /> Generate Professional Resume
                </Button>

                {/* Auto-save toggle */}
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Clock className="h-3 w-3" /> Auto-save every 30s
                  </span>
                  <button
                    onClick={() => setAutoSaveEnabled(!autoSaveEnabled)}
                    className={`relative h-5 w-9 rounded-full transition ${autoSaveEnabled ? 'bg-brand' : 'bg-muted'}`}
                    role="switch"
                    aria-checked={autoSaveEnabled}
                  >
                    <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition ${autoSaveEnabled ? 'left-4' : 'left-0.5'}`} />
                  </button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* ─── Pipeline Progress ─── */}
        {stage !== 'idle' && stage !== 'done' && stage !== 'error' && (
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
                <Button variant="ghost" size="sm" className="mt-6" onClick={() => { timersRef.current.forEach(clearTimeout); setStage('idle') }}>
                  Cancel
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* ─── Error State ─── */}
        {stage === 'error' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Card className="border-destructive/30 bg-destructive/5">
              <CardContent className="p-8 text-center">
                <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-3" />
                <h3 className="text-lg font-semibold mb-1">Generation Failed</h3>
                <p className="text-sm text-muted-foreground mb-4">The AI pipeline encountered an error. You can retry or start over.</p>
                <div className="flex justify-center gap-2">
                  <Button onClick={generate} className="bg-brand text-brand-foreground hover:bg-brand/90 rounded-full">
                    <RefreshCw className="h-4 w-4" /> Retry
                  </Button>
                  <Button variant="outline" onClick={newResume} className="rounded-full">
                    Start over
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* ─── Results ─── */}
        {result && stage === 'done' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            {/* Pipeline metadata bar */}
            <div className="flex flex-wrap items-center gap-2 mb-3 text-xs">
              {result.profession && <Badge variant="secondary">{result.profession}</Badge>}
              {result.seniority && <Badge variant="secondary">{result.seniority}</Badge>}
              {result.industry && <Badge variant="secondary">{result.industry}</Badge>}
              <Badge variant="outline" className="uppercase">{result.detectedLanguage}</Badge>
              {result.wasEnriched && <Badge className="bg-brand/15 text-brand border-brand/30"><Sparkles className="h-3 w-3" /> AI Enriched</Badge>}
              {result.aiCalls != null && <Badge variant="outline">{result.aiCalls} AI call{result.aiCalls !== 1 ? 's' : ''}</Badge>}
              {result.latencyMs != null && <Badge variant="outline">{(result.latencyMs / 1000).toFixed(1)}s</Badge>}
              {saved && lastAutoSave && <Badge variant="outline" className="text-brand"><CheckCircle2 className="h-3 w-3" /> Saved {lastAutoSave.toLocaleTimeString()}</Badge>}
            </div>

            {/* Warnings */}
            {result.warnings?.length > 0 && (
              <Card className="mb-4 border-amber-500/30 bg-amber-500/5">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2 mb-1"><AlertCircle className="h-4 w-4 text-amber-500" /><span className="text-sm font-semibold text-amber-700 dark:text-amber-400">Attention Needed</span></div>
                  {result.warnings.map((w, i) => <div key={i} className="text-xs text-amber-700 dark:text-amber-400/80 flex gap-1.5"><span>•</span>{w}</div>)}
                </CardContent>
              </Card>
            )}

            {/* Export bar */}
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <span className="text-xs text-muted-foreground me-1">Export:</span>
              <Button variant="outline" size="sm" className="rounded-full" onClick={exportPDF} disabled={exporting === 'pdf'}>
                {exporting === 'pdf' ? <Spinner /> : <FileText className="h-3.5 w-3.5" />} PDF
              </Button>
              <Button variant="outline" size="sm" className="rounded-full" onClick={exportDOCX} disabled={exporting === 'docx'}>
                {exporting === 'docx' ? <Spinner /> : <FileSpreadsheet className="h-3.5 w-3.5" />} DOCX
              </Button>
              <Button variant="outline" size="sm" className="rounded-full" onClick={exportMarkdown}><FileType className="h-3.5 w-3.5" /> MD</Button>
              <Button variant="outline" size="sm" className="rounded-full" onClick={exportJSON}><Download className="h-3.5 w-3.5" /> JSON</Button>
              <div className="flex-1" />
              <Button variant="outline" size="sm" className="rounded-full" onClick={newResume}>
                <Plus className="h-3.5 w-3.5" /> New
              </Button>
            </div>

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
                </div>

                {/* Resume Preview Card */}
                <Card className="overflow-hidden">
                  <CardContent className="p-0">
                    <div className="bg-white text-neutral-900 p-6 sm:p-8 text-sm" style={{ fontFamily: 'var(--font-geist-sans)' }}>
                      <header className="border-b-2 pb-3 mb-4" style={{ borderColor: '#10b981' }}>
                        <h1 className="text-2xl font-bold">{result.resume.contact?.name || 'Your Name'}</h1>
                        <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-neutral-600 mt-1">
                          {result.resume.contact?.email && <span>{result.resume.contact.email}</span>}
                          {result.resume.contact?.phone && <span>· {result.resume.contact.phone}</span>}
                          {result.resume.contact?.location && <span>· {result.resume.contact.location}</span>}
                          {result.resume.contact?.linkedin && <span>· {result.resume.contact.linkedin}</span>}
                        </div>
                      </header>

                      {result.resume.objective && (
                        <SectionCard title="Objective" onRewrite={() => rewriteSection('objective', result.resume.objective)} busy={sectionBusy === 'objective'} onCopy={() => copyToClipboard(result.resume.objective)}>
                          <p className="text-neutral-700">{result.resume.objective}</p>
                        </SectionCard>
                      )}

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
                      {quickWins?.length > 0 && (
                        <Card>
                          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><Zap className="h-4 w-4 text-brand" /> Quick Wins (&lt; 5 min)</CardTitle></CardHeader>
                          <CardContent>
                            {quickWins.map((w: string, i: number) => <div key={i} className="text-xs text-muted-foreground flex gap-1.5 mb-1"><span className="text-brand">→</span>{w}</div>)}
                          </CardContent>
                        </Card>
                      )}
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
                    {result.keywords?.detected?.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {result.keywords.detected.map((k, i) => <Badge key={i} className="bg-brand/15 text-brand border-brand/30">{k}</Badge>)}
                      </div>
                    ) : <p className="text-xs text-muted-foreground">No keywords detected. Add more technical skills to your resume.</p>}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Suggested Keywords</CardTitle></CardHeader>
                  <CardContent>
                    {result.keywords?.suggested?.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {result.keywords.suggested.map((k, i) => <Badge key={i} variant="outline" className="border-amber-500/40 text-amber-600">{k}</Badge>)}
                      </div>
                    ) : <p className="text-xs text-muted-foreground">No suggestions — add more detail to your resume for keyword recommendations.</p>}
                  </CardContent>
                </Card>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Action Verbs Used</CardTitle></CardHeader>
                    <CardContent>
                      {result.keywords?.actionVerbs?.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {result.keywords.actionVerbs.map((k, i) => <Badge key={i} variant="secondary">{k}</Badge>)}
                        </div>
                      ) : <p className="text-xs text-muted-foreground">No action verbs detected.</p>}
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Missing Action Verbs</CardTitle></CardHeader>
                    <CardContent>
                      {result.keywords?.missingActionVerbs?.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {result.keywords.missingActionVerbs.map((k, i) => <Badge key={i} variant="outline" className="text-muted-foreground">{k}</Badge>)}
                        </div>
                      ) : <p className="text-xs text-muted-foreground">All common action verbs are present.</p>}
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
                    {result.confidence && Object.keys(result.confidence).length > 0 ? (
                      Object.entries(result.confidence).map(([field, level]) => (
                        <div key={field} className="flex items-center justify-between rounded-lg border p-2">
                          <span className="text-xs font-medium">{field}</span>
                          <Badge className={level === 'high' ? 'bg-brand/15 text-brand border-brand/30' : level === 'medium' ? 'bg-amber-500/15 text-amber-600 border-amber-500/30' : 'bg-destructive/15 text-destructive border-destructive/30'} variant="outline">
                            {level === 'high' ? <CheckCircle2 className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />} {level}
                          </Badge>
                        </div>
                      ))
                    ) : <p className="text-xs text-muted-foreground">No confidence data available.</p>}
                  </CardContent>
                </Card>

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

                {result.evaluation?.hallucinations && result.evaluation.hallucinations.length > 0 ? (
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

      {/* ─── Library Dialog ─── */}
      <Dialog open={showLibrary} onOpenChange={setShowLibrary}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Layers className="h-5 w-5 text-brand" /> Resume Library</DialogTitle>
          </DialogHeader>
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search resumes…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') loadLibrary() }}
                className="pl-8"
              />
            </div>
            <Button variant="outline" size="sm" onClick={() => { setSortBy(sortBy === 'updated' ? 'created' : sortBy === 'created' ? 'title' : sortBy === 'title' ? 'score' : 'updated'); loadLibrary() }}>
              <SortAsc className="h-3.5 w-3.5" /> {sortBy}
            </Button>
          </div>
          <ScrollArea className="max-h-[55vh]">
            {savedResumes.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No saved resumes yet. Generate one and save it!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {savedResumes.map((r) => (
                  <div key={r.id} className="flex items-center gap-3 rounded-lg border p-3 hover:bg-accent/50 transition group">
                    <FileText className="h-5 w-5 text-brand shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{r.title}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-2">
                        <span>v{r.version}</span>
                        {r.aiScore && <Badge variant="outline" className="text-[9px] h-4">{r.aiScore}/100</Badge>}
                        <span>· {new Date(r.updatedAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                      <Button variant="ghost" size="sm" onClick={() => continueEditing(r)} title="Continue editing">
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => duplicateResume(r)} title="Duplicate">
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => deleteResume(r)} title="Delete" className="text-destructive hover:text-destructive">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* ─── Version History Dialog ─── */}
      <Dialog open={showHistory} onOpenChange={setShowHistory}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><History className="h-5 w-5 text-brand" /> Version History</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            {versions.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <History className="h-12 w-12 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No version history yet. Save your resume to create snapshots.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {versions.map((v) => (
                  <div key={v.id} className="flex items-center gap-3 rounded-lg border p-3">
                    <div className="h-8 w-8 rounded-full bg-brand-soft text-brand flex items-center justify-center text-xs font-bold">
                      v{v.version}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium">{v.note || `Version ${v.version}`}</div>
                      <div className="text-xs text-muted-foreground">{new Date(v.createdAt).toLocaleString()}</div>
                    </div>
                    {v.atsScore && <Badge variant="outline" className="text-[9px]">{v.atsScore}/100</Badge>}
                    <Button variant="outline" size="sm" onClick={() => restoreVersion(v.id)}>
                      <RefreshCw className="h-3 w-3" /> Restore
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
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
