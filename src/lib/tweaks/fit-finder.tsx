"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { Tweak, TweakConfig } from "../types";
import { str, num, bool, fontStack } from "../cfg";
import { fontField } from "../fields";
import { buildSchema, section, fontFaceFor } from "../liquid";
import { money, toNum } from "./product-art";

/* ============================================================
   Fit Finder
   A three-tap size quiz next to the product photo: band size,
   cup size, then "how do bras usually fit you?". It lands on a
   recommended size card (big size, the size scale, a "fits like"
   note) with an add-to-bag button in that size. Each tap
   auto-advances; the photo keeps a running summary of answers.
   ============================================================ */

const EASE = "cubic-bezier(.22,1,.36,1)";
const STEPS = ["band", "cup", "fit", "result"] as const;
const FITS = ["tight", "right", "loose"] as const;
type FitKey = (typeof FITS)[number];

const defaults: TweakConfig = {
  eyebrow: "Fit finder",
  heading: "Your size in three taps",
  subheading: "Tell us what you wear now and we'll match you to the size most people with your fit keep.",
  productLine: "Second Skin",
  productName: "Scoop neck bra",
  price: "52",
  currency: "$",
  image: "/mockups/ladder-bra-nude.jpg",
  bands: "30, 32, 34, 36, 38, 40, 42",
  cups: "A, B, C, D, DD, DDD",
  sizes: "XXS, XS, S, M, L, XL, 2X",
  q1: "What's your usual band size?",
  q1Hint: "The number on the bra you reach for most.",
  q2: "And your cup size?",
  q2Hint: "Pick the one you buy most often.",
  q3: "How do bras usually fit you?",
  tightLabel: "Tight",
  tightHint: "Bands dig in or cups spill over",
  rightLabel: "Just right",
  rightHint: "Most bras fit as labelled",
  looseLabel: "Loose",
  looseHint: "Bands ride up or cups gap",
  resultLabel: "Your size",
  fitsLikeLabel: "Fits like",
  bandStep: "Band",
  cupStep: "Cup",
  fitStep: "Fit",
  noteTight: "We went up one for a softer band that still stays put.",
  noteRight: "True to size: a snug band and smooth, wire-free cups.",
  noteLoose: "We went down one so the band anchors and the cups sit flush.",
  buttonText: "Add in your size",
  addedText: "Added to bag",
  backText: "Back",
  retakeText: "Retake",
  startStep: "band",
  lowercaseName: true,
  textColor: "#2D2A26",
  accent: "#986B58",
  soft: "#B69A81",
  line: "#E8E0D5",
  tile: "#E8E0D5",
  bg: "#F7F4F0",
  font: "system",
  radius: 4,
};

/** Hex color + alpha byte, e.g. tint("#2D2A26", 0.7). */
const tint = (hex: string, a: number) =>
  /^#[0-9a-f]{6}$/i.test(hex)
    ? hex + Math.round(a * 255).toString(16).padStart(2, "0")
    : hex;

const csv = (s: string) =>
  s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);

/** Band weighs more than cup; the fit answer nudges one size up or down. */
function recommend(bi: number, ci: number, fit: FitKey, nb: number, nc: number, ns: number) {
  if (ns < 1) return -1;
  const b = nb > 1 ? bi / (nb - 1) : 0.5;
  const c = nc > 1 ? ci / (nc - 1) : 0.5;
  const shift = fit === "tight" ? 1 : fit === "loose" ? -1 : 0;
  return Math.max(0, Math.min(ns - 1, Math.round((b * 0.7 + c * 0.3) * (ns - 1)) + shift));
}

type Answers = { b: number; c: number; f: number };

/** Answers already "given" when the preview opens on a later step. */
const seedFor = (step: number, nb: number, nc: number): Answers => ({
  b: step >= 1 ? Math.floor((nb - 1) / 2) : -1,
  c: step >= 2 ? Math.min(2, nc - 1) : -1,
  f: step >= 3 ? 1 : -1,
});

function FitIcon({ kind, color }: { kind: FitKey; color: string }) {
  /* a bra band seen flat, with arrows that pinch in, sit flush or pull away */
  return (
    <svg width="34" height="22" viewBox="0 0 34 22" fill="none" stroke={color} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x={kind === "tight" ? 9 : kind === "loose" ? 5 : 7} y="8" width={kind === "tight" ? 16 : kind === "loose" ? 24 : 20} height="6" rx="3" />
      {kind === "tight" && (
        <>
          <path d="M1.5 11h5M4.5 9l2 2-2 2" />
          <path d="M32.5 11h-5M29.5 9l-2 2 2 2" />
        </>
      )}
      {kind === "loose" && (
        <>
          <path d="M3.5 11h-2.5M2.5 9.4L1 11l1.5 1.6" opacity=".9" />
          <path d="M30.5 11h2.5M31.5 9.4L33 11l-1.5 1.6" opacity=".9" />
        </>
      )}
      {kind === "right" && <path d="M13.5 11l2.4 2.2 4.6-4.6" />}
    </svg>
  );
}

function Preview({ config }: { config: TweakConfig }) {
  const text = str(config, "textColor", "#2D2A26");
  const accent = str(config, "accent", "#986B58");
  const soft = str(config, "soft", "#B69A81");
  const line = str(config, "line", "#E8E0D5");
  const tile = str(config, "tile", "#E8E0D5");
  const bg = str(config, "bg", "#F7F4F0");
  const radius = num(config, "radius", 4);
  const chipR = Math.min(radius, 6);
  const cur = str(config, "currency", "$");
  const photo = str(config, "image").trim();

  const bands = csv(str(config, "bands"));
  const cups = csv(str(config, "cups"));
  const sizes = csv(str(config, "sizes"));
  const fitLabels = [str(config, "tightLabel"), str(config, "rightLabel"), str(config, "looseLabel")];
  const fitHints = [str(config, "tightHint"), str(config, "rightHint"), str(config, "looseHint")];
  const notes = [str(config, "noteTight"), str(config, "noteRight"), str(config, "noteLoose")];

  /* follow the "Preview step" control, but let shoppers click through */
  const start = Math.max(0, STEPS.indexOf(str(config, "startStep", "band") as (typeof STEPS)[number]));
  const [prevStart, setPrevStart] = useState(start);
  const [step, setStep] = useState(start);
  const [dir, setDir] = useState<1 | -1>(1);
  const [ans, setAns] = useState<Answers>(() => seedFor(start, bands.length, cups.length));
  const [added, setAdded] = useState(false);
  if (start !== prevStart) {
    setPrevStart(start);
    setStep(start);
    setAns(seedFor(start, bands.length, cups.length));
  }

  const timer = useRef<number | undefined>(undefined);
  const addTimer = useRef<number | undefined>(undefined);
  useEffect(
    () => () => {
      window.clearTimeout(timer.current);
      window.clearTimeout(addTimer.current);
    },
    [],
  );

  const bi = ans.b >= 0 ? Math.min(ans.b, bands.length - 1) : -1;
  const ci = ans.c >= 0 ? Math.min(ans.c, cups.length - 1) : -1;
  const fi = ans.f >= 0 ? Math.min(ans.f, 2) : -1;
  const done = bi >= 0 && ci >= 0 && fi >= 0;
  const rec = done ? recommend(bi, ci, FITS[fi], bands.length, cups.length, sizes.length) : -1;
  const recSize = rec >= 0 ? sizes[rec] : "";
  const onResult = step === 3 && done;

  const go = (n: number) => {
    window.clearTimeout(timer.current);
    setDir(n < step ? -1 : 1);
    setStep(Math.max(0, Math.min(3, n)));
    setAdded(false);
  };
  const choose = (key: keyof Answers, i: number) => {
    setAns((a) => ({ ...a, [key]: i }));
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      setDir(1);
      setStep((s) => Math.min(3, s + 1));
    }, 320);
  };
  const retake = () => {
    setAns({ b: -1, c: -1, f: -1 });
    go(0);
  };
  const add = () => {
    setAdded(true);
    window.clearTimeout(addTimer.current);
    addTimer.current = window.setTimeout(() => setAdded(false), 1800);
  };

  const label = "text-[10.5px] font-medium uppercase leading-none tracking-[0.025em]";
  const nameCase: CSSProperties["textTransform"] = bool(config, "lowercaseName", true) ? "lowercase" : "none";
  const price = toNum(str(config, "price"));

  const chip = (on: boolean) => ({
    borderRadius: chipR,
    background: on ? text : "transparent",
    color: on ? bg : text,
    boxShadow: `inset 0 0 0 1px ${on ? text : tint(soft, 0.45)}`,
    transitionTimingFunction: EASE,
  });

  const sum = [
    { k: str(config, "bandStep"), v: bi >= 0 ? bands[bi] : "" },
    { k: str(config, "cupStep"), v: ci >= 0 ? cups[ci] : "" },
    { k: str(config, "fitStep"), v: fi >= 0 ? fitLabels[fi] : "" },
  ];

  const chips = (items: string[], sel: number, key: keyof Answers) => (
    <div role="radiogroup" className="grid grid-cols-[repeat(auto-fit,minmax(42px,1fr))] gap-1.5">
      {items.map((v, i) => (
        <button
          key={v + i}
          type="button"
          role="radio"
          aria-checked={sel === i}
          onClick={() => choose(key, i)}
          className="grid h-11 place-items-center text-[13px] tabular-nums transition-[background-color,color,box-shadow,scale] duration-300 hover:shadow-[inset_0_0_0_1px_currentColor] active:scale-[.96]"
          style={chip(sel === i)}
        >
          {v}
        </button>
      ))}
    </div>
  );

  const question = (q: string, hint: string) => (
    <div className="mb-4">
      <p className="text-[15px] leading-snug">{q}</p>
      {hint && (
        <p className="mt-1 text-[12px] leading-snug" style={{ color: tint(text, 0.6) }}>
          {hint}
        </p>
      )}
    </div>
  );

  return (
    <div
      className="@container w-full"
      style={{ background: bg, color: text, fontFamily: fontStack(str(config, "font", "system")), ["--r" as string]: `${radius}px` }}
    >
      <div className="mx-auto grid w-full max-w-[1040px] @min-[620px]:grid-cols-[minmax(0,1fr)_minmax(0,1.08fr)] @min-[620px]:gap-10 @min-[620px]:p-8 @min-[880px]:p-10">
        {/* ---- Photo with live summary ---- */}
        <div
          className="relative aspect-[16/11] overflow-hidden @min-[620px]:aspect-auto @min-[620px]:min-h-[480px] @min-[620px]:rounded-[var(--r)]"
          style={{ background: tile }}
        >
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photo}
              alt={str(config, "productName")}
              loading="lazy"
              decoding="async"
              className="absolute inset-0 h-full w-full object-cover transition-[scale] duration-[900ms]"
              style={{ scale: onResult ? "1.04" : "1", transitionTimingFunction: EASE }}
            />
          ) : (
            <div className="absolute inset-0 grid place-items-center" aria-hidden>
              <span className="text-[64px] font-medium leading-none tracking-[-0.02em]" style={{ color: tint(text, 0.18) }}>
                {recSize || "?"}
              </span>
            </div>
          )}
          <span
            key={onResult ? `t${recSize}` : "t"}
            className={`bs-swap absolute left-3 top-3 inline-flex items-center gap-1.5 px-2.5 py-[7px] ${label}`}
            style={{ background: onResult ? text : tint(bg, 0.88), color: onResult ? bg : text, borderRadius: chipR, backdropFilter: "blur(8px)" }}
          >
            <span className="h-[5px] w-[5px] rounded-full" style={{ background: onResult ? bg : accent }} />
            {onResult ? `${str(config, "resultLabel")} · ${recSize}` : str(config, "eyebrow")}
          </span>
          <div
            className="absolute bottom-3 left-3 right-3 grid grid-cols-3 overflow-hidden"
            style={{ background: tint(bg, 0.84), borderRadius: chipR, backdropFilter: "blur(10px) saturate(1.3)", WebkitBackdropFilter: "blur(10px) saturate(1.3)" }}
          >
            {sum.map((s, i) => (
              <div key={i} className="min-w-0 px-3 py-2.5" style={{ boxShadow: i ? `inset 1px 0 0 ${tint(soft, 0.35)}` : undefined }}>
                <p className={label} style={{ color: tint(text, 0.55), fontSize: 9.5 }}>
                  {s.k}
                </p>
                <p key={s.v} className={`mt-1.5 truncate text-[13px] leading-none ${s.v ? "bs-swap" : ""}`} style={{ color: s.v ? text : tint(text, 0.3) }}>
                  {s.v || "—"}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* ---- Quiz ---- */}
        <div className="flex min-w-0 flex-col px-5 pb-6 pt-6 @min-[620px]:px-0 @min-[620px]:pb-0 @min-[620px]:pt-2">
          <h3 className="text-[17px] font-medium uppercase leading-tight tracking-[0.025em] @min-[620px]:text-[19px]">
            {str(config, "heading")}
          </h3>
          {str(config, "subheading") && (
            <p className="mt-2 max-w-[420px] text-[12.5px] leading-relaxed" style={{ color: tint(text, 0.66) }}>
              {str(config, "subheading")}
            </p>
          )}

          {/* progress */}
          <div className="mt-5 grid grid-cols-3 gap-1.5" aria-hidden>
            {[str(config, "bandStep"), str(config, "cupStep"), str(config, "fitStep")].map((k, i) => (
              <div key={i}>
                <div className="h-[2px] overflow-hidden rounded-full" style={{ background: line }}>
                  <div
                    className="h-full origin-left rounded-full transition-[scale] duration-500"
                    style={{ background: text, scale: `${step > i || (onResult && i <= 2) ? 1 : step === i ? 0.42 : 0} 1`, transitionTimingFunction: EASE }}
                  />
                </div>
                <p className={`mt-2 ${label}`} style={{ color: step >= i ? text : tint(text, 0.4), fontSize: 9.5 }}>
                  {k}
                </p>
              </div>
            ))}
          </div>

          {/* step body */}
          <div className="relative mt-6 @min-[620px]:min-h-[284px]">
            <div key={step} className={dir > 0 ? "bs-step" : "bs-step-back"}>
              {step === 0 && (
                <>
                  {question(str(config, "q1"), str(config, "q1Hint"))}
                  {chips(bands, bi, "b")}
                </>
              )}
              {step === 1 && (
                <>
                  {question(str(config, "q2"), str(config, "q2Hint"))}
                  {chips(cups, ci, "c")}
                </>
              )}
              {step === 2 && (
                <>
                  {question(str(config, "q3"), "")}
                  <div role="radiogroup" className="grid gap-1.5">
                    {FITS.map((k, i) => {
                      const on = fi === i;
                      return (
                        <button
                          key={k}
                          type="button"
                          role="radio"
                          aria-checked={on}
                          onClick={() => choose("f", i)}
                          className="flex w-full items-center gap-3.5 px-3.5 py-3 text-left transition-[background-color,color,box-shadow,scale] duration-300 hover:shadow-[inset_0_0_0_1px_currentColor] active:scale-[.99]"
                          style={chip(on)}
                        >
                          <FitIcon kind={k} color={on ? bg : accent} />
                          <span className="min-w-0 flex-1">
                            <span className={`block ${label}`} style={{ fontSize: 11.5 }}>
                              {fitLabels[i]}
                            </span>
                            <span className="mt-1 block truncate text-[12px]" style={{ color: on ? tint(bg, 0.75) : tint(text, 0.6) }}>
                              {fitHints[i]}
                            </span>
                          </span>
                          <span
                            className="grid h-4 w-4 shrink-0 place-items-center rounded-full transition-colors duration-300"
                            style={{ boxShadow: `inset 0 0 0 1px ${on ? bg : tint(soft, 0.7)}` }}
                          >
                            <span className="h-2 w-2 rounded-full transition-[scale] duration-300" style={{ background: bg, scale: on ? "1" : "0", transitionTimingFunction: EASE }} />
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
              {step === 3 && done && (
                <div>
                  <p className={label} style={{ color: accent }}>
                    {str(config, "resultLabel")}
                  </p>
                  <div className="mt-2 flex items-end gap-4">
                    <span className="text-[60px] font-medium leading-[.85] tracking-[-0.03em] tabular-nums">{recSize}</span>
                    <div className="min-w-0 pb-0.5">
                      {str(config, "productLine") && (
                        <p className={label} style={{ color: tint(text, 0.55), fontSize: 9.5 }}>
                          {str(config, "productLine")}
                        </p>
                      )}
                      <p className="mt-1 truncate text-[13.5px] leading-snug" style={{ textTransform: nameCase }}>
                        {str(config, "productName")}
                      </p>
                      <p className="mt-0.5 text-[12.5px] tabular-nums">{money(price, cur)}</p>
                    </div>
                  </div>

                  {/* size scale */}
                  <div className="mt-5 flex gap-1" aria-label={`Recommended ${recSize}`}>
                    {sizes.map((s, i) => (
                      <span
                        key={s + i}
                        className={`grid h-8 min-w-0 flex-1 place-items-center text-[11px] uppercase tabular-nums tracking-[0.025em] ${i === rec ? "bs-swap" : ""}`}
                        style={{
                          borderRadius: chipR,
                          background: i === rec ? text : "transparent",
                          color: i === rec ? bg : Math.abs(i - rec) === 1 ? text : tint(text, 0.4),
                          boxShadow: i === rec ? undefined : `inset 0 0 0 1px ${line}`,
                        }}
                      >
                        {s}
                      </span>
                    ))}
                  </div>

                  <div className="mt-4 flex items-start gap-3 border-t pt-3.5" style={{ borderColor: line }}>
                    <div className="shrink-0">
                      <p className={label} style={{ color: tint(text, 0.55), fontSize: 9.5 }}>
                        {str(config, "fitsLikeLabel")}
                      </p>
                      <p className="mt-1.5 text-[15px] leading-none tabular-nums">
                        {bands[bi]}
                        {cups[ci]}
                      </p>
                    </div>
                    <p className="min-w-0 border-l pl-3 text-[12px] leading-relaxed" style={{ borderColor: line, color: tint(text, 0.72) }}>
                      {notes[fi]}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={add}
                    className="mt-4 flex h-12 w-full items-center justify-center gap-2 text-[11.5px] font-medium uppercase tracking-[0.06em] transition-[filter,scale] duration-300 hover:brightness-125 active:scale-[.99]"
                    style={{ background: text, color: bg, borderRadius: chipR, transitionTimingFunction: EASE }}
                  >
                    <span key={added ? "a" : "b"} className="bs-swap inline-flex items-center gap-2">
                      {added ? (
                        <>
                          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                            <path d="M3 8.5l3.2 3L13 4.5" />
                          </svg>
                          {str(config, "addedText")}
                        </>
                      ) : (
                        <>
                          {str(config, "buttonText")} — {recSize}
                        </>
                      )}
                    </span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* nav */}
          <div className="mt-4 flex h-6 items-center justify-between">
            <button
              type="button"
              onClick={() => go(step - 1)}
              className={`inline-flex items-center gap-1.5 ${label} transition-opacity duration-300`}
              style={{ opacity: step > 0 && !onResult ? 1 : 0, pointerEvents: step > 0 && !onResult ? "auto" : "none" }}
            >
              <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M13.5 8h-11M7 3.5L2.5 8 7 12.5" />
              </svg>
              {str(config, "backText")}
            </button>
            {onResult ? (
              <button type="button" onClick={retake} className={`inline-flex items-center gap-1.5 border-b pb-0.5 ${label}`} style={{ borderColor: text }}>
                <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M2.5 8a5.5 5.5 0 1 0 1.7-4M2.5 2.5v3.2h3.2" />
                </svg>
                {str(config, "retakeText")}
              </button>
            ) : (
              <span className={`${label} tabular-nums`} style={{ color: tint(text, 0.5) }}>
                {Math.min(step + 1, 3)} / 3
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function generateLiquid(config: TweakConfig): string {
  const { face, family } = fontFaceFor(str(config, "font", "system"));
  const S = ".bs-ff-{{ section.id }}";
  const cr = "{{ section.settings.radius | at_most: 6 }}px";
  const lbl = "font-size: 10.5px; font-weight: 500; line-height: 1; text-transform: uppercase; letter-spacing: .025em;";

  const style = `<style>
${face ? face + "\n" : ""}  ${S} { container-type: inline-size; background: {{ section.settings.bg }}; color: {{ section.settings.text_color }}; font-family: ${family}; }
  ${S} * { box-sizing: border-box; }
  ${S} p, ${S} h2, ${S} fieldset, ${S} legend { margin: 0; padding: 0; border: 0; }
  ${S} .bs-in { max-width: 1040px; margin: 0 auto; display: grid; }
  ${S} .bs-lbl { ${lbl} }
  ${S} .bs-vis { position: relative; aspect-ratio: 16 / 11; overflow: hidden; background: {{ section.settings.tile }}; }
  ${S} .bs-vis img, ${S} .bs-vis .bs-ph { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; transition: transform .9s cubic-bezier(.22,1,.36,1); }
  ${S} .bs-vis .bs-ph { fill: {{ section.settings.soft }}; }
  ${S}.is-done .bs-vis img { transform: scale(1.04); }
  ${S} .bs-tag { position: absolute; left: 12px; top: 12px; display: inline-flex; align-items: center; gap: 6px; padding: 7px 10px; border-radius: ${cr};
    background: color-mix(in srgb, {{ section.settings.bg }} 88%, transparent); -webkit-backdrop-filter: blur(8px); backdrop-filter: blur(8px); transition: background-color .4s, color .4s; }
  ${S} .bs-tag::before { content: ""; width: 5px; height: 5px; border-radius: 99px; background: {{ section.settings.accent }}; }
  ${S}.is-done .bs-tag { background: {{ section.settings.text_color }}; color: {{ section.settings.bg }}; }
  ${S}.is-done .bs-tag::before { background: currentColor; }
  ${S} .bs-sum { position: absolute; left: 12px; right: 12px; bottom: 12px; display: grid; grid-template-columns: repeat(3, 1fr); border-radius: ${cr}; overflow: hidden;
    background: color-mix(in srgb, {{ section.settings.bg }} 84%, transparent); -webkit-backdrop-filter: blur(10px) saturate(1.3); backdrop-filter: blur(10px) saturate(1.3); }
  ${S} .bs-sum > div { min-width: 0; padding: 10px 12px; }
  ${S} .bs-sum > div + div { box-shadow: inset 1px 0 0 color-mix(in srgb, {{ section.settings.soft }} 35%, transparent); }
  ${S} .bs-sum .bs-lbl { font-size: 9.5px; opacity: .55; }
  ${S} .bs-sum-v { margin-top: 6px; font-size: 13px; line-height: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  ${S} .bs-sum-v:empty::before { content: "—"; opacity: .3; }
  ${S} .bs-q { min-width: 0; display: flex; flex-direction: column; padding: 24px 20px; }
  ${S} .bs-h { font-size: 17px; font-weight: 500; line-height: 1.25; text-transform: uppercase; letter-spacing: .025em; }
  ${S} .bs-sh { margin-top: 8px; max-width: 420px; font-size: 12.5px; line-height: 1.6; opacity: .66; }
  ${S} .bs-prog { margin-top: 20px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }
  ${S} .bs-bar { height: 2px; border-radius: 99px; overflow: hidden; background: {{ section.settings.line }}; }
  ${S} .bs-bar i { display: block; height: 100%; border-radius: 99px; background: {{ section.settings.text_color }}; transform: scaleX(0); transform-origin: left; transition: transform .5s cubic-bezier(.22,1,.36,1); }
  ${S} .bs-seg .bs-lbl { margin-top: 8px; font-size: 9.5px; opacity: .4; transition: opacity .3s; }
  ${S} .bs-seg.is-on .bs-lbl, ${S} .bs-seg.is-past .bs-lbl { opacity: 1; }
  ${S} .bs-seg.is-on .bs-bar i { transform: scaleX(.42); }
  ${S} .bs-seg.is-past .bs-bar i { transform: scaleX(1); }
  ${S} .bs-body { position: relative; margin-top: 24px; }
  ${S} .bs-step { display: none; }
  ${S} .bs-step.is-on { display: block; animation: bsFfIn .4s cubic-bezier(.22,1,.36,1) both; }
  @keyframes bsFfIn { from { opacity: 0; transform: translateX(14px); filter: blur(3px); } }
  ${S} .bs-qt { font-size: 15px; line-height: 1.35; }
  ${S} .bs-qh { margin-top: 4px; font-size: 12px; line-height: 1.4; opacity: .6; }
  ${S} .bs-head { margin-bottom: 16px; }
  ${S} .bs-chips { display: grid; grid-template-columns: repeat(auto-fit, minmax(42px, 1fr)); gap: 6px; }
  ${S} .bs-chip, ${S} .bs-fit { position: relative; cursor: pointer; border-radius: ${cr};
    box-shadow: inset 0 0 0 1px color-mix(in srgb, {{ section.settings.soft }} 45%, transparent); transition: background-color .3s, color .3s, box-shadow .3s, transform .2s; }
  ${S} .bs-chip { display: grid; place-items: center; height: 44px; font-size: 13px; font-variant-numeric: tabular-nums; }
  ${S} .bs-chip input, ${S} .bs-fit input { position: absolute; opacity: 0; pointer-events: none; }
  ${S} .bs-chip:hover, ${S} .bs-fit:hover { box-shadow: inset 0 0 0 1px currentColor; }
  ${S} .bs-chip:active { transform: scale(.96); }
  ${S} .bs-chip:has(input:checked), ${S} .bs-fit:has(input:checked) { background: {{ section.settings.text_color }}; color: {{ section.settings.bg }}; box-shadow: inset 0 0 0 1px {{ section.settings.text_color }}; }
  ${S} .bs-chip:has(input:focus-visible), ${S} .bs-fit:has(input:focus-visible) { outline: 2px solid {{ section.settings.text_color }}; outline-offset: 2px; }
  ${S} .bs-fits { display: grid; gap: 6px; }
  ${S} .bs-fit { display: flex; align-items: center; gap: 14px; padding: 12px 14px; }
  ${S} .bs-fit svg { flex-shrink: 0; color: {{ section.settings.accent }}; }
  ${S} .bs-fit:has(input:checked) svg { color: inherit; }
  ${S} .bs-fit-t { display: block; ${lbl} font-size: 11.5px; }
  ${S} .bs-fit-h { display: block; margin-top: 4px; font-size: 12px; opacity: .62; }
  ${S} .bs-fit-x { flex: 1; min-width: 0; }
  ${S} .bs-dot { width: 16px; height: 16px; flex-shrink: 0; border-radius: 99px; display: grid; place-items: center; box-shadow: inset 0 0 0 1px color-mix(in srgb, {{ section.settings.soft }} 70%, transparent); }
  ${S} .bs-dot::after { content: ""; width: 8px; height: 8px; border-radius: 99px; background: {{ section.settings.bg }}; transform: scale(0); transition: transform .3s cubic-bezier(.22,1,.36,1); }
  ${S} .bs-fit:has(input:checked) .bs-dot { box-shadow: inset 0 0 0 1px {{ section.settings.bg }}; }
  ${S} .bs-fit:has(input:checked) .bs-dot::after { transform: scale(1); }
  ${S} .bs-res-top { margin-top: 8px; display: flex; align-items: flex-end; gap: 16px; }
  ${S} .bs-big { font-size: 60px; font-weight: 500; line-height: .85; letter-spacing: -.03em; font-variant-numeric: tabular-nums; }
  ${S} .bs-pline { font-size: 9.5px; opacity: .55; }
  ${S} .bs-pname { margin-top: 4px; font-size: 13.5px; line-height: 1.35; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  ${S} .bs-pname.is-lower { text-transform: lowercase; }
  ${S} .bs-price { margin-top: 2px; font-size: 12.5px; font-variant-numeric: tabular-nums; }
  ${S} .bs-scale { margin-top: 20px; display: flex; gap: 4px; }
  ${S} .bs-scale span { flex: 1; min-width: 0; height: 32px; display: grid; place-items: center; border-radius: ${cr}; font-size: 11px; text-transform: uppercase; letter-spacing: .025em;
    box-shadow: inset 0 0 0 1px {{ section.settings.line }}; opacity: .4; transition: background-color .4s, color .4s, opacity .4s; }
  ${S} .bs-scale span.is-near { opacity: 1; }
  ${S} .bs-scale span.is-rec { opacity: 1; background: {{ section.settings.text_color }}; color: {{ section.settings.bg }}; box-shadow: none; }
  ${S} .bs-like { margin-top: 16px; padding-top: 14px; display: flex; align-items: flex-start; gap: 12px; border-top: 1px solid {{ section.settings.line }}; }
  ${S} .bs-like-v { margin-top: 6px; font-size: 15px; line-height: 1; font-variant-numeric: tabular-nums; }
  ${S} .bs-note { min-width: 0; padding-left: 12px; border-left: 1px solid {{ section.settings.line }}; font-size: 12px; line-height: 1.6; opacity: .72; }
  ${S} .bs-form { margin: 16px 0 0; }
  ${S} .bs-atc { width: 100%; height: 48px; border: 0; border-radius: ${cr}; cursor: pointer; font: inherit; display: flex; align-items: center; justify-content: center; gap: 8px;
    font-size: 11.5px; font-weight: 500; text-transform: uppercase; letter-spacing: .06em; text-decoration: none;
    background: {{ section.settings.text_color }}; color: {{ section.settings.bg }}; transition: filter .3s, transform .2s; }
  ${S} .bs-atc:hover { filter: brightness(1.25); }
  ${S} .bs-atc:active { transform: scale(.99); }
  ${S} .bs-atc:disabled { opacity: .45; cursor: not-allowed; }
  ${S} .bs-nav { margin-top: 16px; height: 24px; display: flex; align-items: center; justify-content: space-between; }
  ${S} .bs-nav button { display: inline-flex; align-items: center; gap: 6px; padding: 0; border: 0; background: none; color: inherit; cursor: pointer; font: inherit; ${lbl} }
  ${S} .bs-nav [data-back][hidden] { visibility: hidden; }
  ${S} .bs-nav [data-retake][hidden] { display: none; }
  ${S} .bs-retake { padding-bottom: 2px !important; border-bottom: 1px solid currentColor !important; }
  ${S} .bs-count { opacity: .5; font-variant-numeric: tabular-nums; }
  @container (min-width: 620px) {
    ${S} .bs-in { grid-template-columns: minmax(0, 1fr) minmax(0, 1.08fr); gap: 40px; padding: 32px; }
    ${S} .bs-vis { aspect-ratio: auto; min-height: 480px; border-radius: {{ section.settings.radius }}px; }
    ${S} .bs-q { padding: 8px 0 0; }
    ${S} .bs-h { font-size: 19px; }
    ${S} .bs-body { min-height: 284px; }
  }
  @container (min-width: 880px) { ${S} .bs-in { padding: 40px; } }
  @media (prefers-reduced-motion: reduce) { ${S} * { transition-duration: 1ms !important; animation-duration: 1ms !important; } }
</style>`;

  const arrowBack = `<svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M13.5 8h-11M7 3.5L2.5 8 7 12.5"/></svg>`;
  const retakeIcon = `<svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2.5 8a5.5 5.5 0 1 0 1.7-4M2.5 2.5v3.2h3.2"/></svg>`;
  const fitIcons: Record<FitKey, string> = {
    tight: `<rect x="9" y="8" width="16" height="6" rx="3"/><path d="M1.5 11h5M4.5 9l2 2-2 2"/><path d="M32.5 11h-5M29.5 9l-2 2 2 2"/>`,
    right: `<rect x="7" y="8" width="20" height="6" rx="3"/><path d="M13.5 11l2.4 2.2 4.6-4.6"/>`,
    loose: `<rect x="5" y="8" width="24" height="6" rx="3"/><path d="M3.5 11h-2.5M2.5 9.4L1 11l1.5 1.6"/><path d="M30.5 11h2.5M31.5 9.4L33 11l-1.5 1.6"/>`,
  };
  const fitRow = (k: FitKey) =>
    `<label class="bs-fit">
                <input type="radio" name="bs-ff-fit-{{ section.id }}" value="${k}" data-fit>
                <svg width="34" height="22" viewBox="0 0 34 22" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${fitIcons[k]}</svg>
                <span class="bs-fit-x"><span class="bs-fit-t" data-fit-label>{{ section.settings.${k}_label }}</span><span class="bs-fit-h">{{ section.settings.${k}_hint }}</span></span>
                <span class="bs-dot" aria-hidden="true"></span>
              </label>`;

  const markup = `{%- comment -%}
  Fit Finder by boost.supply. Add it to your product template (or pick a
  product below to use it anywhere).
  - Sizes come from your product's size option. Set "Size option name" to the
    exact option name on your product (for example "Size").
  - Band and cup sizes are comma-separated lists. The recommendation weighs the
    band more than the cup, then goes one size up for "tight" and one down for
    "loose", across your product's own size list.
  - "Add in your size" adds the variant in the recommended size, keeping the
    product's currently selected colour where possible.
{%- endcomment -%}
{%- liquid
  assign bs_p = product
  if section.settings.product != blank
    assign bs_p = section.settings.product
  endif
  assign bs_si = -1
  assign bs_size = nil
  if bs_p != blank
    assign bs_v = bs_p.selected_or_first_available_variant
    assign bs_key = section.settings.size_option | downcase | strip
    for bs_o in bs_p.options_with_values
      assign bs_on = bs_o.name | downcase | strip
      if bs_on == bs_key
        assign bs_size = bs_o
        assign bs_si = bs_o.position | minus: 1
      endif
    endfor
  endif
  assign bs_img = section.settings.image
  if bs_img == blank and bs_p != blank
    assign bs_img = bs_p.featured_media
  endif
  assign bs_bands = section.settings.bands | split: ','
  assign bs_cups = section.settings.cups | split: ','
-%}
{%- capture bs_sizes_csv -%}
  {%- if bs_size -%}
    {%- for bs_val in bs_size.values -%}{{ bs_val }}{%- unless forloop.last -%}|{%- endunless -%}{%- endfor -%}
  {%- else -%}
    {{- section.settings.fallback_sizes | split: ',' | join: '|' -}}
  {%- endif -%}
{%- endcapture -%}
{%- assign bs_sizes = bs_sizes_csv | split: '|' -%}
<div class="bs-ff-{{ section.id }}" id="bs-ff-{{ section.id }}" data-si="{{ bs_si }}">
  <div class="bs-in">
    <div class="bs-vis">
      {%- if bs_img != blank -%}
        {{ bs_img | image_url: width: 1200 | image_tag: loading: 'lazy', alt: bs_p.title, sizes: '(min-width: 990px) 480px, 100vw' }}
      {%- else -%}
        {{ 'product-apparel-1' | placeholder_svg_tag: 'bs-ph' }}
      {%- endif -%}
      <span class="bs-tag bs-lbl" data-tag>{{ section.settings.eyebrow }}</span>
      <div class="bs-sum" aria-live="polite">
        <div><p class="bs-lbl">{{ section.settings.band_step }}</p><p class="bs-sum-v" data-sum="b"></p></div>
        <div><p class="bs-lbl">{{ section.settings.cup_step }}</p><p class="bs-sum-v" data-sum="c"></p></div>
        <div><p class="bs-lbl">{{ section.settings.fit_step }}</p><p class="bs-sum-v" data-sum="f"></p></div>
      </div>
    </div>

    <div class="bs-q">
      <h2 class="bs-h">{{ section.settings.heading }}</h2>
      {%- if section.settings.subheading != blank -%}<p class="bs-sh">{{ section.settings.subheading }}</p>{%- endif -%}

      <div class="bs-prog" aria-hidden="true">
        <div class="bs-seg is-on" data-seg><div class="bs-bar"><i></i></div><p class="bs-lbl">{{ section.settings.band_step }}</p></div>
        <div class="bs-seg" data-seg><div class="bs-bar"><i></i></div><p class="bs-lbl">{{ section.settings.cup_step }}</p></div>
        <div class="bs-seg" data-seg><div class="bs-bar"><i></i></div><p class="bs-lbl">{{ section.settings.fit_step }}</p></div>
      </div>

      <div class="bs-body">
        <fieldset class="bs-step is-on" data-step>
          <legend class="bs-head"><span class="bs-qt" style="display:block">{{ section.settings.q1 }}</span>{%- if section.settings.q1_hint != blank -%}<span class="bs-qh" style="display:block">{{ section.settings.q1_hint }}</span>{%- endif -%}</legend>
          <div class="bs-chips">
            {%- for bs_b in bs_bands -%}
              {%- assign bs_t = bs_b | strip -%}
              {%- if bs_t != blank -%}
                <label class="bs-chip"><input type="radio" name="bs-ff-band-{{ section.id }}" value="{{ bs_t | escape }}" data-band><span>{{ bs_t }}</span></label>
              {%- endif -%}
            {%- endfor -%}
          </div>
        </fieldset>

        <fieldset class="bs-step" data-step>
          <legend class="bs-head"><span class="bs-qt" style="display:block">{{ section.settings.q2 }}</span>{%- if section.settings.q2_hint != blank -%}<span class="bs-qh" style="display:block">{{ section.settings.q2_hint }}</span>{%- endif -%}</legend>
          <div class="bs-chips">
            {%- for bs_c in bs_cups -%}
              {%- assign bs_t = bs_c | strip -%}
              {%- if bs_t != blank -%}
                <label class="bs-chip"><input type="radio" name="bs-ff-cup-{{ section.id }}" value="{{ bs_t | escape }}" data-cup><span>{{ bs_t }}</span></label>
              {%- endif -%}
            {%- endfor -%}
          </div>
        </fieldset>

        <fieldset class="bs-step" data-step>
          <legend class="bs-head"><span class="bs-qt" style="display:block">{{ section.settings.q3 }}</span></legend>
          <div class="bs-fits">
            ${fitRow("tight")}
            ${fitRow("right")}
            ${fitRow("loose")}
          </div>
        </fieldset>

        <div class="bs-step" data-step aria-live="polite">
          <p class="bs-lbl" style="color: {{ section.settings.accent }}">{{ section.settings.result_label }}</p>
          <div class="bs-res-top">
            <span class="bs-big" data-big></span>
            {%- if bs_p != blank -%}
              <div style="min-width:0;padding-bottom:2px">
                {%- if section.settings.product_line != blank -%}<p class="bs-lbl bs-pline">{{ section.settings.product_line }}</p>{%- endif -%}
                <p class="bs-pname{% if section.settings.lowercase_name %} is-lower{% endif %}">{{ bs_p.title }}</p>
                <p class="bs-price" data-price>{{ bs_v.price | money }}</p>
              </div>
            {%- endif -%}
          </div>
          <div class="bs-scale" data-scale>
            {%- for bs_s in bs_sizes -%}
              {%- assign bs_t = bs_s | strip -%}
              {%- if bs_t != blank -%}<span data-size="{{ bs_t | escape }}">{{ bs_t }}</span>{%- endif -%}
            {%- endfor -%}
          </div>
          <div class="bs-like">
            <div style="flex-shrink:0">
              <p class="bs-lbl" style="font-size:9.5px;opacity:.55">{{ section.settings.fits_like_label }}</p>
              <p class="bs-like-v" data-like></p>
            </div>
            <p class="bs-note" data-note></p>
          </div>
          {%- if bs_p != blank -%}
            {%- if bs_size -%}
              {%- form 'product', bs_p, class: 'bs-form' -%}
                <input type="hidden" name="id" value="{{ bs_v.id }}" data-id>
                <button type="submit" name="add" class="bs-atc" data-atc>
                  <span data-atc-label>{{ section.settings.button_text }}</span><span aria-hidden="true">—</span><span data-atc-size></span>
                </button>
              {%- endform -%}
            {%- else -%}
              <div class="bs-form"><a class="bs-atc" href="{{ bs_p.url }}">{{ section.settings.button_text }}</a></div>
            {%- endif -%}
          {%- endif -%}
        </div>
      </div>

      <div class="bs-nav">
        <button type="button" data-back hidden>${arrowBack}{{ section.settings.back_text }}</button>
        <span class="bs-lbl bs-count" data-count>1 / 3</span>
        <button type="button" class="bs-retake" data-retake hidden>${retakeIcon}{{ section.settings.retake_text }}</button>
      </div>
    </div>
  </div>
  {%- if bs_p != blank -%}
    <script type="application/json" data-variants>{{ bs_p.variants | json }}</script>
    <script type="application/json" data-current>{{ bs_v | json }}</script>
  {%- endif -%}
</div>
<script>
  (function () {
    var root = document.getElementById('bs-ff-{{ section.id }}');
    if (!root) return;
    function $(s) { return root.querySelector(s); }
    function all(s) { return Array.prototype.slice.call(root.querySelectorAll(s)); }
    function json(s) { var el = $(s); if (!el) return null; try { return JSON.parse(el.textContent); } catch (e) { return null; } }
    var variants = json('[data-variants]') || [];
    var base = json('[data-current]');
    var si = parseInt(root.getAttribute('data-si'), 10);
    var T = {
      eyebrow: {{ section.settings.eyebrow | json }},
      label: {{ section.settings.result_label | json }},
      add: {{ section.settings.button_text | json }},
      out: {{ section.settings.sold_out_text | json }},
      notes: { tight: {{ section.settings.note_tight | json }}, right: {{ section.settings.note_right | json }}, loose: {{ section.settings.note_loose | json }} }
    };
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
    var steps = all('[data-step]'), segs = all('[data-seg]');
    var bands = all('[data-band]'), cups = all('[data-cup]'), fits = all('[data-fit]');
    var sizes = all('[data-scale] [data-size]');
    var back = $('[data-back]'), retake = $('[data-retake]'), count = $('[data-count]');
    var step = 0, timer = null;
    function checked(list) { for (var i = 0; i < list.length; i++) { if (list[i].checked) return i; } return -1; }
    function summary() {
      var b = checked(bands), c = checked(cups), f = checked(fits);
      $('[data-sum="b"]').textContent = b > -1 ? bands[b].value : '';
      $('[data-sum="c"]').textContent = c > -1 ? cups[c].value : '';
      $('[data-sum="f"]').textContent = f > -1 ? fits[f].parentNode.querySelector('[data-fit-label]').textContent : '';
    }
    function pickAvail(list) { for (var i = 0; i < list.length; i++) { if (list[i].available) return list[i]; } return null; }
    function variantFor(size) {
      if (si < 0) return null;
      var cands = variants.filter(function (v) { return v.options[si] === size; });
      var same = cands.filter(function (v) {
        return base && v.options.every(function (o, k) { return k === si || o === base.options[k]; });
      });
      return pickAvail(same) || pickAvail(cands) || same[0] || cands[0] || null;
    }
    function result() {
      var b = checked(bands), c = checked(cups), f = checked(fits);
      if (b < 0 || c < 0 || f < 0 || !sizes.length) return;
      var fit = fits[f].value;
      var nb = bands.length, nc = cups.length, ns = sizes.length;
      var pb = nb > 1 ? b / (nb - 1) : 0.5, pc = nc > 1 ? c / (nc - 1) : 0.5;
      var shift = fit === 'tight' ? 1 : fit === 'loose' ? -1 : 0;
      var idx = Math.max(0, Math.min(ns - 1, Math.round((pb * 0.7 + pc * 0.3) * (ns - 1)) + shift));
      var size = sizes[idx].getAttribute('data-size');
      sizes.forEach(function (el, i) {
        el.classList.toggle('is-rec', i === idx);
        el.classList.toggle('is-near', Math.abs(i - idx) === 1);
      });
      $('[data-big]').textContent = size;
      $('[data-like]').textContent = bands[b].value + cups[c].value;
      $('[data-note]').textContent = T.notes[fit] || '';
      $('[data-tag]').textContent = T.label + ' · ' + size;
      var v = variantFor(size);
      var atc = $('[data-atc]');
      if (atc) {
        $('[data-atc-size]').textContent = size;
        if (v) {
          $('[data-id]').value = v.id;
          var price = $('[data-price]');
          if (price) price.textContent = money(v.price);
        }
        atc.disabled = !v || !v.available;
        $('[data-atc-label]').textContent = v && v.available ? T.add : T.out;
      }
    }
    function go(n) {
      step = Math.max(0, Math.min(3, n));
      steps.forEach(function (el, i) { el.classList.toggle('is-on', i === step); });
      segs.forEach(function (el, i) {
        el.classList.toggle('is-on', i === step);
        el.classList.toggle('is-past', i < step);
      });
      root.classList.toggle('is-done', step === 3);
      if (step === 3) result(); else $('[data-tag]').textContent = T.eyebrow;
      back.hidden = step === 0 || step === 3;
      retake.hidden = step !== 3;
      count.hidden = step === 3;
      count.textContent = (step + 1) + ' / 3';
    }
    function onPick() {
      summary();
      clearTimeout(timer);
      timer = setTimeout(function () { go(step + 1); }, 320);
    }
    bands.concat(cups, fits).forEach(function (el) { el.addEventListener('change', onPick); });
    back.addEventListener('click', function () { clearTimeout(timer); go(step - 1); });
    retake.addEventListener('click', function () {
      bands.concat(cups, fits).forEach(function (el) { el.checked = false; });
      summary();
      go(0);
    });
    summary();
  })();
</script>`;

  const fitKeys = (k: FitKey, cap: string) => [
    { type: "text" as const, id: `${k}_label`, label: `${cap} label`, default: str(config, `${k}Label`) },
    { type: "text" as const, id: `${k}_hint`, label: `${cap} hint`, default: str(config, `${k}Hint`) },
  ];

  const schema = buildSchema({
    name: "Fit Finder",
    settings: [
      { type: "product", id: "product", label: "Product", info: "Leave empty on a product template to use that product" },
      { type: "text", id: "size_option", label: "Size option name", default: "Size" },
      { type: "text", id: "fallback_sizes", label: "Sizes (when the product has no size option)", default: str(config, "sizes") },
      { type: "image_picker", id: "image", label: "Image", info: "Optional. Defaults to the product's featured image" },
      { type: "text", id: "product_line", label: "Product line", default: str(config, "productLine") },
      { type: "checkbox", id: "lowercase_name", label: "Lowercase product name", default: bool(config, "lowercaseName", true) },
      { type: "header", content: "Intro" },
      { type: "text", id: "eyebrow", label: "Photo tag", default: str(config, "eyebrow") },
      { type: "text", id: "heading", label: "Heading", default: str(config, "heading") },
      { type: "textarea", id: "subheading", label: "Subheading", default: str(config, "subheading") },
      { type: "text", id: "band_step", label: "Step label: band", default: str(config, "bandStep") },
      { type: "text", id: "cup_step", label: "Step label: cup", default: str(config, "cupStep") },
      { type: "text", id: "fit_step", label: "Step label: fit", default: str(config, "fitStep") },
      { type: "header", content: "Step 1: band" },
      { type: "text", id: "q1", label: "Question", default: str(config, "q1") },
      { type: "text", id: "q1_hint", label: "Hint", default: str(config, "q1Hint") },
      { type: "text", id: "bands", label: "Band sizes (comma separated)", default: str(config, "bands") },
      { type: "header", content: "Step 2: cup" },
      { type: "text", id: "q2", label: "Question", default: str(config, "q2") },
      { type: "text", id: "q2_hint", label: "Hint", default: str(config, "q2Hint") },
      { type: "text", id: "cups", label: "Cup sizes (comma separated)", default: str(config, "cups") },
      { type: "header", content: "Step 3: fit" },
      { type: "text", id: "q3", label: "Question", default: str(config, "q3") },
      ...fitKeys("tight", "Tight"),
      ...fitKeys("right", "Just right"),
      ...fitKeys("loose", "Loose"),
      { type: "header", content: "Result" },
      { type: "text", id: "result_label", label: "Result label", default: str(config, "resultLabel") },
      { type: "text", id: "fits_like_label", label: "Fits like label", default: str(config, "fitsLikeLabel") },
      { type: "text", id: "note_tight", label: "Note after \"tight\"", default: str(config, "noteTight") },
      { type: "text", id: "note_right", label: "Note after \"just right\"", default: str(config, "noteRight") },
      { type: "text", id: "note_loose", label: "Note after \"loose\"", default: str(config, "noteLoose") },
      { type: "text", id: "button_text", label: "Button text", default: str(config, "buttonText") },
      { type: "text", id: "sold_out_text", label: "Sold out text", default: "Sold out in this size" },
      { type: "text", id: "back_text", label: "Back link", default: str(config, "backText") },
      { type: "text", id: "retake_text", label: "Retake link", default: str(config, "retakeText") },
      { type: "header", content: "Style" },
      { type: "color", id: "text_color", label: "Text & button", default: str(config, "textColor") },
      { type: "color", id: "accent", label: "Accent", default: str(config, "accent") },
      { type: "color", id: "soft", label: "Soft (chip borders)", default: str(config, "soft") },
      { type: "color", id: "line", label: "Lines", default: str(config, "line") },
      { type: "color", id: "tile", label: "Image background", default: str(config, "tile") },
      { type: "color", id: "bg", label: "Background", default: str(config, "bg") },
      { type: "range", id: "radius", label: "Corner radius", min: 0, max: 20, step: 2, unit: "px", default: Math.max(0, Math.min(20, Math.round(num(config, "radius", 4) / 2) * 2)) },
    ],
  });

  return section({ style, markup, schema });
}

export const fitFinder: Tweak = {
  slug: "fit-finder",
  inspiredBy: "skims",
  name: "Fit Finder",
  tagline: "A three-tap size quiz that ends on the right size, ready to add to bag.",
  description:
    "Modeled on the size quiz SKIMS uses on its bra pages. Shoppers tap their usual band size, their cup size and how bras usually fit them, and land on a recommended size card: the size large, the full size scale with theirs highlighted, a \"fits like\" note and an add-to-bag button in that size. The photo keeps a running summary of their answers. In Shopify the sizes come from your product's size option, the recommendation runs in a few lines of inline JS and the button adds the matching variant.",
  category: "product-page",
  tier: "free",
  tint: "#f3eee8",
  Preview,
  generateLiquid,
  defaults,
  fields: [
    { key: "eyebrow", label: "Photo tag", type: "text", group: "Content" },
    { key: "heading", label: "Heading", type: "text", group: "Content" },
    { key: "subheading", label: "Subheading", type: "textarea", group: "Content" },
    { key: "productLine", label: "Product line", type: "text", group: "Product", hint: "Preview only, with the name and price below. Your store shows the real product" },
    { key: "productName", label: "Product name", type: "text", group: "Product" },
    { key: "price", label: "Price", type: "text", group: "Product" },
    { key: "currency", label: "Currency symbol", type: "text", group: "Product" },
    { key: "lowercaseName", label: "Lowercase product name", type: "toggle", group: "Product" },
    { key: "image", label: "Image URL", type: "text", group: "Media", hint: "Editor preview only. In Shopify it uses the product's featured image or the image you pick. Leave empty to hide the photo", placeholder: "https://…" },
    { key: "sizes", label: "Sizes", type: "text", group: "Sizes", hint: "Comma separated, smallest first. In Shopify these come from the product's size option" },
    { key: "bands", label: "Band sizes", type: "text", group: "Sizes", hint: "Comma separated, smallest first" },
    { key: "cups", label: "Cup sizes", type: "text", group: "Sizes", hint: "Comma separated, smallest first" },
    { key: "bandStep", label: "Step label: band", type: "text", group: "Questions" },
    { key: "cupStep", label: "Step label: cup", type: "text", group: "Questions" },
    { key: "fitStep", label: "Step label: fit", type: "text", group: "Questions" },
    { key: "q1", label: "Step 1 question", type: "text", group: "Questions" },
    { key: "q1Hint", label: "Step 1 hint", type: "text", group: "Questions" },
    { key: "q2", label: "Step 2 question", type: "text", group: "Questions" },
    { key: "q2Hint", label: "Step 2 hint", type: "text", group: "Questions" },
    { key: "q3", label: "Step 3 question", type: "text", group: "Questions" },
    { key: "tightLabel", label: "Tight", type: "text", group: "Fit answers" },
    { key: "tightHint", label: "Tight hint", type: "text", group: "Fit answers" },
    { key: "rightLabel", label: "Just right", type: "text", group: "Fit answers" },
    { key: "rightHint", label: "Just right hint", type: "text", group: "Fit answers" },
    { key: "looseLabel", label: "Loose", type: "text", group: "Fit answers" },
    { key: "looseHint", label: "Loose hint", type: "text", group: "Fit answers" },
    { key: "resultLabel", label: "Result label", type: "text", group: "Result" },
    { key: "fitsLikeLabel", label: "Fits like label", type: "text", group: "Result" },
    { key: "noteTight", label: "Note after tight", type: "text", group: "Result" },
    { key: "noteRight", label: "Note after just right", type: "text", group: "Result" },
    { key: "noteLoose", label: "Note after loose", type: "text", group: "Result" },
    { key: "buttonText", label: "Button text", type: "text", group: "Result" },
    { key: "addedText", label: "Added text", type: "text", group: "Result", hint: "Preview only. In your store the theme's cart opens" },
    { key: "backText", label: "Back link", type: "text", group: "Result" },
    { key: "retakeText", label: "Retake link", type: "text", group: "Result" },
    {
      key: "startStep", label: "Preview step", type: "select", group: "Layout",
      hint: "Which step the preview opens on. Your store always starts at step 1",
      options: [
        { label: "1 · Band", value: "band" },
        { label: "2 · Cup", value: "cup" },
        { label: "3 · Fit", value: "fit" },
        { label: "Result", value: "result" },
      ],
    },
    { key: "radius", label: "Corner radius", type: "slider", group: "Layout", min: 0, max: 20, step: 2, unit: "px" },
    fontField("Typography"),
    { key: "textColor", label: "Text & button", type: "color", group: "Colors" },
    { key: "accent", label: "Accent", type: "color", group: "Colors" },
    { key: "soft", label: "Soft", type: "color", group: "Colors" },
    { key: "line", label: "Lines", type: "color", group: "Colors" },
    { key: "tile", label: "Image background", type: "color", group: "Colors" },
    { key: "bg", label: "Background", type: "color", group: "Colors" },
  ],
};
