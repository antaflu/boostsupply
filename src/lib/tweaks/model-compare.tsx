"use client";

import { useState } from "react";
import type { Tweak, TweakConfig } from "../types";
import { str, num, list, fontStack, esc } from "../cfg";
import { fontField } from "../fields";
import { buildSchema, section, fontFaceFor } from "../liquid";
import { money, toNum } from "./product-art";

/* ============================================================
   Model Compare
   Three models side by side (photo, best for, material, weight,
   a cushioning dot meter, price) with a highlighted column that
   slides to the best match when a shopper taps "Everyday",
   "Running" or "Travel". With nothing picked, the recommended
   model is highlighted.
   ============================================================ */

const SERIF = "Georgia, 'Times New Roman', serif";
const EASE = "cubic-bezier(.22,1,.36,1)";

const defaults: TweakConfig = {
  eyebrow: "Compare",
  heading: "Find your",
  headingAccent: "perfect pair",
  chipsLabel: "I need a pair for",
  uses: "Everyday, Running, Travel",
  currency: "$",
  models: [
    { name: "Trail Lite", subtitle: "Moss", image: "/mockups/sneaker-olive.jpg", bestFor: "Runs and light trails", material: "Tree fibre mesh", weight: "8.9 oz", cushion: "5", price: "125", match: "Running", recommended: "" },
    { name: "Daily Runner", subtitle: "Oat", image: "/mockups/sneaker-sand.jpg", bestFor: "All-day wear", material: "Merino wool knit", weight: "9.6 oz", cushion: "3", price: "98", match: "Everyday", recommended: "yes" },
    { name: "Breeze Knit", subtitle: "Deep Navy", image: "/mockups/sneaker-navy.jpg", bestFor: "Flights and long days", material: "Recycled knit", weight: "8.1 oz", cushion: "4", price: "110", match: "Travel", recommended: "" },
  ],
  bestForLabel: "Best for",
  materialLabel: "Material",
  weightLabel: "Weight",
  cushionLabel: "Cushioning",
  priceLabel: "Price",
  recommendedText: "Recommended",
  matchText: "Best for {{use}}",
  shopText: "Shop",
  bg: "#FFFFFF",
  textColor: "#212121",
  muted: "#6E6A64",
  line: "#E0DACF",
  tile: "#F5F4F1",
  accent: "#10714E",
  navy: "#03143B",
  font: "system",
  radius: 8,
};

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const splitList = (s: string) =>
  String(s ?? "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
const isYes = (s: string | undefined) => /^(y|yes|true|1|x)$/i.test(String(s ?? "").trim());

function Dots({ value, on, off }: { value: number; on: string; off: string }) {
  return (
    <span className="inline-flex gap-[5px]" aria-label={`${value} out of 5`}>
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className="h-[7px] w-[7px] rounded-full" style={{ background: i < value ? on : off, transition: `background-color 300ms ${EASE}` }} />
      ))}
    </span>
  );
}

function Preview({ config }: { config: TweakConfig }) {
  const cur = str(config, "currency", "$");
  const bg = str(config, "bg", "#FFFFFF");
  const text = str(config, "textColor", "#212121");
  const muted = str(config, "muted", "#6E6A64");
  const line = str(config, "line", "#E0DACF");
  const tile = str(config, "tile", "#F5F4F1");
  const accent = str(config, "accent", "#10714E");
  const navy = str(config, "navy", "#03143B");
  const radius = num(config, "radius", 8);
  const [use, setUse] = useState<string | null>(null);

  const models = list(config, "models")
    .slice(0, 4)
    .map((m) => ({
      name: m.name ?? "",
      subtitle: m.subtitle ?? "",
      image: (m.image ?? "").trim(),
      bestFor: m.bestFor ?? "",
      material: m.material ?? "",
      weight: m.weight ?? "",
      cushion: clamp(Math.round(toNum(m.cushion, 3)), 0, 5),
      price: toNum(m.price),
      match: splitList(m.match ?? "").map((x) => x.toLowerCase()),
      rec: isYes(m.recommended),
    }));
  const n = Math.max(1, models.length);
  const uses = splitList(str(config, "uses"));
  const recIdx = Math.max(0, models.findIndex((m) => m.rec));
  const matchIdx = use ? models.findIndex((m) => m.match.includes(use.toLowerCase())) : -1;
  const hi = matchIdx >= 0 ? matchIdx : recIdx;
  const badge = use && matchIdx >= 0 ? str(config, "matchText").split("{{use}}").join(use) : str(config, "recommendedText");
  const caps = "uppercase tracking-[0.14em]";

  const rowCls =
    "relative z-[1] grid grid-cols-[repeat(var(--n),minmax(0,1fr))] border-t @min-[640px]:grid-cols-[var(--lw)_repeat(var(--n),minmax(0,1fr))]";
  const labelCls = `col-span-full px-1 pb-0.5 pt-3 text-[10px] font-semibold ${caps} @min-[640px]:col-span-1 @min-[640px]:flex @min-[640px]:items-center @min-[640px]:py-4 @min-[640px]:text-[10.5px]`;
  const cellCls = "flex min-w-0 items-center justify-center px-1.5 pb-3 pt-1.5 text-center text-[12.5px] leading-snug @min-[640px]:px-3 @min-[640px]:py-4 @min-[640px]:text-[13.5px]";

  const row = (label: string, cell: (m: (typeof models)[number], i: number) => React.ReactNode) => (
    <div className={rowCls} style={{ borderColor: line }}>
      <div className={labelCls} style={{ color: muted }}>
        {label}
      </div>
      {models.map((m, i) => (
        <div key={i} className={cellCls} style={{ fontWeight: i === hi ? 500 : 400 }}>
          {cell(m, i)}
        </div>
      ))}
    </div>
  );

  return (
    <div className="@container w-full" style={{ background: bg, color: text, fontFamily: fontStack(str(config, "font", "system")) }}>
      <div className="mx-auto w-full max-w-[1100px] px-4 pb-8 pt-6 @min-[640px]:px-10 @min-[640px]:pb-12 @min-[640px]:pt-12">
        {/* Header + chips */}
        <div className="flex flex-col gap-4 @min-[640px]:flex-row @min-[640px]:items-end @min-[640px]:justify-between">
          <div>
            {str(config, "eyebrow") && (
              <p className={`text-[11px] font-medium ${caps}`} style={{ color: accent }}>
                {str(config, "eyebrow")}
              </p>
            )}
            <h3 className="mt-2 text-[30px] font-medium leading-[1.05] tracking-[-0.02em] @min-[640px]:text-[40px]">
              {str(config, "heading")}{" "}
              {str(config, "headingAccent") && (
                <em className="font-normal italic" style={{ fontFamily: SERIF }}>
                  {str(config, "headingAccent")}
                </em>
              )}
            </h3>
          </div>
          {uses.length > 0 && (
            <div>
              <p className={`text-[10px] font-semibold ${caps} @min-[640px]:text-right`} style={{ color: muted }}>
                {str(config, "chipsLabel")}
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5 @min-[640px]:justify-end">
                {uses.map((u) => {
                  const on = use === u;
                  return (
                    <button
                      key={u}
                      type="button"
                      aria-pressed={on}
                      onClick={() => setUse(on ? null : u)}
                      className="flex h-9 items-center gap-1.5 rounded-full px-4 text-[13px] font-medium"
                      style={{
                        background: on ? navy : bg,
                        color: on ? "#FFFFFF" : text,
                        boxShadow: on ? "none" : `inset 0 0 0 1px ${line}`,
                        transition: `background-color 250ms ${EASE}, color 250ms ${EASE}`,
                      }}
                    >
                      <svg
                        width="10"
                        height="10"
                        viewBox="0 0 12 12"
                        aria-hidden
                        style={{ width: on ? 10 : 0, opacity: on ? 1 : 0, transition: `width 300ms ${EASE}, opacity 200ms ease` }}
                      >
                        <path d="M2 6.4l2.6 2.4L10 3.4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      {u}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Table */}
        <div
          className="relative mt-6 pb-2 pt-6 [--lw:0px] @min-[640px]:mt-8 @min-[640px]:[--lw:150px]"
          style={{ "--n": n } as React.CSSProperties}
        >
          {/* sliding highlight */}
          <div
            aria-hidden
            className="pointer-events-none absolute bottom-0 top-0"
            style={{
              left: `calc(var(--lw) + ${hi} * (100% - var(--lw)) / ${n})`,
              width: `calc((100% - var(--lw)) / ${n})`,
              transition: `left 550ms ${EASE}`,
            }}
          >
            <div className="absolute inset-y-0 inset-x-0.5 @min-[640px]:inset-x-1.5" style={{ background: tile, borderRadius: radius + 4, boxShadow: `inset 0 0 0 1.5px ${accent}` }} />
            <span
              className={`absolute left-1/2 top-0 z-[2] -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full px-2.5 py-1 text-[9.5px] font-semibold ${caps} @min-[640px]:text-[10px]`}
              style={{ background: accent, color: "#FFFFFF" }}
            >
              <span key={badge} className="bs-swap inline-block">
                {badge}
              </span>
            </span>
          </div>

          {/* Models */}
          <div className="relative z-[1] grid grid-cols-[repeat(var(--n),minmax(0,1fr))] @min-[640px]:grid-cols-[var(--lw)_repeat(var(--n),minmax(0,1fr))]">
            <div className="hidden @min-[640px]:block" />
            {models.map((m, i) => (
              <div key={i} className="min-w-0 px-1.5 pb-3 pt-2 text-center @min-[640px]:px-3 @min-[640px]:pb-4">
                <div className="relative aspect-square overflow-hidden" style={{ background: tile, borderRadius: radius }}>
                  {m.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={m.image}
                      alt={m.name}
                      loading="lazy"
                      decoding="async"
                      className="absolute inset-0 h-full w-full object-cover"
                      style={{ transform: i === hi ? "scale(1.06)" : "none", transition: `transform 700ms ${EASE}` }}
                    />
                  ) : (
                    <span className="absolute inset-0 grid place-items-center">
                      <svg width="70%" viewBox="0 0 120 70" aria-hidden>
                        <path d="M10 50C8 45 12 41 20 39C30 37 40 35 48 32C56 29 64 25 70 21C73 19 77 19 79 22C81 25 84 28 90 28C96 28 102 25 106 24C109 23 112 25 112 29L113 50Z" fill={line} />
                      </svg>
                    </span>
                  )}
                </div>
                <p className="mt-2.5 truncate text-[13.5px] font-semibold @min-[640px]:text-[15px]">{m.name}</p>
                <p className="truncate text-[11.5px] @min-[640px]:text-[12.5px]" style={{ color: muted }}>
                  {m.subtitle}
                </p>
              </div>
            ))}
          </div>

          {row(str(config, "bestForLabel"), (m) => m.bestFor)}
          {row(str(config, "materialLabel"), (m) => m.material)}
          {row(str(config, "weightLabel"), (m) => <span className="tabular-nums">{m.weight}</span>)}
          {row(str(config, "cushionLabel"), (m, i) => (
            <Dots value={m.cushion} on={i === hi ? accent : text} off={line} />
          ))}
          {row(str(config, "priceLabel"), (m) => (
            <span className="text-[14px] font-semibold tabular-nums @min-[640px]:text-[15px]">{money(m.price, cur)}</span>
          ))}

          {/* CTAs */}
          <div className="relative z-[1] grid grid-cols-[repeat(var(--n),minmax(0,1fr))] border-t pt-3 @min-[640px]:grid-cols-[var(--lw)_repeat(var(--n),minmax(0,1fr))]" style={{ borderColor: line }}>
            <div className="hidden @min-[640px]:block" />
            {models.map((m, i) => {
              const on = i === hi;
              return (
                <div key={i} className="px-1.5 pb-2 @min-[640px]:px-3">
                  <button
                    type="button"
                    className="h-9 w-full truncate rounded-full px-2 text-[12.5px] font-medium hover:brightness-110 active:scale-[0.98] @min-[640px]:h-10 @min-[640px]:text-[13px]"
                    style={{
                      background: on ? accent : "transparent",
                      color: on ? "#FFFFFF" : text,
                      boxShadow: on ? "none" : `inset 0 0 0 1px ${text}`,
                      transition: `background-color 300ms ${EASE}, color 300ms ${EASE}, box-shadow 300ms ${EASE}, scale 200ms ease`,
                    }}
                  >
                    {str(config, "shopText")}
                    <span className="hidden @min-[640px]:inline"> {m.name}</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function generateLiquid(config: TweakConfig): string {
  const { face, family } = fontFaceFor(str(config, "font", "system"));
  const S = ".bs-mc-{{ section.id }}";
  const r = "{{ section.settings.radius }}px";
  const ease = "cubic-bezier(.22,1,.36,1)";
  const caps = "text-transform: uppercase; letter-spacing: .14em;";
  const radius = clamp(Math.round(num(config, "radius", 8) / 2) * 2, 0, 20);
  const dots = `{%- for i in (1..5) -%}<i{% if i <= block.settings.cushioning %} class="is-on"{% endif %}></i>{%- endfor -%}`;
  const cells = (inner: string) => `{%- for block in section.blocks -%}<div class="bs-cell" data-col="{{ forloop.index0 }}">${inner}</div>{%- endfor -%}`;

  const style = `<style>
${face ? face + "\n" : ""}  ${S} { container-type: inline-size; background: {{ section.settings.bg }}; color: {{ section.settings.text_color }}; font-family: ${family}; }
  ${S} * { box-sizing: border-box; }
  ${S} p, ${S} h2 { margin: 0; }
  ${S} a { color: inherit; text-decoration: none; }
  ${S} button { font: inherit; }
  ${S} .bs-wrap { max-width: 1100px; margin: 0 auto; padding: 24px 16px 32px; }
  ${S} .bs-caps { ${caps} }
  ${S} .bs-head { display: flex; flex-direction: column; gap: 16px; }
  ${S} .bs-eyebrow { font-size: 11px; font-weight: 500; color: {{ section.settings.accent }}; }
  ${S} .bs-h { margin-top: 8px; font-size: 30px; font-weight: 500; line-height: 1.05; letter-spacing: -.02em; }
  ${S} .bs-h em { font-family: Georgia, 'Times New Roman', serif; font-style: italic; font-weight: 400; }
  ${S} .bs-cl { font-size: 10px; font-weight: 600; color: {{ section.settings.muted }}; }
  ${S} .bs-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
  ${S} .bs-chip { display: flex; align-items: center; gap: 6px; height: 36px; padding: 0 16px; border: 0; border-radius: 99px; cursor: pointer; font-size: 13px; font-weight: 500;
    background: {{ section.settings.bg }}; color: {{ section.settings.text_color }}; box-shadow: inset 0 0 0 1px {{ section.settings.line }}; transition: background-color .25s ${ease}, color .25s ${ease}; }
  ${S} .bs-chip svg { width: 0; opacity: 0; transition: width .3s ${ease}, opacity .2s; }
  ${S} .bs-chip[aria-pressed="true"] { background: {{ section.settings.navy }}; color: #fff; box-shadow: none; }
  ${S} .bs-chip[aria-pressed="true"] svg { width: 10px; opacity: 1; }
  ${S} .bs-table { --lw: 0px; position: relative; margin-top: 24px; padding: 24px 0 8px; }
  ${S} .bs-hl { position: absolute; top: 0; bottom: 0; pointer-events: none; left: calc(var(--lw) + var(--i) * (100% - var(--lw)) / var(--n)); width: calc((100% - var(--lw)) / var(--n));
    transition: left .55s ${ease}; }
  ${S} .bs-hl::before { content: ""; position: absolute; top: 0; bottom: 0; left: 2px; right: 2px; border-radius: {{ section.settings.radius | plus: 4 }}px;
    background: {{ section.settings.tile }}; box-shadow: inset 0 0 0 1.5px {{ section.settings.accent }}; }
  ${S} .bs-badge { position: absolute; left: 50%; top: 0; z-index: 2; transform: translate(-50%, -50%); white-space: nowrap; padding: 4px 10px; border-radius: 99px;
    background: {{ section.settings.accent }}; color: #fff; font-size: 9.5px; font-weight: 600; }
  ${S} .bs-row { position: relative; z-index: 1; display: grid; grid-template-columns: repeat(var(--n), minmax(0, 1fr)); border-top: 1px solid {{ section.settings.line }}; }
  ${S} .bs-row.bs-top { border-top: 0; }
  ${S} .bs-lab { grid-column: 1 / -1; padding: 12px 4px 2px; font-size: 10px; font-weight: 600; color: {{ section.settings.muted }}; }
  ${S} .bs-top .bs-lab, ${S} .bs-cta .bs-lab { display: none; }
  ${S} .bs-cell { min-width: 0; display: flex; align-items: center; justify-content: center; padding: 6px 6px 12px; text-align: center; font-size: 12.5px; line-height: 1.35; }
  ${S} .bs-table[data-i="0"] [data-col="0"], ${S} .bs-table[data-i="1"] [data-col="1"], ${S} .bs-table[data-i="2"] [data-col="2"], ${S} .bs-table[data-i="3"] [data-col="3"] { font-weight: 500; }
  ${S} .bs-top .bs-cell { display: block; padding: 8px 6px 12px; }
  ${S} .bs-photo { position: relative; display: block; aspect-ratio: 1 / 1; overflow: hidden; border-radius: ${r}; background: {{ section.settings.tile }}; }
  ${S} .bs-photo img, ${S} .bs-photo .bs-ph { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; transition: transform .7s ${ease}; }
  ${S} .bs-table[data-i="0"] [data-col="0"] .bs-photo img, ${S} .bs-table[data-i="1"] [data-col="1"] .bs-photo img,
  ${S} .bs-table[data-i="2"] [data-col="2"] .bs-photo img, ${S} .bs-table[data-i="3"] [data-col="3"] .bs-photo img { transform: scale(1.06); }
  ${S} .bs-name { margin-top: 10px; font-size: 13.5px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  ${S} .bs-subt { font-size: 11.5px; color: {{ section.settings.muted }}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  ${S} .bs-dots { display: inline-flex; gap: 5px; }
  ${S} .bs-dots i { width: 7px; height: 7px; border-radius: 99px; background: {{ section.settings.line }}; }
  ${S} .bs-dots i.is-on { background: {{ section.settings.text_color }}; }
  ${S} .bs-table[data-i="0"] [data-col="0"] .bs-dots i.is-on, ${S} .bs-table[data-i="1"] [data-col="1"] .bs-dots i.is-on,
  ${S} .bs-table[data-i="2"] [data-col="2"] .bs-dots i.is-on, ${S} .bs-table[data-i="3"] [data-col="3"] .bs-dots i.is-on { background: {{ section.settings.accent }}; }
  ${S} .bs-price { font-size: 14px; font-weight: 600; font-variant-numeric: tabular-nums; }
  ${S} .bs-cta { padding-top: 12px; }
  ${S} .bs-cta .bs-cell { padding: 0 6px 8px; }
  ${S} .bs-shop { display: flex; align-items: center; justify-content: center; width: 100%; height: 36px; padding: 0 8px; border-radius: 99px; font-size: 12.5px; font-weight: 500;
    white-space: nowrap; overflow: hidden; box-shadow: inset 0 0 0 1px {{ section.settings.text_color }}; transition: background-color .3s ${ease}, color .3s ${ease}, box-shadow .3s ${ease}; }
  ${S} .bs-shop span { display: none; }
  ${S} .bs-table[data-i="0"] [data-col="0"] .bs-shop, ${S} .bs-table[data-i="1"] [data-col="1"] .bs-shop,
  ${S} .bs-table[data-i="2"] [data-col="2"] .bs-shop, ${S} .bs-table[data-i="3"] [data-col="3"] .bs-shop { background: {{ section.settings.accent }}; color: #fff; box-shadow: none; }
  ${S} .bs-empty { padding: 24px 0; font-size: 14px; color: {{ section.settings.muted }}; }
  @container (min-width: 640px) {
    ${S} .bs-wrap { padding: 48px 40px; }
    ${S} .bs-head { flex-direction: row; align-items: flex-end; justify-content: space-between; }
    ${S} .bs-h { font-size: 40px; }
    ${S} .bs-cl { text-align: right; }
    ${S} .bs-chips { justify-content: flex-end; }
    ${S} .bs-table { --lw: 150px; margin-top: 32px; }
    ${S} .bs-hl::before { left: 6px; right: 6px; }
    ${S} .bs-badge { font-size: 10px; }
    ${S} .bs-row { grid-template-columns: var(--lw) repeat(var(--n), minmax(0, 1fr)); }
    ${S} .bs-lab { grid-column: auto; display: flex; align-items: center; padding: 16px 4px; font-size: 10.5px; }
    ${S} .bs-top .bs-lab, ${S} .bs-cta .bs-lab { display: block; }
    ${S} .bs-cell { padding: 16px 12px; font-size: 13.5px; }
    ${S} .bs-top .bs-cell { padding: 8px 12px 16px; }
    ${S} .bs-cta .bs-cell { padding: 0 12px 8px; }
    ${S} .bs-name { font-size: 15px; }
    ${S} .bs-subt { font-size: 12.5px; }
    ${S} .bs-price { font-size: 15px; }
    ${S} .bs-shop { height: 40px; font-size: 13px; }
    ${S} .bs-shop span { display: inline; }
  }
</style>`;

  const markup = `{%- comment -%}
  Model Compare by boost.supply. Add it to a product or collection page.
  - Add 2 to 4 "Model" blocks and pick a product for each; the photo, price
    and link come from the product. The rows are plain text per block.
  - Tick "Recommended" on the model to highlight when nothing is picked.
  - "Use chips" are comma separated. A model is the best match for a chip
    when its "Matches" field lists that chip (e.g. "Running, Travel").
{%- endcomment -%}
{%- assign bs_rec = 0 -%}
{%- assign bs_found = false -%}
{%- for block in section.blocks -%}{%- if block.settings.recommended and bs_found == false -%}{%- assign bs_rec = forloop.index0 -%}{%- assign bs_found = true -%}{%- endif -%}{%- endfor -%}
{%- assign bs_uses = section.settings.uses | split: ',' -%}
<div class="bs-mc-{{ section.id }}" id="bs-mc-{{ section.id }}">
  <div class="bs-wrap">
    <div class="bs-head">
      <div>
        {%- if section.settings.eyebrow != blank -%}<p class="bs-eyebrow bs-caps">{{ section.settings.eyebrow }}</p>{%- endif -%}
        <h2 class="bs-h">{{ section.settings.heading }}{% if section.settings.heading_accent != blank %} <em>{{ section.settings.heading_accent }}</em>{% endif %}</h2>
      </div>
      {%- if section.settings.uses != blank -%}
        <div>
          <p class="bs-cl bs-caps">{{ section.settings.chips_label }}</p>
          <div class="bs-chips">
            {%- for bs_u in bs_uses -%}
              {%- assign bs_us = bs_u | strip -%}
              {%- if bs_us != blank -%}
                <button type="button" class="bs-chip" aria-pressed="false" data-use="{{ bs_us | downcase | escape }}" data-label="{{ bs_us | escape }}">
                  <svg height="10" viewBox="0 0 12 12" aria-hidden="true"><path d="M2 6.4l2.6 2.4L10 3.4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>{{ bs_us }}
                </button>
              {%- endif -%}
            {%- endfor -%}
          </div>
        </div>
      {%- endif -%}
    </div>

    {%- if section.blocks.size > 0 -%}
    <div class="bs-table" data-table data-i="{{ bs_rec }}" data-rec="{{ bs_rec }}" style="--n: {{ section.blocks.size }}; --i: {{ bs_rec }};"
      data-rec-text="{{ section.settings.recommended_text | escape }}" data-match-text="{{ section.settings.match_text | escape }}">
      <div class="bs-hl" aria-hidden="true"><span class="bs-badge bs-caps" data-badge>{{ section.settings.recommended_text }}</span></div>

      <div class="bs-row bs-top">
        <div class="bs-lab"></div>
        {%- for block in section.blocks -%}
          {%- assign bs_p = block.settings.product -%}
          {%- assign bs_img = block.settings.image | default: bs_p.featured_image -%}
          <div class="bs-cell" data-col="{{ forloop.index0 }}" data-match="{{ block.settings.match | downcase | escape }}" {{ block.shopify_attributes }}>
            <a class="bs-photo" href="{% if bs_p != blank %}{{ bs_p.url }}{% else %}#{% endif %}">
              {%- if bs_img != blank -%}
                {{ bs_img | image_url: width: 600 | image_tag: loading: 'lazy', alt: block.settings.name, sizes: '(min-width: 990px) 25vw, 33vw' }}
              {%- else -%}
                {{ 'product-1' | placeholder_svg_tag: 'bs-ph' }}
              {%- endif -%}
            </a>
            <p class="bs-name">{% if block.settings.name != blank %}{{ block.settings.name }}{% else %}{{ bs_p.title }}{% endif %}</p>
            {%- if block.settings.subtitle != blank -%}<p class="bs-subt">{{ block.settings.subtitle }}</p>{%- endif -%}
          </div>
        {%- endfor -%}
      </div>

      <div class="bs-row"><div class="bs-lab bs-caps">{{ section.settings.best_for_label }}</div>${cells("{{ block.settings.best_for }}")}</div>
      <div class="bs-row"><div class="bs-lab bs-caps">{{ section.settings.material_label }}</div>${cells("{{ block.settings.material }}")}</div>
      <div class="bs-row"><div class="bs-lab bs-caps">{{ section.settings.weight_label }}</div>${cells("{{ block.settings.weight }}")}</div>
      <div class="bs-row"><div class="bs-lab bs-caps">{{ section.settings.cushion_label }}</div>${cells(`<span class="bs-dots" aria-label="{{ block.settings.cushioning }} out of 5">${dots}</span>`)}</div>
      <div class="bs-row"><div class="bs-lab bs-caps">{{ section.settings.price_label }}</div>${cells(`<span class="bs-price">{% if block.settings.product != blank %}{{ block.settings.product.price | money }}{% else %}{{ block.settings.price_text }}{% endif %}</span>`)}</div>

      <div class="bs-row bs-cta">
        <div class="bs-lab"></div>
        ${cells(`<a class="bs-shop" href="{% if block.settings.product != blank %}{{ block.settings.product.url }}{% else %}#{% endif %}">{{ section.settings.shop_text }}<span>&nbsp;{% if block.settings.name != blank %}{{ block.settings.name }}{% else %}{{ block.settings.product.title }}{% endif %}</span></a>`)}
      </div>
    </div>
    {%- else -%}
      <p class="bs-empty">Add 2 to 4 “Model” blocks in the theme editor.</p>
    {%- endif -%}
  </div>
</div>
<script>
  (function () {
    var root = document.getElementById('bs-mc-{{ section.id }}');
    if (!root) return;
    var table = root.querySelector('[data-table]');
    if (!table) return;
    var badge = table.querySelector('[data-badge]');
    var cols = [].slice.call(table.querySelectorAll('.bs-top [data-match]'));
    var chips = [].slice.call(root.querySelectorAll('[data-use]'));
    var token = '{' + '{' + 'use' + '}' + '}';
    function show(i, text) {
      table.dataset.i = i;
      table.style.setProperty('--i', i);
      if (badge) badge.textContent = text;
    }
    chips.forEach(function (chip) {
      chip.addEventListener('click', function () {
        var on = chip.getAttribute('aria-pressed') !== 'true';
        chips.forEach(function (c) { c.setAttribute('aria-pressed', c === chip && on ? 'true' : 'false'); });
        var idx = -1;
        if (on) {
          cols.forEach(function (c, i) {
            if (idx > -1) return;
            var m = c.dataset.match.split(',').map(function (s) { return s.trim(); });
            if (m.indexOf(chip.dataset.use) > -1) idx = i;
          });
        }
        if (idx > -1) show(idx, table.dataset.matchText.split(token).join(chip.dataset.label));
        else show(+table.dataset.rec, table.dataset.recText);
      });
    });
  })();
</script>`;

  const schema = buildSchema({
    name: "Model Compare",
    settings: [
      { type: "text", id: "eyebrow", label: "Eyebrow", default: str(config, "eyebrow") },
      { type: "text", id: "heading", label: "Heading", default: str(config, "heading") },
      { type: "text", id: "heading_accent", label: "Heading accent (serif)", default: str(config, "headingAccent") },
      { type: "header", content: "Use chips" },
      { type: "text", id: "chips_label", label: "Chips label", default: str(config, "chipsLabel") },
      { type: "text", id: "uses", label: "Uses (comma separated)", default: str(config, "uses") },
      { type: "text", id: "recommended_text", label: "Badge when nothing is picked", default: str(config, "recommendedText") },
      { type: "text", id: "match_text", label: "Badge for a match (use {{use}})", default: str(config, "matchText") },
      { type: "header", content: "Row labels" },
      { type: "text", id: "best_for_label", label: "Best for", default: str(config, "bestForLabel") },
      { type: "text", id: "material_label", label: "Material", default: str(config, "materialLabel") },
      { type: "text", id: "weight_label", label: "Weight", default: str(config, "weightLabel") },
      { type: "text", id: "cushion_label", label: "Cushioning", default: str(config, "cushionLabel") },
      { type: "text", id: "price_label", label: "Price", default: str(config, "priceLabel") },
      { type: "text", id: "shop_text", label: "Button text", default: str(config, "shopText") },
      { type: "header", content: "Style" },
      { type: "color", id: "accent", label: "Accent (highlight)", default: str(config, "accent") },
      { type: "color", id: "navy", label: "Active chip", default: str(config, "navy") },
      { type: "color", id: "tile", label: "Highlight & photo tiles", default: str(config, "tile") },
      { type: "color", id: "line", label: "Lines", default: str(config, "line") },
      { type: "color", id: "bg", label: "Background", default: str(config, "bg") },
      { type: "color", id: "text_color", label: "Text", default: str(config, "textColor") },
      { type: "color", id: "muted", label: "Muted text", default: str(config, "muted") },
      { type: "range", id: "radius", label: "Corner radius", min: 0, max: 20, step: 2, unit: "px", default: radius },
    ],
    blocks: [
      {
        type: "model",
        name: "Model",
        settings: [
          { type: "product", id: "product", label: "Product" },
          { type: "image_picker", id: "image", label: "Photo (optional, overrides the product image)" },
          { type: "text", id: "name", label: "Name (optional, overrides the product title)" },
          { type: "text", id: "subtitle", label: "Subtitle (e.g. colour)" },
          { type: "text", id: "best_for", label: "Best for" },
          { type: "text", id: "material", label: "Material" },
          { type: "text", id: "weight", label: "Weight" },
          { type: "range", id: "cushioning", label: "Cushioning", min: 1, max: 5, step: 1, default: 3 },
          { type: "text", id: "price_text", label: "Price text (used when no product is picked)" },
          { type: "text", id: "match", label: "Matches (uses, comma separated)" },
          { type: "checkbox", id: "recommended", label: "Recommended", default: false },
        ],
      },
    ],
    maxBlocks: 4,
    presetBlocks: list(config, "models")
      .slice(0, 4)
      .map((m) => ({
        type: "model",
        settings: {
          name: esc(m.name ?? ""),
          subtitle: esc(m.subtitle ?? ""),
          best_for: esc(m.bestFor ?? ""),
          material: esc(m.material ?? ""),
          weight: esc(m.weight ?? ""),
          cushioning: clamp(Math.round(toNum(m.cushion, 3)), 1, 5),
          price_text: esc(m.price ? money(toNum(m.price), str(config, "currency", "$")) : ""),
          match: esc(m.match ?? ""),
          recommended: isYes(m.recommended),
        },
      })),
  });

  return section({ style, markup, schema });
}

export const modelCompare: Tweak = {
  slug: "model-compare",
  inspiredBy: "allbirds",
  name: "Model Compare",
  tagline: "Three models side by side, with a highlight that slides to the best match.",
  description:
    "Modeled on the shoe comparison Allbirds uses to help shoppers choose between models. Three pairs sit side by side with photos and rows for best for, material, weight, a cushioning dot meter and price. A highlighted “recommended” column slides to the best match when shoppers tap a use (Everyday, Running, Travel), so the choice takes one tap. Each model is a block with its own product, so photos, prices and links stay real.",
  category: "product-page",
  tier: "free",
  tint: "#eef3ef",
  Preview,
  generateLiquid,
  defaults,
  fields: [
    { key: "eyebrow", label: "Eyebrow", type: "text", group: "Content" },
    { key: "heading", label: "Heading", type: "text", group: "Content" },
    { key: "headingAccent", label: "Heading accent (serif)", type: "text", group: "Content" },
    { key: "currency", label: "Currency symbol", type: "text", group: "Content" },
    { key: "chipsLabel", label: "Chips label", type: "text", group: "Use chips" },
    { key: "uses", label: "Uses", type: "text", group: "Use chips", hint: "Comma separated, e.g. Everyday, Running, Travel" },
    { key: "recommendedText", label: "Badge when nothing is picked", type: "text", group: "Use chips" },
    { key: "matchText", label: "Badge for a match", type: "text", group: "Use chips", hint: "Use {{use}} for the picked chip" },
    {
      key: "models", label: "Models", type: "list", group: "Models",
      hint: "2 to 4 models. Cushioning 1–5. Matches = uses this model is best for (comma separated). Recommended = yes on one model. In Shopify each model is a block with its own product",
      itemFields: [
        { key: "name", label: "Name", type: "text" },
        { key: "subtitle", label: "Subtitle", type: "text" },
        { key: "image", label: "Image URL", type: "text" },
        { key: "bestFor", label: "Best for", type: "text" },
        { key: "material", label: "Material", type: "text" },
        { key: "weight", label: "Weight", type: "text" },
        { key: "cushion", label: "Cushioning (1–5)", type: "text" },
        { key: "price", label: "Price", type: "text" },
        { key: "match", label: "Matches", type: "text" },
        { key: "recommended", label: "Recommended (yes)", type: "text" },
      ],
      newItem: { name: "Lounge Slip-On", subtitle: "Charcoal", image: "/mockups/sneaker-charcoal.jpg", bestFor: "Easy errands", material: "Wool blend", weight: "7.4 oz", cushion: "2", price: "95", match: "Everyday", recommended: "" },
      addLabel: "Add model", max: 4,
    },
    { key: "bestForLabel", label: "Best for", type: "text", group: "Row labels" },
    { key: "materialLabel", label: "Material", type: "text", group: "Row labels" },
    { key: "weightLabel", label: "Weight", type: "text", group: "Row labels" },
    { key: "cushionLabel", label: "Cushioning", type: "text", group: "Row labels" },
    { key: "priceLabel", label: "Price", type: "text", group: "Row labels" },
    { key: "shopText", label: "Button text", type: "text", group: "Row labels" },
    fontField("Typography"),
    { key: "radius", label: "Corner radius", type: "slider", group: "Layout", min: 0, max: 20, step: 2, unit: "px" },
    { key: "accent", label: "Accent (highlight)", type: "color", group: "Colors" },
    { key: "navy", label: "Active chip", type: "color", group: "Colors" },
    { key: "tile", label: "Highlight & photo tiles", type: "color", group: "Colors" },
    { key: "line", label: "Lines", type: "color", group: "Colors" },
    { key: "bg", label: "Background", type: "color", group: "Colors" },
    { key: "textColor", label: "Text", type: "color", group: "Colors" },
    { key: "muted", label: "Muted text", type: "color", group: "Colors" },
  ],
};
