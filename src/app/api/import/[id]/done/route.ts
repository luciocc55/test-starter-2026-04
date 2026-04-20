import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const batch = await db.importBatch.findUnique({ where: { id } });
  if (!batch || batch.userId !== user.id) return new Response("Not Found", { status: 404 });
  return Response.json({
    batchId: batch.id,
    status: batch.status,
    fileName: batch.fileName,
    committedAt: batch.committedAt,
    counts: batch.counts ? JSON.parse(batch.counts) : null,
  });
}
