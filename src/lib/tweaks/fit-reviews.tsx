"use client";

import { useEffect, useState, type CSSProperties } from "react";
import type { Tweak, TweakConfig } from "../types";
import { str, num, bool, list, fontStack, esc } from "../cfg";
import { fontField } from "../fields";
import { buildSchema, section, fontFaceFor } from "../liquid";
import { Icon, iconMarkup } from "../icons";
import { toNum } from "./product-art";

/* ============================================================
   Fit Review Summary
   A gym-wear review summary: a big average with a star
   histogram, a sizing scale with a "find your size" helper,
   fit attribute scales (length, comfort, coverage) and short
   review cards with size-bought / usual-size chips.
   Bars and markers animate in when the section appears.
   ============================================================ */

const MONO = "ui-monospace, 'SF Mono', Menlo, monospace";
const EASE = "cubic-bezier(.22,1,.36,1)";
const STAR_PATH = "M12 2.6l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.4l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z";
const CHECK_PATH = "M12 2.5l2.3 1.7 2.8-.1.9 2.7 2.3 1.6-.9 2.7.9 2.7-2.3 1.6-.9 2.7-2.8-.1L12 21.5l-2.3-1.7-2.8.1-.9-2.7-2.3-1.6.9-2.7-.9-2.7 2.3-1.6.9-2.7 2.8.1z";

const defaults: TweakConfig = {
  eyebrow: "Reviews",
  heading: "Tested in real sessions",
  rating: "",
  count5: "1032",
  count4: "168",
  count3: "46",
  count2: "21",
  count1: "17",
  fitTitle: "How it fits",
  sizingLabel: "Sizing",
  sizing: 52,
  sizingLeft: "Too small",
  sizingMid: "True to size",
  sizingRight: "Too large",
  adviceSmall: "Runs small. We suggest sizing up.",
  adviceTrue: "Fits true to size. Order your usual size.",
  adviceLarge: "Runs large. We suggest sizing down.",
  showSizeHelper: true,
  sizeLabel: "Your usual size",
  sizes: "XS, S, M, L, XL, XXL",
  sizeHint: "Tap your usual size to see your best fit",
  recLabel: "Your best fit:",
  attributes: [
    { label: "Length", left: "Too short", mid: "Just right", right: "Too long", value: "45" },
    { label: "Comfort", left: "Stiff", mid: "Comfortable", right: "Second skin", value: "86" },
    { label: "Coverage", left: "See-through", mid: "Mostly opaque", right: "Squat-safe", value: "93" },
  ],
  reviewsTitle: "Featured reviews",
  boughtLabel: "Size bought",
  usualLabel: "Usual size",
  verifiedLabel: "Verified buyer",
  reviews: [
    {
      name: "Jordan K.",
      title: "My go-to for leg day",
      body: "Thick enough that nothing shows on deep squats, and the waistband stays put through every set.",
      rating: "5",
      size: "M",
      usual: "M",
      date: "2 days ago",
    },
    {
      name: "Sam R.",
      title: "Soft, supportive, no rolling",
      body: "Ran in them in the morning and lifted in the evening. Zero adjusting, and they wash really well.",
      rating: "5",
      size: "S",
      usual: "S",
      date: "1 week ago",
    },
    {
      name: "Alex P.",
      title: "Great fit, slightly long",
      body: "True to size at the waist. The length bunches a little at my ankle, but I still reach for them first.",
      rating: "4",
      size: "L",
      usual: "L",
      date: "3 weeks ago",
    },
  ],
  linkText: "See all reviews",
  bg: "#FFFFFF",
  card: "#FFFFFF",
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
const fmt = (n: number) => Math.round(n).toLocaleString("en-US");
/** 0 = left label, 1 = middle, 2 = right. Same thresholds as the Liquid. */
const zone = (v: number) => (v < 40 ? 0 : v > 60 ? 2 : 1);

function Stars({
  value,
  size,
  gap,
  on,
  off,
}: {
  value: number;
  size: number;
  gap: number;
  on: string;
  off: string;
}) {
  const v = clamp(value, 0, 5);
  const full = Math.floor(v);
  const width = full * (size + gap) + (v - full) * size;
  const row = (color: string) => (
    <span className="flex" style={{ gap, color }}>
      {Array.from({ length: 5 }, (_, i) => (
        <svg key={i} width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className="shrink-0" aria-hidden>
          <path d={STAR_PATH} />
        </svg>
      ))}
    </span>
  );
  return (
    <span className="relative inline-flex" role="img" aria-label={`${v.toFixed(1)} out of 5 stars`}>
      {row(off)}
      <span className="absolute inset-y-0 left-0 overflow-hidden" style={{ width }}>
        {row(on)}
      </span>
    </span>
  );
}

function Scale({
  label,
  left,
  mid,
  right,
  value,
  ready,
  delay,
  big,
  text,
  accent,
  track,
  card,
  muted,
  display,
}: {
  label: string;
  left: string;
  mid: string;
  right: string;
  value: number;
  ready: boolean;
  delay: number;
  big?: boolean;
  text: string;
  accent: string;
  track: string;
  card: string;
  muted: string;
  display: CSSProperties;
}) {
  const v = clamp(value, 0, 100);
  const z = zone(v);
  const dot = big ? 18 : 14;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <span className={big ? "text-[14px]" : "text-[12px]"} style={{ ...display, lineHeight: 1 }}>
          {label}
        </span>
        <span
          className={`text-right font-semibold ${big ? "text-[12.5px]" : "text-[11.5px]"}`}
          style={{ color: big ? accent : text }}
        >
          {[left, mid, right][z]}
        </span>
      </div>
      <div className={`relative ${big ? "mt-3 h-2" : "mt-2 h-1.5"}`}>
        <div className="absolute inset-0 grid grid-cols-3 gap-[3px]">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="rounded-full transition-colors duration-500"
              style={{ background: i === z ? tint(text, 0.16) : track }}
            />
          ))}
        </div>
        <span
          aria-hidden
          className="absolute top-1/2 rounded-full"
          style={{
            width: dot,
            height: dot,
            left: ready ? `calc(${dot / 2}px + (100% - ${dot}px) * ${v / 100})` : dot / 2,
            transform: "translate(-50%, -50%)",
            background: big ? accent : text,
            boxShadow: `0 0 0 3px ${card}, 0 2px 8px rgba(0,0,0,.18)`,
            transition: `left 1100ms ${EASE} ${delay}ms, background-color .3s`,
          }}
        />
      </div>
      <div className="mt-2 grid grid-cols-3 gap-2 text-[10.5px] leading-tight" style={{ color: muted }}>
        <span>{left}</span>
        <span className="text-center">{mid}</span>
        <span className="text-right">{right}</span>
      </div>
    </div>
  );
}

function Preview({ config }: { config: TweakConfig }) {
  const bg = str(config, "bg", "#FFFFFF");
  const card = str(config, "card", "#FFFFFF");
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
    lineHeight: 0.9,
  };
  const panel: CSSProperties = {
    background: card,
    borderRadius: radius,
    boxShadow: `inset 0 0 0 1px ${track}`,
  };

  /* rating maths: average from the histogram unless typed in */
  const counts = [5, 4, 3, 2, 1].map((s) => Math.max(0, Math.round(toNum(str(config, `count${s}`)))));
  const total = counts.reduce((a, b) => a + b, 0);
  const calc = total ? counts.reduce((a, c, i) => a + c * (5 - i), 0) / total : 0;
  const manual = toNum(str(config, "rating"), -1);
  const avg = clamp(Math.round((manual > 0 ? manual : calc) * 10) / 10, 0, 5);

  const sizing = clamp(num(config, "sizing", 52), 0, 100);
  const sz = zone(sizing);
  const advice = [str(config, "adviceSmall"), str(config, "adviceTrue"), str(config, "adviceLarge")][sz];
  const shift = sz === 0 ? 1 : sz === 2 ? -1 : 0;
  const sizes = str(config, "sizes")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const attributes = list(config, "attributes");
  const reviews = list(config, "reviews");
  const linkText = str(config, "linkText");

  const [pick, setPick] = useState<number | null>(null);
  const picked = pick !== null && pick < sizes.length ? pick : null;
  const rec = picked === null ? -1 : clamp(picked + shift, 0, sizes.length - 1);

  /* bars grow in after the first paint */
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let b = 0;
    const a = requestAnimationFrame(() => {
      b = requestAnimationFrame(() => setReady(true));
    });
    return () => {
      cancelAnimationFrame(a);
      cancelAnimationFrame(b);
    };
  }, []);

  return (
    <div
      className="@container w-full"
      style={{ background: bg, color: text, fontFamily: fontStack(str(config, "font", "system")) }}
    >
      <div className="mx-auto w-full max-w-[1080px] px-5 pb-7 pt-6 @min-[720px]:px-10 @min-[720px]:pb-12 @min-[720px]:pt-10">
        {/* Header */}
        {str(config, "eyebrow") && (
          <p
            className="flex items-center gap-1.5 text-[10.5px] uppercase tracking-[0.12em]"
            style={{ fontFamily: MONO, color: muted }}
          >
            <span aria-hidden className="h-1.5 w-1.5 rounded-full" style={{ background: accent }} />
            {str(config, "eyebrow")}
          </p>
        )}
        {str(config, "heading") && (
          <h3 className="mt-2 text-[32px] @min-[720px]:text-[44px]" style={display}>
            {str(config, "heading")}
          </h3>
        )}

        <div className="mt-5 grid gap-3 @min-[720px]:mt-8 @min-[720px]:grid-cols-[minmax(0,340px)_minmax(0,1fr)] @min-[720px]:gap-8">
          {/* Summary column */}
          <div className="flex min-w-0 flex-col gap-3">
            {/* Score + histogram */}
            <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-5 p-4" style={panel}>
              <div>
                <p className="text-[64px] tabular-nums" style={{ ...display, lineHeight: 0.82, letterSpacing: "-0.04em" }}>
                  {avg.toFixed(1)}
                </p>
                <div className="mt-2.5">
                  <Stars value={avg} size={14} gap={2} on={text} off={track} />
                </div>
                <p className="mt-1.5 text-[10px] uppercase tracking-[0.08em]" style={{ fontFamily: MONO, color: muted }}>
                  {fmt(total)} reviews
                </p>
              </div>
              <div className="flex flex-col gap-[7px]">
                {counts.map((c, i) => {
                  const pct = total ? (c / total) * 100 : 0;
                  return (
                    <div key={i} className="grid grid-cols-[18px_minmax(0,1fr)_34px] items-center gap-2">
                      <span className="flex items-center gap-[2px] text-[11.5px] font-bold tabular-nums">
                        {5 - i}
                        <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                          <path d={STAR_PATH} />
                        </svg>
                      </span>
                      <span className="relative h-1.5 overflow-hidden rounded-full" style={{ background: track }}>
                        <span
                          className="absolute inset-y-0 left-0 rounded-full"
                          style={{
                            width: ready ? `${pct}%` : 0,
                            background: text,
                            transition: `width 1000ms ${EASE} ${i * 70}ms`,
                          }}
                        />
                      </span>
                      <span className="text-right text-[11px] tabular-nums" style={{ color: muted }}>
                        {fmt(c)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Fit */}
            <div className="p-4" style={panel}>
              {str(config, "fitTitle") && (
                <p className="mb-4 text-[16px]" style={display}>
                  {str(config, "fitTitle")}
                </p>
              )}
              <Scale
                big
                label={str(config, "sizingLabel")}
                left={str(config, "sizingLeft")}
                mid={str(config, "sizingMid")}
                right={str(config, "sizingRight")}
                value={sizing}
                ready={ready}
                delay={150}
                text={text}
                accent={accent}
                track={track}
                card={card}
                muted={muted}
                display={display}
              />

              {advice && (
                <div
                  key={sz}
                  className="bs-swap mt-4 flex items-center gap-2.5 px-3 py-2.5 text-[12.5px] font-semibold leading-snug"
                  style={{ background: text, color: card, borderRadius: radius }}
                >
                  <Icon token="pack:ruler" size={18} />
                  <span>{advice}</span>
                </div>
              )}

              {bool(config, "showSizeHelper", true) && sizes.length > 0 && (
                <div className="mt-4">
                  <p className="text-[10px] uppercase tracking-[0.1em]" style={{ fontFamily: MONO, color: muted }}>
                    {str(config, "sizeLabel")}
                  </p>
                  <div role="radiogroup" className="mt-2 flex flex-wrap gap-1.5">
                    {sizes.map((s, i) => {
                      const on = picked === i;
                      return (
                        <button
                          key={i}
                          type="button"
                          role="radio"
                          aria-checked={on}
                          onClick={() => setPick(i)}
                          className="h-8 min-w-[40px] rounded-full px-3 text-[12px] font-bold transition-[background-color,color,box-shadow,scale] duration-200 active:scale-95"
                          style={{
                            background: on ? text : "transparent",
                            color: on ? card : text,
                            boxShadow: on ? "none" : `inset 0 0 0 1.5px ${track}`,
                          }}
                        >
                          {s}
                        </button>
                      );
                    })}
                  </div>
                  <p key={rec} className="bs-swap mt-2.5 text-[12.5px]" style={{ color: rec < 0 ? muted : text }}>
                    {rec < 0 ? (
                      str(config, "sizeHint")
                    ) : (
                      <>
                        {str(config, "recLabel")}{" "}
                        <b className="inline-grid h-6 min-w-6 place-items-center rounded-full px-2 text-[12px]" style={{ background: accent, color: "#fff" }}>
                          {sizes[rec]}
                        </b>
                      </>
                    )}
                  </p>
                </div>
              )}

              {attributes.length > 0 && (
                <div className="mt-5 flex flex-col gap-4 border-t pt-4" style={{ borderColor: track }}>
                  {attributes.map((a, i) => (
                    <Scale
                      key={i}
                      label={a.label ?? ""}
                      left={a.left ?? ""}
                      mid={a.mid ?? ""}
                      right={a.right ?? ""}
                      value={toNum(a.value, 50)}
                      ready={ready}
                      delay={250 + i * 90}
                      text={text}
                      accent={accent}
                      track={track}
                      card={card}
                      muted={muted}
                      display={display}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Reviews column */}
          <div className="flex min-w-0 flex-col gap-3">
            <div className="flex items-baseline justify-between gap-3 pt-2 @min-[720px]:pt-0">
              <p className="text-[16px]" style={display}>
                {str(config, "reviewsTitle")}
              </p>
              <span className="text-[10px] uppercase tracking-[0.08em]" style={{ fontFamily: MONO, color: muted }}>
                {reviews.length} of {fmt(total)}
              </span>
            </div>
            {reviews.map((r, i) => (
              <article key={i} className="bs-rise p-4" style={{ ...panel, "--i": i } as CSSProperties}>
                <div className="flex items-center justify-between gap-3">
                  <Stars value={clamp(toNum(r.rating, 5), 0, 5)} size={12} gap={2} on={text} off={track} />
                  <span className="text-[11px]" style={{ color: muted }}>
                    {r.date}
                  </span>
                </div>
                <p className="mt-2.5 text-[15px]" style={{ ...display, lineHeight: 1 }}>
                  {r.title}
                </p>
                <p className="mt-1.5 text-[13px] leading-[1.5]">{r.body}</p>
                {(r.size || r.usual) && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {[
                      [str(config, "boughtLabel"), r.size],
                      [str(config, "usualLabel"), r.usual],
                    ]
                      .filter(([, v]) => v)
                      .map(([l, v], k) => (
                        <span
                          key={k}
                          className="rounded-full px-2.5 py-1 text-[11px]"
                          style={{ background: tint(track, 0.55) }}
                        >
                          <span style={{ color: muted }}>{l}:</span> <b className="font-bold">{v}</b>
                        </span>
                      ))}
                  </div>
                )}
                <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px]">
                  <b className="font-bold">{r.name}</b>
                  {str(config, "verifiedLabel") && (
                    <span className="inline-flex items-center gap-1 font-medium" style={{ color: linkColor }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" aria-hidden>
                        <path d={CHECK_PATH} fill="currentColor" />
                        <path d="M8.4 12.2l2.4 2.4 4.8-4.9" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      {str(config, "verifiedLabel")}
                    </span>
                  )}
                </div>
              </article>
            ))}
            {linkText && (
              <button
                type="button"
                className="mt-1 h-11 w-full rounded-full text-[13px] font-bold uppercase tracking-[0.04em] transition-[background-color,color] duration-200 hover:bg-[var(--c)] hover:text-[var(--b)]"
                style={{ boxShadow: `inset 0 0 0 1.5px ${text}`, "--c": text, "--b": bg } as CSSProperties}
              >
                {linkText}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Liquid ---------------- */

const starRow = (size: number, gap: number) =>
  `<span class="bs-row" style="gap:${gap}px">${Array.from(
    { length: 5 },
    () => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true"><path d="${STAR_PATH}"/></svg>`,
  ).join("")}</span>`;

const starsMarkup = (size: number, gap: number, fullVar: string, fracVar: string) =>
  `<span class="bs-stars" style="--w: calc(${fullVar} * ${size + gap}px + ${fracVar} * ${size}px)">${starRow(size, gap)}<span class="bs-stars-on">${starRow(size, gap)}</span></span>`;

function generateLiquid(config: TweakConfig): string {
  const body = fontFaceFor(str(config, "font", "system"));
  const disp = fontFaceFor(str(config, "displayFont", "system"));
  const face = body.face || disp.face;
  const S = ".bs-fr-{{ section.id }}";
  const r = "{{ section.settings.radius }}px";
  const mono = MONO;
  const ease = EASE;

  const style = `<style>
${face ? face + "\n" : ""}  ${S} { container-type: inline-size; background: {{ section.settings.bg }}; color: {{ section.settings.text_color }}; font-family: ${body.family}; }
  ${S} * { box-sizing: border-box; }
  ${S} p, ${S} h2 { margin: 0; }
  ${S} .bs-wrap { max-width: 1080px; margin: 0 auto; padding: 24px 20px 28px; }
  ${S} .bs-disp { font-family: ${disp.family}; font-weight: 800; font-stretch: condensed; letter-spacing: -.015em; line-height: .9;
    {%- if section.settings.display_caps %} text-transform: uppercase;{% endif %} }
  ${S} .bs-mono { font-family: ${mono}; font-size: 10px; text-transform: uppercase; letter-spacing: .1em; color: {{ section.settings.muted }}; }
  ${S} .bs-eye { display: flex; align-items: center; gap: 6px; font-size: 10.5px; letter-spacing: .12em; }
  ${S} .bs-eye i { width: 6px; height: 6px; border-radius: 99px; background: {{ section.settings.accent }}; }
  ${S} .bs-h { margin-top: 8px; font-size: 32px; }
  ${S} .bs-grid { display: grid; gap: 12px; margin-top: 20px; }
  ${S} .bs-col { display: flex; flex-direction: column; gap: 12px; min-width: 0; }
  ${S} .bs-panel { padding: 16px; background: {{ section.settings.card }}; border-radius: ${r}; box-shadow: inset 0 0 0 1px {{ section.settings.track }}; }
  ${S} .bs-score { display: grid; grid-template-columns: auto minmax(0, 1fr); align-items: center; gap: 20px; }
  ${S} .bs-avg { font-size: 64px; line-height: .82; letter-spacing: -.04em; font-variant-numeric: tabular-nums; }
  ${S} .bs-row { display: flex; }
  ${S} .bs-row svg { flex-shrink: 0; fill: {{ section.settings.track }}; }
  ${S} .bs-stars { position: relative; display: inline-flex; }
  ${S} .bs-stars-on { position: absolute; top: 0; bottom: 0; left: 0; width: var(--w); overflow: hidden; }
  ${S} .bs-stars-on svg { fill: {{ section.settings.text_color }}; }
  ${S} .bs-score .bs-stars { margin-top: 10px; }
  ${S} .bs-based { margin-top: 6px; }
  ${S} .bs-hist { display: flex; flex-direction: column; gap: 7px; }
  ${S} .bs-hrow { display: grid; grid-template-columns: 18px minmax(0, 1fr) 34px; align-items: center; gap: 8px; }
  ${S} .bs-hs { display: flex; align-items: center; gap: 2px; font-size: 11.5px; font-weight: 700; }
  ${S} .bs-hs svg { fill: currentColor; }
  ${S} .bs-bar { position: relative; height: 6px; border-radius: 99px; overflow: hidden; background: {{ section.settings.track }}; }
  ${S} .bs-fill { position: absolute; top: 0; bottom: 0; left: 0; width: var(--w); border-radius: 99px; background: {{ section.settings.text_color }};
    transition: width 1s ${ease}; transition-delay: calc(var(--i, 0) * 70ms); }
  ${S} .bs-hc { text-align: right; font-size: 11px; color: {{ section.settings.muted }}; font-variant-numeric: tabular-nums; }
  ${S} .bs-ft { margin-bottom: 16px; font-size: 16px; }
  ${S} .bs-sc-top { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; }
  ${S} .bs-sc-l { font-size: 12px; line-height: 1; }
  ${S} .bs-sc-v { font-size: 11.5px; font-weight: 600; text-align: right; }
  ${S} .bs-track { position: relative; height: 6px; margin-top: 8px; }
  ${S} .bs-segs { position: absolute; inset: 0; display: grid; grid-template-columns: repeat(3, 1fr); gap: 3px; }
  ${S} .bs-segs span { border-radius: 99px; background: {{ section.settings.track }}; }
  ${S} .bs-segs span.is-z { background: {{ section.settings.text_color | color_modify: 'alpha', 0.16 }}; }
  ${S} .bs-mk { --d: 14px; position: absolute; top: 50%; width: var(--d); height: var(--d); border-radius: 99px; transform: translate(-50%, -50%);
    left: calc(var(--d) / 2 + (100% - var(--d)) * var(--p) / 100); background: {{ section.settings.text_color }};
    box-shadow: 0 0 0 3px {{ section.settings.card }}, 0 2px 8px rgba(0,0,0,.18); transition: left 1.1s ${ease}; transition-delay: var(--dl, 0ms); }
  ${S} .bs-ends { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-top: 8px; font-size: 10.5px; line-height: 1.2; color: {{ section.settings.muted }}; }
  ${S} .bs-ends span:nth-child(2) { text-align: center; }
  ${S} .bs-ends span:nth-child(3) { text-align: right; }
  ${S} .bs-big .bs-sc-l { font-size: 14px; }
  ${S} .bs-big .bs-sc-v { font-size: 12.5px; color: {{ section.settings.accent }}; }
  ${S} .bs-big .bs-track { height: 8px; margin-top: 12px; }
  ${S} .bs-big .bs-mk { --d: 18px; background: {{ section.settings.accent }}; }
  ${S}.bs-armed:not(.is-in) .bs-fill { width: 0; }
  ${S}.bs-armed:not(.is-in) .bs-mk { left: calc(var(--d) / 2); }
  ${S}.bs-armed:not(.is-in) .bs-rev { opacity: 0; }
  ${S} .bs-advice { display: flex; align-items: center; gap: 10px; margin-top: 16px; padding: 10px 12px; font-size: 12.5px; font-weight: 600; line-height: 1.35;
    background: {{ section.settings.text_color }}; color: {{ section.settings.card }}; border-radius: ${r}; }
  ${S} .bs-advice svg { flex-shrink: 0; }
  ${S} .bs-sizes { margin-top: 16px; }
  ${S} .bs-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
  ${S} .bs-chip { height: 32px; min-width: 40px; padding: 0 12px; border: 0; border-radius: 99px; cursor: pointer; font: inherit; font-size: 12px; font-weight: 700;
    background: transparent; color: {{ section.settings.text_color }}; box-shadow: inset 0 0 0 1.5px {{ section.settings.track }};
    transition: background-color .2s, color .2s, box-shadow .2s, transform .2s; }
  ${S} .bs-chip:active { transform: scale(.95); }
  ${S} .bs-chip[aria-checked="true"] { background: {{ section.settings.text_color }}; color: {{ section.settings.card }}; box-shadow: none; }
  ${S} .bs-rec { margin-top: 10px; font-size: 12.5px; color: {{ section.settings.muted }}; }
  ${S} .bs-rec.is-on { color: {{ section.settings.text_color }}; }
  ${S} .bs-rec b { display: inline-grid; place-items: center; min-width: 24px; height: 24px; padding: 0 8px; border-radius: 99px; font-size: 12px;
    background: {{ section.settings.accent }}; color: #fff; }
  ${S} .bs-attrs { display: flex; flex-direction: column; gap: 16px; margin-top: 20px; padding-top: 16px; border-top: 1px solid {{ section.settings.track }}; }
  ${S} .bs-rh { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; padding-top: 8px; }
  ${S} .bs-rh .bs-disp { font-size: 16px; }
  ${S} .bs-rev .bs-top { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
  ${S} .bs-date { font-size: 11px; color: {{ section.settings.muted }}; }
  ${S} .bs-rt { margin-top: 10px; font-size: 15px; line-height: 1; }
  ${S} .bs-rb { margin-top: 6px; font-size: 13px; line-height: 1.5; }
  ${S} .bs-tags { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 12px; }
  ${S} .bs-tag { padding: 4px 10px; border-radius: 99px; font-size: 11px; background: {{ section.settings.track | color_modify: 'alpha', 0.55 }}; }
  ${S} .bs-tag span { color: {{ section.settings.muted }}; }
  ${S} .bs-who { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 8px; margin-top: 12px; font-size: 12px; }
  ${S} .bs-ver { display: inline-flex; align-items: center; gap: 4px; font-weight: 500; color: {{ section.settings.link_color }}; }
  ${S} .bs-all { display: flex; align-items: center; justify-content: center; height: 44px; margin-top: 4px; border-radius: 99px; font-size: 13px; font-weight: 700;
    text-transform: uppercase; letter-spacing: .04em; color: {{ section.settings.text_color }}; text-decoration: none;
    box-shadow: inset 0 0 0 1.5px {{ section.settings.text_color }}; transition: background-color .2s, color .2s; }
  ${S} .bs-all:hover { background: {{ section.settings.text_color }}; color: {{ section.settings.bg }}; }
  @keyframes bs-fr-rise { from { opacity: 0; transform: translateY(8px); } }
  ${S}.is-in .bs-rev { animation: bs-fr-rise .6s ${ease} both; animation-delay: calc(var(--i, 0) * 60ms + 200ms); }
  @container (min-width: 720px) {
    ${S} .bs-wrap { padding: 40px 40px 48px; }
    ${S} .bs-h { font-size: 44px; }
    ${S} .bs-grid { grid-template-columns: minmax(0, 340px) minmax(0, 1fr); gap: 32px; margin-top: 32px; }
    ${S} .bs-rh { padding-top: 0; }
  }
  @media (prefers-reduced-motion: reduce) {
    ${S} .bs-fill, ${S} .bs-mk { transition: none; }
    ${S}.is-in .bs-rev { animation: none; }
  }
</style>`;

  const verifiedSvg = `<svg width="13" height="13" viewBox="0 0 24 24" aria-hidden="true"><path d="${CHECK_PATH}" fill="currentColor"/><path d="M8.4 12.2l2.4 2.4 4.8-4.9" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  const smallStar = `<svg width="9" height="9" viewBox="0 0 24 24" aria-hidden="true"><path d="${STAR_PATH}"/></svg>`;

  const markup = `{%- comment -%}
  Fit Review Summary by boost.supply.
  Every number in this section is static and merchant-entered: update the
  star counts, the sizing position and the attribute markers in the theme
  editor (positions run 0 to 100, 50 is the middle label).
  To make it live, swap the settings for your reviews app's metafields,
  e.g. product.metafields.reviews.rating / reviews.rating_count (Shopify's
  standard review metafields) or the fit metafields your reviews app writes.
{%- endcomment -%}
{%- liquid
  assign bs_total = 0
  assign bs_sum = 0
  for s in (1..5)
    assign bs_key = 'count_' | append: s
    assign bs_c = section.settings[bs_key] | default: 0
    assign bs_total = bs_total | plus: bs_c
    assign bs_w = bs_c | times: s
    assign bs_sum = bs_sum | plus: bs_w
  endfor
  if section.settings.rating != blank
    assign bs_avg = section.settings.rating | plus: 0
  elsif bs_total > 0
    assign bs_avg = bs_sum | times: 1.0 | divided_by: bs_total
  else
    assign bs_avg = 0
  endif
  assign bs_avg = bs_avg | times: 1.0 | round: 1
  if bs_avg > 5
    assign bs_avg = 5.0
  endif
  assign bs_full = bs_avg | floor
  assign bs_frac = bs_avg | minus: bs_full
  if bs_total >= 1000
    assign bs_th = bs_total | divided_by: 1000
    assign bs_rest = bs_total | modulo: 1000 | prepend: '00' | slice: -3, 3
    assign bs_total_fmt = bs_th | append: ',' | append: bs_rest
  else
    assign bs_total_fmt = bs_total
  endif
  assign bs_sizing = section.settings.sizing
  if bs_sizing < 40
    assign bs_zone = 0
    assign bs_verdict = section.settings.sizing_left
    assign bs_advice = section.settings.advice_small
    assign bs_shift = 1
  elsif bs_sizing > 60
    assign bs_zone = 2
    assign bs_verdict = section.settings.sizing_right
    assign bs_advice = section.settings.advice_large
    assign bs_shift = -1
  else
    assign bs_zone = 1
    assign bs_verdict = section.settings.sizing_mid
    assign bs_advice = section.settings.advice_true
    assign bs_shift = 0
  endif
  assign bs_review_count = 0
  for block in section.blocks
    if block.type == 'review'
      assign bs_review_count = bs_review_count | plus: 1
    endif
  endfor
-%}
<div class="bs-fr-{{ section.id }}" id="bs-fr-{{ section.id }}">
  <div class="bs-wrap">
    {%- if section.settings.eyebrow != blank -%}<p class="bs-mono bs-eye"><i aria-hidden="true"></i>{{ section.settings.eyebrow }}</p>{%- endif -%}
    {%- if section.settings.heading != blank -%}<h2 class="bs-h bs-disp">{{ section.settings.heading }}</h2>{%- endif -%}

    <div class="bs-grid">
      <div class="bs-col">
        <div class="bs-panel bs-score">
          <div>
            <p class="bs-avg bs-disp">{{ bs_avg }}</p>
            ${starsMarkup(14, 2, "{{ bs_full }}", "{{ bs_frac }}")}
            <p class="bs-mono bs-based">{{ bs_total_fmt }} reviews</p>
          </div>
          <div class="bs-hist">
            {%- for s in (1..5) reversed -%}
              {%- liquid
                assign bs_key = 'count_' | append: s
                assign bs_c = section.settings[bs_key] | default: 0
                if bs_total > 0
                  assign bs_pct = bs_c | times: 100.0 | divided_by: bs_total | round: 1
                else
                  assign bs_pct = 0
                endif
                if bs_c >= 1000
                  assign bs_th = bs_c | divided_by: 1000
                  assign bs_rest = bs_c | modulo: 1000 | prepend: '00' | slice: -3, 3
                  assign bs_c_fmt = bs_th | append: ',' | append: bs_rest
                else
                  assign bs_c_fmt = bs_c
                endif
              -%}
              <div class="bs-hrow">
                <span class="bs-hs">{{ s }}${smallStar}</span>
                <span class="bs-bar"><span class="bs-fill" style="--w: {{ bs_pct }}%; --i: {{ forloop.index0 }}"></span></span>
                <span class="bs-hc">{{ bs_c_fmt }}</span>
              </div>
            {%- endfor -%}
          </div>
        </div>

        <div class="bs-panel">
          {%- if section.settings.fit_title != blank -%}<p class="bs-ft bs-disp">{{ section.settings.fit_title }}</p>{%- endif -%}
          <div class="bs-scale bs-big">
            <div class="bs-sc-top"><span class="bs-sc-l bs-disp">{{ section.settings.sizing_label }}</span><span class="bs-sc-v">{{ bs_verdict }}</span></div>
            <div class="bs-track">
              <div class="bs-segs"><span{% if bs_zone == 0 %} class="is-z"{% endif %}></span><span{% if bs_zone == 1 %} class="is-z"{% endif %}></span><span{% if bs_zone == 2 %} class="is-z"{% endif %}></span></div>
              <span class="bs-mk" style="--p: {{ bs_sizing }}; --dl: 150ms" aria-hidden="true"></span>
            </div>
            <div class="bs-ends"><span>{{ section.settings.sizing_left }}</span><span>{{ section.settings.sizing_mid }}</span><span>{{ section.settings.sizing_right }}</span></div>
          </div>

          {%- if bs_advice != blank -%}
            <div class="bs-advice">${iconMarkup("pack:ruler", 18)}<span>{{ bs_advice }}</span></div>
          {%- endif -%}

          {%- if section.settings.show_size_helper and section.settings.sizes != blank -%}
            {%- assign bs_sizes = section.settings.sizes | split: ',' -%}
            <div class="bs-sizes" data-sizes data-shift="{{ bs_shift }}" data-label="{{ section.settings.rec_label | escape }}">
              <p class="bs-mono">{{ section.settings.size_label }}</p>
              <div class="bs-chips" role="radiogroup" aria-label="{{ section.settings.size_label | escape }}">
                {%- for bs_sz in bs_sizes -%}
                  {%- assign bs_szs = bs_sz | strip -%}
                  {%- if bs_szs != blank -%}<button type="button" class="bs-chip" role="radio" aria-checked="false">{{ bs_szs }}</button>{%- endif -%}
                {%- endfor -%}
              </div>
              <p class="bs-rec" data-rec aria-live="polite">{{ section.settings.size_hint }}</p>
            </div>
          {%- endif -%}

          {%- assign bs_attr_i = 0 -%}
          {%- for block in section.blocks -%}
            {%- if block.type == 'attribute' -%}
              {%- if bs_attr_i == 0 -%}<div class="bs-attrs">{%- endif -%}
              {%- liquid
                assign bs_v = block.settings.value
                if bs_v < 40
                  assign bs_az = 0
                  assign bs_av = block.settings.left
                elsif bs_v > 60
                  assign bs_az = 2
                  assign bs_av = block.settings.right
                else
                  assign bs_az = 1
                  assign bs_av = block.settings.mid
                endif
                assign bs_dl = bs_attr_i | times: 90 | plus: 250
              -%}
              <div class="bs-scale" {{ block.shopify_attributes }}>
                <div class="bs-sc-top"><span class="bs-sc-l bs-disp">{{ block.settings.label }}</span><span class="bs-sc-v">{{ bs_av }}</span></div>
                <div class="bs-track">
                  <div class="bs-segs"><span{% if bs_az == 0 %} class="is-z"{% endif %}></span><span{% if bs_az == 1 %} class="is-z"{% endif %}></span><span{% if bs_az == 2 %} class="is-z"{% endif %}></span></div>
                  <span class="bs-mk" style="--p: {{ bs_v }}; --dl: {{ bs_dl }}ms" aria-hidden="true"></span>
                </div>
                <div class="bs-ends"><span>{{ block.settings.left }}</span><span>{{ block.settings.mid }}</span><span>{{ block.settings.right }}</span></div>
              </div>
              {%- assign bs_attr_i = bs_attr_i | plus: 1 -%}
            {%- endif -%}
          {%- endfor -%}
          {%- if bs_attr_i > 0 -%}</div>{%- endif -%}
        </div>
      </div>

      <div class="bs-col">
        <div class="bs-rh">
          <p class="bs-disp">{{ section.settings.reviews_title }}</p>
          <span class="bs-mono">{{ bs_review_count }} of {{ bs_total_fmt }}</span>
        </div>
        {%- assign bs_ri = 0 -%}
        {%- for block in section.blocks -%}
          {%- if block.type == 'review' -%}
            <article class="bs-panel bs-rev" style="--i: {{ bs_ri }}" {{ block.shopify_attributes }}>
              {%- assign bs_rfull = block.settings.rating -%}
              <div class="bs-top">
                ${starsMarkup(12, 2, "{{ bs_rfull }}", "0")}
                {%- if block.settings.date != blank -%}<span class="bs-date">{{ block.settings.date }}</span>{%- endif -%}
              </div>
              {%- if block.settings.title != blank -%}<p class="bs-rt bs-disp">{{ block.settings.title }}</p>{%- endif -%}
              {%- if block.settings.body != blank -%}<p class="bs-rb">{{ block.settings.body }}</p>{%- endif -%}
              {%- if block.settings.size != blank or block.settings.usual != blank -%}
                <div class="bs-tags">
                  {%- if block.settings.size != blank -%}<span class="bs-tag"><span>{{ section.settings.bought_label }}:</span> <b>{{ block.settings.size }}</b></span>{%- endif -%}
                  {%- if block.settings.usual != blank -%}<span class="bs-tag"><span>{{ section.settings.usual_label }}:</span> <b>{{ block.settings.usual }}</b></span>{%- endif -%}
                </div>
              {%- endif -%}
              <div class="bs-who">
                <b>{{ block.settings.name }}</b>
                {%- if block.settings.verified and section.settings.verified_label != blank -%}<span class="bs-ver">${verifiedSvg}{{ section.settings.verified_label }}</span>{%- endif -%}
              </div>
            </article>
            {%- assign bs_ri = bs_ri | plus: 1 -%}
          {%- endif -%}
        {%- endfor -%}
        {%- if section.settings.link_text != blank -%}
          <a class="bs-all" href="{{ section.settings.link_url | default: '#' }}">{{ section.settings.link_text }}</a>
        {%- endif -%}
      </div>
    </div>
  </div>
</div>
<script>
  (function () {
    var root = document.getElementById('bs-fr-{{ section.id }}');
    if (!root) return;
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!reduce && 'IntersectionObserver' in window) {
      root.classList.add('bs-armed');
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) { root.classList.add('is-in'); io.disconnect(); }
        });
      }, { threshold: 0.15 });
      io.observe(root);
    } else {
      root.classList.add('is-in');
    }
    var helper = root.querySelector('[data-sizes]');
    if (!helper) return;
    var chips = helper.querySelectorAll('.bs-chip');
    var rec = helper.querySelector('[data-rec]');
    var shift = parseInt(helper.getAttribute('data-shift'), 10) || 0;
    chips.forEach(function (chip, i) {
      chip.addEventListener('click', function () {
        var j = Math.max(0, Math.min(chips.length - 1, i + shift));
        chips.forEach(function (c) { c.setAttribute('aria-checked', c === chip ? 'true' : 'false'); });
        var b = document.createElement('b');
        b.textContent = chips[j].textContent;
        rec.textContent = helper.getAttribute('data-label') + ' ';
        rec.appendChild(b);
        rec.classList.add('is-on');
      });
    });
  })();
</script>`;

  const counts: Record<number, number> = {};
  [5, 4, 3, 2, 1].forEach((s) => {
    counts[s] = Math.max(0, Math.round(toNum(str(config, `count${s}`))));
  });

  const schema = buildSchema({
    name: "Fit Review Summary",
    settings: [
      { type: "text", id: "eyebrow", label: "Eyebrow", default: str(config, "eyebrow") },
      { type: "text", id: "heading", label: "Heading", default: str(config, "heading") },
      { type: "header", content: "Rating" },
      { type: "text", id: "rating", label: "Average rating (leave empty to calculate from the counts)", default: str(config, "rating") || undefined },
      { type: "number", id: "count_5", label: "5-star reviews", default: counts[5] },
      { type: "number", id: "count_4", label: "4-star reviews", default: counts[4] },
      { type: "number", id: "count_3", label: "3-star reviews", default: counts[3] },
      { type: "number", id: "count_2", label: "2-star reviews", default: counts[2] },
      { type: "number", id: "count_1", label: "1-star reviews", default: counts[1] },
      { type: "header", content: "Sizing" },
      { type: "text", id: "fit_title", label: "Fit title", default: str(config, "fitTitle") },
      { type: "text", id: "sizing_label", label: "Sizing label", default: str(config, "sizingLabel") },
      { type: "range", id: "sizing", label: "Sizing position (50 = middle)", min: 0, max: 100, step: 1, default: Math.round(clamp(num(config, "sizing", 52), 0, 100)) },
      { type: "text", id: "sizing_left", label: "Left label", default: str(config, "sizingLeft") },
      { type: "text", id: "sizing_mid", label: "Middle label", default: str(config, "sizingMid") },
      { type: "text", id: "sizing_right", label: "Right label", default: str(config, "sizingRight") },
      { type: "text", id: "advice_small", label: "Advice when it runs small (0–39)", default: str(config, "adviceSmall") },
      { type: "text", id: "advice_true", label: "Advice when true to size (40–60)", default: str(config, "adviceTrue") },
      { type: "text", id: "advice_large", label: "Advice when it runs large (61–100)", default: str(config, "adviceLarge") },
      { type: "checkbox", id: "show_size_helper", label: "Show size finder", default: bool(config, "showSizeHelper", true) },
      { type: "text", id: "size_label", label: "Size finder label", default: str(config, "sizeLabel") },
      { type: "text", id: "sizes", label: "Sizes (comma separated)", default: str(config, "sizes") },
      { type: "text", id: "size_hint", label: "Size finder hint", default: str(config, "sizeHint") },
      { type: "text", id: "rec_label", label: "Recommendation label", default: str(config, "recLabel") },
      { type: "header", content: "Reviews" },
      { type: "text", id: "reviews_title", label: "Reviews title", default: str(config, "reviewsTitle") },
      { type: "text", id: "bought_label", label: "Size bought label", default: str(config, "boughtLabel") },
      { type: "text", id: "usual_label", label: "Usual size label", default: str(config, "usualLabel") },
      { type: "text", id: "verified_label", label: "Verified label", default: str(config, "verifiedLabel") },
      { type: "text", id: "link_text", label: "Button text", default: str(config, "linkText") },
      { type: "url", id: "link_url", label: "Button link (e.g. your reviews widget anchor)" },
      { type: "header", content: "Style" },
      { type: "checkbox", id: "display_caps", label: "Uppercase display type", default: bool(config, "displayCaps", true) },
      { type: "color", id: "bg", label: "Background", default: str(config, "bg") },
      { type: "color", id: "card", label: "Cards", default: str(config, "card") },
      { type: "color", id: "text_color", label: "Text", default: str(config, "textColor") },
      { type: "color", id: "accent", label: "Accent (sizing marker)", default: str(config, "accent") },
      { type: "color", id: "link_color", label: "Verified badge", default: str(config, "linkColor") },
      { type: "color", id: "track", label: "Tracks & borders", default: str(config, "track") },
      { type: "color", id: "muted", label: "Muted text", default: str(config, "muted") },
      { type: "range", id: "radius", label: "Corner radius", min: 0, max: 20, step: 2, unit: "px", default: clamp(Math.round(num(config, "radius", 4) / 2) * 2, 0, 20) },
    ],
    blocks: [
      {
        type: "attribute",
        name: "Fit attribute",
        settings: [
          { type: "text", id: "label", label: "Label" },
          { type: "text", id: "left", label: "Left label" },
          { type: "text", id: "mid", label: "Middle label" },
          { type: "text", id: "right", label: "Right label" },
          { type: "range", id: "value", label: "Position (50 = middle)", min: 0, max: 100, step: 1, default: 50 },
        ],
      },
      {
        type: "review",
        name: "Review",
        settings: [
          { type: "text", id: "name", label: "Name" },
          { type: "range", id: "rating", label: "Rating", min: 1, max: 5, step: 1, default: 5 },
          { type: "text", id: "title", label: "Title" },
          { type: "textarea", id: "body", label: "Review" },
          { type: "text", id: "size", label: "Size bought" },
          { type: "text", id: "usual", label: "Usual size" },
          { type: "text", id: "date", label: "Date" },
          { type: "checkbox", id: "verified", label: "Verified buyer", default: true },
        ],
      },
    ],
    maxBlocks: 16,
    presetBlocks: [
      ...list(config, "attributes").map((a) => ({
        type: "attribute",
        settings: {
          label: esc(a.label ?? ""),
          left: esc(a.left ?? ""),
          mid: esc(a.mid ?? ""),
          right: esc(a.right ?? ""),
          value: Math.round(clamp(toNum(a.value, 50), 0, 100)),
        },
      })),
      ...list(config, "reviews").map((rv) => ({
        type: "review",
        settings: {
          name: esc(rv.name ?? ""),
          rating: Math.round(clamp(toNum(rv.rating, 5), 1, 5)),
          title: esc(rv.title ?? ""),
          body: esc(rv.body ?? ""),
          size: esc(rv.size ?? ""),
          usual: esc(rv.usual ?? ""),
          date: esc(rv.date ?? ""),
          verified: true,
        },
      })),
    ],
  });

  return section({ style, markup, schema });
}

export const fitReviews: Tweak = {
  slug: "fit-reviews",
  inspiredBy: "gymshark",
  name: "Fit Review Summary",
  tagline: "Big rating, star histogram, sizing scale and fit-tagged reviews that answer “will it fit?”",
  description:
    "Modeled on the review summary Gymshark uses on its product pages. A bold average with an animated star histogram, a sizing scale (too small ↔ true to size ↔ too large) with clear advice and a tap-your-size finder, fit attribute scales for length, comfort and coverage, and short reviews tagged with the size bought and the reviewer's usual size. Fit doubt is the #1 reason apparel shoppers bounce; this section answers it right where they decide.",
  category: "social-proof",
  tier: "paid",
  price: 29,
  tint: "#eceef0",
  Preview,
  generateLiquid,
  defaults,
  fields: [
    { key: "eyebrow", label: "Eyebrow", type: "text", group: "Content" },
    { key: "heading", label: "Heading", type: "text", group: "Content" },
    { key: "rating", label: "Average rating", type: "text", group: "Rating", hint: "Leave empty to calculate it from the star counts", placeholder: "Auto" },
    { key: "count5", label: "5-star reviews", type: "text", group: "Rating" },
    { key: "count4", label: "4-star reviews", type: "text", group: "Rating" },
    { key: "count3", label: "3-star reviews", type: "text", group: "Rating" },
    { key: "count2", label: "2-star reviews", type: "text", group: "Rating" },
    { key: "count1", label: "1-star reviews", type: "text", group: "Rating" },
    { key: "fitTitle", label: "Fit title", type: "text", group: "Sizing" },
    { key: "sizingLabel", label: "Sizing label", type: "text", group: "Sizing" },
    { key: "sizing", label: "Sizing position", type: "slider", group: "Sizing", min: 0, max: 100, step: 1, hint: "0 = left label, 50 = middle, 100 = right label" },
    { key: "sizingLeft", label: "Left label", type: "text", group: "Sizing" },
    { key: "sizingMid", label: "Middle label", type: "text", group: "Sizing" },
    { key: "sizingRight", label: "Right label", type: "text", group: "Sizing" },
    { key: "adviceSmall", label: "Advice: runs small", type: "text", group: "Sizing", hint: "Shown when the position is below 40" },
    { key: "adviceTrue", label: "Advice: true to size", type: "text", group: "Sizing", hint: "Shown between 40 and 60" },
    { key: "adviceLarge", label: "Advice: runs large", type: "text", group: "Sizing", hint: "Shown above 60" },
    { key: "showSizeHelper", label: "Show size finder", type: "toggle", group: "Size finder" },
    { key: "sizeLabel", label: "Label", type: "text", group: "Size finder" },
    { key: "sizes", label: "Sizes", type: "text", group: "Size finder", hint: "Comma separated, smallest first" },
    { key: "sizeHint", label: "Hint", type: "text", group: "Size finder" },
    { key: "recLabel", label: "Recommendation label", type: "text", group: "Size finder" },
    {
      key: "attributes", label: "Fit attributes", type: "list", group: "Fit attributes",
      hint: "Position is a number from 0 to 100 (50 = middle label)",
      itemFields: [
        { key: "label", label: "Label", type: "text" },
        { key: "left", label: "Left label", type: "text" },
        { key: "mid", label: "Middle label", type: "text" },
        { key: "right", label: "Right label", type: "text" },
        { key: "value", label: "Position", type: "text" },
      ],
      newItem: { label: "Breathability", left: "Warm", mid: "Good", right: "Very airy", value: "72" },
      addLabel: "Add attribute", max: 6,
    },
    { key: "reviewsTitle", label: "Reviews title", type: "text", group: "Reviews" },
    {
      key: "reviews", label: "Reviews", type: "list", group: "Reviews",
      hint: "Rating is a number from 1 to 5",
      itemFields: [
        { key: "name", label: "Name", type: "text" },
        { key: "rating", label: "Rating", type: "text" },
        { key: "title", label: "Title", type: "text" },
        { key: "body", label: "Review", type: "textarea" },
        { key: "size", label: "Size bought", type: "text" },
        { key: "usual", label: "Usual size", type: "text" },
        { key: "date", label: "Date", type: "text" },
      ],
      newItem: { name: "Casey M.", rating: "5", title: "Holds up to heavy sessions", body: "Stays in place through squats and sprints, and the fabric still looks new.", size: "M", usual: "M", date: "1 month ago" },
      addLabel: "Add review", max: 6,
    },
    { key: "boughtLabel", label: "Size bought label", type: "text", group: "Reviews" },
    { key: "usualLabel", label: "Usual size label", type: "text", group: "Reviews" },
    { key: "verifiedLabel", label: "Verified label", type: "text", group: "Reviews" },
    { key: "linkText", label: "Button text", type: "text", group: "Reviews" },
    fontField("Typography"),
    fontField("Typography", "displayFont", "Display font"),
    { key: "displayCaps", label: "Uppercase display type", type: "toggle", group: "Typography" },
    { key: "radius", label: "Corner radius", type: "slider", group: "Layout", min: 0, max: 20, step: 2, unit: "px" },
    { key: "bg", label: "Background", type: "color", group: "Colors" },
    { key: "card", label: "Cards", type: "color", group: "Colors" },
    { key: "textColor", label: "Text", type: "color", group: "Colors" },
    { key: "accent", label: "Accent (sizing marker)", type: "color", group: "Colors" },
    { key: "linkColor", label: "Verified badge", type: "color", group: "Colors" },
    { key: "track", label: "Tracks & borders", type: "color", group: "Colors" },
    { key: "muted", label: "Muted text", type: "color", group: "Colors" },
  ],
};
