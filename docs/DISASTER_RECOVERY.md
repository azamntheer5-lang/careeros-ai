# CareerOS AI — Disaster Recovery Documentation

## Backup Strategy

### Database (SQLite)
- **Frequency:** Daily automated backup via cron job
- **Location:** `/app/data/backups/` (Docker volume)
- **Retention:** 30 days
- **Command:** `cp /app/data/careeros.db /app/data/backups/careeros-$(date +%Y%m%d).db`

### Production (PostgreSQL)
- **Frequency:** Daily automated `pg_dump`
- **Location:** S3 / cloud storage
- **Retention:** 90 days (daily) + 12 months (monthly)
- **Restore:** `pg_restore -d careeros < backup.dump`

### File Uploads
- Documents (base64 in DB) — backed up with database
- Portfolio assets — stored in DB, backed up with database

## Recovery Procedures

### Database Recovery (SQLite)
```bash
# 1. Stop the application
docker compose stop app

# 2. Restore from backup
cp /app/data/backups/careeros-20260707.db /app/data/careeros.db

# 3. Restart
docker compose start app
```

### Database Recovery (PostgreSQL)
```bash
# 1. Stop the application
docker compose stop app

# 2. Drop and recreate database
dropdb careeros && createdb careeros

# 3. Restore from backup
pg_restore -d careeros < /backups/careeros-20260707.dump

# 4. Run migrations
npx prisma migrate deploy

# 5. Restart
docker compose start app
```

### AI Service Outage
- The ZAI SDK has built-in retry logic (2 retries with exponential backoff)
- If all retries fail, the API returns a 500 error
- The client displays a user-friendly error toast
- No data loss — all persisted data remains in the database

### Application Crash
- Docker `restart: unless-stopped` auto-restarts the container
- Health check (`/api/bootstrap`) triggers restart after 3 failures
- No data loss — all state is in the database

## RTO/RPO
- **RTO (Recovery Time Objective):** < 15 minutes (Docker restart + DB restore)
- **RPO (Recovery Point Objective):** < 24 hours (daily backups)

## Monitoring
- Docker health checks on `/api/bootstrap`
- Application logs: `docker compose logs app`
- Database logs: `docker compose logs app | grep prisma`
- AI usage: `/api/aicenter` dashboard
- Audit trail: `/api/audit` endpoint

## Failover
- Single-instance deployment (no active failover)
- For HA: deploy multiple app instances behind a load balancer + shared PostgreSQL + Redis
