import { db } from '@/lib/db'

/** Demo-mode: single tenant. Returns the first user, creating one if missing. */
export async function getCurrentUser() {
  let user = await db.user.findFirst({ orderBy: { createdAt: 'asc' } })
  if (!user) {
    user = await db.user.create({
      data: { email: 'founder@careeros.ai', name: 'Alex Rivera', plan: 'premium' },
    })
  }
  return user
}

export function parseJson<T = unknown>(text: string | null | undefined): T {
  if (!text) return [] as unknown as T
  try {
    return JSON.parse(text) as T
  } catch {
    return [] as unknown as T
  }
}

export function err(e: unknown) {
  return Response.json({ error: (e as Error).message }, { status: 500 })
}

/** Validate and clip a string input to prevent AI cost abuse. */
export function clipInput(text: string | undefined | null, maxLen: number = 5000): string {
  if (!text || typeof text !== 'string') return ''
  return text.slice(0, maxLen)
}

/** Validate that a required string field is present and non-empty. */
export function requireField(value: any, name: string): string {
  if (!value || typeof value !== 'string' || !value.trim()) {
    throw new Error(`${name} is required`)
  }
  return value
}
