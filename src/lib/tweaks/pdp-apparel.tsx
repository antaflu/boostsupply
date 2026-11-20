"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { Tweak, TweakConfig } from "../types";
import { str, num, bool, list, fontStack, esc } from "../cfg";
import { fontField } from "../fields";
import { buildSchema, section, fontFaceFor } from "../liquid";
import { money, toNum } from "./product-art";

/* ============================================================
   Apparel PDP
   A compact, complete gym-wear product page in one section:
   a gallery (main photo + detail crops as thumbnails), and a buy
   box with a heavy caps title, sale price with a "30% OFF | SAVE
   $17" chip, colour swatches, a Mid / High rise toggle, size chips
   with low-stock dots, a delivery estimate, a loyalty XP line and
   an add-to-bag button. When the button scrolls out of view a
   mini bar slides up from the bottom of the visible area.
   ============================================================ */

const EASE = "cubic-bezier(.22,1,.36,1)";
const STAR = "M12 2.6l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.4l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z";
const ICONS = {
  truck: "M3 6.5h10.5v9H3zM13.5 9.5h3.8l2.7 3v3h-6.5M7 18.2a1.7 1.7 0 1 0 0-.01M17 18.2a1.7 1.7 0 1 0 0-.01",
  bolt: "M13 3L5.5 13.2h5.3L10 21l7.5-10.2h-5.3z",
  back: "M9 7L4.5 11.5 9 16M5 11.5h9.5a5 5 0 0 1 0 10H12",
  ruler: "M3.5 15.5l12-12 5 5-12 12zM7.5 11.5l1.8 1.8M10 9l2.6 2.6M12.5 6.5l1.8 1.8",
  heart: "M12 20s-7.5-4.6-7.5-10A4.2 4.2 0 0 1 12 7.6 4.2 4.2 0 0 1 19.5 10C19.5 15.4 12 20 12 20z",
};

const defaults: TweakConfig = {
  badge: "New",
  eyebrow: "Seamless leggings",
  title: "Arc Sculpt Leggings",
  rating: "4.7",
  reviewCount: "2,318",
  currency: "$",
  price: "39",
  compare: "56",
  offLabel: "off",
  saveLabel: "save",
  gallery: [
    { image: "/mockups/fit-leggings.jpg", focus: "62% 50%", zoom: "1" },
    { image: "/mockups/fit-leggings.jpg", focus: "56% 40%", zoom: "2.2" },
    { image: "/mockups/fit-leggings.jpg", focus: "72% 78%", zoom: "1.9" },
    { image: "/mockups/fit-leggings.jpg", focus: "66% 24%", zoom: "2.3" },
  ],
  colourLabel: "Colour",
  colours: [
    { name: "Black", hex: "#0D1012" },
    { name: "Deep Navy", hex: "#1F2A44" },
    { name: "Plum", hex: "#5B2140" },
    { name: "Sage", hex: "#8A9A86" },
    { name: "Stone", hex: "#CFC6B8" },
  ],
  showRise: true,
  riseLabel: "Rise",
  riseA: "Mid",
  riseB: "High",
  riseDefault: "b",
  sizeLabel: "Size",
  sizeGuide: "Size guide",
  sizes: [
    { size: "XS", stock: "" },
    { size: "S", stock: "3" },
    { size: "M", stock: "" },
    { size: "L", stock: "" },
    { size: "XL", stock: "2" },
    { size: "XXL", stock: "0" },
  ],
  requireSize: true,
  lowStockText: "Only {{count}} left",
  lowLegend: "Low stock",
  selectText: "Select a size",
  sizeError: "Please select a size first",
  buttonText: "Add to bag",
  addedText: "Added to bag",
  deliveryLabel: "Estimated delivery",
  deliveryMin: 2,
  deliveryMax: 4,
  loyaltyText: "Earn {{xp}} XP with this order",
  xpRate: "8.3",
  returnsText: "Free returns within 30 days",
  detailsTitle: "Product details",
  details: "Seamless knit with sculpting contour zones, a sweat-wicking finish and a squat-proof, second-skin feel. The high waistband stays put through every rep.",
  showSticky: true,
  bg: "#FFFFFF",
  surface: "#F3F4F5",
  textColor: "#0D1012",
  accent: "#DC0428",
  linkColor: "#004EBA",
  track: "#DEE0E3",
  muted: "#5E6368",
  font: "system",
  displayFont: "system",
  displayCaps: true,
  radius: 4,
};

/** Hex color + alpha byte, e.g. tint("#0D1012", 0.12). */
const tint = (hex: string, a: number) =>
  /^#[0-9a-f]{6}$/i.test(hex)
    ? hex + Math.round(a * 255).toString(16).padStart(2, "0")
    : hex;

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const token = (k: string) => "{{" + k + "}}";

/** Add business days (skips Saturday and Sunday). */
const addBusinessDays = (from: number, n: number) => {
  const d = new Date(from);
  let left = n;
  while (left > 0) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() !== 0 && d.getDay() !== 6) left -= 1;
  }
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
};

function Svg({ d, size = 18, stroke = true }: { d: string; size?: number; stroke?: boolean }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={stroke ? "none" : "currentColor"}
      stroke={stroke ? "currentColor" : "none"}
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="shrink-0"
    >
      <path d={d} />
    </svg>
  );
}

type Slide = { image: string; focus: string; zoom: number };

/** One gallery photo: the image cropped/zoomed on a focus point, or a CSS fallback. */
function Shot({ s, on = true, fallback }: { s: Slide; on?: boolean; fallback: string }) {
  if (!s.image) {
    return (
      <div
        aria-hidden
        className="absolute inset-0"
        style={{ background: `repeating-linear-gradient(135deg, ${tint(fallback, 0.06)} 0 2px, transparent 2px 14px), linear-gradient(160deg, #2b2f34, ${fallback})` }}
      />
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={s.image}
      alt=""
      loading="lazy"
      decoding="async"
      draggable={false}
      className="absolute inset-0 h-full w-full object-cover"
      style={{
        objectPosition: s.focus,
        transformOrigin: s.focus,
        transform: `scale(${s.zoom * (on ? 1 : 1.04)})`,
        transition: `transform 900ms ${EASE}`,
      }}
    />
  );
}

function Preview({ config }: { config: TweakConfig }) {
  const cur = str(config, "currency", "$");
  const bg = str(config, "bg", "#FFFFFF");
  const surface = str(config, "surface", "#F3F4F5");
  const text = str(config, "textColor", "#0D1012");
  const accent = str(config, "accent", "#DC0428");
  const linkColor = str(config, "linkColor", "#004EBA");
  const track = str(config, "track", "#DEE0E3");
  const muted = str(config, "muted", "#5E6368");
  const radius = num(config, "radius", 4);
  const display: CSSProperties = {
    fontFamily: fontStack(str(config, "displayFont", "system")),
    fontWeight: 800,
    fontStretch: "condensed",
    textTransform: bool(config, "displayCaps", true) ? "uppercase" : "none",
    letterSpacing: "-0.015em",
    lineHeight: 0.92,
  };
  const label: CSSProperties = { letterSpacing: "0.07em" };

  const slides: Slide[] = list(config, "gallery").map((g) => ({
    image: (g.image ?? "").trim(),
    focus: (g.focus ?? "").trim() || "50% 50%",
    zoom: clamp(toNum(g.zoom, 1), 1, 3),
  }));
  if (!slides.length) slides.push({ image: "", focus: "50% 50%", zoom: 1 });
  const colours = list(config, "colours");
  const sizes = list(config, "sizes").map((s) => ({ size: (s.size ?? "").trim(), stock: (s.stock ?? "").trim() })).filter((s) => s.size);
  const rises = [str(config, "riseA"), str(config, "riseB")];
  const showRise = bool(config, "showRise", true) && rises.every(Boolean);

  const price = toNum(str(config, "price"));
  const compare = toNum(str(config, "compare"));
  const onSale = compare > price;
  const save = compare - price;
  const pct = onSale ? Math.round((save / compare) * 100) : 0;
  const xp = Math.round(price * toNum(str(config, "xpRate"), 0));
  const dMin = clamp(Math.round(num(config, "deliveryMin", 2)), 1, 20);
  const dMax = Math.max(dMin, clamp(Math.round(num(config, "deliveryMax", 4)), 1, 30));
  const requireSize = bool(config, "requireSize", true);

  const [slide, setSlide] = useState(0);
  const [col, setCol] = useState(0);
  const [rise, setRise] = useState(str(config, "riseDefault") === "a" ? 0 : 1);
  const [sz, setSz] = useState<number | null>(requireSize ? null : sizes.findIndex((s) => s.stock !== "0"));
  const [err, setErr] = useState(false);
  const [added, setAdded] = useState(false);
  const [open, setOpen] = useState(false);
  const [now, setNow] = useState<number | null>(null);
  const [bar, setBar] = useState({ show: false, y: 0 });
  const root = useRef<HTMLDivElement>(null);
  const atc = useRef<HTMLButtonElement>(null);

  const active = Math.min(slide, slides.length - 1);
  const colour = colours[Math.min(col, colours.length - 1)];
  const pick = sz !== null && sz >= 0 && sz < sizes.length ? sz : null;
  const pickedStock = pick !== null ? sizes[pick].stock : "";
  const low = pickedStock !== "" && pickedStock !== "0" ? Math.round(toNum(pickedStock)) : 0;

  useEffect(() => {
    const r = requestAnimationFrame(() => setNow(Date.now()));
    return () => cancelAnimationFrame(r);
  }, []);

  useEffect(() => {
    if (!added) return;
    const t = setTimeout(() => setAdded(false), 1700);
    return () => clearTimeout(t);
  }, [added]);

  /* Mini bar: shows once the add-to-bag button has scrolled above the
     nearest scrolling ancestor, pinned to the bottom of what's visible. */
  useEffect(() => {
    const el = root.current;
    const btn = atc.current;
    if (!el || !btn) return;
    let sc: HTMLElement | null = el.parentElement;
    while (sc && !/(auto|scroll)/.test(getComputedStyle(sc).overflowY)) sc = sc.parentElement;
    const target: HTMLElement | Window = sc ?? window;
    /* scroll events already arrive once per frame, so no extra throttle */
    const run = () => {
      const vr = sc ? sc.getBoundingClientRect() : { top: 0, bottom: window.innerHeight };
      const rr = el.getBoundingClientRect();
      const br = btn.getBoundingClientRect();
      const k = el.offsetWidth ? rr.width / el.offsetWidth : 1;
      const show = br.bottom < vr.top && rr.bottom > vr.top + 72 * k;
      setBar({ show, y: (Math.min(rr.bottom, vr.bottom) - rr.top) / k });
    };
    const first = requestAnimationFrame(run);
    target.addEventListener("scroll", run, { passive: true });
    window.addEventListener("resize", run);
    return () => {
      cancelAnimationFrame(first);
      target.removeEventListener("scroll", run);
      window.removeEventListener("resize", run);
    };
  }, []);

  const add = () => {
    if (pick === null) {
      setErr(true);
      return;
    }
    setAdded(true);
  };

  const btnLabel = added ? str(config, "addedText") : pick === null && requireSize ? str(config, "selectText") : str(config, "buttonText");
  const priceRow = (big: boolean) => (
    <span className="flex flex-wrap items-center gap-x-2 gap-y-1.5 tabular-nums">
      <b className={big ? "text-[20px] font-extrabold" : "text-[14px] font-extrabold"} style={{ color: onSale ? accent : text }}>
        {money(price, cur)}
      </b>
      {onSale && (
        <s className={big ? "text-[14px]" : "text-[12px]"} style={{ color: muted }}>
          {money(compare, cur)}
        </s>
      )}
    </span>
  );

  return (
    <div
      ref={root}
      className="@container relative w-full"
      style={{ background: bg, color: text, fontFamily: fontStack(str(config, "font", "system")) }}
    >
      <div className="mx-auto grid w-full max-w-[1100px] gap-5 pb-7 @min-[720px]:grid-cols-[minmax(0,1.08fr)_minmax(0,1fr)] @min-[720px]:gap-10 @min-[720px]:px-8 @min-[720px]:py-8">
        {/* Gallery */}
        <div className="grid min-w-0 gap-2.5 @min-[720px]:grid-cols-[60px_minmax(0,1fr)] @min-[720px]:gap-3 @min-[720px]:self-start">
          <div
            className="group relative order-1 aspect-[4/5] overflow-hidden @min-[720px]:order-2 @min-[720px]:rounded-[var(--r)]"
            style={{ background: surface, "--r": `${radius}px` } as CSSProperties}
          >
            <div className="absolute inset-0">
              {slides.map((s, i) => (
                <div
                  key={i}
                  className="absolute inset-0"
                  aria-hidden={i !== active}
                  style={{ opacity: i === active ? 1 : 0, transition: `opacity 520ms ${EASE}` }}
                >
                  <Shot s={s} on={i === active} fallback={text} />
                </div>
              ))}
            </div>
            {str(config, "badge") && (
              <span className="absolute left-3 top-3 rounded-[3px] bg-white px-2 py-[5px] text-[10px] font-extrabold uppercase leading-none" style={{ ...label, color: text }}>
                {str(config, "badge")}
              </span>
            )}
            <button
              type="button"
              aria-label="Save to wishlist"
              className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-white/90 backdrop-blur transition-[scale] duration-200 active:scale-90"
              style={{ color: text }}
            >
              <Svg d={ICONS.heart} size={17} />
            </button>
            {slides.length > 1 && (
              <>
                <span
                  className="absolute bottom-3 left-3 rounded-full px-2.5 py-[6px] text-[10.5px] font-bold leading-none text-white tabular-nums backdrop-blur-md"
                  style={{ background: "rgba(0,0,0,.45)" }}
                >
                  {active + 1} / {slides.length}
                </span>
                <div className="absolute bottom-3 right-3 flex gap-1.5">
                  {([-1, 1] as const).map((d) => (
                    <button
                      key={d}
                      type="button"
                      aria-label={d < 0 ? "Previous image" : "Next image"}
                      onClick={() => setSlide((active + d + slides.length) % slides.length)}
                      className="grid h-9 w-9 place-items-center rounded-full bg-white/90 backdrop-blur transition-[scale] duration-200 active:scale-90"
                      style={{ color: text }}
                    >
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        {d < 0 ? <path d="M10 3L5 8l5 5" /> : <path d="M6 3l5 5-5 5" />}
                      </svg>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
          {slides.length > 1 && (
            <div className="bs-no-scrollbar order-2 flex gap-2 overflow-x-auto px-5 @min-[720px]:order-1 @min-[720px]:flex-col @min-[720px]:px-0">
              {slides.map((s, i) => {
                const on = i === active;
                return (
                  <button
                    key={i}
                    type="button"
                    aria-label={`Show image ${i + 1}`}
                    aria-current={on}
                    onClick={() => setSlide(i)}
                    className="relative aspect-[4/5] w-[52px] shrink-0 overflow-hidden transition-[box-shadow,opacity] duration-300 @min-[720px]:w-full"
                    style={{
                      background: surface,
                      borderRadius: Math.max(2, radius - 1),
                      opacity: on ? 1 : 0.7,
                      boxShadow: on ? `0 0 0 2px ${bg}, 0 0 0 3.5px ${text}` : "none",
                    }}
                  >
                    <Shot s={s} fallback={text} />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Buy box */}
        <div className="min-w-0 px-5 @min-[720px]:px-0">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] font-bold uppercase" style={{ ...label, color: muted }}>
              {str(config, "eyebrow")}
            </p>
            {str(config, "rating") && (
              <span className="flex items-center gap-1 text-[12px] tabular-nums">
                <svg width="13" height="13" viewBox="0 0 24 24" fill={text} aria-hidden>
                  <path d={STAR} />
                </svg>
                <b className="font-bold">{str(config, "rating")}</b>
                {str(config, "reviewCount") && (
                  <span className="underline underline-offset-2" style={{ color: linkColor }}>
                    ({str(config, "reviewCount")})
                  </span>
                )}
              </span>
            )}
          </div>
          <h3 className="mt-2 text-[30px] @min-[720px]:text-[36px]" style={display}>
            {str(config, "title")}
          </h3>
          <div className="mt-3 flex flex-wrap items-center gap-x-2.5 gap-y-2">
            {priceRow(true)}
            {onSale && (
              <span
                className="rounded-[3px] px-1.5 py-[5px] text-[10.5px] font-extrabold uppercase leading-none text-white"
                style={{ ...label, background: accent }}
              >
                {pct}% {str(config, "offLabel")}
                <span className="mx-1.5 opacity-55">|</span>
                {str(config, "saveLabel")} {money(save, cur)}
              </span>
            )}
          </div>

          {/* Colour */}
          {colours.length > 0 && (
            <div className="mt-5 border-t pt-4" style={{ borderColor: track }}>
              <p className="text-[11px] font-bold uppercase" style={label}>
                {str(config, "colourLabel")}: <span className="font-medium normal-case tracking-normal" style={{ color: muted }}>{colour?.name}</span>
              </p>
              <div role="radiogroup" aria-label={str(config, "colourLabel")} className="mt-2.5 flex flex-wrap gap-2.5">
                {colours.map((c, i) => {
                  const on = i === Math.min(col, colours.length - 1);
                  return (
                    <button
                      key={i}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      aria-label={c.name}
                      onClick={() => setCol(i)}
                      className="h-8 w-8 rounded-full transition-[box-shadow,scale] duration-300 active:scale-90"
                      style={{
                        background: c.hex || track,
                        boxShadow: on ? `0 0 0 2px ${bg}, 0 0 0 3.5px ${text}` : `inset 0 0 0 1px ${tint(text, 0.12)}`,
                        transitionTimingFunction: EASE,
                      }}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* Rise */}
          {showRise && (
            <div className="mt-4">
              <p className="text-[11px] font-bold uppercase" style={label}>
                {str(config, "riseLabel")}
              </p>
              <div role="radiogroup" aria-label={str(config, "riseLabel")} className="relative mt-2.5 grid h-10 grid-cols-2 rounded-full p-1" style={{ background: surface }}>
                <span
                  aria-hidden
                  className="absolute bottom-1 left-1 top-1 w-[calc(50%-4px)] rounded-full bg-white"
                  style={{ transform: rise ? "translateX(100%)" : "none", transition: `transform 360ms ${EASE}`, boxShadow: "0 1px 3px rgba(0,0,0,.12)" }}
                />
                {rises.map((r, i) => (
                  <button
                    key={i}
                    type="button"
                    role="radio"
                    aria-checked={rise === i}
                    onClick={() => setRise(i)}
                    className="relative z-[1] rounded-full text-[12px] font-bold uppercase transition-colors duration-200"
                    style={{ ...label, color: rise === i ? text : muted }}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Size */}
          {sizes.length > 0 && (
            <div className="mt-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[11px] font-bold uppercase" style={label}>
                  {str(config, "sizeLabel")}
                  {pick !== null && <span className="ml-1 font-medium normal-case tracking-normal" style={{ color: muted }}>{sizes[pick].size}</span>}
                </p>
                {str(config, "sizeGuide") && (
                  <span className="flex cursor-pointer items-center gap-1 text-[12px] font-semibold underline underline-offset-2">
                    <Svg d={ICONS.ruler} size={15} />
                    {str(config, "sizeGuide")}
                  </span>
                )}
              </div>
              <div
                role="radiogroup"
                aria-label={str(config, "sizeLabel")}
                className="mt-2.5 grid gap-1.5"
                style={{ gridTemplateColumns: `repeat(${Math.min(sizes.length, 6)}, minmax(0,1fr))` }}
              >
                {sizes.map((s, i) => {
                  const on = pick === i;
                  const out = s.stock === "0";
                  const lowDot = s.stock !== "" && !out;
                  return (
                    <button
                      key={i}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      disabled={out}
                      onClick={() => {
                        setSz(i);
                        setErr(false);
                      }}
                      className="relative h-11 text-[12.5px] font-bold transition-[background-color,color,box-shadow,scale] duration-200 enabled:active:scale-95 disabled:cursor-not-allowed"
                      style={{
                        borderRadius: radius,
                        background: on ? text : bg,
                        color: on ? bg : out ? tint(text, 0.3) : text,
                        boxShadow: on ? "none" : `inset 0 0 0 1.5px ${err ? accent : track}`,
                        backgroundImage: out ? `linear-gradient(to top right, transparent calc(50% - .5px), ${track} calc(50% - .5px), ${track} calc(50% + .5px), transparent calc(50% + .5px))` : undefined,
                      }}
                    >
                      {s.size}
                      {lowDot && <span aria-hidden className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full" style={{ background: accent }} />}
                    </button>
                  );
                })}
              </div>
              <p
                key={err ? "e" : low ? `l${pick}` : "n"}
                className="bs-swap mt-2 flex min-h-[18px] items-center gap-1.5 text-[12px] font-semibold"
                style={{ color: err || low ? accent : muted }}
              >
                {err ? (
                  str(config, "sizeError")
                ) : low ? (
                  <>
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60" style={{ background: accent }} />
                      <span className="relative inline-flex h-1.5 w-1.5 rounded-full" style={{ background: accent }} />
                    </span>
                    {str(config, "lowStockText").split(token("count")).join(String(low))}
                  </>
                ) : str(config, "lowLegend") && sizes.some((s) => s.stock !== "" && s.stock !== "0") ? (
                  <span className="font-medium">
                    <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full align-middle" style={{ background: accent }} />
                    {str(config, "lowLegend")}
                  </span>
                ) : null}
              </p>
            </div>
          )}

          <button
            ref={atc}
            type="button"
            onClick={add}
            className="mt-3 flex h-[52px] w-full items-center justify-center gap-2 rounded-full text-[13.5px] font-extrabold uppercase transition-[background-color,scale] duration-300 hover:brightness-125 active:scale-[0.985]"
            style={{ ...label, background: text, color: bg }}
          >
            <span key={btnLabel} className="bs-swap inline-flex items-center gap-2">
              {added && (
                <svg width="14" height="14" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M2.5 6.3l2.3 2.2 4.7-5" />
                </svg>
              )}
              {btnLabel}
            </span>
          </button>

          {/* Info rows */}
          <ul className="mt-4 flex flex-col text-[12.5px]">
            {str(config, "deliveryLabel") && (
              <li className="flex items-center gap-3 border-t py-3" style={{ borderColor: track }}>
                <Svg d={ICONS.truck} />
                <span>
                  {str(config, "deliveryLabel")}:{" "}
                  <b className="font-bold">{now ? `${addBusinessDays(now, dMin)} – ${addBusinessDays(now, dMax)}` : `${dMin}–${dMax} business days`}</b>
                </span>
              </li>
            )}
            {str(config, "loyaltyText") && xp > 0 && (
              <li className="flex items-center gap-3 border-t py-3" style={{ borderColor: track }}>
                <span className="grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full text-white" style={{ background: linkColor }}>
                  <Svg d={ICONS.bolt} size={12} stroke={false} />
                </span>
                <span>
                  {(() => {
                    const [pre, post = ""] = str(config, "loyaltyText").split(token("xp"));
                    return (
                      <>
                        {pre}
                        {str(config, "loyaltyText").includes(token("xp")) && <b className="font-bold" style={{ color: linkColor }}>{xp.toLocaleString("en-US")}</b>}
                        {post}
                      </>
                    );
                  })()}
                </span>
              </li>
            )}
            {str(config, "returnsText") && (
              <li className="flex items-center gap-3 border-t py-3" style={{ borderColor: track }}>
                <Svg d={ICONS.back} />
                <span>{str(config, "returnsText")}</span>
              </li>
            )}
            {str(config, "detailsTitle") && (
              <li className="border-y" style={{ borderColor: track }}>
                <button type="button" aria-expanded={open} onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between py-3 text-left">
                  <span className="text-[11px] font-bold uppercase" style={label}>
                    {str(config, "detailsTitle")}
                  </span>
                  <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden style={{ transform: open ? "rotate(45deg)" : "none", transition: `transform 300ms ${EASE}` }}>
                    <path d="M6 1.5v9M1.5 6h9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                  </svg>
                </button>
                <div className="grid transition-[grid-template-rows] duration-300" style={{ gridTemplateRows: open ? "1fr" : "0fr", transitionTimingFunction: EASE }}>
                  <p className="overflow-hidden text-[12.5px] leading-[1.55]" style={{ color: muted }}>
                    <span className="block pb-3.5">{str(config, "details")}</span>
                  </p>
                </div>
              </li>
            )}
          </ul>
        </div>
      </div>

      {/* Sticky mini bar */}
      {bool(config, "showSticky", true) && (
        <div
          aria-hidden={!bar.show}
          className="absolute inset-x-0 z-20 px-3 pb-3"
          style={{
            top: bar.y,
            transform: `translateY(${bar.show ? "-100%" : "-70%"})`,
            opacity: bar.show ? 1 : 0,
            visibility: bar.show ? "visible" : "hidden",
            transition: `transform 420ms ${EASE}, opacity 300ms ease, visibility 0s linear ${bar.show ? "0s" : "300ms"}`,
          }}
        >
          <div
            className="mx-auto flex max-w-[760px] items-center gap-3 p-2 pr-2.5"
            style={{ background: bg, borderRadius: radius + 8, boxShadow: `0 0 0 1px ${track}, 0 12px 32px -8px rgba(0,0,0,.28)` }}
          >
            <span className="relative h-12 w-10 shrink-0 overflow-hidden" style={{ background: surface, borderRadius: Math.max(2, radius - 1) }}>
              <Shot s={slides[0]} fallback={text} />
            </span>
            <div className="min-w-0 flex-1 leading-tight">
              <p className="truncate text-[12px]" style={{ ...display, lineHeight: 1.1 }}>
                {str(config, "title")}
              </p>
              <div className="mt-1 flex items-center gap-2 text-[11px]">
                {priceRow(false)}
                {pick !== null && (
                  <span className="rounded-[3px] px-1.5 py-[2px] font-bold" style={{ background: surface }}>
                    {sizes[pick].size}
                  </span>
                )}
              </div>
            </div>
            <button
              type="button"
              tabIndex={bar.show ? 0 : -1}
              onClick={add}
              className="h-10 shrink-0 rounded-full px-4 text-[11.5px] font-extrabold uppercase transition-[scale] duration-200 active:scale-95"
              style={{ ...label, background: text, color: bg }}
            >
              {added ? str(config, "addedText") : pick === null && requireSize ? str(config, "selectText") : str(config, "buttonText")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------- Liquid ---------------- */

function generateLiquid(config: TweakConfig): string {
  const body = fontFaceFor(str(config, "font", "system"));
  const disp = fontFaceFor(str(config, "displayFont", "system"));
  const face = body.face || disp.face;
  const S = ".bs-pa-{{ section.id }}";
  const r = "{{ section.settings.radius }}px";
  const ease = EASE;
  const svg = (d: string, size = 18, stroke = true) =>
    `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="${stroke ? "none" : "currentColor"}" stroke="${stroke ? "currentColor" : "none"}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg>`;

  const style = `<style>
${face ? face + "\n" : ""}  ${S} { container-type: inline-size; background: {{ section.settings.bg }}; color: {{ section.settings.text_color }}; font-family: ${body.family}; }
  ${S} * { box-sizing: border-box; }
  ${S} p, ${S} h1, ${S} ul { margin: 0; padding: 0; }
  ${S} button { font: inherit; color: inherit; }
  ${S} a { color: inherit; }
  ${S} .bs-disp { font-family: ${disp.family}; font-weight: 800; font-stretch: condensed; letter-spacing: -.015em; line-height: .92;
    {%- if section.settings.display_caps %} text-transform: uppercase;{% endif %} }
  ${S} .bs-lbl { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .07em; }
  ${S} .bs-lbl span { font-weight: 500; text-transform: none; letter-spacing: 0; color: {{ section.settings.muted }}; }
  ${S} .bs-wrap { max-width: 1100px; margin: 0 auto; display: grid; gap: 20px; padding-bottom: 28px; }
  ${S} .bs-gal { display: grid; gap: 10px; min-width: 0; }
  ${S} .bs-main { position: relative; aspect-ratio: 4 / 5; overflow: hidden; background: {{ section.settings.surface }}; }
  ${S} .bs-slide { position: absolute; inset: 0; opacity: 0; transition: opacity .52s ${ease}; }
  ${S} .bs-slide.is-on { opacity: 1; }
  ${S} .bs-slide img { width: 100%; height: 100%; object-fit: cover; display: block; }
  ${S} .bs-badge { position: absolute; left: 12px; top: 12px; z-index: 1; padding: 5px 8px; border-radius: 3px; background: #fff; font-size: 10px; font-weight: 800; line-height: 1; text-transform: uppercase; letter-spacing: .07em; }
  ${S} .bs-count { position: absolute; left: 12px; bottom: 12px; z-index: 1; padding: 6px 10px; border-radius: 99px; font-size: 10.5px; font-weight: 700; line-height: 1; color: #fff;
    background: rgba(0,0,0,.45); -webkit-backdrop-filter: blur(12px); backdrop-filter: blur(12px); font-variant-numeric: tabular-nums; }
  ${S} .bs-arrows { position: absolute; right: 12px; bottom: 12px; z-index: 1; display: flex; gap: 6px; }
  ${S} .bs-arrows button { width: 36px; height: 36px; display: grid; place-items: center; border: 0; border-radius: 99px; cursor: pointer; background: rgba(255,255,255,.9); transition: transform .2s; }
  ${S} .bs-arrows button:active { transform: scale(.9); }
  ${S} .bs-thumbs { display: flex; gap: 8px; overflow-x: auto; padding: 0 20px; scrollbar-width: none; }
  ${S} .bs-thumbs::-webkit-scrollbar { display: none; }
  ${S} .bs-th { position: relative; flex: 0 0 52px; aspect-ratio: 4 / 5; padding: 0; border: 0; cursor: pointer; overflow: hidden; opacity: .62;
    border-radius: {{ section.settings.radius | minus: 1 | at_least: 2 }}px; background: {{ section.settings.surface }}; transition: opacity .3s, box-shadow .3s; }
  ${S} .bs-th img { width: 100%; height: 100%; object-fit: cover; display: block; }
  ${S} .bs-th[aria-current="true"] { opacity: 1; box-shadow: 0 0 0 2px {{ section.settings.bg }}, 0 0 0 3.5px {{ section.settings.text_color }}; }
  ${S} .bs-box { min-width: 0; padding: 0 20px; }
  ${S} .bs-top { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
  ${S} .bs-eye { color: {{ section.settings.muted }}; }
  ${S} .bs-rate { display: flex; align-items: center; gap: 4px; font-size: 12px; text-decoration: none; }
  ${S} .bs-rate svg { fill: currentColor; }
  ${S} .bs-rate span { color: {{ section.settings.link_color }}; text-decoration: underline; text-underline-offset: 2px; }
  ${S} .bs-title { margin-top: 8px; font-size: 30px; }
  ${S} .bs-prices { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 10px; margin-top: 12px; font-variant-numeric: tabular-nums; }
  ${S} .bs-price { font-size: 20px; font-weight: 800; }
  ${S} .bs-prices.is-sale .bs-price { color: {{ section.settings.accent }}; }
  ${S} .bs-prices s { font-size: 14px; color: {{ section.settings.muted }}; }
  ${S} .bs-chip { padding: 5px 6px; border-radius: 3px; font-size: 10.5px; font-weight: 800; line-height: 1; text-transform: uppercase; letter-spacing: .07em; color: #fff; background: {{ section.settings.accent }}; }
  ${S} .bs-chip[hidden], ${S} [hidden] { display: none !important; }
  ${S} .bs-opt { margin-top: 16px; }
  ${S} .bs-opt.is-first { margin-top: 20px; padding-top: 16px; border-top: 1px solid {{ section.settings.track }}; }
  ${S} .bs-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
  ${S} .bs-sws { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 10px; }
  ${S} .bs-sw { position: relative; width: 32px; height: 32px; border-radius: 99px; cursor: pointer; background: var(--c);
    box-shadow: inset 0 0 0 1px {{ section.settings.text_color | color_modify: 'alpha', 0.12 }}; transition: box-shadow .3s ${ease}, transform .2s; }
  ${S} .bs-sw:active { transform: scale(.9); }
  ${S} .bs-sw:has(input:checked) { box-shadow: 0 0 0 2px {{ section.settings.bg }}, 0 0 0 3.5px {{ section.settings.text_color }}; }
  ${S} .bs-sw:has(input:focus-visible) { outline: 2px solid {{ section.settings.link_color }}; outline-offset: 4px; }
  ${S} .bs-sw.is-out::after { content: ""; position: absolute; inset: 0; border-radius: inherit; background: linear-gradient(to top right, transparent calc(50% - .75px), {{ section.settings.bg }} calc(50% - .75px), {{ section.settings.bg }} calc(50% + .75px), transparent calc(50% + .75px)); }
  ${S} input.bs-ri { position: absolute; opacity: 0; pointer-events: none; width: 1px; height: 1px; }
  ${S} .bs-seg { position: relative; display: grid; grid-auto-flow: column; grid-auto-columns: 1fr; height: 40px; margin-top: 10px; padding: 4px; border-radius: 99px; background: {{ section.settings.surface }}; }
  ${S} .bs-seg label { position: relative; display: grid; place-items: center; border-radius: 99px; cursor: pointer; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: .07em;
    color: {{ section.settings.muted }}; transition: color .2s, background-color .3s ${ease}, box-shadow .3s ${ease}; }
  ${S} .bs-seg label:has(input:checked) { color: {{ section.settings.text_color }}; background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,.12); }
  ${S} .bs-guide { display: flex; align-items: center; gap: 4px; font-size: 12px; font-weight: 600; text-decoration: underline; text-underline-offset: 2px; }
  ${S} .bs-sizes { display: grid; grid-template-columns: repeat(var(--n, 6), minmax(0, 1fr)); gap: 6px; margin-top: 10px; }
  ${S} .bs-size { position: relative; display: grid; place-items: center; height: 44px; border-radius: ${r}; cursor: pointer; font-size: 12.5px; font-weight: 700;
    background: {{ section.settings.bg }}; box-shadow: inset 0 0 0 1.5px {{ section.settings.track }}; transition: background-color .2s, color .2s, box-shadow .2s, transform .2s; }
  ${S} .bs-size:active { transform: scale(.95); }
  ${S} .bs-size:has(input:checked) { background: {{ section.settings.text_color }}; color: {{ section.settings.bg }}; box-shadow: none; }
  ${S} .bs-size:has(input:focus-visible) { outline: 2px solid {{ section.settings.link_color }}; outline-offset: 2px; }
  ${S} .bs-size.is-out { cursor: not-allowed; color: {{ section.settings.text_color | color_modify: 'alpha', 0.3 }};
    background-image: linear-gradient(to top right, transparent calc(50% - .5px), {{ section.settings.track }} calc(50% - .5px), {{ section.settings.track }} calc(50% + .5px), transparent calc(50% + .5px)); }
  ${S} .bs-size.is-low::after { content: ""; position: absolute; right: 6px; top: 6px; width: 6px; height: 6px; border-radius: 99px; background: {{ section.settings.accent }}; }
  ${S} .bs-sizes.is-err .bs-size:not(:has(input:checked)) { box-shadow: inset 0 0 0 1.5px {{ section.settings.accent }}; }
  ${S} .bs-msg { min-height: 18px; margin-top: 8px; font-size: 12px; font-weight: 600; color: {{ section.settings.muted }}; }
  ${S} .bs-msg.is-hot { color: {{ section.settings.accent }}; }
  ${S} .bs-msg.is-legend { font-weight: 500; }
  ${S} .bs-msg.is-legend::before { content: ""; display: inline-block; width: 6px; height: 6px; margin-right: 6px; border-radius: 99px; vertical-align: middle; background: {{ section.settings.accent }}; }
  ${S} .bs-form { margin: 12px 0 0; }
  ${S} .bs-atc { display: flex; align-items: center; justify-content: center; width: 100%; height: 52px; border: 0; border-radius: 99px; cursor: pointer;
    font-size: 13.5px; font-weight: 800; text-transform: uppercase; letter-spacing: .07em; background: {{ section.settings.text_color }}; color: {{ section.settings.bg }};
    transition: filter .2s, transform .2s, opacity .2s; }
  ${S} .bs-atc:hover:not(:disabled) { filter: brightness(1.25); }
  ${S} .bs-atc:active:not(:disabled) { transform: scale(.985); }
  ${S} .bs-atc:disabled { opacity: .45; cursor: not-allowed; }
  ${S} .bs-info { list-style: none; margin-top: 16px; font-size: 12.5px; }
  ${S} .bs-info li { display: flex; align-items: center; gap: 12px; padding: 12px 0; border-top: 1px solid {{ section.settings.track }}; }
  ${S} .bs-info svg { flex-shrink: 0; }
  ${S} .bs-xp { width: 18px; height: 18px; display: grid; place-items: center; flex-shrink: 0; border-radius: 99px; color: #fff; background: {{ section.settings.link_color }}; }
  ${S} .bs-xpv { color: {{ section.settings.link_color }}; }
  ${S} .bs-acc { border-top: 1px solid {{ section.settings.track }}; border-bottom: 1px solid {{ section.settings.track }}; }
  ${S} .bs-acc summary { display: flex; align-items: center; justify-content: space-between; padding: 12px 0; cursor: pointer; list-style: none; }
  ${S} .bs-acc summary::-webkit-details-marker { display: none; }
  ${S} .bs-acc summary svg { transition: transform .3s ${ease}; }
  ${S} .bs-acc[open] summary svg { transform: rotate(45deg); }
  ${S} .bs-acc-b { padding-bottom: 14px; font-size: 12.5px; line-height: 1.55; color: {{ section.settings.muted }}; }
  ${S} .bs-acc-b p + p { margin-top: 8px; }
  ${S} .bs-sticky { position: fixed; left: 0; right: 0; bottom: 0; z-index: 30; padding: 0 12px 12px; opacity: 0; visibility: hidden; transform: translateY(30%);
    transition: transform .42s ${ease}, opacity .3s ease, visibility 0s linear .3s; }
  ${S} .bs-sticky.is-on { opacity: 1; visibility: visible; transform: none; transition: transform .42s ${ease}, opacity .3s ease, visibility 0s; }
  ${S} .bs-st-in { max-width: 760px; margin: 0 auto; display: flex; align-items: center; gap: 12px; padding: 8px 10px 8px 8px; border-radius: {{ section.settings.radius | plus: 8 }}px;
    background: {{ section.settings.bg }}; box-shadow: 0 0 0 1px {{ section.settings.track }}, 0 12px 32px -8px rgba(0,0,0,.28); }
  ${S} .bs-st-img { width: 40px; height: 48px; flex-shrink: 0; overflow: hidden; border-radius: {{ section.settings.radius | minus: 1 | at_least: 2 }}px; background: {{ section.settings.surface }}; }
  ${S} .bs-st-img img { width: 100%; height: 100%; object-fit: cover; display: block; }
  ${S} .bs-st-t { flex: 1; min-width: 0; line-height: 1.1; }
  ${S} .bs-st-t .bs-disp { display: block; font-size: 12px; line-height: 1.1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  ${S} .bs-st-t small { display: block; margin-top: 4px; font-size: 12px; font-weight: 800; font-variant-numeric: tabular-nums; }
  ${S} .bs-st-b { flex-shrink: 0; height: 40px; padding: 0 16px; border: 0; border-radius: 99px; cursor: pointer; font-size: 11.5px; font-weight: 800; text-transform: uppercase; letter-spacing: .07em;
    background: {{ section.settings.text_color }}; color: {{ section.settings.bg }}; }
  @container (min-width: 720px) {
    ${S} .bs-wrap { grid-template-columns: minmax(0, 1.08fr) minmax(0, 1fr); gap: 40px; padding: 32px; }
    ${S} .bs-gal { grid-template-columns: 60px minmax(0, 1fr); gap: 12px; align-self: start; }
    ${S} .bs-main { order: 2; border-radius: ${r}; }
    ${S} .bs-thumbs { order: 1; flex-direction: column; padding: 0; }
    ${S} .bs-th { flex: 0 0 auto; width: 100%; }
    ${S} .bs-box { padding: 0; }
    ${S} .bs-title { font-size: 36px; }
  }
  @media (prefers-reduced-motion: reduce) { ${S} * { transition-duration: 1ms !important; } }
</style>`;

  const plus = `<svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M6 1.5v9M1.5 6h9" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>`;
  const chev = (d: string) =>
    `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg>`;

  const markup = `{%- comment -%}
  Apparel PDP by boost.supply. Add it to your product template (it replaces the
  theme's main product section). Setup:
  - Gallery: the product's images. Give each colour variant its own image and the
    gallery jumps to it when that colour is picked.
  - Options: set the option names below (Colour / Rise / Size). Several names can
    be comma separated, e.g. "Colour, Color". Missing options are simply hidden.
  - Swatch colours: Shopify's own option swatches are used; add a "Colour swatch"
    block per colour to set or override one (value must match the option value).
  - Low-stock dots: variants that track inventory (and don't continue selling
    when out of stock) show a dot at or below the low-stock threshold.
  - Compare-at prices drive the sale price, the chip and the saving.
  - XP line: XP = price × "XP per 1 currency unit". Display only; connect it to
    your loyalty app's points rule.
{%- endcomment -%}
{%- if product != blank -%}
{%- liquid
  assign bs_v = product.selected_or_first_available_variant
  assign bs_ck = section.settings.colour_option | downcase | split: ','
  assign bs_rk = section.settings.rise_option | downcase | split: ','
  assign bs_sk = section.settings.size_option | downcase | split: ','
  assign bs_ci = -1
  assign bs_ri = -1
  assign bs_szi = -1
  for bs_o in product.options_with_values
    assign bs_on = bs_o.name | downcase | strip
    for k in bs_ck
      assign kk = k | strip
      if kk == bs_on
        assign bs_col = bs_o
        assign bs_ci = bs_o.position | minus: 1
      endif
    endfor
    for k in bs_rk
      assign kk = k | strip
      if kk == bs_on
        assign bs_rise = bs_o
        assign bs_ri = bs_o.position | minus: 1
      endif
    endfor
    for k in bs_sk
      assign kk = k | strip
      if kk == bs_on
        assign bs_size = bs_o
        assign bs_szi = bs_o.position | minus: 1
      endif
    endfor
  endfor
  assign bs_need_size = false
  if section.settings.require_size and bs_szi >= 0 and product.selected_variant == blank
    assign bs_need_size = true
  endif
  assign bs_media = product.media | where: 'media_type', 'image'
  assign bs_form_id = 'bs-pa-form-' | append: section.id
  assign bs_rate = section.settings.xp_rate | plus: 0
  assign bs_xp = bs_v.price | times: bs_rate | divided_by: 100 | round
  assign bs_open = '{' | append: '{'
  assign bs_close = '}' | append: '}'
  assign bs_xp_token = bs_open | append: 'xp' | append: bs_close
  assign bs_xp_html = '<b class="bs-xpv" data-xp>' | append: bs_xp | append: '</b>'
-%}
<div class="bs-pa-{{ section.id }}" id="bs-pa-{{ section.id }}" data-ci="{{ bs_ci }}" data-ri="{{ bs_ri }}" data-si="{{ bs_szi }}"
  data-low="{{ section.settings.low_stock }}" data-rate="{{ bs_rate }}" data-dmin="{{ section.settings.delivery_min }}" data-dmax="{{ section.settings.delivery_max }}"
  data-low-text="{{ section.settings.low_stock_text | escape }}" data-err-text="{{ section.settings.size_error | escape }}" data-legend="{{ section.settings.low_legend | escape }}"
  data-add="{{ section.settings.button_text | escape }}" data-select="{{ section.settings.select_text | escape }}" data-out="{{ section.settings.sold_out_text | escape }}"
  data-off="{{ section.settings.off_label | escape }}" data-save="{{ section.settings.save_label | escape }}">
  <div class="bs-wrap">
    <div class="bs-gal">
      <div class="bs-main">
        {%- for bs_m in bs_media limit: 8 -%}
          <div class="bs-slide{% if forloop.first %} is-on{% endif %}" data-slide data-mid="{{ bs_m.id }}">
            {%- if forloop.first -%}
              {{ bs_m | image_url: width: 1400 | image_tag: loading: 'eager', fetchpriority: 'high', alt: bs_m.alt, sizes: '(min-width: 990px) 560px, 100vw' }}
            {%- else -%}
              {{ bs_m | image_url: width: 1400 | image_tag: loading: 'lazy', alt: bs_m.alt, sizes: '(min-width: 990px) 560px, 100vw' }}
            {%- endif -%}
          </div>
        {%- else -%}
          <div class="bs-slide is-on">{{ 'apparel-1' | placeholder_svg_tag }}</div>
        {%- endfor -%}
        {%- if section.settings.badge != blank -%}<span class="bs-badge">{{ section.settings.badge }}</span>{%- endif -%}
        {%- if bs_media.size > 1 -%}
          <span class="bs-count" data-count>1 / {{ bs_media.size | at_most: 8 }}</span>
          <div class="bs-arrows">
            <button type="button" data-go="-1" aria-label="Previous image">${chev("M10 3L5 8l5 5")}</button>
            <button type="button" data-go="1" aria-label="Next image">${chev("M6 3l5 5-5 5")}</button>
          </div>
        {%- endif -%}
      </div>
      {%- if bs_media.size > 1 -%}
        <div class="bs-thumbs">
          {%- for bs_m in bs_media limit: 8 -%}
            <button type="button" class="bs-th" data-th="{{ forloop.index0 }}" aria-label="Show image {{ forloop.index }}" aria-current="{% if forloop.first %}true{% else %}false{% endif %}">
              {{ bs_m | image_url: width: 160 | image_tag: loading: 'lazy', alt: '' }}
            </button>
          {%- endfor -%}
        </div>
      {%- endif -%}
    </div>

    <div class="bs-box">
      <div class="bs-top">
        <p class="bs-lbl bs-eye">{{ section.settings.eyebrow | default: product.type }}</p>
        {%- if section.settings.rating != blank -%}
          <a class="bs-rate" href="{{ section.settings.reviews_url | default: '#' }}"><svg width="13" height="13" viewBox="0 0 24 24" aria-hidden="true"><path d="${STAR}"/></svg><b>{{ section.settings.rating }}</b>{%- if section.settings.review_count != blank -%}<span>({{ section.settings.review_count }})</span>{%- endif -%}</a>
        {%- endif -%}
      </div>
      <h1 class="bs-title bs-disp">{{ product.title }}</h1>
      <div class="bs-prices{% if bs_v.compare_at_price > bs_v.price %} is-sale{% endif %}" data-prices>
        <b class="bs-price" data-price>{{ bs_v.price | money }}</b>
        <s data-cmp>{%- if bs_v.compare_at_price > bs_v.price -%}{{ bs_v.compare_at_price | money }}{%- endif -%}</s>
        <span class="bs-chip" data-chip{% unless bs_v.compare_at_price > bs_v.price %} hidden{% endunless %}></span>
      </div>

      {%- form 'product', product, id: bs_form_id, class: 'bs-form-tag', novalidate: 'novalidate' -%}
        <input type="hidden" name="id" value="{{ bs_v.id }}" data-id>
        {%- assign bs_first = true -%}
        {%- if bs_ci >= 0 -%}
          {%- assign bs_cur = bs_v.options[bs_ci] -%}
          <div class="bs-opt{% if bs_first %} is-first{% endif %}">
            <p class="bs-lbl">{{ section.settings.colour_label }}: <span data-col-name>{{ bs_cur }}</span></p>
            <div class="bs-sws" role="radiogroup" aria-label="{{ section.settings.colour_label | escape }}">
              {%- for bs_val in bs_col.values -%}
                {%- capture bs_name -%}{{ bs_val }}{%- endcapture -%}
                {%- assign bs_h = bs_name | handleize -%}
                {%- assign bs_c = '#d5d7da' -%}
                {%- if bs_val.swatch.color -%}{%- assign bs_c = bs_val.swatch.color -%}{%- endif -%}
                {%- for block in section.blocks -%}
                  {%- assign bs_bh = block.settings.value | handleize -%}
                  {%- if bs_bh == bs_h -%}{%- assign bs_c = block.settings.color -%}{%- endif -%}
                {%- endfor -%}
                <label class="bs-sw" style="--c: {{ bs_c }};" title="{{ bs_name | escape }}">
                  <input class="bs-ri" type="radio" name="bs-col-{{ section.id }}" value="{{ bs_name | escape }}" data-opt="c" aria-label="{{ bs_name | escape }}"{% if bs_name == bs_cur %} checked{% endif %}>
                </label>
              {%- endfor -%}
            </div>
          </div>
          {%- assign bs_first = false -%}
        {%- endif -%}

        {%- if bs_ri >= 0 -%}
          {%- assign bs_cur = bs_v.options[bs_ri] -%}
          <div class="bs-opt{% if bs_first %} is-first{% endif %}">
            <p class="bs-lbl">{{ section.settings.rise_label }}</p>
            <div class="bs-seg" role="radiogroup" aria-label="{{ section.settings.rise_label | escape }}">
              {%- for bs_val in bs_rise.values -%}
                {%- capture bs_name -%}{{ bs_val }}{%- endcapture -%}
                <label><input class="bs-ri" type="radio" name="bs-rise-{{ section.id }}" value="{{ bs_name | escape }}" data-opt="r"{% if bs_name == bs_cur %} checked{% endif %}>{{ bs_name }}</label>
              {%- endfor -%}
            </div>
          </div>
          {%- assign bs_first = false -%}
        {%- endif -%}

        {%- if bs_szi >= 0 -%}
          {%- assign bs_cur = bs_v.options[bs_szi] -%}
          <div class="bs-opt{% if bs_first %} is-first{% endif %}">
            <div class="bs-row">
              <p class="bs-lbl">{{ section.settings.size_label }} <span data-size-name>{% unless bs_need_size %}{{ bs_cur }}{% endunless %}</span></p>
              {%- if section.settings.size_guide_text != blank -%}
                <a class="bs-guide" href="{{ section.settings.size_guide_url | default: '#' }}">${svg(ICONS.ruler, 15)}{{ section.settings.size_guide_text }}</a>
              {%- endif -%}
            </div>
            <div class="bs-sizes" role="radiogroup" aria-label="{{ section.settings.size_label | escape }}" style="--n: {{ bs_size.values.size | at_most: 6 }};" data-sizes>
              {%- for bs_val in bs_size.values -%}
                {%- capture bs_name -%}{{ bs_val }}{%- endcapture -%}
                <label class="bs-size"><input class="bs-ri" type="radio" name="bs-size-{{ section.id }}" value="{{ bs_name | escape }}" data-opt="s"{% if bs_name == bs_cur and bs_need_size == false %} checked{% endif %}>{{ bs_name }}</label>
              {%- endfor -%}
            </div>
            <p class="bs-msg" data-msg aria-live="polite"></p>
          </div>
          {%- assign bs_first = false -%}
        {%- endif -%}

        <div class="bs-form">
          <button type="submit" name="add" class="bs-atc" data-atc{% unless bs_v.available %} disabled{% endunless %}>
            {%- if bs_need_size -%}{{ section.settings.select_text }}{%- elsif bs_v.available -%}{{ section.settings.button_text }}{%- else -%}{{ section.settings.sold_out_text }}{%- endif -%}
          </button>
        </div>
      {%- endform -%}

      <ul class="bs-info">
        {%- if section.settings.delivery_label != blank -%}
          <li>${svg(ICONS.truck)}<span>{{ section.settings.delivery_label }}: <b data-eta>{{ section.settings.delivery_min }}–{{ section.settings.delivery_max }} business days</b></span></li>
        {%- endif -%}
        {%- if section.settings.loyalty_text != blank and bs_rate > 0 -%}
          <li><span class="bs-xp">${svg(ICONS.bolt, 12, false)}</span><span>{{ section.settings.loyalty_text | escape | replace: bs_xp_token, bs_xp_html }}</span></li>
        {%- endif -%}
        {%- if section.settings.returns_text != blank -%}
          <li>${svg(ICONS.back)}<span>{{ section.settings.returns_text }}</span></li>
        {%- endif -%}
      </ul>
      {%- if section.settings.details_title != blank and product.description != blank -%}
        <details class="bs-acc">
          <summary><span class="bs-lbl">{{ section.settings.details_title }}</span>${plus}</summary>
          <div class="bs-acc-b">{{ product.description }}</div>
        </details>
      {%- endif -%}
    </div>
  </div>

  {%- if section.settings.show_sticky -%}
    <div class="bs-sticky" data-sticky>
      <div class="bs-st-in">
        <span class="bs-st-img">{%- if product.featured_image -%}{{ product.featured_image | image_url: width: 120 | image_tag: loading: 'lazy', alt: '' }}{%- endif -%}</span>
        <span class="bs-st-t"><span class="bs-disp">{{ product.title }}</span><small data-price-s>{{ bs_v.price | money }}</small></span>
        <button type="submit" form="{{ bs_form_id }}" name="add" class="bs-st-b" data-atc-s tabindex="-1">{{ section.settings.button_text }}</button>
      </div>
    </div>
  {%- endif -%}

  <script type="application/json" data-variants>[
    {%- for bs_var in product.variants -%}
      {%- assign bs_q = 'null' -%}
      {%- if bs_var.inventory_management == 'shopify' and bs_var.inventory_policy == 'deny' -%}{%- assign bs_q = bs_var.inventory_quantity -%}{%- endif -%}
      {"id":{{ bs_var.id }},"o":{{ bs_var.options | json }},"a":{{ bs_var.available | json }},"p":{{ bs_var.price }},"c":{{ bs_var.compare_at_price | default: 0 }},"q":{{ bs_q }},"m":{{ bs_var.featured_media.id | default: 0 }} }
      {%- unless forloop.last -%},{%- endunless -%}
    {%- endfor -%}
  ]</script>
</div>
<script>
  (function () {
    var root = document.getElementById('bs-pa-{{ section.id }}');
    if (!root) return;
    var d = root.dataset;
    var V = [];
    try { V = JSON.parse(root.querySelector('[data-variants]').textContent); } catch (e) { return; }
    var ci = +d.ci, ri = +d.ri, si = +d.si, low = +d.low || 0, rate = parseFloat(d.rate) || 0;
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
    function tok(k) { return '{' + '{' + k + '}' + '}'; }
    function $(s) { return root.querySelector(s); }
    function all(s) { return [].slice.call(root.querySelectorAll(s)); }
    function val(k) { var el = $('[data-opt="' + k + '"]:checked'); return el ? el.value : null; }

    /* gallery */
    var slides = all('[data-slide]'), thumbs = all('[data-th]'), idx = 0, count = $('[data-count]');
    function show(i) {
      if (!slides.length) return;
      idx = (i + slides.length) % slides.length;
      slides.forEach(function (s, k) { s.classList.toggle('is-on', k === idx); });
      thumbs.forEach(function (t, k) { t.setAttribute('aria-current', k === idx ? 'true' : 'false'); });
      if (count) count.textContent = (idx + 1) + ' / ' + slides.length;
    }
    thumbs.forEach(function (t) { t.addEventListener('click', function () { show(+t.dataset.th); }); });
    all('[data-go]').forEach(function (b) { b.addEventListener('click', function () { show(idx + +b.dataset.go); }); });

    /* variants */
    var atc = $('[data-atc]'), atcS = $('[data-atc-s]'), msg = $('[data-msg]'), sizesEl = $('[data-sizes]');
    function fits(v, c, r, s) {
      return (ci < 0 || c === null || v.o[ci] === c) && (ri < 0 || r === null || v.o[ri] === r) && (si < 0 || s === null || v.o[si] === s);
    }
    function find(c, r, s) { for (var i = 0; i < V.length; i++) if (fits(V[i], c, r, s)) return V[i]; return null; }
    function setLabel(t) { atc.textContent = t; if (atcS) atcS.textContent = t; }
    function update(fromUser) {
      var c = val('c'), r = val('r'), s = val('s');
      var cn = $('[data-col-name]'); if (cn) cn.textContent = c || '';
      var sn = $('[data-size-name]'); if (sn) sn.textContent = s || '';
      var lowQ = 0, anyLow = false;
      all('[data-opt="s"]').forEach(function (el) {
        var v = find(c, r, el.value), lab = el.parentNode;
        var out = !v || !v.a, q = v && v.q !== null ? v.q : null;
        lab.classList.toggle('is-out', out);
        lab.classList.toggle('is-low', !out && q !== null && q > 0 && q <= low);
        el.disabled = out;
        if (!out && q !== null && q > 0 && q <= low) anyLow = true;
        if (el.checked && !out && q !== null && q > 0 && q <= low) lowQ = q;
      });
      all('[data-opt="c"]').forEach(function (el) {
        el.parentNode.classList.toggle('is-out', !V.some(function (v) { return fits(v, el.value, null, null) && v.a; }));
      });
      if (msg) {
        var legend = lowQ === 0 && anyLow && !!d.legend;
        msg.classList.toggle('is-hot', lowQ > 0);
        msg.classList.toggle('is-legend', legend);
        msg.textContent = lowQ > 0 ? String(d.lowText).split(tok('count')).join(lowQ) : legend ? d.legend : '';
      }
      var m = find(c, r, s);
      if (si >= 0 && s === null) {
        m = find(c, r, null);
        setLabel(d.select);
        atc.disabled = false;
      } else if (!m) {
        setLabel(d.out);
        atc.disabled = true;
        return;
      } else {
        setLabel(m.a ? d.add : d.out);
        atc.disabled = !m.a;
        $('[data-id]').value = m.id;
      }
      if (!m) return;
      var sale = m.c > m.p;
      $('[data-prices]').classList.toggle('is-sale', sale);
      $('[data-price]').textContent = money(m.p);
      var ps = $('[data-price-s]'); if (ps) ps.textContent = money(m.p);
      $('[data-cmp]').textContent = sale ? money(m.c) : '';
      var chip = $('[data-chip]');
      chip.hidden = !sale;
      if (sale) chip.textContent = Math.round((m.c - m.p) / m.c * 100) + '% ' + d.off + '  |  ' + d.save + ' ' + money(m.c - m.p, true);
      var xp = $('[data-xp]'); if (xp) xp.textContent = Math.round(m.p / 100 * rate);
      if (fromUser && m.m) {
        slides.forEach(function (sl, k) { if (+sl.dataset.mid === m.m) show(k); });
      }
    }
    all('[data-opt]').forEach(function (el) {
      el.addEventListener('change', function () {
        if (sizesEl) sizesEl.classList.remove('is-err');
        update(true);
      });
    });
    var form = document.getElementById({{ bs_form_id | json }});
    if (form) form.addEventListener('submit', function (e) {
      if (si >= 0 && val('s') === null) {
        e.preventDefault();
        if (sizesEl) sizesEl.classList.add('is-err');
        if (msg) { msg.classList.add('is-hot'); msg.classList.remove('is-legend'); msg.textContent = d.errText; }
        if (sizesEl) sizesEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });

    /* delivery estimate (business days) */
    var eta = $('[data-eta]');
    if (eta) {
      var add = function (n) {
        var t = new Date();
        while (n > 0) { t.setDate(t.getDate() + 1); if (t.getDay() % 6) n--; }
        return t.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
      };
      eta.textContent = add(+d.dmin) + ' – ' + add(Math.max(+d.dmin, +d.dmax));
    }

    /* sticky mini bar: visible once the main button has scrolled past */
    var sticky = $('[data-sticky]');
    if (sticky && 'IntersectionObserver' in window) {
      new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          var on = !e.isIntersecting && e.boundingClientRect.top < 0;
          sticky.classList.toggle('is-on', on);
          if (atcS) atcS.tabIndex = on ? 0 : -1;
        });
      }).observe(atc);
    }
    update(false);
  })();
</script>
{%- else -%}
<p style="padding:24px;text-align:center;opacity:.6">Add this section to a product template.</p>
{%- endif -%}`;

  const colours = list(config, "colours").filter((c) => (c.name ?? "").trim());
  const hexOk = (h: string) => (/^#[0-9a-f]{6}$/i.test(h ?? "") ? h.toLowerCase() : "#d5d7da");
  const dMin = clamp(Math.round(num(config, "deliveryMin", 2)), 1, 20);

  const schema = buildSchema({
    name: "Apparel PDP",
    settings: [
      { type: "text", id: "badge", label: "Photo badge", default: str(config, "badge") },
      { type: "text", id: "eyebrow", label: "Eyebrow (leave empty for the product type)", default: str(config, "eyebrow") },
      { type: "text", id: "rating", label: "Rating", default: str(config, "rating") },
      { type: "text", id: "review_count", label: "Review count", default: str(config, "reviewCount") },
      { type: "url", id: "reviews_url", label: "Rating link (e.g. your reviews anchor)" },
      { type: "header", content: "Price" },
      { type: "text", id: "off_label", label: "“off” word in the sale chip", default: str(config, "offLabel") },
      { type: "text", id: "save_label", label: "“save” word in the sale chip", default: str(config, "saveLabel") },
      { type: "header", content: "Options" },
      { type: "text", id: "colour_option", label: "Colour option name(s)", default: "Colour, Color" },
      { type: "text", id: "colour_label", label: "Colour label", default: str(config, "colourLabel") },
      { type: "text", id: "rise_option", label: "Rise option name(s)", default: "Rise" },
      { type: "text", id: "rise_label", label: "Rise label", default: str(config, "riseLabel") },
      { type: "text", id: "size_option", label: "Size option name(s)", default: "Size" },
      { type: "text", id: "size_label", label: "Size label", default: str(config, "sizeLabel") },
      { type: "text", id: "size_guide_text", label: "Size guide link text", default: str(config, "sizeGuide") },
      { type: "url", id: "size_guide_url", label: "Size guide link" },
      { type: "checkbox", id: "require_size", label: "Make shoppers pick a size", default: bool(config, "requireSize", true) },
      { type: "range", id: "low_stock", label: "Low-stock threshold", min: 1, max: 20, step: 1, default: 5 },
      { type: "text", id: "low_stock_text", label: "Low-stock text (use {{count}})", default: str(config, "lowStockText") },
      { type: "text", id: "low_legend", label: "Low-stock legend (explains the dot)", default: str(config, "lowLegend") },
      { type: "text", id: "size_error", label: "No size picked message", default: str(config, "sizeError") },
      { type: "header", content: "Buy button" },
      { type: "text", id: "button_text", label: "Button text", default: str(config, "buttonText") },
      { type: "text", id: "select_text", label: "Button text before a size is picked", default: str(config, "selectText") },
      { type: "text", id: "sold_out_text", label: "Sold out text", default: "Sold out" },
      { type: "checkbox", id: "show_sticky", label: "Show the sticky mini bar", default: bool(config, "showSticky", true) },
      { type: "header", content: "Info rows" },
      { type: "text", id: "delivery_label", label: "Delivery label", default: str(config, "deliveryLabel") },
      { type: "range", id: "delivery_min", label: "Delivery: fastest (business days)", min: 1, max: 20, step: 1, default: dMin },
      { type: "range", id: "delivery_max", label: "Delivery: slowest (business days)", min: 1, max: 30, step: 1, default: Math.max(dMin, clamp(Math.round(num(config, "deliveryMax", 4)), 1, 30)) },
      { type: "text", id: "loyalty_text", label: "Loyalty text (use {{xp}})", default: str(config, "loyaltyText") },
      { type: "text", id: "xp_rate", label: "XP per 1 currency unit", default: str(config, "xpRate") },
      { type: "text", id: "returns_text", label: "Returns text", default: str(config, "returnsText") },
      { type: "text", id: "details_title", label: "Details title (shows the product description)", default: str(config, "detailsTitle") },
      { type: "header", content: "Style" },
      { type: "checkbox", id: "display_caps", label: "Uppercase display type", default: bool(config, "displayCaps", true) },
      { type: "color", id: "bg", label: "Background", default: str(config, "bg") },
      { type: "color", id: "surface", label: "Photo & toggle background", default: str(config, "surface") },
      { type: "color", id: "text_color", label: "Text & buttons", default: str(config, "textColor") },
      { type: "color", id: "accent", label: "Sale & low stock", default: str(config, "accent") },
      { type: "color", id: "link_color", label: "Links & XP", default: str(config, "linkColor") },
      { type: "color", id: "track", label: "Borders", default: str(config, "track") },
      { type: "color", id: "muted", label: "Muted text", default: str(config, "muted") },
      { type: "range", id: "radius", label: "Corner radius", min: 0, max: 16, step: 1, unit: "px", default: clamp(Math.round(num(config, "radius", 4)), 0, 16) },
    ],
    blocks: [
      {
        type: "swatch",
        name: "Colour swatch",
        settings: [
          { type: "text", id: "value", label: "Colour (must match the option value)" },
          { type: "color", id: "color", label: "Swatch", default: "#0d1012" },
        ],
      },
    ],
    maxBlocks: 24,
    presetBlocks: colours.map((c) => ({ type: "swatch", settings: { value: esc((c.name ?? "").trim()), color: hexOk(c.hex ?? "") } })),
  });

  return section({ style, markup, schema });
}

export const pdpApparel: Tweak = {
  slug: "pdp-apparel",
  inspiredBy: "gymshark",
  name: "Apparel PDP",
  tagline: "A complete gym-wear product page: gallery, sale chip, swatches, rise, low-stock sizes and a sticky bar.",
  description:
    "Modeled on the product pages Gymshark runs for its leggings. One section holds the whole page: a gallery with detail crops as thumbnails, a heavy caps title, the sale price with a “30% OFF | SAVE $17” chip, colour swatches, a Mid / High rise toggle, size chips with low-stock dots and “only 3 left”, a delivery estimate, a loyalty XP line and a bold add-to-bag. Once the button scrolls away a mini bar keeps it one tap away. In Shopify it reads the product's media, options, variant prices and inventory, and posts a real product form.",
  category: "product-page",
  tier: "free",
  tint: "#eceef0",
  Preview,
  generateLiquid,
  defaults,
  fields: [
    { key: "badge", label: "Photo badge", type: "text", group: "Content", hint: "Leave empty to hide" },
    { key: "eyebrow", label: "Eyebrow", type: "text", group: "Content" },
    { key: "title", label: "Product title", type: "text", group: "Content", hint: "Preview only. Your store shows the product title" },
    { key: "rating", label: "Rating", type: "text", group: "Content" },
    { key: "reviewCount", label: "Review count", type: "text", group: "Content" },
    { key: "currency", label: "Currency symbol", type: "text", group: "Price" },
    { key: "price", label: "Price", type: "text", group: "Price", hint: "Preview only. Your store uses the variant price" },
    { key: "compare", label: "Compare-at price", type: "text", group: "Price", hint: "Higher than the price shows the sale chip" },
    { key: "offLabel", label: "“off” word", type: "text", group: "Price" },
    { key: "saveLabel", label: "“save” word", type: "text", group: "Price" },
    {
      key: "gallery", label: "Gallery", type: "list", group: "Media",
      hint: "Preview only; your store uses the product's images. Focus is the crop point (x% y%), zoom 1–3 turns one photo into detail shots. Empty image URL shows a plain tile",
      itemFields: [
        { key: "image", label: "Image URL", type: "text" },
        { key: "focus", label: "Focus (x% y%)", type: "text" },
        { key: "zoom", label: "Zoom", type: "text" },
      ],
      newItem: { image: "/mockups/fit-leggings.jpg", focus: "40% 60%", zoom: "1.6" },
      addLabel: "Add photo", max: 8,
    },
    { key: "colourLabel", label: "Label", type: "text", group: "Colour" },
    {
      key: "colours", label: "Colours", type: "list", group: "Colour",
      hint: "Swatch is a hex colour. In Shopify they become “Colour swatch” blocks matched to your option values",
      itemFields: [
        { key: "name", label: "Name", type: "text" },
        { key: "hex", label: "Swatch", type: "text" },
      ],
      newItem: { name: "Rust", hex: "#9C4A2F" },
      addLabel: "Add colour", max: 12,
    },
    { key: "showRise", label: "Show rise toggle", type: "toggle", group: "Rise" },
    { key: "riseLabel", label: "Label", type: "text", group: "Rise" },
    { key: "riseA", label: "Option 1", type: "text", group: "Rise" },
    { key: "riseB", label: "Option 2", type: "text", group: "Rise" },
    {
      key: "riseDefault", label: "Selected", type: "select", group: "Rise",
      options: [
        { label: "Option 1", value: "a" },
        { label: "Option 2", value: "b" },
      ],
    },
    { key: "sizeLabel", label: "Label", type: "text", group: "Size" },
    { key: "sizeGuide", label: "Size guide link text", type: "text", group: "Size" },
    {
      key: "sizes", label: "Sizes", type: "list", group: "Size",
      hint: "Stock: empty = in stock, a number = low stock (shows the dot and “only N left”), 0 = sold out. Preview only; your store uses variant inventory",
      itemFields: [
        { key: "size", label: "Size", type: "text" },
        { key: "stock", label: "Stock", type: "text" },
      ],
      newItem: { size: "3XL", stock: "" },
      addLabel: "Add size", max: 8,
    },
    { key: "requireSize", label: "Make shoppers pick a size", type: "toggle", group: "Size" },
    { key: "lowStockText", label: "Low-stock text", type: "text", group: "Size", hint: "Use {{count}} for the number left" },
    { key: "lowLegend", label: "Low-stock legend", type: "text", group: "Size", hint: "Explains the dot until a size is picked. Leave empty to hide" },
    { key: "sizeError", label: "No size picked message", type: "text", group: "Size" },
    { key: "buttonText", label: "Button text", type: "text", group: "Buy button" },
    { key: "selectText", label: "Before a size is picked", type: "text", group: "Buy button" },
    { key: "addedText", label: "Added text", type: "text", group: "Buy button" },
    { key: "showSticky", label: "Sticky mini bar", type: "toggle", group: "Buy button", hint: "Slides up once the button scrolls out of view" },
    { key: "deliveryLabel", label: "Delivery label", type: "text", group: "Info rows" },
    { key: "deliveryMin", label: "Delivery: fastest", type: "slider", group: "Info rows", min: 1, max: 20, step: 1, unit: "d" },
    { key: "deliveryMax", label: "Delivery: slowest", type: "slider", group: "Info rows", min: 1, max: 30, step: 1, unit: "d" },
    { key: "loyaltyText", label: "Loyalty text", type: "text", group: "Info rows", hint: "Use {{xp}} for the points earned" },
    { key: "xpRate", label: "XP per 1 currency unit", type: "text", group: "Info rows" },
    { key: "returnsText", label: "Returns text", type: "text", group: "Info rows" },
    { key: "detailsTitle", label: "Details title", type: "text", group: "Details" },
    { key: "details", label: "Details text", type: "textarea", group: "Details", hint: "Preview only. Your store shows the product description" },
    fontField("Typography"),
    fontField("Typography", "displayFont", "Display font"),
    { key: "displayCaps", label: "Uppercase display type", type: "toggle", group: "Typography" },
    { key: "radius", label: "Corner radius", type: "slider", group: "Layout", min: 0, max: 16, step: 1, unit: "px" },
    { key: "bg", label: "Background", type: "color", group: "Colors" },
    { key: "surface", label: "Photo & toggle background", type: "color", group: "Colors" },
    { key: "textColor", label: "Text & buttons", type: "color", group: "Colors" },
    { key: "accent", label: "Sale & low stock", type: "color", group: "Colors" },
    { key: "linkColor", label: "Links & XP", type: "color", group: "Colors" },
    { key: "track", label: "Borders", type: "color", group: "Colors" },
    { key: "muted", label: "Muted text", type: "color", group: "Colors" },
  ],
};
