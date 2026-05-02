# Team Hub Deployment Guide (Railway)

This guide explains how to deploy Team Hub with separate backend and frontend Railway services plus a shared PostgreSQL service.

## 1) Prerequisites
- Railway account and project access.
- GitHub repository connected to Railway.
- Node.js 18+ and pnpm 9+ locally.
- A clean `.env.example` committed, with real secrets only in Railway variables.

## 2) Architecture on Railway
- `Postgres Service` (Railway plugin): stores all application data.
- `API Service` (`apps/api`): Express REST API + Socket.io server.
- `Web Service` (`apps/web`): Next.js frontend.

Traffic flow:
1. Browser loads the Web service.
2. Web calls API service using `NEXT_PUBLIC_API_URL`.
3. Web opens Socket.io connection to API using `NEXT_PUBLIC_SOCKET_URL`.
4. API reads/writes Postgres via `DATABASE_URL`.

## 3) Create Railway Project and Postgres
1. Create a new Railway project.
2. Add a PostgreSQL service/plugin.
3. Confirm `DATABASE_URL` is available in the Postgres service variables.

## 4) Deploy Backend Service (API)
### Service creation
1. Add a new service from your GitHub repo.
2. Keep root as repository root.
3. Use the following commands:

Build command:
```bash
pnpm install --frozen-lockfile
```

Start command:
```bash
pnpm --filter @team-hub/api start
```

### Required backend variables
Set these in API service variables:

```env
DATABASE_URL=postgresql://...
API_PORT=5000
JWT_ACCESS_SECRET=...
JWT_REFRESH_SECRET=...
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=7d
CORS_ORIGIN=https://<web-service>.up.railway.app
CLIENT_URL=https://<web-service>.up.railway.app
```

Optional but recommended:

```env
COOKIE_SECURE=true
UPLOAD_MAX_BYTES=5242880
INVITE_EXPIRES_DAYS=7
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
CLOUDINARY_FOLDER=team-hub
EMAILJS_SERVICE_ID=
EMAILJS_TEMPLATE_ID_INVITE=
EMAILJS_TEMPLATE_ID_MENTION=
EMAILJS_PUBLIC_KEY=
EMAILJS_PRIVATE_KEY=
```

### Run production migrations
Run once against Railway DB:

```bash
pnpm --filter @team-hub/db exec prisma migrate deploy --schema prisma/schema.prisma
```

If needed, run seeding:

```bash
pnpm --filter @team-hub/api seed
```

## 5) Deploy Frontend Service (Web)
### Service creation
1. Add a second service from the same repository.
2. Keep root as repository root.
3. Use:

Build command:
```bash
pnpm install --frozen-lockfile && pnpm --filter @team-hub/web build
```

Start command:
```bash
pnpm --filter @team-hub/web start
```

### Required frontend variables
```env
NEXT_PUBLIC_API_URL=https://<api-service>.up.railway.app/api
NEXT_PUBLIC_SOCKET_URL=https://<api-service>.up.railway.app
```

## 6) Cross-Service Settings Checklist
- API `CORS_ORIGIN` must include the exact web app origin.
- API `CLIENT_URL` must be the same public web URL.
- Web `NEXT_PUBLIC_API_URL` must include `/api`.
- Web `NEXT_PUBLIC_SOCKET_URL` must point to API origin without `/api`.
- Use HTTPS-only production URLs.

## 7) Verification Steps
After deployment:
1. Open API health endpoint: `https://<api>/api/health`.
2. Open web app login/register pages.
3. Log in with demo account.
4. Verify workspace list loads.
5. Verify realtime updates (comments/reactions/status) across two browser tabs.
6. Verify avatar upload and analytics export.

## 8) Security and Git Hygiene
- Never commit real `.env` values.
- Keep `.env`, `apps/api/.env`, and `packages/db/.env` ignored.
- Rotate JWT/DB/cloud secrets if they were ever exposed.
- Keep `.env.example` as the only committed environment template.

## 9) Local-Only Commands
Install:

```bash
pnpm install
```

Run locally:

```bash
pnpm dev
```

Run lint:

```bash
pnpm lint
```
