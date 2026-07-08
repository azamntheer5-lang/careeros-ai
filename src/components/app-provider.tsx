'use client'

import * as React from 'react'
import { Lang, t, DictKey } from '@/lib/i18n'

type AppContextValue = {
  lang: Lang
  setLang: (l: Lang) => void
  dir: 'ltr' | 'rtl'
  t: (key: DictKey) => string
}

const AppContext = React.createContext<AppContextValue | null>(null)

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = React.useState<Lang>('en')

  React.useEffect(() => {
    const saved = (typeof window !== 'undefined' && localStorage.getItem('careeros-lang')) as Lang | null
    if (saved === 'en' || saved === 'ar') setLangState(saved)
  }, [])

  const dir: 'ltr' | 'rtl' = lang === 'ar' ? 'rtl' : 'ltr'

  React.useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = lang
      document.documentElement.dir = dir
    }
  }, [lang, dir])

  const setLang = React.useCallback((l: Lang) => {
    setLangState(l)
    if (typeof window !== 'undefined') localStorage.setItem('careeros-lang', l)
  }, [])

  const value = React.useMemo<AppContextValue>(
    () => ({ lang, setLang, dir, t: (key: DictKey) => t(lang, key) }),
    [lang, setLang, dir]
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = React.useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
