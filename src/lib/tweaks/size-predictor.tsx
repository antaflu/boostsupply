"use client";

import { useEffect, useState, type CSSProperties } from "react";
import type { Tweak, TweakConfig } from "../types";
import { str, num, bool, list, fontStack, esc } from "../cfg";
import { fontField } from "../fields";
import { buildSchema, section, fontFaceFor } from "../liquid";
import { toNum } from "./product-art";

/* ============================================================
   Size Predictor
   A gym-wear fit finder: the shopper sets height (cm or ft) and
   weight on sliders and picks a fit preference. A dark result
   card shows the predicted size, a confidence bar, "most people
   your size bought M" and a mini size chart with the match
   highlighted, plus a one-tap add in that size. The photo header
   carries a height ruler whose marker follows the slider.
   Size thresholds are a list (size, max height, max weight); the
   prediction is the same in the preview and the Liquid.
   ============================================================ */

const EASE = "cubic-bezier(.22,1,.36,1)";
const H_MIN = 145;
const H_MAX = 205;
const W_MIN = 40;
const W_MAX = 130;

const defaults: TweakConfig = {
  eyebrow: "Size predictor",
  heading: "Find your fit",
  subheading: "Two sliders, one tap. We match your build against thousands of fit reviews.",
  image: "/mockups/fit-leggings.jpg",
  imageTag: "Fit data from 18,400 reviews",
  units: "metric",
  height: 168,
  weight: 62,
  fit: "regular",
  heightLabel: "Height",
  weightLabel: "Weight",
  fitLabel: "Fit preference",
  snugLabel: "Snug",
  snugHint: "Compressive",
  regularLabel: "Regular",
  regularHint: "True to size",
  relaxedLabel: "Relaxed",
  relaxedHint: "Room to move",
  resultLabel: "Your size",
  confidenceLabel: "confidence",
  boughtText: "Most people your size bought {{size}}",
  showChart: true,
  chartHeight: "Height",
  chartWeight: "Weight",
  showButton: true,
  buttonText: "Add size {{size}} to bag",
  addedText: "Added to bag",
  sizes: [
    { size: "XS", height: "160", weight: "52" },
    { size: "S", height: "166", weight: "59" },
    { size: "M", height: "172", weight: "67" },
    { size: "L", height: "178", weight: "76" },
    { size: "XL", height: "184", weight: "86" },
    { size: "XXL", height: "192", weight: "98" },
  ],
  bg: "#FFFFFF",
  textColor: "#0D1012",
  accent: "#DC0428",
  linkColor: "#004EBA",
  track: "#DEE0E3",
  muted: "#5E6368",
  panel: "#0D1012",
  panelText: "#FFFFFF",
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
const token = (k: string) => "{{" + k + "}}";
const fill = (tpl: string, size: string) => tpl.split(token("size")).join(size);

const toIn = (cm: number) => Math.round(cm / 2.54);
const toLb = (kg: number) => Math.round(kg * 2.20462);
const ftIn = (inches: number) => `${Math.floor(inches / 12)}'${inches % 12}"`;

/* ---- prediction (mirrored 1:1 in the Liquid script) ---- */

/** Position of a value across the size bands: 2.4 = 40% into the 3rd band. */
function bandPos(v: number, maxes: number[]) {
  const n = maxes.length;
  for (let i = 0; i < n; i++) {
    if (v <= maxes[i]) {
      const lo = i === 0 ? maxes[0] - (n > 1 ? maxes[1] - maxes[0] : 10) : maxes[i - 1];
      return i + clamp((v - lo) / Math.max(1, maxes[i] - lo), 0, 0.999);
    }
  }
  return n - 0.001;
}

function predict(rows: { h: number; w: number }[], h: number, w: number, fit: string) {
  if (!rows.length) return { idx: -1, conf: 0 };
  const ph = bandPos(h, rows.map((r) => r.h));
  const pw = bandPos(w, rows.map((r) => r.w));
  const shift = fit === "snug" ? -0.45 : fit === "relaxed" ? 0.45 : 0;
  const c = clamp(0.35 * ph + 0.65 * pw + shift, 0, rows.length - 0.001);
  const idx = Math.floor(c);
  const within = c - idx;
  const conf = Math.round(clamp(97 - Math.abs(within - 0.5) * 50 - Math.abs(ph - pw) * 7, 58, 97));
  return { idx, conf };
}

/* ---- small parts ---- */

function Slider({
  value,
  min,
  max,
  onChange,
  label,
  text,
  track,
  focus,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  label: string;
  text: string;
  track: string;
  focus: string;
}) {
  const pct = ((clamp(value, min, max) - min) / (max - min)) * 100;
  return (
    <input
      type="range"
      min={min}
      max={max}
      step={1}
      value={clamp(value, min, max)}
      aria-label={label}
      onChange={(e) => onChange(Number(e.target.value))}
      className="mt-3 block h-[6px] w-full cursor-pointer appearance-none rounded-full outline-none focus-visible:outline-2 focus-visible:outline-offset-[6px] [&::-moz-range-thumb]:h-[22px] [&::-moz-range-thumb]:w-[22px] [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:shadow-[0_0_0_1.5px_var(--t),0_2px_6px_rgba(0,0,0,.2)] [&::-webkit-slider-thumb]:h-[22px] [&::-webkit-slider-thumb]:w-[22px] [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-[0_0_0_1.5px_var(--t),0_2px_6px_rgba(0,0,0,.2)] [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:duration-200 active:[&::-webkit-slider-thumb]:scale-110"
      style={{ background: `linear-gradient(to right, ${text} ${pct}%, ${track} ${pct}%)`, outlineColor: focus, "--t": text } as CSSProperties}
    />
  );
}

function People({ color }: { color: string }) {
  return (
    <svg width="22" height="14" viewBox="0 0 22 14" fill={color} aria-hidden className="shrink-0">
      <circle cx="5" cy="3.6" r="2.4" opacity=".45" />
      <path d="M.8 13c.3-2.8 2-4.4 4.2-4.4s3.9 1.6 4.2 4.4z" opacity=".45" />
      <circle cx="17" cy="3.6" r="2.4" opacity=".45" />
      <path d="M12.8 13c.3-2.8 2-4.4 4.2-4.4s3.9 1.6 4.2 4.4z" opacity=".45" />
      <circle cx="11" cy="3" r="2.8" />
      <path d="M6.2 13.6c.3-3.3 2.3-5.1 4.8-5.1s4.5 1.8 4.8 5.1z" />
    </svg>
  );
}

function Preview({ config }: { config: TweakConfig }) {
  const bg = str(config, "bg", "#FFFFFF");
  const text = str(config, "textColor", "#0D1012");
  const accent = str(config, "accent", "#DC0428");
  const linkColor = str(config, "linkColor", "#004EBA");
  const track = str(config, "track", "#DEE0E3");
  const muted = str(config, "muted", "#5E6368");
  const panel = str(config, "panel", "#0D1012");
  const panelText = str(config, "panelText", "#FFFFFF");
  const radius = num(config, "radius", 4);
  const display: CSSProperties = {
    fontFamily: fontStack(str(config, "displayFont", "system")),
    fontWeight: 800,
    fontStretch: "condensed",
    textTransform: bool(config, "displayCaps", true) ? "uppercase" : "none",
    letterSpacing: "-0.015em",
    lineHeight: 0.9,
  };
  const label: CSSProperties = { letterSpacing: "0.07em" };

  const rows = list(config, "sizes")
    .map((r) => ({ size: (r.size ?? "").trim(), h: toNum(r.height), w: toNum(r.weight) }))
    .filter((r) => r.size);

  /* the editor controls set the starting point; the shopper takes it from there */
  const startKey = `${str(config, "units")}:${num(config, "height")}:${num(config, "weight")}:${str(config, "fit")}`;
  const [prevKey, setPrevKey] = useState(startKey);
  const [imperial, setImperial] = useState(str(config, "units") === "imperial");
  const [h, setH] = useState(clamp(num(config, "height", 168), H_MIN, H_MAX));
  const [w, setW] = useState(clamp(num(config, "weight", 62), W_MIN, W_MAX));
  const [fit, setFit] = useState(str(config, "fit", "regular"));
  const [added, setAdded] = useState(false);
  if (startKey !== prevKey) {
    setPrevKey(startKey);
    setImperial(str(config, "units") === "imperial");
    setH(clamp(num(config, "height", 168), H_MIN, H_MAX));
    setW(clamp(num(config, "weight", 62), W_MIN, W_MAX));
    setFit(str(config, "fit", "regular"));
  }

  useEffect(() => {
    if (!added) return;
    const t = setTimeout(() => setAdded(false), 1600);
    return () => clearTimeout(t);
  }, [added]);

  const { idx, conf } = predict(rows, h, w, fit);
  const size = idx >= 0 ? rows[idx].size : "–";

  const hShown = imperial ? ftIn(toIn(h)) : `${Math.round(h)}`;
  const wShown = imperial ? `${toLb(w)}` : `${Math.round(w)}`;
  const hUnit = imperial ? "" : "cm";
  const wUnit = imperial ? "lb" : "kg";
  const hPct = ((h - H_MIN) / (H_MAX - H_MIN)) * 100;

  const fits = [
    { v: "snug", l: str(config, "snugLabel"), hint: str(config, "snugHint"), gap: 1 },
    { v: "regular", l: str(config, "regularLabel"), hint: str(config, "regularHint"), gap: 3 },
    { v: "relaxed", l: str(config, "relaxedLabel"), hint: str(config, "relaxedHint"), gap: 5 },
  ];

  const image = str(config, "image").trim();
  const tag = str(config, "imageTag");
  const segs = 20;
  const lit = Math.round((conf / 100) * segs);

  return (
    <div
      className="@container w-full"
      style={{ background: bg, color: text, fontFamily: fontStack(str(config, "font", "system")) }}
    >
      {/* Header: photo, heading and a live height ruler */}
      <div className="relative aspect-[16/10] overflow-hidden @min-[640px]:aspect-[21/8]" style={{ background: panel }}>
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image}
            alt=""
            loading="lazy"
            decoding="async"
            draggable={false}
            className="absolute inset-0 h-full w-full object-cover"
            style={{ objectPosition: "60% 40%" }}
          />
        ) : (
          <div
            aria-hidden
            className="absolute inset-0"
            style={{ background: `repeating-linear-gradient(135deg, ${tint(panelText, 0.04)} 0 2px, transparent 2px 14px)` }}
          />
        )}
        <div
          aria-hidden
          className="absolute inset-0"
          style={{ background: "linear-gradient(180deg, rgba(0,0,0,.05) 30%, rgba(0,0,0,.72) 100%)" }}
        />

        {/* ruler */}
        <div aria-hidden className="absolute bottom-4 right-3 top-4 w-9 @min-[640px]:right-6">
          <div
            className="absolute inset-y-0 right-0 w-3"
            style={{
              background: `repeating-linear-gradient(to top, ${tint("#FFFFFF", 0.55)} 0 1px, transparent 1px 8.33%)`,
            }}
          />
          <div
            className="absolute inset-y-0 right-0 w-1.5"
            style={{ background: `repeating-linear-gradient(to top, ${tint("#FFFFFF", 0.3)} 0 1px, transparent 1px 1.667%)` }}
          />
          <div
            className="absolute right-0 flex items-center gap-1"
            style={{ bottom: `${hPct}%`, transform: "translateY(50%)", transition: `bottom 450ms ${EASE}` }}
          >
            <span
              className="whitespace-nowrap rounded-[3px] px-1.5 py-[3px] text-[9.5px] font-bold leading-none text-white tabular-nums"
              style={{ background: accent }}
            >
              {hShown}
              {hUnit && ` ${hUnit.toUpperCase()}`}
            </span>
            <span className="h-[2px] w-4" style={{ background: accent }} />
          </div>
        </div>

        <div className="absolute inset-x-0 bottom-0 p-5 pr-24 @min-[640px]:p-8">
          {str(config, "eyebrow") && (
            <p className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase text-white/85" style={label}>
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: accent }} />
              {str(config, "eyebrow")}
            </p>
          )}
          {str(config, "heading") && (
            <h3 className="mt-2 text-[38px] text-white @min-[640px]:text-[56px]" style={display}>
              {str(config, "heading")}
            </h3>
          )}
        </div>
        {tag && (
          <span
            className="absolute left-5 top-5 rounded-full px-2.5 py-[6px] text-[10px] font-semibold leading-none text-white backdrop-blur-md @min-[640px]:left-8 @min-[640px]:top-6"
            style={{ background: "rgba(0,0,0,.42)" }}
          >
            {tag}
          </span>
        )}
      </div>

      <div className="mx-auto grid w-full max-w-[1080px] gap-5 px-5 pb-6 pt-5 @min-[640px]:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] @min-[640px]:gap-8 @min-[640px]:px-8 @min-[640px]:pb-10 @min-[640px]:pt-8">
        {/* Inputs */}
        <div className="min-w-0">
          {str(config, "subheading") && (
            <p className="text-[13.5px] leading-[1.5]" style={{ color: muted }}>
              {str(config, "subheading")}
            </p>
          )}

          <div className="mt-5">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[11px] font-bold uppercase" style={label}>
                {str(config, "heightLabel")}
              </span>
              <div className="flex items-center gap-3">
                <b className="text-[20px] tabular-nums" style={{ ...display, lineHeight: 1 }}>
                  {hShown}
                  {hUnit && <span className="ml-1 text-[12px]">{hUnit}</span>}
                </b>
                <div
                  role="radiogroup"
                  aria-label="Units"
                  className="relative grid h-7 grid-cols-2 rounded-full p-[3px] text-[10.5px] font-bold"
                  style={{ background: tint(track, 0.7) }}
                >
                  <span
                    aria-hidden
                    className="absolute bottom-[3px] left-[3px] top-[3px] w-[calc(50%-3px)] rounded-full"
                    style={{
                      background: text,
                      transform: imperial ? "translateX(100%)" : "none",
                      transition: `transform 320ms ${EASE}`,
                    }}
                  />
                  {[
                    ["CM", false],
                    ["FT", true],
                  ].map(([l, imp]) => (
                    <button
                      key={String(l)}
                      type="button"
                      role="radio"
                      aria-checked={imperial === imp}
                      onClick={() => setImperial(imp as boolean)}
                      className="relative z-[1] w-9 rounded-full transition-colors duration-200"
                      style={{ color: imperial === imp ? bg : text }}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            {imperial ? (
              <Slider
                label={str(config, "heightLabel")}
                value={toIn(h)}
                min={toIn(H_MIN)}
                max={toIn(H_MAX)}
                onChange={(v) => setH(v * 2.54)}
                text={text}
                track={track}
                focus={linkColor}
              />
            ) : (
              <Slider label={str(config, "heightLabel")} value={h} min={H_MIN} max={H_MAX} onChange={setH} text={text} track={track} focus={linkColor} />
            )}
          </div>

          <div className="mt-6">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[11px] font-bold uppercase" style={label}>
                {str(config, "weightLabel")}
              </span>
              <b className="text-[20px] tabular-nums" style={{ ...display, lineHeight: 1 }}>
                {wShown}
                <span className="ml-1 text-[12px]">{wUnit}</span>
              </b>
            </div>
            {imperial ? (
              <Slider
                label={str(config, "weightLabel")}
                value={toLb(w)}
                min={toLb(W_MIN)}
                max={toLb(W_MAX)}
                onChange={(v) => setW(v / 2.20462)}
                text={text}
                track={track}
                focus={linkColor}
              />
            ) : (
              <Slider label={str(config, "weightLabel")} value={w} min={W_MIN} max={W_MAX} onChange={setW} text={text} track={track} focus={linkColor} />
            )}
          </div>

          <div className="mt-6">
            <span className="text-[11px] font-bold uppercase" style={label}>
              {str(config, "fitLabel")}
            </span>
            <div role="radiogroup" className="mt-2.5 grid grid-cols-3 gap-2">
              {fits.map((f) => {
                const on = fit === f.v;
                return (
                  <button
                    key={f.v}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => setFit(f.v)}
                    className="flex flex-col items-start gap-2 px-3 pb-2.5 pt-3 text-left transition-[background-color,color,box-shadow,scale] duration-200 active:scale-[0.97]"
                    style={{
                      borderRadius: radius + 2,
                      background: on ? text : bg,
                      color: on ? bg : text,
                      boxShadow: on ? "none" : `inset 0 0 0 1.5px ${track}`,
                    }}
                  >
                    {/* fabric tension glyph: tighter lines for snug */}
                    <span aria-hidden className="flex h-3 items-center">
                      {[0, 1, 2].map((k) => (
                        <span
                          key={k}
                          className="h-3 w-[3px] rounded-full"
                          style={{ marginLeft: k ? f.gap : 0, background: on ? accent : tint(text, 0.35), transition: "background-color .2s" }}
                        />
                      ))}
                    </span>
                    <span className="text-[12.5px] font-bold uppercase leading-none" style={label}>
                      {f.l}
                    </span>
                    <span className="text-[10.5px] leading-tight" style={{ color: on ? tint(bg, 0.7) : muted }}>
                      {f.hint}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Result */}
        <div className="min-w-0 p-5 @min-[640px]:self-start" style={{ background: panel, color: panelText, borderRadius: radius + 4 }}>
          <div className="grid grid-cols-[auto_minmax(0,1fr)] items-end gap-5">
            <div>
              <p className="text-[10.5px] font-bold uppercase" style={{ ...label, color: tint(panelText, 0.6) }}>
                {str(config, "resultLabel")}
              </p>
              <p
                key={size}
                className="bs-swap mt-1 min-w-[64px] text-[78px] tabular-nums"
                style={{ ...display, lineHeight: 0.8, letterSpacing: "-0.04em" }}
              >
                {size}
              </p>
            </div>
            <div className="pb-1">
              <p className="flex items-baseline justify-between gap-2 text-[11px] font-bold uppercase" style={label}>
                <span style={{ color: tint(panelText, 0.6) }}>{str(config, "confidenceLabel")}</span>
                <span className="text-[15px] tabular-nums" style={{ ...display, lineHeight: 1 }}>
                  {conf}%
                </span>
              </p>
              <div className="mt-2 grid gap-[2px]" style={{ gridTemplateColumns: `repeat(${segs}, minmax(0,1fr))` }}>
                {Array.from({ length: segs }, (_, i) => (
                  <span
                    key={i}
                    className="h-2.5 rounded-[1px]"
                    style={{
                      background: i < lit ? (i >= segs - 4 ? accent : panelText) : tint(panelText, 0.16),
                      transition: `background-color 300ms ${EASE} ${i * 12}ms`,
                    }}
                  />
                ))}
              </div>
            </div>
          </div>

          {str(config, "boughtText") && idx >= 0 && (
            <p
              key={`b-${size}`}
              className="bs-swap mt-4 flex items-center gap-2 border-t pt-3.5 text-[12.5px] leading-snug"
              style={{ borderColor: tint(panelText, 0.14) }}
            >
              <People color={panelText} />
              <span>
                {(() => {
                  const [pre, post = ""] = str(config, "boughtText").split(token("size"));
                  return (
                    <>
                      {pre}
                      {str(config, "boughtText").includes(token("size")) && <b className="font-bold">{size}</b>}
                      {post}
                    </>
                  );
                })()}
              </span>
            </p>
          )}

          {bool(config, "showChart", true) && rows.length > 0 && (
            <div className="mt-4 overflow-hidden" role="table" aria-label="Size chart">
              <div
                className="grid text-center text-[10.5px] tabular-nums"
                style={{ gridTemplateColumns: `52px repeat(${rows.length}, minmax(0,1fr))` }}
              >
                {[
                  { k: "s", l: "" },
                  { k: "h", l: str(config, "chartHeight") },
                  { k: "w", l: str(config, "chartWeight") },
                ].map((row, ri) => (
                  <div key={row.k} role="row" className="contents">
                    <span
                      className="py-1.5 text-left text-[9.5px] font-bold uppercase"
                      style={{ ...label, color: tint(panelText, 0.55) }}
                    >
                      {row.l}
                      {row.k !== "s" && (
                        <span className="block text-[8.5px] font-medium normal-case tracking-normal">
                          {row.k === "h" ? (imperial ? "up to" : "up to, cm") : imperial ? "up to, lb" : "up to, kg"}
                        </span>
                      )}
                    </span>
                    {rows.map((r, ci) => {
                      const on = ci === idx;
                      const v = row.k === "s" ? r.size : row.k === "h" ? (imperial ? ftIn(toIn(r.h)) : r.h) : imperial ? toLb(r.w) : r.w;
                      return (
                        <span
                          key={ci}
                          role="cell"
                          className={`grid place-items-center px-0.5 ${row.k === "s" ? "text-[12px] font-extrabold" : ""}`}
                          style={{
                            background: on ? panelText : "transparent",
                            color: on ? panel : row.k === "s" ? panelText : tint(panelText, 0.7),
                            borderRadius: ri === 0 ? "3px 3px 0 0" : ri === 2 ? "0 0 3px 3px" : 0,
                            transition: `background-color 300ms ${EASE}, color 300ms ${EASE}`,
                          }}
                        >
                          {v}
                        </span>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          )}

          {bool(config, "showButton", true) && idx >= 0 && (
            <button
              type="button"
              onClick={() => setAdded(true)}
              className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-full text-[13px] font-extrabold uppercase transition-[background-color,color,scale] duration-300 active:scale-[0.98]"
              style={{ ...label, background: added ? accent : panelText, color: added ? "#FFFFFF" : panel }}
            >
              <span key={added ? "y" : size} className="bs-swap inline-flex items-center gap-2">
                {added ? (
                  <>
                    <svg width="14" height="14" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="M2.5 6.3l2.3 2.2 4.7-5" />
                    </svg>
                    {str(config, "addedText")}
                  </>
                ) : (
                  fill(str(config, "buttonText"), size)
                )}
              </span>
            </button>
          )}
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
  const S = ".bs-sp-{{ section.id }}";
  const ease = EASE;
  const pt = "{{ section.settings.panel_text }}";
  const ptA = (a: number) => `{{ section.settings.panel_text | color_modify: 'alpha', ${a} }}`;

  const style = `<style>
${face ? face + "\n" : ""}  ${S} { container-type: inline-size; background: {{ section.settings.bg }}; color: {{ section.settings.text_color }}; font-family: ${body.family}; }
  ${S} * { box-sizing: border-box; }
  ${S} p, ${S} h2 { margin: 0; }
  ${S} button { font: inherit; }
  ${S} .bs-disp { font-family: ${disp.family}; font-weight: 800; font-stretch: condensed; letter-spacing: -.015em; line-height: .9;
    {%- if section.settings.display_caps %} text-transform: uppercase;{% endif %} }
  ${S} .bs-lbl { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .07em; }
  ${S} .bs-hero { position: relative; aspect-ratio: 16 / 10; overflow: hidden; background: {{ section.settings.panel }}; }
  ${S} .bs-hero img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; object-position: 60% 40%; }
  ${S} .bs-hero::after { content: ""; position: absolute; inset: 0; background: linear-gradient(180deg, rgba(0,0,0,.05) 30%, rgba(0,0,0,.72) 100%); }
  ${S} .bs-hero-in { position: absolute; left: 0; right: 0; bottom: 0; z-index: 1; padding: 20px 96px 20px 20px; color: #fff; }
  ${S} .bs-eye { display: flex; align-items: center; gap: 6px; font-size: 10.5px; opacity: .85; }
  ${S} .bs-eye i, ${S} .bs-dot { width: 6px; height: 6px; border-radius: 99px; background: {{ section.settings.accent }}; }
  ${S} .bs-h { margin-top: 8px; font-size: 38px; color: #fff; }
  ${S} .bs-tag { position: absolute; left: 20px; top: 20px; z-index: 1; padding: 6px 10px; border-radius: 99px; font-size: 10px; font-weight: 600; line-height: 1;
    color: #fff; background: rgba(0,0,0,.42); -webkit-backdrop-filter: blur(12px); backdrop-filter: blur(12px); }
  ${S} .bs-ruler { position: absolute; top: 16px; bottom: 16px; right: 12px; z-index: 1; width: 36px; }
  ${S} .bs-ruler::before, ${S} .bs-ruler::after { content: ""; position: absolute; top: 0; bottom: 0; right: 0; }
  ${S} .bs-ruler::before { width: 12px; background: repeating-linear-gradient(to top, rgba(255,255,255,.55) 0 1px, transparent 1px 8.33%); }
  ${S} .bs-ruler::after { width: 6px; background: repeating-linear-gradient(to top, rgba(255,255,255,.3) 0 1px, transparent 1px 1.667%); }
  ${S} .bs-mark { position: absolute; right: 0; bottom: var(--p, 50%); display: flex; align-items: center; gap: 4px; transform: translateY(50%); transition: bottom .45s ${ease}; }
  ${S} .bs-mark b { white-space: nowrap; padding: 3px 6px; border-radius: 3px; font-size: 9.5px; line-height: 1; color: #fff; background: {{ section.settings.accent }}; font-variant-numeric: tabular-nums; }
  ${S} .bs-mark i { width: 16px; height: 2px; background: {{ section.settings.accent }}; }
  ${S} .bs-body { max-width: 1080px; margin: 0 auto; display: grid; gap: 20px; padding: 20px 20px 24px; }
  ${S} .bs-sub { font-size: 13.5px; line-height: 1.5; color: {{ section.settings.muted }}; margin-bottom: 20px; }
  ${S} .bs-field + .bs-field { margin-top: 24px; }
  ${S} .bs-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
  ${S} .bs-val { font-size: 20px; line-height: 1; font-variant-numeric: tabular-nums; }
  ${S} .bs-val small { margin-left: 4px; font-size: 12px; }
  ${S} .bs-units { position: relative; display: grid; grid-template-columns: 1fr 1fr; height: 28px; padding: 3px; border-radius: 99px;
    background: {{ section.settings.track | color_modify: 'alpha', 0.7 }}; }
  ${S} .bs-units::before { content: ""; position: absolute; top: 3px; bottom: 3px; left: 3px; width: calc(50% - 3px); border-radius: 99px;
    background: {{ section.settings.text_color }}; transition: transform .32s ${ease}; }
  ${S} .bs-units.is-imp::before { transform: translateX(100%); }
  ${S} .bs-units button { position: relative; z-index: 1; width: 36px; border: 0; border-radius: 99px; background: none; cursor: pointer;
    font-size: 10.5px; font-weight: 700; color: {{ section.settings.text_color }}; transition: color .2s; }
  ${S} .bs-units button[aria-checked="true"] { color: {{ section.settings.bg }}; }
  ${S} .bs-range { display: block; width: 100%; height: 6px; margin: 12px 0 0; border-radius: 99px; cursor: pointer; outline: none; -webkit-appearance: none; appearance: none;
    background: linear-gradient(to right, {{ section.settings.text_color }} var(--p, 50%), {{ section.settings.track }} var(--p, 50%)); }
  ${S} .bs-range::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 22px; height: 22px; border-radius: 99px; background: #fff;
    box-shadow: 0 0 0 1.5px {{ section.settings.text_color }}, 0 2px 6px rgba(0,0,0,.2); transition: transform .2s; }
  ${S} .bs-range:active::-webkit-slider-thumb { transform: scale(1.1); }
  ${S} .bs-range::-moz-range-thumb { width: 22px; height: 22px; border: 0; border-radius: 99px; background: #fff;
    box-shadow: 0 0 0 1.5px {{ section.settings.text_color }}, 0 2px 6px rgba(0,0,0,.2); }
  ${S} .bs-range:focus-visible { outline: 2px solid {{ section.settings.link_color }}; outline-offset: 6px; }
  ${S} .bs-fits { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; margin-top: 10px; }
  ${S} .bs-fit { display: flex; flex-direction: column; align-items: flex-start; gap: 8px; padding: 12px 12px 10px; border: 0; text-align: left; cursor: pointer;
    border-radius: {{ section.settings.radius | plus: 2 }}px; background: {{ section.settings.bg }}; color: {{ section.settings.text_color }};
    box-shadow: inset 0 0 0 1.5px {{ section.settings.track }}; transition: background-color .2s, color .2s, box-shadow .2s, transform .2s; }
  ${S} .bs-fit:active { transform: scale(.97); }
  ${S} .bs-fit[aria-checked="true"] { background: {{ section.settings.text_color }}; color: {{ section.settings.bg }}; box-shadow: none; }
  ${S} .bs-glyph { display: flex; align-items: center; height: 12px; }
  ${S} .bs-glyph i { width: 3px; height: 12px; border-radius: 99px; background: {{ section.settings.text_color | color_modify: 'alpha', 0.35 }}; }
  ${S} .bs-fit[aria-checked="true"] .bs-glyph i { background: {{ section.settings.accent }}; }
  ${S} .bs-fit .bs-lbl { font-size: 12.5px; line-height: 1; }
  ${S} .bs-fit small { font-size: 10.5px; line-height: 1.2; color: {{ section.settings.muted }}; }
  ${S} .bs-fit[aria-checked="true"] small { color: {{ section.settings.bg | color_modify: 'alpha', 0.7 }}; }
  ${S} .bs-res { min-width: 0; align-self: start; padding: 20px; border-radius: {{ section.settings.radius | plus: 4 }}px; background: {{ section.settings.panel }}; color: ${pt}; }
  ${S} .bs-top { display: grid; grid-template-columns: auto minmax(0, 1fr); align-items: end; gap: 20px; }
  ${S} .bs-res .bs-lbl { font-size: 10.5px; color: ${ptA(0.6)}; }
  ${S} .bs-size { min-width: 64px; margin-top: 4px; font-size: 78px; line-height: .8; letter-spacing: -.04em; }
  ${S} .bs-conf { padding-bottom: 4px; }
  ${S} .bs-conf .bs-row { align-items: baseline; }
  ${S} .bs-conf .bs-disp { font-size: 15px; line-height: 1; color: ${pt}; }
  ${S} .bs-segs { display: grid; grid-template-columns: repeat(20, minmax(0, 1fr)); gap: 2px; margin-top: 8px; }
  ${S} .bs-segs i { height: 10px; border-radius: 1px; background: ${ptA(0.16)}; transition: background-color .3s ${ease}; }
  ${S} .bs-segs i.is-on { background: ${pt}; }
  ${S} .bs-segs i.is-on:nth-child(n+17) { background: {{ section.settings.accent }}; }
  ${S} .bs-bought { display: flex; align-items: center; gap: 8px; margin-top: 16px; padding-top: 14px; border-top: 1px solid ${ptA(0.14)}; font-size: 12.5px; line-height: 1.35; }
  ${S} .bs-bought svg { flex-shrink: 0; fill: ${pt}; }
  ${S} .bs-chart { display: grid; margin-top: 16px; text-align: center; font-size: 10.5px; font-variant-numeric: tabular-nums; }
  ${S} .bs-chart span { display: grid; place-items: center; padding: 0 2px; color: ${ptA(0.7)}; transition: background-color .3s ${ease}, color .3s ${ease}; }
  ${S} .bs-chart .bs-ch { place-items: start; padding: 6px 0; text-align: left; font-size: 9.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .07em; color: ${ptA(0.55)}; }
  ${S} .bs-chart .bs-ch small { display: block; font-size: 8.5px; font-weight: 500; text-transform: none; letter-spacing: 0; }
  ${S} .bs-chart .bs-cs { font-size: 12px; font-weight: 800; color: ${pt}; }
  ${S} .bs-chart span.is-on { background: ${pt}; color: {{ section.settings.panel }}; }
  ${S} .bs-chart .bs-cs.is-on { border-radius: 3px 3px 0 0; }
  ${S} .bs-chart .bs-cw.is-on { border-radius: 0 0 3px 3px; }
  ${S} .bs-form { margin: 16px 0 0; }
  ${S} .bs-atc { width: 100%; height: 48px; border: 0; border-radius: 99px; cursor: pointer; font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: .07em;
    background: ${pt}; color: {{ section.settings.panel }}; transition: background-color .3s, color .3s, transform .2s, opacity .2s; }
  ${S} .bs-atc:active { transform: scale(.98); }
  ${S} .bs-atc:disabled { opacity: .45; cursor: not-allowed; }
  @container (min-width: 640px) {
    ${S} .bs-hero { aspect-ratio: 21 / 8; }
    ${S} .bs-hero-in { padding: 32px 120px 32px 32px; }
    ${S} .bs-h { font-size: 56px; }
    ${S} .bs-tag { left: 32px; top: 24px; }
    ${S} .bs-ruler { right: 24px; }
    ${S} .bs-body { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 32px; padding: 32px 32px 40px; }
  }
  @media (prefers-reduced-motion: reduce) { ${S} * { transition-duration: 1ms !important; } }
</style>`;

  const peopleSvg = `<svg width="22" height="14" viewBox="0 0 22 14" aria-hidden="true"><circle cx="5" cy="3.6" r="2.4" opacity=".45"/><path d="M.8 13c.3-2.8 2-4.4 4.2-4.4s3.9 1.6 4.2 4.4z" opacity=".45"/><circle cx="17" cy="3.6" r="2.4" opacity=".45"/><path d="M12.8 13c.3-2.8 2-4.4 4.2-4.4s3.9 1.6 4.2 4.4z" opacity=".45"/><circle cx="11" cy="3" r="2.8"/><path d="M6.2 13.6c.3-3.3 2.3-5.1 4.8-5.1s4.5 1.8 4.8 5.1z"/></svg>`;
  const glyph = (gap: number) =>
    `<span class="bs-glyph" aria-hidden="true"><i></i><i style="margin-left:${gap}px"></i><i style="margin-left:${gap}px"></i></span>`;

  const markup = `{%- comment -%}
  Size Predictor by boost.supply. Works on product pages (adds the predicted
  size to the cart) and anywhere else (prediction and chart only).
  - Add one "Size" block per size, smallest first, with the tallest height (cm)
    and heaviest weight (kg) that size is meant for. The prediction weighs
    weight a bit more than height and shifts half a size for snug / relaxed.
  - "Add to bag" picks the variant whose Size option matches the predicted
    block label. Set "Size option name" to the option name on your product.
  - The header photo comes from the image picker (falls back to the product's
    featured image).
{%- endcomment -%}
{%- liquid
  assign bs_img = section.settings.image
  if bs_img == blank and product != blank
    assign bs_img = product.featured_image
  endif
  assign bs_si = -1
  if product != blank
    assign bs_key = section.settings.size_option | downcase | strip
    for bs_o in product.options_with_values
      assign bs_on = bs_o.name | downcase | strip
      if bs_on == bs_key
        assign bs_si = bs_o.position | minus: 1
      endif
    endfor
  endif
  assign bs_open = '{' | append: '{'
  assign bs_close = '}' | append: '}'
  assign bs_token = bs_open | append: 'size' | append: bs_close
  assign bs_count = 0
  for block in section.blocks
    if block.type == 'size'
      assign bs_count = bs_count | plus: 1
    endif
  endfor
-%}
<div class="bs-sp-{{ section.id }}" id="bs-sp-{{ section.id }}" data-si="{{ bs_si }}"
  data-units="{{ section.settings.default_units }}" data-h="{{ section.settings.default_height }}" data-w="{{ section.settings.default_weight }}"
  data-bought="{{ section.settings.bought_text | escape }}" data-btn="{{ section.settings.button_text | escape }}"
  data-out="{{ section.settings.unavailable_text | escape }}">
  <div class="bs-hero">
    {%- if bs_img != blank -%}
      {{ bs_img | image_url: width: 1800 | image_tag: loading: 'lazy', alt: '', sizes: '100vw' }}
    {%- endif -%}
    {%- if section.settings.image_tag != blank -%}<span class="bs-tag">{{ section.settings.image_tag }}</span>{%- endif -%}
    <div class="bs-ruler" aria-hidden="true"><span class="bs-mark" data-mark><b data-mark-v></b><i></i></span></div>
    <div class="bs-hero-in">
      {%- if section.settings.eyebrow != blank -%}<p class="bs-lbl bs-eye"><i aria-hidden="true"></i>{{ section.settings.eyebrow }}</p>{%- endif -%}
      {%- if section.settings.heading != blank -%}<h2 class="bs-h bs-disp">{{ section.settings.heading }}</h2>{%- endif -%}
    </div>
  </div>

  <div class="bs-body">
    <div>
      {%- if section.settings.subheading != blank -%}<p class="bs-sub">{{ section.settings.subheading }}</p>{%- endif -%}
      <div class="bs-field">
        <div class="bs-row">
          <span class="bs-lbl">{{ section.settings.height_label }}</span>
          <span class="bs-row">
            <b class="bs-val bs-disp" data-hv></b>
            <span class="bs-units" role="radiogroup" aria-label="Units" data-units-tg>
              <button type="button" role="radio" aria-checked="true" data-unit="metric">CM</button>
              <button type="button" role="radio" aria-checked="false" data-unit="imperial">FT</button>
            </span>
          </span>
        </div>
        <input class="bs-range" type="range" step="1" data-h-range aria-label="{{ section.settings.height_label | escape }}">
      </div>
      <div class="bs-field">
        <div class="bs-row">
          <span class="bs-lbl">{{ section.settings.weight_label }}</span>
          <b class="bs-val bs-disp" data-wv></b>
        </div>
        <input class="bs-range" type="range" step="1" data-w-range aria-label="{{ section.settings.weight_label | escape }}">
      </div>
      <div class="bs-field">
        <span class="bs-lbl">{{ section.settings.fit_label }}</span>
        <div class="bs-fits" role="radiogroup" aria-label="{{ section.settings.fit_label | escape }}">
          <button type="button" class="bs-fit" role="radio" data-fit="snug" aria-checked="{% if section.settings.default_fit == 'snug' %}true{% else %}false{% endif %}">${glyph(1)}<span class="bs-lbl">{{ section.settings.snug_label }}</span><small>{{ section.settings.snug_hint }}</small></button>
          <button type="button" class="bs-fit" role="radio" data-fit="regular" aria-checked="{% if section.settings.default_fit == 'regular' %}true{% else %}false{% endif %}">${glyph(3)}<span class="bs-lbl">{{ section.settings.regular_label }}</span><small>{{ section.settings.regular_hint }}</small></button>
          <button type="button" class="bs-fit" role="radio" data-fit="relaxed" aria-checked="{% if section.settings.default_fit == 'relaxed' %}true{% else %}false{% endif %}">${glyph(5)}<span class="bs-lbl">{{ section.settings.relaxed_label }}</span><small>{{ section.settings.relaxed_hint }}</small></button>
        </div>
      </div>
    </div>

    <div class="bs-res" aria-live="polite">
      <div class="bs-top">
        <div>
          <p class="bs-lbl">{{ section.settings.result_label }}</p>
          <p class="bs-size bs-disp" data-size>–</p>
        </div>
        <div class="bs-conf">
          <p class="bs-row"><span class="bs-lbl">{{ section.settings.confidence_label }}</span><b class="bs-disp" data-conf></b></p>
          <div class="bs-segs" aria-hidden="true">{%- for i in (1..20) -%}<i></i>{%- endfor -%}</div>
        </div>
      </div>
      {%- if section.settings.bought_text != blank -%}<p class="bs-bought">${peopleSvg}<span data-bought></span></p>{%- endif -%}

      {%- if section.settings.show_chart and bs_count > 0 -%}
        <div class="bs-chart" role="table" aria-label="Size chart" style="grid-template-columns: 52px repeat({{ bs_count }}, minmax(0, 1fr));">
          <span class="bs-ch" role="cell"></span>
          {%- for block in section.blocks -%}{%- if block.type == 'size' -%}<span class="bs-cs" role="cell" data-col {{ block.shopify_attributes }}>{{ block.settings.label }}</span>{%- endif -%}{%- endfor -%}
          <span class="bs-ch" role="cell">{{ section.settings.chart_height }}<small data-hu>up to, cm</small></span>
          {%- for block in section.blocks -%}{%- if block.type == 'size' -%}<span class="bs-chh" role="cell" data-col data-cm="{{ block.settings.max_height }}">{{ block.settings.max_height }}</span>{%- endif -%}{%- endfor -%}
          <span class="bs-ch" role="cell">{{ section.settings.chart_weight }}<small data-wu>up to, kg</small></span>
          {%- for block in section.blocks -%}{%- if block.type == 'size' -%}<span class="bs-cw" role="cell" data-col data-kg="{{ block.settings.max_weight }}">{{ block.settings.max_weight }}</span>{%- endif -%}{%- endfor -%}
        </div>
      {%- endif -%}

      {%- if section.settings.show_button and product != blank and bs_si >= 0 -%}
        {%- assign bs_v = product.selected_or_first_available_variant -%}
        {%- form 'product', product, class: 'bs-form' -%}
          <input type="hidden" name="id" value="{{ bs_v.id }}" data-id>
          <button type="submit" name="add" class="bs-atc" data-atc>{{ section.settings.button_text | replace: bs_token, bs_v.options[bs_si] }}</button>
        {%- endform -%}
        <script type="application/json" data-variants>{{ product.variants | json }}</script>
      {%- endif -%}
    </div>
  </div>
  <script type="application/json" data-sizes>[
    {%- assign bs_first = true -%}
    {%- for block in section.blocks -%}{%- if block.type == 'size' -%}
      {%- unless bs_first -%},{%- endunless -%}{"s":{{ block.settings.label | json }},"h":{{ block.settings.max_height }},"w":{{ block.settings.max_weight }} }
      {%- assign bs_first = false -%}
    {%- endif -%}{%- endfor -%}
  ]</script>
</div>
<script>
  (function () {
    var root = document.getElementById('bs-sp-{{ section.id }}');
    if (!root) return;
    var H_MIN = ${H_MIN}, H_MAX = ${H_MAX}, W_MIN = ${W_MIN}, W_MAX = ${W_MAX};
    var rows = [];
    try { rows = JSON.parse(root.querySelector('[data-sizes]').textContent); } catch (e) {}
    var variants = [];
    var vEl = root.querySelector('[data-variants]');
    if (vEl) { try { variants = JSON.parse(vEl.textContent); } catch (e) {} }
    var si = parseInt(root.dataset.si, 10);
    var d = root.dataset;
    var st = { imp: d.units === 'imperial', h: +d.h || 168, w: +d.w || 62, fit: 'regular' };
    var cur = root.querySelector('.bs-fit[aria-checked="true"]');
    if (cur) st.fit = cur.dataset.fit;
    function $(s) { return root.querySelector(s); }
    function all(s) { return [].slice.call(root.querySelectorAll(s)); }
    function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }
    function tok(k) { return '{' + '{' + k + '}' + '}'; }
    function toIn(cm) { return Math.round(cm / 2.54); }
    function toLb(kg) { return Math.round(kg * 2.20462); }
    function ftIn(i) { return Math.floor(i / 12) + "'" + (i % 12) + '"'; }
    function bandPos(v, maxes) {
      var n = maxes.length;
      for (var i = 0; i < n; i++) {
        if (v <= maxes[i]) {
          var lo = i === 0 ? maxes[0] - (n > 1 ? maxes[1] - maxes[0] : 10) : maxes[i - 1];
          return i + clamp((v - lo) / Math.max(1, maxes[i] - lo), 0, 0.999);
        }
      }
      return n - 0.001;
    }
    function predict() {
      if (!rows.length) return { idx: -1, conf: 0 };
      var ph = bandPos(st.h, rows.map(function (r) { return r.h; }));
      var pw = bandPos(st.w, rows.map(function (r) { return r.w; }));
      var shift = st.fit === 'snug' ? -0.45 : st.fit === 'relaxed' ? 0.45 : 0;
      var c = clamp(0.35 * ph + 0.65 * pw + shift, 0, rows.length - 0.001);
      var idx = Math.floor(c), within = c - idx;
      var conf = Math.round(clamp(97 - Math.abs(within - 0.5) * 50 - Math.abs(ph - pw) * 7, 58, 97));
      return { idx: idx, conf: conf };
    }
    var hr = $('[data-h-range]'), wr = $('[data-w-range]');
    function setRanges() {
      hr.min = st.imp ? toIn(H_MIN) : H_MIN; hr.max = st.imp ? toIn(H_MAX) : H_MAX;
      wr.min = st.imp ? toLb(W_MIN) : W_MIN; wr.max = st.imp ? toLb(W_MAX) : W_MAX;
      hr.value = st.imp ? toIn(st.h) : Math.round(st.h);
      wr.value = st.imp ? toLb(st.w) : Math.round(st.w);
    }
    function pct(el) { return ((el.value - el.min) / (el.max - el.min)) * 100 + '%'; }
    function update() {
      var p = predict();
      var size = p.idx >= 0 ? rows[p.idx].s : '–';
      var hs = st.imp ? ftIn(toIn(st.h)) : String(Math.round(st.h));
      $('[data-hv]').innerHTML = '';
      $('[data-hv]').appendChild(document.createTextNode(hs));
      if (!st.imp) { var sm = document.createElement('small'); sm.textContent = 'cm'; $('[data-hv]').appendChild(sm); }
      var wv = $('[data-wv]');
      wv.textContent = st.imp ? toLb(st.w) : Math.round(st.w);
      var sm2 = document.createElement('small'); sm2.textContent = st.imp ? 'lb' : 'kg'; wv.appendChild(sm2);
      hr.style.setProperty('--p', pct(hr));
      wr.style.setProperty('--p', pct(wr));
      var mark = $('[data-mark]');
      mark.style.setProperty('--p', ((st.h - H_MIN) / (H_MAX - H_MIN)) * 100 + '%');
      $('[data-mark-v]').textContent = st.imp ? hs : hs + ' CM';
      $('[data-size]').textContent = size;
      $('[data-conf]').textContent = p.conf + '%';
      var lit = Math.round(p.conf / 100 * 20);
      all('.bs-segs i').forEach(function (s, i) { s.classList.toggle('is-on', i < lit); });
      var b = $('[data-bought]');
      if (b) {
        var parts = String(d.bought || '').split(tok('size'));
        b.textContent = parts[0];
        if (parts.length > 1) { var bb = document.createElement('b'); bb.textContent = size; b.appendChild(bb); b.appendChild(document.createTextNode(parts.slice(1).join(size))); }
      }
      var cols = rows.length;
      all('[data-col]').forEach(function (c, i) { c.classList.toggle('is-on', i % cols === p.idx); });
      all('[data-cm]').forEach(function (c) { var v = +c.dataset.cm; c.textContent = st.imp ? ftIn(toIn(v)) : v; });
      all('[data-kg]').forEach(function (c) { var v = +c.dataset.kg; c.textContent = st.imp ? toLb(v) : v; });
      var hu = $('[data-hu]'), wu = $('[data-wu]');
      if (hu) hu.textContent = st.imp ? 'up to' : 'up to, cm';
      if (wu) wu.textContent = st.imp ? 'up to, lb' : 'up to, kg';
      var atc = $('[data-atc]');
      if (atc && p.idx >= 0) {
        var want = String(size).toLowerCase(), match = null;
        for (var i = 0; i < variants.length; i++) {
          if (String(variants[i].options[si]).toLowerCase() === want && variants[i].available) { match = variants[i]; break; }
        }
        atc.disabled = !match;
        atc.textContent = match ? String(d.btn).split(tok('size')).join(size) : d.out;
        if (match) $('[data-id]').value = match.id;
      }
    }
    var tg = $('[data-units-tg]');
    all('[data-unit]').forEach(function (u) {
      u.addEventListener('click', function () {
        st.imp = u.dataset.unit === 'imperial';
        all('[data-unit]').forEach(function (x) { x.setAttribute('aria-checked', x === u ? 'true' : 'false'); });
        tg.classList.toggle('is-imp', st.imp);
        setRanges();
        update();
      });
    });
    hr.addEventListener('input', function () { st.h = st.imp ? hr.value * 2.54 : +hr.value; update(); });
    wr.addEventListener('input', function () { st.w = st.imp ? wr.value / 2.20462 : +wr.value; update(); });
    all('[data-fit]').forEach(function (f) {
      f.addEventListener('click', function () {
        st.fit = f.dataset.fit;
        all('[data-fit]').forEach(function (x) { x.setAttribute('aria-checked', x === f ? 'true' : 'false'); });
        update();
      });
    });
    all('[data-unit]').forEach(function (x) { x.setAttribute('aria-checked', (x.dataset.unit === 'imperial') === st.imp ? 'true' : 'false'); });
    tg.classList.toggle('is-imp', st.imp);
    setRanges();
    update();
  })();
</script>`;

  const rows = list(config, "sizes").filter((s) => (s.size ?? "").trim());
  const fitOpts = [
    { value: "snug", label: "Snug" },
    { value: "regular", label: "Regular" },
    { value: "relaxed", label: "Relaxed" },
  ];
  const fitDefault = fitOpts.some((o) => o.value === str(config, "fit")) ? str(config, "fit") : "regular";

  const schema = buildSchema({
    name: "Size Predictor",
    settings: [
      { type: "text", id: "eyebrow", label: "Eyebrow", default: str(config, "eyebrow") },
      { type: "text", id: "heading", label: "Heading", default: str(config, "heading") },
      { type: "textarea", id: "subheading", label: "Subheading", default: str(config, "subheading") },
      { type: "header", content: "Header photo" },
      { type: "image_picker", id: "image", label: "Photo", info: "Leave empty to use the product's featured image. An in-action shot works best." },
      { type: "text", id: "image_tag", label: "Photo tag", default: str(config, "imageTag") },
      { type: "header", content: "Inputs" },
      {
        type: "select",
        id: "default_units",
        label: "Default units",
        options: [
          { value: "metric", label: "Centimetres / kilograms" },
          { value: "imperial", label: "Feet / pounds" },
        ],
        default: str(config, "units") === "imperial" ? "imperial" : "metric",
      },
      { type: "range", id: "default_height", label: "Starting height", min: H_MIN, max: H_MAX, step: 1, unit: "cm", default: Math.round(clamp(num(config, "height", 168), H_MIN, H_MAX)) },
      { type: "range", id: "default_weight", label: "Starting weight", min: W_MIN, max: W_MAX, step: 1, unit: "kg", default: Math.round(clamp(num(config, "weight", 62), W_MIN, W_MAX)) },
      { type: "select", id: "default_fit", label: "Starting fit preference", options: fitOpts, default: fitDefault },
      { type: "text", id: "height_label", label: "Height label", default: str(config, "heightLabel") },
      { type: "text", id: "weight_label", label: "Weight label", default: str(config, "weightLabel") },
      { type: "text", id: "fit_label", label: "Fit label", default: str(config, "fitLabel") },
      { type: "text", id: "snug_label", label: "Snug", default: str(config, "snugLabel") },
      { type: "text", id: "snug_hint", label: "Snug hint", default: str(config, "snugHint") },
      { type: "text", id: "regular_label", label: "Regular", default: str(config, "regularLabel") },
      { type: "text", id: "regular_hint", label: "Regular hint", default: str(config, "regularHint") },
      { type: "text", id: "relaxed_label", label: "Relaxed", default: str(config, "relaxedLabel") },
      { type: "text", id: "relaxed_hint", label: "Relaxed hint", default: str(config, "relaxedHint") },
      { type: "header", content: "Result" },
      { type: "text", id: "result_label", label: "Result label", default: str(config, "resultLabel") },
      { type: "text", id: "confidence_label", label: "Confidence label", default: str(config, "confidenceLabel") },
      { type: "text", id: "bought_text", label: "Social proof line (use {{size}})", default: str(config, "boughtText") },
      { type: "checkbox", id: "show_chart", label: "Show mini size chart", default: bool(config, "showChart", true) },
      { type: "text", id: "chart_height", label: "Chart height label", default: str(config, "chartHeight") },
      { type: "text", id: "chart_weight", label: "Chart weight label", default: str(config, "chartWeight") },
      { type: "header", content: "Add to bag" },
      { type: "checkbox", id: "show_button", label: "Show add-to-bag on product pages", default: bool(config, "showButton", true) },
      { type: "text", id: "size_option", label: "Size option name", default: "Size" },
      { type: "text", id: "button_text", label: "Button text (use {{size}})", default: str(config, "buttonText") },
      { type: "text", id: "unavailable_text", label: "Size unavailable text", default: "Size sold out" },
      { type: "header", content: "Style" },
      { type: "checkbox", id: "display_caps", label: "Uppercase display type", default: bool(config, "displayCaps", true) },
      { type: "color", id: "bg", label: "Background", default: str(config, "bg") },
      { type: "color", id: "text_color", label: "Text", default: str(config, "textColor") },
      { type: "color", id: "accent", label: "Accent", default: str(config, "accent") },
      { type: "color", id: "link_color", label: "Focus ring", default: str(config, "linkColor") },
      { type: "color", id: "track", label: "Tracks & borders", default: str(config, "track") },
      { type: "color", id: "muted", label: "Muted text", default: str(config, "muted") },
      { type: "color", id: "panel", label: "Result card", default: str(config, "panel") },
      { type: "color", id: "panel_text", label: "Result card text", default: str(config, "panelText") },
      { type: "range", id: "radius", label: "Corner radius", min: 0, max: 20, step: 2, unit: "px", default: clamp(Math.round(num(config, "radius", 4) / 2) * 2, 0, 20) },
    ],
    blocks: [
      {
        type: "size",
        name: "Size",
        settings: [
          { type: "text", id: "label", label: "Size (must match the Size option value)" },
          { type: "range", id: "max_height", label: "Up to height", min: 140, max: 210, step: 1, unit: "cm", default: 170 },
          { type: "range", id: "max_weight", label: "Up to weight", min: 35, max: 135, step: 1, unit: "kg", default: 65 },
        ],
      },
    ],
    maxBlocks: 10,
    presetBlocks: rows.map((s) => ({
      type: "size",
      settings: {
        label: esc((s.size ?? "").trim()),
        max_height: Math.round(clamp(toNum(s.height, 170), 140, 210)),
        max_weight: Math.round(clamp(toNum(s.weight, 65), 35, 135)),
      },
    })),
  });

  return section({ style, markup, schema });
}

export const sizePredictor: Tweak = {
  slug: "size-predictor",
  inspiredBy: "gymshark",
  name: "Size Predictor",
  tagline: "Height, weight and fit preference in, a confident size out, with a one-tap add.",
  description:
    "Modeled on the size finder Gymshark offers on its product pages. Shoppers set their height (cm or feet) and weight on two sliders and pick snug, regular or relaxed. A bold result card shows the predicted size with a confidence bar, “most people your size bought M” and a mini size chart with the match highlighted, then adds that size to the bag. The header photo carries a height ruler that follows the slider. Every threshold is a block (size, max height, max weight), so it maps to any size chart.",
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
    { key: "image", label: "Image URL", type: "text", group: "Media", hint: "Editor preview only. In Shopify you pick the header photo in the theme editor (or it uses the product's featured image). Leave empty for a plain header", placeholder: "https://…" },
    { key: "imageTag", label: "Photo tag", type: "text", group: "Media", hint: "Leave empty to hide" },
    {
      key: "units", label: "Default units", type: "select", group: "Inputs",
      options: [
        { label: "Centimetres / kilograms", value: "metric" },
        { label: "Feet / pounds", value: "imperial" },
      ],
    },
    { key: "height", label: "Starting height", type: "slider", group: "Inputs", min: H_MIN, max: H_MAX, step: 1, unit: "cm" },
    { key: "weight", label: "Starting weight", type: "slider", group: "Inputs", min: W_MIN, max: W_MAX, step: 1, unit: "kg" },
    {
      key: "fit", label: "Starting fit", type: "select", group: "Inputs",
      options: [
        { label: "Snug", value: "snug" },
        { label: "Regular", value: "regular" },
        { label: "Relaxed", value: "relaxed" },
      ],
    },
    { key: "heightLabel", label: "Height label", type: "text", group: "Inputs" },
    { key: "weightLabel", label: "Weight label", type: "text", group: "Inputs" },
    { key: "fitLabel", label: "Fit label", type: "text", group: "Inputs" },
    { key: "snugLabel", label: "Snug", type: "text", group: "Fit options" },
    { key: "snugHint", label: "Snug hint", type: "text", group: "Fit options" },
    { key: "regularLabel", label: "Regular", type: "text", group: "Fit options" },
    { key: "regularHint", label: "Regular hint", type: "text", group: "Fit options" },
    { key: "relaxedLabel", label: "Relaxed", type: "text", group: "Fit options" },
    { key: "relaxedHint", label: "Relaxed hint", type: "text", group: "Fit options" },
    {
      key: "sizes", label: "Size thresholds", type: "list", group: "Sizes",
      hint: "Smallest first. Height in cm and weight in kg are the top of each size. The label must match your product's Size option value",
      itemFields: [
        { key: "size", label: "Size", type: "text" },
        { key: "height", label: "Up to height (cm)", type: "text" },
        { key: "weight", label: "Up to weight (kg)", type: "text" },
      ],
      newItem: { size: "3XL", height: "200", weight: "110" },
      addLabel: "Add size", max: 10,
    },
    { key: "resultLabel", label: "Result label", type: "text", group: "Result" },
    { key: "confidenceLabel", label: "Confidence label", type: "text", group: "Result" },
    { key: "boughtText", label: "Social proof line", type: "text", group: "Result", hint: "Use {{size}} for the predicted size" },
    { key: "showChart", label: "Show mini size chart", type: "toggle", group: "Result" },
    { key: "chartHeight", label: "Chart height label", type: "text", group: "Result" },
    { key: "chartWeight", label: "Chart weight label", type: "text", group: "Result" },
    { key: "showButton", label: "Show add-to-bag", type: "toggle", group: "Add to bag" },
    { key: "buttonText", label: "Button text", type: "text", group: "Add to bag", hint: "Use {{size}} for the predicted size" },
    { key: "addedText", label: "Added text", type: "text", group: "Add to bag" },
    fontField("Typography"),
    fontField("Typography", "displayFont", "Display font"),
    { key: "displayCaps", label: "Uppercase display type", type: "toggle", group: "Typography" },
    { key: "radius", label: "Corner radius", type: "slider", group: "Layout", min: 0, max: 20, step: 2, unit: "px" },
    { key: "bg", label: "Background", type: "color", group: "Colors" },
    { key: "textColor", label: "Text", type: "color", group: "Colors" },
    { key: "accent", label: "Accent", type: "color", group: "Colors" },
    { key: "linkColor", label: "Focus ring", type: "color", group: "Colors" },
    { key: "track", label: "Tracks & borders", type: "color", group: "Colors" },
    { key: "muted", label: "Muted text", type: "color", group: "Colors" },
    { key: "panel", label: "Result card", type: "color", group: "Colors" },
    { key: "panelText", label: "Result card text", type: "color", group: "Colors" },
  ],
};
