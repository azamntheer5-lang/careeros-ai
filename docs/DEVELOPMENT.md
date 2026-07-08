# Development Guide

## Development Environment

### Start Dev Server

```bash
bun run dev
```

The server runs on `http://localhost:3000` with Turbopack for fast hot-module replacement.

### Key Commands

| Command | Description |
|---------|-------------|
| `bun run dev` | Start dev server |
| `bun run lint` | Run ESLint |
| `bunx tsc --noEmit` | TypeScript type check |
| `bun run db:push` | Sync Prisma schema to DB |
| `bun run db:generate` | Regenerate Prisma client |
| `bun run db:reset` | Reset database (destroys all data) |

## Project Architecture

### Adding a New Module

1. **Create the module component:**
   ```
   src/components/modules/my-module.tsx
   ```

2. **Add to store:**
   ```typescript
   // src/lib/store.ts
   export type ModuleId = ... | 'myModule'
   ```

3. **Add i18n keys** (both EN and AR):
   ```typescript
   // src/lib/i18n.ts
   myModule: 'My Module',
   myModuleTitle: 'My Module',
   myModuleSub: 'Description here.',
   ```

4. **Add to sidebar:**
   ```typescript
   // src/components/careeros/sidebar.tsx
   { id: 'myModule', icon: MyIcon, label: 'myModule' },
   ```

5. **Add to command palette:**
   ```typescript
   // src/components/careeros/command-palette.tsx
   { id: 'myModule', label: t('myModule'), hint: '...', icon: MyIcon, keywords: [...] },
   ```

6. **Render in page:**
   ```typescript
   // src/app/page.tsx
   {active === 'myModule' && <MyModule />}
   ```

### Adding an API Route

1. Create `src/app/api/my-endpoint/route.ts`:
   ```typescript
   import { NextResponse } from 'next/server'
   import { getCurrentUser, err } from '@/lib/server'
   import { db } from '@/lib/db'

   export async function GET() {
     try {
       const user = await getCurrentUser()
       // ... logic
       return NextResponse.json({ data })
     } catch (e) { return err(e) }
   }
   ```

2. Always use `getCurrentUser()` for authentication.
3. Use `err(e)` for error handling.
4. For AI features, use `run()` or `runWithCredits()` from `@/lib/ai`.

### Adding an AI Feature

1. **Add a prompt** to `src/lib/prompts.ts`:
   ```typescript
   my_feature: {
     key: 'my_feature', version: 1, model: 'balanced',
     system: 'You are...',
   },
   ```

2. **Add credit cost** to `src/lib/billing.ts`:
   ```typescript
   my_feature: 3,
   ```

3. **Call via the gateway:**
   ```typescript
   import { runWithCredits } from '@/lib/ai'
   
   const { data, balance, cost } = await runWithCredits(
     'my_feature', userId, userName,
     [{ role: 'user', content: '...' }],
     { json: true }
   )
   ```

### Adding a Database Model

1. Edit `prisma/schema.prisma`:
   ```prisma
   model MyModel {
     id        String   @id @default(cuid())
     userId    String
     name      String
     createdAt DateTime @default(now())
     user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
     @@index([userId])
   }
   ```

2. Add relation to User model.

3. Push to database:
   ```bash
   bun run db:push
   ```

## Code Style

### TypeScript
- Strict mode
- No `any` without justification
- Use `import type` for type-only imports

### React Components
- Always `'use client'` for interactive components
- Use shadcn/ui components — never build from scratch
- Framer Motion for animations

### Styling
- Tailwind CSS classes only
- Emerald accent system: `bg-brand`, `text-brand`, `bg-brand-soft`
- Responsive: mobile-first

### i18n
- All UI text via `t('key')`
- Add keys to BOTH `en` and `ar` dictionaries
- Use unique, context-specific key names to avoid collisions

## Testing

### Manual Testing
Use agent-browser or a browser to verify:
1. Module renders without console errors
2. API endpoints return 200
3. AI features produce expected output
4. Responsive layout works at 390px / 768px / 1440px

### Integration Tests
```bash
bun test tests/integration/
```

### Load Tests
```bash
k6 run tests/load/loadtest.js
```

## Debugging

### Dev Server Logs
```bash
tail -f dev.log
```

### Prisma Query Logging
The Prisma client logs all queries in development mode (configured in `src/lib/db.ts`).

### Browser Console
Check for React hydration warnings and runtime errors.

## Common Issues

### "Module not found" after adding a model
Run `bunx prisma generate` to regenerate the client.

### i18n key collision
Ensure key names are unique. Use context-specific names like `skillsLabel` instead of reusing `skills`.

### Set-state-in-effect lint error
Don't call `setState` synchronously in a `useEffect`. Use `.then()`:
```typescript
// ❌ Bad
useEffect(() => { load() }, [load])

// ✅ Good
useEffect(() => { api('/endpoint').then(setData) }, [])
```
