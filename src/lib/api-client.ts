/** Client-side fetch helper with JSON handling + error normalization. */
export async function api<T = unknown>(
  path: string,
  opts: { method?: string; body?: unknown; signal?: AbortSignal } = {}
): Promise<T> {
  const res = await fetch(path, {
    method: opts.method ?? 'GET',
    headers: opts.body ? { 'Content-Type': 'application/json' } : undefined,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
    signal: opts.signal,
  })
  const text = await res.text()
  let data: unknown = null
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      data = text
    }
  }
  if (!res.ok) {
    let msg = `Request failed (${res.status})`
    if (data && typeof data === 'object' && 'error' in data) {
      const errVal = (data as any).error
      msg = typeof errVal === 'string' ? errVal : typeof errVal === 'object' && errVal?.message ? String(errVal.message) : msg
    } else if (typeof data === 'string') {
      msg = data
    }
    throw new Error(msg)
  }
  return data as T
}
