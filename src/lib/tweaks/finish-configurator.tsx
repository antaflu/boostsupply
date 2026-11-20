"use client";

import { useId, useState, type CSSProperties } from "react";
import type { Tweak, TweakConfig } from "../types";
import { str, num, bool, list, fontStack, esc } from "../cfg";
import { fontField } from "../fields";
import { buildSchema, section, fontFaceFor } from "../liquid";
import { money, toNum } from "./product-art";

/* ============================================================
   Finish & Size Configurator
   A two-step ring configurator: large metallic finish swatches
   with a price per finish (promo finishes show was/now/save),
   size chips with a "not sure? get a sizing kit" path, a product
   photo that crossfades to the chosen finish, a total and a CTA.
   ============================================================ */

const SERIF = "Georgia, 'Times New Roman', serif";
const EASE = "cubic-bezier(.22,1,.36,1)";

const defaults: TweakConfig = {
  eyebrow: "Smart ring",
  heading: "Your health, *quietly* measured",
  subheading: "Light titanium, a week of battery and no screen to check. Pick a finish, then your fit.",
  currency: "$",
  shownIn: "Shown in",
  finishLabel: "Finish",
  finishes: [
    { name: "Silver", hex: "#c9cacb", price: "299", compare: "", image: "/mockups/ring-silver.jpg" },
    { name: "Black", hex: "#3b3936", price: "299", compare: "", image: "" },
    { name: "Brushed titanium", hex: "#9c978f", price: "349", compare: "", image: "" },
    { name: "Gold", hex: "#d6b26b", price: "299", compare: "399", image: "/mockups/ring-gold.jpg" },
    { name: "Rose", hex: "#d6a28c", price: "299", compare: "399", image: "" },
  ],
  selected: 4,
  sizeLabel: "Size",
  sizes: "6, 7, 8, 9, 10, 11, 12, 13",
  sizeNote: "Our sizes run differently from standard jewelry sizes.",
  showKit: true,
  kitToggle: "Not sure? Get a *free* sizing kit",
  kitTitle: "Free sizing kit",
  kitText: "Wear sample sizes at home for a day, then order your ring in the size that fits.",
  kitButton: "Continue with sizing kit",
  totalLabel: "Total",
  saveText: "Save",
  buttonText: "Add to cart",
  perks: "Free shipping · 30-day returns · 2-year warranty",
  finishOption: "Finish",
  sizeOption: "Size",
  bg: "#f7f1e8",
  panel: "#efe6db",
  textColor: "#1c1b1a",
  muted: "#4a4741",
  line: "#a8a5a0",
  accent: "#1c1b1a",
  accentText: "#f7f1e8",
  font: "system",
  accentFont: "serif",
  radius: 14,
};

/* ---------- colour helpers ---------- */

const parseHex = (h: string): number[] => {
  let s = String(h).trim().replace(/^#/, "");
  if (/^[0-9a-f]{3}$/i.test(s)) s = s.replace(/(.)/g, "$1$1");
  const n = /^[0-9a-f]{6}$/i.test(s) ? parseInt(s, 16) : 0xc9cacb;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

/** Mix colour a toward b (t = 0 → a, t = 1 → b). */
const mix = (a: string, b: string, t: number): string => {
  const A = parseHex(a);
  const B = parseHex(b);
  return (
    "#" +
    A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, "0")).join("")
  );
};

/** Same ratios as the color-mix() tones in the exported CSS. */
const tones = (hex: string) => ({
  shine: mix(hex, "#ffffff", 0.7),
  light: mix(hex, "#ffffff", 0.35),
  mid: mix(hex, hex, 0),
  dark: mix(hex, "#000000", 0.32),
  deep: mix(hex, "#000000", 0.55),
});

/** Hex colour + alpha byte. */
const tint = (hex: string, a: number) =>
  /^#[0-9a-f]{6}$/i.test(hex) ? hex + Math.round(a * 255).toString(16).padStart(2, "0") : hex;

const accentStack = (f: string) => (f === "serif" ? SERIF : fontStack(f));

const parseSizes = (s: string) =>
  s
    .split(/[,;|]+/)
    .map((x) => x.trim())
    .filter(Boolean);

/* ---------- the drawn ring ----------
   A ring standing on its edge, seen at three-quarters: the outer band,
   the front rim and the bore, with a transparent hole. Colours come from
   CSS variables (--bs-shine … --bs-deep), so the same SVG string is used
   in the preview and in the exported section, and the stops animate
   when the finish changes. */

const f2 = (n: number) => +n.toFixed(2);
const CX = 83;
const CY = 96;
const R = 64;
const r = 53;
const K = 0.62;
const D = 36;
const RX = f2(R * K);
const rx = f2(r * K);
const ell = (cx: number, cy: number, a: number, b: number) =>
  `M${f2(cx - a)} ${cy}A${a} ${b} 0 1 0 ${f2(cx + a)} ${cy}A${a} ${b} 0 1 0 ${f2(cx - a)} ${cy}Z`;
const SIDE = `M${CX} ${CY - R}L${CX + D} ${CY - R}A${RX} ${R} 0 0 1 ${CX + D} ${CY + R}L${CX} ${CY + R}A${RX} ${R} 0 0 1 ${CX} ${CY - R}Z`;
const FACE = ell(CX, CY, RX, R) + ell(CX, CY, rx, r);
const BORE = ell(CX, CY, rx, r);
const HOLE = ell(CX + D, CY, rx, r);

type Tone = "shine" | "light" | "mid" | "dark" | "deep";
const stops = (s: [number, Tone][]) =>
  s
    .map(
      ([o, t]) =>
        `<stop offset="${o}" style="stop-color:var(--bs-${t});transition:stop-color .7s ${EASE}"/>`,
    )
    .join("");

function ringSvg(uid: string): string {
  return `<svg viewBox="0 0 200 200" width="100%" height="100%" aria-hidden="true" style="display:block;overflow:visible">
<defs>
<linearGradient id="${uid}-side" gradientUnits="userSpaceOnUse" x1="96" y1="0" x2="158" y2="0">${stops([[0, "mid"], [0.3, "shine"], [0.5, "light"], [0.8, "dark"], [0.95, "deep"], [1, "dark"]])}</linearGradient>
<linearGradient id="${uid}-shade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".38"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".24"/></linearGradient>
<linearGradient id="${uid}-face" gradientUnits="userSpaceOnUse" x1="40" y1="32" x2="126" y2="160">${stops([[0, "light"], [0.4, "shine"], [0.72, "mid"], [1, "dark"]])}</linearGradient>
<linearGradient id="${uid}-bore" gradientUnits="userSpaceOnUse" x1="50" y1="0" x2="118" y2="0">${stops([[0, "deep"], [0.55, "dark"], [1, "mid"]])}</linearGradient>
<radialGradient id="${uid}-shadow"><stop offset="0" stop-color="#000" stop-opacity=".2"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>
<clipPath id="${uid}-clip"><path d="${BORE}"/></clipPath>
<mask id="${uid}-mask" maskUnits="userSpaceOnUse" x="0" y="0" width="200" height="200"><rect width="200" height="200" fill="#fff"/><path d="${HOLE}" fill="#000" clip-path="url(#${uid}-clip)"/></mask>
</defs>
<ellipse cx="${CX + D / 2}" cy="${CY + R + 8}" rx="64" ry="7" fill="url(#${uid}-shadow)"/>
<g mask="url(#${uid}-mask)">
<path d="${SIDE}" fill="url(#${uid}-side)"/>
<path d="${SIDE}" fill="url(#${uid}-shade)"/>
<path d="${BORE}" fill="url(#${uid}-bore)"/>
<path d="${FACE}" fill="url(#${uid}-face)" fill-rule="evenodd"/>
<path d="${FACE}" fill="none" stroke="#fff" stroke-opacity=".4" stroke-width=".6" fill-rule="evenodd"/>
</g>
</svg>`;
}

/* ---------- photos ----------
   A finish can have its own photo. A finish without one borrows the
   photo of the nearest finish that has one. On the stock silver photo
   only the ring is recoloured (its outline is traced below), so black or
   titanium still sit on the same bright stone; any other photo gets a
   light hue and brightness grade toward the finish colour. */

const STOCK_SILVER = "/mockups/ring-silver.jpg";

/** Smooth closed path through points (Catmull-Rom as cubic Béziers). */
const smooth = (pts: number[][]) => {
  const n = pts.length;
  let d = `M${pts[0][0]} ${pts[0][1]}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i + n - 1) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const p3 = pts[(i + 2) % n];
    d += `C${f2(p1[0] + (p2[0] - p0[0]) / 6)} ${f2(p1[1] + (p2[1] - p0[1]) / 6)} ${f2(p2[0] - (p3[0] - p1[0]) / 6)} ${f2(p2[1] - (p3[1] - p1[1]) / 6)} ${p2[0]} ${p2[1]}`;
  }
  return d + "Z";
};

/* The ring in the stock silver photo, in % of the square photo:
   the outer band, then the hole you see the stone through. */
const SILVER_BAND = [
  [31.6, 50], [32.2, 44], [33.3, 39], [35.1, 35.4], [38, 32.6], [43.5, 30.5], [50.9, 29.7], [56.4, 29.7],
  [61.7, 30.7], [65.2, 32.6], [67.5, 35.8], [68.6, 40], [68.9, 48], [68.5, 57.3], [67.3, 63.6], [65.4, 67.5],
  [62, 70.3], [56.6, 71.8], [50.8, 71.9], [45.9, 71], [41.2, 68.7], [36.6, 65], [33.5, 60.4], [32, 55.6],
];
const SILVER_HOLE = [
  [42.9, 50], [43.5, 43], [45.4, 37.6], [48.5, 34.9], [52, 34.7], [54.8, 36.6], [56.3, 41],
  [56.6, 50], [56, 58], [54.2, 63], [51, 65.3], [47.8, 64.9], [45.1, 61.5], [43.4, 56],
];
const SILVER_MASK = `url("data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="none"><filter id="f"><feGaussianBlur stdDeviation=".3"/></filter><path filter="url(#f)" fill-rule="evenodd" d="${smooth(SILVER_BAND)}${smooth(SILVER_HOLE)}"/></svg>`,
)}")`;
const maskStyle: CSSProperties = {
  WebkitMaskImage: SILVER_MASK,
  maskImage: SILVER_MASK,
  WebkitMaskSize: "100% 100%",
  maskSize: "100% 100%",
  WebkitMaskRepeat: "no-repeat",
  maskRepeat: "no-repeat",
};
const LUMA = "0.2126 0.7152 0.0722 0 0 0.2126 0.7152 0.0722 0 0 0.2126 0.7152 0.0722 0 0 0 0 0 1 0";

const rgb01 = (hex: string) => parseHex(hex).map((v) => v / 255);
const lum = (hex: string) => {
  const [r, g, b] = rgb01(hex);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const hsl = (hex: string) => {
  const [r, g, b] = rgb01(hex);
  const mx = Math.max(r, g, b);
  const mn = Math.min(r, g, b);
  const d = mx - mn;
  const l = (mx + mn) / 2;
  const h = !d ? 0 : mx === r ? ((g - b) / d + 6) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return { h: h * 60, s: d ? d / (1 - Math.abs(2 * l - 1)) : 0 };
};
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Colour distance that weighs hue and chroma over lightness. */
const dist = (a: string, b: string) => {
  const [ar, ag, ab] = parseHex(a);
  const [br, bg, bb] = parseHex(b);
  return Math.hypot(ar - ag - (br - bg), (ar + ag) / 2 - ab - ((br + bg) / 2 - bb), (lum(a) - lum(b)) * 128);
};

/** Whole-photo CSS grade from the photo's finish colour toward another finish. */
function grade(from: string, to: string): string {
  const A = hsl(from);
  const B = hsl(to);
  const bright = clamp(Math.sqrt(lum(to) / Math.max(0.02, lum(from))), 0.6, 1.15);
  const sat = A.s > 0.1 ? clamp(B.s / A.s, 0.55, 1.3) : 1;
  const dh = ((B.h - A.h + 540) % 360) - 180;
  const hue = A.s > 0.12 && B.s > 0.12 ? clamp(dh * 0.5, -18, 18) : 0;
  return `brightness(${bright.toFixed(2)}) saturate(${sat.toFixed(2)}) hue-rotate(${hue.toFixed(0)}deg)`;
}

/** Per-channel tone curves that map the photo's luminance onto a finish
    colour, lifting the highlights so the metal keeps its sheen. Light
    targets are pulled toward the photo's own exposure so a pale finish
    doesn't come out murky; dark ones stay dark. */
function tintTables(from: string, to: string): string[] {
  const ref = Math.max(0.05, lum(from));
  return rgb01(to).map((c) => {
    const r = c / ref;
    const k = r ** (1 - 0.5 * Math.min(1, r) ** 2);
    return Array.from({ length: 11 }, (_, i) => {
      const x = i / 10;
      const base = Math.min(1, k * x);
      const h = Math.max(0, (x - 0.62) / 0.38);
      return f2(Math.min(1, base + (0.92 - base) * h * h * 0.5));
    }).join(" ");
  });
}

type Shot = { src: string; filter?: string; tint?: string[] };

/** Wrap *words* in an italic serif accent. */
function Accent({ text, serif }: { text: string; serif: string }) {
  return (
    <>
      {text.split("*").map((p, i) =>
        i % 2 ? (
          <em key={i} className="font-normal italic" style={{ fontFamily: serif }}>
            {p}
          </em>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
}

/** Liquid version of <Accent>: split on * and italicise the odd parts. */
const accentLiquid = (expr: string, v: string) =>
  `{%- assign ${v} = ${expr} | split: '*' -%}{%- for bs_part in ${v} -%}{%- assign bs_m = forloop.index0 | modulo: 2 -%}{%- if bs_m == 1 -%}<em>{{ bs_part }}</em>{%- else -%}{{ bs_part }}{%- endif -%}{%- endfor -%}`;

/* ---------- preview ---------- */

function Preview({ config }: { config: TweakConfig }) {
  const uid = "bsfc" + useId().replace(/[^a-zA-Z0-9]/g, "");
  const cur = str(config, "currency", "$");
  const bg = str(config, "bg", "#f7f1e8");
  const panel = str(config, "panel", "#efe6db");
  const text = str(config, "textColor", "#1c1b1a");
  const muted = str(config, "muted", "#4a4741");
  const line = str(config, "line", "#a8a5a0");
  const accent = str(config, "accent", "#1c1b1a");
  const accentText = str(config, "accentText", "#f7f1e8");
  const radius = num(config, "radius", 14);
  const serif = accentStack(str(config, "accentFont", "serif"));
  const saveText = str(config, "saveText", "Save");

  const finishes = list(config, "finishes").map((f) => ({
    name: f.name ?? "",
    hex: f.hex || "#c9cacb",
    price: toNum(f.price),
    compare: toNum(f.compare),
    image: (f.image ?? "").trim(),
  }));
  /* every finish gets a photo as soon as one finish has one; with no
     photos at all the drawn ring is used */
  const photos = finishes.filter((f) => f.image);
  const shots: (Shot | null)[] = finishes.map((f) => {
    if (f.image) return { src: f.image };
    if (!photos.length) return null;
    const near = photos.reduce((a, b) => (dist(b.hex, f.hex) < dist(a.hex, f.hex) ? b : a));
    return near.image === STOCK_SILVER
      ? { src: near.image, tint: tintTables(near.hex, f.hex) }
      : { src: near.image, filter: grade(near.hex, f.hex) };
  });
  const sizes = parseSizes(str(config, "sizes"));

  /* follow the "preselected" control, but let shoppers click around */
  const initial = Math.max(0, Math.min(num(config, "selected", 4) - 1, finishes.length - 1));
  const [prevInitial, setPrevInitial] = useState(initial);
  const [sel, setSel] = useState(initial);
  if (initial !== prevInitial) {
    setPrevInitial(initial);
    setSel(initial);
  }
  const [pickedSize, setPickedSize] = useState<string | null>(null);
  const [kit, setKit] = useState(false);

  const fi = Math.max(0, Math.min(sel, finishes.length - 1));
  const fin = finishes[fi] ?? {
    name: "",
    hex: "#c9cacb",
    price: 0,
    compare: 0,
    image: "",
  };
  const hasPhoto = photos.length > 0;
  const size =
    pickedSize !== null && sizes.includes(pickedSize)
      ? pickedSize
      : (sizes[Math.floor((sizes.length - 1) / 2)] ?? "");
  const showKit = bool(config, "showKit", true);
  const kitOn = showKit && kit;
  const promo = fin.compare > fin.price + 0.005;
  const save = promo ? fin.compare - fin.price : 0;
  const t = tones(fin.hex);
  const hair = tint(line, 0.45);

  const ringVars = {
    "--bs-shine": t.shine,
    "--bs-light": t.light,
    "--bs-mid": t.mid,
    "--bs-dark": t.dark,
    "--bs-deep": t.deep,
  } as CSSProperties;

  return (
    <div
      className="@container w-full"
      style={{ background: bg, color: text, fontFamily: fontStack(str(config, "font", "system")) }}
    >
      <div className="mx-auto grid w-full max-w-[1040px] gap-5 p-4 @min-[640px]:grid-cols-[1.05fr_1fr] @min-[640px]:items-start @min-[640px]:gap-10 @min-[640px]:p-8 @min-[880px]:p-10">
        {/* Visual */}
        <div
          className="relative overflow-hidden @min-[640px]:sticky @min-[640px]:top-6"
          style={{
            background: `radial-gradient(120% 85% at 50% 32%, ${mix(panel, "#ffffff", 0.6)} 0%, ${panel} 64%)`,
            borderRadius: radius + 4,
          }}
        >
          <div className="relative grid aspect-[5/4] place-items-center @min-[640px]:aspect-[4/5]">
            {hasPhoto ? (
              <>
                <svg width="0" height="0" aria-hidden className="absolute">
                  {shots.map(
                    (s, i) =>
                      s?.tint && (
                        <filter key={i} id={`${uid}-tint${i}`} colorInterpolationFilters="sRGB">
                          <feColorMatrix type="matrix" values={LUMA} />
                          <feComponentTransfer>
                            <feFuncR type="table" tableValues={s.tint[0]} />
                            <feFuncG type="table" tableValues={s.tint[1]} />
                            <feFuncB type="table" tableValues={s.tint[2]} />
                          </feComponentTransfer>
                        </filter>
                      ),
                  )}
                </svg>
                {shots.map(
                  (s, i) =>
                    s && (
                      <div
                        key={i}
                        aria-hidden={i !== fi}
                        className="absolute inset-0 transition-opacity duration-700"
                        style={{ opacity: i === fi ? 1 : 0, transitionTimingFunction: EASE }}
                      >
                        {/* a square that covers the stage like object-cover (sitting a
                            little high on wide stages so the caption clears the ring),
                            so the traced ring outline lines up at every aspect ratio */}
                        <div className="absolute left-1/2 top-[42%] aspect-square w-full -translate-x-1/2 -translate-y-1/2 @min-[640px]:top-1/2 @min-[640px]:h-full @min-[640px]:w-auto">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={s.src}
                            alt={i === fi ? fin.name : ""}
                            loading="lazy"
                            decoding="async"
                            className="absolute inset-0 h-full w-full object-cover"
                            style={s.filter ? { filter: s.filter } : undefined}
                          />
                          {s.tint && (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                              src={s.src}
                              alt=""
                              loading="lazy"
                              decoding="async"
                              className="absolute inset-0 h-full w-full object-cover"
                              style={{ ...maskStyle, filter: `url(#${uid}-tint${i})` }}
                            />
                          )}
                        </div>
                      </div>
                    ),
                )}
              </>
            ) : (
              <div
                className="aspect-square w-[74%] max-w-[330px] translate-x-[-3%]"
                style={ringVars}
                dangerouslySetInnerHTML={{ __html: ringSvg(uid) }}
              />
            )}
          </div>
          {promo && (
            <span
              key={`save-${fin.name}`}
              className="bs-swap absolute left-3.5 top-3.5 rounded-full px-2.5 py-[5px] text-[11.5px] font-medium tabular-nums"
              style={{ background: text, color: bg }}
            >
              {saveText} {money(save, cur)}
            </span>
          )}
          <p className="absolute inset-x-0 bottom-3.5 flex justify-center px-3.5">
            <span
              className="flex max-w-full items-baseline gap-1.5 rounded-full text-[12px]"
              style={
                hasPhoto
                  ? {
                      color: muted,
                      padding: "5px 14px 6px",
                      background: tint(bg, 0.8),
                      backdropFilter: "blur(12px) saturate(1.4)",
                      WebkitBackdropFilter: "blur(12px) saturate(1.4)",
                      boxShadow: "0 1px 2px rgba(0,0,0,.08)",
                    }
                  : { color: muted }
              }
            >
              {str(config, "shownIn")}
              <em
                key={fin.name}
                className="bs-swap inline-block truncate text-[16px] font-normal italic"
                style={{ fontFamily: serif, color: text }}
              >
                {fin.name}
              </em>
            </span>
          </p>
        </div>

        {/* Configurator */}
        <div className="flex min-w-0 flex-col @min-[640px]:pt-2">
          {str(config, "eyebrow") && (
            <p className="text-[12.5px]" style={{ color: muted }}>
              {str(config, "eyebrow")}
            </p>
          )}
          <h3 className="mt-1 text-[27px] font-normal leading-[1.08] tracking-[-0.025em] @min-[640px]:text-[34px]">
            <Accent text={str(config, "heading")} serif={serif} />
          </h3>
          {str(config, "subheading") && (
            <p className="mt-2.5 text-[13.5px] leading-relaxed" style={{ color: muted }}>
              {str(config, "subheading")}
            </p>
          )}

          {/* Step 1 — finish */}
          <div className="mt-6 border-t pt-5" style={{ borderColor: hair }}>
            <div className="flex items-baseline justify-between gap-3 text-[14px]">
              <p className="min-w-0 truncate">
                <span className="mr-2 inline-block w-3 tabular-nums" style={{ color: line }}>
                  1
                </span>
                {str(config, "finishLabel", "Finish")}
                <span style={{ color: muted }}> · {fin.name}</span>
              </p>
              {promo && (
                <span key={fin.name} className="bs-swap shrink-0 text-[12.5px] tabular-nums" style={{ color: muted }}>
                  <s className="mr-1.5">{money(fin.compare, cur)}</s>
                  <span style={{ color: text }}>{money(fin.price, cur)}</span>
                </span>
              )}
            </div>
            <div
              role="radiogroup"
              aria-label={str(config, "finishLabel", "Finish")}
              className="mt-4 grid grid-cols-[repeat(auto-fill,minmax(58px,1fr))] gap-x-1.5 gap-y-4"
            >
              {finishes.map((f, i) => {
                const on = f === fin;
                const ft = tones(f.hex);
                const isPromo = f.compare > f.price + 0.005;
                return (
                  <button
                    key={i}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    aria-label={f.name}
                    onClick={() => setSel(i)}
                    className="group flex min-w-0 flex-col items-center text-center"
                  >
                    <span
                      className="relative block h-[50px] w-[50px] rounded-full transition-[box-shadow,scale] duration-500 group-active:scale-95"
                      style={{
                        transitionTimingFunction: EASE,
                        boxShadow: on
                          ? `0 0 0 2px ${bg}, 0 0 0 3.5px ${text}`
                          : `0 0 0 1px ${tint(line, 0.35)}`,
                      }}
                    >
                      <span
                        className="absolute inset-0 rounded-full"
                        style={{
                          background: `radial-gradient(circle at 34% 28%, ${ft.shine} 0%, ${ft.light} 24%, ${f.hex} 56%, ${ft.dark} 100%)`,
                          boxShadow: "inset 0 -2px 4px rgba(0,0,0,.18), inset 0 1px 1px rgba(255,255,255,.5)",
                        }}
                      />
                    </span>
                    <span className="mt-2 line-clamp-2 text-[11.5px] leading-[1.25]" style={{ color: on ? text : muted }}>
                      {f.name}
                    </span>
                    <span className="mt-0.5 text-[11.5px] tabular-nums" style={{ color: on ? text : muted }}>
                      {money(f.price, cur)}
                    </span>
                    {isPromo && (
                      <s className="text-[10.5px] tabular-nums" style={{ color: muted, opacity: 0.7 }}>
                        {money(f.compare, cur)}
                      </s>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 2 — size */}
          <div className="mt-6 border-t pt-5" style={{ borderColor: hair }}>
            <p className="min-w-0 truncate text-[14px]">
              <span className="mr-2 inline-block w-3 tabular-nums" style={{ color: line }}>
                2
              </span>
              {str(config, "sizeLabel", "Size")}
              <span key={kitOn ? "kit" : size} className="bs-swap inline-block whitespace-pre" style={{ color: muted }}>
                {" · "}
                {kitOn ? str(config, "kitTitle") : size}
              </span>
            </p>

            <div className="mt-4 grid">
              <div
                role="radiogroup"
                aria-label={str(config, "sizeLabel", "Size")}
                aria-hidden={kitOn}
                className="grid grid-cols-[repeat(auto-fill,minmax(46px,1fr))] gap-1.5 transition-[opacity,transform] duration-500 [grid-area:1/1]"
                style={{
                  transitionTimingFunction: EASE,
                  opacity: kitOn ? 0 : 1,
                  transform: kitOn ? "translateY(-6px)" : "none",
                  pointerEvents: kitOn ? "none" : undefined,
                }}
              >
                {sizes.map((s) => {
                  const on = s === size;
                  return (
                    <button
                      key={s}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      tabIndex={kitOn ? -1 : 0}
                      onClick={() => setPickedSize(s)}
                      className="h-11 text-[14px] tabular-nums transition-[background-color,color,box-shadow,scale] duration-300 active:scale-[0.97]"
                      style={{
                        borderRadius: Math.max(6, radius - 4),
                        background: on ? text : "transparent",
                        color: on ? bg : text,
                        boxShadow: on ? `0 0 0 1px ${text}` : `inset 0 0 0 1px ${tint(line, 0.55)}`,
                      }}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>

              {showKit && (
                <div
                  aria-hidden={!kitOn}
                  className="flex items-center gap-4 p-4 transition-[opacity,transform] duration-500 [grid-area:1/1] self-start"
                  style={{
                    transitionTimingFunction: EASE,
                    background: panel,
                    borderRadius: radius,
                    opacity: kitOn ? 1 : 0,
                    transform: kitOn ? "none" : "translateY(6px)",
                    pointerEvents: kitOn ? undefined : "none",
                  }}
                >
                  <span aria-hidden className="flex shrink-0 items-end gap-[3px]">
                    {[13, 15, 17, 19, 21].map((d) => (
                      <span
                        key={d}
                        className="block rounded-full"
                        style={{
                          width: d,
                          height: d,
                          border: `3px solid ${mix(line, "#000000", 0.25)}`,
                          boxShadow: "inset 0 1px 1px rgba(0,0,0,.15)",
                        }}
                      />
                    ))}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[14px]">{str(config, "kitTitle")}</span>
                    <span className="mt-0.5 block text-[12.5px] leading-snug" style={{ color: muted }}>
                      {str(config, "kitText")}
                    </span>
                  </span>
                </div>
              )}
            </div>

            {str(config, "sizeNote") && (
              <p className="mt-3 text-[12px] leading-snug" style={{ color: muted }}>
                {str(config, "sizeNote")}
              </p>
            )}

            {showKit && (
              <button
                type="button"
                role="switch"
                aria-checked={kit}
                onClick={() => setKit((k) => !k)}
                className="mt-4 flex items-center gap-2.5 text-left text-[13.5px]"
              >
                <span
                  className="relative h-[22px] w-[38px] shrink-0 rounded-full transition-colors duration-300"
                  style={{ background: kit ? text : tint(line, 0.6) }}
                >
                  <span
                    className="absolute left-[3px] top-[3px] h-4 w-4 rounded-full shadow-[0_1px_3px_rgba(0,0,0,0.25)] transition-transform duration-500"
                    style={{
                      background: bg,
                      transitionTimingFunction: EASE,
                      transform: kit ? "translateX(16px)" : "none",
                    }}
                  />
                </span>
                <span>
                  <Accent text={str(config, "kitToggle")} serif={serif} />
                </span>
              </button>
            )}
          </div>

          {/* Summary */}
          <div className="mt-6 border-t pt-5" style={{ borderColor: hair }}>
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-[14px]">{str(config, "totalLabel", "Total")}</span>
              <span key={fin.name} className="bs-swap text-[18px] tabular-nums tracking-[-0.01em]">
                {promo && (
                  <s className="mr-2 text-[14px]" style={{ color: muted }}>
                    {money(fin.compare, cur)}
                  </s>
                )}
                {money(fin.price, cur)}
              </span>
            </div>
            <button
              type="button"
              className="mt-4 flex h-[52px] w-full items-center justify-center rounded-full text-[15px] transition-[filter,scale] duration-200 hover:brightness-125 active:scale-[0.99]"
              style={{ background: accent, color: accentText }}
            >
              <span key={kitOn ? "kit" : `add-${fin.name}`} className="bs-swap tabular-nums">
                {kitOn
                  ? str(config, "kitButton")
                  : `${str(config, "buttonText", "Add to cart")} — ${money(fin.price, cur)}`}
              </span>
            </button>
            {str(config, "perks") && (
              <p className="mt-3 text-center text-[11.5px]" style={{ color: muted }}>
                {str(config, "perks")}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Liquid ---------- */

type TextKind = "text" | "textarea";
const txt = (type: TextKind, id: string, label: string, value: string, info?: string) => ({
  type,
  id,
  label,
  ...(value ? { default: value } : {}),
  ...(info ? { info } : {}),
});

function generateLiquid(config: TweakConfig): string {
  const body = fontFaceFor(str(config, "font", "system"));
  const accentFont = str(config, "accentFont", "serif");
  const acc = fontFaceFor(accentFont);
  const face = [body.face, accentFont === str(config, "font") ? "" : acc.face].filter(Boolean).join("\n");
  const S = ".bs-fc-{{ section.id }}";
  const r = "{{ section.settings.radius }}px";

  const style = `<style>
${face ? face + "\n" : ""}  ${S} { container-type: inline-size; background: {{ section.settings.bg }}; color: {{ section.settings.text_color }}; font-family: ${body.family}; }
  ${S} * { box-sizing: border-box; }
  ${S} p, ${S} h2 { margin: 0; }
  ${S} em { font-family: ${acc.family}; font-style: italic; font-weight: 400; }
  ${S} s { opacity: .6; }
  ${S} .bs-wrap { max-width: 1040px; margin: 0 auto; padding: 16px; display: grid; gap: 20px; }
  ${S} .bs-tones { --bs-mid: var(--bs-c); --bs-shine: color-mix(in srgb, var(--bs-c) 30%, #fff); --bs-light: color-mix(in srgb, var(--bs-c) 65%, #fff);
    --bs-dark: color-mix(in srgb, var(--bs-c) 68%, #000); --bs-deep: color-mix(in srgb, var(--bs-c) 45%, #000); }
  ${S} .bs-vis { position: relative; overflow: hidden; border-radius: {{ section.settings.radius | plus: 4 }}px;
    background: radial-gradient(120% 85% at 50% 32%, color-mix(in srgb, {{ section.settings.panel }} 40%, #fff) 0%, {{ section.settings.panel }} 64%); }
  ${S} .bs-stage { aspect-ratio: 5 / 4; display: grid; place-items: center; }
  ${S} .bs-ring { width: 74%; max-width: 330px; aspect-ratio: 1; transform: translateX(-3%); }
  ${S} .bs-img { width: 100%; height: 100%; object-fit: cover; display: block; transition: opacity .45s cubic-bezier(.22,1,.36,1); }
  ${S} .bs-badge { position: absolute; left: 14px; top: 14px; padding: 5px 10px; border-radius: 99px; font-size: 11.5px; font-weight: 500;
    background: {{ section.settings.text_color }}; color: {{ section.settings.bg }}; }
  ${S} .bs-badge[hidden] { display: none; }
  ${S} .bs-shown { position: absolute; left: 0; right: 0; bottom: 14px; display: flex; align-items: baseline; justify-content: center; gap: 6px;
    font-size: 12px; color: {{ section.settings.muted }}; }
  ${S} .bs-shown em { font-size: 16px; color: {{ section.settings.text_color }}; }
  ${S} .is-photo .bs-shown { left: 50%; right: auto; transform: translateX(-50%); width: max-content; max-width: calc(100% - 28px); padding: 5px 14px 6px; border-radius: 99px;
    background: color-mix(in srgb, {{ section.settings.bg }} 80%, transparent); -webkit-backdrop-filter: blur(12px) saturate(1.4); backdrop-filter: blur(12px) saturate(1.4);
    box-shadow: 0 1px 2px rgba(0,0,0,.08); }
  ${S} .bs-eyebrow { font-size: 12.5px; color: {{ section.settings.muted }}; }
  ${S} .bs-h { margin-top: 4px; font-family: inherit; font-size: 27px; font-weight: 400; line-height: 1.08; letter-spacing: -.025em; text-transform: none; color: inherit; }
  ${S} .bs-sub { margin-top: 10px; font-size: 13.5px; line-height: 1.6; color: {{ section.settings.muted }}; }
  ${S} .bs-step { margin-top: 24px; padding-top: 20px; border-top: 1px solid color-mix(in srgb, {{ section.settings.line }} 45%, transparent); }
  ${S} .bs-row { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; font-size: 14px; }
  ${S} .bs-n { display: inline-block; width: 12px; margin-right: 8px; color: {{ section.settings.line }}; }
  ${S} .bs-val, ${S} .bs-note, ${S} .bs-perks { color: {{ section.settings.muted }}; }
  ${S} .bs-fprice { font-size: 12.5px; color: {{ section.settings.muted }}; }
  ${S} .bs-sw { margin-top: 16px; display: grid; grid-template-columns: repeat(auto-fill, minmax(58px, 1fr)); gap: 16px 6px; }
  ${S} .bs-swo { display: flex; flex-direction: column; align-items: center; text-align: center; cursor: pointer; min-width: 0; color: {{ section.settings.muted }}; }
  ${S} .bs-swo input, ${S} .bs-chip input, ${S} .bs-kit-tg input { position: absolute; opacity: 0; pointer-events: none; }
  ${S} .bs-swd { position: relative; width: 50px; height: 50px; border-radius: 99px;
    box-shadow: 0 0 0 1px color-mix(in srgb, {{ section.settings.line }} 35%, transparent);
    transition: box-shadow .5s cubic-bezier(.22,1,.36,1), transform .3s; }
  ${S} .bs-swd::after { content: ""; position: absolute; inset: 0; border-radius: 99px;
    background: radial-gradient(circle at 34% 28%, var(--bs-shine) 0%, var(--bs-light) 24%, var(--bs-c) 56%, var(--bs-dark) 100%);
    box-shadow: inset 0 -2px 4px rgba(0,0,0,.18), inset 0 1px 1px rgba(255,255,255,.5); }
  ${S} .bs-swo:active .bs-swd { transform: scale(.95); }
  ${S} .bs-swo:has(input:checked) { color: {{ section.settings.text_color }}; }
  ${S} .bs-swo:has(input:checked) .bs-swd { box-shadow: 0 0 0 2px {{ section.settings.bg }}, 0 0 0 3.5px {{ section.settings.text_color }}; }
  ${S} .bs-swo:has(input:focus-visible) .bs-swd { outline: 2px solid {{ section.settings.text_color }}; outline-offset: 5px; }
  ${S} .bs-swo.is-out .bs-swd { opacity: .45; }
  ${S} .bs-swn { margin-top: 8px; font-size: 11.5px; line-height: 1.25; }
  ${S} .bs-swp { margin-top: 2px; font-size: 11.5px; }
  ${S} .bs-swc { font-size: 10.5px; color: {{ section.settings.muted }}; opacity: .7; }
  ${S} .bs-pick { margin-top: 16px; display: grid; }
  ${S} .bs-pick > * { grid-area: 1 / 1; transition: opacity .5s cubic-bezier(.22,1,.36,1), transform .5s cubic-bezier(.22,1,.36,1), visibility .5s; }
  ${S} .bs-sizes { display: grid; grid-template-columns: repeat(auto-fill, minmax(46px, 1fr)); gap: 6px; }
  ${S} .bs-chip { position: relative; display: grid; place-items: center; height: 44px; cursor: pointer; font-size: 14px;
    border-radius: {{ section.settings.radius | minus: 4 | at_least: 6 }}px; box-shadow: inset 0 0 0 1px color-mix(in srgb, {{ section.settings.line }} 55%, transparent);
    transition: background-color .3s, color .3s, box-shadow .3s; }
  ${S} .bs-chip:has(input:checked) { background: {{ section.settings.text_color }}; color: {{ section.settings.bg }}; box-shadow: 0 0 0 1px {{ section.settings.text_color }}; }
  ${S} .bs-chip:has(input:focus-visible) { outline: 2px solid {{ section.settings.text_color }}; outline-offset: 2px; }
  ${S} .bs-chip.is-out { opacity: .4; text-decoration: line-through; }
  ${S} .bs-kit { align-self: start; display: flex; align-items: center; gap: 16px; padding: 16px; background: {{ section.settings.panel }}; border-radius: ${r};
    opacity: 0; transform: translateY(6px); pointer-events: none; visibility: hidden; }
  ${S} .bs-sizers { display: flex; align-items: flex-end; gap: 3px; flex-shrink: 0; }
  ${S} .bs-sizers i { display: block; border-radius: 99px; border: 3px solid color-mix(in srgb, {{ section.settings.line }} 75%, #000); box-shadow: inset 0 1px 1px rgba(0,0,0,.15); }
  ${S} .bs-kit-h { font-size: 14px; }
  ${S} .bs-kit-x { margin-top: 2px; font-size: 12.5px; line-height: 1.4; color: {{ section.settings.muted }}; }
  ${S} .bs-note { margin-top: 12px; font-size: 12px; line-height: 1.4; }
  ${S} .bs-kit-tg { position: relative; margin-top: 16px; display: inline-flex; align-items: center; gap: 10px; cursor: pointer; font-size: 13.5px; }
  ${S} .bs-switch { position: relative; width: 38px; height: 22px; flex-shrink: 0; border-radius: 99px;
    background: color-mix(in srgb, {{ section.settings.line }} 60%, transparent); transition: background .3s; }
  ${S} .bs-switch::after { content: ""; position: absolute; left: 3px; top: 3px; width: 16px; height: 16px; border-radius: 99px;
    background: {{ section.settings.bg }}; box-shadow: 0 1px 3px rgba(0,0,0,.25); transition: transform .5s cubic-bezier(.22,1,.36,1); }
  ${S} .bs-kit-tg:has(input:focus-visible) .bs-switch { outline: 2px solid {{ section.settings.text_color }}; outline-offset: 2px; }
  ${S}:has([data-kit]:checked) .bs-switch { background: {{ section.settings.text_color }}; }
  ${S}:has([data-kit]:checked) .bs-switch::after { transform: translateX(16px); }
  ${S}:has([data-kit]:checked) .bs-sizes { opacity: 0; transform: translateY(-6px); pointer-events: none; visibility: hidden; }
  ${S}:has([data-kit]:checked) .bs-kit { opacity: 1; transform: none; pointer-events: auto; visibility: visible; }
  ${S} .bs-total { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; font-size: 14px; }
  ${S} .bs-total-p { font-size: 18px; letter-spacing: -.01em; }
  ${S} .bs-total-p s { margin-right: 8px; font-size: 14px; }
  ${S} .bs-atc, ${S} .bs-kit-cta { margin-top: 16px; width: 100%; height: 52px; border: 0; border-radius: 99px; cursor: pointer; font: inherit; font-size: 15px;
    display: flex; align-items: center; justify-content: center; gap: 8px; text-decoration: none;
    background: {{ section.settings.accent }}; color: {{ section.settings.accent_text }}; transition: filter .2s, transform .2s; }
  ${S} .bs-atc:hover, ${S} .bs-kit-cta:hover { filter: brightness(1.25); }
  ${S} .bs-atc:active, ${S} .bs-kit-cta:active { transform: scale(.99); }
  ${S} .bs-atc:disabled { opacity: .45; cursor: not-allowed; }
  ${S} .bs-kit-cta { display: none; }
  ${S}:has([data-kit]:checked) .bs-atc { display: none; }
  ${S}:has([data-kit]:checked) .bs-kit-cta { display: flex; }
  ${S} .bs-perks { margin-top: 12px; text-align: center; font-size: 11.5px; }
  ${S} .bs-form { margin: 0; }
  @container (min-width: 640px) {
    ${S} .bs-wrap { grid-template-columns: 1.05fr 1fr; align-items: start; gap: 40px; padding: 32px; }
    ${S} .bs-vis { position: sticky; top: 24px; }
    ${S} .bs-stage { aspect-ratio: 4 / 5; }
    ${S} .bs-cfg { padding-top: 8px; }
    ${S} .bs-h { font-size: 34px; }
  }
  @container (min-width: 880px) { ${S} .bs-wrap { padding: 40px; } }
  @media (prefers-reduced-motion: reduce) { ${S} * { transition-duration: 1ms !important; } }
</style>`;

  const markup = `{%- comment -%}
  Finish & Size Configurator by boost.supply. Add it to your product template.
  Setup:
  - Finishes and sizes come from your product options. Set "Finish option name"
    and "Size option name" to the exact option names on your product.
  - Add one "Finish swatch" block per finish to give it a swatch colour. The block
    value must match the option value (for example "Brushed titanium").
  - Promo pricing per finish comes from each variant's compare-at price.
  - Product visual: the photo comes from your variant images. Give each finish
    variant its own image and the photo changes with the finish. Without
    product images (or with "Drawn ring" picked) a drawn ring recolours instead.
  - Sizing kit: paste the link to your sizing-kit product or page.
{%- endcomment -%}
{%- if product != blank -%}
{%- assign bs_v = product.selected_or_first_available_variant -%}
{%- assign bs_fin_key = section.settings.finish_option | downcase | strip -%}
{%- assign bs_size_key = section.settings.size_option | downcase | strip -%}
{%- assign bs_fin = nil -%}
{%- assign bs_size = nil -%}
{%- for bs_o in product.options_with_values -%}
  {%- assign bs_on = bs_o.name | downcase | strip -%}
  {%- if bs_on == bs_fin_key -%}{%- assign bs_fin = bs_o -%}{%- endif -%}
  {%- if bs_on == bs_size_key -%}{%- assign bs_size = bs_o -%}{%- endif -%}
{%- endfor -%}
{%- assign bs_fi = -1 -%}
{%- assign bs_si = -1 -%}
{%- assign bs_cur_fin = '' -%}
{%- assign bs_cur_size = '' -%}
{%- if bs_fin -%}{%- assign bs_fi = bs_fin.position | minus: 1 -%}{%- assign bs_cur_fin = bs_v.options[bs_fi] -%}{%- endif -%}
{%- if bs_size -%}{%- assign bs_si = bs_size.position | minus: 1 -%}{%- assign bs_cur_size = bs_v.options[bs_si] -%}{%- endif -%}
{%- assign bs_cur_h = bs_cur_fin | handleize -%}
{%- assign bs_cur_col = '#c9cacb' -%}
{%- for block in section.blocks -%}
  {%- assign bs_bh = block.settings.value | handleize -%}
  {%- if bs_bh == bs_cur_h -%}{%- assign bs_cur_col = block.settings.color -%}{%- endif -%}
{%- endfor -%}
{%- assign bs_kit_url = section.settings.kit_url | default: routes.all_products_collection_url -%}
{%- assign bs_photo = false -%}
{%- if section.settings.visual == 'image' and product.featured_media != blank -%}{%- assign bs_photo = true -%}{%- endif -%}
<div class="bs-fc-{{ section.id }}" id="bs-fc-{{ section.id }}" data-fi="{{ bs_fi }}" data-si="{{ bs_si }}">
  <div class="bs-wrap">
    <div class="bs-vis{% if bs_photo %} is-photo{% endif %}">
      <div class="bs-stage">
        {%- if bs_photo -%}
          {%- assign bs_media = bs_v.featured_media | default: product.featured_media -%}
          {{ bs_media | image_url: width: 1200 | image_tag: class: 'bs-img', alt: product.title, loading: 'eager' }}
        {%- else -%}
          <div class="bs-ring bs-tones" data-ring style="--bs-c: {{ bs_cur_col }};">
            ${ringSvg("bsfc{{ section.id }}").replace(/\n/g, "\n            ")}
          </div>
        {%- endif -%}
      </div>
      <span class="bs-badge" data-badge{% unless bs_v.compare_at_price > bs_v.price %} hidden{% endunless %}>
        {%- if bs_v.compare_at_price > bs_v.price -%}{{ section.settings.save_text }} {{ bs_v.compare_at_price | minus: bs_v.price | money_without_trailing_zeros }}{%- endif -%}
      </span>
      {%- if bs_fin -%}
        <p class="bs-shown">{{ section.settings.shown_in }} <em data-fin-name>{{ bs_cur_fin }}</em></p>
      {%- endif -%}
    </div>

    <div class="bs-cfg">
      {%- if section.settings.eyebrow != blank -%}<p class="bs-eyebrow">{{ section.settings.eyebrow }}</p>{%- endif -%}
      <h2 class="bs-h">${accentLiquid("section.settings.heading", "bs_hp")}</h2>
      {%- if section.settings.subheading != blank -%}<p class="bs-sub">{{ section.settings.subheading }}</p>{%- endif -%}

      {%- if bs_fin -%}
        <div class="bs-step">
          <div class="bs-row">
            <p><span class="bs-n">1</span>{{ section.settings.finish_label }} <span class="bs-val">· <span data-fin-name>{{ bs_cur_fin }}</span></span></p>
            <span class="bs-fprice" data-fin-price></span>
          </div>
          <div class="bs-sw" role="radiogroup" aria-label="{{ section.settings.finish_label | escape }}">
            {%- for bs_val in bs_fin.values -%}
              {%- capture bs_name -%}{{ bs_val }}{%- endcapture -%}
              {%- assign bs_h = bs_name | handleize -%}
              {%- assign bs_col = '#c9cacb' -%}
              {%- assign bs_blk = nil -%}
              {%- for block in section.blocks -%}
                {%- assign bs_bh = block.settings.value | handleize -%}
                {%- if bs_bh == bs_h -%}{%- assign bs_col = block.settings.color -%}{%- assign bs_blk = block -%}{%- endif -%}
              {%- endfor -%}
              {%- assign bs_fp = 999999999 -%}
              {%- assign bs_fc = 0 -%}
              {%- assign bs_av = false -%}
              {%- for bs_var in product.variants -%}
                {%- if bs_var.options[bs_fi] == bs_name -%}
                  {%- if bs_var.price < bs_fp -%}{%- assign bs_fp = bs_var.price -%}{%- assign bs_fc = bs_var.compare_at_price | default: 0 -%}{%- endif -%}
                  {%- if bs_var.available -%}{%- assign bs_av = true -%}{%- endif -%}
                {%- endif -%}
              {%- endfor -%}
              <label class="bs-swo{% unless bs_av %} is-out{% endunless %}"{% if bs_blk %} {{ bs_blk.shopify_attributes }}{% endif %}>
                <input type="radio" name="bs-fin-{{ section.id }}" value="{{ bs_name | escape }}" data-fin data-color="{{ bs_col }}"{% if bs_name == bs_cur_fin %} checked{% endif %}>
                <span class="bs-swd bs-tones" style="--bs-c: {{ bs_col }};" aria-hidden="true"></span>
                <span class="bs-swn">{{ bs_name }}</span>
                <span class="bs-swp">{{ bs_fp | money_without_trailing_zeros }}</span>
                {%- if bs_fc > bs_fp -%}<s class="bs-swc">{{ bs_fc | money_without_trailing_zeros }}</s>{%- endif -%}
              </label>
            {%- endfor -%}
          </div>
        </div>
      {%- endif -%}

      {%- if bs_size -%}
        <div class="bs-step">
          <div class="bs-row">
            <p><span class="bs-n">{% if bs_fin %}2{% else %}1{% endif %}</span>{{ section.settings.size_label }} <span class="bs-val">· <span data-size-name>{{ bs_cur_size }}</span></span></p>
          </div>
          <div class="bs-pick">
            <div class="bs-sizes" role="radiogroup" aria-label="{{ section.settings.size_label | escape }}">
              {%- for bs_val in bs_size.values -%}
                {%- capture bs_name -%}{{ bs_val }}{%- endcapture -%}
                <label class="bs-chip">
                  <input type="radio" name="bs-size-{{ section.id }}" value="{{ bs_name | escape }}" data-size{% if bs_name == bs_cur_size %} checked{% endif %}>
                  <span>{{ bs_name }}</span>
                </label>
              {%- endfor -%}
            </div>
            {%- if section.settings.show_kit -%}
              <div class="bs-kit">
                <span class="bs-sizers" aria-hidden="true">
                  {%- for bs_d in (13..21) -%}{%- assign bs_odd = bs_d | modulo: 2 -%}{%- if bs_odd == 1 -%}<i style="width: {{ bs_d }}px; height: {{ bs_d }}px;"></i>{%- endif -%}{%- endfor -%}
                </span>
                <span>
                  <span class="bs-kit-h" style="display:block">{{ section.settings.kit_title }}</span>
                  <span class="bs-kit-x" style="display:block">{{ section.settings.kit_text }}</span>
                </span>
              </div>
            {%- endif -%}
          </div>
          {%- if section.settings.size_note != blank -%}<p class="bs-note">{{ section.settings.size_note }}</p>{%- endif -%}
          {%- if section.settings.show_kit -%}
            <label class="bs-kit-tg">
              <input type="checkbox" data-kit role="switch">
              <span class="bs-switch" aria-hidden="true"></span>
              <span>${accentLiquid("section.settings.kit_toggle", "bs_kp")}</span>
            </label>
          {%- endif -%}
        </div>
      {%- endif -%}

      <div class="bs-step">
        {%- form 'product', product, class: 'bs-form' -%}
          <input type="hidden" name="id" value="{{ bs_v.id }}" data-id>
          <div class="bs-total">
            <span>{{ section.settings.total_label }}</span>
            <span class="bs-total-p">{%- if bs_v.compare_at_price > bs_v.price -%}<s data-cmp>{{ bs_v.compare_at_price | money }}</s>{%- else -%}<s data-cmp></s>{%- endif -%}<span data-price>{{ bs_v.price | money }}</span></span>
          </div>
          <button type="submit" name="add" class="bs-atc" data-atc{% unless bs_v.available %} disabled{% endunless %}>
            <span data-atc-label>{%- if bs_v.available -%}{{ section.settings.button_text }}{%- else -%}{{ section.settings.sold_out_text }}{%- endif -%}</span>
            <span aria-hidden="true">—</span>
            <span data-atc-price>{{ bs_v.price | money }}</span>
          </button>
          {%- if section.settings.show_kit and bs_size -%}
            <a class="bs-kit-cta" href="{{ bs_kit_url }}">{{ section.settings.kit_button }}</a>
          {%- endif -%}
        {%- endform -%}
        {%- if section.settings.perks != blank -%}<p class="bs-perks">{{ section.settings.perks }}</p>{%- endif -%}
      </div>
    </div>
  </div>
  <script type="application/json" data-variants>{{ product.variants | json }}</script>
</div>
<script>
  (function () {
    var root = document.getElementById('bs-fc-{{ section.id }}');
    if (!root) return;
    var variants = [];
    try { variants = JSON.parse(root.querySelector('[data-variants]').textContent); } catch (e) { return; }
    var fi = parseInt(root.dataset.fi, 10), si = parseInt(root.dataset.si, 10);
    var T = {
      add: {{ section.settings.button_text | json }},
      out: {{ section.settings.sold_out_text | json }},
      none: {{ section.settings.unavailable_text | json }},
      save: {{ section.settings.save_text | json }}
    };
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
    function $(sel) { return root.querySelector(sel); }
    function all(sel) { return Array.prototype.slice.call(root.querySelectorAll(sel)); }
    function val(sel) { var el = $(sel + ':checked'); return el ? el.value : null; }
    function fits(v, f, s) {
      return (fi < 0 || v.options[fi] === f) && (si < 0 || s === null || v.options[si] === s);
    }
    function update() {
      var f = val('[data-fin]'), s = val('[data-size]');
      var fin = $('[data-fin]:checked'), ring = $('[data-ring]');
      if (fin && ring) ring.style.setProperty('--bs-c', fin.dataset.color);
      all('[data-fin-name]').forEach(function (el) { el.textContent = f || ''; });
      var sn = $('[data-size-name]');
      if (sn) sn.textContent = s || '';
      all('[data-size]').forEach(function (el) {
        var ok = variants.some(function (v) { return fits(v, f, el.value) && v.available; });
        el.parentNode.classList.toggle('is-out', !ok);
      });
      var match = null;
      for (var i = 0; i < variants.length; i++) {
        if (fits(variants[i], f, s)) { match = variants[i]; break; }
      }
      var atc = $('[data-atc]'), label = $('[data-atc-label]');
      var promo = match && match.compare_at_price > match.price;
      var save = promo ? T.save + ' ' + money(match.compare_at_price - match.price, true) : '';
      var badge = $('[data-badge]');
      if (badge) { badge.textContent = save; badge.hidden = !promo; }
      var fp = $('[data-fin-price]');
      if (fp) fp.textContent = save;
      if (!match) {
        atc.disabled = true;
        label.textContent = T.none;
        return;
      }
      $('[data-id]').value = match.id;
      $('[data-price]').textContent = money(match.price);
      $('[data-atc-price]').textContent = money(match.price);
      $('[data-cmp]').textContent = promo ? money(match.compare_at_price) : '';
      atc.disabled = !match.available;
      label.textContent = match.available ? T.add : T.out;
      var img = $('.bs-img');
      if (img && match.featured_image && match.featured_image.src) {
        var src = match.featured_image.src;
        var next = src + (src.indexOf('?') > -1 ? '&' : '?') + 'width=1200';
        if (img.getAttribute('src') !== next) {
          /* soft crossfade: dip, swap, fade back in once the new photo loads */
          img.style.opacity = '.35';
          img.onload = function () { img.style.opacity = ''; };
          img.removeAttribute('srcset');
          img.src = next;
        }
      }
      if (window.history && window.URL) {
        var u = new URL(window.location.href);
        u.searchParams.set('variant', match.id);
        window.history.replaceState(window.history.state, '', u.toString());
      }
    }
    all('[data-fin], [data-size]').forEach(function (el) { el.addEventListener('change', update); });
    update();
  })();
</script>
{%- else -%}
<p style="padding:24px;text-align:center;opacity:.6">Add this section to a product template.</p>
{%- endif -%}`;

  const finishes = list(config, "finishes");
  const hexOk = (h: string) => (/^#[0-9a-f]{6}$/i.test(h) ? h.toLowerCase() : "#c9cacb");

  const schema = buildSchema({
    name: "Finish Configurator",
    settings: [
      txt("text", "eyebrow", "Eyebrow", str(config, "eyebrow")),
      txt("text", "heading", "Heading", str(config, "heading"), "Wrap a word in *asterisks* to set it in the italic accent font"),
      txt("textarea", "subheading", "Subheading", str(config, "subheading")),
      {
        type: "select",
        id: "visual",
        label: "Product visual",
        options: [
          { value: "image", label: "Variant images" },
          { value: "ring", label: "Drawn ring (recolours with the finish)" },
        ],
        default: "image",
      },
      txt("text", "shown_in", "Visual caption", str(config, "shownIn")),
      { type: "header", content: "Product options" },
      txt("text", "finish_option", "Finish option name", str(config, "finishOption", "Finish"), "Must match the option name on your product"),
      txt("text", "finish_label", "Finish step label", str(config, "finishLabel")),
      txt("text", "size_option", "Size option name", str(config, "sizeOption", "Size"), "Must match the option name on your product"),
      txt("text", "size_label", "Size step label", str(config, "sizeLabel")),
      txt("text", "size_note", "Size note", str(config, "sizeNote")),
      { type: "header", content: "Sizing kit" },
      { type: "checkbox", id: "show_kit", label: "Offer a sizing kit", default: bool(config, "showKit", true) },
      txt("text", "kit_toggle", "Toggle text", str(config, "kitToggle"), "Wrap a word in *asterisks* to accent it"),
      txt("text", "kit_title", "Kit title", str(config, "kitTitle")),
      txt("textarea", "kit_text", "Kit text", str(config, "kitText")),
      txt("text", "kit_button", "Kit button", str(config, "kitButton")),
      { type: "url", id: "kit_url", label: "Sizing kit link" },
      { type: "header", content: "Summary" },
      txt("text", "total_label", "Total label", str(config, "totalLabel")),
      txt("text", "save_text", "Save label", str(config, "saveText")),
      txt("text", "button_text", "Button text", str(config, "buttonText")),
      txt("text", "sold_out_text", "Sold out text", "Sold out"),
      txt("text", "unavailable_text", "Unavailable text", "Unavailable"),
      txt("text", "perks", "Perks line", str(config, "perks")),
      { type: "header", content: "Style" },
      { type: "color", id: "bg", label: "Background", default: str(config, "bg") },
      { type: "color", id: "panel", label: "Panel", default: str(config, "panel") },
      { type: "color", id: "text_color", label: "Text", default: str(config, "textColor") },
      { type: "color", id: "muted", label: "Muted text", default: str(config, "muted") },
      { type: "color", id: "line", label: "Lines", default: str(config, "line") },
      { type: "color", id: "accent", label: "Button", default: str(config, "accent") },
      { type: "color", id: "accent_text", label: "Button text", default: str(config, "accentText") },
      { type: "range", id: "radius", label: "Corner radius", min: 0, max: 24, step: 2, unit: "px", default: Math.max(0, Math.min(24, Math.round(num(config, "radius", 14) / 2) * 2)) },
    ],
    blocks: [
      {
        type: "finish",
        name: "Finish swatch",
        settings: [
          { type: "text", id: "value", label: "Option value", default: "Silver" },
          { type: "color", id: "color", label: "Swatch colour", default: "#c9cacb" },
        ],
      },
    ],
    maxBlocks: 16,
    presetBlocks: finishes.map((f) => ({
      type: "finish",
      settings: { value: esc(f.name ?? ""), color: hexOk(f.hex ?? "") },
    })),
  });

  return section({ style, markup, schema });
}

export const finishConfigurator: Tweak = {
  slug: "finish-configurator",
  inspiredBy: "oura",
  name: "Finish & Size Configurator",
  tagline: "Metallic finish swatches, size chips and a sizing-kit path, with a product photo that follows the finish.",
  description:
    "Modeled on the ring configurator Oura uses on its product pages. Step one is a row of large metallic finish swatches, each with its own price and promo finishes showing was, now and the saving. Step two is size chips with a note on sizing and a free sizing-kit path for shoppers who aren't sure. The product photo crossfades to the chosen finish, and the total and add-to-cart button update as you go. In Shopify it maps to your product's Finish and Size options, picks the matching variant and shows that variant's image.",
  category: "product-page",
  tier: "paid",
  price: 49,
  tint: "#f3eee6",
  Preview,
  generateLiquid,
  defaults,
  fields: [
    { key: "eyebrow", label: "Eyebrow", type: "text", group: "Content" },
    { key: "heading", label: "Heading", type: "text", group: "Content", hint: "Wrap a word in *asterisks* for the italic accent" },
    { key: "subheading", label: "Subheading", type: "textarea", group: "Content" },
    { key: "shownIn", label: "Visual caption", type: "text", group: "Content" },
    { key: "currency", label: "Currency symbol", type: "text", group: "Content" },
    { key: "finishLabel", label: "Step label", type: "text", group: "Finishes" },
    {
      key: "finishes", label: "Finishes", type: "list", group: "Finishes",
      hint: "Swatch is a hex colour. Add a compare-at price to show the saving. Image URL is optional: a finish without one borrows the nearest photo, tinted to its swatch. Prices and photos are preview only; your store uses the variant prices and images",
      itemFields: [
        { key: "name", label: "Name", type: "text" },
        { key: "hex", label: "Swatch hex", type: "text" },
        { key: "price", label: "Price", type: "text" },
        { key: "compare", label: "Compare-at", type: "text" },
        { key: "image", label: "Image URL", type: "text" },
      ],
      newItem: { name: "Graphite", hex: "#5a5c60", price: "299", compare: "", image: "" }, addLabel: "Add finish", max: 8,
    },
    { key: "selected", label: "Preselected finish", type: "slider", group: "Finishes", min: 1, max: 8, step: 1, hint: "Preview only; your store preselects the current variant" },
    { key: "sizeLabel", label: "Step label", type: "text", group: "Sizes" },
    { key: "sizes", label: "Sizes", type: "text", group: "Sizes", hint: "Comma separated. Your store uses the product's size values" },
    { key: "sizeNote", label: "Size note", type: "text", group: "Sizes" },
    { key: "showKit", label: "Offer a sizing kit", type: "toggle", group: "Sizing kit" },
    { key: "kitToggle", label: "Toggle text", type: "text", group: "Sizing kit", hint: "Wrap a word in *asterisks* for the accent" },
    { key: "kitTitle", label: "Kit title", type: "text", group: "Sizing kit" },
    { key: "kitText", label: "Kit text", type: "textarea", group: "Sizing kit" },
    { key: "kitButton", label: "Kit button", type: "text", group: "Sizing kit", hint: "Links to your sizing kit (set the link in the Shopify theme editor)" },
    { key: "totalLabel", label: "Total label", type: "text", group: "Summary" },
    { key: "saveText", label: "Save label", type: "text", group: "Summary" },
    { key: "buttonText", label: "Button text", type: "text", group: "Summary" },
    { key: "perks", label: "Perks line", type: "text", group: "Summary" },
    { key: "finishOption", label: "Finish option name", type: "text", group: "Shopify", hint: "The product option that holds the finishes" },
    { key: "sizeOption", label: "Size option name", type: "text", group: "Shopify", hint: "The product option that holds the sizes" },
    fontField("Typography"),
    fontField("Typography", "accentFont", "Accent font"),
    { key: "radius", label: "Corner radius", type: "slider", group: "Layout", min: 0, max: 24, step: 2, unit: "px" },
    { key: "bg", label: "Background", type: "color", group: "Colors" },
    { key: "panel", label: "Panel", type: "color", group: "Colors" },
    { key: "textColor", label: "Text", type: "color", group: "Colors" },
    { key: "muted", label: "Muted text", type: "color", group: "Colors" },
    { key: "line", label: "Lines", type: "color", group: "Colors" },
    { key: "accent", label: "Button", type: "color", group: "Colors" },
    { key: "accentText", label: "Button text", type: "color", group: "Colors" },
  ],
};
