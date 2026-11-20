"use client";

import { useEffect, useState, type CSSProperties } from "react";
import type { Tweak, TweakConfig } from "../types";
import { str, num, bool, list, fontStack, esc } from "../cfg";
import { fontField } from "../fields";
import { buildSchema, section, fontFaceFor } from "../liquid";
import { money, toNum } from "./product-art";

/* ============================================================
   Variety Pack Builder
   Build-your-own 12-pack. Every flavour card has a +/- counter,
   a can grid fills slot by slot in the flavour colours ("8 of 12,
   add 4 more"), "Surprise me" tops the pack up at random, a toggle
   switches between two pack sizes, and the add button unlocks only
   once every slot is filled. The price per can drops with the
   bigger pack.
   ============================================================ */

const EASE = "cubic-bezier(.22,1,.36,1)";
const R = 27;
const CIRC = 2 * Math.PI * R;

const DISPLAY_FONTS: Record<string, { family: string; italic: boolean; weight: number }> = {
  retro: { family: "Georgia, 'Iowan Old Style', 'Palatino Linotype', serif", italic: true, weight: 700 },
  serif: { family: "Georgia, 'Iowan Old Style', 'Palatino Linotype', serif", italic: false, weight: 700 },
  sans: { family: "ui-sans-serif, system-ui, -apple-system, sans-serif", italic: false, weight: 800 },
  inherit: { family: "inherit", italic: false, weight: 700 },
};

/* Drawn can for flavours without a photo. Shared by preview and Liquid;
   colours come from CSS variables on the card (--dk body, --c emblem,
   --lbl label, --ink text lines). */
const CAN_SVG = `<svg viewBox="0 0 120 200" aria-hidden="true"><ellipse cx="60" cy="193" rx="34" ry="5" fill="rgba(0,0,0,.16)"/><rect x="26" y="22" width="68" height="166" rx="14" style="fill:var(--dk)"/><rect x="29" y="12" width="62" height="14" rx="7" fill="#dcdfdf"/><rect x="35" y="14.5" width="50" height="5" rx="2.5" fill="#bfc5c5"/><rect x="26" y="180" width="68" height="9" rx="4.5" fill="#c8cdcd"/><rect x="34" y="62" width="52" height="84" rx="10" style="fill:var(--lbl)"/><circle cx="60" cy="92" r="14" style="fill:var(--c)"/><rect x="44" y="116" width="32" height="5" rx="2.5" style="fill:var(--ink)"/><rect x="48" y="126" width="24" height="3.5" rx="1.75" style="fill:var(--ink)" opacity=".5"/><rect x="32" y="28" width="6" height="150" rx="3" fill="#fff" opacity=".3"/><rect x="86" y="28" width="6" height="150" rx="3" fill="#000" opacity=".08"/></svg>`;

const SLICE_SVG = `<svg viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="19" fill="#fff" opacity=".3"/><circle cx="20" cy="20" r="15" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width="1.5"/><path d="M20 6v28M7.9 13l24.2 14M7.9 27l24.2-14" stroke="#fff" stroke-opacity=".6" stroke-width="1.5" stroke-linecap="round"/></svg>`;

const DICE_SVG = `<svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><rect x="2" y="2" width="12" height="12" rx="3.2"/><circle cx="5.6" cy="5.6" r=".9" fill="currentColor" stroke="none"/><circle cx="10.4" cy="10.4" r=".9" fill="currentColor" stroke="none"/><circle cx="10.4" cy="5.6" r=".9" fill="currentColor" stroke="none"/><circle cx="5.6" cy="10.4" r=".9" fill="currentColor" stroke="none"/></svg>`;

const defaults: TweakConfig = {
  eyebrow: "Variety pack",
  heading: "Build your own pack",
  subheading: "Mix any flavors you like. Fill every slot to unlock the pack price.",
  packA: 12,
  packB: 24,
  showToggle: true,
  packWord: "pack",
  canPrice: "3.25",
  offA: 8,
  offB: 15,
  currency: "$",
  ofLabel: "of",
  moreText: "Add {n} more",
  fullText: "Pack complete. Nice picks!",
  surpriseLabel: "Surprise me",
  perCanLabel: "per can",
  saveLabel: "Save",
  lockedText: "Pick {n} more",
  buttonText: "Add pack to cart",
  addedText: "Added to cart",
  flavors: [
    { name: "Strawberry Vanilla", color: "#F59AA5", image: "/mockups/soda-strawberry.jpg", note: "5g sugar · 9g fiber", start: "3" },
    { name: "Orange Cream", color: "#FB9108", image: "/mockups/soda-orange.jpg", note: "4g sugar · 9g fiber", start: "3" },
    { name: "Black Cherry", color: "#7A1F2A", image: "/mockups/soda-cherry.jpg", note: "2g sugar · 9g fiber", start: "2" },
    { name: "Lime Ginger", color: "#A9D46F", image: "", note: "3g sugar · 9g fiber", start: "0" },
  ],
  bg: "#FFF6EA",
  textColor: "#034638",
  lightText: "#FFF6EA",
  panelBg: "#F3E4CD",
  accent: "#008168",
  mint: "#98E1C3",
  buttonBg: "#034638",
  buttonText2: "#FFF6EA",
  font: "system",
  displayFont: "retro",
  radius: 24,
};

/* ---- colour helpers (mirror Shopify's color_brightness / color_darken) ---- */

const parseHex = (hex: string): [number, number, number] | null => {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex).trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

const brightness = (hex: string) => {
  const c = parseHex(hex);
  return c ? (c[0] * 299 + c[1] * 587 + c[2] * 114) / 1000 : 255;
};

const alpha = (hex: string, a: number) => {
  const c = parseHex(hex);
  return c ? `rgba(${c[0]},${c[1]},${c[2]},${a})` : hex;
};

const darken = (hex: string, pts: number) => {
  const c = parseHex(hex);
  if (!c) return hex;
  const [r, g, b] = c.map((v) => v / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  let h = 0;
  let s = 0;
  if (d) {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h /= 6;
  }
  const L = Math.max(0, l - pts / 100);
  const q = L < 0.5 ? L * (1 + s) : L + s - L * s;
  const p = 2 * L - q;
  const ch = (t: number) => {
    const tt = t < 0 ? t + 1 : t > 1 ? t - 1 : t;
    const v = tt < 1 / 6 ? p + (q - p) * 6 * tt : tt < 1 / 2 ? q : tt < 2 / 3 ? p + (q - p) * (2 / 3 - tt) * 6 : p;
    return Math.round(v * 255).toString(16).padStart(2, "0");
  };
  return s ? `#${ch(h + 1 / 3)}${ch(h)}${ch(h - 1 / 3)}` : `#${ch(0).repeat(3)}`;
};

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
/** Random fill for "Surprise me" (only ever called from a click handler). */
const scatter = (counts: number[], add: number) => {
  const next = [...counts];
  for (let k = 0; k < add; k++) next[Math.floor(Math.random() * next.length)]++;
  return next;
};
const fill = (tpl: string, n: number) => tpl.split("{n}").join(String(n));
const evenStep = (n: number, lo: number, hi: number, step: number) =>
  clamp(Math.round((n - lo) / step) * step + lo, lo, hi);

/** Trim counts from the last flavour backwards until they fit. */
const fit = (counts: number[], size: number) => {
  const next = [...counts];
  let over = next.reduce((a, b) => a + b, 0) - size;
  for (let i = next.length - 1; i >= 0 && over > 0; i--) {
    const take = Math.min(next[i], over);
    next[i] -= take;
    over -= take;
  }
  return next;
};

function Minus() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden>
      <path d="M2 6h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function Plus() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden>
      <path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function Preview({ config }: { config: TweakConfig }) {
  const cur = str(config, "currency", "$");
  const bg = str(config, "bg", "#FFF6EA");
  const ink = str(config, "textColor", "#034638");
  const light = str(config, "lightText", "#FFF6EA");
  const panel = str(config, "panelBg", "#F3E4CD");
  const accent = str(config, "accent", "#008168");
  const mint = str(config, "mint", "#98E1C3");
  const btnBg = str(config, "buttonBg", "#034638");
  const btnFg = str(config, "buttonText2", "#FFF6EA");
  const radius = num(config, "radius", 24);
  const disp = DISPLAY_FONTS[str(config, "displayFont", "retro")] ?? DISPLAY_FONTS.retro;
  const display: CSSProperties = {
    fontFamily: disp.family,
    fontStyle: disp.italic ? "italic" : "normal",
    fontWeight: disp.weight,
    letterSpacing: "-0.02em",
    lineHeight: 0.98,
  };

  const packA = evenStep(num(config, "packA", 12), 4, 24, 2);
  const packB = evenStep(num(config, "packB", 24), 8, 48, 4);
  const showToggle = bool(config, "showToggle", true);
  const packWord = str(config, "packWord", "pack");
  const flavors = list(config, "flavors").map((f) => ({
    name: f.name ?? "",
    color: parseHex(f.color ?? "") ? (f.color as string) : "#F7913D",
    image: (f.image ?? "").trim(),
    note: f.note ?? "",
    start: Math.max(0, Math.round(toNum(f.start))),
  }));

  /* the preview counts follow the editor; shoppers can click around after */
  const startKey = `${flavors.map((f) => f.start).join(",")}|${packA}`;
  const [prevKey, setPrevKey] = useState(startKey);
  const [counts, setCounts] = useState<number[]>(() => fit(flavors.map((f) => f.start), packA));
  const [big, setBig] = useState(false);
  const [added, setAdded] = useState(false);
  if (startKey !== prevKey) {
    setPrevKey(startKey);
    setCounts(fit(flavors.map((f) => f.start), packA));
    setBig(false);
  }

  useEffect(() => {
    if (!added) return;
    const t = setTimeout(() => setAdded(false), 1800);
    return () => clearTimeout(t);
  }, [added]);

  const size = showToggle && big ? packB : packA;
  const c = fit(flavors.map((_, i) => counts[i] ?? 0), size);
  const total = c.reduce((a, b) => a + b, 0);
  const left = size - total;
  const full = left <= 0;
  const pct = size ? total / size : 0;

  const base = toNum(str(config, "canPrice"), 3.25);
  const off = clamp(num(config, showToggle && big ? "offB" : "offA", 0), 0, 40);
  const perCan = base * (1 - off / 100);

  const slots: number[] = [];
  c.forEach((n, i) => {
    for (let k = 0; k < n; k++) slots.push(i);
  });

  const bump = (i: number, d: 1 | -1) => {
    if (d > 0 && full) return;
    setCounts(c.map((n, j) => (j === i ? Math.max(0, n + d) : n)));
  };

  const surprise = () => {
    if (!flavors.length) return;
    setCounts(scatter(c, left));
  };

  const pickSize = (b: boolean) => {
    setBig(b);
    setCounts(fit(c, b ? packB : packA));
  };

  const vars = { "--bg": bg, "--panel": panel, "--ink": ink, "--r": `${radius}px` } as CSSProperties;

  return (
    <div
      className="@container w-full"
      style={{ ...vars, background: bg, color: ink, fontFamily: fontStack(str(config, "font", "system")) }}
    >
      <div className="mx-auto w-full max-w-[1200px] px-5 pt-7 @min-[720px]:px-10 @min-[720px]:pb-12 @min-[720px]:pt-12">
        <div className="grid gap-5 @min-[780px]:grid-cols-[minmax(0,1fr)_minmax(0,430px)] @min-[780px]:items-end @min-[780px]:gap-10">
          {/* Header */}
          <div>
            {str(config, "eyebrow") && (
              <span
                className="inline-flex rounded-full px-3 py-[5px] text-[10.5px] font-extrabold uppercase leading-none tracking-[0.12em]"
                style={{ background: mint, color: ink }}
              >
                {str(config, "eyebrow")}
              </span>
            )}
            <h3 className="mt-3 text-[36px] @min-[720px]:text-[50px]" style={display}>
              {str(config, "heading")}
            </h3>
            {str(config, "subheading") && (
              <p className="mt-2.5 max-w-[420px] text-[14px] leading-[1.5] opacity-80">{str(config, "subheading")}</p>
            )}
          </div>

          {/* Tracker */}
          <div className="p-4 @min-[520px]:p-5" style={{ background: panel, borderRadius: radius }}>
            <div className="flex items-center gap-4">
              <div className="relative h-16 w-16 shrink-0">
                <svg width="64" height="64" viewBox="0 0 64 64" className="-rotate-90" aria-hidden>
                  <circle cx="32" cy="32" r={R} fill="none" stroke={alpha(ink, 0.12)} strokeWidth="6" />
                  <circle
                    cx="32"
                    cy="32"
                    r={R}
                    fill="none"
                    stroke={full ? accent : ink}
                    strokeWidth="6"
                    strokeLinecap="round"
                    strokeDasharray={CIRC}
                    strokeDashoffset={CIRC * (1 - pct)}
                    style={{ transition: `stroke-dashoffset 650ms ${EASE}, stroke 300ms ease` }}
                  />
                </svg>
                <span className="absolute inset-0 grid place-items-center text-[12.5px] font-extrabold tabular-nums">
                  {full ? (
                    <svg key="ok" className="bs-check-in" width="20" height="20" viewBox="0 0 12 12" fill="none" stroke={accent} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="M2.5 6.3l2.3 2.2 4.7-5" />
                    </svg>
                  ) : (
                    `${Math.round(pct * 100)}%`
                  )}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[26px] tabular-nums" style={display}>
                  <span key={total} className="bs-swap inline-block">{total}</span> {str(config, "ofLabel", "of")} {size}
                </p>
                <p
                  key={full ? "full" : left}
                  className="bs-swap mt-1.5 text-[13px] font-bold"
                  style={{ color: full ? accent : ink }}
                  aria-live="polite"
                >
                  {full ? str(config, "fullText") : fill(str(config, "moreText", "Add {n} more"), left)}
                </p>
              </div>
            </div>

            {/* Can grid: two rows, filled in flavour order */}
            <div
              className="mt-4 grid grid-cols-[repeat(var(--cn),minmax(0,1fr))] gap-1.5 @min-[520px]:grid-cols-[repeat(var(--cw),minmax(0,1fr))] @min-[780px]:grid-cols-[repeat(var(--cn),minmax(0,1fr))]"
              style={{ "--cn": Math.ceil(size / 2), "--cw": Math.min(size, 12) } as CSSProperties}
            >
              {Array.from({ length: size }, (_, k) => {
                const f = slots[k];
                const on = f !== undefined;
                return on ? (
                  <span
                    key={`${k}-${f}`}
                    className="bs-pop-scale relative block aspect-[5/8] overflow-hidden"
                    style={{ background: flavors[f].color, borderRadius: "30% / 18%", boxShadow: "inset 0 -5px 0 rgba(0,0,0,.1)" }}
                  >
                    <span aria-hidden className="absolute inset-x-[10%] top-0 h-[9%] rounded-b-[3px] bg-[#dfe3e3]" />
                    <span aria-hidden className="absolute inset-x-0 top-[36%] h-[30%]" style={{ background: alpha("#ffffff", 0.32) }} />
                    <span aria-hidden className="absolute bottom-[10%] left-[14%] top-[12%] w-[11%] rounded-full bg-white/30" />
                  </span>
                ) : (
                  <span
                    key={`${k}-e`}
                    className="block aspect-[5/8]"
                    style={{ borderRadius: "30% / 18%", border: `1.5px dashed ${alpha(ink, 0.28)}` }}
                  />
                );
              })}
            </div>

            <div className="mt-4 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={surprise}
                disabled={full}
                className="inline-flex h-9 items-center gap-2 rounded-full px-3.5 text-[13px] font-bold transition-[background-color,color,opacity,scale] duration-300 active:scale-95 enabled:hover:bg-[var(--ink)] enabled:hover:text-[var(--panel)] disabled:opacity-35"
                style={{ boxShadow: `inset 0 0 0 1.5px ${ink}` }}
              >
                <span className="[&_svg]:block" dangerouslySetInnerHTML={{ __html: DICE_SVG }} />
                {str(config, "surpriseLabel", "Surprise me")}
              </button>
              {showToggle && (
                <div role="group" className="relative grid grid-cols-2 rounded-full p-1" style={{ background: alpha(ink, 0.08) }}>
                  <span
                    aria-hidden
                    className="absolute bottom-1 left-1 top-1 rounded-full shadow-[0_2px_8px_-2px_rgba(0,0,0,0.25)]"
                    style={{
                      width: "calc(50% - 4px)",
                      background: btnBg,
                      transform: `translateX(${big ? 100 : 0}%)`,
                      transition: `transform 450ms ${EASE}`,
                    }}
                  />
                  {[packA, packB].map((p, i) => (
                    <button
                      key={i}
                      type="button"
                      aria-pressed={big === (i === 1)}
                      onClick={() => pickSize(i === 1)}
                      className="relative z-[1] h-8 min-w-[66px] whitespace-nowrap px-3 text-[12.5px] font-bold transition-colors duration-300"
                      style={{ color: big === (i === 1) ? btnFg : ink }}
                    >
                      {p} {packWord}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Flavour cards */}
        <div className="mt-6 grid grid-cols-2 gap-3 @min-[620px]:grid-cols-4 @min-[720px]:mt-8 @min-[720px]:gap-4">
          {flavors.map((f, i) => {
            const n = c[i] ?? 0;
            const onDark = brightness(f.color) < 140;
            const cardVars = {
              background: f.color,
              color: onDark ? light : ink,
              borderRadius: radius,
              boxShadow: n > 0 ? `0 0 0 2.5px ${bg}, 0 0 0 5px ${ink}` : `0 0 0 0 ${bg}, 0 0 0 0 ${ink}`,
              transition: `box-shadow 350ms ${EASE}`,
              "--c": f.color,
              "--dk": darken(f.color, 14),
              "--lbl": light,
              "--ink": ink,
            } as CSSProperties;
            return (
              <article key={i} className="group relative flex min-w-0 flex-col overflow-hidden" style={cardVars}>
                <div className="relative aspect-square w-full overflow-hidden">
                  {f.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={f.image}
                      alt={f.name}
                      loading="lazy"
                      decoding="async"
                      draggable={false}
                      className="absolute inset-0 h-full w-full object-cover transition-[scale] duration-700 group-hover:scale-[1.05]"
                      style={{ transitionTimingFunction: EASE }}
                    />
                  ) : (
                    <>
                    <span
                      aria-hidden
                      className="absolute right-[7%] top-[9%] w-[24%] transition-[rotate] duration-700 group-hover:rotate-[40deg] [&_svg]:block [&_svg]:w-full"
                      style={{ transitionTimingFunction: EASE }}
                      dangerouslySetInnerHTML={{ __html: SLICE_SVG }}
                    />
                    <span
                      aria-hidden
                      className="absolute bottom-[22%] left-[8%] w-[16%] transition-[rotate] duration-700 group-hover:-rotate-[30deg] [&_svg]:block [&_svg]:w-full"
                      style={{ transitionTimingFunction: EASE }}
                      dangerouslySetInnerHTML={{ __html: SLICE_SVG }}
                    />
                    <span aria-hidden className="absolute left-[22%] top-[22%] h-2 w-2 rounded-full bg-white/40" />
                    <span aria-hidden className="absolute right-[22%] top-[52%] h-1.5 w-1.5 rounded-full bg-white/50" />
                    <span
                      className="absolute inset-x-0 bottom-[12%] top-[12%] flex justify-center transition-[rotate,translate] duration-500 group-hover:-translate-y-1 group-hover:-rotate-6 [&_svg]:h-full [&_svg]:w-auto"
                      style={{ transitionTimingFunction: EASE }}
                      dangerouslySetInnerHTML={{ __html: CAN_SVG }}
                    />
                    </>
                  )}
                  <span aria-hidden className="absolute inset-x-0 bottom-0 h-[30%]" style={{ background: `linear-gradient(to bottom, ${alpha(f.color, 0)}, ${f.color})` }} />
                  {n > 0 && (
                    <span
                      key={n}
                      className="bs-pop-scale absolute right-2.5 top-2.5 grid h-8 min-w-8 place-items-center rounded-full px-2 text-[13px] font-extrabold tabular-nums shadow-[0_4px_12px_-4px_rgba(0,0,0,0.35)]"
                      style={{ background: ink, color: light }}
                    >
                      ×{n}
                    </span>
                  )}
                </div>
                <div className="relative flex flex-1 flex-col px-3 pb-3">
                  <h4 className="-mt-1 text-[19px] @min-[620px]:text-[17px] @min-[780px]:text-[22px]" style={display}>
                    {f.name}
                  </h4>
                  {f.note && <p className="mt-1.5 text-[11px] font-semibold leading-snug opacity-80">{f.note}</p>}
                  <div className="mt-auto pt-3">
                    <div
                      className="flex h-10 items-center justify-between rounded-full p-1"
                      style={{ background: "rgba(255,255,255,.78)", color: ink }}
                    >
                      <button
                        type="button"
                        aria-label={`Remove one ${f.name}`}
                        disabled={n === 0}
                        onClick={() => bump(i, -1)}
                        className="grid h-8 w-8 place-items-center rounded-full transition-[background-color,opacity,scale] duration-200 enabled:hover:bg-white active:scale-90 disabled:opacity-30"
                      >
                        <Minus />
                      </button>
                      <span key={n} className="bs-swap text-[15px] font-extrabold tabular-nums">
                        {n}
                      </span>
                      <button
                        type="button"
                        aria-label={`Add one ${f.name}`}
                        disabled={full}
                        onClick={() => bump(i, 1)}
                        className="grid h-8 w-8 place-items-center rounded-full transition-[filter,opacity,scale] duration-200 enabled:hover:brightness-125 active:scale-90 disabled:opacity-30"
                        style={{ background: btnBg, color: btnFg }}
                      >
                        <Plus />
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        {/* Summary: sticky on small screens */}
        <div
          className="sticky bottom-0 z-10 -mx-5 mt-6 border-t bg-[var(--bg)] px-5 pb-4 pt-3.5 @min-[720px]:static @min-[720px]:mx-0 @min-[720px]:mt-8 @min-[720px]:rounded-[var(--r)] @min-[720px]:border-0 @min-[720px]:bg-[var(--panel)] @min-[720px]:py-4 @min-[720px]:pl-6 @min-[720px]:pr-4"
          style={{ borderColor: alpha(ink, 0.12) }}
        >
          <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <b key={`${perCan}`} className="bs-swap inline-block text-[26px] tabular-nums" style={display}>
                  {money(perCan, cur)}
                </b>
                <span className="text-[12.5px] font-semibold opacity-75">{str(config, "perCanLabel", "per can")}</span>
                {off > 0 && (
                  <span
                    key={off}
                    className="bs-swap rounded-full px-2 py-[3px] text-[10.5px] font-extrabold uppercase leading-none tracking-[0.06em]"
                    style={{ background: mint, color: ink }}
                  >
                    {str(config, "saveLabel", "Save")} {off}%
                  </span>
                )}
              </p>
              <p className="mt-1 text-[12.5px] tabular-nums opacity-85">
                {size} {packWord} · <b>{money(perCan * size, cur)}</b>
                {off > 0 && <s className="ml-1.5 opacity-60">{money(base * size, cur)}</s>}
              </p>
            </div>
            <button
              type="button"
              disabled={!full}
              onClick={() => setAdded(true)}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-full px-6 text-[15px] font-bold enabled:hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed @min-[520px]:w-auto @min-[520px]:min-w-[220px]"
              style={{
                background: added ? accent : full ? btnBg : alpha(ink, 0.14),
                color: full || added ? btnFg : alpha(ink, 0.6),
                transition: `background-color 300ms ${EASE}, color 300ms ease, filter 200ms ease, scale 200ms ease`,
              }}
            >
              <span key={added ? "a" : full ? "f" : `l${left}`} className="bs-swap inline-flex items-center gap-2 whitespace-nowrap">
                {added ? (
                  <>
                    <svg width="14" height="14" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="M2.5 6.3l2.3 2.2 4.7-5" />
                    </svg>
                    {str(config, "addedText", "Added to cart")}
                  </>
                ) : full ? (
                  str(config, "buttonText", "Add pack to cart")
                ) : (
                  <>
                    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
                      <rect x="3" y="7" width="10" height="7" rx="2" />
                      <path d="M5.5 7V5a2.5 2.5 0 015 0v2" />
                    </svg>
                    {fill(str(config, "lockedText", "Pick {n} more"), left)}
                  </>
                )}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Liquid ---------------- */

function generateLiquid(config: TweakConfig): string {
  const { face, family } = fontFaceFor(str(config, "font", "system"));
  const S = ".bs-pk-{{ section.id }}";
  const r = "{{ section.settings.radius }}px";
  const ease = EASE;
  const dispKey = str(config, "displayFont", "retro");
  const packA = evenStep(num(config, "packA", 12), 4, 24, 2);
  const packB = evenStep(num(config, "packB", 24), 8, 48, 4);
  const offA = clamp(Math.round(num(config, "offA", 8)), 0, 40);
  const offB = clamp(Math.round(num(config, "offB", 15)), 0, 40);

  const style = `<style>
${face ? face + "\n" : ""}  ${S} { container-type: inline-size; background: {{ section.settings.bg }}; color: {{ section.settings.text_color }}; font-family: ${family}; }
  ${S} * { box-sizing: border-box; }
  ${S} p, ${S} h2, ${S} h3 { margin: 0; }
  ${S} button { font: inherit; }
  ${S} .bs-wrap { max-width: 1200px; margin: 0 auto; padding: 28px 20px 0; }
  ${S} .bs-disp { letter-spacing: -.02em; line-height: .98;
    {%- case section.settings.display_font -%}
      {%- when 'serif' %} font-family: Georgia, 'Iowan Old Style', 'Palatino Linotype', serif; font-weight: 700; font-style: normal;
      {%- when 'sans' %} font-family: ui-sans-serif, system-ui, -apple-system, sans-serif; font-weight: 800; font-style: normal;
      {%- when 'inherit' %} font-family: inherit; font-weight: 700; font-style: normal;
      {%- else %} font-family: Georgia, 'Iowan Old Style', 'Palatino Linotype', serif; font-weight: 700; font-style: italic;
    {%- endcase %} }
  ${S} .bs-top { display: grid; gap: 20px; }
  ${S} .bs-eyebrow { display: inline-flex; padding: 5px 12px; border-radius: 99px; font-size: 10.5px; font-weight: 800; line-height: 1; text-transform: uppercase; letter-spacing: .12em;
    background: {{ section.settings.mint }}; color: {{ section.settings.text_color }}; }
  ${S} .bs-h { margin-top: 12px; font-size: 36px; }
  ${S} .bs-sub { margin-top: 10px; max-width: 420px; font-size: 14px; line-height: 1.5; opacity: .8; }
  ${S} .bs-track { padding: 16px; border-radius: ${r}; background: {{ section.settings.panel_bg }}; }
  ${S} .bs-trow { display: flex; align-items: center; gap: 16px; }
  ${S} .bs-ring { position: relative; width: 64px; height: 64px; flex-shrink: 0; }
  ${S} .bs-ring svg { display: block; transform: rotate(-90deg); }
  ${S} .bs-ring-t { stroke: {{ section.settings.text_color | color_modify: 'alpha', 0.12 }}; }
  ${S} .bs-ring-p { stroke: {{ section.settings.text_color }}; transition: stroke-dashoffset .65s ${ease}, stroke .3s; }
  ${S}.is-full .bs-ring-p { stroke: {{ section.settings.accent }}; }
  ${S} .bs-pct { position: absolute; inset: 0; display: grid; place-items: center; font-size: 12.5px; font-weight: 800; font-variant-numeric: tabular-nums; }
  ${S} .bs-ok { display: none; position: absolute; inset: 0; place-items: center; color: {{ section.settings.accent }}; }
  ${S}.is-full .bs-pct { display: none; }
  ${S}.is-full .bs-ok { display: grid; animation: bs-pk-pop .42s ${ease} both; }
  ${S} .bs-count { font-size: 26px; font-variant-numeric: tabular-nums; }
  ${S} .bs-status { margin-top: 6px; font-size: 13px; font-weight: 700; }
  ${S}.is-full .bs-status { color: {{ section.settings.accent }}; }
  ${S} .bs-cans { display: grid; gap: 6px; margin-top: 16px; grid-template-columns: repeat(var(--cn, 6), minmax(0, 1fr)); }
  ${S} .bs-can { position: relative; display: block; aspect-ratio: 5 / 8; overflow: hidden; border-radius: 30% / 18%;
    border: 1.5px dashed {{ section.settings.text_color | color_modify: 'alpha', 0.28 }}; }
  ${S} .bs-can.is-on { border: 0; background: var(--c); box-shadow: inset 0 -5px 0 rgba(0,0,0,.1); animation: bs-pk-pop .42s ${ease} both; }
  ${S} .bs-can.is-on::before { content: ""; position: absolute; left: 10%; right: 10%; top: 0; height: 9%; border-radius: 0 0 3px 3px; background: #dfe3e3; }
  ${S} .bs-can.is-on::after { content: ""; position: absolute; left: 0; right: 0; top: 36%; height: 30%; background: rgba(255,255,255,.32); }
  @keyframes bs-pk-pop { 0% { transform: scale(.6); opacity: 0; } 60% { transform: scale(1.06); opacity: 1; } 100% { transform: scale(1); } }
  ${S} .bs-tfoot { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: 16px; }
  ${S} .bs-surprise { display: inline-flex; align-items: center; gap: 8px; height: 36px; padding: 0 14px; border: 0; border-radius: 99px; cursor: pointer; background: transparent;
    font-size: 13px; font-weight: 700; color: {{ section.settings.text_color }}; box-shadow: inset 0 0 0 1.5px {{ section.settings.text_color }};
    transition: background-color .3s, color .3s, opacity .3s, transform .2s; }
  ${S} .bs-surprise svg { display: block; }
  ${S} .bs-surprise:hover:not(:disabled) { background: {{ section.settings.text_color }}; color: {{ section.settings.panel_bg }}; }
  ${S} .bs-surprise:active:not(:disabled) { transform: scale(.95); }
  ${S} .bs-surprise:disabled { opacity: .35; cursor: default; }
  ${S} .bs-seg { position: relative; display: grid; grid-template-columns: 1fr 1fr; padding: 4px; border-radius: 99px; background: {{ section.settings.text_color | color_modify: 'alpha', 0.08 }}; }
  ${S} .bs-seg button { position: relative; z-index: 1; height: 32px; min-width: 66px; padding: 0 12px; border: 0; background: transparent; cursor: pointer; white-space: nowrap;
    font-size: 12.5px; font-weight: 700; color: {{ section.settings.text_color }}; transition: color .3s; }
  ${S} .bs-seg button[aria-pressed="true"] { color: {{ section.settings.button_fg }}; }
  ${S} .bs-pill { position: absolute; top: 4px; bottom: 4px; left: 4px; width: calc(50% - 4px); border-radius: 99px; background: {{ section.settings.button_bg }};
    box-shadow: 0 2px 8px -2px rgba(0,0,0,.25); transition: transform .45s ${ease}; }
  ${S}[data-pack="b"] .bs-pill { transform: translateX(100%); }
  ${S} .bs-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin-top: 24px; }
  ${S} .bs-card { --ink: {{ section.settings.text_color }}; --lbl: {{ section.settings.light_text }};
    position: relative; min-width: 0; display: flex; flex-direction: column; overflow: hidden; border-radius: ${r};
    background: var(--c); color: {{ section.settings.text_color }}; box-shadow: 0 0 0 0 transparent; transition: box-shadow .35s ${ease}; }
  ${S} .bs-card.is-dark { color: {{ section.settings.light_text }}; }
  ${S} .bs-card.is-on { box-shadow: 0 0 0 2.5px {{ section.settings.bg }}, 0 0 0 5px {{ section.settings.text_color }}; }
  ${S} .bs-vis { position: relative; width: 100%; aspect-ratio: 1 / 1; overflow: hidden; }
  ${S} .bs-vis img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; transition: transform .7s ${ease}; }
  ${S} .bs-card:hover .bs-vis img { transform: scale(1.05); }
  ${S} .bs-shot { position: absolute; left: 0; right: 0; top: 12%; bottom: 12%; display: flex; justify-content: center; transition: transform .5s ${ease}; }
  ${S} .bs-card:hover .bs-shot { transform: translateY(-4px) rotate(-6deg); }
  ${S} .bs-shot svg { height: 100%; width: auto; }
  ${S} .bs-slice { position: absolute; transition: transform .7s ${ease}; }
  ${S} .bs-slice svg { display: block; width: 100%; height: auto; }
  ${S} .bs-s1 { right: 7%; top: 9%; width: 24%; }
  ${S} .bs-s2 { left: 8%; bottom: 22%; width: 16%; }
  ${S} .bs-card:hover .bs-s1 { transform: rotate(40deg); }
  ${S} .bs-card:hover .bs-s2 { transform: rotate(-30deg); }
  ${S} .bs-fade { position: absolute; left: 0; right: 0; bottom: 0; height: 30%; pointer-events: none; background: linear-gradient(to bottom, transparent, var(--c)); }
  ${S} .bs-badge { position: absolute; right: 10px; top: 10px; min-width: 32px; height: 32px; padding: 0 8px; display: grid; place-items: center; border-radius: 99px;
    font-size: 13px; font-weight: 800; font-variant-numeric: tabular-nums; background: {{ section.settings.text_color }}; color: {{ section.settings.light_text }};
    box-shadow: 0 4px 12px -4px rgba(0,0,0,.35); animation: bs-pk-pop .42s ${ease} both; }
  ${S} .bs-badge[hidden] { display: none; }
  ${S} .bs-body { position: relative; flex: 1; display: flex; flex-direction: column; padding: 0 12px 12px; }
  ${S} .bs-name { margin-top: -4px; font-size: 19px; }
  ${S} .bs-note { margin-top: 6px; font-size: 11px; font-weight: 600; line-height: 1.35; opacity: .8; }
  ${S} .bs-step { margin-top: auto; padding-top: 12px; }
  ${S} .bs-stepper { display: flex; align-items: center; justify-content: space-between; height: 40px; padding: 4px; border-radius: 99px;
    background: rgba(255,255,255,.78); color: {{ section.settings.text_color }}; }
  ${S} .bs-stepper button { width: 32px; height: 32px; display: grid; place-items: center; padding: 0; border: 0; border-radius: 99px; cursor: pointer;
    background: transparent; color: inherit; transition: background-color .2s, opacity .2s, transform .2s, filter .2s; }
  ${S} .bs-stepper button svg { display: block; }
  ${S} .bs-stepper [data-plus] { background: {{ section.settings.button_bg }}; color: {{ section.settings.button_fg }}; }
  ${S} .bs-stepper [data-minus]:hover:not(:disabled) { background: #fff; }
  ${S} .bs-stepper [data-plus]:hover:not(:disabled) { filter: brightness(1.25); }
  ${S} .bs-stepper button:active:not(:disabled) { transform: scale(.9); }
  ${S} .bs-stepper button:disabled { opacity: .3; cursor: default; }
  ${S} .bs-stepper [data-n] { font-size: 15px; font-weight: 800; font-variant-numeric: tabular-nums; }
  ${S} .bs-foot { position: sticky; bottom: 0; z-index: 2; margin: 24px -20px 0; padding: 14px 20px 16px; background: {{ section.settings.bg }};
    border-top: 1px solid {{ section.settings.text_color | color_modify: 'alpha', 0.12 }}; }
  ${S} .bs-foot form { margin: 0; display: flex; flex-wrap: wrap; align-items: center; gap: 12px 20px; }
  ${S} .bs-price { flex: 1; min-width: 0; }
  ${S} .bs-price p:first-child { display: flex; flex-wrap: wrap; align-items: baseline; gap: 4px 8px; }
  ${S} .bs-per { font-size: 26px; font-variant-numeric: tabular-nums; }
  ${S} .bs-per-l { font-size: 12.5px; font-weight: 600; opacity: .75; }
  ${S} .bs-save { padding: 3px 8px; border-radius: 99px; font-size: 10.5px; font-weight: 800; line-height: 1; text-transform: uppercase; letter-spacing: .06em;
    background: {{ section.settings.mint }}; color: {{ section.settings.text_color }}; }
  ${S} .bs-save[hidden] { display: none; }
  ${S} .bs-line { margin-top: 4px; font-size: 12.5px; font-variant-numeric: tabular-nums; opacity: .85; }
  ${S} .bs-line s { margin-left: 6px; opacity: .6; }
  ${S} .bs-add { width: 100%; height: 48px; display: flex; align-items: center; justify-content: center; gap: 8px; padding: 0 24px; border: 0; border-radius: 99px; cursor: pointer;
    font-size: 15px; font-weight: 700; white-space: nowrap; background: {{ section.settings.button_bg }}; color: {{ section.settings.button_fg }};
    transition: background-color .3s ${ease}, color .3s, filter .2s, transform .2s; }
  ${S} .bs-add:hover:not(:disabled) { filter: brightness(1.1); }
  ${S} .bs-add:active:not(:disabled) { transform: scale(.98); }
  ${S} .bs-add:disabled { cursor: not-allowed; background: {{ section.settings.text_color | color_modify: 'alpha', 0.14 }}; color: {{ section.settings.text_color | color_modify: 'alpha', 0.6 }}; }
  ${S} .bs-add.is-busy { opacity: .7; cursor: progress; }
  ${S} .bs-add .bs-lock { display: none; }
  ${S} .bs-add:disabled .bs-lock { display: block; }
  ${S} .bs-err { width: 100%; font-size: 12px; color: #c0392b; }
  ${S} .bs-err[hidden] { display: none; }
  @container (min-width: 520px) {
    ${S} .bs-track { padding: 20px; }
    ${S} .bs-cans { grid-template-columns: repeat(var(--cw, 12), minmax(0, 1fr)); }
    ${S} .bs-add { width: auto; min-width: 220px; }
  }
  @container (min-width: 620px) {
    ${S} .bs-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); }
    ${S} .bs-name { font-size: 17px; }
  }
  @container (min-width: 720px) {
    ${S} .bs-wrap { padding: 48px 40px; }
    ${S} .bs-h { font-size: 50px; }
    ${S} .bs-grid { gap: 16px; margin-top: 32px; }
    ${S} .bs-foot { position: static; margin: 32px 0 0; padding: 16px 16px 16px 24px; border: 0; border-radius: ${r}; background: {{ section.settings.panel_bg }}; }
  }
  @container (min-width: 780px) {
    ${S} .bs-top { grid-template-columns: minmax(0, 1fr) minmax(0, 430px); align-items: end; gap: 40px; }
    ${S} .bs-cans { grid-template-columns: repeat(var(--cn, 6), minmax(0, 1fr)); }
    ${S} .bs-name { font-size: 22px; }
  }
  @media (prefers-reduced-motion: reduce) {
    ${S} .bs-can.is-on, ${S} .bs-badge, ${S}.is-full .bs-ok { animation: none; }
    ${S} .bs-pill, ${S} .bs-ring-p, ${S} .bs-vis img, ${S} .bs-shot { transition: none; }
  }
</style>`;

  const minus = `<svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M2 6h8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`;
  const plus = `<svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M6 2v8M2 6h8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`;

  const markup = `{%- comment -%}
  Variety Pack Builder by boost.supply.
  - Add one "Flavor" block per flavour and pick the single-can product (or
    variant's product) it adds. Each can counts as one unit; the add button
    unlocks when the pack is full and adds every flavour in one request.
  - Photos: the block image, else the product's featured image, else a drawn
    can in the block colour. Square crops work best.
  - IMPORTANT: the pack savings shown here are display only. Create them in
    Shopify as automatic discounts (Discounts > Amount off products >
    Automatic), limited to these products, with a minimum quantity of items:
    with the defaults that is ${packA} items for ${offA}% off and ${packB} items for ${offB}% off.
{%- endcomment -%}
{%- assign bs_pa = section.settings.pack_a -%}
{%- assign bs_pb = section.settings.pack_b | at_least: bs_pa -%}
<div class="bs-pk-{{ section.id }}" id="bs-pk-{{ section.id }}" data-pack="a"
  data-a="{{ bs_pa }}" data-b="{{ bs_pb }}" data-oa="{{ section.settings.off_a }}" data-ob="{% if section.settings.show_toggle %}{{ section.settings.off_b }}{% else %}0{% endif %}"
  data-more="{{ section.settings.more_text | escape }}" data-full="{{ section.settings.full_text | escape }}"
  data-locked="{{ section.settings.locked_text | escape }}" data-btn="{{ section.settings.button_text | escape }}"
  data-added="{{ section.settings.added_text | escape }}" data-save="{{ section.settings.save_label | escape }}"
  data-word="{{ section.settings.pack_word | escape }}"
  data-add-url="{{ routes.cart_add_url }}" data-cart-url="{{ routes.cart_url }}">
  <div class="bs-wrap">
    <div class="bs-top">
      <div>
        {%- if section.settings.eyebrow != blank -%}<span class="bs-eyebrow">{{ section.settings.eyebrow }}</span>{%- endif -%}
        <h2 class="bs-h bs-disp">{{ section.settings.heading }}</h2>
        {%- if section.settings.subheading != blank -%}<p class="bs-sub">{{ section.settings.subheading }}</p>{%- endif -%}
      </div>
      <div class="bs-track">
        <div class="bs-trow">
          <div class="bs-ring">
            <svg width="64" height="64" viewBox="0 0 64 64" aria-hidden="true">
              <circle class="bs-ring-t" cx="32" cy="32" r="${R}" fill="none" stroke-width="6"/>
              <circle class="bs-ring-p" data-ring cx="32" cy="32" r="${R}" fill="none" stroke-width="6" stroke-linecap="round" stroke-dasharray="${CIRC.toFixed(2)}" stroke-dashoffset="${CIRC.toFixed(2)}"/>
            </svg>
            <span class="bs-pct" data-pct>0%</span>
            <span class="bs-ok" aria-hidden="true"><svg width="20" height="20" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 6.3l2.3 2.2 4.7-5"/></svg></span>
          </div>
          <div>
            <p class="bs-count bs-disp"><span data-total>0</span> {{ section.settings.of_label }} <span data-size>{{ bs_pa }}</span></p>
            <p class="bs-status" data-status aria-live="polite"></p>
          </div>
        </div>
        <div class="bs-cans" data-cans aria-hidden="true"></div>
        <div class="bs-tfoot">
          <button type="button" class="bs-surprise" data-surprise>${DICE_SVG} {{ section.settings.surprise_label }}</button>
          {%- if section.settings.show_toggle -%}
            <div class="bs-seg" role="group">
              <span class="bs-pill" aria-hidden="true"></span>
              <button type="button" data-pick="a" aria-pressed="true">{{ bs_pa }} {{ section.settings.pack_word }}</button>
              <button type="button" data-pick="b" aria-pressed="false">{{ bs_pb }} {{ section.settings.pack_word }}</button>
            </div>
          {%- endif -%}
        </div>
      </div>
    </div>

    <div class="bs-grid">
      {%- for block in section.blocks -%}
        {%- assign bs_p = block.settings.product -%}
        {%- assign bs_v = bs_p.selected_or_first_available_variant -%}
        {%- assign bs_name = block.settings.name | default: bs_p.title -%}
        {%- assign bs_br = block.settings.color | color_brightness -%}
        <article class="bs-card{% if bs_br < 140 %} is-dark{% endif %}" data-card
          data-id="{% if bs_v and bs_v.available %}{{ bs_v.id }}{% endif %}" data-p="{{ bs_v.price | default: 0 }}" data-c="{{ block.settings.color }}"
          style="--c: {{ block.settings.color }}; --dk: {{ block.settings.color | color_darken: 14 }};" {{ block.shopify_attributes }}>
          <div class="bs-vis">
            {%- if block.settings.image != blank -%}
              {{ block.settings.image | image_url: width: 700 | image_tag: loading: 'lazy', alt: bs_name, sizes: '(min-width: 990px) 25vw, 50vw' }}
            {%- elsif bs_p.featured_image -%}
              {{ bs_p.featured_image | image_url: width: 700 | image_tag: loading: 'lazy', alt: bs_name, sizes: '(min-width: 990px) 25vw, 50vw' }}
            {%- else -%}
              <span class="bs-slice bs-s1">${SLICE_SVG}</span>
              <span class="bs-slice bs-s2">${SLICE_SVG}</span>
              <span class="bs-shot">${CAN_SVG}</span>
            {%- endif -%}
            <span class="bs-fade" aria-hidden="true"></span>
            <span class="bs-badge" data-badge hidden></span>
          </div>
          <div class="bs-body">
            <h3 class="bs-name bs-disp">{{ bs_name }}</h3>
            {%- if block.settings.note != blank -%}<p class="bs-note">{{ block.settings.note }}</p>{%- endif -%}
            <div class="bs-step">
              <div class="bs-stepper">
                <button type="button" data-minus aria-label="Remove one {{ bs_name | escape }}" disabled>${minus}</button>
                <span data-n>0</span>
                <button type="button" data-plus aria-label="Add one {{ bs_name | escape }}">${plus}</button>
              </div>
            </div>
          </div>
        </article>
      {%- endfor -%}
    </div>

    <div class="bs-foot">
      <form action="{{ routes.cart_add_url }}" method="post" data-form>
        <div class="bs-price">
          <p><b class="bs-per bs-disp" data-per></b><span class="bs-per-l">{{ section.settings.per_can_label }}</span><span class="bs-save" data-save hidden></span></p>
          <p class="bs-line"><span data-pack-label></span> · <b data-pack-total></b><s data-pack-cmp></s></p>
        </div>
        <span data-items hidden></span>
        <button type="submit" class="bs-add" data-add disabled>
          <svg class="bs-lock" width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><rect x="3" y="7" width="10" height="7" rx="2"/><path d="M5.5 7V5a2.5 2.5 0 015 0v2"/></svg>
          <span data-label>{{ section.settings.button_text }}</span>
        </button>
        <p class="bs-err" data-err hidden>Something went wrong. Please try again.</p>
      </form>
    </div>
  </div>
</div>
<script>
  (function () {
    var root = document.getElementById('bs-pk-{{ section.id }}');
    if (!root) return;
    var fmt = String({{ shop.money_format | json }}).replace(/<[^>]*>/g, '');
    function money(cents) {
      var open = '{' + '{', close = '}' + '}';
      var a = fmt.indexOf(open), b = fmt.indexOf(close, a);
      var v = cents / 100;
      if (a < 0 || b < 0) return v.toFixed(2);
      var key = fmt.slice(a + 2, b).trim();
      var s = key.indexOf('no_decimals') > -1 ? String(Math.round(v)) : v.toFixed(2);
      if (key.indexOf('comma') > -1) s = s.replace('.', ',');
      return fmt.slice(0, a) + s + fmt.slice(b + 2);
    }
    function fill(t, n) { return String(t || '').split('{n}').join(n); }
    function q(s) { return root.querySelector(s); }
    var d = root.dataset;
    var sizes = { a: +d.a, b: +d.b }, offs = { a: +d.oa, b: +d.ob };
    var pack = 'a';
    var C = ${CIRC.toFixed(2)};
    var cards = [].slice.call(root.querySelectorAll('[data-card]'));
    var counts = cards.map(function () { return 0; });
    var cans = q('[data-cans]'), ring = q('[data-ring]'), pct = q('[data-pct]'), totalEl = q('[data-total]'), sizeEl = q('[data-size]');
    var status = q('[data-status]'), surprise = q('[data-surprise]'), per = q('[data-per]'), save = q('[data-save]');
    var packLabel = q('[data-pack-label]'), packTotal = q('[data-pack-total]'), packCmp = q('[data-pack-cmp]');
    var form = q('[data-form]'), btn = q('[data-add]'), label = q('[data-label]'), items = q('[data-items]'), err = q('[data-err]');
    var prices = cards.map(function (c) { return +c.dataset.p || 0; }).filter(function (p) { return p > 0; });
    var minPrice = prices.length ? Math.min.apply(null, prices) : 0;
    function sum() { return counts.reduce(function (a, b) { return a + b; }, 0); }
    function trim(size) {
      var over = sum() - size;
      for (var i = counts.length - 1; i >= 0 && over > 0; i--) {
        var take = Math.min(counts[i], over);
        counts[i] -= take; over -= take;
      }
    }

    function render() {
      var size = sizes[pack], n = sum(), left = Math.max(0, size - n), full = n >= size;
      root.classList.toggle('is-full', full);
      cans.style.setProperty('--cn', Math.ceil(size / 2));
      cans.style.setProperty('--cw', Math.min(size, 12));
      while (cans.children.length > size) cans.removeChild(cans.lastChild);
      while (cans.children.length < size) { var e = document.createElement('span'); e.className = 'bs-can'; cans.appendChild(e); }
      var slots = [];
      counts.forEach(function (c, i) { for (var k = 0; k < c; k++) slots.push(i); });
      [].forEach.call(cans.children, function (s, k) {
        var f = k < slots.length ? slots[k] : -1;
        if (s.getAttribute('data-f') === String(f)) return;
        s.setAttribute('data-f', f);
        s.classList.remove('is-on');
        if (f > -1) { s.style.setProperty('--c', cards[f].dataset.c); void s.offsetWidth; s.classList.add('is-on'); }
      });
      if (ring) ring.setAttribute('stroke-dashoffset', (C * (1 - (size ? n / size : 0))).toFixed(2));
      if (pct) pct.textContent = Math.round(size ? n / size * 100 : 0) + '%';
      if (totalEl) totalEl.textContent = n;
      if (sizeEl) sizeEl.textContent = size;
      if (status) status.textContent = full ? d.full : fill(d.more, left);
      if (surprise) surprise.disabled = full;
      cards.forEach(function (c, i) {
        var k = counts[i];
        c.classList.toggle('is-on', k > 0);
        c.querySelector('[data-n]').textContent = k;
        c.querySelector('[data-minus]').disabled = k === 0;
        c.querySelector('[data-plus]').disabled = full || !c.dataset.id;
        var badge = c.querySelector('[data-badge]');
        if (badge && badge.textContent !== '×' + k) {
          badge.hidden = true;
          if (k > 0) { badge.textContent = '×' + k; void badge.offsetWidth; badge.hidden = false; }
          else badge.textContent = '';
        }
      });
      var off = offs[pack], cents = 0;
      counts.forEach(function (c, i) { cents += c * (+cards[i].dataset.p || 0); });
      var base = n ? cents / n : minPrice;
      var each = Math.round(base * (100 - off) / 100);
      if (per) per.textContent = money(each);
      if (save) { save.hidden = !off; save.textContent = d.save + ' ' + off + '%'; }
      if (packLabel) packLabel.textContent = size + ' ' + d.word;
      if (packTotal) packTotal.textContent = money(each * size);
      if (packCmp) packCmp.textContent = off ? money(Math.round(base * size)) : '';
      if (btn) btn.disabled = !full;
      if (label) label.textContent = full ? d.btn : fill(d.locked, left);
    }

    cards.forEach(function (c, i) {
      c.querySelector('[data-plus]').addEventListener('click', function () {
        if (sum() < sizes[pack]) { counts[i]++; render(); }
      });
      c.querySelector('[data-minus]').addEventListener('click', function () {
        if (counts[i] > 0) { counts[i]--; render(); }
      });
    });

    if (surprise) surprise.addEventListener('click', function () {
      var pool = [];
      cards.forEach(function (c, i) { if (c.dataset.id) pool.push(i); });
      if (!pool.length) return;
      var left = sizes[pack] - sum();
      while (left-- > 0) counts[pool[Math.floor(Math.random() * pool.length)]]++;
      render();
    });

    root.querySelectorAll('[data-pick]').forEach(function (b) {
      b.addEventListener('click', function () {
        pack = b.getAttribute('data-pick');
        root.setAttribute('data-pack', pack);
        root.querySelectorAll('[data-pick]').forEach(function (o) { o.setAttribute('aria-pressed', o === b ? 'true' : 'false'); });
        trim(sizes[pack]);
        render();
      });
    });

    if (form) form.addEventListener('submit', function (e) {
      var list = [];
      cards.forEach(function (c, i) { if (counts[i] > 0 && c.dataset.id) list.push({ id: +c.dataset.id, quantity: counts[i] }); });
      if (!list.length || sum() < sizes[pack]) { e.preventDefault(); return; }
      /* hidden inputs make the plain form post work too (items[n][id] / items[n][quantity]) */
      items.textContent = '';
      list.forEach(function (it, n) {
        ['id', 'quantity'].forEach(function (k) {
          var inp = document.createElement('input');
          inp.type = 'hidden'; inp.name = 'items[' + n + '][' + k + ']'; inp.value = it[k];
          items.appendChild(inp);
        });
      });
      if (!window.fetch) return;
      e.preventDefault();
      btn.disabled = true;
      btn.classList.add('is-busy');
      if (err) err.hidden = true;
      fetch(d.addUrl + '.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ items: list })
      })
        .then(function (res) {
          if (!res.ok) throw new Error('cart');
          if (label) label.textContent = d.added;
          window.location.href = d.cartUrl;
        })
        .catch(function () { form.submit(); });
    });

    render();
  })();
</script>`;

  const flavors = list(config, "flavors");

  const schema = buildSchema({
    name: "Variety Pack Builder",
    settings: [
      { type: "text", id: "eyebrow", label: "Eyebrow", default: str(config, "eyebrow") },
      { type: "text", id: "heading", label: "Heading", default: str(config, "heading") },
      { type: "textarea", id: "subheading", label: "Subheading", default: str(config, "subheading") },
      { type: "header", content: "Pack sizes" },
      { type: "range", id: "pack_a", label: "Pack size", min: 4, max: 24, step: 2, unit: "ct", default: packA },
      { type: "checkbox", id: "show_toggle", label: "Offer a second, bigger pack", default: bool(config, "showToggle", true) },
      { type: "range", id: "pack_b", label: "Bigger pack size", min: 8, max: 48, step: 4, unit: "ct", default: packB },
      { type: "text", id: "pack_word", label: "Pack word (e.g. pack)", default: str(config, "packWord") },
      { type: "range", id: "off_a", label: "Pack savings (display)", min: 0, max: 40, step: 1, unit: "%", default: offA },
      { type: "range", id: "off_b", label: "Bigger pack savings (display)", min: 0, max: 40, step: 1, unit: "%", default: offB },
      { type: "header", content: "Progress" },
      { type: "text", id: "of_label", label: "“of” word", default: str(config, "ofLabel") },
      { type: "text", id: "more_text", label: "Progress text ({n} = cans to go)", default: str(config, "moreText") },
      { type: "text", id: "full_text", label: "Pack full text", default: str(config, "fullText") },
      { type: "text", id: "surprise_label", label: "Surprise button", default: str(config, "surpriseLabel") },
      { type: "header", content: "Summary" },
      { type: "text", id: "per_can_label", label: "Per can label", default: str(config, "perCanLabel") },
      { type: "text", id: "save_label", label: "Savings label", default: str(config, "saveLabel") },
      { type: "text", id: "locked_text", label: "Button while filling ({n} = cans to go)", default: str(config, "lockedText") },
      { type: "text", id: "button_text", label: "Button text", default: str(config, "buttonText") },
      { type: "text", id: "added_text", label: "Added text", default: str(config, "addedText") },
      { type: "header", content: "Style" },
      {
        type: "select",
        id: "display_font",
        label: "Display font",
        options: [
          { value: "retro", label: "Retro serif (italic)" },
          { value: "serif", label: "Serif" },
          { value: "sans", label: "Sans" },
          { value: "inherit", label: "Theme font" },
        ],
        default: DISPLAY_FONTS[dispKey] ? dispKey : "retro",
      },
      { type: "color", id: "bg", label: "Background", default: str(config, "bg") },
      { type: "color", id: "text_color", label: "Text", default: str(config, "textColor") },
      { type: "color", id: "light_text", label: "Text on dark cards", default: str(config, "lightText") },
      { type: "color", id: "panel_bg", label: "Tracker panel", default: str(config, "panelBg") },
      { type: "color", id: "accent", label: "Complete state", default: str(config, "accent") },
      { type: "color", id: "mint", label: "Chips", default: str(config, "mint") },
      { type: "color", id: "button_bg", label: "Button", default: str(config, "buttonBg") },
      { type: "color", id: "button_fg", label: "Button text colour", default: str(config, "buttonText2") },
      { type: "range", id: "radius", label: "Corner radius", min: 0, max: 40, step: 2, unit: "px", default: evenStep(num(config, "radius", 24), 0, 40, 2) },
    ],
    blocks: [
      {
        type: "flavor",
        name: "Flavor",
        settings: [
          { type: "text", id: "name", label: "Name (defaults to the product title)" },
          { type: "product", id: "product", label: "Single-can product", info: "One unit of this product counts as one can in the pack." },
          { type: "color", id: "color", label: "Card colour", default: "#F7913D" },
          { type: "text", id: "note", label: "Note (e.g. 4g sugar · 9g fiber)" },
          { type: "image_picker", id: "image", label: "Photo (optional)", info: "Overrides the product image. Match the card colour to its backdrop." },
        ],
      },
    ],
    maxBlocks: 8,
    presetBlocks: flavors.map((f) => ({
      type: "flavor",
      settings: {
        name: esc(f.name ?? ""),
        color: parseHex(f.color ?? "") ? (f.color as string) : "#F7913D",
        note: esc(f.note ?? ""),
      },
    })),
  });

  return section({ style, markup, schema });
}

export const packBuilder: Tweak = {
  slug: "pack-builder",
  inspiredBy: "olipop",
  name: "Variety Pack Builder",
  tagline: "Shoppers mix their own 12-pack and watch the can grid fill up flavor by flavor.",
  description:
    "Modeled on the build-your-own variety pack OLIPOP offers. Every flavour card has a +/- counter, a can grid fills slot by slot in the flavour colours (“8 of 12, add 4 more”), “Surprise me” tops the pack up at random, and a toggle switches between two pack sizes with a lower price per can on the bigger one. The add button stays locked until the pack is full, then adds every flavour to the cart in one tap.",
  category: "product-page",
  tier: "free",
  tint: "#e6f3ec",
  Preview,
  generateLiquid,
  defaults,
  fields: [
    { key: "eyebrow", label: "Eyebrow", type: "text", group: "Content" },
    { key: "heading", label: "Heading", type: "text", group: "Content" },
    { key: "subheading", label: "Subheading", type: "textarea", group: "Content" },
    {
      key: "flavors", label: "Flavors", type: "list", group: "Flavors",
      hint: "Colour is a hex code; match it to the photo's backdrop. Leave Image URL empty for a drawn can. Preview count pre-fills the editor preview only",
      itemFields: [
        { key: "name", label: "Name", type: "text" },
        { key: "image", label: "Image URL", type: "text" },
        { key: "color", label: "Card colour", type: "text" },
        { key: "note", label: "Note", type: "text" },
        { key: "start", label: "Preview count", type: "text" },
      ],
      newItem: { name: "Ginger Lemon", color: "#F4C542", image: "", note: "3g sugar · 9g fiber", start: "0" },
      addLabel: "Add flavor", max: 8,
    },
    { key: "packA", label: "Pack size", type: "slider", group: "Pack sizes", min: 4, max: 24, step: 2 },
    { key: "showToggle", label: "Offer a second, bigger pack", type: "toggle", group: "Pack sizes" },
    { key: "packB", label: "Bigger pack size", type: "slider", group: "Pack sizes", min: 8, max: 48, step: 4 },
    { key: "packWord", label: "Pack word", type: "text", group: "Pack sizes" },
    { key: "offA", label: "Pack savings", type: "slider", group: "Pack sizes", min: 0, max: 40, step: 1, unit: "%", hint: "Display only: set up a matching automatic discount in Shopify" },
    { key: "offB", label: "Bigger pack savings", type: "slider", group: "Pack sizes", min: 0, max: 40, step: 1, unit: "%" },
    { key: "canPrice", label: "Preview price per can", type: "text", group: "Pack sizes", hint: "Editor preview only; your store uses each product's price" },
    { key: "currency", label: "Currency symbol", type: "text", group: "Pack sizes" },
    { key: "ofLabel", label: "“of” word", type: "text", group: "Progress" },
    { key: "moreText", label: "Progress text", type: "text", group: "Progress", hint: "{n} is replaced by the cans still to pick" },
    { key: "fullText", label: "Pack full text", type: "text", group: "Progress" },
    { key: "surpriseLabel", label: "Surprise button", type: "text", group: "Progress" },
    { key: "perCanLabel", label: "Per can label", type: "text", group: "Summary" },
    { key: "saveLabel", label: "Savings label", type: "text", group: "Summary" },
    { key: "lockedText", label: "Button while filling", type: "text", group: "Summary", hint: "{n} is replaced by the cans still to pick" },
    { key: "buttonText", label: "Button text", type: "text", group: "Summary" },
    { key: "addedText", label: "Added text", type: "text", group: "Summary" },
    fontField("Typography"),
    {
      key: "displayFont", label: "Display font", type: "select", group: "Typography",
      options: [
        { label: "Retro serif (italic)", value: "retro" },
        { label: "Serif", value: "serif" },
        { label: "Sans", value: "sans" },
        { label: "Theme font", value: "inherit" },
      ],
    },
    { key: "radius", label: "Corner radius", type: "slider", group: "Layout", min: 0, max: 40, step: 2, unit: "px" },
    { key: "bg", label: "Background", type: "color", group: "Colors" },
    { key: "textColor", label: "Text", type: "color", group: "Colors" },
    { key: "lightText", label: "Text on dark cards", type: "color", group: "Colors" },
    { key: "panelBg", label: "Tracker panel", type: "color", group: "Colors" },
    { key: "accent", label: "Complete state", type: "color", group: "Colors" },
    { key: "mint", label: "Chips", type: "color", group: "Colors" },
    { key: "buttonBg", label: "Button", type: "color", group: "Colors" },
    { key: "buttonText2", label: "Button text", type: "color", group: "Colors" },
  ],
};
