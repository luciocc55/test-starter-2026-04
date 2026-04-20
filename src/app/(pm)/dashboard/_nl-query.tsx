"use client";

import { useState } from "react";

interface Result {
  response: string;
  refused: boolean;
  entity: string | null;
  mode: "list" | "aggregate" | null;
  rows: Array<Record<string, unknown>>;
}

const EXAMPLES = [
  "tenants with past-due rent over $5,000",
  "vendors we paid more than $10,000 this year",
  "active leases expiring in the next 60 days",
  "work orders still open from last quarter",
];

export function NlQueryBar() {
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function submit(question: string) {
    if (!question.trim()) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/dashboard/nl-query", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ q: question }),
      });
      if (!res.ok) throw new Error(await res.text());
      setResult((await res.json()) as Result);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <form
        onSubmit={(e) => { e.preventDefault(); void submit(q); }}
        className="flex items-center bg-[color:var(--color-surface)] border border-[color:var(--color-line)] rounded-2xl shadow-[0_1px_0_rgba(0,0,0,0.02),0_12px_32px_-12px_rgba(26,24,21,0.12)] focus-within:border-[color:var(--color-accent)] transition"
      >
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          disabled={busy}
          placeholder="Ask about your portfolio…"
          className="flex-1 bg-transparent px-5 py-4 text-base outline-none placeholder:text-[color:var(--color-ink-soft)]"
        />
        <button
          type="submit"
          disabled={busy || !q.trim()}
          className="m-1.5 px-5 py-2.5 rounded-xl bg-[color:var(--color-accent)] text-white text-sm font-medium hover:bg-[color:var(--color-accent-hover)] transition disabled:opacity-50"
        >
          {busy ? "Thinking…" : "Ask"}
        </button>
      </form>

      <ul className="mt-3 flex flex-wrap gap-2">
        {EXAMPLES.map((ex) => (
          <li key={ex}>
            <button
              onClick={() => { setQ(ex); void submit(ex); }}
              disabled={busy}
              className="text-xs px-3 py-1 rounded-full border border-[color:var(--color-line)] bg-[color:var(--color-surface)] text-[color:var(--color-ink-soft)] hover:border-[color:var(--color-accent)] hover:text-[color:var(--color-ink)] transition disabled:opacity-50"
            >
              {ex}
            </button>
          </li>
        ))}
      </ul>

      {err && <div className="mt-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">{err}</div>}

      {result && (
        <div className="mt-5 border border-[color:var(--color-line)] rounded-lg bg-[color:var(--color-surface)] p-4">
          <p className="text-sm font-medium text-[color:var(--color-ink)]">{result.response}</p>
          {result.rows.length > 0 && (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-xs font-mono">
                <thead className="text-[color:var(--color-ink-soft)]">
                  <tr>
                    {Object.keys(result.rows[0]).slice(0, 6).map((k) => (
                      <th key={k} className="px-2 py-1 text-left font-normal">{k}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[color:var(--color-line)]">
                  {result.rows.slice(0, 20).map((row, i) => (
                    <tr key={i}>
                      {Object.keys(result.rows[0]).slice(0, 6).map((k) => (
                        <td key={k} className="px-2 py-1">{renderCell(row[k])}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {result.rows.length > 20 && (
                <p className="text-xs text-[color:var(--color-ink-soft)] mt-2">… {result.rows.length - 20} more not shown.</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function renderCell(v: unknown): string {
  if (v == null) return "—";
  if (typeof v === "string" || typeof v === "number") return String(v);
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "object") return JSON.stringify(v).slice(0, 60);
  return String(v);
}
