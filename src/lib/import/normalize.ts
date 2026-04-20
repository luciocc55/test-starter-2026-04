const STREET_SUFFIX_MAP: Record<string, string> = {
  st: "street",
  ave: "avenue",
  blvd: "boulevard",
  rd: "road",
  ln: "lane",
  dr: "drive",
  ct: "court",
  pl: "place",
  pkwy: "parkway",
};

export function normalizePropertyName(raw: string): string {
  const lower = raw.toLowerCase();
  const noPunct = lower.replace(/[.,]/g, "");
  const collapsed = noPunct.replace(/\s+/g, " ").trim();
  const tokens = collapsed.split(" ").map((tok) => STREET_SUFFIX_MAP[tok] ?? tok);
  return tokens.join(" ");
}

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const prev = new Array<number>(b.length + 1);
  const curr = new Array<number>(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;
  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    for (let j = 0; j <= b.length; j++) prev[j] = curr[j];
  }
  return prev[b.length];
}

export interface FuzzyCluster {
  clusterId: string;
  variants: string[];      // original raw strings
  canonical: string;       // most expanded variant (longest)
  defaultMerge: boolean;   // true by default
}

/**
 * Cluster raw property names into groups of probable duplicates.
 * Exact-match on normalized name first; then merge near-neighbors (Levenshtein ≤ 2)
 * only when the leading numeric token matches.
 */
export function clusterPropertyNames(rawNames: string[]): FuzzyCluster[] {
  const unique = Array.from(new Set(rawNames));
  const byNorm = new Map<string, string[]>();
  for (const raw of unique) {
    const n = normalizePropertyName(raw);
    if (!byNorm.has(n)) byNorm.set(n, []);
    byNorm.get(n)!.push(raw);
  }

  // Start with exact-normalized groups.
  const groups: { key: string; variants: string[] }[] = [];
  for (const [key, variants] of byNorm) groups.push({ key, variants });

  // Merge near-neighbor groups with matching leading number.
  const merged: typeof groups = [];
  const used = new Set<number>();
  for (let i = 0; i < groups.length; i++) {
    if (used.has(i)) continue;
    const combined = { ...groups[i], variants: [...groups[i].variants] };
    for (let j = i + 1; j < groups.length; j++) {
      if (used.has(j)) continue;
      if (leadingNumber(combined.key) !== leadingNumber(groups[j].key)) continue;
      if (levenshtein(combined.key, groups[j].key) <= 2) {
        combined.variants.push(...groups[j].variants);
        used.add(j);
      }
    }
    merged.push(combined);
  }

  return merged
    .filter((g) => g.variants.length >= 2)
    .map((g, idx) => {
      const canonical = g.variants.reduce((a, b) => (b.length > a.length ? b : a), g.variants[0]);
      return {
        clusterId: `cluster_${idx}`,
        variants: g.variants,
        canonical,
        defaultMerge: true,
      };
    });
}

function leadingNumber(s: string): string | null {
  const m = s.match(/^\d+/);
  return m ? m[0] : null;
}
