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
