"use client";

import { Suspense, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { TweakCard } from "@/components/TweakCard";
import { TWEAKS } from "@/lib/registry";
import { CATEGORIES } from "@/lib/categories";
import { filterHref, useFilters, type CatFilter } from "@/lib/filters";
import { useGlide } from "@/lib/useGlide";
import { ClaudeConnect } from "@/components/ClaudeConnect";

export default function Home() {
  return (
    <AppShell>
      <Suspense fallback={null}>
        <Directory />
      </Suspense>
    </AppShell>
  );
}

function Directory() {
  const { cat, tier } = useFilters();

  const filtered = useMemo(
    () =>
      TWEAKS.filter(
        (t) =>
          (cat === "all" || t.category === cat) &&
          (tier === "all" || t.tier === tier),
      ),
    [cat, tier],
  );

  const title =
    cat === "all"
      ? "All sections"
      : (CATEGORIES.find((c) => c.id === cat)?.label ?? "Sections");
  const blurb = CATEGORIES.find((c) => c.id === cat)?.blurb;

  return (
    <div className="mx-auto w-full max-w-[1180px] px-4 pb-24 pt-4 sm:px-8 sm:pt-8">
      <Hero />

      {/* Mobile category chips (desktop uses the sidebar) */}
      <MobileChips cat={cat} tier={tier} />

      <div
        id="grid"
        className="mb-6 mt-8 flex scroll-mt-6 items-end justify-between gap-4 sm:mt-12"
      >
        <div>
          <h2
            key={title}
            className="bs-fade-up text-[22px] font-semibold leading-7 tracking-[-0.02em]"
          >
            {title}
          </h2>
          <p className="mt-1 text-[13.5px] text-ink-3">
            {filtered.length} section{filtered.length === 1 ? "" : "s"}
            {tier !== "all" && (
              <> · {tier === "free" ? "free" : "premium"} only</>
            )}
            {blurb && <> · {blurb}</>}
          </p>
        </div>
        {(cat !== "all" || tier !== "all") && (
          <Link
            href="/"
            scroll={false}
            className="bs-btn bs-btn-sm bs-btn-ghost shrink-0 text-ink-3"
          >
            Clear filters
          </Link>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="bs-fade-up grid place-items-center rounded-[24px] bg-surface-2 px-6 py-20 text-center">
          <p className="text-[15px] font-medium">Nothing here yet</p>
          <p className="mt-1 text-[13.5px] text-ink-3">
            No {tier === "free" ? "free" : "premium"} sections in this
            category. More are on the way.
          </p>
          <Link
            href={filterHref({ cat, tier: "all" })}
            scroll={false}
            className="bs-btn bs-btn-sm bs-btn-secondary mt-5"
          >
            Show all pricing
          </Link>
        </div>
      ) : (
        <div
          key={`${cat}-${tier}`}
          className="grid grid-cols-1 gap-y-12 sm:gap-y-14"
        >
          {filtered.map((t, i) => (
            <TweakCard key={t.slug} tweak={t} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}

function Hero() {
  const freeCount = TWEAKS.filter((t) => t.tier === "free").length;

  return (
    <section className="bs-fade-up relative flex min-h-[380px] items-center justify-center overflow-hidden rounded-[24px] sm:min-h-[420px]">
      <Image
        src="/hero.png"
        alt=""
        fill
        priority
        sizes="(max-width: 1024px) 100vw, 1180px"
        className="object-cover object-center"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-black/10 via-black/45 to-black/10" />

      <div className="relative mx-auto w-full max-w-[720px] px-6 py-12 text-center md:px-12">
        <h1 className="text-[30px] font-normal leading-[1.1] tracking-[-0.025em] text-white [text-shadow:0_2px_30px_rgba(0,0,0,0.35)] md:text-[46px]">
          Beautifully designed Shopify sections that convert
        </h1>
        <p className="mx-auto mt-4 max-w-[540px] text-[15px] leading-relaxed text-white/85 [text-shadow:0_1px_18px_rgba(0,0,0,0.3)] md:text-base">
          A growing library of plug-and-play Liquid sections. Restyle them to
          your brand and lift conversion, AOV and UX without paying a
          developer.
        </p>
        <ClaudeConnect className="mt-7" />

        <div className="mt-5 flex flex-col items-center justify-center gap-x-2.5 gap-y-1.5 text-[13px] text-white/75 sm:flex-row sm:flex-wrap">
          <button
            type="button"
            onClick={() =>
              document
                .getElementById("grid")
                ?.scrollIntoView({ behavior: "smooth", block: "start" })
            }
            className="group inline-flex h-7 items-center gap-1 rounded-full px-2.5 font-medium text-white transition-colors duration-[var(--dur-fast)] hover:bg-white/15"
          >
            Or browse sections
            <svg
              width="13"
              height="13"
              viewBox="0 0 16 16"
              fill="none"
              aria-hidden
              className="transition-transform duration-300 ease-[var(--ease)] group-hover:translate-y-0.5"
            >
              <path
                d="M8 3v10M4 9l4 4 4-4"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <span aria-hidden className="hidden text-white/40 sm:inline">
            ·
          </span>
          <span>
            <span className="font-semibold text-white">
              {freeCount === TWEAKS.length ? `All ${freeCount} sections free` : `${freeCount} free`}
            </span>{" "}
            with just your email
          </span>
        </div>
      </div>
    </section>
  );
}

function MobileChips({
  cat,
  tier,
}: {
  cat: CatFilter;
  tier: ReturnType<typeof useFilters>["tier"];
}) {
  const { container: gContainer, activeStyle: gActiveStyle } = useGlide<HTMLDivElement>(cat);
  const chips: [CatFilter, string][] = [
    ["all", "All"],
    ...CATEGORIES.map((c) => [c.id, c.label] as [CatFilter, string]),
  ];
  return (
    <div className="bs-no-scrollbar -mx-4 mt-5 overflow-x-auto px-4 lg:hidden">
      <div
        ref={gContainer}
        className="relative inline-flex gap-1 rounded-full bg-surface-2 p-1"
      >
        <span
          data-glide-pill
          aria-hidden
          className="pointer-events-none absolute rounded-full bg-ink"
          style={gActiveStyle}
        />
        {chips.map(([id, label]) => (
          <Link
            key={id}
            href={filterHref({ cat: id, tier })}
            scroll={false}
            data-glide={id}
            aria-current={cat === id ? "page" : undefined}
            className={`relative h-8 shrink-0 rounded-full px-3.5 text-[13px] font-medium leading-8 transition-colors duration-200 ${
              cat === id ? "text-white" : "text-ink-2 active:text-ink"
            }`}
          >
            {label}
          </Link>
        ))}
      </div>
    </div>
  );
}
