<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version (Next.js 16, React 19, Prisma 7, Tailwind 4) has breaking changes — APIs, conventions, and file structure may differ from your training data. Consult the live docs before writing code:

- Next.js 16: https://nextjs.org/docs
- React 19: https://react.dev
- Prisma 7: https://www.prisma.io/docs
- Tailwind 4: https://tailwindcss.com/docs

**Key Prisma 7 gotcha for agents:** `DATABASE_URL` is read from `prisma.config.ts`, **not** `schema.prisma`. Do not add `url = env("DATABASE_URL")` to `schema.prisma` — Prisma 7 will error. The `url` lives exclusively in `prisma.config.ts`, which reads `process.env.DATABASE_URL` from `.env`.

**Key Prisma 7 gotcha for generated client location:** the generated client is at `src/generated/prisma`, not `@prisma/client`. Import from there.

Heed deprecation notices in terminal output.
<!-- END:nextjs-agent-rules -->
