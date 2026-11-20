"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import type { Tweak, TweakConfig } from "../types";
import { str, num, list, fontStack, esc } from "../cfg";
import { fontField } from "../fields";
import { buildSchema, section, fontFaceFor } from "../liquid";
import { ProductArt, money, toNum, type ArtKind } from "./product-art";

/* ============================================================
   Product Ladder
   A "compare the family" row: 3–4 sibling styles side by side,
   each with a product visual, a caps collection line, price and
   three comparison highlights (level meters or short text). The
   product you're on is tagged; the others link to their page.
   Scrolls sideways with snap on narrow widths.
   ============================================================ */

const EASE = "cubic-bezier(.22,1,.36,1)";
const GAP = 12;

const defaults: TweakConfig = {
  heading: "Find your shape",
  subheading: "One fabric, four silhouettes. Compare lift, neckline and coverage side by side.",
  currency: "$",
  products: [
    { collection: "Second Skin", name: "Everyday wireless bra", price: "52", compare: "", v1: "2", v2: "V-neck", v3: "4", image: "/mockups/ladder-bra-nude.jpg" },
    { collection: "Second Skin", name: "Scoop tank bralette", price: "48", compare: "", v1: "1", v2: "Scoop", v3: "5", image: "/mockups/ladder-bra-cocoa.jpg" },
    { collection: "Second Skin", name: "Sculpt push-up bra", price: "54", compare: "62", v1: "5", v2: "Deep plunge", v3: "3", image: "/mockups/ladder-bra-black.jpg" },
    { collection: "Soft Form", name: "Strapless bandeau bra", price: "46", compare: "", v1: "3", v2: "Straight", v3: "2", image: "/mockups/ladder-bra-white.jpg" },
  ],
  current: 1,
  attr1: "Lift",
  attr2: "Neckline",
  attr3: "Coverage",
  currentText: "You're viewing",
  linkText: "View style",
  nameCase: "lowercase",
  art: "bra",
  textColor: "#2D2A26",
  accent: "#986B58",
  soft: "#B69A81",
  line: "#E8E0D5",
  tile: "#E8E0D5",
  bg: "#F7F4F0",
  font: "system",
  radius: 4,
};

/** Hex color + alpha byte, e.g. tint("#2D2A26", 0.7). */
const tint = (hex: string, a: number) =>
  /^#[0-9a-f]{6}$/i.test(hex)
    ? hex + Math.round(a * 255).toString(16).padStart(2, "0")
    : hex;

const isLight = (hex: string) => {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return false;
  const n = parseInt(m[1], 16);
  return 0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255) > 170;
};

/** Values "1"–"5" render as a level meter, anything else as text. */
const level = (v: string | undefined) => {
  const t = String(v ?? "").trim();
  return /^[1-5]$/.test(t) ? Number(t) : 0;
};

/* ---- Placeholder packshot: a bra silhouette, neckline varies per style ---- */

const NECKLINES = [
  { gore: 45, ctl: 36 }, // scoop
  { gore: 54, ctl: 40 }, // plunge
  { gore: 61, ctl: 45 }, // deep plunge
  { gore: 48, ctl: 33 }, // demi
];

function BraArt({ tone, variant }: { tone: string; variant: number }) {
  const { gore, ctl } = NECKLINES[variant % NECKLINES.length];
  const light = isLight(tone);
  const seam = light ? "rgba(0,0,0,.08)" : "rgba(255,255,255,.17)";
  const cup = `M37 33 Q51 ${ctl} 59 ${gore} L59 73 L22 73 Q14.5 50 37 33 Z`;
  const mirror = "translate(120 0) scale(-1 1)";
  return (
    <svg viewBox="0 0 120 96" className="block h-auto w-[80%]" aria-hidden>
      <ellipse cx="60" cy="89" rx="37" ry="2.6" fill="rgba(0,0,0,.07)" />
      <g stroke={tone} strokeWidth="2.2" strokeLinecap="round">
        <path d="M41.5 5 L37.6 33" />
        <path d="M78.5 5 L82.4 33" />
      </g>
      <g fill={light ? "rgba(0,0,0,.14)" : "rgba(255,255,255,.4)"}>
        <rect x="38" y="14" width="3.6" height="4.6" rx="1" transform="rotate(8 39.8 16.3)" />
        <rect x="78.4" y="14" width="3.6" height="4.6" rx="1" transform="rotate(-8 80.2 16.3)" />
      </g>
      <g fill={tone} stroke="rgba(0,0,0,.07)" strokeWidth=".6">
        <path d={cup} />
        <path d={cup} transform={mirror} />
        <rect x="58" y={gore - 1} width="4" height={75 - gore} />
        <rect x="19" y="71" width="82" height="11" rx="2.5" />
      </g>
      <g fill="none" stroke={seam} strokeWidth="1" strokeLinecap="round">
        <path d={`M26.5 63 Q40 51 55 ${gore + 8}`} />
        <path d={`M26.5 63 Q40 51 55 ${gore + 8}`} transform={mirror} />
        <path d="M22 76.5 H98" strokeDasharray="1.4 1.6" />
      </g>
      <circle cx="60" cy={gore + 3.5} r="1.5" fill={light ? "rgba(0,0,0,.18)" : "rgba(255,255,255,.5)"} />
    </svg>
  );
}

function Meter({ value, on, off }: { value: number; on: string; off: string }) {
  return (
    <span className="inline-flex gap-[2px]" role="img" aria-label={`${value} of 5`}>
      {Array.from({ length: 5 }, (_, i) => (
        <span
          key={i}
          className="h-[3px] w-[10px] rounded-full transition-colors duration-500"
          style={{ background: i < value ? on : off }}
        />
      ))}
    </span>
  );
}

function Arrow({
  dir,
  disabled,
  onClick,
  line,
}: {
  dir: -1 | 1;
  disabled: boolean;
  onClick: () => void;
  line: string;
}) {
  return (
    <button
      type="button"
      aria-label={dir < 0 ? "Previous styles" : "Next styles"}
      disabled={disabled}
      onClick={onClick}
      className="grid h-[34px] w-[34px] place-items-center rounded-full transition-[opacity,background-color,scale] duration-300 enabled:hover:bg-black/[0.04] enabled:active:scale-95 disabled:opacity-35"
      style={{ boxShadow: `inset 0 0 0 1px ${line}`, transitionTimingFunction: EASE }}
    >
      <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d={dir < 0 ? "M10 3.5L5.5 8l4.5 4.5" : "M6 3.5L10.5 8 6 12.5"} />
      </svg>
    </button>
  );
}

function Preview({ config }: { config: TweakConfig }) {
  const cur = str(config, "currency", "$");
  const text = str(config, "textColor", "#2D2A26");
  const accent = str(config, "accent", "#986B58");
  const soft = str(config, "soft", "#B69A81");
  const line = str(config, "line", "#E8E0D5");
  const tile = str(config, "tile", "#E8E0D5");
  const bg = str(config, "bg", "#F7F4F0");
  const radius = num(config, "radius", 4);
  const art = str(config, "art", "bra");
  const nameCase = str(config, "nameCase", "lowercase") as CSSProperties["textTransform"];
  const items = list(config, "products");
  const attrs = [str(config, "attr1"), str(config, "attr2"), str(config, "attr3")];
  const tones = [soft, accent, text, bg];

  /* follow the "current product" control, but let shoppers click around */
  const initial = Math.max(0, Math.min(num(config, "current", 1) - 1, items.length - 1));
  const [prevInitial, setPrevInitial] = useState(initial);
  const [sel, setSel] = useState(initial);
  if (initial !== prevInitial) {
    setPrevInitial(initial);
    setSel(initial);
  }
  const active = Math.max(0, Math.min(sel, items.length - 1));

  /* scroll state for arrows + progress bar */
  const rail = useRef<HTMLDivElement>(null);
  const [sc, setSc] = useState({ over: false, prev: false, next: false, f: 1, p: 0 });
  const measure = useCallback(() => {
    const el = rail.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setSc({
      over: max > 2,
      prev: el.scrollLeft > 2,
      next: el.scrollLeft < max - 2,
      f: el.scrollWidth ? Math.min(1, el.clientWidth / el.scrollWidth) : 1,
      p: max > 0 ? Math.min(1, Math.max(0, el.scrollLeft / max)) : 0,
    });
  }, []);
  useEffect(() => {
    const el = rail.current;
    if (!el) return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    Array.from(el.children).forEach((c) => ro.observe(c));
    return () => ro.disconnect();
  }, [measure, items.length]);

  /* keep the current product in view (like the storefront does on load) */
  useEffect(() => {
    const el = rail.current;
    const card = el?.children[active] as HTMLElement | undefined;
    if (!el || !card) return;
    const pad = parseFloat(getComputedStyle(el).paddingLeft) || 0;
    const x = card.offsetLeft - el.scrollLeft;
    const visible = x >= pad - 1 && x + card.offsetWidth <= el.clientWidth - pad + 1;
    if (!visible) el.scrollTo({ left: Math.max(0, card.offsetLeft - pad), behavior: "smooth" });
  }, [active, items.length]);

  const go = (d: -1 | 1) => {
    const el = rail.current;
    if (!el) return;
    const first = el.firstElementChild as HTMLElement | null;
    el.scrollBy({ left: d * ((first?.offsetWidth ?? el.clientWidth * 0.8) + GAP), behavior: "smooth" });
  };

  const heading = str(config, "heading");
  const sub = str(config, "subheading");
  const linkText = str(config, "linkText", "View style");
  const currentText = str(config, "currentText");

  return (
    <div
      className="@container w-full"
      style={{ background: bg, color: text, fontFamily: fontStack(str(config, "font", "system")) }}
    >
      <div className="mx-auto w-full max-w-[1200px] py-9 @min-[760px]:py-12">
        {/* Heading row */}
        <div className="flex items-end justify-between gap-4 px-5 @min-[760px]:px-8">
          <div className="min-w-0">
            {heading && (
              <h3 className="text-[14px] font-medium uppercase leading-tight tracking-[0.025em]">
                {heading}
              </h3>
            )}
            {sub && (
              <p className="mt-1.5 max-w-[420px] text-[12.5px] leading-relaxed" style={{ color: tint(text, 0.68) }}>
                {sub}
              </p>
            )}
          </div>
          <div
            className="flex shrink-0 gap-1.5 transition-opacity duration-300"
            style={{ opacity: sc.over ? 1 : 0, pointerEvents: sc.over ? "auto" : "none" }}
          >
            <Arrow dir={-1} disabled={!sc.prev} onClick={() => go(-1)} line={line} />
            <Arrow dir={1} disabled={!sc.next} onClick={() => go(1)} line={line} />
          </div>
        </div>

        {/* Rail */}
        <div
          ref={rail}
          onScroll={measure}
          className="bs-no-scrollbar relative mt-5 flex snap-x snap-mandatory overflow-x-auto scroll-px-5 px-5 @min-[760px]:scroll-px-8 @min-[760px]:px-8"
          style={{ gap: GAP }}
        >
          {items.map((p, i) => {
            const on = i === active;
            const price = toNum(p.price);
            const cmp = toNum(p.compare);
            const sale = cmp > price;
            const tone = tones[i % tones.length];
            const photo = (p.image ?? "").trim();
            return (
              <div
                key={i}
                className="group relative min-w-0 shrink-0 grow-0 basis-[64%] snap-start @min-[520px]:basis-[40%] @min-[760px]:grow @min-[760px]:basis-[calc((100%_-_36px)/4)]"
              >
                <button
                  type="button"
                  disabled={on}
                  aria-current={on ? "page" : undefined}
                  aria-label={on ? undefined : `${linkText}: ${p.name ?? ""}`}
                  onClick={() => setSel(i)}
                  className="block w-full text-left disabled:cursor-default"
                >
                  {/* Visual */}
                  <span
                    className="relative grid aspect-[4/5] place-items-center overflow-hidden"
                    style={{ background: tile, borderRadius: radius }}
                  >
                    <span
                      className={`absolute inset-0 grid place-items-center transition-[scale] duration-700 ${on ? "" : "group-hover:scale-[1.04]"}`}
                      style={{ transitionTimingFunction: EASE }}
                    >
                      {photo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={photo}
                          alt={p.name ?? ""}
                          loading="lazy"
                          decoding="async"
                          className="absolute inset-0 h-full w-full object-cover"
                        />
                      ) : art === "bra" ? (
                        <BraArt tone={tone} variant={i} />
                      ) : (
                        <ProductArt kind={art as ArtKind} tone={tone === bg ? accent : tone} size={150} tile="transparent" />
                      )}
                    </span>
                    <span
                      aria-hidden
                      className="pointer-events-none absolute inset-0 transition-opacity duration-500"
                      style={{ boxShadow: `inset 0 0 0 1px ${text}`, borderRadius: radius, opacity: on ? 1 : 0 }}
                    />
                    {on && currentText && (
                      <span
                        key={`tag${i}`}
                        className="bs-swap absolute left-2 top-2 inline-flex items-center gap-1.5 px-2 py-[5px] text-[9.5px] uppercase leading-none tracking-[0.06em]"
                        style={{ background: text, color: bg, borderRadius: Math.min(radius, 3) }}
                      >
                        <span className="h-[5px] w-[5px] rounded-full" style={{ background: bg }} />
                        {currentText}
                      </span>
                    )}
                  </span>

                  {/* Name + price */}
                  {p.collection && (
                    <span className="mt-3 block text-[10px] uppercase tracking-[0.06em]" style={{ color: accent }}>
                      {p.collection}
                    </span>
                  )}
                  <span className="mt-1 block text-[13.5px] leading-snug" style={{ textTransform: nameCase }}>
                    {p.name}
                  </span>
                  <span className="mt-1 block text-[12.5px] tabular-nums">
                    {sale && (
                      <s className="mr-1.5" style={{ color: soft }}>
                        {money(cmp, cur)}
                      </s>
                    )}
                    <span style={{ color: sale ? accent : text }}>{money(price, cur)}</span>
                  </span>

                  {/* Highlights */}
                  <span className="mt-3 block border-t pt-2" style={{ borderColor: line }}>
                    {attrs.map((label, k) => {
                      const v = p[`v${k + 1}`] ?? "";
                      if (!label && !v.trim()) return null;
                      const lv = level(v);
                      return (
                        <span key={k} className="flex min-h-[24px] items-center justify-between gap-2.5">
                          <span className="text-[9.5px] uppercase tracking-[0.06em]" style={{ color: accent }}>
                            {label}
                          </span>
                          {lv ? (
                            <Meter value={lv} on={text} off={line} />
                          ) : (
                            <span className="truncate text-right text-[12px]">{v}</span>
                          )}
                        </span>
                      );
                    })}
                  </span>

                  {/* Link */}
                  {!on && linkText && (
                    <span
                      className="mt-3 inline-flex items-center gap-1.5 border-b pb-0.5 text-[10.5px] uppercase tracking-[0.06em]"
                      style={{ borderColor: text }}
                    >
                      {linkText}
                      <svg
                        width="10"
                        height="10"
                        viewBox="0 0 16 16"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden
                        className="transition-[translate] duration-300 group-hover:translate-x-[3px]"
                        style={{ transitionTimingFunction: EASE }}
                      >
                        <path d="M2.5 8h11M9 3.5L13.5 8 9 12.5" />
                      </svg>
                    </span>
                  )}
                </button>
              </div>
            );
          })}
        </div>

        {/* Scroll progress */}
        <div
          aria-hidden
          className="mx-5 mt-6 h-[2px] overflow-hidden rounded-full transition-opacity duration-300 @min-[760px]:mx-8"
          style={{ background: line, opacity: sc.over ? 1 : 0 }}
        >
          <div
            className="h-full rounded-full"
            style={{
              width: `${sc.f * 100}%`,
              transform: `translateX(${sc.p * (1 / sc.f - 1) * 100}%)`,
              background: text,
            }}
          />
        </div>
      </div>
    </div>
  );
}

function generateLiquid(config: TweakConfig): string {
  const { face, family } = fontFaceFor(str(config, "font", "system"));
  const S = ".bs-pl-{{ section.id }}";
  const r = "{{ section.settings.radius }}px";

  const style = `<style>
${face ? face + "\n" : ""}  ${S} { container-type: inline-size; background: {{ section.settings.bg }}; color: {{ section.settings.text_color }}; font-family: ${family}; }
  ${S} * { box-sizing: border-box; }
  ${S} p, ${S} h2, ${S} ul { margin: 0; }
  ${S} a { color: inherit; text-decoration: none; }
  ${S} .bs-in { max-width: 1200px; margin: 0 auto; padding: 36px 0; }
  ${S} .bs-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; padding: 0 20px; }
  ${S} .bs-h { font-size: 14px; font-weight: 500; line-height: 1.25; text-transform: uppercase; letter-spacing: .025em; }
  ${S} .bs-sh { margin-top: 6px; max-width: 420px; font-size: 12.5px; line-height: 1.6; opacity: .7; }
  ${S} .bs-arrows { display: flex; gap: 6px; flex-shrink: 0; opacity: 0; pointer-events: none; transition: opacity .3s; }
  ${S}.has-overflow .bs-arrows { opacity: 1; pointer-events: auto; }
  ${S} .bs-arrow { width: 34px; height: 34px; padding: 0; border: 0; border-radius: 99px; background: transparent; color: inherit; cursor: pointer;
    display: grid; place-items: center; box-shadow: inset 0 0 0 1px {{ section.settings.line }}; transition: opacity .3s, background-color .3s, transform .2s; }
  ${S} .bs-arrow:hover:not(:disabled) { background: rgba(0,0,0,.04); }
  ${S} .bs-arrow:active:not(:disabled) { transform: scale(.95); }
  ${S} .bs-arrow:disabled { opacity: .35; cursor: default; }
  ${S} .bs-rail { position: relative; display: flex; gap: ${GAP}px; margin-top: 20px; padding: 0 20px; overflow-x: auto; scroll-snap-type: x mandatory;
    scroll-padding: 0 20px; scrollbar-width: none; -webkit-overflow-scrolling: touch; }
  ${S} .bs-rail::-webkit-scrollbar { display: none; }
  ${S} .bs-card { position: relative; flex: 0 0 64%; min-width: 0; scroll-snap-align: start; }
  ${S} .bs-tile { position: relative; display: block; aspect-ratio: 4 / 5; overflow: hidden; background: {{ section.settings.tile }}; border-radius: ${r}; }
  ${S} .bs-tile img, ${S} .bs-tile .bs-ph { display: block; width: 100%; height: 100%; object-fit: cover; transition: transform .7s cubic-bezier(.22,1,.36,1); }
  ${S} .bs-tile .bs-ph { fill: {{ section.settings.soft }}; }
  ${S} .bs-card:not(.is-current):hover .bs-tile img { transform: scale(1.04); }
  ${S} .bs-tile::after { content: ""; position: absolute; inset: 0; border-radius: inherit; pointer-events: none; opacity: 0;
    box-shadow: inset 0 0 0 1px {{ section.settings.text_color }}; transition: opacity .5s; }
  ${S} .is-current .bs-tile::after { opacity: 1; }
  ${S} .bs-tag { position: absolute; top: 8px; left: 8px; z-index: 1; display: inline-flex; align-items: center; gap: 6px; padding: 5px 8px;
    font-size: 9.5px; line-height: 1; letter-spacing: .06em; text-transform: uppercase; border-radius: 3px;
    background: {{ section.settings.text_color }}; color: {{ section.settings.bg }}; }
  ${S} .bs-tag::before { content: ""; width: 5px; height: 5px; border-radius: 99px; background: currentColor; }
  ${S} .bs-coll { margin-top: 12px; font-size: 10px; letter-spacing: .06em; text-transform: uppercase; color: {{ section.settings.accent }}; }
  ${S} .bs-name { margin-top: 4px; font-size: 13.5px; line-height: 1.35; text-transform: {{ section.settings.name_case }}; }
  ${S} .bs-price { margin-top: 4px; font-size: 12.5px; font-variant-numeric: tabular-nums; }
  ${S} .bs-price s { margin-right: 6px; color: {{ section.settings.soft }}; }
  ${S} .bs-price .is-sale { color: {{ section.settings.accent }}; }
  ${S} .bs-hl { margin-top: 12px; padding: 8px 0 0; list-style: none; border-top: 1px solid {{ section.settings.line }}; }
  ${S} .bs-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; min-height: 24px; }
  ${S} .bs-k { font-size: 9.5px; letter-spacing: .06em; text-transform: uppercase; color: {{ section.settings.accent }}; }
  ${S} .bs-v { font-size: 12px; text-align: right; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  ${S} .bs-meter { display: inline-flex; gap: 2px; }
  ${S} .bs-meter i { width: 10px; height: 3px; border-radius: 99px; background: {{ section.settings.line }}; }
  ${S} .bs-meter i.on { background: {{ section.settings.text_color }}; }
  ${S} .bs-cta { margin-top: 12px; display: inline-flex; align-items: center; gap: 6px; padding-bottom: 2px; border-bottom: 1px solid currentColor;
    font-size: 10.5px; letter-spacing: .06em; text-transform: uppercase; }
  ${S} .bs-cta svg { transition: transform .3s cubic-bezier(.22,1,.36,1); }
  ${S} .bs-card:hover .bs-cta svg { transform: translateX(3px); }
  ${S} .bs-cover { position: absolute; inset: 0; z-index: 2; border-radius: ${r}; }
  ${S} .bs-cover:focus-visible { outline: 2px solid {{ section.settings.text_color }}; outline-offset: 3px; }
  ${S} .bs-bar { height: 2px; margin: 24px 20px 0; overflow: hidden; border-radius: 99px; background: {{ section.settings.line }}; opacity: 0; transition: opacity .3s; }
  ${S}.has-overflow .bs-bar { opacity: 1; }
  ${S} .bs-thumb { display: block; width: 100%; height: 100%; border-radius: 99px; background: {{ section.settings.text_color }}; }
  @container (min-width: 520px) {
    ${S} .bs-card { flex-basis: 40%; }
  }
  @container (min-width: 760px) {
    ${S} .bs-in { padding: 48px 0; }
    ${S} .bs-head, ${S} .bs-rail { padding-left: 32px; padding-right: 32px; }
    ${S} .bs-rail { scroll-padding: 0 32px; }
    ${S} .bs-bar { margin-left: 32px; margin-right: 32px; }
    ${S} .bs-card { flex: 1 0 calc((100% - ${GAP * 3}px) / 4); }
  }
</style>`;

  const arrow = (d: string) =>
    `<svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg>`;

  const markup = `{%- comment -%}
  Product Ladder by boost.supply. Add it to your product template.
  1. Under "Products", pick the styles in this family, including the
     product itself: it gets the "You're viewing" tag automatically.
  2. Add one "Card" block per product, in the same order (block 1 is
     product 1), for the collection line and the three comparison values.
     A value of 1 to 5 shows as a level meter, anything else as text.
  No products picked? The Card blocks show on their own, with their own
  title, price, link and image.
  Images come from each product's featured image, or from the Card block's
  image picker when no products are picked.
{%- endcomment -%}
{%- liquid
  assign bs_use_products = false
  if section.settings.products != blank
    assign bs_use_products = true
    assign bs_items = section.settings.products
  else
    assign bs_items = section.blocks
  endif
-%}
<div class="bs-pl-{{ section.id }}" id="bs-pl-{{ section.id }}">
  <div class="bs-in">
    <div class="bs-head">
      <div>
        {%- if section.settings.heading != blank -%}<h2 class="bs-h">{{ section.settings.heading }}</h2>{%- endif -%}
        {%- if section.settings.subheading != blank -%}<p class="bs-sh">{{ section.settings.subheading }}</p>{%- endif -%}
      </div>
      <div class="bs-arrows">
        <button type="button" class="bs-arrow" data-dir="-1" aria-label="Previous styles">${arrow("M10 3.5L5.5 8l4.5 4.5")}</button>
        <button type="button" class="bs-arrow" data-dir="1" aria-label="Next styles">${arrow("M6 3.5L10.5 8 6 12.5")}</button>
      </div>
    </div>

    <div class="bs-rail" data-rail>
      {%- for bs_it in bs_items -%}
        {%- liquid
          if bs_use_products
            assign bs_b = section.blocks[forloop.index0]
            assign bs_title = bs_it.title
            assign bs_url = bs_it.url
            assign bs_img = bs_it.featured_image
            assign bs_price = bs_it.price | money
            assign bs_cmp = ''
            if bs_it.compare_at_price > bs_it.price
              assign bs_cmp = bs_it.compare_at_price | money
            endif
            assign bs_cur = false
            if product and bs_it.id == product.id
              assign bs_cur = true
            endif
          else
            assign bs_b = bs_it
            assign bs_title = bs_b.settings.title
            assign bs_url = bs_b.settings.url
            assign bs_img = bs_b.settings.image
            assign bs_price = bs_b.settings.price
            assign bs_cmp = bs_b.settings.compare
            assign bs_cur = bs_b.settings.is_current
            if product and bs_url != blank and bs_url == product.url
              assign bs_cur = true
            endif
          endif
        -%}
        <article class="bs-card{% if bs_cur %} is-current{% endif %}"{% if bs_cur %} aria-current="page"{% endif %} {{ bs_b.shopify_attributes }}>
          <div class="bs-tile">
            {%- if bs_cur and section.settings.current_text != blank -%}<span class="bs-tag">{{ section.settings.current_text }}</span>{%- endif -%}
            {%- if bs_img -%}
              {{ bs_img | image_url: width: 640 | image_tag: loading: 'lazy', alt: bs_title, sizes: '(min-width: 990px) 25vw, 64vw' }}
            {%- else -%}
              {{ 'product-apparel-1' | placeholder_svg_tag: 'bs-ph' }}
            {%- endif -%}
          </div>
          {%- if bs_b.settings.collection != blank -%}<p class="bs-coll">{{ bs_b.settings.collection }}</p>{%- endif -%}
          <p class="bs-name">{{ bs_title }}</p>
          <p class="bs-price">
            {%- if bs_cmp != blank -%}<s>{{ bs_cmp }}</s><span class="is-sale">{{ bs_price }}</span>{%- else -%}{{ bs_price }}{%- endif -%}
          </p>
          {%- if bs_b -%}
            <ul class="bs-hl">
              {%- for bs_n in (1..3) -%}
                {%- assign bs_lk = 'attr_' | append: bs_n -%}
                {%- assign bs_vk = 'value_' | append: bs_n -%}
                {%- assign bs_label = section.settings[bs_lk] -%}
                {%- assign bs_val = bs_b.settings[bs_vk] | strip -%}
                {%- if bs_label != blank or bs_val != blank -%}
                  {%- assign bs_lvl = bs_val | plus: 0 -%}
                  <li class="bs-row">
                    <span class="bs-k">{{ bs_label }}</span>
                    {%- if bs_val.size == 1 and bs_lvl >= 1 and bs_lvl <= 5 -%}
                      <span class="bs-meter" role="img" aria-label="{{ bs_lvl }} of 5">
                        {%- for bs_d in (1..5) -%}<i{% if bs_d <= bs_lvl %} class="on"{% endif %}></i>{%- endfor -%}
                      </span>
                    {%- else -%}
                      <span class="bs-v">{{ bs_val }}</span>
                    {%- endif -%}
                  </li>
                {%- endif -%}
              {%- endfor -%}
            </ul>
          {%- endif -%}
          {%- unless bs_cur -%}
            {%- if bs_url != blank -%}
              {%- if section.settings.link_text != blank -%}
                <span class="bs-cta">{{ section.settings.link_text }}<svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2.5 8h11M9 3.5L13.5 8 9 12.5"/></svg></span>
              {%- endif -%}
              <a class="bs-cover" href="{{ bs_url }}" aria-label="{{ bs_title | escape }}"></a>
            {%- endif -%}
          {%- endunless -%}
        </article>
      {%- endfor -%}
    </div>

    <div class="bs-bar" aria-hidden="true"><span class="bs-thumb" data-thumb></span></div>
  </div>
</div>
<script>
  (function () {
    var root = document.getElementById('bs-pl-{{ section.id }}');
    if (!root) return;
    var rail = root.querySelector('[data-rail]');
    var thumb = root.querySelector('[data-thumb]');
    var prev = root.querySelector('[data-dir="-1"]');
    var next = root.querySelector('[data-dir="1"]');
    if (!rail) return;
    function update() {
      var max = rail.scrollWidth - rail.clientWidth;
      var f = rail.scrollWidth ? Math.min(1, rail.clientWidth / rail.scrollWidth) : 1;
      var p = max > 0 ? Math.min(1, Math.max(0, rail.scrollLeft / max)) : 0;
      root.classList.toggle('has-overflow', max > 2);
      if (thumb) {
        thumb.style.width = (f * 100) + '%';
        thumb.style.transform = 'translateX(' + (p * (1 / f - 1) * 100) + '%)';
      }
      if (prev) prev.disabled = rail.scrollLeft <= 2;
      if (next) next.disabled = rail.scrollLeft >= max - 2;
    }
    function go(dir) {
      var card = rail.querySelector('.bs-card');
      var step = card ? card.offsetWidth + ${GAP} : rail.clientWidth * 0.8;
      rail.scrollBy({ left: dir * step, behavior: 'smooth' });
    }
    if (prev) prev.addEventListener('click', function () { go(-1); });
    if (next) next.addEventListener('click', function () { go(1); });
    rail.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    var cur = rail.querySelector('.is-current');
    if (cur && cur.offsetLeft + cur.offsetWidth > rail.clientWidth) {
      rail.scrollLeft = cur.offsetLeft - parseFloat(getComputedStyle(rail).paddingLeft || 0);
    }
    update();
  })();
</script>`;

  const items = list(config, "products");
  const current = num(config, "current", 1);
  const cur = str(config, "currency", "$");
  const nameCase = str(config, "nameCase", "lowercase");

  const schema = buildSchema({
    name: "Product Ladder",
    settings: [
      { type: "text", id: "heading", label: "Heading", default: str(config, "heading") },
      { type: "text", id: "subheading", label: "Subheading", default: str(config, "subheading") },
      {
        type: "product_list",
        id: "products",
        label: "Products",
        limit: 6,
        info: "The styles in this family, including this product. Card block 1 adds the highlights for product 1, and so on.",
      },
      { type: "header", content: "Comparison" },
      { type: "text", id: "attr_1", label: "Highlight 1 label", default: str(config, "attr1") },
      { type: "text", id: "attr_2", label: "Highlight 2 label", default: str(config, "attr2") },
      { type: "text", id: "attr_3", label: "Highlight 3 label", default: str(config, "attr3") },
      { type: "text", id: "current_text", label: "Current product tag", default: str(config, "currentText") },
      { type: "text", id: "link_text", label: "Link text", default: str(config, "linkText") },
      {
        type: "select",
        id: "name_case",
        label: "Product name case",
        options: [
          { value: "lowercase", label: "lowercase" },
          { value: "none", label: "As written" },
          { value: "uppercase", label: "UPPERCASE" },
        ],
        default: ["lowercase", "none", "uppercase"].includes(nameCase) ? nameCase : "lowercase",
      },
      { type: "header", content: "Style" },
      { type: "color", id: "text_color", label: "Text", default: str(config, "textColor") },
      { type: "color", id: "accent", label: "Accent (labels, sale price)", default: str(config, "accent") },
      { type: "color", id: "soft", label: "Soft (compare-at price)", default: str(config, "soft") },
      { type: "color", id: "line", label: "Lines & empty meter", default: str(config, "line") },
      { type: "color", id: "tile", label: "Image background", default: str(config, "tile") },
      { type: "color", id: "bg", label: "Background", default: str(config, "bg") },
      { type: "range", id: "radius", label: "Corner radius", min: 0, max: 20, step: 2, unit: "px", default: Math.max(0, Math.min(20, Math.round(num(config, "radius", 4) / 2) * 2)) },
    ],
    blocks: [
      {
        type: "card",
        name: "Card",
        settings: [
          { type: "text", id: "collection", label: "Collection line" },
          { type: "text", id: "value_1", label: "Highlight 1 value (1-5 = meter)" },
          { type: "text", id: "value_2", label: "Highlight 2 value (1-5 = meter)" },
          { type: "text", id: "value_3", label: "Highlight 3 value (1-5 = meter)" },
          { type: "header", content: "Only used when no products are picked" },
          { type: "text", id: "title", label: "Title" },
          { type: "text", id: "price", label: "Price" },
          { type: "text", id: "compare", label: "Compare-at price" },
          { type: "url", id: "url", label: "Link" },
          { type: "image_picker", id: "image", label: "Image" },
          { type: "checkbox", id: "is_current", label: "This is the current product", default: false },
        ],
      },
    ],
    maxBlocks: 6,
    presetBlocks: items.slice(0, 6).map((p, i) => {
      const price = toNum(p.price);
      const cmp = toNum(p.compare);
      return {
        type: "card",
        settings: {
          collection: esc(p.collection ?? ""),
          value_1: esc(p.v1 ?? ""),
          value_2: esc(p.v2 ?? ""),
          value_3: esc(p.v3 ?? ""),
          title: esc(p.name ?? ""),
          price: esc(money(price, cur)),
          compare: cmp > price ? esc(money(cmp, cur)) : "",
          is_current: i === current - 1,
        },
      };
    }),
  });

  return section({ style, markup, schema });
}

export const productLadder: Tweak = {
  slug: "product-ladder",
  inspiredBy: "skims",
  name: "Product Ladder",
  tagline: "Sibling styles side by side, so shoppers find the right one instead of leaving.",
  description:
    "Modeled on the comparison row SKIMS uses on its product pages. Three or four styles from the same family sit side by side with a product image, collection line, price and three highlights shown as level meters or short labels. The product you're on is tagged, the others link through, and the row swipes with snap on mobile. It turns \"not quite right\" into a click to the sibling that is.",
  category: "product-page",
  tier: "paid",
  price: 29,
  tint: "#f3eee8",
  Preview,
  generateLiquid,
  defaults,
  fields: [
    { key: "heading", label: "Heading", type: "text", group: "Content" },
    { key: "subheading", label: "Subheading", type: "textarea", group: "Content" },
    { key: "currency", label: "Currency symbol", type: "text", group: "Content" },
    {
      key: "products", label: "Products", type: "list", group: "Products",
      hint: "Preview only: in Shopify you pick the real products and their photos. Highlight values 1–5 show as a meter, anything else as text. Leave the image URL empty for a drawn placeholder",
      itemFields: [
        { key: "collection", label: "Collection line", type: "text" },
        { key: "name", label: "Style name", type: "text" },
        { key: "price", label: "Price", type: "text" },
        { key: "compare", label: "Compare-at", type: "text" },
        { key: "v1", label: "Highlight 1", type: "text" },
        { key: "v2", label: "Highlight 2", type: "text" },
        { key: "v3", label: "Highlight 3", type: "text" },
        { key: "image", label: "Image URL", type: "text" },
      ],
      newItem: { collection: "Soft Form", name: "Lounge bralette", price: "38", compare: "", v1: "1", v2: "V-neck", v3: "3", image: "/mockups/ladder-bra-nude.jpg" },
      addLabel: "Add style",
      max: 6,
    },
    { key: "current", label: "Current product", type: "slider", group: "Products", min: 1, max: 6, step: 1, hint: "Which card gets the tag in the preview. In Shopify this is automatic" },
    { key: "attr1", label: "Highlight 1 label", type: "text", group: "Comparison" },
    { key: "attr2", label: "Highlight 2 label", type: "text", group: "Comparison" },
    { key: "attr3", label: "Highlight 3 label", type: "text", group: "Comparison" },
    { key: "currentText", label: "Current product tag", type: "text", group: "Comparison" },
    { key: "linkText", label: "Link text", type: "text", group: "Comparison" },
    {
      key: "nameCase", label: "Product name case", type: "select", group: "Typography",
      options: [
        { label: "lowercase", value: "lowercase" },
        { label: "As written", value: "none" },
        { label: "UPPERCASE", value: "uppercase" },
      ],
    },
    fontField("Typography"),
    {
      key: "art", label: "Fallback drawing", type: "select", group: "Layout",
      hint: "Drawn placeholder for styles without an image URL. Your store shows the product photos",
      options: [
        { label: "Bra silhouette", value: "bra" },
        { label: "Bottle", value: "bottle" },
        { label: "Jar", value: "jar" },
        { label: "Tube", value: "tube" },
        { label: "Spray", value: "spray" },
      ],
    },
    { key: "radius", label: "Corner radius", type: "slider", group: "Layout", min: 0, max: 20, step: 2, unit: "px" },
    { key: "textColor", label: "Text", type: "color", group: "Colors" },
    { key: "accent", label: "Accent", type: "color", group: "Colors" },
    { key: "soft", label: "Soft", type: "color", group: "Colors" },
    { key: "line", label: "Lines", type: "color", group: "Colors" },
    { key: "tile", label: "Image background", type: "color", group: "Colors" },
    { key: "bg", label: "Background", type: "color", group: "Colors" },
  ],
};
