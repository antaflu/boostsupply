"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { Nav } from "@/components/Nav";
import { TweakCard } from "@/components/TweakCard";
import { TWEAKS } from "@/lib/registry";
import { CATEGORIES } from "@/lib/categories";
import type { CategoryId, Tier } from "@/lib/types";

type CatFilter = CategoryId | "all";
type TierFilter = Tier | "all";

export default function Home() {
  const [cat, setCat] = useState<CatFilter>("all");
  const [tier, setTier] = useState<TierFilter>("all");
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return TWEAKS.filter((t) => {
      if (cat !== "all" && t.category !== cat) return false;
      if (tier !== "all" && t.tier !== tier) return false;
      if (
        query &&
        !`${t.name} ${t.tagline} ${t.category}`.toLowerCase().includes(query)
      )
        return false;
      return true;
    });
  }, [cat, tier, q]);

  const countFor = (id: CatFilter) =>
    id === "all" ? TWEAKS.length : TWEAKS.filter((t) => t.category === id).length;

  return (
    <>
      <Nav
        right={
          <div className="relative hidden md:block">
            <SearchIcon />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search sections…"
              className="h-9 w-56 lg:w-72 rounded-full border border-border bg-surface pl-9 pr-3 text-sm outline-none focus:border-ink transition-all"
            />
          </div>
        }
      />

      <main className="mx-auto max-w-[1400px] w-full px-5 pb-24">
        <div className="flex gap-8 pt-7">
          {/* Sidebar */}
          <aside className="hidden lg:block w-[228px] shrink-0">
            <div className="sticky top-[80px] space-y-7">
              <Sidebar label="Categories">
                <NavItem
                  active={cat === "all"}
                  onClick={() => setCat("all")}
                  label="All sections"
                  count={countFor("all")}
                />
                {CATEGORIES.map((c) => (
                  <NavItem
                    key={c.id}
                    active={cat === c.id}
                    onClick={() => setCat(c.id)}
                    label={c.label}
                    count={countFor(c.id)}
                  />
                ))}
              </Sidebar>

              <Sidebar label="Pricing">
                {(
                  [
                    ["all", "All"],
                    ["free", "Free"],
                    ["paid", "Premium"],
                  ] as [TierFilter, string][]
                ).map(([val, label]) => (
                  <NavItem
                    key={val}
                    active={tier === val}
                    onClick={() => setTier(val)}
                    label={label}
                    count={
                      val === "all"
                        ? TWEAKS.length
                        : TWEAKS.filter((t) => t.tier === val).length
                    }
                  />
                ))}
              </Sidebar>

              <div className="rounded-2xl bg-surface-2 p-4">
                <p className="text-[13px] font-semibold mb-1">
                  Built for CRO, designed to match.
                </p>
                <p className="text-[12px] text-ink-2 leading-relaxed">
                  Every section is yours to restyle — fonts, colors, spacing,
                  motion — then export clean Liquid.
                </p>
              </div>
            </div>
          </aside>

          {/* Content */}
          <div className="flex-1 min-w-0 space-y-6">
            <Hero />

            {/* Mobile filters */}
            <div className="flex lg:hidden gap-2 overflow-x-auto pb-1 -mx-5 px-5">
              <Chip active={cat === "all"} onClick={() => setCat("all")}>
                All
              </Chip>
              {CATEGORIES.map((c) => (
                <Chip
                  key={c.id}
                  active={cat === c.id}
                  onClick={() => setCat(c.id)}
                >
                  {c.label}
                </Chip>
              ))}
            </div>

            <div className="flex items-center justify-between" id="grid">
              <h2 className="text-sm font-medium text-ink-2">
                {filtered.length} section{filtered.length === 1 ? "" : "s"}
                {cat !== "all" && (
                  <span className="text-ink-4">
                    {" "}
                    in {CATEGORIES.find((c) => c.id === cat)?.label}
                  </span>
                )}
              </h2>
            </div>

            {filtered.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border-strong p-16 text-center text-ink-3">
                Nothing matches that filter yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-10">
                {filtered.map((t) => (
                  <TweakCard key={t.slug} tweak={t} />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  );
}

function Hero() {
  return (
    <div className="relative overflow-hidden rounded-[28px] min-h-[400px] flex items-center justify-center">
      {/* PNG backdrop, centered */}
      <Image
        src="/hero.png"
        alt=""
        fill
        priority
        sizes="(max-width: 1024px) 100vw, 60vw"
        className="object-cover object-center"
      />
      {/* Soft center-weighted scrim — edges stay clear so the image shows */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-black/40 to-transparent" />

      <div className="relative w-full px-8 md:px-12 py-12 mx-auto max-w-[720px] text-center">
        <h1 className="text-[30px] md:text-[44px] font-normal tracking-tight leading-[1.12] text-white [text-shadow:0_2px_30px_rgba(0,0,0,0.4)]">
          Beautifully designed Shopify sections that convert
        </h1>
        <p className="mt-4 mx-auto max-w-[560px] text-[15px] md:text-base text-white/85 leading-relaxed [text-shadow:0_1px_18px_rgba(0,0,0,0.35)]">
          Get instant access to a growing library of premium, plug-and-play
          Liquid code. Boost your store&rsquo;s conversion, AOV, and UX —
          without paying a developer.
        </p>
        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={() => window.scrollBy({ top: 420, behavior: "smooth" })}
            className="h-11 px-5 inline-flex items-center rounded-full bg-white text-ink text-sm font-medium hover:opacity-90 active:scale-[0.98] transition-all"
          >
            Browse sections
          </button>
          <div className="flex items-center gap-2 text-[13px] text-white/80">
            <span className="font-semibold text-white">3 free</span> to try · no
            account needed
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---- bits ---- */

function Sidebar({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="px-2 mb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-4">
        {label}
      </p>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function NavItem({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between px-2.5 h-9 rounded-lg text-sm transition-colors ${
        active
          ? "bg-ink text-surface font-medium"
          : "text-ink-2 hover:bg-surface-2"
      }`}
    >
      <span>{label}</span>
      <span
        className={`text-xs tabular-nums ${active ? "text-surface/60" : "text-ink-4"}`}
      >
        {count}
      </span>
    </button>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 h-9 px-3.5 rounded-full text-sm font-medium border transition-colors ${
        active
          ? "bg-ink text-surface border-ink"
          : "bg-surface text-ink-2 border-border"
      }`}
    >
      {children}
    </button>
  );
}

function SearchIcon() {
  return (
    <svg
      className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-4"
      width="15"
      height="15"
      viewBox="0 0 16 16"
      fill="none"
    >
      <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M10.5 10.5L14 14"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
