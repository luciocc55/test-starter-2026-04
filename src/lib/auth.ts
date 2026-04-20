import { connection } from "next/server";
import { db } from "@/lib/db";
import type { User } from "@/generated/prisma/client";

const DEMO_CLERK_ID = "demo-user";
const DEMO_EMAIL = "demo@example.com";

export async function requireUser(): Promise<User> {
  await connection();
  return db.user.upsert({
    where: { clerkId: DEMO_CLERK_ID },
    create: { clerkId: DEMO_CLERK_ID, email: DEMO_EMAIL },
    update: {},
  });
}
