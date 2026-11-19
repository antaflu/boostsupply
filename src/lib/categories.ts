import type { Category } from "./types";

export const CATEGORIES: Category[] = [
  {
    id: "announcement",
    label: "Announcement",
    blurb: "Bars, tickers & banners",
  },
  {
    id: "social-proof",
    label: "Social proof",
    blurb: "Reviews, logos & trust",
  },
  {
    id: "product-page",
    label: "Product page",
    blurb: "PDP conversion boosters",
  },
  { id: "cart", label: "Cart", blurb: "AOV & checkout nudges" },
  { id: "homepage", label: "Homepage", blurb: "Hero & landing sections" },
  { id: "urgency", label: "Urgency", blurb: "Scarcity & countdowns" },
];

export const categoryLabel = (id: string) =>
  CATEGORIES.find((c) => c.id === id)?.label ?? id;
