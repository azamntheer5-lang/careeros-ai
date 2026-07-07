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
  Menu,
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
  { id: 'resume', icon: FileText, label: 'resume' },
  { id: 'ats', icon: ScanSearch, label: 'ats' },
  { id: 'cover', icon: Mail, label: 'coverLetter' },
  { id: 'interview', icon: Mic, label: 'interview' },
  { id: 'coach', icon: BrainCircuit, label: 'coach' },
  { id: 'skills', icon: GraduationCap, label: 'skills' },
  { id: 'jobs', icon: Briefcase, label: 'jobs' },
  { id: 'admin', icon: ShieldCheck, label: 'admin' },
]

export function MobileNav() {
  const { active, set, sidebarOpen, setSidebar } = useAppStore()
  const { t } = useApp()
  const [open, setOpen] = React.useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          className="lg:hidden inline-flex h-9 w-9 items-center justify-center rounded-lg hover:bg-accent"
          aria-label="Open menu"
          onClick={() => setSidebar(true)}
        >
          <Menu className="h-5 w-5" />
        </button>
      </SheetTrigger>
      <SheetContent side="start" className="w-72 p-0">
        <SheetHeader className="px-5 py-4 border-b">
          <div className="flex items-center gap-2.5">
            <Logo size={28} />
            <SheetTitle className="text-base">{t('brand')}</SheetTitle>
          </div>
        </SheetHeader>
        <ScrollArea className="h-[calc(100vh-4rem)] px-3 py-4">
          <div className="space-y-1">
            {NAV.map((item) => {
              const Icon = item.icon
              const isActive = active === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    set(item.id)
                    setOpen(false)
                  }}
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
