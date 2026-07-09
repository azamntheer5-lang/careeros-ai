import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { auth, User } from '@/api'
import * as SecureStore from 'expo-secure-store'

type AuthState = {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, name: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkSession()
  }, [])

  async function checkSession() {
    try {
      const stored = await SecureStore.getItemAsync('careeros_session')
      if (stored) {
        // Restore session cookie
        const { setSession } = await import('@/api')
        setSession(stored)
        const { user } = await auth.me()
        setUser(user)
      }
    } catch {
      // Not logged in
    }
    setLoading(false)
  }

  async function login(email: string, password: string) {
    const { user } = await auth.login(email, password)
    setUser(user)
    // Store cookie string for session persistence
    const { getCookieHeader } = await import('@/api')
    const cookie = getCookieHeader()['Cookie']
    if (cookie) await SecureStore.setItemAsync('careeros_session', cookie)
  }

  async function register(email: string, password: string, name: string) {
    const { user } = await auth.register(email, password, name)
    setUser(user)
    const { getCookieHeader } = await import('@/api')
    const cookie = getCookieHeader()['Cookie']
    if (cookie) await SecureStore.setItemAsync('careeros_session', cookie)
  }

  async function logout() {
    await SecureStore.deleteItemAsync('careeros_session')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
