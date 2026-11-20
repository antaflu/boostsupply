"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import type { Tweak, TweakConfig } from "../types";
import { str, num, bool, list, fontStack, esc } from "../cfg";
import { fontField } from "../fields";
import { buildSchema, section, fontFaceFor } from "../liquid";
import { money, toNum } from "./product-art";

/* ============================================================
   Intimates PDP
   A compact, complete product page in one section. Left: a
   photo gallery (thumbnails on desktop, swipe with dots on
   mobile). Right: title, price, colour swatches that jump the
   gallery to that colour, size chips, add to bag, a "how it
   fits" meter, and accordions for details, fabric and returns.
   ============================================================ */

const EASE = "cubic-bezier(.22,1,.36,1)";

const defaults: TweakConfig = {
  title: "Second Skin",
  styleName: "Scoop neck bralette",
  lowercaseStyle: true,
  price: "52",
  currency: "$",
  showRating: true,
  rating: "4.8",
  reviewCount: "1,284",
  shades: [
    { name: "Clay", hex: "#C9A68C", image: "/mockups/ladder-bra-nude.jpg" },
    { name: "Cocoa", hex: "#6F4C3E", image: "/mockups/ladder-bra-cocoa.jpg" },
    { name: "Onyx", hex: "#1F1D1C", image: "/mockups/ladder-bra-black.jpg" },
    { name: "Bone", hex: "#EDE6DB", image: "/mockups/ladder-bra-white.jpg" },
  ],
  selectedShade: 1,
  sizes: "XS, S, M, L, XL, 2X",
  soldOut: "2X",
  selectedSize: "M",
  colorLabel: "Color",
  sizeLabel: "Size",
  sizeGuideText: "Size guide",
  buttonText: "Add to bag",
  selectSizeText: "Select a size",
  soldOutText: "Sold out",
  addedText: "Added to bag",
  perks: "Free shipping over $75 · Free 30-day returns",
  fitLabel: "How it fits",
  fitValue: 50,
  fitLow: "Runs small",
  fitMid: "True to size",
  fitHigh: "Runs large",
  fitNote: "Most reviewers say it fits true to size. Between sizes? Go up one.",
  accordions: [
    { title: "Details", text: "An unlined, wire-free scoop bralette with a wide band that lies flat under everything. Pulls on, no hooks, no slipping straps." },
    { title: "Fabric & care", text: "78% nylon, 22% elastane in a brushed, second-skin knit. Machine wash cold in a mesh bag and lay flat to dry." },
    { title: "Shipping & returns", text: "Free standard shipping on orders over $75. Free returns and exchanges within 30 days, unworn with tags on." },
  ],
  openFirst: true,
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
  return 0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255) > 200;
};

const csv = (s: string) =>
  String(s ?? "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);

const hexOk = (h: string) => (/^#[0-9a-f]{6}$/i.test(h ?? "") ? h : "#D9D2C8");

const STAR = "M12 2.8l2.8 6 6.5.6-4.9 4.4 1.4 6.4L12 16.9l-5.8 3.3 1.4-6.4-4.9-4.4 6.5-.6z";

function Stars({ value, on, off }: { value: number; on: string; off: string }) {
  return (
    <span className="relative inline-flex" aria-hidden>
      <span className="flex gap-[1px]" style={{ color: off }}>
        {Array.from({ length: 5 }, (_, i) => (
          <svg key={i} width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
            <path d={STAR} />
          </svg>
        ))}
      </span>
      <span className="absolute inset-y-0 left-0 flex gap-[1px] overflow-hidden" style={{ color: on, width: `${(Math.max(0, Math.min(5, value)) / 5) * 100}%` }}>
        {Array.from({ length: 5 }, (_, i) => (
          <svg key={i} width="11" height="11" viewBox="0 0 24 24" fill="currentColor" className="shrink-0">
            <path d={STAR} />
          </svg>
        ))}
      </span>
    </span>
  );
}

function Preview({ config }: { config: TweakConfig }) {
  const text = str(config, "textColor", "#2D2A26");
  const accent = str(config, "accent", "#986B58");
  const soft = str(config, "soft", "#B69A81");
  const line = str(config, "line", "#E8E0D5");
  const tile = str(config, "tile", "#E8E0D5");
  const bg = str(config, "bg", "#F7F4F0");
  const radius = num(config, "radius", 4);
  const chipR = Math.min(radius, 6);
  const cur = str(config, "currency", "$");
  const shades = list(config, "shades");
  const sizes = csv(str(config, "sizes"));
  const out = csv(str(config, "soldOut")).map((x) => x.toLowerCase());
  const accs = list(config, "accordions");
  const price = toNum(str(config, "price"));

  /* gallery = every shade that has a photo, in order */
  const slides = shades.map((s, i) => ({ src: (s.image ?? "").trim(), shade: i, name: s.name ?? "" })).filter((x) => x.src);

  const initShade = Math.max(0, Math.min(num(config, "selectedShade", 1) - 1, shades.length - 1));
  const initSize = sizes.indexOf(str(config, "selectedSize").trim());
  const openFirst = bool(config, "openFirst", true);
  const [prev, setPrev] = useState({ initShade, initSize, openFirst });
  const [shade, setShade] = useState(initShade);
  const [size, setSize] = useState(initSize);
  const [open, setOpen] = useState(openFirst ? 0 : -1);
  const [active, setActive] = useState(() => Math.max(0, slides.findIndex((x) => x.shade === initShade)));
  const [added, setAdded] = useState(false);
  if (prev.initShade !== initShade || prev.initSize !== initSize || prev.openFirst !== openFirst) {
    setPrev({ initShade, initSize, openFirst });
    setShade(initShade);
    setSize(initSize);
    setOpen(openFirst ? 0 : -1);
  }

  const track = useRef<HTMLDivElement>(null);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const goTo = useCallback((i: number, smooth = true) => {
    const el = track.current;
    if (!el) return;
    el.scrollTo({ left: i * el.clientWidth, behavior: smooth ? "smooth" : "auto" });
  }, []);
  const onScroll = () => {
    const el = track.current;
    if (!el || !el.clientWidth) return;
    setActive(Math.max(0, Math.min(slides.length - 1, Math.round(el.scrollLeft / el.clientWidth))));
  };

  /* open on the selected shade's photo, and follow the editor's shade control */
  useEffect(() => {
    const i = slides.findIndex((x) => x.shade === initShade);
    if (i >= 0) goTo(i, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initShade, goTo]);

  const si = Math.max(0, Math.min(shade, shades.length - 1));
  const sz = size >= 0 && size < sizes.length ? size : -1;
  const sizeOut = sz >= 0 && out.includes(sizes[sz].toLowerCase());

  const pickShade = (i: number) => {
    setShade(i);
    setAdded(false);
    const k = slides.findIndex((x) => x.shade === i);
    if (k >= 0) goTo(k);
  };
  const add = () => {
    if (sz < 0 || sizeOut) return;
    setAdded(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setAdded(false), 1800);
  };

  const label = "text-[10.5px] font-medium uppercase leading-none tracking-[0.025em]";
  const styleCase: CSSProperties["textTransform"] = bool(config, "lowercaseStyle", true) ? "lowercase" : "none";
  const fit = Math.max(0, Math.min(100, num(config, "fitValue", 50)));
  const fitZone = fit < 35 ? 0 : fit > 65 ? 2 : 1;
  const rating = toNum(str(config, "rating"));
  const n = sizes.length;

  return (
    <div
      className="@container w-full"
      style={{ background: bg, color: text, fontFamily: fontStack(str(config, "font", "system")), ["--r" as string]: `${radius}px` }}
    >
      <div className="mx-auto grid w-full max-w-[1120px] @min-[640px]:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] @min-[640px]:items-start @min-[640px]:gap-10 @min-[640px]:p-8 @min-[880px]:p-10">
        {/* ---- Gallery ---- */}
        <div className="min-w-0 @min-[640px]:sticky @min-[640px]:top-6 @min-[640px]:grid @min-[640px]:grid-cols-[52px_minmax(0,1fr)] @min-[640px]:gap-3 @min-[880px]:grid-cols-[60px_minmax(0,1fr)]">
          <div className="hidden flex-col gap-2 @min-[640px]:flex">
            {slides.map((s, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Photo ${i + 1}: ${s.name}`}
                aria-current={i === active}
                onClick={() => goTo(i)}
                className="relative aspect-[4/5] overflow-hidden transition-[opacity,box-shadow] duration-300"
                style={{ borderRadius: chipR, background: tile, opacity: i === active ? 1 : 0.62, boxShadow: i === active ? `0 0 0 1px ${bg}, 0 0 0 2px ${text}` : "none" }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={s.src} alt="" loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover" />
              </button>
            ))}
          </div>
          <div className="relative min-w-0 overflow-hidden @min-[640px]:rounded-[var(--r)]" style={{ background: tile }}>
            <div ref={track} onScroll={onScroll} className="bs-no-scrollbar flex snap-x snap-mandatory overflow-x-auto">
              {slides.length ? (
                slides.map((s, i) => (
                  <div key={i} className="relative aspect-[4/5] w-full shrink-0 snap-start snap-always">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={s.src} alt={`${str(config, "title")} in ${s.name}`} loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover" />
                  </div>
                ))
              ) : (
                <div className="grid aspect-[4/5] w-full shrink-0 place-items-center">
                  <span className="aspect-square w-[34%] rounded-full" style={{ background: hexOk(shades[si]?.hex ?? "") }} />
                </div>
              )}
            </div>
            {slides.length > 1 && (
              <>
                <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center gap-1.5 @min-[640px]:hidden">
                  {slides.map((_, i) => (
                    <span
                      key={i}
                      className="h-[5px] rounded-full transition-[width,background-color] duration-500"
                      style={{ width: i === active ? 16 : 5, background: i === active ? text : tint(text, 0.25), transitionTimingFunction: EASE }}
                    />
                  ))}
                </div>
                <span
                  className={`absolute bottom-3 left-3 hidden px-2 py-[6px] tabular-nums @min-[640px]:block ${label}`}
                  style={{ background: tint(bg, 0.88), borderRadius: chipR, fontSize: 9.5, backdropFilter: "blur(8px)" }}
                >
                  {active + 1} / {slides.length}
                </span>
              </>
            )}
          </div>
        </div>

        {/* ---- Info ---- */}
        <div className="@container/box min-w-0 px-5 pb-8 pt-6 @min-[640px]:px-0 @min-[640px]:pb-0 @min-[640px]:pt-1">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h3 className="text-[16px] font-medium uppercase leading-tight tracking-[0.025em] @min-[640px]:text-[18px]">{str(config, "title")}</h3>
              {str(config, "styleName") && (
                <p className="mt-1 text-[14px] leading-snug" style={{ textTransform: styleCase, color: tint(text, 0.78) }}>
                  {str(config, "styleName")}
                </p>
              )}
            </div>
            <p className="shrink-0 pt-px text-[15px] tabular-nums">{money(price, cur)}</p>
          </div>
          {bool(config, "showRating", true) && rating > 0 && (
            <p className="mt-2.5 flex items-center gap-2 text-[11.5px] tabular-nums" style={{ color: tint(text, 0.7) }}>
              <Stars value={rating} on={text} off={tint(soft, 0.4)} />
              {rating.toFixed(1)}
              {str(config, "reviewCount") && <span style={{ color: tint(text, 0.5) }}>({str(config, "reviewCount")})</span>}
            </p>
          )}

          {/* colour */}
          <div className="mt-6 border-t pt-5" style={{ borderColor: line }}>
            <p className="flex items-baseline gap-2">
              <span className={label}>{str(config, "colorLabel")}</span>
              <span key={si} className="bs-swap text-[13px]" style={{ color: tint(text, 0.75) }}>
                {shades[si]?.name}
              </span>
            </p>
            <div className="mt-3 flex flex-wrap gap-2.5">
              {shades.map((s, i) => {
                const on = i === si;
                const hex = hexOk(s.hex);
                return (
                  <button
                    key={i}
                    type="button"
                    aria-label={s.name}
                    aria-pressed={on}
                    title={s.name}
                    onClick={() => pickShade(i)}
                    className="group/sw grid h-[30px] w-[30px] place-items-center rounded-full transition-[box-shadow,scale] duration-300 active:scale-95"
                    style={{ boxShadow: on ? `0 0 0 2px ${bg}, 0 0 0 3px ${text}` : "none", transitionTimingFunction: EASE }}
                  >
                    <span
                      className="h-full w-full rounded-full transition-[scale] duration-300 group-hover/sw:scale-[.9]"
                      style={{ background: hex, boxShadow: isLight(hex) ? `inset 0 0 0 1px ${tint(soft, 0.5)}` : `inset 0 0 0 1px ${tint(text, 0.06)}`, transitionTimingFunction: EASE }}
                    />
                  </button>
                );
              })}
            </div>
          </div>

          {/* size */}
          <div className="mt-6">
            <div className="flex items-baseline justify-between gap-3">
              <p className="flex items-baseline gap-2">
                <span className={label}>{str(config, "sizeLabel")}</span>
                {sz >= 0 && (
                  <span key={sizes[sz]} className="bs-swap text-[13px]" style={{ color: tint(text, 0.75) }}>
                    {sizes[sz]}
                  </span>
                )}
              </p>
              {str(config, "sizeGuideText") && (
                <span className={`border-b pb-0.5 ${label}`} style={{ borderColor: tint(text, 0.5), fontSize: 9.5 }}>
                  {str(config, "sizeGuideText")}
                </span>
              )}
            </div>
            <div
              role="radiogroup"
              className="mt-3 grid grid-cols-[repeat(var(--h),minmax(0,1fr))] gap-1.5 @min-[360px]/box:grid-cols-[repeat(var(--n),minmax(0,1fr))]"
              style={{ ["--n" as string]: n <= 8 ? n : Math.ceil(n / 2), ["--h" as string]: n <= 4 ? n : Math.ceil(n / 2) }}
            >
              {sizes.map((v, i) => {
                const on = i === sz;
                const isOut = out.includes(v.toLowerCase());
                return (
                  <button
                    key={v + i}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    aria-label={isOut ? `${v}, ${str(config, "soldOutText")}` : v}
                    onClick={() => {
                      setSize(i);
                      setAdded(false);
                    }}
                    className="relative grid h-10 place-items-center overflow-hidden text-[12px] uppercase tabular-nums tracking-[0.025em] transition-[background-color,color,box-shadow,scale] duration-300 hover:shadow-[inset_0_0_0_1px_currentColor] active:scale-[.96]"
                    style={{
                      borderRadius: chipR,
                      background: on && !isOut ? text : "transparent",
                      color: on && !isOut ? bg : isOut ? tint(text, 0.38) : text,
                      boxShadow: `inset 0 0 0 1px ${on ? text : tint(soft, 0.45)}`,
                      transitionTimingFunction: EASE,
                    }}
                  >
                    {isOut && (
                      <span
                        aria-hidden
                        className="absolute inset-0"
                        style={{ background: `linear-gradient(to top right, transparent calc(50% - .5px), ${tint(soft, 0.55)} calc(50% - .5px), ${tint(soft, 0.55)} calc(50% + .5px), transparent calc(50% + .5px))` }}
                      />
                    )}
                    <span className="relative">{v}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* add to bag */}
          <button
            type="button"
            onClick={add}
            aria-disabled={sz < 0 || sizeOut}
            className="mt-5 flex h-12 w-full items-center justify-center gap-2 text-[11.5px] font-medium uppercase tracking-[0.06em] transition-[filter,scale,opacity] duration-300 hover:brightness-125 active:scale-[.99]"
            style={{ background: text, color: bg, borderRadius: chipR, opacity: sz < 0 || sizeOut ? 0.5 : 1, transitionTimingFunction: EASE }}
          >
            <span key={added ? "a" : sz < 0 ? "s" : sizeOut ? "o" : "b"} className="bs-swap inline-flex items-center gap-2">
              {added ? (
                <>
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M3 8.5l3.2 3L13 4.5" />
                  </svg>
                  {str(config, "addedText")}
                </>
              ) : sz < 0 ? (
                str(config, "selectSizeText")
              ) : sizeOut ? (
                str(config, "soldOutText")
              ) : (
                <>
                  {str(config, "buttonText")}
                  <span aria-hidden>—</span>
                  <span className="tabular-nums">{money(price, cur)}</span>
                </>
              )}
            </span>
          </button>
          {str(config, "perks") && (
            <p className="mt-2.5 text-center text-[11.5px]" style={{ color: tint(text, 0.6) }}>
              {str(config, "perks")}
            </p>
          )}

          {/* how it fits */}
          <div className="mt-6 p-4" style={{ background: tint(tile, 0.55), borderRadius: chipR }}>
            <p className={label}>{str(config, "fitLabel")}</p>
            <div className="relative mx-[5px] mt-4 h-[10px]">
              <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2" style={{ background: tint(soft, 0.6) }} />
              {[0, 25, 50, 75, 100].map((p) => (
                <span key={p} className="absolute top-1/2 h-[7px] w-px -translate-x-1/2 -translate-y-1/2" style={{ left: `${p}%`, background: tint(soft, 0.8) }} />
              ))}
              <span
                className="absolute top-1/2 h-[10px] w-[10px] -translate-x-1/2 -translate-y-1/2 rounded-full transition-[left] duration-700"
                style={{ left: `${fit}%`, background: text, boxShadow: `0 0 0 3px ${tint(tile, 0.9)}`, transitionTimingFunction: EASE }}
              />
            </div>
            <div className="mt-2.5 grid grid-cols-3 text-[11px]">
              {[str(config, "fitLow"), str(config, "fitMid"), str(config, "fitHigh")].map((t, i) => (
                <span
                  key={i}
                  className={i === 0 ? "text-left" : i === 1 ? "text-center" : "text-right"}
                  style={{ color: i === fitZone ? accent : tint(text, 0.5), fontWeight: i === fitZone ? 500 : 400 }}
                >
                  {t}
                </span>
              ))}
            </div>
            {str(config, "fitNote") && (
              <p className="mt-3 border-t pt-3 text-[12px] leading-relaxed" style={{ borderColor: tint(soft, 0.3), color: tint(text, 0.72) }}>
                {str(config, "fitNote")}
              </p>
            )}
          </div>

          {/* accordions */}
          <div className="mt-6 border-t" style={{ borderColor: line }}>
            {accs.map((a, i) => {
              const on = open === i;
              return (
                <div key={i} className="border-b" style={{ borderColor: line }}>
                  <button
                    type="button"
                    aria-expanded={on}
                    onClick={() => setOpen(on ? -1 : i)}
                    className={`flex w-full items-center justify-between gap-3 py-4 text-left ${label}`}
                    style={{ fontSize: 11 }}
                  >
                    {a.title}
                    <span className="relative h-[10px] w-[10px] shrink-0" aria-hidden>
                      <span className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2" style={{ background: "currentColor" }} />
                      <span
                        className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 transition-[rotate] duration-500"
                        style={{ background: "currentColor", rotate: on ? "90deg" : "0deg", transitionTimingFunction: EASE }}
                      />
                    </span>
                  </button>
                  <div className="grid transition-[grid-template-rows] duration-500" style={{ gridTemplateRows: on ? "1fr" : "0fr", transitionTimingFunction: EASE }}>
                    <div className="overflow-hidden">
                      <p className="pb-4 pr-6 text-[12.5px] leading-relaxed" style={{ color: tint(text, 0.72) }}>
                        {a.text}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function generateLiquid(config: TweakConfig): string {
  const { face, family } = fontFaceFor(str(config, "font", "system"));
  const S = ".bs-pi-{{ section.id }}";
  const cr = "{{ section.settings.radius | at_most: 6 }}px";
  const lbl = "font-size: 10.5px; font-weight: 500; line-height: 1; text-transform: uppercase; letter-spacing: .025em;";
  const fitValue = Math.max(0, Math.min(100, Math.round(num(config, "fitValue", 50) / 5) * 5));

  const style = `<style>
${face ? face + "\n" : ""}  ${S} { container-type: inline-size; background: {{ section.settings.bg }}; color: {{ section.settings.text_color }}; font-family: ${family}; interpolate-size: allow-keywords; }
  ${S} * { box-sizing: border-box; }
  ${S} p, ${S} h1, ${S} h2 { margin: 0; }
  ${S} a { color: inherit; }
  ${S} .bs-in { max-width: 1120px; margin: 0 auto; display: grid; }
  ${S} .bs-lbl { ${lbl} }
  ${S} .bs-gal { min-width: 0; }
  ${S} .bs-thumbs { display: none; }
  ${S} .bs-main { position: relative; min-width: 0; overflow: hidden; background: {{ section.settings.tile }}; }
  ${S} .bs-track { display: flex; overflow-x: auto; scroll-snap-type: x mandatory; scrollbar-width: none; -webkit-overflow-scrolling: touch; }
  ${S} .bs-track::-webkit-scrollbar { display: none; }
  ${S} .bs-slide { position: relative; flex: 0 0 100%; aspect-ratio: 4 / 5; scroll-snap-align: start; scroll-snap-stop: always; }
  ${S} .bs-slide img, ${S} .bs-slide .bs-ph { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
  ${S} .bs-slide .bs-ph { fill: {{ section.settings.soft }}; }
  ${S} .bs-dots { position: absolute; left: 0; right: 0; bottom: 12px; display: flex; justify-content: center; gap: 6px; pointer-events: none; }
  ${S} .bs-dots i { width: 5px; height: 5px; border-radius: 99px; background: color-mix(in srgb, {{ section.settings.text_color }} 25%, transparent);
    transition: width .5s cubic-bezier(.22,1,.36,1), background-color .5s; }
  ${S} .bs-dots i.is-on { width: 16px; background: {{ section.settings.text_color }}; }
  ${S} .bs-count { position: absolute; left: 12px; bottom: 12px; display: none; padding: 6px 8px; border-radius: ${cr}; font-size: 9.5px; font-variant-numeric: tabular-nums;
    background: color-mix(in srgb, {{ section.settings.bg }} 88%, transparent); -webkit-backdrop-filter: blur(8px); backdrop-filter: blur(8px); }
  ${S} .bs-thumb { position: relative; display: block; width: 100%; aspect-ratio: 4 / 5; padding: 0; border: 0; overflow: hidden; cursor: pointer; border-radius: ${cr};
    background: {{ section.settings.tile }}; opacity: .62; transition: opacity .3s, box-shadow .3s; }
  ${S} .bs-thumb img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
  ${S} .bs-thumb:hover { opacity: .85; }
  ${S} .bs-thumb.is-on { opacity: 1; box-shadow: 0 0 0 1px {{ section.settings.bg }}, 0 0 0 2px {{ section.settings.text_color }}; }
  ${S} .bs-info { min-width: 0; padding: 24px 20px 32px; container-type: inline-size; }
  ${S} .bs-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
  ${S} .bs-title { font-size: 16px; font-weight: 500; line-height: 1.25; text-transform: uppercase; letter-spacing: .025em; }
  ${S} .bs-style { margin-top: 4px; font-size: 14px; line-height: 1.35; opacity: .78; }
  ${S} .bs-style.is-lower { text-transform: lowercase; }
  ${S} .bs-price { flex-shrink: 0; padding-top: 1px; font-size: 15px; font-variant-numeric: tabular-nums; text-align: right; }
  ${S} .bs-price s { display: block; font-size: 12.5px; color: {{ section.settings.soft }}; }
  ${S} .bs-price s:empty { display: none; }
  ${S} .bs-price.is-sale [data-price] { color: {{ section.settings.accent }}; }
  ${S} .bs-rating { margin-top: 10px; display: flex; align-items: center; gap: 8px; font-size: 11.5px; font-variant-numeric: tabular-nums; opacity: .8; }
  ${S} .bs-stars { position: relative; display: inline-flex; gap: 1px; color: color-mix(in srgb, {{ section.settings.soft }} 40%, transparent); }
  ${S} .bs-stars > span { position: absolute; inset: 0 auto 0 0; display: flex; gap: 1px; overflow: hidden; color: {{ section.settings.text_color }}; }
  ${S} .bs-stars svg { flex-shrink: 0; }
  ${S} .bs-opt { margin-top: 24px; }
  ${S} .bs-opt.is-first { padding-top: 20px; border-top: 1px solid {{ section.settings.line }}; }
  ${S} .bs-row { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; }
  ${S} .bs-row p { display: flex; align-items: baseline; gap: 8px; }
  ${S} .bs-val { font-size: 13px; opacity: .75; }
  ${S} .bs-guide { padding-bottom: 2px; border-bottom: 1px solid currentColor; font-size: 9.5px; text-decoration: none; opacity: .8; }
  ${S} .bs-sws { margin-top: 12px; display: flex; flex-wrap: wrap; gap: 10px; }
  ${S} .bs-sw { position: relative; min-width: 30px; height: 30px; border-radius: 99px; cursor: pointer; display: grid; place-items: center;
    transition: box-shadow .3s cubic-bezier(.22,1,.36,1), transform .2s; }
  ${S} .bs-sw input, ${S} .bs-chip input { position: absolute; opacity: 0; pointer-events: none; }
  ${S} .bs-sw > span { width: 30px; height: 30px; border-radius: 99px; background: var(--c) center / cover; box-shadow: inset 0 0 0 1px rgba(0,0,0,.08);
    transition: transform .3s cubic-bezier(.22,1,.36,1); }
  ${S} .bs-sw > span.is-text { width: auto; padding: 0 12px; display: grid; place-items: center; font-size: 12px; background: transparent;
    box-shadow: inset 0 0 0 1px color-mix(in srgb, {{ section.settings.soft }} 45%, transparent); }
  ${S} .bs-sw:hover > span { transform: scale(.9); }
  ${S} .bs-sw:hover > span.is-text { transform: none; box-shadow: inset 0 0 0 1px currentColor; }
  ${S} .bs-sw:active { transform: scale(.95); }
  ${S} .bs-sw:has(input:checked) { box-shadow: 0 0 0 2px {{ section.settings.bg }}, 0 0 0 3px {{ section.settings.text_color }}; }
  ${S} .bs-sw:has(input:focus-visible) { outline: 2px solid {{ section.settings.text_color }}; outline-offset: 4px; }
  ${S} .bs-chips { margin-top: 12px; display: grid; grid-template-columns: repeat(var(--h), minmax(0, 1fr)); gap: 6px; }
  @container (min-width: 360px) { ${S} .bs-chips { grid-template-columns: repeat(var(--n), minmax(0, 1fr)); } }
  ${S} .bs-chip { position: relative; height: 40px; display: grid; place-items: center; overflow: hidden; cursor: pointer; border-radius: ${cr};
    font-size: 12px; text-transform: uppercase; letter-spacing: .025em; font-variant-numeric: tabular-nums;
    box-shadow: inset 0 0 0 1px color-mix(in srgb, {{ section.settings.soft }} 45%, transparent); transition: background-color .3s, color .3s, box-shadow .3s, transform .2s; }
  ${S} .bs-chip span { position: relative; }
  ${S} .bs-chip:hover { box-shadow: inset 0 0 0 1px currentColor; }
  ${S} .bs-chip:active { transform: scale(.96); }
  ${S} .bs-chip.is-out { color: color-mix(in srgb, {{ section.settings.text_color }} 38%, transparent);
    background: linear-gradient(to top right, transparent calc(50% - .5px), color-mix(in srgb, {{ section.settings.soft }} 55%, transparent) calc(50% - .5px), color-mix(in srgb, {{ section.settings.soft }} 55%, transparent) calc(50% + .5px), transparent calc(50% + .5px)); }
  ${S} .bs-chip:has(input:checked) { box-shadow: inset 0 0 0 1px {{ section.settings.text_color }}; }
  ${S} .bs-chip:not(.is-out):has(input:checked) { background: {{ section.settings.text_color }}; color: {{ section.settings.bg }}; }
  ${S} .bs-chip:has(input:focus-visible) { outline: 2px solid {{ section.settings.text_color }}; outline-offset: 2px; }
  ${S} .bs-form { margin: 20px 0 0; }
  ${S} .bs-atc { width: 100%; height: 48px; border: 0; border-radius: ${cr}; cursor: pointer; font: inherit; display: flex; align-items: center; justify-content: center; gap: 8px;
    font-size: 11.5px; font-weight: 500; text-transform: uppercase; letter-spacing: .06em;
    background: {{ section.settings.text_color }}; color: {{ section.settings.bg }}; transition: filter .3s, transform .2s, opacity .3s; }
  ${S} .bs-atc:hover:not(:disabled) { filter: brightness(1.25); }
  ${S} .bs-atc:active:not(:disabled) { transform: scale(.99); }
  ${S} .bs-atc:disabled { opacity: .5; cursor: not-allowed; }
  ${S} .bs-perks { margin-top: 10px; text-align: center; font-size: 11.5px; opacity: .6; }
  ${S} .bs-fit { margin-top: 24px; padding: 16px; border-radius: ${cr}; background: color-mix(in srgb, {{ section.settings.tile }} 55%, transparent); }
  ${S} .bs-meter { position: relative; height: 10px; margin: 16px 5px 0; }
  ${S} .bs-meter::before { content: ""; position: absolute; left: 0; right: 0; top: 50%; height: 1px; transform: translateY(-50%); background: color-mix(in srgb, {{ section.settings.soft }} 60%, transparent); }
  ${S} .bs-meter i { position: absolute; top: 50%; width: 1px; height: 7px; transform: translate(-50%, -50%); background: color-mix(in srgb, {{ section.settings.soft }} 80%, transparent); }
  ${S} .bs-meter b { position: absolute; top: 50%; width: 10px; height: 10px; border-radius: 99px; transform: translate(-50%, -50%);
    background: {{ section.settings.text_color }}; box-shadow: 0 0 0 3px color-mix(in srgb, {{ section.settings.tile }} 90%, transparent); }
  ${S} .bs-scale { margin-top: 10px; display: grid; grid-template-columns: repeat(3, 1fr); font-size: 11px; }
  ${S} .bs-scale span { opacity: .5; }
  ${S} .bs-scale span:nth-child(2) { text-align: center; }
  ${S} .bs-scale span:nth-child(3) { text-align: right; }
  ${S} .bs-scale span.is-on { opacity: 1; font-weight: 500; color: {{ section.settings.accent }}; }
  ${S} .bs-fit-note { margin-top: 12px; padding-top: 12px; border-top: 1px solid color-mix(in srgb, {{ section.settings.soft }} 30%, transparent); font-size: 12px; line-height: 1.6; opacity: .75; }
  ${S} .bs-accs { margin-top: 24px; border-top: 1px solid {{ section.settings.line }}; }
  ${S} .bs-acc { border-bottom: 1px solid {{ section.settings.line }}; }
  ${S} .bs-acc summary { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 16px 0; cursor: pointer; list-style: none; ${lbl} font-size: 11px; }
  ${S} .bs-acc summary::-webkit-details-marker { display: none; }
  ${S} .bs-pm { position: relative; width: 10px; height: 10px; flex-shrink: 0; }
  ${S} .bs-pm::before, ${S} .bs-pm::after { content: ""; position: absolute; background: currentColor; transition: transform .5s cubic-bezier(.22,1,.36,1); }
  ${S} .bs-pm::before { left: 0; right: 0; top: 50%; height: 1px; transform: translateY(-50%); }
  ${S} .bs-pm::after { top: 0; bottom: 0; left: 50%; width: 1px; transform: translateX(-50%); }
  ${S} .bs-acc[open] .bs-pm::after { transform: translateX(-50%) rotate(90deg); }
  ${S} .bs-acc::details-content { block-size: 0; overflow: hidden; transition: block-size .5s cubic-bezier(.22,1,.36,1), content-visibility .5s allow-discrete; }
  ${S} .bs-acc[open]::details-content { block-size: auto; }
  ${S} .bs-acc-x { padding: 0 24px 16px 0; font-size: 12.5px; line-height: 1.65; opacity: .75; }
  @container (min-width: 640px) {
    ${S} .bs-in { grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr); align-items: start; gap: 40px; padding: 32px; }
    ${S} .bs-gal { display: grid; grid-template-columns: 52px minmax(0, 1fr); gap: 12px; align-items: start; position: sticky; top: 24px; }
    ${S} .bs-thumbs { display: flex; flex-direction: column; gap: 8px; }
    ${S} .bs-main { border-radius: {{ section.settings.radius }}px; }
    ${S} .bs-dots { display: none; }
    ${S} .bs-count { display: block; }
    ${S} .bs-info { padding: 4px 0 0; }
    ${S} .bs-title { font-size: 18px; }
  }
  @container (min-width: 880px) {
    ${S} .bs-in { padding: 40px; }
    ${S} .bs-gal { grid-template-columns: 60px minmax(0, 1fr); }
  }
  @media (prefers-reduced-motion: reduce) { ${S} * { transition-duration: 1ms !important; } }
</style>`;

  const markup = `{%- comment -%}
  Intimates PDP by boost.supply. Add it to your product template in place of
  the default product section.
  Setup:
  - The gallery shows the product's images. Give each colour's variants their
    own image and picking a colour jumps the gallery to it.
  - Set "Colour option name" and "Size option name" to the exact option names
    on your product. Colour swatches use the swatch colours (or images) you set
    on your product options; values without one show as a text pill.
  - Stars show when your reviews app fills the standard reviews.rating and
    reviews.rating_count product metafields.
  - Add one "Accordion" block per panel (details, fabric & care, returns...).
{%- endcomment -%}
{%- liquid
  assign bs_p = product
  if section.settings.product != blank
    assign bs_p = section.settings.product
  endif
-%}
{%- if bs_p != blank -%}
{%- liquid
  assign bs_v = bs_p.selected_or_first_available_variant
  assign bs_shade_key = section.settings.color_option | downcase | strip
  assign bs_size_key = section.settings.size_option | downcase | strip
  assign bs_shade = nil
  assign bs_size = nil
  assign bs_hi = -1
  assign bs_si = -1
  for bs_o in bs_p.options_with_values
    assign bs_on = bs_o.name | downcase | strip
    if bs_on == bs_shade_key
      assign bs_shade = bs_o
      assign bs_hi = bs_o.position | minus: 1
    endif
    if bs_on == bs_size_key
      assign bs_size = bs_o
      assign bs_si = bs_o.position | minus: 1
    endif
  endfor
  assign bs_cur_shade = ''
  if bs_hi > -1
    assign bs_cur_shade = bs_v.options[bs_hi]
  endif
  # Only preselect a size when the URL names a variant (or there is one size)
  assign bs_cur_size = ''
  if bs_si > -1
    if bs_p.selected_variant != blank or bs_size.values.size == 1
      assign bs_cur_size = bs_v.options[bs_si]
    endif
  endif
  assign bs_imgs = 0
  for bs_m in bs_p.media
    if bs_m.media_type == 'image'
      assign bs_imgs = bs_imgs | plus: 1
    endif
  endfor
  assign bs_start = bs_v.featured_media.id
-%}
<div class="bs-pi-{{ section.id }}" id="bs-pi-{{ section.id }}" data-hi="{{ bs_hi }}" data-si="{{ bs_si }}" data-start="{{ bs_start }}">
  <div class="bs-in">
    <div class="bs-gal">
      {%- if bs_imgs > 1 -%}
        <div class="bs-thumbs">
          {%- for bs_m in bs_p.media -%}
            {%- if bs_m.media_type == 'image' -%}
              <button type="button" class="bs-thumb{% if forloop.first %} is-on{% endif %}" data-thumb aria-label="{{ bs_m.alt | default: bs_p.title | escape }}">
                {{ bs_m | image_url: width: 160 | image_tag: loading: 'lazy', alt: '' }}
              </button>
            {%- endif -%}
          {%- endfor -%}
        </div>
      {%- endif -%}
      <div class="bs-main">
        <div class="bs-track" data-track>
          {%- for bs_m in bs_p.media -%}
            {%- if bs_m.media_type == 'image' -%}
              <div class="bs-slide" data-media-id="{{ bs_m.id }}">
                {%- if forloop.first -%}
                  {{ bs_m | image_url: width: 1400 | image_tag: loading: 'eager', fetchpriority: 'high', alt: bs_m.alt, sizes: '(min-width: 990px) 560px, 100vw' }}
                {%- else -%}
                  {{ bs_m | image_url: width: 1400 | image_tag: loading: 'lazy', alt: bs_m.alt, sizes: '(min-width: 990px) 560px, 100vw' }}
                {%- endif -%}
              </div>
            {%- endif -%}
          {%- else -%}
            <div class="bs-slide">{{ 'product-apparel-1' | placeholder_svg_tag: 'bs-ph' }}</div>
          {%- endfor -%}
        </div>
        {%- if bs_imgs > 1 -%}
          <div class="bs-dots" aria-hidden="true">{%- for bs_d in (1..bs_imgs) -%}<i{% if forloop.first %} class="is-on"{% endif %}></i>{%- endfor -%}</div>
          <span class="bs-lbl bs-count" aria-hidden="true"><span data-count>1</span> / {{ bs_imgs }}</span>
        {%- endif -%}
      </div>
    </div>

    <div class="bs-info">
      <div class="bs-top">
        <div style="min-width:0">
          <h1 class="bs-title">{{ bs_p.title }}</h1>
          {%- assign bs_style = section.settings.style_name | default: bs_p.type -%}
          {%- if bs_style != blank -%}<p class="bs-style{% if section.settings.lowercase_style %} is-lower{% endif %}">{{ bs_style }}</p>{%- endif -%}
        </div>
        <p class="bs-price{% if bs_v.compare_at_price > bs_v.price %} is-sale{% endif %}" data-price-row>
          <s data-cmp>{%- if bs_v.compare_at_price > bs_v.price -%}{{ bs_v.compare_at_price | money }}{%- endif -%}</s>
          <span data-price>{{ bs_v.price | money }}</span>
        </p>
      </div>
      {%- assign bs_rating = bs_p.metafields.reviews.rating.value -%}
      {%- if section.settings.show_rating and bs_rating != blank -%}
        {%- assign bs_pct = bs_rating.rating | times: 100.0 | divided_by: bs_rating.scale_max -%}
        <p class="bs-rating">
          <span class="bs-stars" aria-hidden="true">
            {%- for bs_i in (1..5) -%}<svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="${STAR}"/></svg>{%- endfor -%}
            <span style="width: {{ bs_pct }}%;">{%- for bs_i in (1..5) -%}<svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="${STAR}"/></svg>{%- endfor -%}</span>
          </span>
          {{ bs_rating.rating | round: 1 }}
          {%- if bs_p.metafields.reviews.rating_count != blank -%}<span style="opacity:.65">({{ bs_p.metafields.reviews.rating_count.value }})</span>{%- endif -%}
        </p>
      {%- endif -%}

      {%- if bs_shade -%}
        <div class="bs-opt is-first">
          <p class="bs-lbl" style="display:flex;align-items:baseline;gap:8px">{{ section.settings.color_label }} <span class="bs-val" data-shade-name style="text-transform:none;letter-spacing:0;font-weight:400">{{ bs_cur_shade }}</span></p>
          <div class="bs-sws" role="radiogroup" aria-label="{{ section.settings.color_label | escape }}">
            {%- for bs_val in bs_shade.values -%}
              {%- capture bs_name -%}{{ bs_val }}{%- endcapture -%}
              <label class="bs-sw" title="{{ bs_name | escape }}">
                <input type="radio" name="bs-pi-shade-{{ section.id }}" value="{{ bs_name | escape }}" data-shade{% if bs_name == bs_cur_shade %} checked{% endif %}>
                {%- if bs_val.swatch.image -%}
                  <span style="--c: url('{{ bs_val.swatch.image | image_url: width: 80 }}');"></span>
                {%- elsif bs_val.swatch.color -%}
                  <span style="--c: {{ bs_val.swatch.color }};"></span>
                {%- else -%}
                  <span class="is-text">{{ bs_name }}</span>
                {%- endif -%}
              </label>
            {%- endfor -%}
          </div>
        </div>
      {%- endif -%}

      {%- if bs_size -%}
        {%- liquid
          assign bs_n = bs_size.values.size
          assign bs_h = bs_n
          if bs_n > 4
            assign bs_h = bs_n | plus: 1 | divided_by: 2
          endif
          assign bs_n2 = bs_n
          if bs_n > 8
            assign bs_n2 = bs_h
          endif
        -%}
        <div class="bs-opt{% unless bs_shade %} is-first{% endunless %}">
          <div class="bs-row">
            <p><span class="bs-lbl">{{ section.settings.size_label }}</span> <span class="bs-val" data-size-name>{{ bs_cur_size }}</span></p>
            {%- if section.settings.size_guide_url != blank -%}<a class="bs-lbl bs-guide" href="{{ section.settings.size_guide_url }}">{{ section.settings.size_guide_text }}</a>{%- endif -%}
          </div>
          <div class="bs-chips" style="--n: {{ bs_n2 }}; --h: {{ bs_h }};" role="radiogroup" aria-label="{{ section.settings.size_label | escape }}">
            {%- for bs_val in bs_size.values -%}
              {%- capture bs_name -%}{{ bs_val }}{%- endcapture -%}
              {%- assign bs_av = false -%}
              {%- for bs_var in bs_p.variants -%}
                {%- if bs_var.options[bs_si] == bs_name and bs_var.available -%}
                  {%- if bs_hi < 0 -%}
                    {%- assign bs_av = true -%}
                  {%- elsif bs_var.options[bs_hi] == bs_cur_shade -%}
                    {%- assign bs_av = true -%}
                  {%- endif -%}
                {%- endif -%}
              {%- endfor -%}
              <label class="bs-chip{% unless bs_av %} is-out{% endunless %}">
                <input type="radio" name="bs-pi-size-{{ section.id }}" value="{{ bs_name | escape }}" data-size{% if bs_name == bs_cur_size %} checked{% endif %}>
                <span>{{ bs_name }}</span>
              </label>
            {%- endfor -%}
          </div>
        </div>
      {%- endif -%}

      {%- form 'product', bs_p, class: 'bs-form' -%}
        <input type="hidden" name="id" value="{{ bs_v.id }}" data-id>
        <button type="submit" name="add" class="bs-atc" data-atc{% if bs_si > -1 and bs_cur_size == blank %} disabled{% endif %}{% unless bs_v.available %} disabled{% endunless %}>
          <span data-atc-label>
            {%- if bs_si > -1 and bs_cur_size == blank -%}{{ section.settings.select_size_text }}
            {%- elsif bs_v.available -%}{{ section.settings.button_text }} — {{ bs_v.price | money }}
            {%- else -%}{{ section.settings.sold_out_text }}{%- endif -%}
          </span>
        </button>
      {%- endform -%}
      {%- if section.settings.perks != blank -%}<p class="bs-perks">{{ section.settings.perks }}</p>{%- endif -%}

      {%- if section.settings.show_fit -%}
        {%- liquid
          assign bs_fv = section.settings.fit_value
          assign bs_zone = 1
          if bs_fv < 35
            assign bs_zone = 0
          elsif bs_fv > 65
            assign bs_zone = 2
          endif
        -%}
        <div class="bs-fit">
          <p class="bs-lbl">{{ section.settings.fit_label }}</p>
          <div class="bs-meter" role="img" aria-label="{{ section.settings.fit_label | escape }}: {{ section.settings.fit_mid | escape }}">
            <i style="left:0%"></i><i style="left:25%"></i><i style="left:50%"></i><i style="left:75%"></i><i style="left:100%"></i>
            <b style="left: {{ bs_fv }}%;"></b>
          </div>
          <div class="bs-scale">
            <span{% if bs_zone == 0 %} class="is-on"{% endif %}>{{ section.settings.fit_low }}</span>
            <span{% if bs_zone == 1 %} class="is-on"{% endif %}>{{ section.settings.fit_mid }}</span>
            <span{% if bs_zone == 2 %} class="is-on"{% endif %}>{{ section.settings.fit_high }}</span>
          </div>
          {%- if section.settings.fit_note != blank -%}<p class="bs-fit-note">{{ section.settings.fit_note }}</p>{%- endif -%}
        </div>
      {%- endif -%}

      {%- if section.blocks.size > 0 -%}
        <div class="bs-accs">
          {%- for block in section.blocks -%}
            <details class="bs-acc"{% if forloop.first and section.settings.open_first %} open{% endif %} {{ block.shopify_attributes }}>
              <summary>{{ block.settings.title }}<span class="bs-pm" aria-hidden="true"></span></summary>
              <div class="bs-acc-x">{{ block.settings.text | newline_to_br }}</div>
            </details>
          {%- endfor -%}
        </div>
      {%- endif -%}
    </div>
  </div>
  <script type="application/json" data-variants>{{ bs_p.variants | json }}</script>
</div>
<script>
  (function () {
    var root = document.getElementById('bs-pi-{{ section.id }}');
    if (!root) return;
    function $(s) { return root.querySelector(s); }
    function all(s) { return Array.prototype.slice.call(root.querySelectorAll(s)); }
    var variants = [];
    try { variants = JSON.parse($('[data-variants]').textContent); } catch (e) { return; }
    var hi = parseInt(root.getAttribute('data-hi'), 10), si = parseInt(root.getAttribute('data-si'), 10);
    var T = { add: {{ section.settings.button_text | json }}, pick: {{ section.settings.select_size_text | json }}, out: {{ section.settings.sold_out_text | json }} };
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

    /* gallery: swipe track, thumbnails, dots and counter stay in sync */
    var track = $('[data-track]'), slides = all('.bs-slide'), thumbs = all('[data-thumb]'), dots = all('.bs-dots i'), count = $('[data-count]');
    function goTo(i, smooth) { track.scrollTo({ left: i * track.clientWidth, behavior: smooth === false ? 'auto' : 'smooth' }); }
    function sync() {
      var i = track.clientWidth ? Math.round(track.scrollLeft / track.clientWidth) : 0;
      thumbs.forEach(function (el, k) { el.classList.toggle('is-on', k === i); });
      dots.forEach(function (el, k) { el.classList.toggle('is-on', k === i); });
      if (count) count.textContent = i + 1;
    }
    function showMedia(id, smooth) {
      for (var k = 0; k < slides.length; k++) {
        if (String(slides[k].getAttribute('data-media-id')) === String(id)) { goTo(k, smooth); return; }
      }
    }
    thumbs.forEach(function (el, k) { el.addEventListener('click', function () { goTo(k); }); });
    track.addEventListener('scroll', function () { window.requestAnimationFrame(sync); }, { passive: true });
    var start = root.getAttribute('data-start');
    if (start) showMedia(start, false);

    /* variant picking */
    function picked(sel) { var el = $(sel + ':checked'); return el ? el.value : null; }
    function fits(v, shade, size) {
      return (hi < 0 || shade === null || v.options[hi] === shade) && (si < 0 || size === null || v.options[si] === size);
    }
    function find(shade, size, avail) {
      for (var i = 0; i < variants.length; i++) {
        if (fits(variants[i], shade, size) && (!avail || variants[i].available)) return variants[i];
      }
      return null;
    }
    var lastShade = picked('[data-shade]');
    function update() {
      var shade = picked('[data-shade]'), size = picked('[data-size]');
      var sn = $('[data-shade-name]'); if (sn) sn.textContent = shade || '';
      var zn = $('[data-size-name]'); if (zn) zn.textContent = size || '';
      all('[data-size]').forEach(function (el) { el.parentNode.classList.toggle('is-out', !find(shade, el.value, true)); });
      var match = size !== null || si < 0 ? find(shade, size, false) : null;
      var show = match || find(shade, null, true) || find(shade, null, false);
      if (show) {
        var sale = show.compare_at_price > show.price;
        $('[data-price-row]').classList.toggle('is-sale', sale);
        $('[data-price]').textContent = money(show.price);
        $('[data-cmp]').textContent = sale ? money(show.compare_at_price) : '';
        if (shade !== lastShade && show.featured_media) showMedia(show.featured_media.id, true);
      }
      lastShade = shade;
      var atc = $('[data-atc]'), label = $('[data-atc-label]');
      if (si > -1 && size === null) { atc.disabled = true; label.textContent = T.pick; return; }
      if (!match) { atc.disabled = true; label.textContent = T.out; return; }
      $('[data-id]').value = match.id;
      atc.disabled = !match.available;
      label.textContent = match.available ? T.add + ' — ' + money(match.price) : T.out;
      if (window.history && window.URL) {
        var u = new URL(window.location.href);
        u.searchParams.set('variant', match.id);
        window.history.replaceState(window.history.state, '', u.toString());
      }
    }
    all('[data-shade], [data-size]').forEach(function (el) { el.addEventListener('change', update); });
    update();
  })();
</script>
{%- else -%}
<p style="padding:24px;text-align:center;opacity:.6">Add this section to a product template, or pick a product in its settings.</p>
{%- endif -%}`;

  const accs = list(config, "accordions");

  const schema = buildSchema({
    name: "Intimates PDP",
    settings: [
      { type: "product", id: "product", label: "Product", info: "Leave empty on a product template to use that product" },
      { type: "text", id: "style_name", label: "Style name", default: str(config, "styleName") },
      { type: "checkbox", id: "lowercase_style", label: "Lowercase style name", default: bool(config, "lowercaseStyle", true) },
      { type: "checkbox", id: "show_rating", label: "Show star rating", default: bool(config, "showRating", true) },
      { type: "header", content: "Options" },
      { type: "text", id: "color_option", label: "Colour option name", default: "Color" },
      { type: "text", id: "color_label", label: "Colour label", default: str(config, "colorLabel") },
      { type: "text", id: "size_option", label: "Size option name", default: "Size" },
      { type: "text", id: "size_label", label: "Size label", default: str(config, "sizeLabel") },
      { type: "text", id: "size_guide_text", label: "Size guide link text", default: str(config, "sizeGuideText") },
      { type: "url", id: "size_guide_url", label: "Size guide link" },
      { type: "header", content: "Add to bag" },
      { type: "text", id: "button_text", label: "Button text", default: str(config, "buttonText") },
      { type: "text", id: "select_size_text", label: "No size picked", default: str(config, "selectSizeText") },
      { type: "text", id: "sold_out_text", label: "Sold out", default: str(config, "soldOutText") },
      { type: "text", id: "perks", label: "Line under the button", default: str(config, "perks") },
      { type: "header", content: "How it fits" },
      { type: "checkbox", id: "show_fit", label: "Show fit meter", default: true },
      { type: "text", id: "fit_label", label: "Label", default: str(config, "fitLabel") },
      { type: "range", id: "fit_value", label: "Fit (0 runs small, 100 runs large)", min: 0, max: 100, step: 5, default: fitValue },
      { type: "text", id: "fit_low", label: "Left label", default: str(config, "fitLow") },
      { type: "text", id: "fit_mid", label: "Middle label", default: str(config, "fitMid") },
      { type: "text", id: "fit_high", label: "Right label", default: str(config, "fitHigh") },
      { type: "text", id: "fit_note", label: "Note", default: str(config, "fitNote") },
      { type: "header", content: "Accordions" },
      { type: "checkbox", id: "open_first", label: "Open the first panel", default: bool(config, "openFirst", true) },
      { type: "header", content: "Style" },
      { type: "color", id: "text_color", label: "Text & button", default: str(config, "textColor") },
      { type: "color", id: "accent", label: "Accent (sale price, fit label)", default: str(config, "accent") },
      { type: "color", id: "soft", label: "Soft (borders, meter)", default: str(config, "soft") },
      { type: "color", id: "line", label: "Lines", default: str(config, "line") },
      { type: "color", id: "tile", label: "Image & panel background", default: str(config, "tile") },
      { type: "color", id: "bg", label: "Background", default: str(config, "bg") },
      { type: "range", id: "radius", label: "Corner radius", min: 0, max: 20, step: 2, unit: "px", default: Math.max(0, Math.min(20, Math.round(num(config, "radius", 4) / 2) * 2)) },
    ],
    blocks: [
      {
        type: "accordion",
        name: "Accordion",
        settings: [
          { type: "text", id: "title", label: "Title", default: "Details" },
          { type: "textarea", id: "text", label: "Text" },
        ],
      },
    ],
    maxBlocks: 8,
    presetBlocks: accs.slice(0, 8).map((a) => ({
      type: "accordion",
      settings: { title: esc(a.title ?? ""), text: esc(a.text ?? "") },
    })),
  });

  return section({ style, markup, schema });
}

export const pdpIntimates: Tweak = {
  slug: "pdp-intimates",
  inspiredBy: "skims",
  name: "Intimates PDP",
  tagline: "A focused product page: swipe gallery, colour and size, a fit meter and tidy accordions.",
  description:
    "Modeled on the product pages SKIMS uses for its intimates. One section gives you a complete page: a photo gallery with thumbnails on desktop and swipe with dots on mobile, a caps title with a lowercase style name, colour swatches that jump the gallery to that colour, size chips with sold-out sizes struck through, add to bag, a \"how it fits\" meter from runs small to runs large, and accordions for details, fabric and care, and shipping and returns. In Shopify it uses your product media, your real colour and size options with their swatches, a standard product form and one block per accordion.",
  category: "product-page",
  tier: "free",
  tint: "#f3eee8",
  Preview,
  generateLiquid,
  defaults,
  fields: [
    { key: "title", label: "Product title", type: "text", group: "Product", hint: "Preview only, with the price and rating. Your store shows the real product" },
    { key: "styleName", label: "Style name", type: "text", group: "Product" },
    { key: "lowercaseStyle", label: "Lowercase style name", type: "toggle", group: "Product" },
    { key: "price", label: "Price", type: "text", group: "Product" },
    { key: "currency", label: "Currency symbol", type: "text", group: "Product" },
    { key: "showRating", label: "Show star rating", type: "toggle", group: "Product" },
    { key: "rating", label: "Rating", type: "text", group: "Product" },
    { key: "reviewCount", label: "Review count", type: "text", group: "Product" },
    {
      key: "shades", label: "Colours & gallery", type: "list", group: "Gallery",
      hint: "Each colour with a photo adds a gallery slide, and picking the colour jumps to it. Swatch is a hex colour. In Shopify the gallery is your product media and the swatches come from your colour option",
      itemFields: [
        { key: "name", label: "Colour", type: "text" },
        { key: "hex", label: "Swatch", type: "text" },
        { key: "image", label: "Image URL", type: "text" },
      ],
      newItem: { name: "Sand", hex: "#D8C3A5", image: "/mockups/ladder-bra-nude.jpg" },
      addLabel: "Add colour",
      max: 10,
    },
    { key: "selectedShade", label: "Selected colour", type: "slider", group: "Gallery", min: 1, max: 10, step: 1, hint: "Preview only. In your store it starts on the selected variant" },
    { key: "colorLabel", label: "Colour label", type: "text", group: "Options" },
    { key: "sizes", label: "Sizes", type: "text", group: "Options", hint: "Comma separated. In Shopify these come from your size option" },
    { key: "soldOut", label: "Sold out sizes", type: "text", group: "Options", hint: "Preview only. In your store this follows variant stock" },
    { key: "selectedSize", label: "Selected size", type: "text", group: "Options", hint: "Preview only. Leave empty to show the \"select a size\" state" },
    { key: "sizeLabel", label: "Size label", type: "text", group: "Options" },
    { key: "sizeGuideText", label: "Size guide link text", type: "text", group: "Options" },
    { key: "buttonText", label: "Button text", type: "text", group: "Add to bag" },
    { key: "selectSizeText", label: "No size picked", type: "text", group: "Add to bag" },
    { key: "soldOutText", label: "Sold out", type: "text", group: "Add to bag" },
    { key: "addedText", label: "Added text", type: "text", group: "Add to bag", hint: "Preview only. In your store the theme's cart opens" },
    { key: "perks", label: "Line under the button", type: "text", group: "Add to bag" },
    { key: "fitLabel", label: "Label", type: "text", group: "How it fits" },
    { key: "fitValue", label: "Fit", type: "slider", group: "How it fits", min: 0, max: 100, step: 5, hint: "0 runs small, 50 true to size, 100 runs large" },
    { key: "fitLow", label: "Left label", type: "text", group: "How it fits" },
    { key: "fitMid", label: "Middle label", type: "text", group: "How it fits" },
    { key: "fitHigh", label: "Right label", type: "text", group: "How it fits" },
    { key: "fitNote", label: "Note", type: "textarea", group: "How it fits" },
    {
      key: "accordions", label: "Accordions", type: "list", group: "Accordions",
      itemFields: [
        { key: "title", label: "Title", type: "text" },
        { key: "text", label: "Text", type: "textarea" },
      ],
      newItem: { title: "Sustainability", text: "Made in a certified facility with recycled packaging." },
      addLabel: "Add panel",
      max: 8,
    },
    { key: "openFirst", label: "Open the first panel", type: "toggle", group: "Accordions" },
    { key: "radius", label: "Corner radius", type: "slider", group: "Layout", min: 0, max: 20, step: 2, unit: "px" },
    fontField("Typography"),
    { key: "textColor", label: "Text & button", type: "color", group: "Colors" },
    { key: "accent", label: "Accent", type: "color", group: "Colors" },
    { key: "soft", label: "Soft", type: "color", group: "Colors" },
    { key: "line", label: "Lines", type: "color", group: "Colors" },
    { key: "tile", label: "Image & panel background", type: "color", group: "Colors" },
    { key: "bg", label: "Background", type: "color", group: "Colors" },
  ],
};
