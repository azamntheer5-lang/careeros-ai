'use client'

import { motion } from 'framer-motion'
import { useApp } from '@/components/app-provider'
import { useAppStore } from '@/lib/store'
import { useProfile } from '@/components/careeros/profile-context'
import { ThemeToggle, LangToggle } from './toggles'
import { MobileNav } from './mobile-nav'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Bell, Command } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'

export function Topbar() {
  const { t } = useApp()
  const { active, setPalette } = useAppStore()
  const { user } = useProfile()
  const { toast } = useToast()
  const userName = user?.name || 'Guest'
  const plan = user?.plan || 'free'

  return (
    <header className="sticky top-0 z-30 h-16 border-b border-border/70 glass">
      <div className="flex h-full items-center gap-3 px-4 sm:px-6">
        <MobileNav />

        <div className="flex items-center gap-3 min-w-0">
          <motion.h1
            key={active}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="text-base sm:text-lg font-semibold tracking-tight truncate"
          >
            {t(active as any) || t('dashboard')}
          </motion.h1>
        </div>

        <div className="ms-auto flex items-center gap-1.5 sm:gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setPalette(true)}
            className="hidden md:inline-flex h-9 items-center gap-2 rounded-full text-muted-foreground hover:text-foreground"
            aria-label={t('commandPalette')}
          >
            <Command className="h-3.5 w-3.5" />
            <kbd className="rounded border bg-muted px-1 py-0.5 text-[9px] font-mono">⌘K</kbd>
          </Button>
          <Button variant="ghost" size="icon" className="relative h-9 w-9 rounded-full" aria-label="Notifications"
            onClick={() => toast({ title: 'No new notifications', description: 'You are all caught up.' })}
          >
            <Bell className="h-4 w-4" />
          </Button>
          <LangToggle />
          <ThemeToggle />
          <div className="flex items-center gap-2 ps-2 ms-1 border-s border-border">
            <Avatar className="h-8 w-8 ring-1 ring-brand/30">
              <AvatarFallback className="bg-brand-soft text-brand text-xs font-semibold">
                {userName.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="hidden sm:block leading-tight">
              <div className="text-xs font-medium truncate max-w-[120px]">{userName}</div>
              <Badge variant="outline" className="h-4 px-1.5 text-[9px] uppercase tracking-wide text-brand border-brand/40">
                {plan}
              </Badge>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
