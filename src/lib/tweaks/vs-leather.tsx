"use client";

import { useEffect, useRef, useState } from "react";
import type { Tweak, TweakConfig } from "../types";
import { str, num, list, fontStack } from "../cfg";
import { fontField } from "../fields";
import { buildSchema, section, fontFaceFor } from "../liquid";
import { toNum } from "./product-art";

/* ============================================================
   Versus Leather
   A stark "ours vs the leather wallet you're carrying" panel: a
   big "3x thinner" stat on the product photo, then a check/cross
   grid (thickness with a drawn side-on stack, card capacity, RFID
   blocking, lifetime warranty, weight). Our column is lit, the
   leather column is greyed back.
   ============================================================ */

const EASE = "cubic-bezier(.22,1,.36,1)";

const defaults: TweakConfig = {
  eyebrow: "The side-by-side",
  heading: "Ours vs the leather wallet you’re carrying",
  image: "/mockups/wallet.jpg",
  statValue: "3x",
  statLabel: "thinner",
  statNote: "than a 6-card leather bifold",
  oursLabel: "Ours",
  theirsLabel: "Leather",
  rows: [
    { label: "Thickness", ours: "6 mm", theirs: "19 mm" },
    { label: "Card capacity", ours: "1–12 cards", theirs: "6, then it bulges" },
    { label: "RFID blocking", ours: "yes", theirs: "no" },
    { label: "Lifetime warranty", ours: "yes", theirs: "no" },
    { label: "Weight", ours: "2.1 oz", theirs: "4.0 oz" },
  ],
  buttonText: "Shop the wallet",
  footnote: "Compared with a typical 6-card leather bifold, fully loaded.",
  bg: "#000000",
  textColor: "#FFFFFF",
  panel: "#1A1A1A",
  line: "#E9E9E9",
  accent: "#c8a464",
  leather: "#6a4f3b",
  buttonBg: "#FFFFFF",
  buttonFg: "#000000",
  font: "system",
  radius: 6,
};

/* ---------- helpers ---------- */

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const YES = ["yes", "y", "true", "✓", "✔", "1"];
const NO = ["no", "n", "false", "✕", "✗", "x", "0", "-"];
const isBool = (v: string) => {
  const s = v.trim().toLowerCase();
  return YES.includes(s) || NO.includes(s);
};
const isYes = (v: string) => YES.includes(v.trim().toLowerCase());
const isMm = (v: string) => /^\s*[\d.]+\s*mm\s*$/i.test(v);

/** Hex colour + alpha byte. */
const alpha = (hex: string, a: number) =>
  /^#[0-9a-f]{6}$/i.test(hex) ? hex + Math.round(a * 255).toString(16).padStart(2, "0") : hex;

type RowKind = "check" | "stack" | "text";
const rowKind = (ours: string, theirs: string): RowKind =>
  isBool(ours) && isBool(theirs) ? "check" : isMm(ours) && isMm(theirs) ? "stack" : "text";

/* ---------- pieces ---------- */

function Mark({ yes, lit, accent, line }: { yes: boolean; lit: boolean; accent: string; line: string }) {
  const c = lit ? accent : alpha(line, 0.38);
  return (
    <span
      className="grid h-[26px] w-[26px] place-items-center rounded-full"
      style={{ background: yes && lit ? accent : "transparent", boxShadow: yes && lit ? "none" : `inset 0 0 0 1.5px ${c}` }}
      aria-label={yes ? "Yes" : "No"}
      role="img"
    >
      {yes ? (
        <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden>
          <path d="M2.2 6.4l2.4 2.3 5.2-5.4" fill="none" stroke={lit ? "#000" : c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : (
        <svg width="10" height="10" viewBox="0 0 12 12" aria-hidden>
          <path d="M2.5 2.5l7 7M9.5 2.5l-7 7" stroke={c} strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      )}
    </span>
  );
}

/** Side-on stack: slim metal plates for ours, stitched leather layers for theirs. */
function Stack({ mm, scale, ours, accent, leather }: { mm: number; scale: number; ours: boolean; accent: string; leather: string }) {
  const h = Math.max(6, mm * scale);
  const common = { height: h, transformOrigin: "bottom" };
  if (ours) {
    return (
      <span data-bar className="relative block w-full max-w-[84px] overflow-hidden rounded-[3px]" style={common} aria-hidden>
        <span
          className="absolute inset-0"
          style={{ background: "repeating-linear-gradient(180deg, #2b2b2b 0 2px, #141414 2px 3px)" }}
        />
        <span className="absolute inset-x-0 top-0 h-[3px]" style={{ background: "linear-gradient(90deg, #8e9297, #d4d7da 45%, #8e9297)" }} />
        <span className="absolute inset-x-0 bottom-0 h-[3px]" style={{ background: "linear-gradient(90deg, #8e9297, #d4d7da 45%, #8e9297)" }} />
        <span className="absolute right-1.5 top-0 h-full w-[3px]" style={{ background: accent, opacity: 0.85 }} />
      </span>
    );
  }
  return (
    <span data-bar className="relative block w-full max-w-[84px] overflow-hidden rounded-[7px]" style={common} aria-hidden>
      <span
        className="absolute inset-0"
        style={{
          background: `repeating-linear-gradient(180deg, ${leather} 0 4px, ${alpha("#000000", 0.35)} 4px 5px)`,
        }}
      />
      <span className="absolute inset-0" style={{ background: "linear-gradient(90deg, rgba(255,255,255,.1), rgba(0,0,0,.25))" }} />
      <span className="absolute inset-[3px] rounded-[5px]" style={{ border: "1px dashed rgba(255,255,255,.35)" }} />
    </span>
  );
}

/* ---------- preview ---------- */

function Preview({ config }: { config: TweakConfig }) {
  const bg = str(config, "bg", "#000000");
  const text = str(config, "textColor", "#FFFFFF");
  const panel = str(config, "panel", "#1A1A1A");
  const line = str(config, "line", "#E9E9E9");
  const accent = str(config, "accent", "#c8a464");
  const leather = str(config, "leather", "#6a4f3b");
  const radius = num(config, "radius", 6);
  const img = str(config, "image").trim();

  const rows = list(config, "rows").map((r) => {
    const ours = r.ours ?? "";
    const theirs = r.theirs ?? "";
    return { label: r.label ?? "", ours, theirs, kind: rowKind(ours, theirs) };
  });
  const maxMm = Math.max(1, ...rows.filter((r) => r.kind === "stack").flatMap((r) => [toNum(r.ours), toNum(r.theirs)]));
  const scale = 58 / maxMm;

  /* hovering the leather column lights it; the stacks grow in once in view */
  const [focus, setFocus] = useState<"ours" | "theirs" | null>(null);
  const tableRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = tableRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        io.disconnect();
        el.querySelectorAll<HTMLElement>("[data-bar]").forEach((b, i) =>
          b.animate([{ transform: "scaleY(0)" }, { transform: "scaleY(1)" }], {
            duration: 800,
            delay: 120 + i * 120,
            easing: EASE,
            fill: "backwards",
          }),
        );
      },
      { rootMargin: "0px 0px -10% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const cols = "grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_minmax(0,1fr)]";
  const dim = alpha(line, 0.55);
  const rule = alpha(line, 0.12);
  const theirsLit = focus === "theirs";

  return (
    <div className="@container w-full" style={{ background: bg, color: text, fontFamily: fontStack(str(config, "font", "system")) }}>
      <div className="mx-auto grid max-w-[1100px] grid-cols-1 gap-6 px-4 py-6 @min-[720px]:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] @min-[720px]:gap-10 @min-[720px]:px-8 @min-[720px]:py-10">
        {/* Heading + photo with the big stat */}
        <div className="min-w-0">
          {str(config, "eyebrow") && (
            <p className="text-[10.5px] font-bold uppercase tracking-[0.16em]" style={{ color: accent }}>
              {str(config, "eyebrow")}
            </p>
          )}
          <h3 className="mt-2 text-[30px] font-black uppercase leading-[0.92] tracking-[-0.025em] @min-[520px]:text-[38px] @min-[720px]:text-[42px]">
            {str(config, "heading")}
          </h3>
          <div
            className="relative mt-5 aspect-[4/3] overflow-hidden @min-[720px]:aspect-square"
            style={{ background: panel, borderRadius: radius }}
          >
            {img ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={img} alt="" loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover" />
            ) : (
              <span className="absolute inset-0 grid place-items-center pb-16" aria-hidden>
                <svg width="46%" viewBox="0 0 120 90">
                  <g transform="rotate(-14 60 45)">
                    <rect x="26" y="14" width="74" height="48" rx="5" fill="#2a2a2a" />
                    <rect x="22" y="19" width="74" height="48" rx="5" fill="#333" />
                    <rect x="18" y="24" width="74" height="48" rx="5" fill="#222" stroke="rgba(255,255,255,.14)" />
                    <rect x="44" y="30" width="22" height="34" rx="3" fill="#c3c6ca" />
                    <rect x="44" y="30" width="9" height="34" rx="3" fill="rgba(255,255,255,.35)" />
                  </g>
                </svg>
              </span>
            )}
            <div
              className="absolute inset-x-0 bottom-0 px-4 pb-4 pt-16"
              style={{ background: "linear-gradient(0deg, rgba(0,0,0,.85), rgba(0,0,0,0))" }}
            >
              <p className="bs-fade-up flex items-end gap-2 leading-none">
                <span className="text-[86px] font-black leading-[0.78] tracking-[-0.06em] @min-[520px]:text-[110px]" style={{ color: text }}>
                  {str(config, "statValue")}
                </span>
                <span className="pb-1 text-[20px] font-black uppercase tracking-[-0.01em] @min-[520px]:text-[26px]" style={{ color: accent }}>
                  {str(config, "statLabel")}
                </span>
              </p>
              {str(config, "statNote") && (
                <p className="mt-2.5 text-[10.5px] font-bold uppercase leading-snug tracking-[0.1em]" style={{ color: dim }}>
                  {str(config, "statNote")}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* The grid */}
        <div className="min-w-0 @min-[720px]:self-center">
          <div ref={tableRef} role="table" className="text-[13px]">
            <div role="row" className={`grid ${cols} items-end`}>
              <span role="columnheader" className="pb-3 text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: dim }} />
              <span
                role="columnheader"
                onMouseEnter={() => setFocus("ours")}
                onMouseLeave={() => setFocus(null)}
                className="flex items-center justify-center gap-1.5 px-2 pb-3 pt-3.5 text-[12px] font-black uppercase tracking-[0.12em]"
                style={{ background: panel, borderRadius: `${radius}px ${radius}px 0 0`, boxShadow: `inset 0 3px 0 ${accent}` }}
              >
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: accent }} />
                {str(config, "oursLabel")}
              </span>
              <span
                role="columnheader"
                onMouseEnter={() => setFocus("theirs")}
                onMouseLeave={() => setFocus(null)}
                className="px-2 pb-3 text-center text-[12px] font-black uppercase tracking-[0.12em] transition-colors duration-300"
                style={{ color: theirsLit ? text : dim }}
              >
                {str(config, "theirsLabel")}
              </span>
            </div>
            {rows.map((r, i) => {
              const last = i === rows.length - 1;
              return (
                <div
                  key={i}
                  role="row"
                  className={`group grid ${cols} items-stretch`}
                  style={{ boxShadow: `inset 0 1px 0 ${rule}` }}
                >
                  <span role="rowheader" className="flex items-center py-3.5 pr-2 text-[11px] font-bold uppercase leading-tight tracking-[0.1em] transition-colors duration-200 group-hover:text-white" style={{ color: alpha(line, 0.8) }}>
                    {r.label}
                  </span>
                  <span
                    role="cell"
                    className="flex flex-col items-center justify-center gap-2 px-2 py-3.5 text-center"
                    style={{ background: panel, borderRadius: last ? `0 0 ${radius}px ${radius}px` : 0 }}
                  >
                    {r.kind === "check" ? (
                      <Mark yes={isYes(r.ours)} lit accent={accent} line={line} />
                    ) : (
                      <span className="text-[14px] font-black leading-tight tracking-[-0.01em]">{r.ours}</span>
                    )}
                    {r.kind === "stack" && (
                      <span className="flex h-[60px] w-full items-end justify-center">
                        <Stack mm={toNum(r.ours)} scale={scale} ours accent={accent} leather={leather} />
                      </span>
                    )}
                  </span>
                  <span
                    role="cell"
                    onMouseEnter={() => setFocus("theirs")}
                    onMouseLeave={() => setFocus(null)}
                    className="flex flex-col items-center justify-center gap-2 px-2 py-3.5 text-center transition-opacity duration-300"
                    style={{ opacity: theirsLit ? 1 : 0.85 }}
                  >
                    {r.kind === "check" ? (
                      <Mark yes={isYes(r.theirs)} lit={false} accent={accent} line={line} />
                    ) : (
                      <span className="text-[13px] font-bold leading-tight" style={{ color: theirsLit ? text : dim }}>
                        {r.theirs}
                      </span>
                    )}
                    {r.kind === "stack" && (
                      <span className="flex h-[60px] w-full items-end justify-center">
                        <Stack mm={toNum(r.theirs)} scale={scale} ours={false} accent={accent} leather={leather} />
                      </span>
                    )}
                  </span>
                </div>
              );
            })}
          </div>

          {str(config, "buttonText") && (
            <button
              type="button"
              className="group mt-6 flex h-[52px] w-full items-center justify-center gap-2 text-[12.5px] font-extrabold uppercase tracking-[0.14em] hover:brightness-90 active:scale-[0.99]"
              style={{
                background: str(config, "buttonBg", "#FFFFFF"),
                color: str(config, "buttonFg", "#000000"),
                borderRadius: radius,
                transition: `filter 200ms ease, scale 200ms ${EASE}`,
              }}
            >
              {str(config, "buttonText")}
              <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden className="transition-transform duration-300 group-hover:translate-x-0.5">
                <path d="M2 7h9.5M8 3.5 11.5 7 8 10.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          )}
          {str(config, "footnote") && (
            <p className="mt-3 text-center text-[11px] leading-snug" style={{ color: alpha(line, 0.5) }}>
              {str(config, "footnote")}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------- Liquid ---------- */

function generateLiquid(config: TweakConfig): string {
  const { face, family } = fontFaceFor(str(config, "font", "system"));
  const S = ".bs-vsl-{{ section.id }}";
  const r = "{{ section.settings.radius }}px";
  const ease = "cubic-bezier(.22,1,.36,1)";

  const yes = `<span class="bs-mk is-yes" role="img" aria-label="Yes"><svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M2.2 6.4l2.4 2.3 5.2-5.4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></span>`;
  const no = `<span class="bs-mk is-no" role="img" aria-label="No"><svg width="10" height="10" viewBox="0 0 12 12" aria-hidden="true"><path d="M2.5 2.5l7 7M9.5 2.5l-7 7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></span>`;

  const style = `<style>
${face ? face + "\n" : ""}  ${S} { container-type: inline-size; background: {{ section.settings.bg }}; color: {{ section.settings.text_color }}; font-family: ${family}; }
  ${S} * { box-sizing: border-box; }
  ${S} p, ${S} h2 { margin: 0; }
  ${S} .bs-wrap { display: grid; grid-template-columns: minmax(0, 1fr); gap: 24px; max-width: 1100px; margin: 0 auto; padding: 24px 16px; }
  ${S} .bs-eyebrow { font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .16em; color: {{ section.settings.accent }}; }
  ${S} .bs-h { margin-top: 8px; font-size: 30px; font-weight: 900; line-height: .92; letter-spacing: -.025em; text-transform: uppercase; }
  ${S} .bs-vis { position: relative; margin-top: 20px; aspect-ratio: 4 / 3; overflow: hidden; border-radius: ${r}; background: {{ section.settings.panel }}; }
  ${S} .bs-vis img, ${S} .bs-vis .bs-ph { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
  ${S} .bs-ph { fill: rgba(255,255,255,.2); }
  ${S} .bs-stat { position: absolute; left: 0; right: 0; bottom: 0; padding: 64px 16px 16px; background: linear-gradient(0deg, rgba(0,0,0,.85), rgba(0,0,0,0)); }
  ${S} .bs-big { display: flex; align-items: flex-end; gap: 8px; line-height: 1; }
  ${S} .bs-num { font-size: 86px; font-weight: 900; line-height: .78; letter-spacing: -.06em; color: {{ section.settings.text_color }}; }
  ${S} .bs-unit { padding-bottom: 4px; font-size: 20px; font-weight: 900; text-transform: uppercase; letter-spacing: -.01em; color: {{ section.settings.accent }}; }
  ${S} .bs-snote { margin-top: 10px; font-size: 10.5px; font-weight: 700; line-height: 1.35; text-transform: uppercase; letter-spacing: .1em; opacity: .55; }
  ${S} .bs-table { font-size: 13px; }
  ${S} .bs-row { display: grid; grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr) minmax(0, 1fr); align-items: stretch; box-shadow: inset 0 1px 0 rgba(255,255,255,.12); }
  ${S} .bs-row.is-head { align-items: end; box-shadow: none; }
  ${S} .bs-lab { display: flex; align-items: center; padding: 14px 8px 14px 0; font-size: 11px; font-weight: 700; line-height: 1.2; text-transform: uppercase; letter-spacing: .1em; opacity: .8; transition: opacity .2s; }
  ${S} .bs-row:hover .bs-lab { opacity: 1; }
  ${S} .bs-c { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; padding: 14px 8px; text-align: center; }
  ${S} .bs-c.is-ours { background: {{ section.settings.panel }}; }
  ${S} .bs-c.is-theirs { color: {{ section.settings.line }}; }
  ${S} .bs-row:last-child .bs-c.is-ours { border-radius: 0 0 ${r} ${r}; }
  ${S} .bs-hc { padding: 14px 8px 12px; text-align: center; font-size: 12px; font-weight: 900; text-transform: uppercase; letter-spacing: .12em; }
  ${S} .bs-hc.is-ours { display: flex; align-items: center; justify-content: center; gap: 6px; border-radius: ${r} ${r} 0 0; background: {{ section.settings.panel }}; box-shadow: inset 0 3px 0 {{ section.settings.accent }}; }
  ${S} .bs-hc.is-ours::before { content: ""; width: 6px; height: 6px; border-radius: 99px; background: {{ section.settings.accent }}; }
  ${S} .bs-hc.is-theirs { opacity: .55; }
  ${S} .bs-v { font-size: 14px; font-weight: 900; line-height: 1.2; letter-spacing: -.01em; }
  ${S} .is-theirs .bs-v { font-size: 13px; font-weight: 700; letter-spacing: 0; opacity: .55; }
  ${S} .bs-mk { display: grid; place-items: center; width: 26px; height: 26px; border-radius: 99px; }
  ${S} .is-ours .bs-mk.is-yes { background: {{ section.settings.accent }}; color: #000; }
  ${S} .is-ours .bs-mk.is-no { color: {{ section.settings.accent }}; box-shadow: inset 0 0 0 1.5px {{ section.settings.accent }}; }
  ${S} .is-theirs .bs-mk { opacity: .4; box-shadow: inset 0 0 0 1.5px currentColor; }
  ${S} .bs-stk { display: flex; align-items: flex-end; justify-content: center; width: 100%; height: 60px; }
  ${S} .bs-bar { position: relative; display: block; width: 100%; max-width: 84px; min-height: 6px; overflow: hidden; transform-origin: bottom; transition: transform .7s ${ease}; }
  ${S}.is-armed .bs-bar { transform: scaleY(0); }
  ${S}.is-armed.is-in .bs-bar { transform: none; }
  ${S} .bs-bar.is-ours { border-radius: 3px; background: repeating-linear-gradient(180deg, #2b2b2b 0 2px, #141414 2px 3px); }
  ${S} .bs-bar.is-ours::before, ${S} .bs-bar.is-ours::after { content: ""; position: absolute; left: 0; right: 0; height: 3px; background: linear-gradient(90deg, #8e9297, #d4d7da 45%, #8e9297); }
  ${S} .bs-bar.is-ours::before { top: 0; }
  ${S} .bs-bar.is-ours::after { bottom: 0; }
  ${S} .bs-bar.is-ours i { position: absolute; right: 6px; top: 0; bottom: 0; width: 3px; background: {{ section.settings.accent }}; opacity: .85; }
  ${S} .bs-bar.is-theirs { border-radius: 7px; background: linear-gradient(90deg, rgba(255,255,255,.1), rgba(0,0,0,.25)), repeating-linear-gradient(180deg, {{ section.settings.leather }} 0 4px, rgba(0,0,0,.35) 4px 5px); }
  ${S} .bs-bar.is-theirs i { position: absolute; inset: 3px; border: 1px dashed rgba(255,255,255,.35); border-radius: 5px; }
  ${S} .bs-cta { display: flex; align-items: center; justify-content: center; gap: 8px; height: 52px; margin-top: 24px; border-radius: ${r}; text-decoration: none;
    background: {{ section.settings.button_bg }}; color: {{ section.settings.button_fg }}; font-size: 12.5px; font-weight: 800; text-transform: uppercase; letter-spacing: .14em; transition: filter .2s, transform .2s; }
  ${S} .bs-cta:hover { filter: brightness(.9); }
  ${S} .bs-cta:hover svg { transform: translateX(2px); }
  ${S} .bs-cta svg { transition: transform .3s ${ease}; }
  ${S} .bs-foot { margin-top: 12px; text-align: center; font-size: 11px; line-height: 1.4; opacity: .5; }
  @container (min-width: 520px) {
    ${S} .bs-h { font-size: 38px; }
    ${S} .bs-num { font-size: 110px; }
    ${S} .bs-unit { font-size: 26px; }
  }
  @container (min-width: 720px) {
    ${S} .bs-wrap { grid-template-columns: minmax(0, .95fr) minmax(0, 1.05fr); gap: 40px; padding: 40px 32px; }
    ${S} .bs-h { font-size: 42px; }
    ${S} .bs-vis { aspect-ratio: 1 / 1; }
    ${S} .bs-grid { align-self: center; }
  }
  @media (prefers-reduced-motion: reduce) {
    ${S} .bs-bar { transition: none; }
  }
</style>`;

  const markup = `{%- comment -%}
  Versus Leather by boost.supply. Add it to a product or landing page.
  - Add one block per comparison row:
      "Thickness row": two sizes in mm, drawn as side-on stacks to scale.
      "Check row": a yes / no for each side (RFID blocking, warranty).
      "Text row": free text for each side (card capacity, weight).
  - Photo: the "Photo" image picker, or the product's featured image.
  - Only list specs you can back up; keep the leather numbers to a fair,
    typical example and say what you compared against in the footnote.
{%- endcomment -%}
{%- liquid
  assign bs_p = section.settings.product
  if bs_p == blank
    assign bs_p = product
  endif
  assign bs_max = 1
  for block in section.blocks
    if block.type == 'stack'
      if block.settings.ours_mm > bs_max
        assign bs_max = block.settings.ours_mm
      endif
      if block.settings.theirs_mm > bs_max
        assign bs_max = block.settings.theirs_mm
      endif
    endif
  endfor
  assign bs_link = section.settings.button_link
  if bs_link == blank and bs_p != blank
    assign bs_link = bs_p.url
  endif
-%}
<div class="bs-vsl-{{ section.id }}" id="bs-vsl-{{ section.id }}">
  <div class="bs-wrap">
    <div>
      {%- if section.settings.eyebrow != blank -%}<p class="bs-eyebrow">{{ section.settings.eyebrow }}</p>{%- endif -%}
      <h2 class="bs-h">{{ section.settings.heading }}</h2>
      <div class="bs-vis">
        {%- if section.settings.image != blank -%}
          {{ section.settings.image | image_url: width: 1200 | image_tag: loading: 'lazy', alt: section.settings.heading, sizes: '(min-width: 990px) 45vw, 100vw' }}
        {%- elsif bs_p.featured_image -%}
          {{ bs_p.featured_image | image_url: width: 1200 | image_tag: loading: 'lazy', alt: bs_p.title, sizes: '(min-width: 990px) 45vw, 100vw' }}
        {%- else -%}
          {{ 'product-1' | placeholder_svg_tag: 'bs-ph' }}
        {%- endif -%}
        <div class="bs-stat">
          <p class="bs-big"><span class="bs-num">{{ section.settings.stat_value }}</span><span class="bs-unit">{{ section.settings.stat_label }}</span></p>
          {%- if section.settings.stat_note != blank -%}<p class="bs-snote">{{ section.settings.stat_note }}</p>{%- endif -%}
        </div>
      </div>
    </div>

    <div class="bs-grid">
      <div class="bs-table" role="table" aria-label="{{ section.settings.ours_label | escape }} vs {{ section.settings.theirs_label | escape }}">
        <div class="bs-row is-head" role="row">
          <span role="columnheader"></span>
          <span class="bs-hc is-ours" role="columnheader">{{ section.settings.ours_label }}</span>
          <span class="bs-hc is-theirs" role="columnheader">{{ section.settings.theirs_label }}</span>
        </div>
        {%- for block in section.blocks -%}
          <div class="bs-row" role="row" {{ block.shopify_attributes }}>
            <span class="bs-lab" role="rowheader">{{ block.settings.label }}</span>
            {%- case block.type -%}
              {%- when 'stack' -%}
                {%- assign bs_ho = block.settings.ours_mm | times: 58 | divided_by: bs_max -%}
                {%- assign bs_ht = block.settings.theirs_mm | times: 58 | divided_by: bs_max -%}
                <span class="bs-c is-ours" role="cell">
                  <span class="bs-v">{{ block.settings.ours_mm }} mm</span>
                  <span class="bs-stk" aria-hidden="true"><span class="bs-bar is-ours" style="height: {{ bs_ho }}px;"><i></i></span></span>
                </span>
                <span class="bs-c is-theirs" role="cell">
                  <span class="bs-v">{{ block.settings.theirs_mm }} mm</span>
                  <span class="bs-stk" aria-hidden="true"><span class="bs-bar is-theirs" style="height: {{ bs_ht }}px;"><i></i></span></span>
                </span>
              {%- when 'check' -%}
                <span class="bs-c is-ours" role="cell">{% if block.settings.ours %}${yes}{% else %}${no}{% endif %}</span>
                <span class="bs-c is-theirs" role="cell">{% if block.settings.theirs %}${yes}{% else %}${no}{% endif %}</span>
              {%- else -%}
                <span class="bs-c is-ours" role="cell"><span class="bs-v">{{ block.settings.ours }}</span></span>
                <span class="bs-c is-theirs" role="cell"><span class="bs-v">{{ block.settings.theirs }}</span></span>
            {%- endcase -%}
          </div>
        {%- endfor -%}
      </div>

      {%- if section.settings.button_text != blank and bs_link != blank -%}
        <a class="bs-cta" href="{{ bs_link }}">{{ section.settings.button_text }}<svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M2 7h9.5M8 3.5 11.5 7 8 10.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></a>
      {%- endif -%}
      {%- if section.settings.footnote != blank -%}<p class="bs-foot">{{ section.settings.footnote }}</p>{%- endif -%}
    </div>
  </div>
</div>
<script>
  (function () {
    var root = document.getElementById('bs-vsl-{{ section.id }}');
    if (!root || !('IntersectionObserver' in window)) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    root.classList.add('is-armed');
    var io = new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting) { root.classList.add('is-in'); io.disconnect(); }
    }, { rootMargin: '0px 0px -10% 0px' });
    io.observe(root.querySelector('.bs-table') || root);
  })();
</script>`;

  const rows = list(config, "rows");
  const mmOf = (v: string) => clamp(Math.round(toNum(v, 1)), 1, 40);

  const schema = buildSchema({
    name: "Versus Leather",
    settings: [
      { type: "text", id: "eyebrow", label: "Eyebrow", default: str(config, "eyebrow") },
      { type: "text", id: "heading", label: "Heading", default: str(config, "heading") },
      { type: "header", content: "Photo & stat" },
      { type: "product", id: "product", label: "Product", info: "Used for the photo and button link. Leave empty on a product template to use that product." },
      { type: "image_picker", id: "image", label: "Photo", info: "Optional. Defaults to the product's featured image." },
      { type: "text", id: "stat_value", label: "Stat number", default: str(config, "statValue") },
      { type: "text", id: "stat_label", label: "Stat label", default: str(config, "statLabel") },
      { type: "text", id: "stat_note", label: "Stat note", default: str(config, "statNote") },
      { type: "header", content: "Columns" },
      { type: "text", id: "ours_label", label: "Our column", default: str(config, "oursLabel") },
      { type: "text", id: "theirs_label", label: "Their column", default: str(config, "theirsLabel") },
      { type: "header", content: "Button" },
      { type: "text", id: "button_text", label: "Button text", default: str(config, "buttonText") },
      { type: "url", id: "button_link", label: "Button link (empty = product page)" },
      { type: "text", id: "footnote", label: "Footnote", default: str(config, "footnote") },
      { type: "header", content: "Style" },
      { type: "color", id: "bg", label: "Background", default: str(config, "bg") },
      { type: "color", id: "text_color", label: "Text", default: str(config, "textColor") },
      { type: "color", id: "panel", label: "Our column & photo", default: str(config, "panel") },
      { type: "color", id: "line", label: "Their column text", default: str(config, "line") },
      { type: "color", id: "accent", label: "Accent", default: str(config, "accent") },
      { type: "color", id: "leather", label: "Leather stack", default: str(config, "leather") },
      { type: "color", id: "button_bg", label: "Button", default: str(config, "buttonBg") },
      { type: "color", id: "button_fg", label: "Button text", default: str(config, "buttonFg") },
      { type: "range", id: "radius", label: "Corner radius", min: 0, max: 16, step: 1, unit: "px", default: clamp(Math.round(num(config, "radius", 6)), 0, 16) },
    ],
    blocks: [
      {
        type: "stack",
        name: "Thickness row",
        settings: [
          { type: "text", id: "label", label: "Label", default: "Thickness" },
          { type: "range", id: "ours_mm", label: "Ours", min: 1, max: 40, step: 1, unit: "mm", default: 6 },
          { type: "range", id: "theirs_mm", label: "Theirs", min: 1, max: 40, step: 1, unit: "mm", default: 19 },
        ],
      },
      {
        type: "check",
        name: "Check row",
        settings: [
          { type: "text", id: "label", label: "Label", default: "RFID blocking" },
          { type: "checkbox", id: "ours", label: "Ours has it", default: true },
          { type: "checkbox", id: "theirs", label: "Theirs has it", default: false },
        ],
      },
      {
        type: "spec",
        name: "Text row",
        settings: [
          { type: "text", id: "label", label: "Label", default: "Weight" },
          { type: "text", id: "ours", label: "Ours", default: "2.1 oz" },
          { type: "text", id: "theirs", label: "Theirs", default: "4.0 oz" },
        ],
      },
    ],
    maxBlocks: 10,
    presetBlocks: rows.slice(0, 10).map((row): { type: string; settings: Record<string, string | number | boolean> } => {
      const ours = row.ours ?? "";
      const theirs = row.theirs ?? "";
      const kind = rowKind(ours, theirs);
      if (kind === "stack") return { type: "stack", settings: { label: row.label ?? "", ours_mm: mmOf(ours), theirs_mm: mmOf(theirs) } };
      if (kind === "check") return { type: "check", settings: { label: row.label ?? "", ours: isYes(ours), theirs: isYes(theirs) } };
      return { type: "spec", settings: { label: row.label ?? "", ours, theirs } };
    }),
  });

  return section({ style, markup, schema });
}

export const vsLeather: Tweak = {
  slug: "vs-leather",
  inspiredBy: "ridge",
  name: "Versus Leather",
  tagline: "A stark ours-vs-leather grid with a big “3x thinner” stat and a to-scale thickness stack.",
  description:
    "Modeled on the head-to-head comparison Ridge runs against the bulky leather wallet. A product photo carries one big stat (“3x thinner”), then a check/cross grid compares thickness (drawn as side-on stacks to scale), card capacity, RFID blocking, lifetime warranty and weight. Our column is lit with an accent bar while the leather column is greyed back, so the win reads in a glance. Every row is a block in Shopify, with a thickness, check or text type.",
  category: "product-page",
  tier: "free",
  tint: "#e9e9e9",
  Preview,
  generateLiquid,
  defaults,
  fields: [
    { key: "eyebrow", label: "Eyebrow", type: "text", group: "Content" },
    { key: "heading", label: "Heading", type: "text", group: "Content" },
    {
      key: "image", label: "Image URL", type: "text", group: "Media",
      hint: "Product photo behind the stat. Preview only; your store uses the image picker or the product's featured image",
    },
    { key: "statValue", label: "Stat number", type: "text", group: "Stat" },
    { key: "statLabel", label: "Stat label", type: "text", group: "Stat" },
    { key: "statNote", label: "Stat note", type: "text", group: "Stat" },
    { key: "oursLabel", label: "Our column", type: "text", group: "Comparison" },
    { key: "theirsLabel", label: "Their column", type: "text", group: "Comparison" },
    {
      key: "rows", label: "Rows", type: "list", group: "Comparison",
      hint: "Write yes / no for a check or cross. Sizes in mm on both sides (e.g. 6 mm) draw the thickness stack",
      itemFields: [
        { key: "label", label: "Label", type: "text" },
        { key: "ours", label: "Ours", type: "text" },
        { key: "theirs", label: "Theirs", type: "text" },
      ],
      newItem: { label: "Coin pocket", ours: "no", theirs: "yes" },
      addLabel: "Add row", max: 10,
    },
    { key: "buttonText", label: "Button text", type: "text", group: "Comparison" },
    { key: "footnote", label: "Footnote", type: "text", group: "Comparison" },
    fontField("Typography"),
    { key: "radius", label: "Corner radius", type: "slider", group: "Layout", min: 0, max: 16, step: 1, unit: "px" },
    { key: "bg", label: "Background", type: "color", group: "Colors" },
    { key: "textColor", label: "Text", type: "color", group: "Colors" },
    { key: "panel", label: "Our column & photo", type: "color", group: "Colors" },
    { key: "line", label: "Their column text", type: "color", group: "Colors" },
    { key: "accent", label: "Accent", type: "color", group: "Colors" },
    { key: "leather", label: "Leather stack", type: "color", group: "Colors" },
    { key: "buttonBg", label: "Button", type: "color", group: "Colors" },
    { key: "buttonFg", label: "Button text", type: "color", group: "Colors" },
  ],
};
