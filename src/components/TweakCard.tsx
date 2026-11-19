"use client";

import Link from "next/link";
import type { Tweak } from "@/lib/types";
import { categoryLabel } from "@/lib/categories";
import { CardStage, type CardMode } from "./CardStage";
import { useAuth } from "@/lib/auth";

/* How each section is best presented in its card. Curated per tweak so
   every card pops without ever cropping something important. */
const CARD_MODE: Record<string, CardMode> = {
  "announcement-ticker": "zoom",
  "countdown-bar": "zoom",
  "trust-badge-bar": "zoom",
  "free-shipping-bar": "zoom",
  "usp-grid": "panel",
  "faq-accordion": "panel",
  "comparison-table": "panel",
  "review-slider": "panel",
  // icon-feature-bar, logo-slider, sticky-add-to-cart → "frame"
};

export function TweakCard({ tweak }: { tweak: Tweak }) {
  const { hasPurchased } = useAuth();
  const owned = tweak.tier === "free" || hasPurchased(tweak.slug);
  const mode = CARD_MODE[tweak.slug] ?? "frame";

  return (
    <Link href={`/tweak/${tweak.slug}`} className="group flex flex-col">
      <div className="relative">
        {/* Grey block — subtly darkens on hover */}
        <div className="relative h-[336px] flex items-center justify-center overflow-hidden rounded-[28px] bg-surface-2 transition-colors duration-300 ease-[var(--ease)] group-hover:bg-surface-3">
          <CardStage mode={mode} Preview={tweak.Preview} config={tweak.defaults} />

          {/* Tier badge */}
          <div className="absolute top-3.5 right-3.5 z-10">
          {tweak.tier === "free" ? (
            <span className="px-2.5 py-1 rounded-full bg-surface/90 backdrop-blur text-[11px] font-semibold text-ink border border-border">
              Free
            </span>
          ) : owned ? (
            <span className="px-2.5 py-1 rounded-full bg-ink text-surface text-[11px] font-semibold">
              Unlocked
            </span>
          ) : (
            <span className="px-2.5 py-1 rounded-full bg-surface/90 backdrop-blur text-[11px] font-semibold text-ink border border-border">
              ${tweak.price}
            </span>
          )}
          </div>
        </div>
      </div>

      {/* Title + description below, left-aligned */}
      <div className="pt-5 px-1">
        <p className="text-[11px] font-medium uppercase tracking-wider text-ink-4">
          {categoryLabel(tweak.category)}
        </p>
        <h3 className="mt-1.5 text-[19px] font-semibold tracking-tight leading-snug">
          {tweak.name}
        </h3>
        <p className="mt-2 text-[14px] text-ink-3 leading-relaxed max-w-[420px]">
          {tweak.tagline}
        </p>
        <span className="mt-3 inline-flex items-center gap-1 text-[13px] font-medium text-ink underline decoration-border-strong underline-offset-4 group-hover:decoration-ink transition-colors">
          Customize
          <svg
            className="transition-transform group-hover:translate-x-0.5"
            width="13"
            height="13"
            viewBox="0 0 16 16"
            fill="none"
          >
            <path
              d="M6 3.5L10.5 8 6 12.5"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </div>
    </Link>
  );
}
