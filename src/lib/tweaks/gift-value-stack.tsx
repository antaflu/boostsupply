"use client";

import { useRef, useState, type CSSProperties } from "react";
import type { Tweak, TweakConfig } from "../types";
import { str, num, bool, list, fontStack, esc } from "../cfg";
import { fontField } from "../fields";
import { buildSchema, section, fontFaceFor } from "../liquid";
import { Icon, iconMarkup } from "../icons";
import { ProductArt, money, toNum, type ArtKind } from "./product-art";

/* ============================================================
   Free Gift Value Stack
   A first-order welcome offer: a serif headline with the total
   gift value, a 2×2 of gift tiles (value struck → FREE), then a
   subscribe-vs-one-time plan picker and an add-to-cart button.
   Gifts can be tied to the subscription: pick one-time and they
   dim with a nudge back to Subscribe & save.
   ============================================================ */

const EASE = "cubic-bezier(.22,1,.36,1)";
const GIFT_ART: ArtKind[] = ["jar", "bottle", "bag", "tube"];
const TOKEN = "{{total}}";

const defaults: TweakConfig = {
  eyebrow: "First-order bonus",
  heading: "{{total}} of free gifts",
  headingEm: "with your first order",
  text: "Start a subscription today and everything below arrives in your first box, on us.",
  currency: "$",
  gifts: [
    { name: "Glass refill jar", value: "35", image: "/mockups/gift-jar.jpg" },
    { name: "Steel shaker bottle", value: "38", image: "/mockups/gift-shaker.jpg" },
    { name: "Gold measuring scoop", value: "25", image: "/mockups/gift-scoop.jpg" },
    { name: "Zip travel pouch", value: "25", image: "/mockups/gift-pouch.jpg" },
  ],
  freeText: "Free",
  giftsSubOnly: true,
  includedText: "Included free in your first box",
  lockText: "Choose Subscribe & save to claim your gifts",
  plan: "sub",
  subTitle: "Subscribe & save",
  subBadge: "Most popular",
  subPerks: "Free gifts worth {{total}} in your first box\nFree shipping on every delivery\nSkip, pause or cancel anytime",
  oneTitle: "One-time purchase",
  onePerks: "Single delivery, no commitment",
  price: "70",
  subDiscount: 30,
  perText: "/mo",
  offText: "off",
  buttonText: "Add to cart",
  note: "Gifts are added automatically at checkout",
  bg: "#50000B",
  textColor: "#FFFFFF",
  accent: "#FFB5A7",
  accentText: "#50000B",
  badge: "#A40011",
  badgeText: "#FFFFFF",
  tile: "#F0C7A8",
  art: "#8A1C2A",
  headingFont: "serif",
  font: "system",
  radius: 14,
};

/** Hex color + alpha byte, e.g. tint("#FFFFFF", 0.1). */
const tint = (hex: string, a: number) =>
  /^#[0-9a-f]{6}$/i.test(hex)
    ? hex + Math.round(a * 255).toString(16).padStart(2, "0")
    : hex;

/** Serif stays Georgia-first, matching the exported Liquid. */
const headStack = (font: string) =>
  font === "serif" ? "Georgia, 'Times New Roman', serif" : fontStack(font);

const lines = (s: string) =>
  s
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

function Check({ color, size = 12 }: { color: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="shrink-0">
      <path d="M2.5 6.3l2.3 2.2 4.7-5" />
    </svg>
  );
}

function Lock({ color }: { color: string }) {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.4" strokeLinecap="round" aria-hidden>
      <rect x="5" y="10.5" width="14" height="10" rx="2" />
      <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

function Preview({ config }: { config: TweakConfig }) {
  const cur = str(config, "currency", "$");
  const bg = str(config, "bg", "#50000B");
  const text = str(config, "textColor", "#FFFFFF");
  const accent = str(config, "accent", "#FFB5A7");
  const accentText = str(config, "accentText", "#50000B");
  const badgeBg = str(config, "badge", "#A40011");
  const badgeText = str(config, "badgeText", "#FFFFFF");
  const tile = str(config, "tile", "#F0C7A8");
  const art = str(config, "art", "#8A1C2A");
  const radius = num(config, "radius", 14);
  const head = headStack(str(config, "headingFont", "serif"));
  const body = fontStack(str(config, "font", "system"));

  const gifts = list(config, "gifts");
  const total = gifts.reduce((s, g) => s + toNum(g.value), 0);
  const fill = (s: string) => s.split(TOKEN).join(money(total, cur));

  const price = toNum(str(config, "price"), 70);
  const off = Math.max(0, Math.min(90, num(config, "subDiscount", 30)));
  const subPrice = price * (1 - off / 100);
  const per = str(config, "perText");

  /* follow the "preselected plan" control, but let shoppers click around */
  const initial = str(config, "plan", "sub") === "one" ? "one" : "sub";
  const [prevInitial, setPrevInitial] = useState(initial);
  const [plan, setPlan] = useState(initial);
  if (initial !== prevInitial) {
    setPrevInitial(initial);
    setPlan(initial);
  }
  const isSub = plan === "sub";
  const locked = bool(config, "giftsSubOnly", true) && !isSub;

  const [added, setAdded] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  const add = () => {
    setAdded(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setAdded(false), 1600);
  };

  const plans = [
    {
      id: "sub",
      title: str(config, "subTitle"),
      badge: str(config, "subBadge"),
      perks: lines(fill(str(config, "subPerks"))),
      amount: money(subPrice, cur),
      per,
      was: off > 0 ? money(price, cur) : "",
    },
    {
      id: "one",
      title: str(config, "oneTitle"),
      badge: "",
      perks: lines(fill(str(config, "onePerks"))),
      amount: money(price, cur),
      per: "",
      was: "",
    },
  ];

  const headingText = fill(str(config, "heading"));
  const headingEm = fill(str(config, "headingEm"));

  return (
    <div className="@container w-full" style={{ background: bg, color: text, fontFamily: body }}>
      <div className="mx-auto grid w-full max-w-[1080px] gap-7 px-5 py-8 @min-[720px]:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] @min-[720px]:items-center @min-[720px]:gap-12 @min-[720px]:px-10 @min-[720px]:py-14">
        {/* Gift stack */}
        <div>
          {str(config, "eyebrow") && (
            <p className="flex items-center gap-2 text-[10.5px] font-bold uppercase tracking-[0.16em]" style={{ color: accent }}>
              <Icon token="pack:gift" size={14} strokeWidth={2} />
              {str(config, "eyebrow")}
            </p>
          )}
          {(headingText || headingEm) && (
            <h3
              className="mt-3 text-[34px] font-normal leading-[1.04] tracking-[-0.01em] @min-[720px]:text-[38px] @min-[1000px]:text-[44px]"
              style={{ fontFamily: head }}
            >
              {headingText}
              {headingEm && (
                <em className="block italic" style={{ color: accent }}>
                  {headingEm}
                </em>
              )}
            </h3>
          )}
          {str(config, "text") && (
            <p className="mt-3 max-w-[420px] text-[14px] leading-relaxed" style={{ color: tint(text, 0.75) }}>
              {fill(str(config, "text"))}
            </p>
          )}

          {gifts.length > 0 && (
            <div
              className="mt-5 grid grid-cols-2 gap-2.5 @min-[500px]:grid-cols-[repeat(var(--gc),minmax(0,1fr))] @min-[720px]:grid-cols-2"
              style={{ "--gc": gifts.length <= 4 ? gifts.length : 3 } as CSSProperties}
            >
              {gifts.map((g, i) => {
                const v = toNum(g.value);
                const photo = (g.image ?? "").trim();
                return (
                  <div
                    key={i}
                    className="p-2 pb-3 transition-[opacity,filter] duration-500"
                    style={{
                      background: tint(text, 0.06),
                      boxShadow: `inset 0 0 0 1px ${tint(text, 0.1)}`,
                      borderRadius: radius,
                      opacity: locked ? 0.5 : 1,
                      filter: locked ? "grayscale(.7)" : "none",
                      transitionTimingFunction: EASE,
                    }}
                  >
                    <div
                      className="relative grid aspect-square place-items-center overflow-hidden"
                      style={{ background: tile, borderRadius: Math.max(4, radius - 6) }}
                    >
                      {photo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={photo}
                          alt={g.name ?? ""}
                          loading="lazy"
                          decoding="async"
                          className="absolute inset-0 h-full w-full object-cover"
                        />
                      ) : (
                        /* no photo: a drawn packshot that scales with its tile */
                        <div className="grid h-[86%] w-[86%] place-items-center [&>div]:h-full! [&>div]:w-full! [&_svg]:h-[82%] [&_svg]:w-[82%]">
                          <ProductArt kind={GIFT_ART[i % GIFT_ART.length]} tone={i % 2 ? badgeBg : art} size={112} tile="transparent" />
                        </div>
                      )}
                    </div>
                    <p className="mt-2.5 px-0.5 text-[12.5px] font-semibold leading-tight">{g.name}</p>
                    <p className="mt-1 flex items-baseline gap-1.5 px-0.5 text-[11px] tabular-nums">
                      {v > 0 && <s style={{ color: tint(text, 0.55) }}>{money(v, cur)}</s>}
                      <b className="font-bold uppercase tracking-[0.08em]" style={{ color: accent }}>
                        {str(config, "freeText", "Free")}
                      </b>
                    </p>
                  </div>
                );
              })}
            </div>
          )}

          {(locked ? str(config, "lockText") : str(config, "includedText")) && (
            <button
              key={locked ? "locked" : "open"}
              type="button"
              disabled={!locked}
              onClick={() => setPlan("sub")}
              className="bs-swap mt-3.5 flex items-center gap-2 text-left text-[12.5px] disabled:cursor-default"
              style={{ color: locked ? tint(text, 0.8) : text }}
            >
              <span
                className="grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full"
                style={{ background: locked ? tint(text, 0.14) : accent }}
              >
                {locked ? <Lock color={text} /> : <Check color={accentText} size={10} />}
              </span>
              <span className={locked ? "underline decoration-[1px] underline-offset-[3px]" : ""}>
                {fill(locked ? str(config, "lockText") : str(config, "includedText"))}
              </span>
            </button>
          )}
        </div>

        {/* Plans + add to cart */}
        <div>
          <div role="radiogroup" aria-label="Purchase options" className="flex flex-col gap-3 pt-2.5">
            {plans.map((p) => {
              const on = plan === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => setPlan(p.id)}
                  className="relative flex w-full items-start gap-3 px-4 pb-4 pt-[18px] text-left transition-[box-shadow,background-color,scale] duration-300 active:scale-[0.995]"
                  style={{
                    borderRadius: radius,
                    boxShadow: on ? `inset 0 0 0 1.5px ${accent}` : `inset 0 0 0 1px ${tint(text, 0.16)}`,
                    background: on ? tint(accent, 0.09) : "transparent",
                    transitionTimingFunction: EASE,
                  }}
                >
                  {p.badge && (
                    <span
                      className="absolute -top-2.5 left-4 rounded-full px-2.5 py-1 text-[9.5px] font-bold uppercase leading-none tracking-[0.14em]"
                      style={{ background: badgeBg, color: badgeText }}
                    >
                      {p.badge}
                    </span>
                  )}
                  <span
                    aria-hidden
                    className="mt-px h-[18px] w-[18px] shrink-0 rounded-full transition-[box-shadow] duration-300"
                    style={{
                      boxShadow: on ? `inset 0 0 0 5px ${accent}` : `inset 0 0 0 1.5px ${tint(text, 0.4)}`,
                      transitionTimingFunction: EASE,
                    }}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] font-semibold leading-tight">{p.title}</span>
                    {p.perks.length > 0 && (
                      <span className="mt-2 grid gap-[5px]">
                        {p.perks.map((k, j) => (
                          <span key={j} className="flex items-start gap-[7px] text-[12.5px] leading-snug" style={{ color: tint(text, 0.8) }}>
                            <span className="mt-[2px]">
                              <Check color={accent} />
                            </span>
                            {k}
                          </span>
                        ))}
                      </span>
                    )}
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block whitespace-nowrap text-[24px] leading-none tabular-nums" style={{ fontFamily: head }}>
                      {p.amount}
                      {p.per && (
                        <small className="ml-0.5 text-[12px]" style={{ fontFamily: body, color: tint(text, 0.7) }}>
                          {p.per}
                        </small>
                      )}
                    </span>
                    {p.was && (
                      <span className="mt-1.5 flex items-center justify-end gap-1.5 text-[12px] tabular-nums">
                        <s style={{ color: tint(text, 0.55) }}>{p.was}</s>
                        <b
                          className="rounded-[4px] px-1.5 py-[3px] text-[9.5px] font-bold uppercase leading-none tracking-[0.08em]"
                          style={{ background: accent, color: accentText }}
                        >
                          {Math.round(off)}% {str(config, "offText")}
                        </b>
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={add}
            className="mt-4 flex h-[54px] w-full items-center justify-center rounded-full text-[15px] font-bold tracking-[0.02em] transition-[filter,scale] duration-200 hover:brightness-105 active:scale-[0.99]"
            style={{ background: accent, color: accentText }}
          >
            <span key={`${plan}-${added}`} className="bs-swap inline-flex items-center gap-2">
              {added ? (
                <>
                  <Check color={accentText} size={14} />
                  Added
                </>
              ) : (
                <>
                  {str(config, "buttonText", "Add to cart")}
                  <span style={{ opacity: 0.45 }}>—</span>
                  <span className="tabular-nums">
                    {isSub ? money(subPrice, cur) + per : money(price, cur)}
                  </span>
                </>
              )}
            </span>
          </button>
          {str(config, "note") && (
            <p className="mt-3 text-center text-[11.5px]" style={{ color: tint(text, 0.6) }}>
              {str(config, "note")}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function generateLiquid(config: TweakConfig): string {
  const headFont = fontFaceFor(str(config, "headingFont", "serif"));
  const bodyFont = fontFaceFor(str(config, "font", "system"));
  const face = headFont.face || bodyFont.face;
  const S = ".bs-gv-{{ section.id }}";
  const t = "{{ section.settings.text_color }}";
  const acc = "{{ section.settings.accent }}";
  const tx = (pct: number) => `color-mix(in srgb, ${t} ${pct}%, transparent)`;
  const r = "{{ section.settings.radius }}px";
  const check = (size: number) =>
    `<svg width="${size}" height="${size}" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2.5 6.3l2.3 2.2 4.7-5"/></svg>`;
  const lock = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/></svg>`;

  const style = `<style>
${face ? face + "\n" : ""}  ${S} { container-type: inline-size; background: {{ section.settings.bg }}; color: ${t}; font-family: ${bodyFont.family}; }
  ${S} * { box-sizing: border-box; }
  ${S} p, ${S} h2 { margin: 0; }
  ${S} [hidden] { display: none !important; }
  ${S} .bs-in { max-width: 1080px; margin: 0 auto; padding: 32px 20px; display: grid; gap: 28px; }
  ${S} .bs-eyebrow { display: flex; align-items: center; gap: 8px; font-size: 10.5px; font-weight: 700; letter-spacing: .16em; text-transform: uppercase; color: ${acc}; }
  ${S} .bs-h { margin-top: 12px; font-family: ${headFont.family}; font-size: 34px; font-weight: 400; line-height: 1.04; letter-spacing: -.01em; }
  ${S} .bs-h em { display: block; font-style: italic; color: ${acc}; }
  ${S} .bs-x { margin-top: 12px; max-width: 420px; font-size: 14px; line-height: 1.6; color: ${tx(75)}; }
  ${S} .bs-gifts { margin-top: 20px; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
  ${S} .bs-gift { padding: 8px 8px 12px; border-radius: ${r}; background: ${tx(6)}; box-shadow: inset 0 0 0 1px ${tx(10)};
    transition: opacity .5s cubic-bezier(.22,1,.36,1), filter .5s cubic-bezier(.22,1,.36,1); }
  ${S}.is-locked .bs-gift { opacity: .5; filter: grayscale(.7); }
  ${S} .bs-gimg { aspect-ratio: 1; overflow: hidden; display: grid; place-items: center; background: {{ section.settings.tile }};
    border-radius: {{ section.settings.radius | minus: 6 | at_least: 4 }}px; }
  ${S} .bs-gimg img { display: block; width: 100%; height: 100%; object-fit: cover; }
  ${S} .bs-gimg .bs-ph { width: 80%; height: 80%; fill: {{ section.settings.bg }}; opacity: .35; }
  ${S} .bs-gn { margin-top: 10px; padding: 0 2px; font-size: 12.5px; font-weight: 600; line-height: 1.25; }
  ${S} .bs-gv { margin-top: 4px; padding: 0 2px; display: flex; align-items: baseline; gap: 6px; font-size: 11px; font-variant-numeric: tabular-nums; }
  ${S} .bs-gv s { color: ${tx(55)}; }
  ${S} .bs-gv b { color: ${acc}; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }
  ${S} .bs-inc { margin-top: 14px; display: flex; align-items: center; gap: 8px; padding: 0; border: 0; background: none; color: inherit; font: inherit; font-size: 12.5px; text-align: left; }
  ${S} .bs-ico { width: 18px; height: 18px; flex-shrink: 0; border-radius: 99px; display: grid; place-items: center; background: ${acc}; color: {{ section.settings.accent_text }}; }
  ${S} .bs-inc-off { display: none; cursor: pointer; color: ${tx(80)}; }
  ${S} .bs-inc-off .bs-ico { background: ${tx(14)}; color: ${t}; }
  ${S} .bs-inc-off span:last-child { text-decoration: underline; text-underline-offset: 3px; }
  ${S}.is-locked .bs-inc-on { display: none; }
  ${S}.is-locked .bs-inc-off { display: flex; animation: bs-gv-in .38s cubic-bezier(.22,1,.36,1) both; }
  ${S} .bs-form { margin: 0; }
  ${S} .bs-variant { position: relative; margin-bottom: 16px; }
  ${S} .bs-variant::after { content: ""; position: absolute; right: 18px; top: 17px; width: 7px; height: 7px; pointer-events: none; opacity: .7;
    border-right: 1.5px solid currentColor; border-bottom: 1.5px solid currentColor; transform: rotate(45deg); }
  ${S} .bs-select { width: 100%; height: 48px; padding: 0 44px 0 16px; border: 0; border-radius: ${r}; appearance: none; -webkit-appearance: none;
    background: transparent; color: inherit; font: inherit; font-size: 14px; box-shadow: inset 0 0 0 1px ${tx(16)}; cursor: pointer; }
  ${S} .bs-select option { color: #111; background: #fff; }
  ${S} .bs-plans { display: flex; flex-direction: column; gap: 12px; padding-top: 10px; }
  ${S} .bs-plan { position: relative; display: flex; align-items: flex-start; gap: 12px; padding: 18px 16px 16px; border-radius: ${r}; cursor: pointer;
    box-shadow: inset 0 0 0 1px ${tx(16)}; transition: box-shadow .3s cubic-bezier(.22,1,.36,1), background-color .3s cubic-bezier(.22,1,.36,1), transform .2s; }
  ${S} .bs-plan:active { transform: scale(.995); }
  ${S} .bs-plan input { position: absolute; opacity: 0; pointer-events: none; }
  ${S} .bs-plan:has(input:checked) { box-shadow: inset 0 0 0 1.5px ${acc}; background: color-mix(in srgb, ${acc} 9%, transparent); }
  ${S} .bs-plan:has(input:focus-visible) { outline: 2px solid ${acc}; outline-offset: 2px; }
  ${S} .bs-radio { width: 18px; height: 18px; margin-top: 1px; flex-shrink: 0; border-radius: 99px; box-shadow: inset 0 0 0 1.5px ${tx(40)};
    transition: box-shadow .3s cubic-bezier(.22,1,.36,1); }
  ${S} .bs-plan:has(input:checked) .bs-radio { box-shadow: inset 0 0 0 5px ${acc}; }
  ${S} .bs-badge { position: absolute; top: -10px; left: 16px; padding: 4px 10px; border-radius: 99px; font-size: 9.5px; font-weight: 700; line-height: 1;
    letter-spacing: .14em; text-transform: uppercase; background: {{ section.settings.badge }}; color: {{ section.settings.badge_text }}; }
  ${S} .bs-pm { flex: 1; min-width: 0; }
  ${S} .bs-pt { display: block; font-size: 15px; font-weight: 600; line-height: 1.25; }
  ${S} .bs-perks { display: grid; gap: 5px; margin-top: 8px; }
  ${S} .bs-perk { display: flex; align-items: flex-start; gap: 7px; font-size: 12.5px; line-height: 1.4; color: ${tx(80)}; }
  ${S} .bs-perk svg { flex-shrink: 0; margin-top: 3px; color: ${acc}; }
  ${S} .bs-pp { flex-shrink: 0; text-align: right; }
  ${S} .bs-amt { display: block; white-space: nowrap; font-family: ${headFont.family}; font-size: 24px; line-height: 1; font-variant-numeric: tabular-nums; }
  ${S} .bs-amt small { margin-left: 2px; font-family: ${bodyFont.family}; font-size: 12px; color: ${tx(70)}; }
  ${S} .bs-was { margin-top: 6px; display: flex; align-items: center; justify-content: flex-end; gap: 6px; font-size: 12px; }
  ${S} .bs-was s { color: ${tx(55)}; }
  ${S} .bs-off { padding: 3px 6px; border-radius: 4px; font-size: 9.5px; font-weight: 700; line-height: 1; letter-spacing: .08em; text-transform: uppercase;
    background: ${acc}; color: {{ section.settings.accent_text }}; }
  ${S} .bs-atc { margin-top: 16px; width: 100%; height: 54px; border: 0; border-radius: 99px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;
    font: inherit; font-size: 15px; font-weight: 700; letter-spacing: .02em; background: ${acc}; color: {{ section.settings.accent_text }}; transition: filter .2s, transform .2s; }
  ${S} .bs-atc:hover { filter: brightness(1.05); }
  ${S} .bs-atc:active { transform: scale(.99); }
  ${S} .bs-atc:disabled { opacity: .5; cursor: not-allowed; }
  ${S} .bs-dash { opacity: .45; }
  ${S} .bs-note { margin-top: 12px; text-align: center; font-size: 11.5px; color: ${tx(60)}; }
  @keyframes bs-gv-in { from { opacity: 0; transform: translateY(4px); } }
  @container (min-width: 500px) {
    ${S} .bs-gifts { grid-template-columns: repeat(var(--gc, 4), minmax(0, 1fr)); }
  }
  @container (min-width: 720px) {
    ${S} .bs-in { grid-template-columns: minmax(0, 1.05fr) minmax(0, 1fr); align-items: center; gap: 48px; padding: 56px 40px; }
    ${S} .bs-h { font-size: 38px; }
    ${S} .bs-gifts { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  }
  @container (min-width: 1000px) {
    ${S} .bs-h { font-size: 44px; }
  }
</style>`;

  const markup = `{%- comment -%}
  Free Gift Value Stack by boost.supply. Add it to your product template.
  - The gifts are display only: Shopify won't add them by itself. Set them
    up as an automatic discount (Discounts > Buy X get Y, 100% off the gift
    products, optionally limited to subscription orders) or in your
    free-gift app. The Gift block values add up to the total that the
    heading, perks and gift texts can show (see the Heading setting).
  - Subscribe & save uses the product's first selling plan from your
    subscriptions app. Without one, the subscription card is hidden and the
    gifts show as included with every order.
  - Gift photos come from each Gift block's image picker.
{%- endcomment -%}
{%- liquid
  assign bs_v = product.selected_or_first_available_variant
  assign bs_total = 0
  assign bs_gc = 0
  for block in section.blocks
    if block.type == 'gift'
      assign bs_total = bs_total | plus: block.settings.value
      assign bs_gc = bs_gc | plus: 1
    endif
  endfor
  if bs_gc > 4
    assign bs_gc = 3
  endif
  assign bs_total_money = bs_total | times: 100 | money_without_trailing_zeros
  assign bs_open = '{' | append: '{'
  assign bs_close = '}' | append: '}'
  assign bs_token = bs_open | append: 'total' | append: bs_close

  assign bs_alloc = bs_v.selling_plan_allocations.first
  assign bs_has_sub = false
  if product.selling_plan_groups.size > 0 and bs_alloc
    assign bs_has_sub = true
  endif
  assign bs_ref = bs_v.price
  if bs_v.compare_at_price > bs_v.price
    assign bs_ref = bs_v.compare_at_price
  endif
  assign bs_sub_default = false
  if bs_has_sub
    if section.settings.default_plan == 'subscription' or product.requires_selling_plan
      assign bs_sub_default = true
    endif
  endif
  assign bs_sub_only = false
  if section.settings.gifts_sub_only and bs_has_sub
    assign bs_sub_only = true
  endif
-%}
<div class="bs-gv-{{ section.id }}{% if bs_sub_only and bs_sub_default == false %} is-locked{% endif %}" id="bs-gv-{{ section.id }}" data-per="{{ section.settings.per_text | escape }}"{% if bs_sub_only %} data-sub-only{% endif %}>
  <div class="bs-in">
    <div class="bs-stack">
      {%- if section.settings.eyebrow != blank -%}<p class="bs-eyebrow">${iconMarkup("pack:gift", 14, 2)}{{ section.settings.eyebrow }}</p>{%- endif -%}
      <h2 class="bs-h">
        {{- section.settings.heading | replace: bs_token, bs_total_money -}}
        {%- if section.settings.heading_em != blank -%}<em>{{ section.settings.heading_em | replace: bs_token, bs_total_money }}</em>{%- endif -%}
      </h2>
      {%- if section.settings.text != blank -%}<p class="bs-x">{{ section.settings.text | replace: bs_token, bs_total_money }}</p>{%- endif -%}

      <div class="bs-gifts" style="--gc: {{ bs_gc | at_least: 1 }};">
        {%- for block in section.blocks -%}
          {%- if block.type == 'gift' -%}
            <div class="bs-gift" {{ block.shopify_attributes }}>
              <div class="bs-gimg">
                {%- if block.settings.image -%}
                  {{ block.settings.image | image_url: width: 400 | image_tag: loading: 'lazy', alt: block.settings.name }}
                {%- else -%}
                  {%- assign bs_ph = forloop.index0 | modulo: 6 | plus: 1 -%}
                  {{ 'product-' | append: bs_ph | placeholder_svg_tag: 'bs-ph' }}
                {%- endif -%}
              </div>
              <p class="bs-gn">{{ block.settings.name }}</p>
              <p class="bs-gv">
                {%- if block.settings.value > 0 -%}<s>{{ block.settings.value | times: 100 | money_without_trailing_zeros }}</s>{%- endif -%}
                <b>{{ section.settings.free_text }}</b>
              </p>
            </div>
          {%- endif -%}
        {%- endfor -%}
      </div>

      {%- if section.settings.included_text != blank -%}
        <p class="bs-inc bs-inc-on"><span class="bs-ico">${check(10)}</span><span>{{ section.settings.included_text | replace: bs_token, bs_total_money }}</span></p>
      {%- endif -%}
      {%- if bs_sub_only and section.settings.lock_text != blank -%}
        <button type="button" class="bs-inc bs-inc-off" data-pick-sub><span class="bs-ico">${lock}</span><span>{{ section.settings.lock_text | replace: bs_token, bs_total_money }}</span></button>
      {%- endif -%}
    </div>

    <div class="bs-buy">
      {%- if product -%}
        {%- form 'product', product, class: 'bs-form' -%}
          {%- if product.has_only_default_variant -%}
            <input type="hidden" name="id" value="{{ bs_v.id }}">
          {%- else -%}
            <div class="bs-variant">
              <select name="id" class="bs-select" aria-label="{{ product.options | join: ' / ' | escape }}">
                {%- for bs_var in product.variants -%}
                  {%- assign bs_va = bs_var.selling_plan_allocations.first -%}
                  <option value="{{ bs_var.id }}" data-price="{{ bs_var.price }}" data-ref="{{ bs_var.compare_at_price | default: 0 }}" data-sub-price="{% if bs_va %}{{ bs_va.price }}{% else %}{{ bs_var.price }}{% endif %}"{% if bs_var.id == bs_v.id %} selected{% endif %}{% unless bs_var.available %} disabled{% endunless %}>{{ bs_var.title }}</option>
                {%- endfor -%}
              </select>
            </div>
          {%- endif -%}

          <div class="bs-plans" role="radiogroup" aria-label="Purchase options">
            {%- if bs_has_sub -%}
              {%- assign bs_off = bs_ref | minus: bs_alloc.price | times: 100 | divided_by: bs_ref -%}
              <label class="bs-plan">
                <input type="radio" name="selling_plan" value="{{ bs_alloc.selling_plan.id }}" data-price="{{ bs_alloc.price }}" data-sub{% if bs_sub_default %} checked{% endif %}>
                {%- if section.settings.sub_badge != blank -%}<span class="bs-badge">{{ section.settings.sub_badge }}</span>{%- endif -%}
                <span class="bs-radio" aria-hidden="true"></span>
                <span class="bs-pm">
                  <span class="bs-pt">{{ section.settings.sub_title }}</span>
                  {%- if section.settings.sub_perks != blank -%}
                    {%- assign bs_perks = section.settings.sub_perks | replace: bs_token, bs_total_money | newline_to_br | split: '<br />' -%}
                    <span class="bs-perks">
                      {%- for bs_pk in bs_perks -%}
                        {%- assign bs_pkt = bs_pk | strip -%}
                        {%- if bs_pkt != blank -%}<span class="bs-perk">${check(12)}<span>{{ bs_pkt }}</span></span>{%- endif -%}
                      {%- endfor -%}
                    </span>
                  {%- endif -%}
                </span>
                <span class="bs-pp">
                  <span class="bs-amt"><span data-sub-amt>{{ bs_alloc.price | money }}</span><small>{{ section.settings.per_text }}</small></span>
                  <span class="bs-was" data-sub-was{% unless bs_ref > bs_alloc.price %} hidden{% endunless %}>
                    <s data-ref-amt>{{ bs_ref | money }}</s><b class="bs-off"><span data-off>{{ bs_off }}</span>% {{ section.settings.off_text }}</b>
                  </span>
                </span>
              </label>
            {%- endif -%}
            {%- unless product.requires_selling_plan -%}
              <label class="bs-plan">
                <input type="radio" name="selling_plan" value="" data-price="{{ bs_v.price }}"{% unless bs_sub_default %} checked{% endunless %}>
                <span class="bs-radio" aria-hidden="true"></span>
                <span class="bs-pm">
                  <span class="bs-pt">{{ section.settings.one_title }}</span>
                  {%- if section.settings.one_perks != blank -%}
                    {%- assign bs_perks = section.settings.one_perks | replace: bs_token, bs_total_money | newline_to_br | split: '<br />' -%}
                    <span class="bs-perks">
                      {%- for bs_pk in bs_perks -%}
                        {%- assign bs_pkt = bs_pk | strip -%}
                        {%- if bs_pkt != blank -%}<span class="bs-perk">${check(12)}<span>{{ bs_pkt }}</span></span>{%- endif -%}
                      {%- endfor -%}
                    </span>
                  {%- endif -%}
                </span>
                <span class="bs-pp"><span class="bs-amt" data-one-amt>{{ bs_v.price | money }}</span></span>
              </label>
            {%- endunless -%}
          </div>

          <button type="submit" name="add" class="bs-atc"{% unless bs_v.available %} disabled{% endunless %}>
            <span>{{ section.settings.button_text }}</span>
            <span class="bs-dash" aria-hidden="true">—</span>
            <span data-price-out>{%- if bs_sub_default -%}{{ bs_alloc.price | money }}{{ section.settings.per_text }}{%- else -%}{{ bs_v.price | money }}{%- endif -%}</span>
          </button>
        {%- endform -%}
      {%- endif -%}
      {%- if section.settings.note != blank -%}<p class="bs-note">{{ section.settings.note }}</p>{%- endif -%}
    </div>
  </div>
</div>
<script>
  (function () {
    var root = document.getElementById('bs-gv-{{ section.id }}');
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
    var per = root.getAttribute('data-per') || '';
    var subOnly = root.hasAttribute('data-sub-only');
    var radios = root.querySelectorAll('input[name="selling_plan"]');
    var subR = root.querySelector('input[name="selling_plan"][data-sub]');
    var oneR = root.querySelector('input[name="selling_plan"]:not([data-sub])');
    var out = root.querySelector('[data-price-out]');
    var select = root.querySelector('.bs-select');
    function text(sel, value) {
      var el = root.querySelector(sel);
      if (el) el.textContent = value;
    }
    function update() {
      var r = root.querySelector('input[name="selling_plan"]:checked');
      if (!r) return;
      if (out) out.textContent = money(parseInt(r.getAttribute('data-price'), 10) || 0) + (r.value ? per : '');
      root.classList.toggle('is-locked', subOnly && !r.value);
    }
    function syncVariant() {
      if (!select) return;
      var o = select.options[select.selectedIndex];
      var p = parseInt(o.getAttribute('data-price'), 10) || 0;
      var sp = parseInt(o.getAttribute('data-sub-price'), 10) || p;
      var ref = Math.max(p, parseInt(o.getAttribute('data-ref'), 10) || 0);
      if (subR) subR.setAttribute('data-price', sp);
      if (oneR) oneR.setAttribute('data-price', p);
      text('[data-sub-amt]', money(sp));
      text('[data-one-amt]', money(p));
      text('[data-ref-amt]', money(ref));
      text('[data-off]', ref > 0 ? Math.floor((ref - sp) * 100 / ref) : 0);
      var was = root.querySelector('[data-sub-was]');
      if (was) was.hidden = !(ref > sp);
      update();
    }
    radios.forEach(function (r) { r.addEventListener('change', update); });
    if (select) select.addEventListener('change', syncVariant);
    var pick = root.querySelector('[data-pick-sub]');
    if (pick && subR) {
      pick.addEventListener('click', function () {
        subR.checked = true;
        update();
        subR.focus();
      });
    }
    update();
  })();
</script>`;

  const gifts = list(config, "gifts");
  const radius = num(config, "radius", 14);

  const schema = buildSchema({
    name: "Free Gift Value Stack",
    settings: [
      { type: "text", id: "eyebrow", label: "Eyebrow", default: str(config, "eyebrow") },
      { type: "text", id: "heading", label: "Heading (use {{total}} for the gift value)", default: str(config, "heading") },
      { type: "text", id: "heading_em", label: "Heading, italic line", default: str(config, "headingEm") },
      { type: "textarea", id: "text", label: "Text", default: str(config, "text") },
      { type: "header", content: "Gifts" },
      { type: "text", id: "free_text", label: "Free label", default: str(config, "freeText") },
      { type: "checkbox", id: "gifts_sub_only", label: "Gifts only with Subscribe & save", default: bool(config, "giftsSubOnly", true) },
      { type: "text", id: "included_text", label: "Gifts included text", default: str(config, "includedText") },
      { type: "text", id: "lock_text", label: "One-time selected text", default: str(config, "lockText") },
      { type: "header", content: "Plans" },
      {
        type: "select",
        id: "default_plan",
        label: "Preselected plan",
        options: [
          { value: "subscription", label: "Subscribe & save" },
          { value: "one_time", label: "One-time purchase" },
        ],
        default: str(config, "plan", "sub") === "one" ? "one_time" : "subscription",
      },
      { type: "text", id: "sub_title", label: "Subscription title", default: str(config, "subTitle") },
      { type: "text", id: "sub_badge", label: "Subscription badge", default: str(config, "subBadge") },
      { type: "textarea", id: "sub_perks", label: "Subscription perks (one per line)", default: str(config, "subPerks") },
      { type: "text", id: "one_title", label: "One-time title", default: str(config, "oneTitle") },
      { type: "textarea", id: "one_perks", label: "One-time perks (one per line)", default: str(config, "onePerks") },
      { type: "text", id: "per_text", label: "Price suffix", default: str(config, "perText") },
      { type: "text", id: "off_text", label: "Discount label", default: str(config, "offText") },
      { type: "header", content: "Button" },
      { type: "text", id: "button_text", label: "Button text", default: str(config, "buttonText") },
      { type: "text", id: "note", label: "Note under button", default: str(config, "note") },
      { type: "header", content: "Style" },
      { type: "color", id: "bg", label: "Background", default: str(config, "bg") },
      { type: "color", id: "text_color", label: "Text", default: str(config, "textColor") },
      { type: "color", id: "accent", label: "Accent", default: str(config, "accent") },
      { type: "color", id: "accent_text", label: "Text on accent", default: str(config, "accentText") },
      { type: "color", id: "badge", label: "Badge", default: str(config, "badge") },
      { type: "color", id: "badge_text", label: "Badge text", default: str(config, "badgeText") },
      { type: "color", id: "tile", label: "Gift image background", default: str(config, "tile") },
      { type: "range", id: "radius", label: "Corner radius", min: 0, max: 24, step: 2, unit: "px", default: Math.max(0, Math.min(24, Math.round(radius / 2) * 2)) },
    ],
    blocks: [
      {
        type: "gift",
        name: "Gift",
        settings: [
          { type: "text", id: "name", label: "Name" },
          { type: "number", id: "value", label: "Value (whole amount, e.g. 35)", default: 25 },
          { type: "image_picker", id: "image", label: "Image" },
        ],
      },
    ],
    maxBlocks: 6,
    presetBlocks: gifts.slice(0, 6).map((g) => ({
      type: "gift",
      settings: {
        name: esc(g.name ?? ""),
        value: Math.max(0, Math.round(toNum(g.value))),
      },
    })),
  });

  return section({ style, markup, schema });
}

export const giftValueStack: Tweak = {
  slug: "gift-value-stack",
  inspiredBy: "im8",
  name: "Free Gift Value Stack",
  tagline: "Stack the value of your welcome gifts right above a subscribe-or-one-time picker.",
  description:
    "Modeled on the welcome-kit block IM8 uses on its product pages. A serif headline adds up the value of your free gifts, a 2×2 of gift tiles strikes each price through to FREE, and a plan picker sets Subscribe & save (with a Most popular badge and % off) against one-time. Tie the gifts to the subscription and they dim when shoppers pick one-time, with a one-tap nudge back. Built on the real product form and your selling plans.",
  category: "product-page",
  tier: "paid",
  price: 29,
  tint: "#f6ece8",
  Preview,
  generateLiquid,
  defaults,
  fields: [
    { key: "eyebrow", label: "Eyebrow", type: "text", group: "Content" },
    { key: "heading", label: "Heading", type: "text", group: "Content", hint: "Use {{total}} for the added-up gift value" },
    { key: "headingEm", label: "Heading, italic line", type: "text", group: "Content" },
    { key: "text", label: "Text", type: "textarea", group: "Content" },
    { key: "currency", label: "Currency symbol", type: "text", group: "Content" },
    {
      key: "gifts", label: "Gifts", type: "list", group: "Gifts",
      hint: "Value is a number. Leave the image URL empty for a drawn placeholder. In Shopify you pick a photo per gift",
      itemFields: [
        { key: "name", label: "Name", type: "text" },
        { key: "value", label: "Value", type: "text" },
        { key: "image", label: "Image URL", type: "text" },
      ],
      newItem: { name: "Extra measuring scoop", value: "15", image: "/mockups/gift-scoop.jpg" },
      addLabel: "Add gift",
      max: 6,
    },
    { key: "freeText", label: "Free label", type: "text", group: "Gifts" },
    { key: "giftsSubOnly", label: "Gifts only with Subscribe & save", type: "toggle", group: "Gifts" },
    { key: "includedText", label: "Gifts included text", type: "text", group: "Gifts" },
    { key: "lockText", label: "One-time selected text", type: "text", group: "Gifts" },
    {
      key: "plan", label: "Preselected plan", type: "select", group: "Plans",
      options: [
        { label: "Subscribe & save", value: "sub" },
        { label: "One-time purchase", value: "one" },
      ],
    },
    { key: "price", label: "Preview price", type: "text", group: "Plans", hint: "Editor preview only; your store uses the product and selling plan prices" },
    { key: "subDiscount", label: "Preview subscription discount", type: "slider", group: "Plans", min: 0, max: 60, step: 1, unit: "%" },
    { key: "subTitle", label: "Subscription title", type: "text", group: "Plans" },
    { key: "subBadge", label: "Subscription badge", type: "text", group: "Plans" },
    { key: "subPerks", label: "Subscription perks", type: "textarea", group: "Plans", hint: "One per line. {{total}} works here too" },
    { key: "oneTitle", label: "One-time title", type: "text", group: "Plans" },
    { key: "onePerks", label: "One-time perks", type: "textarea", group: "Plans" },
    { key: "perText", label: "Price suffix", type: "text", group: "Plans" },
    { key: "offText", label: "Discount label", type: "text", group: "Plans" },
    { key: "buttonText", label: "Button text", type: "text", group: "Button" },
    { key: "note", label: "Note under button", type: "text", group: "Button" },
    fontField("Typography", "headingFont", "Heading font"),
    fontField("Typography", "font", "Body font"),
    { key: "radius", label: "Corner radius", type: "slider", group: "Layout", min: 0, max: 24, step: 2, unit: "px" },
    { key: "bg", label: "Background", type: "color", group: "Colors" },
    { key: "textColor", label: "Text", type: "color", group: "Colors" },
    { key: "accent", label: "Accent", type: "color", group: "Colors" },
    { key: "accentText", label: "Text on accent", type: "color", group: "Colors" },
    { key: "badge", label: "Badge", type: "color", group: "Colors" },
    { key: "badgeText", label: "Badge text", type: "color", group: "Colors" },
    { key: "tile", label: "Gift image background", type: "color", group: "Colors" },
    { key: "art", label: "Fallback drawing tone", type: "color", group: "Colors", hint: "Only used for gifts without an image URL" },
  ],
};
