"use client";

import { useEffect, useId, useState, type CSSProperties } from "react";
import type { Tweak, TweakConfig } from "../types";
import { str, num, bool, list, fontStack } from "../cfg";
import { fontField } from "../fields";
import { buildSchema, section, fontFaceFor } from "../liquid";
import { money, toNum } from "./product-art";

/* ============================================================
   Quick-Add Product Grid
   A collection grid where every card hides a "Quick add" bar.
   Tap it and a size panel slides up inside the card; pick a
   size and an "Added to cart" toast confirms it, with a
   free-shipping nudge. No trip to the product page needed.
   ============================================================ */

const EASE = "cubic-bezier(.22,1,.36,1)";
const SERIF = "Georgia, 'Times New Roman', serif";

const defaults: TweakConfig = {
  eyebrow: "New this season",
  heading: "Everyday pairs,",
  headingAccent: "made softer",
  linkText: "Shop all",
  currency: "$",
  sizes: "7, 8, 9, 10, 11, 12, 13",
  products: [
    { name: "Daily Runner", colour: "Oat (Cream Sole)", price: "98", compare: "", tag: "New", image: "/mockups/sneaker-sand.jpg", tone: "#D8CBB3", soldOut: "13" },
    { name: "Trail Lite", colour: "Moss (Cream Sole)", price: "125", compare: "", tag: "", image: "/mockups/sneaker-olive.jpg", tone: "#5D6A4D", soldOut: "7, 12" },
    { name: "Lounge Slip-On", colour: "Charcoal (Cream Sole)", price: "66", compare: "95", tag: "Final sale", image: "/mockups/sneaker-charcoal.jpg", tone: "#4A4A47", soldOut: "8, 9" },
    { name: "Breeze Knit", colour: "Deep Navy (Cream Sole)", price: "110", compare: "", tag: "New", image: "/mockups/sneaker-navy.jpg", tone: "#22305A", soldOut: "" },
  ],
  quickAddText: "Quick add",
  sizeTitle: "Select size",
  addedText: "Added to cart",
  threshold: 100,
  progressText: "Spend {{remaining}} more for free shipping",
  unlockedText: "You've unlocked free shipping",
  viewCartText: "View cart",
  demoOpen: true,
  columns: 4,
  accent: "#10714E",
  navy: "#03143B",
  textColor: "#212121",
  muted: "#6E6A64",
  bg: "#FFFFFF",
  tile: "#F5F4F1",
  line: "#E0DACF",
  font: "system",
  radius: 6,
};

/* ---------- colour helpers ---------- */

const rgb = (hex: string) =>
  /^#[0-9a-f]{6}$/i.test(hex)
    ? [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
    : null;

const mix = (a: string, b: string, t: number) => {
  const pa = rgb(a);
  const pb = rgb(b);
  if (!pa || !pb) return a;
  return (
    "#" +
    pa
      .map((v, i) => Math.round(v + (pb[i] - v) * t).toString(16).padStart(2, "0"))
      .join("")
  );
};

const splitList = (s: string) =>
  s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);

/* ---------- product drawing: a knit low-top runner ---------- */

const UPPER =
  "M10 50C8 45 12 41 20 39C30 37 40 35 48 32C56 29 64 25 70 21C73 19 77 19 79 22C81 25 84 28 90 28C96 28 102 25 106 24C109 23 112 25 112 29L113 50Z";
const SOLE =
  "M12 49C9.5 49 7 51 7 54.5C7 58.5 11 61 17 61H105C110 61 114 59 114 55C114 52 112 50 109 49.5Z";
const LACES = [
  [52, 31],
  [57, 28.6],
  [62, 26.2],
  [67, 23.6],
];

function Sneaker({ tone, width = "84%", style }: { tone: string; width?: string; style?: CSSProperties }) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const sole = mix("#F6F3EC", tone, 0.08);
  const lace = mix(tone, "#FFFFFF", 0.6);
  const dark = mix(tone, "#000000", 0.35);
  return (
    <svg viewBox="0 0 120 70" style={{ width, overflow: "visible", ...style }} aria-hidden>
      <defs>
        <pattern id={`k${uid}`} width="2.6" height="2.6" patternUnits="userSpaceOnUse">
          <circle cx="1.3" cy="1.3" r=".5" fill="#FFFFFF" fillOpacity=".13" />
        </pattern>
        <linearGradient id={`g${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFFFFF" stopOpacity=".24" />
          <stop offset=".55" stopColor="#FFFFFF" stopOpacity="0" />
          <stop offset="1" stopColor="#000000" stopOpacity=".1" />
        </linearGradient>
      </defs>
      <ellipse cx="60" cy="63.5" rx="50" ry="3.2" fill="#000000" fillOpacity=".09" />
      <path d={UPPER} fill={tone} />
      <path d={UPPER} fill={`url(#k${uid})`} />
      <path d={UPPER} fill={`url(#g${uid})`} />
      <path
        d="M79 22.5c2 3.6 5.4 6 11 6 6 0 11-2.8 16-4.2l1 3.6c-5 1.6-10.4 3.6-17 3.6-6.4 0-10.6-3-12.6-6.6z"
        fill={dark}
        fillOpacity=".55"
      />
      <path d="M106.5 24c3-.9 5.6.9 5.6 4.6v5c-1.8-1.8-3.6-2.8-5.6-3.2z" fill={dark} fillOpacity=".45" />
      {LACES.map(([x, y], i) => (
        <path key={i} d={`M${x - 1.5} ${y - 3.3}L${x + 1.5} ${y + 3.3}`} stroke={lace} strokeWidth="1.6" strokeLinecap="round" />
      ))}
      <path d={SOLE} fill={sole} />
      <path d="M9 52.6h105" stroke="#000000" strokeOpacity=".07" strokeWidth="1" />
      <path d="M18 58.4h88" stroke="#000000" strokeOpacity=".06" strokeWidth="1" strokeDasharray="2 2.4" />
    </svg>
  );
}

/* ---------- preview ---------- */

function Preview({ config }: { config: TweakConfig }) {
  const cur = str(config, "currency", "$");
  const accent = str(config, "accent", "#10714E");
  const navy = str(config, "navy", "#03143B");
  const text = str(config, "textColor", "#212121");
  const muted = str(config, "muted", "#6E6A64");
  const bg = str(config, "bg", "#FFFFFF");
  const tile = str(config, "tile", "#F5F4F1");
  const line = str(config, "line", "#E0DACF");
  const radius = num(config, "radius", 6);
  const cols = Math.max(2, Math.min(5, Math.round(num(config, "columns", 4))));
  const threshold = num(config, "threshold", 100);

  const sizes = splitList(str(config, "sizes"));
  const products = list(config, "products").map((p) => ({
    name: p.name ?? "",
    colour: p.colour ?? "",
    price: toNum(p.price),
    compare: toNum(p.compare),
    tag: p.tag ?? "",
    image: (p.image ?? "").trim(),
    tone: rgb(p.tone ?? "") ? (p.tone as string) : "#D8CBB3",
    sold: splitList(p.soldOut ?? ""),
  }));

  /* the demo card opens its size panel so the mechanic reads at a glance */
  const demo = bool(config, "demoOpen", true) && products.length > 1 ? 1 : null;
  const [prevDemo, setPrevDemo] = useState(demo);
  const [open, setOpen] = useState<number | null>(demo);
  if (demo !== prevDemo) {
    setPrevDemo(demo);
    setOpen(demo);
  }

  const [busy, setBusy] = useState<string | null>(null);
  const [cart, setCart] = useState(0);
  const [toast, setToast] = useState<{ card: number; size: string; id: number } | null>(null);
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    if (!showToast) return;
    const t = setTimeout(() => setShowToast(false), 4800);
    return () => clearTimeout(t);
  }, [showToast, toast]);

  const add = (card: number, size: string) => {
    if (busy) return;
    const key = `${card}:${size}`;
    setBusy(key);
    setTimeout(() => {
      setBusy(null);
      setOpen(null);
      setCart((c) => c + (products[card]?.price ?? 0));
      setToast({ card, size, id: Date.now() });
      setShowToast(true);
    }, 480);
  };

  const remaining = Math.max(0, threshold - cart);
  const pct = threshold > 0 ? Math.min(100, (cart / threshold) * 100) : 100;
  const tp = toast ? products[toast.card] : undefined;
  const progress = str(config, "progressText").split("{{remaining}}");

  const gridVars = { "--cols": cols, "--mid": Math.min(3, cols) } as CSSProperties;

  return (
    <div
      className="@container relative w-full overflow-hidden"
      style={{ background: bg, color: text, fontFamily: fontStack(str(config, "font", "system")) }}
    >
      <div className="mx-auto w-full max-w-[1280px] px-4 pb-10 pt-7 @min-[640px]:px-8 @min-[640px]:pb-14 @min-[640px]:pt-12">
        {/* Header */}
        <div className="flex items-end justify-between gap-4">
          <div className="min-w-0">
            {str(config, "eyebrow") && (
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.2em]" style={{ color: accent }}>
                {str(config, "eyebrow")}
              </p>
            )}
            <h3 className="mt-2 text-balance text-[27px] font-medium leading-[1.08] tracking-[-0.02em] @min-[640px]:text-[36px]">
              {str(config, "heading")}{" "}
              {str(config, "headingAccent") && (
                <em className="font-normal italic tracking-[-0.01em]" style={{ fontFamily: SERIF }}>
                  {str(config, "headingAccent")}
                </em>
              )}
            </h3>
          </div>
          {str(config, "linkText") && (
            <button
              type="button"
              className="shrink-0 pb-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] underline decoration-1 underline-offset-[6px] transition-opacity hover:opacity-60"
            >
              {str(config, "linkText")}
            </button>
          )}
        </div>

        {/* Grid */}
        <div
          className="mt-6 grid grid-cols-2 gap-x-3 gap-y-8 @min-[640px]:mt-8 @min-[640px]:grid-cols-[repeat(var(--mid),minmax(0,1fr))] @min-[640px]:gap-x-4 @min-[760px]:grid-cols-[repeat(var(--cols),minmax(0,1fr))]"
          style={gridVars}
        >
          {products.map((p, i) => {
            const isOpen = open === i;
            const sale = p.compare > p.price;
            const isSaleTag = /sale/i.test(p.tag);
            return (
              <div key={i} className="group/card min-w-0">
                <div
                  className="relative aspect-square overflow-hidden"
                  style={{ background: tile, borderRadius: radius }}
                >
                  {/* with the size panel up, the shoe glides into the space above it */}
                  {p.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.image}
                      alt={p.name}
                      loading="lazy"
                      decoding="async"
                      className="absolute inset-0 h-full w-full object-cover"
                      style={{
                        transform: isOpen ? "translateY(-60px)" : "none",
                        transition: `transform 480ms ${EASE}`,
                      }}
                    />
                  ) : (
                    <div
                      className="absolute inset-0 grid place-items-center"
                      style={{
                        transform: isOpen ? "translateY(-60px) scale(.64)" : "none",
                        transition: `transform 600ms ${EASE}`,
                      }}
                    >
                      <Sneaker tone={p.tone} />
                    </div>
                  )}

                  {p.tag && (
                    <span
                      className="absolute left-2.5 top-2.5 bg-white px-1.5 py-[3px] text-[9.5px] font-semibold uppercase tracking-[0.16em]"
                      style={{ color: isSaleTag ? navy : accent, borderRadius: Math.min(radius, 3) }}
                    >
                      {p.tag}
                    </span>
                  )}

                  {/* Quick add bar: shows on hover (always on touch) */}
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() => setOpen(i)}
                    className={`absolute inset-x-2.5 bottom-2.5 flex h-9 items-center justify-center gap-1.5 bg-white text-[10.5px] font-semibold uppercase tracking-[0.18em] transition-[opacity,translate,background-color,color] duration-300 ease-[cubic-bezier(.22,1,.36,1)] hover:bg-[var(--qa-hover)] hover:text-white ${
                      isOpen
                        ? "pointer-events-none translate-y-2 opacity-0"
                        : "[@media(hover:hover)]:translate-y-2 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover/card:translate-y-0 [@media(hover:hover)]:group-hover/card:opacity-100"
                    }`}
                    style={{ borderRadius: Math.max(0, radius - 2), ["--qa-hover" as string]: navy } as CSSProperties}
                  >
                    {str(config, "quickAddText")}
                    <svg width="10" height="10" viewBox="0 0 12 12" aria-hidden>
                      <path d="M6 1.5v9M1.5 6h9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                    </svg>
                  </button>

                  {/* Size panel */}
                  <div
                    className="absolute inset-x-0 bottom-0 bg-white px-3 pb-3 pt-2"
                    aria-hidden={!isOpen}
                    style={{
                      transform: isOpen ? "none" : "translateY(101%)",
                      transition: `transform 480ms ${EASE}`,
                      boxShadow: isOpen ? "0 -10px 30px -18px rgba(0,0,0,.35)" : "none",
                    }}
                  >
                    <div className="flex h-6 items-center justify-between">
                      <p className="text-[9.5px] font-semibold uppercase tracking-[0.18em]">{str(config, "sizeTitle")}</p>
                      <button
                        type="button"
                        tabIndex={isOpen ? 0 : -1}
                        aria-label="Close sizes"
                        onClick={() => setOpen(null)}
                        className="-mr-1.5 grid h-7 w-7 place-items-center rounded-full transition-colors hover:bg-black/[0.05]"
                      >
                        <svg width="9" height="9" viewBox="0 0 12 12" aria-hidden>
                          <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                        </svg>
                      </button>
                    </div>
                    <div className="mt-1.5 grid grid-cols-4 gap-1.5">
                      {sizes.map((s) => {
                        const sold = p.sold.includes(s);
                        const isBusy = busy === `${i}:${s}`;
                        return (
                          <button
                            key={s}
                            type="button"
                            disabled={sold}
                            tabIndex={isOpen ? 0 : -1}
                            onClick={() => add(i, s)}
                            className="relative grid h-8 place-items-center overflow-hidden text-[12px] tabular-nums shadow-[inset_0_0_0_1px_var(--qa-line)] transition-[background-color,color,box-shadow] duration-200 enabled:hover:shadow-[inset_0_0_0_1.5px_var(--qa-ink)] disabled:cursor-not-allowed"
                            style={{
                              borderRadius: Math.max(0, radius - 3),
                              background: isBusy ? navy : "#FFFFFF",
                              color: isBusy ? "#FFFFFF" : sold ? mix(muted, "#FFFFFF", 0.35) : text,
                              ["--qa-ink" as string]: text,
                              ["--qa-line" as string]: line,
                            } as CSSProperties}
                          >
                            {isBusy ? (
                              <span className="block h-3.5 w-3.5 animate-spin rounded-full border-[1.5px] border-white/30 border-t-white" />
                            ) : (
                              s
                            )}
                            {sold && (
                              <svg className="pointer-events-none absolute inset-0 h-full w-full" preserveAspectRatio="none" viewBox="0 0 10 10" aria-hidden>
                                <path d="M0 10L10 0" stroke={line} strokeWidth=".6" vectorEffect="non-scaling-stroke" />
                              </svg>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="mt-3 px-0.5">
                  <p className="text-[14px] font-medium leading-snug">{p.name}</p>
                  <p className="mt-0.5 truncate text-[12.5px]" style={{ color: muted }}>
                    {p.colour}
                  </p>
                  <p className="mt-1.5 text-[13.5px] tabular-nums">
                    {sale && (
                      <s className="mr-1.5" style={{ color: muted }}>
                        {money(p.compare, cur)}
                      </s>
                    )}
                    <span style={{ color: sale ? accent : text, fontWeight: sale ? 600 : 400 }}>{money(p.price, cur)}</span>
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Added-to-cart toast */}
      <div
        aria-live="polite"
        className="pointer-events-none absolute inset-x-3 bottom-3 z-20 flex justify-center @min-[640px]:inset-x-auto @min-[640px]:bottom-5 @min-[640px]:right-5"
      >
        <div
          className="w-full max-w-[340px] overflow-hidden text-white @min-[640px]:w-[340px]"
          style={{
            background: navy,
            borderRadius: radius + 6,
            boxShadow: "0 24px 60px -20px rgba(3,20,59,.55)",
            opacity: showToast ? 1 : 0,
            transform: showToast ? "none" : "translateY(18px) scale(.98)",
            transition: `opacity 360ms ${EASE}, transform 520ms ${EASE}`,
            pointerEvents: showToast ? "auto" : "none",
          }}
        >
          <div className="flex items-center gap-2 px-4 pt-3.5">
            <span className="grid h-5 w-5 place-items-center rounded-full" style={{ background: accent }}>
              <svg width="10" height="10" viewBox="0 0 12 12" aria-hidden>
                <path d="M2.4 6.3l2.3 2.2 4.9-5" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.18em]">{str(config, "addedText")}</p>
            <button
              type="button"
              aria-label="Close"
              onClick={() => setShowToast(false)}
              className="-mr-1.5 ml-auto grid h-7 w-7 place-items-center rounded-full transition-colors hover:bg-white/10"
            >
              <svg width="9" height="9" viewBox="0 0 12 12" aria-hidden>
                <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </button>
          </div>
          {tp && toast && (
            <div key={toast.id} className="bs-swap flex items-center gap-3 px-4 pt-3">
              <span
                className="relative grid h-[52px] w-[52px] shrink-0 place-items-center overflow-hidden"
                style={{ background: tile, borderRadius: Math.max(4, radius) }}
              >
                {tp.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={tp.image}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                ) : (
                  <Sneaker tone={tp.tone} width="90%" />
                )}
              </span>
              <div className="min-w-0 flex-1 leading-snug">
                <p className="truncate text-[13.5px] font-medium">{tp.name}</p>
                <p className="truncate text-[11.5px] text-white/65">
                  {tp.colour.replace(/\s*\(.*\)$/, "")} · {toast.size}
                </p>
              </div>
              <p className="shrink-0 text-[13px] tabular-nums">{money(tp.price, cur)}</p>
            </div>
          )}
          <div className="px-4 pb-4 pt-3.5">
            {threshold > 0 && (
              <>
                <div className="h-[3px] overflow-hidden rounded-full bg-white/15">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${pct}%`, background: mix(accent, "#FFFFFF", 0.25), transition: `width 800ms ${EASE} 200ms` }}
                  />
                </div>
                <p className="mt-2 text-[12px] text-white/80">
                  {remaining > 0 ? (
                    <>
                      {progress[0]}
                      {progress.length > 1 && <b className="font-semibold text-white">{money(remaining, cur)}</b>}
                      {progress.slice(1).join("")}
                    </>
                  ) : (
                    str(config, "unlockedText")
                  )}
                </p>
              </>
            )}
            <button
              type="button"
              className="mt-3 h-10 w-full bg-white text-[10.5px] font-semibold uppercase tracking-[0.18em] transition-[filter] hover:brightness-95"
              style={{ color: navy, borderRadius: Math.max(0, radius - 2) }}
            >
              {str(config, "viewCartText")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Liquid ---------- */

function generateLiquid(config: TweakConfig): string {
  const { face, family } = fontFaceFor(str(config, "font", "system"));
  const S = ".bs-qa-{{ section.id }}";
  const r = "{{ section.settings.radius }}px";
  const r2 = "{{ section.settings.radius | minus: 2 | at_least: 0 }}px";
  const r3 = "{{ section.settings.radius | minus: 3 | at_least: 0 }}px";
  const ease = "cubic-bezier(.22,1,.36,1)";
  const caps = "font-size: 10.5px; font-weight: 600; letter-spacing: .18em; text-transform: uppercase;";

  const style = `<style>
${face ? face + "\n" : ""}  ${S} { background: {{ section.settings.bg }}; color: {{ section.settings.text_color }}; font-family: ${family}; }
  ${S} * { box-sizing: border-box; }
  ${S} p, ${S} h2 { margin: 0; }
  ${S} a { color: inherit; text-decoration: none; }
  ${S} button { font: inherit; color: inherit; }
  ${S} .bs-wrap { max-width: 1280px; margin: 0 auto; padding: 28px 16px 40px; }
  ${S} .bs-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; }
  ${S} .bs-eyebrow { ${caps} letter-spacing: .2em; color: {{ section.settings.accent }}; }
  ${S} .bs-h { margin-top: 8px; font-size: 27px; font-weight: 500; line-height: 1.08; letter-spacing: -.02em; text-wrap: balance; }
  ${S} .bs-h em { font-family: Georgia, 'Times New Roman', serif; font-style: italic; font-weight: 400; letter-spacing: -.01em; }
  ${S} .bs-all { flex-shrink: 0; padding-bottom: 6px; font-size: 11px; font-weight: 600; letter-spacing: .18em; text-transform: uppercase;
    text-decoration: underline; text-decoration-thickness: 1px; text-underline-offset: 6px; transition: opacity .2s; }
  ${S} .bs-all:hover { opacity: .6; }
  ${S} .bs-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); column-gap: 12px; row-gap: 32px; margin-top: 24px; }
  ${S} .bs-card { min-width: 0; }
  ${S} .bs-tile { position: relative; aspect-ratio: 1 / 1; overflow: hidden; border-radius: ${r}; background: {{ section.settings.tile }}; }
  ${S} .bs-img { position: absolute; inset: 0; display: block; }
  ${S} .bs-img img, ${S} .bs-img svg { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; display: block;
    transition: opacity .5s ${ease}, transform .48s ${ease}; }
  ${S} .bs-img .bs-img2 { opacity: 0; }
  ${S} .bs-card.is-open .bs-img img { transform: translateY(-60px); }
  ${S} .bs-tag { position: absolute; left: 10px; top: 10px; z-index: 1; padding: 3px 6px; border-radius: 2px; background: #fff;
    font-size: 9.5px; font-weight: 600; letter-spacing: .16em; text-transform: uppercase; color: {{ section.settings.accent }}; }
  ${S} .bs-tag.is-sale { color: {{ section.settings.navy }}; }
  ${S} .bs-qa { position: absolute; left: 10px; right: 10px; bottom: 10px; z-index: 2; height: 36px; border: 0; border-radius: ${r2};
    display: flex; align-items: center; justify-content: center; gap: 6px; cursor: pointer; background: #fff; ${caps}
    transition: opacity .3s ${ease}, transform .3s ${ease}, background-color .2s, color .2s; }
  ${S} .bs-qa:hover { background: {{ section.settings.navy }}; color: #fff; }
  ${S} .bs-qa.is-out { cursor: default; color: {{ section.settings.muted }}; }
  ${S} .bs-qa.is-out:hover { background: #fff; color: {{ section.settings.muted }}; }
  ${S} .bs-qa.is-busy { opacity: .6; pointer-events: none; }
  ${S} .bs-card.is-open .bs-qa { opacity: 0; transform: translateY(8px); pointer-events: none; }
  ${S} .bs-panel { position: absolute; left: 0; right: 0; bottom: 0; z-index: 3; padding: 8px 12px 12px; background: #fff;
    transform: translateY(101%); visibility: hidden; transition: transform .48s ${ease}, visibility 0s .48s; }
  ${S} .bs-card.is-open .bs-panel { transform: none; visibility: visible; transition: transform .48s ${ease}; box-shadow: 0 -10px 30px -18px rgba(0,0,0,.35); }
  ${S} .bs-ph { display: flex; align-items: center; justify-content: space-between; height: 24px; font-size: 9.5px; font-weight: 600; letter-spacing: .18em; text-transform: uppercase; }
  ${S} .bs-x { width: 28px; height: 28px; margin-right: -6px; padding: 0; border: 0; border-radius: 99px; background: none; cursor: pointer; display: grid; place-items: center; }
  ${S} .bs-x:hover { background: rgba(0,0,0,.05); }
  ${S} .bs-sizes { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 6px; margin-top: 6px; }
  ${S} .bs-size { position: relative; height: 32px; padding: 0 2px; border: 0; border-radius: ${r3}; cursor: pointer; overflow: hidden;
    background: #fff; box-shadow: inset 0 0 0 1px {{ section.settings.line }}; font-size: 12px; font-variant-numeric: tabular-nums;
    white-space: nowrap; text-overflow: ellipsis; transition: box-shadow .2s, background-color .2s, color .2s; }
  ${S} .bs-size:hover:not(:disabled) { box-shadow: inset 0 0 0 1.5px {{ section.settings.text_color }}; }
  ${S} .bs-size:disabled { cursor: not-allowed; color: {{ section.settings.muted }}; opacity: .6;
    background: linear-gradient(to top right, transparent calc(50% - .5px), {{ section.settings.line }} calc(50% - .5px), {{ section.settings.line }} calc(50% + .5px), transparent calc(50% + .5px)); }
  ${S} .bs-size.is-busy { background: {{ section.settings.navy }}; color: transparent; box-shadow: none; }
  ${S} .bs-size.is-busy::after { content: ""; position: absolute; left: 50%; top: 50%; width: 14px; height: 14px; margin: -7px 0 0 -7px; border-radius: 99px;
    border: 1.5px solid rgba(255,255,255,.3); border-top-color: #fff; animation: bs-qa-spin .7s linear infinite; }
  ${S} .bs-size.is-error, ${S} .bs-qa.is-error { box-shadow: inset 0 0 0 1.5px #c0392b; }
  @keyframes bs-qa-spin { to { transform: rotate(360deg); } }
  ${S} .bs-info { margin-top: 12px; padding: 0 2px; }
  ${S} .bs-name { display: block; font-size: 14px; font-weight: 500; line-height: 1.35; }
  ${S} .bs-sub { margin-top: 2px; font-size: 12.5px; color: {{ section.settings.muted }}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  ${S} .bs-price { margin-top: 6px; font-size: 13.5px; font-variant-numeric: tabular-nums; }
  ${S} .bs-price s { margin-right: 6px; color: {{ section.settings.muted }}; }
  ${S} .bs-price .is-sale { color: {{ section.settings.accent }}; font-weight: 600; }
  ${S} .bs-toast { position: fixed; right: 20px; bottom: 20px; z-index: 60; width: 340px; max-width: calc(100vw - 24px); overflow: hidden;
    border-radius: {{ section.settings.radius | plus: 6 }}px; background: {{ section.settings.navy }}; color: #fff;
    box-shadow: 0 24px 60px -20px rgba(3,20,59,.55); opacity: 0; transform: translateY(18px) scale(.98); pointer-events: none; visibility: hidden;
    transition: opacity .36s ${ease}, transform .52s ${ease}, visibility 0s .52s; }
  ${S} .bs-toast.is-on { opacity: 1; transform: none; pointer-events: auto; visibility: visible; transition: opacity .36s ${ease}, transform .52s ${ease}; }
  ${S} .bs-t-head { display: flex; align-items: center; gap: 8px; padding: 14px 16px 0; ${caps} }
  ${S} .bs-t-ok { width: 20px; height: 20px; flex-shrink: 0; border-radius: 99px; display: grid; place-items: center; background: {{ section.settings.accent }}; }
  ${S} .bs-t-x { margin-left: auto; margin-right: -6px; width: 28px; height: 28px; padding: 0; border: 0; border-radius: 99px; background: none; color: #fff; cursor: pointer; display: grid; place-items: center; }
  ${S} .bs-t-x:hover { background: rgba(255,255,255,.1); }
  ${S} .bs-t-item { display: flex; align-items: center; gap: 12px; padding: 12px 16px 0; }
  ${S} .bs-t-img { width: 52px; height: 52px; flex-shrink: 0; border-radius: {{ section.settings.radius | at_least: 4 }}px;
    background: {{ section.settings.tile }} center / cover no-repeat; }
  ${S} .bs-t-txt { flex: 1; min-width: 0; line-height: 1.35; }
  ${S} .bs-t-title { font-size: 13.5px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  ${S} .bs-t-meta { font-size: 11.5px; opacity: .65; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  ${S} .bs-t-price { flex-shrink: 0; font-size: 13px; font-variant-numeric: tabular-nums; }
  ${S} .bs-t-ship { padding: 14px 16px 0; }
  ${S} .bs-t-bar { height: 3px; border-radius: 99px; overflow: hidden; background: rgba(255,255,255,.15); }
  ${S} .bs-t-fill { width: 0; height: 100%; border-radius: 99px; background: color-mix(in srgb, {{ section.settings.accent }} 75%, #fff); transition: width .8s ${ease} .2s; }
  ${S} .bs-t-msg { margin-top: 8px; font-size: 12px; opacity: .85; }
  ${S} .bs-t-msg b { font-weight: 600; }
  ${S} .bs-t-cta { display: flex; align-items: center; justify-content: center; height: 40px; margin: 12px 16px 16px; border-radius: ${r2};
    background: #fff; color: {{ section.settings.navy }}; ${caps} transition: filter .2s; }
  ${S} .bs-t-cta:hover { filter: brightness(.95); }
  @media (hover: hover) {
    ${S} .bs-qa { opacity: 0; transform: translateY(8px); }
    ${S} .bs-card:hover .bs-qa, ${S} .bs-card:focus-within .bs-qa { opacity: 1; transform: none; }
    ${S} .bs-card:hover .bs-img2 { opacity: 1; }
  }
  @media (min-width: 750px) {
    ${S} .bs-wrap { padding: 48px 32px 56px; }
    ${S} .bs-h { font-size: 36px; }
    ${S} .bs-grid { grid-template-columns: repeat({{ section.settings.columns | at_most: 3 }}, minmax(0, 1fr)); column-gap: 16px; margin-top: 32px; }
  }
  @media (min-width: 990px) {
    ${S} .bs-grid { grid-template-columns: repeat({{ section.settings.columns }}, minmax(0, 1fr)); }
  }
  @media (max-width: 749px) {
    ${S} .bs-toast { left: 12px; right: 12px; bottom: 12px; width: auto; max-width: none; }
  }
</style>`;

  const closeSvg = `<svg width="9" height="9" viewBox="0 0 12 12" aria-hidden="true"><path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>`;
  const plusSvg = `<svg width="10" height="10" viewBox="0 0 12 12" aria-hidden="true"><path d="M6 1.5v9M1.5 6h9" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>`;

  const markup = `{%- comment -%}
  Quick-Add Product Grid by boost.supply. Works on any page.
  - Pick a collection; the grid shows its first products (see "Products to show").
    Card photos are each product's featured image; its second image shows on hover.
  - Size chips come from the option named "Size" (or the first option if there
    is none). Sold-out sizes show crossed out. Products without options get a
    one-tap add.
  - Labels: tag a product "new" for the NEW label or "final-sale" for FINAL SALE.
  - The toast reads /cart.js for the free-shipping line. Your theme's cart count
    updates on the next page load; to refresh it right away, listen for the
    "bs:cart-added" event this section dispatches on document.
{%- endcomment -%}
{%- assign bs_col = section.settings.collection -%}
<div class="bs-qa-{{ section.id }}" id="bs-qa-{{ section.id }}"
  data-threshold="{{ section.settings.threshold | times: 100 }}"
  data-progress="{{ section.settings.progress_text | escape }}" data-unlocked="{{ section.settings.unlocked_text | escape }}"
  data-add-url="{{ routes.cart_add_url }}" data-cart-url="{{ routes.cart_url }}">
  <div class="bs-wrap">
    <div class="bs-head">
      <div>
        {%- if section.settings.eyebrow != blank -%}<p class="bs-eyebrow">{{ section.settings.eyebrow }}</p>{%- endif -%}
        <h2 class="bs-h">
          {{ section.settings.heading }}
          {%- if section.settings.heading_accent != blank %} <em>{{ section.settings.heading_accent }}</em>{%- endif -%}
        </h2>
      </div>
      {%- if section.settings.link_text != blank -%}
        <a class="bs-all" href="{% if bs_col != blank %}{{ bs_col.url }}{% else %}{{ routes.all_products_collection_url }}{% endif %}">{{ section.settings.link_text }}</a>
      {%- endif -%}
    </div>

    <div class="bs-grid">
      {%- if bs_col != blank and bs_col.products_count > 0 -%}
        {%- for bs_p in bs_col.products limit: section.settings.limit -%}
          {%- liquid
            assign bs_v = bs_p.selected_or_first_available_variant
            assign bs_pos = 1
            assign bs_colour = ''
            for bs_opt in bs_p.options_with_values
              assign bs_oname = bs_opt.name | downcase
              assign bs_oi = bs_opt.position | minus: 1
              if bs_oname contains 'size'
                assign bs_pos = bs_opt.position
              endif
              if bs_oname contains 'color' or bs_oname contains 'colour'
                assign bs_colour = bs_v.options[bs_oi]
              endif
            endfor
            if bs_colour == blank
              assign bs_colour = bs_p.type
            endif
            assign bs_idx = bs_pos | minus: 1
            assign bs_key = 'option' | append: bs_pos
          -%}
          <div class="bs-card" data-card data-title="{{ bs_p.title | escape }}" data-colour="{{ bs_colour | escape }}"
            data-img="{% if bs_p.featured_image %}{{ bs_p.featured_image | image_url: width: 160 }}{% endif %}">
            <div class="bs-tile">
              <a class="bs-img" href="{{ bs_p.url }}" tabindex="-1" aria-hidden="true">
                {%- if bs_p.featured_image -%}
                  {{ bs_p.featured_image | image_url: width: 700 | image_tag: loading: 'lazy', alt: bs_p.title, class: 'bs-img1', sizes: '(min-width: 990px) 25vw, 50vw' }}
                {%- else -%}
                  {{ 'product-1' | placeholder_svg_tag: 'bs-img1' }}
                {%- endif -%}
                {%- if bs_p.images.size > 1 -%}
                  {{ bs_p.images[1] | image_url: width: 700 | image_tag: loading: 'lazy', alt: '', class: 'bs-img2', sizes: '(min-width: 990px) 25vw, 50vw' }}
                {%- endif -%}
              </a>
              {%- if bs_p.tags contains 'final-sale' -%}
                <span class="bs-tag is-sale">{{ section.settings.sale_label }}</span>
              {%- elsif bs_p.tags contains 'new' -%}
                <span class="bs-tag">{{ section.settings.new_label }}</span>
              {%- endif -%}

              {%- if bs_p.available == false -%}
                <span class="bs-qa is-out">{{ section.settings.sold_out_text }}</span>
              {%- elsif bs_p.has_only_default_variant -%}
                <button type="button" class="bs-qa" data-add-id="{{ bs_v.id }}" data-label="" data-price="{{ bs_v.price }}">{{ section.settings.quick_add_text }} ${plusSvg}</button>
              {%- else -%}
                <button type="button" class="bs-qa" data-open aria-expanded="false">{{ section.settings.quick_add_text }} ${plusSvg}</button>
                <div class="bs-panel">
                  <div class="bs-ph">
                    <span>{{ section.settings.size_title }}</span>
                    <button type="button" class="bs-x" data-close aria-label="Close sizes">${closeSvg}</button>
                  </div>
                  <div class="bs-sizes">
                    {%- assign bs_seen = '|' -%}
                    {%- for bs_var in bs_p.variants -%}
                      {%- assign bs_val = bs_var.options[bs_idx] -%}
                      {%- assign bs_mark = '|' | append: bs_val | append: '|' -%}
                      {%- unless bs_seen contains bs_mark -%}
                        {%- assign bs_seen = bs_seen | append: bs_val | append: '|' -%}
                        {%- assign bs_av = bs_p.variants | where: bs_key, bs_val | where: 'available' | first -%}
                        <button type="button" class="bs-size"{% if bs_av %} data-add-id="{{ bs_av.id }}" data-label="{{ bs_val | escape }}" data-price="{{ bs_av.price }}"{% else %} disabled{% endif %}>{{ bs_val }}</button>
                      {%- endunless -%}
                    {%- endfor -%}
                  </div>
                </div>
              {%- endif -%}
            </div>
            <div class="bs-info">
              <a class="bs-name" href="{{ bs_p.url }}">{{ bs_p.title }}</a>
              {%- if bs_colour != blank -%}<p class="bs-sub">{{ bs_colour }}</p>{%- endif -%}
              <p class="bs-price">
                {%- if bs_p.compare_at_price > bs_p.price -%}<s>{{ bs_p.compare_at_price | money }}</s><span class="is-sale">{{ bs_p.price | money }}</span>
                {%- else -%}{%- if bs_p.price_varies -%}From {% endif -%}{{ bs_p.price | money }}{%- endif -%}
              </p>
            </div>
          </div>
        {%- endfor -%}
      {%- else -%}
        {%- for i in (1..4) -%}
          <div class="bs-card">
            <div class="bs-tile"><span class="bs-img">{{ 'product-' | append: i | placeholder_svg_tag }}</span></div>
            <div class="bs-info">
              <p class="bs-name">Example product</p>
              <p class="bs-sub">Pick a collection in the theme editor</p>
              <p class="bs-price">{{ 9800 | money }}</p>
            </div>
          </div>
        {%- endfor -%}
      {%- endif -%}
    </div>
  </div>

  <div class="bs-toast" data-toast role="status" aria-live="polite">
    <div class="bs-t-head">
      <span class="bs-t-ok" aria-hidden="true"><svg width="10" height="10" viewBox="0 0 12 12"><path d="M2.4 6.3l2.3 2.2 4.9-5" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></span>
      <span>{{ section.settings.added_text }}</span>
      <button type="button" class="bs-t-x" data-toast-close aria-label="Close">${closeSvg}</button>
    </div>
    <div class="bs-t-item">
      <span class="bs-t-img" data-t-img></span>
      <div class="bs-t-txt"><p class="bs-t-title" data-t-title></p><p class="bs-t-meta" data-t-meta></p></div>
      <p class="bs-t-price" data-t-price></p>
    </div>
    {%- if section.settings.threshold > 0 -%}
      <div class="bs-t-ship">
        <div class="bs-t-bar"><div class="bs-t-fill" data-t-fill></div></div>
        <p class="bs-t-msg" data-t-msg></p>
      </div>
    {%- endif -%}
    <a class="bs-t-cta" href="{{ routes.cart_url }}">{{ section.settings.view_cart_text }}</a>
  </div>
</div>
<script>
  (function () {
    var root = document.getElementById('bs-qa-{{ section.id }}');
    if (!root) return;
    var fmt = String({{ shop.money_format | json }}).replace(/<[^>]*>/g, '');
    function money(cents, trim) {
      var open = '{' + '{', close = '}' + '}';
      var a = fmt.indexOf(open), b = fmt.indexOf(close, a);
      var v = cents / 100;
      if (a < 0 || b < 0) return v.toFixed(2);
      var key = fmt.slice(a + 2, b).trim();
      var s = key.indexOf('no_decimals') > -1 ? String(Math.round(v)) : v.toFixed(2);
      if (trim) s = s.replace(/\\.00$/, '');
      if (key.indexOf('comma') > -1) s = s.replace('.', ',');
      return fmt.slice(0, a) + s + fmt.slice(b + 2);
    }
    var d = root.dataset;
    var token = '{' + '{' + 'remaining' + '}' + '}';
    var toast = root.querySelector('[data-toast]'), timer = 0;
    function q(el, s) { return el ? el.querySelector(s) : null; }
    function closeAll(except) {
      root.querySelectorAll('.bs-card.is-open').forEach(function (c) {
        if (c === except) return;
        c.classList.remove('is-open');
        var o = q(c, '[data-open]');
        if (o) o.setAttribute('aria-expanded', 'false');
      });
    }
    function hide() { if (toast) toast.classList.remove('is-on'); }
    function show(card, btn, cart) {
      if (!toast) return;
      var img = q(toast, '[data-t-img]'), src = card ? card.getAttribute('data-img') : '';
      if (img) img.style.backgroundImage = src ? 'url("' + src + '")' : '';
      var title = q(toast, '[data-t-title]');
      if (title) title.textContent = card ? card.getAttribute('data-title') : '';
      var meta = q(toast, '[data-t-meta]');
      if (meta) meta.textContent = [card ? card.getAttribute('data-colour') : '', btn.getAttribute('data-label')].filter(Boolean).join(' · ');
      var price = q(toast, '[data-t-price]');
      if (price) price.textContent = money(+btn.getAttribute('data-price'));
      var th = +d.threshold, total = +cart.total_price || 0, rem = th - total;
      var fill = q(toast, '[data-t-fill]'), msg = q(toast, '[data-t-msg]');
      if (fill) fill.style.width = (th > 0 ? Math.min(100, total / th * 100) : 100) + '%';
      if (msg) {
        msg.textContent = '';
        if (rem > 0) {
          var parts = String(d.progress || '').split(token);
          msg.appendChild(document.createTextNode(parts[0]));
          if (parts.length > 1) {
            var b = document.createElement('b');
            b.textContent = money(rem, true);
            msg.appendChild(b);
            msg.appendChild(document.createTextNode(parts.slice(1).join(token)));
          }
        } else {
          msg.textContent = d.unlocked || '';
        }
      }
      toast.classList.add('is-on');
      clearTimeout(timer);
      timer = setTimeout(hide, 5000);
    }
    function add(btn) {
      var card = btn.closest('[data-card]');
      btn.classList.add('is-busy');
      btn.disabled = true;
      fetch(d.addUrl + '.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ items: [{ id: +btn.getAttribute('data-add-id'), quantity: 1 }] })
      })
        .then(function (r) {
          if (!r.ok) throw new Error('add');
          return fetch(d.cartUrl + '.js', { headers: { Accept: 'application/json' } });
        })
        .then(function (r) { return r.json(); })
        .then(function (cart) {
          btn.classList.remove('is-busy');
          btn.disabled = false;
          closeAll(null);
          show(card, btn, cart);
          document.dispatchEvent(new CustomEvent('bs:cart-added', { detail: cart }));
        })
        .catch(function () {
          btn.classList.remove('is-busy');
          btn.disabled = false;
          btn.classList.add('is-error');
          setTimeout(function () { btn.classList.remove('is-error'); }, 1200);
        });
    }
    root.addEventListener('click', function (e) {
      var b = e.target.closest('button');
      if (!b || !root.contains(b)) return;
      var card = b.closest('[data-card]');
      if (b.hasAttribute('data-open') && card) {
        closeAll(card);
        card.classList.add('is-open');
        b.setAttribute('aria-expanded', 'true');
        var first = q(card, '.bs-size:not(:disabled)');
        if (first) first.focus({ preventScroll: true });
        return;
      }
      if (b.hasAttribute('data-close')) { closeAll(null); return; }
      if (b.hasAttribute('data-toast-close')) { hide(); return; }
      if (b.hasAttribute('data-add-id')) add(b);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { closeAll(null); hide(); }
    });
    document.addEventListener('click', function (e) {
      if (!root.contains(e.target)) closeAll(null);
    });
  })();
</script>`;

  const products = list(config, "products");
  const cols = Math.max(2, Math.min(5, Math.round(num(config, "columns", 4))));

  const schema = buildSchema({
    name: "Quick-Add Grid",
    settings: [
      { type: "text", id: "eyebrow", label: "Eyebrow", default: str(config, "eyebrow") },
      { type: "text", id: "heading", label: "Heading", default: str(config, "heading") },
      { type: "text", id: "heading_accent", label: "Heading accent (serif italic)", default: str(config, "headingAccent") },
      { type: "text", id: "link_text", label: "Link text", default: str(config, "linkText") },
      { type: "header", content: "Products" },
      { type: "collection", id: "collection", label: "Collection" },
      { type: "range", id: "limit", label: "Products to show", min: 2, max: 12, step: 1, default: Math.max(2, Math.min(12, products.length || 4)) },
      { type: "range", id: "columns", label: "Columns on desktop", min: 2, max: 5, step: 1, default: cols },
      { type: "header", content: "Cards" },
      { type: "text", id: "quick_add_text", label: "Quick add button", default: str(config, "quickAddText") },
      { type: "text", id: "size_title", label: "Size panel title", default: str(config, "sizeTitle") },
      { type: "text", id: "sold_out_text", label: "Sold out text", default: "Sold out" },
      { type: "text", id: "new_label", label: "Label for products tagged “new”", default: "New" },
      { type: "text", id: "sale_label", label: "Label for products tagged “final-sale”", default: "Final sale" },
      { type: "header", content: "Added-to-cart toast" },
      { type: "text", id: "added_text", label: "Toast title", default: str(config, "addedText") },
      { type: "range", id: "threshold", label: "Free shipping threshold (0 = hide)", min: 0, max: 300, step: 5, unit: str(config, "currency", "$").slice(0, 3), default: Math.max(0, Math.min(300, Math.round(num(config, "threshold", 100) / 5) * 5)) },
      { type: "text", id: "progress_text", label: "Progress text (use {{remaining}})", default: str(config, "progressText") },
      { type: "text", id: "unlocked_text", label: "Unlocked text", default: str(config, "unlockedText") },
      { type: "text", id: "view_cart_text", label: "View cart button", default: str(config, "viewCartText") },
      { type: "header", content: "Style" },
      { type: "color", id: "accent", label: "Accent (labels, sale price)", default: str(config, "accent") },
      { type: "color", id: "navy", label: "Toast & button hover", default: str(config, "navy") },
      { type: "color", id: "text_color", label: "Text", default: str(config, "textColor") },
      { type: "color", id: "muted", label: "Muted text", default: str(config, "muted") },
      { type: "color", id: "bg", label: "Background", default: str(config, "bg") },
      { type: "color", id: "tile", label: "Image tile", default: str(config, "tile") },
      { type: "color", id: "line", label: "Size chip border", default: str(config, "line") },
      { type: "range", id: "radius", label: "Corner radius", min: 0, max: 16, step: 1, unit: "px", default: Math.max(0, Math.min(16, Math.round(num(config, "radius", 6)))) },
    ],
  });

  return section({ style, markup, schema });
}

export const quickAddGrid: Tweak = {
  slug: "quick-add-grid",
  inspiredBy: "allbirds",
  name: "Quick-Add Product Grid",
  tagline: "Add to cart from the grid: sizes slide up inside the card, a toast confirms it.",
  description:
    "Modeled on the collection grid quick add Allbirds uses. Every product card hides a “Quick add” bar; tap it and a size panel slides up inside the card, with sold-out sizes crossed out. Picking a size adds it straight to the cart and an “Added to cart” toast confirms it with a free-shipping nudge. Shoppers fill their cart without ever leaving the grid.",
  category: "homepage",
  tier: "paid",
  price: 39,
  tint: "#f1efe9",
  Preview,
  generateLiquid,
  defaults,
  fields: [
    { key: "eyebrow", label: "Eyebrow", type: "text", group: "Content" },
    { key: "heading", label: "Heading", type: "text", group: "Content" },
    { key: "headingAccent", label: "Heading accent", type: "text", group: "Content", hint: "Shown in a serif italic after the heading" },
    { key: "linkText", label: "Link text", type: "text", group: "Content" },
    { key: "currency", label: "Currency symbol", type: "text", group: "Content" },
    {
      key: "products", label: "Products", type: "list", group: "Products",
      hint: "Preview only. In your store the grid shows the collection you pick, with each product's own photos. Tone (hex) colours the drawing shown when Image URL is empty; sold out = sizes, comma separated",
      itemFields: [
        { key: "name", label: "Name", type: "text" },
        { key: "colour", label: "Colour line", type: "text" },
        { key: "price", label: "Price", type: "text" },
        { key: "compare", label: "Compare-at", type: "text" },
        { key: "tag", label: "Label", type: "text" },
        { key: "image", label: "Image URL", type: "text" },
        { key: "tone", label: "Tone (hex)", type: "text" },
        { key: "soldOut", label: "Sold-out sizes", type: "text" },
      ],
      newItem: { name: "Canvas Court", colour: "Sand (Cream Sole)", price: "90", compare: "", tag: "", image: "/mockups/sneaker-sand.jpg", tone: "#D8CBB3", soldOut: "" },
      addLabel: "Add product", max: 8,
    },
    { key: "sizes", label: "Preview sizes", type: "text", group: "Products", hint: "Comma separated. Your store uses each product's real sizes" },
    { key: "columns", label: "Columns on desktop", type: "slider", group: "Products", min: 2, max: 5, step: 1 },
    { key: "demoOpen", label: "Show a size panel open in the preview", type: "toggle", group: "Products" },
    { key: "quickAddText", label: "Quick add button", type: "text", group: "Cards" },
    { key: "sizeTitle", label: "Size panel title", type: "text", group: "Cards" },
    { key: "addedText", label: "Toast title", type: "text", group: "Toast" },
    { key: "threshold", label: "Free shipping at", type: "slider", group: "Toast", min: 0, max: 300, step: 5, unit: "$" },
    { key: "progressText", label: "Progress text", type: "text", group: "Toast", hint: "Use {{remaining}} for the amount left" },
    { key: "unlockedText", label: "Unlocked text", type: "text", group: "Toast" },
    { key: "viewCartText", label: "View cart button", type: "text", group: "Toast" },
    fontField("Typography"),
    { key: "radius", label: "Corner radius", type: "slider", group: "Layout", min: 0, max: 16, step: 1, unit: "px" },
    { key: "accent", label: "Accent", type: "color", group: "Colors" },
    { key: "navy", label: "Toast & button hover", type: "color", group: "Colors" },
    { key: "textColor", label: "Text", type: "color", group: "Colors" },
    { key: "muted", label: "Muted text", type: "color", group: "Colors" },
    { key: "bg", label: "Background", type: "color", group: "Colors" },
    { key: "tile", label: "Image tile", type: "color", group: "Colors" },
    { key: "line", label: "Size chip border", type: "color", group: "Colors" },
  ],
};
