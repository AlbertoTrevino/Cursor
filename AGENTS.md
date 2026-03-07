# AGENTS.md

## Cursor Cloud specific instructions

**Cubo AI** — visual AI workflow builder (React + Express + PostgreSQL monorepo using npm workspaces).

### Architecture

| Workspace | Stack | Dev Port |
|-----------|-------|----------|
| `client` | React 18 + Vite + Tailwind + Zustand + React Flow | 5173 |
| `server` | Express + Prisma + Socket.IO + TypeScript | 3001 |
| `shared` | Shared TypeScript types/constants | — |

### Services

- **PostgreSQL 16**: run via `docker compose up -d` (see `docker-compose.yml`). DB: `cubo_ai`, user: `postgres`, password: `password`.
- **Server `.env`**: copy from `.env.example` to `server/.env`. Requires `DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `ENCRYPTION_KEY` (64-char hex).

### Commands

| Task | Command |
|------|---------|
| Install deps | `npm install` (from repo root) |
| Run both dev servers | `npm run dev` |
| Run client only | `npm run dev:client` |
| Run server only | `npm run dev:server` |
| Run tests | `npm test -w server` (vitest) |
| Type-check | `npx tsc --noEmit` in each workspace (`client`, `server`, `shared`) |
| Prisma migrate (deploy) | `cd server && npx prisma migrate deploy` |
| Prisma generate | `cd server && npx prisma generate` |
| Prisma studio | `npm run db:studio -w server` |

### Non-obvious caveats

- **No ESLint config** — the project uses TypeScript strict mode as its lint mechanism. Run `npx tsc --noEmit` per workspace.
- **Rate limiter on auth routes** — `express-rate-limit` at 20 req / 15 min on `/api/auth/*`. The store is in-memory, so restarting the server resets it. However, if Chrome (or any SPA client) has stale auth tokens in localStorage, it will immediately spam `POST /api/auth/refresh` on page load, burning through the limit before you can interact. **Fix**: kill Chrome, clear `~/.config/google-chrome/Default/Local Storage/` and `Session Storage/`, then restart the server.
- **Prisma migrations** — use `prisma migrate deploy` (not `prisma migrate dev`) in non-interactive environments.
- **Docker required** — PostgreSQL runs in Docker. Docker must be started with `sudo dockerd` in this VM (nested container with fuse-overlayfs). See the environment snapshot for pre-installed Docker.
- **UI language** — the entire UI and API messages are in Spanish (routes like `/flujo/:id`, `/registro`).
