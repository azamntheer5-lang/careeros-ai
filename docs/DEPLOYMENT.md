# Production Deployment Guide

## Option 1: Docker (Recommended)

### Prerequisites
- Docker 24+
- Docker Compose 2+

### Steps

1. **Clone and configure:**
   ```bash
   git clone https://github.com/azamntheer5-lang/careeros-ai.git
   cd careeros-ai
   cp .env.production.example .env
   ```

2. **Edit `.env`:**
   ```bash
   DATABASE_URL=file:/app/data/careeros.db
   NEXTAUTH_SECRET=$(openssl rand -base64 32)
   NEXTAUTH_URL=https://your-domain.com
   REDIS_URL=redis://redis:6379
   ```

3. **Build and start:**
   ```bash
   docker compose up -d --build
   ```

4. **Verify:**
   ```bash
   curl https://your-domain.com/api/bootstrap
   # Should return {"user":{...}}
   ```

5. **Check logs:**
   ```bash
   docker compose logs -f app
   ```

### Services

| Service | Port | Description |
|---------|------|-------------|
| app | 3000 | Next.js application |
| redis | 6379 | Cache + queue |
| worker | — | Background job processor |

### Health Checks
The app container includes a health check on `/api/bootstrap`. Docker auto-restarts unhealthy containers.

### Updates
```bash
git pull
docker compose up -d --build
```

---

## Option 2: Vercel

1. **Import** the repository on [Vercel](https://vercel.com)
2. **Framework preset:** Next.js
3. **Environment variables:** Set all from `.env.production.example`
4. **Database:** Use Vercel Postgres or external PostgreSQL
5. **Deploy**

### Post-Deploy
```bash
# Run database migration
vercel env pull .env
bunx prisma db push
```

---

## Option 3: Manual / VPS

### Prerequisites
- Node.js 20+ or Bun 1.1+
- PostgreSQL 15+ (recommended) or SQLite
- Redis 7+ (optional, for caching)
- Nginx (reverse proxy)

### Steps

1. **Install dependencies:**
   ```bash
   bun install --production
   ```

2. **Build:**
   ```bash
   bunx prisma generate
   bun run build
   ```

3. **Set environment variables:**
   ```bash
   export DATABASE_URL="postgresql://user:pass@localhost:5432/careeros"
   export NEXTAUTH_SECRET="your-secret"
   export NEXTAUTH_URL="https://your-domain.com"
   ```

4. **Push database schema:**
   ```bash
   bunx prisma db push
   ```

5. **Start:**
   ```bash
   bun run start
   # Or with PM2
   pm2 start "bun run start" --name careeros
   ```

6. **Nginx config:**
   ```nginx
   server {
     listen 80;
     server_name your-domain.com;
     location / {
       proxy_pass http://localhost:3000;
       proxy_set_header Host $host;
       proxy_set_header X-Real-IP $remote_addr;
     }
   }
   ```

---

## Database Migration (SQLite → PostgreSQL)

1. **Export SQLite data:**
   ```bash
   bunx prisma db pull  # Sync schema
   # Export data via script
   ```

2. **Update `DATABASE_URL`:**
   ```bash
   DATABASE_URL=postgresql://user:pass@localhost:5432/careeros
   ```

3. **Push schema:**
   ```bash
   bunx prisma db push
   ```

4. **Import data** to PostgreSQL.

---

## SSL / HTTPS

### Using Let's Encrypt + Nginx
```bash
sudo certbot --nginx -d your-domain.com
```

### Using Caddy (auto-HTTPS)
```caddyfile
your-domain.com {
  reverse_proxy localhost:3000
}
```

---

## Monitoring

### Application Logs
```bash
docker compose logs -f app
```

### Database Backups
See [Disaster Recovery](DISASTER_RECOVERY.md)

### Health Endpoint
```bash
curl https://your-domain.com/api/bootstrap
```

---

## Scaling

### Horizontal Scaling
- Deploy multiple app instances behind a load balancer
- Use shared PostgreSQL + Redis
- Enable sticky sessions for WebSocket (if added)

### Vertical Scaling
- Increase container CPU/memory in `docker-compose.yml`
- Tune Prisma connection pool

### CDN
- Serve static assets via CDN (Cloudflare, Vercel Edge)
- Cache `/api/dashboard`, `/api/graph` responses (Redis)
