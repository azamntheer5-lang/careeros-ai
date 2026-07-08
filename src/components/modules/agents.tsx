'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { api } from '@/lib/api-client'
import { useApp } from '@/components/app-provider'
import { useAppStore } from '@/lib/store'
import { useToast } from '@/hooks/use-toast'
import { ModuleHeader } from '@/components/careeros/module-header'
import { Spinner } from '@/components/careeros/loading'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Compass, FileText, Briefcase, Mic, GraduationCap, Play, Clock, ArrowRight, Sparkles, Bot } from 'lucide-react'

const ICONS: Record<string, any> = { Compass, FileText, Briefcase, Mic, GraduationCap }

type AgentDef = { id: string; name: string; icon: string; color: string; desc: string }
type AgentRun = { id: string; agent: string; status: string; summary: string; actions: any[]; insights: string[]; createdAt: string }

export function AgentsModule() {
  const { t } = useApp()
  const { set: setModule } = useAppStore()
  const { toast } = useToast()
  const [agents, setAgents] = useState<AgentDef[]>([])
  const [runs, setRuns] = useState<AgentRun[]>([])
  const [running, setRunning] = useState<string | null>(null)
  const [active, setActive] = useState<AgentRun | null>(null)

  useEffect(() => {
    api<{ agents: AgentDef[]; runs: AgentRun[] }>('/api/agents').then(({ agents, runs }) => {
      setAgents(agents)
      setRuns(runs)
      if (runs[0]) setActive(runs[0])
    })
  }, [])

  const runAgent = async (id: string) => {
    setRunning(id)
    try {
      const { run } = await api<{ run: AgentRun }>('/api/agents', { method: 'POST', body: { agent: id } })
      setRuns((r) => [run, ...r])
      setActive(run)
      toast({ title: `${agents.find((a) => a.id === id)?.name} finished`, description: run.summary?.slice(0, 80) })
    } catch (e) {
      toast({ title: 'Agent failed', description: (e as Error).message, variant: 'destructive' })
    } finally { setRunning(null) }
  }

  return (
    <div>
      <ModuleHeader title={t('agentsTitle')} subtitle={t('agentsSub')} icon={Bot} />

      {/* Agent cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
        {agents.map((a, i) => {
          const Icon = ICONS[a.icon] || Bot
          const isRunning = running === a.id
          const lastRun = runs.find((r) => r.agent === a.id)
          return (
            <motion.div key={a.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card className="h-full hover:shadow-md transition-shadow">
                <CardContent className="p-4 flex flex-col h-full">
                  <div className="flex items-center gap-2.5 mb-2">
                    <div className="h-9 w-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: `color-mix(in oklch, ${a.color} 16%, transparent)`, color: a.color }}>
                      <Icon className="h-4.5 w-4.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold leading-tight">{a.name}</div>
                      {lastRun && <div className="text-[10px] text-muted-foreground flex items-center gap-1"><Clock className="h-2.5 w-2.5" /> {timeAgo(lastRun.createdAt)}</div>}
                    </div>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed flex-1 mb-3">{a.desc}</p>
                  <Button size="sm" onClick={() => runAgent(a.id)} disabled={isRunning} className="w-full rounded-full text-xs h-7" style={{ backgroundColor: a.color, color: 'white' }}>
                    {isRunning ? <><Spinner /> {t('running')}</> : <><Play className="h-3 w-3" /> {t('run')}</>}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-4">
        {/* Active run detail */}
        {active ? (
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `color-mix(in oklch, ${agents.find((a) => a.id === active.agent)?.color || 'var(--brand)'} 16%, transparent)`, color: agents.find((a) => a.id === active.agent)?.color }}>
                  {(() => { const Ico = ICONS[agents.find((a) => a.id === active.agent)?.icon || ''] || Bot; return <Ico className="h-5 w-5" /> })()}
                </div>
                <div>
                  <div className="font-semibold">{agents.find((a) => a.id === active.agent)?.name}</div>
                  <div className="text-[11px] text-muted-foreground">{new Date(active.createdAt).toLocaleString()}</div>
                </div>
                <Badge variant={active.status === 'done' ? 'default' : 'outline'} className="ms-auto capitalize">{active.status}</Badge>
              </div>
              <p className="text-sm mb-4">{active.summary}</p>

              {active.actions.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5"><Sparkles className="h-3 w-3 text-brand" /> Recommended actions</h4>
                  <div className="space-y-2">
                    {active.actions.map((a: any, i: number) => (
                      <div key={i} className="flex items-start gap-3 rounded-lg border p-3 hover:border-brand/30 transition-colors">
                        <Badge className={
                          a.priority === 'high' ? 'bg-destructive/15 text-destructive border-destructive/30' :
                          a.priority === 'medium' ? 'bg-amber-500/15 text-amber-600 border-amber-500/30' :
                          'bg-brand/15 text-brand border-brand/30'
                        } variant="outline">{a.priority}</Badge>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium">{a.title}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">{a.why}</div>
                        </div>
                        {a.module && (
                          <Button size="sm" variant="ghost" className="text-xs shrink-0" onClick={() => setModule(a.module)}>
                            Open <ArrowRight className="h-3 w-3 flip-rtl" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {active.insights.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Insights</h4>
                  <div className="space-y-1.5">
                    {active.insights.map((ins: string, i: number) => (
                      <div key={i} className="flex items-start gap-2 text-sm"><span className="text-brand mt-1.5">▸</span><span>{ins}</span></div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card><CardContent className="p-12 text-center text-muted-foreground"><Bot className="h-10 w-10 mx-auto mb-3 opacity-40" /><p>Run an agent to see its analysis and recommended actions.</p></CardContent></Card>
        )}

        {/* Run history */}
        <Card className="h-fit">
          <CardContent className="p-3">
            <div className="text-xs font-medium text-muted-foreground px-2 py-1.5">Run history</div>
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-1 pe-1">
                {runs.map((r) => {
                  const a = agents.find((ag) => ag.id === r.agent)
                  return (
                    <button key={r.id} onClick={() => setActive(r)} className={`group flex w-full items-start gap-2 rounded-lg p-2.5 text-start transition-all ${active?.id === r.id ? 'bg-brand-soft' : 'hover:bg-accent'}`}>
                      <div className="mt-0.5 h-6 w-6 shrink-0 rounded-md flex items-center justify-center" style={{ backgroundColor: `color-mix(in oklch, ${a?.color || 'var(--brand)'} 16%, transparent)`, color: a?.color }}>
                        {(() => { const Ico = ICONS[a?.icon || ''] || Bot; return <Ico className="h-3 w-3" /> })()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium truncate">{a?.name || r.agent}</div>
                        <div className="text-[10px] text-muted-foreground truncate">{r.summary?.slice(0, 50) || r.status}</div>
                        <div className="text-[9px] text-muted-foreground">{timeAgo(r.createdAt)}</div>
                      </div>
                    </button>
                  )
                })}
                {runs.length === 0 && <p className="text-xs text-muted-foreground text-center py-6">No runs yet.</p>}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function timeAgo(d: string | Date): string {
  const date = new Date(d)
  if (isNaN(date.getTime())) return 'recently'
  const diff = Date.now() - date.getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}
