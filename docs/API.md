# CareerOS AI — API Documentation

## Base URL
`/api` (relative, served by Next.js)

## Authentication
All endpoints (except noted public ones) require authentication via session cookie. In demo mode, `getCurrentUser()` returns the first user.

## Endpoints by Domain

### Core
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/bootstrap` | Ensure demo user exists, seed data |
| GET | `/api/dashboard` | Aggregate stats for dashboard |
| GET | `/api/profile` | Get/upsert career profile |
| PUT | `/api/profile` | Update career profile |

### Resume Engine
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/resumes` | List resumes |
| POST | `/api/resumes` | Create resume |
| GET | `/api/resumes/[id]` | Get resume |
| PUT | `/api/resumes/[id]` | Update resume |
| DELETE | `/api/resumes/[id]` | Delete resume |
| POST | `/api/resumes/generate` | AI-generate resume from context |
| POST | `/api/resumes/enhance` | AI-enhance a single bullet |
| POST | `/api/resumes/[id]/score` | AI quality score |
| GET | `/api/resumes/[id]/versions` | Version history |
| POST | `/api/resumes/[id]/versions` | Save version checkpoint |

### ATS Intelligence
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/ats` | Resume vs JD analysis |
| POST | `/api/ats/recruiter` | 6-second recruiter simulation |
| POST | `/api/ats/competitor` | Candidate vs competitor comparison |

### Cover Letters
| GET | `/api/cover-letter` | List |
| POST | `/api/cover-letter` | AI-generate |
| DELETE | `/api/cover-letter/[id]` | Delete |

### Interview
| GET | `/api/interview` | List sessions |
| POST | `/api/interview` | Create session |
| POST | `/api/interview/[id]/next` | Next question + evaluate answer |
| POST | `/api/interview/[id]/evaluate` | End & score |

### AI Agents
| GET | `/api/agents` | List agents + run history |
| POST | `/api/agents` | Run an agent |

### Knowledge Graph
| GET | `/api/graph` | Get graph (auto-builds if empty) |
| POST | `/api/graph` | Rebuild graph |

### Automation
| GET | `/api/automation` | List workflows + run history |
| POST | `/api/automation` | Execute a workflow |

### Jobs CRM
| GET/POST | `/api/jobs` | List/create jobs |
| PUT/DELETE | `/api/jobs/[id]` | Update/delete |
| GET/POST | `/api/companies` | Company research (web search) |
| DELETE | `/api/companies/[id]` | Delete |
| GET/POST | `/api/contacts` | Contacts CRUD |
| DELETE | `/api/contacts/[id]` | Delete |
| GET/POST | `/api/reminders` | Reminders CRUD |
| PUT/DELETE | `/api/reminders/[id]` | Update/delete |

### Billing & Credits
| GET | `/api/billing` | Subscription + plans |
| POST | `/api/billing/subscribe` | Subscribe to plan |
| GET | `/api/billing/credits` | Credit balance + packages |
| POST | `/api/billing/credits/purchase` | Buy credits |
| GET | `/api/plans` | Plan + usage + invoices |

### Assessment & Briefing
| GET/POST | `/api/assessment` | Career assessment |
| GET/POST | `/api/briefing` | Daily/weekly briefing |

### AI Center
| GET | `/api/aicenter` | Usage analytics + prompt registry |

### Recruitment
| GET/POST | `/api/recruit` | Job postings |
| GET/PUT/DELETE | `/api/recruit/[id]` | Manage posting |
| POST | `/api/recruit/match` | AI candidate matching |

### Marketplace
| GET/POST | `/api/marketplace` | Templates + content |
| GET/PUT/DELETE | `/api/marketplace/[id]` | Manage item |
| POST | `/api/marketplace/[id]/install` | Install template |

### Network
| GET/POST | `/api/network` | Feed + profile |
| GET/PUT | `/api/network/[slug]` | Public profile |
| POST | `/api/network/follow` | Toggle follow |

### Mentors
| GET/POST | `/api/mentors` | List/become mentor |
| GET/PUT | `/api/mentors/[id]` | Manage mentor profile |
| GET/POST | `/api/bookings` | Bookings |

### Enterprise
| GET | `/api/enterprise` | Tenant + departments + employees |
| GET/POST | `/api/enterprise/employees` | Employee CRUD |
| GET | `/api/enterprise/analytics` | Org analytics |

### Portfolio
| GET/POST | `/api/portfolio` | List/create portfolios |
| GET | `/api/portfolio/public/[slug]` | Public portfolio (no auth) |

### Document AI
| GET/POST | `/api/documents` | Upload + parse (VLM) |
| GET/DELETE | `/api/documents/[id]` | Manage document |
| POST | `/api/documents/[id]/apply` | Apply parsed data to profile |

### Security
| GET | `/api/security/export` | GDPR data export (no auth — downloadable) |
| POST | `/api/security/delete` | GDPR account deletion |

### AI Voice
| POST | `/api/tts` | Text-to-speech (WAV) |
| POST | `/api/asr` | Speech-to-text |

### Admin
| GET | `/api/audit` | Audit log |
| GET/PUT | `/api/flags` | Feature flags |
| GET | `/api/analytics` | Advanced analytics |

### Assistant
| POST | `/api/assistant` | Floating AI assistant |

## Response Format
All endpoints return JSON. Errors: `{ "error": "message" }` with appropriate HTTP status.
