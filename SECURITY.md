# Security Policy

## Supported Versions

| Version | Supported          |
|---------|--------------------|
| 1.0.x   | ✅ Active support  |
| < 1.0   | ❌ Not supported   |

## Reporting a Vulnerability

We take security vulnerabilities seriously. If you discover a security issue, please report it responsibly.

**Do NOT open a public GitHub issue for security vulnerabilities.**

### How to Report

1. Email **security@careeros.ai** with a detailed description
2. Include steps to reproduce the vulnerability
3. Provide your assessment of the impact
4. We will acknowledge receipt within 48 hours

### Response Timeline

- **Acknowledgment:** Within 48 hours
- **Initial Assessment:** Within 5 business days
- **Fix Timeline:** Critical (7 days), High (30 days), Medium (60 days), Low (90 days)
- **Disclosure:** After fix is released, coordinated with reporter

### Scope

The following are in scope:
- Authentication/authorization bypasses
- SQL injection / Prisma query injection
- XSS, CSRF, SSRF vulnerabilities
- Sensitive data exposure
- API abuse / rate limiting bypass
- AI prompt injection leading to data leakage

The following are **not** in scope:
- Vulnerabilities in third-party dependencies (report to upstream)
- Self-XSS requiring user interaction with dev tools
- Missing security headers (report as feature request)
- Social engineering attacks

## Security Measures

### Authentication
- All API routes require `getCurrentUser()` (session-based)
- Public endpoints limited to: bootstrap, public portfolio, TTS/ASR (stateless)
- MFA toggle available in Security module
- SSO (SAML) ready for enterprise tenants

### Data Protection
- GDPR data export (`/api/security/export`) — full JSON download
- GDPR account deletion (`/api/security/delete`) — cascades all 43 models
- No sensitive data logged in audit trails
- Environment variables for all secrets (never hardcoded)

### AI Security
- Credit-gated AI execution prevents abuse
- Input length limits on all AI endpoints
- Prompt injection mitigations via structured JSON output
- Per-feature credit costs enforce fair usage

### Infrastructure
- Docker multi-stage build (minimal attack surface)
- Non-root container user
- Health checks on all services
- Audit logging on all sensitive actions

## Security Best Practices for Deployment

1. **Set a strong `NEXTAUTH_SECRET`**: `openssl rand -base64 32`
2. **Use PostgreSQL** in production (not SQLite)
3. **Enable Redis** for caching and rate limiting
4. **Configure Stripe webhooks** with signature verification
5. **Set up CSP headers** in your reverse proxy
6. **Enable HTTPS** with valid certificates
7. **Regular database backups** (see [Disaster Recovery](docs/DISASTER_RECOVERY.md))
8. **Monitor audit logs** for suspicious activity

## Contact

- Security issues: security@careeros.ai
- General issues: [GitHub Issues](https://github.com/azamntheer5-lang/careeros-ai/issues)
