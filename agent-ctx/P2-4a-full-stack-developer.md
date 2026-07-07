# P2-4a — full-stack-developer (Portfolio Builder)

## Scope
Build a complete **Portfolio Builder** module for CareerOS AI:
- CRUD API for portfolios (`/api/portfolio`, `/api/portfolio/[id]`)
- Public fetch-by-slug API (`/api/portfolio/public/[slug]`) — increments views
- Public server-rendered page at `/p/[slug]` — beautiful, theme-aware, gradient hero + glass cards
- 'use client' module component with list + editor + publish/share UX

## Files Created (5)
1. `src/app/api/portfolio/route.ts` — GET (list), POST (create with unique slug)
2. `src/app/api/portfolio/[id]/route.ts` — PUT (update), DELETE (owner-scoped)
3. `src/app/api/portfolio/public/[slug]/route.ts` — GET public; 404 if unpublished; increments views; loads owner's latest resume
4. `src/app/p/[slug]/page.tsx` — server component (`export const dynamic = 'force-dynamic'`), 5 themes × 6 accents, gradient-mesh hero, sections renderer
5. `src/components/modules/portfolio.tsx` — 'use client' module: list grid + Tabs editor (Content/Design/Sections/Share) + sticky right rail (share card with QR-style pattern, views stat, preview snippet)

## Patterns Followed (from existing code)
- `import { getCurrentUser, err, parseJson } from '@/lib/server'` for API routes
- `import { db } from '@/lib/db'` for Prisma access
- `api()` from `@/lib/api-client` for client fetches
- `useApp()` → `t('portfolioTitle')` etc; `useToast()` for feedback
- `useProfile()` from `@/components/careeros/profile-context` for prefill (headline→tagline, brandStatement→bio)
- `ModuleHeader` from `@/components/careeros/module-header`, `Spinner` from `@/components/careeros/loading`
- Emerald brand accent (`bg-brand`, `bg-brand-soft`, `text-brand`), rounded-full buttons, framer-motion entrance
- ESLint `set-state-in-effect` workaround: inline `.then()` in mount effect (matches `jobs.tsx`)
- shadcn/ui components only: Card, Button, Input, Textarea, Label, Badge, Switch, Tabs

## Key Decisions
- **Public-by-slug path is `/api/portfolio/public/[slug]`** (not `/api/portfolio/[slug]`) to avoid Next.js route-segment conflict with `/api/portfolio/[id]`.
- **Slug stays stable across edits** to keep public links durable. Slug only changes if an explicit unique slug is supplied in PUT.
- **Sections config** stored as JSON string column (`sections`), normalized on read by both API + module. Default: [hero, about, experience, skills, projects, certifications(hidden), contact].
- **Accent hex pairs are duplicated** as constants in the public page server component (server component can't easily import client-only types and we want zero client bundle on the public page). `ACCENTS` in `src/lib/types.ts` stays the source of truth for the editor.
- **QR rendered as a deterministic 8×8 inline SVG-style grid** generated from the slug — no new packages installed (qrcode.react etc. forbidden).
- **Origin via `useState` + `useEffect`** to avoid SSR/hydration mismatch — server renders empty origin, client fills it in after mount.
- **5 themes**: aurora (gradient mesh + glass), minimal (whitespace + monochrome), bold (dark + oversized type), dark (always dark), paper (warm cream).
- **Public page is pure server component** (no 'use client', no framer-motion) — uses inline CSS vars + theme helper functions for visuals without shipping client JS.

## Wire-up (main agent's job)
- Add to `src/app/page.tsx`:
  ```tsx
  import { PortfolioModule } from '@/components/modules/portfolio'
  ...
  {active === 'portfolio' && <PortfolioModule />}
  ```
- Add to sidebar (sidebar.tsx is owned by main agent — store.ts already has `'portfolio'` in ModuleId).
- No DB migration needed — `Portfolio` model already exists in schema.prisma.

## Verification
- `bun run lint`: clean for all 5 new files (only pre-existing `profile-context.tsx:51` set-state-in-effect error remains, untouched as instructed).
- `tsc --noEmit`: no errors in any of the 5 new files (pre-existing errors in i18n.ts duplicate keys, mobile-nav.tsx, api-client.ts, etc. untouched).
- Dev server: server is not currently running on this machine; the lint + tsc checks above are the verification surface available here.

## What's Next for This Module
- Optional: AI-assisted portfolio draft generation (use `run('portfolio.draft', userId, userName, [...])` — would need a new prompt key in `src/lib/prompts.ts`).
- Optional: drag-to-reorder sections (currently sections are toggled + renamed only).
- Optional: per-section custom content (today experience/skills/projects come from the latest resume; could allow inline editing).
