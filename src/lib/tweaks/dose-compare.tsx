"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { Tweak, TweakConfig } from "../types";
import { str, num, bool, list, fontStack, esc } from "../cfg";
import { fontField } from "../fields";
import { buildSchema, section, fontFaceFor } from "../liquid";
import { ProductArt, toNum } from "./product-art";

/* ============================================================
   Dose Comparison
   "Us vs a leading greens powder", nutrient by nutrient. Each
   row shows our dose and theirs as two mini horizontal bars
   that grow in when the table scrolls into view, plus a chip
   with how much more we put in ("+67% more"). A product photo
   heads the table.
   ============================================================ */

const EASE = "cubic-bezier(.22,1,.36,1)";

const defaults: TweakConfig = {
  eyebrow: "Dose for dose",
  heading: "More of what matters,",
  headingEm: "in every single scoop",
  text: "We compared one serving with the label of a best-selling greens powder. Same scoop, very different numbers.",
  image: "/mockups/gift-jar.jpg",
  oursLabel: "Daily Essentials",
  theirsLabel: "Leading greens powder",
  moreText: "more",
  rows: [
    { name: "Vitamin C", ours: "500", theirs: "300", unit: "mg" },
    { name: "Vitamin D3", ours: "50", theirs: "20", unit: "mcg" },
    { name: "Magnesium", ours: "150", theirs: "60", unit: "mg" },
    { name: "Zinc", ours: "15", theirs: "10", unit: "mg" },
    { name: "Probiotics", ours: "10", theirs: "7.2", unit: "B CFU" },
    { name: "Vitamin B12", ours: "100", theirs: "22", unit: "mcg" },
  ],
  animate: true,
  footnote: "Per daily serving, based on the published supplement facts of a top-selling greens powder.",
  bg: "#FFF6F1",
  card: "#FFFFFF",
  textColor: "#50000B",
  ours: "#A40011",
  theirs: "#F0C7A8",
  chip: "#50000B",
  chipText: "#FFB5A7",
  tile: "#F0C7A8",
  headingFont: "serif",
  font: "system",
  radius: 18,
};

/** Hex color + alpha byte, e.g. tint("#50000B", 0.1). */
const tint = (hex: string, a: number) =>
  /^#[0-9a-f]{6}$/i.test(hex)
    ? hex + Math.round(a * 255).toString(16).padStart(2, "0")
    : hex;

/** Serif stays Georgia-first, matching the exported Liquid. */
const headStack = (font: string) =>
  font === "serif" ? "Georgia, 'Times New Roman', serif" : fontStack(font);

/** Print a dose the way Liquid prints a number setting (no trailing .0). */
const fmt = (n: number) => String(Math.round(n * 100) / 100);

/** Turn the bars on once the table scrolls into view. */
function useInView<T extends Element>(enabled: boolean) {
  const ref = useRef<T>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    if (!enabled) return;
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setSeen(true);
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -10% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [enabled]);
  return [ref, seen || !enabled] as const;
}

function Preview({ config }: { config: TweakConfig }) {
  const bg = str(config, "bg", "#FFF6F1");
  const card = str(config, "card", "#FFFFFF");
  const text = str(config, "textColor", "#50000B");
  const oursC = str(config, "ours", "#A40011");
  const theirsC = str(config, "theirs", "#F0C7A8");
  const chipBg = str(config, "chip", "#50000B");
  const chipText = str(config, "chipText", "#FFB5A7");
  const tile = str(config, "tile", "#F0C7A8");
  const radius = num(config, "radius", 18);
  const head = headStack(str(config, "headingFont", "serif"));
  const body = fontStack(str(config, "font", "system"));
  const photo = str(config, "image").trim();
  const more = str(config, "moreText", "more");

  const [ref, inView] = useInView<HTMLDivElement>(bool(config, "animate", true));

  const rows = list(config, "rows").map((r) => {
    const o = Math.max(0, toNum(r.ours));
    const t = Math.max(0, toNum(r.theirs));
    const max = Math.max(o, t) || 1;
    return {
      name: r.name ?? "",
      unit: r.unit ?? "",
      o,
      t,
      wo: (o / max) * 100,
      wt: (t / max) * 100,
      pct: t > 0 ? Math.round(((o - t) / t) * 100) : 0,
    };
  });

  const bar = (w: number, color: string, i: number, lag: number): CSSProperties => ({
    width: inView ? `${w}%` : "0%",
    background: color,
    transition: `width 1100ms ${EASE} ${i * 90 + lag}ms`,
  });

  return (
    <div className="@container w-full" style={{ background: bg, color: text, fontFamily: body }}>
      <div className="mx-auto w-full max-w-[920px] px-5 py-7 @min-[640px]:px-10 @min-[640px]:py-12">
        {/* Header: photo + copy */}
        <div className="grid grid-cols-[96px_minmax(0,1fr)] items-center gap-4 @min-[640px]:grid-cols-[168px_minmax(0,1fr)] @min-[640px]:gap-8">
          <div className="relative aspect-square overflow-hidden" style={{ background: tile, borderRadius: radius }}>
            {photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photo} alt="" loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover" />
            ) : (
              <div className="grid h-full w-full place-items-center [&>div]:h-[82%]! [&>div]:w-[82%]! [&_svg]:h-[82%] [&_svg]:w-[82%]">
                <ProductArt kind="jar" tone={oursC} size={120} tile="transparent" />
              </div>
            )}
          </div>
          <div className="min-w-0">
            {str(config, "eyebrow") && (
              <p className="text-[10.5px] font-bold uppercase tracking-[0.18em]" style={{ color: oursC }}>
                {str(config, "eyebrow")}
              </p>
            )}
            {(str(config, "heading") || str(config, "headingEm")) && (
              <h3
                className="mt-2 text-[24px] font-normal leading-[1.06] tracking-[-0.01em] @min-[640px]:text-[38px]"
                style={{ fontFamily: head }}
              >
                {str(config, "heading")}
                {str(config, "headingEm") && (
                  <em className="block italic" style={{ color: oursC }}>
                    {str(config, "headingEm")}
                  </em>
                )}
              </h3>
            )}
            {str(config, "text") && (
              <p className="mt-3 hidden max-w-[480px] text-[14px] leading-relaxed @min-[640px]:block" style={{ color: tint(text, 0.72) }}>
                {str(config, "text")}
              </p>
            )}
          </div>
        </div>
        {str(config, "text") && (
          <p className="mt-4 text-[13.5px] leading-relaxed @min-[640px]:hidden" style={{ color: tint(text, 0.72) }}>
            {str(config, "text")}
          </p>
        )}

        {/* Table */}
        <div
          ref={ref}
          className="mt-6 px-4 pb-2 pt-4 @min-[640px]:mt-9 @min-[640px]:px-7 @min-[640px]:pt-6"
          style={{ background: card, borderRadius: radius, boxShadow: `0 1px 0 ${tint(text, 0.04)}, 0 24px 48px -36px ${tint(text, 0.45)}` }}
        >
          {/* legend */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 pb-3.5 text-[10px] font-bold uppercase tracking-[0.14em] @min-[640px]:pb-4 @min-[640px]:text-[10.5px]">
            <span className="flex items-center gap-2">
              <i className="h-2 w-5 rounded-full" style={{ background: oursC }} />
              {str(config, "oursLabel")}
            </span>
            <span className="flex items-center gap-2" style={{ color: tint(text, 0.6) }}>
              <i className="h-2 w-5 rounded-full" style={{ background: theirsC }} />
              {str(config, "theirsLabel")}
            </span>
          </div>

          {rows.map((r, i) => (
            <div
              key={i}
              className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2.5 py-3.5 @min-[640px]:grid-cols-[150px_minmax(0,1fr)_96px] @min-[640px]:gap-x-6 @min-[640px]:py-4"
              style={{ borderTop: `1px solid ${tint(text, 0.08)}` }}
            >
              <p className="text-[14px] font-semibold leading-tight @min-[640px]:text-[14.5px]">{r.name}</p>

              {/* bars */}
              <div className="col-span-2 grid gap-1.5 @min-[640px]:col-span-1 @min-[640px]:row-start-1 @min-[640px]:col-start-2">
                <div className="flex items-center gap-2.5">
                  <div className="h-[10px] min-w-0 flex-1">
                    <div className="h-full rounded-full" style={bar(r.wo, oursC, i, 0)} />
                  </div>
                  <span className="w-[74px] shrink-0 text-[12.5px] font-semibold tabular-nums">
                    {fmt(r.o)} <span className="font-normal opacity-70">{r.unit}</span>
                  </span>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="h-[10px] min-w-0 flex-1">
                    <div className="h-full rounded-full" style={bar(r.wt, theirsC, i, 120)} />
                  </div>
                  <span className="w-[74px] shrink-0 text-[12.5px] tabular-nums" style={{ color: tint(text, 0.6) }}>
                    {fmt(r.t)} <span className="opacity-80">{r.unit}</span>
                  </span>
                </div>
              </div>

              <div className="col-start-2 row-start-1 flex justify-end @min-[640px]:col-start-3">
                {r.pct > 0 && (
                  <span
                    className="whitespace-nowrap rounded-full px-2.5 py-[5px] text-[11px] font-bold leading-none tabular-nums transition-[opacity,scale] duration-500"
                    style={{
                      background: chipBg,
                      color: chipText,
                      opacity: inView ? 1 : 0,
                      scale: inView ? "1" : "0.85",
                      transitionDelay: `${i * 90 + 600}ms`,
                      transitionTimingFunction: EASE,
                    }}
                  >
                    +{r.pct}% {more}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {str(config, "footnote") && (
          <p className="mt-4 text-[11px] leading-relaxed @min-[640px]:text-center" style={{ color: tint(text, 0.55) }}>
            {str(config, "footnote")}
          </p>
        )}
      </div>
    </div>
  );
}

function generateLiquid(config: TweakConfig): string {
  const headFont = fontFaceFor(str(config, "headingFont", "serif"));
  const bodyFont = fontFaceFor(str(config, "font", "system"));
  const face = headFont.face || bodyFont.face;
  const S = ".bs-dc-{{ section.id }}";
  const t = "{{ section.settings.text_color }}";
  const oc = "{{ section.settings.ours_color }}";
  const tx = (pct: number) => `color-mix(in srgb, ${t} ${pct}%, transparent)`;
  const r = "{{ section.settings.radius }}px";

  const style = `<style>
${face ? face + "\n" : ""}  ${S} { container-type: inline-size; background: {{ section.settings.bg }}; color: ${t}; font-family: ${bodyFont.family}; }
  ${S} * { box-sizing: border-box; }
  ${S} p, ${S} h2 { margin: 0; }
  ${S} .bs-in { max-width: 920px; margin: 0 auto; padding: 28px 20px; }
  ${S} .bs-head { display: grid; grid-template-columns: 96px minmax(0, 1fr); align-items: center; gap: 16px; }
  ${S} .bs-photo { position: relative; aspect-ratio: 1; overflow: hidden; display: grid; place-items: center; background: {{ section.settings.tile }}; border-radius: ${r}; }
  ${S} .bs-photo img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
  ${S} .bs-photo .bs-ph { width: 80%; height: 80%; fill: ${t}; opacity: .3; }
  ${S} .bs-eyebrow { font-size: 10.5px; font-weight: 700; letter-spacing: .18em; text-transform: uppercase; color: ${oc}; }
  ${S} .bs-h { margin-top: 8px; font-family: ${headFont.family}; font-size: 24px; font-weight: 400; line-height: 1.06; letter-spacing: -.01em; }
  ${S} .bs-h em { display: block; font-style: italic; color: ${oc}; }
  ${S} .bs-x { margin-top: 16px; max-width: 480px; font-size: 13.5px; line-height: 1.6; color: ${tx(72)}; }
  ${S} .bs-x-wide { display: none; }
  ${S} .bs-table { margin-top: 24px; padding: 16px 16px 8px; background: {{ section.settings.card }}; border-radius: ${r};
    box-shadow: 0 1px 0 ${tx(4)}, 0 24px 48px -36px ${tx(45)}; }
  ${S} .bs-legend { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 20px; padding-bottom: 14px; font-size: 10px; font-weight: 700;
    letter-spacing: .14em; text-transform: uppercase; }
  ${S} .bs-legend span { display: flex; align-items: center; gap: 8px; }
  ${S} .bs-legend span + span { color: ${tx(60)}; }
  ${S} .bs-legend i { width: 20px; height: 8px; border-radius: 99px; }
  ${S} .bs-row { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center; gap: 10px 12px; padding: 14px 0; border-top: 1px solid ${tx(8)}; }
  ${S} .bs-name { font-size: 14px; font-weight: 600; line-height: 1.25; }
  ${S} .bs-bars { grid-column: 1 / -1; display: grid; gap: 6px; }
  ${S} .bs-line { display: flex; align-items: center; gap: 10px; }
  ${S} .bs-track { flex: 1; min-width: 0; height: 10px; }
  ${S} .bs-fill { height: 100%; width: var(--w); border-radius: 99px; }
  ${S}.is-anim .bs-fill { width: 0; transition: width 1.1s cubic-bezier(.22,1,.36,1); transition-delay: calc(var(--i) * 90ms + var(--lag, 0ms)); }
  ${S}.is-anim.is-in .bs-fill { width: var(--w); }
  ${S} .bs-fill-o { background: ${oc}; }
  ${S} .bs-fill-t { background: {{ section.settings.theirs_color }}; --lag: 120ms; }
  ${S} .bs-val { width: 74px; flex-shrink: 0; font-size: 12.5px; font-variant-numeric: tabular-nums; }
  ${S} .bs-val-o { font-weight: 600; }
  ${S} .bs-val-o small { font-size: inherit; font-weight: 400; opacity: .7; }
  ${S} .bs-val-t { color: ${tx(60)}; }
  ${S} .bs-chip-wrap { grid-column: 2; grid-row: 1; display: flex; justify-content: flex-end; }
  ${S} .bs-chip { white-space: nowrap; padding: 5px 10px; border-radius: 99px; font-size: 11px; font-weight: 700; line-height: 1; font-variant-numeric: tabular-nums;
    background: {{ section.settings.chip }}; color: {{ section.settings.chip_text }}; }
  ${S}.is-anim .bs-chip { opacity: 0; transform: scale(.85); transition: opacity .5s cubic-bezier(.22,1,.36,1), transform .5s cubic-bezier(.22,1,.36,1);
    transition-delay: calc(var(--i) * 90ms + 600ms); }
  ${S}.is-anim.is-in .bs-chip { opacity: 1; transform: none; }
  ${S} .bs-foot { margin-top: 16px; font-size: 11px; line-height: 1.6; color: ${tx(55)}; }
  @container (min-width: 640px) {
    ${S} .bs-in { padding: 48px 40px; }
    ${S} .bs-head { grid-template-columns: 168px minmax(0, 1fr); gap: 32px; }
    ${S} .bs-h { font-size: 38px; }
    ${S} .bs-x { margin-top: 12px; font-size: 14px; }
    ${S} .bs-x-wide { display: block; }
    ${S} .bs-x-narrow { display: none; }
    ${S} .bs-table { margin-top: 36px; padding: 24px 28px 8px; }
    ${S} .bs-legend { padding-bottom: 16px; font-size: 10.5px; }
    ${S} .bs-row { grid-template-columns: 150px minmax(0, 1fr) 96px; gap: 10px 24px; padding: 16px 0; }
    ${S} .bs-name { font-size: 14.5px; }
    ${S} .bs-bars { grid-column: 2; grid-row: 1; }
    ${S} .bs-chip-wrap { grid-column: 3; }
    ${S} .bs-foot { text-align: center; }
  }
  @media (prefers-reduced-motion: reduce) {
    ${S}.is-anim .bs-fill, ${S}.is-anim .bs-chip { transition: none; }
  }
</style>`;

  const markup = `{%- comment -%}
  Dose Comparison by boost.supply. Add a Nutrient block per row and type
  both doses as plain numbers (decimals are fine, e.g. 7.2). The bars and
  the "+% more" chip are worked out from those numbers. Write the chip
  yourself in "Chip text" to override it.
  The image falls back to the product's featured image on product pages.
{%- endcomment -%}
<div class="bs-dc-{{ section.id }}{% if section.settings.animate %} is-anim{% endif %}" id="bs-dc-{{ section.id }}">
  <div class="bs-in">
    <div class="bs-head">
      <div class="bs-photo">
        {%- if section.settings.image != blank -%}
          {{ section.settings.image | image_url: width: 400 | image_tag: loading: 'lazy' }}
        {%- elsif product.featured_image -%}
          {{ product.featured_image | image_url: width: 400 | image_tag: loading: 'lazy' }}
        {%- else -%}
          {{ 'product-1' | placeholder_svg_tag: 'bs-ph' }}
        {%- endif -%}
      </div>
      <div>
        {%- if section.settings.eyebrow != blank -%}<p class="bs-eyebrow">{{ section.settings.eyebrow }}</p>{%- endif -%}
        <h2 class="bs-h">
          {{- section.settings.heading -}}
          {%- if section.settings.heading_em != blank -%}<em>{{ section.settings.heading_em }}</em>{%- endif -%}
        </h2>
        {%- if section.settings.text != blank -%}<p class="bs-x bs-x-wide">{{ section.settings.text }}</p>{%- endif -%}
      </div>
    </div>
    {%- if section.settings.text != blank -%}<p class="bs-x bs-x-narrow">{{ section.settings.text }}</p>{%- endif -%}

    <div class="bs-table">
      <div class="bs-legend">
        <span><i style="background: {{ section.settings.ours_color }};"></i>{{ section.settings.ours_label }}</span>
        <span><i style="background: {{ section.settings.theirs_color }};"></i>{{ section.settings.theirs_label }}</span>
      </div>
      {%- for block in section.blocks -%}
        {%- liquid
          assign bs_o = block.settings.ours | default: 0 | times: 1.0
          assign bs_t = block.settings.theirs | default: 0 | times: 1.0
          assign bs_max = bs_o | at_least: bs_t
          if bs_max <= 0
            assign bs_max = 1.0
          endif
          assign bs_wo = bs_o | times: 100 | divided_by: bs_max | round: 1
          assign bs_wt = bs_t | times: 100 | divided_by: bs_max | round: 1
          assign bs_pct = 0
          if bs_t > 0
            assign bs_pct = bs_o | minus: bs_t | times: 100 | divided_by: bs_t | round
          endif
        -%}
        <div class="bs-row" style="--i: {{ forloop.index0 }};" {{ block.shopify_attributes }}>
          <p class="bs-name">{{ block.settings.name }}</p>
          <div class="bs-bars">
            <div class="bs-line">
              <div class="bs-track"><div class="bs-fill bs-fill-o" style="--w: {{ bs_wo }}%;"></div></div>
              <span class="bs-val bs-val-o">{{ block.settings.ours }} <small>{{ block.settings.unit }}</small></span>
            </div>
            <div class="bs-line">
              <div class="bs-track"><div class="bs-fill bs-fill-t" style="--w: {{ bs_wt }}%;"></div></div>
              <span class="bs-val bs-val-t">{{ block.settings.theirs }} {{ block.settings.unit }}</span>
            </div>
          </div>
          <div class="bs-chip-wrap">
            {%- if block.settings.chip != blank -%}
              <span class="bs-chip">{{ block.settings.chip }}</span>
            {%- elsif bs_pct > 0 -%}
              <span class="bs-chip">+{{ bs_pct }}% {{ section.settings.more_text }}</span>
            {%- endif -%}
          </div>
        </div>
      {%- endfor -%}
    </div>

    {%- if section.settings.footnote != blank -%}<p class="bs-foot">{{ section.settings.footnote }}</p>{%- endif -%}
  </div>
</div>
<script>
  (function () {
    var root = document.getElementById('bs-dc-{{ section.id }}');
    if (!root || !root.classList.contains('is-anim')) return;
    if (!('IntersectionObserver' in window)) { root.classList.add('is-in'); return; }
    var io = new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting) {
        root.classList.add('is-in');
        io.disconnect();
      }
    }, { rootMargin: '0px 0px -10% 0px' });
    io.observe(root.querySelector('.bs-table') || root);
  })();
</script>`;

  const rows = list(config, "rows");
  const radius = num(config, "radius", 18);

  const schema = buildSchema({
    name: "Dose Comparison",
    settings: [
      { type: "text", id: "eyebrow", label: "Eyebrow", default: str(config, "eyebrow") },
      { type: "text", id: "heading", label: "Heading", default: str(config, "heading") },
      { type: "text", id: "heading_em", label: "Heading, italic line", default: str(config, "headingEm") },
      { type: "textarea", id: "text", label: "Text", default: str(config, "text") },
      { type: "image_picker", id: "image", label: "Product image", info: "Defaults to the product's featured image" },
      { type: "header", content: "Table" },
      { type: "text", id: "ours_label", label: "Your product label", default: str(config, "oursLabel") },
      { type: "text", id: "theirs_label", label: "Competitor label", default: str(config, "theirsLabel") },
      { type: "text", id: "more_text", label: "Chip suffix (e.g. more)", default: str(config, "moreText") },
      { type: "checkbox", id: "animate", label: "Grow the bars in on scroll", default: bool(config, "animate", true) },
      { type: "textarea", id: "footnote", label: "Footnote", default: str(config, "footnote") },
      { type: "header", content: "Style" },
      { type: "color", id: "bg", label: "Background", default: str(config, "bg") },
      { type: "color", id: "card", label: "Table background", default: str(config, "card") },
      { type: "color", id: "text_color", label: "Text", default: str(config, "textColor") },
      { type: "color", id: "ours_color", label: "Your bars & accent", default: str(config, "ours") },
      { type: "color", id: "theirs_color", label: "Competitor bars", default: str(config, "theirs") },
      { type: "color", id: "chip", label: "Chip", default: str(config, "chip") },
      { type: "color", id: "chip_text", label: "Chip text", default: str(config, "chipText") },
      { type: "color", id: "tile", label: "Image background", default: str(config, "tile") },
      { type: "range", id: "radius", label: "Corner radius", min: 0, max: 28, step: 2, unit: "px", default: Math.max(0, Math.min(28, Math.round(radius / 2) * 2)) },
    ],
    blocks: [
      {
        type: "nutrient",
        name: "Nutrient",
        settings: [
          { type: "text", id: "name", label: "Nutrient" },
          { type: "number", id: "ours", label: "Your dose", default: 100 },
          { type: "number", id: "theirs", label: "Competitor dose", default: 50 },
          { type: "text", id: "unit", label: "Unit", default: "mg" },
          { type: "text", id: "chip", label: "Chip text (leave empty for +% more)" },
        ],
      },
    ],
    maxBlocks: 12,
    presetBlocks: rows.slice(0, 12).map((row) => ({
      type: "nutrient",
      settings: {
        name: esc(row.name ?? ""),
        ours: Math.max(0, Math.round(toNum(row.ours) * 100) / 100),
        theirs: Math.max(0, Math.round(toNum(row.theirs) * 100) / 100),
        unit: esc(row.unit ?? ""),
      },
    })),
  });

  return section({ style, markup, schema });
}

export const doseCompare: Tweak = {
  slug: "dose-compare",
  inspiredBy: "im8",
  name: "Dose Comparison",
  tagline: "Your doses against a leading competitor, nutrient by nutrient, with bars that grow in.",
  description:
    "Modeled on the nutrient comparison IM8 uses to stack its formula against other greens powders. A product photo heads a clean table where every row puts your dose and the competitor's side by side as two mini bars that grow in on scroll, with a chip that spells out the difference (+67% more). Rows are blocks with plain numbers, so the bars and percentages work themselves out.",
  category: "product-page",
  tier: "free",
  tint: "#f8ede8",
  Preview,
  generateLiquid,
  defaults,
  fields: [
    { key: "eyebrow", label: "Eyebrow", type: "text", group: "Content" },
    { key: "heading", label: "Heading", type: "text", group: "Content" },
    { key: "headingEm", label: "Heading, italic line", type: "text", group: "Content" },
    { key: "text", label: "Text", type: "textarea", group: "Content" },
    { key: "image", label: "Image URL", type: "text", group: "Media", hint: "Leave empty for a drawn jar. In Shopify it uses the product photo or the image you pick" },
    { key: "oursLabel", label: "Your product label", type: "text", group: "Table" },
    { key: "theirsLabel", label: "Competitor label", type: "text", group: "Table" },
    { key: "moreText", label: "Chip suffix", type: "text", group: "Table" },
    {
      key: "rows", label: "Nutrients", type: "list", group: "Table",
      hint: "Doses are plain numbers; the bars and +% chip are calculated",
      itemFields: [
        { key: "name", label: "Nutrient", type: "text" },
        { key: "ours", label: "Your dose", type: "text" },
        { key: "theirs", label: "Competitor dose", type: "text" },
        { key: "unit", label: "Unit", type: "text" },
      ],
      newItem: { name: "Vitamin K2", ours: "90", theirs: "30", unit: "mcg" },
      addLabel: "Add nutrient",
      max: 12,
    },
    { key: "animate", label: "Grow the bars in on scroll", type: "toggle", group: "Table" },
    { key: "footnote", label: "Footnote", type: "textarea", group: "Table" },
    fontField("Typography", "headingFont", "Heading font"),
    fontField("Typography", "font", "Body font"),
    { key: "radius", label: "Corner radius", type: "slider", group: "Layout", min: 0, max: 28, step: 2, unit: "px" },
    { key: "bg", label: "Background", type: "color", group: "Colors" },
    { key: "card", label: "Table background", type: "color", group: "Colors" },
    { key: "textColor", label: "Text", type: "color", group: "Colors" },
    { key: "ours", label: "Your bars & accent", type: "color", group: "Colors" },
    { key: "theirs", label: "Competitor bars", type: "color", group: "Colors" },
    { key: "chip", label: "Chip", type: "color", group: "Colors" },
    { key: "chipText", label: "Chip text", type: "color", group: "Colors" },
    { key: "tile", label: "Image background", type: "color", group: "Colors" },
  ],
};
