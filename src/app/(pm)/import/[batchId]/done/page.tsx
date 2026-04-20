import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";

export default function DonePage({ params }: { params: Promise<{ batchId: string }> }) {
  return (
    <Suspense fallback={<div className="max-w-3xl mx-auto px-6 py-16 text-center text-sm text-[color:var(--color-ink-soft)]">Loading…</div>}>
      <DoneContent params={params} />
    </Suspense>
  );
}

async function DoneContent({ params }: { params: Promise<{ batchId: string }> }) {
  const user = await requireUser();
  const { batchId } = await params;
  const batch = await db.importBatch.findUnique({ where: { id: batchId } });
  if (!batch || batch.userId !== user.id) notFound();

  const counts = batch.counts ? JSON.parse(batch.counts) : {};
  const totals = Object.fromEntries(
    Object.entries(counts as Record<string, { total?: number }>).map(([k, v]) => [k, v.total ?? 0]),
  );

  const totalRows = Object.values(totals).reduce((s: number, v) => s + (v as number), 0);

  return (
    <section className="max-w-3xl mx-auto px-6 py-16 text-center">
      <div className="text-5xl mb-4">✓</div>
      <h1 className="font-display text-3xl text-[color:var(--color-ink)] mb-2">
        Imported {totalRows} rows
      </h1>
      <p className="text-sm text-[color:var(--color-ink-soft)] mb-8">
        {batch.fileName} · committed {batch.committedAt ? new Date(batch.committedAt).toLocaleString() : ""}
      </p>

      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mb-10">
        {Object.entries(totals).map(([k, v]) => (
          <div key={k} className="border border-[color:var(--color-line)] rounded-lg p-3 bg-[color:var(--color-surface)]">
            <div className="text-xl font-display text-[color:var(--color-ink)]">{v as number}</div>
            <div className="text-xs uppercase tracking-wider text-[color:var(--color-ink-soft)] mt-1">{k}</div>
          </div>
        ))}
      </div>

      <div className="flex justify-center gap-4 text-sm">
        <Link className="text-[color:var(--color-accent)] hover:underline" href="/tenants">
          View tenants →
        </Link>
        <Link className="text-[color:var(--color-accent)] hover:underline" href="/leases">
          View leases →
        </Link>
        <Link className="text-[color:var(--color-accent)] hover:underline" href="/flagged">
          View flagged rows →
        </Link>
      </div>
    </section>
  );
}
