# P4-6c — full-stack-developer (Analytics)

## Task
Build the Advanced Analytics module for CareerOS AI:
- `src/app/api/analytics/route.ts` — GET returning `{user, business, ai}` analytics sections aggregated from AiUsage, Resume, Job, Interview, CreditTransaction, Subscription, Invoice, Achievement, SkillProfile.
- `src/components/modules/analytics.tsx` — client module with 3 tabs (My Career / Business / AI Performance), gradient KPI cards, recharts (Line/Area/Bar/Pie), achievement timeline, growth funnel, top-5 features table.

## Files Created (only these two, per task constraints)
1. `src/app/api/analytics/route.ts` — GET aggregator. Real data from AiUsage/Resume/Job/Interview/CreditTransaction/Subscription/Invoice/Achievement/SkillProfile; deterministic daily-seeded simulation overlays the business section so the single-tenant demo has realistic platform-wide revenue/retention/growth numbers. Returns:
   - `user`: KPIs (resumes, avg ATS, interviews completed, applications, achievements), `resumesOverTime` (cumulative), `atsTrend` (running best), `applicationsByStatus`, `skillGrowth` (cumulative distinct skills), `achievements[]` (last 50 with type/title/description/value/unlockedAt), `creditUsageByFeature` (sum of negative CreditTransaction.amount grouped by feature).
   - `business`: KPIs (totalRevenue from paid Invoice.amount, MRR from active Subscription × plan price, activeSubs, avgRevenuePerUser), `revenueTrend` (6 months, revenue+mrr+users, latest month anchored to real invoices), `planDistribution` (real or simulated fallback), `growthFunnel` (Visitors→Signups→Activated→Paid→Retained), `simulated` {churnRate, growthRate, ltv, arpu}.
   - `ai`: KPIs (totalCalls, avgLatency, successRate, totalCost), `callsByModel` (PieChart-ready), `latencyByFeature` (avg), `costByFeature` (horizontal BarChart), `tokensOverTime` (14 days AreaChart), `topFeatures` (top 5 by calls, with tokens+cost).
2. `src/components/modules/analytics.tsx` — `'use client'` `AnalyticsModule`. ModuleHeader with `t('analyticsTitle')` / `t('analyticsSub')` and BarChart3 icon. shadcn Tabs with 3 tabs:
   - My Career: 5 KPI cards (resumes/avg ATS/interviews/applications/achievements), ATS score trend (LineChart), applications by status (BarChart with per-status Cell colors), skill growth over time (AreaChart violet), credit usage by feature (vertical-layout horizontal BarChart), achievement timeline (vertical connector + type-specific lucide icons in ScrollArea).
   - Business: 4 KPI cards (revenue/MRR/active subs/ARPU), revenue trend 6 months (AreaChart + dashed MRR Line overlay), plan distribution (PieChart + legend), growth funnel (Progress bars with conversion %), retention snapshot card (churn/growth/net).
   - AI Performance: 4 KPI cards (calls/latency/success/cost), tokens 14 days (AreaChart), calls by model tier (PieChart with tier colors), latency by feature (BarChart), cost by feature (horizontal BarChart), top-5 features Table.
   - Emerald-led palette (oklch 0.7 0.15 162 brand + cyan/amber/violet/orange/rose/teal accents, NO indigo/blue). GradientKpi sub-component uses motion.div + linear-gradient overlay + color-mix icon chip. Uses useApp() translations, api() fetch, LoadingScreen while pending. Fully responsive (2-col KPIs on mobile, 4-5 col on desktop).

## Decisions
- Did NOT modify store.ts/types.ts/i18n.ts/sidebar.tsx/page.tsx (per constraints). ModuleId 'analytics' and i18n keys analyticsTitle/analyticsSub already exist — verified via grep.
- AnalyticsModule is exported but NOT wired into page.tsx — an integrator agent should add `{active === 'analytics' && <AnalyticsModule />}` and a sidebar entry.
- Deterministic daily-seeded simulation for business section (seed = YYYYMMDD) so reloads are stable and the single-tenant demo shows realistic ~1.3k-subscriber platform numbers. Real invoice/subscription data is layered in (latest month revenue = real + simulated; MRR = max(real, simulated)).
- Plan price map: free=0, starter=19, professional=49, career_pro=99, enterprise=299. Annual subs divided by 12 for MRR.
- ATS score trend uses running best-so-far (monotonic up) so the LineChart trends up cleanly even if a user creates a lower-scored resume later.
- Skill growth uses cumulative distinct skills from SkillProfile.skills JSON across creation timestamps.
- Credit usage only counts negative CreditTransaction.amount (positive = purchase/grant).
- FEATURE_LABELS mapping centralizes display names (resume-enhance→Resume AI, ats-analyze→ATS, etc.) shared between API and module.

## Verification
- `bun run lint` → 0 errors, 0 warnings.
- `/api/analytics` compiles cleanly in dev (Turbopack, 172ms compile) but returns HTTP 500 at runtime due to a STALE Prisma client cached in globalThis (the running dev server was started before Phase 4 models were added to the generated client). Pre-existing issue — also breaks `/api/billing/credits` (User.credits field not found on cached client). I ran `bunx prisma generate` to refresh node_modules/.prisma/client with Achievement/CreditTransaction/Subscription/Invoice models; a dev-server RESTART is required for the new client to be picked up. After restart, `/api/analytics` will return 200.
- All models/fields used in the route are verified against `prisma/schema.prisma`: Resume {atsScore, aiScore, createdAt}, Job {status, createdAt}, Interview {status, score}, Achievement {type, title, description, value, unlockedAt}, CreditTransaction {amount, reason, feature}, SkillProfile {skills, createdAt}, Subscription {plan, status, interval}, Invoice {amount, status, periodStart, createdAt}, AiUsage {feature, model, tokens, cost, latencyMs, success, createdAt}.

## Notes for Downstream Agents
- Integrator: wire `AnalyticsModule` into `src/app/page.tsx` (`{active === 'analytics' && <AnalyticsModule />}`) and add a sidebar entry in `src/components/careeros/sidebar.tsx` with the BarChart3 icon pointing to `ModuleId 'analytics'`.
- Orchestrator: restart the dev server so the freshly-regenerated Prisma client (with Phase 4 models) is loaded — this unblocks `/api/analytics` AND `/api/billing/credits` AND any other Phase 4 route currently returning 500.
