# Run Locally

## Prerequisites
- Node 22 LTS
- npm (repo has `package-lock.json`)

## 1. Env files

Create `.env` in the repo root:

```
DATABASE_URL="file:./dev.db"
```

Create `.env.local` in the repo root:

```
AI_MODEL="anthropic/claude-haiku-4.5"
CRON_SECRET="any-random-string"
```

The AI features (`/`, `/search`, dashboard NL query) call the Vercel AI Gateway. For local dev, link the project and pull creds:

```bash
npm i -g vercel
vercel link
vercel env pull .env.local
```

That fills in `VERCEL_OIDC_TOKEN` (refresh every ~12h with the same command).

## 2. Install & migrate

```bash
npm install
npx prisma migrate dev
```

`postinstall` runs `prisma generate` automatically. Migrations create `dev.db` (gitignored).

## 3. Dev server

```bash
npm run dev
```

Open http://localhost:3000.

## Routes

- `/` — BTS chat search
- `/search` — filtered results
- `/listings/[slug]` — listing detail
- `/import` — Buildium ZIP upload
- `/dashboard` — rent roll, AR aging, expense chart, NL query
- `/tenants`, `/leases`, `/flagged` — PM tables

Auth is stubbed to a demo user (`src/lib/auth.ts`) — no sign-in needed.

## Reset DB

```bash
rm dev.db
npx prisma migrate dev
```
