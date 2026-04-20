import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import type { User } from "@/generated/prisma/client";

const DEMO_CLERK_ID = "demo-user";
const DEMO_EMAIL = "demo@example.com";

export async function requireUser(): Promise<User> {
  const { userId: clerkId } = await auth();

  if (!clerkId) {
    return db.user.upsert({
      where: { clerkId: DEMO_CLERK_ID },
      create: { clerkId: DEMO_CLERK_ID, email: DEMO_EMAIL },
      update: {},
    });
  }

  const clerkUser = await currentUser();
  if (!clerkUser) throw new Response("Unauthorized", { status: 401 });

  const email = clerkUser.emailAddresses[0]?.emailAddress;
  if (!email) throw new Response("User has no email address", { status: 400 });

  return db.user.upsert({
    where: { clerkId },
    create: { clerkId, email },
    update: { email },
  });
}
