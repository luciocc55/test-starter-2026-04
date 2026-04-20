import { requireUser } from "@/lib/auth";
import { getArAging } from "@/lib/dashboard/ar-aging";
import { ArAgingView } from "./_ar-aging-view";

export async function ArAging() {
  const user = await requireUser();
  const buckets = await getArAging(user.id);
  return (
    <div className="border border-[color:var(--color-line)] rounded-lg bg-[color:var(--color-surface)]">
      <div className="px-6 py-4 border-b border-[color:var(--color-line)]">
        <h2 className="font-display text-xl text-[color:var(--color-ink)]">AR aging</h2>
        <p className="text-xs text-[color:var(--color-ink-soft)] mt-0.5">
          Outstanding balance by age, grouped per tenant.
        </p>
      </div>
      <ArAgingView buckets={buckets} />
    </div>
  );
}
