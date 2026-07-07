# P4-6b — Marketplace module

**Agent:** full-stack-developer (Marketplace)
**Task:** Build Marketplace module + API (templates + creator content).

## What was built

### API routes (3 files)

1. **`src/app/api/marketplace/route.ts`** — `GET` lists all published Templates + CreatorContent (with creator name/headline), plus the current user's own items (`mine.templates`, `mine.content`). If the marketplace is empty (no published Template + no published CreatorContent), seeds 12 diverse items via 9 synthetic creator users (role='creator'):
   - 8 Templates: Tech Resume Pro (Engineering, free, featured), Executive Elegant (Executive, $19, featured), Creative Bold (Design, $9), ATS Optimized (ATS, free), Aurora portfolio (Developer, free, featured), Minimal Dev portfolio (Developer, free), Bold Studio portfolio (Designer, $12), Polished Pro cover letter (Professional, free). Each has a realistic `config` (resume configs include `template/accent/font/spacing/careerMode/sampleData` with a full sample resume; portfolio configs include `theme/accent/sections`; cover_letter configs include `tone/sampleContent`) and a `preview` blob (accent + layout + font).
   - 4 CreatorContent: System Design Interview Guide ($29, 3201 enrolled), Salary Negotiation Playbook ($19, 5410), From IC to Manager course ($79, 1230), LinkedIn Branding Masterclass ($15, 4321). Each with tags + markdown content.
   - `POST` creates a Template or CreatorContent as the current user (`kind: 'template' | 'content'`). Validates name/title/content, stores price in cents (client sends dollars × 100), JSON-stringifies config/preview/tags, audit-logs the create.

2. **`src/app/api/marketplace/[id]/route.ts`** — `GET` returns a single Template OR CreatorContent by id (cuids are globally unique across both tables, so it tries Template first then CreatorContent). `PUT` updates whichever matches — owner-scoped (404 if `creatorId !== user.id`), preserves unset fields. `DELETE` removes — owner-scoped. All mutations audit-logged.

3. **`src/app/api/marketplace/[id]/install/route.ts`** — `POST` "installs" an item:
   - Template: increments `downloads`. For `type==='resume'`, creates a new Resume from the config (`template/accent/font/spacing/careerMode` + `sampleData`). For `type==='portfolio'`, creates a new Portfolio with a unique slug (`{name-slug}-{userId-suffix}`) from the config `theme/accent/sections`. For `type==='cover_letter'`, creates a new CoverLetter from `config.sampleContent`. Returns `{ ok, installed:'template', downloads, created:{kind,id,title?} }`.
   - CreatorContent: increments `enrollments`, returns `{ ok, installed:'content', enrollments, content }` so the client can show the full guide body.
   - Audit-logs `template.install` / `content.enroll`.

### UI module (1 file)

4. **`src/components/modules/marketplace.tsx`** — `'use client'` module:
   - `ModuleHeader` with `ShoppingBag` icon, `t('marketplaceTitle')` / `t('marketplaceSub')`, and a live count badge ("N templates · M guides") in the actions slot.
   - 3 tabs: **Templates** | **Expert Content** | **Become a Creator**.
   - **Templates tab**: gradient "Featured Templates" carousel at the top (horizontal snap-scroll of featured items with mini thumbnails + install buttons). Below it a filter bar (All/Resume/Portfolio/Cover Letter type chips + search input + category Select). Then a responsive 1/2/3-col grid of `TemplateCard`s.
   - `TemplateCard`: stylized preview thumbnail (per-type — resume = accent bar + content lines; portfolio = gradient hero + project grid; cover_letter = letter with accent header + paragraph lines), type badge + Featured badge, name (click → preview dialog), 2-line description, creator avatar (accent-tinted initials) + name, amber StarRating, downloads count + category badge, price (Free in brand color or $X), full-width Install button.
   - **Expert Content tab**: search input + count, then grid of `ContentCard`s. Card = gradient header (accent by content type) with type icon + title, creator row, description, tag chips, enrollments + price, Enroll/Get button.
   - **Become a Creator tab**: 2-col layout. Left = `CreatorForm` (kind toggle Template/Content; for Template: type Select, category, name, description, price $, published + featured switches, JSON config textarea with sample schema; for Content: type Select, price, title, description, tag chip input, markdown content textarea, published switch). Right = "Creator benefits" card (emerald gradient, 4 bulleted benefits) + `CreatorDashboard` (stats tiles: items/downloads/enrollments/est. revenue; list of own templates + content with live stats, publish/unpublish toggle, delete).
   - `ItemDialog` (Dialog): full preview with thumbnail (for templates), description, tags, 3 stat tiles (rating/downloads-or-enrollments/price), and a big Install/Enroll CTA.
   - `StarRating`: amber filled stars (fill-amber-400 text-amber-500) + numeric value.
   - `TemplateThumbnail`: pure-CSS styled mini layout per type + accent color (emerald/slate/fuchsia/amber gradients).
   - All actions use `api()` + `useToast()`. Install/enroll updates the local count optimistically. Delete uses `confirm()`. Toggle-publish calls PUT.
   - Premium styling: emerald accent (`bg-brand`, `bg-brand-soft`, `ring-brand/20`), amber star ratings, glass cards (`bg-card/60 backdrop-blur`), framer-motion entrance + hover lift, responsive mobile-first grids, RTL-safe (`start`/`end`/`ms`/`ps`).

## End-to-end verification performed

Restarted the dev server (the running Prisma client was stale — pre-Phase-4 schema, missing `Template`/`CreatorContent`/`credits`/`mfaEnabled` columns). After `bun run db:push` (regenerated client) + restart, ran a full atomic curl sequence:

| # | Call | Result |
|---|---|---|
| 1 | `GET /api/marketplace` | 200 — 8 templates + 4 content seeded; 3 featured; 9 creators; mine empty |
| 2 | `GET /api/marketplace/{resume-tid}` | 200 — single template item with full config |
| 3 | `POST /api/marketplace/{resume-tid}/install` | 200 — `{ok, installed:"template", downloads:12454, created:{kind:"resume", id, title:"Tech Resume Pro"}}` — new Resume created; downloads 12453→12454 |
| 4 | `POST /api/marketplace/{portfolio-tid}/install` | 200 — created Portfolio "Aurora" with unique slug; downloads 5421→5422 |
| 5 | `POST /api/marketplace/{cover-tid}/install` | 200 — created CoverLetter; downloads 7890→7891 |
| 6 | `POST /api/marketplace/{content-id}/install` | 200 — `{ok, installed:"content", enrollments:5411, content:"# Salary..."}`; 5410→5411 |
| 7 | `POST /api/marketplace` (template) | 200 — created "My Custom Resume" under Alex Rivera (demo user), price 500 cents |
| 8 | `POST /api/marketplace` (content) | 200 — created "My Guide" guide |
| 9 | `GET /api/marketplace` (re-check) | mine.templates:1, mine.content:1; install increments persisted |
| 10 | `PUT /api/marketplace/{my-tid}` `{published:false}` | 200 — updated item returned |
| 11 | `DELETE /api/marketplace/{my-cid}` | 200 `{ok:true}` |

`bun run lint` passes for all 4 files (0 errors, 0 warnings).

## Decisions / notes
- **Seed is one-shot & idempotent** — only runs when `published Template count + published CreatorContent count === 0`. Creators are backed by synthetic seed users (`*@creators.careeros.ai`, role='creator') so the `creatorId` FK is valid.
- **Price stored as cents** (per schema `Int`); serialized responses include a precomputed `priceDisplay` ("Free" or "$X"/"$X.YY"). The creator form takes dollars and multiplies by 100 before POSTing.
- **Install = real artifact creation** — resume installs create a new Resume (so the buyer immediately has an editable resume in the Resume Engine), portfolio installs create a new Portfolio with a unique slug, cover_letter installs create a new CoverLetter. This makes the marketplace feel alive rather than just incrementing a counter.
- **Shared `[id]` namespace** — cuids are globally unique, so the `[id]` route tries Template first, then CreatorContent. The install route does the same.
- **Owner scoping** — PUT/DELETE return 404 (not 403) for non-owned items to avoid leaking existence.
- **Module wiring deferred** — per task constraints I did NOT modify `page.tsx`/`store.ts`/`i18n.ts`/`sidebar.tsx`; `ModuleId 'marketplace'` and `marketplaceTitle`/`marketplaceSub` i18n keys already exist, so a future agent can wire `<MarketplaceModule />` into `page.tsx` with one line.

## Infra note
The dev server's Prisma client was stale (cached singleton from before Phase 4 schema additions — `db.template` was `undefined`). `bun run db:push` regenerated the client, but the running next-server still held the old singleton on `globalThis.prisma`. Restarting the dev server picked up the fresh client. One typo (`'next.server'` instead of `'next/server'`) in the install route was caught by the runtime module-not-found error during verification and fixed.
