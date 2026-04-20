import { requireUser } from "@/lib/auth";
import { getRentRoll } from "@/lib/dashboard/rent-roll";
import { toCsv } from "@/lib/dashboard/csv";

export async function GET() {
  const user = await requireUser();
  const rows = await getRentRoll(user.id);

  const headers = ["tenant", "unit", "monthly_rent", "start_date", "end_date", "status", "outstanding"];
  const body = toCsv(
    headers,
    rows.map((r) => [
      r.tenantName,
      r.unitLabel,
      r.monthlyRent,
      r.startDate.toISOString().slice(0, 10),
      r.endDate.toISOString().slice(0, 10),
      r.status,
      (r.outstandingCents / 100).toFixed(2),
    ]),
  );

  const today = new Date().toISOString().slice(0, 10);
  return new Response(body, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="rent-roll-${today}.csv"`,
    },
  });
}
