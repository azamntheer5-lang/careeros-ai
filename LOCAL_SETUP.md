# CareerOS AI — Local Setup Guide

## Quick Start (3 commands)

```bash
bun install
bun run setup
bun run dev
```

Then open: **http://localhost:3000**

That's it. The app is fully usable offline.

---

## Using npm instead of bun

```bash
npm install
npm run setup
npm run dev
```

---

## What `bun run setup` does

The setup script (`scripts/setup.mjs`) automatically:

1. **Creates the `db/` directory** if it doesn't exist
2. **Generates the Prisma client** (`prisma generate`)
3. **Creates the SQLite database** (`prisma db push`) — creates `db/custom.db` with all 43 tables
4. **Verifies the setup** — checks tables exist, reports status

When you first visit `http://localhost:3000`, the `/api/bootstrap` endpoint automatically:
- Creates a demo user (Alex Rivera)
- Seeds a starter resume
- Seeds sample job applications

---

## Requirements

- **Node.js** 20+ (or Bun 1.1+)
- **npm** or **bun** package manager
- No external services needed (no PostgreSQL, no Redis, no Stripe)

---

## Environment Variables

The `.env` file is pre-configured for local use:

```env
DATABASE_URL=file:/home/z/my-project/db/custom.db
NEXTAUTH_SECRET=local-dev-secret-not-for-production
NEXTAUTH_URL=http://localhost:3000
```

No changes needed — these work out of the box.

---

## Available Scripts

| Command | Description |
|---------|-------------|
| `bun run setup` | One-time setup: create DB + generate client |
| `bun run dev` | Start development server (port 3000) |
| `bun run build` | Build for production |
| `bun run start` | Start production server |
| `bun run lint` | Run ESLint |
| `bun run db:push` | Push schema changes to database |
| `bun run db:generate` | Regenerate Prisma client |
| `bun run db:reset` | Reset database (destroys all data) |

---

## Troubleshooting

### "Cannot find module @prisma/client"
```bash
bun run setup
```

### "Database is locked"
```bash
rm db/custom.db
bun run setup
```

### "Port 3000 already in use"
```bash
lsof -ti:3000 | xargs kill -9
bun run dev
```

### Reset everything and start fresh
```bash
rm -rf db/custom.db .next
bun run setup
bun run dev
```

---

## What You Get

After setup, the app has:

- **28 modules**: Dashboard, Resume Engine, ATS, Cover Letters, Portfolio, Branding, Interview Pro, Career Coach, Career Intelligence, Skills, Job Tracker, Job Market, Network, Mentors, Recruitment, Marketplace, Briefing, AI Center, Analytics, Enterprise, Security, Plans, Admin, AI Agents, Career Graph, Automation, Documents, Profile
- **76 API endpoints** — all working locally
- **AI features** — powered by z-ai-web-dev-sdk (works offline, no API key needed)
- **Dark/light theme** + English/Arabic RTL support
- **Demo data** — pre-seeded resume and jobs

No cloud services. No external dependencies. Fully offline.
