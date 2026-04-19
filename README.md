# RDE Advisors — Engineering Test Starter

Fork or clone this repository to begin the paid engineering test. You have **3.5 hours wall-clock** inside the agreed window — git commit timestamps will be audited.

---

## What's in here

| Path | Description |
|------|-------------|
| `src/` | Next.js App Router + TypeScript + Tailwind scaffold |
| `prisma/schema.prisma` | Minimal Prisma schema (SQLite) — extend it |
| `data/listings.json` | 25 synthetic NYC office listings |
| `public/images/listings/` | Placeholder SVG photos (replace with real media) |
| `public/floorplans/` | 25 schematic SVG floor plans |
| `data/buildium_export.zip` | Synthetic Buildium property-management export (6 CSVs) |

---

## Running locally

```bash
npm install
npx prisma generate
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The homepage placeholder tells you where to start.

> **Note:** A `dev.db` SQLite file will be created locally when you run migrations. It is gitignored — do not commit it.

---

## Scope

| Part | What | Time |
|------|------|------|
| 1 | BTS chat-first search at `/`, `/search`, `/listings/[slug]` | 55 min |
| 2 | PM Buildium import at `/import` | 45 min |
| 3 | PM dashboard at `/dashboard` with rent roll / AR aging / expense chart / NL query | 55 min |
| 4 | Written answers W1–W5 in `SUBMISSION.md` | 40 min |
| 5 | Loom walkthrough | 10 min |

---

## Required deliverables

1. This repo pushed to **your GitHub** — invite `@rdeadvisors` if private.
2. **Live deploy URL** on Vercel or Netlify.
3. **`SUBMISSION.md`** in the repo root containing:
   - All five written answers (W1–W5)
   - A 200-word plain-English architecture overview written for a non-technical founder
   - A one-page cost projection table
4. **`README.md`** updated with "how to run this locally" for your specific implementation.
5. **Loom walkthrough** (5–10 min) including a 60-second "explain this to a non-technical founder" segment.

---

## Rules

- **3.5-hour hard wall-clock.** Git commit timestamps are audited; do not rebase after the clock starts.
- **AI tools allowed** — disclose which ones in your Loom.
- **No subcontracting.** The code must be yours.
- **RDE claims no IP.** Everything you write belongs to you.
- **$100 paid** on any submission regardless of outcome.

---

## Known quirks in the starter data

> Candidates: read this section carefully — these are **intentional** gotchas your code must handle.

- **`data/listings.json`** contains **2 entries** with `submarket = "Grand Central"` and **1 entry** with `submarket = "Grand Central Area"`. Your search and normalization logic must handle both spellings gracefully.

- **`data/buildium_export.zip`** contains deliberate messiness that mirrors real production exports. Do **not** silently drop bad rows — surface them in the import preview step:
  - `tenants.csv`: 3 duplicate email rows, 5 missing phone numbers, 2 malformed email addresses, 1 em-dash in a last name, mixed date formats (MM/DD/YYYY and YYYY-MM-DD)
  - `units.csv`: 3 property-name variations that refer to the same building (`"1234 Elm St"`, `"1234 Elm Street"`, `"1234 Elm St."`), 2 rows with negative square footage, 1 NULL monthly rent target
  - `leases.csv`: 8 orphan `tenant_id` references not present in `tenants.csv`, 4 leases where `end_date` is before `start_date`, 2 overlapping active leases on the same unit
  - `charges.csv`: 12 orphan `lease_id` references, 3 rows with negative amounts
  - `payments.csv`: 5 orphan `lease_id` references, 2 zero-amount payments, 4 split payments (same lease + same date across two rows)
  - `work_orders.csv`: 5 open orders with no `closed_date`, 3 descriptions in Spanish (UTF-8 encoding test), 1 vendor with an apostrophe (`O'Malley & Sons`), 2 rows with negative cost
