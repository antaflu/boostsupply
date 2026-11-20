"use client";

import { useEffect, useState, type CSSProperties } from "react";
import type { Tweak, TweakConfig } from "../types";
import { str, num, bool, list, fontStack, esc } from "../cfg";
import { fontField } from "../fields";
import { buildSchema, section, fontFaceFor } from "../liquid";
import { ProductArt, money, toNum, type ArtKind } from "./product-art";

/* ============================================================
   Routine Builder
   A step-by-step bundle maker: one tab per step (prep, treat,
   seal, glow), two products to choose from in each, and a summary
   that fills in as you go. It shows the routine price against the
   separate prices with the saving, and adds the whole routine to
   the bag in one request. Picking a product moves on to the next
   step by itself.
   ============================================================ */

const EASE = "cubic-bezier(.22,1,.36,1)";
const ART: ArtKind[] = ["bottle", "bottle", "tube", "tube", "jar", "jar", "tube", "jar"];
/** Warm beige laid over photos (blend mode "color") so mixed backdrops sit together. */
const TONE = "#CDBFAE";

const defaults: TweakConfig = {
  eyebrow: "build your routine",
  heading: "four steps, one routine",
  subheading: "pick one product per step. the full routine saves 15%.",
  currency: "$",
  discount: 15,
  preselect: true,
  photoTone: "warm",
  steps: [
    { role: "prep", nameA: "dewy prep primer", noteA: "grips, smooths, glows", priceA: "28", imageA: "/mockups/award-primer.jpg", nameB: "hydra prep mist", noteB: "a cool, dewy reset", priceB: "22", imageB: "/mockups/set-mist.jpg" },
    { role: "treat", nameA: "glow drops serum", noteA: "vitamin c + squalane", priceA: "32", imageA: "/mockups/award-serum.jpg", nameB: "peptide treatment", noteB: "firms and plumps", priceB: "34", imageB: "/mockups/set-serum.jpg" },
    { role: "seal", nameA: "barrier balm cream", noteA: "a rich, cushiony seal", priceA: "30", imageA: "/mockups/award-cream.jpg", nameB: "whipped gel cream", noteB: "light, bouncy hydration", priceB: "28", imageB: "/mockups/set-cream.jpg" },
    { role: "glow", nameA: "tinted lip treatment", noteA: "a sheer wash of colour", priceA: "18", imageA: "/mockups/award-lip.jpg", nameB: "glow balm", noteB: "lips, cheeks, brows", priceB: "16", imageB: "/mockups/set-balm.jpg" },
  ],
  stepWord: "step",
  backText: "back",
  nextText: "next step",
  summaryTitle: "your routine",
  emptySlot: "choose your",
  separateLabel: "bought separately",
  routineLabel: "routine price",
  saveLabel: "save",
  buttonText: "add routine to bag",
  remainingText: "pick {{count}} more to finish",
  addedText: "added to bag",
  bg: "#F1F0ED",
  card: "#FFFFFF",
  textColor: "#303030",
  accent: "#67645E",
  muted: "#84827E",
  buttonBg: "#303030",
  buttonText2: "#FFFFFF",
  font: "system",
  lowercase: true,
  radius: 2,
};

/** Hex color + alpha byte, e.g. tint("#303030", 0.12). */
const tint = (hex: string, a: number) =>
  /^#[0-9a-f]{6}$/i.test(hex)
    ? hex + Math.round(a * 255).toString(16).padStart(2, "0")
    : hex;

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const token = (k: string) => "{{" + k + "}}";
const pad2 = (n: number) => String(n).padStart(2, "0");

type Option = { name: string; note: string; price: number; image: string; art: ArtKind };

/** Product photo with the optional warm tone, or a drawn product when empty. */
function Photo({ o, tone, tile, className = "" }: { o: Option; tone: boolean; tile: string; className?: string }) {
  return (
    <span className={`absolute inset-0 isolate block overflow-hidden ${className}`} style={{ background: tile }}>
      {o.image ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={o.image} alt="" loading="lazy" decoding="async" draggable={false} className="absolute inset-0 h-full w-full object-cover" />
          {tone && <span aria-hidden className="absolute inset-0" style={{ background: TONE, mixBlendMode: "color", opacity: 0.65 }} />}
        </>
      ) : (
        <span className="absolute inset-0 grid place-items-center [&>div]:h-[78%]! [&>div]:w-[78%]! [&_svg]:h-full! [&_svg]:w-full!">
          <ProductArt kind={o.art} tone="#d9c9bc" tile="transparent" size={120} radius={0} />
        </span>
      )}
    </span>
  );
}

function Preview({ config }: { config: TweakConfig }) {
  const cur = str(config, "currency", "$");
  const bg = str(config, "bg", "#F1F0ED");
  const card = str(config, "card", "#FFFFFF");
  const text = str(config, "textColor", "#303030");
  const accent = str(config, "accent", "#67645E");
  const muted = str(config, "muted", "#84827E");
  const btnBg = str(config, "buttonBg", "#303030");
  const btnText = str(config, "buttonText2", "#FFFFFF");
  const radius = num(config, "radius", 2);
  const line = tint(text, 0.14);
  const lower = bool(config, "lowercase", true) ? "lowercase" : "";
  const caps: CSSProperties = { letterSpacing: "0.16em" };
  const tone = str(config, "photoTone", "warm") === "warm";
  const off = clamp(num(config, "discount", 15), 0, 60);

  const steps = list(config, "steps").map((s, i) => ({
    role: s.role ?? "",
    opts: [
      { name: s.nameA ?? "", note: s.noteA ?? "", price: toNum(s.priceA), image: (s.imageA ?? "").trim(), art: ART[(i * 2) % ART.length] },
      { name: s.nameB ?? "", note: s.noteB ?? "", price: toNum(s.priceB), image: (s.imageB ?? "").trim(), art: ART[(i * 2 + 1) % ART.length] },
    ].filter((o) => o.name) as Option[],
  }));
  const n = steps.length;

  const pre = bool(config, "preselect", true);
  const startKey = `${n}:${pre}`;
  const [prevKey, setPrevKey] = useState(startKey);
  const [active, setActive] = useState(0);
  const [picks, setPicks] = useState<number[]>(() => steps.map(() => (pre ? 0 : -1)));
  const [added, setAdded] = useState(false);
  const [advance, setAdvance] = useState<number | null>(null);
  if (startKey !== prevKey) {
    setPrevKey(startKey);
    setActive(0);
    setPicks(steps.map(() => (pre ? 0 : -1)));
  }

  /* picking moves on to the next step after a beat */
  useEffect(() => {
    if (advance === null) return;
    const t = setTimeout(() => {
      setActive(advance);
      setAdvance(null);
    }, 420);
    return () => clearTimeout(t);
  }, [advance]);

  useEffect(() => {
    if (!added) return;
    const t = setTimeout(() => setAdded(false), 1700);
    return () => clearTimeout(t);
  }, [added]);

  const cur0 = Math.min(active, Math.max(0, n - 1));
  const pickOf = (i: number) => {
    const p = picks[i] ?? -1;
    return p >= 0 && p < (steps[i]?.opts.length ?? 0) ? p : -1;
  };
  const chosen = steps.map((s, i) => (pickOf(i) >= 0 ? s.opts[pickOf(i)] : null));
  const done = chosen.filter(Boolean).length;
  const left = n - done;
  const full = chosen.reduce((a, o) => a + (o?.price ?? 0), 0);
  const complete = n > 0 && left === 0;
  const routine = complete ? full * (1 - off / 100) : full;

  const choose = (i: number, j: number) => {
    setPicks((p) => {
      const next = steps.map((_, k) => p[k] ?? -1);
      next[i] = j;
      return next;
    });
    if (i < n - 1) setAdvance(i + 1);
  };

  const step = steps[cur0];

  return (
    <div className="@container w-full" style={{ background: bg, color: text, fontFamily: fontStack(str(config, "font", "system")) }}>
      <div className="mx-auto grid w-full max-w-[1100px] gap-6 px-5 pb-7 pt-6 @min-[720px]:grid-cols-[minmax(0,1fr)_300px] @min-[720px]:gap-10 @min-[720px]:p-10">
        <div className="min-w-0">
          {str(config, "eyebrow") && (
            <p className="text-[10px] font-medium uppercase" style={{ ...caps, color: accent }}>
              {str(config, "eyebrow")}
            </p>
          )}
          {str(config, "heading") && (
            <h3 className={`mt-2.5 text-[30px] font-medium leading-[1.02] tracking-[-0.04em] @min-[720px]:text-[40px] ${lower}`}>{str(config, "heading")}</h3>
          )}
          {str(config, "subheading") && (
            <p className="mt-2.5 text-[13.5px] leading-[1.5]" style={{ color: muted }}>
              {str(config, "subheading")}
            </p>
          )}

          {/* Step tabs */}
          {n > 0 && (
            <div role="tablist" className="relative mt-5 grid border-b" style={{ gridTemplateColumns: `repeat(${n}, minmax(0,1fr))`, borderColor: line }}>
              {steps.map((s, i) => {
                const on = i === cur0;
                const has = pickOf(i) >= 0;
                return (
                  <button
                    key={i}
                    type="button"
                    role="tab"
                    aria-selected={on}
                    onClick={() => setActive(i)}
                    className="flex min-w-0 flex-col items-start gap-1 pb-2.5 text-left transition-colors duration-300"
                    style={{ color: on ? text : muted }}
                  >
                    <span className="flex items-center gap-1.5 text-[9.5px] font-medium tabular-nums" style={caps}>
                      {pad2(i + 1)}
                      <span
                        aria-hidden
                        className="grid h-3 w-3 place-items-center rounded-full"
                        style={{
                          background: has ? text : "transparent",
                          color: bg,
                          boxShadow: has ? "none" : `inset 0 0 0 1px ${tint(text, 0.3)}`,
                          transition: `background-color 300ms ${EASE}`,
                        }}
                      >
                        {has && (
                          <svg width="7" height="7" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M2.5 6.3l2.3 2.2 4.7-5" />
                          </svg>
                        )}
                      </span>
                    </span>
                    <span className="max-w-full truncate text-[14px] font-medium lowercase tracking-[-0.02em]">{s.role}</span>
                  </button>
                );
              })}
              <span
                aria-hidden
                className="absolute -bottom-px left-0 h-[2px]"
                style={{ width: `${100 / n}%`, transform: `translateX(${cur0 * 100}%)`, background: text, transition: `transform 420ms ${EASE}` }}
              />
            </div>
          )}

          {/* Options for the active step */}
          {step && (
            <div key={cur0} role="radiogroup" aria-label={step.role} className="mt-4 grid grid-cols-2 gap-3">
              {step.opts.map((o, j) => {
                const on = pickOf(cur0) === j;
                return (
                  <button
                    key={j}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => choose(cur0, j)}
                    className="bs-rise group flex min-w-0 flex-col text-left"
                    style={{ "--i": j } as CSSProperties}
                  >
                    <span className="relative block aspect-[4/5] w-full overflow-hidden" style={{ borderRadius: radius }}>
                      <Photo o={o} tone={tone} tile={card} className="transition-[scale] duration-700 group-hover:scale-[1.03]" />
                      <span
                        aria-hidden
                        className="pointer-events-none absolute inset-0 transition-[box-shadow] duration-300"
                        style={{ borderRadius: radius, boxShadow: on ? `inset 0 0 0 1.5px ${text}` : `inset 0 0 0 1px ${tint(text, 0.06)}` }}
                      />
                      <span
                        aria-hidden
                        className="absolute right-2.5 top-2.5 grid h-6 w-6 place-items-center rounded-full transition-[background-color,box-shadow] duration-300"
                        style={{ background: on ? text : tint(card, 0.85), color: bg, boxShadow: on ? "none" : `inset 0 0 0 1px ${tint(text, 0.25)}` }}
                      >
                        <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: on ? 1 : 0, transform: on ? "none" : "scale(.4)", transition: `opacity 160ms, transform 380ms cubic-bezier(.34,1.56,.64,1)` }}>
                          <path d="M2.5 6.3l2.3 2.2 4.7-5" />
                        </svg>
                      </span>
                    </span>
                    <span className={`mt-2.5 block text-[14px] font-medium leading-tight tracking-[-0.02em] ${lower}`}>{o.name}</span>
                    <span className="mt-0.5 block text-[12px] leading-snug" style={{ color: muted }}>
                      {o.note}
                    </span>
                    <span className="mt-1.5 block text-[12.5px] tabular-nums">{money(o.price, cur)}</span>
                  </button>
                );
              })}
            </div>
          )}

          {n > 1 && (
            <div className="mt-4 flex items-center justify-between text-[10.5px] font-medium uppercase" style={caps}>
              <button
                type="button"
                disabled={cur0 === 0}
                onClick={() => setActive(cur0 - 1)}
                className="flex items-center gap-1.5 transition-opacity duration-200 disabled:opacity-30"
              >
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M13 8H3M7 4L3 8l4 4" />
                </svg>
                {str(config, "backText")}
              </button>
              <span className="tabular-nums" style={{ color: muted }}>
                {str(config, "stepWord")} {cur0 + 1} / {n}
              </span>
              <button
                type="button"
                disabled={cur0 >= n - 1}
                onClick={() => setActive(cur0 + 1)}
                className="flex items-center gap-1.5 transition-opacity duration-200 disabled:opacity-30"
              >
                {str(config, "nextText")}
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M3 8h10M9 4l4 4-4 4" />
                </svg>
              </button>
            </div>
          )}
        </div>

        {/* Summary */}
        <aside className="min-w-0 self-start p-4 @min-[720px]:p-5" style={{ background: card, borderRadius: radius + 2 }}>
          <p className="flex items-center justify-between text-[10px] font-medium uppercase" style={caps}>
            {str(config, "summaryTitle")}
            <span className="tabular-nums" style={{ color: muted }}>
              {done}/{n}
            </span>
          </p>
          <ul className="mt-3 flex flex-col">
            {steps.map((s, i) => {
              const o = chosen[i];
              const on = i === cur0;
              return (
                <li key={i} className="border-t first:border-t-0" style={{ borderColor: line }}>
                  <button type="button" onClick={() => setActive(i)} className="flex w-full items-center gap-3 py-2.5 text-left">
                    <span
                      className="relative h-11 w-9 shrink-0 overflow-hidden transition-[box-shadow] duration-300"
                      style={{ borderRadius: Math.max(1, radius - 1), background: bg, boxShadow: on ? `0 0 0 1px ${card}, 0 0 0 2px ${text}` : "none" }}
                    >
                      {o ? (
                        <Photo key={o.name} o={o} tone={tone} tile={bg} className="bs-fade-up" />
                      ) : (
                        <span className="absolute inset-[3px] rounded-[1px]" style={{ border: `1px dashed ${tint(text, 0.3)}` }} />
                      )}
                    </span>
                    <span className="min-w-0 flex-1 leading-tight">
                      <span className="block text-[9.5px] font-medium uppercase" style={{ ...caps, color: muted }}>
                        {s.role}
                      </span>
                      <span className={`mt-0.5 block truncate text-[13px] font-medium tracking-[-0.015em] ${lower}`} style={{ color: o ? text : muted }}>
                        {o ? o.name : `${str(config, "emptySlot")} ${s.role}`}
                      </span>
                    </span>
                    {o && <span className="shrink-0 text-[12.5px] tabular-nums">{money(o.price, cur)}</span>}
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="mt-2 border-t pt-3 text-[12.5px]" style={{ borderColor: line }}>
            <p className="flex items-baseline justify-between gap-2" style={{ color: muted }}>
              {str(config, "separateLabel")}
              <span className={`tabular-nums ${complete && off > 0 ? "line-through" : ""}`}>{money(full, cur)}</span>
            </p>
            <p className="mt-1.5 flex items-baseline justify-between gap-2">
              <span className="flex items-center gap-2">
                {str(config, "routineLabel")}
                {off > 0 && (
                  <span
                    className="px-1.5 py-[3px] text-[9.5px] font-medium uppercase leading-none transition-[background-color,color] duration-300"
                    style={{ ...caps, letterSpacing: "0.1em", background: complete ? text : tint(text, 0.08), color: complete ? card : muted, borderRadius: radius }}
                  >
                    {str(config, "saveLabel")} {off}%
                  </span>
                )}
              </span>
              <b key={routine.toFixed(2)} className="bs-swap text-[20px] font-medium tracking-[-0.03em] tabular-nums">
                {money(routine, cur)}
              </b>
            </p>
          </div>

          <button
            type="button"
            disabled={!complete}
            onClick={() => setAdded(true)}
            className="mt-4 h-12 w-full text-[11px] font-medium uppercase transition-[filter,scale,opacity] duration-200 enabled:hover:brightness-125 enabled:active:scale-[0.98] disabled:opacity-45"
            style={{ letterSpacing: "0.14em", background: btnBg, color: btnText, borderRadius: radius }}
          >
            <span key={added ? "y" : complete ? "c" : "n"} className="bs-swap inline-block">
              {added ? str(config, "addedText") : complete ? str(config, "buttonText") : str(config, "remainingText").split(token("count")).join(String(left))}
            </span>
          </button>
        </aside>
      </div>
    </div>
  );
}

/* ---------------- Liquid ---------------- */

function generateLiquid(config: TweakConfig): string {
  const { face, family } = fontFaceFor(str(config, "font", "system"));
  const S = ".bs-rb-{{ section.id }}";
  const r = "{{ section.settings.radius }}px";
  const line = "{{ section.settings.text_color | color_modify: 'alpha', 0.14 }}";
  const ease = EASE;
  const tick = (s: number) =>
    `<svg width="${s}" height="${s}" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2.5 6.3l2.3 2.2 4.7-5"/></svg>`;
  const arrow = (d: string) =>
    `<svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg>`;

  const style = `<style>
${face ? face + "\n" : ""}  ${S} { container-type: inline-size; background: {{ section.settings.bg }}; color: {{ section.settings.text_color }}; font-family: ${family}; }
  ${S} * { box-sizing: border-box; }
  ${S} p, ${S} h2, ${S} ul { margin: 0; padding: 0; }
  ${S} button { font: inherit; color: inherit; background: none; border: 0; padding: 0; cursor: pointer; }
  ${S} .bs-caps { font-size: 10px; font-weight: 500; text-transform: uppercase; letter-spacing: .16em; }
  ${S} .bs-lc { {% if section.settings.lowercase %}text-transform: lowercase;{% endif %} }
  ${S} .bs-wrap { max-width: 1100px; margin: 0 auto; display: grid; gap: 24px; padding: 24px 20px 28px; }
  ${S} .bs-main { min-width: 0; }
  ${S} .bs-eye { color: {{ section.settings.accent }}; }
  ${S} .bs-h { margin-top: 10px; font-size: 30px; font-weight: 500; line-height: 1.02; letter-spacing: -.04em; }
  ${S} .bs-sub { margin-top: 10px; font-size: 13.5px; line-height: 1.5; color: {{ section.settings.muted }}; }
  ${S} .bs-tabs { position: relative; display: grid; grid-template-columns: repeat(var(--n), minmax(0, 1fr)); margin-top: 20px; border-bottom: 1px solid ${line}; }
  ${S} .bs-tab { display: flex; flex-direction: column; align-items: flex-start; gap: 4px; min-width: 0; padding-bottom: 10px; text-align: left; color: {{ section.settings.muted }}; transition: color .3s; }
  ${S} .bs-tab[aria-selected="true"] { color: {{ section.settings.text_color }}; }
  ${S} .bs-tab small { display: flex; align-items: center; gap: 6px; font-size: 9.5px; font-weight: 500; letter-spacing: .16em; font-variant-numeric: tabular-nums; }
  ${S} .bs-tab i { width: 12px; height: 12px; display: grid; place-items: center; border-radius: 99px; color: {{ section.settings.bg }};
    box-shadow: inset 0 0 0 1px {{ section.settings.text_color | color_modify: 'alpha', 0.3 }}; transition: background-color .3s ${ease}; }
  ${S} .bs-tab i svg { opacity: 0; }
  ${S} .bs-tab.is-done i { background: {{ section.settings.text_color }}; box-shadow: none; }
  ${S} .bs-tab.is-done i svg { opacity: 1; }
  ${S} .bs-tab span { max-width: 100%; font-size: 14px; font-weight: 500; letter-spacing: -.02em; text-transform: lowercase; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  ${S} .bs-bar { position: absolute; left: 0; bottom: -1px; height: 2px; width: calc(100% / var(--n)); background: {{ section.settings.text_color }};
    transform: translateX(calc(var(--a, 0) * 100%)); transition: transform .42s ${ease}; }
  ${S} .bs-panel { display: none; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin-top: 16px; }
  ${S} .bs-panel.is-on { display: grid; animation: bs-rb-in .45s ${ease} both; }
  @keyframes bs-rb-in { from { opacity: 0; transform: translateY(8px); } }
  ${S} .bs-opt { position: relative; display: flex; flex-direction: column; min-width: 0; cursor: pointer; }
  ${S} .bs-opt input { position: absolute; opacity: 0; width: 1px; height: 1px; pointer-events: none; }
  ${S} .bs-ph { position: relative; display: block; aspect-ratio: 4 / 5; overflow: hidden; isolation: isolate; border-radius: ${r}; background: {{ section.settings.card }}; }
  ${S} .bs-ph img, ${S} .bs-ph svg { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; transition: transform .7s ${ease}; }
  ${S} .bs-opt:hover .bs-ph img { transform: scale(1.03); }
  {%- if section.settings.photo_tone == 'warm' %}
  ${S} .bs-ph::before { content: ""; position: absolute; inset: 0; z-index: 1; background: ${TONE}; mix-blend-mode: color; opacity: .65; pointer-events: none; }
  {%- endif %}
  ${S} .bs-ph::after { content: ""; position: absolute; inset: 0; z-index: 2; border-radius: inherit; pointer-events: none; box-shadow: inset 0 0 0 1px {{ section.settings.text_color | color_modify: 'alpha', 0.06 }}; transition: box-shadow .3s; }
  ${S} .bs-opt:has(input:checked) .bs-ph::after { box-shadow: inset 0 0 0 1.5px {{ section.settings.text_color }}; }
  ${S} .bs-opt:has(input:focus-visible) .bs-ph::after { box-shadow: inset 0 0 0 2px {{ section.settings.accent }}; }
  ${S} .bs-radio { position: absolute; right: 10px; top: 10px; z-index: 3; width: 24px; height: 24px; display: grid; place-items: center; border-radius: 99px; color: {{ section.settings.bg }};
    background: {{ section.settings.card | color_modify: 'alpha', 0.85 }}; box-shadow: inset 0 0 0 1px {{ section.settings.text_color | color_modify: 'alpha', 0.25 }}; transition: background-color .3s, box-shadow .3s; }
  ${S} .bs-radio svg { opacity: 0; transform: scale(.4); transition: opacity .16s, transform .38s cubic-bezier(.34,1.56,.64,1); }
  ${S} .bs-opt:has(input:checked) .bs-radio { background: {{ section.settings.text_color }}; box-shadow: none; }
  ${S} .bs-opt:has(input:checked) .bs-radio svg { opacity: 1; transform: none; }
  ${S} .bs-opt.is-out { cursor: not-allowed; opacity: .5; }
  ${S} .bs-on { display: block; margin-top: 10px; font-size: 14px; font-weight: 500; line-height: 1.2; letter-spacing: -.02em; }
  ${S} .bs-note { display: block; margin-top: 2px; font-size: 12px; line-height: 1.35; color: {{ section.settings.muted }}; }
  ${S} .bs-pr { display: block; margin-top: 6px; font-size: 12.5px; font-variant-numeric: tabular-nums; }
  ${S} .bs-nav { display: flex; align-items: center; justify-content: space-between; margin-top: 16px; font-size: 10.5px; }
  ${S} .bs-nav button { display: flex; align-items: center; gap: 6px; transition: opacity .2s; }
  ${S} .bs-nav button:disabled { opacity: .3; cursor: default; }
  ${S} .bs-nav span { color: {{ section.settings.muted }}; font-variant-numeric: tabular-nums; }
  ${S} .bs-sum { min-width: 0; align-self: start; padding: 16px; border-radius: {{ section.settings.radius | plus: 2 }}px; background: {{ section.settings.card }}; }
  ${S} .bs-sum-h { display: flex; align-items: center; justify-content: space-between; }
  ${S} .bs-sum-h span { color: {{ section.settings.muted }}; font-variant-numeric: tabular-nums; }
  ${S} .bs-slots { list-style: none; margin-top: 12px; }
  ${S} .bs-slots li + li { border-top: 1px solid ${line}; }
  ${S} .bs-slot { width: 100%; display: flex; align-items: center; gap: 12px; padding: 10px 0; text-align: left; }
  ${S} .bs-st { position: relative; width: 36px; height: 44px; flex-shrink: 0; overflow: hidden; isolation: isolate; border-radius: {{ section.settings.radius | minus: 1 | at_least: 1 }}px; background: {{ section.settings.bg }}; }
  ${S} .bs-st img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
  {%- if section.settings.photo_tone == 'warm' %}
  ${S} .bs-st.has-img::before { content: ""; position: absolute; inset: 0; z-index: 1; background: ${TONE}; mix-blend-mode: color; opacity: .65; }
  {%- endif %}
  ${S} .bs-st:not(.has-img)::after { content: ""; position: absolute; inset: 3px; border: 1px dashed {{ section.settings.text_color | color_modify: 'alpha', 0.3 }}; border-radius: 1px; }
  ${S} .bs-slot.is-on .bs-st { box-shadow: 0 0 0 1px {{ section.settings.card }}, 0 0 0 2px {{ section.settings.text_color }}; overflow: visible; }
  ${S} .bs-sl { flex: 1; min-width: 0; line-height: 1.2; }
  ${S} .bs-sl small { display: block; font-size: 9.5px; color: {{ section.settings.muted }}; }
  ${S} .bs-sl b { display: block; margin-top: 2px; font-size: 13px; font-weight: 500; letter-spacing: -.015em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  ${S} .bs-sl b.is-empty { color: {{ section.settings.muted }}; }
  ${S} .bs-sp { flex-shrink: 0; font-size: 12.5px; font-variant-numeric: tabular-nums; }
  ${S} .bs-tot { margin-top: 8px; padding-top: 12px; border-top: 1px solid ${line}; font-size: 12.5px; }
  ${S} .bs-tot p { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; }
  ${S} .bs-sep { color: {{ section.settings.muted }}; }
  ${S} .bs-sep.is-off span { text-decoration: line-through; }
  ${S} .bs-rt { margin-top: 6px; }
  ${S} .bs-rt > span { display: flex; align-items: center; gap: 8px; }
  ${S} .bs-chip { padding: 3px 6px; border-radius: ${r}; font-size: 9.5px; line-height: 1; letter-spacing: .1em; color: {{ section.settings.muted }};
    background: {{ section.settings.text_color | color_modify: 'alpha', 0.08 }}; transition: background-color .3s, color .3s; }
  ${S} .bs-chip.is-on { background: {{ section.settings.text_color }}; color: {{ section.settings.card }}; }
  ${S} .bs-rt b { font-size: 20px; font-weight: 500; letter-spacing: -.03em; font-variant-numeric: tabular-nums; }
  ${S} .bs-form { margin: 16px 0 0; }
  ${S} .bs-add { width: 100%; height: 48px; border-radius: ${r}; font-size: 11px; font-weight: 500; text-transform: uppercase; letter-spacing: .14em;
    background: {{ section.settings.button_bg }}; color: {{ section.settings.button_fg }}; transition: filter .2s, transform .2s, opacity .2s; }
  ${S} .bs-add:hover:not(:disabled) { filter: brightness(1.25); }
  ${S} .bs-add:active:not(:disabled) { transform: scale(.98); }
  ${S} .bs-add:disabled { opacity: .45; cursor: not-allowed; }
  ${S} .bs-err { margin-top: 8px; font-size: 12px; color: #b4483a; }
  @container (min-width: 720px) {
    ${S} .bs-wrap { grid-template-columns: minmax(0, 1fr) 300px; gap: 40px; padding: 40px; }
    ${S} .bs-h { font-size: 40px; }
    ${S} .bs-sum { padding: 20px; }
  }
  @media (prefers-reduced-motion: reduce) { ${S} * { transition-duration: 1ms !important; animation: none !important; } }
</style>`;

  const markup = `{%- comment -%}
  Routine Builder by boost.supply. Add it to a product or landing page.
  - Add one "Step" block per step: a one-word role (prep, treat, seal, glow)
    and the two products shoppers choose between. Each adds its selected (or
    first available) variant; sold-out products can't be picked.
  - Bundle discount: the routine price shown here is display only, so set up
    the real discount too. Simplest: Discounts → Create discount → Amount off
    products → Automatic, ${clamp(Math.round(num(config, "discount", 15)), 0, 40)}% off, applies to a "Routine" collection holding every
    product used here, with a minimum quantity equal to the number of steps.
    For an exact "one per step" rule use Shopify Bundles or a bundle discount
    app / Function: every line this section adds carries the hidden line item
    property _routine (the section id) to key the discount on.
  - "Warm photo tone" lays a soft beige over the photos so products shot on
    different backdrops sit together. Turn it off for natural colour.
{%- endcomment -%}
{%- liquid
  assign bs_n = 0
  for block in section.blocks
    if block.type == 'step'
      assign bs_n = bs_n | plus: 1
    endif
  endfor
  assign bs_open = '{' | append: '{'
  assign bs_close = '}' | append: '}'
  assign bs_count_token = bs_open | append: 'count' | append: bs_close
-%}
<div class="bs-rb-{{ section.id }}" id="bs-rb-{{ section.id }}" data-off="{{ section.settings.discount }}" data-routine="{{ section.id }}"
  data-add-url="{{ routes.cart_add_url }}" data-cart-url="{{ routes.cart_url }}"
  data-btn="{{ section.settings.button_text | escape }}" data-left="{{ section.settings.remaining_text | escape }}"
  data-empty="{{ section.settings.empty_slot | escape }}">
  <div class="bs-wrap">
    <div class="bs-main">
      {%- if section.settings.eyebrow != blank -%}<p class="bs-caps bs-eye">{{ section.settings.eyebrow }}</p>{%- endif -%}
      {%- if section.settings.heading != blank -%}<h2 class="bs-h bs-lc">{{ section.settings.heading }}</h2>{%- endif -%}
      {%- if section.settings.subheading != blank -%}<p class="bs-sub">{{ section.settings.subheading }}</p>{%- endif -%}

      {%- if bs_n > 0 -%}
        <div class="bs-tabs" role="tablist" style="--n: {{ bs_n }};">
          {%- assign bs_i = 0 -%}
          {%- for block in section.blocks -%}{%- if block.type == 'step' -%}
            <button type="button" class="bs-tab" role="tab" data-tab="{{ bs_i }}" aria-selected="{% if bs_i == 0 %}true{% else %}false{% endif %}" aria-controls="bs-rb-p-{{ block.id }}">
              <small>{{ bs_i | plus: 1 | prepend: '0' | slice: -2, 2 }}<i>${tick(7)}</i></small>
              <span>{{ block.settings.role }}</span>
            </button>
            {%- assign bs_i = bs_i | plus: 1 -%}
          {%- endif -%}{%- endfor -%}
          <span class="bs-bar" aria-hidden="true" data-bar></span>
        </div>
      {%- endif -%}

      <form action="{{ routes.cart_add_url }}" method="post" data-form id="bs-rb-form-{{ section.id }}">
        {%- assign bs_i = 0 -%}
        {%- for block in section.blocks -%}{%- if block.type == 'step' -%}
          <div class="bs-panel{% if bs_i == 0 %} is-on{% endif %}" role="radiogroup" aria-label="{{ block.settings.role | escape }}" id="bs-rb-p-{{ block.id }}" data-panel="{{ bs_i }}" data-role="{{ block.settings.role | escape }}" {{ block.shopify_attributes }}>
            {%- for bs_k in (1..2) -%}
              {%- if bs_k == 1 -%}{%- assign bs_p = block.settings.product_a -%}{%- assign bs_note = block.settings.note_a -%}{%- else -%}{%- assign bs_p = block.settings.product_b -%}{%- assign bs_note = block.settings.note_b -%}{%- endif -%}
              {%- if bs_p != blank -%}
                {%- assign bs_v = bs_p.selected_or_first_available_variant -%}
                <label class="bs-opt{% unless bs_v.available %} is-out{% endunless %}">
                  <input type="radio" name="items[{{ bs_i }}][id]" value="{{ bs_v.id }}" data-price="{{ bs_v.price }}" data-title="{{ bs_p.title | escape }}"
                    data-img="{% if bs_p.featured_image %}{{ bs_p.featured_image | image_url: width: 120 }}{% endif %}"
                    {%- if section.settings.preselect and bs_k == 1 and bs_v.available %} checked{% endif %}{% unless bs_v.available %} disabled{% endunless %}>
                  <span class="bs-ph">
                    {%- if bs_p.featured_image -%}{{ bs_p.featured_image | image_url: width: 700 | image_tag: loading: 'lazy', alt: bs_p.title, sizes: '(min-width: 990px) 300px, 50vw' }}{%- else -%}{{ 'product-1' | placeholder_svg_tag }}{%- endif -%}
                    <span class="bs-radio" aria-hidden="true">${tick(10)}</span>
                  </span>
                  <span class="bs-on bs-lc">{{ bs_p.title }}</span>
                  {%- if bs_note != blank -%}<span class="bs-note">{{ bs_note }}</span>{%- endif -%}
                  <span class="bs-pr">{{ bs_v.price | money }}</span>
                </label>
              {%- endif -%}
            {%- endfor -%}
          </div>
          {%- assign bs_i = bs_i | plus: 1 -%}
        {%- endif -%}{%- endfor -%}
        <input type="hidden" name="return_to" value="{{ routes.cart_url }}">
      </form>

      {%- if bs_n > 1 -%}
        <div class="bs-nav bs-caps">
          <button type="button" data-go="-1">${arrow("M13 8H3M7 4L3 8l4 4")}{{ section.settings.back_text }}</button>
          <span>{{ section.settings.step_word }} <span data-step>1</span> / {{ bs_n }}</span>
          <button type="button" data-go="1">{{ section.settings.next_text }}${arrow("M3 8h10M9 4l4 4-4 4")}</button>
        </div>
      {%- endif -%}
    </div>

    <aside class="bs-sum">
      <p class="bs-caps bs-sum-h">{{ section.settings.summary_title }}<span><span data-done>0</span>/{{ bs_n }}</span></p>
      <ul class="bs-slots">
        {%- assign bs_i = 0 -%}
        {%- for block in section.blocks -%}{%- if block.type == 'step' -%}
          <li><button type="button" class="bs-slot{% if bs_i == 0 %} is-on{% endif %}" data-slot="{{ bs_i }}">
            <span class="bs-st" data-st></span>
            <span class="bs-sl"><small class="bs-caps">{{ block.settings.role }}</small><b class="bs-lc is-empty" data-sn>{{ section.settings.empty_slot }} {{ block.settings.role }}</b></span>
            <span class="bs-sp" data-sp></span>
          </button></li>
          {%- assign bs_i = bs_i | plus: 1 -%}
        {%- endif -%}{%- endfor -%}
      </ul>
      <div class="bs-tot">
        <p class="bs-sep" data-sep>{{ section.settings.separate_label }}<span data-full>{{ 0 | money }}</span></p>
        <p class="bs-rt"><span>{{ section.settings.routine_label }}{%- if section.settings.discount > 0 -%}<em class="bs-caps bs-chip" style="font-style:normal" data-chip>{{ section.settings.save_label }} {{ section.settings.discount }}%</em>{%- endif -%}</span><b data-total>{{ 0 | money }}</b></p>
      </div>
      <div class="bs-form">
        <button type="submit" form="bs-rb-form-{{ section.id }}" class="bs-add" data-add disabled>{{ section.settings.remaining_text | replace: bs_count_token, bs_n }}</button>
      </div>
      <p class="bs-err" data-err hidden>Something went wrong. Please try again.</p>
    </aside>
  </div>
</div>
<script>
  (function () {
    var root = document.getElementById('bs-rb-{{ section.id }}');
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
    function tok(k) { return '{' + '{' + k + '}' + '}'; }
    function all(s) { return [].slice.call(root.querySelectorAll(s)); }
    function $(s) { return root.querySelector(s); }
    var d = root.dataset, off = +d.off || 0;
    var tabs = all('[data-tab]'), panels = all('[data-panel]'), slots = all('[data-slot]');
    var n = panels.length, active = 0, timer = null;
    function go(i) {
      active = Math.max(0, Math.min(n - 1, i));
      tabs.forEach(function (t, k) { t.setAttribute('aria-selected', k === active ? 'true' : 'false'); });
      panels.forEach(function (p, k) { p.classList.toggle('is-on', k === active); });
      slots.forEach(function (s, k) { s.classList.toggle('is-on', k === active); });
      var bar = $('[data-bar]'); if (bar) bar.style.setProperty('--a', active);
      var st = $('[data-step]'); if (st) st.textContent = active + 1;
      all('[data-go]').forEach(function (b) { b.disabled = (+b.dataset.go < 0 && active === 0) || (+b.dataset.go > 0 && active === n - 1); });
    }
    function picked(i) { return panels[i] ? panels[i].querySelector('input:checked') : null; }
    function update() {
      var full = 0, done = 0;
      panels.forEach(function (p, i) {
        var inp = picked(i), slot = slots[i];
        if (tabs[i]) tabs[i].classList.toggle('is-done', !!inp);
        if (!slot) return;
        var thumb = slot.querySelector('[data-st]'), name = slot.querySelector('[data-sn]'), pr = slot.querySelector('[data-sp]');
        thumb.textContent = '';
        thumb.classList.toggle('has-img', !!(inp && inp.dataset.img));
        if (inp) {
          done++; full += +inp.dataset.price;
          if (inp.dataset.img) { var im = document.createElement('img'); im.src = inp.dataset.img; im.alt = ''; thumb.appendChild(im); }
          name.textContent = inp.dataset.title;
          pr.textContent = money(+inp.dataset.price);
        } else {
          name.textContent = d.empty + ' ' + p.dataset.role;
          pr.textContent = '';
        }
        name.classList.toggle('is-empty', !inp);
      });
      var complete = n > 0 && done === n;
      var total = complete ? Math.round(full * (100 - off) / 100) : full;
      $('[data-done]').textContent = done;
      $('[data-full]').textContent = money(full);
      $('[data-sep]').classList.toggle('is-off', complete && off > 0);
      $('[data-total]').textContent = money(total);
      var chip = $('[data-chip]'); if (chip) chip.classList.toggle('is-on', complete);
      var btn = $('[data-add]');
      btn.disabled = !complete;
      btn.textContent = complete ? d.btn : String(d.left).split(tok('count')).join(n - done);
    }
    tabs.forEach(function (t) { t.addEventListener('click', function () { go(+t.dataset.tab); }); });
    slots.forEach(function (s) { s.addEventListener('click', function () { go(+s.dataset.slot); }); });
    all('[data-go]').forEach(function (b) { b.addEventListener('click', function () { go(active + +b.dataset.go); }); });
    panels.forEach(function (p, i) {
      p.addEventListener('change', function () {
        update();
        clearTimeout(timer);
        if (i < n - 1) timer = setTimeout(function () { go(i + 1); }, 420);
      });
    });
    var form = $('[data-form]'), err = $('[data-err]');
    form.addEventListener('submit', function (e) {
      var items = [];
      panels.forEach(function (p, i) { var inp = picked(i); if (inp) items.push({ id: +inp.value, quantity: 1, properties: { _routine: d.routine } }); });
      if (items.length !== n || !window.fetch) return;
      e.preventDefault();
      var btn = $('[data-add]');
      btn.disabled = true;
      err.hidden = true;
      fetch(d.addUrl + '.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ items: items })
      })
        .then(function (r) { if (!r.ok) throw new Error('cart'); window.location.href = d.cartUrl; })
        .catch(function () { btn.disabled = false; err.hidden = false; });
    });
    go(0);
    update();
  })();
</script>`;

  const steps = list(config, "steps");

  const schema = buildSchema({
    name: "Routine Builder",
    settings: [
      { type: "text", id: "eyebrow", label: "Eyebrow", default: str(config, "eyebrow") },
      { type: "text", id: "heading", label: "Heading", default: str(config, "heading") },
      { type: "textarea", id: "subheading", label: "Subheading", default: str(config, "subheading") },
      { type: "header", content: "Routine" },
      { type: "range", id: "discount", label: "Routine discount (display; set up the real discount too)", min: 0, max: 40, step: 1, unit: "%", default: clamp(Math.round(num(config, "discount", 15)), 0, 40) },
      { type: "checkbox", id: "preselect", label: "Preselect the first product of every step", default: bool(config, "preselect", true) },
      {
        type: "select",
        id: "photo_tone",
        label: "Photo tone",
        options: [
          { value: "warm", label: "Warm (blends different backdrops)" },
          { value: "natural", label: "Natural" },
        ],
        default: str(config, "photoTone") === "natural" ? "natural" : "warm",
      },
      { type: "header", content: "Labels" },
      { type: "text", id: "step_word", label: "“step” word", default: str(config, "stepWord") },
      { type: "text", id: "back_text", label: "Back", default: str(config, "backText") },
      { type: "text", id: "next_text", label: "Next", default: str(config, "nextText") },
      { type: "text", id: "summary_title", label: "Summary title", default: str(config, "summaryTitle") },
      { type: "text", id: "empty_slot", label: "Empty slot prefix", default: str(config, "emptySlot") },
      { type: "text", id: "separate_label", label: "Separate price label", default: str(config, "separateLabel") },
      { type: "text", id: "routine_label", label: "Routine price label", default: str(config, "routineLabel") },
      { type: "text", id: "save_label", label: "“save” word", default: str(config, "saveLabel") },
      { type: "text", id: "button_text", label: "Button text", default: str(config, "buttonText") },
      { type: "text", id: "remaining_text", label: "Button text while incomplete (use {{count}})", default: str(config, "remainingText") },
      { type: "header", content: "Style" },
      { type: "checkbox", id: "lowercase", label: "Lowercase product names", default: bool(config, "lowercase", true) },
      { type: "color", id: "bg", label: "Background", default: str(config, "bg") },
      { type: "color", id: "card", label: "Cards & summary", default: str(config, "card") },
      { type: "color", id: "text_color", label: "Text", default: str(config, "textColor") },
      { type: "color", id: "accent", label: "Accent (eyebrow, focus)", default: str(config, "accent") },
      { type: "color", id: "muted", label: "Muted text", default: str(config, "muted") },
      { type: "color", id: "button_bg", label: "Button", default: str(config, "buttonBg") },
      { type: "color", id: "button_fg", label: "Button label", default: str(config, "buttonText2") },
      { type: "range", id: "radius", label: "Corner radius", min: 0, max: 16, step: 1, unit: "px", default: clamp(Math.round(num(config, "radius", 2)), 0, 16) },
    ],
    blocks: [
      {
        type: "step",
        name: "Step",
        settings: [
          { type: "text", id: "role", label: "Role (one word, e.g. prep)" },
          { type: "product", id: "product_a", label: "Option 1" },
          { type: "text", id: "note_a", label: "Option 1 note" },
          { type: "product", id: "product_b", label: "Option 2" },
          { type: "text", id: "note_b", label: "Option 2 note" },
        ],
      },
    ],
    maxBlocks: 6,
    presetBlocks: steps.map((s) => ({
      type: "step",
      settings: { role: esc(s.role ?? ""), note_a: esc(s.noteA ?? ""), note_b: esc(s.noteB ?? "") },
    })),
  });

  return section({ style, markup, schema });
}

export const routineBuilder: Tweak = {
  slug: "routine-builder",
  inspiredBy: "rhode",
  name: "Routine Builder",
  tagline: "Shoppers build a four-step routine, one pick per step, and see the bundle saving add up.",
  description:
    "Modeled on the build-your-routine bundles Rhode sells. One tab per step (prep, treat, seal, glow) with two products to choose between; picking one glides on to the next step while a summary fills in with the chosen routine. The routine price sits against the separate prices with a “save 15%” chip, and the whole routine goes to the bag in one tap. In Shopify each step is a block with two product pickers, the selection is added in one cart request, and a setup note covers the matching bundle discount.",
  category: "product-page",
  tier: "free",
  tint: "#f1f0ed",
  Preview,
  generateLiquid,
  defaults,
  fields: [
    { key: "eyebrow", label: "Eyebrow", type: "text", group: "Content" },
    { key: "heading", label: "Heading", type: "text", group: "Content" },
    { key: "subheading", label: "Subheading", type: "textarea", group: "Content" },
    { key: "currency", label: "Currency symbol", type: "text", group: "Content" },
    {
      key: "steps", label: "Steps", type: "list", group: "Steps",
      hint: "One row per step with its two options. Image URLs are preview only (your store uses each product's image and price); an empty image shows a drawing",
      itemFields: [
        { key: "role", label: "Role", type: "text" },
        { key: "nameA", label: "Option 1 name", type: "text" },
        { key: "noteA", label: "Option 1 note", type: "text" },
        { key: "priceA", label: "Option 1 price", type: "text" },
        { key: "imageA", label: "Option 1 image URL", type: "text" },
        { key: "nameB", label: "Option 2 name", type: "text" },
        { key: "noteB", label: "Option 2 note", type: "text" },
        { key: "priceB", label: "Option 2 price", type: "text" },
        { key: "imageB", label: "Option 2 image URL", type: "text" },
      ],
      newItem: { role: "protect", nameA: "daily mineral spf", noteA: "sheer, no cast", priceA: "26", imageA: "", nameB: "tinted spf balm", noteB: "a soft-focus finish", priceB: "28", imageB: "" },
      addLabel: "Add step", max: 6,
    },
    { key: "discount", label: "Routine discount", type: "slider", group: "Routine", min: 0, max: 40, step: 1, unit: "%", hint: "Display only. Set up the matching discount in Shopify (see the note in the code)" },
    { key: "preselect", label: "Preselect option 1 in every step", type: "toggle", group: "Routine" },
    {
      key: "photoTone", label: "Photo tone", type: "select", group: "Routine",
      options: [
        { label: "Warm (blends different backdrops)", value: "warm" },
        { label: "Natural", value: "natural" },
      ],
    },
    { key: "stepWord", label: "“step” word", type: "text", group: "Labels" },
    { key: "backText", label: "Back", type: "text", group: "Labels" },
    { key: "nextText", label: "Next", type: "text", group: "Labels" },
    { key: "summaryTitle", label: "Summary title", type: "text", group: "Labels" },
    { key: "emptySlot", label: "Empty slot prefix", type: "text", group: "Labels", hint: "Shown before the role, e.g. “choose your prep”" },
    { key: "separateLabel", label: "Separate price label", type: "text", group: "Labels" },
    { key: "routineLabel", label: "Routine price label", type: "text", group: "Labels" },
    { key: "saveLabel", label: "“save” word", type: "text", group: "Labels" },
    { key: "buttonText", label: "Button text", type: "text", group: "Labels" },
    { key: "remainingText", label: "Button while incomplete", type: "text", group: "Labels", hint: "Use {{count}} for the steps left" },
    { key: "addedText", label: "Added text", type: "text", group: "Labels" },
    fontField("Typography"),
    { key: "lowercase", label: "Lowercase product names", type: "toggle", group: "Typography" },
    { key: "radius", label: "Corner radius", type: "slider", group: "Layout", min: 0, max: 16, step: 1, unit: "px" },
    { key: "bg", label: "Background", type: "color", group: "Colors" },
    { key: "card", label: "Cards & summary", type: "color", group: "Colors" },
    { key: "textColor", label: "Text", type: "color", group: "Colors" },
    { key: "accent", label: "Accent (eyebrow, focus)", type: "color", group: "Colors" },
    { key: "muted", label: "Muted text", type: "color", group: "Colors" },
    { key: "buttonBg", label: "Button", type: "color", group: "Colors" },
    { key: "buttonText2", label: "Button label", type: "color", group: "Colors" },
  ],
};
