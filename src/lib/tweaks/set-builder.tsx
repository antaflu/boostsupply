"use client";

import { useEffect, useState } from "react";
import type { Tweak, TweakConfig } from "../types";
import { str, num, list, fontStack } from "../cfg";
import { fontField } from "../fields";
import { buildSchema, section, fontFaceFor } from "../liquid";
import { ProductArt, money, toNum, type ArtKind } from "./product-art";

/* ============================================================
   Build-Your-Set Picker
   A pick-your-own set: toggle products into the set, choose a
   size per product, and watch a savings meter fill toward the
   next tier ("Pick 3, save 15%" / "Pick 5, save 25%"). A sticky
   summary shows the set price against the full price and adds
   the whole set to the bag in one go.
   ============================================================ */

const MONO = "ui-monospace, 'SF Mono', Menlo, monospace";
const EASE = "cubic-bezier(.22,1,.36,1)";
const ART: ArtKind[] = ["tube", "bottle", "spray", "jar", "tube", "jar"];
const TONES = ["#F39AB0", "#141414", "#F7B8C6", "#F39AB0", "#E8A39E", "#141414"];

const defaults: TweakConfig = {
  eyebrow: "Build a set",
  heading: "Your routine, your set",
  subheading: "Pick the products you love. The more you add, the more you save.",
  currency: "$",
  tier1Qty: 3,
  tier1Off: 15,
  tier2Qty: 5,
  tier2Off: 25,
  preselected: 2,
  pickedText: "picked",
  offLabel: "off",
  progressText: "Add {{count}} more to save {{percent}}",
  unlockedText: "You've unlocked {{percent}} off",
  products: [
    { name: "Hydra Serum", type: "Hydrating serum", image: "/mockups/set-serum.jpg", sizeA: "30 ml", priceA: "28", sizeB: "50 ml", priceB: "40", badge: "Best seller" },
    { name: "Daily Whip", type: "Light moisturizer", image: "/mockups/set-cream.jpg", sizeA: "50 ml", priceA: "26", sizeB: "100 ml", priceB: "38", badge: "" },
    { name: "Soft Wash", type: "Gentle gel cleanser", image: "/mockups/set-cleanser.jpg", sizeA: "100 ml", priceA: "18", sizeB: "200 ml", priceB: "26", badge: "" },
    { name: "Dew Mist", type: "Hydrating face mist", image: "/mockups/set-mist.jpg", sizeA: "100 ml", priceA: "22", sizeB: "", priceB: "", badge: "New" },
    { name: "Petal Balm", type: "Multi-use balm", image: "/mockups/set-balm.jpg", sizeA: "10 ml", priceA: "14", sizeB: "20 ml", priceB: "22", badge: "" },
    { name: "Sheer Tint", type: "Tinted lip balm", image: "/mockups/award-lip.jpg", sizeA: "4 g", priceA: "18", sizeB: "", priceB: "", badge: "Staff pick" },
  ],
  summaryTitle: "Your set",
  emptyText: "Tap a product to start your set.",
  totalLabel: "Set price",
  saveLabel: "Save",
  buttonText: "Add set to bag",
  bg: "#FFFFFF",
  textColor: "#000000",
  pink: "#FBD1DA",
  accent: "#0600FF",
  tile: "#F7F7F7",
  muted: "#6B6B6B",
  buttonBg: "#000000",
  buttonText2: "#FFFFFF",
  font: "system",
  radius: 14,
};

/** Hex colour + alpha byte. */
const tint = (hex: string, a: number) =>
  /^#[0-9a-f]{6}$/i.test(hex)
    ? hex + Math.round(a * 255).toString(16).padStart(2, "0")
    : hex;

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

/** Fill a "{{count}} / {{percent}}" template. */
const fillTpl = (tpl: string, count: number, pct: number) =>
  tpl.split("{{count}}").join(String(count)).split("{{percent}}").join(`${pct}%`);

function Plus({ on }: { on: boolean }) {
  return (
    <span className="relative block h-3 w-3" aria-hidden>
      <svg
        width="12"
        height="12"
        viewBox="0 0 12 12"
        className="absolute inset-0"
        style={{
          opacity: on ? 0 : 1,
          transform: on ? "rotate(90deg) scale(.4)" : "none",
          transition: `opacity 220ms ease, transform 380ms ${EASE}`,
        }}
      >
        <path d="M6 1.5v9M1.5 6h9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
      <svg
        width="12"
        height="12"
        viewBox="0 0 12 12"
        className="absolute inset-0"
        style={{
          opacity: on ? 1 : 0,
          transform: on ? "none" : "scale(.4)",
          transition: `opacity 220ms ease, transform 420ms cubic-bezier(.34,1.56,.64,1)`,
        }}
      >
        <path d="M2.2 6.4l2.4 2.3 5.2-5.4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

/** Small product thumbnail: the photo when there is one, the drawing otherwise. */
function Thumb({
  src,
  kind,
  tone,
  size,
  tile,
  radius,
}: {
  src: string;
  kind: ArtKind;
  tone: string;
  size: number;
  tile: string;
  radius: number;
}) {
  if (!src) return <ProductArt kind={kind} tone={tone} size={size} tile={tile} radius={radius} />;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      className="block shrink-0 object-cover"
      style={{ width: size, height: size, borderRadius: radius, background: tile }}
    />
  );
}

function Preview({ config }: { config: TweakConfig }) {
  const cur = str(config, "currency", "$");
  const bg = str(config, "bg", "#FFFFFF");
  const text = str(config, "textColor", "#000000");
  const pink = str(config, "pink", "#FBD1DA");
  const accent = str(config, "accent", "#0600FF");
  const tile = str(config, "tile", "#F7F7F7");
  const muted = str(config, "muted", "#6B6B6B");
  const btnBg = str(config, "buttonBg", "#000000");
  const btnText = str(config, "buttonText2", "#FFFFFF");
  const radius = num(config, "radius", 14);

  const t1 = clamp(Math.round(num(config, "tier1Qty", 3)), 2, 6);
  const t2 = Math.max(t1, clamp(Math.round(num(config, "tier2Qty", 5)), 3, 10));
  const o1 = clamp(num(config, "tier1Off", 15), 0, 50);
  const o2 = clamp(num(config, "tier2Off", 25), 0, 60);
  const offLabel = str(config, "offLabel", "off");

  const products = list(config, "products").map((p, i) => {
    const sizes = [
      { label: p.sizeA ?? "", price: toNum(p.priceA) },
      { label: p.sizeB ?? "", price: toNum(p.priceB) },
    ].filter((s, j) => j === 0 || (s.label && s.price > 0));
    return {
      name: p.name ?? "",
      type: p.type ?? "",
      badge: p.badge ?? "",
      image: (p.image ?? "").trim(),
      sizes,
      art: ART[i % ART.length],
      tone: TONES[i % TONES.length],
    };
  });

  /* preselect follows the editor control; shoppers can click around after */
  const pre = clamp(Math.round(num(config, "preselected", 2)), 0, products.length);
  const key = `${pre}:${products.length}`;
  const [prevKey, setPrevKey] = useState(key);
  const [picked, setPicked] = useState<number[]>(() => Array.from({ length: pre }, (_, i) => i));
  const [sizeSel, setSizeSel] = useState<Record<number, number>>({});
  const [added, setAdded] = useState(false);
  if (key !== prevKey) {
    setPrevKey(key);
    setPicked(Array.from({ length: pre }, (_, i) => i));
  }

  useEffect(() => {
    if (!added) return;
    const t = setTimeout(() => setAdded(false), 1700);
    return () => clearTimeout(t);
  }, [added]);

  const on = picked.filter((i) => i < products.length);
  const n = on.length;
  const sizeOf = (i: number) => Math.min(sizeSel[i] ?? 0, products[i].sizes.length - 1);
  const priceOf = (i: number) => products[i].sizes[sizeOf(i)]?.price ?? 0;
  const full = on.reduce((s, i) => s + priceOf(i), 0);
  const off = n >= t2 ? o2 : n >= t1 ? o1 : 0;
  const set = full * (1 - off / 100);
  const status =
    n >= t2
      ? fillTpl(str(config, "unlockedText"), 0, o2)
      : fillTpl(str(config, "progressText"), (n >= t1 ? t2 : t1) - n, n >= t1 ? o2 : o1);

  const toggle = (i: number) =>
    setPicked((p) => (p.includes(i) ? p.filter((x) => x !== i) : [...p, i]));
  const pickSize = (i: number, s: number) => {
    setSizeSel((m) => ({ ...m, [i]: s }));
    setPicked((p) => (p.includes(i) ? p : [...p, i]));
  };

  const line = tint(text, 0.1);
  const addBtn = (extra: string) => (
    <button
      type="button"
      disabled={n === 0}
      onClick={() => setAdded(true)}
      className={`flex h-12 items-center justify-center gap-2 rounded-full px-5 text-[14.5px] font-medium hover:brightness-125 active:scale-[0.98] disabled:opacity-40 ${extra}`}
      style={{
        background: added ? accent : btnBg,
        color: btnText,
        transition: `background-color 300ms ${EASE}, filter 200ms ease, scale 200ms ease, opacity 200ms ease`,
      }}
    >
      <span key={added ? "y" : "n"} className="bs-swap whitespace-nowrap">
        {added ? "Added to bag ✓" : str(config, "buttonText")}
      </span>
    </button>
  );

  return (
    <div
      className="@container w-full"
      style={{ background: bg, color: text, fontFamily: fontStack(str(config, "font", "system")) }}
    >
      <div className="mx-auto w-full max-w-[1100px] px-4 pt-6 @min-[700px]:px-8 @min-[700px]:pb-10 @min-[700px]:pt-10">
        {/* Header + savings meter */}
        <div className="grid gap-4 @min-[700px]:grid-cols-[minmax(0,1fr)_330px] @min-[700px]:items-end @min-[700px]:gap-10">
          <div>
            {str(config, "eyebrow") && (
              <p className="text-[10.5px] uppercase tracking-[0.12em]" style={{ fontFamily: MONO, color: accent }}>
                {str(config, "eyebrow")}
              </p>
            )}
            <h3 className="mt-2 text-[28px] font-medium leading-[1.05] tracking-[-0.03em] @min-[700px]:text-[38px]">
              {str(config, "heading")}
            </h3>
            {str(config, "subheading") && (
              <p className="mt-2 max-w-[440px] text-[14px] leading-relaxed" style={{ color: muted }}>
                {str(config, "subheading")}
              </p>
            )}
          </div>

          <div className="px-4 pb-3.5 pt-3.5" style={{ background: pink, borderRadius: radius }}>
            <div className="flex items-end justify-between gap-3">
              <p className="flex items-baseline gap-1.5 text-[13px]">
                <b key={n} className="bs-swap inline-block text-[26px] font-medium leading-none tracking-[-0.03em] tabular-nums">
                  {n}
                </b>
                {str(config, "pickedText")}
              </p>
              <p
                key={status}
                className="bs-swap pb-0.5 text-right text-[12.5px] font-medium leading-snug"
                style={{ color: n >= t1 ? accent : text }}
              >
                {status}
              </p>
            </div>
            <div className="mt-3 grid gap-1" style={{ gridTemplateColumns: `repeat(${t2}, minmax(0,1fr))` }}>
              {Array.from({ length: t2 }, (_, i) => (
                <span
                  key={i}
                  className="h-[7px] overflow-hidden rounded-full"
                  style={{ background: tint("#FFFFFF", 0.75) }}
                >
                  <span
                    className="block h-full rounded-full"
                    style={{
                      background: accent,
                      transform: i < n ? "scaleX(1)" : "scaleX(0)",
                      transformOrigin: "left",
                      transition: `transform 520ms ${EASE}`,
                    }}
                  />
                </span>
              ))}
            </div>
            <div
              className="mt-1.5 grid text-[9.5px] uppercase tracking-[0.08em]"
              style={{ gridTemplateColumns: `repeat(${t2}, minmax(0,1fr))`, fontFamily: MONO }}
            >
              {[
                { q: t1, o: o1 },
                { q: t2, o: o2 },
              ]
                .filter((m, j) => j === 1 || m.q < t2)
                .map((m) => {
                  const hit = n >= m.q;
                  return (
                    <span
                      key={m.q}
                      className="flex items-center justify-self-end gap-1 whitespace-nowrap transition-colors duration-300"
                      style={{ gridColumn: m.q, gridRow: 1, color: hit ? accent : tint(text, 0.55) }}
                    >
                      <svg
                        width="8"
                        height="8"
                        viewBox="0 0 12 12"
                        aria-hidden
                        style={{
                          opacity: hit ? 1 : 0,
                          transform: hit ? "none" : "scale(.3)",
                          transition: `opacity 200ms ease, transform 400ms cubic-bezier(.34,1.56,.64,1)`,
                        }}
                      >
                        <path d="M2 6.4l2.6 2.4L10 3.4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      {m.o}% {offLabel}
                    </span>
                  );
                })}
            </div>
          </div>
        </div>

        {/* Products + desktop summary */}
        <div className="mt-6 grid gap-8 @min-[700px]:grid-cols-[minmax(0,1fr)_260px]">
          <div className="@container min-w-0">
            <div className="grid grid-cols-2 gap-x-3 gap-y-6 @min-[420px]:grid-cols-3">
              {products.map((p, i) => {
                const sel = on.includes(i);
                const s = sizeOf(i);
                return (
                  <div key={i} className="flex min-w-0 flex-col">
                    <button
                      type="button"
                      aria-pressed={sel}
                      aria-label={p.name}
                      onClick={() => toggle(i)}
                      className="group relative aspect-[4/5] w-full overflow-hidden transition-[background-color] duration-300"
                      style={{ background: sel ? pink : tile, borderRadius: radius }}
                    >
                      {p.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={p.image}
                          alt=""
                          loading="lazy"
                          decoding="async"
                          className="absolute inset-0 h-full w-full object-cover"
                          style={{
                            transform: sel ? "scale(1.04)" : "none",
                            transition: `transform 600ms ${EASE}`,
                          }}
                        />
                      ) : (
                        <span
                          className="absolute inset-0 grid place-items-center"
                          style={{
                            transform: sel ? "scale(1.05) translateY(-2px)" : "none",
                            transition: `transform 600ms ${EASE}`,
                          }}
                        >
                          <ProductArt kind={p.art} tone={p.tone} size={118} tile="transparent" />
                        </span>
                      )}
                      {/* selection ring sits above the photo */}
                      <span
                        aria-hidden
                        className="pointer-events-none absolute inset-0 transition-[box-shadow] duration-300"
                        style={{
                          borderRadius: radius,
                          boxShadow: sel ? `inset 0 0 0 2px ${accent}` : `inset 0 0 0 1px ${tint(text, 0.05)}`,
                        }}
                      />
                      {p.badge && (
                        <span
                          className="absolute left-2 top-2 rounded-full bg-white px-2 py-[3px] text-[9.5px] uppercase tracking-[0.08em]"
                          style={{ fontFamily: MONO, color: text }}
                        >
                          {p.badge}
                        </span>
                      )}
                      <span
                        className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full transition-[background-color,color,box-shadow] duration-300"
                        style={{
                          background: sel ? accent : "#FFFFFF",
                          color: sel ? "#FFFFFF" : text,
                          boxShadow: sel ? `0 4px 12px -4px ${tint(accent, 0.6)}` : `0 0 0 1px ${tint(text, 0.08)}`,
                        }}
                      >
                        <Plus on={sel} />
                      </span>
                    </button>
                    <div className="mt-2.5 flex items-baseline justify-between gap-2">
                      <p className="truncate text-[14px] font-medium">{p.name}</p>
                      <p key={s} className="bs-swap shrink-0 text-[13.5px] tabular-nums">
                        {money(priceOf(i), cur)}
                      </p>
                    </div>
                    <p className="truncate text-[12px]" style={{ color: muted }}>
                      {p.type}
                    </p>
                    {p.sizes.length > 1 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {p.sizes.map((z, j) => {
                          const act = j === s;
                          return (
                            <button
                              key={j}
                              type="button"
                              aria-pressed={act}
                              onClick={() => pickSize(i, j)}
                              className="h-7 rounded-full px-2.5 text-[11px] tabular-nums transition-[background-color,color,box-shadow] duration-200"
                              style={{
                                fontFamily: MONO,
                                background: act ? text : "transparent",
                                color: act ? bg : text,
                                boxShadow: act ? "none" : `inset 0 0 0 1px ${tint(text, 0.18)}`,
                              }}
                            >
                              {z.label}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Desktop summary */}
          <aside className="hidden self-start @min-[700px]:sticky @min-[700px]:top-4 @min-[700px]:block">
            <div className="p-4" style={{ background: tile, borderRadius: radius + 4 }}>
              <p className="text-[10.5px] uppercase tracking-[0.12em]" style={{ fontFamily: MONO }}>
                {str(config, "summaryTitle")}
              </p>
              <ul className="mt-3 flex flex-col gap-2">
                {on.map((i) => (
                  <li key={i} className="bs-fade-up flex items-center gap-2.5 bg-white p-1.5 pr-2" style={{ borderRadius: Math.max(6, radius - 4) }}>
                    <Thumb
                      src={products[i].image}
                      kind={products[i].art}
                      tone={products[i].tone}
                      size={38}
                      tile={pink}
                      radius={Math.max(4, radius - 6)}
                    />
                    <div className="min-w-0 flex-1 leading-tight">
                      <p className="truncate text-[12.5px] font-medium">{products[i].name}</p>
                      <p className="truncate text-[11px]" style={{ color: muted }}>
                        {products[i].sizes[sizeOf(i)]?.label}
                      </p>
                    </div>
                    <span className="text-[12px] tabular-nums">{money(priceOf(i), cur)}</span>
                    <button
                      type="button"
                      aria-label={`Remove ${products[i].name}`}
                      onClick={() => toggle(i)}
                      className="grid h-6 w-6 place-items-center rounded-full transition-colors hover:bg-black/[0.06]"
                    >
                      <svg width="9" height="9" viewBox="0 0 12 12" aria-hidden>
                        <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                      </svg>
                    </button>
                  </li>
                ))}
                {n === 0 && (
                  <li className="py-3 text-[12.5px]" style={{ color: muted }}>
                    {str(config, "emptyText")}
                  </li>
                )}
              </ul>
              <div className="mt-4 border-t pt-3" style={{ borderColor: line }}>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-[13px]">{str(config, "totalLabel")}</span>
                  <span className="flex items-baseline gap-1.5 tabular-nums">
                    {off > 0 && (
                      <s className="text-[12.5px]" style={{ color: muted }}>
                        {money(full, cur)}
                      </s>
                    )}
                    <b key={`${n}-${set}`} className="bs-swap text-[20px] font-medium tracking-[-0.02em]">
                      {money(set, cur)}
                    </b>
                  </span>
                </div>
                {off > 0 && (
                  <p className="mt-1 text-right text-[10.5px] uppercase tracking-[0.08em]" style={{ fontFamily: MONO, color: accent }}>
                    {str(config, "saveLabel")} {off}% · {money(full - set, cur)}
                  </p>
                )}
              </div>
              {addBtn("mt-4 w-full")}
            </div>
          </aside>
        </div>

        {/* Mobile sticky summary */}
        <div
          className="sticky bottom-0 z-10 -mx-4 mt-6 flex items-center gap-3 border-t px-4 pb-4 pt-3 @min-[700px]:hidden"
          style={{ background: bg, borderColor: line }}
        >
          <div className="flex shrink-0 items-center">
            {on.slice(0, 3).map((i, k) => (
              <span
                key={i}
                className="bs-fade-up overflow-hidden rounded-full"
                style={{ marginLeft: k ? -10 : 0, boxShadow: `0 0 0 2px ${bg}` }}
              >
                <Thumb src={products[i].image} kind={products[i].art} tone={products[i].tone} size={32} tile={pink} radius={99} />
              </span>
            ))}
            {n > 3 && (
              <span
                className="-ml-2.5 grid h-8 w-8 place-items-center rounded-full text-[10.5px] font-medium"
                style={{ background: text, color: bg, boxShadow: `0 0 0 2px ${bg}` }}
              >
                +{n - 3}
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="flex items-baseline gap-1.5 tabular-nums">
              <b className="text-[17px] font-medium tracking-[-0.02em]">{money(set, cur)}</b>
              {off > 0 && (
                <s className="truncate text-[12px]" style={{ color: muted }}>
                  {money(full, cur)}
                </s>
              )}
            </p>
            <p
              className="mt-0.5 truncate text-[10px] uppercase tracking-[0.08em]"
              style={{ fontFamily: MONO, color: off > 0 ? accent : muted }}
            >
              {off > 0 ? `${str(config, "saveLabel")} ${off}%` : `${n} ${str(config, "pickedText")}`}
            </p>
          </div>
          {addBtn("shrink-0")}
        </div>
      </div>
    </div>
  );
}

function generateLiquid(config: TweakConfig): string {
  const { face, family } = fontFaceFor(str(config, "font", "system"));
  const S = ".bs-sb-{{ section.id }}";
  const r = "{{ section.settings.radius }}px";
  const mono = "ui-monospace, 'SF Mono', Menlo, monospace";
  const ease = "cubic-bezier(.22,1,.36,1)";

  const t1 = clamp(Math.round(num(config, "tier1Qty", 3)), 2, 6);
  const t2 = clamp(Math.round(num(config, "tier2Qty", 5)), 3, 10);
  const o1 = clamp(Math.round(num(config, "tier1Off", 15)), 0, 50);
  const o2 = clamp(Math.round(num(config, "tier2Off", 25)), 0, 60);

  const style = `<style>
${face ? face + "\n" : ""}  ${S} { container-type: inline-size; background: {{ section.settings.bg }}; color: {{ section.settings.text_color }}; font-family: ${family}; }
  ${S} * { box-sizing: border-box; }
  ${S} p, ${S} h2, ${S} ul { margin: 0; padding: 0; }
  ${S} a { color: inherit; text-decoration: none; }
  ${S} button { font: inherit; color: inherit; }
  ${S} .bs-wrap { max-width: 1100px; margin: 0 auto; padding: 24px 16px 0; }
  ${S} .bs-head { display: grid; gap: 16px; }
  ${S} .bs-eyebrow { font-family: ${mono}; font-size: 10.5px; text-transform: uppercase; letter-spacing: .12em; color: {{ section.settings.accent }}; }
  ${S} .bs-h { margin-top: 8px; font-size: 28px; font-weight: 500; line-height: 1.05; letter-spacing: -.03em; }
  ${S} .bs-sub { margin-top: 8px; max-width: 440px; font-size: 14px; line-height: 1.6; color: {{ section.settings.muted }}; }
  ${S} .bs-meter { padding: 14px 16px; border-radius: ${r}; background: {{ section.settings.pink }}; }
  ${S} .bs-mh { display: flex; align-items: flex-end; justify-content: space-between; gap: 12px; }
  ${S} .bs-mh p:first-child { display: flex; align-items: baseline; gap: 6px; font-size: 13px; }
  ${S} .bs-mh b { font-size: 26px; font-weight: 500; line-height: 1; letter-spacing: -.03em; font-variant-numeric: tabular-nums; }
  ${S} .bs-status { padding-bottom: 2px; text-align: right; font-size: 12.5px; font-weight: 500; line-height: 1.35; }
  ${S} .bs-status.is-on { color: {{ section.settings.accent }}; }
  ${S} .bs-pips { display: grid; gap: 4px; margin-top: 12px; }
  ${S} .bs-pip { height: 7px; border-radius: 99px; overflow: hidden; background: rgba(255,255,255,.75); }
  ${S} .bs-pip::after { content: ""; display: block; height: 100%; border-radius: 99px; background: {{ section.settings.accent }};
    transform: scaleX(0); transform-origin: left; transition: transform .52s ${ease}; }
  ${S} .bs-pip.is-on::after { transform: none; }
  ${S} .bs-miles { display: grid; margin-top: 6px; font-family: ${mono}; font-size: 9.5px; text-transform: uppercase; letter-spacing: .08em; }
  ${S} .bs-mile { grid-row: 1; justify-self: end; white-space: nowrap; opacity: .55; transition: color .3s, opacity .3s; }
  ${S} .bs-mile.is-on { opacity: 1; color: {{ section.settings.accent }}; }
  ${S} .bs-mile.is-on::before { content: "✓ "; }
  ${S} .bs-body { display: grid; gap: 32px; margin-top: 24px; }
  ${S} .bs-gridw { container-type: inline-size; min-width: 0; }
  ${S} .bs-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); column-gap: 12px; row-gap: 24px; }
  @container (min-width: 420px) { ${S} .bs-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
  ${S} .bs-card { min-width: 0; display: flex; flex-direction: column; }
  ${S} .bs-tile { position: relative; display: block; width: 100%; aspect-ratio: 4 / 5; padding: 0; border: 0; cursor: pointer; overflow: hidden;
    border-radius: ${r}; background: {{ section.settings.tile }}; box-shadow: inset 0 0 0 1px rgba(0,0,0,.04);
    transition: background-color .3s, box-shadow .3s; }
  ${S} .bs-tile:disabled { cursor: not-allowed; opacity: .55; }
  ${S} .bs-tile img, ${S} .bs-tile .bs-ph { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; transition: transform .6s ${ease}; }
  ${S} .bs-card.is-on .bs-tile { background: {{ section.settings.pink }}; box-shadow: inset 0 0 0 2px {{ section.settings.accent }}; }
  ${S} .bs-card.is-on .bs-tile img { transform: scale(1.04); }
  ${S} .bs-tile::after { content: ""; position: absolute; inset: 0; border-radius: inherit; pointer-events: none; box-shadow: inset 0 0 0 2px {{ section.settings.accent }}; opacity: 0; transition: opacity .3s; }
  ${S} .bs-card.is-on .bs-tile::after { opacity: 1; }
  ${S} .bs-badge { position: absolute; left: 8px; top: 8px; z-index: 1; padding: 3px 8px; border-radius: 99px; background: #fff;
    font-family: ${mono}; font-size: 9.5px; text-transform: uppercase; letter-spacing: .08em; color: {{ section.settings.text_color }}; }
  ${S} .bs-check { position: absolute; right: 8px; top: 8px; z-index: 1; width: 28px; height: 28px; border-radius: 99px; display: grid; place-items: center;
    background: #fff; color: {{ section.settings.text_color }}; box-shadow: 0 0 0 1px rgba(0,0,0,.08); transition: background-color .3s, color .3s, box-shadow .3s; }
  ${S} .bs-check svg { grid-area: 1 / 1; transition: opacity .22s, transform .4s ${ease}; }
  ${S} .bs-tick { opacity: 0; transform: scale(.4); }
  ${S} .bs-card.is-on .bs-check { background: {{ section.settings.accent }}; color: #fff; box-shadow: 0 4px 12px -4px rgba(0,0,0,.35); }
  ${S} .bs-card.is-on .bs-plus { opacity: 0; transform: rotate(90deg) scale(.4); }
  ${S} .bs-card.is-on .bs-tick { opacity: 1; transform: none; }
  ${S} .bs-info { margin-top: 10px; display: flex; align-items: baseline; justify-content: space-between; gap: 8px; }
  ${S} .bs-name { min-width: 0; font-size: 14px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  ${S} .bs-price { flex-shrink: 0; font-size: 13.5px; font-variant-numeric: tabular-nums; }
  ${S} .bs-type { font-size: 12px; color: {{ section.settings.muted }}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  ${S} .bs-sizes { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
  ${S} .bs-size { height: 28px; padding: 0 10px; border: 0; border-radius: 99px; cursor: pointer; background: transparent;
    font-family: ${mono}; font-size: 11px; box-shadow: inset 0 0 0 1px rgba(0,0,0,.18); transition: background-color .2s, color .2s, box-shadow .2s; }
  ${S} .bs-size[aria-pressed="true"] { background: {{ section.settings.text_color }}; color: {{ section.settings.bg }}; box-shadow: none; }
  ${S} .bs-size:disabled { opacity: .35; text-decoration: line-through; cursor: not-allowed; }
  ${S} .bs-empty-grid { grid-column: 1 / -1; padding: 32px 0; font-size: 14px; color: {{ section.settings.muted }}; }
  ${S} .bs-side { position: sticky; bottom: 0; z-index: 2; display: flex; align-items: center; gap: 12px; margin: 0 -16px; padding: 12px 16px 16px;
    border-top: 1px solid rgba(0,0,0,.1); background: {{ section.settings.bg }}; }
  ${S} .bs-st, ${S} .bs-emp, ${S} .bs-tl, ${S} .bs-pick-txt, ${S} .bs-pick-p, ${S} .bs-rm { display: none; }
  ${S} .bs-picks { display: flex; flex-shrink: 0; list-style: none; }
  ${S} .bs-pick { display: flex; align-items: center; }
  ${S} .bs-pick + .bs-pick { margin-left: -10px; }
  ${S} .bs-pick:nth-child(n+4) { display: none; }
  ${S} .bs-pick img, ${S} .bs-pick i { width: 32px; height: 32px; border-radius: 99px; object-fit: cover; display: block; background: {{ section.settings.pink }};
    box-shadow: 0 0 0 2px {{ section.settings.bg }}; }
  ${S} .bs-tot { flex: 1; min-width: 0; line-height: 1.2; }
  ${S} .bs-amt { display: flex; align-items: baseline; gap: 6px; font-variant-numeric: tabular-nums; }
  ${S} .bs-amt b { font-size: 17px; font-weight: 500; letter-spacing: -.02em; }
  ${S} .bs-amt s { font-size: 12px; color: {{ section.settings.muted }}; }
  ${S} .bs-chip { margin-top: 2px; font-family: ${mono}; font-size: 10px; text-transform: uppercase; letter-spacing: .08em; color: {{ section.settings.accent }}; }
  ${S} .bs-add { flex-shrink: 0; height: 48px; padding: 0 20px; border: 0; border-radius: 99px; cursor: pointer; font-size: 14.5px; font-weight: 500; white-space: nowrap;
    background: {{ section.settings.button_bg }}; color: {{ section.settings.button_fg }}; transition: filter .2s, transform .2s, opacity .2s; }
  ${S} .bs-add:hover:not(:disabled) { filter: brightness(1.25); }
  ${S} .bs-add:active:not(:disabled) { transform: scale(.98); }
  ${S} .bs-add:disabled { opacity: .4; cursor: not-allowed; }
  ${S} .bs-add.is-busy { opacity: .7; cursor: progress; }
  ${S} .bs-err { font-size: 12px; color: #c0392b; }
  @container (min-width: 700px) {
    ${S} .bs-wrap { padding: 40px 32px; }
    ${S} .bs-head { grid-template-columns: minmax(0, 1fr) 330px; align-items: end; gap: 40px; }
    ${S} .bs-h { font-size: 38px; }
    ${S} .bs-body { grid-template-columns: minmax(0, 1fr) 260px; }
    ${S} .bs-side { top: 16px; bottom: auto; align-self: start; display: block; margin: 0; padding: 16px; border: 0;
      border-radius: {{ section.settings.radius | plus: 4 }}px; background: {{ section.settings.tile }}; }
    ${S} .bs-st { display: block; font-family: ${mono}; font-size: 10.5px; text-transform: uppercase; letter-spacing: .12em; }
    ${S} .bs-picks { display: flex; flex-direction: column; gap: 8px; margin-top: 12px; }
    ${S} .bs-pick, ${S} .bs-pick:nth-child(n+4) { display: flex; gap: 10px; padding: 6px 8px 6px 6px; border-radius: {{ section.settings.radius | minus: 4 | at_least: 6 }}px; background: #fff; }
    ${S} .bs-pick + .bs-pick { margin-left: 0; }
    ${S} .bs-pick img, ${S} .bs-pick i { width: 38px; height: 38px; border-radius: {{ section.settings.radius | minus: 6 | at_least: 4 }}px; box-shadow: none; }
    ${S} .bs-pick-txt { display: block; flex: 1; min-width: 0; line-height: 1.25; }
    ${S} .bs-pick-txt b { display: block; font-size: 12.5px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    ${S} .bs-pick-txt small { display: block; font-size: 11px; color: {{ section.settings.muted }}; }
    ${S} .bs-pick-p { display: block; font-size: 12px; font-variant-numeric: tabular-nums; }
    ${S} .bs-rm { display: grid; place-items: center; width: 24px; height: 24px; padding: 0; border: 0; border-radius: 99px; background: none; cursor: pointer; font-size: 15px; line-height: 1; }
    ${S} .bs-rm:hover { background: rgba(0,0,0,.06); }
    ${S} .bs-emp { display: block; padding: 12px 0; font-size: 12.5px; color: {{ section.settings.muted }}; }
    ${S} .bs-emp[hidden] { display: none; }
    ${S} .bs-tot { display: grid; grid-template-columns: auto 1fr; align-items: baseline; margin-top: 16px; padding-top: 12px; border-top: 1px solid rgba(0,0,0,.1); }
    ${S} .bs-tl { display: block; font-size: 13px; }
    ${S} .bs-amt { justify-content: flex-end; }
    ${S} .bs-amt b { font-size: 20px; }
    ${S} .bs-chip { grid-column: 1 / -1; text-align: right; margin-top: 4px; font-size: 10.5px; }
    ${S} .bs-add { width: 100%; margin-top: 16px; }
    ${S} .bs-err { margin-top: 8px; }
  }
</style>`;

  const markup = `{%- comment -%}
  Build-Your-Set Picker by boost.supply. Add it to a product or landing page.
  - Pick up to 6 products under "Set products". Each variant becomes a size
    chip (first 4 variants); sold-out variants are disabled.
  - Tile and summary images are each product's featured image.
  - Badges: give a product a tag like "badge:Best seller".
  - IMPORTANT: the set discount shown here is display only. Create it in
    Shopify as automatic discounts (Discounts → Create discount → Amount off
    products → Automatic discount), limited to these products or a collection
    that holds them, one per tier you set below. With the defaults that is
    a minimum of ${t1} items for ${o1}% off and a minimum of ${t2} items for ${o2}% off.
{%- endcomment -%}
{%- assign bs_t1 = section.settings.tier1_qty -%}
{%- assign bs_t2 = section.settings.tier2_qty | at_least: bs_t1 -%}
<div class="bs-sb-{{ section.id }}" id="bs-sb-{{ section.id }}"
  data-t1="{{ bs_t1 }}" data-o1="{{ section.settings.tier1_off }}" data-t2="{{ bs_t2 }}" data-o2="{{ section.settings.tier2_off }}"
  data-progress="{{ section.settings.progress_text | escape }}" data-unlocked="{{ section.settings.unlocked_text | escape }}"
  data-save="{{ section.settings.save_label | escape }}"
  data-add-url="{{ routes.cart_add_url }}" data-cart-url="{{ routes.cart_url }}">
  <div class="bs-wrap">
    <div class="bs-head">
      <div>
        {%- if section.settings.eyebrow != blank -%}<p class="bs-eyebrow">{{ section.settings.eyebrow }}</p>{%- endif -%}
        <h2 class="bs-h">{{ section.settings.heading }}</h2>
        {%- if section.settings.subheading != blank -%}<p class="bs-sub">{{ section.settings.subheading }}</p>{%- endif -%}
      </div>
      <div class="bs-meter">
        <div class="bs-mh">
          <p><b data-count>0</b> {{ section.settings.picked_text }}</p>
          <p class="bs-status" data-status aria-live="polite"></p>
        </div>
        <div class="bs-pips" style="grid-template-columns: repeat({{ bs_t2 }}, minmax(0, 1fr));">
          {%- for i in (1..bs_t2) -%}<span class="bs-pip" data-pip></span>{%- endfor -%}
        </div>
        <div class="bs-miles" style="grid-template-columns: repeat({{ bs_t2 }}, minmax(0, 1fr));">
          {%- if bs_t1 < bs_t2 -%}<span class="bs-mile" data-mile="{{ bs_t1 }}" style="grid-column: {{ bs_t1 }};">{{ section.settings.tier1_off }}% {{ section.settings.off_label }}</span>{%- endif -%}
          <span class="bs-mile" data-mile="{{ bs_t2 }}" style="grid-column: {{ bs_t2 }};">{{ section.settings.tier2_off }}% {{ section.settings.off_label }}</span>
        </div>
      </div>
    </div>

    <div class="bs-body">
      <div class="bs-gridw">
        <div class="bs-grid">
          {%- for bs_p in section.settings.products -%}
            {%- assign bs_v = bs_p.selected_or_first_available_variant -%}
            {%- assign bs_on = false -%}
            {%- if forloop.index <= section.settings.preselected and bs_v.available -%}{%- assign bs_on = true -%}{%- endif -%}
            {%- assign bs_badge = '' -%}
            {%- for bs_tag in bs_p.tags -%}
              {%- assign bs_tag_lc = bs_tag | downcase -%}
              {%- if bs_tag_lc contains 'badge:' -%}{%- assign bs_badge = bs_tag | split: ':' | last | strip -%}{%- endif -%}
            {%- endfor -%}
            <div class="bs-card{% if bs_on %} is-on{% endif %}" data-card
              data-id="{{ bs_v.id }}" data-p="{{ bs_v.price }}" data-title="{{ bs_p.title | escape }}"
              data-size="{% unless bs_p.has_only_default_variant %}{{ bs_v.title | escape }}{% endunless %}"
              data-img="{% if bs_p.featured_image %}{{ bs_p.featured_image | image_url: width: 120 }}{% endif %}">
              <button type="button" class="bs-tile" data-toggle aria-label="{{ bs_p.title | escape }}" aria-pressed="{{ bs_on }}"{% unless bs_v.available %} disabled{% endunless %}>
                {%- if bs_p.featured_image -%}
                  {{ bs_p.featured_image | image_url: width: 600 | image_tag: loading: 'lazy', alt: bs_p.title, sizes: '(min-width: 990px) 280px, 50vw' }}
                {%- else -%}
                  {{ 'product-1' | placeholder_svg_tag: 'bs-ph' }}
                {%- endif -%}
                {%- if bs_badge != '' -%}<span class="bs-badge">{{ bs_badge }}</span>{%- endif -%}
                <span class="bs-check" aria-hidden="true">
                  <svg class="bs-plus" width="12" height="12" viewBox="0 0 12 12"><path d="M6 1.5v9M1.5 6h9" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
                  <svg class="bs-tick" width="12" height="12" viewBox="0 0 12 12"><path d="M2.2 6.4l2.4 2.3 5.2-5.4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
                </span>
              </button>
              <div class="bs-info">
                <a class="bs-name" href="{{ bs_p.url }}">{{ bs_p.title }}</a>
                <span class="bs-price" data-price>{{ bs_v.price | money }}</span>
              </div>
              {%- if bs_p.product_type != blank -%}<p class="bs-type">{{ bs_p.product_type }}</p>{%- endif -%}
              {%- unless bs_p.has_only_default_variant -%}
                <div class="bs-sizes">
                  {%- for bs_var in bs_p.variants limit: 4 -%}
                    <button type="button" class="bs-size" data-size-btn data-id="{{ bs_var.id }}" data-p="{{ bs_var.price }}" data-label="{{ bs_var.title | escape }}"
                      aria-pressed="{% if bs_var.id == bs_v.id %}true{% else %}false{% endif %}"{% unless bs_var.available %} disabled{% endunless %}>{{ bs_var.title }}</button>
                  {%- endfor -%}
                </div>
              {%- endunless -%}
            </div>
          {%- else -%}
            <p class="bs-empty-grid">Choose up to 6 products under “Set products” in the theme editor.</p>
          {%- endfor -%}
        </div>
      </div>

      <aside class="bs-side">
        <p class="bs-st">{{ section.settings.summary_title }}</p>
        <ul class="bs-picks" data-picks></ul>
        <p class="bs-emp" data-empty>{{ section.settings.empty_text }}</p>
        <div class="bs-tot">
          <span class="bs-tl">{{ section.settings.total_label }}</span>
          <span class="bs-amt"><s data-cmp></s><b data-total>{{ 0 | money }}</b></span>
          <p class="bs-chip" data-chip hidden></p>
        </div>
        <button type="button" class="bs-add" data-add disabled>{{ section.settings.button_text }}</button>
        <p class="bs-err" data-err hidden>Something went wrong. Please try again.</p>
      </aside>
    </div>
  </div>
</div>
<script>
  (function () {
    var root = document.getElementById('bs-sb-{{ section.id }}');
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
    function token(k) { return '{' + '{' + k + '}' + '}'; }
    function fill(tpl, count, pct) {
      return String(tpl || '').split(token('count')).join(count).split(token('percent')).join(pct + '%');
    }
    var d = root.dataset;
    var t1 = +d.t1, o1 = +d.o1, t2 = +d.t2, o2 = +d.o2;
    var cards = [].slice.call(root.querySelectorAll('[data-card]'));
    var pips = [].slice.call(root.querySelectorAll('[data-pip]'));
    var miles = [].slice.call(root.querySelectorAll('[data-mile]'));
    function q(s) { return root.querySelector(s); }
    var count = q('[data-count]'), status = q('[data-status]'), picks = q('[data-picks]'), empty = q('[data-empty]');
    var total = q('[data-total]'), cmp = q('[data-cmp]'), chip = q('[data-chip]'), btn = q('[data-add]'), err = q('[data-err]');

    function picked() { return cards.filter(function (c) { return c.classList.contains('is-on'); }); }
    function setOn(c, on) {
      c.classList.toggle('is-on', on);
      var t = c.querySelector('[data-toggle]');
      if (t) t.setAttribute('aria-pressed', on ? 'true' : 'false');
      update();
    }
    function el(tag, cls, txt) {
      var e = document.createElement(tag);
      if (cls) e.className = cls;
      if (txt) e.textContent = txt;
      return e;
    }
    function update() {
      var on = picked(), n = on.length, full = 0;
      on.forEach(function (c) { full += +c.dataset.p; });
      var off = n >= t2 ? o2 : (n >= t1 ? o1 : 0);
      var set = Math.round(full * (100 - off) / 100);
      if (count) count.textContent = n;
      pips.forEach(function (p, i) { p.classList.toggle('is-on', i < n); });
      miles.forEach(function (m) { m.classList.toggle('is-on', n >= +m.dataset.mile); });
      if (status) {
        status.textContent = n >= t2 ? fill(d.unlocked, 0, o2) : fill(d.progress, (n >= t1 ? t2 : t1) - n, n >= t1 ? o2 : o1);
        status.classList.toggle('is-on', n >= t1);
      }
      if (total) total.textContent = money(set);
      if (cmp) cmp.textContent = off ? money(full) : '';
      if (chip) { chip.hidden = !off; chip.textContent = d.save + ' ' + off + '% · ' + money(full - set); }
      if (btn) btn.disabled = n === 0;
      if (empty) empty.hidden = n > 0;
      if (picks) {
        picks.textContent = '';
        on.forEach(function (c) {
          var li = el('li', 'bs-pick');
          if (c.dataset.img) { var im = el('img'); im.src = c.dataset.img; im.alt = ''; li.appendChild(im); }
          else li.appendChild(el('i'));
          var tx = el('span', 'bs-pick-txt');
          tx.appendChild(el('b', '', c.dataset.title));
          if (c.dataset.size) tx.appendChild(el('small', '', c.dataset.size));
          li.appendChild(tx);
          li.appendChild(el('span', 'bs-pick-p', money(+c.dataset.p)));
          var rm = el('button', 'bs-rm', '×');
          rm.type = 'button';
          rm.setAttribute('aria-label', 'Remove ' + c.dataset.title);
          rm.addEventListener('click', function () { setOn(c, false); });
          li.appendChild(rm);
          picks.appendChild(li);
        });
      }
    }

    cards.forEach(function (c) {
      var t = c.querySelector('[data-toggle]');
      if (t) t.addEventListener('click', function () { setOn(c, !c.classList.contains('is-on')); });
      var sizes = c.querySelectorAll('[data-size-btn]');
      sizes.forEach(function (s) {
        s.addEventListener('click', function () {
          sizes.forEach(function (o) { o.setAttribute('aria-pressed', o === s ? 'true' : 'false'); });
          c.dataset.id = s.dataset.id;
          c.dataset.p = s.dataset.p;
          c.dataset.size = s.dataset.label;
          var pe = c.querySelector('[data-price]');
          if (pe) pe.textContent = money(+s.dataset.p);
          setOn(c, true);
        });
      });
    });

    if (btn) btn.addEventListener('click', function () {
      var items = picked().map(function (c) { return { id: +c.dataset.id, quantity: 1 }; });
      if (!items.length) return;
      btn.disabled = true;
      btn.classList.add('is-busy');
      if (err) err.hidden = true;
      fetch(d.addUrl + '.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ items: items })
      })
        .then(function (r) {
          if (!r.ok) throw new Error('cart');
          window.location.href = d.cartUrl;
        })
        .catch(function () {
          btn.disabled = false;
          btn.classList.remove('is-busy');
          if (err) err.hidden = false;
        });
    });

    update();
  })();
</script>`;

  const schema = buildSchema({
    name: "Build Your Set",
    settings: [
      { type: "text", id: "eyebrow", label: "Eyebrow", default: str(config, "eyebrow") },
      { type: "text", id: "heading", label: "Heading", default: str(config, "heading") },
      { type: "textarea", id: "subheading", label: "Subheading", default: str(config, "subheading") },
      { type: "header", content: "Products" },
      { type: "product_list", id: "products", label: "Set products", limit: 6, info: "Each variant becomes a size chip. Tag a product badge:Best seller to show a badge." },
      { type: "range", id: "preselected", label: "Preselected products", min: 0, max: 6, step: 1, default: clamp(Math.round(num(config, "preselected", 2)), 0, 6) },
      { type: "header", content: "Savings tiers" },
      { type: "range", id: "tier1_qty", label: "Tier 1: items", min: 2, max: 6, step: 1, default: t1 },
      { type: "range", id: "tier1_off", label: "Tier 1: discount", min: 0, max: 50, step: 1, unit: "%", default: o1 },
      { type: "range", id: "tier2_qty", label: "Tier 2: items", min: 3, max: 10, step: 1, default: t2 },
      { type: "range", id: "tier2_off", label: "Tier 2: discount", min: 0, max: 60, step: 1, unit: "%", default: o2 },
      { type: "text", id: "picked_text", label: "Picked label", default: str(config, "pickedText") },
      { type: "text", id: "off_label", label: "“off” label", default: str(config, "offLabel") },
      { type: "text", id: "progress_text", label: "Progress text (use {{count}} and {{percent}})", default: str(config, "progressText") },
      { type: "text", id: "unlocked_text", label: "Top tier text (use {{percent}})", default: str(config, "unlockedText") },
      { type: "header", content: "Summary" },
      { type: "text", id: "summary_title", label: "Summary title", default: str(config, "summaryTitle") },
      { type: "text", id: "empty_text", label: "Empty set text", default: str(config, "emptyText") },
      { type: "text", id: "total_label", label: "Total label", default: str(config, "totalLabel") },
      { type: "text", id: "save_label", label: "Savings label", default: str(config, "saveLabel") },
      { type: "text", id: "button_text", label: "Button text", default: str(config, "buttonText") },
      { type: "header", content: "Style" },
      { type: "color", id: "accent", label: "Accent", default: str(config, "accent") },
      { type: "color", id: "pink", label: "Meter & selected tile", default: str(config, "pink") },
      { type: "color", id: "tile", label: "Product tile", default: str(config, "tile") },
      { type: "color", id: "bg", label: "Background", default: str(config, "bg") },
      { type: "color", id: "text_color", label: "Text", default: str(config, "textColor") },
      { type: "color", id: "muted", label: "Muted text", default: str(config, "muted") },
      { type: "color", id: "button_bg", label: "Button", default: str(config, "buttonBg") },
      { type: "color", id: "button_fg", label: "Button label", default: str(config, "buttonText2") },
      { type: "range", id: "radius", label: "Corner radius", min: 0, max: 24, step: 2, unit: "px", default: clamp(Math.round(num(config, "radius", 14) / 2) * 2, 0, 24) },
    ],
  });

  return section({ style, markup, schema });
}

export const setBuilder: Tweak = {
  slug: "set-builder",
  inspiredBy: "glossier",
  name: "Build-Your-Set Picker",
  tagline: "Shoppers build their own set and watch the savings meter fill as they pick.",
  description:
    "Modeled on the “create your own set” builder Glossier uses for its sets. Shoppers tap products into a set, pick a size for each, and a savings meter fills toward the next tier (“pick 3, save 15%”, “pick 5, save 25%”). A sticky summary shows the set price against the full price and adds the whole set to the bag in one tap. Lifts units per order without a site-wide discount.",
  category: "product-page",
  tier: "paid",
  price: 49,
  tint: "#fbeef1",
  Preview,
  generateLiquid,
  defaults,
  fields: [
    { key: "eyebrow", label: "Eyebrow", type: "text", group: "Content" },
    { key: "heading", label: "Heading", type: "text", group: "Content" },
    { key: "subheading", label: "Subheading", type: "textarea", group: "Content" },
    { key: "currency", label: "Currency symbol", type: "text", group: "Content" },
    {
      key: "products", label: "Products", type: "list", group: "Products",
      hint: "Preview only. Pick the real products in the Shopify theme editor; their featured images and variants are used there. Empty image URL shows a drawing",
      itemFields: [
        { key: "name", label: "Name", type: "text" },
        { key: "type", label: "Descriptor", type: "text" },
        { key: "image", label: "Image URL", type: "text" },
        { key: "sizeA", label: "Size 1", type: "text" },
        { key: "priceA", label: "Price 1", type: "text" },
        { key: "sizeB", label: "Size 2 (optional)", type: "text" },
        { key: "priceB", label: "Price 2", type: "text" },
        { key: "badge", label: "Badge", type: "text" },
      ],
      newItem: { name: "Night Veil", type: "Overnight mask", image: "/mockups/set-cream.jpg", sizeA: "50 ml", priceA: "30", sizeB: "100 ml", priceB: "44", badge: "" },
      addLabel: "Add product", max: 6,
    },
    { key: "preselected", label: "Preselected products", type: "slider", group: "Products", min: 0, max: 6, step: 1 },
    { key: "tier1Qty", label: "Tier 1: items", type: "slider", group: "Savings tiers", min: 2, max: 6, step: 1 },
    { key: "tier1Off", label: "Tier 1: discount", type: "slider", group: "Savings tiers", min: 0, max: 50, step: 1, unit: "%" },
    { key: "tier2Qty", label: "Tier 2: items", type: "slider", group: "Savings tiers", min: 3, max: 10, step: 1, hint: "Set it higher than tier 1" },
    { key: "tier2Off", label: "Tier 2: discount", type: "slider", group: "Savings tiers", min: 0, max: 60, step: 1, unit: "%" },
    { key: "pickedText", label: "Picked label", type: "text", group: "Savings tiers" },
    { key: "offLabel", label: "“off” label", type: "text", group: "Savings tiers" },
    { key: "progressText", label: "Progress text", type: "text", group: "Savings tiers", hint: "Use {{count}} for items to go and {{percent}} for the next discount" },
    { key: "unlockedText", label: "Top tier text", type: "text", group: "Savings tiers", hint: "Use {{percent}} for the top discount" },
    { key: "summaryTitle", label: "Summary title", type: "text", group: "Summary" },
    { key: "emptyText", label: "Empty set text", type: "text", group: "Summary" },
    { key: "totalLabel", label: "Total label", type: "text", group: "Summary" },
    { key: "saveLabel", label: "Savings label", type: "text", group: "Summary" },
    { key: "buttonText", label: "Button text", type: "text", group: "Summary" },
    fontField("Typography"),
    { key: "radius", label: "Corner radius", type: "slider", group: "Layout", min: 0, max: 24, step: 2, unit: "px" },
    { key: "accent", label: "Accent", type: "color", group: "Colors" },
    { key: "pink", label: "Meter & selected tile", type: "color", group: "Colors" },
    { key: "tile", label: "Product tile", type: "color", group: "Colors" },
    { key: "bg", label: "Background", type: "color", group: "Colors" },
    { key: "textColor", label: "Text", type: "color", group: "Colors" },
    { key: "muted", label: "Muted text", type: "color", group: "Colors" },
    { key: "buttonBg", label: "Button", type: "color", group: "Colors" },
    { key: "buttonText2", label: "Button label", type: "color", group: "Colors" },
  ],
};
