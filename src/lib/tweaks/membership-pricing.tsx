"use client";

import { useEffect, useState } from "react";
import type { Tweak, TweakConfig } from "../types";
import { str, num, list, fontStack, esc } from "../cfg";
import { fontField } from "../fields";
import { buildSchema, section, fontFaceFor } from "../liquid";
import { money, toNum } from "./product-art";

/* ============================================================
   Membership Pricing
   Hardware + membership explainer for a product page: the device
   price (one-time) plus the membership, with a monthly / yearly
   toggle that swaps the membership price and shows the yearly
   saving, a "first month free" chip, "due today" vs "then", and
   two columns that separate what the membership unlocks from
   what works without it.
   ============================================================ */

const EASE = "cubic-bezier(.22,1,.36,1)";
const SERIF = "Georgia, 'Iowan Old Style', 'Times New Roman', serif";

const RING_ICON = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true"><ellipse cx="12" cy="12" rx="8" ry="8" stroke="currentColor" stroke-width="2.6"/><path d="M6.5 8.2a7 7 0 0 1 4-3" stroke="currentColor" stroke-opacity=".45" stroke-width="1.4" stroke-linecap="round"/></svg>`;
const SPARK_ICON = `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2.5c.5 4.6 2.9 7 7.5 7.5-4.6.5-7 2.9-7.5 7.5-.5-4.6-2.9-7-7.5-7.5 4.6-.5 7-2.9 7.5-7.5z"/><path d="M18.5 15.5c.2 1.8 1.2 2.8 3 3-1.8.2-2.8 1.2-3 3-.2-1.8-1.2-2.8-3-3 1.8-.2 2.8-1.2 3-3z" opacity=".6"/></svg>`;
const CHECK = `<svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2.5 6.3l2.3 2.2 4.7-5"/></svg>`;

const defaults: TweakConfig = {
  eyebrow: "Ring + membership",
  heading: "One ring,",
  headingAccent: "every insight",
  subheading: "Buy the ring once. Add the membership for the full picture, and try it free for your first month.",
  ringLabel: "Smart ring",
  ringNote: "Titanium, sizing kit included",
  ringPrice: "349",
  oneTimeLabel: "one-time",
  memberLabel: "Membership",
  memberNote: "Every insight and guide, cancel anytime",
  monthlyPrice: "5.99",
  yearlyPrice: "59.99",
  monthLabel: "/mo",
  yearLabel: "/yr",
  monthlyTab: "Monthly",
  yearlyTab: "Yearly",
  saveLabel: "Save",
  freeChip: "First month free",
  dueLabel: "Due today",
  thenText: "Then {price} after your free month",
  withTitle: "Membership unlocks",
  withoutTitle: "Works without it",
  features: [
    { label: "Daily sleep, readiness and activity scores", column: "member" },
    { label: "Sleep stages and long-term trends", column: "member" },
    { label: "Heart rate variability and temperature insights", column: "member" },
    { label: "Personal guidance and guided sessions", column: "member" },
    { label: "New features as they launch", column: "member" },
    { label: "A simple daily summary", column: "free" },
    { label: "Steps and heart rate", column: "free" },
    { label: "Battery and ring settings", column: "free" },
    { label: "Free firmware updates", column: "free" },
  ],
  ctaLabel: "Shop the ring",
  addedText: "Added to cart",
  ctaNote: "Free shipping · 30-day returns · The ring is yours to keep",
  image: "/mockups/ring-silver.jpg",
  currency: "$",
  bg: "#F7F1E8",
  textColor: "#1C1B1A",
  muted: "#4A4741",
  subtle: "#A8A5A0",
  cardBg: "#EFE6DB",
  priceBg: "#FBF8F3",
  darkBg: "#1C1B1A",
  chipBg: "#E6D5B8",
  buttonBg: "#1C1B1A",
  buttonText: "#F7F1E8",
  font: "system",
  radius: 24,
};

/* ---- helpers ---- */

const parseHex = (hex: string): [number, number, number] | null => {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex).trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

const alpha = (hex: string, a: number) => {
  const c = parseHex(hex);
  return c ? `rgba(${c[0]},${c[1]},${c[2]},${a})` : hex;
};

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const isMember = (c: string | undefined) => !String(c ?? "").trim().toLowerCase().startsWith("free");
const savePct = (monthly: number, yearly: number) =>
  monthly > 0 && yearly > 0 && yearly < monthly * 12 ? Math.round((1 - yearly / (monthly * 12)) * 100) : 0;

function Svg({ html, className = "" }: { html: string; className?: string }) {
  return <span aria-hidden className={`block [&_svg]:block ${className}`} dangerouslySetInnerHTML={{ __html: html }} />;
}

function Preview({ config }: { config: TweakConfig }) {
  const cur = str(config, "currency", "$");
  const bg = str(config, "bg", "#F7F1E8");
  const ink = str(config, "textColor", "#1C1B1A");
  const muted = str(config, "muted", "#4A4741");
  const subtle = str(config, "subtle", "#A8A5A0");
  const cardBg = str(config, "cardBg", "#EFE6DB");
  const priceBg = str(config, "priceBg", "#FBF8F3");
  const dark = str(config, "darkBg", "#1C1B1A");
  const chip = str(config, "chipBg", "#E6D5B8");
  const btnBg = str(config, "buttonBg", "#1C1B1A");
  const btnFg = str(config, "buttonText", "#F7F1E8");
  const radius = num(config, "radius", 24);
  const cream = "#F4EEE6";

  const ring = toNum(str(config, "ringPrice"), 349);
  const monthly = toNum(str(config, "monthlyPrice"), 5.99);
  const yearly = toNum(str(config, "yearlyPrice"), 0) || monthly * 12;
  const save = savePct(monthly, yearly);
  const [year, setYear] = useState(false);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    if (!added) return;
    const t = setTimeout(() => setAdded(false), 1800);
    return () => clearTimeout(t);
  }, [added]);

  const memberPrice = year ? yearly : monthly;
  const per = year ? str(config, "yearLabel", "/yr") : str(config, "monthLabel", "/mo");
  const then = str(config, "thenText", "Then {price} after your free month").split("{price}").join(`${money(memberPrice, cur)}${per}`);
  const features = list(config, "features");
  const withF = features.filter((f) => isMember(f.column));
  const withoutF = features.filter((f) => !isMember(f.column));
  const img = str(config, "image").trim();
  const line = alpha(ink, 0.09);

  return (
    <div
      className="@container w-full"
      style={{ background: bg, color: ink, fontFamily: fontStack(str(config, "font", "system")) }}
    >
      <div className="mx-auto w-full max-w-[1120px] px-5 py-7 @min-[720px]:px-10 @min-[720px]:py-14">
        <div className="grid grid-cols-[minmax(0,1fr)] gap-6 @min-[720px]:grid-cols-[minmax(0,0.92fr)_minmax(0,1fr)] @min-[720px]:items-center @min-[720px]:gap-12">
          {/* Photo */}
          <div className="relative aspect-[5/4] w-full overflow-hidden @min-[720px]:aspect-[4/5]" style={{ borderRadius: radius, background: cardBg }}>
            {img ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={img} alt={str(config, "ringLabel")} loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover" />
            ) : (
              <span aria-hidden className="absolute left-1/2 top-1/2 h-[38%] w-[38%] -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ boxShadow: `inset 0 0 0 14px #BDB7AE, 0 18px 30px -14px rgba(0,0,0,.4)` }} />
            )}
            {str(config, "freeChip") && (
              <span
                className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full py-1.5 pl-2 pr-3 text-[11.5px] font-medium backdrop-blur-md @min-[720px]:left-4 @min-[720px]:top-4"
                style={{ background: alpha("#ffffff", 0.75), color: ink }}
              >
                <Svg html={SPARK_ICON} className="[&_svg]:h-3.5 [&_svg]:w-3.5" />
                {str(config, "freeChip")}
              </span>
            )}
          </div>

          {/* Copy + price card */}
          <div>
            {str(config, "eyebrow") && (
              <p className="flex items-center gap-2 text-[12.5px] font-medium" style={{ color: muted }}>
                <span aria-hidden className="h-1.5 w-1.5 rounded-full" style={{ background: chip }} />
                {str(config, "eyebrow")}
              </p>
            )}
            <h3 className="mt-3 text-[32px] font-medium leading-[1.06] tracking-[-0.03em] @min-[720px]:text-[42px]">
              {str(config, "heading")}{" "}
              {str(config, "headingAccent") && (
                <em className="font-normal italic tracking-[-0.02em]" style={{ fontFamily: SERIF }}>
                  {str(config, "headingAccent")}
                </em>
              )}
            </h3>
            {str(config, "subheading") && (
              <p className="mt-3 max-w-[440px] text-[14.5px] leading-[1.6]" style={{ color: muted }}>
                {str(config, "subheading")}
              </p>
            )}

            <div className="mt-6 p-4 @min-[520px]:p-5" style={{ background: priceBg, borderRadius: Math.max(10, radius - 4), boxShadow: `inset 0 0 0 1px ${line}` }}>
              {/* Ring */}
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full" style={{ background: cardBg, color: ink }}>
                  <Svg html={RING_ICON} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[14.5px] font-medium">{str(config, "ringLabel")}</p>
                  <p className="text-[12px] leading-snug" style={{ color: muted }}>
                    {str(config, "ringNote")}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[20px] font-medium tracking-[-0.02em] tabular-nums">{money(ring, cur)}</p>
                  <p className="text-[11px]" style={{ color: subtle }}>
                    {str(config, "oneTimeLabel")}
                  </p>
                </div>
              </div>

              {/* Plus divider */}
              <div className="relative my-3.5 h-px" style={{ background: line }}>
                <span
                  className="absolute left-5 top-1/2 grid h-6 w-6 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full text-[13px] font-medium"
                  style={{ background: priceBg, boxShadow: `inset 0 0 0 1px ${line}`, color: muted }}
                >
                  +
                </span>
              </div>

              {/* Membership */}
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full" style={{ background: dark, color: chip }}>
                  <Svg html={SPARK_ICON} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[14.5px] font-medium">
                    {str(config, "memberLabel")}
                    {str(config, "freeChip") && (
                      <span className="rounded-full px-2 py-[3px] text-[10.5px] font-semibold leading-none" style={{ background: chip, color: ink }}>
                        {str(config, "freeChip")}
                      </span>
                    )}
                  </p>
                  <p className="mt-0.5 text-[12px] leading-snug" style={{ color: muted }}>
                    {str(config, "memberNote")}
                  </p>
                </div>
                <div className="text-right">
                  <p className="whitespace-nowrap text-[20px] font-medium tracking-[-0.02em] tabular-nums">
                    <span key={year ? "y" : "m"} className="bs-swap inline-block">
                      {money(memberPrice, cur)}
                    </span>
                    <span className="text-[12px] font-normal" style={{ color: muted }}>
                      {per}
                    </span>
                  </p>
                  <p className="text-[11px]" style={{ color: subtle }}>
                    {year ? str(config, "yearlyTab") : str(config, "monthlyTab")}
                  </p>
                </div>
              </div>

              {/* Monthly / yearly */}
              <div className="mt-4 flex items-center gap-3 pl-[52px]">
                <div role="group" className="relative grid grid-cols-2 rounded-full p-[3px]" style={{ background: alpha(ink, 0.06) }}>
                  <span
                    aria-hidden
                    className="absolute bottom-[3px] left-[3px] top-[3px] rounded-full shadow-[0_1px_4px_rgba(0,0,0,0.12)]"
                    style={{ width: "calc(50% - 3px)", background: "#ffffff", transform: `translateX(${year ? 100 : 0}%)`, transition: `transform 420ms ${EASE}` }}
                  />
                  {[false, true].map((y) => (
                    <button
                      key={String(y)}
                      type="button"
                      aria-pressed={year === y}
                      onClick={() => setYear(y)}
                      className="relative z-[1] h-8 min-w-[76px] px-3 text-[12.5px] font-medium transition-colors duration-300"
                      style={{ color: year === y ? ink : muted }}
                    >
                      {y ? str(config, "yearlyTab", "Yearly") : str(config, "monthlyTab", "Monthly")}
                    </button>
                  ))}
                </div>
                {save > 0 && (
                  <span
                    className="rounded-full px-2 py-[3px] text-[10.5px] font-semibold leading-none transition-[opacity,scale] duration-300"
                    style={{ background: chip, color: ink, opacity: year ? 1 : 0.55, scale: year ? "1" : "0.94" }}
                  >
                    {str(config, "saveLabel", "Save")} {save}%
                  </span>
                )}
              </div>

              {/* Totals */}
              <div className="mt-4 border-t pt-3.5" style={{ borderColor: line }}>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-[13.5px] font-medium">{str(config, "dueLabel")}</span>
                  <span className="text-[24px] font-medium tracking-[-0.02em] tabular-nums">{money(ring, cur)}</span>
                </div>
                <p key={then} className="bs-swap mt-0.5 text-right text-[12px]" style={{ color: muted }}>
                  {then}
                </p>
              </div>
            </div>

            {str(config, "ctaLabel") && (
              <button
                type="button"
                onClick={() => setAdded(true)}
                className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-full px-6 text-[15px] font-medium hover:brightness-125 active:scale-[0.98]"
                style={{ background: btnBg, color: btnFg, transition: `filter 200ms ease, scale 200ms ease` }}
              >
                <span key={added ? "a" : "b"} className="bs-swap inline-flex items-center gap-2 whitespace-nowrap">
                  {added ? (
                    <>
                      <Svg html={CHECK} className="[&_svg]:h-3.5 [&_svg]:w-3.5" />
                      {str(config, "addedText", "Added to cart")}
                    </>
                  ) : (
                    <>
                      {str(config, "ctaLabel")} · {money(ring, cur)}
                    </>
                  )}
                </span>
              </button>
            )}
            {str(config, "ctaNote") && (
              <p className="mt-3 text-center text-[12px]" style={{ color: muted }}>
                {str(config, "ctaNote")}
              </p>
            )}
          </div>
        </div>

        {/* With / without */}
        <div className="mt-8 grid gap-3 @min-[520px]:grid-cols-2 @min-[720px]:mt-12 @min-[720px]:gap-4">
          {[
            { title: str(config, "withTitle"), items: withF, on: true },
            { title: str(config, "withoutTitle"), items: withoutF, on: false },
          ].map((col) => (
            <div
              key={String(col.on)}
              className="p-5 @min-[720px]:p-6"
              style={{ background: col.on ? dark : cardBg, color: col.on ? cream : ink, borderRadius: Math.max(10, radius - 4) }}
            >
              <p className="flex items-center gap-2 text-[15px] font-medium">
                {col.on && <Svg html={SPARK_ICON} className="[&_svg]:h-4 [&_svg]:w-4" />}
                <span style={{ color: col.on ? cream : ink }}>{col.title}</span>
              </p>
              <ul className="mt-4 flex flex-col gap-2.5">
                {col.items.map((f, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-[13.5px] leading-[1.4]" style={{ color: col.on ? alpha(cream, 0.88) : muted }}>
                    <span
                      className="mt-px grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full"
                      style={col.on ? { background: chip, color: dark } : { boxShadow: `inset 0 0 0 1.5px ${alpha(ink, 0.22)}`, color: muted }}
                    >
                      {col.on ? <Svg html={CHECK} /> : <span className="block h-[5px] w-[5px] rounded-full" style={{ background: alpha(ink, 0.35) }} />}
                    </span>
                    {f.label}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------------- Liquid ---------------- */

function generateLiquid(config: TweakConfig): string {
  const { face, family } = fontFaceFor(str(config, "font", "system"));
  const S = ".bs-mp-{{ section.id }}";
  const ease = EASE;
  const cream = "#F4EEE6";
  const features = list(config, "features");

  const style = `<style>
${face ? face + "\n" : ""}  ${S} { container-type: inline-size; background: {{ section.settings.bg }}; color: {{ section.settings.text_color }}; font-family: ${family}; }
  ${S} * { box-sizing: border-box; }
  ${S} p, ${S} h2, ${S} h3, ${S} ul { margin: 0; padding: 0; }
  ${S} button { font: inherit; }
  ${S} em { font-family: ${SERIF}; font-style: italic; font-weight: 400; letter-spacing: -.02em; }
  ${S} svg { display: block; }
  ${S} .bs-wrap { max-width: 1120px; margin: 0 auto; padding: 28px 20px; }
  ${S} .bs-top { display: grid; grid-template-columns: minmax(0, 1fr); gap: 24px; }
  ${S} .bs-photo { position: relative; width: 100%; aspect-ratio: 5 / 4; overflow: hidden; border-radius: {{ section.settings.radius }}px; background: {{ section.settings.card_bg }}; }
  ${S} .bs-photo img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
  ${S} .bs-photo-chip { position: absolute; left: 12px; top: 12px; display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px 6px 8px; border-radius: 99px;
    font-size: 11.5px; font-weight: 500; background: rgba(255,255,255,.75); -webkit-backdrop-filter: blur(12px); backdrop-filter: blur(12px); }
  ${S} .bs-photo-chip svg { width: 14px; height: 14px; }
  ${S} .bs-eyebrow { display: flex; align-items: center; gap: 8px; font-size: 12.5px; font-weight: 500; color: {{ section.settings.muted }}; }
  ${S} .bs-eyebrow::before { content: ""; width: 6px; height: 6px; border-radius: 99px; background: {{ section.settings.chip_bg }}; }
  ${S} .bs-h { margin-top: 12px; font-size: 32px; font-weight: 500; line-height: 1.06; letter-spacing: -.03em; }
  ${S} .bs-sub { margin-top: 12px; max-width: 440px; font-size: 14.5px; line-height: 1.6; color: {{ section.settings.muted }}; }
  ${S} .bs-card { margin-top: 24px; padding: 16px; border-radius: {{ section.settings.radius | minus: 4 | at_least: 10 }}px; background: {{ section.settings.price_bg }};
    box-shadow: inset 0 0 0 1px {{ section.settings.text_color | color_modify: 'alpha', 0.09 }}; }
  ${S} .bs-item { display: flex; align-items: center; gap: 12px; }
  ${S} .bs-ico { width: 40px; height: 40px; flex-shrink: 0; display: grid; place-items: center; border-radius: 99px; background: {{ section.settings.card_bg }}; }
  ${S} .bs-ico.is-dark { background: {{ section.settings.dark_bg }}; color: {{ section.settings.chip_bg }}; }
  ${S} .bs-it { flex: 1; min-width: 0; }
  ${S} .bs-it p:first-child { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 8px; font-size: 14.5px; font-weight: 500; }
  ${S} .bs-it p + p { margin-top: 2px; font-size: 12px; line-height: 1.35; color: {{ section.settings.muted }}; }
  ${S} .bs-chip { padding: 3px 8px; border-radius: 99px; font-size: 10.5px; font-weight: 600; line-height: 1; background: {{ section.settings.chip_bg }}; color: {{ section.settings.text_color }}; }
  ${S} .bs-pr { text-align: right; }
  ${S} .bs-pr p:first-child { white-space: nowrap; font-size: 20px; font-weight: 500; letter-spacing: -.02em; font-variant-numeric: tabular-nums; }
  ${S} .bs-pr p:first-child small { font-size: 12px; font-weight: 400; color: {{ section.settings.muted }}; }
  ${S} .bs-pr p + p { font-size: 11px; color: {{ section.settings.subtle }}; }
  ${S} .bs-plus { position: relative; height: 1px; margin: 14px 0; background: {{ section.settings.text_color | color_modify: 'alpha', 0.09 }}; }
  ${S} .bs-plus span { position: absolute; left: 20px; top: 50%; width: 24px; height: 24px; margin: -12px 0 0 -12px; display: grid; place-items: center; border-radius: 99px;
    font-size: 13px; font-weight: 500; color: {{ section.settings.muted }}; background: {{ section.settings.price_bg }}; box-shadow: inset 0 0 0 1px {{ section.settings.text_color | color_modify: 'alpha', 0.09 }}; }
  ${S} .bs-y { display: none !important; }
  ${S}[data-plan="y"] .bs-m { display: none !important; }
  ${S}[data-plan="y"] .bs-y { display: revert !important; }
  ${S} .bs-swap { animation: bs-mp-in .38s ${ease} both; }
  ${S} .bs-toggle { margin-top: 16px; padding-left: 52px; display: flex; align-items: center; gap: 12px; }
  ${S} .bs-seg { position: relative; display: grid; grid-template-columns: 1fr 1fr; padding: 3px; border-radius: 99px; background: {{ section.settings.text_color | color_modify: 'alpha', 0.06 }}; }
  ${S} .bs-seg button { position: relative; z-index: 1; height: 32px; min-width: 76px; padding: 0 12px; border: 0; background: none; cursor: pointer; font-size: 12.5px; font-weight: 500;
    color: {{ section.settings.muted }}; transition: color .3s; }
  ${S} .bs-seg button[aria-pressed="true"] { color: {{ section.settings.text_color }}; }
  ${S} .bs-pill { position: absolute; left: 3px; top: 3px; bottom: 3px; width: calc(50% - 3px); border-radius: 99px; background: #fff; box-shadow: 0 1px 4px rgba(0,0,0,.12);
    transition: transform .42s ${ease}; }
  ${S}[data-plan="y"] .bs-pill { transform: translateX(100%); }
  ${S} .bs-save { opacity: .55; transform: scale(.94); transition: opacity .3s, transform .3s; }
  ${S}[data-plan="y"] .bs-save { opacity: 1; transform: none; }
  ${S} .bs-tot { margin-top: 16px; padding-top: 14px; border-top: 1px solid {{ section.settings.text_color | color_modify: 'alpha', 0.09 }}; }
  ${S} .bs-tot div { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; }
  ${S} .bs-tot div span { font-size: 13.5px; font-weight: 500; }
  ${S} .bs-tot div b { font-size: 24px; font-weight: 500; letter-spacing: -.02em; font-variant-numeric: tabular-nums; }
  ${S} .bs-then { margin-top: 2px; text-align: right; font-size: 12px; color: {{ section.settings.muted }}; }
  ${S} .bs-buy { margin-top: 20px; }
  ${S} .bs-buy form { margin: 0; }
  ${S} .bs-btn { width: 100%; height: 48px; display: flex; align-items: center; justify-content: center; gap: 8px; padding: 0 24px; border: 0; border-radius: 99px; cursor: pointer;
    text-decoration: none; font-size: 15px; font-weight: 500; white-space: nowrap; background: {{ section.settings.button_bg }}; color: {{ section.settings.button_text }};
    transition: filter .2s, transform .2s; }
  ${S} .bs-btn:hover:not(:disabled) { filter: brightness(1.25); }
  ${S} .bs-btn:active:not(:disabled) { transform: scale(.98); }
  ${S} .bs-btn:disabled { opacity: .55; cursor: not-allowed; }
  ${S} .bs-note { margin-top: 12px; text-align: center; font-size: 12px; color: {{ section.settings.muted }}; }
  ${S} .bs-cols { margin-top: 32px; display: grid; gap: 12px; }
  ${S} .bs-col { padding: 20px; border-radius: {{ section.settings.radius | minus: 4 | at_least: 10 }}px; background: {{ section.settings.card_bg }}; }
  ${S} .bs-col.is-on { background: {{ section.settings.dark_bg }}; color: ${cream}; }
  ${S} .bs-col h3 { display: flex; align-items: center; gap: 8px; font-size: 15px; font-weight: 500; }
  ${S} .bs-col h3 svg { width: 16px; height: 16px; }
  ${S} .bs-col ul { margin-top: 16px; display: flex; flex-direction: column; gap: 10px; list-style: none; }
  ${S} .bs-col li { display: flex; align-items: flex-start; gap: 10px; font-size: 13.5px; line-height: 1.4; color: {{ section.settings.muted }}; }
  ${S} .bs-col.is-on li { color: rgba(244,238,230,.88); }
  ${S} .bs-col li i { width: 18px; height: 18px; margin-top: 1px; flex-shrink: 0; display: grid; place-items: center; border-radius: 99px;
    box-shadow: inset 0 0 0 1.5px {{ section.settings.text_color | color_modify: 'alpha', 0.22 }}; }
  ${S} .bs-col li i::after { content: ""; width: 5px; height: 5px; border-radius: 99px; background: {{ section.settings.text_color | color_modify: 'alpha', 0.35 }}; }
  ${S} .bs-col.is-on li i { box-shadow: none; background: {{ section.settings.chip_bg }}; color: {{ section.settings.dark_bg }}; }
  ${S} .bs-col.is-on li i::after { display: none; }
  @keyframes bs-mp-in { from { opacity: 0; transform: translateY(25%); filter: blur(3px); } }
  @container (min-width: 520px) {
    ${S} .bs-card { padding: 20px; }
    ${S} .bs-cols { grid-template-columns: 1fr 1fr; }
  }
  @container (min-width: 720px) {
    ${S} .bs-wrap { padding: 56px 40px; }
    ${S} .bs-top { grid-template-columns: minmax(0, .92fr) minmax(0, 1fr); align-items: center; gap: 48px; }
    ${S} .bs-photo { aspect-ratio: 4 / 5; }
    ${S} .bs-photo-chip { left: 16px; top: 16px; }
    ${S} .bs-h { font-size: 42px; }
    ${S} .bs-cols { margin-top: 48px; gap: 16px; }
    ${S} .bs-col { padding: 24px; }
  }
  @media (prefers-reduced-motion: reduce) {
    ${S} .bs-swap { animation: none; }
    ${S} .bs-pill, ${S} .bs-save { transition: none; }
  }
</style>`;

  const featureList = (member: boolean) => `<ul>
            {%- for block in section.blocks -%}
              {%- if block.settings.column ${member ? "==" : "!="} 'member' -%}
                <li {{ block.shopify_attributes }}><i>${member ? CHECK : ""}</i>{{ block.settings.label }}</li>
              {%- endif -%}
            {%- endfor -%}
          </ul>`;

  const markup = `{%- comment -%}
  Membership Pricing by boost.supply. Add it to the device's product page.
  - Pick the device under "Product": its price, featured image and first
    available variant are used (the image picker overrides the photo). Without
    a product the fallback price and button link are used instead.
  - Membership prices are display only. Charge them with your subscription
    app or membership flow; the free month and yearly price must match what
    that app is set up to bill.
  - Add one "Feature" block per line and choose its column.
{%- endcomment -%}
{%- assign bs_p = section.settings.product | default: product -%}
{%- if bs_p != blank -%}
  {%- assign bs_ring = bs_p.price -%}
{%- else -%}
  {%- assign bs_ring = section.settings.ring_price | times: 100 | round -%}
{%- endif -%}
{%- assign bs_mc = section.settings.monthly_price | times: 100 | round -%}
{%- assign bs_yc = section.settings.yearly_price | times: 100 | round -%}
{%- if bs_yc == 0 -%}{%- assign bs_yc = bs_mc | times: 12 -%}{%- endif -%}
{%- assign bs_m12 = bs_mc | times: 12 -%}
{%- assign bs_save = 0 -%}
{%- if bs_m12 > 0 and bs_yc < bs_m12 -%}
  {%- assign bs_ratio = bs_yc | times: 100.0 | divided_by: bs_m12 | round -%}
  {%- assign bs_save = 100 | minus: bs_ratio -%}
{%- endif -%}
{%- comment -%} The "{price}" token is built here: braces inside an output tag would break the Liquid parser {%- endcomment -%}
{%- assign bs_tok = '{' | append: 'price' | append: '}' -%}
{%- capture bs_m_price -%}{{ bs_mc | money }}{{ section.settings.month_label }}{%- endcapture -%}
{%- capture bs_y_price -%}{{ bs_yc | money }}{{ section.settings.year_label }}{%- endcapture -%}
<div class="bs-mp-{{ section.id }}" id="bs-mp-{{ section.id }}" data-plan="m" data-added="{{ section.settings.added_text | escape }}">
  <div class="bs-wrap">
    <div class="bs-top">
      <div class="bs-photo">
        {%- if section.settings.image != blank -%}
          {{ section.settings.image | image_url: width: 1100 | image_tag: loading: 'lazy', alt: section.settings.ring_label, sizes: '(min-width: 990px) 45vw, 100vw' }}
        {%- elsif bs_p.featured_image -%}
          {{ bs_p.featured_image | image_url: width: 1100 | image_tag: loading: 'lazy', alt: bs_p.title, sizes: '(min-width: 990px) 45vw, 100vw' }}
        {%- endif -%}
        {%- if section.settings.free_chip != blank -%}<span class="bs-photo-chip">${SPARK_ICON}{{ section.settings.free_chip }}</span>{%- endif -%}
      </div>
      <div>
        {%- if section.settings.eyebrow != blank -%}<p class="bs-eyebrow">{{ section.settings.eyebrow }}</p>{%- endif -%}
        <h2 class="bs-h">{{ section.settings.heading }}{% if section.settings.heading_accent != blank %} <em>{{ section.settings.heading_accent }}</em>{% endif %}</h2>
        {%- if section.settings.subheading != blank -%}<p class="bs-sub">{{ section.settings.subheading }}</p>{%- endif -%}
        <div class="bs-card">
          <div class="bs-item">
            <span class="bs-ico">${RING_ICON}</span>
            <div class="bs-it"><p>{{ section.settings.ring_label }}</p>{%- if section.settings.ring_note != blank -%}<p>{{ section.settings.ring_note }}</p>{%- endif -%}</div>
            <div class="bs-pr"><p>{{ bs_ring | money }}</p><p>{{ section.settings.one_time_label }}</p></div>
          </div>
          <div class="bs-plus"><span aria-hidden="true">+</span></div>
          <div class="bs-item">
            <span class="bs-ico is-dark">${SPARK_ICON}</span>
            <div class="bs-it">
              <p>{{ section.settings.member_label }}{%- if section.settings.free_chip != blank -%} <span class="bs-chip">{{ section.settings.free_chip }}</span>{%- endif -%}</p>
              {%- if section.settings.member_note != blank -%}<p>{{ section.settings.member_note }}</p>{%- endif -%}
            </div>
            <div class="bs-pr">
              <p><span class="bs-m bs-swap">{{ bs_mc | money }}<small>{{ section.settings.month_label }}</small></span><span class="bs-y bs-swap">{{ bs_yc | money }}<small>{{ section.settings.year_label }}</small></span></p>
              <p><span class="bs-m">{{ section.settings.monthly_tab }}</span><span class="bs-y">{{ section.settings.yearly_tab }}</span></p>
            </div>
          </div>
          <div class="bs-toggle">
            <div class="bs-seg" role="group">
              <span class="bs-pill" aria-hidden="true"></span>
              <button type="button" data-plan-btn="m" aria-pressed="true">{{ section.settings.monthly_tab }}</button>
              <button type="button" data-plan-btn="y" aria-pressed="false">{{ section.settings.yearly_tab }}</button>
            </div>
            {%- if bs_save > 0 -%}<span class="bs-chip bs-save">{{ section.settings.save_label }} {{ bs_save }}%</span>{%- endif -%}
          </div>
          <div class="bs-tot">
            <div><span>{{ section.settings.due_label }}</span><b>{{ bs_ring | money }}</b></div>
            <p class="bs-then"><span class="bs-m bs-swap">{{ section.settings.then_text | replace: bs_tok, bs_m_price }}</span><span class="bs-y bs-swap">{{ section.settings.then_text | replace: bs_tok, bs_y_price }}</span></p>
          </div>
        </div>
        {%- if section.settings.cta_label != blank -%}
          <div class="bs-buy">
            {%- if bs_p != blank -%}
              {%- form 'product', bs_p -%}
                <input type="hidden" name="id" value="{{ bs_p.selected_or_first_available_variant.id }}">
                <input type="hidden" name="quantity" value="1">
                <button type="submit" name="add" class="bs-btn"{% unless bs_p.available %} disabled{% endunless %}><span data-label>{{ section.settings.cta_label }} · {{ bs_ring | money }}</span></button>
              {%- endform -%}
            {%- else -%}
              <a class="bs-btn" href="{{ section.settings.cta_url | default: routes.all_products_collection_url }}">{{ section.settings.cta_label }}</a>
            {%- endif -%}
          </div>
        {%- endif -%}
        {%- if section.settings.cta_note != blank -%}<p class="bs-note">{{ section.settings.cta_note }}</p>{%- endif -%}
      </div>
    </div>

    <div class="bs-cols">
      <div class="bs-col is-on">
        <h3>${SPARK_ICON}{{ section.settings.with_title }}</h3>
        ${featureList(true)}
      </div>
      <div class="bs-col">
        <h3>{{ section.settings.without_title }}</h3>
        ${featureList(false)}
      </div>
    </div>
  </div>
</div>
<script>
  (function () {
    var root = document.getElementById('bs-mp-{{ section.id }}');
    if (!root) return;
    var btns = root.querySelectorAll('[data-plan-btn]');
    btns.forEach(function (b) {
      b.addEventListener('click', function () {
        var plan = b.getAttribute('data-plan-btn');
        root.setAttribute('data-plan', plan);
        btns.forEach(function (o) { o.setAttribute('aria-pressed', o === b ? 'true' : 'false'); });
        root.querySelectorAll('.bs-' + plan + '.bs-swap').forEach(function (el) {
          el.style.animation = 'none'; void el.offsetWidth; el.style.animation = '';
        });
      });
    });
    var addedText = root.getAttribute('data-added');
    root.querySelectorAll('form[action]').forEach(function (form) {
      form.addEventListener('submit', function (e) {
        if (!window.fetch || !window.FormData) return;
        e.preventDefault();
        var btn = form.querySelector('.bs-btn');
        var lab = btn.querySelector('[data-label]');
        var original = lab.textContent;
        var base = (window.Shopify && Shopify.routes && Shopify.routes.root) || '/';
        btn.disabled = true;
        fetch(base + 'cart/add.js', { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } })
          .then(function (res) {
            if (!res.ok) throw new Error('add failed');
            lab.textContent = addedText;
            document.dispatchEvent(new CustomEvent('cart:refresh', { bubbles: true }));
            setTimeout(function () { lab.textContent = original; btn.disabled = false; }, 2200);
          })
          .catch(function () { form.submit(); });
      });
    });
  })();
</script>`;

  const schema = buildSchema({
    name: "Membership Pricing",
    settings: [
      { type: "text", id: "eyebrow", label: "Eyebrow", default: str(config, "eyebrow") },
      { type: "text", id: "heading", label: "Heading", default: str(config, "heading") },
      { type: "text", id: "heading_accent", label: "Heading accent (italic serif)", default: str(config, "headingAccent") },
      { type: "textarea", id: "subheading", label: "Subheading", default: str(config, "subheading") },
      { type: "header", content: "Device" },
      { type: "product", id: "product", label: "Product", info: "Defaults to the product of the page it sits on." },
      { type: "text", id: "ring_label", label: "Device label", default: str(config, "ringLabel") },
      { type: "text", id: "ring_note", label: "Device note", default: str(config, "ringNote") },
      { type: "text", id: "ring_price", label: "Fallback price (no product)", default: str(config, "ringPrice") },
      { type: "text", id: "one_time_label", label: "“one-time” label", default: str(config, "oneTimeLabel") },
      { type: "image_picker", id: "image", label: "Photo (optional)", info: "Overrides the product's featured image." },
      { type: "header", content: "Membership" },
      { type: "text", id: "member_label", label: "Membership label", default: str(config, "memberLabel") },
      { type: "text", id: "member_note", label: "Membership note", default: str(config, "memberNote") },
      { type: "text", id: "monthly_price", label: "Monthly price (e.g. 5.99)", default: str(config, "monthlyPrice") },
      { type: "text", id: "yearly_price", label: "Yearly price (empty = 12 × monthly)", default: str(config, "yearlyPrice") },
      { type: "text", id: "month_label", label: "Per month suffix", default: str(config, "monthLabel") },
      { type: "text", id: "year_label", label: "Per year suffix", default: str(config, "yearLabel") },
      { type: "text", id: "monthly_tab", label: "Monthly toggle", default: str(config, "monthlyTab") },
      { type: "text", id: "yearly_tab", label: "Yearly toggle", default: str(config, "yearlyTab") },
      { type: "text", id: "save_label", label: "Savings label", default: str(config, "saveLabel") },
      { type: "text", id: "free_chip", label: "Free trial chip", default: str(config, "freeChip") },
      { type: "text", id: "due_label", label: "Due today label", default: str(config, "dueLabel") },
      { type: "text", id: "then_text", label: "Then text ({price} = membership price)", default: str(config, "thenText") },
      { type: "header", content: "Columns" },
      { type: "text", id: "with_title", label: "Membership column title", default: str(config, "withTitle") },
      { type: "text", id: "without_title", label: "Without column title", default: str(config, "withoutTitle") },
      { type: "header", content: "Button" },
      { type: "text", id: "cta_label", label: "Button label", default: str(config, "ctaLabel") },
      { type: "text", id: "added_text", label: "Added confirmation", default: str(config, "addedText") },
      { type: "url", id: "cta_url", label: "Button link (used without a product)" },
      { type: "text", id: "cta_note", label: "Note under the button", default: str(config, "ctaNote") },
      { type: "header", content: "Style" },
      { type: "color", id: "bg", label: "Background", default: str(config, "bg") },
      { type: "color", id: "text_color", label: "Text", default: str(config, "textColor") },
      { type: "color", id: "muted", label: "Body text", default: str(config, "muted") },
      { type: "color", id: "subtle", label: "Small print", default: str(config, "subtle") },
      { type: "color", id: "card_bg", label: "Light card", default: str(config, "cardBg") },
      { type: "color", id: "price_bg", label: "Price card", default: str(config, "priceBg") },
      { type: "color", id: "dark_bg", label: "Membership card", default: str(config, "darkBg") },
      { type: "color", id: "chip_bg", label: "Chips & checks", default: str(config, "chipBg") },
      { type: "color", id: "button_bg", label: "Button", default: str(config, "buttonBg") },
      { type: "color", id: "button_text", label: "Button text", default: str(config, "buttonText") },
      { type: "range", id: "radius", label: "Corner radius", min: 0, max: 40, step: 2, unit: "px", default: clamp(Math.round(num(config, "radius", 24) / 2) * 2, 0, 40) },
    ],
    blocks: [
      {
        type: "feature",
        name: "Feature",
        settings: [
          { type: "text", id: "label", label: "Feature", default: "Sleep stages and trends" },
          {
            type: "select",
            id: "column",
            label: "Column",
            options: [
              { value: "member", label: "Membership unlocks" },
              { value: "free", label: "Works without it" },
            ],
            default: "member",
          },
        ],
      },
    ],
    maxBlocks: 16,
    presetBlocks: features.map((f) => ({
      type: "feature",
      settings: { label: esc(f.label ?? ""), column: isMember(f.column) ? "member" : "free" },
    })),
  });

  return section({ style, markup, schema });
}

export const membershipPricing: Tweak = {
  slug: "membership-pricing",
  inspiredBy: "oura",
  name: "Membership Pricing",
  tagline: "Device price plus membership, a yearly toggle, a free-month chip and what each unlocks.",
  description:
    "Modeled on the ring + membership pricing Oura explains on its product pages. The device price (one-time) and the membership sit in one clear card with a monthly / yearly toggle that swaps the price and shows the yearly saving, a “first month free” chip, and “due today” against what comes after. Two columns split what the membership unlocks from what works without it, so the subscription reads as a choice, not a catch.",
  category: "product-page",
  tier: "free",
  tint: "#f1ece4",
  Preview,
  generateLiquid,
  defaults,
  fields: [
    { key: "eyebrow", label: "Eyebrow", type: "text", group: "Content" },
    { key: "heading", label: "Heading", type: "text", group: "Content" },
    { key: "headingAccent", label: "Heading accent", type: "text", group: "Content", hint: "Set in italic serif after the heading" },
    { key: "subheading", label: "Subheading", type: "textarea", group: "Content" },
    { key: "image", label: "Image URL", type: "text", group: "Media", hint: "Leave empty for a drawn ring. In Shopify the product's image is used" },
    { key: "ringLabel", label: "Device label", type: "text", group: "Device" },
    { key: "ringNote", label: "Device note", type: "text", group: "Device" },
    { key: "ringPrice", label: "Device price", type: "text", group: "Device", hint: "Editor preview; your store shows the product's price" },
    { key: "oneTimeLabel", label: "“one-time” label", type: "text", group: "Device" },
    { key: "currency", label: "Currency symbol", type: "text", group: "Device" },
    { key: "memberLabel", label: "Membership label", type: "text", group: "Membership" },
    { key: "memberNote", label: "Membership note", type: "text", group: "Membership" },
    { key: "monthlyPrice", label: "Monthly price", type: "text", group: "Membership" },
    { key: "yearlyPrice", label: "Yearly price", type: "text", group: "Membership", hint: "Leave empty to use 12 × monthly" },
    { key: "monthLabel", label: "Per month suffix", type: "text", group: "Membership" },
    { key: "yearLabel", label: "Per year suffix", type: "text", group: "Membership" },
    { key: "monthlyTab", label: "Monthly toggle", type: "text", group: "Membership" },
    { key: "yearlyTab", label: "Yearly toggle", type: "text", group: "Membership" },
    { key: "saveLabel", label: "Savings label", type: "text", group: "Membership" },
    { key: "freeChip", label: "Free trial chip", type: "text", group: "Membership" },
    { key: "dueLabel", label: "Due today label", type: "text", group: "Membership" },
    { key: "thenText", label: "Then text", type: "text", group: "Membership", hint: "{price} is replaced by the membership price" },
    { key: "withTitle", label: "Membership column title", type: "text", group: "Columns" },
    { key: "withoutTitle", label: "Without column title", type: "text", group: "Columns" },
    {
      key: "features", label: "Features", type: "list", group: "Columns",
      hint: "Column: member (membership unlocks) or free (works without it)",
      itemFields: [
        { key: "label", label: "Feature", type: "text" },
        { key: "column", label: "Column (member / free)", type: "text" },
      ],
      newItem: { label: "Readiness trends", column: "member" },
      addLabel: "Add feature", max: 16,
    },
    { key: "ctaLabel", label: "Button label", type: "text", group: "Button" },
    { key: "addedText", label: "Added confirmation", type: "text", group: "Button" },
    { key: "ctaNote", label: "Note under the button", type: "text", group: "Button" },
    fontField("Typography"),
    { key: "radius", label: "Corner radius", type: "slider", group: "Layout", min: 0, max: 40, step: 2, unit: "px" },
    { key: "bg", label: "Background", type: "color", group: "Colors" },
    { key: "textColor", label: "Text", type: "color", group: "Colors" },
    { key: "muted", label: "Body text", type: "color", group: "Colors" },
    { key: "subtle", label: "Small print", type: "color", group: "Colors" },
    { key: "cardBg", label: "Light card", type: "color", group: "Colors" },
    { key: "priceBg", label: "Price card", type: "color", group: "Colors" },
    { key: "darkBg", label: "Membership card", type: "color", group: "Colors" },
    { key: "chipBg", label: "Chips & checks", type: "color", group: "Colors" },
    { key: "buttonBg", label: "Button", type: "color", group: "Colors" },
    { key: "buttonText", label: "Button text", type: "color", group: "Colors" },
  ],
};
