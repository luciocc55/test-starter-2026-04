import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { buildPreview } from "@/lib/import/preview";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const batch = await db.importBatch.findUnique({ where: { id } });
  if (!batch || batch.userId !== user.id) return new Response("Not Found", { status: 404 });
  const preview = await buildPreview(id);
  return Response.json(preview);
}
