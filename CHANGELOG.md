# Changelog

All notable changes to CareerOS AI are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] — 2026-07-08

### Added — Initial Production Release

#### Core Platform
- Next.js 16 App Router SPA with 28 modules
- Multi-tenant SaaS architecture (individuals, teams, companies, universities)
- Dark/light theme + English (LTR) / Arabic (RTL) support
- Command palette (⌘K) with fuzzy search across all modules
- Onboarding flow with career assessment
- Floating AI assistant (context-aware, available on every module)

#### AI Orchestration Layer
- Versioned prompt registry (25 prompts) with model-tier routing (fast/balanced/quality)
- Career profile memory system — injects user context into every AI call
- AI credit economy with per-feature costs, smart model selection, and cost optimization
- `runWithCredits()` credit-gated execution with `InsufficientCreditsError`
- Usage tracking with tokens, cost, latency, and success rate

#### AI Agent Ecosystem
- 5 autonomous agents (Career, Resume, Job, Interview, Learning) sharing one career memory
- Agent run history with structured actions + insights
- Each agent analyzes the user's complete state and recommends prioritized actions

#### Career Knowledge Graph
- Node/edge model of professional identity (10 node types, 8 relationship types)
- Auto-builds from resumes, jobs, skills, goals, interviews, achievements
- Interactive radial SVG visualization with click-to-explore connections

#### Automation Engine
- 4 declarative workflows (new job application, new skill, profile update, weekly review)
- Cross-module action chaining (e.g., research → resume → cover letter → interview → reminder)
- Step-by-step execution tracking with status and results

#### Resume Engine
- 11 templates (modern, executive, technical, creative, ATS, minimal, developer, designer, academic, medical, government)
- 6 career modes, 6 accent colors, live preview
- AI bullet enhancement (4 modes: rewrite, achievement, impact, keywords)
- AI quality scoring (5 dimensions + quick wins)
- Version history with checkpoints
- AI resume generation from free-form context

#### ATS Intelligence 2.0
- Resume vs job description analysis (score, grade, keyword match, recommendations)
- Recruiter 6-second simulation (verdict, confidence, red flags)
- Competitor comparison (dual score rings, hidden keywords, edge-by-edge analysis)

#### Cover Letter Engine
- 5 letter types (cover, follow-up, thank-you, networking, referral)
- 6 tone options, profile-aware generation

#### Interview Pro
- 4 interview types (technical, HR, behavioral, industry)
- Text + voice modes
- Voice: TTS speaks questions, ASR transcribes answers
- Per-answer AI evaluation (score, strengths, improvements, model answer)
- Final summary with overall score

#### Career Coach
- 6 focus areas (career planning, promotion, salary, skills, industry, pivot)
- Multi-session history, suggestion chips, markdown rendering

#### Career Intelligence
- Unified roadmap: readiness score, phases, salary strategy, promotion plan, market insights
- Profile-aware generation

#### Skill Intelligence
- Skill gap analysis with priority levels
- Learning roadmap timeline with courses and certifications
- Estimated time-to-ready

#### Job Tracker CRM
- 7-column kanban pipeline
- Company research via web search
- Contacts (recruiters, hiring managers, referrals)
- Reminders with due dates and overdue badges

#### Portfolio Builder
- 5 themes, 6 accents, custom sections
- Public portfolio at `/p/[slug]` with QR code
- View tracking, publish toggle

#### Branding & LinkedIn
- LinkedIn optimizer (headline, about, content ideas, keyword gaps)
- Brand identity audit (narrative, presence, differentiation scores)

#### Document AI
- VLM-powered OCR for resumes and certificates
- Auto-builds career profile from uploaded documents
- Apply parsed data to create new resumes

#### Professional Network
- Feed with posts, achievements, questions, opportunities
- Follow/unfollow, profile pages, discover professionals

#### Mentor Marketplace
- 6 seeded vetted mentors with ratings
- Booking system (sessions, resume reviews, mock interviews)
- Become-a-mentor flow with expertise/profile management

#### Recruitment Platform
- Employer job postings with applications
- Candidate search with AI matching
- AI Recruiter Assistant (match score, verdict, risks, interview focus)

#### Marketplace
- Resume/portfolio/cover-letter templates + expert content
- Creator dashboard with downloads/ratings
- Install creates resume/portfolio/letter automatically

#### Job Market Intelligence
- Real-time web-search-powered salary, skill demand, industry trends
- AI job matching with probability of success

#### Enterprise Edition
- Multi-tenant org management (companies, universities)
- Departments, employees, growth scores
- Skill analytics, internal mobility candidates

#### Billing & Credits
- 5 plans (Free, Starter $19, Professional $49, Career Pro $99, Enterprise)
- Monthly/annual billing, Stripe-ready subscriptions
- AI credit economy with 4 packages
- Invoice generation, billing history

#### AI Career Briefing
- Daily and weekly AI-generated briefings
- Pulls jobs, reminders, interviews, agent runs as context
- TTS "Listen" button

#### Advanced Analytics
- User career analytics (ATS trend, applications, skill growth, achievements)
- Business analytics (revenue, MRR, plan distribution, growth funnel)
- AI performance analytics (latency, cost, model usage, top features)

#### Security & Privacy
- MFA toggle, SSO-ready
- GDPR data export (full JSON download)
- GDPR account deletion (cascades 43 models)
- Privacy controls, audit trail viewer
- Audit logging on all sensitive actions

#### Admin
- Platform KPIs, revenue charts, plan distribution
- Audit log, feature flags with rollout %, AI cost monitoring
- System health dashboard

### Technical
- 43 Prisma models with 59 database indexes
- 72 API route handlers
- 28 client modules
- Zero TypeScript errors, zero ESLint errors
- Docker multi-stage production build
- CI/CD pipeline (GitHub Actions)
- Integration tests + k6 load testing configuration
- Full documentation suite (architecture, API, disaster recovery, audit report)
