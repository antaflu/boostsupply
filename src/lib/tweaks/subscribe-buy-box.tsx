"use client";

import { useRef, useState } from "react";
import type { Tweak, TweakConfig } from "../types";
import { str, num, bool, list, fontStack, esc } from "../cfg";
import { fontField } from "../fields";
import { buildSchema, section, fontFaceFor } from "../liquid";
import { ProductArt, money, toNum } from "./product-art";

/* ============================================================
   Subscribe Buy Box
   A subscription-first buy box: product photo, Subscribe & save
   vs one-time radio cards that lead with a big price per serving
   (the selected card opens to show its perks and delivery
   cadence), a free welcome kit strip that only unlocks with the
   subscription, a guarantee line and an add-to-cart button that
   carries the price.
   ============================================================ */

const EASE = "cubic-bezier(.22,1,.36,1)";

const defaults: TweakConfig = {
  image: "/mockups/value-greens.jpg",
  imageBadge: "30 servings · 1 scoop a day",
  rating: "4.8 · 9,400+ reviews",
  productName: "Daily Greens",
  subtitle: "75 vitamins, minerals and whole-food ingredients in one daily scoop.",
  currency: "$",
  price: "99",
  subDiscount: 20,
  servings: 30,
  plan: "sub",
  subTitle: "Subscribe & save",
  saveText: "Save",
  subPerks: "Free welcome kit with your first order\nFree shipping on every delivery\nSkip, pause or cancel anytime",
  frequency: "Ships every 30 days",
  oneTitle: "One-time purchase",
  onePerks: "Single delivery, no commitment",
  perServing: "per serving",
  kitTitle: "Free welcome kit",
  kitValue: "$68 value",
  kitSubOnly: true,
  kitLock: "Choose Subscribe & save to get the free kit",
  kit: [
    { name: "Steel shaker", image: "/mockups/gift-shaker.jpg" },
    { name: "Glass canister", image: "/mockups/gift-jar.jpg" },
    { name: "Brass scoop", image: "/mockups/gift-scoop.jpg" },
    { name: "5 travel packs", image: "" },
  ],
  guarantee: "90-day money-back guarantee. Love it or get every penny back.",
  subButton: "Start my subscription",
  oneButton: "Add to cart",
  cancelNote: "Cancel anytime online. No calls, no fees.",
  bg: "#F4F1E8",
  card: "#FFFFFF",
  textColor: "#111111",
  muted: "#5B635E",
  accent: "#12372A",
  accentText: "#F4F1E8",
  sage: "#C9D6C3",
  font: "system",
  radius: 18,
};

/** Hex color + alpha byte, e.g. tint("#12372A", 0.12). */
const tint = (hex: string, a: number) =>
  /^#[0-9a-f]{6}$/i.test(hex)
    ? hex + Math.round(a * 255).toString(16).padStart(2, "0")
    : hex;

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

function Stars({ color }: { color: string }) {
  return (
    <span className="flex gap-[2px]" aria-hidden>
      {Array.from({ length: 5 }, (_, i) => (
        <svg key={i} width="12" height="12" viewBox="0 0 24 24" fill={color}>
          <path d="M12 2.8l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2l-5.7 3.1 1.2-6.4L2.8 9.5l6.4-.8z" />
        </svg>
      ))}
    </span>
  );
}

function Shield({ color }: { color: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="shrink-0">
      <path d="M12 3l7 3v5c0 4.5-3 7.6-7 9-4-1.4-7-4.5-7-9V6z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}

function Preview({ config }: { config: TweakConfig }) {
  const cur = str(config, "currency", "$");
  const bg = str(config, "bg", "#F4F1E8");
  const card = str(config, "card", "#FFFFFF");
  const text = str(config, "textColor", "#111111");
  const muted = str(config, "muted", "#5B635E");
  const accent = str(config, "accent", "#12372A");
  const accentText = str(config, "accentText", "#F4F1E8");
  const sage = str(config, "sage", "#C9D6C3");
  const radius = num(config, "radius", 18);
  const photo = str(config, "image").trim();

  const price = toNum(str(config, "price"), 99);
  const off = Math.max(0, Math.min(90, num(config, "subDiscount", 20)));
  const subPrice = price * (1 - off / 100);
  const servings = Math.max(1, num(config, "servings", 30));

  /* follow the "preselected plan" control, but let shoppers click around */
  const initial = str(config, "plan", "sub") === "one" ? "one" : "sub";
  const [prevInitial, setPrevInitial] = useState(initial);
  const [plan, setPlan] = useState(initial);
  if (initial !== prevInitial) {
    setPrevInitial(initial);
    setPlan(initial);
  }
  const isSub = plan === "sub";
  const kit = list(config, "kit");
  const locked = bool(config, "kitSubOnly", true) && !isSub;

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
      badge: off > 0 ? `${str(config, "saveText", "Save")} ${Math.round(off)}%` : "",
      each: subPrice / servings,
      total: subPrice,
      was: off > 0 ? price : 0,
      perks: lines(str(config, "subPerks")),
      extra: str(config, "frequency"),
    },
    {
      id: "one",
      title: str(config, "oneTitle"),
      badge: "",
      each: price / servings,
      total: price,
      was: 0,
      perks: lines(str(config, "onePerks")),
      extra: "",
    },
  ];
  const chosen = isSub ? plans[0] : plans[1];

  return (
    <div className="@container w-full" style={{ background: bg, color: text, fontFamily: fontStack(str(config, "font", "system")) }}>
      <div className="mx-auto grid w-full max-w-[1080px] gap-5 p-4 @min-[700px]:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] @min-[700px]:items-start @min-[700px]:gap-10 @min-[700px]:p-10">
        {/* Photo */}
        <div
          className="relative aspect-[4/3] overflow-hidden @min-[480px]:aspect-[16/9] @min-[700px]:aspect-[4/5]"
          style={{ background: sage, borderRadius: radius }}
        >
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photo}
              alt={str(config, "productName")}
              loading="lazy"
              decoding="async"
              className="absolute inset-0 h-full w-full object-cover"
              style={{ objectPosition: "60% 72%" }}
            />
          ) : (
            <div className="grid h-full w-full place-items-center [&>div]:h-[70%]! [&>div]:w-[70%]! [&_svg]:h-[82%] [&_svg]:w-[82%]">
              <ProductArt kind="bag" tone={accent} size={160} tile="transparent" />
            </div>
          )}
          {str(config, "imageBadge") && (
            <span
              className="absolute left-3 top-3 rounded-full px-3 py-1.5 text-[11.5px] font-semibold leading-none backdrop-blur-md"
              style={{ background: tint("#FFFFFF", 0.82), color: accent }}
            >
              {str(config, "imageBadge")}
            </span>
          )}
        </div>

        {/* Buy panel */}
        <div className="min-w-0">
          {str(config, "rating") && (
            <p className="flex items-center gap-2 text-[12px] font-medium" style={{ color: muted }}>
              <Stars color={accent} />
              {str(config, "rating")}
            </p>
          )}
          <h3 className="mt-2 text-[30px] font-semibold leading-[1.02] tracking-[-0.035em] @min-[700px]:text-[40px]">
            {str(config, "productName")}
          </h3>
          {str(config, "subtitle") && (
            <p className="mt-2 text-[14px] leading-relaxed" style={{ color: muted }}>
              {str(config, "subtitle")}
            </p>
          )}

          {/* Plans */}
          <div role="radiogroup" aria-label="Purchase options" className="mt-5 grid gap-2.5">
            {plans.map((p) => {
              const on = plan === p.id;
              return (
                <div
                  key={p.id}
                  role="radio"
                  aria-checked={on}
                  tabIndex={0}
                  onClick={() => setPlan(p.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setPlan(p.id);
                    }
                  }}
                  className="cursor-pointer px-4 py-3.5 outline-none transition-[box-shadow,background-color] duration-300"
                  style={{
                    background: card,
                    borderRadius: radius - 4,
                    boxShadow: on ? `inset 0 0 0 2px ${accent}` : `inset 0 0 0 1px ${tint(text, 0.12)}`,
                    transitionTimingFunction: EASE,
                  }}
                >
                  <div className="flex items-center gap-3">
                    <span
                      aria-hidden
                      className="h-5 w-5 shrink-0 rounded-full transition-[box-shadow] duration-300"
                      style={{
                        boxShadow: on ? `inset 0 0 0 6px ${accent}` : `inset 0 0 0 1.5px ${tint(text, 0.3)}`,
                        transitionTimingFunction: EASE,
                      }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[15px] font-semibold leading-tight tracking-[-0.01em]">
                        {p.title}
                        {p.badge && (
                          <span
                            className="rounded-full px-2 py-[3px] text-[10.5px] font-bold leading-none tracking-[0.02em]"
                            style={{ background: sage, color: accent }}
                          >
                            {p.badge}
                          </span>
                        )}
                      </p>
                      <p className="mt-1 text-[12.5px] tabular-nums" style={{ color: muted }}>
                        {p.was > 0 && <s className="mr-1.5">{money(p.was, cur)}</s>}
                        <span style={{ color: text }}>{money(p.total, cur)}</span>
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-[28px] font-semibold leading-none tracking-[-0.045em] tabular-nums @min-[700px]:text-[32px]">
                        {money(p.each, cur)}
                      </p>
                      <p className="mt-1 text-[11px]" style={{ color: muted }}>
                        {str(config, "perServing")}
                      </p>
                    </div>
                  </div>

                  {(p.perks.length > 0 || p.extra) && (
                    <div
                      className="grid transition-[grid-template-rows,opacity] duration-500"
                      style={{ gridTemplateRows: on ? "1fr" : "0fr", opacity: on ? 1 : 0, transitionTimingFunction: EASE }}
                    >
                      <div className="min-h-0 overflow-hidden">
                        <div className="ml-8 mt-3 grid gap-1.5 pt-3" style={{ borderTop: `1px solid ${tint(text, 0.08)}` }}>
                          {p.perks.map((k, j) => (
                            <p key={j} className="flex items-start gap-2 text-[12.5px] leading-snug">
                              <span className="mt-[2px]">
                                <Check color={accent} />
                              </span>
                              {k}
                            </p>
                          ))}
                          {p.extra && (
                            <span
                              className="mt-1.5 inline-flex w-fit items-center gap-2 rounded-full px-3 py-1.5 text-[12px] font-medium"
                              style={{ boxShadow: `inset 0 0 0 1px ${tint(text, 0.14)}` }}
                            >
                              {p.extra}
                              <svg width="9" height="9" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                                <path d="M2 3.8L5 6.8 8 3.8" />
                              </svg>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Welcome kit */}
          {kit.length > 0 && (
            <div className="mt-3 px-4 py-3.5" style={{ background: tint(sage, 0.55), borderRadius: radius - 4 }}>
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-[13.5px] font-semibold tracking-[-0.01em]">{str(config, "kitTitle")}</p>
                {str(config, "kitValue") && (
                  <p className="text-[12px] font-semibold tabular-nums" style={{ color: accent }}>
                    {locked ? <s style={{ color: muted }}>{str(config, "kitValue")}</s> : str(config, "kitValue")}
                  </p>
                )}
              </div>
              <div
                className="mt-2.5 grid grid-cols-2 gap-1.5 transition-[opacity,filter] duration-500 @min-[460px]:flex @min-[460px]:flex-wrap"
                style={{ opacity: locked ? 0.45 : 1, filter: locked ? "grayscale(1)" : "none", transitionTimingFunction: EASE }}
              >
                {kit.map((k, i) => {
                  const img = (k.image ?? "").trim();
                  return (
                    <span
                      key={i}
                      className="flex min-w-0 items-center gap-2 rounded-full py-1 pl-1 pr-3 text-[12px] font-medium"
                      style={{ background: card }}
                    >
                      <span className="relative grid h-7 w-7 shrink-0 place-items-center overflow-hidden rounded-full" style={{ background: sage }}>
                        {img ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={img} alt="" loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover" />
                        ) : (
                          <ProductArt kind="bag" tone={accent} size={26} tile="transparent" />
                        )}
                      </span>
                      <span className="truncate">{k.name}</span>
                    </span>
                  );
                })}
              </div>
              {locked && str(config, "kitLock") && (
                <button
                  type="button"
                  onClick={() => setPlan("sub")}
                  className="bs-swap mt-2.5 text-left text-[12px] font-medium underline decoration-[1px] underline-offset-[3px]"
                  style={{ color: accent }}
                >
                  {str(config, "kitLock")}
                </button>
              )}
            </div>
          )}

          {/* Add to cart */}
          <button
            type="button"
            onClick={add}
            className="mt-4 flex h-14 w-full items-center justify-center rounded-full text-[15.5px] font-semibold tracking-[-0.005em] transition-[filter,scale] duration-200 hover:brightness-125 active:scale-[0.99]"
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
                  {isSub ? str(config, "subButton") : str(config, "oneButton")}
                  <span style={{ opacity: 0.45 }}>·</span>
                  <span className="tabular-nums">{money(chosen.total, cur)}</span>
                </>
              )}
            </span>
          </button>

          {str(config, "guarantee") && (
            <p className="mt-3.5 flex items-center gap-2.5 text-[12.5px] leading-snug" style={{ color: text }}>
              <Shield color={accent} />
              {str(config, "guarantee")}
            </p>
          )}
          {isSub && str(config, "cancelNote") && (
            <p className="mt-1.5 pl-[28px] text-[11.5px]" style={{ color: muted }}>
              {str(config, "cancelNote")}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function generateLiquid(config: TweakConfig): string {
  const { face, family } = fontFaceFor(str(config, "font", "system"));
  const S = ".bs-sb-{{ section.id }}";
  const t = "{{ section.settings.text_color }}";
  const acc = "{{ section.settings.accent }}";
  const mu = "{{ section.settings.muted }}";
  const tx = (pct: number) => `color-mix(in srgb, ${t} ${pct}%, transparent)`;
  const r = "{{ section.settings.radius }}px";
  const ri = "{{ section.settings.radius | minus: 4 | at_least: 0 }}px";
  const check = `<svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2.5 6.3l2.3 2.2 4.7-5"/></svg>`;
  const star = `<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.8l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2l-5.7 3.1 1.2-6.4L2.8 9.5l6.4-.8z"/></svg>`;
  const shield = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l7 3v5c0 4.5-3 7.6-7 9-4-1.4-7-4.5-7-9V6z"/><path d="M9 12l2 2 4-4"/></svg>`;

  const style = `<style>
${face ? face + "\n" : ""}  ${S} { container-type: inline-size; background: {{ section.settings.bg }}; color: ${t}; font-family: ${family}; }
  ${S} * { box-sizing: border-box; }
  ${S} p, ${S} h1, ${S} h2 { margin: 0; }
  ${S} [hidden] { display: none !important; }
  ${S} .bs-in { max-width: 1080px; margin: 0 auto; padding: 16px; display: grid; gap: 20px; }
  ${S} .bs-media { position: relative; aspect-ratio: 4 / 3; overflow: hidden; display: grid; place-items: center; background: {{ section.settings.sage }}; border-radius: ${r}; }
  ${S} .bs-media img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; object-position: 60% 72%; }
  ${S} .bs-media .bs-ph { width: 70%; height: 70%; fill: ${acc}; opacity: .3; }
  ${S} .bs-media-badge { position: absolute; top: 12px; left: 12px; padding: 6px 12px; border-radius: 99px; font-size: 11.5px; font-weight: 600; line-height: 1;
    background: rgba(255,255,255,.82); color: ${acc}; -webkit-backdrop-filter: blur(12px); backdrop-filter: blur(12px); }
  ${S} .bs-panel { min-width: 0; }
  ${S} .bs-rating { display: flex; align-items: center; gap: 8px; font-size: 12px; font-weight: 500; color: ${mu}; }
  ${S} .bs-stars { display: flex; gap: 2px; color: ${acc}; }
  ${S} .bs-title { margin-top: 8px; font-size: 30px; font-weight: 600; line-height: 1.02; letter-spacing: -.035em; }
  ${S} .bs-sub { margin-top: 8px; font-size: 14px; line-height: 1.6; color: ${mu}; }
  ${S} .bs-form { margin: 0; }
  ${S} .bs-variant { position: relative; margin-top: 20px; }
  ${S} .bs-variant::after { content: ""; position: absolute; right: 18px; top: 18px; width: 7px; height: 7px; pointer-events: none; opacity: .7;
    border-right: 1.5px solid currentColor; border-bottom: 1.5px solid currentColor; transform: rotate(45deg); }
  ${S} .bs-select { width: 100%; height: 50px; padding: 0 44px 0 16px; border: 0; border-radius: ${ri}; appearance: none; -webkit-appearance: none; cursor: pointer;
    background: {{ section.settings.card }}; color: inherit; font: inherit; font-size: 14px; box-shadow: inset 0 0 0 1px ${tx(12)}; }
  ${S} .bs-plans { margin-top: 20px; display: grid; gap: 10px; }
  ${S} .bs-plan { position: relative; display: block; padding: 14px 16px; cursor: pointer; background: {{ section.settings.card }}; border-radius: ${ri};
    box-shadow: inset 0 0 0 1px ${tx(12)}; transition: box-shadow .3s cubic-bezier(.22,1,.36,1); }
  ${S} .bs-plan > input { position: absolute; opacity: 0; pointer-events: none; }
  ${S} .bs-plan:has(> input:checked) { box-shadow: inset 0 0 0 2px ${acc}; }
  ${S} .bs-plan:has(> input:focus-visible) { outline: 2px solid ${acc}; outline-offset: 2px; }
  ${S} .bs-row { display: flex; align-items: center; gap: 12px; }
  ${S} .bs-radio { width: 20px; height: 20px; flex-shrink: 0; border-radius: 99px; box-shadow: inset 0 0 0 1.5px ${tx(30)}; transition: box-shadow .3s cubic-bezier(.22,1,.36,1); }
  ${S} .bs-plan:has(> input:checked) .bs-radio { box-shadow: inset 0 0 0 6px ${acc}; }
  ${S} .bs-pm { flex: 1; min-width: 0; }
  ${S} .bs-pt { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 8px; font-size: 15px; font-weight: 600; line-height: 1.25; letter-spacing: -.01em; }
  ${S} .bs-save { padding: 3px 8px; border-radius: 99px; font-size: 10.5px; font-weight: 700; line-height: 1; letter-spacing: .02em;
    background: {{ section.settings.sage }}; color: ${acc}; }
  ${S} .bs-ptot { display: block; margin-top: 4px; font-size: 12.5px; color: ${mu}; font-variant-numeric: tabular-nums; }
  ${S} .bs-ptot s { margin-right: 6px; }
  ${S} .bs-ptot b { font-weight: 400; color: ${t}; }
  ${S} .bs-pp { flex-shrink: 0; text-align: right; }
  ${S} .bs-each { display: block; font-size: 28px; font-weight: 600; line-height: 1; letter-spacing: -.045em; font-variant-numeric: tabular-nums; }
  ${S} .bs-per { display: block; margin-top: 4px; font-size: 11px; color: ${mu}; }
  ${S} .bs-more { display: grid; grid-template-rows: 0fr; opacity: 0; transition: grid-template-rows .5s cubic-bezier(.22,1,.36,1), opacity .5s cubic-bezier(.22,1,.36,1); }
  ${S} .bs-plan:has(> input:checked) .bs-more { grid-template-rows: 1fr; opacity: 1; }
  ${S} .bs-more-in { min-height: 0; overflow: hidden; }
  ${S} .bs-perks { display: grid; gap: 6px; margin: 12px 0 0 32px; padding-top: 12px; border-top: 1px solid ${tx(8)}; }
  ${S} .bs-perk { display: flex; align-items: flex-start; gap: 8px; font-size: 12.5px; line-height: 1.4; }
  ${S} .bs-perk svg { flex-shrink: 0; margin-top: 2px; color: ${acc}; }
  ${S} .bs-freq { position: relative; width: fit-content; margin-top: 6px; }
  ${S} .bs-freq select { height: 32px; padding: 0 30px 0 12px; border: 0; border-radius: 99px; appearance: none; -webkit-appearance: none; cursor: pointer;
    background: transparent; color: inherit; font: inherit; font-size: 12px; font-weight: 500; box-shadow: inset 0 0 0 1px ${tx(14)}; }
  ${S} .bs-freq::after { content: ""; position: absolute; right: 13px; top: 11px; width: 5px; height: 5px; pointer-events: none;
    border-right: 1.5px solid currentColor; border-bottom: 1.5px solid currentColor; transform: rotate(45deg); }
  ${S} .bs-freq-one { display: inline-block; margin-top: 6px; padding: 7px 12px; border-radius: 99px; font-size: 12px; font-weight: 500; box-shadow: inset 0 0 0 1px ${tx(14)}; }
  ${S} .bs-kit { margin-top: 12px; padding: 14px 16px; border-radius: ${ri}; background: color-mix(in srgb, {{ section.settings.sage }} 55%, transparent); }
  ${S} .bs-kit-h { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; }
  ${S} .bs-kit-t { font-size: 13.5px; font-weight: 600; letter-spacing: -.01em; }
  ${S} .bs-kit-v { font-size: 12px; font-weight: 600; color: ${acc}; font-variant-numeric: tabular-nums; }
  ${S} .bs-chips { margin-top: 10px; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px;
    transition: opacity .5s cubic-bezier(.22,1,.36,1), filter .5s cubic-bezier(.22,1,.36,1); }
  ${S} .bs-chip { display: flex; min-width: 0; align-items: center; gap: 8px; padding: 4px 12px 4px 4px; border-radius: 99px; font-size: 12px; font-weight: 500;
    background: {{ section.settings.card }}; }
  ${S} .bs-chip-img { position: relative; width: 28px; height: 28px; flex-shrink: 0; overflow: hidden; border-radius: 99px; background: {{ section.settings.sage }}; }
  ${S} .bs-chip-img img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
  ${S} .bs-chip-img .bs-ph { width: 100%; height: 100%; fill: ${acc}; opacity: .35; }
  ${S} .bs-chip span:last-child { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  ${S} .bs-kit-lock { display: none; margin-top: 10px; padding: 0; border: 0; background: none; cursor: pointer; font: inherit; font-size: 12px; font-weight: 500;
    color: ${acc}; text-decoration: underline; text-underline-offset: 3px; text-align: left; }
  ${S}.is-one .bs-kit.is-sub-only .bs-chips { opacity: .45; filter: grayscale(1); }
  ${S}.is-one .bs-kit.is-sub-only .bs-kit-v { color: ${mu}; text-decoration: line-through; }
  ${S}.is-one .bs-kit.is-sub-only .bs-kit-lock { display: block; animation: bs-sb-in .38s cubic-bezier(.22,1,.36,1) both; }
  ${S} .bs-atc { margin-top: 16px; width: 100%; height: 56px; border: 0; border-radius: 99px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;
    font: inherit; font-size: 15.5px; font-weight: 600; letter-spacing: -.005em; background: ${acc}; color: {{ section.settings.accent_text }}; transition: filter .2s, transform .2s; }
  ${S} .bs-atc:hover { filter: brightness(1.25); }
  ${S} .bs-atc:active { transform: scale(.99); }
  ${S} .bs-atc:disabled { opacity: .5; cursor: not-allowed; }
  ${S} .bs-atc .bs-dot { opacity: .45; }
  ${S} .bs-guar { margin-top: 14px; display: flex; align-items: center; gap: 10px; font-size: 12.5px; line-height: 1.4; }
  ${S} .bs-guar svg { color: ${acc}; }
  ${S} .bs-cancel { margin-top: 6px; padding-left: 28px; font-size: 11.5px; color: ${mu}; }
  ${S}.is-one .bs-cancel { display: none; }
  @keyframes bs-sb-in { from { opacity: 0; transform: translateY(4px); } }
  @container (min-width: 460px) {
    ${S} .bs-chips { display: flex; flex-wrap: wrap; }
  }
  @container (min-width: 480px) {
    ${S} .bs-media { aspect-ratio: 16 / 9; }
  }
  @container (min-width: 700px) {
    ${S} .bs-in { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); align-items: start; gap: 40px; padding: 40px; }
    ${S} .bs-media { aspect-ratio: 4 / 5; position: sticky; top: 24px; }
    ${S} .bs-title { font-size: 40px; }
    ${S} .bs-each { font-size: 32px; }
  }
  @media (prefers-reduced-motion: reduce) {
    ${S} .bs-more, ${S} .bs-plan, ${S} .bs-chips { transition: none; }
  }
</style>`;

  const markup = `{%- comment -%}
  Subscribe Buy Box by boost.supply. Add it to your product template (or pick
  a product in the section settings).
  - Subscribe & save uses the product's selling plans from your
    subscriptions app (Shopify Subscriptions, Recharge, Skio, Loop...).
    With more than one plan, shoppers pick the delivery cadence in the
    subscription card. Products without selling plans only show one-time.
  - The welcome kit is display only. Add the kit items with an automatic
    discount (Discounts > Buy X get Y, 100% off, optionally limited to
    subscription orders) or your free-gift app.
  - "Servings per pack" sets the price per serving.
{%- endcomment -%}
{%- liquid
  assign bs_p = product
  if section.settings.product != blank
    assign bs_p = section.settings.product
  endif
  assign bs_v = bs_p.selected_or_first_available_variant
  assign bs_serv = section.settings.servings | at_least: 1
  assign bs_alloc = bs_v.selling_plan_allocations.first
  assign bs_has_sub = false
  if bs_p.selling_plan_groups.size > 0 and bs_alloc
    assign bs_has_sub = true
  endif
  assign bs_ref = bs_v.price
  if bs_v.compare_at_price > bs_v.price
    assign bs_ref = bs_v.compare_at_price
  endif
  assign bs_sub_default = false
  if bs_has_sub
    if section.settings.default_plan == 'subscription' or bs_p.requires_selling_plan
      assign bs_sub_default = true
    endif
  endif
  assign bs_kit_n = 0
  for block in section.blocks
    if block.type == 'kit_item'
      assign bs_kit_n = bs_kit_n | plus: 1
    endif
  endfor
  assign bs_show_kit = false
  if bs_kit_n > 0
    if bs_has_sub or section.settings.kit_sub_only == false
      assign bs_show_kit = true
    endif
  endif
-%}
<div class="bs-sb-{{ section.id }}{% unless bs_sub_default %} is-one{% endunless %}" id="bs-sb-{{ section.id }}" data-sub-label="{{ section.settings.sub_button | escape }}" data-one-label="{{ section.settings.one_button | escape }}" data-serv="{{ bs_serv }}" data-price="{{ bs_v.price }}" data-ref="{{ bs_ref }}">
  <div class="bs-in">
    <div class="bs-media">
      {%- if section.settings.image != blank -%}
        {{ section.settings.image | image_url: width: 1200 | image_tag: loading: 'lazy', alt: bs_p.title, sizes: '(min-width: 750px) 50vw, 100vw' }}
      {%- elsif bs_p.featured_media -%}
        {{ bs_p.featured_media | image_url: width: 1200 | image_tag: loading: 'lazy', sizes: '(min-width: 750px) 50vw, 100vw' }}
      {%- else -%}
        {{ 'product-1' | placeholder_svg_tag: 'bs-ph' }}
      {%- endif -%}
      {%- if section.settings.image_badge != blank -%}<span class="bs-media-badge">{{ section.settings.image_badge }}</span>{%- endif -%}
    </div>

    <div class="bs-panel">
      {%- if section.settings.rating != blank -%}
        <p class="bs-rating"><span class="bs-stars" aria-hidden="true">${star.repeat(5)}</span>{{ section.settings.rating }}</p>
      {%- endif -%}
      <h2 class="bs-title">{{ bs_p.title }}</h2>
      {%- if section.settings.subtitle != blank -%}<p class="bs-sub">{{ section.settings.subtitle }}</p>{%- endif -%}

      {%- if bs_p != blank -%}
        {%- form 'product', bs_p, class: 'bs-form' -%}
          {%- if bs_p.has_only_default_variant -%}
            <input type="hidden" name="id" value="{{ bs_v.id }}">
          {%- else -%}
            <div class="bs-variant">
              <select name="id" class="bs-select" aria-label="{{ bs_p.options | join: ' / ' | escape }}">
                {%- for bs_var in bs_p.variants -%}
                  <option value="{{ bs_var.id }}" data-price="{{ bs_var.price }}" data-ref="{{ bs_var.compare_at_price | default: 0 }}" data-plans="{%- for bs_a in bs_var.selling_plan_allocations -%}{{ bs_a.selling_plan.id }}:{{ bs_a.price }}{%- unless forloop.last -%},{%- endunless -%}{%- endfor -%}"{% if bs_var.id == bs_v.id %} selected{% endif %}{% unless bs_var.available %} disabled{% endunless %}>{{ bs_var.title }}</option>
                {%- endfor -%}
              </select>
            </div>
          {%- endif -%}

          <div class="bs-plans" role="radiogroup" aria-label="Purchase options">
            {%- if bs_has_sub -%}
              {%- assign bs_ref1 = bs_ref | at_least: 1 -%}
              {%- assign bs_off = bs_ref | minus: bs_alloc.price | times: 100 | divided_by: bs_ref1 -%}
              <label class="bs-plan">
                <input type="radio" name="selling_plan" value="{{ bs_alloc.selling_plan.id }}" data-price="{{ bs_alloc.price }}" data-sub{% if bs_sub_default %} checked{% endif %}>
                <span class="bs-row">
                  <span class="bs-radio" aria-hidden="true"></span>
                  <span class="bs-pm">
                    <span class="bs-pt">{{ section.settings.sub_title }}<span class="bs-save" data-save{% unless bs_off > 0 %} hidden{% endunless %}>{{ section.settings.save_text }} <span data-off>{{ bs_off }}</span>%</span></span>
                    <span class="bs-ptot"><s data-sub-was{% unless bs_ref > bs_alloc.price %} hidden{% endunless %}>{{ bs_ref | money }}</s><b data-sub-total>{{ bs_alloc.price | money }}</b></span>
                  </span>
                  <span class="bs-pp"><span class="bs-each" data-sub-each>{{ bs_alloc.price | divided_by: bs_serv | money }}</span><span class="bs-per">{{ section.settings.per_serving }}</span></span>
                </span>
                <span class="bs-more"><span class="bs-more-in">
                  <span class="bs-perks">
                    {%- assign bs_perks = section.settings.sub_perks | newline_to_br | split: '<br />' -%}
                    {%- for bs_pk in bs_perks -%}
                      {%- assign bs_pkt = bs_pk | strip -%}
                      {%- if bs_pkt != blank -%}<span class="bs-perk">${check}<span>{{ bs_pkt }}</span></span>{%- endif -%}
                    {%- endfor -%}
                    {%- if bs_v.selling_plan_allocations.size > 1 -%}
                      <span class="bs-freq">
                        <select aria-label="{{ section.settings.sub_title | escape }}" data-freq>
                          {%- for bs_a in bs_v.selling_plan_allocations -%}
                            <option value="{{ bs_a.selling_plan.id }}" data-price="{{ bs_a.price }}">{{ bs_a.selling_plan.name }}</option>
                          {%- endfor -%}
                        </select>
                      </span>
                    {%- else -%}
                      <span class="bs-freq-one">{{ bs_alloc.selling_plan.name }}</span>
                    {%- endif -%}
                  </span>
                </span></span>
              </label>
            {%- endif -%}
            {%- unless bs_p.requires_selling_plan -%}
              <label class="bs-plan">
                <input type="radio" name="selling_plan" value="" data-price="{{ bs_v.price }}"{% unless bs_sub_default %} checked{% endunless %}>
                <span class="bs-row">
                  <span class="bs-radio" aria-hidden="true"></span>
                  <span class="bs-pm">
                    <span class="bs-pt">{{ section.settings.one_title }}</span>
                    <span class="bs-ptot"><b data-one-total>{{ bs_v.price | money }}</b></span>
                  </span>
                  <span class="bs-pp"><span class="bs-each" data-one-each>{{ bs_v.price | divided_by: bs_serv | money }}</span><span class="bs-per">{{ section.settings.per_serving }}</span></span>
                </span>
                {%- if section.settings.one_perks != blank -%}
                  <span class="bs-more"><span class="bs-more-in"><span class="bs-perks">
                    {%- assign bs_perks = section.settings.one_perks | newline_to_br | split: '<br />' -%}
                    {%- for bs_pk in bs_perks -%}
                      {%- assign bs_pkt = bs_pk | strip -%}
                      {%- if bs_pkt != blank -%}<span class="bs-perk">${check}<span>{{ bs_pkt }}</span></span>{%- endif -%}
                    {%- endfor -%}
                  </span></span></span>
                {%- endif -%}
              </label>
            {%- endunless -%}
          </div>

          {%- if bs_show_kit -%}
            <div class="bs-kit{% if section.settings.kit_sub_only %} is-sub-only{% endif %}">
              <div class="bs-kit-h">
                <p class="bs-kit-t">{{ section.settings.kit_title }}</p>
                {%- if section.settings.kit_value != blank -%}<p class="bs-kit-v">{{ section.settings.kit_value }}</p>{%- endif -%}
              </div>
              <div class="bs-chips">
                {%- for block in section.blocks -%}
                  {%- if block.type == 'kit_item' -%}
                    <span class="bs-chip" {{ block.shopify_attributes }}>
                      <span class="bs-chip-img">
                        {%- if block.settings.image != blank -%}
                          {{ block.settings.image | image_url: width: 96 | image_tag: loading: 'lazy', alt: '' }}
                        {%- else -%}
                          {%- assign bs_ph = forloop.index0 | modulo: 6 | plus: 1 -%}
                          {{ 'product-' | append: bs_ph | placeholder_svg_tag: 'bs-ph' }}
                        {%- endif -%}
                      </span>
                      <span>{{ block.settings.name }}</span>
                    </span>
                  {%- endif -%}
                {%- endfor -%}
              </div>
              {%- if section.settings.kit_sub_only and bs_has_sub and section.settings.kit_lock != blank -%}
                <button type="button" class="bs-kit-lock" data-pick-sub>{{ section.settings.kit_lock }}</button>
              {%- endif -%}
            </div>
          {%- endif -%}

          <button type="submit" name="add" class="bs-atc"{% unless bs_v.available %} disabled{% endunless %}>
            <span data-btn-label>{%- if bs_sub_default -%}{{ section.settings.sub_button }}{%- else -%}{{ section.settings.one_button }}{%- endif -%}</span>
            <span class="bs-dot" aria-hidden="true">·</span>
            <span data-price-out>{%- if bs_sub_default -%}{{ bs_alloc.price | money }}{%- else -%}{{ bs_v.price | money }}{%- endif -%}</span>
          </button>
        {%- endform -%}
      {%- endif -%}

      {%- if section.settings.guarantee != blank -%}<p class="bs-guar">${shield}<span>{{ section.settings.guarantee }}</span></p>{%- endif -%}
      {%- if bs_has_sub and section.settings.cancel_note != blank -%}<p class="bs-cancel">{{ section.settings.cancel_note }}</p>{%- endif -%}
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
    var serv = parseInt(root.getAttribute('data-serv'), 10) || 1;
    var subR = root.querySelector('input[name="selling_plan"][data-sub]');
    var oneR = root.querySelector('input[name="selling_plan"]:not([data-sub])');
    var radios = root.querySelectorAll('input[name="selling_plan"]');
    var select = root.querySelector('.bs-select');
    var freq = root.querySelector('[data-freq]');
    var label = root.querySelector('[data-btn-label]');
    var out = root.querySelector('[data-price-out]');
    function text(sel, value) {
      var el = root.querySelector(sel);
      if (el) el.textContent = value;
    }
    function update() {
      var r = root.querySelector('input[name="selling_plan"]:checked');
      if (!r) return;
      var isSub = !!r.value;
      root.classList.toggle('is-one', !isSub);
      if (label) label.textContent = root.getAttribute(isSub ? 'data-sub-label' : 'data-one-label');
      if (out) out.textContent = money(parseInt(r.getAttribute('data-price'), 10) || 0);
    }
    function num(el, attr) {
      return el ? parseInt(el.getAttribute(attr), 10) || 0 : 0;
    }
    function sync() {
      var o = select ? select.options[select.selectedIndex] : null;
      var p = o ? num(o, 'data-price') : num(root, 'data-price');
      var ref = Math.max(p, o ? num(o, 'data-ref') : num(root, 'data-ref'));
      if (oneR) {
        oneR.setAttribute('data-price', p);
        text('[data-one-total]', money(p));
        text('[data-one-each]', money(Math.round(p / serv)));
      }
      if (subR) {
        var id = freq ? freq.value : subR.value;
        var sp = num(subR, 'data-price');
        if (o) {
          var map = {};
          (o.getAttribute('data-plans') || '').split(',').forEach(function (pair) {
            var kv = pair.split(':');
            if (kv.length === 2) map[kv[0]] = parseInt(kv[1], 10);
          });
          sp = map[id] != null ? map[id] : p;
        } else if (freq) {
          sp = num(freq.options[freq.selectedIndex], 'data-price') || sp;
        }
        subR.value = id;
        subR.setAttribute('data-price', sp);
        text('[data-sub-total]', money(sp));
        text('[data-sub-each]', money(Math.round(sp / serv)));
        var was = root.querySelector('[data-sub-was]');
        if (was) { was.textContent = money(ref); was.hidden = !(ref > sp); }
        var save = root.querySelector('[data-save]');
        if (save) save.hidden = !(ref > sp);
        text('[data-off]', ref > 0 ? Math.floor((ref - sp) * 100 / ref) : 0);
      }
      update();
    }
    radios.forEach(function (r) { r.addEventListener('change', update); });
    if (select) select.addEventListener('change', sync);
    if (freq) {
      freq.addEventListener('change', function () {
        if (subR) subR.checked = true;
        sync();
      });
    }
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

  const kit = list(config, "kit");
  const radius = num(config, "radius", 18);

  const schema = buildSchema({
    name: "Subscribe Buy Box",
    settings: [
      { type: "product", id: "product", label: "Product", info: "Leave empty on product pages to use the current product" },
      { type: "image_picker", id: "image", label: "Image", info: "Defaults to the product's featured image" },
      { type: "text", id: "image_badge", label: "Image badge", default: str(config, "imageBadge") },
      { type: "text", id: "rating", label: "Rating line", default: str(config, "rating") },
      { type: "textarea", id: "subtitle", label: "Subtitle", default: str(config, "subtitle") },
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
      { type: "number", id: "servings", label: "Servings per pack", default: Math.max(1, Math.round(num(config, "servings", 30))) },
      { type: "text", id: "per_serving", label: "Per serving label", default: str(config, "perServing") },
      { type: "text", id: "sub_title", label: "Subscription title", default: str(config, "subTitle") },
      { type: "text", id: "save_text", label: "Savings badge text", default: str(config, "saveText") },
      { type: "textarea", id: "sub_perks", label: "Subscription perks (one per line)", default: str(config, "subPerks") },
      { type: "text", id: "one_title", label: "One-time title", default: str(config, "oneTitle") },
      { type: "textarea", id: "one_perks", label: "One-time perks (one per line)", default: str(config, "onePerks") },
      { type: "header", content: "Welcome kit" },
      { type: "text", id: "kit_title", label: "Kit title", default: str(config, "kitTitle") },
      { type: "text", id: "kit_value", label: "Kit value text", default: str(config, "kitValue") },
      { type: "checkbox", id: "kit_sub_only", label: "Kit only with Subscribe & save", default: bool(config, "kitSubOnly", true) },
      { type: "text", id: "kit_lock", label: "One-time selected text", default: str(config, "kitLock") },
      { type: "header", content: "Button & trust" },
      { type: "text", id: "sub_button", label: "Button text (subscription)", default: str(config, "subButton") },
      { type: "text", id: "one_button", label: "Button text (one-time)", default: str(config, "oneButton") },
      { type: "text", id: "guarantee", label: "Guarantee line", default: str(config, "guarantee") },
      { type: "text", id: "cancel_note", label: "Cancel note (subscription)", default: str(config, "cancelNote") },
      { type: "header", content: "Style" },
      { type: "color", id: "bg", label: "Background", default: str(config, "bg") },
      { type: "color", id: "card", label: "Cards", default: str(config, "card") },
      { type: "color", id: "text_color", label: "Text", default: str(config, "textColor") },
      { type: "color", id: "muted", label: "Muted text", default: str(config, "muted") },
      { type: "color", id: "accent", label: "Accent", default: str(config, "accent") },
      { type: "color", id: "accent_text", label: "Text on accent", default: str(config, "accentText") },
      { type: "color", id: "sage", label: "Soft accent", default: str(config, "sage") },
      { type: "range", id: "radius", label: "Corner radius", min: 4, max: 28, step: 2, unit: "px", default: Math.max(4, Math.min(28, Math.round(radius / 2) * 2)) },
    ],
    blocks: [
      {
        type: "kit_item",
        name: "Kit item",
        settings: [
          { type: "text", id: "name", label: "Name" },
          { type: "image_picker", id: "image", label: "Image" },
        ],
      },
    ],
    maxBlocks: 6,
    presetBlocks: kit.slice(0, 6).map((k) => ({
      type: "kit_item",
      settings: { name: esc(k.name ?? "") },
    })),
  });

  return section({ style, markup, schema });
}

export const subscribeBuyBox: Tweak = {
  slug: "subscribe-buy-box",
  inspiredBy: "ag1",
  name: "Subscribe Buy Box",
  tagline: "A subscription-first buy box with price per serving, a free welcome kit and a guarantee.",
  description:
    "Modeled on the subscription-first buy box AG1 uses on its product page. Subscribe & save and one-time sit as radio cards that lead with a big price per serving; the selected card opens to show its perks and delivery cadence. A free welcome kit strip (shaker, canister, travel packs) unlocks only with the subscription, followed by a guarantee line and an add-to-cart button that carries the price. Built on the real product form with your selling plans; products without plans simply show one-time.",
  category: "product-page",
  tier: "free",
  tint: "#ecefe6",
  Preview,
  generateLiquid,
  defaults,
  fields: [
    { key: "productName", label: "Preview product name", type: "text", group: "Content", hint: "Editor preview only; your store shows the product title" },
    { key: "rating", label: "Rating line", type: "text", group: "Content" },
    { key: "subtitle", label: "Subtitle", type: "textarea", group: "Content" },
    { key: "image", label: "Image URL", type: "text", group: "Media", hint: "Leave empty for a drawn pouch. In Shopify it uses the product photo or the image you pick" },
    { key: "imageBadge", label: "Image badge", type: "text", group: "Media" },
    {
      key: "plan", label: "Preselected plan", type: "select", group: "Plans",
      options: [
        { label: "Subscribe & save", value: "sub" },
        { label: "One-time purchase", value: "one" },
      ],
    },
    { key: "price", label: "Preview price", type: "text", group: "Plans", hint: "Editor preview only; your store uses the product and selling plan prices" },
    { key: "subDiscount", label: "Preview subscription discount", type: "slider", group: "Plans", min: 0, max: 60, step: 1, unit: "%" },
    { key: "servings", label: "Servings per pack", type: "slider", group: "Plans", min: 1, max: 90, step: 1 },
    { key: "currency", label: "Currency symbol", type: "text", group: "Plans" },
    { key: "perServing", label: "Per serving label", type: "text", group: "Plans" },
    { key: "subTitle", label: "Subscription title", type: "text", group: "Plans" },
    { key: "saveText", label: "Savings badge text", type: "text", group: "Plans" },
    { key: "subPerks", label: "Subscription perks", type: "textarea", group: "Plans", hint: "One per line" },
    { key: "frequency", label: "Preview delivery cadence", type: "text", group: "Plans", hint: "In Shopify this lists your selling plan names" },
    { key: "oneTitle", label: "One-time title", type: "text", group: "Plans" },
    { key: "onePerks", label: "One-time perks", type: "textarea", group: "Plans" },
    { key: "kitTitle", label: "Kit title", type: "text", group: "Welcome kit" },
    { key: "kitValue", label: "Kit value text", type: "text", group: "Welcome kit" },
    { key: "kitSubOnly", label: "Kit only with Subscribe & save", type: "toggle", group: "Welcome kit" },
    { key: "kitLock", label: "One-time selected text", type: "text", group: "Welcome kit" },
    {
      key: "kit", label: "Kit items", type: "list", group: "Welcome kit",
      hint: "Leave the image URL empty for a drawn pack. In Shopify you pick a photo per item",
      itemFields: [
        { key: "name", label: "Name", type: "text" },
        { key: "image", label: "Image URL", type: "text" },
      ],
      newItem: { name: "Travel pouch", image: "/mockups/gift-pouch.jpg" },
      addLabel: "Add kit item",
      max: 6,
    },
    { key: "subButton", label: "Button text (subscription)", type: "text", group: "Button & trust" },
    { key: "oneButton", label: "Button text (one-time)", type: "text", group: "Button & trust" },
    { key: "guarantee", label: "Guarantee line", type: "text", group: "Button & trust" },
    { key: "cancelNote", label: "Cancel note", type: "text", group: "Button & trust" },
    fontField("Typography"),
    { key: "radius", label: "Corner radius", type: "slider", group: "Layout", min: 4, max: 28, step: 2, unit: "px" },
    { key: "bg", label: "Background", type: "color", group: "Colors" },
    { key: "card", label: "Cards", type: "color", group: "Colors" },
    { key: "textColor", label: "Text", type: "color", group: "Colors" },
    { key: "muted", label: "Muted text", type: "color", group: "Colors" },
    { key: "accent", label: "Accent", type: "color", group: "Colors" },
    { key: "accentText", label: "Text on accent", type: "color", group: "Colors" },
    { key: "sage", label: "Soft accent", type: "color", group: "Colors" },
  ],
};
