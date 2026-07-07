'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { api } from '@/lib/api-client'
import { useApp } from '@/components/app-provider'
import { useToast } from '@/hooks/use-toast'
import { ModuleHeader } from '@/components/careeros/module-header'
import { Spinner } from '@/components/careeros/loading'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Mic, Plus, Send, Trophy, CheckCircle2, AlertCircle, Brain, Star, RotateCcw } from 'lucide-react'
import { Interview, InterviewMessage } from '@/lib/types'

const TYPES = [
  { id: 'technical', label: 'technical' },
  { id: 'hr', label: 'hr' },
  { id: 'behavioral', label: 'behavioral' },
  { id: 'industry', label: 'industry' },
] as const

export function InterviewModule() {
  const { t } = useApp()
  const { toast } = useToast()
  const [interviews, setInterviews] = useState<Interview[]>([])
  const [active, setActive] = useState<Interview | null>(null)
  const [answer, setAnswer] = useState('')
  const [busy, setBusy] = useState(false)
  const [ending, setEnding] = useState(false)
  const [showSetup, setShowSetup] = useState(false)
  const [setup, setSetup] = useState({ type: 'technical', role: 'Senior Software Engineer', company: '' })
  const scrollRef = useRef<HTMLDivElement>(null)

  const load = useCallback(async () => {
    const { interviews } = await api<{ interviews: any[] }>('/api/interview')
    const mapped: Interview[] = interviews.map((i) => ({
      ...i,
      messages: typeof i.messages === 'string' ? JSON.parse(i.messages) : i.messages,
    }))
    setInterviews(mapped)
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [active?.messages])

  const start = async () => {
    setBusy(true)
    try {
      const { interview } = await api<{ interview: any }>('/api/interview', { method: 'POST', body: setup })
      await load()
      const fresh = { ...interview, messages: typeof interview.messages === 'string' ? JSON.parse(interview.messages) : interview.messages }
      setActive(fresh as Interview)
      setShowSetup(false)
      // ask first question
      askNext(interview.id)
    } catch (e) {
      toast({ title: 'Failed', description: (e as Error).message, variant: 'destructive' })
    } finally { setBusy(false) }
  }

  const askNext = async (id: string) => {
    setBusy(true)
    try {
      const { history: newHistory } = await api<{ question: string; evaluation: any; history: InterviewMessage[] }>(`/api/interview/${id}/next`, {
        method: 'POST', body: { answer: undefined },
      })
      setActive((prev) => (prev ? { ...prev, messages: newHistory, status: 'active' as const } : prev))
    } catch (e) {
      toast({ title: 'Failed', description: (e as Error).message, variant: 'destructive' })
    } finally { setBusy(false) }
  }

  const submit = async () => {
    if (!active || !answer.trim() || busy) return
    const ans = answer
    setAnswer('')
    setBusy(true)
    try {
      const { history } = await api<{ question: string; evaluation: any; history: InterviewMessage[] }>(`/api/interview/${active.id}/next`, {
        method: 'POST', body: { answer: ans },
      })
      setActive((prev) => (prev ? { ...prev, messages: history } : prev))
    } catch (e) {
      toast({ title: 'Failed', description: (e as Error).message, variant: 'destructive' })
      setAnswer(ans)
    } finally { setBusy(false) }
  }

  const endInterview = async () => {
    if (!active) return
    setEnding(true)
    try {
      const { score, summary } = await api<{ score: number; summary: string }>(`/api/interview/${active.id}/evaluate`, { method: 'POST' })
      setActive({ ...active, status: 'completed', score, summary })
      await load()
      toast({ title: 'Interview complete', description: `Final score: ${score}/100` })
    } catch (e) {
      toast({ title: 'Failed', description: (e as Error).message, variant: 'destructive' })
    } finally { setEnding(false) }
  }

  return (
    <div>
      <ModuleHeader
        title={t('interviewTitle')}
        subtitle={t('interviewSub')}
        icon={Mic}
        actions={
          <Button size="sm" className="rounded-full bg-brand text-brand-foreground hover:bg-brand/90" onClick={() => setShowSetup(true)}>
            <Plus className="h-4 w-4" /> {t('startInterview')}
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-4">
        <Card className="h-fit">
          <CardContent className="p-3">
            <div className="text-xs font-medium text-muted-foreground px-2 py-1.5">{interviews.length} sessions</div>
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-1 pe-1">
                {interviews.map((iv) => (
                  <button
                    key={iv.id}
                    onClick={() => setActive(iv)}
                    className={`group flex w-full items-start gap-2 rounded-lg p-2.5 text-start transition-all ${active?.id === iv.id ? 'bg-brand-soft' : 'hover:bg-accent'}`}
                  >
                    <div className={`mt-0.5 h-7 w-7 shrink-0 rounded-md flex items-center justify-center ${iv.status === 'completed' ? 'bg-brand text-brand-foreground' : 'bg-muted text-muted-foreground'}`}>
                      {iv.status === 'completed' ? <Trophy className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{iv.role}</div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Badge variant="outline" className="h-4 px-1 text-[9px] capitalize">{t(iv.type as any)}</Badge>
                        {iv.score != null && <span className="text-[10px] text-brand font-medium">{iv.score}/100</span>}
                      </div>
                    </div>
                  </button>
                ))}
                {interviews.length === 0 && <p className="text-xs text-muted-foreground text-center py-6">{t('empty')}</p>}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {active ? (
          <Card className="flex flex-col h-[70vh]">
            <div className="flex items-center justify-between border-b p-3">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-brand-soft text-brand flex items-center justify-center"><Brain className="h-4 w-4" /></div>
                <div>
                  <div className="text-sm font-semibold">{active.role}</div>
                  <div className="text-[10px] text-muted-foreground capitalize">{t(active.type as any)} interview · {active.company || 'Company'}</div>
                </div>
              </div>
              {active.status === 'active' && (
                <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={endInterview} disabled={ending}>
                  {ending ? <Spinner /> : <Trophy className="h-3.5 w-3.5" />} {t('endInterview')}
                </Button>
              )}
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
              <AnimatePresence>
                {active.messages.map((m, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${m.role === 'user' ? 'bg-brand text-brand-foreground rounded-br-sm' : 'bg-muted rounded-bl-sm'}`}>
                      <div className="whitespace-pre-wrap leading-relaxed">{m.content}</div>
                      {m.evaluation && (
                        <div className="mt-2 pt-2 border-t border-white/20 space-y-1.5">
                          <div className="flex items-center gap-1.5 text-xs font-semibold">
                            <Star className="h-3 w-3" /> Score: {m.evaluation.score}/100
                          </div>
                          {m.evaluation.feedback && <div className="text-xs opacity-90">{m.evaluation.feedback}</div>}
                          {m.evaluation.improvements?.length > 0 && (
                            <div className="text-xs space-y-0.5">
                              <div className="flex items-center gap-1 opacity-80"><AlertCircle className="h-3 w-3" /> Improve:</div>
                              {m.evaluation.improvements.map((imp: string, j: number) => <div key={j} className="opacity-80">· {imp}</div>)}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              {busy && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}
            </div>

            {active.status === 'active' ? (
              <div className="border-t p-3 flex gap-2">
                <Input
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit() } }}
                  placeholder={t('yourAnswer')}
                  disabled={busy}
                  className="flex-1"
                />
                <Button onClick={submit} disabled={busy || !answer.trim()} className="bg-brand text-brand-foreground hover:bg-brand/90">
                  {busy ? <Spinner /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
            ) : (
              <div className="border-t p-4">
                {active.summary && (
                  <div className="rounded-lg bg-muted/40 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Trophy className="h-4 w-4 text-brand" />
                      <span className="text-sm font-semibold">Final Score: {active.score}/100</span>
                    </div>
                    <div className="text-sm whitespace-pre-wrap prose-careeros">{active.summary}</div>
                  </div>
                )}
              </div>
            )}
          </Card>
        ) : (
          <Card>
            <CardContent className="p-12 text-center text-muted-foreground">
              <Mic className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p>Start an interview to practice with your AI interviewer.</p>
            </CardContent>
          </Card>
        )}
      </div>

      {showSetup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowSetup(false)}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-card border rounded-2xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><Mic className="h-5 w-5 text-brand" /> {t('startInterview')}</h3>
            <div className="space-y-3">
              <div>
                <Label className="text-xs text-muted-foreground">{t('interviewType')}</Label>
                <Select value={setup.type} onValueChange={(v) => setSetup({ ...setup, type: v })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{TYPES.map((tp) => <SelectItem key={tp.id} value={tp.id}>{t(tp.label as any)}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">{t('role')}</Label>
                <Input value={setup.role} onChange={(e) => setSetup({ ...setup, role: e.target.value })} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">{t('company')}</Label>
                <Input value={setup.company} onChange={(e) => setSetup({ ...setup, company: e.target.value })} placeholder="Optional" className="mt-1" />
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <Button variant="outline" className="flex-1" onClick={() => setShowSetup(false)}>{t('cancel')}</Button>
              <Button className="flex-1 bg-brand text-brand-foreground hover:bg-brand/90" onClick={start} disabled={busy}>
                {busy ? <Spinner /> : <Mic className="h-4 w-4" />} {t('startInterview')}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}
