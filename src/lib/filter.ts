import type { Listing } from "./listings";
import { canonSubmarket } from "./listings";

export type ParsedFilter = {
  submarket: string | null;
  sfMin: number | null;
  sfMax: number | null;
  features: string[];
  subleaseOrDirect: "sublease" | "direct" | "any";
};

export type FilterResult = {
  listings: Listing[];
  relaxed: "none" | "size" | "size+features" | "all";
};

function matchOnce(listings: Listing[], f: ParsedFilter, relax: FilterResult["relaxed"]): Listing[] {
  return listings.filter((l) => {
    const canonical = canonSubmarket(f.submarket);
    if (relax === "none" || relax === "size" || relax === "size+features") {
      if (canonical && l.submarket !== canonical) return false;
    }
    if (f.subleaseOrDirect !== "any" && l.type !== f.subleaseOrDirect) return false;
    if (relax === "none") {
      if (f.sfMin != null && l.sf < f.sfMin) return false;
      if (f.sfMax != null && l.sf > f.sfMax) return false;
    }
    if (relax === "none" || relax === "size") {
      if (f.features.length > 0) {
        const listingFeatures = l.features.map((x) => x.toLowerCase());
        const hit = f.features.some((want) =>
          listingFeatures.some((have) => have.includes(want.toLowerCase()))
        );
        if (!hit) return false;
      }
    }
    return true;
  });
}

export function applyFilter(listings: Listing[], f: ParsedFilter): FilterResult {
  const levels: FilterResult["relaxed"][] = ["none", "size", "size+features", "all"];
  for (const level of levels) {
    const hits = matchOnce(listings, f, level);
    if (hits.length > 0) return { listings: hits, relaxed: level };
  }
  return { listings: [], relaxed: "all" };
}
