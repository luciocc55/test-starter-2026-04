export function formatSf(sf: number): string {
  return `${sf.toLocaleString("en-US")} SF`;
}

export function formatPricePerSf(ppsf: number): string {
  return `$${ppsf}/SF`;
}

export function formatMonthly(sf: number, ppsf: number): string {
  const monthly = Math.round((sf * ppsf) / 12);
  return `$${monthly.toLocaleString("en-US")}/mo`;
}
