# P3-6c — Document AI module

**Agent:** full-stack-developer (Document AI)
**Task:** Build Document AI module + API (VLM OCR parsing + profile auto-build).

## What was built

### API routes
1. **`src/app/api/documents/route.ts`** — `GET` lists the user's documents (excludes the heavy base64 `data` field for payload size). `POST` accepts `{ filename, mimeType, base64, type }` (type ∈ resume|certificate|portfolio|other), persists the Document with `status='pending'`, runs the ZAI `chat.completions.createVision` VLM with the appropriate prompt (resume vs certificate), parses the JSON response (with code-fence stripping + regex fallback), and updates the row with the parsed JSON + `status='parsed'`. On VLM failure the row is marked `status='error'` and the response includes the error message but still returns 200 so the UI can show feedback.

2. **`src/app/api/documents/[id]/route.ts`** — `GET` returns a single Document (including raw base64 for download). `DELETE` removes it (ownership-checked).

3. **`src/app/api/documents/[id]/apply/route.ts`** — `POST` takes a parsed resume Document and:
   - Merges the extracted `skills[]` into the user's `CareerProfile.strengths` (deduped, capped at 24)
   - Sets `targetRole` from the first experience title (only if not already set)
   - Backfills `brandStatement`, `location`, `linkedinUrl`, `portfolioUrl` from the parsed contact (only empty fields)
   - Creates a new `Resume` record in the Resume Engine with `data=JSON.stringify(parsed)` so the user can keep editing it
   - Writes an `auditLog` entry
   - Returns `{ resume, profile, applied: { skillsAdded, targetRole } }`

### UI module
4. **`src/components/modules/documents.tsx`** — `'use client'` module with:
   - `ModuleHeader` using `t('documentsTitle')` / `t('documentsSub')` and a `FileScan` lucide icon
   - Drag-and-drop upload zone (styled `Card` with dashed border, hidden `<input type="file" accept="image/*,application/pdf">`). Auto-detects type from filename (resume/cv → resume, cert/certificate → certificate, etc.)
   - On file selected → `FileReader.readAsDataURL` → strip data-URL prefix → POST to `/api/documents` with detected type → show parsing spinner → toast on success/failure
   - Document list with cards showing filename, type badge, status badge (pending/parsed/error with icons), and an auto-generated summary ("5 experiences · 12 skills detected"). Each card has a hover-revealed delete button.
   - Empty state with a glowing FileScan illustration and "Upload your first document" message
   - Click a parsed resume → right-side preview panel shows: identity card (name + contact rows with icons), professional summary, stat tiles (experience/education/skills counts), experience preview (first 3 with bullets), skill chips, certifications list, projects list, and a prominent emerald **Apply to profile** button → POSTs to `/api/documents/[id]/apply` → success toast + `useProfile().refresh()` to update the rest of the app
   - For certificate documents, a separate compact preview shows name/issuer/date/holder/credentialId
   - Premium styling: emerald accent, `bg-brand-soft` tints, framer-motion enter/exit transitions, sticky preview panel on lg+, AnimatePresence for panel swaps, custom scrollbar via `ScrollArea` (max-h-60vh)

## End-to-end verification performed

Generated a synthetic resume PNG with PIL (Jane Doe, Senior Engineer, 2 experiences, 7 skills, education) and exercised the full pipeline:

| Step | Endpoint | Result |
|---|---|---|
| Upload + VLM parse | `POST /api/documents` | HTTP 200 in 5.66s — VLM correctly extracted contact, summary, 2 experiences with bullets, education, and all 7 skills |
| List | `GET /api/documents` | HTTP 200 — returns 1 doc, `hasData=false` (heavy field excluded) |
| Apply | `POST /api/documents/{id}/apply` | HTTP 200 — `skillsAdded: 7`, new Resume "Senior Engineer — imported" created in Resume Engine |
| Delete | `DELETE /api/documents/{id}` | HTTP 200 `{ok:true}` — list returns to 0 |

`bun run lint` passes for all four files. No existing files were modified.

## Decisions / notes
- **VLM is backend-only** — the route imports `ZAI` directly (per skill reference) and runs `createVision` with `thinking: { type: 'disabled' }`. The base64 payload is reconstructed as `data:${mimeType};base64,${b64}` so PDFs (`data:application/pdf;base64,...`) and images both work.
- **Ownership checks** — every `[id]` route verifies `doc.userId === user.id` and returns 404 otherwise (does not leak existence).
- **List payload optimization** — `GET /api/documents` uses Prisma `select` to omit the `data` (base64) field; the single `GET /api/documents/[id]` includes it for download.
- **Idempotent apply** — apply only backfills empty profile fields, so re-running it on the same document won't clobber user edits.
- **Module wiring** — per task constraints I did NOT modify `page.tsx`/`store.ts`/`i18n.ts`/`sidebar.tsx`; the `documents` ModuleId and `documentsTitle`/`documentsSub` i18n keys already exist, so a future agent can wire `<DocumentsModule />` into `page.tsx` with one line.

## Infra note
The dev server's Prisma client didn't initially have the `Document` model in the running process (singleton cached from before the schema addition). Running `bun run db:push` regenerated the client, then I restarted the dev server to pick up the new client. The system supervisor's `bun run dev` was restarted cleanly and the new endpoints now respond correctly.
