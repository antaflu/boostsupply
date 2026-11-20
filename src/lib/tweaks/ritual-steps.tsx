"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { Tweak, TweakConfig } from "../types";
import { str, num, bool, list, fontStack, esc } from "../cfg";
import { fontField } from "../fields";
import { buildSchema, section, fontFaceFor } from "../liquid";
import { Icon, iconMarkup } from "../icons";

/* ============================================================
   Daily Ritual Steps
   How-to-use steps as numbered cards with big numerals and a
   photo or icon tile each. A progress line runs through the
   steps and fills as the section scrolls into view; clicking a
   step jumps the line to it.
   ============================================================ */

const EASE = "cubic-bezier(.22,1,.36,1)";

const defaults: TweakConfig = {
  eyebrow: "Your daily ritual",
  heading: "Thirty seconds to a better morning",
  text: "No blender, no recipe. Four small steps you'll actually keep doing.",
  steps: [
    { title: "1 scoop", text: "Level off one scoop. That's your full daily serving.", image: "/mockups/gift-scoop.jpg", icon: "pack:sparkles", tile: "" },
    { title: "8oz cold water", text: "Pour it into a shaker or glass with 8oz of cold water.", image: "", icon: "pack:drop", tile: "8oz" },
    { title: "Shake 20 sec", text: "Seal and shake hard for twenty seconds until smooth.", image: "", icon: "pack:clock", tile: "20s" },
    { title: "Drink before breakfast", text: "Drink it on an empty stomach and start your day.", image: "/mockups/value-greens.jpg", icon: "pack:sun", tile: "" },
  ],
  fillMode: "scroll",
  showButton: true,
  buttonText: "Start your ritual",
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

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
const pad = (i: number) => String(i + 1).padStart(2, "0");

/** Scroll progress of an element through the viewport, 0..1. */
function scrollProgress(el: Element) {
  const r = el.getBoundingClientRect();
  const vh = window.innerHeight || 800;
  const start = vh * 0.85;
  const end = vh * 0.4;
  return clamp01((start - r.top) / Math.max(1, start - end + r.height * 0.5));
}

function Preview({ config }: { config: TweakConfig }) {
  const bg = str(config, "bg", "#F4F1E8");
  const card = str(config, "card", "#FFFFFF");
  const text = str(config, "textColor", "#111111");
  const muted = str(config, "muted", "#5B635E");
  const accent = str(config, "accent", "#12372A");
  const accentText = str(config, "accentText", "#F4F1E8");
  const sage = str(config, "sage", "#C9D6C3");
  const radius = num(config, "radius", 18);
  const steps = list(config, "steps");
  const n = steps.length;
  const scrollMode = str(config, "fillMode", "scroll") === "scroll";

  const ref = useRef<HTMLOListElement>(null);
  const [p, setP] = useState(0);

  /* fill with scroll; scroll events from any scroller (the editor scrolls its own panel) */
  useEffect(() => {
    if (!scrollMode) return;
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    const update = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setP(scrollProgress(el)));
    };
    update();
    document.addEventListener("scroll", update, { capture: true, passive: true });
    window.addEventListener("resize", update);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("scroll", update, { capture: true });
      window.removeEventListener("resize", update);
    };
  }, [scrollMode]);

  const stepsDone = p * Math.max(0, n - 1);
  const current = Math.min(n - 1, Math.floor(stepsDone + 0.001));
  const go = (i: number) => setP(n > 1 ? i / (n - 1) : 1);

  return (
    <div className="@container w-full" style={{ background: bg, color: text, fontFamily: fontStack(str(config, "font", "system")) }}>
      <div className="mx-auto w-full max-w-[1120px] px-5 py-9 @min-[720px]:px-10 @min-[720px]:py-14">
        <div className="@min-[720px]:flex @min-[720px]:items-end @min-[720px]:justify-between @min-[720px]:gap-10">
          <div className="max-w-[560px]">
            {str(config, "eyebrow") && (
              <p className="inline-flex items-center gap-2 text-[13px] font-medium" style={{ color: accent }}>
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: accent }} />
                {str(config, "eyebrow")}
              </p>
            )}
            {str(config, "heading") && (
              <h3 className="mt-3 text-balance text-[30px] font-semibold leading-[1.02] tracking-[-0.035em] @min-[720px]:text-[44px]">
                {str(config, "heading")}
              </h3>
            )}
          </div>
          {str(config, "text") && (
            <p className="mt-3 max-w-[340px] text-[14px] leading-relaxed @min-[720px]:mt-0 @min-[720px]:pb-1.5 @min-[720px]:text-right" style={{ color: muted }}>
              {str(config, "text")}
            </p>
          )}
        </div>

        <ol
          ref={ref}
          className="relative mt-7 grid gap-4 @min-[720px]:mt-10 @min-[720px]:grid-cols-[repeat(var(--n),minmax(0,1fr))] @min-[720px]:gap-5"
          style={{ "--n": Math.max(1, n) } as CSSProperties}
        >
          {steps.map((s, i) => {
            const reached = i <= stepsDone + 0.001;
            const isCur = i === current;
            const seg = clamp01(stepsDone - i);
            const photo = (s.image ?? "").trim();
            return (
              <li
                key={i}
                className="relative grid cursor-pointer grid-cols-[28px_minmax(0,1fr)] content-start gap-3 @min-[720px]:grid-cols-1 @min-[720px]:grid-rows-[auto_1fr] @min-[720px]:gap-4"
                onClick={() => go(i)}
              >
                {/* segment to the next node */}
                {i < n - 1 && (
                  <span
                    aria-hidden
                    className="absolute bottom-[-12px] left-[13px] top-[32px] w-[2px] overflow-hidden rounded-full @min-[720px]:bottom-auto @min-[720px]:left-[calc(50%+18px)] @min-[720px]:top-[13px] @min-[720px]:h-[2px] @min-[720px]:w-[calc(100%-16px)]"
                    style={{ background: tint(text, 0.1) }}
                  >
                    <span
                      className="absolute inset-0 origin-top scale-y-[var(--s)] rounded-full transition-[scale] duration-700 @min-[720px]:origin-left @min-[720px]:scale-x-[var(--s)] @min-[720px]:scale-y-100"
                      style={{ "--s": seg, background: accent, transitionTimingFunction: EASE } as CSSProperties}
                    />
                  </span>
                )}

                {/* node */}
                <span
                  className="relative z-[1] grid h-7 w-7 place-items-center rounded-full transition-[background-color,box-shadow,scale] duration-500 @min-[720px]:mx-auto"
                  style={{
                    background: reached ? accent : bg,
                    color: reached ? accentText : muted,
                    boxShadow: reached ? `0 0 0 4px ${tint(accent, isCur ? 0.16 : 0)}` : `inset 0 0 0 1.5px ${tint(text, 0.2)}`,
                    scale: isCur ? "1.08" : "1",
                    transitionTimingFunction: EASE,
                  }}
                >
                  {reached && !isCur ? (
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="M2.5 6.3l2.3 2.2 4.7-5" />
                    </svg>
                  ) : (
                    <span className="text-[11px] font-semibold tabular-nums">{i + 1}</span>
                  )}
                </span>

                {/* card */}
                <div
                  className="flex min-w-0 items-center gap-3 p-2.5 transition-[box-shadow,opacity] duration-500 @min-[720px]:flex-col @min-[720px]:items-stretch @min-[720px]:gap-0"
                  style={{
                    background: card,
                    borderRadius: radius,
                    boxShadow: isCur ? `inset 0 0 0 1.5px ${accent}, 0 18px 36px -24px ${tint(accent, 0.6)}` : `inset 0 0 0 1px ${tint(text, 0.07)}`,
                    opacity: reached ? 1 : 0.62,
                    transitionTimingFunction: EASE,
                  }}
                >
                  <div className="order-2 min-w-0 flex-1 py-1 pr-1 @min-[720px]:order-none @min-[720px]:px-2 @min-[720px]:pb-2 @min-[720px]:pt-4">
                    <p
                      className="text-[30px] font-semibold leading-none tracking-[-0.05em] tabular-nums transition-colors duration-500 @min-[720px]:text-[52px]"
                      style={{ color: reached ? accent : tint(text, 0.2) }}
                    >
                      {pad(i)}
                    </p>
                    <p className="mt-2 text-[15.5px] font-semibold leading-tight tracking-[-0.015em] @min-[720px]:mt-3 @min-[720px]:text-[17px]">
                      {s.title}
                    </p>
                    {s.text && (
                      <p className="mt-1 text-[12.5px] leading-snug @min-[720px]:mt-1.5 @min-[720px]:text-[13px]" style={{ color: muted }}>
                        {s.text}
                      </p>
                    )}
                  </div>
                  <div
                    className="relative order-3 grid aspect-square w-[84px] shrink-0 place-items-center overflow-hidden @min-[720px]:order-first @min-[720px]:aspect-[4/3] @min-[720px]:w-full"
                    style={{ background: sage, borderRadius: Math.max(6, radius - 8) }}
                  >
                    {photo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={photo}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        className="absolute inset-0 h-full w-full object-cover transition-[scale] duration-700"
                        style={{ scale: isCur ? "1.04" : "1", transitionTimingFunction: EASE }}
                      />
                    ) : (
                      <div className="flex flex-col items-center gap-1 @min-[720px]:gap-1.5 @min-[720px]:[&>svg]:h-[34px] @min-[720px]:[&>svg]:w-[34px]" style={{ color: accent }}>
                        {s.icon && <Icon token={s.icon} size={26} strokeWidth={1.6} />}
                        {s.tile && (
                          <span className="text-[17px] font-semibold leading-none tracking-[-0.04em] @min-[720px]:text-[30px]">{s.tile}</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>

        {bool(config, "showButton", true) && str(config, "buttonText") && (
          <div className="mt-8 flex justify-center @min-[720px]:mt-10">
            <button
              type="button"
              className="flex h-12 w-full items-center justify-center rounded-full px-7 text-[15px] font-medium transition-[filter,scale] duration-200 hover:brightness-125 active:scale-[0.99] @min-[720px]:w-auto"
              style={{ background: accent, color: accentText }}
            >
              {str(config, "buttonText")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function generateLiquid(config: TweakConfig): string {
  const { face, family } = fontFaceFor(str(config, "font", "system"));
  const S = ".bs-rs-{{ section.id }}";
  const t = "{{ section.settings.text_color }}";
  const acc = "{{ section.settings.accent }}";
  const tx = (pct: number) => `color-mix(in srgb, ${t} ${pct}%, transparent)`;
  const r = "{{ section.settings.radius }}px";
  const rt = "{{ section.settings.radius | minus: 8 | at_least: 6 }}px";
  const check = `<svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2.5 6.3l2.3 2.2 4.7-5"/></svg>`;

  const style = `<style>
${face ? face + "\n" : ""}  ${S} { container-type: inline-size; background: {{ section.settings.bg }}; color: ${t}; font-family: ${family}; }
  ${S} * { box-sizing: border-box; }
  ${S} p, ${S} h2, ${S} ol { margin: 0; }
  ${S} .bs-in { max-width: 1120px; margin: 0 auto; padding: 36px 20px; }
  ${S} .bs-eyebrow { display: inline-flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 500; color: ${acc}; }
  ${S} .bs-eyebrow::before { content: ""; width: 6px; height: 6px; border-radius: 99px; background: ${acc}; }
  ${S} .bs-h { margin-top: 12px; max-width: 560px; font-size: 30px; font-weight: 600; line-height: 1.02; letter-spacing: -.035em; text-wrap: balance; }
  ${S} .bs-x { margin-top: 12px; max-width: 340px; font-size: 14px; line-height: 1.6; color: {{ section.settings.muted }}; }
  ${S} .bs-steps { position: relative; list-style: none; padding: 0; margin-top: 28px; display: grid; gap: 16px; }
  ${S} .bs-step { position: relative; display: grid; grid-template-columns: 28px minmax(0, 1fr); align-content: start; gap: 12px; cursor: pointer; outline: none; }
  ${S} .bs-step:focus-visible .bs-card { outline: 2px solid ${acc}; outline-offset: 2px; }
  ${S} .bs-seg { position: absolute; left: 13px; top: 32px; bottom: -12px; width: 2px; overflow: hidden; border-radius: 99px; background: ${tx(10)}; }
  ${S} .bs-seg i { position: absolute; inset: 0; border-radius: 99px; background: ${acc}; transform-origin: top; transform: scaleY(var(--s, 0));
    transition: transform .7s cubic-bezier(.22,1,.36,1); }
  ${S} .bs-node { position: relative; z-index: 1; width: 28px; height: 28px; border-radius: 99px; display: grid; place-items: center; font-size: 11px; font-weight: 600;
    font-variant-numeric: tabular-nums; background: {{ section.settings.bg }}; color: {{ section.settings.muted }}; box-shadow: inset 0 0 0 1.5px ${tx(20)};
    transition: background-color .5s cubic-bezier(.22,1,.36,1), box-shadow .5s cubic-bezier(.22,1,.36,1), transform .5s cubic-bezier(.22,1,.36,1); }
  ${S} .bs-node svg { display: none; }
  ${S} .bs-step.is-on .bs-node { background: ${acc}; color: {{ section.settings.accent_text }}; box-shadow: none; }
  ${S} .bs-step.is-on:not(.is-cur) .bs-node svg { display: block; }
  ${S} .bs-step.is-on:not(.is-cur) .bs-node span { display: none; }
  ${S} .bs-step.is-cur .bs-node { transform: scale(1.08); box-shadow: 0 0 0 4px color-mix(in srgb, ${acc} 16%, transparent); }
  ${S} .bs-card { display: flex; min-width: 0; align-items: center; gap: 12px; padding: 10px; background: {{ section.settings.card }}; border-radius: ${r};
    box-shadow: inset 0 0 0 1px ${tx(7)}; opacity: .62; transition: box-shadow .5s cubic-bezier(.22,1,.36,1), opacity .5s cubic-bezier(.22,1,.36,1); }
  ${S} .bs-step.is-on .bs-card { opacity: 1; }
  ${S} .bs-step.is-cur .bs-card { box-shadow: inset 0 0 0 1.5px ${acc}, 0 18px 36px -24px color-mix(in srgb, ${acc} 60%, transparent); }
  ${S} .bs-body { order: 2; flex: 1; min-width: 0; padding: 4px 4px 4px 0; }
  ${S} .bs-num { font-size: 30px; font-weight: 600; line-height: 1; letter-spacing: -.05em; font-variant-numeric: tabular-nums; color: ${tx(20)}; transition: color .5s; }
  ${S} .bs-step.is-on .bs-num { color: ${acc}; }
  ${S} .bs-t { margin-top: 8px; font-size: 15.5px; font-weight: 600; line-height: 1.25; letter-spacing: -.015em; }
  ${S} .bs-d { margin-top: 4px; font-size: 12.5px; line-height: 1.4; color: {{ section.settings.muted }}; }
  ${S} .bs-tile { order: 3; position: relative; width: 84px; aspect-ratio: 1; flex-shrink: 0; overflow: hidden; display: grid; place-items: center;
    background: {{ section.settings.sage }}; border-radius: ${rt}; color: ${acc}; }
  ${S} .bs-tile img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; transition: transform .7s cubic-bezier(.22,1,.36,1); }
  ${S} .bs-step.is-cur .bs-tile img { transform: scale(1.04); }
  ${S} .bs-tile-in { display: flex; flex-direction: column; align-items: center; gap: 4px; }
  ${S} .bs-tile-in svg { width: 26px; height: 26px; }
  ${S} .bs-tile-in b { font-size: 17px; font-weight: 600; line-height: 1; letter-spacing: -.04em; }
  ${S} .bs-cta { margin-top: 32px; display: flex; justify-content: center; }
  ${S} .bs-btn { display: inline-flex; width: 100%; height: 48px; align-items: center; justify-content: center; padding: 0 28px; border-radius: 99px; text-decoration: none;
    font-size: 15px; font-weight: 500; background: ${acc}; color: {{ section.settings.accent_text }}; transition: filter .2s, transform .2s; }
  ${S} .bs-btn:hover { filter: brightness(1.25); }
  ${S} .bs-btn:active { transform: scale(.99); }
  @container (min-width: 720px) {
    ${S} .bs-in { padding: 56px 40px; }
    ${S} .bs-top { display: flex; align-items: flex-end; justify-content: space-between; gap: 40px; }
    ${S} .bs-h { font-size: 44px; }
    ${S} .bs-x { margin-top: 0; padding-bottom: 6px; text-align: right; }
    ${S} .bs-steps { margin-top: 40px; gap: 20px; grid-template-columns: repeat(var(--n, 4), minmax(0, 1fr)); }
    ${S} .bs-step { grid-template-columns: minmax(0, 1fr); grid-template-rows: auto 1fr; gap: 16px; }
    ${S} .bs-seg { left: calc(50% + 18px); top: 13px; bottom: auto; width: calc(100% - 16px); height: 2px; }
    ${S} .bs-seg i { transform-origin: left; transform: scaleX(var(--s, 0)); }
    ${S} .bs-node { margin: 0 auto; }
    ${S} .bs-card { flex-direction: column; align-items: stretch; gap: 0; }
    ${S} .bs-body { order: 0; padding: 16px 8px 8px; }
    ${S} .bs-num { font-size: 52px; }
    ${S} .bs-t { margin-top: 12px; font-size: 17px; }
    ${S} .bs-d { margin-top: 6px; font-size: 13px; }
    ${S} .bs-tile { order: -1; width: 100%; aspect-ratio: 4 / 3; }
    ${S} .bs-tile-in { gap: 6px; }
    ${S} .bs-tile-in svg { width: 34px; height: 34px; }
    ${S} .bs-tile-in b { font-size: 30px; }
    ${S} .bs-cta { margin-top: 40px; }
    ${S} .bs-btn { width: auto; }
  }
  @media (prefers-reduced-motion: reduce) {
    ${S} .bs-seg i, ${S} .bs-node, ${S} .bs-card, ${S} .bs-tile img { transition: none; }
  }
</style>`;

  const markup = `{%- comment -%}
  Daily Ritual Steps by boost.supply. Add a Step block per step. Each step
  shows its image, or its icon and short tile text (e.g. 8oz) without one.
  The progress line fills as shoppers scroll through the section (or only
  on click, see "Progress line" below); clicking a step jumps to it.
{%- endcomment -%}
{%- liquid
  assign bs_n = 0
  for block in section.blocks
    assign bs_n = bs_n | plus: 1
  endfor
-%}
<div class="bs-rs-{{ section.id }}" id="bs-rs-{{ section.id }}" data-mode="{{ section.settings.fill_mode }}">
  <div class="bs-in">
    <div class="bs-top">
      <div>
        {%- if section.settings.eyebrow != blank -%}<p class="bs-eyebrow">{{ section.settings.eyebrow }}</p>{%- endif -%}
        {%- if section.settings.heading != blank -%}<h2 class="bs-h">{{ section.settings.heading }}</h2>{%- endif -%}
      </div>
      {%- if section.settings.text != blank -%}<p class="bs-x">{{ section.settings.text }}</p>{%- endif -%}
    </div>

    <ol class="bs-steps" style="--n: {{ bs_n | at_least: 1 }};">
      {%- for block in section.blocks -%}
        <li class="bs-step{% if forloop.first %} is-on is-cur{% endif %}" tabindex="0" {{ block.shopify_attributes }}>
          {%- unless forloop.last -%}<span class="bs-seg" aria-hidden="true"><i></i></span>{%- endunless -%}
          <span class="bs-node" aria-hidden="true">${check}<span>{{ forloop.index }}</span></span>
          <div class="bs-card">
            <div class="bs-body">
              <p class="bs-num">{% if forloop.index < 10 %}0{% endif %}{{ forloop.index }}</p>
              <p class="bs-t">{{ block.settings.title }}</p>
              {%- if block.settings.text != blank -%}<p class="bs-d">{{ block.settings.text }}</p>{%- endif -%}
            </div>
            <div class="bs-tile">
              {%- if block.settings.image != blank -%}
                {{ block.settings.image | image_url: width: 600 | image_tag: loading: 'lazy', alt: '', sizes: '(min-width: 750px) 25vw, 84px' }}
              {%- else -%}
                <span class="bs-tile-in">
                  {{- block.settings.icon -}}
                  {%- if block.settings.tile_text != blank -%}<b>{{ block.settings.tile_text }}</b>{%- endif -%}
                </span>
              {%- endif -%}
            </div>
          </div>
        </li>
      {%- endfor -%}
    </ol>

    {%- if section.settings.button_text != blank -%}
      <div class="bs-cta"><a class="bs-btn" href="{{ section.settings.button_link | default: routes.all_products_collection_url }}">{{ section.settings.button_text }}</a></div>
    {%- endif -%}
  </div>
</div>
<script>
  (function () {
    var root = document.getElementById('bs-rs-{{ section.id }}');
    if (!root) return;
    var list = root.querySelector('.bs-steps');
    var steps = root.querySelectorAll('.bs-step');
    var n = steps.length;
    if (!list || !n) return;
    function paint(p) {
      var done = p * (n - 1);
      var cur = Math.min(n - 1, Math.floor(done + 0.001));
      steps.forEach(function (s, i) {
        s.classList.toggle('is-on', i <= done + 0.001);
        s.classList.toggle('is-cur', i === cur);
        var seg = s.querySelector('.bs-seg');
        if (seg) seg.style.setProperty('--s', Math.max(0, Math.min(1, done - i)));
      });
    }
    function progress() {
      var r = list.getBoundingClientRect();
      var vh = window.innerHeight || 800;
      var start = vh * 0.85, end = vh * 0.4;
      return Math.max(0, Math.min(1, (start - r.top) / Math.max(1, start - end + r.height * 0.5)));
    }
    steps.forEach(function (s, i) {
      function go() { paint(n > 1 ? i / (n - 1) : 1); }
      s.addEventListener('click', go);
      s.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); }
      });
    });
    paint(0);
    if (root.getAttribute('data-mode') !== 'scroll') return;
    var raf = 0;
    function onScroll() {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(function () { paint(progress()); });
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    onScroll();
  })();
</script>`;

  const steps = list(config, "steps");

  const schema = buildSchema({
    name: "Daily Ritual Steps",
    settings: [
      { type: "text", id: "eyebrow", label: "Eyebrow", default: str(config, "eyebrow") },
      { type: "text", id: "heading", label: "Heading", default: str(config, "heading") },
      { type: "textarea", id: "text", label: "Text", default: str(config, "text") },
      {
        type: "select",
        id: "fill_mode",
        label: "Progress line",
        options: [
          { value: "scroll", label: "Fills as you scroll (and on click)" },
          { value: "click", label: "Fills on click only" },
        ],
        default: str(config, "fillMode", "scroll") === "click" ? "click" : "scroll",
      },
      { type: "header", content: "Button" },
      { type: "text", id: "button_text", label: "Button text (empty hides it)", default: bool(config, "showButton", true) ? str(config, "buttonText") : "" },
      { type: "url", id: "button_link", label: "Button link" },
      { type: "header", content: "Style" },
      { type: "color", id: "bg", label: "Background", default: str(config, "bg") },
      { type: "color", id: "card", label: "Cards", default: str(config, "card") },
      { type: "color", id: "text_color", label: "Text", default: str(config, "textColor") },
      { type: "color", id: "muted", label: "Muted text", default: str(config, "muted") },
      { type: "color", id: "accent", label: "Accent", default: str(config, "accent") },
      { type: "color", id: "accent_text", label: "Text on accent", default: str(config, "accentText") },
      { type: "color", id: "sage", label: "Tile background", default: str(config, "sage") },
      { type: "range", id: "radius", label: "Corner radius", min: 6, max: 28, step: 2, unit: "px", default: Math.max(6, Math.min(28, Math.round(num(config, "radius", 18) / 2) * 2)) },
    ],
    blocks: [
      {
        type: "step",
        name: "Step",
        settings: [
          { type: "text", id: "title", label: "Title" },
          { type: "textarea", id: "text", label: "Text" },
          { type: "image_picker", id: "image", label: "Image" },
          { type: "html", id: "icon", label: "Icon (if no image)" },
          { type: "text", id: "tile_text", label: "Tile text (if no image), e.g. 8oz" },
        ],
      },
    ],
    maxBlocks: 6,
    presetBlocks: steps.slice(0, 6).map((s) => ({
      type: "step",
      settings: {
        title: esc(s.title ?? ""),
        text: esc(s.text ?? ""),
        icon: iconMarkup(s.icon || "pack:sparkles", 26, 1.6),
        tile_text: esc(s.tile ?? ""),
      },
    })),
  });

  return section({ style, markup, schema });
}

export const ritualSteps: Tweak = {
  slug: "ritual-steps",
  inspiredBy: "ag1",
  name: "Daily Ritual Steps",
  tagline: "How-to-use steps as numbered cards, with a progress line that fills as you scroll.",
  description:
    "Modeled on the how-to-use ritual AG1 walks shoppers through. Each step is a card with a big numeral, a photo or icon tile and one short line, strung together by a progress line that fills as the section scrolls into view. Clicking a step jumps the line to it. Turns a product into a daily habit before the first order.",
  category: "homepage",
  tier: "free",
  tint: "#ecefe6",
  Preview,
  generateLiquid,
  defaults,
  fields: [
    { key: "eyebrow", label: "Eyebrow", type: "text", group: "Content" },
    { key: "heading", label: "Heading", type: "text", group: "Content" },
    { key: "text", label: "Text", type: "textarea", group: "Content" },
    {
      key: "steps", label: "Steps", type: "list", group: "Steps",
      hint: "Image URL shows a photo; leave it empty for the icon and tile text. In Shopify you pick a photo per step",
      itemFields: [
        { key: "title", label: "Title", type: "text" },
        { key: "text", label: "Text", type: "textarea" },
        { key: "image", label: "Image URL", type: "text" },
        { key: "icon", label: "Icon", type: "icon" },
        { key: "tile", label: "Tile text", type: "text" },
      ],
      newItem: { title: "Repeat tomorrow", text: "Same time, same glass. That's the habit.", image: "", icon: "pack:check", tile: "Daily" },
      addLabel: "Add step",
      max: 6,
    },
    {
      key: "fillMode", label: "Progress line", type: "select", group: "Steps",
      options: [
        { label: "Fills as you scroll (and on click)", value: "scroll" },
        { label: "Fills on click only", value: "click" },
      ],
    },
    { key: "showButton", label: "Show button", type: "toggle", group: "Button" },
    { key: "buttonText", label: "Button text", type: "text", group: "Button" },
    fontField("Typography"),
    { key: "radius", label: "Corner radius", type: "slider", group: "Layout", min: 6, max: 28, step: 2, unit: "px" },
    { key: "bg", label: "Background", type: "color", group: "Colors" },
    { key: "card", label: "Cards", type: "color", group: "Colors" },
    { key: "textColor", label: "Text", type: "color", group: "Colors" },
    { key: "muted", label: "Muted text", type: "color", group: "Colors" },
    { key: "accent", label: "Accent", type: "color", group: "Colors" },
    { key: "accentText", label: "Text on accent", type: "color", group: "Colors" },
    { key: "sage", label: "Tile background", type: "color", group: "Colors" },
  ],
};
