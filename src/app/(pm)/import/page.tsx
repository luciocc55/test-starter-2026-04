import { Suspense } from "react";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { ImportDropzone } from "./_dropzone";

export default function ImportLanding() {
  return (
    <section className="max-w-3xl mx-auto px-6 py-12">
      <h1 className="font-display text-4xl tracking-tight text-[color:var(--color-ink)] mb-2">
        Import from Buildium
      </h1>
      <p className="text-[color:var(--color-ink-soft)] mb-8">
        Drop your Buildium export ZIP below, or try with sample data. Max 20 MB.
      </p>

      <ImportDropzone />

      <Suspense fallback={null}>
        <RecentImports />
      </Suspense>
    </section>
  );
}

async function RecentImports() {
  const user = await requireUser();
  const recentImports = await db.importBatch.findMany({
    where: { userId: user.id },
    orderBy: { uploadedAt: "desc" },
    take: 10,
  });

  if (recentImports.length === 0) return null;

  return (
    <div className="mt-12">
      <h2 className="text-sm uppercase tracking-widest text-[color:var(--color-ink-soft)] mb-3">
        Recent imports
      </h2>
      <ul className="divide-y divide-[color:var(--color-line)] border border-[color:var(--color-line)] rounded-xl bg-[color:var(--color-surface)]">
        {recentImports.map((b) => {
          const href = b.status === "committed" ? `/import/${b.id}/done` : `/import/${b.id}/preview`;
          return (
            <li key={b.id} className="px-4 py-3 flex items-center justify-between">
              <div>
                <div className="text-sm text-[color:var(--color-ink)]">{b.fileName}</div>
                <div className="text-xs text-[color:var(--color-ink-soft)]">
                  {new Date(b.uploadedAt).toLocaleString()} · {b.status}
                </div>
              </div>
              <Link className="text-sm text-[color:var(--color-accent)]" href={href}>
                View →
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
