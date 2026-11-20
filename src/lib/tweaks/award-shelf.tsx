"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { Tweak, TweakConfig } from "../types";
import { str, num, bool, list, fontStack, esc } from "../cfg";
import { fontField } from "../fields";
import { buildSchema, section, fontFaceFor } from "../liquid";
import { ProductArt, money, toNum, type ArtKind } from "./product-art";

/* ============================================================
   Award Shelf
   A calm horizontal shelf of award-winning products. Each tile
   pairs a product with its award (category, publication, year),
   a one-word role above a lowercase product name, the price and
   a minimal add button. Scroll-snaps on narrow screens, arrows
   and a hairline progress bar on wide ones.
   ============================================================ */

const SERIF = "Georgia, 'Iowan Old Style', 'Times New Roman', serif";
const EASE = "cubic-bezier(.22,1,.36,1)";
const ART: ArtKind[] = ["tube", "bottle", "jar", "tube", "spray", "jar"];
const TONES = ["#d9c9bc", "#e4d7cc", "#cdbaab", "#d6a79e", "#e0d4c4", "#c9b3a2"];

const defaults: TweakConfig = {
  eyebrow: "Award winners",
  heading: "the editors' shelf",
  linkText: "Shop award winners",
  currency: "$",
  items: [
    { role: "prep", name: "dewy prep primer", price: "32", award: "Best glow primer", publication: "The Beauty Ledger", year: "2025" },
    { role: "glow", name: "daily glow serum", price: "29", award: "Best hydrating serum", publication: "Skin Quarterly", year: "2024" },
    { role: "seal", name: "rich barrier cream", price: "36", award: "Best barrier cream", publication: "The Beauty Ledger", year: "2025" },
    { role: "tint", name: "tinted lip treatment", price: "18", award: "Best lip treatment", publication: "Modern Muse", year: "2024" },
    { role: "cleanse", name: "soft cream cleanser", price: "28", award: "Best gentle cleanser", publication: "Glow Report", year: "2024" },
  ],
  addText: "add",
  addedText: "added",
  showSeal: true,
  sealText: "winner",
  lowercaseNames: true,
  serifAwards: true,
  bg: "#F1F0ED",
  tile: "#FFFFFF",
  textColor: "#303030",
  muted: "#84827E",
  accent: "#67645E",
  font: "system",
  radius: 2,
};

/** Hex color + alpha byte, e.g. tint("#303030", 0.12). */
const tint = (hex: string, a: number) =>
  /^#[0-9a-f]{6}$/i.test(hex)
    ? hex + Math.round(a * 255).toString(16).padStart(2, "0")
    : hex;

/** Scroll state of the shelf: visible fraction, progress and ends. */
const readScroll = (el: HTMLElement) => {
  const max = el.scrollWidth - el.clientWidth;
  return {
    w: el.scrollWidth ? Math.min(1, el.clientWidth / el.scrollWidth) : 1,
    x: max > 0 ? el.scrollLeft / max : 0,
    start: el.scrollLeft <= 2,
    end: el.scrollLeft >= max - 2,
  };
};

function Arrow({ dir }: { dir: -1 | 1 }) {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {dir < 0 ? <path d="M13 8H3M7 4L3 8l4 4" /> : <path d="M3 8h10M9 4l4 4-4 4" />}
    </svg>
  );
}

function Preview({ config }: { config: TweakConfig }) {
  const cur = str(config, "currency", "$");
  const bg = str(config, "bg", "#F1F0ED");
  const tile = str(config, "tile", "#FFFFFF");
  const text = str(config, "textColor", "#303030");
  const muted = str(config, "muted", "#84827E");
  const accent = str(config, "accent", "#67645E");
  const radius = num(config, "radius", 2);
  const line = tint(text, 0.14);
  const items = list(config, "items");
  const serif = bool(config, "serifAwards", true);
  const lower = bool(config, "lowercaseNames", true);

  const rail = useRef<HTMLDivElement>(null);
  const [added, setAdded] = useState<number[]>([]);
  const [scroll, setScroll] = useState({ w: 1, x: 0, start: true, end: true });

  const measure = () => {
    if (rail.current) setScroll(readScroll(rail.current));
  };

  useEffect(() => {
    const el = rail.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setScroll(readScroll(el)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const go = (dir: -1 | 1) => {
    const el = rail.current;
    const first = el?.firstElementChild as HTMLElement | null;
    if (!el || !first) return;
    el.scrollBy({ left: dir * (first.offsetWidth + 12), behavior: "smooth" });
  };

  const toggle = (i: number) =>
    setAdded((a) => (a.includes(i) ? a.filter((x) => x !== i) : [...a, i]));

  return (
    <div
      className="@container w-full"
      style={{ background: bg, color: text, fontFamily: fontStack(str(config, "font", "system")) }}
    >
      <div className="mx-auto w-full max-w-[1200px] px-5 pb-7 pt-7 @min-[720px]:px-10 @min-[720px]:pb-12 @min-[720px]:pt-12">
        {/* Header */}
        <div className="flex items-end justify-between gap-4">
          <div className="min-w-0">
            {str(config, "eyebrow") && (
              <p className="text-[10px] font-medium uppercase tracking-[0.16em]" style={{ color: accent }}>
                {str(config, "eyebrow")}
              </p>
            )}
            {str(config, "heading") && (
              <h3 className="mt-2 text-[27px] font-medium leading-[1.02] tracking-[-0.035em] @min-[720px]:text-[38px]">
                {str(config, "heading")}
              </h3>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-4">
            {str(config, "linkText") && (
              <span className="cursor-pointer whitespace-nowrap border-b pb-[3px] text-[10px] font-medium uppercase tracking-[0.14em] transition-opacity hover:opacity-60" style={{ borderColor: text }}>
                {str(config, "linkText")}
              </span>
            )}
            <div className="hidden gap-1.5 @min-[720px]:flex">
              {([-1, 1] as const).map((d) => {
                const off = d < 0 ? scroll.start : scroll.end;
                return (
                  <button
                    key={d}
                    type="button"
                    aria-label={d < 0 ? "Previous" : "Next"}
                    onClick={() => go(d)}
                    disabled={off}
                    className="grid h-9 w-9 place-items-center rounded-full transition-[opacity,background-color] duration-300 enabled:hover:bg-black/[0.04] disabled:opacity-30"
                    style={{ boxShadow: `inset 0 0 0 1px ${line}` }}
                  >
                    <Arrow dir={d} />
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Shelf */}
        <div
          ref={rail}
          onScroll={measure}
          className="bs-no-scrollbar -mx-5 mt-6 flex snap-x snap-mandatory scroll-px-5 gap-3 overflow-x-auto px-5 @min-[720px]:-mx-10 @min-[720px]:mt-8 @min-[720px]:scroll-px-10 @min-[720px]:px-10"
        >
          {items.map((it, i) => {
            const on = added.includes(i);
            return (
              <article
                key={i}
                className="bs-rise group flex w-[44%] shrink-0 snap-start flex-col @min-[520px]:w-[30.5%] @min-[760px]:w-[23%]"
                style={{ "--i": i } as CSSProperties}
              >
                <div className="relative aspect-[4/5] overflow-hidden" style={{ background: tile, borderRadius: radius }}>
                  <div
                    className="absolute inset-0 grid place-items-center transition-[scale] duration-700 group-hover:scale-[1.04] [&>div]:h-[82%]! [&>div]:w-[82%]! [&_svg]:h-full! [&_svg]:w-full!"
                    style={{ transitionTimingFunction: EASE }}
                  >
                    <ProductArt kind={ART[i % ART.length]} tone={TONES[i % TONES.length]} tile="transparent" radius={0} size={140} />
                  </div>
                  {bool(config, "showSeal", true) && it.year && (
                    <span
                      className="absolute left-2.5 top-2.5 grid h-[46px] w-[46px] place-content-center rounded-full text-center"
                      style={{ boxShadow: `inset 0 0 0 1px ${tint(accent, 0.5)}, inset 0 0 0 3px ${tile}, inset 0 0 0 3.5px ${tint(accent, 0.3)}`, color: accent }}
                    >
                      <span className="block text-[6.5px] font-medium uppercase leading-none tracking-[0.14em]">
                        {str(config, "sealText")}
                      </span>
                      <span className="mt-[3px] block text-[12px] leading-none" style={{ fontFamily: SERIF }}>
                        {it.year}
                      </span>
                    </span>
                  )}
                </div>

                {/* Award plaque */}
                <div className="mt-3 min-h-[38px]">
                  {it.award && (
                    <p className="text-[9.5px] font-medium uppercase leading-[1.35] tracking-[0.1em]">{it.award}</p>
                  )}
                  <p className="mt-1 text-[12px] leading-snug" style={{ color: muted }}>
                    <span className={serif ? "italic" : ""} style={serif ? { fontFamily: SERIF } : undefined}>
                      {it.publication}
                    </span>
                    {it.year && <span className="ml-1.5 text-[9.5px] uppercase tracking-[0.12em]">{it.year}</span>}
                  </p>
                </div>

                {/* Product */}
                <div className="mt-3 flex flex-1 flex-col border-t pt-3" style={{ borderColor: line }}>
                  {it.role && (
                    <p className="text-[11px] lowercase" style={{ color: muted }}>
                      {it.role}
                    </p>
                  )}
                  <p className={`text-[14px] font-medium leading-[1.2] tracking-[-0.015em] ${lower ? "lowercase" : ""}`}>{it.name}</p>
                  <div className="mt-auto flex items-center justify-between gap-2 pt-3">
                    <span className="text-[12.5px] tabular-nums">{money(toNum(it.price), cur)}</span>
                    <button
                      type="button"
                      onClick={() => toggle(i)}
                      aria-pressed={on}
                      className="relative h-7 shrink-0 overflow-hidden rounded-full px-3 text-[11px] lowercase transition-[background-color,color,box-shadow,scale] duration-300 active:scale-95"
                      style={{
                        transitionTimingFunction: EASE,
                        background: on ? text : "transparent",
                        color: on ? tile : text,
                        boxShadow: on ? "none" : `inset 0 0 0 1px ${tint(text, 0.4)}`,
                      }}
                    >
                      <span key={on ? "on" : "off"} className="bs-swap inline-flex items-center gap-1">
                        {on ? str(config, "addedText", "added") : str(config, "addText", "add")}
                        {on ? (
                          <svg width="9" height="9" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                            <path d="M2.5 6.3l2.3 2.2 4.7-5" />
                          </svg>
                        ) : (
                          <svg width="9" height="9" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" aria-hidden>
                            <path d="M6 2v8M2 6h8" />
                          </svg>
                        )}
                      </span>
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        {/* Progress */}
        {scroll.w < 0.999 && (
          <div className="relative mt-6 h-px" style={{ background: line }}>
            <span
              className="absolute -top-px h-[3px] rounded-full"
              style={{
                width: `${scroll.w * 100}%`,
                left: `${scroll.x * (1 - scroll.w) * 100}%`,
                background: text,
                transition: `left 200ms ${EASE}, width 300ms ${EASE}`,
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------------- Liquid ---------------- */

function generateLiquid(config: TweakConfig): string {
  const { face, family } = fontFaceFor(str(config, "font", "system"));
  const S = ".bs-as-{{ section.id }}";
  const r = "{{ section.settings.radius }}px";
  const line = "{{ section.settings.text_color | color_modify: 'alpha', 0.14 }}";

  const style = `<style>
${face ? face + "\n" : ""}  ${S} { container-type: inline-size; background: {{ section.settings.bg }}; color: {{ section.settings.text_color }}; font-family: ${family}; }
  ${S} * { box-sizing: border-box; }
  ${S} p, ${S} h2 { margin: 0; }
  ${S} a { color: inherit; text-decoration: none; }
  ${S} .bs-wrap { max-width: 1200px; margin: 0 auto; padding: 28px 20px; }
  ${S} .bs-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; }
  ${S} .bs-eye { font-size: 10px; font-weight: 500; text-transform: uppercase; letter-spacing: .16em; color: {{ section.settings.accent }}; }
  ${S} .bs-h { margin-top: 8px; font-size: 27px; font-weight: 500; line-height: 1.02; letter-spacing: -.035em; }
  ${S} .bs-tools { display: flex; align-items: center; gap: 16px; flex-shrink: 0; }
  ${S} .bs-link { white-space: nowrap; padding-bottom: 3px; border-bottom: 1px solid currentColor; font-size: 10px; font-weight: 500; text-transform: uppercase; letter-spacing: .14em; transition: opacity .2s; }
  ${S} .bs-link:hover { opacity: .6; }
  ${S} .bs-arrows { display: none; gap: 6px; }
  ${S} .bs-arrow { width: 36px; height: 36px; display: grid; place-items: center; border: 0; border-radius: 99px; cursor: pointer; background: transparent;
    color: inherit; box-shadow: inset 0 0 0 1px ${line}; transition: opacity .3s, background-color .3s; }
  ${S} .bs-arrow:hover:not(:disabled) { background: rgba(0,0,0,.04); }
  ${S} .bs-arrow:disabled { opacity: .3; cursor: default; }
  ${S} .bs-rail { display: flex; gap: 12px; overflow-x: auto; scroll-snap-type: x mandatory; margin: 24px -20px 0; padding: 0 20px; scroll-padding: 0 20px;
    scrollbar-width: none; -webkit-overflow-scrolling: touch; }
  ${S} .bs-rail::-webkit-scrollbar { display: none; }
  ${S} .bs-tile { flex: 0 0 44%; scroll-snap-align: start; display: flex; flex-direction: column; min-width: 0; }
  ${S} .bs-img { position: relative; display: block; aspect-ratio: 4 / 5; overflow: hidden; background: {{ section.settings.tile }}; border-radius: ${r}; }
  ${S} .bs-img img, ${S} .bs-img svg.bs-ph { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; transition: transform .7s cubic-bezier(.22,1,.36,1); }
  ${S} .bs-img svg.bs-ph { fill: {{ section.settings.muted }}; opacity: .35; }
  ${S} .bs-tile:hover .bs-img img { transform: scale(1.04); }
  ${S} .bs-seal { position: absolute; left: 10px; top: 10px; z-index: 1; width: 46px; height: 46px; border-radius: 99px; display: grid; place-content: center; text-align: center;
    color: {{ section.settings.accent }}; background: {{ section.settings.tile }};
    box-shadow: inset 0 0 0 1px {{ section.settings.accent | color_modify: 'alpha', 0.5 }}, inset 0 0 0 3px {{ section.settings.tile }}, inset 0 0 0 3.5px {{ section.settings.accent | color_modify: 'alpha', 0.3 }}; }
  ${S} .bs-seal i { display: block; font-style: normal; font-size: 6.5px; font-weight: 500; line-height: 1; text-transform: uppercase; letter-spacing: .14em; }
  ${S} .bs-seal b { display: block; margin-top: 3px; font-family: ${SERIF}; font-size: 12px; font-weight: 400; line-height: 1; }
  ${S} .bs-award { margin-top: 12px; min-height: 38px; }
  ${S} .bs-aw { font-size: 9.5px; font-weight: 500; line-height: 1.35; text-transform: uppercase; letter-spacing: .1em; }
  ${S} .bs-pub { margin-top: 4px; font-size: 12px; line-height: 1.35; color: {{ section.settings.muted }}; }
  ${S} .bs-pub em { font-style: {% if section.settings.serif_awards %}italic{% else %}normal{% endif %};{% if section.settings.serif_awards %} font-family: ${SERIF};{% endif %} }
  ${S} .bs-pub span { margin-left: 6px; font-size: 9.5px; text-transform: uppercase; letter-spacing: .12em; }
  ${S} .bs-info { flex: 1; display: flex; flex-direction: column; margin-top: 12px; padding-top: 12px; border-top: 1px solid ${line}; }
  ${S} .bs-role { font-size: 11px; text-transform: lowercase; color: {{ section.settings.muted }}; }
  ${S} .bs-name { font-size: 14px; font-weight: 500; line-height: 1.2; letter-spacing: -.015em;{% if section.settings.lowercase_names %} text-transform: lowercase;{% endif %} }
  ${S} .bs-buy { margin-top: auto; padding-top: 12px; display: flex; align-items: center; justify-content: space-between; gap: 8px; }
  ${S} .bs-price { font-size: 12.5px; font-variant-numeric: tabular-nums; }
  ${S} .bs-price s { margin-right: 4px; color: {{ section.settings.muted }}; }
  ${S} .bs-buy form { margin: 0; flex-shrink: 0; }
  ${S} .bs-add { height: 28px; padding: 0 12px; border: 0; border-radius: 99px; cursor: pointer; font: inherit; font-size: 11px; text-transform: lowercase;
    display: inline-flex; align-items: center; gap: 4px; background: transparent; color: {{ section.settings.text_color }};
    box-shadow: inset 0 0 0 1px {{ section.settings.text_color | color_modify: 'alpha', 0.4 }};
    transition: background-color .3s cubic-bezier(.22,1,.36,1), color .3s, box-shadow .3s, transform .2s; }
  ${S} .bs-add:hover:not(:disabled), ${S} .bs-add.is-added { background: {{ section.settings.text_color }}; color: {{ section.settings.tile }}; box-shadow: none; }
  ${S} .bs-add:active { transform: scale(.95); }
  ${S} .bs-add:disabled:not(.is-added) { opacity: .4; cursor: not-allowed; }
  ${S} .bs-prog { position: relative; height: 1px; margin-top: 24px; background: ${line}; }
  ${S} .bs-prog span { position: absolute; top: -1px; left: 0; height: 3px; border-radius: 99px; background: {{ section.settings.text_color }}; transition: left .2s cubic-bezier(.22,1,.36,1), width .3s cubic-bezier(.22,1,.36,1); }
  @container (min-width: 520px) { ${S} .bs-tile { flex-basis: 30.5%; } }
  @container (min-width: 720px) {
    ${S} .bs-wrap { padding: 48px 40px; }
    ${S} .bs-h { font-size: 38px; }
    ${S} .bs-arrows { display: flex; }
    ${S} .bs-rail { margin: 32px -40px 0; padding: 0 40px; scroll-padding: 0 40px; }
  }
  @container (min-width: 760px) { ${S} .bs-tile { flex-basis: 23%; } }
</style>`;

  const arrow = (d: -1 | 1) =>
    `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${
      d < 0 ? `<path d="M13 8H3M7 4L3 8l4 4"/>` : `<path d="M3 8h10M9 4l4 4-4 4"/>`
    }</svg>`;
  const plus = `<svg width="9" height="9" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" aria-hidden="true"><path d="M6 2v8M2 6h8"/></svg>`;

  const markup = `{%- comment -%}
  Award Shelf by boost.supply. Add one "Award winner" block per product:
  pick the product, then type its award, the publication and the year.
  "Display name" is optional and replaces the product title on the tile.
  The add button adds the product's first available variant to the cart
  without leaving the page (it falls back to a normal cart redirect).
{%- endcomment -%}
<div class="bs-as-{{ section.id }}" id="bs-as-{{ section.id }}" data-added="{{ section.settings.added_text | escape }}">
  <div class="bs-wrap">
    <div class="bs-head">
      <div>
        {%- if section.settings.eyebrow != blank -%}<p class="bs-eye">{{ section.settings.eyebrow }}</p>{%- endif -%}
        {%- if section.settings.heading != blank -%}<h2 class="bs-h">{{ section.settings.heading }}</h2>{%- endif -%}
      </div>
      <div class="bs-tools">
        {%- if section.settings.link_text != blank -%}<a class="bs-link" href="{{ section.settings.link_url | default: routes.all_products_collection_url }}">{{ section.settings.link_text }}</a>{%- endif -%}
        <div class="bs-arrows">
          <button type="button" class="bs-arrow" data-dir="-1" aria-label="Previous">${arrow(-1)}</button>
          <button type="button" class="bs-arrow" data-dir="1" aria-label="Next">${arrow(1)}</button>
        </div>
      </div>
    </div>

    <div class="bs-rail" data-rail>
      {%- for block in section.blocks -%}
        {%- assign bs_p = block.settings.product -%}
        {%- assign bs_n = forloop.index0 | modulo: 6 | plus: 1 -%}
        <article class="bs-tile" {{ block.shopify_attributes }}>
          <a class="bs-img" href="{%- if bs_p != blank -%}{{ bs_p.url }}{%- else -%}#{%- endif -%}">
            {%- if bs_p.featured_image -%}
              {{ bs_p.featured_image | image_url: width: 720 | image_tag: loading: 'lazy', alt: bs_p.title, sizes: '(min-width: 990px) 23vw, 44vw' }}
            {%- else -%}
              {%- assign bs_ph = 'product-' | append: bs_n -%}
              {{ bs_ph | placeholder_svg_tag: 'bs-ph' }}
            {%- endif -%}
            {%- if section.settings.show_seal and block.settings.year != blank -%}
              <span class="bs-seal" aria-hidden="true"><i>{{ section.settings.seal_text }}</i><b>{{ block.settings.year }}</b></span>
            {%- endif -%}
          </a>
          <div class="bs-award">
            {%- if block.settings.award != blank -%}<p class="bs-aw">{{ block.settings.award }}</p>{%- endif -%}
            <p class="bs-pub"><em>{{ block.settings.publication }}</em>{%- if block.settings.year != blank -%}<span>{{ block.settings.year }}</span>{%- endif -%}</p>
          </div>
          <div class="bs-info">
            {%- if block.settings.role != blank -%}<p class="bs-role">{{ block.settings.role }}</p>{%- endif -%}
            <a class="bs-name" href="{%- if bs_p != blank -%}{{ bs_p.url }}{%- else -%}#{%- endif -%}">
              {%- if block.settings.title != blank -%}{{ block.settings.title }}{%- elsif bs_p != blank -%}{{ bs_p.title }}{%- else -%}Choose a product{%- endif -%}
            </a>
            <div class="bs-buy">
              <span class="bs-price">
                {%- if bs_p != blank -%}
                  {%- if bs_p.compare_at_price > bs_p.price -%}<s>{{ bs_p.compare_at_price | money }}</s>{%- endif -%}{{ bs_p.price | money }}
                {%- endif -%}
              </span>
              {%- if bs_p != blank -%}
                {%- assign bs_fid = 'bs-as-' | append: block.id -%}
                {%- form 'product', bs_p, id: bs_fid, class: 'bs-form' -%}
                  <input type="hidden" name="id" value="{{ bs_p.selected_or_first_available_variant.id }}">
                  <input type="hidden" name="quantity" value="1">
                  <button type="submit" name="add" class="bs-add"{% unless bs_p.available %} disabled{% endunless %}><span>{{ section.settings.add_text }}</span>${plus}</button>
                {%- endform -%}
              {%- else -%}
                <button type="button" class="bs-add" disabled><span>{{ section.settings.add_text }}</span>${plus}</button>
              {%- endif -%}
            </div>
          </div>
        </article>
      {%- endfor -%}
    </div>
    <div class="bs-prog" data-prog hidden><span></span></div>
  </div>
</div>
<script>
  (function () {
    var root = document.getElementById('bs-as-{{ section.id }}');
    if (!root) return;
    var rail = root.querySelector('[data-rail]');
    var prog = root.querySelector('[data-prog]');
    var thumb = prog && prog.querySelector('span');
    var prev = root.querySelector('[data-dir="-1"]');
    var next = root.querySelector('[data-dir="1"]');
    function sync() {
      var max = rail.scrollWidth - rail.clientWidth;
      var w = rail.scrollWidth ? Math.min(1, rail.clientWidth / rail.scrollWidth) : 1;
      var x = max > 0 ? rail.scrollLeft / max : 0;
      if (prog) {
        prog.hidden = w > 0.999;
        thumb.style.width = w * 100 + '%';
        thumb.style.left = x * (1 - w) * 100 + '%';
      }
      if (prev) prev.disabled = rail.scrollLeft <= 2;
      if (next) next.disabled = rail.scrollLeft >= max - 2;
    }
    function step() {
      var t = rail.querySelector('.bs-tile');
      return t ? t.getBoundingClientRect().width + 12 : rail.clientWidth;
    }
    [prev, next].forEach(function (b) {
      if (!b) return;
      b.addEventListener('click', function () {
        rail.scrollBy({ left: step() * parseInt(b.getAttribute('data-dir'), 10), behavior: 'smooth' });
      });
    });
    rail.addEventListener('scroll', sync, { passive: true });
    window.addEventListener('resize', sync);
    sync();

    var addedText = root.getAttribute('data-added');
    root.querySelectorAll('form.bs-form').forEach(function (form) {
      form.addEventListener('submit', function (e) {
        if (!window.fetch || !window.FormData) return;
        e.preventDefault();
        var btn = form.querySelector('.bs-add');
        var label = btn.querySelector('span');
        var original = label.textContent;
        var base = (window.Shopify && Shopify.routes && Shopify.routes.root) || '/';
        btn.disabled = true;
        fetch(base + 'cart/add.js', { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } })
          .then(function (res) {
            if (!res.ok) throw new Error('add failed');
            btn.classList.add('is-added');
            label.textContent = addedText;
            document.dispatchEvent(new CustomEvent('cart:refresh', { bubbles: true }));
            setTimeout(function () {
              btn.classList.remove('is-added');
              label.textContent = original;
              btn.disabled = false;
            }, 2200);
          })
          .catch(function () { form.submit(); });
      });
    });
  })();
</script>`;

  const items = list(config, "items");

  const schema = buildSchema({
    name: "Award Shelf",
    settings: [
      { type: "text", id: "eyebrow", label: "Eyebrow", default: str(config, "eyebrow") },
      { type: "text", id: "heading", label: "Heading", default: str(config, "heading") },
      { type: "text", id: "link_text", label: "Link text", default: str(config, "linkText") },
      { type: "url", id: "link_url", label: "Link (defaults to all products)" },
      { type: "header", content: "Tiles" },
      { type: "text", id: "add_text", label: "Add button", default: str(config, "addText") },
      { type: "text", id: "added_text", label: "Added confirmation", default: str(config, "addedText") },
      { type: "checkbox", id: "show_seal", label: "Show award seal on the image", default: bool(config, "showSeal", true) },
      { type: "text", id: "seal_text", label: "Seal text", default: str(config, "sealText") },
      { type: "checkbox", id: "lowercase_names", label: "Lowercase product names", default: bool(config, "lowercaseNames", true) },
      { type: "checkbox", id: "serif_awards", label: "Serif publication names", default: bool(config, "serifAwards", true) },
      { type: "header", content: "Style" },
      { type: "color", id: "bg", label: "Background", default: str(config, "bg") },
      { type: "color", id: "tile", label: "Image tiles", default: str(config, "tile") },
      { type: "color", id: "text_color", label: "Text", default: str(config, "textColor") },
      { type: "color", id: "muted", label: "Muted text", default: str(config, "muted") },
      { type: "color", id: "accent", label: "Eyebrow & seal", default: str(config, "accent") },
      { type: "range", id: "radius", label: "Corner radius", min: 0, max: 24, step: 2, unit: "px", default: Math.max(0, Math.min(24, Math.round(num(config, "radius", 2) / 2) * 2)) },
    ],
    blocks: [
      {
        type: "award",
        name: "Award winner",
        settings: [
          { type: "product", id: "product", label: "Product" },
          { type: "text", id: "title", label: "Display name (optional, replaces the product title)" },
          { type: "text", id: "role", label: "Role (one word, e.g. prep)" },
          { type: "text", id: "award", label: "Award" },
          { type: "text", id: "publication", label: "Publication" },
          { type: "text", id: "year", label: "Year" },
        ],
      },
    ],
    maxBlocks: 12,
    presetBlocks: items.map((it) => ({
      type: "award",
      settings: {
        title: esc(it.name ?? ""),
        role: esc(it.role ?? ""),
        award: esc(it.award ?? ""),
        publication: esc(it.publication ?? ""),
        year: esc(it.year ?? ""),
      },
    })),
  });

  return section({ style, markup, schema });
}

export const awardShelf: Tweak = {
  slug: "award-shelf",
  inspiredBy: "rhode",
  name: "Award Shelf",
  tagline: "A calm shelf of award-winning products, each with its award, role and a one-tap add.",
  description:
    "Modeled on the award winners shelf Rhode runs on its homepage. Every product tile carries its award (category, publication and year) with a small seal, a one-word role above a lowercase product name, the price and a minimal add button that adds to cart without leaving the page. Swipeable with scroll-snap on mobile, arrows and a hairline progress bar on desktop. Third-party credibility right next to the buy button.",
  category: "social-proof",
  tier: "free",
  tint: "#f1f0ed",
  Preview,
  generateLiquid,
  defaults,
  fields: [
    { key: "eyebrow", label: "Eyebrow", type: "text", group: "Content" },
    { key: "heading", label: "Heading", type: "text", group: "Content" },
    { key: "linkText", label: "Link text", type: "text", group: "Content" },
    { key: "currency", label: "Currency symbol", type: "text", group: "Content", hint: "Editor preview only; your store shows real prices" },
    {
      key: "items", label: "Award winners", type: "list", group: "Products",
      hint: "Name and price are preview only. In Shopify you pick the real product per block",
      itemFields: [
        { key: "role", label: "Role", type: "text" },
        { key: "name", label: "Name", type: "text" },
        { key: "price", label: "Price", type: "text" },
        { key: "award", label: "Award", type: "text" },
        { key: "publication", label: "Publication", type: "text" },
        { key: "year", label: "Year", type: "text" },
      ],
      newItem: { role: "treat", name: "overnight lip mask", price: "22", award: "Best overnight mask", publication: "Modern Muse", year: "2025" },
      addLabel: "Add product", max: 8,
    },
    { key: "addText", label: "Add button", type: "text", group: "Tiles" },
    { key: "addedText", label: "Added confirmation", type: "text", group: "Tiles" },
    { key: "showSeal", label: "Award seal on image", type: "toggle", group: "Tiles" },
    { key: "sealText", label: "Seal text", type: "text", group: "Tiles" },
    { key: "lowercaseNames", label: "Lowercase product names", type: "toggle", group: "Tiles" },
    { key: "serifAwards", label: "Serif publication names", type: "toggle", group: "Tiles" },
    fontField("Typography"),
    { key: "radius", label: "Corner radius", type: "slider", group: "Layout", min: 0, max: 24, step: 2, unit: "px" },
    { key: "bg", label: "Background", type: "color", group: "Colors" },
    { key: "tile", label: "Image tiles", type: "color", group: "Colors" },
    { key: "textColor", label: "Text", type: "color", group: "Colors" },
    { key: "muted", label: "Muted text", type: "color", group: "Colors" },
    { key: "accent", label: "Eyebrow & seal", type: "color", group: "Colors" },
  ],
};
