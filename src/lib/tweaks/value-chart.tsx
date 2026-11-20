"use client";

import { useEffect, useRef, useState } from "react";
import type { Tweak, TweakConfig } from "../types";
import { str, num, bool, list, fontStack, esc } from "../cfg";
import { fontField } from "../fields";
import { buildSchema, section, fontFaceFor } from "../liquid";
import { ProductArt, money, toNum, type ArtKind } from "./product-art";

/* ============================================================
   Cost-per-Day Value Chart
   "What it replaces": the separate supplements a daily product
   stands in for, stacked into one tall bar at their per-day
   price, next to the product's own (much shorter) bar. Bars grow
   in when the chart scrolls into view and re-flow when shoppers
   flip between subscription and one-time pricing.
   ============================================================ */

const EASE = "cubic-bezier(.22,1,.36,1)";
const ART: ArtKind[] = ["bottle", "jar", "spray", "tube", "bottle", "jar"];

const defaults: TweakConfig = {
  eyebrow: "Cost per day",
  heading: "Your whole supplement shelf, in one daily scoop",
  subheading: "Here's what you'd pay per day to buy each of these on its own.",
  image: "/mockups/value-greens.jpg",
  replacedImage: "/mockups/value-supplements.jpg",
  productName: "Daily Greens",
  currency: "$",
  packPrice: "79",
  servings: 30,
  showToggle: true,
  plan: "subscribe",
  subDiscount: 20,
  subscribeLabel: "Subscribe",
  oneTimeLabel: "One-time",
  chartLabel: "Price per day",
  separateLabel: "Bought separately",
  perDay: "/day",
  saveLabel: "Save",
  yearText: "That's {{yearly}} saved every year",
  totalLabel: "Total if bought separately",
  items: [
    { name: "Multivitamin", price: "0.85" },
    { name: "Probiotic", price: "1.10" },
    { name: "Greens powder", price: "0.95" },
    { name: "Vitamin D3 + K2", price: "0.30" },
    { name: "Adaptogen blend", price: "0.60" },
    { name: "Digestive enzymes", price: "0.40" },
  ],
  showButton: true,
  buttonText: "Get Daily Greens",
  footnote: "Based on the average retail price per serving of comparable single-ingredient products.",
  accent: "#12372A",
  accentText: "#F4F1E8",
  bg: "#F4F1E8",
  sage: "#C9D6C3",
  textColor: "#111111",
  muted: "#55615A",
  font: "system",
  radius: 22,
};

/* ---------- colour helpers ---------- */

const rgb = (hex: string) =>
  /^#[0-9a-f]{6}$/i.test(hex)
    ? [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
    : null;

/** Blend b into a by t (0..1). Mirrors Shopify's color_mix in the export. */
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

/** Hex colour + alpha byte. */
const tint = (hex: string, a: number) =>
  /^#[0-9a-f]{6}$/i.test(hex)
    ? hex + Math.round(a * 255).toString(16).padStart(2, "0")
    : hex;

/** Segment weight (percent of accent mixed into sage), shared with Liquid. */
const segWeight = (i: number, n: number) =>
  n > 1 ? 8 + Math.floor((i * 42) / (n - 1)) : 20;

/** Parse a per-day price into whole cents, like the Liquid does. */
const cents = (s: string | undefined) => Math.round(toNum(s) * 100);

/* ---------- motion hooks ---------- */

function useInView<T extends Element>() {
  const ref = useRef<T>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setSeen(true);
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -12% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return [ref, seen] as const;
}

/** Count a number up to its target (and between targets) once `run` is on. */
function useTween(target: number, run: boolean, dur = 1000) {
  const [val, setVal] = useState(0);
  const shown = useRef(0);
  useEffect(() => {
    if (!run) return;
    const from = shown.current;
    const start = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / dur);
      const v = from + (target - from) * (1 - Math.pow(1 - p, 4));
      shown.current = v;
      setVal(v);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    /* land on the target even if frames are throttled (background tab) */
    const done = setTimeout(() => {
      shown.current = target;
      setVal(target);
    }, dur + 60);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(done);
    };
  }, [target, run, dur]);
  return val;
}

/* ---------- preview ---------- */

function Preview({ config }: { config: TweakConfig }) {
  const cur = str(config, "currency", "$");
  const accent = str(config, "accent", "#12372A");
  const cream = str(config, "accentText", "#F4F1E8");
  const bg = str(config, "bg", "#F4F1E8");
  const sage = str(config, "sage", "#C9D6C3");
  const text = str(config, "textColor", "#111111");
  const muted = str(config, "muted", "#55615A");
  const radius = num(config, "radius", 22);
  const inner = Math.max(6, radius - 10);
  const perDay = str(config, "perDay", "/day");
  const name = str(config, "productName");
  const heroSrc = str(config, "image").trim();
  const replSrc = str(config, "replacedImage").trim();
  const photoBg = tint(sage, 0.45);

  const raw = list(config, "items");
  const items = raw.map((it, i) => ({
    name: it.name ?? "",
    cents: Math.max(0, cents(it.price)),
    color: mix(sage, accent, segWeight(i, raw.length) / 100),
  }));

  /* everything in cents, rounded the same way the Liquid rounds */
  const sep = items.reduce((s, it) => s + it.cents, 0);
  const servings = Math.max(1, num(config, "servings", 30));
  const disc = Math.min(90, Math.max(0, num(config, "subDiscount", 20)));
  const one = Math.round((toNum(str(config, "packPrice"), 79) * 100) / servings);
  const sub = Math.round((one * (100 - disc)) / 100);

  const showToggle = bool(config, "showToggle", true);
  const initial = str(config, "plan", "subscribe") === "onetime" ? "onetime" : "subscribe";
  const [prevInitial, setPrevInitial] = useState(initial);
  const [plan, setPlan] = useState(initial);
  if (initial !== prevInitial) {
    setPrevInitial(initial);
    setPlan(initial);
  }
  const active = showToggle ? plan : initial;
  const prod = active === "subscribe" ? sub : one;

  const max = Math.max(sep, prod, 1);
  const save = sep > 0 ? Math.max(0, Math.round(((sep - prod) * 100) / sep)) : 0;
  const yearly = Math.max(0, Math.round(((sep - prod) * 365) / 100));

  const [chartRef, inView] = useInView<HTMLDivElement>();
  const [hot, setHot] = useState<number | null>(null);
  const tSep = useTween(sep, inView);
  const tProd = useTween(prod, inView);
  const tYear = useTween(yearly, inView, 1300);

  const yearParts = str(config, "yearText").split("{{yearly}}");
  const line = tint(text, 0.12);

  const rise = (delay: number) => ({
    opacity: inView ? 1 : 0,
    transform: inView ? "none" : "translateY(8px)",
    transition: `opacity 600ms ${EASE} ${delay}ms, transform 600ms ${EASE} ${delay}ms`,
  });

  const toggle = showToggle && (
    <div
      role="radiogroup"
      aria-label="Pricing"
      className="relative inline-grid min-w-0 grow grid-cols-2 rounded-full p-[3px] text-[12px] font-medium"
      style={{ background: tint(cream, 0.12) }}
    >
      <span
        aria-hidden
        className="absolute bottom-[3px] left-[3px] top-[3px] w-[calc(50%-3px)] rounded-full"
        style={{
          background: cream,
          transform: active === "onetime" ? "translateX(100%)" : "none",
          transition: `transform 480ms ${EASE}`,
        }}
      />
      {(["subscribe", "onetime"] as const).map((p) => {
        const on = active === p;
        return (
          <button
            key={p}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => setPlan(p)}
            className="relative z-[1] flex h-8 items-center justify-center gap-1.5 whitespace-nowrap px-3 transition-colors duration-300"
            style={{ color: on ? accent : cream }}
          >
            {p === "subscribe" ? str(config, "subscribeLabel") : str(config, "oneTimeLabel")}
            {p === "subscribe" && disc > 0 && (
              <span
                className="rounded-full px-1.5 py-px text-[10.5px] tabular-nums transition-colors duration-300"
                style={{ background: on ? tint(accent, 0.1) : tint(cream, 0.14) }}
              >
                −{disc}%
              </span>
            )}
          </button>
        );
      })}
    </div>
  );

  return (
    <div
      className="@container w-full"
      style={{ background: bg, color: text, fontFamily: fontStack(str(config, "font", "system")) }}
    >
      <div className="mx-auto grid w-full max-w-[1080px] gap-7 px-5 pb-9 pt-7 @min-[640px]:grid-cols-[minmax(0,1fr)_minmax(0,1.08fr)] @min-[640px]:grid-rows-[auto_auto_1fr] @min-[640px]:gap-x-12 @min-[640px]:gap-y-8 @min-[640px]:px-10 @min-[640px]:py-14">
        {/* Header */}
        <div className="@min-[640px]:col-start-1 @min-[640px]:row-start-1">
          {str(config, "eyebrow") && (
            <p className="inline-flex items-center gap-2 text-[13px] font-medium" style={{ color: accent }}>
              <span aria-hidden className="h-1.5 w-1.5 rounded-full" style={{ background: accent }} />
              {str(config, "eyebrow")}
            </p>
          )}
          <h3 className="mt-3 text-balance text-[29px] font-semibold leading-[1.04] tracking-[-0.035em] @min-[640px]:text-[40px]">
            {str(config, "heading")}
          </h3>
          {str(config, "subheading") && (
            <p className="mt-3 max-w-[420px] text-[14.5px] leading-relaxed" style={{ color: muted }}>
              {str(config, "subheading")}
            </p>
          )}
        </div>

        {/* Product photo + chart */}
        <div className="flex min-w-0 flex-col gap-3 @min-[640px]:col-start-2 @min-[640px]:row-span-3 @min-[640px]:row-start-1 @min-[640px]:self-start @min-[640px]:gap-4">
          {heroSrc && (
            <div
              className="relative aspect-[4/3] overflow-hidden @min-[640px]:aspect-[5/4]"
              style={{ background: photoBg, borderRadius: radius }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={heroSrc}
                alt={name}
                loading="lazy"
                decoding="async"
                className="absolute inset-0 h-full w-full object-cover"
                style={{ objectPosition: "50% 62%" }}
              />
              {name && (
                <p
                  className="absolute bottom-3 left-3 flex max-w-[calc(100%-24px)] items-baseline gap-2 rounded-full px-3.5 py-1.5 text-[12.5px] shadow-[0_8px_24px_-12px_rgba(0,0,0,.45)] @min-[640px]:bottom-4 @min-[640px]:left-4"
                  style={{ background: accent, color: cream }}
                >
                  <span className="truncate font-semibold">{name}</span>
                  <span key={active} className="bs-swap shrink-0 tabular-nums" style={{ color: tint(cream, 0.75) }}>
                    {money(prod / 100, cur)}
                    {perDay}
                  </span>
                </p>
              )}
            </div>
          )}

          {/* Chart */}
          <div
            ref={chartRef}
            className="relative overflow-hidden p-5 @min-[640px]:p-7"
            style={{ background: accent, color: cream, borderRadius: radius }}
          >
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
              <p className="whitespace-nowrap text-[13px] font-medium" style={{ color: tint(cream, 0.72) }}>
                {str(config, "chartLabel")}
              </p>
              {toggle}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 @min-[640px]:gap-5">
              {/* Bought separately: stacked */}
              <div className="flex min-w-0 flex-col">
                <div className="relative flex h-[236px] items-end pt-[60px] @min-[640px]:h-[330px]">
                  <div
                    className="relative w-full"
                    style={{ height: `${(sep / max) * 100}%`, transition: `height 700ms ${EASE}` }}
                  >
                    <p
                      className="absolute bottom-full left-0 mb-2.5 whitespace-nowrap text-[28px] font-semibold leading-none tracking-[-0.04em] tabular-nums @min-[640px]:text-[34px]"
                      style={{ ...rise(550), color: tint(cream, 0.78) }}
                    >
                      {money(tSep / 100, cur)}
                      <span className="ml-0.5 text-[13px] font-medium tracking-normal opacity-70">{perDay}</span>
                    </p>
                    <div
                      className="flex h-full flex-col gap-[2px] overflow-hidden"
                      style={{
                        borderRadius: inner,
                        transform: inView ? "scaleY(1)" : "scaleY(0)",
                        transformOrigin: "bottom",
                        transition: `transform 1100ms ${EASE}`,
                      }}
                    >
                      {items.map((it, i) => (
                        <div
                          key={i}
                          onMouseEnter={() => setHot(i)}
                          onMouseLeave={() => setHot(null)}
                          className="min-h-[3px]"
                          style={{
                            flex: `${Math.max(it.cents, 1)} 1 0px`,
                            background: it.color,
                            opacity: hot === null || hot === i ? 1 : 0.32,
                            transition: "opacity 250ms ease",
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                <p className="mt-3 truncate text-[12.5px]" style={{ color: tint(cream, 0.7) }}>
                  {str(config, "separateLabel")}
                </p>
              </div>

              {/* The product: one short, bright bar */}
              <div className="flex min-w-0 flex-col">
                <div className="relative flex h-[236px] items-end pt-[60px] @min-[640px]:h-[330px]">
                  <div
                    className="relative w-full"
                    style={{ height: `${(prod / max) * 100}%`, transition: `height 750ms ${EASE}` }}
                  >
                    <p
                      className="absolute bottom-full left-0 mb-2.5 whitespace-nowrap text-[34px] font-semibold leading-none tracking-[-0.045em] tabular-nums @min-[640px]:text-[42px]"
                      style={rise(700)}
                    >
                      {money(tProd / 100, cur)}
                      <span className="ml-0.5 text-[13px] font-medium tracking-normal opacity-70">{perDay}</span>
                    </p>
                    <div
                      className="relative h-full"
                      style={{
                        background: cream,
                        borderRadius: inner,
                        boxShadow: `0 18px 40px -18px ${tint("#000000", 0.55)}`,
                        transform: inView ? "scaleY(1)" : "scaleY(0)",
                        transformOrigin: "bottom",
                        transition: `transform 1100ms ${EASE} 160ms`,
                      }}
                    >
                      {save > 0 && (
                        <span
                          key={save}
                          className="bs-swap absolute left-2 top-2 rounded-full px-2.5 py-1 text-[11.5px] font-semibold tabular-nums"
                          style={{ background: accent, color: cream }}
                        >
                          {str(config, "saveLabel")} {save}%
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <p className="mt-3 truncate text-[12.5px] font-semibold">{name}</p>
              </div>
            </div>

            {str(config, "yearText") && (
              <p
                className="mt-5 border-t pt-4 text-[14px] leading-snug"
                style={{ borderColor: tint(cream, 0.14), color: tint(cream, 0.8), ...rise(900) }}
              >
                {yearParts[0]}
                {yearParts.length > 1 && (
                  <b className="text-[20px] font-semibold tracking-[-0.02em] tabular-nums" style={{ color: cream }}>
                    {money(Math.round(tYear), cur)}
                  </b>
                )}
                {yearParts.slice(1).join("")}
              </p>
            )}
          </div>
        </div>

        {/* Itemised list, with a photo of what it replaces beside it */}
        <div className="@min-[640px]:col-start-1 @min-[640px]:row-start-2">
          <div
            className={
              replSrc
                ? "grid grid-cols-[minmax(0,0.5fr)_minmax(0,1fr)] items-start gap-4 @min-[640px]:gap-5"
                : undefined
            }
          >
            {replSrc && (
              <div
                className="relative aspect-[4/5] overflow-hidden"
                style={{ background: photoBg, borderRadius: Math.max(8, inner) }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={replSrc}
                  alt={str(config, "separateLabel")}
                  loading="lazy"
                  decoding="async"
                  className="absolute inset-0 h-full w-full object-cover"
                />
              </div>
            )}
            <ul className="border-t" style={{ borderColor: line }}>
              {items.map((it, i) => (
                <li
                  key={i}
                  onMouseEnter={() => setHot(i)}
                  onMouseLeave={() => setHot(null)}
                  className={`flex items-center gap-3 border-b ${replSrc ? "py-2.5" : "py-2"}`}
                  style={{
                    borderColor: line,
                    opacity: hot === null || hot === i ? 1 : 0.45,
                    transition: "opacity 250ms ease",
                  }}
                >
                  {replSrc ? (
                    /* colour key: matches this item's slice of the stacked bar */
                    <span
                      aria-hidden
                      className="h-2.5 w-2.5 shrink-0 rounded-[3px]"
                      style={{ background: it.color, boxShadow: `inset 0 0 0 1px ${tint(text, 0.08)}` }}
                    />
                  ) : (
                    <ProductArt kind={ART[i % ART.length]} tone={it.color} size={34} tile={tint(sage, 0.5)} radius={9} />
                  )}
                  <span className="min-w-0 flex-1 truncate text-[14px]">{it.name}</span>
                  <span className="text-[14px] tabular-nums">{money(it.cents / 100, cur)}</span>
                </li>
              ))}
            </ul>
          </div>
          <ul>
            <li className="flex items-center gap-3 py-3 text-[14px]">
              <span className="min-w-0 flex-1 font-medium">{str(config, "totalLabel")}</span>
              <span className="tabular-nums line-through decoration-1" style={{ color: muted }}>
                {money(sep / 100, cur)}
                {perDay}
              </span>
            </li>
            <li
              className="flex items-center gap-3 px-4 py-3 text-[14px]"
              style={{ background: accent, color: cream, borderRadius: Math.max(8, inner) }}
            >
              <span className="min-w-0 flex-1 truncate font-semibold">{name}</span>
              <span key={active} className="bs-swap font-semibold tabular-nums">
                {money(prod / 100, cur)}
                {perDay}
              </span>
            </li>
          </ul>
        </div>

        {/* CTA */}
        {(bool(config, "showButton", true) || str(config, "footnote")) && (
          <div className="@min-[640px]:col-start-1 @min-[640px]:row-start-3">
            {bool(config, "showButton", true) && (
              <button
                type="button"
                className="group flex h-12 w-full items-center justify-center gap-2 rounded-full px-7 text-[15px] font-medium transition-[filter,transform,scale] duration-200 hover:brightness-125 active:scale-[0.99] @min-[640px]:w-auto"
                style={{ background: accent, color: cream }}
              >
                {str(config, "buttonText")}
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 16 16"
                  fill="none"
                  aria-hidden
                  className="transition-[translate] duration-300 ease-[cubic-bezier(.22,1,.36,1)] group-hover:translate-x-0.5"
                >
                  <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            )}
            {str(config, "footnote") && (
              <p className="mt-3 text-[11.5px] leading-relaxed" style={{ color: muted }}>
                {str(config, "footnote")}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- Liquid ---------- */

function generateLiquid(config: TweakConfig): string {
  const { face, family } = fontFaceFor(str(config, "font", "system"));
  const S = ".bs-vc-{{ section.id }}";
  const r = "{{ section.settings.radius }}px";
  const ri = "{{ section.settings.radius | minus: 10 | at_least: 6 }}px";
  const ease = "cubic-bezier(.22,1,.36,1)";

  const style = `<style>
${face ? face + "\n" : ""}  ${S} { container-type: inline-size; background: {{ section.settings.bg }}; color: {{ section.settings.text_color }}; font-family: ${family}; }
  ${S} * { box-sizing: border-box; }
  ${S} p, ${S} h2, ${S} ul { margin: 0; padding: 0; }
  ${S} .bs-wrap { max-width: 1080px; margin: 0 auto; display: grid; gap: 28px; padding: 28px 20px 36px; }
  ${S} .bs-eyebrow { display: inline-flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 500; color: {{ section.settings.accent }}; }
  ${S} .bs-eyebrow::before { content: ""; width: 6px; height: 6px; border-radius: 99px; background: currentColor; }
  ${S} .bs-h { margin-top: 12px; font-size: 29px; font-weight: 600; line-height: 1.04; letter-spacing: -.035em; text-wrap: balance; }
  ${S} .bs-sub { margin-top: 12px; max-width: 420px; font-size: 14.5px; line-height: 1.6; color: {{ section.settings.muted }}; }
  ${S} .bs-side { display: grid; gap: 12px; min-width: 0; }
  ${S} .bs-hero { position: relative; aspect-ratio: 4 / 3; overflow: hidden; border-radius: ${r};
    background: color-mix(in srgb, {{ section.settings.sage }} 45%, transparent); }
  ${S} .bs-hero img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; object-position: 50% 62%; display: block; }
  ${S} .bs-tag { position: absolute; left: 12px; bottom: 12px; max-width: calc(100% - 24px); display: flex; align-items: baseline; gap: 8px;
    padding: 6px 14px; border-radius: 99px; font-size: 12.5px; box-shadow: 0 8px 24px -12px rgba(0,0,0,.45);
    background: {{ section.settings.accent }}; color: {{ section.settings.accent_text }}; }
  ${S} .bs-tag b { font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  ${S} .bs-tag > span { flex-shrink: 0; opacity: .75; font-variant-numeric: tabular-nums; }
  ${S} .bs-chart { position: relative; overflow: hidden; padding: 20px; border-radius: ${r};
    background: {{ section.settings.accent }}; color: {{ section.settings.accent_text }}; }
  ${S} .bs-top { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px 16px; }
  ${S} .bs-cl { font-size: 13px; font-weight: 500; opacity: .72; white-space: nowrap; }
  ${S} .bs-tg { position: relative; display: inline-grid; grid-template-columns: 1fr 1fr; flex-grow: 1; min-width: 0; padding: 3px; border-radius: 99px;
    background: rgba(255,255,255,.1); font-size: 12px; font-weight: 500; }
  ${S} .bs-tg button { position: relative; z-index: 1; height: 32px; padding: 0 12px; border: 0; background: none; cursor: pointer; font: inherit;
    color: {{ section.settings.accent_text }}; display: flex; align-items: center; justify-content: center; gap: 6px; white-space: nowrap; transition: color .3s; }
  ${S} .bs-tg button[aria-checked="true"] { color: {{ section.settings.accent }}; }
  ${S} .bs-tg .bs-off { padding: 1px 6px; border-radius: 99px; font-size: 10.5px; background: rgba(255,255,255,.14); }
  ${S} .bs-tg button[aria-checked="true"] .bs-off { background: rgba(0,0,0,.08); }
  ${S} .bs-thumb { position: absolute; top: 3px; bottom: 3px; left: 3px; width: calc(50% - 3px); border-radius: 99px;
    background: {{ section.settings.accent_text }}; transition: transform .48s ${ease}; }
  ${S}[data-plan="onetime"] .bs-thumb { transform: translateX(100%); }
  ${S} .bs-cols { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 16px; }
  ${S} .bs-col { min-width: 0; display: flex; flex-direction: column; }
  ${S} .bs-area { position: relative; display: flex; align-items: flex-end; height: 236px; padding-top: 60px; }
  ${S} .bs-barw { position: relative; width: 100%; transition: height .75s ${ease}; }
  ${S} .bs-num { position: absolute; left: 0; bottom: 100%; margin-bottom: 10px; white-space: nowrap; line-height: 1; font-weight: 600;
    font-variant-numeric: tabular-nums; transition: opacity .6s ${ease} .55s, transform .6s ${ease} .55s; }
  ${S} .bs-num small { margin-left: 2px; font-size: 13px; font-weight: 500; letter-spacing: 0; opacity: .7; }
  ${S} .bs-num-sep { font-size: 28px; letter-spacing: -.04em; opacity: .78; }
  ${S} .bs-num-prod { font-size: 34px; letter-spacing: -.045em; transition-delay: .7s; }
  ${S} .bs-stack { display: flex; flex-direction: column; gap: 2px; height: 100%; overflow: hidden; border-radius: ${ri};
    transform-origin: bottom; transition: transform 1.1s ${ease}; }
  ${S} .bs-seg { flex: 1 1 0; min-height: 3px; transition: opacity .25s; }
  ${S} .bs-prod { position: relative; height: 100%; border-radius: ${ri}; background: {{ section.settings.accent_text }};
    box-shadow: 0 18px 40px -18px rgba(0,0,0,.55); transform-origin: bottom; transition: transform 1.1s ${ease} .16s; }
  ${S} .bs-save { position: absolute; top: 8px; left: 8px; padding: 4px 10px; border-radius: 99px; font-size: 11.5px; font-weight: 600;
    background: {{ section.settings.accent }}; color: {{ section.settings.accent_text }}; }
  ${S} .bs-cap { margin-top: 12px; font-size: 12.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; opacity: .7; }
  ${S} .bs-cap-prod { font-weight: 600; opacity: 1; }
  ${S} .bs-year { margin-top: 20px; padding-top: 16px; border-top: 1px solid rgba(255,255,255,.14); font-size: 14px; line-height: 1.35; opacity: .9;
    transition: opacity .6s ${ease} .9s; }
  ${S} .bs-year b { font-size: 20px; font-weight: 600; letter-spacing: -.02em; font-variant-numeric: tabular-nums; }
  ${S}.is-armed .bs-stack, ${S}.is-armed .bs-prod { transform: scaleY(0); }
  ${S}.is-armed .bs-num { opacity: 0; transform: translateY(8px); }
  ${S}.is-armed .bs-year { opacity: 0; }
  ${S}.is-armed.is-in .bs-stack, ${S}.is-armed.is-in .bs-prod { transform: none; }
  ${S}.is-armed.is-in .bs-num { transform: none; }
  ${S}.is-armed.is-in .bs-num-sep { opacity: .78; }
  ${S}.is-armed.is-in .bs-num-prod { opacity: 1; }
  ${S}.is-armed.is-in .bs-year { opacity: .9; }
  ${S} .bs-rep.has-img { display: grid; grid-template-columns: minmax(0, .5fr) minmax(0, 1fr); align-items: start; gap: 16px; }
  ${S} .bs-rep-img { position: relative; aspect-ratio: 4 / 5; overflow: hidden; border-radius: {{ section.settings.radius | minus: 10 | at_least: 8 }}px;
    background: color-mix(in srgb, {{ section.settings.sage }} 45%, transparent); }
  ${S} .bs-rep-img img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; display: block; }
  ${S} .bs-rep.has-img .bs-row { padding: 10px 0; }
  ${S} .bs-rep.has-img .bs-ic.is-dot { width: 10px; height: 10px; border-radius: 3px; background: none; }
  ${S} .bs-rep.has-img .bs-ic.is-dot i { width: 10px; height: 10px; border-radius: 3px; box-shadow: inset 0 0 0 1px rgba(0,0,0,.08); }
  ${S} .bs-list { list-style: none; border-top: 1px solid rgba(0,0,0,.12); }
  ${S} .bs-row { display: flex; align-items: center; gap: 12px; padding: 8px 0; border-bottom: 1px solid rgba(0,0,0,.12); font-size: 14px; transition: opacity .25s; }
  ${S} .bs-ic { width: 34px; height: 34px; flex-shrink: 0; border-radius: 9px; overflow: hidden; display: grid; place-items: center;
    background: color-mix(in srgb, {{ section.settings.sage }} 50%, transparent); }
  ${S} .bs-ic img { width: 100%; height: 100%; object-fit: cover; display: block; }
  ${S} .bs-ic i { width: 12px; height: 12px; border-radius: 99px; }
  ${S} .bs-nm { flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  ${S} .bs-pr { font-variant-numeric: tabular-nums; }
  ${S} .bs-total { display: flex; align-items: center; gap: 12px; padding: 12px 0; font-size: 14px; }
  ${S} .bs-total .bs-nm { font-weight: 500; }
  ${S} .bs-total s { color: {{ section.settings.muted }}; font-variant-numeric: tabular-nums; }
  ${S} .bs-mine { display: flex; align-items: center; gap: 12px; padding: 12px 16px; font-size: 14px; font-weight: 600;
    border-radius: {{ section.settings.radius | minus: 10 | at_least: 8 }}px; background: {{ section.settings.accent }}; color: {{ section.settings.accent_text }}; }
  ${S} .bs-list.is-hot .bs-row:not(.is-hot) { opacity: .45; }
  ${S} .bs-stack.is-hot .bs-seg:not(.is-hot) { opacity: .32; }
  ${S} .bs-btn { display: inline-flex; width: 100%; height: 48px; align-items: center; justify-content: center; gap: 8px; padding: 0 28px;
    border-radius: 99px; font-size: 15px; font-weight: 500; text-decoration: none;
    background: {{ section.settings.accent }}; color: {{ section.settings.accent_text }}; transition: filter .2s, transform .2s; }
  ${S} .bs-btn:hover { filter: brightness(1.25); }
  ${S} .bs-btn:active { transform: scale(.99); }
  ${S} .bs-btn svg { transition: transform .3s ${ease}; }
  ${S} .bs-btn:hover svg { transform: translateX(2px); }
  ${S} .bs-note { margin-top: 12px; font-size: 11.5px; line-height: 1.6; color: {{ section.settings.muted }}; }
  @container (min-width: 640px) {
    ${S} .bs-wrap { grid-template-columns: minmax(0,1fr) minmax(0,1.08fr); grid-template-rows: auto auto 1fr; column-gap: 48px; row-gap: 32px; padding: 56px 40px; }
    ${S} .bs-head { grid-column: 1; grid-row: 1; }
    ${S} .bs-side { grid-column: 2; grid-row: 1 / span 3; align-self: start; gap: 16px; }
    ${S} .bs-chart { padding: 28px; }
    ${S} .bs-hero { aspect-ratio: 5 / 4; }
    ${S} .bs-tag { left: 16px; bottom: 16px; }
    ${S} .bs-rep.has-img { gap: 20px; }
    ${S} .bs-items { grid-column: 1; grid-row: 2; }
    ${S} .bs-cta { grid-column: 1; grid-row: 3; }
    ${S} .bs-h { font-size: 40px; }
    ${S} .bs-cols { gap: 20px; }
    ${S} .bs-area { height: 330px; }
    ${S} .bs-num-sep { font-size: 34px; }
    ${S} .bs-num-prod { font-size: 42px; }
    ${S} .bs-btn { width: auto; }
  }
  @media (prefers-reduced-motion: reduce) {
    ${S} *, ${S}.is-armed * { transition: none !important; }
  }
</style>`;

  const markup = `{%- comment -%}
  Cost-per-Day Value Chart by boost.supply. Add it to your product template.
  - Price per day = the product price divided by "Servings per pack". Pick a
    product below, or leave it empty on a product page to use that product.
    With no product at all, the "Pack price" text is used.
  - Subscribe pricing is display only: set "Subscribe discount" to the same
    percentage your subscription app (selling plan) gives subscribers.
  - Each "Replaced item" block takes a price per day, e.g. 0.85.
  - Photos come from your store: the product photo is the image you pick under
    "Images" (or the product's featured image), and the photo beside the
    replaced items is the optional image picker there. Leave them empty to hide.
{%- endcomment -%}
{%- liquid
  assign bs_p = section.settings.product
  if bs_p == blank
    assign bs_p = product
  endif
  if bs_p != blank
    assign bs_pack = bs_p.selected_or_first_available_variant.price
  else
    assign bs_pack = section.settings.pack_price | remove: '$' | remove: '€' | remove: '£' | replace: ',', '.' | strip | times: 100
  endif
  assign bs_label = section.settings.product_label
  if bs_label == blank and bs_p != blank
    assign bs_label = bs_p.title
  endif
  assign bs_img = section.settings.image
  if bs_img == blank and bs_p != blank
    assign bs_img = bs_p.featured_image
  endif
  assign bs_one = bs_pack | times: 1.0 | divided_by: section.settings.servings | round
  assign bs_keep = 100 | minus: section.settings.sub_discount
  assign bs_sub = bs_one | times: bs_keep | divided_by: 100.0 | round
  assign bs_sep = 0
  for block in section.blocks
    assign bs_c = block.settings.price | remove: '$' | remove: '€' | remove: '£' | replace: ',', '.' | strip | times: 100 | round
    assign bs_sep = bs_sep | plus: bs_c
  endfor
  assign bs_plan = section.settings.default_plan
  if bs_plan == 'subscribe'
    assign bs_prod = bs_sub
  else
    assign bs_prod = bs_one
  endif
  assign bs_max = bs_sep | at_least: bs_prod | at_least: 1
  assign bs_h_sep = bs_sep | times: 100.0 | divided_by: bs_max
  assign bs_h_prod = bs_prod | times: 100.0 | divided_by: bs_max
  assign bs_diff = bs_sep | minus: bs_prod | at_least: 0
  assign bs_save = 0
  if bs_sep > 0
    assign bs_save = bs_diff | times: 100.0 | divided_by: bs_sep | round
  endif
  assign bs_year = bs_diff | times: 365 | divided_by: 100.0 | round | times: 100
  assign bs_last = section.blocks.size | minus: 1 | at_least: 1
  assign bs_open = '{' | append: '{'
  assign bs_close = '}' | append: '}'
  assign bs_token = bs_open | append: 'yearly' | append: bs_close
  assign bs_year_parts = section.settings.year_text | split: bs_token
-%}
<div class="bs-vc-{{ section.id }}" id="bs-vc-{{ section.id }}" data-plan="{{ bs_plan }}"
  data-sep="{{ bs_sep }}" data-one="{{ bs_one }}" data-sub="{{ bs_sub }}">
  <div class="bs-wrap">
    <div class="bs-head">
      {%- if section.settings.eyebrow != blank -%}<p class="bs-eyebrow">{{ section.settings.eyebrow }}</p>{%- endif -%}
      <h2 class="bs-h">{{ section.settings.heading }}</h2>
      {%- if section.settings.subheading != blank -%}<p class="bs-sub">{{ section.settings.subheading }}</p>{%- endif -%}
    </div>

    <div class="bs-side">
      {%- if section.settings.show_image and bs_img != blank -%}
        <div class="bs-hero">
          {{ bs_img | image_url: width: 1200 | image_tag: loading: 'lazy', alt: bs_label, sizes: '(min-width: 990px) 520px, 100vw' }}
          {%- if bs_label != blank -%}
            <p class="bs-tag"><b>{{ bs_label }}</b><span><span data-prod>{{ bs_prod | money }}</span>{{ section.settings.per_day }}</span></p>
          {%- endif -%}
        </div>
      {%- endif -%}
      <div class="bs-chart">
        <div class="bs-top">
          <p class="bs-cl">{{ section.settings.chart_label }}</p>
          {%- if section.settings.show_toggle -%}
            <div class="bs-tg" role="radiogroup" aria-label="Pricing">
              <span class="bs-thumb" aria-hidden="true"></span>
              <button type="button" role="radio" data-plan-btn="subscribe" aria-checked="{% if bs_plan == 'subscribe' %}true{% else %}false{% endif %}">
                {{ section.settings.subscribe_label }}
                {%- if section.settings.sub_discount > 0 -%}<span class="bs-off">−{{ section.settings.sub_discount }}%</span>{%- endif -%}
              </button>
              <button type="button" role="radio" data-plan-btn="onetime" aria-checked="{% if bs_plan == 'onetime' %}true{% else %}false{% endif %}">{{ section.settings.onetime_label }}</button>
            </div>
          {%- endif -%}
        </div>

        <div class="bs-cols">
          <div class="bs-col">
            <div class="bs-area">
              <div class="bs-barw" data-sep-bar style="height: {{ bs_h_sep }}%;">
                <p class="bs-num bs-num-sep">{{ bs_sep | money }}<small>{{ section.settings.per_day }}</small></p>
                <div class="bs-stack" data-stack>
                  {%- for block in section.blocks -%}
                    {%- assign bs_c = block.settings.price | remove: '$' | remove: '€' | remove: '£' | replace: ',', '.' | strip | times: 100 | round | at_least: 1 -%}
                    {%- assign bs_w = forloop.index0 | times: 42 | divided_by: bs_last | plus: 8 -%}
                    {%- if section.blocks.size == 1 -%}{%- assign bs_w = 20 -%}{%- endif -%}
                    <div class="bs-seg" data-i="{{ forloop.index0 }}" style="flex-grow: {{ bs_c }}; background: {{ section.settings.accent | color_mix: section.settings.sage, bs_w }};"></div>
                  {%- endfor -%}
                </div>
              </div>
            </div>
            <p class="bs-cap">{{ section.settings.separate_label }}</p>
          </div>
          <div class="bs-col">
            <div class="bs-area">
              <div class="bs-barw" data-prod-bar style="height: {{ bs_h_prod }}%;">
                <p class="bs-num bs-num-prod"><span data-prod>{{ bs_prod | money }}</span><small>{{ section.settings.per_day }}</small></p>
                <div class="bs-prod">
                  <span class="bs-save" data-save{% if bs_save <= 0 %} hidden{% endif %}>{{ section.settings.save_label }} <span data-save-pct>{{ bs_save }}</span>%</span>
                </div>
              </div>
            </div>
            <p class="bs-cap bs-cap-prod">{{ bs_label }}</p>
          </div>
        </div>

        {%- if section.settings.year_text != blank -%}
          <p class="bs-year">
            {{- bs_year_parts[0] -}}
            {%- if section.settings.year_text contains bs_token -%}<b data-year>{{ bs_year | money_without_trailing_zeros }}</b>{%- endif -%}
            {{- bs_year_parts[1] -}}
          </p>
        {%- endif -%}
      </div>
    </div>

    <div class="bs-items">
      <div class="bs-rep{% if section.settings.replaced_image != blank %} has-img{% endif %}">
        {%- if section.settings.replaced_image != blank -%}
          <div class="bs-rep-img">
            {{ section.settings.replaced_image | image_url: width: 480 | image_tag: loading: 'lazy', alt: section.settings.separate_label, sizes: '(min-width: 990px) 160px, 33vw' }}
          </div>
        {%- endif -%}
        <ul class="bs-list" data-list>
          {%- for block in section.blocks -%}
            {%- assign bs_c = block.settings.price | remove: '$' | remove: '€' | remove: '£' | replace: ',', '.' | strip | times: 100 | round -%}
            {%- assign bs_w = forloop.index0 | times: 42 | divided_by: bs_last | plus: 8 -%}
            {%- if section.blocks.size == 1 -%}{%- assign bs_w = 20 -%}{%- endif -%}
            <li class="bs-row" data-i="{{ forloop.index0 }}" {{ block.shopify_attributes }}>
              <span class="bs-ic{% unless block.settings.image %} is-dot{% endunless %}">
                {%- if block.settings.image -%}
                  {{ block.settings.image | image_url: width: 96 | image_tag: loading: 'lazy', alt: block.settings.name }}
                {%- else -%}
                  <i style="background: {{ section.settings.accent | color_mix: section.settings.sage, bs_w }};"></i>
                {%- endif -%}
              </span>
              <span class="bs-nm">{{ block.settings.name }}</span>
              <span class="bs-pr">{{ bs_c | money }}</span>
            </li>
          {%- endfor -%}
        </ul>
      </div>
      <div class="bs-total">
        <span class="bs-nm">{{ section.settings.total_label }}</span>
        <s>{{ bs_sep | money }}{{ section.settings.per_day }}</s>
      </div>
      <div class="bs-mine">
        <span class="bs-nm">{{ bs_label }}</span>
        <span class="bs-pr"><span data-prod>{{ bs_prod | money }}</span>{{ section.settings.per_day }}</span>
      </div>
    </div>

    {%- if section.settings.show_button or section.settings.footnote != blank -%}
      <div class="bs-cta">
        {%- if section.settings.show_button -%}
          <a class="bs-btn" href="{% if bs_p != blank %}{{ bs_p.url }}{% else %}{{ routes.all_products_collection_url }}{% endif %}">
            {{ section.settings.button_text }}
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </a>
        {%- endif -%}
        {%- if section.settings.footnote != blank -%}<p class="bs-note">{{ section.settings.footnote }}</p>{%- endif -%}
      </div>
    {%- endif -%}
  </div>
</div>
<script>
  (function () {
    var root = document.getElementById('bs-vc-{{ section.id }}');
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
    var sep = +root.dataset.sep, one = +root.dataset.one, sub = +root.dataset.sub;
    var shown = { prod: root.dataset.plan === 'subscribe' ? sub : one };
    shown.year = Math.round(Math.max(0, sep - shown.prod) * 365 / 100) * 100;
    function tween(els, from, to, trim) {
      var t0 = performance.now();
      function step(t) {
        var p = Math.min(1, (t - t0) / 700), e = 1 - Math.pow(1 - p, 4);
        var v = Math.round(from + (to - from) * e);
        els.forEach(function (el) { el.textContent = money(v, trim); });
        if (p < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    }
    function render(plan) {
      var prod = plan === 'subscribe' ? sub : one;
      var max = Math.max(sep, prod, 1);
      var year = Math.round(Math.max(0, sep - prod) * 365 / 100) * 100;
      var pct = sep > 0 ? Math.round(Math.max(0, sep - prod) * 100 / sep) : 0;
      root.setAttribute('data-plan', plan);
      root.querySelectorAll('[data-plan-btn]').forEach(function (b) {
        b.setAttribute('aria-checked', b.getAttribute('data-plan-btn') === plan ? 'true' : 'false');
      });
      var bar = root.querySelector('[data-prod-bar]');
      if (bar) bar.style.height = (prod / max * 100) + '%';
      var sepBar = root.querySelector('[data-sep-bar]');
      if (sepBar) sepBar.style.height = (sep / max * 100) + '%';
      tween([].slice.call(root.querySelectorAll('[data-prod]')), shown.prod, prod, false);
      var y = root.querySelector('[data-year]');
      if (y) tween([y], shown.year, year, true);
      var s = root.querySelector('[data-save]'), sp = root.querySelector('[data-save-pct]');
      if (s) s.hidden = pct <= 0;
      if (sp) sp.textContent = pct;
      shown.prod = prod;
      shown.year = year;
    }
    root.querySelectorAll('[data-plan-btn]').forEach(function (b) {
      b.addEventListener('click', function () { render(b.getAttribute('data-plan-btn')); });
    });

    /* hover a row to light up its slice of the bar, and back */
    var list = root.querySelector('[data-list]'), stack = root.querySelector('[data-stack]');
    function hot(i) {
      [list, stack].forEach(function (g) { if (g) g.classList.toggle('is-hot', i !== null); });
      root.querySelectorAll('.bs-row, .bs-seg').forEach(function (el) {
        el.classList.toggle('is-hot', i !== null && el.getAttribute('data-i') === String(i));
      });
    }
    root.querySelectorAll('.bs-row, .bs-seg').forEach(function (el) {
      el.addEventListener('mouseenter', function () { hot(el.getAttribute('data-i')); });
      el.addEventListener('mouseleave', function () { hot(null); });
    });

    /* grow the bars in when the chart scrolls into view */
    if ('IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      root.classList.add('is-armed');
      var io = new IntersectionObserver(function (entries) {
        if (entries[0].isIntersecting) { root.classList.add('is-in'); io.disconnect(); }
      }, { rootMargin: '0px 0px -12% 0px' });
      io.observe(root.querySelector('.bs-chart') || root);
    }
  })();
</script>`;

  const items = list(config, "items");
  const unit = str(config, "currency", "$").slice(0, 3);

  const schema = buildSchema({
    name: "Value Chart",
    settings: [
      { type: "text", id: "eyebrow", label: "Eyebrow", default: str(config, "eyebrow") },
      { type: "text", id: "heading", label: "Heading", default: str(config, "heading") },
      { type: "textarea", id: "subheading", label: "Subheading", default: str(config, "subheading") },
      { type: "header", content: "Product" },
      { type: "product", id: "product", label: "Product", info: "Leave empty on a product page to use that product" },
      { type: "text", id: "product_label", label: "Product name (empty = product title)", default: str(config, "productName") },
      { type: "text", id: "pack_price", label: "Pack price (used when no product is set)", default: str(config, "packPrice") },
      { type: "range", id: "servings", label: "Servings per pack", min: 5, max: 100, step: 1, default: Math.max(5, Math.min(100, Math.round(num(config, "servings", 30)))) },
      { type: "header", content: "Images" },
      { type: "checkbox", id: "show_image", label: "Show product photo", default: str(config, "image").trim() !== "" },
      { type: "image_picker", id: "image", label: "Product photo", info: "Leave empty to use the product's featured image" },
      { type: "image_picker", id: "replaced_image", label: "Photo beside the replaced items (optional)" },
      { type: "header", content: "Pricing toggle" },
      { type: "checkbox", id: "show_toggle", label: "Show subscribe / one-time toggle", default: bool(config, "showToggle", true) },
      {
        type: "select", id: "default_plan", label: "Selected by default",
        options: [
          { value: "subscribe", label: "Subscribe" },
          { value: "onetime", label: "One-time" },
        ],
        default: str(config, "plan", "subscribe") === "onetime" ? "onetime" : "subscribe",
      },
      { type: "range", id: "sub_discount", label: "Subscribe discount", min: 0, max: 50, step: 1, unit: "%", default: Math.max(0, Math.min(50, Math.round(num(config, "subDiscount", 20)))) },
      { type: "text", id: "subscribe_label", label: "Subscribe label", default: str(config, "subscribeLabel") },
      { type: "text", id: "onetime_label", label: "One-time label", default: str(config, "oneTimeLabel") },
      { type: "header", content: "Chart" },
      { type: "text", id: "chart_label", label: "Chart label", default: str(config, "chartLabel") },
      { type: "text", id: "separate_label", label: "Separate products label", default: str(config, "separateLabel") },
      { type: "text", id: "per_day", label: "Per-day suffix", default: str(config, "perDay") },
      { type: "text", id: "save_label", label: "Savings badge", default: str(config, "saveLabel") },
      { type: "text", id: "year_text", label: "Yearly savings line (use {{yearly}})", default: str(config, "yearText") },
      { type: "text", id: "total_label", label: "Total row label", default: str(config, "totalLabel") },
      { type: "header", content: "Button" },
      { type: "checkbox", id: "show_button", label: "Show button", default: bool(config, "showButton", true) },
      { type: "text", id: "button_text", label: "Button text", default: str(config, "buttonText") },
      { type: "textarea", id: "footnote", label: "Footnote", default: str(config, "footnote") },
      { type: "header", content: "Style" },
      { type: "color", id: "accent", label: "Chart & button", default: str(config, "accent") },
      { type: "color", id: "accent_text", label: "Highlight (product bar & text on chart)", default: str(config, "accentText") },
      { type: "color", id: "sage", label: "Separate products bar", default: str(config, "sage") },
      { type: "color", id: "bg", label: "Background", default: str(config, "bg") },
      { type: "color", id: "text_color", label: "Text", default: str(config, "textColor") },
      { type: "color", id: "muted", label: "Muted text", default: str(config, "muted") },
      { type: "range", id: "radius", label: "Corner radius", min: 8, max: 32, step: 2, unit: "px", default: Math.max(8, Math.min(32, Math.round(num(config, "radius", 22) / 2) * 2)) },
    ],
    blocks: [
      {
        type: "item",
        name: "Replaced item",
        settings: [
          { type: "text", id: "name", label: "Name" },
          { type: "text", id: "price", label: `Price per day (${unit}), e.g. 0.85` },
          { type: "image_picker", id: "image", label: "Image (optional)" },
        ],
      },
    ],
    maxBlocks: 10,
    presetBlocks: items.map((it) => ({
      type: "item",
      settings: {
        name: esc(it.name ?? ""),
        price: esc(it.price ?? ""),
      },
    })),
  });

  return section({ style, markup, schema });
}

export const valueChart: Tweak = {
  slug: "value-chart",
  inspiredBy: "ag1",
  name: "Cost-per-Day Value Chart",
  tagline: "Stack up what your product replaces and show the price per day it beats.",
  description:
    "Modeled on the “what it replaces” value chart AG1 uses on its product pages. Every supplement your product stands in for is stacked into one tall bar at its per-day price, right next to your product's own, much shorter bar, with the daily and yearly savings called out. Bars grow in on scroll and re-flow when shoppers flip between subscribe and one-time pricing.",
  category: "product-page",
  tier: "free",
  tint: "#eaf0ea",
  Preview,
  generateLiquid,
  defaults,
  fields: [
    { key: "eyebrow", label: "Eyebrow", type: "text", group: "Content" },
    { key: "heading", label: "Heading", type: "text", group: "Content" },
    { key: "subheading", label: "Subheading", type: "textarea", group: "Content" },
    {
      key: "image", label: "Image URL", type: "text", group: "Media", placeholder: "https://…",
      hint: "Product photo above the chart. Empty hides it. In your store it uses the image you pick or the product's featured image",
    },
    {
      key: "replacedImage", label: "Replaced items image URL", type: "text", group: "Media", placeholder: "https://…",
      hint: "Photo beside the replaced items. Empty shows small icons instead",
    },
    { key: "productName", label: "Product name", type: "text", group: "Your product" },
    { key: "packPrice", label: "Pack price", type: "text", group: "Your product", hint: "In your store this comes from the product you pick; this is the fallback" },
    { key: "servings", label: "Servings per pack", type: "slider", group: "Your product", min: 5, max: 100, step: 1 },
    { key: "currency", label: "Currency symbol", type: "text", group: "Your product" },
    {
      key: "items", label: "What it replaces", type: "list", group: "Replaced items",
      hint: "Price is per day, e.g. 0.85",
      itemFields: [
        { key: "name", label: "Name", type: "text" },
        { key: "price", label: "Price / day", type: "text" },
      ],
      newItem: { name: "Omega-3", price: "0.70" }, addLabel: "Add item", max: 10,
    },
    { key: "showToggle", label: "Show pricing toggle", type: "toggle", group: "Pricing toggle" },
    {
      key: "plan", label: "Selected by default", type: "select", group: "Pricing toggle",
      options: [
        { label: "Subscribe", value: "subscribe" },
        { label: "One-time", value: "onetime" },
      ],
    },
    { key: "subDiscount", label: "Subscribe discount", type: "slider", group: "Pricing toggle", min: 0, max: 50, step: 1, unit: "%" },
    { key: "subscribeLabel", label: "Subscribe label", type: "text", group: "Pricing toggle" },
    { key: "oneTimeLabel", label: "One-time label", type: "text", group: "Pricing toggle" },
    { key: "chartLabel", label: "Chart label", type: "text", group: "Chart" },
    { key: "separateLabel", label: "Separate products label", type: "text", group: "Chart" },
    { key: "perDay", label: "Per-day suffix", type: "text", group: "Chart" },
    { key: "saveLabel", label: "Savings badge", type: "text", group: "Chart" },
    { key: "yearText", label: "Yearly savings line", type: "text", group: "Chart", hint: "Use {{yearly}} for the amount saved per year" },
    { key: "totalLabel", label: "Total row label", type: "text", group: "Chart" },
    { key: "showButton", label: "Show button", type: "toggle", group: "Button" },
    { key: "buttonText", label: "Button text", type: "text", group: "Button" },
    { key: "footnote", label: "Footnote", type: "textarea", group: "Button" },
    fontField("Typography"),
    { key: "radius", label: "Corner radius", type: "slider", group: "Layout", min: 8, max: 32, step: 2, unit: "px" },
    { key: "accent", label: "Chart & button", type: "color", group: "Colors" },
    { key: "accentText", label: "Highlight", type: "color", group: "Colors" },
    { key: "sage", label: "Separate products bar", type: "color", group: "Colors" },
    { key: "bg", label: "Background", type: "color", group: "Colors" },
    { key: "textColor", label: "Text", type: "color", group: "Colors" },
    { key: "muted", label: "Muted text", type: "color", group: "Colors" },
  ],
};
