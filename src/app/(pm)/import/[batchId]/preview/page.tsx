import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { buildPreview } from "@/lib/import/preview";
import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { PreviewClient } from "./_client";

export default function PreviewPage({ params }: { params: Promise<{ batchId: string }> }) {
  return (
    <Suspense fallback={<div className="max-w-5xl mx-auto px-6 py-10 text-sm text-[color:var(--color-ink-soft)]">Loading preview…</div>}>
      <PreviewContent params={params} />
    </Suspense>
  );
}

async function PreviewContent({ params }: { params: Promise<{ batchId: string }> }) {
  const user = await requireUser();
  const { batchId } = await params;
  const batch = await db.importBatch.findUnique({ where: { id: batchId } });
  if (!batch || batch.userId !== user.id) notFound();
  const preview = await buildPreview(batchId);
  return <PreviewClient batchId={batchId} preview={preview} />;
}
