"use client";

import { useSearchParams } from "next/navigation";
import { CATEGORIES } from "./categories";
import type { CategoryId, Tier } from "./types";

/* Directory filters live in the URL (?cat=…&tier=…) so the sidebar,
   the search palette and shared links all agree on one state. */

export type CatFilter = CategoryId | "all";
export type TierFilter = Tier | "all";

const CAT_IDS = new Set<string>(CATEGORIES.map((c) => c.id));

export function useFilters() {
  const sp = useSearchParams();
  const rawCat = sp.get("cat");
  const rawTier = sp.get("tier");
  const cat: CatFilter =
    rawCat && CAT_IDS.has(rawCat) ? (rawCat as CategoryId) : "all";
  const tier: TierFilter =
    rawTier === "free" || rawTier === "paid" ? rawTier : "all";
  return { cat, tier };
}

export function filterHref(next: { cat?: CatFilter; tier?: TierFilter }) {
  const p = new URLSearchParams();
  if (next.cat && next.cat !== "all") p.set("cat", next.cat);
  if (next.tier && next.tier !== "all") p.set("tier", next.tier);
  const q = p.toString();
  return q ? `/?${q}` : "/";
}
