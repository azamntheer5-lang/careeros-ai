'use client'

import {
  LayoutDashboard, UserCircle2, FileText, ScanSearch, Mail, Globe, BadgeCheck,
  Mic, BrainCircuit, Compass, Briefcase, GraduationCap, Cpu, CreditCard, ShieldCheck,
  Sparkles, Command, Bot, Network, TrendingUp, FileScan, Building2, Zap, Sun, ShoppingBag, BarChart3, Shield, Coins, Wand2,
} from 'lucide-react'
import { useAppStore, ModuleId } from '@/lib/store'
import { useApp } from '@/components/app-provider'
import { useProfile } from '@/components/careeros/profile-context'
import { Logo } from './logo'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { DictKey } from '@/lib/i18n'
import { motion } from 'framer-motion'

type NavItem = { id: ModuleId; icon: React.ElementType; label: DictKey }

const NAV: { section: string; items: NavItem[] }[] = [
  {
    section: 'you',
    items: [
      { id: 'dashboard', icon: LayoutDashboard, label: 'dashboard' },
      { id: 'profile', icon: UserCircle2, label: 'profile' },
      { id: 'agents', icon: Bot, label: 'agents' },
      { id: 'graph', icon: Network, label: 'graph' },
    ],
  },
  {
    section: 'build',
    items: [
      { id: 'resume', icon: FileText, label: 'resume' },
      { id: 'studio', icon: Wand2, label: 'studio' },
      { id: 'ats', icon: ScanSearch, label: 'ats' },
      { id: 'cover', icon: Mail, label: 'coverLetter' },
      { id: 'portfolio', icon: Globe, label: 'portfolio' },
      { id: 'branding', icon: BadgeCheck, label: 'branding' },
      { id: 'documents', icon: FileScan, label: 'documents' },
    ],
  },
  {
    section: 'grow',
    items: [
      { id: 'interview', icon: Mic, label: 'interview' },
      { id: 'coach', icon: BrainCircuit, label: 'coach' },
      { id: 'intelligence', icon: Compass, label: 'intelligence' },
      { id: 'skills', icon: GraduationCap, label: 'skills' },
    ],
  },
  {
    section: 'opportunity',
    items: [
      { id: 'jobs', icon: Briefcase, label: 'jobs' },
      { id: 'market', icon: TrendingUp, label: 'market' },
      { id: 'recruit', icon: Briefcase, label: 'recruit' },
      { id: 'network', icon: Network, label: 'network' },
      { id: 'mentors', icon: GraduationCap, label: 'mentors' },
      { id: 'marketplace', icon: ShoppingBag, label: 'marketplace' },
    ],
  },
  {
    section: 'system',
    items: [
      { id: 'briefing', icon: Sun, label: 'briefing' },
      { id: 'aicenter', icon: Cpu, label: 'aicenter' },
      { id: 'analytics', icon: BarChart3, label: 'analytics' },
      { id: 'enterprise', icon: Building2, label: 'enterprise' },
      { id: 'security', icon: Shield, label: 'security' },
      { id: 'plans', icon: CreditCard, label: 'plans' },
      { id: 'admin', icon: ShieldCheck, label: 'admin' },
    ],
  },
]

// Automation is accessible via the AI Agents module + command palette; adding a direct nav entry here would overflow.

export function Sidebar() {
  const { active, set, setPalette } = useAppStore()
  const { t } = useApp()
  const { profile } = useProfile()

  return (
    <aside className="hidden lg:flex w-64 shrink-0 flex-col border-e border-sidebar-border bg-sidebar">
      <div className="flex h-16 items-center gap-2.5 px-5 border-b border-sidebar-border">
        <Logo size={30} />
        <div className="leading-tight">
          <div className="font-semibold text-[15px] tracking-tight">{t('brand')}</div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Career OS</div>
        </div>
      </div>

      {/* Command palette trigger */}
      <div className="p-3">
        <button
          onClick={() => setPalette(true)}
          className="group flex w-full items-center gap-2 rounded-lg border border-border bg-muted/40 px-2.5 py-2 text-xs text-muted-foreground hover:border-brand/40 hover:bg-brand-soft/40 transition-colors"
        >
          <Command className="h-3.5 w-3.5" />
          <span className="flex-1 text-start">{t('searchOrJump')}</span>
          <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border bg-background px-1 py-0.5 text-[9px] font-mono">⌘K</kbd>
        </button>
      </div>

      <ScrollArea className="flex-1 px-3 pb-2">
        <nav className="space-y-5">
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
                        <motion.span layoutId="nav-active" className="absolute inset-y-1.5 start-0 w-1 rounded-full bg-brand" />
                      )}
                      <Icon className={cn('h-4 w-4 shrink-0', isActive ? 'text-brand' : 'text-muted-foreground group-hover:text-foreground')} />
                      <span className="truncate">{t(item.label)}</span>
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
            <Coins className="h-3.5 w-3.5 text-brand" />
            <span className="text-xs font-semibold">{profile?.targetRole ? 'AI is personalized' : 'Set up your profile'}</span>
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed truncate">
            {profile?.targetRole ? `Targeting: ${profile.targetRole}` : 'Complete your profile to power every AI feature.'}
          </p>
          <button onClick={() => set('plans')} className="mt-2 flex items-center justify-between w-full rounded-lg bg-brand-soft/60 px-2.5 py-1.5 text-xs hover:bg-brand-soft transition">
            <span className="flex items-center gap-1.5 text-brand font-medium"><Coins className="h-3 w-3" /> Credits</span>
            <span className="font-bold text-brand">∞</span>
          </button>
        </div>
      </div>
    </aside>
  )
}
