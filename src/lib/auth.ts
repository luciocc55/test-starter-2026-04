import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import type { User } from "@/generated/prisma/client";

export async function requireUser(): Promise<User> {
  const { userId: clerkId } = await auth();
  if (!clerkId) throw new Response("Unauthorized", { status: 401 });

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
