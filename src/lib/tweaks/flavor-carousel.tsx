"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { Tweak, TweakConfig } from "../types";
import { str, num, bool, list, fontStack, esc } from "../cfg";
import { fontField } from "../fields";
import { buildSchema, section, fontFaceFor } from "../liquid";
import { money, toNum } from "./product-art";

/* ============================================================
   Flavor Carousel
   Bright flavour cards (each its own colour) topped with a product
   photo that bleeds into the card colour (a drawn can stands in
   when a flavour has no photo), a retro serif flavour name and a
   nutrition chip. A segmented toggle switches product line (chip,
   photo or can style and a line badge change), arrows and swipe
   move the rail, and every card has a quick "Add 12 pack" button.
   ============================================================ */

const EASE = "cubic-bezier(.22,1,.36,1)";
const GAP = 12;

const DISPLAY_FONTS: Record<string, { family: string; italic: boolean; weight: number }> = {
  retro: { family: "Georgia, 'Iowan Old Style', 'Palatino Linotype', serif", italic: true, weight: 700 },
  serif: { family: "Georgia, 'Iowan Old Style', 'Palatino Linotype', serif", italic: false, weight: 700 },
  sans: { family: "ui-sans-serif, system-ui, -apple-system, sans-serif", italic: false, weight: 800 },
  inherit: { family: "inherit", italic: false, weight: 700 },
};

/* The can and the fruit slice are plain SVG strings so the preview and
   the exported Liquid draw exactly the same thing. Colours come from
   CSS variables set on the card: --cb body, --cp label, --ce emblem,
   --deep ink. */
const CAN_SVG = `<svg class="bs-can" viewBox="0 0 120 200" aria-hidden="true">
<ellipse cx="60" cy="193" rx="36" ry="5" fill="rgba(0,0,0,.16)"/>
<rect x="24" y="22" width="72" height="166" rx="14" style="fill:var(--cb);transition:fill .5s ${EASE}"/>
<rect x="27" y="12" width="66" height="14" rx="7" fill="#dcdfdf"/>
<rect x="33" y="14.5" width="54" height="5" rx="2.5" fill="#bfc5c5"/>
<rect x="24" y="180" width="72" height="9" rx="4.5" fill="#c8cdcd"/>
<rect x="32" y="60" width="56" height="88" rx="10" style="fill:var(--cp);transition:fill .5s ${EASE}"/>
<circle cx="60" cy="90" r="15" style="fill:var(--ce);transition:fill .5s ${EASE}"/>
<path d="M60 80c5 4 6 12 0 19-6-7-5-15 0-19z" style="fill:var(--cp);transition:fill .5s ${EASE}" opacity=".9"/>
<rect x="42" y="114" width="36" height="5" rx="2.5" style="fill:var(--deep)"/>
<rect x="47" y="124" width="26" height="3.5" rx="1.75" style="fill:var(--deep)" opacity=".5"/>
<rect x="46" y="134" width="28" height="3.5" rx="1.75" style="fill:var(--deep)" opacity=".3"/>
<rect x="30" y="28" width="6" height="150" rx="3" fill="#fff" opacity=".3"/>
<rect x="84" y="28" width="7" height="150" rx="3.5" fill="#000" opacity=".08"/>
</svg>`;

const SLICE_SVG = `<svg viewBox="0 0 40 40" aria-hidden="true">
<circle cx="20" cy="20" r="19" fill="#fff" opacity=".3"/>
<circle cx="20" cy="20" r="15" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width="1.5"/>
<path d="M20 6v28M7.9 13l24.2 14M7.9 27l24.2-14" stroke="#fff" stroke-opacity=".6" stroke-width="1.5" stroke-linecap="round"/>
</svg>`;

const defaults: TweakConfig = {
  heading: "Find your flavor",
  subheading: "Bright, fizzy and kind to your gut. Every can brings plant fiber and barely any sugar.",
  showToggle: true,
  line1: "Classic",
  line2: "Lite",
  buttonLabel: "Add 12 pack",
  addedLabel: "Added",
  showPrice: true,
  price: "35.99",
  currency: "$",
  flavors: [
    { name: "Strawberry", color: "#F59AA5", image: "/mockups/soda-strawberry.jpg", image2: "", chip: "9g fiber · 4g sugar", chip2: "9g fiber · 1g sugar", tag: "New" },
    { name: "Blood Orange", color: "#FB9108", image: "/mockups/soda-orange.jpg", image2: "", chip: "9g fiber · 5g sugar", chip2: "9g fiber · 2g sugar", tag: "" },
    { name: "Black Cherry", color: "#7A1F2A", image: "/mockups/soda-cherry.jpg", image2: "", chip: "9g fiber · 4g sugar", chip2: "9g fiber · 1g sugar", tag: "Fan fave" },
  ],
  bg: "#FFF6EA",
  textColor: "#034638",
  lightText: "#FFF6EA",
  toggleBg: "#F3E4CD",
  buttonBg: "#034638",
  buttonText: "#FFF6EA",
  addedBg: "#98E1C3",
  tagBg: "#008168",
  canLabel: "#FFF6EA",
  font: "system",
  displayFont: "retro",
  radius: 28,
};

/* ---- colour helpers (mirror Shopify's color_brightness / color_darken) ---- */

const parseHex = (hex: string): [number, number, number] | null => {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

const brightness = (hex: string) => {
  const c = parseHex(hex);
  return c ? (c[0] * 299 + c[1] * 587 + c[2] * 114) / 1000 : 255;
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

function Chevron({ dir }: { dir: -1 | 1 }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {dir < 0 ? <path d="M10 3L5 8l5 5" /> : <path d="M6 3l5 5-5 5" />}
    </svg>
  );
}

const readRail = (el: HTMLElement, count: number) => {
  const first = el.firstElementChild as HTMLElement | null;
  const step = first ? first.offsetWidth + GAP : el.clientWidth;
  const max = el.scrollWidth - el.clientWidth;
  const scroll = max > 2;
  const end = el.scrollLeft >= max - 2;
  return {
    i: !scroll ? 0 : end ? count - 1 : Math.min(count - 1, Math.round(el.scrollLeft / Math.max(1, step))),
    start: el.scrollLeft <= 2,
    end,
    /* false when every card fits: arrows and dots hide */
    scroll,
  };
};

function Preview({ config }: { config: TweakConfig }) {
  const bg = str(config, "bg", "#FFF6EA");
  const ink = str(config, "textColor", "#034638");
  const light = str(config, "lightText", "#FFF6EA");
  const btnBg = str(config, "buttonBg", "#034638");
  const btnFg = str(config, "buttonText", "#FFF6EA");
  const addedBg = str(config, "addedBg", "#98E1C3");
  const tagBg = str(config, "tagBg", "#008168");
  const canLabel = str(config, "canLabel", "#FFF6EA");
  const radius = num(config, "radius", 28);
  const disp = DISPLAY_FONTS[str(config, "displayFont", "retro")] ?? DISPLAY_FONTS.retro;
  const display: CSSProperties = {
    fontFamily: disp.family,
    fontStyle: disp.italic ? "italic" : "normal",
    fontWeight: disp.weight,
    letterSpacing: "-0.02em",
    lineHeight: 0.95,
  };
  const flavors = list(config, "flavors");
  const showToggle = bool(config, "showToggle", true);
  const priceLabel = bool(config, "showPrice", true)
    ? money(toNum(str(config, "price"), 35.99), str(config, "currency", "$"))
    : "";

  const [line, setLine] = useState(0);
  const lite = showToggle && line === 1;
  const [added, setAdded] = useState<number[]>([]);
  const rail = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ i: 0, start: true, end: false, scroll: true });
  const count = flavors.length;

  useEffect(() => {
    const el = rail.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setPos(readRail(el, count)));
    ro.observe(el);
    return () => ro.disconnect();
  }, [count]);

  const onScroll = () => {
    if (rail.current) setPos(readRail(rail.current, count));
  };

  const go = (dir: -1 | 1) => {
    const el = rail.current;
    const first = el?.firstElementChild as HTMLElement | null;
    if (!el || !first) return;
    el.scrollBy({ left: dir * (first.offsetWidth + GAP), behavior: "smooth" });
  };

  const goTo = (i: number) => {
    const el = rail.current;
    const card = el?.children[i] as HTMLElement | undefined;
    const first = el?.firstElementChild as HTMLElement | null;
    if (!el || !card || !first) return;
    el.scrollTo({ left: card.offsetLeft - first.offsetLeft, behavior: "smooth" });
  };

  const toggleAdd = (i: number) =>
    setAdded((a) => (a.includes(i) ? a.filter((x) => x !== i) : [...a, i]));

  return (
    <div
      className="@container w-full"
      style={{ background: bg, color: ink, fontFamily: fontStack(str(config, "font", "system")) }}
    >
      <div className="mx-auto w-full max-w-[1200px] px-5 pb-7 pt-7 @min-[720px]:px-10 @min-[720px]:pb-12 @min-[720px]:pt-12">
        {/* Header */}
        {str(config, "heading") && (
          <h3 className="text-[38px] @min-[720px]:text-[52px]" style={display}>
            {str(config, "heading")}
          </h3>
        )}
        {str(config, "subheading") && (
          <p className="mt-2.5 max-w-[440px] text-[14px] leading-[1.5] opacity-80">{str(config, "subheading")}</p>
        )}

        {/* Controls */}
        <div className="mt-5 flex items-center justify-between gap-3">
          {showToggle ? (
            <div
              role="group"
              className="relative grid grid-cols-2 rounded-full p-1"
              style={{ background: str(config, "toggleBg", "#F3E4CD") }}
            >
              <span
                aria-hidden
                className="absolute bottom-1 left-1 top-1 rounded-full shadow-[0_2px_8px_-2px_rgba(0,0,0,0.25)]"
                style={{
                  width: "calc(50% - 4px)",
                  background: btnBg,
                  transform: `translateX(${line * 100}%)`,
                  transition: `transform 450ms ${EASE}`,
                }}
              />
              {[str(config, "line1"), str(config, "line2")].map((l, i) => (
                <button
                  key={i}
                  type="button"
                  aria-pressed={line === i}
                  onClick={() => setLine(i)}
                  className="relative z-[1] h-9 min-w-[84px] px-4 text-[13px] font-bold transition-colors duration-300"
                  style={{ color: line === i ? btnFg : ink }}
                >
                  {l}
                </button>
              ))}
            </div>
          ) : (
            <span />
          )}
          <div className={`flex gap-2 ${pos.scroll ? "" : "invisible"}`}>
            {([-1, 1] as const).map((d) => {
              const off = d < 0 ? pos.start : pos.end;
              return (
                <button
                  key={d}
                  type="button"
                  aria-label={d < 0 ? "Previous flavor" : "Next flavor"}
                  disabled={off}
                  onClick={() => go(d)}
                  className="grid h-10 w-10 place-items-center rounded-full transition-[background-color,color,opacity,scale] duration-300 active:scale-90 enabled:hover:bg-[var(--ink)] enabled:hover:text-[var(--bg)] disabled:opacity-30"
                  style={{ boxShadow: `inset 0 0 0 1.5px ${ink}`, "--ink": ink, "--bg": bg } as CSSProperties}
                >
                  <Chevron dir={d} />
                </button>
              );
            })}
          </div>
        </div>

        {/* Rail */}
        <div
          ref={rail}
          onScroll={onScroll}
          className="bs-no-scrollbar -mx-5 mt-5 flex snap-x snap-mandatory scroll-px-5 overflow-x-auto px-5 pb-2 pt-1 @min-[720px]:-mx-10 @min-[720px]:scroll-px-10 @min-[720px]:px-10"
          style={{ gap: GAP }}
        >
          {flavors.map((f, i) => {
            const color = parseHex(f.color ?? "") ? (f.color as string) : "#F7913D";
            const onDark = brightness(color) < 140;
            const on = added.includes(i);
            const chip = lite ? f.chip2 || f.chip : f.chip;
            const vars = {
              background: color,
              color: onDark ? light : ink,
              borderRadius: radius,
              "--cb": lite ? canLabel : darken(color, 14),
              "--cp": lite ? color : canLabel,
              "--ce": lite ? canLabel : color,
              "--deep": ink,
            } as CSSProperties;
            const img = (f.image ?? "").trim();
            const img2 = (f.image2 ?? "").trim();
            return (
              <article
                key={i}
                className={`bs-rise group relative flex w-[72%] shrink-0 snap-start flex-col items-center overflow-hidden text-center @min-[520px]:w-[45%] ${
                  /* three or fewer cards fill the row on wide screens */
                  count <= 3 ? "@min-[760px]:w-[calc((100%-24px)/3)]" : "@min-[760px]:w-[31%]"
                }`}
                style={{ ...vars, "--i": i } as CSSProperties}
              >
                {/* Visual: photo bleeding into the card colour, or the drawn can */}
                <div className="relative grid aspect-[4/5] w-full place-items-center overflow-hidden">
                  {img ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={img}
                        alt={f.name ?? ""}
                        loading="lazy"
                        decoding="async"
                        draggable={false}
                        className="absolute inset-0 h-full w-full object-cover transition-[scale] duration-700 group-hover:scale-[1.04]"
                        style={{ transitionTimingFunction: EASE }}
                      />
                      {img2 && (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={img2}
                          alt={lite ? (f.name ?? "") : ""}
                          aria-hidden={!lite}
                          loading="lazy"
                          decoding="async"
                          draggable={false}
                          className="absolute inset-0 h-full w-full object-cover transition-[opacity,scale] duration-500 group-hover:scale-[1.04]"
                          style={{ opacity: lite ? 1 : 0, transitionTimingFunction: EASE }}
                        />
                      )}
                      <span
                        aria-hidden
                        className="absolute inset-x-0 bottom-0 h-[26%]"
                        style={{ background: `linear-gradient(to bottom, ${color}00, ${color})` }}
                      />
                      {lite && str(config, "line2") && (
                        <span
                          className="bs-swap absolute right-3 top-3 rounded-full px-2.5 py-[5px] text-[10px] font-extrabold uppercase leading-none tracking-[0.1em] backdrop-blur-sm"
                          style={{ background: "rgba(255,255,255,.72)", color: ink }}
                        >
                          {str(config, "line2")}
                        </span>
                      )}
                    </>
                  ) : (
                    <>
                      <span
                        className="absolute right-[6%] top-[10%] w-[26%] transition-[rotate,translate] duration-700 group-hover:-translate-y-1 group-hover:rotate-[40deg] [&_svg]:block [&_svg]:w-full"
                        style={{ transitionTimingFunction: EASE }}
                        dangerouslySetInnerHTML={{ __html: SLICE_SVG }}
                      />
                      <span
                        className="absolute bottom-[16%] left-[6%] w-[18%] transition-[rotate,translate] duration-700 group-hover:translate-x-1 group-hover:-rotate-[30deg] [&_svg]:block [&_svg]:w-full"
                        style={{ transitionTimingFunction: EASE }}
                        dangerouslySetInnerHTML={{ __html: SLICE_SVG }}
                      />
                      <span aria-hidden className="absolute left-[22%] top-[24%] h-2 w-2 rounded-full bg-white/40" />
                      <span aria-hidden className="absolute right-[20%] top-[48%] h-1.5 w-1.5 rounded-full bg-white/50" />
                      <span aria-hidden className="absolute bottom-[30%] right-[26%] h-2.5 w-2.5 rounded-full bg-white/30" />
                      <span
                        key={lite ? "l" : "c"}
                        className="absolute inset-x-0 bottom-[9%] top-[15%] flex justify-center transition-[rotate,translate] duration-500 group-hover:-translate-y-1.5 group-hover:-rotate-6 [&_svg]:h-full [&_svg]:w-auto"
                        style={{ transitionTimingFunction: EASE, animation: `bs-swap 420ms ${EASE} both` }}
                        dangerouslySetInnerHTML={{ __html: CAN_SVG }}
                      />
                    </>
                  )}
                  {f.tag && (
                    <span
                      className="absolute left-3 top-3 grid h-[54px] w-[54px] -rotate-12 place-items-center rounded-full px-1 text-center text-[9.5px] font-extrabold uppercase leading-[1.05] tracking-[0.04em] shadow-[0_4px_12px_-4px_rgba(0,0,0,0.3)]"
                      style={{ background: tagBg, color: str(config, "buttonText", "#FFF6EA") }}
                    >
                      {f.tag}
                    </span>
                  )}
                </div>

                {/* Copy */}
                <div className="relative flex w-full flex-1 flex-col items-center px-4 pb-4">
                  <h4 className="-mt-2 text-[27px]" style={display}>
                    {f.name}
                  </h4>
                  {chip && (
                    <span
                      key={lite ? "c2" : "c1"}
                      className="bs-swap mt-2.5 inline-flex rounded-full px-3 py-[5px] text-[11px] font-bold tracking-[0.01em]"
                      style={{ background: "rgba(255,255,255,.6)", color: ink }}
                    >
                      {chip}
                    </span>
                  )}

                  <span aria-hidden className="block h-4 shrink-0" />
                  <button
                    type="button"
                    onClick={() => toggleAdd(i)}
                    aria-pressed={on}
                    className="mt-auto flex h-[46px] w-full shrink-0 items-center justify-center gap-2 rounded-full text-[14px] font-bold transition-[background-color,color,scale] duration-300 hover:brightness-110 active:scale-[0.97]"
                    style={{ background: on ? addedBg : btnBg, color: on ? ink : btnFg, transitionTimingFunction: EASE }}
                  >
                    <span key={on ? "on" : "off"} className="bs-swap inline-flex items-center gap-2">
                      {on ? (
                        <>
                          <svg width="14" height="14" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                            <path d="M2.5 6.3l2.3 2.2 4.7-5" />
                          </svg>
                          {str(config, "addedLabel", "Added")}
                        </>
                      ) : (
                        <>
                          {str(config, "buttonLabel", "Add 12 pack")}
                          {priceLabel && <span className="font-medium opacity-70">· {priceLabel}</span>}
                        </>
                      )}
                    </span>
                  </button>
                </div>
              </article>
            );
          })}
        </div>

        {/* Dots */}
        {count > 1 && (
          <div className={`mt-4 flex justify-center gap-1.5 ${pos.scroll ? "" : "invisible"}`}>
            {flavors.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Go to flavor ${i + 1}`}
                onClick={() => goTo(i)}
                className="h-2 rounded-full transition-[width,background-color] duration-300"
                style={{ width: i === pos.i ? 22 : 8, background: i === pos.i ? ink : parseHex(ink) ? `${ink}33` : "rgba(0,0,0,.2)", transitionTimingFunction: EASE }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------------- Liquid ---------------- */

function generateLiquid(config: TweakConfig): string {
  const { face, family } = fontFaceFor(str(config, "font", "system"));
  const S = ".bs-fc-{{ section.id }}";
  const r = "{{ section.settings.radius }}px";
  const dispKey = str(config, "displayFont", "retro");

  const style = `<style>
${face ? face + "\n" : ""}  ${S} { container-type: inline-size; background: {{ section.settings.bg }}; color: {{ section.settings.text_color }}; font-family: ${family}; }
  ${S} * { box-sizing: border-box; }
  ${S} p, ${S} h2, ${S} h3 { margin: 0; }
  ${S} .bs-wrap { max-width: 1200px; margin: 0 auto; padding: 28px 20px; }
  ${S} .bs-disp { letter-spacing: -.02em; line-height: .95;
    {%- case section.settings.display_font -%}
      {%- when 'serif' %} font-family: Georgia, 'Iowan Old Style', 'Palatino Linotype', serif; font-weight: 700; font-style: normal;
      {%- when 'sans' %} font-family: ui-sans-serif, system-ui, -apple-system, sans-serif; font-weight: 800; font-style: normal;
      {%- when 'inherit' %} font-family: inherit; font-weight: 700; font-style: normal;
      {%- else %} font-family: Georgia, 'Iowan Old Style', 'Palatino Linotype', serif; font-weight: 700; font-style: italic;
    {%- endcase %} }
  ${S} .bs-h { font-size: 38px; }
  ${S} .bs-sub { margin-top: 10px; max-width: 440px; font-size: 14px; line-height: 1.5; opacity: .8; }
  ${S} .bs-bar { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: 20px; }
  ${S} .bs-seg { position: relative; display: grid; grid-template-columns: 1fr 1fr; padding: 4px; border-radius: 99px; background: {{ section.settings.toggle_bg }}; }
  ${S} .bs-seg button { position: relative; z-index: 1; height: 36px; min-width: 84px; padding: 0 16px; border: 0; background: transparent; cursor: pointer;
    font: inherit; font-size: 13px; font-weight: 700; color: {{ section.settings.text_color }}; transition: color .3s; }
  ${S} .bs-seg button[aria-pressed="true"] { color: {{ section.settings.button_text }}; }
  ${S} .bs-pill { position: absolute; top: 4px; bottom: 4px; left: 4px; width: calc(50% - 4px); border-radius: 99px; background: {{ section.settings.button_bg }};
    box-shadow: 0 2px 8px -2px rgba(0,0,0,.25); transition: transform .45s cubic-bezier(.22,1,.36,1); }
  ${S}[data-line="2"] .bs-pill { transform: translateX(100%); }
  ${S} .bs-arrows { display: flex; gap: 8px; margin-left: auto; }
  ${S} .bs-arrow { width: 40px; height: 40px; display: grid; place-items: center; border: 0; border-radius: 99px; cursor: pointer; background: transparent;
    color: {{ section.settings.text_color }}; box-shadow: inset 0 0 0 1.5px {{ section.settings.text_color }}; transition: background-color .3s, color .3s, opacity .3s, transform .2s; }
  ${S} .bs-arrow:hover:not(:disabled) { background: {{ section.settings.text_color }}; color: {{ section.settings.bg }}; }
  ${S} .bs-arrow:active:not(:disabled) { transform: scale(.9); }
  ${S} .bs-arrow:disabled { opacity: .3; cursor: default; }
  ${S} .bs-arrows.is-idle, ${S} .bs-dots.is-idle { visibility: hidden; }
  ${S} .bs-rail { display: flex; gap: ${GAP}px; overflow-x: auto; scroll-snap-type: x mandatory; margin: 20px -20px 0; padding: 4px 20px 8px; scroll-padding: 0 20px;
    scrollbar-width: none; -webkit-overflow-scrolling: touch; }
  ${S} .bs-rail::-webkit-scrollbar { display: none; }
  ${S} .bs-card { --deep: {{ section.settings.text_color }}; --cb: var(--dk); --cp: {{ section.settings.can_label }}; --ce: var(--c);
    position: relative; flex: 0 0 72%; scroll-snap-align: start; display: flex; flex-direction: column; align-items: center; text-align: center;
    overflow: hidden; border-radius: ${r}; background: var(--c); color: {{ section.settings.text_color }}; }
  ${S}[data-line="2"] .bs-card { --cb: {{ section.settings.can_label }}; --cp: var(--c); --ce: {{ section.settings.can_label }}; }
  ${S} .bs-card.is-dark { color: {{ section.settings.light_text }}; }
  ${S} .bs-vis { position: relative; width: 100%; aspect-ratio: 4 / 5; overflow: hidden; }
  ${S} .bs-photo { position: absolute; inset: 0; transition: opacity .5s cubic-bezier(.22,1,.36,1); }
  ${S} .bs-photo img { display: block; width: 100%; height: 100%; object-fit: cover; transition: transform .7s cubic-bezier(.22,1,.36,1); }
  ${S} .bs-card:hover .bs-photo img { transform: scale(1.04); }
  ${S} .bs-photo-2 { opacity: 0; }
  ${S}[data-line="2"] .bs-photo-2 { opacity: 1; }
  ${S} .bs-fade { position: absolute; left: 0; right: 0; bottom: 0; height: 26%; pointer-events: none; background: linear-gradient(to bottom, transparent, var(--c)); }
  ${S} .bs-line { position: absolute; right: 12px; top: 12px; display: none; padding: 5px 10px; border-radius: 99px; font-size: 10px; font-weight: 800; line-height: 1;
    text-transform: uppercase; letter-spacing: .1em; background: rgba(255,255,255,.72); color: {{ section.settings.text_color }}; -webkit-backdrop-filter: blur(4px); backdrop-filter: blur(4px); }
  ${S}[data-line="2"] .bs-line { display: block; }
  ${S} .bs-slice { position: absolute; transition: transform .7s cubic-bezier(.22,1,.36,1); }
  ${S} .bs-slice svg { display: block; width: 100%; height: auto; }
  ${S} .bs-s1 { right: 6%; top: 10%; width: 26%; }
  ${S} .bs-s2 { left: 6%; bottom: 16%; width: 18%; }
  ${S} .bs-card:hover .bs-s1 { transform: translateY(-4px) rotate(40deg); }
  ${S} .bs-card:hover .bs-s2 { transform: translateX(4px) rotate(-30deg); }
  ${S} .bs-bub { position: absolute; border-radius: 99px; background: rgba(255,255,255,.4); }
  ${S} .bs-shot { position: absolute; left: 0; right: 0; top: 15%; bottom: 9%; display: flex; justify-content: center; transition: transform .5s cubic-bezier(.22,1,.36,1); }
  ${S} .bs-card:hover .bs-shot { transform: translateY(-6px) rotate(-6deg); }
  ${S} .bs-shot svg { height: 100%; width: auto; }
  ${S} .bs-tag { position: absolute; left: 12px; top: 12px; width: 54px; height: 54px; display: grid; place-items: center; padding: 0 4px; border-radius: 99px; transform: rotate(-12deg);
    box-shadow: 0 4px 12px -4px rgba(0,0,0,.3);
    font-size: 9.5px; font-weight: 800; line-height: 1.05; text-transform: uppercase; letter-spacing: .04em; text-align: center;
    background: {{ section.settings.tag_bg }}; color: {{ section.settings.button_text }}; }
  ${S} .bs-body { position: relative; width: 100%; flex: 1; display: flex; flex-direction: column; align-items: center; padding: 0 16px 16px; }
  ${S} .bs-name { margin-top: -8px; font-size: 27px; }
  ${S} .bs-chip { margin-top: 10px; display: inline-flex; padding: 5px 12px; border-radius: 99px; font-size: 11px; font-weight: 700; letter-spacing: .01em;
    background: rgba(255,255,255,.6); color: {{ section.settings.text_color }}; }
  ${S} .bs-buy { width: 100%; margin-top: auto; padding-top: 16px; }
  ${S} .bs-buy form { margin: 0; }
  ${S} .bs-add { width: 100%; height: 46px; display: flex; align-items: center; justify-content: center; gap: 8px; border: 0; border-radius: 99px; cursor: pointer;
    font: inherit; font-size: 14px; font-weight: 700; background: {{ section.settings.button_bg }}; color: {{ section.settings.button_text }};
    transition: background-color .3s cubic-bezier(.22,1,.36,1), color .3s, filter .2s, transform .2s; }
  ${S} .bs-add:hover:not(:disabled) { filter: brightness(1.1); }
  ${S} .bs-add:active:not(:disabled) { transform: scale(.97); }
  ${S} .bs-add:disabled:not(.is-added) { opacity: .55; cursor: not-allowed; }
  ${S} .bs-add.is-added { background: {{ section.settings.added_bg }}; color: {{ section.settings.text_color }}; }
  ${S} .bs-add .bs-pr { font-weight: 500; opacity: .7; }
  ${S} .bs-add.is-added .bs-pr { display: none; }
  ${S} .bs-l2 { display: none !important; }
  ${S}[data-line="2"] .bs-l1 { display: none !important; }
  ${S}[data-line="2"] .bs-l2 { display: revert !important; }
  ${S}[data-line="2"] .bs-chip.bs-l2 { display: inline-flex !important; }
  ${S} .bs-dots { display: flex; justify-content: center; gap: 6px; margin-top: 16px; }
  ${S} .bs-dot { width: 8px; height: 8px; padding: 0; border: 0; border-radius: 99px; cursor: pointer; background: {{ section.settings.text_color | color_modify: 'alpha', 0.2 }};
    transition: width .3s cubic-bezier(.22,1,.36,1), background-color .3s; }
  ${S} .bs-dot.is-on { width: 22px; background: {{ section.settings.text_color }}; }
  @container (min-width: 520px) { ${S} .bs-card { flex-basis: 45%; } }
  @container (min-width: 720px) {
    ${S} .bs-wrap { padding: 48px 40px; }
    ${S} .bs-h { font-size: 52px; }
    ${S} .bs-rail { margin: 20px -40px 0; padding: 4px 40px 8px; scroll-padding: 0 40px; }
  }
  @container (min-width: 760px) {
    ${S} .bs-card { flex-basis: 31%; }
    ${S} .bs-rail.is-fit .bs-card { flex-basis: calc((100% - ${GAP * 2}px) / 3); }
  }
  @media (prefers-reduced-motion: reduce) {
    ${S} .bs-shot, ${S} .bs-slice, ${S} .bs-pill, ${S} .bs-photo, ${S} .bs-photo img { transition: none; }
  }
</style>`;

  const chevron = (d: -1 | 1) =>
    `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d < 0 ? "M10 3L5 8l5 5" : "M6 3l5 5-5 5"}"/></svg>`;

  /* add-to-cart form for one product line; v = the Liquid product variable */
  const form = (n: 1 | 2, v: string) => `{%- assign bs_fid = 'bs-fc-' | append: block.id | append: '-${n}' -%}
              {%- if ${v} != blank -%}
                {%- form 'product', ${v}, id: bs_fid -%}
                  <input type="hidden" name="id" value="{{ ${v}.selected_or_first_available_variant.id }}">
                  <input type="hidden" name="quantity" value="1">
                  <button type="submit" name="add" class="bs-add"{% unless ${v}.available %} disabled{% endunless %}>
                    <span data-label>{{ section.settings.button_label }}</span>
                    {%- if section.settings.show_price -%}<span class="bs-pr">· {{ ${v}.price | money }}</span>{%- endif -%}
                  </button>
                {%- endform -%}
              {%- else -%}
                <button type="button" class="bs-add" disabled><span>{{ section.settings.button_label }}</span></button>
              {%- endif -%}`;

  const markup = `{%- comment -%}
  Flavor Carousel by boost.supply. Add one "Flavor" block per flavour and
  pick the product (or 12-pack product) its button should add; the first
  available variant goes to the cart without leaving the page.
  Product line toggle: fill in the second chip and, optionally, a second
  product per flavour (e.g. the Lite version). Leave the second product
  empty to keep adding the first one. Turn the toggle off to hide it.
  Card visuals come from each block's image picker: a 4:5 product photo
  that fills the top of the card (set the card colour to match the photo's
  backdrop so it blends in). Without a photo the drawn can is shown. The
  second image is used while the second product line is selected.
{%- endcomment -%}
<div class="bs-fc-{{ section.id }}" id="bs-fc-{{ section.id }}" data-line="1" data-added="{{ section.settings.added_label | escape }}">
  <div class="bs-wrap">
    {%- if section.settings.heading != blank -%}<h2 class="bs-h bs-disp">{{ section.settings.heading }}</h2>{%- endif -%}
    {%- if section.settings.subheading != blank -%}<p class="bs-sub">{{ section.settings.subheading }}</p>{%- endif -%}

    <div class="bs-bar">
      {%- if section.settings.show_toggle -%}
        <div class="bs-seg" role="group">
          <span class="bs-pill" aria-hidden="true"></span>
          <button type="button" data-line="1" aria-pressed="true">{{ section.settings.line_1_label }}</button>
          <button type="button" data-line="2" aria-pressed="false">{{ section.settings.line_2_label }}</button>
        </div>
      {%- endif -%}
      <div class="bs-arrows" data-arrows>
        <button type="button" class="bs-arrow" data-dir="-1" aria-label="Previous flavor">${chevron(-1)}</button>
        <button type="button" class="bs-arrow" data-dir="1" aria-label="Next flavor">${chevron(1)}</button>
      </div>
    </div>

    <div class="bs-rail{% if section.blocks.size <= 3 %} is-fit{% endif %}" data-rail>
      {%- for block in section.blocks -%}
        {%- assign bs_br = block.settings.color | color_brightness -%}
        <article class="bs-card{% if bs_br < 140 %} is-dark{% endif %}" style="--c: {{ block.settings.color }}; --dk: {{ block.settings.color | color_darken: 14 }};" {{ block.shopify_attributes }}>
          <div class="bs-vis">
            {%- if block.settings.image != blank -%}
              <span class="bs-photo">{{ block.settings.image | image_url: width: 800 | image_tag: loading: 'lazy', alt: block.settings.name, sizes: '(min-width: 990px) 31vw, 72vw' }}</span>
              {%- if block.settings.image_2 != blank -%}
                <span class="bs-photo bs-photo-2">{{ block.settings.image_2 | image_url: width: 800 | image_tag: loading: 'lazy', alt: '', sizes: '(min-width: 990px) 31vw, 72vw' }}</span>
              {%- endif -%}
              <span class="bs-fade" aria-hidden="true"></span>
              {%- if section.settings.show_toggle and section.settings.line_2_label != blank -%}<span class="bs-line" aria-hidden="true">{{ section.settings.line_2_label }}</span>{%- endif -%}
            {%- else -%}
              <span class="bs-slice bs-s1">${SLICE_SVG.replace(/\n/g, "")}</span>
              <span class="bs-slice bs-s2">${SLICE_SVG.replace(/\n/g, "")}</span>
              <span class="bs-bub" style="left:22%;top:24%;width:8px;height:8px" aria-hidden="true"></span>
              <span class="bs-bub" style="right:20%;top:48%;width:6px;height:6px" aria-hidden="true"></span>
              <span class="bs-bub" style="right:26%;bottom:30%;width:10px;height:10px;opacity:.75" aria-hidden="true"></span>
              <span class="bs-shot">${CAN_SVG.replace(/\n/g, "")}</span>
            {%- endif -%}
            {%- if block.settings.tag != blank -%}<span class="bs-tag">{{ block.settings.tag }}</span>{%- endif -%}
          </div>
          <div class="bs-body">
          <h3 class="bs-name bs-disp">{{ block.settings.name }}</h3>
          {%- if block.settings.chip != blank -%}<span class="bs-chip bs-l1">{{ block.settings.chip }}</span>{%- endif -%}
          {%- assign bs_chip2 = block.settings.chip_2 | default: block.settings.chip -%}
          {%- if bs_chip2 != blank -%}<span class="bs-chip bs-l2">{{ bs_chip2 }}</span>{%- endif -%}
          {%- assign bs_p1 = block.settings.product -%}
          {%- assign bs_p2 = block.settings.product_2 -%}
          {%- if section.settings.show_toggle and bs_p2 != blank -%}
            <div class="bs-buy bs-l1">
              ${form(1, "bs_p1")}
            </div>
            <div class="bs-buy bs-l2">
              ${form(2, "bs_p2")}
            </div>
          {%- else -%}
            <div class="bs-buy">
              ${form(1, "bs_p1")}
            </div>
          {%- endif -%}
          </div>
        </article>
      {%- endfor -%}
    </div>

    {%- if section.blocks.size > 1 -%}
      <div class="bs-dots" data-dots>
        {%- for block in section.blocks -%}
          <button type="button" class="bs-dot{% if forloop.first %} is-on{% endif %}" data-to="{{ forloop.index0 }}" aria-label="Go to flavor {{ forloop.index }}"></button>
        {%- endfor -%}
      </div>
    {%- endif -%}
  </div>
</div>
<script>
  (function () {
    var root = document.getElementById('bs-fc-{{ section.id }}');
    if (!root) return;
    var rail = root.querySelector('[data-rail]');
    var cards = rail.querySelectorAll('.bs-card');
    var dots = root.querySelectorAll('.bs-dot');
    var prev = root.querySelector('[data-dir="-1"]');
    var next = root.querySelector('[data-dir="1"]');
    var arrows = root.querySelector('[data-arrows]');
    var dotsWrap = root.querySelector('[data-dots]');
    function step() { return cards[0] ? cards[0].getBoundingClientRect().width + ${GAP} : rail.clientWidth; }
    function sync() {
      var max = rail.scrollWidth - rail.clientWidth;
      var idle = max <= 2;
      var end = rail.scrollLeft >= max - 2;
      var i = idle ? 0 : end ? cards.length - 1 : Math.min(cards.length - 1, Math.round(rail.scrollLeft / step()));
      if (arrows) arrows.classList.toggle('is-idle', idle);
      if (dotsWrap) dotsWrap.classList.toggle('is-idle', idle);
      dots.forEach(function (d, k) { d.classList.toggle('is-on', k === i); });
      if (prev) prev.disabled = rail.scrollLeft <= 2;
      if (next) next.disabled = end;
    }
    [prev, next].forEach(function (b) {
      if (!b) return;
      b.addEventListener('click', function () {
        rail.scrollBy({ left: step() * parseInt(b.getAttribute('data-dir'), 10), behavior: 'smooth' });
      });
    });
    dots.forEach(function (d) {
      d.addEventListener('click', function () {
        var c = cards[parseInt(d.getAttribute('data-to'), 10)];
        if (c) rail.scrollTo({ left: c.offsetLeft - cards[0].offsetLeft, behavior: 'smooth' });
      });
    });
    rail.addEventListener('scroll', sync, { passive: true });
    window.addEventListener('resize', sync);
    sync();

    root.querySelectorAll('.bs-seg button').forEach(function (b) {
      b.addEventListener('click', function () {
        root.setAttribute('data-line', b.getAttribute('data-line'));
        root.querySelectorAll('.bs-seg button').forEach(function (o) {
          o.setAttribute('aria-pressed', o === b ? 'true' : 'false');
        });
      });
    });

    var addedText = root.getAttribute('data-added');
    root.querySelectorAll('form[action]').forEach(function (form) {
      form.addEventListener('submit', function (e) {
        if (!window.fetch || !window.FormData) return;
        e.preventDefault();
        var btn = form.querySelector('.bs-add');
        var label = btn.querySelector('[data-label]');
        var original = label.textContent;
        var base = (window.Shopify && Shopify.routes && Shopify.routes.root) || '/';
        btn.disabled = true;
        fetch(base + 'cart/add.js', { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } })
          .then(function (res) {
            if (!res.ok) throw new Error('add failed');
            btn.classList.add('is-added');
            label.textContent = addedText;
            document.dispatchEvent(new CustomEvent('cart:refresh', { bubbles: true }));
            setTimeout(function () {
              btn.classList.remove('is-added');
              label.textContent = original;
              btn.disabled = false;
            }, 2200);
          })
          .catch(function () { form.submit(); });
      });
    });
  })();
</script>`;

  const flavors = list(config, "flavors");

  const schema = buildSchema({
    name: "Flavor Carousel",
    settings: [
      { type: "text", id: "heading", label: "Heading", default: str(config, "heading") },
      { type: "textarea", id: "subheading", label: "Subheading", default: str(config, "subheading") },
      { type: "header", content: "Product line toggle" },
      { type: "checkbox", id: "show_toggle", label: "Show product line toggle", default: bool(config, "showToggle", true) },
      { type: "text", id: "line_1_label", label: "First line label", default: str(config, "line1") },
      { type: "text", id: "line_2_label", label: "Second line label", default: str(config, "line2") },
      { type: "header", content: "Quick add" },
      { type: "text", id: "button_label", label: "Button text", default: str(config, "buttonLabel") },
      { type: "text", id: "added_label", label: "Added confirmation", default: str(config, "addedLabel") },
      { type: "checkbox", id: "show_price", label: "Show price on the button", default: bool(config, "showPrice", true) },
      { type: "header", content: "Style" },
      {
        type: "select",
        id: "display_font",
        label: "Flavor name font",
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
      { type: "color", id: "toggle_bg", label: "Toggle track", default: str(config, "toggleBg") },
      { type: "color", id: "button_bg", label: "Button", default: str(config, "buttonBg") },
      { type: "color", id: "button_text", label: "Button text", default: str(config, "buttonText") },
      { type: "color", id: "added_bg", label: "Added state", default: str(config, "addedBg") },
      { type: "color", id: "tag_bg", label: "Sticker", default: str(config, "tagBg") },
      { type: "color", id: "can_label", label: "Can label", default: str(config, "canLabel") },
      { type: "range", id: "radius", label: "Card radius", min: 0, max: 40, step: 2, unit: "px", default: Math.max(0, Math.min(40, Math.round(num(config, "radius", 28) / 2) * 2)) },
    ],
    blocks: [
      {
        type: "flavor",
        name: "Flavor",
        settings: [
          { type: "text", id: "name", label: "Flavor name" },
          { type: "color", id: "color", label: "Card colour", default: "#F7913D" },
          { type: "text", id: "tag", label: "Sticker (e.g. New)" },
          { type: "text", id: "chip", label: "Nutrition chip" },
          { type: "product", id: "product", label: "Product for the add button" },
          { type: "image_picker", id: "image", label: "Photo (optional, replaces the drawn can)", info: "A 4:5 photo fills the top of the card. Match the card colour to its backdrop." },
          { type: "header", content: "Second product line" },
          { type: "text", id: "chip_2", label: "Nutrition chip" },
          { type: "product", id: "product_2", label: "Product (leave empty to use the first)" },
          { type: "image_picker", id: "image_2", label: "Photo (optional, leave empty to keep the first)" },
        ],
      },
    ],
    maxBlocks: 12,
    presetBlocks: flavors.map((f) => ({
      type: "flavor",
      settings: {
        name: esc(f.name ?? ""),
        color: parseHex(f.color ?? "") ? (f.color as string) : "#F7913D",
        tag: esc(f.tag ?? ""),
        chip: esc(f.chip ?? ""),
        chip_2: esc(f.chip2 ?? ""),
      },
    })),
  });

  return section({ style, markup, schema });
}

export const flavorCarousel: Tweak = {
  slug: "flavor-carousel",
  inspiredBy: "olipop",
  name: "Flavor Carousel",
  tagline: "Colourful flavour cards with a line toggle, nutrition chips and one-tap 12-pack adds.",
  description:
    "Modeled on the flavour carousel OLIPOP features on its homepage. Every flavour gets its own bright card with a can, a retro serif name and a nutrition chip; a segmented toggle flips between product lines (say Classic and Lite) and updates the chips, cans and add buttons. Arrows, swipe and dots move the rail, and each card adds its 12-pack to the cart in one tap, right from the homepage.",
  category: "homepage",
  tier: "paid",
  price: 39,
  tint: "#e9f5ee",
  Preview,
  generateLiquid,
  defaults,
  fields: [
    { key: "heading", label: "Heading", type: "text", group: "Content" },
    { key: "subheading", label: "Subheading", type: "textarea", group: "Content" },
    { key: "showToggle", label: "Show product line toggle", type: "toggle", group: "Product line toggle" },
    { key: "line1", label: "First line", type: "text", group: "Product line toggle" },
    { key: "line2", label: "Second line", type: "text", group: "Product line toggle" },
    {
      key: "flavors", label: "Flavors", type: "list", group: "Flavors",
      hint: "Colour is a hex code; match it to the photo's backdrop. Leave Image URL empty to show a drawn can. Chip 2 and Image URL 2 show when the second line is selected",
      itemFields: [
        { key: "name", label: "Name", type: "text" },
        { key: "image", label: "Image URL", type: "text" },
        { key: "color", label: "Card colour", type: "text" },
        { key: "chip", label: "Chip", type: "text" },
        { key: "chip2", label: "Chip (second line)", type: "text" },
        { key: "image2", label: "Image URL (second line)", type: "text" },
        { key: "tag", label: "Sticker", type: "text" },
      ],
      newItem: { name: "Berry Hibiscus", color: "#C77DDB", image: "", chip: "9g fiber · 4g sugar", chip2: "9g fiber · 1g sugar", image2: "", tag: "" },
      addLabel: "Add flavor", max: 10,
    },
    { key: "buttonLabel", label: "Button text", type: "text", group: "Quick add" },
    { key: "addedLabel", label: "Added confirmation", type: "text", group: "Quick add" },
    { key: "showPrice", label: "Show price on the button", type: "toggle", group: "Quick add" },
    { key: "price", label: "Preview price", type: "text", group: "Quick add", hint: "Editor preview only; your store shows each product's price" },
    { key: "currency", label: "Currency symbol", type: "text", group: "Quick add" },
    fontField("Typography"),
    {
      key: "displayFont", label: "Flavor name font", type: "select", group: "Typography",
      options: [
        { label: "Retro serif (italic)", value: "retro" },
        { label: "Serif", value: "serif" },
        { label: "Sans", value: "sans" },
        { label: "Theme font", value: "inherit" },
      ],
    },
    { key: "radius", label: "Card radius", type: "slider", group: "Layout", min: 0, max: 40, step: 2, unit: "px" },
    { key: "bg", label: "Background", type: "color", group: "Colors" },
    { key: "textColor", label: "Text", type: "color", group: "Colors" },
    { key: "lightText", label: "Text on dark cards", type: "color", group: "Colors" },
    { key: "toggleBg", label: "Toggle track", type: "color", group: "Colors" },
    { key: "buttonBg", label: "Button", type: "color", group: "Colors" },
    { key: "buttonText", label: "Button text", type: "color", group: "Colors" },
    { key: "addedBg", label: "Added state", type: "color", group: "Colors" },
    { key: "tagBg", label: "Sticker", type: "color", group: "Colors" },
    { key: "canLabel", label: "Can label", type: "color", group: "Colors" },
  ],
};
