'use client'

import {
  LayoutDashboard, UserCircle2, FileText, ScanSearch, Mail, Globe, BadgeCheck,
  Mic, BrainCircuit, Compass, Briefcase, GraduationCap, Cpu, CreditCard, ShieldCheck,
  Menu, Command,
} from 'lucide-react'
import { useAppStore, ModuleId } from '@/lib/store'
import { useApp } from '@/components/app-provider'
import { Logo } from './logo'
import { cn } from '@/lib/utils'
import { DictKey } from '@/lib/i18n'
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { ScrollArea } from '@/components/ui/scroll-area'
import * as React from 'react'

type NavItem = { id: ModuleId; icon: React.ElementType; label: DictKey }

const NAV: NavItem[] = [
  { id: 'dashboard', icon: LayoutDashboard, label: 'dashboard' },
  { id: 'profile', icon: UserCircle2, label: 'profile' },
  { id: 'resume', icon: FileText, label: 'resume' },
  { id: 'ats', icon: ScanSearch, label: 'ats' },
  { id: 'cover', icon: Mail, label: 'coverLetter' },
  { id: 'portfolio', icon: Globe, label: 'portfolio' },
  { id: 'branding', icon: BadgeCheck, label: 'branding' },
  { id: 'interview', icon: Mic, label: 'interview' },
  { id: 'coach', icon: BrainCircuit, label: 'coach' },
  { id: 'intelligence', icon: Compass, label: 'intelligence' },
  { id: 'skills', icon: GraduationCap, label: 'skills' },
  { id: 'jobs', icon: Briefcase, label: 'jobs' },
  { id: 'aicenter', icon: Cpu, label: 'aicenter' },
  { id: 'plans', icon: CreditCard, label: 'plans' },
  { id: 'admin', icon: ShieldCheck, label: 'admin' },
]

export function MobileNav() {
  const { active, set, setPalette } = useAppStore()
  const { t } = useApp()
  const [open, setOpen] = React.useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          className="lg:hidden inline-flex h-9 w-9 items-center justify-center rounded-lg hover:bg-accent"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 p-0">
        <SheetHeader className="px-5 py-4 border-b">
          <div className="flex items-center gap-2.5">
            <Logo size={28} />
            <SheetTitle className="text-base">{t('brand')}</SheetTitle>
          </div>
        </SheetHeader>
        <div className="p-3">
          <button
            onClick={() => { setPalette(true); setOpen(false) }}
            className="flex w-full items-center gap-2 rounded-lg border bg-muted/40 px-2.5 py-2 text-xs text-muted-foreground hover:bg-accent"
          >
            <Command className="h-3.5 w-3.5" />
            <span className="flex-1 text-start">{t('searchOrJump')}</span>
            <kbd className="rounded border bg-background px-1 py-0.5 text-[9px] font-mono">⌘K</kbd>
          </button>
        </div>
        <ScrollArea className="h-[calc(100vh-7rem)] px-3 pb-4">
          <div className="space-y-1">
            {NAV.map((item) => {
              const Icon = item.icon
              const isActive = active === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => { set(item.id); setOpen(false) }}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                    isActive ? 'bg-brand-soft text-brand' : 'text-foreground/75 hover:bg-accent'
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{t(item.label)}</span>
                </button>
              )
            })}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}
