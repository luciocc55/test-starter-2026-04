// Parse a date string in MM/DD/YYYY or YYYY-MM-DD format.
// Returns null for unparseable input.
export function parseDate(raw: string): Date | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // ISO: YYYY-MM-DD
  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const [, y, m, d] = isoMatch;
    const date = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)));
    return isNaN(date.getTime()) ? null : date;
  }

  // US: MM/DD/YYYY or M/D/YYYY
  const usMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (usMatch) {
    const [, m, d, y] = usMatch;
    const date = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)));
    return isNaN(date.getTime()) ? null : date;
  }

  return null;
}

// RFC-5322-lite email shape check.
export function isValidEmail(raw: string): boolean {
  if (!raw) return false;
  const trimmed = raw.trim();
  if (!trimmed) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
}

// Parse a numeric string. Returns null if not a finite number.
export function parseNumber(raw: string): number | null {
  if (raw == null) return null;
  const trimmed = String(raw).trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

export function parseInteger(raw: string): number | null {
  const n = parseNumber(raw);
  if (n === null) return null;
  return Number.isInteger(n) ? n : Math.trunc(n);
}
