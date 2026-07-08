# Task P2-4d — full-stack-developer (Plans/AI-Center/Admin)

## Scope
Built 3 dashboard modules + 4 API routes for CareerOS AI Phase 2.

## Files Created
- `src/components/modules/plans.tsx` — Plans & Billing module
- `src/components/modules/aicenter.tsx` — AI Center module
- `src/app/api/plans/route.ts` — GET (plan + cycle usage + invoices) / PUT (change plan)
- `src/app/api/aicenter/route.ts` — GET (prompts + last 100 usage + totals + byFeature + byModel + 14-day trend)
- `src/app/api/audit/route.ts` — GET (?limit, includes user.name) / POST (manual entry)
- `src/app/api/flags/route.ts` — GET (seeds 6 defaults if empty) / PUT (enabled / rollout)

## Files Modified (overwrite)
- `src/components/modules/admin.tsx` — KEPT existing KPI cards / revenue / plan dist / feature usage / system health. ADDED Audit Log card, Feature Flags card (Switch + Slider), AI Cost Monitoring card.

## Key Decisions
- `PLAN_LIMITS` uses `calls: null` for Enterprise (unlimited); `priceLabel: 'Custom'`.
- Invoices simulated from plan price over 6 months (Free/Enterprise show `—`).
- Admin AI-cost data computed client-side from `/api/aicenter` usage array (avoids adding a 7th endpoint, per task constraint of EXACTLY the listed files).
- Flag toggles use optimistic UI with rollback on error; `setRollout` fires PUT on every slider change.
- Audit logs written for `plan.change` and `flag.update` actions (also the existing `profile.update` from foundation agent).
- All 3 modules use `ModuleHeader` + emerald accent + glass cards + framer-motion entrance to match existing module visual style.

## Wire-up Notes for Main Agent
- `page.tsx` must render `PlansModule` for `'plans'` ModuleId and `AiCenterModule` for `'aicenter'` ModuleId (store.ts already has these ModuleIds).
- `ProfileProvider` must wrap the app (likely in `layout.tsx` or `page.tsx`) so `useProfile()` works in `plans.tsx` + `aicenter.tsx`. The existing `profile.tsx`, `intelligence.tsx`, `onboarding.tsx`, `command-palette.tsx` also need it.
- Sidebar/topbar need entries for the new modules (Plans, AI Center) — store.ts already has the ModuleIds.

## API Verification (all 200)
- GET `/api/plans` → returns premium plan + 5 calls this cycle + byFeature breakdown + 6 invoices.
- PUT `/api/plans {plan:'pro'}` → updates user.plan + writes audit log.
- GET `/api/aicenter` → 17 prompts + last 100 usage rows + totals + byFeature + byModel + 14-day trend.
- GET `/api/flags` → seeds 6 defaults on first call (voice_interviews, portfolio_public, ai_coach, ats_v2, ats_recruiter_sim, career_intelligence).
- PUT `/api/flags {key,enabled}` and `{key,rollout}` → both update + write audit log.
- GET `/api/audit?limit=N` → returns recent entries with resolved userName.

## Lint Status
My 7 new/modified files pass clean. The single remaining lint error (`react-hooks/set-state-in-effect` in `src/components/careeros/profile-context.tsx:51`) is pre-existing from the foundation agent and outside this task's scope — left untouched per "EXACTLY these files, NO others" constraint.

## Dev Server Note
The long-running dev server had a stale PrismaClient cached in `globalThis` (the singleton in `lib/db.ts`) that didn't know about `AuditLog` / `FeatureFlag` models. Ran `bun run db:generate`, then killed PID 2181 and restarted `bun run dev` (double-forked with `setsid` for persistence). Verified the new client picked up the models via direct PrismaClient probe (`FeatureFlag.count()` + `AuditLog.count()` both returned 0 = tables exist).
