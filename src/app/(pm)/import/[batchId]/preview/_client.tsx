"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Preview {
  batchId: string;
  fileName: string;
  status: string;
  counts: Record<string, Record<string, number>> | null;
  flagged: Record<string, { rowNumber: number | null; externalId: string | null }[]>;
  fuzzyClusters: { clusterId: string; variants: string[]; canonical: string; defaultMerge: boolean }[];
}

export function PreviewClient({ batchId, preview }: { batchId: string; preview: Preview }) {
  const router = useRouter();
  const [committing, setCommitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [decisions, setDecisions] = useState(() =>
    Object.fromEntries(
      preview.fuzzyClusters.map((c) => [c.clusterId, { merge: c.defaultMerge, canonical: c.canonical }]),
    ),
  );

  const total = preview.counts
    ? Object.values(preview.counts).reduce((s, c) => s + (c.total ?? 0), 0)
    : 0;

  async function commit() {
    setCommitting(true);
    setErr(null);
    try {
      const res = await fetch(`/api/import/${batchId}/commit`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          clusterDecisions: Object.entries(decisions).map(([clusterId, v]) => ({
            clusterId,
            merge: v.merge,
            canonical: v.canonical,
          })),
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      router.push(`/import/${batchId}/done`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setCommitting(false);
    }
  }

  return (
    <section className="max-w-5xl mx-auto px-6 py-10">
      <header className="mb-6">
        <h1 className="font-display text-3xl text-[color:var(--color-ink)]">
          Preview import
        </h1>
        <p className="text-sm text-[color:var(--color-ink-soft)] mt-1">
          File: {preview.fileName} · Status: {preview.status}
        </p>
      </header>

      {preview.counts && (
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mb-8">
          {Object.entries(preview.counts).map(([entity, c]) => (
            <div
              key={entity}
              className="bg-[color:var(--color-surface)] border border-[color:var(--color-line)] rounded-lg p-4 text-center"
            >
              <div className="text-2xl font-display text-[color:var(--color-ink)]">{c.total ?? 0}</div>
              <div className="text-xs uppercase tracking-wider text-[color:var(--color-ink-soft)] mt-1">
                {entity}
              </div>
            </div>
          ))}
        </div>
      )}

      {preview.fuzzyClusters.length > 0 && (
        <div className="mb-8">
          <h2 className="text-sm uppercase tracking-widest text-[color:var(--color-ink-soft)] mb-3">
            Probable duplicate buildings
          </h2>
          <div className="space-y-3">
            {preview.fuzzyClusters.map((c) => {
              const d = decisions[c.clusterId] ?? { merge: c.defaultMerge, canonical: c.canonical };
              return (
                <div
                  key={c.clusterId}
                  className="border border-[color:var(--color-line)] rounded-lg bg-[color:var(--color-surface)] p-4"
                >
                  <ul className="text-sm text-[color:var(--color-ink)] mb-3">
                    {c.variants.map((v) => (
                      <li key={v} className="before:content-['•_'] before:text-[color:var(--color-ink-soft)]">
                        {v}
                      </li>
                    ))}
                  </ul>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={d.merge}
                      onChange={(e) =>
                        setDecisions({ ...decisions, [c.clusterId]: { ...d, merge: e.target.checked } })
                      }
                    />
                    <span>
                      Merge into <input
                        value={d.canonical}
                        onChange={(e) =>
                          setDecisions({ ...decisions, [c.clusterId]: { ...d, canonical: e.target.value } })
                        }
                        className="bg-[color:var(--color-muted)] px-2 py-0.5 rounded border border-[color:var(--color-line)]"
                      />
                    </span>
                  </label>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="mb-8">
        <h2 className="text-sm uppercase tracking-widest text-[color:var(--color-ink-soft)] mb-3">
          Flagged rows
        </h2>
        <div className="space-y-2">
          {Object.entries(preview.flagged).map(([key, rows]) => (
            <details
              key={key}
              className="border border-[color:var(--color-line)] rounded-lg bg-[color:var(--color-surface)] p-3"
              open={rows.length > 0}
            >
              <summary className="cursor-pointer text-sm">
                <span className="font-medium text-[color:var(--color-ink)]">{humanize(key)}</span>{" "}
                <span className="text-[color:var(--color-ink-soft)]">({rows.length})</span>
              </summary>
              <p className="mt-2 text-xs text-[color:var(--color-ink-soft)] italic">
                <span className="font-medium text-[color:var(--color-ink)] not-italic">On commit: </span>
                {FLAG_COMMIT_BEHAVIOR[key] ?? "Imported as-is; flag preserved for review."}
              </p>
              {rows.length > 0 && (
                <ul className="mt-2 text-xs text-[color:var(--color-ink-soft)] font-mono">
                  {rows.map((r, i) => (
                    <li key={`${key}-${i}-${r.externalId}`}>
                      row {r.rowNumber} · {r.externalId}
                    </li>
                  ))}
                </ul>
              )}
            </details>
          ))}
        </div>
      </div>

      <div className="flex gap-3 items-center sticky bottom-0 bg-[color:var(--color-background)] py-4 border-t border-[color:var(--color-line)]">
        <button
          disabled={committing}
          onClick={commit}
          className="px-5 py-2.5 rounded-xl bg-[color:var(--color-accent)] text-white text-sm font-medium hover:bg-[color:var(--color-accent-hover)] disabled:opacity-50"
        >
          {committing ? "Committing…" : `Commit ${total} rows`}
        </button>
        <a href="/import" className="text-sm text-[color:var(--color-ink-soft)] hover:text-[color:var(--color-ink)]">
          Cancel
        </a>
        {err && <span className="text-xs text-red-600">{err}</span>}
      </div>
    </section>
  );
}

function humanize(key: string) {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (c) => c.toUpperCase())
    .trim();
}

const FLAG_COMMIT_BEHAVIOR: Record<string, string> = {
  duplicateEmails:
    "We merge on email — the newest row's fields overwrite the older ones. All Buildium tenant IDs still resolve to the merged tenant via TenantExternalRef, so downstream leases keep linking correctly.",
  malformedEmails:
    "Imported with email set to null. Other fields (name, phone, DOB, status) kept intact. Fix the email manually in the Tenants view later.",
  missingPhone:
    "Imported as-is. The phone column will be null on the Tenant row. Nothing else changes.",
  dobParseFail:
    "Imported with dateOfBirth set to null. The raw unparsed string stays in the staging row for audit.",
  negativeSqft:
    "Imported as-is (negative value preserved). Flagged in the Units view so you can correct it later — we don't silently clamp to zero.",
  orphanLeasesByTenant:
    "Imported with tenantId = null and importStatus = 'orphan_tenant'. Visible in the Flagged view; the dashboard's main rent roll filters orphans out by default.",
  orphanLeasesByUnit:
    "Imported with unitId = null and importStatus = 'orphan_unit'. Same handling as the tenant case.",
  endBeforeStart:
    "Imported as-is with both dates preserved. Flagged so you can correct the lease later. We don't guess or swap dates for you.",
  overlappingLeases:
    "All overlapping leases imported (overlaps are valid history — reassignments, early terminations, gap-year moves). Flagged for review.",
  orphanCharges:
    "Imported with leaseId = null and importStatus = 'orphan_lease'. Stays visible in the Charges list; AR aging excludes orphans by default.",
  negativeCharges:
    "Imported with the negative amount preserved (often legitimate credits or refunds). Flagged so accounting can verify.",
  orphanPayments:
    "Imported with leaseId = null and importStatus = 'orphan_lease'. Flagged; excluded from tenant-level payment history until linked.",
  zeroPayments:
    "Imported as-is with amount = 0 (often posting adjustments or reversals). Flagged for review.",
  splitPayments:
    "All rows imported as separate Payment records sharing a generated splitPaymentGroupId, so the dashboard can group them visually without collapsing the underlying ledger.",
  orphanWorkOrders:
    "Imported with unitId = null and importStatus = 'orphan_unit'. Flagged.",
  negativeWorkOrderCost:
    "Imported with the negative cost preserved. Flagged for review.",
};
