'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { api } from '@/lib/api-client'
import { useApp } from '@/components/app-provider'
import { useToast } from '@/hooks/use-toast'
import { ModuleHeader } from '@/components/careeros/module-header'
import { Spinner } from '@/components/careeros/loading'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Sun, Calendar, Sparkles, Clock, CheckCircle2, AlertCircle, Mic, Volume2, Square } from 'lucide-react'
import ReactMarkdown from 'react-markdown'

export function BriefingModule() {
  const { t } = useApp()
  const { toast } = useToast()
  const [briefings, setBriefings] = useState<any[]>([])
  const [active, setActive] = useState<any>(null)
  const [busy, setBusy] = useState<string | null>(null)

  useEffect(() => {
    api<{ briefings: any[] }>('/api/briefing').then(({ briefings }) => {
      setBriefings(briefings)
      if (briefings[0]) setActive({ ...briefings[0], content: typeof briefings[0].content === 'string' ? JSON.parse(briefings[0].content) : briefings[0].content })
    })
  }, [])

  const generate = async (type: 'daily' | 'weekly') => {
    setBusy(type)
    try {
      const { briefing } = await api<{ briefing: any }>('/api/briefing', { method: 'POST', body: { type } })
      const parsed = { ...briefing, content: typeof briefing.content === 'string' ? JSON.parse(briefing.content) : briefing.content }
      setBriefings((b) => [parsed, ...b])
      setActive(parsed)
      toast({ title: `${type === 'daily' ? 'Daily' : 'Weekly'} briefing ready` })
    } catch (e) { toast({ title: 'Failed', description: (e as Error).message, variant: 'destructive' }) }
    finally { setBusy(null) }
  }

  return (
    <div>
      <ModuleHeader title={t('briefingTitle')} subtitle={t('briefingSub')} icon={Sun}
        actions={
          <div className="flex gap-2">
            <Button onClick={() => generate('daily')} disabled={busy === 'daily'} size="sm" className="rounded-full bg-brand text-brand-foreground hover:bg-brand/90">
              {busy === 'daily' ? <Spinner /> : <Sun className="h-4 w-4" />} {t('dailyBriefing')}
            </Button>
            <Button onClick={() => generate('weekly')} disabled={busy === 'weekly'} size="sm" variant="outline" className="rounded-full">
              {busy === 'weekly' ? <Spinner /> : <Calendar className="h-4 w-4" />} {t('weeklyPlan')}
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4">
        {active ? (
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="h-9 w-9 rounded-lg bg-brand-soft text-brand flex items-center justify-center">
                    {active.type === 'daily' ? <Sun className="h-4.5 w-4.5" /> : <Calendar className="h-4.5 w-4.5" />}
                  </div>
                  <div>
                    <div className="font-semibold capitalize">{active.type} briefing</div>
                    <div className="text-[11px] text-muted-foreground">{new Date(active.createdAt).toLocaleString()}</div>
                  </div>
                </div>
                {active.type === 'daily' && <SpeakButton text={typeof active.content === 'object' ? active.content.summary : String(active.content)} />}
              </div>

              {active.type === 'daily' ? (
                <div className="prose-careeros text-sm"><ReactMarkdown>{active.content?.summary || ''}</ReactMarkdown></div>
              ) : (
                <div className="space-y-3">
                  {active.content?.summary && <p className="text-sm font-medium">{active.content.summary}</p>}
                  {active.content?.theme && <Badge className="bg-brand/15 text-brand border-brand/30">{active.content.theme}</Badge>}
                  {active.content?.days?.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-xs font-semibold text-muted-foreground uppercase">Day-by-day plan</div>
                      {active.content.days.map((d: any, i: number) => (
                        <div key={i} className="flex items-start gap-2.5 rounded-lg border p-2.5">
                          <div className="h-6 w-6 rounded-full bg-brand-soft text-brand flex items-center justify-center text-[10px] font-bold shrink-0">{i + 1}</div>
                          <div><div className="text-sm font-medium">{d.day}</div><div className="text-xs text-muted-foreground">{d.focus}</div><div className="text-xs mt-0.5">{d.action}</div></div>
                        </div>
                      ))}
                    </div>
                  )}
                  {active.content?.skillToPractice && <div className="text-xs p-2.5 rounded-lg bg-muted/30">🎯 Skill to practice: <span className="font-medium">{active.content.skillToPractice}</span></div>}
                  {active.content?.weeklyGoal && <div className="text-xs p-2.5 rounded-lg bg-brand-soft/40 border border-brand/20">🏆 Weekly goal: <span className="font-medium">{active.content.weeklyGoal}</span></div>}
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card><CardContent className="p-12 text-center text-muted-foreground"><Sun className="h-10 w-10 mx-auto mb-3 opacity-40" /><p>Generate your first briefing to get an AI-powered daily or weekly career action plan.</p></CardContent></Card>
        )}

        <Card className="h-fit">
          <CardContent className="p-3">
            <div className="text-xs font-medium text-muted-foreground px-2 py-1.5">History</div>
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-1 pe-1">
                {briefings.map((b) => (
                  <button key={b.id} onClick={() => setActive({ ...b, content: typeof b.content === 'string' ? JSON.parse(b.content) : b.content })} className={`group flex w-full items-start gap-2 rounded-lg p-2.5 text-start transition-all ${active?.id === b.id ? 'bg-brand-soft' : 'hover:bg-accent'}`}>
                    <div className={`mt-0.5 h-6 w-6 shrink-0 rounded-md flex items-center justify-center ${b.type === 'daily' ? 'bg-amber-500/15 text-amber-600' : 'bg-brand/15 text-brand'}`}>
                      {b.type === 'daily' ? <Sun className="h-3 w-3" /> : <Calendar className="h-3 w-3" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium capitalize">{b.type} briefing</div>
                      <div className="text-[10px] text-muted-foreground">{new Date(b.createdAt).toLocaleDateString()}</div>
                    </div>
                  </button>
                ))}
                {briefings.length === 0 && <p className="text-xs text-muted-foreground text-center py-6">No briefings yet.</p>}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function SpeakButton({ text }: { text: string }) {
  const [playing, setPlaying] = useState(false)
  const audioRef = useState<HTMLAudioElement | null>(null)
  const speak = async () => {
    if (!text) return
    setPlaying(true)
    try {
      const res = await fetch('/api/tts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: text.slice(0, 1000) }) })
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const audio = new Audio(url)
      audio.onended = () => setPlaying(false)
      audio.onerror = () => setPlaying(false)
      await audio.play()
    } catch { setPlaying(false) }
  }
  return <Button variant="ghost" size="sm" onClick={() => { if (playing) { audioRef[0]?.pause(); setPlaying(false) } else speak() }}><Volume2 className="h-3.5 w-3.5" />{playing ? 'Stop' : 'Listen'}</Button>
}
