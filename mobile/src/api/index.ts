/**
 * API client — connects to the CareerOS AI Next.js backend.
 * In development, set API_URL to your machine's IP (not localhost) for Android emulator.
 */

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:3000'

let sessionCookie: string | null = null

export function setSession(cookie: string) {
  sessionCookie = cookie
}

export function getCookieHeader(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (sessionCookie) headers['Cookie'] = sessionCookie
  return headers
}

export async function api<T = any>(
  path: string,
  opts: { method?: string; body?: any } = {}
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: opts.method || 'GET',
    headers: getCookieHeader(),
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  })

  // Extract set-cookie for session
  const setCookie = res.headers.get('set-cookie')
  if (setCookie) {
    const match = setCookie.match(/careeros_session=([^;]+)/)
    if (match) sessionCookie = `careeros_session=${match[1]}`
  }

  const text = await res.text()
  let data: any = null
  if (text) {
    try { data = JSON.parse(text) } catch { data = text }
  }
  if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`)
  return data as T
}

export const auth = {
  login: (email: string, password: string) =>
    api<{ user: User }>('/api/auth/login', { method: 'POST', body: { email, password } }),
  register: (email: string, password: string, name: string) =>
    api<{ user: User }>('/api/auth/register', { method: 'POST', body: { email, password, name } }),
  me: () => api<{ user: User }>('/api/auth/me'),
}

export const dashboard = {
  get: () => api('/api/dashboard'),
}

export const resumes = {
  list: () => api('/api/resumes'),
  create: (data: any) => api('/api/resumes', { method: 'POST', body: data }),
  get: (id: string) => api(`/api/resumes/${id}`),
  update: (id: string, data: any) => api(`/api/resumes/${id}`, { method: 'PUT', body: data }),
  generate: (context: string) => api('/api/resumes/generate', { method: 'POST', body: { context } }),
  enhance: (text: string, mode: string) => api('/api/resumes/enhance', { method: 'POST', body: { text, mode } }),
  score: (id: string) => api(`/api/resumes/${id}/score`, { method: 'POST' }),
}

export const ats = {
  analyze: (data: { resumeId?: string; resumeText?: string; jobDescription: string }) =>
    api('/api/ats', { method: 'POST', body: data }),
}

export const coverLetter = {
  list: () => api('/api/cover-letter'),
  generate: (data: any) => api('/api/cover-letter', { method: 'POST', body: data }),
}

export const profile = {
  get: () => api('/api/profile'),
  update: (data: any) => api('/api/profile', { method: 'PUT', body: data }),
}

export const desktop = {
  parseResume: (rawText: string, jobDescription?: string) =>
    api('/api/desktop/parse-resume', { method: 'POST', body: { rawText, jobDescription } }),
  optimizeATS: (profile: any, jobDescription: string) =>
    api('/api/desktop/optimize-ats', { method: 'POST', body: { profile, jobDescription } }),
}

export type User = {
  id: string
  email: string
  name: string | null
  plan: string
  credits: number
}
