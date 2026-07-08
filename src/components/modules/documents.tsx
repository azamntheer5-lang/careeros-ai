'use client'

import { useState, useEffect, useRef, useCallback, ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { api } from '@/lib/api-client'
import { useApp } from '@/components/app-provider'
import { useToast } from '@/hooks/use-toast'
import { useProfile } from '@/components/careeros/profile-context'
import { ModuleHeader } from '@/components/careeros/module-header'
import { Spinner } from '@/components/careeros/loading'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import {
  FileScan,
  UploadCloud,
  Trash2,
  Sparkles,
  X,
  User,
  Mail,
  Phone,
  MapPin,
  Award,
  Briefcase,
  GraduationCap,
  Wrench,
  FolderGit2,
  BadgeCheck,
  FileWarning,
  CheckCircle2,
  FileText,
  Globe,
  Linkedin,
} from 'lucide-react'

type DocType = 'resume' | 'certificate' | 'portfolio' | 'other'
type DocStatus = 'pending' | 'parsed' | 'error'

type DocListItem = {
  id: string
  userId: string | null
  type: DocType
  filename: string
  mimeType: string
  parsed: string | null
  status: DocStatus
  createdAt: string
}

type ParsedResume = {
  contact?: {
    name?: string
    email?: string
    phone?: string
    location?: string
    website?: string
    linkedin?: string
  }
  summary?: string
  experience?: Array<{
    title?: string
    company?: string
    location?: string
    startDate?: string
    endDate?: string
    bullets?: string[]
  }>
  education?: Array<{
    degree?: string
    school?: string
    location?: string
    startDate?: string
    endDate?: string
    details?: string
  }>
  skills?: string[]
  projects?: Array<{ name?: string; description?: string; link?: string }>
  certifications?: Array<{ name?: string; issuer?: string; date?: string }>
}

type ParsedCert = {
  name?: string
  issuer?: string
  date?: string
  holderName?: string
  credentialId?: string
}

function detectType(filename: string): DocType {
  const n = filename.toLowerCase()
  if (/(resume|cv)/.test(n)) return 'resume'
  if (/(cert|certificate)/.test(n)) return 'certificate'
  if (/(portfolio)/.test(n)) return 'portfolio'
  return 'other'
}

function parseParsed<T>(raw: string | null): T | null {
  if (!raw) return null
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

function summaryFor(doc: DocListItem): string {
  if (doc.status === 'pending') return 'Parsing…'
  if (doc.status === 'error' || !doc.parsed) return 'Could not parse — try re-uploading'
  if (doc.type === 'certificate') {
    const c = parseParsed<ParsedCert>(doc.parsed)
    if (!c) return 'Certificate parsed'
    return [c.name, c.issuer].filter(Boolean).join(' · ') || 'Certificate parsed'
  }
  // resume / portfolio / other → show experience/skill counts
  const r = parseParsed<ParsedResume>(doc.parsed)
  if (!r) return 'Document parsed'
  const exp = r.experience?.length ?? 0
  const skl = r.skills?.length ?? 0
  const edu = r.education?.length ?? 0
  const bits: string[] = []
  if (exp) bits.push(`${exp} experience${exp === 1 ? '' : 's'}`)
  if (skl) bits.push(`${skl} skill${skl === 1 ? '' : 's'}`)
  if (edu) bits.push(`${edu} education`)
  return bits.length ? `${bits.join(' · ')} detected` : 'Document parsed'
}

const TYPE_BADGE: Record<DocType, { label: string; cls: string }> = {
  resume: { label: 'Resume', cls: 'bg-brand/15 text-brand border-brand/30' },
  certificate: { label: 'Certificate', cls: 'bg-amber-500/15 text-amber-600 border-amber-500/30' },
  portfolio: { label: 'Portfolio', cls: 'bg-rose-500/15 text-rose-600 border-rose-500/30' },
  other: { label: 'Other', cls: 'bg-muted text-muted-foreground border-border' },
}

const STATUS_BADGE: Record<DocStatus, { label: string; cls: string }> = {
  pending: { label: 'Pending', cls: 'bg-amber-500/15 text-amber-600 border-amber-500/30' },
  parsed: { label: 'Parsed', cls: 'bg-brand/15 text-brand border-brand/30' },
  error: { label: 'Error', cls: 'bg-destructive/15 text-destructive border-destructive/30' },
}

export function DocumentsModule() {
  const { t } = useApp()
  const { toast } = useToast()
  const { refresh: refreshProfile } = useProfile()
  const [docs, setDocs] = useState<DocListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [applying, setApplying] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { documents } = await api<{ documents: DocListItem[] }>('/api/documents')
      setDocs(documents)
    } catch {
      // silent
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const readFileAsBase64 = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const r = new FileReader()
      r.onload = () => {
        const result = String(r.result || '')
        const i = result.indexOf('base64,')
        resolve(i >= 0 ? result.slice(i + 7) : result)
      }
      r.onerror = reject
      r.readAsDataURL(file)
    })

  const handleFile = async (file: File) => {
    if (!file) return
    setUploading(true)
    try {
      const base64 = await readFileAsBase64(file)
      const type = detectType(file.name)
      const mimeType = file.type || 'application/octet-stream'
      const res = await api<{ document: DocListItem; parsed: unknown; error?: string }>(
        '/api/documents',
        { method: 'POST', body: { filename: file.name, mimeType, base64, type } }
      )
      setDocs((d) => [res.document, ...d])
      if (res.parsed) {
        toast({
          title: 'Document parsed',
          description: `${file.name} is ready to review and apply.`,
        })
        setSelectedId(res.document.id)
      } else if (res.error) {
        toast({
          title: 'Parsing failed',
          description: res.error,
          variant: 'destructive',
        })
      }
    } catch (e) {
      toast({
        title: 'Upload failed',
        description: (e as Error).message,
        variant: 'destructive',
      })
    } finally {
      setUploading(false)
    }
  }

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) handleFile(f)
    e.target.value = ''
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files?.[0]
    if (f) handleFile(f)
  }

  const remove = async (id: string) => {
    try {
      await api(`/api/documents/${id}`, { method: 'DELETE' })
      setDocs((d) => d.filter((x) => x.id !== id))
      if (selectedId === id) setSelectedId(null)
      toast({ title: 'Document deleted' })
    } catch (e) {
      toast({
        title: 'Delete failed',
        description: (e as Error).message,
        variant: 'destructive',
      })
    }
  }

  const apply = async (id: string) => {
    setApplying(true)
    try {
      const res = await api<{
        applied: { skillsAdded: number; targetRole: string | null }
      }>(`/api/documents/${id}/apply`, { method: 'POST' })
      toast({
        title: 'Applied to your profile',
        description: `${res.applied.skillsAdded} skill${
          res.applied.skillsAdded === 1 ? '' : 's'
        } added to strengths${
          res.applied.targetRole ? ` · target role set to ${res.applied.targetRole}` : ''
        }. A new resume was created in the Resume Engine.`,
      })
      await refreshProfile()
    } catch (e) {
      toast({
        title: 'Apply failed',
        description: (e as Error).message,
        variant: 'destructive',
      })
    } finally {
      setApplying(false)
    }
  }

  const selected = docs.find((d) => d.id === selectedId) || null

  return (
    <div>
      <ModuleHeader title={t('documentsTitle')} subtitle={t('documentsSub')} icon={FileScan} />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_440px] gap-4 items-start">
        {/* LEFT — upload + list */}
        <div className="space-y-4">
          {/* Upload zone */}
          <Card
            onDragOver={(e) => {
              e.preventDefault()
              setDragging(true)
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => inputRef.current?.click()}
            className={cn(
              'border-2 border-dashed cursor-pointer transition-all hover:border-brand/50 hover:bg-brand-soft/20',
              dragging ? 'border-brand bg-brand-soft/40 scale-[1.005]' : 'border-border'
            )}
          >
            <CardContent className="p-8 flex flex-col items-center justify-center text-center gap-3">
              {uploading ? (
                <>
                  <div className="h-12 w-12 rounded-xl bg-brand-soft text-brand flex items-center justify-center ring-1 ring-brand/20">
                    <Spinner className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="text-sm font-medium">{t('parsing')}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      AI is reading your document with vision OCR…
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="h-12 w-12 rounded-xl bg-brand-soft text-brand flex items-center justify-center ring-1 ring-brand/20">
                    <UploadCloud className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="text-sm font-medium">
                      {t('upload')} a resume, certificate or image
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Drag &amp; drop or click · PNG, JPG, PDF · AI extracts everything
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-1 rounded-full pointer-events-none"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Sparkles className="h-3.5 w-3.5 text-brand" /> {t('extract')} with AI
                  </Button>
                </>
              )}
              <input
                ref={inputRef}
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                onChange={onInputChange}
              />
            </CardContent>
          </Card>

          {/* Documents list */}
          {loading ? (
            <Card>
              <CardContent className="p-8 flex items-center justify-center">
                <Spinner className="h-6 w-6 text-brand" />
              </CardContent>
            </Card>
          ) : docs.length === 0 ? (
            <EmptyState />
          ) : (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <FileText className="h-4 w-4 text-brand" />
                  Your documents
                  <Badge variant="outline" className="ml-auto text-[10px]">
                    {docs.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="max-h-[60vh]">
                  <div className="space-y-2 pr-2">
                    {docs.map((doc, i) => (
                      <motion.div
                        key={doc.id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: Math.min(i * 0.03, 0.3) }}
                      >
                        <DocCard
                          doc={doc}
                          selected={selectedId === doc.id}
                          onSelect={() => setSelectedId(doc.id)}
                          onDelete={() => remove(doc.id)}
                        />
                      </motion.div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </div>

        {/* RIGHT — preview panel */}
        <div className="lg:sticky lg:top-4">
          <AnimatePresence mode="wait">
            {selected ? (
              <motion.div
                key={selected.id}
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.2 }}
              >
                <PreviewPanel
                  doc={selected}
                  applying={applying}
                  onApply={() => apply(selected.id)}
                  onClose={() => setSelectedId(null)}
                />
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <Card className="border-dashed">
                  <CardContent className="p-8 text-center">
                    <div className="mx-auto h-10 w-10 rounded-xl bg-muted/60 flex items-center justify-center mb-3">
                      <FileScan className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-medium">No document selected</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Click a parsed document on the left to preview the AI-extracted data and
                      apply it to your career profile.
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}

function EmptyState() {
  const { t } = useApp()
  return (
    <Card className="border-dashed">
      <CardContent className="p-10 flex flex-col items-center text-center gap-3">
        <div className="relative">
          <div className="absolute inset-0 blur-2xl bg-brand/20 rounded-full" />
          <div className="relative h-16 w-16 rounded-2xl bg-brand-soft text-brand flex items-center justify-center ring-1 ring-brand/30">
            <FileScan className="h-8 w-8" />
          </div>
        </div>
        <div>
          <p className="text-base font-semibold">Upload your first document</p>
          <p className="text-sm text-muted-foreground mt-1 max-w-md">
            Drop a resume, certificate or any career image above. Our vision AI will extract
            structured data and let you build your profile in one click.
          </p>
        </div>
        <Badge variant="outline" className="bg-brand-soft/40 border-brand/30 text-brand">
          {t('extract')} with vision AI
        </Badge>
      </CardContent>
    </Card>
  )
}

function DocCard({
  doc,
  selected,
  onSelect,
  onDelete,
}: {
  doc: DocListItem
  selected: boolean
  onSelect: () => void
  onDelete: () => void
}) {
  const typeBadge = TYPE_BADGE[doc.type] || TYPE_BADGE.other
  const statusBadge = STATUS_BADGE[doc.status] || STATUS_BADGE.pending
  const canPreview = doc.status === 'parsed' && !!doc.parsed

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect()
        }
      }}
      className={cn(
        'group relative rounded-xl border p-3 cursor-pointer transition-all hover:border-brand/40 hover:bg-brand-soft/20',
        selected ? 'border-brand bg-brand-soft/30 ring-1 ring-brand/30' : 'border-border bg-card'
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            'shrink-0 h-9 w-9 rounded-lg flex items-center justify-center ring-1',
            doc.type === 'resume'
              ? 'bg-brand/10 text-brand ring-brand/20'
              : doc.type === 'certificate'
                ? 'bg-amber-500/10 text-amber-600 ring-amber-500/20'
                : 'bg-muted text-muted-foreground ring-border'
          )}
        >
          {doc.type === 'certificate' ? (
            <Award className="h-4 w-4" />
          ) : (
            <FileText className="h-4 w-4" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium truncate max-w-[260px]">{doc.filename}</span>
            <Badge variant="outline" className={cn('text-[10px] py-0 px-1.5', typeBadge.cls)}>
              {typeBadge.label}
            </Badge>
          </div>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <Badge variant="outline" className={cn('text-[10px] py-0 px-1.5', statusBadge.cls)}>
              {doc.status === 'parsed' && <CheckCircle2 className="h-3 w-3 mr-1" />}
              {doc.status === 'error' && <FileWarning className="h-3 w-3 mr-1" />}
              {doc.status === 'pending' && <Spinner className="h-3 w-3 mr-1" />}
              {statusBadge.label}
            </Badge>
            <span className="text-xs text-muted-foreground truncate">{summaryFor(doc)}</span>
          </div>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onDelete()
          }}
          className="shrink-0 h-7 w-7 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          aria-label="Delete document"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      {canPreview && !selected && (
        <div className="absolute top-2 end-2 text-[10px] text-brand opacity-0 group-hover:opacity-100 transition-opacity">
          click to preview →
        </div>
      )}
    </div>
  )
}

function PreviewPanel({
  doc,
  applying,
  onApply,
  onClose,
}: {
  doc: DocListItem
  applying: boolean
  onApply: () => void
  onClose: () => void
}) {
  if (doc.type === 'certificate') {
    const cert = parseParsed<ParsedCert>(doc.parsed)
    return (
      <Card className="overflow-hidden">
        <CardHeader className="pb-2 flex-row items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Award className="h-4 w-4 text-amber-500" /> Certificate preview
          </CardTitle>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {cert ? (
            <div className="space-y-2">
              <Field icon={<Award className="h-3.5 w-3.5" />} label="Certificate" value={cert.name} />
              <Field icon={<BadgeCheck className="h-3.5 w-3.5" />} label="Issuer" value={cert.issuer} />
              <Field icon={<CheckCircle2 className="h-3.5 w-3.5" />} label="Date" value={cert.date} />
              <Field icon={<User className="h-3.5 w-3.5" />} label="Holder" value={cert.holderName} />
              {cert.credentialId && (
                <Field icon={<FileText className="h-3.5 w-3.5" />} label="Credential ID" value={cert.credentialId} />
              )}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No structured data available.</p>
          )}
          <div className="text-xs text-muted-foreground pt-1 border-t">{doc.filename}</div>
        </CardContent>
      </Card>
    )
  }

  const r = parseParsed<ParsedResume>(doc.parsed)
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2 flex-row items-center justify-between">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <FileScan className="h-4 w-4 text-brand" /> Extracted data
        </CardTitle>
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {r ? (
          <>
            {/* Identity */}
            <div className="rounded-lg bg-brand-soft/40 border border-brand/20 p-3">
              <div className="text-sm font-semibold flex items-center gap-2">
                <User className="h-4 w-4 text-brand" />
                {r.contact?.name || 'Unknown candidate'}
              </div>
              <div className="mt-2 grid grid-cols-1 gap-1 text-xs text-muted-foreground">
                {r.contact?.email && (
                  <div className="flex items-center gap-1.5">
                    <Mail className="h-3 w-3" /> {r.contact.email}
                  </div>
                )}
                {r.contact?.phone && (
                  <div className="flex items-center gap-1.5">
                    <Phone className="h-3 w-3" /> {r.contact.phone}
                  </div>
                )}
                {r.contact?.location && (
                  <div className="flex items-center gap-1.5">
                    <MapPin className="h-3 w-3" /> {r.contact.location}
                  </div>
                )}
                {r.contact?.linkedin && (
                  <div className="flex items-center gap-1.5 truncate">
                    <Linkedin className="h-3 w-3 shrink-0" />
                    <span className="truncate">{r.contact.linkedin}</span>
                  </div>
                )}
                {r.contact?.website && (
                  <div className="flex items-center gap-1.5 truncate">
                    <Globe className="h-3 w-3 shrink-0" />
                    <span className="truncate">{r.contact.website}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Summary */}
            {r.summary && (
              <Section icon={<FileText className="h-3.5 w-3.5" />} title="Professional summary">
                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-4">
                  {r.summary}
                </p>
              </Section>
            )}

            {/* Stats */}
            <div className="grid grid-cols-3 gap-2">
              <Stat icon={<Briefcase className="h-3.5 w-3.5" />} label="Experience" value={r.experience?.length ?? 0} />
              <Stat icon={<GraduationCap className="h-3.5 w-3.5" />} label="Education" value={r.education?.length ?? 0} />
              <Stat icon={<Wrench className="h-3.5 w-3.5" />} label="Skills" value={r.skills?.length ?? 0} />
            </div>

            {/* Experience */}
            {r.experience && r.experience.length > 0 && (
              <Section icon={<Briefcase className="h-3.5 w-3.5" />} title="Experience">
                <div className="space-y-2">
                  {r.experience.slice(0, 3).map((e, i) => (
                    <div key={i} className="rounded-md border p-2">
                      <div className="text-xs font-medium">
                        {e.title || 'Role'}
                        {e.company && <span className="text-muted-foreground"> · {e.company}</span>}
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">
                        {[e.startDate, e.endDate].filter(Boolean).join(' — ')}
                        {e.location ? ` · ${e.location}` : ''}
                      </div>
                      {e.bullets && e.bullets.length > 0 && (
                        <ul className="mt-1 space-y-0.5">
                          {e.bullets.slice(0, 2).map((b, j) => (
                            <li key={j} className="text-[11px] text-muted-foreground flex gap-1">
                              <span className="text-brand">•</span>
                              <span className="line-clamp-1">{b}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                  {r.experience.length > 3 && (
                    <div className="text-[10px] text-muted-foreground text-center pt-1">
                      +{r.experience.length - 3} more
                    </div>
                  )}
                </div>
              </Section>
            )}

            {/* Skills */}
            {r.skills && r.skills.length > 0 && (
              <Section icon={<Wrench className="h-3.5 w-3.5" />} title="Skills">
                <div className="flex flex-wrap gap-1.5">
                  {r.skills.slice(0, 24).map((s, i) => (
                    <Badge key={i} variant="outline" className="bg-brand/10 text-brand border-brand/30 text-[10px]">
                      {s}
                    </Badge>
                  ))}
                  {r.skills.length > 24 && (
                    <span className="text-[10px] text-muted-foreground self-center">
                      +{r.skills.length - 24}
                    </span>
                  )}
                </div>
              </Section>
            )}

            {/* Certifications */}
            {r.certifications && r.certifications.length > 0 && (
              <Section icon={<BadgeCheck className="h-3.5 w-3.5" />} title="Certifications">
                <ul className="space-y-1">
                  {r.certifications.map((c, i) => (
                    <li key={i} className="text-xs text-muted-foreground flex gap-1.5">
                      <span className="text-amber-500">•</span>
                      <span>
                        <span className="font-medium text-foreground">{c.name}</span>
                        {c.issuer && ` — ${c.issuer}`}
                        {c.date && ` · ${c.date}`}
                      </span>
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            {/* Projects */}
            {r.projects && r.projects.length > 0 && (
              <Section icon={<FolderGit2 className="h-3.5 w-3.5" />} title="Projects">
                <ul className="space-y-1">
                  {r.projects.slice(0, 4).map((p, i) => (
                    <li key={i} className="text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">{p.name}</span>
                      {p.description && <span> — {p.description}</span>}
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            {/* Apply action */}
            <div className="pt-2 border-t">
              <Button
                onClick={onApply}
                disabled={applying}
                className="w-full bg-brand text-brand-foreground hover:bg-brand/90 rounded-full"
              >
                {applying ? (
                  <>
                    <Spinner /> Applying…
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" /> Apply to my profile
                  </>
                )}
              </Button>
              <p className="text-[10px] text-muted-foreground text-center mt-2">
                Adds skills to your strengths, sets a target role and creates a new resume.
              </p>
            </div>
          </>
        ) : (
          <p className="text-xs text-muted-foreground">
            {doc.status === 'error'
              ? 'This document could not be parsed. Try uploading a clearer image or a different file.'
              : 'No structured data available.'}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

function Section({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-xs font-medium mb-1.5 text-foreground">
        <span className="text-brand">{icon}</span>
        {title}
      </div>
      {children}
    </div>
  )
}

function Stat({ icon, label, value }: { icon: ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-lg border p-2 text-center">
      <div className="flex items-center justify-center text-brand mb-0.5">{icon}</div>
      <div className="text-base font-bold leading-none">{value}</div>
      <div className="text-[10px] text-muted-foreground mt-0.5">{label}</div>
    </div>
  )
}

function Field({ icon, label, value }: { icon: ReactNode; label: string; value?: string }) {
  if (!value) return null
  return (
    <div className="flex items-start gap-2 text-xs">
      <span className="text-muted-foreground mt-0.5">{icon}</span>
      <div>
        <div className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</div>
        <div className="font-medium">{value}</div>
      </div>
    </div>
  )
}
