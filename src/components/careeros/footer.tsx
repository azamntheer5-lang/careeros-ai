'use client'

import { useApp } from '@/components/app-provider'
import { Logo } from './logo'
import { Github, Twitter, Linkedin } from 'lucide-react'

export function Footer() {
  const { t } = useApp()
  return (
    <footer className="mt-auto border-t border-border/70 bg-card/40">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <Logo size={24} animated={false} />
            <div className="text-sm">
              <span className="font-semibold">{t('brand')}</span>
              <span className="text-muted-foreground"> · {t('footerNote')}</span>
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>© {new Date().getFullYear()} {t('allRightsReserved')}</span>
            <div className="flex items-center gap-2">
              <a href="#" className="hover:text-foreground transition-colors" aria-label="Twitter"><Twitter className="h-3.5 w-3.5" /></a>
              <a href="#" className="hover:text-foreground transition-colors" aria-label="GitHub"><Github className="h-3.5 w-3.5" /></a>
              <a href="#" className="hover:text-foreground transition-colors" aria-label="LinkedIn"><Linkedin className="h-3.5 w-3.5" /></a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
