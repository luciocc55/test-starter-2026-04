import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

export default function TenantsPage() {
  return (
    <Suspense fallback={<div className="max-w-5xl mx-auto px-6 py-10 text-sm text-[color:var(--color-ink-soft)]">Loading tenants…</div>}>
      <TenantsContent />
    </Suspense>
  );
}

async function TenantsContent() {
  const user = await requireUser();
  const tenants = await db.tenant.findMany({
    where: { userId: user.id },
    orderBy: { lastName: "asc" },
    take: 200,
  });
  return (
    <section className="max-w-5xl mx-auto px-6 py-10">
      <h1 className="font-display text-3xl mb-6">Tenants ({tenants.length})</h1>
      <table className="w-full text-sm border border-[color:var(--color-line)] bg-[color:var(--color-surface)] rounded-lg overflow-hidden">
        <thead className="bg-[color:var(--color-muted)]">
          <tr className="text-left">
            <th className="px-4 py-2">Name</th>
            <th className="px-4 py-2">Email</th>
            <th className="px-4 py-2">Phone</th>
            <th className="px-4 py-2">Status</th>
            <th className="px-4 py-2">Flag</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[color:var(--color-line)]">
          {tenants.map((t) => (
            <tr key={t.id}>
              <td className="px-4 py-2">{t.lastName}, {t.firstName}</td>
              <td className="px-4 py-2">{t.email ?? "—"}</td>
              <td className="px-4 py-2">{t.phone ?? "—"}</td>
              <td className="px-4 py-2">{t.status}</td>
              <td className="px-4 py-2 text-xs text-[color:var(--color-ink-soft)]">{t.importStatus ?? ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
