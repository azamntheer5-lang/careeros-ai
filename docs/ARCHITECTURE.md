# CareerOS AI — Architecture Documentation

## System Overview

CareerOS AI is a Next.js 16 monolithic SaaS application with an AI orchestration layer, a career knowledge graph, autonomous agents, and a multi-tenant SaaS billing system.

## Technology Stack
- **Framework:** Next.js 16 (App Router, Turbopack)
- **Language:** TypeScript 5 (strict)
- **Styling:** Tailwind CSS 4 + shadcn/ui (New York)
- **Database:** Prisma ORM + SQLite (prod: PostgreSQL)
- **AI:** z-ai-web-dev-sdk (LLM, VLM, TTS, ASR, web search)
- **State:** Zustand (client) + React Context (profile)
- **Charts:** Recharts
- **Animations:** Framer Motion
- **Deployment:** Docker + docker-compose (app + Redis + worker)

## Architecture Layers

### 1. Presentation Layer (28 modules)
`src/components/modules/*.tsx` — Each module is a self-contained 'use client' component with tabs, forms, and data visualization.

### 2. API Layer (72 routes)
`src/app/api/**/route.ts` — Next.js Route Handlers. All use `getCurrentUser()` for auth (except 5 public endpoints).

### 3. AI Orchestration Layer (`src/lib/ai.ts`)
- **Prompt Registry** (`src/lib/prompts.ts`): 21 versioned prompts with model tiers (fast/balanced/quality).
- **Career Memory** (`src/lib/ai-memory.ts`): Injects the user's career profile into every AI call.
- **Credit Economy** (`src/lib/billing.ts` + `src/lib/credits.ts`): Per-feature credit costs, smart model selection, credit ledger.
- **Gateway functions:** `run()` (non-gated), `runWithCredits()` (credit-gated), `complete()`, `completeJson()`.

### 4. Agent Layer (`src/lib/agents.ts`)
5 autonomous agents (career/resume/job/interview/learning) sharing one career memory. Each analyzes the user's complete state and returns structured actions + insights.

### 5. Knowledge Graph (`src/lib/graph.ts`)
Builds a node/edge model of the user's professional identity from all their data (resumes, jobs, skills, goals, etc.).

### 6. Automation Layer (`src/lib/automation.ts`)
4 declarative workflows chaining cross-module actions (e.g., new job → research → resume → cover letter → interview prep → reminder).

### 7. Data Layer (43 models)
`prisma/schema.prisma` — 43 Prisma models with 59 indexes. Key domains:
- **User:** User, CareerProfile, Subscription, Invoice, CreditTransaction, Assessment, Achievement
- **Career:** Resume, ResumeVersion, CoverLetter, Interview, CoachSession, SkillProfile, CareerPlan
- **Network:** NetworkProfile, Connection, Post, Mentor, Booking
- **Recruitment:** JobPosting, CandidateApplication, Company, Contact, Reminder
- **Enterprise:** Tenant, Department, Employee
- **AI:** AgentRun, GraphNode, GraphEdge, WorkflowRun, AiUsage, CareerBriefing, JobMarketInsight
- **Marketplace:** Template, CreatorContent, Document
- **System:** AuditLog, FeatureFlag, Notification, BrandingAnalysis, Portfolio

## Request Flow
1. Client (`api()` helper) → Next.js Route Handler
2. Route Handler → `getCurrentUser()` (auth) → `db` (Prisma) → `run()`/`runWithCredits()` (AI)
3. AI Gateway → prompt registry + memory → ZAI SDK → response → usage tracking
4. Response → JSON → client

## Multi-Tenancy
- `User.tenantId` → `Tenant` (company/university)
- Enterprise module manages tenants, departments, employees
- Data isolation via tenantId filtering on all enterprise queries

## Security Model
- Demo auth: `getCurrentUser()` returns the first user (single-tenant demo)
- Production: replace with NextAuth.js (installed, not configured)
- All API routes auth-gated except: bootstrap, public portfolio, TTS/ASR (stateless)
- GDPR: data export (`/api/security/export`) + deletion (`/api/security/delete`)
- Audit logging on all sensitive actions
