"use client";

import Link from "next/link";
import type { Tweak } from "@/lib/types";
import { categoryLabel } from "@/lib/categories";
import { CardStage, type CardMode } from "./CardStage";
import { useAuth } from "@/lib/auth";
import { pushRecent } from "@/lib/recent";
import { InspiredBy } from "@/lib/brands";

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
  "upsell-cart": "panel",
  "bundle-buy-box": "panel",
  "fit-reviews": "panel",
  "award-shelf": "frame",
  "flavor-carousel": "frame",
  "product-ladder": "frame",
  "results-timeline": "frame",
  "gift-value-stack": "panel",
  "finish-configurator": "panel",
  "addon-configurator": "panel",
  "product-chooser": "frame",
  "value-chart": "panel",
  "set-builder": "panel",
  "quick-add-grid": "frame",
  "plan-compare": "frame",
  "dose-compare": "panel",
  "subscribe-buy-box": "panel",
  "ritual-steps": "frame",
  "guarantee-band": "frame",
  "bag-drawer": "panel",
  "shade-card-grid": "frame",
  "ugc-review-wall": "frame",
  "impact-label": "frame",
  "model-compare": "frame",
  "carry-bundle": "panel",
  "vs-leather": "panel",
  "recipe-cards": "frame",
  "set-tiers": "panel",
  "clinical-stats": "frame",
  "fit-finder": "panel",
  "shade-buy-box": "frame",
  "pdp-intimates": "frame",
  "ingredient-explorer": "frame",
  "refill-flow": "frame",
  "size-predictor": "panel",
  "pdp-apparel": "frame",
  "complete-the-look": "frame",
  "drop-waitlist": "frame",
  "routine-builder": "frame",
  "pack-builder": "panel",
  "sugar-compare": "panel",
  "flavor-quiz": "panel",
  "feature-tabs": "frame",
  "membership-pricing": "panel",
  // icon-feature-bar, logo-slider, sticky-add-to-cart → "frame"
};

export const cardModeFor = (slug: string): CardMode =>
  CARD_MODE[slug] ?? "frame";

export function TweakCard({ tweak, index = 0 }: { tweak: Tweak; index?: number }) {
  const { hasPurchased, user, hydrated, openAuth } = useAuth();
  const href = `/tweak/${tweak.slug}`;
  const owned = tweak.tier === "free" || hasPurchased(tweak.slug);

  return (
    /* The card is a plain block with one stretched link on top. Previews
       may contain their own links ("Shop all", "View style"), and an <a>
       inside an <a> is invalid HTML that breaks hydration. */
    <div
      className="bs-card-in group relative flex flex-col rounded-[30px]"
      style={{ "--i": index } as React.CSSProperties}
    >
      {/* Preview block: lifts, darkens a touch, preview eases in */}
      <div className="relative isolate h-[min(72svh,600px)] min-h-[440px] overflow-hidden rounded-[28px] bg-surface-2 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.025)] transition-[transform,translate,scale,background-color,box-shadow] duration-500 ease-[var(--ease)] group-hover:-translate-y-1 group-hover:bg-[#f0f0f0] group-hover:shadow-[inset_0_0_0_1px_rgba(0,0,0,0.03),var(--shadow-hover)] group-has-[a:focus-visible]:shadow-[0_0_0_2px_var(--focus)] group-active:translate-y-0 group-active:scale-[0.995] sm:h-[560px] lg:h-[620px]">
        <div className="absolute inset-0 flex items-center-safe justify-center overflow-hidden transition-transform duration-700 ease-[var(--ease)] group-hover:scale-[1.025]">
          <CardStage
            mode={cardModeFor(tweak.slug)}
            Preview={tweak.Preview}
            config={tweak.defaults}
          />
        </div>

        {/* Brand it's modeled on */}
        {tweak.inspiredBy && (
          <div className="absolute left-3.5 top-3.5 z-10">
            <InspiredBy id={tweak.inspiredBy} />
          </div>
        )}

        {/* Tier badge */}
        <div className="absolute right-3.5 top-3.5 z-10">
          {tweak.tier === "free" ? (
            <Badge>Free</Badge>
          ) : owned ? (
            <Badge dark>Unlocked</Badge>
          ) : (
            <Badge>${tweak.price}</Badge>
          )}
        </div>

        {/* "Customize" pill rises in on hover */}
        <div className="pointer-events-none absolute bottom-3.5 right-3.5 z-10 flex translate-y-2 items-center gap-1 rounded-full bg-ink py-1.5 pl-3 pr-2.5 text-[12.5px] font-medium text-white opacity-0 shadow-[0_6px_16px_-6px_rgba(0,0,0,0.45)] transition-[opacity,transform,translate,scale] duration-300 ease-[var(--ease)] group-hover:translate-y-0 group-hover:opacity-100">
          Customize
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden>
            <path
              d="M6 3.5L10.5 8 6 12.5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>

      {/* Title + description */}
      <div className="px-1 pt-4">
        <p className="text-[12.5px] text-ink-4">{categoryLabel(tweak.category)}</p>
        <h3 className="mt-0.5 flex items-center gap-1.5 text-[18px] font-semibold leading-snug tracking-[-0.015em] sm:text-[19px]">
          {tweak.name}
          <svg
            width="14"
            height="14"
            viewBox="0 0 16 16"
            fill="none"
            aria-hidden
            className="-translate-x-1 text-ink-3 opacity-0 transition-[opacity,transform,translate,scale] duration-300 ease-[var(--ease)] group-hover:translate-x-0 group-hover:opacity-100"
          >
            <path
              d="M3 8h10M9 4l4 4-4 4"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </h3>
        <p className="mt-1 max-w-[560px] text-[14px] leading-relaxed text-ink-3 sm:text-[14.5px]">
          {tweak.tagline}
        </p>
      </div>

      <Link
        href={href}
        aria-label={`${tweak.name}: customize`}
        onClick={(e) => {
          pushRecent(tweak.slug);
          /* signed out: show the login wall right here, so closing it keeps
             the visitor where they were in the grid */
          if (hydrated && !user) {
            e.preventDefault();
            openAuth(undefined, href);
          }
        }}
        className="absolute inset-0 z-20 rounded-[30px] outline-none"
      />
    </div>
  );
}

function Badge({
  children,
  dark = false,
}: {
  children: React.ReactNode;
  dark?: boolean;
}) {
  return (
    <span
      className={`inline-flex h-6 items-center rounded-full px-2.5 text-[11.5px] font-semibold ${
        dark
          ? "bg-ink text-white"
          : "bg-surface text-ink shadow-[0_0_0_1px_var(--border),0_1px_2px_rgba(0,0,0,0.04)]"
      }`}
    >
      {children}
    </span>
  );
}
