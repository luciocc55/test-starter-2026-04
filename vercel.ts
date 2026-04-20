import { type VercelConfig } from "@vercel/config/v1";

export const config: VercelConfig = {
  buildCommand: "npm run build",
  framework: "nextjs",
  crons: [
    { path: "/api/cron/purge-expired-imports", schedule: "0 3 * * *" },
  ],
};
