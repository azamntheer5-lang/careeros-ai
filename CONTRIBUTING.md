# Contributing to CareerOS AI

Thank you for your interest in contributing to CareerOS AI! This document outlines the process for contributing to the project.

## Getting Started

1. **Fork** the repository
2. **Clone** your fork: `git clone https://github.com/YOUR_USERNAME/careeros-ai.git`
3. **Install** dependencies: `bun install`
4. **Set up** the database: `cp .env.production.example .env && bun run db:push`
5. **Start** the dev server: `bun run dev`

## Development Workflow

### 1. Create a Branch

```bash
git checkout -b feat/your-feature-name
# or
git checkout -b fix/your-bug-fix
```

Use conventional branch prefixes:
- `feat/` — new features
- `fix/` — bug fixes
- `docs/` — documentation changes
- `refactor/` — code refactoring
- `test/` — test additions

### 2. Make Changes

- Follow the existing code style (TypeScript strict, Tailwind, shadcn/ui)
- Keep components modular and self-contained
- Add translations for any new UI text (both `en` and `ar` in `src/lib/i18n.ts`)
- Ensure all AI calls go through the orchestrated gateway (`run()` or `runWithCredits()`)

### 3. Verify

Before submitting, ensure all checks pass:

```bash
# TypeScript
bunx tsc --noEmit

# ESLint
bun run lint

# Manual testing
bun run dev
```

**Requirements:**
- ✅ Zero TypeScript errors
- ✅ Zero ESLint errors
- ✅ Zero console errors in browser
- ✅ No TODO/FIXME comments in production code

### 4. Commit

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add resume version comparison view
fix: resolve graph node click selection bug
docs: update API documentation for billing endpoints
refactor: extract score ring into shared component
```

### 5. Pull Request

- Open a PR against `main`
- Describe what changed and why
- Link any related issues
- Ensure CI passes

## Code Style

### TypeScript
- Strict mode enabled
- No `any` without justification
- Prefer interfaces over type aliases for objects
- Use `const` by default, `let` only when reassignment is needed

### React
- Functional components only
- `'use client'` directive for interactive components
- Use shadcn/ui components — don't build from scratch
- Framer Motion for animations

### API Routes
- Always use `getCurrentUser()` for authentication
- Return `NextResponse.json()` or `err(e)` for errors
- Track AI usage via `trackUsage()` or `runWithCredits()`

### Styling
- Tailwind CSS classes only (no inline styles except dynamic values)
- Emerald accent system (`bg-brand`, `text-brand`, `bg-brand-soft`)
- Responsive: mobile-first with `sm:`, `md:`, `lg:` breakpoints

## Architecture Guidelines

- **AI calls:** Always go through `src/lib/ai.ts` (`run` or `runWithCredits`)
- **Career memory:** Automatically injected — don't manually pass profile context
- **Credits:** Use `runWithCredits()` for user-facing AI features, `run()` for internal
- **Database:** Always use Prisma — no raw SQL
- **i18n:** All UI text via `t('key')` — add keys to both EN and AR dictionaries

## Reporting Issues

- Use GitHub Issues
- Include: description, steps to reproduce, expected vs actual, screenshots
- For security issues, see [SECURITY.md](SECURITY.md)

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
