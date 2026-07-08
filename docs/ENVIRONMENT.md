# Environment Variables

## Required

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | Database connection string | `file:/app/data/careeros.db` (SQLite) or `postgresql://user:pass@host:5432/careeros` (PostgreSQL) |
| `NEXTAUTH_SECRET` | Secret for session encryption | Generate with `openssl rand -base64 32` |
| `NEXTAUTH_URL` | Public URL of the app | `https://your-domain.com` |

## Optional

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment (`production` / `development`) | `development` |
| `REDIS_URL` | Redis connection for caching/queues | — |
| `STRIPE_SECRET_KEY` | Stripe API key for billing | — |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signature secret | — |
| `STRIPE_PUBLISHABLE_KEY` | Stripe publishable key | — |
| `SENTRY_DSN` | Sentry error tracking DSN | — |

## Feature Flags

| Variable | Description | Default |
|----------|-------------|---------|
| `ENABLE_VOICE_INTERVIEWS` | Enable TTS/ASR interview mode | `true` |
| `ENABLE_DOCUMENT_AI` | Enable VLM document parsing | `true` |
| `ENABLE_RECRUITMENT` | Enable employer recruitment platform | `true` |

## AI Configuration

The AI gateway (`z-ai-web-dev-sdk`) is configured automatically by the SDK. No additional environment variables are needed for AI functionality.

## Setup

### Development
```bash
cp .env.production.example .env
# Edit .env with your values
```

### Production (Docker)
```bash
# .env file in project root
DATABASE_URL=file:/app/data/careeros.db
NEXTAUTH_SECRET=<your-secret>
NEXTAUTH_URL=https://your-domain.com
REDIS_URL=redis://redis:6379
```

### Production (Vercel)
Set environment variables in the Vercel dashboard or via CLI:
```bash
vercel env add DATABASE_URL
vercel env add NEXTAUTH_SECRET
vercel env add NEXTAUTH_URL
```

## Security Notes

- **Never commit `.env` files** to Git (already in `.gitignore`)
- Use different secrets for development and production
- Rotate `NEXTAUTH_SECRET` periodically
- Restrict database access to the application server only
- Use Stripe restricted keys (not secret keys) when possible
