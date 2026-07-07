'use client'

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react'
import { api } from '@/lib/api-client'

export type CareerProfile = {
  id: string
  targetRole: string | null
  industry: string | null
  seniority: string | null
  experienceYears: number | null
  targetSalary: string | null
  currency: string
  location: string | null
  workMode: string | null
  careerGoals: string | null
  timeline: string | null
  linkedinUrl: string | null
  githubUrl: string | null
  portfolioUrl: string | null
  brandStatement: string | null
  strengths: string[]
  values: string[]
  updatedAt: string
}

type ProfileCtx = {
  profile: CareerProfile | null
  loading: boolean
  user: { id: string; name: string; plan: string; headline: string | null; onboarded: boolean } | null
  refresh: () => Promise<void>
  save: (patch: Partial<CareerProfile> & { name?: string; headline?: string; onboarded?: boolean }) => Promise<void>
}

const Ctx = createContext<ProfileCtx | null>(null)

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<CareerProfile | null>(null)
  const [user, setUser] = useState<ProfileCtx['user']>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const res = await api<{ profile: any; user: any }>('/api/profile')
      setProfile(normalize(res.profile))
      setUser(res.user)
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => {
    api<{ profile: any; user: any }>('/api/profile')
      .then((res) => { setProfile(normalize(res.profile)); setUser(res.user) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const save = useCallback(async (patch: any) => {
    const res = await api<{ profile: any }>('/api/profile', { method: 'PUT', body: patch })
    setProfile(normalize(res.profile))
    if (patch.name || patch.headline || patch.onboarded) {
      setUser((u) => u ? { ...u, name: patch.name ?? u.name, headline: patch.headline ?? u.headline, onboarded: patch.onboarded ?? u.onboarded } : u)
    }
  }, [])

  return (
    <Ctx.Provider value={{ profile, loading, user, refresh, save }}>
      {children}
    </Ctx.Provider>
  )
}

export function useProfile() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useProfile must be used within ProfileProvider')
  return ctx
}

function normalize(p: any): CareerProfile {
  return {
    ...p,
    strengths: safeArr(p.strengths),
    values: safeArr(p.values),
  }
}
function safeArr(s: any): string[] {
  if (!s) return []
  if (Array.isArray(s)) return s
  try { const a = JSON.parse(s); return Array.isArray(a) ? a : [] } catch { return [] }
}
