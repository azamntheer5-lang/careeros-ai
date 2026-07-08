# Build Verification

## Command

```bash
bun run build
```

Which executes: `next build && cp -r .next/static .next/standalone/.next/ && cp -r public .next/standalone/`

## Build Duration

```
✓ Compiled successfully in 24.2s
✓ Generating static pages using 1 worker (56/56) in 298.1ms
```

Total: ~24.5 seconds

## Exit Code

```
0
```

## Generated Routes (56 total)

### Static Pages (2)
| Route | Type |
|-------|------|
| `/` | ○ Static (prerendered) |
| `/_not-found` | ○ Static |

### Dynamic Pages (2)
| Route | Type |
|-------|------|
| `/api` | ƒ Dynamic |
| `/p/[slug]` | ƒ Dynamic (public portfolio) |

### API Routes (72)
```
/api/agents               /api/aicenter            /api/analytics
/api/asr                  /api/assessment          /api/assistant
/api/ats                  /api/ats/competitor      /api/ats/recruiter
/api/audit                /api/automation          /api/billing
/api/billing/credits      /api/billing/credits/purchase  /api/billing/subscribe
/api/bookings             /api/bootstrap           /api/branding
/api/briefing             /api/coach               /api/coach/[id]/chat
/api/companies            /api/companies/[id]      /api/contacts
/api/contacts/[id]        /api/cover-letter        /api/cover-letter/[id]
/api/dashboard            /api/documents           /api/documents/[id]
/api/documents/[id]/apply /api/enterprise          /api/enterprise/analytics
/api/enterprise/employees /api/flags               /api/graph
/api/intelligence         /api/interview           /api/interview/[id]/evaluate
/api/interview/[id]/next  /api/jobs                /api/jobs/[id]
/api/market               /api/market/match        /api/marketplace
/api/marketplace/[id]     /api/marketplace/[id]/install  /api/mentors
/api/mentors/[id]         /api/network             /api/network/[slug]
/api/network/follow       /api/plans               /api/portfolio
/api/portfolio/[id]       /api/portfolio/public/[slug]  /api/profile
/api/recruit              /api/recruit/[id]        /api/recruit/match
/api/reminders            /api/reminders/[id]      /api/resumes
/api/resumes/[id]         /api/resumes/[id]/score  /api/resumes/[id]/versions
/api/resumes/enhance      /api/resumes/generate    /api/security/delete
/api/security/export      /api/skills              /api/tts
```

## Interpretation

Build compiled successfully with zero errors. All 56 routes generated. The `cp` commands copy static assets and public files to the standalone output directory for Docker deployment.
