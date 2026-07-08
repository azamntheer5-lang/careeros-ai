# Dead Code Verification

## 1. Removed Functions (5)

Every function verified to have **0 references** in `src/` after removal.

| Function | Removed From | References After Removal |
|----------|-------------|------------------------|
| `completeStream()` | `src/lib/ai.ts` | **0** |
| `runText()` | `src/lib/ai.ts` | **0** |
| `composeMessages()` | `src/lib/ai-memory.ts` | **0** |
| `getPrompt()` | `src/lib/prompts.ts` | **0** |
| `ai.generateResume()` | `src/lib/ai.ts` | **0** |

### Verification Command
```bash
$ for fn in completeStream runText composeMessages getPrompt generateResume; do
    grep -r "\b$fn\b" src/ | wc -l
  done
0
0
0
0
0
```

### Git Diff (what was removed)

**From `src/lib/ai.ts`:**
```diff
-/**
- * Streaming completion for chat-style UX. Calls onToken for every chunk.
- */
-export async function completeStream(
-  messages: ChatMessage[],
-  onToken: (delta: string) => void
-): Promise<string> {
-  const zai = await getZai()
-  ...  (33 lines removed)
-}

-  /** Generate an entire resume draft from raw user context. */
-  async generateResume(context: string) {
-    return completeJson<any>([
-      ...  (14 lines removed)
-  },

-/** Tracked wrapper that returns raw text (for chat-style modules). */
-export async function runText(promptKey: string, userId: string, userName: string, caller: ChatMessage[]) {
-  return run<string>(promptKey, userId, userName, caller, { json: false })
-}
```

**From `src/lib/ai-memory.ts`:**
```diff
-/** Compose final messages: registry system + memory + caller messages. */
-export function composeMessages(
-  promptKey: string,
-  memory: CareerProfileMemory | null,
-  userName: string,
-  caller: ChatMessage[]
-): ChatMessage[] {
-  const def = getPromptDef(promptKey)
-  ...  (10 lines removed)
-}
```

**From `src/lib/prompts.ts`:**
```diff
-export function getPrompt(key: string): PromptDef {
-  return PROMPTS[key] ?? { key, version: 1, model: 'balanced', system: 'You are a helpful assistant.' }
-}
```

**Total: 77 lines of dead code removed.**

---

## 2. Removed Packages (14)

Every package verified to have **0 references in source code** (`src/`).

| Package | References in src/ | In package.json? | In node_modules? |
|---------|-------------------|------------------|------------------|
| `@dnd-kit/core` | **0** | Removed | Gone |
| `@dnd-kit/sortable` | **0** | Removed | Gone |
| `@dnd-kit/utilities` | **0** | Removed | Gone |
| `@mdxeditor/editor` | **0** | Removed | Gone |
| `react-syntax-highlighter` | **0** | Removed | Gone |
| `next-auth` | **0** | Removed | Gone |
| `next-intl` | **0** | Removed | Gone |
| `uuid` | **0** | Removed | Gone |
| `@reactuses/core` | **0** | Removed | Gone |
| `@tanstack/react-query` | **0** | Removed | Gone |
| `@tanstack/react-table` | **0** | Removed | Gone |
| `@hookform/resolvers` | **0** | Removed | Gone |
| `date-fns` | **0** (direct) | Removed | Transitive only |
| `zod` | **0** (direct) | Removed | Transitive only |

### Note on `date-fns` and `zod`
These still exist in `node_modules` as transitive dependencies of other packages. Our code has **zero imports**:
```bash
$ rg "from 'date-fns'" src/ → 0 matches
$ rg "from 'zod'" src/ → 0 matches
```

### Verification Command
```bash
$ rg -l "$pkg" --glob '!node_modules/**' --glob '!.next/**' --glob '!bun.lock' .
```
The only matches are in `docs/` files (audit reports mentioning the package names). Zero in `src/`.

### Git Diff (package.json)

```diff
-    "@dnd-kit/core": "^6.3.1",
-    "@dnd-kit/sortable": "^10.0.0",
-    "@dnd-kit/utilities": "^3.2.2",
-    "@hookform/resolvers": "^5.1.1",
-    "@mdxeditor/editor": "^3.39.1",
-    "@reactuses/core": "^6.0.5",
-    "@tanstack/react-query": "^5.82.0",
-    "@tanstack/react-table": "^8.21.3",
-    "date-fns": "^4.1.0",
-    "next-auth": "^4.24.11",
-    "next-intl": "^4.3.4",
-    "react-syntax-highlighter": "^15.6.1",
-    "uuid": "^11.1.0",
-    "zod": "^4.0.2",
```

### Package Count
```
Before: ~612 packages
After:  598 packages (clean install)
```

---

## 3. Build Proves No Broken Imports

After removing all 14 packages and running `rm -rf node_modules && bun install`:
```
✓ Compiled successfully in 24.2s
EXIT: 0
```

No broken imports. No missing modules. Build succeeds.
