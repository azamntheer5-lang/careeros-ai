'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore, ModuleId } from '@/lib/store'
import { useApp } from '@/components/app-provider'
import { useProfile } from '@/components/careeros/profile-context'
import { Command } from 'cmdk'
import {
  LayoutDashboard, UserCircle2, FileText, ScanSearch, Mail, Globe, BadgeCheck,
  Mic, BrainCircuit, Compass, Briefcase, GraduationCap, Cpu, CreditCard, ShieldCheck,
  Search, CornerDownLeft, ArrowUp, ArrowDown, Bot, Network, TrendingUp, FileScan, Building2, Zap,
} from 'lucide-react'

type CmdItem = { id: ModuleId; label: string; hint: string; icon: any; keywords: string[] }

export function CommandPalette() {
  const { paletteOpen, setPalette, set: setModule } = useAppStore()
  const { t } = useApp()
  const { profile, user } = useProfile()
  const [query, setQuery] = useState('')

  // Global ⌘K / Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPalette(!paletteOpen)
      }
      if (e.key === 'Escape' && paletteOpen) setPalette(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [paletteOpen, setPalette])

  const items: CmdItem[] = [
    { id: 'dashboard', label: t('dashboard'), hint: 'Overview & analytics', icon: LayoutDashboard, keywords: ['home', 'overview', 'stats'] },
    { id: 'profile', label: t('profile'), hint: 'Your career identity', icon: UserCircle2, keywords: ['identity', 'target', 'goals'] },
    { id: 'agents', label: t('agents'), hint: 'Autonomous AI career agents', icon: Bot, keywords: ['agent', 'autonomous', 'auto'] },
    { id: 'graph', label: t('graph'), hint: 'Knowledge graph of your career', icon: Network, keywords: ['graph', 'knowledge', 'connections'] },
    { id: 'automation', label: 'Automation', hint: 'Workflows & triggers', icon: Zap, keywords: ['workflow', 'automation', 'trigger'] },
    { id: 'resume', label: t('resume'), hint: 'Build & optimize resumes', icon: FileText, keywords: ['cv', 'ats'] },
    { id: 'ats', label: t('ats'), hint: 'Match score vs job', icon: ScanSearch, keywords: ['ats', 'match', 'keywords'] },
    { id: 'cover', label: t('coverLetter'), hint: 'Letters & outreach', icon: Mail, keywords: ['email', 'networking'] },
    { id: 'portfolio', label: t('portfolio'), hint: 'Public portfolio site', icon: Globe, keywords: ['website', 'public', 'qr'] },
    { id: 'branding', label: t('branding'), hint: 'LinkedIn & brand score', icon: BadgeCheck, keywords: ['linkedin', 'brand', 'identity'] },
    { id: 'documents', label: t('documents'), hint: 'Upload & parse resumes/certs', icon: FileScan, keywords: ['ocr', 'parse', 'upload', 'pdf'] },
    { id: 'interview', label: t('interview'), hint: 'AI interview practice', icon: Mic, keywords: ['practice', 'voice', 'technical'] },
    { id: 'coach', label: t('coach'), hint: '1:1 AI career coach', icon: BrainCircuit, keywords: ['advice', 'strategy'] },
    { id: 'intelligence', label: t('intelligence'), hint: 'Unified career roadmap', icon: Compass, keywords: ['roadmap', 'plan', 'promotion'] },
    { id: 'jobs', label: t('jobs'), hint: 'Application pipeline CRM', icon: Briefcase, keywords: ['applications', 'tracker'] },
    { id: 'skills', label: t('skills'), hint: 'Skill gap analysis', icon: GraduationCap, keywords: ['learning', 'gap'] },
    { id: 'market', label: t('market'), hint: 'Job market intelligence & matching', icon: TrendingUp, keywords: ['salary', 'trends', 'demand', 'match'] },
    { id: 'network', label: t('network'), hint: 'Professional social network', icon: Network, keywords: ['social', 'follow', 'community'] },
    { id: 'mentors', label: t('mentors'), hint: 'Book 1:1 mentor sessions', icon: GraduationCap, keywords: ['mentor', 'coach', 'book', 'session'] },
    { id: 'aicenter', label: t('aicenter'), hint: 'Prompts, models & usage', icon: Cpu, keywords: ['ai', 'tokens', 'cost'] },
    { id: 'enterprise', label: t('enterprise'), hint: 'Org career development', icon: Building2, keywords: ['company', 'university', 'employees', 'mobility'] },
    { id: 'plans', label: t('plans'), hint: 'Subscription & billing', icon: CreditCard, keywords: ['upgrade', 'invoice'] },
    { id: 'admin', label: t('admin'), hint: 'Platform admin', icon: ShieldCheck, keywords: ['audit', 'flags', 'revenue'] },
  ]

  const filtered = items.filter((it) => {
    const q = query.toLowerCase()
    return it.label.toLowerCase().includes(q) || it.hint.toLowerCase().includes(q) || it.keywords.some((k) => k.includes(q))
  })

  const go = (id: ModuleId) => { setModule(id); setPalette(false); setQuery('') }

  return (
    <AnimatePresence>
      {paletteOpen && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-start justify-center pt-[12vh] px-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setPalette(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: -8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97, y: -8 }}
            transition={{ type: 'spring', stiffness: 300, damping: 26 }}
            className="w-full max-w-xl rounded-2xl border border-border bg-popover shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <Command shouldFilter={false} loop>
              <div className="flex items-center gap-2.5 px-4 py-3 border-b">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Command.Input
                  autoFocus value={query} onValueChange={setQuery}
                  placeholder={t('searchOrJump')}
                  className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground"
                />
                <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">ESC</kbd>
              </div>
              <Command.List className="max-h-[50vh] overflow-y-auto p-2">
                <Command.Empty className="py-8 text-center text-sm text-muted-foreground">No results found.</Command.Empty>
                <Command.Group heading="Navigate">
                  {filtered.map((it) => {
                    const Icon = it.icon
                    return (
                      <Command.Item
                        key={it.id}
                        value={it.id + it.label + it.hint}
                        onSelect={() => go(it.id)}
                        className="group flex items-center gap-3 rounded-lg px-2.5 py-2.5 text-sm aria-selected:bg-accent cursor-pointer"
                      >
                        <div className="h-8 w-8 rounded-lg bg-brand-soft text-brand flex items-center justify-center shrink-0"><Icon className="h-4 w-4" /></div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium">{it.label}</div>
                          <div className="text-xs text-muted-foreground truncate">{it.hint}</div>
                        </div>
                        <CornerDownLeft className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-aria-selected:opacity-100" />
                      </Command.Item>
                    )
                  })}
                </Command.Group>
                {profile?.targetRole && (
                  <Command.Group heading="Quick actions">
                    <Command.Item onSelect={() => go('resume')} className="flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm aria-selected:bg-accent cursor-pointer">
                      <div className="h-8 w-8 rounded-lg bg-muted text-muted-foreground flex items-center justify-center"><FileText className="h-4 w-4" /></div>
                      <div className="flex-1">Build a resume for <span className="font-medium text-brand">{profile.targetRole}</span></div>
                    </Command.Item>
                    <Command.Item onSelect={() => go('intelligence')} className="flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm aria-selected:bg-accent cursor-pointer">
                      <div className="h-8 w-8 rounded-lg bg-muted text-muted-foreground flex items-center justify-center"><Compass className="h-4 w-4" /></div>
                      <div className="flex-1">Generate my roadmap to <span className="font-medium text-brand">{profile.targetRole}</span></div>
                    </Command.Item>
                  </Command.Group>
                )}
              </Command.List>
              <div className="flex items-center justify-between px-3 py-2 border-t text-[10px] text-muted-foreground">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1"><ArrowUp className="h-3 w-3" /><ArrowDown className="h-3 w-3" /> navigate</span>
                  <span className="flex items-center gap-1"><CornerDownLeft className="h-3 w-3" /> select</span>
                </div>
                <span>{user?.name} · {user?.plan}</span>
              </div>
            </Command>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
