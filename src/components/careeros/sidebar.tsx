'use client'

import {
  LayoutDashboard,
  FileText,
  ScanSearch,
  Mail,
  Mic,
  BrainCircuit,
  Briefcase,
  GraduationCap,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import { useAppStore, ModuleId } from '@/lib/store'
import { useApp } from '@/components/app-provider'
import { Logo } from './logo'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { DictKey } from '@/lib/i18n'

type NavItem = { id: ModuleId; icon: React.ElementType; label: DictKey; badge?: string }

const NAV: { section: string; items: NavItem[] }[] = [
  {
    section: 'overview',
    items: [{ id: 'dashboard', icon: LayoutDashboard, label: 'dashboard' }],
  },
  {
    section: 'build',
    items: [
      { id: 'resume', icon: FileText, label: 'resume' },
      { id: 'ats', icon: ScanSearch, label: 'ats' },
      { id: 'cover', icon: Mail, label: 'coverLetter' },
    ],
  },
  {
    section: 'grow',
    items: [
      { id: 'interview', icon: Mic, label: 'interview' },
      { id: 'coach', icon: BrainCircuit, label: 'coach' },
      { id: 'skills', icon: GraduationCap, label: 'skills' },
    ],
  },
  {
    section: 'manage',
    items: [
      { id: 'jobs', icon: Briefcase, label: 'jobs' },
      { id: 'admin', icon: ShieldCheck, label: 'admin' },
    ],
  },
]

export function Sidebar() {
  const { active, set } = useAppStore()
  const { t } = useApp()

  return (
    <aside className="hidden lg:flex w-64 shrink-0 flex-col border-e border-sidebar-border bg-sidebar">
      <div className="flex h-16 items-center gap-2.5 px-5 border-b border-sidebar-border">
        <Logo size={30} />
        <div className="leading-tight">
          <div className="font-semibold text-[15px] tracking-tight">{t('brand')}</div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Career OS</div>
        </div>
      </div>

      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="space-y-6">
          {NAV.map((group) => (
            <div key={group.section}>
              <div className="px-3 mb-1.5 text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground/70">
                {group.section}
              </div>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon
                  const isActive = active === item.id
                  return (
                    <button
                      key={item.id}
                      onClick={() => set(item.id)}
                      className={cn(
                        'group relative flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all',
                        isActive
                          ? 'bg-brand-soft text-brand'
                          : 'text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                      )}
                    >
                      {isActive && (
                        <span className="absolute inset-y-1.5 start-0 w-1 rounded-full bg-brand" />
                      )}
                      <Icon className={cn('h-4 w-4 shrink-0', isActive ? 'text-brand' : 'text-muted-foreground group-hover:text-foreground')} />
                      <span className="truncate">{t(item.label)}</span>
                      {item.badge && (
                        <Badge variant="secondary" className="ms-auto h-5 px-1.5 text-[10px]">{item.badge}</Badge>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>
      </ScrollArea>

      <div className="border-t border-sidebar-border p-3">
        <div className="rounded-xl bg-gradient-to-br from-brand/15 to-transparent p-3.5 border border-brand/20">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="h-3.5 w-3.5 text-brand" />
            <span className="text-xs font-semibold">{t('premium')} Plan</span>
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Unlimited AI generations, all templates, priority models.
          </p>
        </div>
      </div>
    </aside>
  )
}
