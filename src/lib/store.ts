'use client'

import { create } from 'zustand'

export type ModuleId =
  | 'dashboard'
  | 'profile'
  | 'resume'
  | 'ats'
  | 'cover'
  | 'portfolio'
  | 'branding'
  | 'interview'
  | 'coach'
  | 'intelligence'
  | 'jobs'
  | 'skills'
  | 'aicenter'
  | 'plans'
  | 'admin'
  | 'agents'
  | 'graph'
  | 'network'
  | 'mentors'
  | 'market'
  | 'documents'
  | 'enterprise'
  | 'recruit'
  | 'marketplace'
  | 'analytics'
  | 'security'
  | 'briefing'

type AppState = {
  active: ModuleId
  set: (m: ModuleId) => void
  sidebarOpen: boolean
  toggleSidebar: () => void
  setSidebar: (v: boolean) => void
  paletteOpen: boolean
  setPalette: (v: boolean) => void
  onboardingOpen: boolean
  setOnboarding: (v: boolean) => void
  // user identity (single-user demo mode)
  userId: string | null
  setUserId: (id: string) => void
}

export const useAppStore = create<AppState>((set) => ({
  active: 'dashboard',
  set: (m) => set({ active: m, sidebarOpen: false }),
  sidebarOpen: false,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebar: (v) => set({ sidebarOpen: v }),
  paletteOpen: false,
  setPalette: (v) => set({ paletteOpen: v }),
  onboardingOpen: false,
  setOnboarding: (v) => set({ onboardingOpen: v }),
  userId: null,
  setUserId: (id) => set({ userId: id }),
}))
