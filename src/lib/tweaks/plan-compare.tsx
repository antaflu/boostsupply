"use client";

import { useRef, useState, type CSSProperties } from "react";
import type { Tweak, TweakConfig } from "../types";
import { str, num, list, fontStack, esc } from "../cfg";
import { fontField } from "../fields";
import { buildSchema, section, fontFaceFor } from "../liquid";
import { ProductArt, money, toNum } from "./product-art";

/* ============================================================
   Plan Comparison
   Side-by-side plan cards (90-day / 30-day subscription / one-
   time). Each card leads with its price per serving, shows the
   struck price with a "% off" chip and a perk checklist where
   every row is either ✓ included or — not included. Clicking a
   card selects it; the selected card's button adds it to cart.
   ============================================================ */

const EASE = "cubic-bezier(.22,1,.36,1)";

const defaults: TweakConfig = {
  eyebrow: "Choose your supply",
  heading: "One daily scoop,",
  headingEm: "priced for the long run",
  text: "Every plan ships the same 30-serving jar. The longer your supply, the less you pay per serving.",
  image: "/mockups/gift-jar.jpg",
  imageLabel: "30 servings",
  currency: "$",
  price: "89",
  servings: 30,
  plans: [
    {
      title: "90-day supply",
      caption: "Subscription · ships every 3 months",
      months: "3",
      discount: "30",
      badge: "Most popular",
      perks: "Free welcome kit\nFree express shipping\nPriority care team\nPause or cancel anytime",
      sellingPlan: "3 months",
    },
    {
      title: "30-day supply",
      caption: "Subscription · ships monthly",
      months: "1",
      discount: "15",
      badge: "",
      perks: "Free welcome kit\nFree express shipping\n- Priority care team\nPause or cancel anytime",
      sellingPlan: "1 month",
    },
    {
      title: "One-time",
      caption: "A single jar, no commitment",
      months: "1",
      discount: "0",
      badge: "",
      perks: "- Free welcome kit\n- Free express shipping\n- Priority care team\nNo subscription needed",
      sellingPlan: "",
    },
  ],
  selected: 1,
  perServing: "/ serving",
  offText: "off",
  selectText: "Select plan",
  buttonText: "Add to cart",
  note: "Free returns on your first jar · Cancel online in two clicks",
  bg: "#50000B",
  textColor: "#FFFFFF",
  accent: "#FFB5A7",
  accentText: "#50000B",
  selectedBg: "#8A1C2A",
  badge: "#A40011",
  badgeText: "#FFFFFF",
  tile: "#F0C7A8",
  headingFont: "serif",
  font: "system",
  radius: 16,
};

/** Hex color + alpha byte, e.g. tint("#FFFFFF", 0.1). */
const tint = (hex: string, a: number) =>
  /^#[0-9a-f]{6}$/i.test(hex)
    ? hex + Math.round(a * 255).toString(16).padStart(2, "0")
    : hex;

/** Serif stays Georgia-first, matching the exported Liquid. */
const headStack = (font: string) =>
  font === "serif" ? "Georgia, 'Times New Roman', serif" : fontStack(font);

/** Perk lines; a leading "-" or "—" marks a perk as not included. */
const perkLines = (s: string) =>
  s
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const no = l.startsWith("-") || l.startsWith("—");
      return { no, text: no ? l.slice(1).trim() : l };
    });

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

function Check({ color, size = 12 }: { color: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="shrink-0">
      <path d="M2.5 6.3l2.3 2.2 4.7-5" />
    </svg>
  );
}

function Dash({ color }: { color: string }) {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" aria-hidden className="shrink-0">
      <path d="M3 6h6" />
    </svg>
  );
}

function Preview({ config }: { config: TweakConfig }) {
  const cur = str(config, "currency", "$");
  const bg = str(config, "bg", "#50000B");
  const text = str(config, "textColor", "#FFFFFF");
  const accent = str(config, "accent", "#FFB5A7");
  const accentText = str(config, "accentText", "#50000B");
  const selBg = str(config, "selectedBg", "#8A1C2A");
  const badgeBg = str(config, "badge", "#A40011");
  const badgeText = str(config, "badgeText", "#FFFFFF");
  const tile = str(config, "tile", "#F0C7A8");
  const radius = num(config, "radius", 16);
  const head = headStack(str(config, "headingFont", "serif"));
  const body = fontStack(str(config, "font", "system"));

  const price = toNum(str(config, "price"), 89);
  const servings = Math.max(1, num(config, "servings", 30));
  const photo = str(config, "image").trim();

  const plans = list(config, "plans").map((p) => {
    const months = clamp(Math.round(toNum(p.months, 1)), 1, 12);
    const d = clamp(toNum(p.discount), 0, 90);
    const full = price * months;
    const total = full * (1 - d / 100);
    return {
      title: p.title ?? "",
      caption: p.caption ?? "",
      badge: p.badge ?? "",
      perks: perkLines(p.perks ?? ""),
      d,
      full,
      total,
      each: total / (servings * months),
    };
  });

  /* follow the "preselected" control, but let shoppers click around */
  const initial = clamp(num(config, "selected", 1) - 1, 0, Math.max(0, plans.length - 1));
  const [prevInitial, setPrevInitial] = useState(initial);
  const [sel, setSel] = useState(initial);
  if (initial !== prevInitial) {
    setPrevInitial(initial);
    setSel(initial);
  }
  const active = clamp(sel, 0, Math.max(0, plans.length - 1));

  const [added, setAdded] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  const add = () => {
    setAdded(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setAdded(false), 1600);
  };

  const pick = (i: number) => {
    if (i === active) return;
    setAdded(false);
    setSel(i);
  };

  return (
    <div className="@container w-full" style={{ background: bg, color: text, fontFamily: body }}>
      <div className="mx-auto w-full max-w-[1080px] px-5 py-8 @min-[640px]:px-9 @min-[640px]:py-12">
        {/* Header: copy + product photo */}
        <div className="grid grid-cols-[minmax(0,1fr)_104px] items-center gap-5 @min-[640px]:grid-cols-[minmax(0,1fr)_184px] @min-[640px]:gap-10">
          <div>
            {str(config, "eyebrow") && (
              <p className="text-[10.5px] font-bold uppercase tracking-[0.18em]" style={{ color: accent }}>
                {str(config, "eyebrow")}
              </p>
            )}
            {(str(config, "heading") || str(config, "headingEm")) && (
              <h3
                className="mt-2.5 text-[28px] font-normal leading-[1.05] tracking-[-0.01em] @min-[640px]:text-[40px]"
                style={{ fontFamily: head }}
              >
                {str(config, "heading")}
                {str(config, "headingEm") && (
                  <em className="block italic" style={{ color: accent }}>
                    {str(config, "headingEm")}
                  </em>
                )}
              </h3>
            )}
            {str(config, "text") && (
              <p className="mt-3 hidden max-w-[460px] text-[14px] leading-relaxed @min-[420px]:block" style={{ color: tint(text, 0.72) }}>
                {str(config, "text")}
              </p>
            )}
          </div>
          <div
            className="relative aspect-square overflow-hidden"
            style={{ background: tile, borderRadius: radius, boxShadow: `0 24px 48px -28px rgba(0,0,0,.7)` }}
          >
            {photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photo} alt="" loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover" />
            ) : (
              <div className="grid h-full w-full place-items-center [&>div]:h-[82%]! [&>div]:w-[82%]! [&_svg]:h-[82%] [&_svg]:w-[82%]">
                <ProductArt kind="jar" tone={badgeBg} size={120} tile="transparent" />
              </div>
            )}
            {str(config, "imageLabel") && (
              <span
                className="absolute bottom-2 left-2 rounded-full px-2 py-[3px] text-[8.5px] font-bold uppercase leading-none tracking-[0.14em] @min-[640px]:bottom-3 @min-[640px]:left-3 @min-[640px]:px-2.5 @min-[640px]:py-1 @min-[640px]:text-[9.5px]"
                style={{ background: bg, color: text }}
              >
                {str(config, "imageLabel")}
              </span>
            )}
          </div>
        </div>
        {str(config, "text") && (
          <p className="mt-3 text-[13.5px] leading-relaxed @min-[420px]:hidden" style={{ color: tint(text, 0.72) }}>
            {str(config, "text")}
          </p>
        )}

        {/* Plan cards */}
        <div
          role="radiogroup"
          aria-label="Plans"
          className="mt-7 grid gap-3.5 @min-[640px]:mt-10 @min-[640px]:grid-cols-[repeat(var(--n),minmax(0,1fr))] @min-[640px]:gap-4"
          style={{ "--n": Math.max(1, plans.length) } as CSSProperties}
        >
          {plans.map((p, i) => {
            const on = i === active;
            return (
              <div
                key={i}
                role="radio"
                aria-checked={on}
                tabIndex={0}
                onClick={() => pick(i)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    pick(i);
                  }
                }}
                className="relative flex cursor-pointer flex-col px-4 pb-4 pt-5 outline-none transition-[background-color,box-shadow,translate] duration-500 @min-[640px]:px-5 @min-[640px]:pb-5 @min-[640px]:pt-6"
                style={{
                  borderRadius: radius,
                  background: on ? selBg : tint(text, 0.045),
                  boxShadow: on
                    ? `inset 0 0 0 1.5px ${accent}, 0 22px 44px -26px rgba(0,0,0,.75)`
                    : `inset 0 0 0 1px ${tint(text, 0.14)}`,
                  translate: on ? "0 -2px" : "0 0",
                  transitionTimingFunction: EASE,
                }}
              >
                {p.badge && (
                  <span
                    className="absolute -top-2.5 left-4 whitespace-nowrap rounded-full px-2.5 py-1 text-[9.5px] font-bold uppercase leading-none tracking-[0.16em] @min-[640px]:left-1/2 @min-[640px]:-translate-x-1/2"
                    style={{ background: badgeBg, color: badgeText, boxShadow: `0 0 0 3px ${bg}` }}
                  >
                    {p.badge}
                  </span>
                )}

                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <p
                      className="text-[11px] font-bold uppercase tracking-[0.16em] transition-colors duration-300"
                      style={{ color: on ? accent : text }}
                    >
                      {p.title}
                    </p>
                    {p.caption && (
                      <p className="mt-1 text-[12px] leading-snug" style={{ color: tint(text, 0.62) }}>
                        {p.caption}
                      </p>
                    )}
                  </div>
                  <span
                    aria-hidden
                    className="mt-px h-[18px] w-[18px] shrink-0 rounded-full transition-[box-shadow] duration-300"
                    style={{
                      boxShadow: on ? `inset 0 0 0 5px ${accent}` : `inset 0 0 0 1.5px ${tint(text, 0.4)}`,
                      transitionTimingFunction: EASE,
                    }}
                  />
                </div>

                <div className="mt-4 flex items-baseline gap-1.5">
                  <span className="text-[34px] leading-none tracking-[-0.01em] tabular-nums @min-[640px]:text-[38px]" style={{ fontFamily: head }}>
                    {money(p.each, cur)}
                  </span>
                  <span className="text-[12px]" style={{ color: tint(text, 0.65) }}>
                    {str(config, "perServing")}
                  </span>
                </div>
                <div className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] tabular-nums">
                  {p.d > 0 && <s style={{ color: tint(text, 0.5) }}>{money(p.full, cur)}</s>}
                  <b className="font-semibold">{money(p.total, cur)}</b>
                  {p.d > 0 && (
                    <span
                      className="rounded-[4px] px-1.5 py-[3px] text-[9.5px] font-bold uppercase leading-none tracking-[0.1em]"
                      style={{ background: accent, color: accentText }}
                    >
                      {Math.round(p.d)}% {str(config, "offText")}
                    </span>
                  )}
                </div>

                {p.perks.length > 0 && (
                  <>
                    <div className="my-4 h-px" style={{ background: tint(text, on ? 0.18 : 0.1) }} />
                    <ul className="grid grid-cols-2 gap-x-3 gap-y-2 @min-[640px]:mb-5 @min-[640px]:grid-cols-1">
                      {p.perks.map((k, j) => (
                        <li
                          key={j}
                          className="flex items-start gap-2 text-[12px] leading-snug @min-[640px]:text-[12.5px]"
                          style={{ color: k.no ? tint(text, 0.4) : tint(text, 0.88) }}
                        >
                          <span className="mt-[2px]">
                            {k.no ? <Dash color={tint(text, 0.4)} /> : <Check color={accent} />}
                          </span>
                          {k.text}
                        </li>
                      ))}
                    </ul>
                  </>
                )}

                <button
                  type="button"
                  onClick={(e) => {
                    if (!on) return;
                    e.stopPropagation();
                    add();
                  }}
                  className="mt-5 flex h-11 w-full items-center justify-center rounded-full text-[13.5px] font-bold tracking-[0.02em] transition-[background-color,color,box-shadow,scale] duration-300 active:scale-[0.99] @min-[640px]:mt-auto"
                  style={{
                    background: on ? accent : "transparent",
                    color: on ? accentText : text,
                    boxShadow: on ? "none" : `inset 0 0 0 1px ${tint(text, 0.35)}`,
                    transitionTimingFunction: EASE,
                  }}
                >
                  <span key={`${on}-${added}`} className="bs-swap inline-flex items-center gap-2 whitespace-nowrap">
                    {on ? (
                      added ? (
                        <>
                          <Check color={accentText} size={13} />
                          Added
                        </>
                      ) : (
                        <>
                          {str(config, "buttonText", "Add to cart")}
                          <span style={{ opacity: 0.45 }}>—</span>
                          <span className="tabular-nums">{money(p.total, cur)}</span>
                        </>
                      )
                    ) : (
                      str(config, "selectText", "Select plan")
                    )}
                  </span>
                </button>
              </div>
            );
          })}
        </div>

        {str(config, "note") && (
          <p className="mt-5 text-center text-[11.5px]" style={{ color: tint(text, 0.6) }}>
            {str(config, "note")}
          </p>
        )}
      </div>
    </div>
  );
}

function generateLiquid(config: TweakConfig): string {
  const headFont = fontFaceFor(str(config, "headingFont", "serif"));
  const bodyFont = fontFaceFor(str(config, "font", "system"));
  const face = headFont.face || bodyFont.face;
  const S = ".bs-pc-{{ section.id }}";
  const t = "{{ section.settings.text_color }}";
  const acc = "{{ section.settings.accent }}";
  const tx = (pct: number) => `color-mix(in srgb, ${t} ${pct}%, transparent)`;
  const r = "{{ section.settings.radius }}px";
  const check = `<svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2.5 6.3l2.3 2.2 4.7-5"/></svg>`;
  const dash = `<svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><path d="M3 6h6"/></svg>`;

  const style = `<style>
${face ? face + "\n" : ""}  ${S} { container-type: inline-size; background: {{ section.settings.bg }}; color: ${t}; font-family: ${bodyFont.family}; }
  ${S} * { box-sizing: border-box; }
  ${S} p, ${S} h2, ${S} ul { margin: 0; }
  ${S} .bs-in { max-width: 1080px; margin: 0 auto; padding: 32px 20px; }
  ${S} .bs-head { display: grid; grid-template-columns: minmax(0, 1fr) 104px; align-items: center; gap: 20px; }
  ${S} .bs-eyebrow { font-size: 10.5px; font-weight: 700; letter-spacing: .18em; text-transform: uppercase; color: ${acc}; }
  ${S} .bs-h { margin-top: 10px; font-family: ${headFont.family}; font-size: 28px; font-weight: 400; line-height: 1.05; letter-spacing: -.01em; }
  ${S} .bs-h em { display: block; font-style: italic; color: ${acc}; }
  ${S} .bs-x { margin-top: 12px; max-width: 460px; font-size: 14px; line-height: 1.6; color: ${tx(72)}; }
  ${S} .bs-photo { position: relative; aspect-ratio: 1; overflow: hidden; display: grid; place-items: center; background: {{ section.settings.tile }};
    border-radius: ${r}; box-shadow: 0 24px 48px -28px rgba(0,0,0,.7); }
  ${S} .bs-photo img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
  ${S} .bs-photo .bs-ph { width: 80%; height: 80%; fill: {{ section.settings.bg }}; opacity: .35; }
  ${S} .bs-photo-label { position: absolute; left: 8px; bottom: 8px; padding: 3px 8px; border-radius: 99px; font-size: 8.5px; font-weight: 700; line-height: 1;
    letter-spacing: .14em; text-transform: uppercase; background: {{ section.settings.bg }}; color: ${t}; }
  ${S} .bs-grid { margin-top: 28px; display: grid; gap: 14px; }
  ${S} .bs-card { position: relative; display: flex; flex-direction: column; padding: 20px 16px 16px; border-radius: ${r}; cursor: pointer; outline: none;
    background: ${tx(4.5)}; box-shadow: inset 0 0 0 1px ${tx(14)};
    transition: background-color .5s cubic-bezier(.22,1,.36,1), box-shadow .5s cubic-bezier(.22,1,.36,1), transform .5s cubic-bezier(.22,1,.36,1); }
  ${S} .bs-card.is-on { background: {{ section.settings.selected_bg }}; transform: translateY(-2px);
    box-shadow: inset 0 0 0 1.5px ${acc}, 0 22px 44px -26px rgba(0,0,0,.75); }
  ${S} .bs-card:focus-visible { outline: 2px solid ${acc}; outline-offset: 3px; }
  ${S} .bs-form { display: flex; flex-direction: column; flex: 1; margin: 0; }
  ${S} .bs-badge { position: absolute; top: -10px; left: 16px; white-space: nowrap; padding: 4px 10px; border-radius: 99px; font-size: 9.5px; font-weight: 700;
    line-height: 1; letter-spacing: .16em; text-transform: uppercase; background: {{ section.settings.badge }}; color: {{ section.settings.badge_text }};
    box-shadow: 0 0 0 3px {{ section.settings.bg }}; }
  ${S} .bs-top { display: flex; align-items: flex-start; gap: 12px; }
  ${S} .bs-tm { flex: 1; min-width: 0; }
  ${S} .bs-t { font-size: 11px; font-weight: 700; letter-spacing: .16em; text-transform: uppercase; transition: color .3s; }
  ${S} .bs-card.is-on .bs-t { color: ${acc}; }
  ${S} .bs-cap { margin-top: 4px; font-size: 12px; line-height: 1.4; color: ${tx(62)}; }
  ${S} .bs-radio { width: 18px; height: 18px; margin-top: 1px; flex-shrink: 0; border-radius: 99px; box-shadow: inset 0 0 0 1.5px ${tx(40)};
    transition: box-shadow .3s cubic-bezier(.22,1,.36,1); }
  ${S} .bs-card.is-on .bs-radio { box-shadow: inset 0 0 0 5px ${acc}; }
  ${S} .bs-per { margin-top: 16px; display: flex; align-items: baseline; gap: 6px; }
  ${S} .bs-per b { font-family: ${headFont.family}; font-size: 34px; font-weight: 400; line-height: 1; letter-spacing: -.01em; font-variant-numeric: tabular-nums; }
  ${S} .bs-per small { font-size: 12px; color: ${tx(65)}; }
  ${S} .bs-tot { margin-top: 10px; display: flex; flex-wrap: wrap; align-items: center; gap: 4px 8px; font-size: 13px; font-variant-numeric: tabular-nums; }
  ${S} .bs-tot s { color: ${tx(50)}; }
  ${S} .bs-tot strong { font-weight: 600; }
  ${S} .bs-off { padding: 3px 6px; border-radius: 4px; font-size: 9.5px; font-weight: 700; line-height: 1; letter-spacing: .1em; text-transform: uppercase;
    background: ${acc}; color: {{ section.settings.accent_text }}; }
  ${S} .bs-rule { height: 1px; margin: 16px 0; background: ${tx(10)}; }
  ${S} .bs-card.is-on .bs-rule { background: ${tx(18)}; }
  ${S} .bs-perks { list-style: none; padding: 0; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px 12px; }
  ${S} .bs-perks li { display: flex; align-items: flex-start; gap: 8px; font-size: 12px; line-height: 1.4; color: ${tx(88)}; }
  ${S} .bs-perks li svg { flex-shrink: 0; margin-top: 2px; color: ${acc}; }
  ${S} .bs-perks li.is-no { color: ${tx(40)}; }
  ${S} .bs-perks li.is-no svg { color: inherit; }
  ${S} .bs-btn { margin-top: 20px; width: 100%; height: 44px; border: 0; border-radius: 99px; cursor: pointer; display: flex; align-items: center; justify-content: center;
    gap: 8px; font: inherit; font-size: 13.5px; font-weight: 700; letter-spacing: .02em; white-space: nowrap; background: transparent; color: ${t};
    box-shadow: inset 0 0 0 1px ${tx(35)}; transition: background-color .3s cubic-bezier(.22,1,.36,1), color .3s, box-shadow .3s, transform .2s; }
  ${S} .bs-btn:active { transform: scale(.99); }
  ${S} .bs-btn:disabled { opacity: .5; cursor: not-allowed; }
  ${S} .bs-card.is-on .bs-btn { background: ${acc}; color: {{ section.settings.accent_text }}; box-shadow: none; }
  ${S} .bs-card.is-on .bs-btn:hover { filter: brightness(1.05); }
  ${S} .bs-add, ${S} .bs-card.is-on .bs-sel { display: none; }
  ${S} .bs-card.is-on .bs-add { display: inline-flex; align-items: center; gap: 8px; animation: bs-pc-in .38s cubic-bezier(.22,1,.36,1) both; }
  ${S} .bs-dash { opacity: .45; }
  ${S} .bs-note { margin-top: 20px; text-align: center; font-size: 11.5px; color: ${tx(60)}; }
  @keyframes bs-pc-in { from { opacity: 0; transform: translateY(4px); } }
  @container (min-width: 640px) {
    ${S} .bs-in { padding: 48px 36px; }
    ${S} .bs-head { grid-template-columns: minmax(0, 1fr) 184px; gap: 40px; }
    ${S} .bs-h { font-size: 40px; }
    ${S} .bs-photo-label { left: 12px; bottom: 12px; padding: 4px 10px; font-size: 9.5px; }
    ${S} .bs-grid { margin-top: 40px; gap: 16px; grid-template-columns: repeat(var(--n, 3), minmax(0, 1fr)); }
    ${S} .bs-card { padding: 24px 20px 20px; }
    ${S} .bs-badge { left: 50%; transform: translateX(-50%); }
    ${S} .bs-per b { font-size: 38px; }
    ${S} .bs-perks { grid-template-columns: minmax(0, 1fr); }
    ${S} .bs-perks li { font-size: 12.5px; }
    ${S} .bs-btn { margin-top: auto; }
    ${S} .bs-perks { margin-bottom: 20px; }
  }
  @media (prefers-reduced-motion: reduce) {
    ${S} .bs-card, ${S} .bs-btn { transition: none; }
    ${S} .bs-card.is-on .bs-add { animation: none; }
  }
</style>`;

  const markup = `{%- comment -%}
  Plan Comparison by boost.supply. Add it to your product template (or pick
  a product in the section settings to use it anywhere).
  Selling plans: create them in your subscriptions app (Shopify
  Subscriptions, Recharge, Skio, Loop...). In each Plan block, type a word
  or two from the selling plan's name in "Selling plan name" (e.g.
  "3 months" matches "Delivered every 3 months"). The card then adds that
  plan to the cart with quantity = months and shows the plan's real price.
  A card whose selling plan can't be found is hidden, so a subscription is
  never sold as one-time. Leave the name empty for the one-time card: it
  uses the Discount % below as a display price, so add a matching
  automatic discount (Discounts > Amount off products) if you set one.
  Perks: one per line. Start a line with - to show it as not included.
{%- endcomment -%}
{%- liquid
  assign bs_p = product
  if section.settings.product != blank
    assign bs_p = section.settings.product
  endif
  assign bs_v = bs_p.selected_or_first_available_variant
  assign bs_serv = section.settings.servings | at_least: 1
  assign bs_ref = bs_v.price
  if bs_v.compare_at_price > bs_v.price
    assign bs_ref = bs_v.compare_at_price
  endif
  assign bs_n = 0
  for block in section.blocks
    assign bs_n = bs_n | plus: 1
  endfor
-%}
<div class="bs-pc-{{ section.id }}" id="bs-pc-{{ section.id }}">
  <div class="bs-in">
    <div class="bs-head">
      <div>
        {%- if section.settings.eyebrow != blank -%}<p class="bs-eyebrow">{{ section.settings.eyebrow }}</p>{%- endif -%}
        <h2 class="bs-h">
          {{- section.settings.heading -}}
          {%- if section.settings.heading_em != blank -%}<em>{{ section.settings.heading_em }}</em>{%- endif -%}
        </h2>
        {%- if section.settings.text != blank -%}<p class="bs-x">{{ section.settings.text }}</p>{%- endif -%}
      </div>
      <div class="bs-photo">
        {%- if section.settings.image != blank -%}
          {{ section.settings.image | image_url: width: 480 | image_tag: loading: 'lazy', alt: bs_p.title }}
        {%- elsif bs_p.featured_image -%}
          {{ bs_p.featured_image | image_url: width: 480 | image_tag: loading: 'lazy' }}
        {%- else -%}
          {{ 'product-1' | placeholder_svg_tag: 'bs-ph' }}
        {%- endif -%}
        {%- if section.settings.image_label != blank -%}<span class="bs-photo-label">{{ section.settings.image_label }}</span>{%- endif -%}
      </div>
    </div>

    {%- if bs_p != blank -%}
    <div class="bs-grid" role="radiogroup" aria-label="Plans" style="--n: {{ bs_n | at_least: 1 }};">
      {%- for block in section.blocks -%}
        {%- liquid
          assign bs_m = block.settings.months | at_least: 1
          assign bs_want = block.settings.selling_plan | downcase | strip
          assign bs_has_plan = false
          assign bs_plan_id = ''
          assign bs_unit = bs_v.price
          if bs_want != blank
            for bs_g in bs_p.selling_plan_groups
              for bs_sp in bs_g.selling_plans
                assign bs_name = bs_sp.name | downcase
                if bs_has_plan == false and bs_name contains bs_want
                  assign bs_has_plan = true
                  assign bs_plan_id = bs_sp.id
                endif
              endfor
            endfor
            for bs_a in bs_v.selling_plan_allocations
              if bs_a.selling_plan.id == bs_plan_id
                assign bs_unit = bs_a.price
              endif
            endfor
          endif
          assign bs_show = true
          if bs_want != blank and bs_has_plan == false
            assign bs_show = false
          endif
          if bs_want == blank and bs_p.requires_selling_plan
            assign bs_show = false
          endif
          assign bs_full = bs_ref | times: bs_m
          if bs_has_plan
            assign bs_total = bs_unit | times: bs_m
          else
            assign bs_keep = 100 | minus: block.settings.discount
            assign bs_total = bs_v.price | times: bs_m | times: bs_keep | divided_by: 100
          endif
          assign bs_off = 0
          if bs_full > bs_total
            assign bs_off = bs_full | minus: bs_total | times: 100 | divided_by: bs_full
          endif
          assign bs_each = bs_total | divided_by: bs_m | divided_by: bs_serv
        -%}
        {%- if bs_show -%}
          <div class="bs-card{% if forloop.index == section.settings.selected %} is-on{% endif %}" role="radio" tabindex="0" aria-checked="{% if forloop.index == section.settings.selected %}true{% else %}false{% endif %}" {{ block.shopify_attributes }}>
            {%- form 'product', bs_p, class: 'bs-form' -%}
              <input type="hidden" name="id" value="{{ bs_v.id }}">
              <input type="hidden" name="quantity" value="{{ bs_m }}">
              {%- if bs_has_plan -%}<input type="hidden" name="selling_plan" value="{{ bs_plan_id }}">{%- endif -%}
              {%- if block.settings.badge != blank -%}<span class="bs-badge">{{ block.settings.badge }}</span>{%- endif -%}
              <div class="bs-top">
                <div class="bs-tm">
                  <p class="bs-t">{{ block.settings.title }}</p>
                  {%- if block.settings.caption != blank -%}<p class="bs-cap">{{ block.settings.caption }}</p>{%- endif -%}
                </div>
                <span class="bs-radio" aria-hidden="true"></span>
              </div>
              <p class="bs-per"><b>{{ bs_each | money }}</b><small>{{ section.settings.per_serving }}</small></p>
              <p class="bs-tot">
                {%- if bs_off > 0 -%}<s>{{ bs_full | money }}</s>{%- endif -%}
                <strong>{{ bs_total | money }}</strong>
                {%- if bs_off > 0 -%}<span class="bs-off">{{ bs_off }}% {{ section.settings.off_text }}</span>{%- endif -%}
              </p>
              {%- if block.settings.perks != blank -%}
                <div class="bs-rule"></div>
                <ul class="bs-perks">
                  {%- assign bs_lines = block.settings.perks | newline_to_br | split: '<br />' -%}
                  {%- for bs_l in bs_lines -%}
                    {%- assign bs_lt = bs_l | strip -%}
                    {%- if bs_lt != blank -%}
                      {%- assign bs_c0 = bs_lt | slice: 0 -%}
                      {%- if bs_c0 == '-' or bs_c0 == '—' -%}
                        <li class="is-no">${dash}<span>{{ bs_lt | slice: 1, 500 | strip }}</span></li>
                      {%- else -%}
                        <li>${check}<span>{{ bs_lt }}</span></li>
                      {%- endif -%}
                    {%- endif -%}
                  {%- endfor -%}
                </ul>
              {%- endif -%}
              <button type="submit" name="add" class="bs-btn"{% unless bs_v.available %} disabled{% endunless %}>
                <span class="bs-sel">{{ section.settings.select_text }}</span>
                <span class="bs-add">{{ section.settings.button_text }} <span class="bs-dash" aria-hidden="true">—</span> {{ bs_total | money }}</span>
              </button>
            {%- endform -%}
          </div>
        {%- endif -%}
      {%- endfor -%}
    </div>
    {%- endif -%}

    {%- if section.settings.note != blank -%}<p class="bs-note">{{ section.settings.note }}</p>{%- endif -%}
  </div>
</div>
<script>
  (function () {
    var root = document.getElementById('bs-pc-{{ section.id }}');
    if (!root) return;
    var cards = root.querySelectorAll('.bs-card');
    if (!cards.length) return;
    if (!root.querySelector('.bs-card.is-on')) cards[0].classList.add('is-on');
    function pick(card) {
      cards.forEach(function (c) {
        var on = c === card;
        c.classList.toggle('is-on', on);
        c.setAttribute('aria-checked', on ? 'true' : 'false');
      });
    }
    cards.forEach(function (c) {
      c.setAttribute('aria-checked', c.classList.contains('is-on') ? 'true' : 'false');
      c.addEventListener('click', function (e) {
        if (c.classList.contains('is-on')) return;
        e.preventDefault();
        pick(c);
      });
      c.addEventListener('keydown', function (e) {
        if (e.target !== c || (e.key !== 'Enter' && e.key !== ' ')) return;
        e.preventDefault();
        pick(c);
      });
    });
  })();
</script>`;

  const plans = list(config, "plans");
  const radius = num(config, "radius", 16);

  const schema = buildSchema({
    name: "Plan Comparison",
    settings: [
      { type: "product", id: "product", label: "Product", info: "Leave empty on product pages to use the current product" },
      { type: "text", id: "eyebrow", label: "Eyebrow", default: str(config, "eyebrow") },
      { type: "text", id: "heading", label: "Heading", default: str(config, "heading") },
      { type: "text", id: "heading_em", label: "Heading, italic line", default: str(config, "headingEm") },
      { type: "textarea", id: "text", label: "Text", default: str(config, "text") },
      { type: "image_picker", id: "image", label: "Image", info: "Defaults to the product's featured image" },
      { type: "text", id: "image_label", label: "Image label", default: str(config, "imageLabel") },
      { type: "header", content: "Plans" },
      { type: "number", id: "servings", label: "Servings per month of supply", default: Math.max(1, Math.round(num(config, "servings", 30))) },
      { type: "range", id: "selected", label: "Preselected plan", min: 1, max: 4, step: 1, default: clamp(Math.round(num(config, "selected", 1)), 1, 4) },
      { type: "text", id: "per_serving", label: "Per serving label", default: str(config, "perServing") },
      { type: "text", id: "off_text", label: "Discount label", default: str(config, "offText") },
      { type: "text", id: "select_text", label: "Select button text", default: str(config, "selectText") },
      { type: "text", id: "button_text", label: "Add to cart text", default: str(config, "buttonText") },
      { type: "text", id: "note", label: "Note under the plans", default: str(config, "note") },
      { type: "header", content: "Style" },
      { type: "color", id: "bg", label: "Background", default: str(config, "bg") },
      { type: "color", id: "text_color", label: "Text", default: str(config, "textColor") },
      { type: "color", id: "accent", label: "Accent", default: str(config, "accent") },
      { type: "color", id: "accent_text", label: "Text on accent", default: str(config, "accentText") },
      { type: "color", id: "selected_bg", label: "Selected card", default: str(config, "selectedBg") },
      { type: "color", id: "badge", label: "Badge", default: str(config, "badge") },
      { type: "color", id: "badge_text", label: "Badge text", default: str(config, "badgeText") },
      { type: "color", id: "tile", label: "Image background", default: str(config, "tile") },
      { type: "range", id: "radius", label: "Corner radius", min: 0, max: 28, step: 2, unit: "px", default: clamp(Math.round(radius / 2) * 2, 0, 28) },
    ],
    blocks: [
      {
        type: "plan",
        name: "Plan",
        settings: [
          { type: "text", id: "title", label: "Title" },
          { type: "text", id: "caption", label: "Caption" },
          { type: "range", id: "months", label: "Months of supply (cart quantity)", min: 1, max: 12, step: 1, default: 1 },
          { type: "range", id: "discount", label: "Discount without selling plan", min: 0, max: 60, step: 1, unit: "%", default: 0 },
          { type: "text", id: "selling_plan", label: "Selling plan name (part of it)" },
          { type: "text", id: "badge", label: "Badge" },
          { type: "textarea", id: "perks", label: "Perks (one per line, start with - for not included)" },
        ],
      },
    ],
    maxBlocks: 4,
    presetBlocks: plans.slice(0, 4).map((p) => ({
      type: "plan",
      settings: {
        title: esc(p.title ?? ""),
        caption: esc(p.caption ?? ""),
        months: clamp(Math.round(toNum(p.months, 1)), 1, 12),
        discount: clamp(Math.round(toNum(p.discount)), 0, 60),
        selling_plan: esc(p.sellingPlan ?? ""),
        badge: esc(p.badge ?? ""),
        perks: esc(p.perks ?? ""),
      },
    })),
  });

  return section({ style, markup, schema });
}

export const planCompare: Tweak = {
  slug: "plan-compare",
  inspiredBy: "im8",
  name: "Plan Comparison",
  tagline: "Side-by-side plans that lead with price per serving, with a perk checklist per plan.",
  description:
    "Modeled on the plan picker IM8 uses on its product pages. Three plan cards (a 90-day supply, a monthly subscription and one-time) sit side by side, each leading with its price per serving in a big serif, the struck price with a % off chip and a checklist where every perk is either included or dashed out. A Most popular pill marks the plan you want to sell, and the selected card's button adds it straight to cart. Hooks into your real selling plans by name.",
  category: "product-page",
  tier: "free",
  tint: "#f6e9e6",
  Preview,
  generateLiquid,
  defaults,
  fields: [
    { key: "eyebrow", label: "Eyebrow", type: "text", group: "Content" },
    { key: "heading", label: "Heading", type: "text", group: "Content" },
    { key: "headingEm", label: "Heading, italic line", type: "text", group: "Content" },
    { key: "text", label: "Text", type: "textarea", group: "Content" },
    { key: "image", label: "Image URL", type: "text", group: "Media", hint: "Leave empty for a drawn jar. In Shopify it uses the product photo or the image you pick" },
    { key: "imageLabel", label: "Image label", type: "text", group: "Media" },
    {
      key: "plans", label: "Plans", type: "list", group: "Plans",
      hint: "Months and discount are numbers. Perks: one per line, start a line with - to show it as not included. Selling plan name links a card to your subscription plan in Shopify",
      itemFields: [
        { key: "title", label: "Title", type: "text" },
        { key: "caption", label: "Caption", type: "text" },
        { key: "months", label: "Months of supply", type: "text" },
        { key: "discount", label: "Discount %", type: "text" },
        { key: "badge", label: "Badge", type: "text" },
        { key: "perks", label: "Perks", type: "textarea" },
        { key: "sellingPlan", label: "Selling plan name", type: "text" },
      ],
      newItem: {
        title: "6-month supply", caption: "Subscription · ships every 6 months", months: "6", discount: "35", badge: "",
        perks: "Free welcome kit\nFree express shipping\nPriority care team\nPause or cancel anytime", sellingPlan: "6 months",
      },
      addLabel: "Add plan",
      max: 4,
    },
    { key: "selected", label: "Preselected plan", type: "slider", group: "Plans", min: 1, max: 4, step: 1 },
    { key: "price", label: "Preview price per month", type: "text", group: "Pricing", hint: "Editor preview only; your store uses the product and selling plan prices" },
    { key: "servings", label: "Servings per month", type: "slider", group: "Pricing", min: 1, max: 90, step: 1 },
    { key: "currency", label: "Currency symbol", type: "text", group: "Pricing" },
    { key: "perServing", label: "Per serving label", type: "text", group: "Pricing" },
    { key: "offText", label: "Discount label", type: "text", group: "Pricing" },
    { key: "selectText", label: "Select button text", type: "text", group: "Button" },
    { key: "buttonText", label: "Add to cart text", type: "text", group: "Button" },
    { key: "note", label: "Note under the plans", type: "text", group: "Button" },
    fontField("Typography", "headingFont", "Heading font"),
    fontField("Typography", "font", "Body font"),
    { key: "radius", label: "Corner radius", type: "slider", group: "Layout", min: 0, max: 28, step: 2, unit: "px" },
    { key: "bg", label: "Background", type: "color", group: "Colors" },
    { key: "textColor", label: "Text", type: "color", group: "Colors" },
    { key: "accent", label: "Accent", type: "color", group: "Colors" },
    { key: "accentText", label: "Text on accent", type: "color", group: "Colors" },
    { key: "selectedBg", label: "Selected card", type: "color", group: "Colors" },
    { key: "badge", label: "Badge", type: "color", group: "Colors" },
    { key: "badgeText", label: "Badge text", type: "color", group: "Colors" },
    { key: "tile", label: "Image background", type: "color", group: "Colors" },
  ],
};
