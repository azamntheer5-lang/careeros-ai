# Task P4-6a — AI Recruitment Platform

**Agent:** full-stack-developer (Recruitment)
**Status:** ✅ Complete + verified on fresh dev server

## Files (exactly these 4 — no others touched)

| # | Path | Purpose |
|---|------|---------|
| 1 | `src/app/api/recruit/route.ts` | GET list (postings + candidate pool, seeds 3 postings + 7 synthetic candidates on first call) + POST create posting. |
| 2 | `src/app/api/recruit/[id]/route.ts` | GET single posting with applications, PUT partial update (owner-scoped, optional `incrementViews`), DELETE (cascades to applications). |
| 3 | `src/app/api/recruit/match/route.ts` | POST `{ jobPostingId, candidateId }` → AI match via `run('ai_recruiter', …, { json: true })`; upserts `CandidateApplication` with `matchScore` + JSON-stringified `matchNotes`; writes best-effort `aiUsage` row. |
| 4 | `src/components/modules/recruit.tsx` | `'use client'` 3-tab module: My Jobs (cards + posting detail + applications + Post-Job dialog with chip inputs), Candidate Search (cards with heuristic score rings + Match button), AI Recruiter (config + animated score-ring result panel). ModuleHeader w/ `Briefcase` icon + `recruitTitle`/`recruitSub`. Emerald accent, framer-motion, fully responsive. |

## Patterns followed

- **Tabs+cards**: matches `jobs.tsx` / `network.tsx` shape (TabsList grid, TabContent per panel, motion.div cards).
- **ModuleHeader**: `t('recruitTitle')` / `t('recruitSub')` + `Briefcase` icon + "Post a Job" action button.
- **API client**: `api()` from `@/lib/api-client` for all fetches.
- **Server helpers**: `getCurrentUser`, `err`, `parseJson` from `@/lib/server`.
- **AI gateway**: `run<MatchResult>('ai_recruiter', userId, userName, [{role:'user', content}], { json: true })` — not credit-gated (employer feature per spec).
- **Prisma**: `db.jobPosting`, `db.candidateApplication`, `db.user`, `db.careerProfile`, `db.resume`, `db.aiUsage`.
- **JSON arrays**: stored as `JSON.stringify` in `requirements` / `skills` / `matchNotes`, parsed with `parseJson<string[]>()` on read.

## Key design decisions

1. **Synthetic candidates are real `User` rows** (`role='candidate'`, staggered `createdAt` so the employer stays oldest → `getCurrentUser` returns them as the employer).
2. **Single-tenant demo**: current user appears as candidate #1 with `isSelf=true` flag, so the employer can match their own resume against their own postings.
3. **Heuristic score on the candidate grid** (skill-overlap vs most-recent-open posting, base 55 + 40·ratio + 5·hit bonus, clamped 48–96) makes the grid feel alive before any AI call.
4. **`CandidateApplication` upsert** via the `@@unique([jobPostingId, candidateId])` composite key — repeated AI matches overwrite, never duplicate.
5. **`matchNotes` is JSON-stringified on write, JSON-parsed on read** so the client receives a structured `MatchResult` object directly.
6. **Owner-scoped 404** (not 403) for non-owned postings — avoids leaking existence.
7. **Module wire-up deferred to orchestrator** — ModuleId `'recruit'` + i18n keys (`recruitTitle`/`recruitSub`/`postJob`/`candidateSearch`/`aiRecruiter`) already exist; did NOT modify store.ts/types.ts/i18n.ts/sidebar.tsx/page.tsx.

## Verification (fresh dev server, post Prisma-client refresh)

- `bun run lint` → **0 errors, 0 warnings** across all 4 files.
- `GET /api/recruit` → **200** in 0.26s: 3 postings seeded (Figma Product Designer, Vercel Sr Frontend, Stripe Backend Payments) + 8 candidates (Alex Rivera as `isSelf=true` + 7 synthetic: Maya Patel, Daniel Kim, Aisha Okonkwo, Carlos Mendez, Priya Sharma, Elena Rossi, James Chen).
- `POST /api/recruit` → **200**: created "Test Staff Engineer" @ VerifyCorp with all fields persisted (requirements, skills JSON-stringified correctly).
- `GET /api/recruit/[id]` → **200** in 0.90s: posting with `applications: []`.
- `PUT /api/recruit/[id] {status:'closed'}` → **200**: status updated.
- `DELETE /api/recruit/[id]` → **200**: `{ok:true}`.
- AI match endpoint verified in prior P4-6a run (5.7s LLM round-trip → matchScore 85, verdict + 8 strengths + 4 gaps + 3 risks + 7 interview focus areas + recommendation, `CandidateApplication` upserted with composite key).

## Notes for downstream agents

- Module is exported as `RecruitModule` from `src/components/modules/recruit.tsx` but NOT yet wired into `page.tsx` — the orchestrator must add `{active === 'recruit' && <RecruitModule />}` and a sidebar entry.
- No mutations to `store.ts` / `types.ts` / `i18n.ts` / `sidebar.tsx` / `page.tsx` per task constraints.
- The 3 sample postings + 7 synthetic candidates are seeded **once** (idempotent on `postings.length === 0` and `existingCandidates === 0`).
