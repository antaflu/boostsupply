"use client";

import { useId, useState, type CSSProperties } from "react";
import type { Tweak, TweakConfig } from "../types";
import { str, num, list, fontStack, esc } from "../cfg";
import { fontField } from "../fields";
import { buildSchema, section, fontFaceFor } from "../liquid";
import { toNum } from "./product-art";

/* ============================================================
   Feature Tabs
   Editorial feature tabs (Sleep / Readiness / Activity / Heart)
   with a gliding underline. Each tab drives a phone mockup drawn
   in CSS: a score ring that sweeps to the new score, a line chart
   that draws itself, stat rows that rise in and a floating insight
   chip, next to copy with an italic serif accent and a ring photo.
   ============================================================ */

const EASE = "cubic-bezier(.22,1,.36,1)";
const SERIF = "Georgia, 'Iowan Old Style', 'Times New Roman', serif";
const RING_R = 52;
const RING_C = 2 * Math.PI * RING_R;
const CW = 196;
const CH = 46;

const defaults: TweakConfig = {
  eyebrow: "Inside the app",
  heading: "The details that shape",
  headingAccent: "your day",
  subheading: "Your ring measures around the clock. The app turns it into a few clear numbers each morning.",
  tabs: [
    {
      title: "Sleep", score: "86", status: "Optimal", headline: "Rest you can", accent: "measure",
      text: "See how long and how well you slept, from deep and REM stages to the moment your heart rate bottomed out.",
      chartLabel: "Heart rate overnight", points: "64,62,60,57,55,52,50,49,48,49,51,54,57",
      stat1: "Total sleep | 7h 42m", stat2: "Efficiency | 91%", stat3: "Lowest heart rate | 48 bpm",
      insight: "Deep sleep up 12 min", image: "/mockups/ring-gold.jpg",
    },
    {
      title: "Readiness", score: "82", status: "Good", headline: "Know when to", accent: "push",
      text: "One morning score that weighs recovery, temperature and recent strain, so you know whether to go hard or take it easy.",
      chartLabel: "Heart rate variability, 7 days", points: "46,50,48,55,53,60,64",
      stat1: "HRV balance | Good", stat2: "Body temperature | +0.2°", stat3: "Recovery index | High",
      insight: "Recovered. Go for it", image: "/mockups/ring-silver.jpg",
    },
    {
      title: "Activity", score: "74", status: "On track", headline: "Move with", accent: "intention",
      text: "Daily goals that adapt to how recovered you are, with steps, active calories and a gentle nudge when you sit too long.",
      chartLabel: "Active calories today", points: "0,4,6,14,22,26,30,38,47,52,58,64",
      stat1: "Steps | 8,412", stat2: "Active calories | 486", stat3: "Goal progress | 74%",
      insight: "2,100 steps to goal", image: "/mockups/ring-gold.jpg",
    },
    {
      title: "Heart", score: "91", status: "Optimal", headline: "Your heart,", accent: "around the clock",
      text: "Continuous heart rate and variability, day and night, so you can spot stress building and see how fast you bounce back.",
      chartLabel: "Daytime heart rate", points: "58,61,72,68,64,70,66,62,60,63,59,56",
      stat1: "Resting heart rate | 54 bpm", stat2: "Variability | 62 ms", stat3: "Daytime stress | Low",
      insight: "Calmest day this week", image: "/mockups/ring-silver.jpg",
    },
  ],
  ctaLabel: "Shop the ring",
  ctaUrl: "/collections/all",
  ctaNote: "Free shipping and 30-day returns",
  bg: "#F7F1E8",
  textColor: "#1C1B1A",
  muted: "#4A4741",
  subtle: "#A8A5A0",
  stageBg: "#EFE6DB",
  screenBg: "#1C1B1A",
  ringColor: "#D9BC8C",
  buttonBg: "#1C1B1A",
  buttonText: "#F7F1E8",
  font: "system",
  radius: 28,
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

/** "Label | Value" -> [label, value] */
const splitStat = (s: string | undefined) => {
  const [a, ...b] = String(s ?? "").split("|");
  return [a.trim(), b.join("|").trim()] as const;
};

/** Smooth line (Catmull-Rom as cubic Béziers) + closed area under it. */
const chartPaths = (csv: string | undefined) => {
  const vals = String(csv ?? "")
    .split(",")
    .map((v) => parseFloat(v))
    .filter((v) => Number.isFinite(v));
  const pts = vals.length >= 2 ? vals : [0, 0];
  const min = Math.min(...pts);
  const max = Math.max(...pts);
  const xy = pts.map((v, i) => [
    (i / (pts.length - 1)) * CW,
    CH - 4 - ((v - min) / (max - min || 1)) * (CH - 10),
  ]);
  const f = (n: number) => n.toFixed(1);
  let d = `M${f(xy[0][0])} ${f(xy[0][1])}`;
  for (let i = 0; i < xy.length - 1; i++) {
    const p0 = xy[i - 1] ?? xy[i];
    const p1 = xy[i];
    const p2 = xy[i + 1];
    const p3 = xy[i + 2] ?? p2;
    d += ` C${f(p1[0] + (p2[0] - p0[0]) / 6)} ${f(p1[1] + (p2[1] - p0[1]) / 6)} ${f(p2[0] - (p3[0] - p1[0]) / 6)} ${f(p2[1] - (p3[1] - p1[1]) / 6)} ${f(p2[0])} ${f(p2[1])}`;
  }
  const last = xy[xy.length - 1];
  return { line: d, area: `${d} L${CW} ${CH} L0 ${CH} Z`, end: last };
};

/* Same maths for the storefront script (kept as a string). */
const CHART_JS = `function bsPaths(csv) {
      var vals = String(csv || '').split(',').map(function (v) { return parseFloat(v); }).filter(function (v) { return isFinite(v); });
      var pts = vals.length >= 2 ? vals : [0, 0];
      var min = Math.min.apply(null, pts), max = Math.max.apply(null, pts);
      var xy = pts.map(function (v, i) { return [i / (pts.length - 1) * ${CW}, ${CH} - 4 - (v - min) / ((max - min) || 1) * ${CH - 10}]; });
      function f(n) { return n.toFixed(1); }
      var d = 'M' + f(xy[0][0]) + ' ' + f(xy[0][1]);
      for (var i = 0; i < xy.length - 1; i++) {
        var p0 = xy[i - 1] || xy[i], p1 = xy[i], p2 = xy[i + 1], p3 = xy[i + 2] || p2;
        d += ' C' + f(p1[0] + (p2[0] - p0[0]) / 6) + ' ' + f(p1[1] + (p2[1] - p0[1]) / 6) + ' ' + f(p2[0] - (p3[0] - p1[0]) / 6) + ' ' + f(p2[1] - (p3[1] - p1[1]) / 6) + ' ' + f(p2[0]) + ' ' + f(p2[1]);
      }
      return { line: d, area: d + ' L${CW} ${CH} L0 ${CH} Z', end: xy[xy.length - 1] };
    }`;

function StatusBar({ color }: { color: string }) {
  return (
    <div className="flex items-center justify-between px-2.5 pt-[3px] text-[10px] font-semibold tabular-nums" style={{ color }}>
      <span>9:41</span>
      <span className="flex items-center gap-1" aria-hidden>
        <svg width="14" height="9" viewBox="0 0 14 9" fill="currentColor">
          <rect x="0" y="6" width="2.4" height="3" rx=".6" />
          <rect x="3.8" y="4" width="2.4" height="5" rx=".6" />
          <rect x="7.6" y="2" width="2.4" height="7" rx=".6" />
          <rect x="11.4" y="0" width="2.4" height="9" rx=".6" opacity=".4" />
        </svg>
        <svg width="20" height="9" viewBox="0 0 20 9" fill="none">
          <rect x=".5" y=".5" width="16.5" height="8" rx="2.4" stroke="currentColor" opacity=".45" />
          <rect x="2" y="2" width="11" height="5" rx="1.3" fill="currentColor" />
          <rect x="18" y="3" width="1.5" height="3" rx=".7" fill="currentColor" opacity=".45" />
        </svg>
      </span>
    </div>
  );
}

function Preview({ config }: { config: TweakConfig }) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const bg = str(config, "bg", "#F7F1E8");
  const ink = str(config, "textColor", "#1C1B1A");
  const muted = str(config, "muted", "#4A4741");
  const subtle = str(config, "subtle", "#A8A5A0");
  const stage = str(config, "stageBg", "#EFE6DB");
  const screen = str(config, "screenBg", "#1C1B1A");
  const ringCol = str(config, "ringColor", "#D9BC8C");
  const btnBg = str(config, "buttonBg", "#1C1B1A");
  const btnFg = str(config, "buttonText", "#F7F1E8");
  const radius = num(config, "radius", 28);
  const cream = "#F4EEE6";

  const tabs = list(config, "tabs").map((t) => ({
    title: t.title ?? "",
    score: clamp(Math.round(toNum(t.score, 0)), 0, 100),
    status: t.status ?? "",
    headline: t.headline ?? "",
    accent: t.accent ?? "",
    text: t.text ?? "",
    chartLabel: t.chartLabel ?? "",
    chart: chartPaths(t.points),
    stats: [t.stat1, t.stat2, t.stat3].map(splitStat).filter(([a, b]) => a || b),
    insight: t.insight ?? "",
    image: (t.image ?? "").trim(),
  }));
  const [sel, setSel] = useState(0);
  const ai = Math.min(sel, Math.max(0, tabs.length - 1));
  const tab = tabs[ai];
  const n = Math.max(1, tabs.length);

  return (
    <div
      className="@container w-full"
      style={{ background: bg, color: ink, fontFamily: fontStack(str(config, "font", "system")) }}
    >
      <div className="mx-auto grid w-full max-w-[1160px] gap-7 px-5 py-8 @min-[720px]:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] @min-[720px]:items-center @min-[720px]:gap-12 @min-[720px]:px-10 @min-[720px]:py-14">
        {/* Copy column (the stage slots in between on small screens) */}
        <div className="contents @min-[720px]:block">
          <div>
            {str(config, "eyebrow") && (
              <p className="flex items-center gap-2 text-[12.5px] font-medium" style={{ color: muted }}>
                <span aria-hidden className="h-1.5 w-1.5 rounded-full" style={{ background: ringCol }} />
                {str(config, "eyebrow")}
              </p>
            )}
            <h3 className="mt-3 text-[32px] font-medium leading-[1.06] tracking-[-0.03em] @min-[720px]:text-[44px]">
              {str(config, "heading")}{" "}
              {str(config, "headingAccent") && (
                <em className="font-normal italic tracking-[-0.02em]" style={{ fontFamily: SERIF }}>
                  {str(config, "headingAccent")}
                </em>
              )}
            </h3>
            {str(config, "subheading") && (
              <p className="mt-3 max-w-[420px] text-[14.5px] leading-[1.6]" style={{ color: muted }}>
                {str(config, "subheading")}
              </p>
            )}

            {/* Tabs */}
            <div role="tablist" className="relative mt-6 grid border-b @min-[720px]:mt-8" style={{ gridTemplateColumns: `repeat(${n}, minmax(0,1fr))`, borderColor: alpha(ink, 0.12) }}>
              {tabs.map((t, i) => (
                <button
                  key={i}
                  type="button"
                  role="tab"
                  aria-selected={i === ai}
                  onClick={() => setSel(i)}
                  className="h-11 truncate px-1 text-[14px] font-medium transition-colors duration-300 hover:text-[var(--ink)]"
                  style={{ color: i === ai ? ink : subtle, "--ink": ink } as CSSProperties}
                >
                  {t.title}
                </button>
              ))}
              <span
                aria-hidden
                className="absolute -bottom-px left-0 h-[2px] rounded-full"
                style={{ width: `${100 / n}%`, background: ink, transform: `translateX(${ai * 100}%)`, transition: `transform 520ms ${EASE}` }}
              />
            </div>
          </div>

          {/* Tab copy */}
          {tab && (
            <div className="row-start-3 @min-[720px]:mt-7">
              <div key={ai} className="bs-fade-up">
                <h4 className="text-[24px] font-medium leading-[1.12] tracking-[-0.02em] @min-[720px]:text-[28px]">
                  {tab.headline}{" "}
                  {tab.accent && (
                    <em className="font-normal italic" style={{ fontFamily: SERIF }}>
                      {tab.accent}
                    </em>
                  )}
                </h4>
                <p className="mt-3 max-w-[420px] text-[14.5px] leading-[1.6]" style={{ color: muted }}>
                  {tab.text}
                </p>
              </div>
              {str(config, "ctaLabel") && (
                <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3">
                  <button
                    type="button"
                    className="inline-flex h-12 items-center gap-2 rounded-full px-6 text-[14.5px] font-medium transition-[filter,scale] duration-200 hover:brightness-125 active:scale-[0.98]"
                    style={{ background: btnBg, color: btnFg }}
                  >
                    {str(config, "ctaLabel")}
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="M3 8h10M9 4l4 4-4 4" />
                    </svg>
                  </button>
                  {str(config, "ctaNote") && (
                    <span className="text-[12.5px]" style={{ color: muted }}>
                      {str(config, "ctaNote")}
                    </span>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Stage: phone + ring photo */}
        {tab && (
          <div
            className="relative row-start-2 flex min-h-[540px] items-end justify-end overflow-hidden pb-5 pr-[6%] @min-[720px]:row-start-auto @min-[720px]:min-h-[580px] @min-[720px]:pb-6 @min-[720px]:pr-[5%]"
            style={{ background: `radial-gradient(120% 80% at 85% 0%, ${alpha("#ffffff", 0.55)}, transparent 60%), ${stage}`, borderRadius: radius }}
          >
            {/* Ring photo accent */}
            <div
              className="absolute bottom-[10%] left-[4%] z-[1] aspect-square w-[34%] max-w-[200px] overflow-hidden shadow-[0_18px_40px_-18px_rgba(28,27,26,0.45)] @min-[720px]:w-[38%]"
              style={{ borderRadius: Math.max(12, radius - 8), background: stage }}
            >
              {tabs.map((t, i) =>
                t.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={i}
                    src={t.image}
                    alt={i === ai ? "Smart ring" : ""}
                    aria-hidden={i !== ai}
                    loading="lazy"
                    decoding="async"
                    className="absolute inset-0 h-full w-full object-cover"
                    style={{ opacity: i === ai ? 1 : 0, transform: i === ai ? "none" : "scale(1.08)", transition: `opacity 600ms ${EASE}, transform 900ms ${EASE}` }}
                  />
                ) : null,
              )}
              {!tabs.some((t) => t.image) && (
                <span aria-hidden className="absolute inset-[22%] rounded-full" style={{ boxShadow: `inset 0 0 0 10px ${ringCol}, 0 8px 18px -8px rgba(0,0,0,.4)` }} />
              )}
            </div>

            {/* Insight chip */}
            {tab.insight && (
              <div
                key={`in-${ai}`}
                className="bs-fade-up absolute left-[5%] top-4 z-[3] flex items-center gap-2 rounded-full py-1.5 pl-1.5 pr-3 text-[11.5px] font-medium shadow-[0_8px_24px_-12px_rgba(28,27,26,0.35)] backdrop-blur-md @min-[720px]:left-[6%] @min-[720px]:top-6"
                style={{ background: alpha("#ffffff", 0.78), color: ink, animationDelay: "200ms" }}
              >
                <span className="grid h-5 w-5 place-items-center rounded-full" style={{ background: ringCol }}>
                  <svg width="9" height="9" viewBox="0 0 12 12" fill="none" stroke={ink} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M2 8.5l3-3 2 2 3-4" />
                  </svg>
                </span>
                {tab.insight}
              </div>
            )}

            {/* Phone */}
            <div
              className="relative z-[2] w-[224px] shrink-0 rounded-[42px] p-[7px]"
              style={{ background: "#121110", boxShadow: "0 40px 70px -30px rgba(28,27,26,.55), 0 0 0 1px rgba(255,255,255,.06) inset, 0 0 0 1.5px #3a3835" }}
            >
              <div
                className="relative h-[452px] overflow-hidden rounded-[35px] px-3 pb-3 pt-2.5"
                style={{ background: `radial-gradient(90% 45% at 50% 0%, ${alpha(ringCol, 0.22)}, transparent 70%), ${screen}`, color: cream }}
              >
                <span aria-hidden className="absolute left-1/2 top-2 h-[19px] w-[66px] -translate-x-1/2 rounded-full bg-black" />
                <StatusBar color={cream} />

                <div className="mt-5 flex items-end justify-between px-1">
                  <div>
                    <p className="text-[9.5px] font-medium" style={{ color: alpha(cream, 0.55) }}>
                      Today
                    </p>
                    <p key={`t-${ai}`} className="bs-swap text-[17px] font-semibold tracking-[-0.01em]">
                      {tab.title}
                    </p>
                  </div>
                  <span className="mb-0.5 flex gap-1" aria-hidden>
                    {tabs.map((_, i) => (
                      <span key={i} className="h-1 rounded-full transition-[width,background-color] duration-500" style={{ width: i === ai ? 12 : 4, background: i === ai ? cream : alpha(cream, 0.25) }} />
                    ))}
                  </span>
                </div>

                {/* Score ring */}
                <div className="relative mx-auto mt-3 h-[128px] w-[128px]">
                  <svg width="128" height="128" viewBox="0 0 128 128" className="-rotate-90" aria-hidden>
                    <defs>
                      <linearGradient id={`ftg${uid}`} x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0" stopColor={ringCol} />
                        <stop offset="1" stopColor={cream} />
                      </linearGradient>
                    </defs>
                    <circle cx="64" cy="64" r={RING_R} fill="none" stroke={alpha(cream, 0.08)} strokeWidth="9" />
                    <circle
                      cx="64"
                      cy="64"
                      r={RING_R}
                      fill="none"
                      stroke={`url(#ftg${uid})`}
                      strokeWidth="9"
                      strokeLinecap="round"
                      strokeDasharray={RING_C}
                      strokeDashoffset={RING_C * (1 - tab.score / 100)}
                      style={{ transition: `stroke-dashoffset 900ms ${EASE}` }}
                    />
                  </svg>
                  <div className="absolute inset-0 grid place-content-center text-center">
                    <span key={`s-${ai}`} className="bs-swap block text-[38px] font-light leading-none tracking-[-0.03em] tabular-nums">
                      {tab.score}
                    </span>
                    <span className="mt-1 block text-[9.5px] font-medium" style={{ color: ringCol }}>
                      {tab.status}
                    </span>
                  </div>
                </div>

                {/* Chart */}
                <div className="mt-3 rounded-[14px] px-2.5 pb-2 pt-2" style={{ background: alpha(cream, 0.05) }}>
                  <p className="text-[9px] font-medium" style={{ color: alpha(cream, 0.55) }}>
                    {tab.chartLabel}
                  </p>
                  <svg key={`c-${ai}`} width="100%" viewBox={`-2 -2 ${CW + 4} ${CH + 4}`} className="mt-1.5 block overflow-visible" aria-hidden>
                    <defs>
                      <linearGradient id={`fta${uid}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0" stopColor={ringCol} stopOpacity=".35" />
                        <stop offset="1" stopColor={ringCol} stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    {[0.33, 0.66].map((g) => (
                      <line key={g} x1="0" x2={CW} y1={CH * g} y2={CH * g} stroke={alpha(cream, 0.06)} strokeDasharray="2 3" />
                    ))}
                    <path className="bs-fade-up" d={tab.chart.area} fill={`url(#fta${uid})`} />
                    <path className="bs-draw" pathLength={24} d={tab.chart.line} fill="none" stroke={ringCol} strokeWidth="1.8" strokeLinecap="round" />
                    <circle className="bs-pop-scale" cx={tab.chart.end[0]} cy={tab.chart.end[1]} r="3" fill={cream} stroke={ringCol} strokeWidth="1.5" style={{ animationDelay: "450ms", transformOrigin: `${tab.chart.end[0]}px ${tab.chart.end[1]}px` }} />
                  </svg>
                </div>

                {/* Stats */}
                <div className="mt-2 px-1">
                  {tab.stats.map(([label, value], i) => (
                    <div
                      key={`${ai}-${i}`}
                      className="bs-rise flex items-center justify-between gap-2 py-[7px] text-[10.5px]"
                      style={{ borderTop: i ? `1px solid ${alpha(cream, 0.07)}` : undefined, "--i": i + 1 } as CSSProperties}
                    >
                      <span className="truncate" style={{ color: alpha(cream, 0.6) }}>
                        {label}
                      </span>
                      <span className="shrink-0 font-medium tabular-nums">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------------- Liquid ---------------- */

function generateLiquid(config: TweakConfig): string {
  const { face, family } = fontFaceFor(str(config, "font", "system"));
  const S = ".bs-ft-{{ section.id }}";
  const ease = EASE;
  const tabs = list(config, "tabs");
  const cream = "#F4EEE6";

  const style = `<style>
${face ? face + "\n" : ""}  ${S} { container-type: inline-size; background: {{ section.settings.bg }}; color: {{ section.settings.text_color }}; font-family: ${family}; }
  ${S} * { box-sizing: border-box; }
  ${S} p, ${S} h2, ${S} h3 { margin: 0; }
  ${S} button { font: inherit; }
  ${S} em { font-family: ${SERIF}; font-style: italic; font-weight: 400; }
  ${S} [hidden] { display: none !important; }
  ${S} .bs-wrap { max-width: 1160px; margin: 0 auto; padding: 32px 20px; display: grid; gap: 28px; }
  ${S} .bs-col { display: contents; }
  ${S} .bs-eyebrow { display: flex; align-items: center; gap: 8px; font-size: 12.5px; font-weight: 500; color: {{ section.settings.muted }}; }
  ${S} .bs-eyebrow::before { content: ""; width: 6px; height: 6px; border-radius: 99px; background: {{ section.settings.ring_color }}; }
  ${S} .bs-h { margin-top: 12px; font-size: 32px; font-weight: 500; line-height: 1.06; letter-spacing: -.03em; }
  ${S} .bs-h em { letter-spacing: -.02em; }
  ${S} .bs-sub { margin-top: 12px; max-width: 420px; font-size: 14.5px; line-height: 1.6; color: {{ section.settings.muted }}; }
  ${S} .bs-tabs { position: relative; display: grid; grid-template-columns: repeat(var(--n), minmax(0, 1fr)); margin-top: 24px; border-bottom: 1px solid {{ section.settings.text_color | color_modify: 'alpha', 0.12 }}; }
  ${S} .bs-tab { height: 44px; padding: 0 4px; border: 0; background: none; cursor: pointer; font-size: 14px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    color: {{ section.settings.subtle }}; transition: color .3s; }
  ${S} .bs-tab:hover, ${S} .bs-tab[aria-selected="true"] { color: {{ section.settings.text_color }}; }
  ${S} .bs-line { position: absolute; left: 0; bottom: -1px; height: 2px; width: calc(100% / var(--n)); border-radius: 99px; background: {{ section.settings.text_color }};
    transform: translateX(calc(var(--i, 0) * 100%)); transition: transform .52s ${ease}; }
  ${S} .bs-copy { grid-row: 3; }
  ${S} .bs-panel.is-on { animation: bs-ft-up .5s ${ease} both; }
  ${S} .bs-ph { font-size: 24px; font-weight: 500; line-height: 1.12; letter-spacing: -.02em; }
  ${S} .bs-pt { margin-top: 12px; max-width: 420px; font-size: 14.5px; line-height: 1.6; color: {{ section.settings.muted }}; }
  ${S} .bs-cta { margin-top: 24px; display: flex; flex-wrap: wrap; align-items: center; gap: 12px 20px; }
  ${S} .bs-btn { display: inline-flex; align-items: center; gap: 8px; height: 48px; padding: 0 24px; border-radius: 99px; text-decoration: none; font-size: 14.5px; font-weight: 500;
    background: {{ section.settings.button_bg }}; color: {{ section.settings.button_text }}; transition: filter .2s, transform .2s; }
  ${S} .bs-btn:hover { filter: brightness(1.25); }
  ${S} .bs-btn:active { transform: scale(.98); }
  ${S} .bs-btn svg { display: block; }
  ${S} .bs-note { font-size: 12.5px; color: {{ section.settings.muted }}; }
  ${S} .bs-stage { position: relative; grid-row: 2; min-height: 540px; display: flex; align-items: flex-end; justify-content: flex-end; padding: 0 6% 20px 0; overflow: hidden; border-radius: {{ section.settings.radius }}px;
    background: radial-gradient(120% 80% at 85% 0%, rgba(255,255,255,.55), transparent 60%), {{ section.settings.stage_bg }}; }
  ${S} .bs-photo { position: absolute; left: 4%; bottom: 10%; z-index: 1; width: 34%; max-width: 200px; aspect-ratio: 1 / 1; overflow: hidden;
    border-radius: {{ section.settings.radius | minus: 8 | at_least: 12 }}px; background: {{ section.settings.stage_bg }}; box-shadow: 0 18px 40px -18px rgba(28,27,26,.45); }
  ${S} .bs-shot { position: absolute; inset: 0; opacity: 0; transform: scale(1.08); transition: opacity .6s ${ease}, transform .9s ${ease}; }
  ${S} .bs-shot.is-on { opacity: 1; transform: none; }
  ${S} .bs-shot img { display: block; width: 100%; height: 100%; object-fit: cover; }
  ${S} .bs-insight { position: absolute; left: 5%; top: 16px; z-index: 3; display: none; align-items: center; gap: 8px; padding: 6px 12px 6px 6px; border-radius: 99px;
    font-size: 11.5px; font-weight: 500; background: rgba(255,255,255,.78); color: {{ section.settings.text_color }};
    -webkit-backdrop-filter: blur(12px); backdrop-filter: blur(12px); box-shadow: 0 8px 24px -12px rgba(28,27,26,.35); }
  ${S} .bs-insight.is-on { display: flex; animation: bs-ft-up .5s ${ease} .2s both; }
  ${S} .bs-insight i { width: 20px; height: 20px; display: grid; place-items: center; border-radius: 99px; background: {{ section.settings.ring_color }}; }
  ${S} .bs-phone { position: relative; z-index: 2; width: 224px; flex-shrink: 0; padding: 7px; border-radius: 42px; background: #121110;
    box-shadow: 0 40px 70px -30px rgba(28,27,26,.55), inset 0 0 0 1px rgba(255,255,255,.06), 0 0 0 1.5px #3a3835; }
  ${S} .bs-screen-w { position: relative; height: 452px; overflow: hidden; border-radius: 35px; padding: 10px 12px 12px; color: ${cream};
    background: radial-gradient(90% 45% at 50% 0%, {{ section.settings.ring_color | color_modify: 'alpha', 0.22 }}, transparent 70%), {{ section.settings.screen_bg }}; }
  ${S} .bs-island { position: absolute; left: 50%; top: 8px; width: 66px; height: 19px; margin-left: -33px; border-radius: 99px; background: #000; }
  ${S} .bs-status { display: flex; align-items: center; justify-content: space-between; padding: 3px 10px 0; font-size: 10px; font-weight: 600; }
  ${S} .bs-status svg { display: block; }
  ${S} .bs-status span { display: flex; align-items: center; gap: 4px; }
  ${S} .bs-screen.is-on .bs-sh, ${S} .bs-screen.is-on .bs-score { animation: bs-ft-up .45s ${ease} both; }
  ${S} .bs-sh { margin-top: 20px; display: flex; align-items: flex-end; justify-content: space-between; padding: 0 4px; }
  ${S} .bs-sh small { display: block; font-size: 9.5px; font-weight: 500; color: rgba(244,238,230,.55); }
  ${S} .bs-sh b { display: block; font-size: 17px; font-weight: 600; letter-spacing: -.01em; }
  ${S} .bs-dots { display: flex; gap: 4px; margin-bottom: 2px; }
  ${S} .bs-dots i { width: 4px; height: 4px; border-radius: 99px; background: rgba(244,238,230,.25); }
  ${S} .bs-dots i.is-on { width: 12px; background: ${cream}; }
  ${S} .bs-ring { position: relative; width: 128px; height: 128px; margin: 12px auto 0; }
  ${S} .bs-ring svg { display: block; transform: rotate(-90deg); }
  ${S} .bs-ring-t { stroke: rgba(244,238,230,.08); }
  ${S} .bs-ring-p { stroke-dasharray: ${RING_C.toFixed(2)}; stroke-dashoffset: var(--off); }
  ${S} .bs-screen.is-on .bs-ring-p { animation: bs-ft-ring .9s ${ease} both; }
  ${S} .bs-score { position: absolute; inset: 0; display: grid; place-content: center; text-align: center; }
  ${S} .bs-score b { display: block; font-size: 38px; font-weight: 300; line-height: 1; letter-spacing: -.03em; font-variant-numeric: tabular-nums; }
  ${S} .bs-score small { display: block; margin-top: 4px; font-size: 9.5px; font-weight: 500; color: {{ section.settings.ring_color }}; }
  ${S} .bs-chart { margin-top: 12px; padding: 8px 10px; border-radius: 14px; background: rgba(244,238,230,.05); }
  ${S} .bs-chart p { font-size: 9px; font-weight: 500; color: rgba(244,238,230,.55); }
  ${S} .bs-chart svg { display: block; width: 100%; height: auto; margin-top: 6px; overflow: visible; }
  ${S} .bs-cl { stroke-dasharray: 1; stroke-dashoffset: 0; }
  ${S} .bs-screen.is-on .bs-cl { animation: bs-ft-draw 1s ${ease} .1s both; }
  ${S} .bs-screen.is-on .bs-ca { animation: bs-ft-fade .8s ${ease} .2s both; }
  ${S} .bs-stats { margin-top: 8px; padding: 0 4px; }
  ${S} .bs-stat { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 7px 0; font-size: 10.5px; }
  ${S} .bs-stat + .bs-stat { border-top: 1px solid rgba(244,238,230,.07); }
  ${S} .bs-stat span { color: rgba(244,238,230,.6); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  ${S} .bs-stat b { flex-shrink: 0; font-weight: 500; font-variant-numeric: tabular-nums; }
  ${S} .bs-screen.is-on .bs-stat { animation: bs-ft-up .45s ${ease} both; }
  ${S} .bs-screen.is-on .bs-stat:nth-child(2) { animation-delay: .05s; }
  ${S} .bs-screen.is-on .bs-stat:nth-child(3) { animation-delay: .1s; }
  @keyframes bs-ft-up { from { opacity: 0; transform: translateY(8px); } }
  @keyframes bs-ft-fade { from { opacity: 0; } }
  @keyframes bs-ft-ring { from { stroke-dashoffset: ${RING_C.toFixed(2)}; } }
  @keyframes bs-ft-draw { from { stroke-dashoffset: 1; } }
  @container (min-width: 720px) {
    ${S} .bs-wrap { grid-template-columns: minmax(0, 1fr) minmax(0, 1.05fr); align-items: center; gap: 48px; padding: 56px 40px; }
    ${S} .bs-col { display: block; }
    ${S} .bs-h { font-size: 44px; }
    ${S} .bs-tabs { margin-top: 32px; }
    ${S} .bs-copy { margin-top: 28px; }
    ${S} .bs-ph { font-size: 28px; }
    ${S} .bs-stage { grid-row: auto; min-height: 580px; padding: 0 5% 24px 0; }
    ${S} .bs-photo { width: 38%; }
    ${S} .bs-insight { left: 6%; top: 24px; }
  }
  @media (prefers-reduced-motion: reduce) {
    ${S} .bs-panel.is-on, ${S} .bs-insight.is-on, ${S} .bs-screen.is-on *, ${S} .bs-line, ${S} .bs-shot { animation: none !important; transition: none !important; }
  }
</style>`;

  const stat = (n: number) => `{%- assign bs_st = block.settings.stat_${n} | split: '|' -%}
                {%- if block.settings.stat_${n} != blank -%}<div class="bs-stat"><span>{{ bs_st[0] | strip }}</span><b>{{ bs_st[1] | strip }}</b></div>{%- endif -%}`;

  const markup = `{%- comment -%}
  Feature Tabs by boost.supply.
  - One "Tab" block per feature (up to 5). The phone screen is drawn in CSS from
    the block's score, status, chart points (comma separated numbers) and up to
    three stats written as "Label | Value".
  - The accent photo comes from the tab's image, falling back to the section's
    accent image. A square photo of the product works best.
{%- endcomment -%}
<div class="bs-ft-{{ section.id }}" id="bs-ft-{{ section.id }}">
  <div class="bs-wrap" style="--n: {{ section.blocks.size | at_least: 1 }};">
    <div class="bs-col">
      <div>
        {%- if section.settings.eyebrow != blank -%}<p class="bs-eyebrow">{{ section.settings.eyebrow }}</p>{%- endif -%}
        <h2 class="bs-h">{{ section.settings.heading }}{% if section.settings.heading_accent != blank %} <em>{{ section.settings.heading_accent }}</em>{% endif %}</h2>
        {%- if section.settings.subheading != blank -%}<p class="bs-sub">{{ section.settings.subheading }}</p>{%- endif -%}
        <div class="bs-tabs" role="tablist">
          {%- for block in section.blocks -%}
            <button type="button" class="bs-tab" role="tab" data-tab="{{ forloop.index0 }}" aria-selected="{% if forloop.first %}true{% else %}false{% endif %}" {{ block.shopify_attributes }}>{{ block.settings.title }}</button>
          {%- endfor -%}
          <span class="bs-line" data-line aria-hidden="true"></span>
        </div>
      </div>
      <div class="bs-copy">
        {%- for block in section.blocks -%}
          <div class="bs-panel{% if forloop.first %} is-on{% endif %}" data-panel{% unless forloop.first %} hidden{% endunless %}>
            <h3 class="bs-ph">{{ block.settings.headline }}{% if block.settings.accent != blank %} <em>{{ block.settings.accent }}</em>{% endif %}</h3>
            {%- if block.settings.text != blank -%}<p class="bs-pt">{{ block.settings.text }}</p>{%- endif -%}
          </div>
        {%- endfor -%}
        {%- if section.settings.cta_label != blank -%}
          <div class="bs-cta">
            <a class="bs-btn" href="{{ section.settings.cta_url | default: routes.all_products_collection_url }}">{{ section.settings.cta_label }}<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 8h10M9 4l4 4-4 4"/></svg></a>
            {%- if section.settings.cta_note != blank -%}<span class="bs-note">{{ section.settings.cta_note }}</span>{%- endif -%}
          </div>
        {%- endif -%}
      </div>
    </div>

    <div class="bs-stage">
      <div class="bs-photo">
        {%- for block in section.blocks -%}
          {%- assign bs_img = block.settings.image | default: section.settings.image -%}
          <span class="bs-shot{% if forloop.first %} is-on{% endif %}" data-shot>
            {%- if bs_img != blank -%}{{ bs_img | image_url: width: 600 | image_tag: loading: 'lazy', alt: block.settings.title, sizes: '(min-width: 990px) 240px, 40vw' }}{%- endif -%}
          </span>
        {%- endfor -%}
      </div>
      {%- for block in section.blocks -%}
        {%- if block.settings.insight != blank -%}
          <div class="bs-insight{% if forloop.first %} is-on{% endif %}" data-insight="{{ forloop.index0 }}"><i><svg width="9" height="9" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 8.5l3-3 2 2 3-4"/></svg></i>{{ block.settings.insight }}</div>
        {%- endif -%}
      {%- endfor -%}
      <div class="bs-phone">
        <div class="bs-screen-w">
          <span class="bs-island" aria-hidden="true"></span>
          <div class="bs-status" aria-hidden="true">
            <b>9:41</b>
            <span>
              <svg width="14" height="9" viewBox="0 0 14 9" fill="currentColor"><rect x="0" y="6" width="2.4" height="3" rx=".6"/><rect x="3.8" y="4" width="2.4" height="5" rx=".6"/><rect x="7.6" y="2" width="2.4" height="7" rx=".6"/><rect x="11.4" y="0" width="2.4" height="9" rx=".6" opacity=".4"/></svg>
              <svg width="20" height="9" viewBox="0 0 20 9" fill="none"><rect x=".5" y=".5" width="16.5" height="8" rx="2.4" stroke="currentColor" opacity=".45"/><rect x="2" y="2" width="11" height="5" rx="1.3" fill="currentColor"/><rect x="18" y="3" width="1.5" height="3" rx=".7" fill="currentColor" opacity=".45"/></svg>
            </span>
          </div>
          {%- for block in section.blocks -%}
            {%- assign bs_score = block.settings.score | at_least: 0 | at_most: 100 -%}
            {%- assign bs_off = 100 | minus: bs_score | times: ${RING_C.toFixed(4)} | divided_by: 100.0 -%}
            <div class="bs-screen{% if forloop.first %} is-on{% endif %}" data-screen data-points="{{ block.settings.points | escape }}"{% unless forloop.first %} hidden{% endunless %}>
              <div class="bs-sh">
                <div><small>Today</small><b>{{ block.settings.title }}</b></div>
                <span class="bs-dots" aria-hidden="true">{%- for b in section.blocks -%}<i{% if forloop.index0 == forloop.parentloop.index0 %} class="is-on"{% endif %}></i>{%- endfor -%}</span>
              </div>
              <div class="bs-ring">
                <svg width="128" height="128" viewBox="0 0 128 128" aria-hidden="true">
                  <defs><linearGradient id="bs-ft-g-{{ section.id }}-{{ forloop.index }}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="{{ section.settings.ring_color }}"/><stop offset="1" stop-color="${cream}"/></linearGradient></defs>
                  <circle class="bs-ring-t" cx="64" cy="64" r="${RING_R}" fill="none" stroke-width="9"/>
                  <circle class="bs-ring-p" cx="64" cy="64" r="${RING_R}" fill="none" stroke-width="9" stroke-linecap="round" stroke="url(#bs-ft-g-{{ section.id }}-{{ forloop.index }})" style="--off: {{ bs_off }};"/>
                </svg>
                <div class="bs-score"><b>{{ bs_score }}</b><small>{{ block.settings.status }}</small></div>
              </div>
              <div class="bs-chart">
                <p>{{ block.settings.chart_label }}</p>
                <svg viewBox="-2 -2 ${CW + 4} ${CH + 4}" aria-hidden="true">
                  <defs><linearGradient id="bs-ft-a-{{ section.id }}-{{ forloop.index }}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{{ section.settings.ring_color }}" stop-opacity=".35"/><stop offset="1" stop-color="{{ section.settings.ring_color }}" stop-opacity="0"/></linearGradient></defs>
                  <line x1="0" x2="${CW}" y1="${(CH * 0.33).toFixed(1)}" y2="${(CH * 0.33).toFixed(1)}" stroke="rgba(244,238,230,.06)" stroke-dasharray="2 3"/>
                  <line x1="0" x2="${CW}" y1="${(CH * 0.66).toFixed(1)}" y2="${(CH * 0.66).toFixed(1)}" stroke="rgba(244,238,230,.06)" stroke-dasharray="2 3"/>
                  <path class="bs-ca" data-area fill="url(#bs-ft-a-{{ section.id }}-{{ forloop.index }})"/>
                  <path class="bs-cl" data-cline pathLength="1" fill="none" stroke="{{ section.settings.ring_color }}" stroke-width="1.8" stroke-linecap="round"/>
                  <circle data-dot r="3" fill="${cream}" stroke="{{ section.settings.ring_color }}" stroke-width="1.5"/>
                </svg>
              </div>
              <div class="bs-stats">
                ${stat(1)}
                ${stat(2)}
                ${stat(3)}
              </div>
            </div>
          {%- endfor -%}
        </div>
      </div>
    </div>
  </div>
</div>
<script>
  (function () {
    var root = document.getElementById('bs-ft-{{ section.id }}');
    if (!root) return;
    ${CHART_JS}
    var tabs = [].slice.call(root.querySelectorAll('[data-tab]'));
    var panels = [].slice.call(root.querySelectorAll('[data-panel]'));
    var screens = [].slice.call(root.querySelectorAll('[data-screen]'));
    var shots = [].slice.call(root.querySelectorAll('[data-shot]'));
    var insights = [].slice.call(root.querySelectorAll('[data-insight]'));
    var line = root.querySelector('[data-line]');
    screens.forEach(function (s) {
      var p = bsPaths(s.getAttribute('data-points'));
      var a = s.querySelector('[data-area]'), l = s.querySelector('[data-cline]'), d = s.querySelector('[data-dot]');
      if (a) a.setAttribute('d', p.area);
      if (l) l.setAttribute('d', p.line);
      if (d) { d.setAttribute('cx', p.end[0].toFixed(1)); d.setAttribute('cy', p.end[1].toFixed(1)); }
    });
    function swap(list, i) {
      list.forEach(function (el, k) {
        var on = k === i;
        el.classList.remove('is-on');
        if (el.hasAttribute('data-panel') || el.hasAttribute('data-screen')) el.hidden = !on;
        if (on) { void el.offsetWidth; el.classList.add('is-on'); }
      });
    }
    function show(i) {
      tabs.forEach(function (t, k) { t.setAttribute('aria-selected', k === i ? 'true' : 'false'); });
      if (line) line.style.setProperty('--i', i);
      swap(panels, i);
      swap(screens, i);
      shots.forEach(function (s, k) { s.classList.toggle('is-on', k === i); });
      insights.forEach(function (el) {
        var on = +el.getAttribute('data-insight') === i;
        el.classList.remove('is-on');
        if (on) { void el.offsetWidth; el.classList.add('is-on'); }
      });
    }
    tabs.forEach(function (t, k) {
      t.addEventListener('click', function () { show(k); });
      t.addEventListener('keydown', function (e) {
        if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
        var n = (k + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
        tabs[n].focus();
        show(n);
      });
    });
  })();
</script>`;

  const schema = buildSchema({
    name: "Feature Tabs",
    settings: [
      { type: "text", id: "eyebrow", label: "Eyebrow", default: str(config, "eyebrow") },
      { type: "text", id: "heading", label: "Heading", default: str(config, "heading") },
      { type: "text", id: "heading_accent", label: "Heading accent (italic serif)", default: str(config, "headingAccent") },
      { type: "textarea", id: "subheading", label: "Subheading", default: str(config, "subheading") },
      { type: "header", content: "Button" },
      { type: "text", id: "cta_label", label: "Button label", default: str(config, "ctaLabel") },
      { type: "url", id: "cta_url", label: "Button link" },
      { type: "text", id: "cta_note", label: "Note next to the button", default: str(config, "ctaNote") },
      { type: "header", content: "Media" },
      { type: "image_picker", id: "image", label: "Accent photo", info: "Used for tabs without their own photo. Square works best." },
      { type: "header", content: "Style" },
      { type: "color", id: "bg", label: "Background", default: str(config, "bg") },
      { type: "color", id: "text_color", label: "Text", default: str(config, "textColor") },
      { type: "color", id: "muted", label: "Body text", default: str(config, "muted") },
      { type: "color", id: "subtle", label: "Inactive tabs", default: str(config, "subtle") },
      { type: "color", id: "stage_bg", label: "Stage", default: str(config, "stageBg") },
      { type: "color", id: "screen_bg", label: "Phone screen", default: str(config, "screenBg") },
      { type: "color", id: "ring_color", label: "Score ring & chart", default: str(config, "ringColor") },
      { type: "color", id: "button_bg", label: "Button", default: str(config, "buttonBg") },
      { type: "color", id: "button_text", label: "Button text", default: str(config, "buttonText") },
      { type: "range", id: "radius", label: "Corner radius", min: 0, max: 40, step: 2, unit: "px", default: clamp(Math.round(num(config, "radius", 28) / 2) * 2, 0, 40) },
    ],
    blocks: [
      {
        type: "tab",
        name: "Tab",
        settings: [
          { type: "text", id: "title", label: "Tab title", default: "Sleep" },
          { type: "range", id: "score", label: "Score", min: 0, max: 100, step: 1, default: 86 },
          { type: "text", id: "status", label: "Score status", default: "Optimal" },
          { type: "text", id: "headline", label: "Headline", default: "Rest you can" },
          { type: "text", id: "accent", label: "Headline accent (italic serif)", default: "measure" },
          { type: "textarea", id: "text", label: "Text" },
          { type: "text", id: "chart_label", label: "Chart label", default: "Heart rate overnight" },
          { type: "text", id: "points", label: "Chart points (comma separated)", default: "64,60,55,50,48,51,57" },
          { type: "text", id: "stat_1", label: "Stat 1 (Label | Value)" },
          { type: "text", id: "stat_2", label: "Stat 2 (Label | Value)" },
          { type: "text", id: "stat_3", label: "Stat 3 (Label | Value)" },
          { type: "text", id: "insight", label: "Insight chip" },
          { type: "image_picker", id: "image", label: "Accent photo (optional)" },
        ],
      },
    ],
    maxBlocks: 5,
    presetBlocks: tabs.map((t) => ({
      type: "tab",
      settings: {
        title: esc(t.title ?? ""),
        score: clamp(Math.round(toNum(t.score, 0)), 0, 100),
        status: esc(t.status ?? ""),
        headline: esc(t.headline ?? ""),
        accent: esc(t.accent ?? ""),
        text: esc(t.text ?? ""),
        chart_label: esc(t.chartLabel ?? ""),
        points: esc(t.points ?? ""),
        stat_1: esc(t.stat1 ?? ""),
        stat_2: esc(t.stat2 ?? ""),
        stat_3: esc(t.stat3 ?? ""),
        insight: esc(t.insight ?? ""),
      },
    })),
  });

  return section({ style, markup, schema });
}

export const featureTabs: Tweak = {
  slug: "feature-tabs",
  inspiredBy: "oura",
  name: "Feature Tabs",
  tagline: "Editorial feature tabs that drive a live phone mockup with a score ring and chart.",
  description:
    "Modeled on the app feature tabs Oura uses on its homepage. Tabs (Sleep, Readiness, Activity, Heart) with a gliding underline switch a phone mockup drawn entirely in CSS: the score ring sweeps to the new score, the chart draws itself, stat rows rise in and an insight chip floats over the stage. Copy with an italic serif accent sits beside it, and a product photo anchors the scene. Shows what the product does instead of listing it.",
  category: "homepage",
  tier: "free",
  tint: "#f3ede4",
  Preview,
  generateLiquid,
  defaults,
  fields: [
    { key: "eyebrow", label: "Eyebrow", type: "text", group: "Content" },
    { key: "heading", label: "Heading", type: "text", group: "Content" },
    { key: "headingAccent", label: "Heading accent", type: "text", group: "Content", hint: "Set in italic serif after the heading" },
    { key: "subheading", label: "Subheading", type: "textarea", group: "Content" },
    {
      key: "tabs", label: "Tabs", type: "list", group: "Tabs",
      hint: "Score 0-100. Chart points are comma separated numbers. Stats are written as “Label | Value”. Image URL is the accent photo for that tab",
      itemFields: [
        { key: "title", label: "Tab title", type: "text" },
        { key: "score", label: "Score", type: "text" },
        { key: "status", label: "Score status", type: "text" },
        { key: "headline", label: "Headline", type: "text" },
        { key: "accent", label: "Headline accent", type: "text" },
        { key: "text", label: "Text", type: "textarea" },
        { key: "chartLabel", label: "Chart label", type: "text" },
        { key: "points", label: "Chart points", type: "text" },
        { key: "stat1", label: "Stat 1", type: "text" },
        { key: "stat2", label: "Stat 2", type: "text" },
        { key: "stat3", label: "Stat 3", type: "text" },
        { key: "insight", label: "Insight chip", type: "text" },
        { key: "image", label: "Image URL", type: "text" },
      ],
      newItem: {
        title: "Stress", score: "78", status: "Balanced", headline: "Find your", accent: "calm",
        text: "See when stress builds during the day and how quickly you recover.", chartLabel: "Stress today",
        points: "20,34,48,40,30,26,22", stat1: "Stressed | 1h 10m", stat2: "Restored | 3h 05m", stat3: "Daytime balance | Good",
        insight: "Most restored since Monday", image: "/mockups/ring-gold.jpg",
      },
      addLabel: "Add tab", max: 5,
    },
    { key: "ctaLabel", label: "Button label", type: "text", group: "Button" },
    { key: "ctaUrl", label: "Button link", type: "text", group: "Button" },
    { key: "ctaNote", label: "Note next to the button", type: "text", group: "Button" },
    fontField("Typography"),
    { key: "radius", label: "Corner radius", type: "slider", group: "Layout", min: 0, max: 40, step: 2, unit: "px" },
    { key: "bg", label: "Background", type: "color", group: "Colors" },
    { key: "textColor", label: "Text", type: "color", group: "Colors" },
    { key: "muted", label: "Body text", type: "color", group: "Colors" },
    { key: "subtle", label: "Inactive tabs", type: "color", group: "Colors" },
    { key: "stageBg", label: "Stage", type: "color", group: "Colors" },
    { key: "screenBg", label: "Phone screen", type: "color", group: "Colors" },
    { key: "ringColor", label: "Score ring & chart", type: "color", group: "Colors" },
    { key: "buttonBg", label: "Button", type: "color", group: "Colors" },
    { key: "buttonText", label: "Button text", type: "color", group: "Colors" },
  ],
};
