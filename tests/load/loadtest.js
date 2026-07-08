import http from 'k6/http'
import { check, sleep } from 'k6'

export const options = {
  stages: [
    { duration: '30s', target: 20 },
    { duration: '1m', target: 20 },
    { duration: '30s', target: 50 },
    { duration: '1m', target: 50 },
    { duration: '30s', target: 100 },
    { duration: '1m', target: 100 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.05'],
  },
}

const BASE = __ENV.BASE_URL || 'http://localhost:3000'

export default function loadTest() {
  const res = http.get(`${BASE}/api/dashboard`)
  check(res, { 'dashboard 200': (r) => r.status === 200 })

  http.get(`${BASE}/api/profile`)
  http.get(`${BASE}/api/resumes`)
  http.get(`${BASE}/api/graph`)
  http.get(`${BASE}/api/billing`)

  sleep(1)
}
