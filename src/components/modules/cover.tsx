'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { api } from '@/lib/api-client'
import { useApp } from '@/components/app-provider'
import { useToast } from '@/hooks/use-toast'
import { ModuleHeader } from '@/components/careeros/module-header'
import { Spinner } from '@/components/careeros/loading'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Mail, Sparkles, Copy, Trash2, Send, FileText, Clock } from 'lucide-react'
import { CoverLetter } from '@/lib/types'

const TYPES = [
  { id: 'cover', label: 'cover' },
  { id: 'followup', label: 'followup' },
  { id: 'thankyou', label: 'thankyou' },
  { id: 'networking', label: 'networking' },
  { id: 'referral', label: 'referral' },
] as const

const TONES = ['Professional', 'Warm', 'Confident', 'Concise', 'Enthusiastic', 'Story-driven']

export function CoverModule() {
  const { t } = useApp()
  const { toast } = useToast()
  const [type, setType] = useState('cover')
  const [tone, setTone] = useState('Professional')
  const [company, setCompany] = useState('')
  const [role, setRole] = useState('')
  const [resumeId, setResumeId] = useState('')
  const [resumeContext, setResumeContext] = useState('')
  const [jobContext, setJobContext] = useState('')
  const [resumes, setResumes] = useState<{ id: string; title: string }[]>([])
  const [letters, setLetters] = useState<CoverLetter[]>([])
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    api<{ resumes: any[] }>('/api/resumes').then(({ resumes }) => {
      setResumes(resumes.map((r) => ({ id: r.id, title: r.title })))
    })
    loadLetters()
  }, [])

  const loadLetters = async () => {
    const { letters } = await api<{ letters: CoverLetter[] }>('/api/cover-letter')
    setLetters(letters)
  }

  const generate = async () => {
    if (!jobContext.trim() || (!resumeId && !resumeContext.trim())) {
      toast({ title: 'Missing input', description: 'Add your background and the target context.', variant: 'destructive' })
      return
    }
    setBusy(true)
    try {
      await api('/api/cover-letter', {
        method: 'POST',
        body: { type, tone, company, role, resumeId: resumeId || undefined, resumeContext, jobContext },
      })
      toast({ title: 'Letter generated', description: 'Saved to your library.' })
      loadLetters()
    } catch (e) {
      toast({ title: 'Failed', description: (e as Error).message, variant: 'destructive' })
    } finally { setBusy(false) }
  }

  const remove = async (id: string) => {
    await api(`/api/cover-letter/${id}`, { method: 'DELETE' })
    loadLetters()
  }

  const copy = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({ title: 'Copied', description: 'Letter copied to clipboard.' })
  }

  return (
    <div>
      <ModuleHeader title={t('coverTitle')} subtitle={t('coverSub')} icon={Mail} />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4">
        <div className="space-y-4">
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">{t('letterType')}</Label>
                  <Select value={type} onValueChange={setType}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>{TYPES.map((tp) => <SelectItem key={tp.id} value={tp.id}>{t(tp.label as any)}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">{t('tone')}</Label>
                  <Select value={tone} onValueChange={setTone}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>{TONES.map((tn) => <SelectItem key={tn} value={tn}>{tn}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">{t('company')}</Label>
                  <Input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="e.g. Vercel" className="mt-1 h-9" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">{t('role')}</Label>
                  <Input value={role} onChange={(e) => setRole(e.target.value)} placeholder="e.g. Senior Engineer" className="mt-1 h-9" />
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">{t('resumeContext')}</Label>
                <Select value={resumeId} onValueChange={(v) => { setResumeId(v); setResumeContext('') }}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Load from a resume (or paste below)" /></SelectTrigger>
                  <SelectContent>{resumes.map((r) => <SelectItem key={r.id} value={r.id}>{r.title}</SelectItem>)}</SelectContent>
                </Select>
                <Textarea value={resumeContext} onChange={(e) => setResumeContext(e.target.value)} rows={3} placeholder="…or paste your background / key achievements" className="mt-2" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">{t('jobContext')}</Label>
                <Textarea value={jobContext} onChange={(e) => setJobContext(e.target.value)} rows={4} placeholder="The role, the team, why you want it, the hiring manager's name…" className="mt-1" />
              </div>
              <Button onClick={generate} disabled={busy} className="w-full bg-brand text-brand-foreground hover:bg-brand/90 rounded-full">
                {busy ? <><Spinner /> {t('generating')}</> : <><Sparkles className="h-4 w-4" /> {t('generate')}</>}
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card className="h-fit lg:sticky lg:top-20">
          <CardContent className="p-3">
            <div className="flex items-center justify-between px-2 py-1.5">
              <span className="text-xs font-medium text-muted-foreground">{letters.length} letters</span>
            </div>
            <ScrollArea className="max-h-[70vh]">
              <div className="space-y-2 pe-1">
                {letters.map((l) => (
                  <motion.div key={l.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="group rounded-lg border p-3 hover:border-brand/40 transition-colors">
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <Badge variant="secondary" className="text-[10px] capitalize">{t(l.type as any) || l.type}</Badge>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                        <button onClick={() => copy(l.content)} className="text-muted-foreground hover:text-brand p-1" aria-label="Copy"><Copy className="h-3.5 w-3.5" /></button>
                        <button onClick={() => remove(l.id)} className="text-muted-foreground hover:text-destructive p-1" aria-label="Delete"><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    </div>
                    <div className="text-sm font-medium">{l.company || '—'} {l.role && <span className="text-muted-foreground">· {l.role}</span>}</div>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-3 whitespace-pre-wrap">{l.content}</p>
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-2"><Clock className="h-3 w-3" /> {new Date(l.updatedAt).toLocaleDateString()}</div>
                  </motion.div>
                ))}
                {letters.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Mail className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    <p className="text-xs">{t('empty')}</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {letters.length > 0 && (
        <Card className="mt-4">
          <CardContent className="p-5">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><FileText className="h-4 w-4 text-brand" /> Latest letter</h3>
            <div className="rounded-lg bg-muted/40 p-4 whitespace-pre-wrap text-sm leading-relaxed">{letters[0].content}</div>
            <div className="flex gap-2 mt-3">
              <Button variant="outline" size="sm" onClick={() => copy(letters[0].content)}><Copy className="h-3.5 w-3.5" /> Copy</Button>
              <Button variant="outline" size="sm" onClick={() => toast({ title: 'Sent', description: 'Draft ready to send via your email client.' })}><Send className="h-3.5 w-3.5" /> Send</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
