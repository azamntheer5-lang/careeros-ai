# CareerOS AI — Dead UI & Broken Flow Audit

**Scope:** Code-level audit of all 29 module files in `src/components/modules/` plus 4 careeros shell components (`sidebar.tsx`, `topbar.tsx`, `command-palette.tsx`, `floating-assistant.tsx`). Audit performed against API routes in `src/app/api/`.

**Method:** Each file read in full; every `api('/api/...')` and `fetch('/api/...')` call cross-referenced against the route tree; every `onClick`/`onCheckedChange` handler inspected for behavior; every `useEffect`/`useCallback` inspected for stale-closure / infinite-loop risks; every `useState`/`useRef` inspected for misuse.

**API cross-reference result:** All 70+ distinct API call paths in modules resolve to existing routes under `src/app/api/`. **No broken API calls found.**

---

## Module: resume.tsx
- **[CRITICAL — stale closure / core flow broken]** `src/components/modules/resume.tsx:42-52` — `load` is wrapped in `useCallback(..., [])` but its body reads `active` state (`if (!active && mapped.length) setActive(mapped[0])`). Because `active` is captured at first render (always `null` inside the closure), every subsequent call to `load()` re-sets `active` to `mapped[0]`. After the user selects resume B, edits it, and clicks **Save**, `save()` calls `load()`, which silently snaps the user back to resume A. Same bug fires after `remove()` and after `createBlank()`. The `active` dependency is missing from the `useCallback` deps array.

## Module: network.tsx
- **[MEDIUM — dead buttons]** `src/components/modules/network.tsx:447-452` — The ❤️ **Like** and 💬 **Comment** buttons on every `PostCard` are `<button type="button">` elements with **no `onClick` handler**. They render counts and have hover styles (`hover:text-brand`) but clicking does nothing. There is also no corresponding `/api/network/like` or `/api/network/comment` route.

## Module: cover.tsx
- **[LOW — soft-dead button]** `src/components/modules/cover.tsx:178` — The **Send** button on the latest-letter card only fires a toast (`"Draft ready to send via your email client."`). No `mailto:` link, no API call, no clipboard action. Cosmetic only.

## Module: briefing.tsx
- **[MEDIUM — broken Stop button]** `src/components/modules/briefing.tsx:131` — `const audioRef = useState<HTMLAudioElement | null>(null)` uses **`useState` instead of `useRef`**. As a result `audioRef` is a `[value, setter]` tuple, and `audioRef[0]` is always `null` (the `Audio` object created inside `speak()` is never stored anywhere). On line 145, `audioRef[0]?.pause()` always evaluates to `undefined?.pause()` → no-op. The **Stop** button on the daily-briefing listen control never stops the audio; the user can only wait for playback to end. (Compare with the correct `useRef` pattern in `interview.tsx:307-331` SpeakButton.)

## Module: security.tsx
- **[MEDIUM — dead toggle, no persistence]** `src/components/modules/security.tsx:67` — The **MFA toggle** (`Switch`) only updates local `mfaEnabled` state and shows a toast. There is no `/api/security/mfa` route, no `fetch`, no `api()` call. On page reload the toggle resets to `false`. A security-looking control that does nothing.
- **[MEDIUM — dead toggles]** `src/components/modules/security.tsx:88,92` — The **"AI training data"** and **"Analytics tracking"** privacy switches only fire `toast({ title: 'Preference saved' })`. No API call, no persistence. Reset on reload.
- **[LOW — non-interactive]** `src/components/modules/security.tsx:84` — "Profile visibility" is shown as a hardcoded `<Badge>Private</Badge>` with no Switch or selector, despite being listed under "Privacy Controls".

## Module: resume-studio.tsx
- **[LOW — uncleaned timers / UI flicker]** `src/components/modules/resume-studio.tsx:95-97` — Three `setTimeout` calls (5s/15s/30s) advance the `stage` state through `parsing → enriching → optimizing → scoring`. The timeouts are **never cleared** (no `clearTimeout`, no `useEffect` cleanup). If the underlying `/api/desktop/generate-resume-v2` call returns faster than 30s (typical), the stage will be reset to `scoring` *after* `setStage('done')` has already fired, causing the result panel to flicker back to the loading skeleton. If the user navigates away mid-generation, the timeouts fire `setState` on an unmounted component (React warning).

## Module: automation.tsx
- **[LOW — unused import]** `src/components/modules/automation.tsx:7,30` — Imports `useAppStore` and destructures `set: setModule` but never calls `setModule` anywhere in the module. Dead binding only; no UX impact.

## Module: profile.tsx
- **[LOW — derived state during render]** `src/components/modules/profile.tsx:34-38` — The effect that syncs `form` from `profile` has `[profile, user, form]` in deps. Each user keystroke updates `form`, which re-runs the effect, which calls `setForm` again (no-op because `form._id === profile.id` short-circuits). Works but is fragile — a refactor that changes the guard condition could create an infinite loop. Not a current bug.

## Module: plans.tsx
- **[CRITICAL — profile wipe]** `src/components/modules/plans.tsx:48` — After a successful subscription, calls `save({})` with the comment `// refresh profile`. The `save` function in `profile-context.tsx:58-64` issues a `PUT /api/profile` with the empty object as the body. The server route (`src/app/api/profile/route.ts:18-55`) builds `data` with **every field defaulted to `null`** (`body.targetRole ?? null`, etc.) and runs `db.careerProfile.upsert({ update: data })`. This **overwrites the user's entire career profile with nulls** every time they subscribe to or switch plans. The developer intended to call `refresh()` (a GET) but called `save({})` (a destructive PUT).

## Module: aicenter.tsx
- No issues found. All API calls (`/api/aicenter`) resolve. Charts handle empty state.

## Module: agents.tsx
- No issues found. The `setModule` from `useAppStore` is used in the "Open" action button to navigate to recommended modules.

## Module: graph.tsx
- No issues found. Rebuild action and node selection work correctly.

## Module: dashboard.tsx
- No issues found. Quick-action buttons all navigate via `useAppStore.set`.

## Module: ats.tsx
- No issues found. Analyze / Recruiter Sim / vs Competitor buttons all fire valid API calls.

## Module: interview.tsx
- No issues found. Start / submit / end-interview flows all wired. Voice mode (TTS/ASR) correctly uses `useRef` for the audio element (contrast with briefing.tsx bug above).

## Module: coach.tsx
- No issues found. Optimistic send + revert-on-error pattern is correct.

## Module: skills.tsx
- No issues found. Single analysis flow.

## Module: jobs.tsx
- No issues found. Kanban move / company research / contacts / reminders all wired to valid API endpoints.

## Module: market.tsx
- No issues found. Both tabs (Intel + Match) wired to valid endpoints.

## Module: marketplace.tsx
- No issues found. Install / enroll / publish / delete / toggle-publish all wired.

## Module: mentors.tsx
- No issues found. Booking dialog, become-a-mentor form, and tab navigation all functional.

## Module: documents.tsx
- No issues found. Upload (drag-drop + click), parse, apply, delete all wired.

## Module: portfolio.tsx
- No issues found. Create / edit / delete / publish / copy-link all wired. Public-page link opens new tab.

## Module: branding.tsx
- No issues found. Both LinkedIn and Identity tabs POST to `/api/branding` with valid `type` discriminator.

## Module: intelligence.tsx
- No issues found. Generate / regenerate / history-picker all wired.

## Module: analytics.tsx
- No issues found. Three tabs all read from `/api/analytics`.

## Module: admin.tsx
- No issues found. Feature-flag toggle and rollout slider both persist via `PUT /api/flags`. Audit log and AI cost monitoring render from existing endpoints.

## Module: enterprise.tsx
- No issues found. Add-employee dialog and analytics tabs all wired.

## Module: recruit.tsx
- No issues found. Post-job dialog, candidate search, AI recruiter, posting detail, application expand — all wired. Cross-tab preselection (candidate card → AI Recruiter tab) works via `useEffect` sync.

## Module: briefing.tsx (additional)
- See Stop-button bug above. The generate-daily / generate-weekly flows themselves are fine.

## Module: security.tsx (additional)
- See dead-toggle bugs above. The GDPR export (download) and delete-account flows are correctly wired.

---

## Shell: sidebar.tsx
- **[LOW — hardcoded value]** `src/components/careeros/sidebar.tsx:151-154` — The "Credits" footer button always displays `∞` regardless of the user's actual credit balance (which is fetched in `plans.tsx` via `/api/billing`). The button navigates to the Plans module correctly, but the displayed number is cosmetic-only and misleading.
- **[INFO — missing nav entry]** `src/components/careeros/sidebar.tsx:77` — The `automation` module is deliberately omitted from the sidebar (comment says it's reachable via command palette only). Not a bug per se, but the module is effectively hidden from users who don't use ⌘K.

## Shell: topbar.tsx
- **[MEDIUM — dead button]** `src/components/careeros/topbar.tsx:49-52` — The **Bell (Notifications)** button has no `onClick` handler. Renders a notification dot indicator but clicking does nothing. No `/api/notifications` route exists.

## Shell: command-palette.tsx
- No issues found. All 28 module entries + 2 quick actions navigate via `setModule`. ⌘K / Ctrl+K / Escape keyboard shortcuts work. `cmdk` filtering is correctly disabled (`shouldFilter={false}`) in favor of manual filtering.

## Shell: floating-assistant.tsx
- **[MEDIUM — stale state]** `src/components/careeros/floating-assistant.tsx:30-39` — The initial assistant message contains a literal `{module}` placeholder. The `useEffect` on line 37-39 replaces `{module}` with the current `active` module name, but only on the **first render** — after the first replacement, the literal `{module}` is gone from the string, so subsequent module changes do not update the message. The header on line 97 (`Context: {active}`) does update correctly, but the welcome message in the chat body stays stuck on whatever module was active when the assistant was first opened. Additionally, on the very first render frame before the effect runs, the user sees the raw `{module}` placeholder text.

---

## Cross-cutting: profile-context.tsx / /api/profile PUT
- **[CRITICAL — destructive default semantics]** `src/app/api/profile/route.ts:22-44` — The PUT handler builds the `data` object with `body.X ?? null` for every field. When the client sends a partial body (e.g., `{ onboarded: true }` or `{}`), **every unspecified field is explicitly set to null** in the Prisma `update`. This is the root cause of the profile-wipe bugs in `plans.tsx` and `assessment-onboarding.tsx`. The route should either: (a) use `body.X ?? undefined` so unspecified fields are skipped by Prisma, or (b) the client `save()` should merge `patch` with the current profile before PUTting. The `assessment/route.ts` correctly uses `?? undefined` in its own upsert (lines 86-98) — the profile PUT route does not follow the same pattern.

## Cross-cutting: assessment-onboarding.tsx
- **[CRITICAL — profile wipe on close]** `src/components/careeros/assessment-onboarding.tsx:62` — `save({})` after the AI assessment completes wipes the profile that the `/api/assessment` route just saved (see above).
- **[CRITICAL — profile wipe on close]** `src/components/careeros/assessment-onboarding.tsx:79` — `save({ onboarded: true })` in `close()` wipes the profile again when the user clicks "Enter CareerOS". After completing onboarding, the user's profile is empty.

---

## Summary

- **Total issues found:** 15 (across 11 files)
- **Critical (broken core flow):** 5
  - `resume.tsx` stale-closure resets selected resume after every save
  - `plans.tsx` `save({})` wipes career profile after subscribing
  - `assessment-onboarding.tsx:62` `save({})` wipes profile after AI assessment
  - `assessment-onboarding.tsx:79` `save({ onboarded: true })` wipes profile on dialog close
  - `/api/profile/route.ts` PUT defaults unspecified fields to `null` instead of `undefined` (root cause)
- **Medium (dead button / broken control):** 6
  - `network.tsx` Like & Comment buttons have no onClick
  - `briefing.tsx` Stop button never stops audio (useState vs useRef)
  - `security.tsx` MFA toggle doesn't persist
  - `security.tsx` two privacy toggles don't persist
  - `topbar.tsx` Bell/Notifications button has no onClick
  - `floating-assistant.tsx` welcome message stuck on first module (stale state)
- **Low (cosmetic / minor):** 4
  - `cover.tsx` Send button only shows toast
  - `resume-studio.tsx` setTimeout stages not cleaned up (UI flicker)
  - `sidebar.tsx` credits display hardcoded to `∞`
  - `automation.tsx` unused `setModule` import

**Highest-impact fix priority:**
1. Fix `/api/profile/route.ts` PUT to use `?? undefined` (one-line change, unblocks all 4 critical profile-wipe bugs).
2. Replace `save({})` and `save({ onboarded: true })` calls in `plans.tsx` and `assessment-onboarding.tsx` with `refresh()` (which does a GET).
3. Fix `resume.tsx` `load` useCallback to include `active` in deps (or refactor to functional `setActive((prev) => prev ? prev : mapped[0])`).
4. Wire or remove the dead Like/Comment/Bell buttons and dead MFA/privacy toggles.
5. Fix `briefing.tsx` `useState` → `useRef` for the audio element.
