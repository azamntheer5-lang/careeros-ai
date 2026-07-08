# Installation Guide

## Prerequisites

- **Node.js** 20+ (or Bun 1.1+)
- **npm** / **bun** package manager
- **Git**

## Step 1: Clone the Repository

```bash
git clone https://github.com/azamntheer5-lang/careeros-ai.git
cd careeros-ai
```

## Step 2: Install Dependencies

Using Bun (recommended):
```bash
bun install
```

Using npm:
```bash
npm install --legacy-peer-deps
```

## Step 3: Environment Setup

```bash
cp .env.production.example .env
```

Edit `.env` and set:
```
DATABASE_URL=file:/home/z/my-project/db/custom.db
NEXTAUTH_SECRET=your-secret-here
```

Generate a secure NEXTAUTH_SECRET:
```bash
openssl rand -base64 32
```

## Step 4: Database Setup

```bash
# Generate Prisma client
bun run db:generate

# Push schema to database (creates tables)
bun run db:push
```

This creates a SQLite database at `db/custom.db` with all 43 models and 59 indexes.

## Step 5: Start Development Server

```bash
bun run dev
```

Open [http://localhost:3000](http://localhost:3000)

The first visit will:
1. Create a demo user (if none exists)
2. Seed a starter resume and sample jobs
3. Auto-trigger the onboarding flow

## Step 6: Verify Installation

- Dashboard should load with stats
- All 28 modules accessible from the sidebar
- Command palette (⌘K) works
- No console errors

## Troubleshooting

### Port 3000 already in use
```bash
# Kill existing process
lsof -ti:3000 | xargs kill -9
# Or use a different port
bun run next dev -p 3001
```

### Prisma client not generated
```bash
bunx prisma generate
bunx prisma db push
```

### Database locked
```bash
rm db/custom.db
bun run db:push
```

### Module not found errors
```bash
rm -rf node_modules
bun install
```
