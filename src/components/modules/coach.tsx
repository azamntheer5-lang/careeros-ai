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
import { BrainCircuit, Plus, Send, MessageSquare, Sparkles, User, Trash2 } from 'lucide-react'
import { CoachSession, CoachMessage } from '@/lib/types'
import ReactMarkdown from 'react-markdown'

const FOCUSES = [
  { id: 'career-planning', label: 'careerPlanning' },
  { id: 'promotion', label: 'promotion' },
  { id: 'salary', label: 'salaryAdvice' },
  { id: 'skills', label: 'skillsFocus' },
  { id: 'industry', label: 'industryInsights' },
  { id: 'pivot', label: 'pivot' },
] as const

const SUGGESTIONS: Record<string, string[]> = {
  'career-planning': ['Map a 2-year plan to Staff Engineer', 'What skills should I prioritize next quarter?'],
  promotion: ['Build a case for my promotion review', 'How do I prove scope & impact to my manager?'],
  salary: ['Help me negotiate a $40k raise', 'Research market rate for my role'],
  skills: ['What should I learn to stay relevant in AI?', 'Create a 90-day upskilling plan'],
  industry: ['Is the AI hype cycle peaking?', 'Which sectors are hiring senior engineers?'],
  pivot: ['Pivot from backend to ML engineering', 'Move from startup to Big Tech — playbook'],
}

export function CoachModule() {
  const { t } = useApp()
  const { toast } = useToast()
  const [sessions, setSessions] = useState<CoachSession[]>([])
  const [active, setActive] = useState<CoachSession | null>(null)
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [showSetup, setShowSetup] = useState(false)
  const [setup, setSetup] = useState({ focus: 'career-planning' })
  const scrollRef = useRef<HTMLDivElement>(null)

  const load = useCallback(async () => {
    const { sessions } = await api<{ sessions: any[] }>('/api/coach')
    const mapped: CoachSession[] = sessions.map((s) => ({
      ...s,
      messages: typeof s.messages === 'string' ? JSON.parse(s.messages) : s.messages,
    }))
    setSessions(mapped)
  }, [])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [active?.messages])

  const start = async () => {
    setBusy(true)
    try {
      const { session } = await api<{ session: any }>('/api/coach', { method: 'POST', body: { focus: setup.focus, title: 'New Coaching Session' } })
      await load()
      const fresh = { ...session, messages: typeof session.messages === 'string' ? JSON.parse(session.messages) : session.messages }
      setActive(fresh as CoachSession)
      setShowSetup(false)
    } catch (e) {
      toast({ title: 'Failed', description: (e as Error).message, variant: 'destructive' })
    } finally { setBusy(false) }
  }

  const send = async (text?: string) => {
    const msg = (text ?? input).trim()
    if (!active || !msg || busy) return
    setBusy(true)
    // optimistic
    const optimistic = [...active.messages, { role: 'user' as const, content: msg }]
    setActive({ ...active, messages: optimistic })
    setInput('')
    try {
      const { reply, history } = await api<{ reply: string; history: CoachMessage[] }>(`/api/coach/${active.id}/chat`, {
        method: 'POST', body: { message: msg },
      })
      setActive({ ...active, messages: history, title: history.length <= 3 ? msg.slice(0, 50) : active.title })
      await load()
    } catch (e) {
      toast({ title: 'Failed', description: (e as Error).message, variant: 'destructive' })
      setActive({ ...active, messages: active.messages }) // revert
    } finally { setBusy(false) }
  }

  return (
    <div>
      <ModuleHeader
        title={t('coachTitle')}
        subtitle={t('coachSub')}
        icon={BrainCircuit}
        actions={
          <Button size="sm" className="rounded-full bg-brand text-brand-foreground hover:bg-brand/90" onClick={() => setShowSetup(true)}>
            <Plus className="h-4 w-4" /> {t('newSession')}
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-4">
        <Card className="h-fit">
          <CardContent className="p-3">
            <div className="text-xs font-medium text-muted-foreground px-2 py-1.5">{sessions.length} sessions</div>
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-1 pe-1">
                {sessions.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setActive(s)}
                    className={`group flex w-full items-start gap-2 rounded-lg p-2.5 text-start transition-all ${active?.id === s.id ? 'bg-brand-soft' : 'hover:bg-accent'}`}
                  >
                    <div className={`mt-0.5 h-7 w-7 shrink-0 rounded-md flex items-center justify-center ${active?.id === s.id ? 'bg-brand text-brand-foreground' : 'bg-muted text-muted-foreground'}`}>
                      <MessageSquare className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{s.title}</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">{new Date(s.updatedAt).toLocaleDateString()}</div>
                    </div>
                  </button>
                ))}
                {sessions.length === 0 && <p className="text-xs text-muted-foreground text-center py-6">{t('empty')}</p>}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {active ? (
          <Card className="flex flex-col h-[70vh]">
            <div className="flex items-center justify-between border-b p-3">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-brand to-brand/60 flex items-center justify-center text-brand-foreground"><BrainCircuit className="h-4 w-4" /></div>
                <div>
                  <div className="text-sm font-semibold truncate">{active.title}</div>
                  <Badge variant="outline" className="h-4 px-1.5 text-[9px] mt-0.5">{t(active.focus as any)}</Badge>
                </div>
              </div>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
              <AnimatePresence>
                {active.messages.map((m, i) => (
                  <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={`flex gap-2.5 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    <div className={`h-7 w-7 shrink-0 rounded-full flex items-center justify-center text-xs ${m.role === 'user' ? 'bg-muted text-muted-foreground' : 'bg-gradient-to-br from-brand to-brand/60 text-brand-foreground'}`}>
                      {m.role === 'user' ? <User className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5" />}
                    </div>
                    <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${m.role === 'user' ? 'bg-brand text-brand-foreground rounded-tr-sm' : 'bg-muted rounded-tl-sm'}`}>
                      {m.role === 'assistant'
                        ? <div className="prose-careeros"><ReactMarkdown>{m.content}</ReactMarkdown></div>
                        : <div className="whitespace-pre-wrap leading-relaxed">{m.content}</div>}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              {busy && (
                <div className="flex gap-2.5">
                  <div className="h-7 w-7 shrink-0 rounded-full bg-gradient-to-br from-brand to-brand/60 flex items-center justify-center text-brand-foreground"><Sparkles className="h-3.5 w-3.5" /></div>
                  <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}
            </div>

            {active.messages.length <= 1 && (
              <div className="px-4 pb-2 flex flex-wrap gap-1.5">
                {(SUGGESTIONS[active.focus] || SUGGESTIONS['career-planning']).map((s) => (
                  <button key={s} onClick={() => send(s)} className="text-xs rounded-full border px-3 py-1 hover:bg-accent hover:border-brand/40 transition">{s}</button>
                ))}
              </div>
            )}

            <div className="border-t p-3 flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
                placeholder={t('askAnything')}
                disabled={busy}
                className="flex-1"
              />
              <Button onClick={() => send()} disabled={busy || !input.trim()} className="bg-brand text-brand-foreground hover:bg-brand/90">
                {busy ? <Spinner /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-12 text-center text-muted-foreground">
              <BrainCircuit className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p>Start a coaching session to get personalized career guidance.</p>
            </CardContent>
          </Card>
        )}
      </div>

      {showSetup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowSetup(false)}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-card border rounded-2xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><BrainCircuit className="h-5 w-5 text-brand" /> {t('newSession')}</h3>
            <Label className="text-xs text-muted-foreground">Focus area</Label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {FOCUSES.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setSetup({ focus: f.id })}
                  className={`text-start rounded-lg border p-3 text-sm transition ${setup.focus === f.id ? 'border-brand bg-brand-soft' : 'hover:bg-accent'}`}
                >
                  <div className="font-medium">{t(f.label as any)}</div>
                </button>
              ))}
            </div>
            <div className="flex gap-2 mt-5">
              <Button variant="outline" className="flex-1" onClick={() => setShowSetup(false)}>{t('cancel')}</Button>
              <Button className="flex-1 bg-brand text-brand-foreground hover:bg-brand/90" onClick={start} disabled={busy}>
                {busy ? <Spinner /> : <Plus className="h-4 w-4" />} {t('create')}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}
