function escapeField(raw: unknown): string {
  if (raw === null || raw === undefined) return "";
  const s = String(raw);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function toCsv(headers: string[], rows: (string | number | null | undefined)[][]): string {
  const out: string[] = [];
  out.push(headers.map(escapeField).join(","));
  for (const row of rows) {
    out.push(row.map(escapeField).join(","));
  }
  return out.join("\r\n") + "\r\n";
}
