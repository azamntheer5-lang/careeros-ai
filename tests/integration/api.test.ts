// CareerOS AI — Integration Tests
// Run: bun test tests/integration/

import { describe, test, expect } from 'bun:test'

const BASE = process.env.BASE_URL || 'http://localhost:3000'

async function fetchApi(path: string, opts: RequestInit = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...opts.headers },
  })
  return { status: res.status, data: await res.json().catch(() => null) }
}

describe('Core APIs', () => {
  test('GET /api/bootstrap returns user', async () => {
    const { status, data } = await fetchApi('/api/bootstrap')
    expect(status).toBe(200)
    expect(data.user).toBeDefined()
    expect(data.user.email).toBeDefined()
  })

  test('GET /api/dashboard returns stats', async () => {
    const { status, data } = await fetchApi('/api/dashboard')
    expect(status).toBe(200)
    expect(data.stats).toBeDefined()
    expect(data.pipeline).toBeDefined()
  })

  test('GET /api/profile returns profile', async () => {
    const { status, data } = await fetchApi('/api/profile')
    expect(status).toBe(200)
    expect(data.profile).toBeDefined()
  })
})

describe('Resume APIs', () => {
  test('GET /api/resumes returns list', async () => {
    const { status, data } = await fetchApi('/api/resumes')
    expect(status).toBe(200)
    expect(Array.isArray(data.resumes)).toBe(true)
  })
})

describe('Billing APIs', () => {
  test('GET /api/billing returns plans + subscription', async () => {
    const { status, data } = await fetchApi('/api/billing')
    expect(status).toBe(200)
    expect(data.plans).toBeDefined()
    expect(data.plans.length).toBe(5)
  })

  test('GET /api/billing/credits returns balance + packages', async () => {
    const { status, data } = await fetchApi('/api/billing/credits')
    expect(status).toBe(200)
    expect(data.balance).toBeDefined()
    expect(data.packages).toBeDefined()
  })
})

describe('Agent APIs', () => {
  test('GET /api/agents returns agent definitions', async () => {
    const { status, data } = await fetchApi('/api/agents')
    expect(status).toBe(200)
    expect(data.agents).toBeDefined()
    expect(data.agents.length).toBe(5)
  })
})

describe('Graph API', () => {
  test('GET /api/graph returns graph data', async () => {
    const { status, data } = await fetchApi('/api/graph')
    expect(status).toBe(200)
    expect(data.graph).toBeDefined()
    expect(data.graph.nodes).toBeDefined()
    expect(data.graph.edges).toBeDefined()
  })
})

describe('Enterprise API', () => {
  test('GET /api/enterprise returns tenant data', async () => {
    const { status, data } = await fetchApi('/api/enterprise')
    expect(status).toBe(200)
    expect(data.tenant).toBeDefined()
  })
})

describe('Security APIs', () => {
  test('GET /api/security/export returns JSON', async () => {
    const { status } = await fetchApi('/api/security/export')
    expect(status).toBe(200)
  })
})
