# Team Hub - FredoCloud Technical Assessment

Collaborative Team Hub is a full-stack monorepo where teams can manage shared workspaces, goals, milestones, announcements, and action items with real-time collaboration signals.

This project is built for the FredoCloud assessment requirements:
- Single monorepo with separate frontend and backend apps.
- Next.js 14 App Router frontend.
- Express + Prisma backend.
- PostgreSQL database.
- JWT cookie auth (access + refresh).
- Socket.io real-time updates.
- Railway deployment with separate frontend and backend services.

## Live Links
- Web App (Vercel): `https://team-hub-web-five.vercel.app`
- API (Vercel): `https://team-hub-api-rust.vercel.app`
- API Health: `https://team-hub-api-rust.vercel.app/api/health`
- GitHub Repository: `https://github.com/najibulazam/fredocloud-technical-assessment-project-teamhub`
- Demo Video (3-5 min): `https://youtu.be/mUW8n1cLBoM`

## Demo Account
- Email: `teamhub@gmail.com`
- Password: `Demo1234`

Seed data command:

```bash
pnpm --filter @team-hub/api seed
```

## Tech Stack
- Monorepo: `Turborepo` + `pnpm workspaces`
- Frontend: `Next.js 14` (App Router, JavaScript), `Tailwind CSS`
- State/Data: `Zustand`, `@tanstack/react-query`
- Backend: `Node.js`, `Express.js`, `express-validator`
- Database: `PostgreSQL`, `Prisma ORM`
- Auth: `JWT` access + refresh in `httpOnly` cookies
- Realtime: `Socket.io`
- Storage: `Cloudinary` (avatar upload)
- Email: `EmailJS` (invites and mentions)
- Deployment: `Railway Postgres` + `Vercel` (API + Web)

## Assignment Coverage
### Core Features
- Authentication: register, login, refresh, logout, me, protected routes.
- Profile: update name and avatar upload.
- Workspaces: create, list, update, invite flow, role management.
- Goals: CRUD, owner, due date, status tracking, updates feed.
- Milestones: nested under goals, progress and completion state.
- Announcements: rich text, pin/unpin, reactions, comments.
- Action items: CRUD, assignee, priority, due date, status, goal link.
- Views: Kanban and list mode.
- Realtime: announcements/comments/reactions/status changes + online presence.
- Mentions: in-app notifications and optional mention email.
- Analytics: stats, weekly chart, CSV export.

### Advanced Features Chosen (2)
1. Optimistic UI
- Optimistic cache updates for reactions/comments and key list interactions.
- Automatic rollback on failure using React Query mutation lifecycle.

2. Advanced RBAC
- Backend permission matrix (`ADMIN` and `MEMBER`) enforced by middleware.
- Frontend permission-aware rendering for sensitive actions.

### Bonus Features Included
- Dark and light theme support.
- Email notifications for invitations and mentions.

## How The System Works
### High-level flow
1. User authenticates via API (`/api/auth/*`) and receives secure cookies.
2. Frontend fetches current user, memberships, and workspace context.
3. Workspace-scoped pages call REST endpoints for goals, milestones, action items, and announcements.
4. Socket.io joins user and workspace rooms for real-time pushes.
5. Optimistic UI updates the interface immediately while server requests are in flight.
6. RBAC + membership checks enforce access boundaries per workspace.

### Real-time flow
1. Client connects to Socket.io with cookie-authenticated handshake.
2. Server validates access token, resolves user memberships, and joins user room.
3. Client emits `join:workspace` to subscribe to workspace room presence/events.
4. API writes emit events like `announcement:*`, `goal:*`, `actionItem:*`, `presence:update`, and notifications.

## Monorepo Structure Overview
```text
apps/
  api/                      # Express REST API + Socket.io server
    src/
      controllers/          # Route handlers
      middleware/           # Auth, RBAC, upload, workspace access
      routes/               # API route groups
      services/             # Socket and email services
      utils/                # Error handling, async wrapper, JWT
  web/                      # Next.js App Router frontend
    app/                    # Routes and layouts
    components/             # Feature and UI components
    hooks/                  # Socket, permissions, optimistic helpers
    lib/                    # API client, query client, socket client
    store/                  # Zustand stores
packages/
  db/                       # Prisma schema, migrations, shared Prisma client
  ui/                       # Shared reusable UI package
  utils/                    # Shared utility package
  config/                   # Shared lint/format/tailwind config
```

## API Overview
Base URL (local): `http://localhost:5000/api`

Main route groups:
- `/auth` - register/login/refresh/logout/me
- `/workspaces` - list/create/update/workspace details/invites/join-requests/members/permissions
- `/workspaces/:workspaceId/goals`
- `/goals/:goalId/milestones`
- `/workspaces/:workspaceId/action-items`
- `/workspaces/:workspaceId/announcements`
- `/workspaces/:workspaceId/analytics`
- `/users` - profile/avatar/notifications

Health endpoint:
- `GET /api/health`

## Local Setup
### Prerequisites
- Node.js `18+`
- pnpm `9+`
- PostgreSQL local or Railway Postgres

### 1) Install dependencies
```bash
pnpm install
```

### 2) Configure environment files
Use `.env.example` as the template and populate:
- `/.env`
- `/apps/api/.env`
- `/packages/db/.env`
- `/apps/web/.env.local`

Backend (`.env` and `apps/api/.env`)
```env
DATABASE_URL=postgresql://...
API_PORT=5000
JWT_ACCESS_SECRET=...
JWT_REFRESH_SECRET=...
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=7d
CORS_ORIGIN=http://localhost:3000
CLIENT_URL=http://localhost:3000
UPLOAD_MAX_BYTES=5242880
INVITE_EXPIRES_DAYS=7

# Optional integrations
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

Database (`packages/db/.env`)
```env
DATABASE_URL=postgresql://...
```

Frontend (`apps/web/.env.local`)
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_SOCKET_URL=http://localhost:5000
```

### 3) Run migrations
```bash
pnpm --filter @team-hub/db exec prisma migrate dev --schema prisma/schema.prisma
```

### 4) Seed demo data (optional)
```bash
pnpm --filter @team-hub/api seed
```

### 5) Start development
```bash
pnpm dev
```

Local URLs:
- Web: `http://localhost:3000`
- API: `http://localhost:5000`

## Useful Commands
```bash
pnpm dev
pnpm build
pnpm lint
pnpm test

pnpm --filter @team-hub/web dev
pnpm --filter @team-hub/api dev
pnpm --filter @team-hub/db exec prisma studio
```

## Deployment Summary (Vercel + Railway Postgres)
- Deploy `apps/api` and `apps/web` as separate Vercel projects.
- Provision PostgreSQL on Railway and map `DATABASE_URL` to the API project.
- Set backend variables (`JWT_*`, `CLIENT_URL`, `CORS_ORIGIN`, optional Cloudinary/EmailJS).
- Set frontend variables:
  - `NEXT_PUBLIC_API_URL=https://<api-service>/api`
  - `NEXT_PUBLIC_SOCKET_URL=https://<api-service>`
- Run production migrations:

```bash
pnpm --filter @team-hub/db exec prisma migrate deploy --schema prisma/schema.prisma
```

## Deployment Note
I attempted a full Railway deployment first, but without a paid plan I chose Vercel for free API and web hosting while keeping Railway for Postgres.

Detailed step-by-step deployment instructions are in `guide.md`.

## Security Notes
- Auth uses `httpOnly` cookies for access and refresh tokens.
- Set `COOKIE_SECURE=true` in production (HTTPS).
- Keep all `.env` files out of git; only commit `.env.example`.
- Workspace membership and RBAC checks enforce per-workspace access.

## Known Limitations
- Test coverage is limited; no full automated backend/frontend test suite yet.
- OpenAPI/Swagger docs are not included.
- Invite acceptance and notification UX can be expanded further.

## Submission Checklist
- [ ] Add final Railway web URL.
- [ ] Add final Railway API URL.
- [ ] Add public GitHub repo URL.
- [ ] Add video walkthrough URL.
- [ ] Verify demo account login on deployed environment.
