"use client";

import { useEffect, useState, type CSSProperties } from "react";
import type { Tweak, TweakConfig } from "../types";
import { str, num, list, fontStack, esc } from "../cfg";
import { fontField } from "../fields";
import { buildSchema, section, fontFaceFor } from "../liquid";
import { money, toNum } from "./product-art";

/* ============================================================
   Flavor Quiz
   Three playful questions (vibe, sweetness, fruity or classic)
   answered with big colourful tiles. Every answer points at a
   flavour; the flavour with the most points wins and is revealed
   as a match card with its photo, a "93% match" sticker, the
   answers that led there, an add-to-cart button and a retake.
   ============================================================ */

const EASE = "cubic-bezier(.22,1,.36,1)";
const LETTERS = ["A", "B", "C", "D"];

const DISPLAY_FONTS: Record<string, { family: string; italic: boolean; weight: number }> = {
  retro: { family: "Georgia, 'Iowan Old Style', 'Palatino Linotype', serif", italic: true, weight: 700 },
  serif: { family: "Georgia, 'Iowan Old Style', 'Palatino Linotype', serif", italic: false, weight: 700 },
  sans: { family: "ui-sans-serif, system-ui, -apple-system, sans-serif", italic: false, weight: 800 },
  inherit: { family: "inherit", italic: false, weight: 700 },
};

const ARROW_SVG = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 8h10M9 4l4 4-4 4"/></svg>`;
const BACK_SVG = `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M13 8H3M7 4L3 8l4 4"/></svg>`;
const RETAKE_SVG = `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2.5 8a5.5 5.5 0 1 0 1.7-4"/><path d="M2.5 2.5v3h3"/></svg>`;

const defaults: TweakConfig = {
  eyebrow: "Flavor finder",
  heading: "Find your flavor match",
  subheading: "Three quick questions, one can made for you.",
  questions: [
    { question: "Pick a vibe", a1: "Garden party", m1: "1", a2: "Sunny afternoon", m2: "2", a3: "Night out", m3: "3", a4: "", m4: "" },
    { question: "How sweet do you like it?", a1: "Softly sweet", m1: "1", a2: "Just a hint", m2: "2", a3: "Rich and bold", m3: "3", a4: "", m4: "" },
    { question: "Fruity or classic?", a1: "Juicy berries", m1: "1", a2: "Bright citrus", m2: "2", a3: "Soda-shop classic", m3: "3", a4: "", m4: "" },
  ],
  flavors: [
    { name: "Strawberry Vanilla", color: "#F59AA5", image: "/mockups/soda-strawberry.jpg", description: "Ripe berries with a soft vanilla finish. Sweet, never sticky.", price: "35.99" },
    { name: "Orange Cream", color: "#FB9108", image: "/mockups/soda-orange.jpg", description: "Zesty orange over a creamy float. Bright, sunny and light.", price: "35.99" },
    { name: "Black Cherry", color: "#7A1F2A", image: "/mockups/soda-cherry.jpg", description: "Deep, dark cherry with a hint of vanilla bean. Bold and smooth.", price: "35.99" },
  ],
  stepLabel: "Question {n} of {total}",
  backLabel: "Back",
  resultEyebrow: "Your match",
  matchLabel: "match",
  becauseLabel: "Because you picked",
  buttonText: "Add 12 pack",
  addedText: "Added",
  retakeLabel: "Retake quiz",
  currency: "$",
  startOn: "quiz",
  bg: "#FFF6EA",
  textColor: "#034638",
  lightText: "#FFF6EA",
  panelBg: "#F3E4CD",
  mint: "#98E1C3",
  buttonBg: "#034638",
  buttonText2: "#FFF6EA",
  font: "system",
  displayFont: "retro",
  radius: 24,
};

/* ---- helpers ---- */

const parseHex = (hex: string): [number, number, number] | null => {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex).trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

const brightness = (hex: string) => {
  const c = parseHex(hex);
  return c ? (c[0] * 299 + c[1] * 587 + c[2] * 114) / 1000 : 255;
};

const alpha = (hex: string, a: number) => {
  const c = parseHex(hex);
  return c ? `rgba(${c[0]},${c[1]},${c[2]},${a})` : hex;
};

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const fillStep = (tpl: string, n: number, total: number) =>
  tpl.split("{n}").join(String(n)).split("{total}").join(String(total));

/** Score answers: most votes wins, ties go to the most recent pick. */
const score = (picks: number[], flavorCount: number, questions: number) => {
  const pts = Array.from({ length: flavorCount }, () => 0);
  const last = Array.from({ length: flavorCount }, () => -1);
  picks.forEach((m, qi) => {
    if (m >= 0 && m < flavorCount) {
      pts[m]++;
      last[m] = qi;
    }
  });
  let win = 0;
  pts.forEach((p, i) => {
    if (p > pts[win] || (p === pts[win] && last[i] > last[win])) win = i;
  });
  return { win, pct: Math.round(76 + 17 * (pts[win] / Math.max(1, questions))) };
};

function Svg({ html, className = "" }: { html: string; className?: string }) {
  return <span aria-hidden className={`block [&_svg]:block ${className}`} dangerouslySetInnerHTML={{ __html: html }} />;
}

function Preview({ config }: { config: TweakConfig }) {
  const cur = str(config, "currency", "$");
  const bg = str(config, "bg", "#FFF6EA");
  const ink = str(config, "textColor", "#034638");
  const light = str(config, "lightText", "#FFF6EA");
  const panel = str(config, "panelBg", "#F3E4CD");
  const mint = str(config, "mint", "#98E1C3");
  const btnBg = str(config, "buttonBg", "#034638");
  const btnFg = str(config, "buttonText2", "#FFF6EA");
  const radius = num(config, "radius", 24);
  const disp = DISPLAY_FONTS[str(config, "displayFont", "retro")] ?? DISPLAY_FONTS.retro;
  const display: CSSProperties = {
    fontFamily: disp.family,
    fontStyle: disp.italic ? "italic" : "normal",
    fontWeight: disp.weight,
    letterSpacing: "-0.02em",
    lineHeight: 1,
  };

  const flavors = list(config, "flavors").map((f) => ({
    name: f.name ?? "",
    color: parseHex(f.color ?? "") ? (f.color as string) : "#F7913D",
    image: (f.image ?? "").trim(),
    description: f.description ?? "",
    price: toNum(f.price, 0),
  }));
  const questions = list(config, "questions")
    .map((q) => ({
      text: q.question ?? "",
      answers: [1, 2, 3, 4]
        .map((n) => ({ label: (q[`a${n}`] ?? "").trim(), match: Math.round(toNum(q[`m${n}`], 1)) - 1 }))
        .filter((a) => a.label),
    }))
    .filter((q) => q.answers.length > 0);
  const total = questions.length;

  /* "result" in the editor jumps straight to the match for the first flavour */
  const startOn = str(config, "startOn", "quiz");
  const toFirst = () => questions.map((q) => Math.max(0, q.answers.findIndex((a) => a.match === 0)));
  const key = `${startOn}|${total}`;
  const [prevKey, setPrevKey] = useState(key);
  const [answers, setAnswers] = useState<number[]>(() => (startOn === "result" ? toFirst() : []));
  const [picked, setPicked] = useState<number | null>(null);
  const [added, setAdded] = useState(false);
  if (key !== prevKey) {
    setPrevKey(key);
    setAnswers(startOn === "result" ? toFirst() : []);
    setPicked(null);
  }

  useEffect(() => {
    if (picked === null) return;
    const t = setTimeout(() => {
      setAnswers((a) => [...a, picked]);
      setPicked(null);
    }, 360);
    return () => clearTimeout(t);
  }, [picked]);

  useEffect(() => {
    if (!added) return;
    const t = setTimeout(() => setAdded(false), 1800);
    return () => clearTimeout(t);
  }, [added]);

  const step = Math.min(answers.length, total);
  const done = total > 0 && answers.length >= total && flavors.length > 0;
  const q = questions[step];
  const res = score(
    answers.slice(0, total).map((ai, qi) => questions[qi]?.answers[ai]?.match ?? -1),
    flavors.length,
    total,
  );
  const match = flavors[res.win];

  const retake = () => {
    setAnswers([]);
    setPicked(null);
    setAdded(false);
  };

  return (
    <div
      className="@container w-full"
      style={{ background: bg, color: ink, fontFamily: fontStack(str(config, "font", "system")) }}
    >
      <div className="mx-auto w-full max-w-[1000px] px-5 py-7 @min-[720px]:px-10 @min-[720px]:py-12">
        {/* Header */}
        <div className="text-center">
          {str(config, "eyebrow") && (
            <span
              className="inline-flex rounded-full px-3 py-[5px] text-[10.5px] font-extrabold uppercase leading-none tracking-[0.12em]"
              style={{ background: mint, color: ink }}
            >
              {str(config, "eyebrow")}
            </span>
          )}
          <h3 className="mx-auto mt-3 max-w-[680px] text-[34px] @min-[720px]:text-[48px]" style={display}>
            {str(config, "heading")}
          </h3>
          {str(config, "subheading") && (
            <p className="mx-auto mt-2.5 max-w-[420px] text-[14px] leading-[1.5] opacity-80">{str(config, "subheading")}</p>
          )}
        </div>

        <div className="mt-6 p-4 @min-[520px]:p-6 @min-[720px]:mt-8" style={{ background: panel, borderRadius: radius + 4 }}>
          {!done && q ? (
            <>
              {/* Progress */}
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                <button
                  type="button"
                  onClick={() => setAnswers((a) => a.slice(0, -1))}
                  className={`inline-flex h-8 items-center gap-1.5 justify-self-start rounded-full pl-1.5 pr-3 text-[12.5px] font-bold transition-[background-color,opacity] duration-300 hover:bg-black/5 ${step === 0 ? "invisible" : ""}`}
                >
                  <Svg html={BACK_SVG} />
                  {str(config, "backLabel", "Back")}
                </button>
                <span className="text-[11px] font-extrabold uppercase tracking-[0.1em] opacity-70">
                  {fillStep(str(config, "stepLabel", "Question {n} of {total}"), step + 1, total)}
                </span>
                <span />
              </div>
              <div className="mx-auto mt-3 grid max-w-[260px] gap-1.5" style={{ gridTemplateColumns: `repeat(${total}, minmax(0,1fr))` }}>
                {questions.map((_, i) => (
                  <span key={i} className="h-1.5 overflow-hidden rounded-full" style={{ background: alpha(ink, 0.12) }}>
                    <span
                      className="block h-full rounded-full"
                      style={{
                        background: ink,
                        transform: `scaleX(${i < step ? 1 : i === step ? 0.5 : 0})`,
                        transformOrigin: "left",
                        transition: `transform 500ms ${EASE}`,
                      }}
                    />
                  </span>
                ))}
              </div>

              <h4 key={`q${step}`} className="bs-swap mt-5 text-center text-[26px] @min-[720px]:text-[34px]" style={display}>
                {q.text}
              </h4>

              {/* Answer tiles */}
              <div
                key={`a${step}`}
                className={`mt-5 grid gap-2.5 @min-[520px]:gap-3 ${
                  q.answers.length === 4 ? "@min-[520px]:grid-cols-4" : q.answers.length === 2 ? "@min-[520px]:grid-cols-2" : "@min-[520px]:grid-cols-3"
                }`}
              >
                {q.answers.map((a, i) => {
                  const f = flavors[a.match];
                  const col = f?.color ?? bg;
                  const onDark = brightness(col) < 140;
                  const on = picked === i;
                  return (
                    <button
                      key={i}
                      type="button"
                      disabled={picked !== null}
                      onClick={() => setPicked(i)}
                      className="bs-rise group relative flex h-[66px] items-center gap-3 overflow-hidden px-3 text-left transition-[scale,box-shadow,filter] duration-300 enabled:hover:brightness-105 enabled:active:scale-[0.97] @min-[520px]:aspect-[4/5] @min-[520px]:h-auto @min-[520px]:flex-col @min-[520px]:items-start @min-[520px]:justify-between @min-[520px]:p-4 @min-[720px]:aspect-[5/4]"
                      style={{
                        background: col,
                        color: onDark ? light : ink,
                        borderRadius: Math.max(10, radius - 6),
                        boxShadow: on ? `0 0 0 3px ${panel}, 0 0 0 5.5px ${ink}` : "none",
                        scale: on ? "0.97" : undefined,
                        transitionTimingFunction: EASE,
                        "--i": i,
                      } as CSSProperties}
                    >
                      <span aria-hidden className="pointer-events-none absolute -right-6 -top-8 h-24 w-24 rounded-full bg-white/20 transition-[scale] duration-700 group-hover:scale-125" style={{ transitionTimingFunction: EASE }} />
                      <span
                        className="relative grid h-8 w-8 shrink-0 place-items-center rounded-full text-[12.5px] font-extrabold"
                        style={{ background: on ? ink : "rgba(255,255,255,.72)", color: on ? light : ink, transition: `background-color 250ms ease` }}
                      >
                        {on ? (
                          <svg className="bs-check-in" width="13" height="13" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                            <path d="M2.5 6.3l2.3 2.2 4.7-5" />
                          </svg>
                        ) : (
                          LETTERS[i]
                        )}
                      </span>
                      <span className="relative min-w-0 flex-1 text-[20px] leading-[1.05] @min-[520px]:flex-none @min-[520px]:text-[21px] @min-[720px]:text-[26px]" style={display}>
                        {a.label}
                      </span>
                      <Svg html={ARROW_SVG} className="relative shrink-0 opacity-70 transition-[translate] duration-300 group-hover:translate-x-0.5 @min-[520px]:hidden" />
                    </button>
                  );
                })}
              </div>
            </>
          ) : match ? (
            /* Result */
            <div key="result" className="bs-fade-up grid grid-cols-[minmax(0,44fr)_minmax(0,56fr)] items-center gap-x-4 gap-y-4 @min-[600px]:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] @min-[600px]:gap-x-8">
              <div
                className="relative aspect-[4/5] w-full overflow-hidden @min-[600px]:row-span-2 @min-[600px]:self-start"
                style={{ background: match.color, borderRadius: Math.max(10, radius - 4) }}
              >
                {match.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={match.image} alt={match.name} loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover" />
                )}
                <span
                  className="bs-pop-scale absolute left-2.5 top-2.5 grid h-[58px] w-[58px] -rotate-12 place-content-center rounded-full text-center shadow-[0_6px_16px_-6px_rgba(0,0,0,0.35)] @min-[600px]:left-4 @min-[600px]:top-4 @min-[600px]:h-[76px] @min-[600px]:w-[76px]"
                  style={{ background: mint, color: ink, animationDelay: "180ms" }}
                >
                  <b className="block text-[18px] leading-none @min-[600px]:text-[24px]" style={display}>
                    {res.pct}%
                  </b>
                  <span className="mt-0.5 block text-[8px] font-extrabold uppercase tracking-[0.1em] @min-[600px]:text-[10px]">
                    {str(config, "matchLabel", "match")}
                  </span>
                </span>
              </div>

              <div className="@min-[600px]:self-end">
                <p className="text-[11px] font-extrabold uppercase tracking-[0.1em] opacity-70">{str(config, "resultEyebrow", "Your match")}</p>
                <h4 className="mt-2 text-[26px] [overflow-wrap:anywhere] @min-[440px]:text-[30px] @min-[600px]:text-[44px]" style={display}>
                  {match.name}
                </h4>
                <div className="mt-3 flex items-center gap-2.5">
                  <span className="h-1.5 w-full max-w-[160px] overflow-hidden rounded-full" style={{ background: alpha(ink, 0.12) }}>
                    <span className="block h-full rounded-full" style={{ width: `${res.pct}%`, background: ink }} />
                  </span>
                  <span className="whitespace-nowrap text-[12px] font-bold tabular-nums">
                    {res.pct}% {str(config, "matchLabel", "match")}
                  </span>
                </div>
              </div>

              <div className="col-span-2 @min-[600px]:col-span-1 @min-[600px]:col-start-2 @min-[600px]:self-start">
                {match.description && <p className="max-w-[420px] text-[14px] leading-[1.55] opacity-85">{match.description}</p>}
                {str(config, "becauseLabel") && (
                  <div className="mt-4">
                    <p className="text-[11px] font-bold opacity-60">{str(config, "becauseLabel")}</p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {answers.slice(0, total).map((ai, qi) => {
                        const l = questions[qi]?.answers[ai]?.label;
                        return l ? (
                          <span key={qi} className="rounded-full px-2.5 py-[5px] text-[11.5px] font-bold leading-none" style={{ background: alpha(ink, 0.08) }}>
                            {l}
                          </span>
                        ) : null;
                      })}
                    </div>
                  </div>
                )}
                <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2.5">
                  <button
                    type="button"
                    onClick={() => setAdded(true)}
                    className="flex h-12 w-full items-center justify-center gap-2 rounded-full px-6 text-[15px] font-bold hover:brightness-110 active:scale-[0.98] @min-[440px]:w-auto"
                    style={{ background: added ? mint : btnBg, color: added ? ink : btnFg, transition: `background-color 300ms ${EASE}, color 300ms ease, filter 200ms ease, scale 200ms ease` }}
                  >
                    <span key={added ? "a" : "b"} className="bs-swap inline-flex items-center gap-2 whitespace-nowrap">
                      {added ? (
                        <>
                          <svg width="14" height="14" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                            <path d="M2.5 6.3l2.3 2.2 4.7-5" />
                          </svg>
                          {str(config, "addedText", "Added")}
                        </>
                      ) : (
                        <>
                          {str(config, "buttonText", "Add 12 pack")}
                          {match.price > 0 && <span className="font-medium opacity-70">· {money(match.price, cur)}</span>}
                        </>
                      )}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={retake}
                    className="mx-auto inline-flex h-10 items-center gap-1.5 rounded-full px-3 text-[13px] font-bold underline-offset-4 transition-colors hover:underline @min-[440px]:mx-0"
                  >
                    <Svg html={RETAKE_SVG} />
                    {str(config, "retakeLabel", "Retake quiz")}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <p className="py-8 text-center text-[13px] opacity-60">Add questions and flavors to start the quiz.</p>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------------- Liquid ---------------- */

function generateLiquid(config: TweakConfig): string {
  const { face, family } = fontFaceFor(str(config, "font", "system"));
  const S = ".bs-fq-{{ section.id }}";
  const ease = EASE;
  const dispKey = str(config, "displayFont", "retro");

  const style = `<style>
${face ? face + "\n" : ""}  ${S} { container-type: inline-size; background: {{ section.settings.bg }}; color: {{ section.settings.text_color }}; font-family: ${family}; }
  ${S} * { box-sizing: border-box; }
  ${S} p, ${S} h2, ${S} h3 { margin: 0; }
  ${S} button { font: inherit; }
  ${S} .bs-disp { letter-spacing: -.02em; line-height: 1;
    {%- case section.settings.display_font -%}
      {%- when 'serif' %} font-family: Georgia, 'Iowan Old Style', 'Palatino Linotype', serif; font-weight: 700; font-style: normal;
      {%- when 'sans' %} font-family: ui-sans-serif, system-ui, -apple-system, sans-serif; font-weight: 800; font-style: normal;
      {%- when 'inherit' %} font-family: inherit; font-weight: 700; font-style: normal;
      {%- else %} font-family: Georgia, 'Iowan Old Style', 'Palatino Linotype', serif; font-weight: 700; font-style: italic;
    {%- endcase %} }
  ${S} .bs-wrap { max-width: 1000px; margin: 0 auto; padding: 28px 20px; }
  ${S} .bs-head { text-align: center; }
  ${S} .bs-eyebrow { display: inline-flex; padding: 5px 12px; border-radius: 99px; font-size: 10.5px; font-weight: 800; line-height: 1; text-transform: uppercase; letter-spacing: .12em;
    background: {{ section.settings.mint }}; color: {{ section.settings.text_color }}; }
  ${S} .bs-h { margin: 12px auto 0; max-width: 680px; font-size: 34px; }
  ${S} .bs-sub { margin: 10px auto 0; max-width: 420px; font-size: 14px; line-height: 1.5; opacity: .8; }
  ${S} .bs-panel { margin-top: 24px; padding: 16px; border-radius: {{ section.settings.radius | plus: 4 }}px; background: {{ section.settings.panel_bg }}; }
  ${S} [hidden] { display: none !important; }
  ${S} .bs-top { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 8px; }
  ${S} .bs-back { justify-self: start; display: inline-flex; align-items: center; gap: 6px; height: 32px; padding: 0 12px 0 6px; border: 0; border-radius: 99px; cursor: pointer;
    background: transparent; color: inherit; font-size: 12.5px; font-weight: 700; transition: background-color .3s, opacity .3s; }
  ${S} .bs-back:hover { background: rgba(0,0,0,.05); }
  ${S} .bs-back svg { display: block; }
  ${S} .bs-back.is-off { visibility: hidden; }
  ${S} .bs-count { font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: .1em; opacity: .7; }
  ${S} .bs-prog { display: grid; gap: 6px; max-width: 260px; margin: 12px auto 0; }
  ${S} .bs-prog span { height: 6px; overflow: hidden; border-radius: 99px; background: {{ section.settings.text_color | color_modify: 'alpha', 0.12 }}; }
  ${S} .bs-prog span::after { content: ""; display: block; height: 100%; border-radius: 99px; background: {{ section.settings.text_color }};
    transform: scaleX(var(--p, 0)); transform-origin: left; transition: transform .5s ${ease}; }
  ${S} .bs-step.is-on .bs-q, ${S} .bs-step.is-on .bs-tile { animation: bs-fq-in .45s ${ease} both; }
  ${S} .bs-step.is-on .bs-tile:nth-child(2) { animation-delay: .04s; }
  ${S} .bs-step.is-on .bs-tile:nth-child(3) { animation-delay: .08s; }
  ${S} .bs-step.is-on .bs-tile:nth-child(4) { animation-delay: .12s; }
  ${S} .bs-q { margin-top: 20px; text-align: center; font-size: 26px; }
  ${S} .bs-tiles { display: grid; gap: 10px; margin-top: 20px; }
  ${S} .bs-tile { position: relative; display: flex; align-items: center; gap: 12px; height: 66px; padding: 0 12px; overflow: hidden; border: 0; cursor: pointer; text-align: left;
    border-radius: {{ section.settings.radius | minus: 6 | at_least: 10 }}px; background: var(--c); color: {{ section.settings.text_color }};
    transition: transform .3s ${ease}, box-shadow .3s ${ease}, filter .3s; }
  ${S} .bs-tile.is-dark { color: {{ section.settings.light_text }}; }
  ${S} .bs-tile:hover { filter: brightness(1.05); }
  ${S} .bs-tile:active { transform: scale(.97); }
  ${S} .bs-tile.is-picked { transform: scale(.97); box-shadow: 0 0 0 3px {{ section.settings.panel_bg }}, 0 0 0 5.5px {{ section.settings.text_color }}; }
  ${S} .bs-tile::before { content: ""; position: absolute; right: -24px; top: -32px; width: 96px; height: 96px; border-radius: 99px; background: rgba(255,255,255,.2);
    transition: transform .7s ${ease}; pointer-events: none; }
  ${S} .bs-tile:hover::before { transform: scale(1.25); }
  ${S} .bs-letter { position: relative; width: 32px; height: 32px; flex-shrink: 0; display: grid; place-items: center; border-radius: 99px;
    font-size: 12.5px; font-weight: 800; font-style: normal; background: rgba(255,255,255,.72); color: {{ section.settings.text_color }}; transition: background-color .25s; }
  ${S} .bs-tile.is-picked .bs-letter { background: {{ section.settings.text_color }}; color: {{ section.settings.light_text }}; }
  ${S} .bs-label { position: relative; flex: 1; min-width: 0; font-size: 20px; line-height: 1.05; }
  ${S} .bs-arrow { position: relative; flex-shrink: 0; opacity: .7; }
  ${S} .bs-arrow svg { display: block; }
  ${S} .bs-res { display: grid; grid-template-columns: minmax(0, 44fr) minmax(0, 56fr); align-items: center; gap: 16px; animation: bs-fq-in .5s ${ease} both; }
  ${S} .bs-photo { position: relative; width: 100%; aspect-ratio: 4 / 5; overflow: hidden; border-radius: {{ section.settings.radius | minus: 4 | at_least: 10 }}px; background: var(--c); }
  ${S} .bs-photo img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
  ${S} .bs-sticker { position: absolute; left: 10px; top: 10px; width: 58px; height: 58px; display: grid; place-content: center; text-align: center; border-radius: 99px;
    transform: rotate(-12deg); box-shadow: 0 6px 16px -6px rgba(0,0,0,.35); background: {{ section.settings.mint }}; color: {{ section.settings.text_color }};
    animation: bs-fq-pop .45s ${ease} .18s both; }
  ${S} .bs-sticker b { display: block; font-size: 18px; }
  ${S} .bs-sticker small { display: block; margin-top: 2px; font-size: 8px; font-weight: 800; text-transform: uppercase; letter-spacing: .1em; }
  ${S} .bs-r-eyebrow { font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: .1em; opacity: .7; }
  ${S} .bs-r-name { margin-top: 8px; font-size: 26px; overflow-wrap: anywhere; }
  ${S} .bs-meter { margin-top: 12px; display: flex; align-items: center; gap: 10px; }
  ${S} .bs-meter > span { width: 100%; max-width: 160px; height: 6px; overflow: hidden; border-radius: 99px; background: {{ section.settings.text_color | color_modify: 'alpha', 0.12 }}; }
  ${S} .bs-meter > span > span { display: block; height: 100%; width: 0; border-radius: 99px; background: {{ section.settings.text_color }}; transition: width .9s ${ease} .2s; }
  ${S} .bs-meter b { white-space: nowrap; font-size: 12px; font-variant-numeric: tabular-nums; }
  ${S} .bs-r-body { grid-column: 1 / -1; }
  ${S} .bs-desc { max-width: 420px; font-size: 14px; line-height: 1.55; opacity: .85; }
  ${S} .bs-because { margin-top: 16px; }
  ${S} .bs-because > p { font-size: 11px; font-weight: 700; opacity: .6; }
  ${S} .bs-picks { margin-top: 6px; display: flex; flex-wrap: wrap; gap: 6px; }
  ${S} .bs-picks span { padding: 5px 10px; border-radius: 99px; font-size: 11.5px; font-weight: 700; line-height: 1; background: {{ section.settings.text_color | color_modify: 'alpha', 0.08 }}; }
  ${S} .bs-actions { margin-top: 20px; display: flex; flex-wrap: wrap; align-items: center; gap: 10px 16px; }
  ${S} .bs-actions form { margin: 0; width: 100%; }
  ${S} .bs-add { width: 100%; height: 48px; display: flex; align-items: center; justify-content: center; gap: 8px; padding: 0 24px; border: 0; border-radius: 99px; cursor: pointer;
    font-size: 15px; font-weight: 700; white-space: nowrap; background: {{ section.settings.button_bg }}; color: {{ section.settings.button_fg }};
    transition: background-color .3s ${ease}, color .3s, filter .2s, transform .2s; }
  ${S} .bs-add:hover:not(:disabled) { filter: brightness(1.1); }
  ${S} .bs-add:active:not(:disabled) { transform: scale(.98); }
  ${S} .bs-add:disabled:not(.is-added) { opacity: .55; cursor: not-allowed; }
  ${S} .bs-add.is-added { background: {{ section.settings.mint }}; color: {{ section.settings.text_color }}; }
  ${S} .bs-add .bs-pr { font-weight: 500; opacity: .7; }
  ${S} .bs-add.is-added .bs-pr { display: none; }
  ${S} .bs-retake { margin: 0 auto; display: inline-flex; align-items: center; gap: 6px; height: 40px; padding: 0 12px; border: 0; border-radius: 99px; cursor: pointer;
    background: transparent; color: inherit; font-size: 13px; font-weight: 700; text-underline-offset: 4px; }
  ${S} .bs-retake:hover { text-decoration: underline; }
  ${S} .bs-retake svg { display: block; }
  @keyframes bs-fq-in { from { opacity: 0; transform: translateY(10px); filter: blur(3px); } }
  @keyframes bs-fq-pop { 0% { transform: rotate(-12deg) scale(.6); opacity: 0; } 60% { transform: rotate(-12deg) scale(1.06); opacity: 1; } 100% { transform: rotate(-12deg) scale(1); } }
  @container (min-width: 440px) {
    ${S} .bs-r-name { font-size: 30px; }
    ${S} .bs-actions form { width: auto; }
    ${S} .bs-add { width: auto; }
    ${S} .bs-retake { margin: 0; }
  }
  @container (min-width: 520px) {
    ${S} .bs-panel { padding: 24px; }
    ${S} .bs-tiles { grid-template-columns: repeat(var(--n, 3), minmax(0, 1fr)); gap: 12px; }
    ${S} .bs-tile { height: auto; aspect-ratio: 4 / 5; flex-direction: column; align-items: flex-start; justify-content: space-between; padding: 16px; }
    ${S} .bs-label { flex: none; font-size: 21px; }
    ${S} .bs-arrow { display: none; }
  }
  @container (min-width: 600px) {
    ${S} .bs-res { grid-template-columns: minmax(0, 5fr) minmax(0, 6fr); column-gap: 32px; }
    ${S} .bs-photo { grid-row: span 2; align-self: start; }
    ${S} .bs-r-head { align-self: end; }
    ${S} .bs-r-body { grid-column: 2; align-self: start; }
    ${S} .bs-r-name { font-size: 44px; }
    ${S} .bs-sticker { left: 16px; top: 16px; width: 76px; height: 76px; }
    ${S} .bs-sticker b { font-size: 24px; }
    ${S} .bs-sticker small { font-size: 10px; }
  }
  @container (min-width: 720px) {
    ${S} .bs-wrap { padding: 48px 40px; }
    ${S} .bs-h { font-size: 48px; }
    ${S} .bs-panel { margin-top: 32px; }
    ${S} .bs-q { font-size: 34px; }
    ${S} .bs-tile { aspect-ratio: 5 / 4; }
    ${S} .bs-label { font-size: 26px; }
  }
  @media (prefers-reduced-motion: reduce) {
    ${S} .bs-step.is-on .bs-q, ${S} .bs-step.is-on .bs-tile, ${S} .bs-res, ${S} .bs-sticker { animation: none; }
  }
</style>`;

  const answer = (n: number) => `{%- assign bs_a = block.settings.answer_${n} -%}
            {%- if bs_a != blank -%}
              {%- assign bs_mi = block.settings.match_${n} | minus: 1 -%}
              {%- assign bs_col = bs_cols[bs_mi] | default: section.settings.panel_bg -%}
              {%- assign bs_br = bs_col | color_brightness -%}
              <button type="button" class="bs-tile{% if bs_br < 140 %} is-dark{% endif %}" data-answer data-match="{{ bs_mi }}" data-label="{{ bs_a | escape }}" style="--c: {{ bs_col }};">
                <span class="bs-letter" data-letter>${LETTERS[n - 1]}</span>
                <span class="bs-label bs-disp">{{ bs_a }}</span>
                <span class="bs-arrow">${ARROW_SVG}</span>
              </button>
            {%- endif -%}`;

  const markup = `{%- comment -%}
  Flavor Quiz by boost.supply.
  - Add "Flavor" blocks first (name, colour, photo, product). They are numbered
    in the order they appear: the first Flavor block is flavour 1, and so on.
  - Then add "Question" blocks. Each answer has a "Points to flavor" number:
    the flavour with the most points wins (ties go to the latest answer).
  - The match card adds the flavour's product (first available variant) to the
    cart without leaving the page. The match % is 76% plus a share of the
    answers that pointed to the winner, so a clean sweep of three reads 93%.
{%- endcomment -%}
{%- capture bs_cols_str -%}{%- for block in section.blocks -%}{%- if block.type == 'flavor' -%}{{ block.settings.color }},{%- endif -%}{%- endfor -%}{%- endcapture -%}
{%- assign bs_cols = bs_cols_str | split: ',' -%}
{%- assign bs_qs = section.blocks | where: 'type', 'question' -%}
<div class="bs-fq-{{ section.id }}" id="bs-fq-{{ section.id }}" data-step-label="{{ section.settings.step_label | escape }}" data-added="{{ section.settings.added_text | escape }}">
  <div class="bs-wrap">
    <div class="bs-head">
      {%- if section.settings.eyebrow != blank -%}<span class="bs-eyebrow">{{ section.settings.eyebrow }}</span>{%- endif -%}
      <h2 class="bs-h bs-disp">{{ section.settings.heading }}</h2>
      {%- if section.settings.subheading != blank -%}<p class="bs-sub">{{ section.settings.subheading }}</p>{%- endif -%}
    </div>
    <div class="bs-panel">
      <div class="bs-quiz" data-quiz>
        <div class="bs-top">
          <button type="button" class="bs-back is-off" data-back>${BACK_SVG} {{ section.settings.back_label }}</button>
          <span class="bs-count" data-count></span>
          <span></span>
        </div>
        <div class="bs-prog" style="grid-template-columns: repeat({{ bs_qs.size | at_least: 1 }}, minmax(0, 1fr));">
          {%- for q in bs_qs -%}<span data-bar></span>{%- endfor -%}
        </div>
        {%- for block in bs_qs -%}
          {%- assign bs_cnt = 0 -%}
          {%- if block.settings.answer_1 != blank -%}{%- assign bs_cnt = bs_cnt | plus: 1 -%}{%- endif -%}
          {%- if block.settings.answer_2 != blank -%}{%- assign bs_cnt = bs_cnt | plus: 1 -%}{%- endif -%}
          {%- if block.settings.answer_3 != blank -%}{%- assign bs_cnt = bs_cnt | plus: 1 -%}{%- endif -%}
          {%- if block.settings.answer_4 != blank -%}{%- assign bs_cnt = bs_cnt | plus: 1 -%}{%- endif -%}
          <div class="bs-step{% if forloop.first %} is-on{% endif %}" data-step{% unless forloop.first %} hidden{% endunless %} {{ block.shopify_attributes }}>
            <h3 class="bs-q bs-disp">{{ block.settings.question }}</h3>
            <div class="bs-tiles" style="--n: {{ bs_cnt | at_least: 1 }};">
            ${answer(1)}
            ${answer(2)}
            ${answer(3)}
            ${answer(4)}
            </div>
          </div>
        {%- endfor -%}
      </div>

      {%- assign bs_fi = 0 -%}
      {%- for block in section.blocks -%}
        {%- if block.type == 'flavor' -%}
          {%- assign bs_p = block.settings.product -%}
          {%- assign bs_name = block.settings.name | default: bs_p.title -%}
          <div class="bs-res" data-result="{{ bs_fi }}" hidden {{ block.shopify_attributes }}>
            <div class="bs-photo" style="--c: {{ block.settings.color }};">
              {%- if block.settings.image != blank -%}
                {{ block.settings.image | image_url: width: 800 | image_tag: loading: 'lazy', alt: bs_name, sizes: '(min-width: 990px) 400px, 45vw' }}
              {%- elsif bs_p.featured_image -%}
                {{ bs_p.featured_image | image_url: width: 800 | image_tag: loading: 'lazy', alt: bs_name, sizes: '(min-width: 990px) 400px, 45vw' }}
              {%- endif -%}
              <span class="bs-sticker"><b class="bs-disp"><span data-pct>93</span>%</b><small>{{ section.settings.match_label }}</small></span>
            </div>
            <div class="bs-r-head">
              <p class="bs-r-eyebrow">{{ section.settings.result_eyebrow }}</p>
              <h3 class="bs-r-name bs-disp">{{ bs_name }}</h3>
              <div class="bs-meter"><span><span data-meter></span></span><b><span data-pct>93</span>% {{ section.settings.match_label }}</b></div>
            </div>
            <div class="bs-r-body">
              {%- if block.settings.description != blank -%}<p class="bs-desc">{{ block.settings.description }}</p>{%- endif -%}
              {%- if section.settings.because_label != blank -%}
                <div class="bs-because"><p>{{ section.settings.because_label }}</p><div class="bs-picks" data-picks></div></div>
              {%- endif -%}
              <div class="bs-actions">
                {%- if bs_p != blank -%}
                  {%- assign bs_fid = 'bs-fq-' | append: block.id -%}
                  {%- form 'product', bs_p, id: bs_fid -%}
                    <input type="hidden" name="id" value="{{ bs_p.selected_or_first_available_variant.id }}">
                    <input type="hidden" name="quantity" value="1">
                    <button type="submit" name="add" class="bs-add"{% unless bs_p.available %} disabled{% endunless %}>
                      <span data-label>{{ section.settings.button_text }}</span><span class="bs-pr">· {{ bs_p.price | money }}</span>
                    </button>
                  {%- endform -%}
                {%- endif -%}
                <button type="button" class="bs-retake" data-retake>${RETAKE_SVG} {{ section.settings.retake_label }}</button>
              </div>
            </div>
          </div>
          {%- assign bs_fi = bs_fi | plus: 1 -%}
        {%- endif -%}
      {%- endfor -%}
    </div>
  </div>
</div>
<script>
  (function () {
    var root = document.getElementById('bs-fq-{{ section.id }}');
    if (!root) return;
    var quiz = root.querySelector('[data-quiz]');
    var steps = [].slice.call(root.querySelectorAll('[data-step]'));
    var bars = [].slice.call(root.querySelectorAll('[data-bar]'));
    var results = [].slice.call(root.querySelectorAll('[data-result]'));
    var back = root.querySelector('[data-back]');
    var count = root.querySelector('[data-count]');
    var picks = [];
    var busy = false;

    function label(n) {
      return String(root.dataset.stepLabel || '').split('{n}').join(n).split('{total}').join(steps.length);
    }
    function score() {
      var pts = results.map(function () { return 0; }), last = results.map(function () { return -1; });
      picks.forEach(function (p, qi) { if (p.m >= 0 && p.m < pts.length) { pts[p.m]++; last[p.m] = qi; } });
      var win = 0;
      pts.forEach(function (v, i) { if (v > pts[win] || (v === pts[win] && last[i] > last[win])) win = i; });
      return { win: win, pct: Math.round(76 + 17 * (pts[win] / Math.max(1, steps.length))) };
    }
    function render() {
      var i = picks.length;
      if (i >= steps.length && results.length) {
        var r = score();
        quiz.hidden = true;
        results.forEach(function (el, k) {
          el.hidden = k !== r.win;
          if (k !== r.win) return;
          el.querySelectorAll('[data-pct]').forEach(function (p) { p.textContent = r.pct; });
          var meter = el.querySelector('[data-meter]');
          if (meter) { meter.style.width = '0'; requestAnimationFrame(function () { requestAnimationFrame(function () { meter.style.width = r.pct + '%'; }); }); }
          var box = el.querySelector('[data-picks]');
          if (box) {
            box.textContent = '';
            picks.forEach(function (p) { var s = document.createElement('span'); s.textContent = p.label; box.appendChild(s); });
          }
        });
        return;
      }
      quiz.hidden = false;
      results.forEach(function (el) { el.hidden = true; });
      steps.forEach(function (s, k) {
        s.hidden = k !== i;
        s.classList.toggle('is-on', k === i);
        s.querySelectorAll('[data-answer]').forEach(function (b, n) {
          b.classList.remove('is-picked');
          b.disabled = false;
          var l = b.querySelector('[data-letter]');
          if (l) l.textContent = 'ABCD'.charAt(n);
        });
      });
      bars.forEach(function (b, k) { b.style.setProperty('--p', k < i ? 1 : (k === i ? 0.5 : 0)); });
      if (count) count.textContent = label(i + 1);
      if (back) back.classList.toggle('is-off', i === 0);
    }

    steps.forEach(function (s) {
      s.querySelectorAll('[data-answer]').forEach(function (b) {
        b.addEventListener('click', function () {
          if (busy) return;
          busy = true;
          b.classList.add('is-picked');
          var l = b.querySelector('[data-letter]');
          if (l) l.innerHTML = '<svg width="13" height="13" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2.5 6.3l2.3 2.2 4.7-5"/></svg>';
          s.querySelectorAll('[data-answer]').forEach(function (o) { o.disabled = true; });
          setTimeout(function () {
            picks.push({ m: parseInt(b.getAttribute('data-match'), 10), label: b.getAttribute('data-label') });
            busy = false;
            render();
          }, 360);
        });
      });
    });
    if (back) back.addEventListener('click', function () { picks.pop(); render(); });
    root.querySelectorAll('[data-retake]').forEach(function (b) {
      b.addEventListener('click', function () { picks = []; render(); root.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
    });

    var addedText = root.getAttribute('data-added');
    root.querySelectorAll('form[action]').forEach(function (form) {
      form.addEventListener('submit', function (e) {
        if (!window.fetch || !window.FormData) return;
        e.preventDefault();
        var btn = form.querySelector('.bs-add');
        var lab = btn.querySelector('[data-label]');
        var original = lab.textContent;
        var base = (window.Shopify && Shopify.routes && Shopify.routes.root) || '/';
        btn.disabled = true;
        fetch(base + 'cart/add.js', { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } })
          .then(function (res) {
            if (!res.ok) throw new Error('add failed');
            btn.classList.add('is-added');
            lab.textContent = addedText;
            document.dispatchEvent(new CustomEvent('cart:refresh', { bubbles: true }));
            setTimeout(function () { btn.classList.remove('is-added'); lab.textContent = original; btn.disabled = false; }, 2200);
          })
          .catch(function () { form.submit(); });
      });
    });

    render();
  })();
</script>`;

  const flavors = list(config, "flavors");
  const questions = list(config, "questions");
  const matchVal = (v: string | undefined) => clamp(Math.round(toNum(v, 1)), 1, 6);

  const schema = buildSchema({
    name: "Flavor Quiz",
    settings: [
      { type: "text", id: "eyebrow", label: "Eyebrow", default: str(config, "eyebrow") },
      { type: "text", id: "heading", label: "Heading", default: str(config, "heading") },
      { type: "textarea", id: "subheading", label: "Subheading", default: str(config, "subheading") },
      { type: "header", content: "Quiz" },
      { type: "text", id: "step_label", label: "Step label ({n} and {total})", default: str(config, "stepLabel") },
      { type: "text", id: "back_label", label: "Back button", default: str(config, "backLabel") },
      { type: "header", content: "Result" },
      { type: "text", id: "result_eyebrow", label: "Result eyebrow", default: str(config, "resultEyebrow") },
      { type: "text", id: "match_label", label: "“match” word", default: str(config, "matchLabel") },
      { type: "text", id: "because_label", label: "Answers label", default: str(config, "becauseLabel") },
      { type: "text", id: "button_text", label: "Button text", default: str(config, "buttonText") },
      { type: "text", id: "added_text", label: "Added confirmation", default: str(config, "addedText") },
      { type: "text", id: "retake_label", label: "Retake button", default: str(config, "retakeLabel") },
      { type: "header", content: "Style" },
      {
        type: "select",
        id: "display_font",
        label: "Display font",
        options: [
          { value: "retro", label: "Retro serif (italic)" },
          { value: "serif", label: "Serif" },
          { value: "sans", label: "Sans" },
          { value: "inherit", label: "Theme font" },
        ],
        default: DISPLAY_FONTS[dispKey] ? dispKey : "retro",
      },
      { type: "color", id: "bg", label: "Background", default: str(config, "bg") },
      { type: "color", id: "text_color", label: "Text", default: str(config, "textColor") },
      { type: "color", id: "light_text", label: "Text on dark tiles", default: str(config, "lightText") },
      { type: "color", id: "panel_bg", label: "Quiz panel", default: str(config, "panelBg") },
      { type: "color", id: "mint", label: "Chips & sticker", default: str(config, "mint") },
      { type: "color", id: "button_bg", label: "Button", default: str(config, "buttonBg") },
      { type: "color", id: "button_fg", label: "Button text colour", default: str(config, "buttonText2") },
      { type: "range", id: "radius", label: "Corner radius", min: 0, max: 40, step: 2, unit: "px", default: clamp(Math.round(num(config, "radius", 24) / 2) * 2, 0, 40) },
    ],
    blocks: [
      {
        type: "flavor",
        name: "Flavor",
        settings: [
          { type: "text", id: "name", label: "Name (defaults to the product title)" },
          { type: "product", id: "product", label: "Product to add" },
          { type: "color", id: "color", label: "Colour (tiles and photo backdrop)", default: "#F7913D" },
          { type: "image_picker", id: "image", label: "Photo (optional, 4:5)", info: "Overrides the product image." },
          { type: "textarea", id: "description", label: "Description" },
        ],
      },
      {
        type: "question",
        name: "Question",
        settings: [
          { type: "text", id: "question", label: "Question", default: "Pick a vibe" },
          ...[1, 2, 3, 4].flatMap((n) => [
            { type: "text" as const, id: `answer_${n}`, label: `Answer ${n}${n === 4 ? " (optional)" : ""}` },
            { type: "range" as const, id: `match_${n}`, label: `Answer ${n}: points to flavor`, min: 1, max: 6, step: 1, default: Math.min(n, 3) },
          ]),
        ],
      },
    ],
    maxBlocks: 12,
    presetBlocks: [
      ...flavors.map((f) => ({
        type: "flavor",
        settings: {
          name: esc(f.name ?? ""),
          color: parseHex(f.color ?? "") ? (f.color as string) : "#F7913D",
          description: esc(f.description ?? ""),
        },
      })),
      ...questions.map((q) => ({
        type: "question",
        settings: {
          question: esc(q.question ?? ""),
          ...Object.fromEntries(
            [1, 2, 3, 4].flatMap((n) => [
              [`answer_${n}`, esc(q[`a${n}`] ?? "")],
              [`match_${n}`, matchVal(q[`m${n}`])],
            ]),
          ),
        },
      })),
    ],
  });

  return section({ style, markup, schema });
}

export const flavorQuiz: Tweak = {
  slug: "flavor-quiz",
  inspiredBy: "olipop",
  name: "Flavor Quiz",
  tagline: "Three playful questions with big colourful tiles that end in a matched flavor.",
  description:
    "Modeled on the flavour finder quiz OLIPOP uses to guide new shoppers. Three quick questions (vibe, sweetness, fruity or classic) are answered with big, colourful tiles; every answer points at a flavour, and the winner is revealed as a match card with its can photo, a “93% match” sticker, the answers that led there, a one-tap add to cart and a retake button. Turns “where do I start?” into a confident first order.",
  category: "homepage",
  tier: "free",
  tint: "#fdeee3",
  Preview,
  generateLiquid,
  defaults,
  fields: [
    { key: "eyebrow", label: "Eyebrow", type: "text", group: "Content" },
    { key: "heading", label: "Heading", type: "text", group: "Content" },
    { key: "subheading", label: "Subheading", type: "textarea", group: "Content" },
    {
      key: "questions", label: "Questions", type: "list", group: "Questions",
      hint: "Each answer's “→ flavor” is the flavor number it points to (1 = first flavor). Answer 4 is optional",
      itemFields: [
        { key: "question", label: "Question", type: "text" },
        { key: "a1", label: "Answer 1", type: "text" },
        { key: "m1", label: "Answer 1 → flavor", type: "text" },
        { key: "a2", label: "Answer 2", type: "text" },
        { key: "m2", label: "Answer 2 → flavor", type: "text" },
        { key: "a3", label: "Answer 3", type: "text" },
        { key: "m3", label: "Answer 3 → flavor", type: "text" },
        { key: "a4", label: "Answer 4", type: "text" },
        { key: "m4", label: "Answer 4 → flavor", type: "text" },
      ],
      newItem: { question: "Where are you drinking it?", a1: "Picnic", m1: "1", a2: "Beach", m2: "2", a3: "Movie night", m3: "3", a4: "", m4: "" },
      addLabel: "Add question", max: 5,
    },
    {
      key: "flavors", label: "Flavors", type: "list", group: "Flavors",
      hint: "Colour is a hex code; it tints the answer tiles and should match the photo backdrop",
      itemFields: [
        { key: "name", label: "Name", type: "text" },
        { key: "image", label: "Image URL", type: "text" },
        { key: "color", label: "Colour", type: "text" },
        { key: "description", label: "Description", type: "textarea" },
        { key: "price", label: "Preview price", type: "text" },
      ],
      newItem: { name: "Lime Ginger", color: "#A9D46F", image: "", description: "Fresh lime and a warm ginger kick.", price: "35.99" },
      addLabel: "Add flavor", max: 6,
    },
    { key: "stepLabel", label: "Step label", type: "text", group: "Quiz", hint: "{n} is the current question, {total} the number of questions" },
    { key: "backLabel", label: "Back button", type: "text", group: "Quiz" },
    { key: "resultEyebrow", label: "Result eyebrow", type: "text", group: "Result" },
    { key: "matchLabel", label: "“match” word", type: "text", group: "Result" },
    { key: "becauseLabel", label: "Answers label", type: "text", group: "Result" },
    { key: "buttonText", label: "Button text", type: "text", group: "Result" },
    { key: "addedText", label: "Added confirmation", type: "text", group: "Result" },
    { key: "retakeLabel", label: "Retake button", type: "text", group: "Result" },
    { key: "currency", label: "Currency symbol", type: "text", group: "Result" },
    {
      key: "startOn", label: "Editor preview shows", type: "select", group: "Result",
      options: [
        { label: "The quiz", value: "quiz" },
        { label: "The result", value: "result" },
      ],
    },
    fontField("Typography"),
    {
      key: "displayFont", label: "Display font", type: "select", group: "Typography",
      options: [
        { label: "Retro serif (italic)", value: "retro" },
        { label: "Serif", value: "serif" },
        { label: "Sans", value: "sans" },
        { label: "Theme font", value: "inherit" },
      ],
    },
    { key: "radius", label: "Corner radius", type: "slider", group: "Layout", min: 0, max: 40, step: 2, unit: "px" },
    { key: "bg", label: "Background", type: "color", group: "Colors" },
    { key: "textColor", label: "Text", type: "color", group: "Colors" },
    { key: "lightText", label: "Text on dark tiles", type: "color", group: "Colors" },
    { key: "panelBg", label: "Quiz panel", type: "color", group: "Colors" },
    { key: "mint", label: "Chips & sticker", type: "color", group: "Colors" },
    { key: "buttonBg", label: "Button", type: "color", group: "Colors" },
    { key: "buttonText2", label: "Button text", type: "color", group: "Colors" },
  ],
};
