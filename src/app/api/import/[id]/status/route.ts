import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const batch = await db.importBatch.findUnique({ where: { id } });
  if (!batch || batch.userId !== user.id) return new Response("Not Found", { status: 404 });
  return Response.json({
    batchId: batch.id,
    status: batch.status,
    parsedAt: batch.parsedAt,
    committedAt: batch.committedAt,
    errorMessage: batch.errorMessage,
  });
}
