'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { api } from '@/lib/api-client'
import { useApp } from '@/components/app-provider'
import { useToast } from '@/hooks/use-toast'
import { ModuleHeader } from '@/components/careeros/module-header'
import { Spinner } from '@/components/careeros/loading'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Zap, Play, Clock, CheckCircle2, AlertCircle, Workflow, ArrowRight, Sparkles } from 'lucide-react'

type WorkflowDef = { id: string; name: string; desc: string; trigger: string; steps: string[] }
type WorkflowRun = { id: string; workflow: string; status: string; steps: any[]; result: any; trigger: any; createdAt: string }

const STEP_LABELS: Record<string, string> = {
  company_research: 'Research company', customize_resume: 'Customize resume', cover_letter: 'Generate cover letter',
  interview_prep: 'Prepare interview questions', create_reminder: 'Create follow-up reminder',
  update_profile: 'Update profile', improve_resume: 'Improve resume', update_portfolio: 'Update portfolio',
  run_career_agent: 'Run career agent', rebuild_graph: 'Rebuild knowledge graph', refresh_plan: 'Refresh career plan',
  rescore_resumes: 'Re-score resumes', run_all_agents: 'Run all agents', weekly_summary: 'Generate weekly summary',
}

export function AutomationModule() {
  const { t } = useApp()
  const { toast } = useToast()
  const [workflows, setWorkflows] = useState<WorkflowDef[]>([])
  const [runs, setRuns] = useState<WorkflowRun[]>([])
  const [running, setRunning] = useState<string | null>(null)
  const [active, setActive] = useState<WorkflowRun | null>(null)

  useEffect(() => {
    api<{ workflows: WorkflowDef[]; runs: WorkflowRun[] }>('/api/automation').then(({ workflows, runs }) => {
      setWorkflows(workflows); setRuns(runs); if (runs[0]) setActive(runs[0])
    })
  }, [])

  const execute = async (id: string, payload: any = {}) => {
    setRunning(id)
    try {
      const { run } = await api<{ run: WorkflowRun }>('/api/automation', { method: 'POST', body: { workflow: id, payload } })
      setRuns((r) => [run, ...r])
      setActive(run)
      toast({ title: `${workflows.find((w) => w.id === id)?.name} completed`, description: `${run.steps.length} steps executed` })
    } catch (e) {
      toast({ title: 'Workflow failed', description: (e as Error).message, variant: 'destructive' })
    } finally { setRunning(null) }
  }

  return (
    <div>
      <ModuleHeader title="Automation Engine" subtitle="Workflows that connect your career — trigger once, automate everything." icon={Zap} />

      {/* Workflow cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
        {workflows.map((w, i) => {
          const isRunning = running === w.id
          return (
            <motion.div key={w.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card className="h-full hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-lg bg-brand-soft text-brand flex items-center justify-center"><Workflow className="h-4 w-4" /></div>
                      <div>
                        <div className="text-sm font-semibold">{w.name}</div>
                        <Badge variant="outline" className="text-[9px] mt-0.5">{w.trigger}</Badge>
                      </div>
                    </div>
                    <Button size="sm" onClick={() => execute(w.id)} disabled={isRunning} className="rounded-full text-xs h-7 bg-brand text-brand-foreground hover:bg-brand/90">
                      {isRunning ? <><Spinner /> Running</> : <><Play className="h-3 w-3" /> Run</>}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2.5">{w.desc}</p>
                  <div className="flex flex-wrap gap-1">
                    {w.steps.map((s) => (
                      <span key={s} className="text-[9px] rounded-full border px-2 py-0.5 bg-muted/40">{STEP_LABELS[s] || s}</span>
                    ))}
                  </div>
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
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="font-semibold capitalize">{active.workflow.replace(/_/g, ' ')}</div>
                  <div className="text-[11px] text-muted-foreground">{new Date(active.createdAt).toLocaleString()}</div>
                </div>
                <Badge variant={active.status === 'done' ? 'default' : active.status === 'error' ? 'destructive' : 'outline'} className="capitalize">{active.status}</Badge>
              </div>
              <div className="space-y-2">
                {active.steps.map((s: any, i: number) => (
                  <div key={i} className="flex items-start gap-3 rounded-lg border p-2.5">
                    <div className={`mt-0.5 h-5 w-5 rounded-full flex items-center justify-center shrink-0 ${s.status === 'done' ? 'bg-brand text-white' : s.status === 'error' ? 'bg-destructive text-white' : 'bg-muted text-muted-foreground'}`}>
                      {s.status === 'done' ? <CheckCircle2 className="h-3 w-3" /> : s.status === 'error' ? <AlertCircle className="h-3 w-3" /> : <Spinner className="h-3 w-3" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">{STEP_LABELS[s.step] || s.step}</div>
                      {s.result && <div className="text-[11px] text-muted-foreground mt-0.5 truncate">{s.result.slice(0, 120)}</div>}
                    </div>
                  </div>
                ))}
              </div>
              {active.result?.steps && (
                <div className="mt-3 pt-3 border-t">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5"><Sparkles className="h-3 w-3 text-brand" /> Results</div>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {active.result.steps.map((s: any, i: number) => (
                      <div key={i} className="text-xs"><span className="font-medium">{STEP_LABELS[s.step] || s.step}:</span> <span className="text-muted-foreground">{s.message || s.summary || s.skipped || `${Object.keys(s).length} fields`}</span></div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card><CardContent className="p-12 text-center text-muted-foreground"><Zap className="h-10 w-10 mx-auto mb-3 opacity-40" /><p>Run a workflow to see step-by-step execution.</p></CardContent></Card>
        )}

        {/* Run history */}
        <Card className="h-fit">
          <CardContent className="p-3">
            <div className="text-xs font-medium text-muted-foreground px-2 py-1.5">Run history</div>
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-1 pe-1">
                {runs.map((r) => (
                  <button key={r.id} onClick={() => setActive(r)} className={`group flex w-full items-start gap-2 rounded-lg p-2.5 text-start transition-all ${active?.id === r.id ? 'bg-brand-soft' : 'hover:bg-accent'}`}>
                    <div className={`mt-0.5 h-6 w-6 shrink-0 rounded-md flex items-center justify-center ${r.status === 'done' ? 'bg-brand text-white' : r.status === 'error' ? 'bg-destructive text-white' : 'bg-muted'}`}>
                      {r.status === 'done' ? <CheckCircle2 className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium truncate capitalize">{r.workflow.replace(/_/g, ' ')}</div>
                      <div className="text-[10px] text-muted-foreground">{r.steps.length} steps · {new Date(r.createdAt).toLocaleDateString()}</div>
                    </div>
                  </button>
                ))}
                {runs.length === 0 && <p className="text-xs text-muted-foreground text-center py-6">No runs yet.</p>}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
