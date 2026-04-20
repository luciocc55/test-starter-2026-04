import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { commitImport, type ClusterDecision } from "@/lib/import/commit";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireUser();
  const { id } = await params;
  const batch = await db.importBatch.findUnique({ where: { id } });
  if (!batch || batch.userId !== user.id) return new Response("Not Found", { status: 404 });
  if (batch.status !== "ready") {
    return Response.json({ error: "not_ready", status: batch.status }, { status: 409 });
  }
  const body = (await req.json()) as { clusterDecisions?: ClusterDecision[] };
  await commitImport(id, user.id, body.clusterDecisions ?? []);
  return Response.json({ ok: true });
}
