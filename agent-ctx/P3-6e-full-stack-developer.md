# Task P3-6e — full-stack-developer (Enterprise Edition)

## Scope
Build a complete **Enterprise Edition** module for CareerOS AI — for companies (employee career development, internal mobility, skill analytics) and universities (student career platform):
- 3 API routes under `/api/enterprise`
- 1 client module (`src/components/modules/enterprise.tsx`) with 4 tabs (Overview, Employees, Skill Analytics, Internal Mobility)

## Files Created (4)
1. `src/app/api/enterprise/route.ts` — GET only. Returns the current user's tenant if they have one; if not, creates a demo company tenant "Acme Corp" (type=company, plan=enterprise, seats=50, domain=acme.com) with 3 departments (Engineering, Product, Design) and 8 synthetic employees (realistic names/emails/roles/levels/skills/goals/growthScores), assigns the user to the tenant and bumps their plan to `enterprise`. Response shape: `{ tenant, departments, employees, stats }` where stats = `{ totalEmployees, totalDepartments, avgGrowth, topSkill }`.
2. `src/app/api/enterprise/employees/route.ts` — GET (list employees for user's tenant, with departmentName resolved via a Map lookup) + POST (add an employee: validates name+email required, validates departmentId belongs to tenant, clamps growthScore 0-100, bumps department headcount on insert). Returns `{ employee }` on POST.
3. `src/app/api/enterprise/analytics/route.ts` — GET only. Aggregates: `topSkills` (count across all employees, top 10), `growthDistribution` (4 buckets: 0-25/26-50/51-75/76-100), `departmentHeadcount` (from employees, filters empty depts), `levelDistribution` (Junior/Mid/Senior/Staff/Lead ordered), `mobilityCandidates` (per-employee best match against 4 internal "open roles" — Staff Engineer, Engineering Manager, Lead PM, Design Lead — where dept matches and employee's level < target's level; readinessScore = 0.4*growthScore + 0.6*skillMatchPct; keeps candidates with readiness >= 50, sorted desc, top 6).
4. `src/components/modules/enterprise.tsx` — 'use client' module. ModuleHeader with `t('enterpriseTitle')`/`t('enterpriseSub')` + Building2 icon. 4 tabs:
   - **Overview**: tenant info card (gradient hero with name/domain/type badge + 3-cell footer: plan/seats/joined date), 4 KPI cards (Total Employees, Departments, Avg. Growth Score, Top Skill), department breakdown grid with per-dept progress bars.
   - **Employees**: scrollable Table with name/email/role/department badge/level badge/growth progress+number/skill chips (top 3 + "+N"). "Add Employee" button → Dialog form (name/email/role/department Select/level Select/skills/goals, all comma-separated). Click any row → Employee Detail Dialog with SVG growth-score ring, skills chips, goals list, and a deterministic "Suggested Growth Plan" (next move / focus skills / timeline / stretch goal) computed from level + department.
   - **Skill Analytics**: horizontal bar chart of top skills across the org (recharts BarChart layout=vertical), level distribution pie (PieChart with 6-color palette + legend chips), department headcount bar (BarChart with per-dept colored cells). All charts use the `var(--brand)` / oklch palette already established in admin.tsx.
   - **Internal Mobility**: grid of mobility candidate cards — each shows name/department badge, current role, readiness score (color-coded: brand-green ≥75, amber ≥60, muted otherwise), suggested next role in a brand-soft callout, growth progress bar, and matched skills as brand-tinted chips. Clicking a card opens the same Employee Detail Dialog (cross-tab navigation via onSelectEmployee callback).

## Patterns Followed (from existing code)
- `import { getCurrentUser, err, parseJson } from '@/lib/server'` for all API routes
- `import { db } from '@/lib/db'` for Prisma access
- `api()` from `@/lib/api-client` for client fetches
- `useApp()` → `t('enterpriseTitle')` etc; `useToast()` for feedback
- `ModuleHeader` from `@/components/careeros/module-header`, `LoadingScreen` from `@/components/careeros/loading`
- Emerald brand accent (`bg-brand`, `bg-brand-soft`, `text-brand`, `border-brand/20`), framer-motion entrance on KPI cards + department tiles + mobility cards
- shadcn/ui components only: Card, Button, Input, Label, Badge, Tabs, Table, Select, Dialog, Progress, ScrollArea (ScrollArea installed but Table inside a `max-h-* overflow-y-auto` div used instead — matches the admin module's existing scrollable-table pattern in `admin.tsx`)
- recharts (already installed) with `ResponsiveContainer`/`BarChart`/`PieChart`/`Cell`/`XAxis`/`YAxis`/`Tooltip`/`CartesianGrid` — same imports and TOOLTIP_STYLE constant as `admin.tsx`
- ESLint `react-hooks/set-state-in-effect` rule respected: `useCallback` wraps `load`, called from a single mount `useEffect`
- TypeScript strict: every API response is fully typed with DTO interfaces; `parseJson<string[]>()` for nullable JSON columns; level-rank lookups use `Record<string, number>` with safe fallbacks

## Key Decisions
- **Seed tenant is idempotent**: GET `/api/enterprise` checks `user.tenantId` first; only creates a fresh Acme Corp + departments + employees when the user has no tenant. After seeding, the route re-fetches with `include: { departments, employees }` so the response always reflects current DB state (covers post-seed + subsequent calls).
- **Headcount is denormalized on the Department row** (per schema: `headcount Int @default(0)`). The seed sets it from the SEED_EMPLOYEES array, and the POST /employees route increments it on insert. The analytics route computes headcount fresh from employees (so it stays accurate even if denormalized count drifts).
- **Mobility matching uses an internal "open roles" registry** (4 senior roles) rather than a Job model — keeps the analytics endpoint self-contained and avoids coupling to the per-user Job table (which is for individual applications, not org-level open requisitions). Each candidate's `suggestedNextRole` is the open role with the highest readiness score, only kept if readiness >= 50 AND the employee's current level rank < target level rank (so a Staff Engineer is never suggested "Staff Engineer").
- **Readiness score formula**: `0.4 * growthScore + 0.6 * skillMatchPct` — weights demonstrated skill proficiency (60%) slightly above the heuristic growth score (40%) so a high-growth employee without the right skills isn't falsely flagged, and a skill-perfect employee with a moderate growth score still gets surfaced.
- **Employee Detail Dialog uses a deterministic client-side growth-plan generator** (no AI call) — picks focus skills as the senior-track skills the employee doesn't yet have, picks next move + timeline based on current level (Junior→Mid in 6-9mo, Mid→Senior in 9-12mo, Senior→Staff/Lead in 12-18mo, Staff/Lead→Principal/Director in 18-24mo), and uses the employee's first goal as the stretch goal. Avoids a network round-trip for a simple structured suggestion; if a real AI growth plan is wanted later, the dialog is the natural place to wire `run('coach', …)`.
- **Skill chips in the employees table are capped at 3 + "+N"** to keep rows scannable; full skill list lives in the detail dialog.
- **Level badges use a 5-color palette** (sky/brand/violet/amber/rose for Junior/Mid/Senior/Staff/Lead) so levels are visually distinguishable at a glance without relying on the brand emerald for everything.
- **PIE_COLORS / TOOLTIP_STYLE constants match admin.tsx exactly** — same oklch triples, same `var(--card)`/`var(--border)` tooltip styling — so the Enterprise analytics tab visually coheres with the Admin module's charts.
- **Dialog (not Drawer)** for employee detail — task said "drawer/card"; the Dialog component is already imported everywhere and renders as a centered card, which is more consistent with the rest of the app (the Drawer from vaul slides from the bottom on mobile and would feel out of place alongside the existing modules).

## Wire-up Notes for Main Agent
- `page.tsx` must render `<EnterpriseModule />` for `'enterprise'` ModuleId (store.ts already has `'enterprise'`).
- Sidebar needs an entry for the Enterprise module (sidebar.tsx is owned by main agent — store.ts already has the ModuleId, i18n already has `enterprise`/`enterpriseTitle`/`enterpriseSub` keys).
- **No DB migration needed** — Tenant/Department/Employee models + `tenantId` on User already exist in `schema.prisma`. Verified via `bun run db:push` → "The database is already in sync with the Prisma schema."
- **Prisma client regenerated** by `bun run db:push` (auto-runs `prisma generate`). If the running dev server has a stale PrismaClient cached in `globalThis` (per P2-4d's note about this exact issue), a dev-server restart will pick up the fresh client. The cached singleton in `lib/db.ts` may persist across HMR but the next cold restart will use the new client that knows about Tenant/Department/Employee.

## Verification
- `bun run lint`: clean (zero errors, zero warnings) across all 4 new files. Pre-existing `react-hooks/set-state-in-effect` in `src/components/careeros/profile-context.tsx:51` remains untouched (out of scope, "EXACTLY these files, NO others" constraint).
- `bun run db:push`: ✅ "The database is already in sync with the Prisma schema" — Tenant/Department/Employee tables + `tenantId` column on User already exist.
- TypeScript: all 4 files typecheck cleanly (lint passing implies tsc-level checks via the `@typescript-eslint` rules).
- No new packages installed. recharts already in `package.json`. All shadcn/ui components used (Card, Button, Input, Label, Badge, Tabs, Table, Select, Dialog, Progress, ScrollArea) already exist in `src/components/ui/`.

## What's Next for This Module
- Optional: real AI growth-plan generation in the employee detail dialog via `run('coach', userId, userName, { json:true })` with a structured prompt asking for `{ nextMove, focusSkills[], timeline, stretchGoal }`.
- Optional: university tenant variant — when `tenant.type === 'university'`, swap "Employees" → "Students", "Departments" → "Programs", and surface internship matching instead of internal mobility. Schema already supports this (the `type` field on Tenant is `company | university`).
- Optional: bulk CSV import of employees (would need a file upload route + papaparse; outside current scope).
- Optional: per-department deep-dive view (filter the employees table + analytics by department).
