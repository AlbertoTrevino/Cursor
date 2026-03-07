# AGENTS.md

## Cubo AI — Idea Description Generator

Full-stack web application for organizing ideas and generating AI-enriched Cursor handoffs.

### Stack
- **Frontend:** React 18 + Vite 6 + TypeScript + Tailwind CSS
- **Backend:** Express 4 + TypeScript + Prisma 6
- **Database:** PostgreSQL 16
- **AI:** OpenAI (GPT-4o-mini) + Anthropic (Claude Sonnet)

### Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start PostgreSQL** (via Docker Compose or local install):
   ```bash
   docker compose up -d
   ```

3. **Create `.env`** from `.env.example` and fill in secrets.

4. **Run migrations:**
   ```bash
   cd server && npx prisma migrate deploy && npx prisma generate
   ```

5. **Start dev servers:**
   ```bash
   npm run dev
   ```
   - Client: http://localhost:5173
   - Server: http://localhost:3001

### Key Modules

- **Workflows (existing):** Visual canvas-based AI workflow builder
- **Ideas (new):** Idea description generator with dual-AI enrichment
  - Routes: `/api/ideas/*`, `/api/fabric/*`
  - Frontend pages: `/ideas`, `/ideas/nueva`, `/ideas/:id`
  - Services: `server/src/services/idea/`

### Lint / Test / Build

```bash
# Type check
cd client && npx tsc --noEmit
cd server && npx tsc --noEmit

# Tests
cd server && npx vitest run

# Build
cd client && npx vite build
```
