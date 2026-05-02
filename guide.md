# Team Hub Deployment Guide (Railway Postgres + Vercel Apps)

This guide deploys:
- Database on Railway PostgreSQL (already running in your case)
- Backend on Vercel (`apps/api`)
- Frontend on Vercel (`apps/web`)

It is written for beginners and follows a click-by-click process.

## 1) Final Architecture

You will use two platforms:
- Railway: PostgreSQL only
- Vercel: API + Web apps

Request flow:
1. User opens Vercel frontend URL.
2. Frontend calls Vercel backend URL (`/api/...` routes).
3. Backend connects to Railway Postgres through `DATABASE_URL`.

## 2) Important Runtime Note (Realtime)

Vercel serverless functions are stateless and do not keep persistent Socket.io servers like a long-running Node server.
Because of that:
- REST API features work on Vercel.
- Real-time Socket.io presence/live events are limited/not persistent in this setup.

If full realtime is required later, move websocket service to a long-running host or use a managed realtime provider.

## 3) Prerequisites

- GitHub repo is pushed:
  - `https://github.com/najibulazam/fredocloud-technical-assessment-project-teamhub`
- Railway Postgres already running.
- Vercel account connected to your GitHub.
- `.env` files are not committed.

Quick check:

```bash
git ls-files | findstr /R "\.env$ \.env\.local$"
```

Expected output: empty.

## 4) Get Railway Database URL

1. Open Railway project.
2. Open PostgreSQL service.
3. Go to `Variables`.
4. Copy `DATABASE_URL`.
5. Keep it ready for Vercel backend environment variables.

## 5) Deploy Backend to Vercel (`apps/api`)

### A) Import project
1. Open [Vercel Dashboard](https://vercel.com/dashboard).
2. Click `Add New...` -> `Project`.
3. Select GitHub repo `fredocloud-technical-assessment-project-teamhub`.
4. When asked for project settings:
   - Project Name: `team-hub-api` (recommended)
   - Root Directory: `apps/api`

### B) Build settings
Use:
- Framework Preset: `Other`
- Build Command: leave default or set `pnpm install --frozen-lockfile`
- Output Directory: leave empty

`apps/api/vercel.json` is already added to route all requests to the serverless API entrypoint.

### C) Backend environment variables on Vercel
In project `Settings` -> `Environment Variables`, add:

```env
DATABASE_URL=postgresql://...
API_PORT=5000
JWT_ACCESS_SECRET=<long-random-secret>
JWT_REFRESH_SECRET=<long-random-secret>
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=7d
CORS_ORIGIN=https://<your-frontend-domain>
CLIENT_URL=https://<your-frontend-domain>
COOKIE_SECURE=true
UPLOAD_MAX_BYTES=5242880
INVITE_EXPIRES_DAYS=7
```

Optional integrations:

```env
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

### D) Deploy
1. Click `Deploy`.
2. Wait for successful build.
3. Copy backend URL, e.g. `https://team-hub-api.vercel.app`.
4. Check health endpoint:
   - `https://team-hub-api.vercel.app/api/health`

## 6) Run Prisma Migrations Against Railway DB

Do this from your local project folder:

```bash
pnpm --filter @team-hub/db exec prisma migrate deploy --schema prisma/schema.prisma
```

Optional seed:

```bash
pnpm --filter @team-hub/api seed
```

## 7) Deploy Frontend to Vercel (`apps/web`)

### A) Import second Vercel project
1. In Vercel, click `Add New...` -> `Project`.
2. Select same GitHub repo again.
3. Set:
   - Project Name: `team-hub-web`
   - Root Directory: `apps/web`
   - Framework Preset: `Next.js`

### B) Frontend environment variables
Set in `Settings` -> `Environment Variables`:

```env
NEXT_PUBLIC_API_URL=https://<your-api-vercel-domain>/api
NEXT_PUBLIC_SOCKET_URL=https://<your-api-vercel-domain>
NEXT_PUBLIC_ENABLE_SOCKET=false
```

Example:

```env
NEXT_PUBLIC_API_URL=https://team-hub-api.vercel.app/api
NEXT_PUBLIC_SOCKET_URL=https://team-hub-api.vercel.app
NEXT_PUBLIC_ENABLE_SOCKET=false
```

### C) Deploy
1. Click `Deploy`.
2. Wait for successful build.
3. Copy frontend URL, e.g. `https://team-hub-web.vercel.app`.

## 8) Final Cross-Project Update

After frontend URL is ready, go back to backend project vars and ensure:

```env
CORS_ORIGIN=https://<your-frontend-vercel-domain>
CLIENT_URL=https://<your-frontend-vercel-domain>
```

Then redeploy backend once.

## 9) Verify End-to-End

1. Backend health:
   - `https://<api-domain>/api/health`
2. Open frontend URL.
3. Register/login.
4. Check workspace/goals/action-items/announcements pages.
5. Test avatar upload and CSV export.

Note:
- Live Socket.io events may not behave as in local long-running server.

## 10) Vercel Auto Deploy Workflow

Both Vercel projects are connected to the same GitHub repo.
Default behavior:
- Every push to configured branch triggers deployment.

Recommended:
1. Work in feature branch.
2. Open PR.
3. Merge to `main`.
4. Vercel auto-deploys both projects.

## 11) Common Errors and Fixes

### Frontend cannot call backend
Cause:
- Wrong `NEXT_PUBLIC_API_URL`.
Fix:
- Must be full URL and include `/api`.

### CORS error in browser
Cause:
- Backend `CORS_ORIGIN` not exactly equal to frontend Vercel domain.
Fix:
- Set exact frontend URL and redeploy backend.

### Database errors from backend
Cause:
- Wrong `DATABASE_URL` or migrations missing.
Fix:
- Re-check Railway DB URL and run migrate deploy.

### Error: `@prisma/client did not initialize yet`
Cause:
- Prisma Client was not generated during Vercel build.

Fix:
1. Confirm this repo includes `packages/db` postinstall generate script.
2. In Vercel API project, set Root Directory to `apps/api`.
3. In Vercel Web project, set Root Directory to `apps/web` (important).
4. Redeploy API project first.
5. If still failing, clear Vercel build cache and redeploy.

Why this happens:
- `@team-hub/db` needs `prisma generate` to create runtime client artifacts used by serverless functions.

### Login cookie issues in production
Cause:
- `COOKIE_SECURE` not set correctly.
Fix:
- Keep `COOKIE_SECURE=true` on Vercel production.

## 12) Security Checklist

- Do not commit real `.env` files.
- Keep secrets only in Vercel/Railway environment variables.
- Keep `.env.example` as template only.
- Rotate secrets if exposed.
