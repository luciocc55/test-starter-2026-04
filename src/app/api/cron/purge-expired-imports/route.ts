import { db } from "@/lib/db";

const PAGE_SIZE = 500;

export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  let totalDeleted = 0;
  while (true) {
    const expired = await db.importBatch.findMany({
      where: { expiresAt: { lt: new Date() } },
      select: { id: true },
      take: PAGE_SIZE,
    });
    if (expired.length === 0) break;
    const ids = expired.map((b) => b.id);
    const { count } = await db.importBatch.deleteMany({ where: { id: { in: ids } } });
    totalDeleted += count;
  }

  return Response.json({ deleted: totalDeleted });
}
