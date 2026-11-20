"use client";

import { useEffect, useRef, useState } from "react";
import type { Tweak, TweakConfig } from "../types";
import { str, num, list, fontStack } from "../cfg";
import { fontField } from "../fields";
import { buildSchema, section, fontFaceFor } from "../liquid";
import { ProductArt, money, toNum } from "./product-art";

/* ============================================================
   Recipe Cards
   A playful rail of recipe / usage cards: each one has a "use:"
   sticker, a cook time, a three-step mini method and the bottle
   it needs with a one-tap add. Filter chips (All / Cook /
   Finish) are built from the recipes' uses. Condensed serif
   headlines, typewriter accents, product names in quotes.
   ============================================================ */

const TYPE = "'Courier New', Courier, ui-monospace, monospace";
const SERIF = "Georgia, 'Times New Roman', serif";

const defaults: TweakConfig = {
  eyebrow: "What’s cooking",
  heading: "Squeeze it on everything",
  subheading: "Weeknight wins for the two bottles by the stove.",
  allLabel: "All",
  usePrefix: "use:",
  addLabel: "Add",
  addedLabel: "Added",
  currency: "$",
  recipes: [
    { title: "Crispy eggs", use: "Cook", time: "6 min", step1: "Get a pan properly hot.", step2: "Squeeze in a generous glug.", step3: "Crack, baste, salt. Done.", product: "Cooking oil", price: "16", image: "/mockups/oil-yellow.jpg" },
    { title: "Salad drizzle", use: "Finish", time: "4 min", step1: "Tear greens into a big bowl.", step2: "Lemon, flaky salt, pepper.", step3: "Finish with a long drizzle.", product: "Finishing oil", price: "20", image: "/mockups/oil-green.jpg" },
    { title: "High-heat roast veg", use: "Cook", time: "30 min", step1: "Oven to 450°F, tray inside.", step2: "Toss the veg in a big squeeze.", step3: "Roast till the edges crisp.", product: "Cooking oil", price: "16", image: "/mockups/oil-cream.jpg" },
    { title: "Tomato toast", use: "Finish", time: "5 min", step1: "Toast thick sourdough.", step2: "Pile on ripe tomatoes.", step3: "Drizzle, salt, eat over the sink.", product: "Finishing oil", price: "20", image: "/mockups/oil-green.jpg" },
  ],
  bg: "#F6E6D9",
  textColor: "#3C422E",
  lime: "#D1E030",
  colorA: "#FBD535",
  colorB: "#9EEF80",
  colorC: "#D1E030",
  headFont: "georgia",
  font: "system",
  radius: 22,
};

/* ---------- helpers ---------- */

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const keyOf = (s: string) => s.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/** Hex colour + alpha byte. */
const alpha = (hex: string, a: number) =>
  /^#[0-9a-f]{6}$/i.test(hex) ? hex + Math.round(a * 255).toString(16).padStart(2, "0") : hex;

const headStack = (v: string) => (v === "theme" ? "inherit" : v === "sans" ? fontStack("system") : SERIF);

/* ---------- pieces ---------- */

function Clock({ size = 11 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" aria-hidden>
      <circle cx="6" cy="6" r="4.7" fill="none" stroke="currentColor" strokeWidth="1.3" />
      <path d="M6 3.6V6l1.6 1.1" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

/* ---------- preview ---------- */

function Preview({ config }: { config: TweakConfig }) {
  const bg = str(config, "bg", "#F6E6D9");
  const ink = str(config, "textColor", "#3C422E");
  const lime = str(config, "lime", "#D1E030");
  const palette = [str(config, "colorA", "#FBD535"), str(config, "colorB", "#9EEF80"), str(config, "colorC", "#D1E030")];
  const radius = num(config, "radius", 22);
  const cur = str(config, "currency", "$");
  const head = headStack(str(config, "headFont", "georgia"));

  const recipes = list(config, "recipes").map((r) => ({
    title: r.title ?? "",
    use: (r.use ?? "").trim(),
    time: r.time ?? "",
    steps: [r.step1, r.step2, r.step3].filter((s): s is string => !!s && !!s.trim()),
    product: r.product ?? "",
    price: toNum(r.price),
    image: (r.image ?? "").trim(),
  }));
  const uses: string[] = [];
  recipes.forEach((r) => {
    if (r.use && !uses.some((u) => keyOf(u) === keyOf(r.use))) uses.push(r.use);
  });
  const colorFor = (use: string) => palette[Math.min(2, Math.max(0, uses.findIndex((u) => keyOf(u) === keyOf(use))))];

  const [filter, setFilter] = useState("all");
  const [added, setAdded] = useState<number | null>(null);
  const rail = useRef<HTMLDivElement>(null);
  const active = filter === "all" || uses.some((u) => keyOf(u) === filter) ? filter : "all";
  const shown = recipes.map((r, i) => ({ ...r, i })).filter((r) => active === "all" || keyOf(r.use) === active);

  useEffect(() => {
    if (added === null) return;
    const t = setTimeout(() => setAdded(null), 1600);
    return () => clearTimeout(t);
  }, [added]);

  const pick = (f: string) => {
    setFilter(f);
    rail.current?.scrollTo({ left: 0, behavior: "smooth" });
  };

  const chips = [{ key: "all", label: str(config, "allLabel", "All") }, ...uses.map((u) => ({ key: keyOf(u), label: u }))];

  return (
    <div className="@container w-full" style={{ background: bg, color: ink, fontFamily: fontStack(str(config, "font", "system")) }}>
      <div className="mx-auto max-w-[1180px] py-7 @min-[720px]:py-11">
        {/* Header + chips */}
        <div className="flex flex-col gap-4 px-4 @min-[720px]:flex-row @min-[720px]:items-end @min-[720px]:justify-between @min-[720px]:px-8">
          <div className="min-w-0">
            {str(config, "eyebrow") && (
              <p className="flex items-center gap-2 text-[12px] uppercase tracking-[0.08em]" style={{ fontFamily: TYPE }}>
                <span className="inline-block h-[9px] w-[9px] rotate-45" style={{ background: lime, boxShadow: `0 0 0 1.5px ${ink}` }} />
                {str(config, "eyebrow")}
              </p>
            )}
            <h3
              className="mt-2 text-[40px] font-bold leading-[0.92] tracking-[-0.045em] @min-[520px]:text-[50px] @min-[720px]:text-[58px]"
              style={{ fontFamily: head }}
            >
              {str(config, "heading")}
            </h3>
            {str(config, "subheading") && (
              <p className="mt-2.5 max-w-[420px] text-[14px] leading-snug" style={{ color: alpha(ink, 0.78) }}>
                {str(config, "subheading")}
              </p>
            )}
          </div>
          <div className="flex shrink-0 flex-wrap gap-1.5" role="group" aria-label="Filter recipes">
            {chips.map((c) => {
              const on = c.key === active;
              return (
                <button
                  key={c.key}
                  type="button"
                  aria-pressed={on}
                  onClick={() => pick(c.key)}
                  className="h-9 rounded-full px-4 text-[12.5px] uppercase tracking-[0.04em] transition-[background-color,color,box-shadow,scale] duration-300 active:scale-95"
                  style={{
                    fontFamily: TYPE,
                    fontWeight: 700,
                    background: on ? ink : "transparent",
                    color: on ? lime : ink,
                    boxShadow: on ? "none" : `inset 0 0 0 1.5px ${ink}`,
                  }}
                >
                  {c.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Cards */}
        <div
          ref={rail}
          className="bs-no-scrollbar mt-6 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 scroll-px-4 @min-[720px]:mt-8 @min-[720px]:gap-4 @min-[720px]:px-8 @min-[720px]:scroll-px-8"
        >
          {shown.map((r, k) => {
            const tone = colorFor(r.use);
            const isAdded = added === r.i;
            return (
              <article
                key={`${active}-${r.i}`}
                className="bs-card-in flex w-[78%] shrink-0 snap-start flex-col p-2.5 @min-[520px]:w-[300px] @min-[1000px]:w-[calc((100%-48px)/4)]"
                style={{ background: tone, borderRadius: radius, "--i": k } as React.CSSProperties}
              >
                <div className="relative aspect-square overflow-hidden" style={{ borderRadius: Math.max(6, radius - 8), background: alpha(ink, 0.08) }}>
                  {r.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={r.image}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className="absolute inset-0 h-full w-full object-cover"
                      style={{ objectPosition: "50% 45%" }}
                    />
                  ) : (
                    <span className="absolute inset-0 grid place-items-center">
                      <ProductArt kind="bottle" tone={ink} size={150} tile="transparent" />
                    </span>
                  )}
                  {r.use && (
                    <span
                      className="absolute left-2.5 top-3 -rotate-6 rounded-[6px] px-2 py-1 text-[11.5px] font-bold"
                      style={{ background: ink, color: lime, fontFamily: TYPE, boxShadow: "0 3px 0 rgba(0,0,0,.18)" }}
                    >
                      {str(config, "usePrefix")} {r.use}
                    </span>
                  )}
                  {r.time && (
                    <span
                      className="absolute right-2.5 top-2.5 flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-bold uppercase"
                      style={{ background: bg, color: ink, fontFamily: TYPE }}
                    >
                      <Clock />
                      {r.time}
                    </span>
                  )}
                </div>

                <div className="flex flex-1 flex-col px-1.5 pb-1 pt-3">
                  <h4 className="text-[26px] font-bold leading-[0.95] tracking-[-0.04em]" style={{ fontFamily: head }}>
                    {r.title}
                  </h4>
                  <ol className="mt-3 flex flex-col gap-1.5">
                    {r.steps.map((s, j) => (
                      <li key={j} className="flex gap-2 text-[13px] leading-snug">
                        <span className="shrink-0 pt-px text-[11.5px] font-bold" style={{ fontFamily: TYPE }}>
                          0{j + 1}
                        </span>
                        <span>{s}</span>
                      </li>
                    ))}
                  </ol>
                  <div className="mt-auto flex items-center gap-2 pt-4">
                    <p className="min-w-0 flex-1 truncate text-[16px] font-bold italic leading-tight tracking-[-0.02em]" style={{ fontFamily: head }}>
                      “{r.product}”
                      <span className="ml-1.5 text-[12px] not-italic tracking-normal" style={{ fontFamily: TYPE }}>
                        {money(r.price, cur)}
                      </span>
                    </p>
                    <button
                      type="button"
                      onClick={() => setAdded(r.i)}
                      className="flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[12px] font-bold uppercase transition-[background-color,color,scale] duration-300 active:scale-95"
                      style={{ background: isAdded ? bg : ink, color: isAdded ? ink : lime, fontFamily: TYPE }}
                    >
                      <span key={isAdded ? "y" : "n"} className="bs-swap flex items-center gap-1.5">
                        {isAdded ? (
                          <>
                            <svg width="11" height="11" viewBox="0 0 12 12" aria-hidden>
                              <path d="M2.2 6.4l2.4 2.3 5.2-5.4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            {str(config, "addedLabel")}
                          </>
                        ) : (
                          <>
                            <svg width="10" height="10" viewBox="0 0 12 12" aria-hidden>
                              <path d="M6 1.5v9M1.5 6h9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                            </svg>
                            {str(config, "addLabel")}
                          </>
                        )}
                      </span>
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ---------- Liquid ---------- */

function generateLiquid(config: TweakConfig): string {
  const { face, family } = fontFaceFor(str(config, "font", "system"));
  const S = ".bs-rcp-{{ section.id }}";
  const r = "{{ section.settings.radius }}px";
  const ease = "cubic-bezier(.22,1,.36,1)";
  const type = "'Courier New', Courier, ui-monospace, monospace";
  const plus = `<svg width="10" height="10" viewBox="0 0 12 12" aria-hidden="true"><path d="M6 1.5v9M1.5 6h9" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`;
  const clock = `<svg width="11" height="11" viewBox="0 0 12 12" aria-hidden="true"><circle cx="6" cy="6" r="4.7" fill="none" stroke="currentColor" stroke-width="1.3"/><path d="M6 3.6V6l1.6 1.1" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>`;

  const style = `<style>
${face ? face + "\n" : ""}  ${S} { container-type: inline-size; background: {{ section.settings.bg }}; color: {{ section.settings.text_color }}; font-family: ${family}; }
  ${S} * { box-sizing: border-box; }
  ${S} p, ${S} h2, ${S} h3, ${S} ol { margin: 0; padding: 0; }
  ${S} button { font: inherit; }
  ${S} .bs-head-f { font-family: {% case section.settings.head_font %}{% when 'theme' %}inherit{% when 'sans' %}-apple-system, BlinkMacSystemFont, system-ui, sans-serif{% else %}Georgia, 'Times New Roman', serif{% endcase %}; }
  ${S} .bs-type { font-family: ${type}; }
  ${S} .bs-wrap { max-width: 1180px; margin: 0 auto; padding: 28px 0; }
  ${S} .bs-top { display: flex; flex-direction: column; gap: 16px; padding: 0 16px; }
  ${S} .bs-eyebrow { display: flex; align-items: center; gap: 8px; font-size: 12px; text-transform: uppercase; letter-spacing: .08em; }
  ${S} .bs-eyebrow::before { content: ""; width: 9px; height: 9px; transform: rotate(45deg); background: {{ section.settings.lime }}; box-shadow: 0 0 0 1.5px {{ section.settings.text_color }}; }
  ${S} .bs-h { margin-top: 8px; font-size: 40px; font-weight: 700; line-height: .92; letter-spacing: -.045em; }
  ${S} .bs-sub { margin-top: 10px; max-width: 420px; font-size: 14px; line-height: 1.35; opacity: .78; }
  ${S} .bs-chips { display: flex; flex-wrap: wrap; flex-shrink: 0; gap: 6px; }
  ${S} .bs-chip { height: 36px; padding: 0 16px; border: 0; border-radius: 99px; cursor: pointer; background: transparent; color: {{ section.settings.text_color }};
    font-family: ${type}; font-size: 12.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; box-shadow: inset 0 0 0 1.5px {{ section.settings.text_color }};
    transition: background-color .3s, color .3s, box-shadow .3s, transform .2s; }
  ${S} .bs-chip:active { transform: scale(.95); }
  ${S} .bs-chip[aria-pressed="true"] { background: {{ section.settings.text_color }}; color: {{ section.settings.lime }}; box-shadow: none; }
  ${S} .bs-rail { display: flex; gap: 12px; margin-top: 24px; padding: 0 16px 8px; overflow-x: auto; scroll-snap-type: x mandatory; scroll-padding: 0 16px; scrollbar-width: none; }
  ${S} .bs-rail::-webkit-scrollbar { display: none; }
  ${S} .bs-card { display: flex; flex-direction: column; flex-shrink: 0; width: 78%; padding: 10px; border-radius: ${r}; scroll-snap-align: start; background: var(--c); animation: bs-rcp-in .6s ${ease} both; }
  ${S} .bs-card[hidden] { display: none; }
  @keyframes bs-rcp-in { from { opacity: 0; transform: translateY(14px) scale(.98); } }
  ${S} .bs-vis { position: relative; aspect-ratio: 1 / 1; overflow: hidden; border-radius: {{ section.settings.radius | minus: 8 | at_least: 6 }}px; background: rgba(0,0,0,.06); }
  ${S} .bs-vis img, ${S} .bs-vis .bs-ph { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; object-position: 50% 45%; }
  ${S} .bs-use { position: absolute; left: 10px; top: 12px; padding: 4px 8px; border-radius: 6px; transform: rotate(-6deg); background: {{ section.settings.text_color }}; color: {{ section.settings.lime }};
    font-family: ${type}; font-size: 11.5px; font-weight: 700; box-shadow: 0 3px 0 rgba(0,0,0,.18); }
  ${S} .bs-time { position: absolute; right: 10px; top: 10px; display: flex; align-items: center; gap: 4px; padding: 4px 8px; border-radius: 99px; background: {{ section.settings.bg }};
    font-family: ${type}; font-size: 11px; font-weight: 700; text-transform: uppercase; }
  ${S} .bs-body { display: flex; flex: 1; flex-direction: column; padding: 12px 6px 4px; }
  ${S} .bs-t { font-size: 26px; font-weight: 700; line-height: .95; letter-spacing: -.04em; }
  ${S} .bs-steps { display: flex; flex-direction: column; gap: 6px; margin-top: 12px; list-style: none; }
  ${S} .bs-steps li { display: flex; gap: 8px; font-size: 13px; line-height: 1.35; }
  ${S} .bs-steps b { flex-shrink: 0; padding-top: 1px; font-family: ${type}; font-size: 11.5px; }
  ${S} .bs-buy { display: flex; align-items: center; gap: 8px; margin-top: auto; padding-top: 16px; }
  ${S} .bs-prod { flex: 1; min-width: 0; font-size: 16px; font-weight: 700; font-style: italic; line-height: 1.2; letter-spacing: -.02em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  ${S} .bs-prod small { margin-left: 6px; font-family: ${type}; font-size: 12px; font-style: normal; letter-spacing: 0; }
  ${S} .bs-buy form { flex-shrink: 0; margin: 0; }
  ${S} .bs-add { display: flex; align-items: center; gap: 6px; height: 36px; padding: 0 14px; border: 0; border-radius: 99px; cursor: pointer;
    background: {{ section.settings.text_color }}; color: {{ section.settings.lime }}; font-family: ${type}; font-size: 12px; font-weight: 700; text-transform: uppercase;
    transition: background-color .3s, color .3s, transform .2s; }
  ${S} .bs-add:active { transform: scale(.95); }
  ${S} .bs-add:disabled { opacity: .5; cursor: not-allowed; }
  ${S} .bs-add.is-added { background: {{ section.settings.bg }}; color: {{ section.settings.text_color }}; }
  @container (min-width: 520px) {
    ${S} .bs-h { font-size: 50px; }
    ${S} .bs-card { width: 300px; }
  }
  @container (min-width: 720px) {
    ${S} .bs-wrap { padding: 44px 0; }
    ${S} .bs-top { flex-direction: row; align-items: flex-end; justify-content: space-between; padding: 0 32px; }
    ${S} .bs-h { font-size: 58px; }
    ${S} .bs-rail { gap: 16px; margin-top: 32px; padding: 0 32px 8px; scroll-padding: 0 32px; }
  }
  @container (min-width: 1000px) {
    ${S} .bs-card { width: calc((100% - 48px) / 4); }
  }
  @media (prefers-reduced-motion: reduce) {
    ${S} .bs-card { animation: none; }
  }
</style>`;

  const markup = `{%- comment -%}
  Recipe Cards by boost.supply. Add one "Recipe" block per card and pick the
  product its button adds (the first available variant goes to the cart
  without leaving the page). The filter chips are built from each recipe's
  "Use" text, so recipes with the same use (e.g. "Cook") share a chip.
  The card photo is the block's image, or the product's featured image.
{%- endcomment -%}
{%- assign bs_uses = '' -%}
{%- for block in section.blocks -%}
  {%- assign bs_u = block.settings.use | strip -%}
  {%- if bs_u != blank -%}
    {%- assign bs_k = '|' | append: bs_u | append: '|' -%}
    {%- unless bs_uses contains bs_k -%}{%- assign bs_uses = bs_uses | append: bs_k -%}{%- endunless -%}
  {%- endif -%}
{%- endfor -%}
{%- assign bs_use_list = bs_uses | split: '|' -%}
<div class="bs-rcp-{{ section.id }}" id="bs-rcp-{{ section.id }}" data-add-url="{{ routes.cart_add_url }}" data-added="{{ section.settings.added_label | escape }}">
  <div class="bs-wrap">
    <div class="bs-top">
      <div>
        {%- if section.settings.eyebrow != blank -%}<p class="bs-eyebrow bs-type">{{ section.settings.eyebrow }}</p>{%- endif -%}
        <h2 class="bs-h bs-head-f">{{ section.settings.heading }}</h2>
        {%- if section.settings.subheading != blank -%}<p class="bs-sub">{{ section.settings.subheading }}</p>{%- endif -%}
      </div>
      {%- if section.settings.show_filters and bs_uses != blank -%}
        <div class="bs-chips" role="group" aria-label="Filter recipes">
          <button type="button" class="bs-chip" data-filter="all" aria-pressed="true">{{ section.settings.all_label }}</button>
          {%- for bs_use in bs_use_list -%}
            {%- if bs_use != blank -%}
              <button type="button" class="bs-chip" data-filter="{{ bs_use | handleize }}" aria-pressed="false">{{ bs_use }}</button>
            {%- endif -%}
          {%- endfor -%}
        </div>
      {%- endif -%}
    </div>

    <div class="bs-rail" data-rail>
      {%- for block in section.blocks -%}
        {%- assign bs_p = block.settings.product -%}
        {%- assign bs_v = bs_p.selected_or_first_available_variant -%}
        {%- assign bs_use = block.settings.use | strip -%}
        <article class="bs-card" data-use="{{ bs_use | handleize }}" style="--c: {{ block.settings.card_color }};" {{ block.shopify_attributes }}>
          <div class="bs-vis">
            {%- if block.settings.image != blank -%}
              {{ block.settings.image | image_url: width: 700 | image_tag: loading: 'lazy', alt: block.settings.title, sizes: '(min-width: 990px) 25vw, 78vw' }}
            {%- elsif bs_p.featured_image -%}
              {{ bs_p.featured_image | image_url: width: 700 | image_tag: loading: 'lazy', alt: bs_p.title, sizes: '(min-width: 990px) 25vw, 78vw' }}
            {%- else -%}
              {{ 'product-1' | placeholder_svg_tag: 'bs-ph' }}
            {%- endif -%}
            {%- if bs_use != blank -%}<span class="bs-use">{{ section.settings.use_prefix }} {{ bs_use }}</span>{%- endif -%}
            {%- if block.settings.time != blank -%}<span class="bs-time">${clock}{{ block.settings.time }}</span>{%- endif -%}
          </div>
          <div class="bs-body">
            <h3 class="bs-t bs-head-f">{{ block.settings.title }}</h3>
            <ol class="bs-steps">
              {%- if block.settings.step_1 != blank -%}<li><b>01</b><span>{{ block.settings.step_1 }}</span></li>{%- endif -%}
              {%- if block.settings.step_2 != blank -%}<li><b>02</b><span>{{ block.settings.step_2 }}</span></li>{%- endif -%}
              {%- if block.settings.step_3 != blank -%}<li><b>03</b><span>{{ block.settings.step_3 }}</span></li>{%- endif -%}
            </ol>
            <div class="bs-buy">
              {%- assign bs_name = block.settings.product_label | default: bs_p.title -%}
              <p class="bs-prod bs-head-f">“{{ bs_name }}”{%- if bs_p != blank -%}<small>{{ bs_v.price | money_without_trailing_zeros }}</small>{%- endif -%}</p>
              {%- if bs_p != blank -%}
                {%- form 'product', bs_p -%}
                  <input type="hidden" name="id" value="{{ bs_v.id }}">
                  <input type="hidden" name="quantity" value="1">
                  <button type="submit" name="add" class="bs-add"{% unless bs_v.available %} disabled{% endunless %}>${plus}<span data-label>{%- if bs_v.available -%}{{ section.settings.add_label }}{%- else -%}{{ section.settings.sold_out_label }}{%- endif -%}</span></button>
                {%- endform -%}
              {%- endif -%}
            </div>
          </div>
        </article>
      {%- endfor -%}
    </div>
  </div>
</div>
<script>
  (function () {
    var root = document.getElementById('bs-rcp-{{ section.id }}');
    if (!root) return;
    var rail = root.querySelector('[data-rail]');
    var cards = [].slice.call(root.querySelectorAll('.bs-card'));
    var chips = [].slice.call(root.querySelectorAll('[data-filter]'));
    chips.forEach(function (chip) {
      chip.addEventListener('click', function () {
        var f = chip.getAttribute('data-filter');
        chips.forEach(function (c) { c.setAttribute('aria-pressed', c === chip ? 'true' : 'false'); });
        cards.forEach(function (card) {
          var show = f === 'all' || card.getAttribute('data-use') === f;
          card.hidden = !show;
          if (show) { card.style.animation = 'none'; void card.offsetWidth; card.style.animation = ''; }
        });
        if (rail) rail.scrollTo({ left: 0, behavior: 'smooth' });
      });
    });

    var addUrl = root.getAttribute('data-add-url');
    var addedText = root.getAttribute('data-added');
    root.querySelectorAll('form').forEach(function (form) {
      form.addEventListener('submit', function (e) {
        if (!window.fetch || !window.FormData) return;
        e.preventDefault();
        var btn = form.querySelector('.bs-add');
        var label = btn.querySelector('[data-label]');
        var original = label.textContent;
        btn.disabled = true;
        fetch(addUrl + '.js', { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } })
          .then(function (res) {
            if (!res.ok) throw new Error('add failed');
            btn.classList.add('is-added');
            label.textContent = addedText;
            document.dispatchEvent(new CustomEvent('cart:refresh', { bubbles: true }));
            setTimeout(function () {
              btn.classList.remove('is-added');
              label.textContent = original;
              btn.disabled = false;
            }, 1800);
          })
          .catch(function () { btn.disabled = false; form.submit(); });
      });
    });
  })();
</script>`;

  const recipes = list(config, "recipes");
  const palette = [str(config, "colorA", "#FBD535"), str(config, "colorB", "#9EEF80"), str(config, "colorC", "#D1E030")];
  const uses: string[] = [];
  recipes.forEach((rc) => {
    const u = (rc.use ?? "").trim();
    if (u && !uses.some((x) => keyOf(x) === keyOf(u))) uses.push(u);
  });
  const hexOk = (h: string) => (/^#[0-9a-f]{6}$/i.test(h) ? h : "#FBD535");
  const head = str(config, "headFont", "georgia");

  const schema = buildSchema({
    name: "Recipe Cards",
    settings: [
      { type: "text", id: "eyebrow", label: "Eyebrow", default: str(config, "eyebrow") },
      { type: "text", id: "heading", label: "Heading", default: str(config, "heading") },
      { type: "textarea", id: "subheading", label: "Subheading", default: str(config, "subheading") },
      { type: "header", content: "Filters & buttons" },
      { type: "checkbox", id: "show_filters", label: "Show filter chips", default: true },
      { type: "text", id: "all_label", label: "“All” chip", default: str(config, "allLabel") },
      { type: "text", id: "use_prefix", label: "Use sticker prefix", default: str(config, "usePrefix") },
      { type: "text", id: "add_label", label: "Add button", default: str(config, "addLabel") },
      { type: "text", id: "added_label", label: "Added label", default: str(config, "addedLabel") },
      { type: "text", id: "sold_out_label", label: "Sold out label", default: "Sold out" },
      { type: "header", content: "Style" },
      {
        type: "select",
        id: "head_font",
        label: "Headline font",
        options: [
          { value: "georgia", label: "Condensed serif (Georgia)" },
          { value: "sans", label: "System sans" },
          { value: "theme", label: "Theme font" },
        ],
        default: ["georgia", "sans", "theme"].includes(head) ? head : "georgia",
      },
      { type: "color", id: "bg", label: "Background", default: str(config, "bg") },
      { type: "color", id: "text_color", label: "Text & buttons", default: str(config, "textColor") },
      { type: "color", id: "lime", label: "Highlight", default: str(config, "lime") },
      { type: "range", id: "radius", label: "Card corner radius", min: 0, max: 32, step: 2, unit: "px", default: clamp(Math.round(num(config, "radius", 22) / 2) * 2, 0, 32) },
    ],
    blocks: [
      {
        type: "recipe",
        name: "Recipe",
        settings: [
          { type: "text", id: "title", label: "Recipe", default: "Crispy eggs" },
          { type: "text", id: "use", label: "Use (filter chip)", default: "Cook" },
          { type: "text", id: "time", label: "Time", default: "6 min" },
          { type: "text", id: "step_1", label: "Step 1", default: "Get a pan properly hot." },
          { type: "text", id: "step_2", label: "Step 2", default: "Squeeze in a generous glug." },
          { type: "text", id: "step_3", label: "Step 3", default: "Crack, baste, salt. Done." },
          { type: "product", id: "product", label: "Product to add" },
          { type: "text", id: "product_label", label: "Product name (empty = product title)" },
          { type: "image_picker", id: "image", label: "Photo", info: "Optional. Defaults to the product's featured image." },
          { type: "color", id: "card_color", label: "Card colour", default: "#FBD535" },
        ],
      },
    ],
    maxBlocks: 12,
    presetBlocks: recipes.slice(0, 12).map((rc) => {
      const u = (rc.use ?? "").trim();
      const idx = Math.min(2, Math.max(0, uses.findIndex((x) => keyOf(x) === keyOf(u))));
      return {
        type: "recipe",
        settings: {
          title: rc.title ?? "",
          use: u,
          time: rc.time ?? "",
          step_1: rc.step1 ?? "",
          step_2: rc.step2 ?? "",
          step_3: rc.step3 ?? "",
          product_label: rc.product ?? "",
          card_color: hexOk(palette[idx]),
        },
      };
    }),
  });

  return section({ style, markup, schema });
}

export const recipeCards: Tweak = {
  slug: "recipe-cards",
  inspiredBy: "graza",
  name: "Recipe Cards",
  tagline: "A playful rail of recipe cards with a “use:” sticker, a 3-step method and one-tap add.",
  description:
    "Modeled on the recipe and usage cards Graza puts next to its squeeze bottles. Each card shows a dish with a “use: Cook / Finish” sticker, a cook time, a three-step mini method and the bottle it needs, quoted by name, with a one-tap add to cart. Filter chips built from the uses narrow the rail. Condensed serif headlines and typewriter accents keep it fun, and it sells the product by showing when to reach for it.",
  category: "homepage",
  tier: "free",
  tint: "#f6e6d9",
  Preview,
  generateLiquid,
  defaults,
  fields: [
    { key: "eyebrow", label: "Eyebrow", type: "text", group: "Content" },
    { key: "heading", label: "Heading", type: "text", group: "Content" },
    { key: "subheading", label: "Subheading", type: "textarea", group: "Content" },
    {
      key: "recipes", label: "Recipes", type: "list", group: "Recipes",
      hint: "Recipes with the same Use share a filter chip. Image URL is preview only; in Shopify each block has a photo and a product",
      itemFields: [
        { key: "title", label: "Recipe", type: "text" },
        { key: "use", label: "Use (filter chip)", type: "text" },
        { key: "time", label: "Time", type: "text" },
        { key: "step1", label: "Step 1", type: "text" },
        { key: "step2", label: "Step 2", type: "text" },
        { key: "step3", label: "Step 3", type: "text" },
        { key: "product", label: "Product name", type: "text" },
        { key: "price", label: "Price", type: "text" },
        { key: "image", label: "Image URL", type: "text" },
      ],
      newItem: { title: "Crispy potatoes", use: "Cook", time: "40 min", step1: "Boil, drain, smash.", step2: "Squeeze over a hot tray.", step3: "Roast till shattering.", product: "Cooking oil", price: "16", image: "/mockups/oil-yellow.jpg" },
      addLabel: "Add recipe", max: 12,
    },
    { key: "allLabel", label: "“All” chip", type: "text", group: "Labels" },
    { key: "usePrefix", label: "Use sticker prefix", type: "text", group: "Labels" },
    { key: "addLabel", label: "Add button", type: "text", group: "Labels" },
    { key: "addedLabel", label: "Added label", type: "text", group: "Labels" },
    { key: "currency", label: "Currency symbol", type: "text", group: "Labels" },
    {
      key: "headFont", label: "Headline font", type: "select", group: "Typography",
      options: [
        { label: "Condensed serif (Georgia)", value: "georgia" },
        { label: "System sans", value: "sans" },
        { label: "Theme font", value: "theme" },
      ],
    },
    fontField("Typography", "font", "Body font"),
    { key: "radius", label: "Card corner radius", type: "slider", group: "Layout", min: 0, max: 32, step: 2, unit: "px" },
    { key: "bg", label: "Background", type: "color", group: "Colors" },
    { key: "textColor", label: "Text & buttons", type: "color", group: "Colors" },
    { key: "lime", label: "Highlight", type: "color", group: "Colors" },
    { key: "colorA", label: "Card colour: first use", type: "color", group: "Colors" },
    { key: "colorB", label: "Card colour: second use", type: "color", group: "Colors" },
    { key: "colorC", label: "Card colour: other uses", type: "color", group: "Colors" },
  ],
};
