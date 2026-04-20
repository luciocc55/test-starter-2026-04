import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { runNlQuery } from "@/lib/dashboard/nl-query";

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  const user = await requireUser();
  const body = (await req.json().catch(() => ({}))) as { q?: string };
  const q = typeof body.q === "string" ? body.q : "";
  const result = await runNlQuery(q, user.id);
  return Response.json(result);
}
