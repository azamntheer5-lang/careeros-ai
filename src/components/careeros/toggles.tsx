'use client'

import * as React from 'react'
import { useTheme } from 'next-themes'
import { Sun, Moon, Languages } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useApp } from '@/components/app-provider'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => setMounted(true), [])

  const current = (mounted ? resolvedTheme : 'dark') as 'light' | 'dark'
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Toggle theme"
      onClick={() => setTheme(current === 'dark' ? 'light' : 'dark')}
      className="h-9 w-9 rounded-full"
    >
      {current === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  )
}

export function LangToggle() {
  const { lang, setLang } = useApp()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full" aria-label="Switch language">
          <Languages className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setLang('en')} className={lang === 'en' ? 'bg-accent' : ''}>
          English (LTR)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setLang('ar')} className={lang === 'ar' ? 'bg-accent' : ''}>
          العربية (RTL)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
