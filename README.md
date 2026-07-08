# CareerOS AI

<div align="center">

**The AI Career Operating System**

Create, optimize, and grow your entire professional career with artificial intelligence.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-16-black.svg)](https://nextjs.org/)
[![Prisma](https://img.shields.io/badge/Prisma-6.0-2D3748.svg)](https://www.prisma.io/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

</div>

---

## Overview

CareerOS AI is a production-grade SaaS platform that combines an AI resume engine, ATS intelligence, interview simulator, career coach, job tracker, knowledge graph, autonomous AI agents, recruitment platform, mentor marketplace, and more — unified by a single career profile that personalizes every AI interaction.

### Key Features

- **AI Resume Engine** — 11 templates, 6 career modes, live preview, AI scoring, version history
- **ATS Intelligence 2.0** — resume vs JD analysis, recruiter simulation, competitor comparison
- **AI Interview Pro** — text + voice interviews with TTS/ASR, per-answer evaluation
- **AI Career Coach** — 1:1 conversational coaching with career memory
- **Career Knowledge Graph** — visual model of your professional identity
- **Autonomous AI Agents** — 5 agents (career/resume/job/interview/learning) working 24/7
- **Automation Engine** — cross-module workflows (e.g., new job → research → resume → cover letter → reminder)
- **Job Market Intelligence** — real-time web-search-powered salary, skill demand, and matching
- **Recruitment Platform** — employer-side job posting, candidate search, AI recruiter
- **Mentor Marketplace** — book 1:1 sessions with vetted mentors
- **Professional Network** — feed, posts, follow, communities
- **Document AI** — VLM-powered OCR for resumes and certificates
- **Enterprise Edition** — multi-tenant org management, employee development, internal mobility
- **Billing & Credits** — 5 plans, AI credit economy, Stripe-ready
- **Security & GDPR** — MFA, data export, account deletion, audit trails

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript 5 (strict) |
| Styling | Tailwind CSS 4 + shadcn/ui |
| Database | Prisma ORM + SQLite (prod: PostgreSQL) |
| AI | z-ai-web-dev-sdk (LLM, VLM, TTS, ASR, web search) |
| State | Zustand + React Context |
| Charts | Recharts |
| Animation | Framer Motion |
| Deployment | Docker + docker-compose |

## Quick Start

```bash
# Clone
git clone https://github.com/azamntheer5-lang/careeros-ai.git
cd careeros-ai

# Install dependencies
bun install

# Set up database
cp .env.production.example .env
bun run db:push

# Start dev server
bun run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Documentation

- [Installation Guide](docs/INSTALLATION.md)
- [Development Guide](docs/DEVELOPMENT.md)
- [Production Deployment](docs/DEPLOYMENT.md)
- [Environment Variables](docs/ENVIRONMENT.md)
- [Architecture Overview](docs/ARCHITECTURE.md)
- [API Documentation](docs/API.md)
- [Disaster Recovery](docs/DISASTER_RECOVERY.md)
- [Audit Report](docs/AUDIT_REPORT.md)

## Scripts

| Command | Description |
|---------|-------------|
| `bun run dev` | Start development server (port 3000) |
| `bun run build` | Build for production |
| `bun run start` | Start production server |
| `bun run lint` | Run ESLint |
| `bun run db:push` | Push Prisma schema to database |
| `bun run db:generate` | Generate Prisma client |
| `bun run db:migrate` | Run database migrations |

## Project Structure

```
careeros-ai/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/                # 72 API route handlers
│   │   ├── p/[slug]/           # Public portfolio pages
│   │   ├── layout.tsx          # Root layout + providers
│   │   └── page.tsx            # Main SPA page (28 modules)
│   ├── components/
│   │   ├── careeros/           # Shared components (sidebar, topbar, etc.)
│   │   ├── modules/            # 28 feature modules
│   │   └── ui/                 # shadcn/ui components
│   ├── hooks/                  # Custom React hooks
│   └── lib/                    # Core libraries (AI, billing, graph, agents)
├── prisma/                     # Prisma schema (43 models)
├── public/                     # Static assets
├── docs/                       # Documentation
├── tests/                      # Integration + load tests
├── .github/workflows/          # CI/CD pipeline
├── Dockerfile                  # Production multi-stage build
├── docker-compose.yml          # App + Redis + worker
└── package.json
```

## License

MIT — see [LICENSE](LICENSE)

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md)

## Security

See [SECURITY.md](SECURITY.md) · Report vulnerabilities to security@careeros.ai
