---
Task ID: P3-6b
Agent: full-stack-developer (Mentors)
Task: Build Mentor Marketplace module + API.

Work Log:
- Read worklog + reference files (jobs.tsx for Tabs+cards pattern, module-header.tsx, server.ts getCurrentUser/err/parseJson, api-client.ts api(), profile-context.tsx useProfile(), prisma schema Mentor/Booking models, store.ts ModuleId 'mentors', i18n.ts mentorsTitle/mentorsSub/book/booked keys, agents.tsx for ScrollArea+motion patterns, app-provider useApp, use-toast, dialog/avatar/tabs/select ui components).
- Created `/api/mentors/route.ts`:
  - GET — counts mentors; if 0, seeds 6 synthetic mentor profiles (Sarah Chen/Principal Eng @ Google, Marcus Johnson/EM @ Stripe, Priya Patel/Senior PM @ Airbnb, David Kim/Staff UX @ Figma, Emily Rodriguez/Dir Data Science @ Netflix, James O'Brien/VP Eng @ Shopify) — each backed by a synthetic seed user (unique email) so the Mentor.userId FK is valid. Each mentor has realistic title, expertise[], industries[], experience years, rate (cents/hr), rating, sessions, bio, structured availability ({day, slots[]}[]), verified=true. Then fetches all mentors (include user) ordered by verified desc → rating desc → sessions desc, plus the current user's own mentor profile (if any) and their bookings (include mentor.user). Returns serialized JSON with expertise/industries/availability parsed and a `rateDisplay` ($XX) field.
  - POST — creates the current user's own mentor profile. Idempotent: if one already exists for the userId, returns the existing record. Generates a unique slug from the user's name (or "mentor"). Audit-logs `mentor.create`.
- Created `/api/mentors/[id]/route.ts`:
  - GET — single mentor by id, include user + bookings (include user, ordered by scheduledAt asc). 404 if not found.
  - PUT — updates the current user's OWN mentor profile only (404 if not owned). Accepts partial body; preserves existing values for unset fields. If slug is changing, regenerates a unique slug. Audit-logs `mentor.update` with the list of changed fields.
- Created `/api/bookings/route.ts`:
  - GET — parallel fetch of (a) bookings where the user is the booker (`asUser`, include mentor.user) and (b) the user's own mentor profile + its bookings (`asMentor`, include user). Both ordered by scheduledAt desc. Returns `{ asUser, asMentor }`.
  - POST — accepts `{ mentorId, type, topic, scheduledAt, duration }`. Validates mentorId + scheduledAt. 404 if mentor missing. 400 if user tries to book their own mentor profile. Computes price = mentor.rate × duration/60 (cents, rounded). Creates the booking with status=pending, increments mentor.sessions, audit-logs `booking.create`. Returns the booking with mentor+user nested.
- Created `mentors.tsx` ('use client'):
  - ModuleHeader with t('mentorsTitle')/t('mentorsSub'), GraduationCap icon.
  - Tabs: "Browse Mentors" | "My Bookings" (with count badge) | "Become a Mentor".
  - Browse tab: search input (filters by name/title/expertise/industries) + "Become a mentor" CTA + responsive 1/2/3-col grid of MentorCard. MentorCard: Avatar with initials (bg-brand-soft text-brand), name + Shield (verified) + amber star rating, title, line-clamped bio, expertise chips (brand-soft tint), rate ($/session) + session count, emerald "Book" button. Motion entrance.
  - BookingDialog (Dialog from shadcn/ui): mentor header, session-type Select (session/resume_review/mock_interview with icons + descriptions), topic Input, datetime-local Input (defaults to tomorrow 17:00), duration Select (30/60/90), mentor availability preview chips, live price computation ($rate × duration/60), Book button showing total. POSTs to /api/bookings, on success switches to "My Bookings" tab + reloads.
  - My Bookings tab: empty state with CTA back to Browse; otherwise two BookingList sections (Upcoming where scheduledAt >= now AND not cancelled; Past otherwise). BookingCard: avatar + mentor name + status badge (color-coded: pending=amber, confirmed=brand, completed=emerald, cancelled=destructive), type badge with icon, date + time + duration + price, topic, completed-feedback star row.
  - Become a Mentor tab: 2-col layout. Left = form card (Title, ChipInput for expertise, ChipInput for industries, Experience years, Rate $/hr with $ prefix, Bio textarea, Availability textarea in `Day: HH:MM, HH:MM` format with parsing). On mount, hydrates from existing mentor (if any) else prefills from useProfile() (targetRole→title, strengths→expertise, industry→industries, experienceYears→experience, brandStatement→bio). Save: if mentor exists → PUT /api/mentors/:id, else POST /api/mentors. Right sidebar = live preview card (mirrors MentorCard styling with current form values, "New" rating badge, $rate/session, 0 sessions) + tips card (brand-soft tint, 4 emerald-bulleted tips).
  - Reusable ChipInput component: input + Add button, Enter to add, X button on each chip to remove, dedupe on add.
  - All actions use api() + useToast() for feedback. Premium styling: emerald accent (bg-brand, bg-brand-soft, ring-brand/20), amber star ratings (fill-amber-400 text-amber-600), glass cards with hover:border-brand/40 transitions, framer-motion entrance (initial={{opacity:0,y:8-10}} animate={{opacity:1,y:0}} with staggered delay), responsive mobile-first grids, status color-coding, RTL-safe (ps-/pe-/start-/end-/flip-rtl).
  - Followed the established inline `.then()` pattern in the mount effect (no useCallback+useEffect shape) to avoid the react-hooks/set-state-in-effect lint rule.
- Lint: 0 errors, 0 warnings (initial run had 1 unused eslint-disable warning — removed it).
- End-to-end curl verification against running dev server:
  - GET /api/mentors 200 → returned 6 seeded mentors with correct shape (Emily Rodriguez, Sarah Chen, etc.) + ownMentor + myBookings arrays.
  - POST /api/bookings 200 → created booking for Emily Rodriguez mentor, price=22000 cents ($220 = $220/hr × 60min, correct), status=pending, mentor.sessions incremented 45→46, audit log written.
  - GET /api/bookings 200 → returned the booking under `asUser` array with nested mentor+user data.
  - POST /api/mentors 200 → created own mentor profile for demo user (Alex Rivera) with auto-generated slug "alex-rivera", verified=false, default rating=0/sessions=0.
  - PUT /api/mentors/:id 200 → updated title/rate/bio, preserved expertise/industries/experience/availability, slug unchanged.
  - GET /api/mentors/:id 200 → returned single mentor with 1 nested booking (the one created above).
  - GET /?module=mentors 200 → page shell renders (module loads client-side).

Stage Summary:
- Files created (only these 4):
  - `src/app/api/mentors/route.ts` — GET (list + 6-mentor seed if empty + own profile + bookings) + POST (create own profile, idempotent).
  - `src/app/api/mentors/[id]/route.ts` — GET single mentor with bookings + PUT update own profile (owner-scoped).
  - `src/app/api/bookings/route.ts` — GET {asUser, asMentor} + POST create booking (price prorated from mentor hourly rate, session count increment, audit log).
  - `src/components/modules/mentors.tsx` — 3-tab module (Browse / My Bookings / Become a Mentor) with booking dialog, chip inputs, live preview, status-coded booking cards, premium emerald+amber styling.
- Key decisions:
  - Seed mentors are backed by synthetic seed users (unique emails like `sarah.chen@careeros.ai`) so the Mentor.userId FK is valid; only seeded when the marketplace is empty (count===0) so it's a one-time operation.
  - Rate is stored as cents (per schema `Int`) and converted to dollars for display (`$${(rate/100).toFixed(0)}`) — the Become-a-Mentor form takes dollars and multiplies by 100 before POSTing; the API stores cents and the GET responses include a precomputed `rateDisplay`.
  - Booking price is computed server-side from mentor.rate × duration/60 (cents) so the client can't tamper with pricing.
  - Self-booking is blocked server-side (400) so users can't inflate their own session count.
  - `asMentor` bookings array returns bookings on the user's own mentor profile (so mentors can see incoming requests); `asUser` returns bookings the user has made with other mentors.
  - Module wire-up is deferred to main agent (do NOT modify store.ts/types.ts/i18n.ts/sidebar.tsx/page.tsx) — `ModuleId 'mentors'` and `mentorsTitle`/`mentorsSub`/`book`/`booked` i18n keys already exist.
