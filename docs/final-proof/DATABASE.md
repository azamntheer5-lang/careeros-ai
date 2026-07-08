# Database Verification

## Schema Overview

| Metric | Count |
|--------|-------|
| Prisma Models | **43** |
| Indexes (@@index) | **71** |
| Unique constraints (@unique, auto-indexed) | **12** |
| Cascade deletes | **41** |
| Relations (@relation) | **53** |

## All 43 Models

```
User, CareerProfile, Resume, ResumeVersion, CoverLetter, Interview, CoachSession,
Job, SkillProfile, Portfolio, BrandingAnalysis, CareerPlan, Company, Contact,
Reminder, AiUsage, Notification, AuditLog, FeatureFlag, AgentRun, GraphNode,
GraphEdge, WorkflowRun, NetworkProfile, Connection, Post, Mentor, Booking,
JobMarketInsight, Tenant, Department, Employee, Document, Subscription, Invoice,
CreditTransaction, Assessment, CareerBriefing, JobPosting, CandidateApplication,
Template, CreatorContent, Achievement
```

## Index Analysis

### Duplicate Indexes
```
Result: No duplicate indexes found
```
Verified by parsing all `@@index([...])` declarations and checking for duplicates within each model.

### All SELECTs Use LIMIT
```
Queries without LIMIT: only "SELECT 1" (Prisma connection check)
```
All actual data queries use `LIMIT` — no full table scans.

### Index Coverage
- 32 models have `userId` field
- All 32 have either `@@index([userId])` or `@unique` on userId
- All `[id]` route parameters query by primary key (indexed)

## Query Analysis (from dev.log)

### Query Count by Table

| Table | Queries | Observation |
|-------|---------|-------------|
| `User` | 177 | ⚠️ High — `getCurrentUser()` called per request |
| `Resume` | 73 | Normal — list + version queries |
| `Job` | 49 | Normal — dashboard + CRM |
| `CareerProfile` | 40 | Normal — profile + AI memory |
| `Interview` | 33 | Normal — list + next |
| `GraphEdge` | 30 | Normal — graph loading |
| `Subscription` | 27 | Normal — billing |
| `CoverLetter` | 26 | Normal — list |
| `CoachSession` | 26 | Normal — list |
| `AiUsage` | 23 | Normal — usage tracking |
| `Template` | 21 | Normal — marketplace |
| `CreatorContent` | 21 | Normal — marketplace |
| `Tenant` | 20 | Normal — enterprise |
| `CreditTransaction` | 20 | Normal — billing |
| `AgentRun` | 20 | Normal — agent history |

### N+1 Query Analysis

**Potential N+1 patterns found:** 10 `findMany` calls without `include` — BUT these are list endpoints that don't need related data (e.g., listing contacts doesn't need each contact's company). Not actual N+1 issues.

**Good patterns found:** 11 files use `Promise.all` for parallel queries (dashboard, security/export, enterprise, analytics, briefing, market, bookings, marketplace, security/delete).

### Performance Finding

**`User` table queried 177 times** because `getCurrentUser()` runs `db.user.findFirst()` on every API call. This is the #1 database performance issue.

**Fix recommendation:** Cache the user object in a request-scoped context (e.g., `AsyncLocalStorage`) or use session cookies with JWT.
