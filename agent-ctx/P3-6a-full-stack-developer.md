# P3-6a — full-stack-developer (Network)

## Task
Build the Professional Social Network module ("CareerOS Network") for the CareerOS AI Next.js 16 app:
- 3 API routes (network, network/[slug], network/follow)
- 1 client module (`src/components/modules/network.tsx`) with Feed / My Profile / Discover tabs

## Files Created
1. `src/app/api/network/route.ts` — GET (own profile + feed + suggested) + POST (create post). Lazily seeds 4 synthetic professionals (Sarah Chen, Marcus Webb, Priya Nair, Diego Alvarez) + 8 seed posts so Discover & Feed have content in this single-tenant demo.
2. `src/app/api/network/[slug]/route.ts` — GET public profile by slug (with their posts + counts) + PUT to update own profile (bio, headline, tags, visibility). Verifies slug ownership.
3. `src/app/api/network/follow/route.ts` — POST `{ followeeId }` toggles follow/unfollow, increments/decrements `followers` / `following` counters on both NetworkProfile rows.
4. `src/components/modules/network.tsx` — `'use client'` module exporting `NetworkModule`. Tabs: Feed (composer + post cards + sidebar snapshot), My Profile (edit form + counts + own posts + tips card), Discover (responsive grid of suggested pros with follow toggle).

## Decisions
- Synthetic profiles are **real DB rows** (User + NetworkProfile + Posts), created lazily on first GET if missing. This makes follow/unfollow and feed authorship work end-to-end rather than being mock-only.
- Slug derived from name via `slugify()` with a numeric suffix fallback to guarantee uniqueness against the `@unique` constraint.
- Types declared locally in the module (network owns its shape; `types.ts` not modified per constraints).
- Post type system: `post | achievement | question | opportunity`, each with its own lucide icon + badge color (emerald/amber/fuchsia — no indigo/blue).
- Follow toggle returns `{ following, followers }` so the client can update both the suggested card and the current user's own following count without a full refetch.
- Visibility is enforced server-side: GET `/api/network/[slug]` returns 404 for private profiles.
- Premium styling consistent with existing modules: `bg-card/60 backdrop-blur-sm`, `bg-brand-soft text-brand` accents, framer-motion entrance animations, sticky sidebar cards.

## Verification (runtime, via Caddy gateway on port 81)
- `GET /api/network` → 200, returned `{profile, posts[8], suggested[4]}` with profile.userName="Alex Rivera".
- `POST /api/network` → 200, created a post with authorName, type, title, content, tags all persisted.
- `POST /api/network/follow` → 200, `{following:true, followers:710}` (was 709 → +1), Connection row created.
- `PUT /api/network/alex-rivera` → 200, updated bio/headline/tags; `following:1` reflected the prior follow.
- `bun run lint` → 0 errors, 0 warnings.

## Notes for Downstream Agents
- The `NetworkModule` component is exported from `src/components/modules/network.tsx` but is **not yet wired** into `src/app/page.tsx` (per task constraints I did not modify page.tsx). An integrator agent should add `{active === 'network' && <NetworkModule />}` to page.tsx and add a sidebar entry pointing to `ModuleId 'network'` (already in store.ts).
- i18n keys used: `networkTitle`, `networkSub` (already in `src/lib/i18n.ts`). The module also uses some hard-coded English labels (e.g. "Feed", "My Profile", "Discover", "Post", "Follow", "Following") — these match existing patterns in jobs.tsx where tab labels are hard-coded English.
- The synthetic seed runs once per fresh DB; it is idempotent (checks `User.findUnique` by email and `Post.count` before inserting).
