# Security Verification — Every Fix with Git Diff

All fixes were made in commit `66c3175` ("audit: production readiness fixes").
The diffs below are the actual `git diff 1a7e4c6 66c3175` output.

---

## Vulnerability 1: `/api/tts` — Unauthenticated AI Endpoint

**File:** `src/app/api/tts/route.ts`
**CVSS:** 7.5 (High)
**Issue:** Any anonymous user could call Text-to-Speech unlimited — direct AI cost exposure.

### Before
```typescript
import { NextResponse } from 'next/server'
import ZAI from 'z-ai-web-dev-sdk'
// no auth import

export async function POST(req: Request) {
  try {
    const { text, voice = 'tongtong', speed = 1.0 } = await req.json()
    if (!text?.trim()) return NextResponse.json({ error: 'Text required' }, { status: 400 })
    const clipped = text.slice(0, 1000)
    const zai = await getZai()
    const response = await zai.audio.tts.create({
      input: clipped,
      voice,
      speed,  // no validation
```

### After
```diff
+import { getCurrentUser } from '@/lib/server'

-/** Text-to-Speech: returns a WAV audio buffer for the given text. */
+/** Text-to-Speech: returns a WAV audio buffer for the given text (auth required). */
 export async function POST(req: Request) {
   try {
+    const user = await getCurrentUser()
     const { text, voice = 'tongtong', speed = 1.0 } = await req.json()
     if (!text?.trim()) return NextResponse.json({ error: 'Text required' }, { status: 400 })
-    const clipped = text.slice(0, 1000)
+    const clipped = text.slice(0, 1000)
+    const validSpeed = Math.min(Math.max(Number(speed) || 1.0, 0.5), 2.0)
     const zai = await getZai()
     const response = await zai.audio.tts.create({
       input: clipped,
       voice,
-      speed,
+      speed: validSpeed,
```

### Why Correct
- `getCurrentUser()` ensures only authenticated users can call TTS
- `validSpeed` clamps to 0.5–2.0 range (TTS API requirement), preventing errors

---

## Vulnerability 2: `/api/asr` — Unauthenticated AI Endpoint + No Size Limit

**File:** `src/app/api/asr/route.ts`
**CVSS:** 7.5 (High)
**Issue:** Anonymous ASR calls = unlimited transcription cost + potential memory exhaustion.

### Before
```typescript
export async function POST(req: Request) {
  try {
    const { audio } = await req.json()
    if (!audio) return NextResponse.json({ error: 'Audio (base64) required' }, { status: 400 })
    // no size check
    const response: any = await zai.audio.asr.create({ file_base64: audio })
```

### After
```diff
+import { getCurrentUser } from '@/lib/server'

-/** Speech-to-Text: accepts a base64-encoded audio blob, returns transcribed text. */
+/** Speech-to-Text: accepts a base64-encoded audio blob, returns transcribed text (auth required). */
 export async function POST(req: Request) {
   try {
+    const user = await getCurrentUser()
     const { audio } = await req.json()
-    if (!audio) return NextResponse.json({ error: 'Audio (base64) required' }, { status: 400 })
+    if (!audio || typeof audio !== 'string') return NextResponse.json({ error: 'Audio (base64) required' }, { status: 400 })
+    // Limit audio size to 5MB to prevent abuse
+    if (audio.length > 7_000_000) return NextResponse.json({ error: 'Audio too large (max 5MB)' }, { status: 413 })
```

### Why Correct
- Auth required
- `typeof audio !== 'string'` prevents object injection
- 5MB limit (7,000,000 base64 chars ≈ 5MB binary) prevents memory exhaustion

---

## Vulnerability 3: `/api/ats` — No Input Length Limit

**File:** `src/app/api/ats/route.ts`
**CVSS:** 5.3 (Medium)
**Issue:** Resume + JD text passed to AI without size limit — cost abuse.

### Diff
```diff
-import { getCurrentUser, err } from '@/lib/server'
+import { getCurrentUser, err, clipInput } from '@/lib/server'

-    const { data } = await ai.analyzeAts(resumeContent, jobDescription)
+    // Input length limits to prevent AI cost abuse
+    const clippedResume = clipInput(resumeContent, 10000)
+    const clippedJob = clipInput(jobDescription, 10000)
+    const { data } = await ai.analyzeAts(clippedResume, clippedJob)
```

---

## Vulnerability 4: `/api/cover-letter` — No Input Length Limit

**File:** `src/app/api/cover-letter/route.ts`
**CVSS:** 5.3 (Medium)

### Diff
```diff
-import { getCurrentUser, err } from '@/lib/server'
+import { getCurrentUser, err, clipInput } from '@/lib/server'

-    const content = await ai.generateLetter(type || 'cover', ctx, `${company ? `Company: ${company}. ` : ''}${role ? `Role: ${role}. ` : ''}${jobContext}`, tone || 'professional')
+    const content = await ai.generateLetter(type || 'cover', clipInput(ctx, 5000), `${company ? `Company: ${clipInput(company, 200)}. ` : ''}${role ? `Role: ${clipInput(role, 200)}. ` : ''}${clipInput(jobContext, 5000)}`, tone || 'professional')
```

---

## Vulnerability 5: `/api/assistant` — No Input Length Limit

**File:** `src/app/api/assistant/route.ts`
**CVSS:** 5.3 (Medium)

### Diff
```diff
-import { getCurrentUser, err } from '@/lib/server'
+import { getCurrentUser, err, clipInput } from '@/lib/server'

+    const clippedMessage = clipInput(message, 2000)
+    const clippedModule = clipInput(context?.module, 50) || 'dashboard'
+    const clippedRole = clipInput(context?.targetRole, 100)
+
     const { data: reply } = await run<string>(
       'coach', user.id, user.name || '',
       [{
         role: 'user',
-        content: `The user is currently viewing the "${context?.module || 'dashboard'}" module${context?.targetRole ? ` and their target role is ${context.targetRole}` : ''}. Answer concisely (under 200 words). If they ask about actions, reference the relevant CareerOS module. Use markdown.\n\nUser: ${message}`,
+        content: `The user is currently viewing the "${clippedModule}" module${clippedRole ? ` and their target role is ${clippedRole}` : ''}. Answer concisely (under 200 words). If they ask about actions, reference the relevant CareerOS module. Use markdown.\n\nUser: ${clippedMessage}`,
```

---

## Vulnerability 6: `/api/interview/[id]/next` — No Input Length Limit on Answer

**File:** `src/app/api/interview/[id]/next/route.ts`
**CVSS:** 5.3 (Medium)

### Diff
```diff
-import { getCurrentUser, parseJson, err } from '@/lib/server'
+import { getCurrentUser, parseJson, err, clipInput } from '@/lib/server'

-          const { data } = await ai.interviewEvaluate(interview.type, interview.role || 'Software Engineer', lastQuestion.content, body.answer)
+          const clippedAnswer = clipInput(body.answer, 5000)
+          const { data } = await ai.interviewEvaluate(interview.type, interview.role || 'Software Engineer', lastQuestion.content, clippedAnswer)
```

---

## New Helper: `clipInput()` in `src/lib/server.ts`

### Diff
```diff
+/** Validate and clip a string input to prevent AI cost abuse. */
+export function clipInput(text: string | undefined | null, maxLen: number = 5000): string {
+  if (!text || typeof text !== 'string') return ''
+  return text.slice(0, maxLen)
+}
+
+/** Validate that a required string field is present and non-empty. */
+export function requireField(value: any, name: string): string {
+  if (!value || typeof value !== 'string' || !value.trim()) {
+    throw new Error(`${name} is required`)
+  }
+  return value
+}
```

---

## Summary Table

| # | File | Severity | Issue | Fix | Verified |
|---|------|----------|-------|-----|----------|
| 1 | `src/app/api/tts/route.ts` | High (7.5) | No auth | Added `getCurrentUser()` + speed validation | ✅ Build + test pass |
| 2 | `src/app/api/asr/route.ts` | High (7.5) | No auth + no size limit | Added auth + 5MB limit + type check | ✅ Build + test pass |
| 3 | `src/app/api/ats/route.ts` | Medium (5.3) | No input limit | Added `clipInput(10000)` | ✅ Build pass |
| 4 | `src/app/api/cover-letter/route.ts` | Medium (5.3) | No input limit | Added `clipInput(5000/200)` | ✅ Build pass |
| 5 | `src/app/api/assistant/route.ts` | Medium (5.3) | No input limit | Added `clipInput(2000/50/100)` | ✅ Build pass |
| 6 | `src/app/api/interview/[id]/next/route.ts` | Medium (5.3) | No input limit on answer | Added `clipInput(5000)` | ✅ Build pass |

## Remaining Security Items (Infrastructure, Not Code)

| Item | Severity | Status |
|------|----------|--------|
| Rate limiting | High | Not implemented (needs Redis middleware) |
| CSRF tokens | Medium | Not implemented (needs NextAuth) |
| CSP headers | Medium | Not configured (needs next.config.ts) |
| Real Stripe | Medium | Simulated (needs Stripe SDK + webhooks) |
