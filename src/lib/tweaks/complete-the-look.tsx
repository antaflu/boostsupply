"use client";

import { useEffect, useState, type CSSProperties } from "react";
import type { Tweak, TweakConfig } from "../types";
import { str, num, bool, list, fontStack } from "../cfg";
import { fontField } from "../fields";
import { buildSchema, section, fontFaceFor } from "../liquid";
import { ProductArt, money, toNum } from "./product-art";

/* ============================================================
   Complete The Look
   A shoppable outfit: one big in-action photo with pulsing,
   numbered hotspots that open a product popover, next to a list
   of every piece in the outfit with checkboxes, a live total and
   one "add outfit to bag" button. Pieces without a hotspot (an
   accessory that isn't in the shot) still sit in the list.
   ============================================================ */

const EASE = "cubic-bezier(.22,1,.36,1)";

const defaults: TweakConfig = {
  eyebrow: "Shop the look",
  heading: "Complete the look",
  subheading: "Everything in the shot, sized and ready. Untick what you already own.",
  image: "/mockups/fit-leggings.jpg",
  tag: "Tap the dots",
  currency: "$",
  items: [
    { name: "Sculpt Training Bra", type: "Sports bra · Medium support", price: "32", compare: "", x: "66", y: "27", image: "/mockups/fit-leggings.jpg", focus: "66% 24%", zoom: "2.6" },
    { name: "Arc Sculpt Leggings", type: "Seamless leggings · High rise", price: "48", compare: "56", x: "45", y: "60", image: "/mockups/fit-leggings.jpg", focus: "48% 52%", zoom: "1.8" },
    { name: "Insulated Bottle", type: "750 ml · Cold for 24 hours", price: "24", compare: "", x: "", y: "", image: "", focus: "", zoom: "" },
  ],
  piecesLabel: "pieces",
  totalLabel: "Outfit total",
  buttonText: "Add outfit to bag",
  addedText: "Outfit added",
  inLookText: "In your outfit",
  addText: "Add to outfit",
  viewText: "View product",
  notShownText: "Not pictured",
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

type Piece = {
  name: string;
  type: string;
  price: number;
  compare: number;
  spot: { x: number; y: number } | null;
  image: string;
  focus: string;
  zoom: number;
};

/** Product thumbnail: a zoomed crop of the photo, or a drawn bottle when empty. */
function Thumb({ p, w, h, tile, radius }: { p: Piece; w: number; h: number; tile: string; radius: number }) {
  return (
    <span className="relative block shrink-0 overflow-hidden" style={{ width: w, height: h, borderRadius: radius, background: tile }}>
      {p.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={p.image}
          alt=""
          loading="lazy"
          decoding="async"
          draggable={false}
          className="absolute inset-0 h-full w-full object-cover"
          style={{ objectPosition: p.focus, transformOrigin: p.focus, transform: `scale(${p.zoom})` }}
        />
      ) : (
        <span className="absolute inset-0 grid place-items-center">
          <ProductArt kind="bottle" tone="#DC0428" tile="transparent" size={Math.min(w, h) * 0.95} radius={0} />
        </span>
      )}
    </span>
  );
}

function Check({ on, color, bg, track }: { on: boolean; color: string; bg: string; track: string }) {
  return (
    <span
      aria-hidden
      className="grid h-5 w-5 shrink-0 place-items-center rounded-[4px] transition-[background-color,box-shadow] duration-200"
      style={{ background: on ? color : bg, boxShadow: on ? "none" : `inset 0 0 0 1.5px ${track}` }}
    >
      <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke={bg} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: on ? 1 : 0, transform: on ? "none" : "scale(.4)", transition: `opacity 160ms, transform 360ms cubic-bezier(.34,1.56,.64,1)` }}>
        <path d="M2.5 6.3l2.3 2.2 4.7-5" />
      </svg>
    </span>
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

  const pieces: Piece[] = list(config, "items").map((it) => {
    const hasSpot = (it.x ?? "").trim() !== "" && (it.y ?? "").trim() !== "";
    return {
      name: it.name ?? "",
      type: it.type ?? "",
      price: toNum(it.price),
      compare: toNum(it.compare),
      spot: hasSpot ? { x: clamp(toNum(it.x, 50), 4, 96), y: clamp(toNum(it.y, 50), 4, 96) } : null,
      image: (it.image ?? "").trim(),
      focus: (it.focus ?? "").trim() || "50% 50%",
      zoom: clamp(toNum(it.zoom, 1), 1, 4),
    };
  });

  const countKey = pieces.length;
  const [prevCount, setPrevCount] = useState(countKey);
  const [off, setOff] = useState<number[]>([]);
  const [open, setOpen] = useState<number | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const [added, setAdded] = useState(false);
  if (countKey !== prevCount) {
    setPrevCount(countKey);
    setOff([]);
    setOpen(null);
  }

  useEffect(() => {
    if (!added) return;
    const t = setTimeout(() => setAdded(false), 1700);
    return () => clearTimeout(t);
  }, [added]);

  const isOn = (i: number) => !off.includes(i);
  const toggle = (i: number) => setOff((o) => (o.includes(i) ? o.filter((x) => x !== i) : [...o, i]));
  const chosen = pieces.map((_, i) => i).filter(isOn);
  const total = chosen.reduce((s, i) => s + pieces[i].price, 0);
  const full = chosen.reduce((s, i) => s + Math.max(pieces[i].price, pieces[i].compare), 0);
  const image = str(config, "image").trim();

  /* spot numbers only count pieces that have a hotspot */
  const spotNo: (number | null)[] = [];
  let n = 0;
  pieces.forEach((p) => spotNo.push(p.spot ? ++n : null));

  return (
    <div
      className="@container w-full"
      style={{ background: bg, color: text, fontFamily: fontStack(str(config, "font", "system")) }}
    >
      <div className="mx-auto grid w-full max-w-[1100px] gap-5 pb-6 @min-[640px]:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] @min-[640px]:gap-9 @min-[640px]:px-8 @min-[640px]:py-9">
        {/* Photo + hotspots */}
        <div
          className="relative aspect-[4/5] overflow-hidden @min-[640px]:rounded-[var(--r)]"
          style={{ background: text, "--r": `${radius + 2}px` } as CSSProperties}
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(null);
          }}
        >
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={image}
              alt=""
              loading="lazy"
              decoding="async"
              draggable={false}
              onClick={() => setOpen(null)}
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <div aria-hidden className="absolute inset-0" style={{ background: `repeating-linear-gradient(135deg, ${tint("#FFFFFF", 0.05)} 0 2px, transparent 2px 14px), linear-gradient(160deg, #2b2f34, ${text})` }} />
          )}
          <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(0,0,0,.28), transparent 26%)" }} />
          {str(config, "tag") && (
            <span className="pointer-events-none absolute left-3 top-3 flex items-center gap-1.5 rounded-full px-2.5 py-[6px] text-[10px] font-bold uppercase leading-none text-white backdrop-blur-md" style={{ ...label, background: "rgba(0,0,0,.42)" }}>
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: accent }} />
              {str(config, "tag")}
            </span>
          )}

          {pieces.map((p, i) => {
            if (!p.spot) return null;
            const active = open === i;
            const lit = active || hover === i;
            const left = p.spot.x > 55;
            const top = clamp(p.spot.y, 18, 70);
            return (
              <div key={i} className="absolute" style={{ left: `${p.spot.x}%`, top: `${p.spot.y}%`, zIndex: active ? 5 : 2 }}>
                <button
                  type="button"
                  aria-label={p.name}
                  aria-expanded={active}
                  onClick={() => setOpen(active ? null : i)}
                  onMouseEnter={() => setHover(i)}
                  onMouseLeave={() => setHover(null)}
                  className="relative grid h-8 w-8 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full text-[12px] font-extrabold transition-[background-color,color,scale] duration-300 active:scale-90"
                  style={{
                    background: lit ? accent : "#FFFFFF",
                    color: lit ? "#FFFFFF" : text,
                    scale: lit ? "1.12" : "1",
                    boxShadow: "0 4px 14px rgba(0,0,0,.35)",
                    transitionTimingFunction: EASE,
                  }}
                >
                  {!lit && <span aria-hidden className="absolute inset-0 animate-ping rounded-full bg-white/70" style={{ animationDuration: "1.8s" }} />}
                  <span className="relative">{spotNo[i]}</span>
                </button>

                {/* popover */}
                <div
                  role="dialog"
                  aria-label={p.name}
                  aria-hidden={!active}
                  className="absolute w-[210px] p-2.5"
                  style={{
                    [left ? "right" : "left"]: 24,
                    top: -16,
                    transform: `translateY(${-((top - 18) / 52) * 70}%) ${active ? "" : "scale(.94)"}`,
                    transformOrigin: left ? "right top" : "left top",
                    opacity: active ? 1 : 0,
                    visibility: active ? "visible" : "hidden",
                    background: bg,
                    borderRadius: radius + 6,
                    boxShadow: "0 18px 40px -12px rgba(0,0,0,.45), 0 0 0 1px rgba(0,0,0,.04)",
                    transition: `opacity 220ms ease, transform 380ms ${EASE}, visibility 0s linear ${active ? "0s" : "220ms"}`,
                  }}
                >
                  <div className="flex gap-2.5">
                    <Thumb p={p} w={52} h={64} tile={surface} radius={Math.max(2, radius - 1)} />
                    <div className="min-w-0 flex-1 pt-0.5">
                      <p className="text-[12.5px] leading-[1.05]" style={display}>
                        {p.name}
                      </p>
                      <p className="mt-1 truncate text-[11px]" style={{ color: muted }}>
                        {p.type}
                      </p>
                      <p className="mt-1 flex items-baseline gap-1.5 text-[12.5px] font-extrabold tabular-nums">
                        <span style={{ color: p.compare > p.price ? accent : text }}>{money(p.price, cur)}</span>
                        {p.compare > p.price && (
                          <s className="text-[11px] font-medium" style={{ color: muted }}>
                            {money(p.compare, cur)}
                          </s>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2.5 grid grid-cols-[minmax(0,1fr)_auto] gap-1.5">
                    <button
                      type="button"
                      tabIndex={active ? 0 : -1}
                      onClick={() => toggle(i)}
                      className="flex h-9 items-center justify-center gap-1.5 rounded-full text-[10.5px] font-extrabold uppercase transition-[background-color,color,box-shadow] duration-200"
                      style={{ ...label, background: isOn(i) ? text : bg, color: isOn(i) ? bg : text, boxShadow: isOn(i) ? "none" : `inset 0 0 0 1.5px ${text}` }}
                    >
                      {isOn(i) && (
                        <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                          <path d="M2.5 6.3l2.3 2.2 4.7-5" />
                        </svg>
                      )}
                      {isOn(i) ? str(config, "inLookText") : str(config, "addText")}
                    </button>
                    <span className="grid h-9 w-9 cursor-pointer place-items-center rounded-full" style={{ boxShadow: `inset 0 0 0 1.5px ${track}`, color: linkColor }} aria-label={str(config, "viewText")} role="link">
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <path d="M3 8h10M9 4l4 4-4 4" />
                      </svg>
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Outfit list */}
        <div className="flex min-w-0 flex-col px-5 @min-[640px]:px-0">
          {str(config, "eyebrow") && (
            <p className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase" style={{ ...label, color: muted }}>
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: accent }} />
              {str(config, "eyebrow")}
            </p>
          )}
          {str(config, "heading") && (
            <h3 className="mt-2 text-[32px] @min-[640px]:text-[40px]" style={display}>
              {str(config, "heading")}
            </h3>
          )}
          {str(config, "subheading") && (
            <p className="mt-2 text-[13px] leading-[1.5]" style={{ color: muted }}>
              {str(config, "subheading")}
            </p>
          )}

          <ul className="mt-4 flex flex-col">
            {pieces.map((p, i) => {
              const on = isOn(i);
              const lit = hover === i || open === i;
              return (
                <li key={i} className="border-t" style={{ borderColor: track }}>
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={on}
                    onClick={() => toggle(i)}
                    onMouseEnter={() => setHover(i)}
                    onMouseLeave={() => setHover(null)}
                    className="flex w-full items-center gap-3 py-3 text-left transition-opacity duration-300"
                    style={{ opacity: on ? 1 : 0.5 }}
                  >
                    <Check on={on} color={text} bg={bg} track={track} />
                    <span className="relative">
                      <Thumb p={p} w={56} h={70} tile={surface} radius={Math.max(2, radius - 1)} />
                      {spotNo[i] !== null && (
                        <span
                          className="absolute -left-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full text-[10px] font-extrabold transition-colors duration-200"
                          style={{ background: lit ? accent : text, color: "#FFFFFF", boxShadow: `0 0 0 2px ${bg}` }}
                        >
                          {spotNo[i]}
                        </span>
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13.5px]" style={{ ...display, lineHeight: 1.05 }}>
                        {p.name}
                      </span>
                      <span className="mt-1 block truncate text-[11.5px]" style={{ color: muted }}>
                        {p.type}
                      </span>
                      {!p.spot && str(config, "notShownText") && (
                        <span className="mt-1.5 inline-block rounded-[3px] px-1.5 py-[3px] text-[9.5px] font-bold uppercase leading-none" style={{ ...label, background: surface, color: muted }}>
                          {str(config, "notShownText")}
                        </span>
                      )}
                    </span>
                    <span className="shrink-0 text-right text-[13px] font-extrabold tabular-nums">
                      <span className="block" style={{ color: p.compare > p.price ? accent : text }}>
                        {money(p.price, cur)}
                      </span>
                      {p.compare > p.price && (
                        <s className="block text-[11px] font-medium" style={{ color: muted }}>
                          {money(p.compare, cur)}
                        </s>
                      )}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="border-t pt-4" style={{ borderColor: track }}>
            <div className="flex items-end justify-between gap-3">
              <p className="text-[11px] font-bold uppercase" style={label}>
                {str(config, "totalLabel")}
                <span className="mt-1 block font-medium normal-case tracking-normal" style={{ color: muted }}>
                  {chosen.length} / {pieces.length} {str(config, "piecesLabel")}
                </span>
              </p>
              <p className="flex items-baseline gap-2 tabular-nums">
                {full > total && (
                  <s className="text-[13px]" style={{ color: muted }}>
                    {money(full, cur)}
                  </s>
                )}
                <b key={total} className="bs-swap text-[24px]" style={{ ...display, lineHeight: 1 }}>
                  {money(total, cur)}
                </b>
              </p>
            </div>
            <button
              type="button"
              disabled={chosen.length === 0}
              onClick={() => setAdded(true)}
              className="mt-3.5 flex h-[52px] w-full items-center justify-center gap-2 rounded-full text-[13px] font-extrabold uppercase transition-[background-color,scale,opacity] duration-300 enabled:hover:brightness-125 enabled:active:scale-[0.985] disabled:opacity-40"
              style={{ ...label, background: added ? accent : text, color: bg }}
            >
              <span key={added ? "y" : "n"} className="bs-swap inline-flex items-center gap-2">
                {added && (
                  <svg width="14" height="14" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M2.5 6.3l2.3 2.2 4.7-5" />
                  </svg>
                )}
                {added ? str(config, "addedText") : str(config, "buttonText")}
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
  const body = fontFaceFor(str(config, "font", "system"));
  const disp = fontFaceFor(str(config, "displayFont", "system"));
  const face = body.face || disp.face;
  const S = ".bs-ctl-{{ section.id }}";
  const ease = EASE;
  const tick = `<svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2.5 6.3l2.3 2.2 4.7-5"/></svg>`;

  const style = `<style>
${face ? face + "\n" : ""}  ${S} { container-type: inline-size; background: {{ section.settings.bg }}; color: {{ section.settings.text_color }}; font-family: ${body.family}; }
  ${S} * { box-sizing: border-box; }
  ${S} p, ${S} h2, ${S} ul { margin: 0; padding: 0; }
  ${S} button { font: inherit; color: inherit; }
  ${S} a { color: inherit; text-decoration: none; }
  ${S} .bs-disp { font-family: ${disp.family}; font-weight: 800; font-stretch: condensed; letter-spacing: -.015em; line-height: .92;
    {%- if section.settings.display_caps %} text-transform: uppercase;{% endif %} }
  ${S} .bs-lbl { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .07em; }
  ${S} .bs-wrap { max-width: 1100px; margin: 0 auto; display: grid; gap: 20px; padding-bottom: 24px; }
  ${S} .bs-shot { position: relative; aspect-ratio: 4 / 5; overflow: hidden; background: {{ section.settings.text_color }}; }
  ${S} .bs-shot > img, ${S} .bs-shot > svg { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
  ${S} .bs-shot::before { content: ""; position: absolute; inset: 0; z-index: 1; pointer-events: none; background: linear-gradient(180deg, rgba(0,0,0,.28), transparent 26%); }
  ${S} .bs-tag { position: absolute; left: 12px; top: 12px; z-index: 2; display: flex; align-items: center; gap: 6px; padding: 6px 10px; border-radius: 99px; font-size: 10px; line-height: 1;
    color: #fff; background: rgba(0,0,0,.42); -webkit-backdrop-filter: blur(12px); backdrop-filter: blur(12px); pointer-events: none; }
  ${S} .bs-tag i, ${S} .bs-eye i { width: 6px; height: 6px; border-radius: 99px; background: {{ section.settings.accent }}; }
  ${S} .bs-spot { position: absolute; z-index: 3; }
  ${S} .bs-spot.is-open { z-index: 5; }
  ${S} .bs-dot { position: relative; width: 32px; height: 32px; display: grid; place-items: center; transform: translate(-50%, -50%); border: 0; border-radius: 99px; cursor: pointer;
    font-size: 12px; font-weight: 800; background: #fff; color: {{ section.settings.text_color }}; box-shadow: 0 4px 14px rgba(0,0,0,.35);
    transition: background-color .3s ${ease}, color .3s ${ease}, transform .3s ${ease}; }
  ${S} .bs-dot::before { content: ""; position: absolute; inset: 0; border-radius: inherit; background: rgba(255,255,255,.7); animation: bs-ctl-ping 1.8s cubic-bezier(0,0,.2,1) infinite; }
  ${S} .bs-dot span { position: relative; }
  ${S} .bs-spot.is-open .bs-dot, ${S} .bs-spot.is-lit .bs-dot { background: {{ section.settings.accent }}; color: #fff; transform: translate(-50%, -50%) scale(1.12); }
  ${S} .bs-spot.is-open .bs-dot::before, ${S} .bs-spot.is-lit .bs-dot::before { animation: none; opacity: 0; }
  @keyframes bs-ctl-ping { 75%, 100% { transform: scale(2); opacity: 0; } }
  ${S} .bs-pop { position: absolute; left: 24px; top: -16px; width: 210px; padding: 10px; border-radius: {{ section.settings.radius | plus: 6 }}px; background: {{ section.settings.bg }};
    box-shadow: 0 18px 40px -12px rgba(0,0,0,.45), 0 0 0 1px rgba(0,0,0,.04); transform: translateY(var(--ty, -30%)) scale(.94); transform-origin: left top;
    opacity: 0; visibility: hidden; transition: opacity .22s ease, transform .38s ${ease}, visibility 0s linear .22s; }
  ${S} .bs-spot.is-left .bs-pop { left: auto; right: 24px; transform-origin: right top; }
  ${S} .bs-spot.is-open .bs-pop { opacity: 1; visibility: visible; transform: translateY(var(--ty, -30%)); transition: opacity .22s ease, transform .38s ${ease}, visibility 0s; }
  ${S} .bs-pop-top { display: flex; gap: 10px; }
  ${S} .bs-th { position: relative; flex-shrink: 0; width: 52px; height: 64px; overflow: hidden; border-radius: {{ section.settings.radius | minus: 1 | at_least: 2 }}px; background: {{ section.settings.surface }}; }
  ${S} .bs-th img, ${S} .bs-th svg { width: 100%; height: 100%; object-fit: cover; display: block; }
  ${S} .bs-pop-n { font-size: 12.5px; line-height: 1.05; }
  ${S} .bs-pop-t { margin-top: 4px; font-size: 11px; color: {{ section.settings.muted }}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  ${S} .bs-price { margin-top: 4px; font-size: 12.5px; font-weight: 800; font-variant-numeric: tabular-nums; }
  ${S} .bs-price.is-sale > span { color: {{ section.settings.accent }}; }
  ${S} .bs-price s { margin-left: 6px; font-size: 11px; font-weight: 500; color: {{ section.settings.muted }}; }
  ${S} .bs-pop-b { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 6px; margin-top: 10px; }
  ${S} .bs-pop-add { height: 36px; display: flex; align-items: center; justify-content: center; gap: 6px; border: 0; border-radius: 99px; cursor: pointer; font-size: 10.5px; font-weight: 800;
    text-transform: uppercase; letter-spacing: .07em; background: {{ section.settings.bg }}; color: {{ section.settings.text_color }}; box-shadow: inset 0 0 0 1.5px {{ section.settings.text_color }}; transition: background-color .2s, color .2s; }
  ${S} .bs-pop-add svg, ${S} .bs-pop-add .bs-on { display: none; }
  ${S} .bs-pop-add[aria-pressed="true"] { background: {{ section.settings.text_color }}; color: {{ section.settings.bg }}; box-shadow: none; }
  ${S} .bs-pop-add[aria-pressed="true"] svg, ${S} .bs-pop-add[aria-pressed="true"] .bs-on { display: inline; }
  ${S} .bs-pop-add[aria-pressed="true"] .bs-off { display: none; }
  ${S} .bs-view { width: 36px; height: 36px; display: grid; place-items: center; border-radius: 99px; color: {{ section.settings.link_color }}; box-shadow: inset 0 0 0 1.5px {{ section.settings.track }}; }
  ${S} .bs-side { display: flex; flex-direction: column; min-width: 0; padding: 0 20px; }
  ${S} .bs-eye { display: flex; align-items: center; gap: 6px; font-size: 10.5px; color: {{ section.settings.muted }}; }
  ${S} .bs-h { margin-top: 8px; font-size: 32px; }
  ${S} .bs-sub { margin-top: 8px; font-size: 13px; line-height: 1.5; color: {{ section.settings.muted }}; }
  ${S} .bs-list { list-style: none; margin-top: 16px; }
  ${S} .bs-row { display: flex; align-items: center; gap: 12px; padding: 12px 0; border-top: 1px solid {{ section.settings.track }}; cursor: pointer; transition: opacity .3s; }
  ${S} .bs-row:not(:has(input:checked)) { opacity: .5; }
  ${S} .bs-row.is-out { cursor: not-allowed; }
  ${S} .bs-row input { position: absolute; opacity: 0; width: 1px; height: 1px; pointer-events: none; }
  ${S} .bs-box { width: 20px; height: 20px; flex-shrink: 0; display: grid; place-items: center; border-radius: 4px; color: {{ section.settings.bg }};
    box-shadow: inset 0 0 0 1.5px {{ section.settings.track }}; transition: background-color .2s, box-shadow .2s; }
  ${S} .bs-box svg { opacity: 0; transform: scale(.4); transition: opacity .16s, transform .36s cubic-bezier(.34,1.56,.64,1); }
  ${S} .bs-row:has(input:checked) .bs-box { background: {{ section.settings.text_color }}; box-shadow: none; }
  ${S} .bs-row:has(input:checked) .bs-box svg { opacity: 1; transform: none; }
  ${S} .bs-row:has(input:focus-visible) .bs-box { outline: 2px solid {{ section.settings.link_color }}; outline-offset: 2px; }
  ${S} .bs-row .bs-th { width: 56px; height: 70px; overflow: visible; }
  ${S} .bs-row .bs-th img, ${S} .bs-row .bs-th svg { border-radius: inherit; }
  ${S} .bs-no { position: absolute; left: -6px; top: -6px; width: 20px; height: 20px; display: grid; place-items: center; border-radius: 99px; font-size: 10px; font-weight: 800;
    color: #fff; background: {{ section.settings.text_color }}; box-shadow: 0 0 0 2px {{ section.settings.bg }}; transition: background-color .2s; }
  ${S} .bs-row.is-lit .bs-no { background: {{ section.settings.accent }}; }
  ${S} .bs-info { flex: 1; min-width: 0; }
  ${S} .bs-name { display: block; font-size: 13.5px; line-height: 1.05; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  ${S} .bs-type { display: block; margin-top: 4px; font-size: 11.5px; color: {{ section.settings.muted }}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  ${S} .bs-ns { display: inline-block; margin-top: 6px; padding: 3px 6px; border-radius: 3px; font-size: 9.5px; line-height: 1; background: {{ section.settings.surface }}; color: {{ section.settings.muted }}; }
  ${S} .bs-rp { flex-shrink: 0; text-align: right; font-size: 13px; font-weight: 800; font-variant-numeric: tabular-nums; }
  ${S} .bs-rp.is-sale > span { color: {{ section.settings.accent }}; }
  ${S} .bs-rp s { display: block; font-size: 11px; font-weight: 500; color: {{ section.settings.muted }}; }
  ${S} .bs-foot { padding-top: 16px; border-top: 1px solid {{ section.settings.track }}; }
  ${S} .bs-tot { display: flex; align-items: flex-end; justify-content: space-between; gap: 12px; }
  ${S} .bs-tot small { display: block; margin-top: 4px; font-size: 11px; font-weight: 500; text-transform: none; letter-spacing: 0; color: {{ section.settings.muted }}; }
  ${S} .bs-amt { display: flex; align-items: baseline; gap: 8px; font-variant-numeric: tabular-nums; }
  ${S} .bs-amt s { font-size: 13px; color: {{ section.settings.muted }}; }
  ${S} .bs-amt b { font-size: 24px; line-height: 1; }
  ${S} .bs-form { margin: 14px 0 0; }
  ${S} .bs-atc { width: 100%; height: 52px; border: 0; border-radius: 99px; cursor: pointer; font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: .07em;
    background: {{ section.settings.text_color }}; color: {{ section.settings.bg }}; transition: filter .2s, transform .2s, opacity .2s; }
  ${S} .bs-atc:hover:not(:disabled) { filter: brightness(1.25); }
  ${S} .bs-atc:active:not(:disabled) { transform: scale(.985); }
  ${S} .bs-atc:disabled { opacity: .4; cursor: not-allowed; }
  ${S} .bs-err { margin-top: 8px; font-size: 12px; color: {{ section.settings.accent }}; }
  @container (min-width: 640px) {
    ${S} .bs-wrap { grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr); gap: 36px; padding: 36px 32px; }
    ${S} .bs-shot { border-radius: {{ section.settings.radius | plus: 2 }}px; }
    ${S} .bs-side { padding: 0; }
    ${S} .bs-h { font-size: 40px; }
  }
  @media (prefers-reduced-motion: reduce) { ${S} * { transition-duration: 1ms !important; } ${S} .bs-dot::before { animation: none; } }
</style>`;

  const markup = `{%- comment -%}
  Complete The Look by boost.supply. Works on any page.
  - Add one "Look item" block per piece and pick its product. Turn on "Show a
    hotspot" and set its position (% from the left / top of the photo) to put a
    numbered dot on it. Pieces without a hotspot still show in the list.
  - Each piece adds its selected (or first available) variant. Sold-out pieces
    are shown but can't be ticked.
  - The photo comes from the image picker (falls back to the product's
    featured image on product pages).
{%- endcomment -%}
{%- liquid
  assign bs_img = section.settings.image
  if bs_img == blank and product != blank
    assign bs_img = product.featured_image
  endif
  assign bs_n = 0
  assign bs_count = 0
  for block in section.blocks
    if block.settings.product != blank
      assign bs_count = bs_count | plus: 1
    endif
  endfor
-%}
<div class="bs-ctl-{{ section.id }}" id="bs-ctl-{{ section.id }}" data-add-url="{{ routes.cart_add_url }}" data-cart-url="{{ routes.cart_url }}">
  <div class="bs-wrap">
    <div class="bs-shot" data-shot>
      {%- if bs_img != blank -%}
        {{ bs_img | image_url: width: 1400 | image_tag: loading: 'lazy', alt: section.settings.heading, sizes: '(min-width: 990px) 600px, 100vw' }}
      {%- else -%}
        {{ 'lifestyle-1' | placeholder_svg_tag }}
      {%- endif -%}
      {%- if section.settings.tag != blank -%}<span class="bs-lbl bs-tag"><i aria-hidden="true"></i>{{ section.settings.tag }}</span>{%- endif -%}
      {%- for block in section.blocks -%}
        {%- assign bs_p = block.settings.product -%}
        {%- if bs_p != blank and block.settings.show_spot -%}
          {%- assign bs_n = bs_n | plus: 1 -%}
          {%- assign bs_v = bs_p.selected_or_first_available_variant -%}
          {%- assign bs_y = block.settings.y | at_least: 18 | at_most: 70 | minus: 18 -%}
          {%- assign bs_ty = bs_y | times: -70 | divided_by: 52 -%}
          <div class="bs-spot{% if block.settings.x > 55 %} is-left{% endif %}" data-spot="{{ block.id }}" style="left: {{ block.settings.x }}%; top: {{ block.settings.y }}%; --ty: {{ bs_ty }}%;" {{ block.shopify_attributes }}>
            <button type="button" class="bs-dot" aria-expanded="false" aria-label="{{ bs_p.title | escape }}" data-dot><span>{{ bs_n }}</span></button>
            <div class="bs-pop" role="dialog" aria-label="{{ bs_p.title | escape }}">
              <div class="bs-pop-top">
                <span class="bs-th">{%- if bs_p.featured_image -%}{{ bs_p.featured_image | image_url: width: 160 | image_tag: loading: 'lazy', alt: '' }}{%- else -%}{{ 'product-1' | placeholder_svg_tag }}{%- endif -%}</span>
                <span style="min-width:0;flex:1">
                  <span class="bs-pop-n bs-disp" style="display:block">{{ bs_p.title }}</span>
                  <span class="bs-pop-t" style="display:block">{{ block.settings.subtitle | default: bs_p.type }}</span>
                  <span class="bs-price{% if bs_v.compare_at_price > bs_v.price %} is-sale{% endif %}" style="display:block"><span>{{ bs_v.price | money }}</span>{%- if bs_v.compare_at_price > bs_v.price -%}<s>{{ bs_v.compare_at_price | money }}</s>{%- endif -%}</span>
                </span>
              </div>
              <div class="bs-pop-b">
                <button type="button" class="bs-pop-add" data-pop-add="{{ block.id }}" aria-pressed="{{ bs_v.available }}"{% unless bs_v.available %} disabled{% endunless %}>${tick}<span class="bs-on">{{ section.settings.in_look_text }}</span><span class="bs-off">{{ section.settings.add_text }}</span></button>
                <a class="bs-view" href="{{ bs_p.url }}" aria-label="{{ section.settings.view_text | escape }}"><svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 8h10M9 4l4 4-4 4"/></svg></a>
              </div>
            </div>
          </div>
        {%- endif -%}
      {%- endfor -%}
    </div>

    <div class="bs-side">
      {%- if section.settings.eyebrow != blank -%}<p class="bs-lbl bs-eye"><i aria-hidden="true"></i>{{ section.settings.eyebrow }}</p>{%- endif -%}
      {%- if section.settings.heading != blank -%}<h2 class="bs-h bs-disp">{{ section.settings.heading }}</h2>{%- endif -%}
      {%- if section.settings.subheading != blank -%}<p class="bs-sub">{{ section.settings.subheading }}</p>{%- endif -%}

      <form action="{{ routes.cart_add_url }}" method="post" class="bs-form-tag" data-form>
        <ul class="bs-list">
          {%- assign bs_n = 0 -%}
          {%- for block in section.blocks -%}
            {%- assign bs_p = block.settings.product -%}
            {%- if bs_p != blank -%}
              {%- assign bs_v = bs_p.selected_or_first_available_variant -%}
              <li>
                <label class="bs-row{% unless bs_v.available %} is-out{% endunless %}" data-row="{{ block.id }}" {{ block.shopify_attributes }}>
                  <input type="checkbox" name="items[][id]" value="{{ bs_v.id }}" data-price="{{ bs_v.price }}" data-cmp="{{ bs_v.compare_at_price | default: 0 }}" data-key="{{ block.id }}"{% if bs_v.available %} checked{% else %} disabled{% endif %}>
                  <span class="bs-box" aria-hidden="true">${tick}</span>
                  <span class="bs-th">
                    {%- if bs_p.featured_image -%}{{ bs_p.featured_image | image_url: width: 160 | image_tag: loading: 'lazy', alt: '' }}{%- else -%}{{ 'product-1' | placeholder_svg_tag }}{%- endif -%}
                    {%- if block.settings.show_spot -%}{%- assign bs_n = bs_n | plus: 1 -%}<span class="bs-no">{{ bs_n }}</span>{%- endif -%}
                  </span>
                  <span class="bs-info">
                    <span class="bs-name bs-disp">{{ bs_p.title }}</span>
                    <span class="bs-type">{{ block.settings.subtitle | default: bs_p.type }}</span>
                    {%- unless block.settings.show_spot -%}{%- if section.settings.not_shown_text != blank -%}<span class="bs-lbl bs-ns">{{ section.settings.not_shown_text }}</span>{%- endif -%}{%- endunless -%}
                  </span>
                  <span class="bs-rp{% if bs_v.compare_at_price > bs_v.price %} is-sale{% endif %}"><span>{{ bs_v.price | money }}</span>{%- if bs_v.compare_at_price > bs_v.price -%}<s>{{ bs_v.compare_at_price | money }}</s>{%- endif -%}</span>
                </label>
              </li>
            {%- endif -%}
          {%- endfor -%}
        </ul>
        <div class="bs-foot">
          <div class="bs-tot">
            <p class="bs-lbl">{{ section.settings.total_label }}<small><span data-n>{{ bs_count }}</span> / {{ bs_count }} {{ section.settings.pieces_label }}</small></p>
            <p class="bs-amt"><s data-full></s><b class="bs-disp" data-total></b></p>
          </div>
          <div class="bs-form"><button type="submit" class="bs-atc" data-add>{{ section.settings.button_text }}</button></div>
          <p class="bs-err" data-err hidden>Something went wrong. Please try again.</p>
        </div>
      </form>
    </div>
  </div>
</div>
<script>
  (function () {
    var root = document.getElementById('bs-ctl-{{ section.id }}');
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
    function all(s) { return [].slice.call(root.querySelectorAll(s)); }
    function $(s) { return root.querySelector(s); }
    var boxes = all('input[name="items[][id]"]');
    var spots = all('[data-spot]');
    function box(key) { return root.querySelector('input[data-key="' + key + '"]'); }
    function update() {
      var t = 0, f = 0, n = 0;
      boxes.forEach(function (b) {
        if (!b.checked) return;
        n++; t += +b.dataset.price; f += Math.max(+b.dataset.price, +b.dataset.cmp);
        });
      $('[data-n]').textContent = n;
      $('[data-total]').textContent = money(t);
      $('[data-full]').textContent = f > t ? money(f) : '';
      $('[data-add]').disabled = n === 0;
      all('[data-pop-add]').forEach(function (p) { var b = box(p.dataset.popAdd); p.setAttribute('aria-pressed', b && b.checked ? 'true' : 'false'); });
    }
    function close() { spots.forEach(function (s) { s.classList.remove('is-open'); s.querySelector('[data-dot]').setAttribute('aria-expanded', 'false'); }); }
    spots.forEach(function (s) {
      var dot = s.querySelector('[data-dot]');
      dot.addEventListener('click', function (e) {
        e.stopPropagation();
        var was = s.classList.contains('is-open');
        close();
        if (!was) { s.classList.add('is-open'); dot.setAttribute('aria-expanded', 'true'); }
      });
      s.querySelector('.bs-pop').addEventListener('click', function (e) { e.stopPropagation(); });
      var row = root.querySelector('[data-row="' + s.dataset.spot + '"]');
      if (row) {
        row.addEventListener('mouseenter', function () { s.classList.add('is-lit'); });
        row.addEventListener('mouseleave', function () { s.classList.remove('is-lit'); });
        dot.addEventListener('mouseenter', function () { row.classList.add('is-lit'); });
        dot.addEventListener('mouseleave', function () { row.classList.remove('is-lit'); });
      }
    });
    document.addEventListener('click', close);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
    all('[data-pop-add]').forEach(function (p) {
      p.addEventListener('click', function () { var b = box(p.dataset.popAdd); if (b && !b.disabled) { b.checked = !b.checked; update(); } });
    });
    boxes.forEach(function (b) { b.addEventListener('change', update); });
    var form = $('[data-form]'), btn = $('[data-add]'), err = $('[data-err]');
    form.addEventListener('submit', function (e) {
      var items = boxes.filter(function (b) { return b.checked; }).map(function (b) { return { id: +b.value, quantity: 1 }; });
      if (!items.length || !window.fetch) return;
      e.preventDefault();
      btn.disabled = true;
      err.hidden = true;
      fetch(root.dataset.addUrl + '.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ items: items })
      })
        .then(function (r) { if (!r.ok) throw new Error('cart'); window.location.href = root.dataset.cartUrl; })
        .catch(function () { btn.disabled = false; err.hidden = false; });
    });
    update();
  })();
</script>`;

  const items = list(config, "items");

  const schema = buildSchema({
    name: "Complete The Look",
    settings: [
      { type: "text", id: "eyebrow", label: "Eyebrow", default: str(config, "eyebrow") },
      { type: "text", id: "heading", label: "Heading", default: str(config, "heading") },
      { type: "textarea", id: "subheading", label: "Subheading", default: str(config, "subheading") },
      { type: "header", content: "Photo" },
      { type: "image_picker", id: "image", label: "Look photo", info: "A full outfit shot. Leave empty to use the product's featured image." },
      { type: "text", id: "tag", label: "Photo tag", default: str(config, "tag") },
      { type: "header", content: "Labels" },
      { type: "text", id: "in_look_text", label: "Popover: in outfit", default: str(config, "inLookText") },
      { type: "text", id: "add_text", label: "Popover: add", default: str(config, "addText") },
      { type: "text", id: "view_text", label: "Popover: view product (screen readers)", default: str(config, "viewText") },
      { type: "text", id: "not_shown_text", label: "Tag for pieces without a hotspot", default: str(config, "notShownText") },
      { type: "text", id: "total_label", label: "Total label", default: str(config, "totalLabel") },
      { type: "text", id: "pieces_label", label: "“pieces” word", default: str(config, "piecesLabel") },
      { type: "text", id: "button_text", label: "Button text", default: str(config, "buttonText") },
      { type: "header", content: "Style" },
      { type: "checkbox", id: "display_caps", label: "Uppercase display type", default: bool(config, "displayCaps", true) },
      { type: "color", id: "bg", label: "Background", default: str(config, "bg") },
      { type: "color", id: "surface", label: "Thumbnail background", default: str(config, "surface") },
      { type: "color", id: "text_color", label: "Text & buttons", default: str(config, "textColor") },
      { type: "color", id: "accent", label: "Accent (active hotspot, sale)", default: str(config, "accent") },
      { type: "color", id: "link_color", label: "Links", default: str(config, "linkColor") },
      { type: "color", id: "track", label: "Borders", default: str(config, "track") },
      { type: "color", id: "muted", label: "Muted text", default: str(config, "muted") },
      { type: "range", id: "radius", label: "Corner radius", min: 0, max: 16, step: 1, unit: "px", default: clamp(Math.round(num(config, "radius", 4)), 0, 16) },
    ],
    blocks: [
      {
        type: "look_item",
        name: "Look item",
        settings: [
          { type: "product", id: "product", label: "Product" },
          { type: "text", id: "subtitle", label: "Subtitle (leave empty for the product type)" },
          { type: "checkbox", id: "show_spot", label: "Show a hotspot on the photo", default: true },
          { type: "range", id: "x", label: "Hotspot: from the left", min: 0, max: 100, step: 1, unit: "%", default: 50 },
          { type: "range", id: "y", label: "Hotspot: from the top", min: 0, max: 100, step: 1, unit: "%", default: 50 },
        ],
      },
    ],
    maxBlocks: 8,
    presetBlocks: items.map((it) => {
      const spot = (it.x ?? "").trim() !== "" && (it.y ?? "").trim() !== "";
      return {
        type: "look_item",
        settings: {
          show_spot: spot,
          x: Math.round(clamp(toNum(it.x, 50), 0, 100)),
          y: Math.round(clamp(toNum(it.y, 50), 0, 100)),
        },
      };
    }),
  });

  return section({ style, markup, schema });
}

export const completeTheLook: Tweak = {
  slug: "complete-the-look",
  inspiredBy: "gymshark",
  name: "Complete The Look",
  tagline: "A shoppable outfit photo with pulsing hotspots and one button for the whole look.",
  description:
    "Modeled on the “complete the look” outfits Gymshark builds around its product shots. Numbered hotspots pulse on the photo and open a small product card; next to it every piece of the outfit sits in a checklist with a live total and a single “add outfit to bag” button. Accessories that aren't in the shot still join the list. In Shopify each piece is a block with a product and a hotspot position, and the ticked pieces go to the cart in one request.",
  category: "product-page",
  tier: "free",
  tint: "#eceef0",
  Preview,
  generateLiquid,
  defaults,
  fields: [
    { key: "eyebrow", label: "Eyebrow", type: "text", group: "Content" },
    { key: "heading", label: "Heading", type: "text", group: "Content" },
    { key: "subheading", label: "Subheading", type: "textarea", group: "Content" },
    { key: "image", label: "Image URL", type: "text", group: "Media", hint: "Editor preview only. In Shopify you pick the look photo in the theme editor. Leave empty for a plain tile", placeholder: "https://…" },
    { key: "tag", label: "Photo tag", type: "text", group: "Media", hint: "Leave empty to hide" },
    { key: "currency", label: "Currency symbol", type: "text", group: "Outfit" },
    {
      key: "items", label: "Pieces", type: "list", group: "Outfit",
      hint: "Hotspot X / Y are % from the left / top of the photo; leave them empty for a piece that isn't in the shot. Image URL + focus (x% y%) + zoom crop the thumbnail; empty image shows a drawn bottle. Preview only: your store uses each product's image and price",
      itemFields: [
        { key: "name", label: "Name", type: "text" },
        { key: "type", label: "Subtitle", type: "text" },
        { key: "price", label: "Price", type: "text" },
        { key: "compare", label: "Compare-at", type: "text" },
        { key: "x", label: "Hotspot X (%)", type: "text" },
        { key: "y", label: "Hotspot Y (%)", type: "text" },
        { key: "image", label: "Image URL", type: "text" },
        { key: "focus", label: "Thumb focus (x% y%)", type: "text" },
        { key: "zoom", label: "Thumb zoom", type: "text" },
      ],
      newItem: { name: "Training Socks", type: "3-pack · Cushioned", price: "14", compare: "", x: "", y: "", image: "", focus: "", zoom: "" },
      addLabel: "Add piece", max: 6,
    },
    { key: "inLookText", label: "Popover: in outfit", type: "text", group: "Labels" },
    { key: "addText", label: "Popover: add", type: "text", group: "Labels" },
    { key: "viewText", label: "Popover: view product", type: "text", group: "Labels" },
    { key: "notShownText", label: "Not pictured tag", type: "text", group: "Labels", hint: "Shown on pieces without a hotspot. Leave empty to hide" },
    { key: "totalLabel", label: "Total label", type: "text", group: "Labels" },
    { key: "piecesLabel", label: "“pieces” word", type: "text", group: "Labels" },
    { key: "buttonText", label: "Button text", type: "text", group: "Labels" },
    { key: "addedText", label: "Added text", type: "text", group: "Labels" },
    fontField("Typography"),
    fontField("Typography", "displayFont", "Display font"),
    { key: "displayCaps", label: "Uppercase display type", type: "toggle", group: "Typography" },
    { key: "radius", label: "Corner radius", type: "slider", group: "Layout", min: 0, max: 16, step: 1, unit: "px" },
    { key: "bg", label: "Background", type: "color", group: "Colors" },
    { key: "surface", label: "Thumbnail background", type: "color", group: "Colors" },
    { key: "textColor", label: "Text & buttons", type: "color", group: "Colors" },
    { key: "accent", label: "Accent (active hotspot, sale)", type: "color", group: "Colors" },
    { key: "linkColor", label: "Links", type: "color", group: "Colors" },
    { key: "track", label: "Borders", type: "color", group: "Colors" },
    { key: "muted", label: "Muted text", type: "color", group: "Colors" },
  ],
};
