"use client";

import { useState } from "react";
import type { Tweak, TweakConfig } from "../types";
import { str, num, bool, list, fontStack, esc } from "../cfg";
import { fontField } from "../fields";
import { buildSchema, section, fontFaceFor } from "../liquid";

/* ============================================================
   Results Timeline
   "What to expect" milestones on a stepper. Click a milestone to
   highlight it: the progress line fills to that point and its
   detail (with an optional stat) slides in. Horizontal on wide
   screens, a vertical timeline with inline detail on mobile.
   ============================================================ */

const EASE = "cubic-bezier(.22,1,.36,1)";
const POP = "cubic-bezier(.34,1.56,.64,1)";

const defaults: TweakConfig = {
  eyebrow: "Your first 90 days",
  heading: "What to expect, week by week",
  subheading: "Real change takes consistency. Here's how most people feel as the daily habit builds.",
  image: "/mockups/timeline-capsules.jpg",
  milestones: [
    {
      label: "7 days",
      benefit: "Lighter after meals",
      title: "Less bloating after meals",
      text: "As the cultures settle in, meals start to sit lighter and the afternoon bloat begins to ease.",
      stat: "64%",
      statLabel: "felt less bloated in the first week",
    },
    {
      label: "2 weeks",
      benefit: "A steadier rhythm",
      title: "Digestion finds its rhythm",
      text: "Mornings get more predictable and you think about your gut a lot less. Most people notice this first.",
      stat: "71%",
      statLabel: "reported more regular digestion",
    },
    {
      label: "4 weeks",
      benefit: "Even energy",
      title: "Energy that holds all day",
      text: "Better digestion means steadier energy: fewer mid-afternoon dips and less reaching for a second coffee.",
      stat: "78%",
      statLabel: "said their energy felt steadier",
    },
    {
      label: "3 months",
      benefit: "Lasting balance",
      title: "Balance becomes your baseline",
      text: "Keep the daily habit and the changes you felt early on become your new normal.",
      stat: "86%",
      statLabel: "would recommend it to a friend",
    },
  ],
  selected: 2,
  showFootnote: true,
  footnote: "Based on a 12-week survey of 210 customers taking two capsules daily. Individual results may vary.",
  accent: "#1F3B2D",
  soft: "#DCE6C9",
  bg: "#F7F6F1",
  textColor: "#1A1A1A",
  font: "system",
  radius: 20,
};

/** Hex color + alpha byte, e.g. tint("#1F3B2D", 0.14). */
const tint = (hex: string, a: number) =>
  /^#[0-9a-f]{6}$/i.test(hex)
    ? hex + Math.round(a * 255).toString(16).padStart(2, "0")
    : hex;

function Node({
  done,
  on,
  accent,
  soft,
  bg,
}: {
  done: boolean;
  on: boolean;
  accent: string;
  soft: string;
  bg: string;
}) {
  return (
    <span
      aria-hidden
      className="relative grid h-5 w-5 shrink-0 place-items-center rounded-full transition-[background-color,box-shadow,scale] duration-500"
      style={{
        background: done ? accent : bg,
        boxShadow: `inset 0 0 0 1.5px ${done ? tint(accent, 0) : tint(accent, 0.28)}, 0 0 0 ${on ? 6 : 0}px ${soft}`,
        scale: on ? "1.1" : "1",
        transitionTimingFunction: POP,
      }}
    >
      <svg
        width="10"
        height="10"
        viewBox="0 0 12 12"
        fill="none"
        stroke={soft}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="transition-opacity duration-300"
        style={{ opacity: done && !on ? 1 : 0 }}
      >
        <path d="M2.5 6.3l2.3 2.2 4.7-5" />
      </svg>
      <span
        className="absolute inset-[7px] rounded-full transition-opacity duration-300"
        style={{ background: soft, opacity: on ? 1 : 0 }}
      />
    </span>
  );
}

/** Full-bleed photo; the parent sets the shape (aspect ratio + radius). */
function Photo({ src }: { src: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      loading="lazy"
      decoding="async"
      className="absolute inset-0 h-full w-full object-cover"
    />
  );
}

function Preview({ config }: { config: TweakConfig }) {
  const accent = str(config, "accent", "#1F3B2D");
  const soft = str(config, "soft", "#DCE6C9");
  const bg = str(config, "bg", "#F7F6F1");
  const text = str(config, "textColor", "#1A1A1A");
  const radius = num(config, "radius", 20);
  const ms = list(config, "milestones");
  const n = ms.length;

  /* follow the "preselected" control, but let shoppers click around */
  const initial = Math.max(0, Math.min(num(config, "selected", 2) - 1, n - 1));
  const [prevInitial, setPrevInitial] = useState(initial);
  const [sel, setSel] = useState(initial);
  if (initial !== prevInitial) {
    setPrevInitial(initial);
    setSel(initial);
  }
  const active = Math.max(0, Math.min(sel, n - 1));
  const fill = n > 1 ? (active / (n - 1)) * 100 : 100;
  const m = ms[active];

  const eyebrow = str(config, "eyebrow");
  const heading = str(config, "heading");
  const sub = str(config, "subheading");
  const footnote = bool(config, "showFootnote", true) ? str(config, "footnote") : "";
  const image = str(config, "image").trim();

  return (
    <div
      className="@container w-full"
      style={{ background: bg, color: text, fontFamily: fontStack(str(config, "font", "system")) }}
    >
      <div className="mx-auto w-full max-w-[1040px] px-5 py-10 @min-[640px]:px-10 @min-[640px]:py-14">
        {eyebrow && (
          <p className="flex items-center gap-2 text-[12.5px]" style={{ color: accent }}>
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: accent }} />
            {eyebrow}
          </p>
        )}
        {heading && (
          <h3 className="mt-3 max-w-[560px] text-[27px] font-normal leading-[1.12] tracking-[-0.02em] @min-[640px]:text-[36px]">
            {heading}
          </h3>
        )}
        {sub && (
          <p className="mt-3 max-w-[520px] text-[14px] leading-relaxed" style={{ color: tint(text, 0.68) }}>
            {sub}
          </p>
        )}

        {/* Narrow: photo above the vertical timeline */}
        {image && (
          <div
            className="relative mt-7 aspect-square overflow-hidden @min-[640px]:hidden"
            style={{ background: soft, borderRadius: radius }}
          >
            <Photo src={image} />
          </div>
        )}

        {/* Wide: horizontal stepper + detail card (photo on the right) */}
        {n > 0 && (
          <div className="mt-11 hidden @min-[640px]:block">
            <div className="relative grid gap-x-3" style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}>
              <div
                aria-hidden
                className="absolute top-[9px] h-[2px] rounded-full"
                style={{ left: `${50 / n}%`, right: `${50 / n}%`, background: tint(accent, 0.14) }}
              >
                <div
                  className="h-full rounded-full transition-[width] duration-700"
                  style={{ width: `${fill}%`, background: accent, transitionTimingFunction: EASE }}
                />
              </div>
              {ms.map((s, i) => (
                <button
                  key={i}
                  type="button"
                  aria-pressed={i === active}
                  onClick={() => setSel(i)}
                  className="relative flex flex-col items-center px-1.5 text-center"
                >
                  <Node done={i <= active} on={i === active} accent={accent} soft={soft} bg={bg} />
                  <span className="mt-4 text-[15px] font-medium tracking-[-0.01em]">{s.label}</span>
                  <span
                    className="mt-0.5 text-[12.5px] transition-opacity duration-300"
                    style={{ opacity: i === active ? 0.85 : 0.55 }}
                  >
                    {s.benefit}
                  </span>
                </button>
              ))}
            </div>

            {m && !image && (
              <div
                key={active}
                className="bs-fade-up mt-8 grid items-center gap-8 p-8"
                style={{
                  background: soft,
                  color: accent,
                  borderRadius: radius,
                  gridTemplateColumns: m.stat ? "minmax(0, 1fr) auto" : "minmax(0, 1fr)",
                }}
              >
                <div>
                  <span
                    className="inline-block rounded-full px-2.5 py-1 text-[11.5px] leading-none"
                    style={{ background: accent, color: soft }}
                  >
                    {m.label}
                  </span>
                  <p className="mt-4 text-[24px] leading-[1.2] tracking-[-0.015em]">{m.title}</p>
                  <p className="mt-2 max-w-[480px] text-[14.5px] leading-relaxed" style={{ opacity: 0.8 }}>
                    {m.text}
                  </p>
                </div>
                {m.stat && (
                  <div className="max-w-[200px] border-l pl-8" style={{ borderColor: tint(accent, 0.15) }}>
                    <p className="text-[56px] font-light leading-none tracking-[-0.03em]">{m.stat}</p>
                    <p className="mt-2 text-[12.5px] leading-snug" style={{ opacity: 0.8 }}>
                      {m.statLabel}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* With a photo: copy + stat on the left, the photo full-bleed on the right */}
            {m && image && (
              <div
                className="mt-8 grid grid-cols-[minmax(0,1fr)_minmax(0,0.64fr)] overflow-hidden"
                style={{ background: soft, color: accent, borderRadius: radius }}
              >
                <div key={active} className="bs-fade-up flex flex-col justify-center p-8">
                  <span
                    className="self-start rounded-full px-2.5 py-1 text-[11.5px] leading-none"
                    style={{ background: accent, color: soft }}
                  >
                    {m.label}
                  </span>
                  <p className="mt-4 text-[24px] leading-[1.2] tracking-[-0.015em]">{m.title}</p>
                  <p className="mt-2 max-w-[440px] text-[14.5px] leading-relaxed" style={{ opacity: 0.8 }}>
                    {m.text}
                  </p>
                  {m.stat && (
                    <div
                      className="mt-6 flex items-end gap-4 border-t pt-5"
                      style={{ borderColor: tint(accent, 0.15) }}
                    >
                      <p className="shrink-0 text-[52px] font-light leading-[0.85] tracking-[-0.03em]">{m.stat}</p>
                      <p className="max-w-[180px] text-[12.5px] leading-snug" style={{ opacity: 0.8 }}>
                        {m.statLabel}
                      </p>
                    </div>
                  )}
                </div>
                <div className="relative">
                  {/* sets the photo's minimum shape (4:5, square when wide); it grows with longer copy */}
                  <div aria-hidden className="aspect-[4/5] @min-[960px]:aspect-square" />
                  <Photo src={image} />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Narrow: vertical timeline with inline detail */}
        <ol className="mt-8 @min-[640px]:hidden">
          {ms.map((s, i) => {
            const on = i === active;
            const done = i <= active;
            const last = i === n - 1;
            return (
              <li key={i} className={`relative ${last ? "" : "pb-[22px]"}`}>
                {!last && (
                  <span
                    aria-hidden
                    className="absolute bottom-[2px] left-[9px] top-[26px] w-[2px] overflow-hidden rounded-full"
                    style={{ background: tint(accent, 0.14) }}
                  >
                    <span
                      className="block h-full w-full origin-top transition-[scale] duration-[600ms]"
                      style={{ background: accent, scale: done && !on ? "1 1" : "1 0", transitionTimingFunction: EASE }}
                    />
                  </span>
                )}
                <button
                  type="button"
                  aria-expanded={on}
                  onClick={() => setSel(i)}
                  className="flex w-full items-start gap-4 text-left"
                >
                  <Node done={done} on={on} accent={accent} soft={soft} bg={bg} />
                  <span className="pt-px">
                    <span className="block text-[15px] font-medium tracking-[-0.01em]">{s.label}</span>
                    <span className="mt-0.5 block text-[13px]" style={{ opacity: 0.6 }}>
                      {s.benefit}
                    </span>
                  </span>
                </button>
                <div
                  className="grid pl-9 transition-[grid-template-rows] duration-500"
                  style={{ gridTemplateRows: on ? "1fr" : "0fr", transitionTimingFunction: EASE }}
                >
                  <div className="min-h-0 overflow-hidden">
                    <div
                      className="mt-3.5 p-[18px]"
                      style={{ background: soft, color: accent, borderRadius: Math.max(8, radius - 4) }}
                    >
                      <p className="text-[18px] leading-[1.25] tracking-[-0.015em]">{s.title}</p>
                      <p className="mt-1.5 text-[13.5px] leading-relaxed" style={{ opacity: 0.8 }}>
                        {s.text}
                      </p>
                      {s.stat && (
                        <div
                          className="mt-3.5 flex items-baseline gap-2.5 border-t pt-3.5"
                          style={{ borderColor: tint(accent, 0.15) }}
                        >
                          <span className="text-[34px] font-light leading-none tracking-[-0.03em]">{s.stat}</span>
                          <span className="text-[12.5px] leading-snug" style={{ opacity: 0.8 }}>
                            {s.statLabel}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>

        {footnote && (
          <p className="mt-8 max-w-[640px] text-[11.5px] leading-relaxed" style={{ opacity: 0.55 }}>
            * {footnote}
          </p>
        )}
      </div>
    </div>
  );
}

function generateLiquid(config: TweakConfig): string {
  const { face, family } = fontFaceFor(str(config, "font", "system"));
  const S = ".bs-rt-{{ section.id }}";
  const a = "{{ section.settings.accent }}";
  const mix = (pct: number) => `color-mix(in srgb, ${a} ${pct}%, transparent)`;

  const style = `<style>
${face ? face + "\n" : ""}  ${S} { container-type: inline-size; background: {{ section.settings.bg }}; color: {{ section.settings.text_color }}; font-family: ${family}; }
  ${S} * { box-sizing: border-box; }
  ${S} p, ${S} h2, ${S} ol { margin: 0; }
  ${S} .bs-in { max-width: 1040px; margin: 0 auto; padding: 40px 20px; }
  ${S} .bs-eyebrow { display: flex; align-items: center; gap: 8px; font-size: 12.5px; color: ${a}; }
  ${S} .bs-eyebrow::before { content: ""; width: 6px; height: 6px; border-radius: 99px; background: currentColor; }
  ${S} .bs-h { margin-top: 12px; max-width: 560px; font-size: 27px; font-weight: 400; line-height: 1.12; letter-spacing: -.02em; }
  ${S} .bs-sh { margin-top: 12px; max-width: 520px; font-size: 14px; line-height: 1.6; opacity: .68; }
  ${S} .bs-media { position: relative; margin-top: 28px; aspect-ratio: 1; overflow: hidden; background: {{ section.settings.soft }}; border-radius: {{ section.settings.radius }}px; }
  ${S} .bs-media img, ${S} .bs-cimg img { position: absolute; inset: 0; display: block; width: 100%; height: 100%; object-fit: cover; }
  ${S} .bs-steps { position: relative; margin-top: 32px; padding: 0; list-style: none; }
  ${S} .bs-track { display: none; }
  ${S} .bs-step { position: relative; padding-bottom: 22px; }
  ${S} .bs-step:last-child { padding-bottom: 0; }
  ${S} .bs-step::before, ${S} .bs-step::after { content: ""; position: absolute; left: 9px; top: 26px; bottom: 2px; width: 2px; border-radius: 2px; background: ${mix(14)}; }
  ${S} .bs-step::after { background: ${a}; transform: scaleY(0); transform-origin: top; transition: transform .6s cubic-bezier(.22,1,.36,1); }
  ${S} .bs-step.is-done:not(.is-active)::after { transform: none; }
  ${S} .bs-step:last-child::before, ${S} .bs-step:last-child::after { display: none; }
  ${S} .bs-btn { display: flex; align-items: flex-start; gap: 16px; width: 100%; padding: 0; border: 0; background: none; color: inherit; font: inherit; text-align: left; cursor: pointer; }
  ${S} .bs-btn:focus-visible { outline: 2px solid ${a}; outline-offset: 4px; border-radius: 6px; }
  ${S} .bs-node { position: relative; width: 20px; height: 20px; flex-shrink: 0; border-radius: 99px; display: grid; place-items: center;
    background: {{ section.settings.bg }}; color: {{ section.settings.soft }};
    box-shadow: inset 0 0 0 1.5px ${mix(28)}, 0 0 0 0 {{ section.settings.soft }};
    transition: background-color .5s cubic-bezier(.34,1.56,.64,1), box-shadow .5s cubic-bezier(.34,1.56,.64,1), transform .5s cubic-bezier(.34,1.56,.64,1); }
  ${S} .bs-node svg { opacity: 0; transition: opacity .3s; }
  ${S} .bs-node::after { content: ""; position: absolute; inset: 7px; border-radius: 99px; background: {{ section.settings.soft }}; opacity: 0; transition: opacity .3s; }
  ${S} .is-done .bs-node { background: ${a}; box-shadow: inset 0 0 0 1.5px transparent, 0 0 0 0 {{ section.settings.soft }}; }
  ${S} .is-done:not(.is-active) .bs-node svg { opacity: 1; }
  ${S} .is-active .bs-node { transform: scale(1.1); box-shadow: inset 0 0 0 1.5px transparent, 0 0 0 6px {{ section.settings.soft }}; }
  ${S} .is-active .bs-node::after { opacity: 1; }
  ${S} .bs-txt { display: block; padding-top: 1px; }
  ${S} .bs-lbl { display: block; font-size: 15px; font-weight: 500; letter-spacing: -.01em; }
  ${S} .bs-ben { display: block; margin-top: 2px; font-size: 13px; opacity: .6; transition: opacity .3s; }
  ${S} .bs-detail { display: grid; grid-template-rows: 0fr; padding-left: 36px; transition: grid-template-rows .5s cubic-bezier(.22,1,.36,1); }
  ${S} .is-active .bs-detail { grid-template-rows: 1fr; }
  ${S} .bs-detail > div { min-height: 0; overflow: hidden; }
  ${S} .bs-card { margin-top: 14px; padding: 18px; background: {{ section.settings.soft }}; color: ${a}; border-radius: {{ section.settings.radius | minus: 4 | at_least: 8 }}px; }
  ${S} .bs-cimg { display: none; }
  ${S} .bs-pill { display: none; padding: 5px 10px; border-radius: 99px; background: ${a}; color: {{ section.settings.soft }}; font-size: 11.5px; line-height: 1; }
  ${S} .bs-ct { font-size: 18px; line-height: 1.25; letter-spacing: -.015em; }
  ${S} .bs-cx { margin-top: 6px; font-size: 13.5px; line-height: 1.6; opacity: .8; }
  ${S} .bs-stat { margin-top: 14px; padding-top: 14px; display: flex; align-items: baseline; gap: 10px; border-top: 1px solid ${mix(15)}; }
  ${S} .bs-sv { font-size: 34px; font-weight: 300; line-height: 1; letter-spacing: -.03em; }
  ${S} .bs-sl { font-size: 12.5px; line-height: 1.4; opacity: .8; }
  ${S} .bs-foot { margin-top: 32px; max-width: 640px; font-size: 11.5px; line-height: 1.6; opacity: .55; }
  @keyframes bs-rt-in { from { opacity: 0; transform: translateY(8px); } }
  @container (min-width: 640px) {
    ${S} .bs-in { padding: 56px 40px; }
    ${S} .bs-h { font-size: 36px; }
    ${S} .bs-steps { display: grid; grid-template-columns: repeat(var(--n), minmax(0, 1fr)); column-gap: 12px; margin-top: 44px; }
    ${S} .bs-track { display: block; position: absolute; top: 9px; height: 2px; left: calc(50% / var(--n)); right: calc(50% / var(--n)); border-radius: 2px; background: ${mix(14)}; }
    ${S} .bs-fill { display: block; height: 100%; border-radius: 2px; background: ${a}; transition: width .7s cubic-bezier(.22,1,.36,1); }
    ${S} .bs-step { display: contents; }
    ${S} .bs-step::before, ${S} .bs-step::after { display: none; }
    ${S} .bs-btn { position: relative; flex-direction: column; align-items: center; gap: 0; padding: 0 6px; text-align: center; }
    ${S} .bs-lbl { margin-top: 16px; }
    ${S} .bs-ben { opacity: .55; }
    ${S} .is-active .bs-ben { opacity: .85; }
    ${S} .bs-detail { display: none; grid-row: 2; grid-column: 1 / -1; padding: 0; margin-top: 32px; }
    ${S} .is-active .bs-detail { display: block; animation: bs-rt-in .42s cubic-bezier(.22,1,.36,1) both; }
    ${S} .bs-media { display: none; }
    ${S} .bs-card { margin: 0; padding: 32px; border-radius: {{ section.settings.radius }}px; }
    ${S} .bs-card.has-stat .bs-cb { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 32px; align-items: center; }
    ${S} .bs-pill { display: inline-block; }
    ${S} .bs-ct { margin-top: 16px; font-size: 24px; line-height: 1.2; }
    ${S} .bs-cx { margin-top: 8px; max-width: 480px; font-size: 14.5px; }
    ${S} .bs-stat { display: block; max-width: 200px; margin: 0; padding: 0 0 0 32px; border-top: 0; border-left: 1px solid ${mix(15)}; }
    ${S} .bs-sv { font-size: 56px; }
    ${S} .bs-sl { margin-top: 8px; }
    ${S} .bs-card.has-img { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, .64fr); padding: 0; overflow: hidden; }
    ${S} .has-img .bs-cb, ${S} .has-img.has-stat .bs-cb { display: flex; flex-direction: column; justify-content: center; align-items: stretch; gap: 0; padding: 32px; }
    ${S} .has-img .bs-cx { max-width: 440px; }
    ${S} .has-img .bs-stat { display: flex; align-items: flex-end; gap: 16px; max-width: none; margin-top: 24px; padding: 20px 0 0; border-left: 0; border-top: 1px solid ${mix(15)}; }
    ${S} .has-img .bs-sv { flex-shrink: 0; font-size: 52px; line-height: .85; }
    ${S} .has-img .bs-sl { max-width: 180px; margin-top: 0; }
    ${S} .bs-cimg { display: block; position: relative; }
    ${S} .bs-cimg::before { content: ""; display: block; aspect-ratio: 4 / 5; }
  }
  @container (min-width: 960px) {
    ${S} .bs-cimg::before { aspect-ratio: 1; }
  }
  @media (prefers-reduced-motion: reduce) {
    ${S} *, ${S} *::before, ${S} *::after { transition-duration: 1ms !important; animation-duration: 1ms !important; }
  }
</style>`;

  const markup = `{%- comment -%}
  Results Timeline by boost.supply. Add it to your product template (or any
  page). Each "Milestone" block is one step; the stat is optional. Keep any
  claims and the footnote accurate for your own product.
  The photo comes from the section's image picker: it sits beside the
  milestone details on desktop and above the timeline on mobile.
{%- endcomment -%}
{%- liquid
  assign bs_img = section.settings.image
  assign bs_n = section.blocks.size
  assign bs_sel = section.settings.selected
  if bs_sel > bs_n
    assign bs_sel = bs_n
  endif
  assign bs_pct = 100
  if bs_sel < 1
    assign bs_sel = 1
  endif
  if bs_n > 1
    assign bs_den = bs_n | minus: 1
    assign bs_pct = bs_sel | minus: 1 | times: 100.0 | divided_by: bs_den
  endif
-%}
<div class="bs-rt-{{ section.id }}" id="bs-rt-{{ section.id }}" data-selected="{{ bs_sel }}">
  <div class="bs-in">
    {%- if section.settings.eyebrow != blank -%}<p class="bs-eyebrow">{{ section.settings.eyebrow }}</p>{%- endif -%}
    {%- if section.settings.heading != blank -%}<h2 class="bs-h">{{ section.settings.heading }}</h2>{%- endif -%}
    {%- if section.settings.subheading != blank -%}<p class="bs-sh">{{ section.settings.subheading }}</p>{%- endif -%}

    {%- if bs_img != blank -%}
      <div class="bs-media">{{ bs_img | image_url: width: 900 | image_tag: loading: 'lazy', sizes: '(min-width: 750px) 50vw, 100vw' }}</div>
    {%- endif -%}

    <ol class="bs-steps" style="--n: {{ bs_n | at_least: 1 }};">
      <li class="bs-track" aria-hidden="true"><span class="bs-fill" style="width: {{ bs_pct }}%;"></span></li>
      {%- for block in section.blocks -%}
        <li class="bs-step{% if forloop.index <= bs_sel %} is-done{% endif %}{% if forloop.index == bs_sel %} is-active{% endif %}" {{ block.shopify_attributes }}>
          <button type="button" class="bs-btn" aria-expanded="{% if forloop.index == bs_sel %}true{% else %}false{% endif %}">
            <span class="bs-node" aria-hidden="true"><svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 6.3l2.3 2.2 4.7-5"/></svg></span>
            <span class="bs-txt">
              <span class="bs-lbl">{{ block.settings.label }}</span>
              {%- if block.settings.benefit != blank -%}<span class="bs-ben">{{ block.settings.benefit }}</span>{%- endif -%}
            </span>
          </button>
          <div class="bs-detail">
            <div>
              <div class="bs-card{% if block.settings.stat != blank %} has-stat{% endif %}{% if bs_img != blank %} has-img{% endif %}">
                <div class="bs-cb">
                  <div>
                    <span class="bs-pill">{{ block.settings.label }}</span>
                    {%- if block.settings.title != blank -%}<p class="bs-ct">{{ block.settings.title }}</p>{%- endif -%}
                    {%- if block.settings.text != blank -%}<p class="bs-cx">{{ block.settings.text }}</p>{%- endif -%}
                  </div>
                  {%- if block.settings.stat != blank -%}
                    <div class="bs-stat">
                      <p class="bs-sv">{{ block.settings.stat }}</p>
                      {%- if block.settings.stat_label != blank -%}<p class="bs-sl">{{ block.settings.stat_label }}</p>{%- endif -%}
                    </div>
                  {%- endif -%}
                </div>
                {%- if bs_img != blank -%}
                  <div class="bs-cimg">{{ bs_img | image_url: width: 900 | image_tag: loading: 'lazy', sizes: '(min-width: 750px) 40vw, 100vw' }}</div>
                {%- endif -%}
              </div>
            </div>
          </div>
        </li>
      {%- endfor -%}
    </ol>

    {%- if section.settings.show_footnote and section.settings.footnote != blank -%}
      <p class="bs-foot">* {{ section.settings.footnote }}</p>
    {%- endif -%}
  </div>
</div>
<script>
  (function () {
    var root = document.getElementById('bs-rt-{{ section.id }}');
    if (!root) return;
    var steps = root.querySelectorAll('.bs-step');
    var fill = root.querySelector('.bs-fill');
    function set(i) {
      steps.forEach(function (s, k) {
        s.classList.toggle('is-active', k === i);
        s.classList.toggle('is-done', k <= i);
        var b = s.querySelector('.bs-btn');
        if (b) b.setAttribute('aria-expanded', k === i ? 'true' : 'false');
      });
      if (fill) fill.style.width = (steps.length > 1 ? (i / (steps.length - 1)) * 100 : 100) + '%';
    }
    steps.forEach(function (s, k) {
      var b = s.querySelector('.bs-btn');
      if (b) b.addEventListener('click', function () { set(k); });
    });
    document.addEventListener('shopify:block:select', function (e) {
      var k = Array.prototype.indexOf.call(steps, e.target);
      if (k > -1) set(k);
    });
    var start = parseInt(root.getAttribute('data-selected'), 10) || 1;
    set(Math.max(0, Math.min(steps.length, start) - 1));
  })();
</script>`;

  const ms = list(config, "milestones");

  const schema = buildSchema({
    name: "Results Timeline",
    settings: [
      { type: "text", id: "eyebrow", label: "Eyebrow", default: str(config, "eyebrow") },
      { type: "text", id: "heading", label: "Heading", default: str(config, "heading") },
      { type: "textarea", id: "subheading", label: "Subheading", default: str(config, "subheading") },
      { type: "image_picker", id: "image", label: "Image", info: "Shows beside the milestone details, and above the timeline on mobile. Leave empty for no photo." },
      { type: "range", id: "selected", label: "Preselected milestone", min: 1, max: 6, step: 1, default: Math.max(1, Math.min(6, num(config, "selected", 2))) },
      { type: "header", content: "Footnote" },
      { type: "checkbox", id: "show_footnote", label: "Show footnote", default: bool(config, "showFootnote", true) },
      { type: "textarea", id: "footnote", label: "Footnote", default: str(config, "footnote") },
      { type: "header", content: "Style" },
      { type: "color", id: "accent", label: "Accent", default: str(config, "accent") },
      { type: "color", id: "soft", label: "Detail card", default: str(config, "soft") },
      { type: "color", id: "bg", label: "Background", default: str(config, "bg") },
      { type: "color", id: "text_color", label: "Text", default: str(config, "textColor") },
      { type: "range", id: "radius", label: "Corner radius", min: 0, max: 32, step: 2, unit: "px", default: Math.max(0, Math.min(32, Math.round(num(config, "radius", 20) / 2) * 2)) },
    ],
    blocks: [
      {
        type: "milestone",
        name: "Milestone",
        settings: [
          { type: "text", id: "label", label: "Time label" },
          { type: "text", id: "benefit", label: "Short benefit" },
          { type: "text", id: "title", label: "Detail title" },
          { type: "textarea", id: "text", label: "Detail text" },
          { type: "text", id: "stat", label: "Stat (optional)" },
          { type: "text", id: "stat_label", label: "Stat label" },
        ],
      },
    ],
    maxBlocks: 6,
    presetBlocks: ms.slice(0, 6).map((s) => ({
      type: "milestone",
      settings: {
        label: esc(s.label ?? ""),
        benefit: esc(s.benefit ?? ""),
        title: esc(s.title ?? ""),
        text: esc(s.text ?? ""),
        stat: esc(s.stat ?? ""),
        stat_label: esc(s.statLabel ?? ""),
      },
    })),
  });

  return section({ style, markup, schema });
}

export const resultsTimeline: Tweak = {
  slug: "results-timeline",
  inspiredBy: "seed",
  name: "Results Timeline",
  tagline: "Show what changes at 7 days, 2 weeks and 3 months, so shoppers commit to the habit.",
  description:
    "Modeled on the results timeline Seed uses on its product pages. Milestones sit on a stepper; tapping one fills the progress line to that point and reveals what to expect, with an optional stat. It runs horizontally on desktop and as a vertical timeline on mobile, with an optional footnote for how the results were measured. It sets honest expectations and gives a reason to stick around past the first week.",
  category: "product-page",
  tier: "free",
  tint: "#eef2ea",
  Preview,
  generateLiquid,
  defaults,
  fields: [
    { key: "eyebrow", label: "Eyebrow", type: "text", group: "Content" },
    { key: "heading", label: "Heading", type: "text", group: "Content" },
    { key: "subheading", label: "Subheading", type: "textarea", group: "Content" },
    {
      key: "image", label: "Image URL", type: "text", group: "Media",
      hint: "Sits beside the milestone details (above the timeline on mobile). Leave empty for no photo. In Shopify you pick it with the image picker",
    },
    {
      key: "milestones", label: "Milestones", type: "list", group: "Milestones",
      hint: "The stat is optional; leave it empty to hide it",
      itemFields: [
        { key: "label", label: "Time label", type: "text" },
        { key: "benefit", label: "Short benefit", type: "text" },
        { key: "title", label: "Detail title", type: "text" },
        { key: "text", label: "Detail text", type: "textarea" },
        { key: "stat", label: "Stat", type: "text" },
        { key: "statLabel", label: "Stat label", type: "text" },
      ],
      newItem: { label: "6 months", benefit: "Second nature", title: "A habit you don't think about", text: "By now it's part of your routine, and the benefits keep compounding.", stat: "", statLabel: "" },
      addLabel: "Add milestone",
      max: 6,
    },
    { key: "selected", label: "Preselected milestone", type: "slider", group: "Milestones", min: 1, max: 6, step: 1 },
    { key: "showFootnote", label: "Show footnote", type: "toggle", group: "Footnote" },
    { key: "footnote", label: "Footnote", type: "textarea", group: "Footnote" },
    fontField("Typography"),
    { key: "radius", label: "Corner radius", type: "slider", group: "Layout", min: 0, max: 32, step: 2, unit: "px" },
    { key: "accent", label: "Accent", type: "color", group: "Colors" },
    { key: "soft", label: "Detail card", type: "color", group: "Colors" },
    { key: "bg", label: "Background", type: "color", group: "Colors" },
    { key: "textColor", label: "Text", type: "color", group: "Colors" },
  ],
};
