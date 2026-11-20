"use client";

import { useLayoutEffect, useRef } from "react";
import type { Tweak, TweakConfig } from "../types";
import { str, num, list, fontStack } from "../cfg";
import { fontField } from "../fields";
import { buildSchema, section, fontFaceFor } from "../liquid";

/* ============================================================
   Clinical Stats Band
   A calm science band: a "results from a double-blind study"
   label, three or four big counters that count up when they
   scroll into view (each with a footnote marker), a small
   lifestyle photo and a "read the research" link. The default
   numbers are placeholders and say so in the footnote.
   ============================================================ */

const EASE = "cubic-bezier(.22,1,.36,1)";

const defaults: TweakConfig = {
  label: "Results from a double-blind study",
  heading: "The numbers behind the capsule",
  stats: [
    { value: "86", suffix: "%", label: "reported less bloating", note: "1" },
    { value: "2", suffix: "x", label: "more regular digestion", note: "2" },
    { value: "24", suffix: "", label: "probiotic strains per capsule", note: "3" },
    { value: "53", suffix: " billion", label: "AFU in every daily dose", note: "4" },
  ],
  image: "/mockups/timeline-lifestyle.jpg",
  caption: "Two capsules a day, with water, on an empty stomach.",
  linkText: "Read the research",
  footnotes: "1–4 Placeholder figures for layout only. Replace them with results from your own study and cite the source.",
  duration: 1600,
  bg: "#1F3B2D",
  sage: "#DCE6C9",
  cream: "#F7F6F1",
  ink: "#1A1A1A",
  font: "system",
  radius: 14,
};

/* ---------- helpers ---------- */

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

/** Hex colour + alpha byte. */
const alpha = (hex: string, a: number) =>
  /^#[0-9a-f]{6}$/i.test(hex) ? hex + Math.round(a * 255).toString(16).padStart(2, "0") : hex;

/** Split "53.5" into a number and its decimal places; non-numbers count as text. */
const parseStat = (v: string) => {
  const s = String(v ?? "").trim().replace(/,/g, "");
  const m = /^-?\d+(\.\d+)?$/.exec(s);
  if (!m) return { n: NaN, dec: 0, text: String(v ?? "") };
  return { n: parseFloat(s), dec: m[1] ? m[1].length - 1 : 0, text: s };
};

function Flask() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" aria-hidden>
      <path d="M6 1.8h4M6.6 1.8v4.3L2.9 12.6a1.3 1.3 0 0 0 1.1 1.9h8a1.3 1.3 0 0 0 1.1-1.9L9.4 6.1V1.8" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4.6 10h6.8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

/* ---------- preview ---------- */

function Preview({ config }: { config: TweakConfig }) {
  const bg = str(config, "bg", "#1F3B2D");
  const sage = str(config, "sage", "#DCE6C9");
  const cream = str(config, "cream", "#F7F6F1");
  const ink = str(config, "ink", "#1A1A1A");
  const radius = num(config, "radius", 14);
  const dur = clamp(num(config, "duration", 1600), 400, 4000);
  const img = str(config, "image").trim();

  const stats = list(config, "stats")
    .slice(0, 4)
    .map((s) => ({ ...parseStat(s.value ?? ""), suffix: s.suffix ?? "", label: s.label ?? "", note: (s.note ?? "").trim() }));
  const sig = stats.map((s) => `${s.text}/${s.dec}`).join("|") + `:${dur}`;

  /* count up from zero the first time the numbers scroll into view.
     Written straight to the DOM so React never re-renders mid-count. */
  const gridRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const root = gridRef.current;
    if (!root) return;
    const els = Array.from(root.querySelectorAll<HTMLElement>("[data-to]"));
    if (!els.length || typeof IntersectionObserver === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const show = (el: HTMLElement, k: number) => {
      const to = parseFloat(el.dataset.to ?? "0");
      const dec = parseInt(el.dataset.dec ?? "0", 10);
      el.textContent = (to * k).toFixed(dec);
    };
    els.forEach((el) => show(el, 0));
    let raf = 0;
    let land = 0;
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        io.disconnect();
        const start = performance.now();
        const tick = (t: number) => {
          const p = Math.min(1, (t - start) / dur);
          const k = 1 - Math.pow(1 - p, 4);
          els.forEach((el) => show(el, k));
          if (p < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        /* land on the targets even if frames are throttled (background tab) */
        land = window.setTimeout(() => {
          cancelAnimationFrame(raf);
          els.forEach((el) => show(el, 1));
        }, dur + 80);
      },
      { rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(root);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
      clearTimeout(land);
      els.forEach((el) => show(el, 1));
    };
  }, [sig, dur]);

  const line = alpha(cream, 0.16);

  return (
    <div className="@container w-full" style={{ background: bg, color: cream, fontFamily: fontStack(str(config, "font", "system")) }}>
      <div className="mx-auto max-w-[1120px] px-4 py-7 @min-[720px]:px-10 @min-[720px]:py-12">
        {/* Label + heading + link */}
        <div className="flex flex-col gap-3 @min-[720px]:flex-row @min-[720px]:items-end @min-[720px]:justify-between @min-[720px]:gap-8">
          <div className="min-w-0">
            {str(config, "label") && (
              <p
                className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10.5px] font-semibold uppercase tracking-[0.1em]"
                style={{ background: sage, color: ink }}
              >
                <Flask />
                {str(config, "label")}
              </p>
            )}
            <h3 className="mt-3 max-w-[18ch] text-[28px] font-medium leading-[1.05] tracking-[-0.03em] @min-[520px]:text-[34px] @min-[720px]:text-[40px]">
              {str(config, "heading")}
            </h3>
          </div>
          {str(config, "linkText") && (
            <a
              href="#research"
              onClick={(e) => e.preventDefault()}
              className="group hidden shrink-0 items-center gap-1.5 pb-1 text-[14px] font-medium @min-[720px]:inline-flex"
              style={{ color: cream }}
            >
              <span className="border-b pb-0.5 transition-colors duration-300" style={{ borderColor: alpha(cream, 0.4) }}>
                {str(config, "linkText")}
              </span>
              <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden className="transition-transform duration-300 group-hover:translate-x-0.5" style={{ transitionTimingFunction: EASE }}>
                <path d="M2 7h9.5M8 3.5 11.5 7 8 10.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </a>
          )}
        </div>

        {/* Photo + stats */}
        <div className="mt-6 grid grid-cols-1 gap-5 @min-[720px]:mt-9 @min-[720px]:grid-cols-[minmax(0,220px)_minmax(0,1fr)] @min-[720px]:gap-10 @min-[960px]:grid-cols-[minmax(0,260px)_minmax(0,1fr)]">
          <div ref={gridRef} className="order-1 grid grid-cols-2 @min-[720px]:order-2">
            {stats.map((s, i) => (
              <div
                key={i}
                className="min-w-0 py-4 pr-3"
                style={{
                  boxShadow: `inset 0 1px 0 ${line}`,
                  paddingLeft: i % 2 ? 16 : 0,
                  borderLeft: i % 2 ? `1px solid ${line}` : "none",
                }}
              >
                <p className="flex items-baseline leading-none" style={{ color: sage }}>
                  {Number.isFinite(s.n) ? (
                    <span
                      key={`${s.text}-${s.dec}`}
                      data-to={s.n}
                      data-dec={s.dec}
                      className="text-[44px] font-normal tracking-[-0.045em] tabular-nums @min-[520px]:text-[56px] @min-[960px]:text-[64px]"
                    >
                      {s.n.toFixed(s.dec)}
                    </span>
                  ) : (
                    <span className="text-[44px] font-normal tracking-[-0.045em] @min-[520px]:text-[56px]">{s.text}</span>
                  )}
                  {s.suffix && (
                    <span className="whitespace-pre text-[22px] font-normal tracking-[-0.03em] @min-[520px]:text-[26px] @min-[960px]:text-[30px]">
                      {s.suffix}
                    </span>
                  )}
                  {s.note && (
                    <sup className="ml-0.5 mt-2 self-start text-[11px] font-semibold" style={{ color: alpha(sage, 0.8), top: 0 }}>
                      {s.note}
                    </sup>
                  )}
                </p>
                <p className="mt-2 text-[13px] leading-snug @min-[520px]:text-[14px]" style={{ color: alpha(cream, 0.82) }}>
                  {s.label}
                </p>
              </div>
            ))}
          </div>

          <div className="order-2 flex items-center gap-4 @min-[720px]:order-1 @min-[720px]:flex-col @min-[720px]:items-stretch">
            <div
              className="relative aspect-[4/5] w-[96px] shrink-0 overflow-hidden @min-[720px]:w-full"
              style={{ borderRadius: radius, background: alpha(sage, 0.25) }}
            >
              {img ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={img} alt="" loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover" />
              ) : (
                <span className="absolute inset-0 grid place-items-center" style={{ color: sage }}>
                  <Flask />
                </span>
              )}
            </div>
            <div className="min-w-0">
              {str(config, "caption") && (
                <p className="text-[13px] leading-snug" style={{ color: alpha(cream, 0.82) }}>
                  {str(config, "caption")}
                </p>
              )}
              {str(config, "linkText") && (
                <a
                  href="#research"
                  onClick={(e) => e.preventDefault()}
                  className="group mt-2.5 inline-flex items-center gap-1.5 text-[13.5px] font-medium @min-[720px]:hidden"
                  style={{ color: cream }}
                >
                  <span className="border-b pb-0.5" style={{ borderColor: alpha(cream, 0.4) }}>
                    {str(config, "linkText")}
                  </span>
                  <svg width="13" height="13" viewBox="0 0 14 14" aria-hidden className="transition-transform duration-300 group-hover:translate-x-0.5">
                    <path d="M2 7h9.5M8 3.5 11.5 7 8 10.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </a>
              )}
            </div>
          </div>
        </div>

        {str(config, "footnotes") && (
          <p className="mt-6 border-t pt-4 text-[11px] leading-relaxed @min-[720px]:mt-9" style={{ borderColor: line, color: alpha(cream, 0.55) }}>
            {str(config, "footnotes")}
          </p>
        )}
      </div>
    </div>
  );
}

/* ---------- Liquid ---------- */

function generateLiquid(config: TweakConfig): string {
  const { face, family } = fontFaceFor(str(config, "font", "system"));
  const S = ".bs-cls-{{ section.id }}";
  const r = "{{ section.settings.radius }}px";
  const ease = "cubic-bezier(.22,1,.36,1)";
  const arrow = `<svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M2 7h9.5M8 3.5 11.5 7 8 10.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  const flask = `<svg width="13" height="13" viewBox="0 0 16 16" aria-hidden="true"><path d="M6 1.8h4M6.6 1.8v4.3L2.9 12.6a1.3 1.3 0 0 0 1.1 1.9h8a1.3 1.3 0 0 0 1.1-1.9L9.4 6.1V1.8" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/><path d="M4.6 10h6.8" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>`;

  const style = `<style>
${face ? face + "\n" : ""}  ${S} { container-type: inline-size; background: {{ section.settings.bg }}; color: {{ section.settings.cream }}; font-family: ${family}; }
  ${S} * { box-sizing: border-box; }
  ${S} p, ${S} h2 { margin: 0; }
  ${S} .bs-wrap { max-width: 1120px; margin: 0 auto; padding: 28px 16px; }
  ${S} .bs-top { display: flex; flex-direction: column; gap: 12px; }
  ${S} .bs-label { display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 99px; background: {{ section.settings.sage }}; color: {{ section.settings.ink }};
    font-size: 10.5px; font-weight: 600; text-transform: uppercase; letter-spacing: .1em; }
  ${S} .bs-h { margin-top: 12px; max-width: 18ch; font-size: 28px; font-weight: 500; line-height: 1.05; letter-spacing: -.03em; }
  ${S} .bs-link { display: inline-flex; align-items: center; gap: 6px; color: {{ section.settings.cream }}; font-size: 13.5px; font-weight: 500; text-decoration: none; }
  ${S} .bs-link span { padding-bottom: 2px; border-bottom: 1px solid rgba(247,246,241,.4); transition: border-color .3s; }
  ${S} .bs-link:hover span { border-color: currentColor; }
  ${S} .bs-link svg { transition: transform .3s ${ease}; }
  ${S} .bs-link:hover svg { transform: translateX(2px); }
  ${S} .bs-link-top { display: none; flex-shrink: 0; padding-bottom: 4px; font-size: 14px; }
  ${S} .bs-body { display: grid; grid-template-columns: minmax(0, 1fr); gap: 20px; margin-top: 24px; }
  ${S} .bs-stats { order: 1; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); }
  ${S} .bs-stat { min-width: 0; padding: 16px 12px 16px 0; box-shadow: inset 0 1px 0 rgba(247,246,241,.16); }
  ${S} .bs-stat:nth-child(even) { padding-left: 16px; border-left: 1px solid rgba(247,246,241,.16); }
  ${S} .bs-fig { display: flex; align-items: baseline; line-height: 1; color: {{ section.settings.sage }}; }
  ${S} .bs-n { font-size: 44px; font-weight: 400; letter-spacing: -.045em; font-variant-numeric: tabular-nums; }
  ${S} .bs-sfx { white-space: pre; font-size: 22px; font-weight: 400; letter-spacing: -.03em; }
  ${S} .bs-fig sup { align-self: flex-start; top: 0; margin: 8px 0 0 2px; font-size: 11px; font-weight: 600; opacity: .8; }
  ${S} .bs-sl { margin-top: 8px; font-size: 13px; line-height: 1.35; opacity: .82; }
  ${S} .bs-side { order: 2; display: flex; align-items: center; gap: 16px; }
  ${S} .bs-photo { position: relative; flex-shrink: 0; width: 96px; aspect-ratio: 4 / 5; overflow: hidden; border-radius: ${r}; background: rgba(220,230,201,.25); }
  ${S} .bs-photo img, ${S} .bs-photo .bs-ph { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
  ${S} .bs-cap { font-size: 13px; line-height: 1.35; opacity: .82; }
  ${S} .bs-side .bs-link { margin-top: 10px; }
  ${S} .bs-foot { margin-top: 24px; padding-top: 16px; border-top: 1px solid rgba(247,246,241,.16); font-size: 11px; line-height: 1.6; opacity: .55; }
  @container (min-width: 520px) {
    ${S} .bs-h { font-size: 34px; }
    ${S} .bs-n { font-size: 56px; }
    ${S} .bs-sfx { font-size: 26px; }
    ${S} .bs-sl { font-size: 14px; }
  }
  @container (min-width: 720px) {
    ${S} .bs-wrap { padding: 48px 40px; }
    ${S} .bs-top { flex-direction: row; align-items: flex-end; justify-content: space-between; gap: 32px; }
    ${S} .bs-h { font-size: 40px; }
    ${S} .bs-link-top { display: inline-flex; }
    ${S} .bs-side .bs-link { display: none; }
    ${S} .bs-body { grid-template-columns: minmax(0, 220px) minmax(0, 1fr); gap: 40px; margin-top: 36px; }
    ${S} .bs-stats { order: 2; }
    ${S} .bs-side { order: 1; flex-direction: column; align-items: stretch; }
    ${S} .bs-photo { width: 100%; }
    ${S} .bs-foot { margin-top: 36px; }
    ${S} .bs-body.no-photo { grid-template-columns: minmax(0, 1fr); gap: 20px; }
    ${S} .bs-body.no-photo .bs-stats { order: 1; grid-template-columns: repeat(4, minmax(0, 1fr)); }
    ${S} .bs-body.no-photo .bs-stat:nth-child(n+2) { padding-left: 16px; border-left: 1px solid rgba(247,246,241,.16); }
    ${S} .bs-body.no-photo .bs-side { order: 2; }
  }
  @container (min-width: 960px) {
    ${S} .bs-body:not(.no-photo) { grid-template-columns: minmax(0, 260px) minmax(0, 1fr); }
    ${S} .bs-n { font-size: 64px; }
    ${S} .bs-sfx { font-size: 30px; }
  }
</style>`;

  const markup = `{%- comment -%}
  Clinical Stats Band by boost.supply.
  IMPORTANT: the numbers in the default blocks are PLACEHOLDERS for layout
  only. Before you publish, replace every stat with a claim you can
  substantiate (your own study or a published one: design, sample size,
  duration), cite it in the footnotes and link the full research. Health,
  supplement and efficacy claims are regulated (e.g. FTC and FDA in the
  US, ASA/CAP in the UK, EFSA rules in the EU); check with your regulatory
  adviser. Only call it "double-blind" if the study was.
  - One "Stat" block per number (3 or 4 work best). Numbers count up from
    zero when the band scrolls into view; text values (e.g. "2-in-1") are
    shown as written.
  - Photo: the "Photo" image picker. Leave it empty to hide the photo.
{%- endcomment -%}
<div class="bs-cls-{{ section.id }}" id="bs-cls-{{ section.id }}" data-dur="{{ section.settings.duration }}">
  <div class="bs-wrap">
    <div class="bs-top">
      <div>
        {%- if section.settings.label != blank -%}<p class="bs-label">${flask}{{ section.settings.label }}</p>{%- endif -%}
        <h2 class="bs-h">{{ section.settings.heading }}</h2>
      </div>
      {%- if section.settings.link_text != blank and section.settings.link_url != blank -%}
        <a class="bs-link bs-link-top" href="{{ section.settings.link_url }}"><span>{{ section.settings.link_text }}</span>${arrow}</a>
      {%- endif -%}
    </div>

    <div class="bs-body{% if section.settings.image == blank %} no-photo{% endif %}">
      <div class="bs-stats" data-stats>
        {%- for block in section.blocks limit: 4 -%}
          {%- assign bs_raw = block.settings.value | strip | remove: ',' -%}
          {%- assign bs_num = bs_raw | times: 1 -%}
          {%- assign bs_back = bs_num | append: '' -%}
          {%- assign bs_is_num = false -%}
          {%- if bs_back == bs_raw -%}{%- assign bs_is_num = true -%}{%- endif -%}
          {%- assign bs_dec = 0 -%}
          {%- if bs_raw contains '.' -%}{%- assign bs_dec = bs_raw | split: '.' | last | size -%}{%- endif -%}
          <div class="bs-stat" {{ block.shopify_attributes }}>
            <p class="bs-fig">
              {%- if bs_is_num -%}
                <span class="bs-n" data-to="{{ bs_raw }}" data-dec="{{ bs_dec }}">{{ bs_raw }}</span>
              {%- else -%}
                <span class="bs-n">{{ block.settings.value }}</span>
              {%- endif -%}
              {%- if block.settings.suffix != blank -%}<span class="bs-sfx">{{ block.settings.suffix }}</span>{%- endif -%}
              {%- if block.settings.note != blank -%}<sup>{{ block.settings.note }}</sup>{%- endif -%}
            </p>
            <p class="bs-sl">{{ block.settings.label }}</p>
          </div>
        {%- endfor -%}
      </div>

      <div class="bs-side">
        {%- if section.settings.image != blank -%}
          <div class="bs-photo">{{ section.settings.image | image_url: width: 600 | image_tag: loading: 'lazy', alt: section.settings.caption, sizes: '(min-width: 990px) 260px, 96px' }}</div>
        {%- endif -%}
        <div>
          {%- if section.settings.caption != blank -%}<p class="bs-cap">{{ section.settings.caption }}</p>{%- endif -%}
          {%- if section.settings.link_text != blank and section.settings.link_url != blank -%}
            <a class="bs-link" href="{{ section.settings.link_url }}"><span>{{ section.settings.link_text }}</span>${arrow}</a>
          {%- endif -%}
        </div>
      </div>
    </div>

    {%- if section.settings.footnotes != blank -%}<p class="bs-foot">{{ section.settings.footnotes }}</p>{%- endif -%}
  </div>
</div>
<script>
  (function () {
    var root = document.getElementById('bs-cls-{{ section.id }}');
    if (!root) return;
    var els = [].slice.call(root.querySelectorAll('[data-to]'));
    if (!els.length || !('IntersectionObserver' in window)) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var dur = parseInt(root.getAttribute('data-dur'), 10) || 1600;
    function show(el, k) {
      var to = parseFloat(el.getAttribute('data-to')) || 0;
      var dec = parseInt(el.getAttribute('data-dec'), 10) || 0;
      el.textContent = (to * k).toFixed(dec);
    }
    els.forEach(function (el) { show(el, 0); });
    var io = new IntersectionObserver(function (entries) {
      if (!entries[0].isIntersecting) return;
      io.disconnect();
      var start = performance.now();
      function tick(t) {
        var p = Math.min(1, (t - start) / dur);
        var k = 1 - Math.pow(1 - p, 4);
        els.forEach(function (el) { show(el, k); });
        if (p < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
      setTimeout(function () { els.forEach(function (el) { show(el, 1); }); }, dur + 80);
    }, { rootMargin: '0px 0px -8% 0px' });
    io.observe(root.querySelector('[data-stats]') || root);
  })();
</script>`;

  const stats = list(config, "stats").slice(0, 4);
  const dur = clamp(Math.round(num(config, "duration", 1600) / 100) * 100, 600, 3000);

  const schema = buildSchema({
    name: "Clinical Stats Band",
    settings: [
      { type: "text", id: "label", label: "Study label", default: str(config, "label") },
      { type: "text", id: "heading", label: "Heading", default: str(config, "heading") },
      { type: "header", content: "Photo & research" },
      { type: "image_picker", id: "image", label: "Photo", info: "A small lifestyle photo, 4:5 works best. Leave empty to hide." },
      { type: "text", id: "caption", label: "Caption", default: str(config, "caption") },
      { type: "text", id: "link_text", label: "Research link text", default: str(config, "linkText") },
      { type: "url", id: "link_url", label: "Research link (shown when set)" },
      { type: "textarea", id: "footnotes", label: "Footnotes", default: str(config, "footnotes") },
      { type: "range", id: "duration", label: "Count-up duration", min: 600, max: 3000, step: 100, unit: "ms", default: dur },
      { type: "header", content: "Style" },
      { type: "color", id: "bg", label: "Background", default: str(config, "bg") },
      { type: "color", id: "sage", label: "Numbers & label", default: str(config, "sage") },
      { type: "color", id: "cream", label: "Text", default: str(config, "cream") },
      { type: "color", id: "ink", label: "Label text", default: str(config, "ink") },
      { type: "range", id: "radius", label: "Photo corner radius", min: 0, max: 28, step: 2, unit: "px", default: clamp(Math.round(num(config, "radius", 14) / 2) * 2, 0, 28) },
    ],
    blocks: [
      {
        type: "stat",
        name: "Stat",
        settings: [
          { type: "text", id: "value", label: "Number", default: "86" },
          { type: "text", id: "suffix", label: "After the number (%, x, billion)", default: "%" },
          { type: "text", id: "label", label: "Label", default: "reported less bloating" },
          { type: "text", id: "note", label: "Footnote marker", default: "1" },
        ],
      },
    ],
    maxBlocks: 4,
    presetBlocks: stats.map((s) => ({
      type: "stat",
      settings: { value: s.value ?? "", suffix: s.suffix ?? "", label: s.label ?? "", note: s.note ?? "" },
    })),
  });

  return section({ style, markup, schema });
}

export const clinicalStats: Tweak = {
  slug: "clinical-stats",
  inspiredBy: "seed",
  name: "Clinical Stats Band",
  tagline: "Big counting-up study results with footnotes, a lifestyle photo and a research link.",
  description:
    "Modeled on the science band Seed uses to show its clinical results. A “results from a double-blind study” label leads into three or four big numbers that count up as they scroll into view, each with a footnote marker, beside a small lifestyle photo and a “read the research” link. The default figures are placeholders and the footnote says so; swap in claims you can substantiate before you publish. Builds trust for supplements, skincare and anything with data behind it.",
  category: "social-proof",
  tier: "free",
  tint: "#dce6c9",
  Preview,
  generateLiquid,
  defaults,
  fields: [
    { key: "label", label: "Study label", type: "text", group: "Content" },
    { key: "heading", label: "Heading", type: "text", group: "Content" },
    {
      key: "stats", label: "Stats", type: "list", group: "Stats",
      hint: "Placeholder numbers. Only publish claims you can substantiate, and cite them in the footnotes. Up to 4",
      itemFields: [
        { key: "value", label: "Number", type: "text" },
        { key: "suffix", label: "After the number", type: "text" },
        { key: "label", label: "Label", type: "text" },
        { key: "note", label: "Footnote marker", type: "text" },
      ],
      newItem: { value: "8", suffix: " weeks", label: "to full results", note: "5" },
      addLabel: "Add stat", max: 4,
    },
    { key: "duration", label: "Count-up duration", type: "slider", group: "Stats", min: 600, max: 3000, step: 100, unit: "ms" },
    { key: "footnotes", label: "Footnotes", type: "textarea", group: "Stats" },
    {
      key: "image", label: "Image URL", type: "text", group: "Media",
      hint: "Small lifestyle photo, 4:5. Preview only; in Shopify pick it with the image picker",
    },
    { key: "caption", label: "Caption", type: "text", group: "Media" },
    { key: "linkText", label: "Research link text", type: "text", group: "Media" },
    fontField("Typography"),
    { key: "radius", label: "Photo corner radius", type: "slider", group: "Layout", min: 0, max: 28, step: 2, unit: "px" },
    { key: "bg", label: "Background", type: "color", group: "Colors" },
    { key: "sage", label: "Numbers & label", type: "color", group: "Colors" },
    { key: "cream", label: "Text", type: "color", group: "Colors" },
    { key: "ink", label: "Label text", type: "color", group: "Colors" },
  ],
};
