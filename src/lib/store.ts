'use client'

import { create } from 'zustand'

export type ModuleId =
  | 'dashboard'
  | 'resume'
  | 'ats'
  | 'cover'
  | 'interview'
  | 'coach'
  | 'jobs'
  | 'skills'
  | 'admin'

type AppState = {
  active: ModuleId
  set: (m: ModuleId) => void
  sidebarOpen: boolean
  toggleSidebar: () => void
  setSidebar: (v: boolean) => void
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
  userId: null,
  setUserId: (id) => set({ userId: id }),
}))
