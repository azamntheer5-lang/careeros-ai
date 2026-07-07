'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { api } from '@/lib/api-client'
import { useApp } from '@/components/app-provider'
import { ModuleHeader } from '@/components/careeros/module-header'
import { Spinner } from '@/components/careeros/loading'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Network, RefreshCw, Maximize2 } from 'lucide-react'

type GraphData = {
  nodes: { id: string; kind: string; label: string; value?: any; weight: number }[]
  edges: { from: string; to: string; rel: string; weight: number }[]
  stats: { total: number; byKind: Record<string, number>; edges: number }
}

const KIND_COLOR: Record<string, string> = {
  experience: 'oklch(0.7 0.15 162)', skill: 'oklch(0.7 0.13 200)', project: 'oklch(0.75 0.15 80)',
  education: 'oklch(0.65 0.2 300)', certificate: 'oklch(0.65 0.16 50)', goal: 'oklch(0.68 0.2 30)',
  job: 'oklch(0.6 0.18 150)', company: 'oklch(0.55 0.05 240)', interview: 'oklch(0.7 0.14 350)', achievement: 'oklch(0.7 0.15 100)',
}
const KIND_ICON: Record<string, string> = {
  experience: '💼', skill: '⚡', project: '🚀', education: '🎓', certificate: '🏅',
  goal: '🎯', job: '📋', company: '🏢', interview: '🎤', achievement: '⭐',
}

export function GraphModule() {
  const { t } = useApp()
  const [graph, setGraph] = useState<GraphData | null>(null)
  const [loading, setLoading] = useState(true)
  const [rebuilding, setRebuilding] = useState(false)
  const [selected, setSelected] = useState<string | null>(null)

  useEffect(() => {
    api<{ graph: GraphData }>('/api/graph').then(({ graph }) => setGraph(graph)).finally(() => setLoading(false))
  }, [])

  const rebuild = async () => {
    setRebuilding(true)
    try {
      const { graph } = await api<{ graph: GraphData }>('/api/graph', { method: 'POST' })
      setGraph(graph)
    } finally { setRebuilding(false) }
  }

  if (loading || !graph) {
    return <div className="flex justify-center py-20"><Spinner className="h-6 w-6 text-brand" /></div>
  }

  const selectedNode = graph.nodes.find((n) => n.id === selected)
  const selectedEdges = selected ? graph.edges.filter((e) => e.from === selected || e.to === selected) : []
  const connectedIds = new Set([selected, ...selectedEdges.flatMap((e) => [e.from, e.to])])

  return (
    <div>
      <ModuleHeader
        title={t('graphTitle')}
        subtitle={t('graphSub')}
        icon={Network}
        actions={
          <Button onClick={rebuild} disabled={rebuilding} variant="outline" size="sm" className="rounded-full">
            {rebuilding ? <Spinner /> : <RefreshCw className="h-4 w-4" />} Rebuild graph
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4">
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <GraphView graph={graph} selected={selected} onSelect={setSelected} connectedIds={connectedIds} />
          </CardContent>
        </Card>

        <div className="space-y-4">
          {/* Stats */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Graph Stats</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Nodes</span><span className="font-semibold">{graph.stats.total}</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Connections</span><span className="font-semibold">{graph.stats.edges}</span></div>
              <div className="pt-2 border-t">
                <div className="text-xs text-muted-foreground mb-2">By type</div>
                <div className="space-y-1.5">
                  {Object.entries(graph.stats.byKind).sort((a, b) => b[1] - a[1]).map(([kind, count]) => (
                    <div key={kind} className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: KIND_COLOR[kind] || 'var(--muted)' }} />
                        <span className="capitalize">{kind}</span>
                      </span>
                      <Badge variant="secondary" className="text-[10px]">{count}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Selected node detail */}
          {selectedNode ? (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2">
                <span>{KIND_ICON[selectedNode.kind] || '•'}</span> {selectedNode.label}
              </CardTitle></CardHeader>
              <CardContent className="space-y-2">
                <Badge variant="outline" className="capitalize" style={{ color: KIND_COLOR[selectedNode.kind], borderColor: KIND_COLOR[selectedNode.kind] }}>{selectedNode.kind}</Badge>
                <div className="text-xs text-muted-foreground">Weight: {selectedNode.weight} · {selectedEdges.length} connections</div>
                {selectedNode.value && typeof selectedNode.value === 'object' && Object.keys(selectedNode.value).length > 0 && (
                  <div className="text-xs space-y-1 mt-2">
                    {Object.entries(selectedNode.value).slice(0, 4).map(([k, v]) => (
                      <div key={k}><span className="text-muted-foreground">{k}:</span> {String(v).slice(0, 60)}</div>
                    ))}
                  </div>
                )}
                <div className="pt-2 border-t">
                  <div className="text-xs text-muted-foreground mb-1.5">Connections</div>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {selectedEdges.map((e, i) => {
                      const otherId = e.from === selected ? e.to : e.from
                      const other = graph.nodes.find((n) => n.id === otherId)
                      if (!other) return null
                      return (
                        <button key={i} onClick={() => setSelected(otherId)} className="flex w-full items-center gap-1.5 rounded px-1.5 py-1 text-xs hover:bg-accent text-start">
                          <span className="text-[9px] text-muted-foreground">{e.rel}</span>
                          <span className="truncate">{KIND_ICON[other.kind]} {other.label}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-5 text-center text-xs text-muted-foreground">
                <Network className="h-8 w-8 mx-auto mb-2 opacity-30" />
                Click any node to explore connections. The graph is the system's model of your professional identity.
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

/** Radial SVG graph visualization. */
function GraphView({ graph, selected, onSelect, connectedIds }: { graph: GraphData; selected: string | null; onSelect: (id: string) => void; connectedIds: Set<string | undefined> }) {
  const W = 760, H = 520, CX = W / 2, CY = H / 2
  const nodes = graph.nodes
  // Position: goal at center, others in concentric rings by kind
  const kindOrder = ['goal', 'experience', 'skill', 'company', 'project', 'education', 'certificate', 'job', 'interview', 'achievement']
  const positions = new Map<string, { x: number; y: number }>()
  const byKind: Record<string, typeof nodes> = {}
  nodes.forEach((n) => { (byKind[n.kind] = byKind[n.kind] || []).push(n) })

  kindOrder.forEach((kind, ringIdx) => {
    const groupNodes = byKind[kind] || []
    if (groupNodes.length === 0) return
    if (kind === 'goal') {
      groupNodes.forEach((n) => positions.set(n.id, { x: CX, y: CY }))
    } else {
      const radius = 90 + ringIdx * 38
      groupNodes.forEach((n, i) => {
        const angle = (i / groupNodes.length) * Math.PI * 2 + ringIdx * 0.3
        positions.set(n.id, { x: CX + Math.cos(angle) * radius, y: CY + Math.sin(angle) * radius })
      })
    }
  })

  return (
    <div className="relative bg-gradient-to-br from-card to-muted/20" style={{ minHeight: 520 }}>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} className="block" style={{ maxHeight: 560 }}>
        <defs>
          <radialGradient id="graph-bg">
            <stop offset="0%" stopColor="color-mix(in oklch, var(--brand) 8%, transparent)" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
        </defs>
        <circle cx={CX} cy={CY} r={250} fill="url(#graph-bg)" />

        {/* Edges */}
        {graph.edges.map((e, i) => {
          const from = positions.get(e.from)
          const to = positions.get(e.to)
          if (!from || !to) return null
          const active = selected && (e.from === selected || e.to === selected)
          return (
            <line key={i} x1={from.x} y1={from.y} x2={to.x} y2={to.y}
              stroke={active ? 'var(--brand)' : 'color-mix(in oklch, var(--foreground) 15%, transparent)'}
              strokeWidth={active ? 1.5 : 0.6}
              opacity={selected ? (active ? 0.9 : 0.1) : 0.5}
            />
          )
        })}

        {/* Nodes */}
        {nodes.map((n) => {
          const pos = positions.get(n.id)
          if (!pos) return null
          const color = KIND_COLOR[n.kind] || 'var(--muted)'
          const r = n.kind === 'goal' ? 22 : Math.min(8 + n.weight * 2, 16)
          const isSelected = selected === n.id
          const isConnected = connectedIds.has(n.id)
          const dim = selected && !isSelected && !isConnected
          return (
            <g key={n.id} className="cursor-pointer" onClick={() => onSelect(isSelected ? null : n.id)} opacity={dim ? 0.25 : 1}>
              {n.kind === 'goal' && (
                <circle cx={pos.x} cy={pos.y} r={r + 8} fill="none" stroke={color} strokeWidth={1} opacity={0.4}>
                  <animate attributeName="r" values={`${r + 6};${r + 12};${r + 6}`} dur="3s" repeatCount="indefinite" />
                </circle>
              )}
              <circle cx={pos.x} cy={pos.y} r={r} fill={color} fillOpacity={isSelected ? 1 : 0.85}
                stroke={isSelected ? 'var(--background)' : 'transparent'} strokeWidth={2} />
              {r >= 10 && (
                <text x={pos.x} y={pos.y + 3} textAnchor="middle" fontSize={10} fill="white" className="pointer-events-none select-none">
                  {KIND_ICON[n.kind]}
                </text>
              )}
              {(isSelected || isConnected || n.kind === 'goal') && (
                <text x={pos.x} y={pos.y - r - 4} textAnchor="middle" fontSize={9} fill="var(--foreground)" className="pointer-events-none select-none font-medium">
                  {n.label.length > 24 ? n.label.slice(0, 22) + '…' : n.label}
                </text>
              )}
            </g>
          )
        })}
      </svg>
    </div>
  )
}
