"use client";

import { useState } from "react";
import type { Tweak, TweakConfig } from "../types";
import { str, num, list, fontStack, esc } from "../cfg";
import { fontField } from "../fields";
import { buildSchema, section, fontFaceFor } from "../liquid";
import { toNum } from "./product-art";

/* ============================================================
   UGC Review Wall
   A masonry wall of customer reviews: customer photos, stars,
   a short quote, the reviewer's first name with a verified
   badge and a "shop this" product chip. Filter chips narrow the
   wall to all reviews, reviews with photos or 5-star reviews.
   ============================================================ */

const MONO = "ui-monospace, 'SF Mono', Menlo, monospace";
const EASE = "cubic-bezier(.22,1,.36,1)";
/* photo ratios cycle so the wall reads as masonry */
const RATIOS = ["4 / 5", "1 / 1", "1 / 1", "4 / 5", "1 / 1"];

const defaults: TweakConfig = {
  eyebrow: "Reviews",
  heading: "Real skin, real routines",
  rating: "4.8",
  reviewCount: "3,214",
  countLabel: "reviews",
  allLabel: "All",
  photosLabel: "With photos",
  fiveLabel: "5 stars",
  verifiedLabel: "Verified buyer",
  shopLabel: "Shop this",
  moreText: "Read all reviews",
  reviews: [
    { name: "Maya", rating: "5", quote: "My skin has never looked this calm. I use it every morning and keep getting asked what I'm wearing.", image: "/mockups/award-serum.jpg", product: "Cloud Serum" },
    { name: "Jess", rating: "5", quote: "Finally a cleanser that doesn't leave me tight. The gel texture is so soft.", image: "", product: "Gel Wash" },
    { name: "Priya", rating: "4", quote: "Lives in every bag I own. Sheer, glossy and just enough tint.", image: "/mockups/set-balm.jpg", product: "Petal Balm" },
    { name: "Sam", rating: "5", quote: "Light enough for summer, rich enough for winter. Already on my second jar.", image: "/mockups/set-cream.jpg", product: "Whipped Cream" },
    { name: "Ella", rating: "5", quote: "I wasn't sure about a face mist, but it's the reset button my afternoons needed.", image: "", product: "Dew Mist" },
    { name: "Nora", rating: "5", quote: "My lips but better. Wore it to a wedding and it lasted all night.", image: "/mockups/award-lip.jpg", product: "Glaze Tint" },
    { name: "Lea", rating: "4", quote: "Rich without feeling heavy. My dry patches were gone in two weeks.", image: "/mockups/award-cream.jpg", product: "Barrier Cream" },
    { name: "Zoe", rating: "5", quote: "The mist is so fine it feels like nothing. It lives on my desk now.", image: "/mockups/set-mist.jpg", product: "Dew Mist" },
    { name: "Ana", rating: "5", quote: "Support helped me pick a shade over chat and it's spot on.", image: "", product: "Skin Veil" },
  ],
  columns: "4",
  bg: "#FFFFFF",
  textColor: "#000000",
  pink: "#FBD1DA",
  accent: "#0600FF",
  tile: "#F7F7F7",
  muted: "#6B6B6B",
  font: "system",
  radius: 16,
};

/** Hex colour + alpha byte. */
const tint = (hex: string, a: number) =>
  /^#[0-9a-f]{6}$/i.test(hex) ? hex + Math.round(a * 255).toString(16).padStart(2, "0") : hex;

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

function Stars({ value, size = 12, color }: { value: number; size?: number; color: string }) {
  return (
    <span className="inline-flex gap-[2px]" aria-label={`${value} out of 5 stars`}>
      {Array.from({ length: 5 }, (_, i) => (
        <svg key={i} width={size} height={size} viewBox="0 0 24 24" aria-hidden fill={i < Math.round(value) ? color : tint(color.length === 7 ? color : "#000000", 0.18)}>
          <path d="M12 2.8l2.8 6 6.5.6-4.9 4.4 1.4 6.4L12 16.9l-5.8 3.3 1.4-6.4-4.9-4.4 6.5-.6z" />
        </svg>
      ))}
    </span>
  );
}

type Filter = "all" | "photos" | "five";

function Preview({ config }: { config: TweakConfig }) {
  const bg = str(config, "bg", "#FFFFFF");
  const text = str(config, "textColor", "#000000");
  const pink = str(config, "pink", "#FBD1DA");
  const accent = str(config, "accent", "#0600FF");
  const tile = str(config, "tile", "#F7F7F7");
  const muted = str(config, "muted", "#6B6B6B");
  const radius = num(config, "radius", 16);
  const cols4 = str(config, "columns", "4") !== "3";
  const [filter, setFilter] = useState<Filter>("all");

  const reviews = list(config, "reviews").map((r) => ({
    name: r.name ?? "",
    rating: clamp(Math.round(toNum(r.rating, 5)), 1, 5),
    quote: r.quote ?? "",
    image: (r.image ?? "").trim(),
    product: r.product ?? "",
  }));
  const counts = {
    all: reviews.length,
    photos: reviews.filter((r) => r.image).length,
    five: reviews.filter((r) => r.rating === 5).length,
  };
  const shown = reviews
    .map((r, i) => ({ ...r, i }))
    .filter((r) => (filter === "photos" ? !!r.image : filter === "five" ? r.rating === 5 : true));

  const chips: { id: Filter; label: string; n: number }[] = [
    { id: "all", label: str(config, "allLabel", "All"), n: counts.all },
    { id: "photos", label: str(config, "photosLabel", "With photos"), n: counts.photos },
    { id: "five", label: str(config, "fiveLabel", "5 stars"), n: counts.five },
  ];
  const rating = toNum(str(config, "rating"), 4.8);

  return (
    <div className="@container w-full" style={{ background: bg, color: text, fontFamily: fontStack(str(config, "font", "system")) }}>
      <div className="mx-auto w-full max-w-[1200px] px-4 pb-8 pt-6 @min-[640px]:px-8 @min-[640px]:pb-12 @min-[640px]:pt-10">
        {/* Header */}
        <div className="flex flex-col gap-4 @min-[640px]:flex-row @min-[640px]:items-end @min-[640px]:justify-between">
          <div>
            {str(config, "eyebrow") && (
              <p className="text-[10.5px] uppercase tracking-[0.12em]" style={{ fontFamily: MONO, color: accent }}>
                {str(config, "eyebrow")}
              </p>
            )}
            <h3 className="mt-2 text-[28px] font-medium leading-[1.05] tracking-[-0.03em] @min-[640px]:text-[38px]">
              {str(config, "heading")}
            </h3>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[34px] font-medium leading-none tracking-[-0.04em] tabular-nums">{str(config, "rating")}</span>
            <span className="flex flex-col gap-1">
              <Stars value={rating} size={14} color={text} />
              <span className="text-[10px] uppercase tracking-[0.08em]" style={{ fontFamily: MONO, color: muted }}>
                {str(config, "reviewCount")} {str(config, "countLabel")}
              </span>
            </span>
          </div>
        </div>

        {/* Filters */}
        <div className="bs-no-scrollbar -mx-4 mt-5 flex gap-2 overflow-x-auto px-4 @min-[640px]:mx-0 @min-[640px]:px-0" role="tablist">
          {chips.map((c) => {
            const on = filter === c.id;
            return (
              <button
                key={c.id}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => setFilter(c.id)}
                className="flex h-9 shrink-0 items-center gap-2 rounded-full pl-3.5 pr-2 text-[13px] font-medium"
                style={{
                  background: on ? text : bg,
                  color: on ? bg : text,
                  boxShadow: on ? "none" : `inset 0 0 0 1px ${tint(text, 0.16)}`,
                  transition: `background-color 250ms ${EASE}, color 250ms ${EASE}`,
                }}
              >
                {c.label}
                <span
                  className="grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-[10px] tabular-nums"
                  style={{ fontFamily: MONO, background: on ? tint(bg, 0.18) : tile }}
                >
                  {c.n}
                </span>
              </button>
            );
          })}
        </div>

        {/* Wall */}
        <div
          key={filter}
          className={`mt-5 columns-2 gap-3 @min-[640px]:columns-3 @min-[640px]:gap-4 ${cols4 ? "@min-[900px]:columns-4" : ""}`}
        >
          {shown.map((r, k) => {
            const photo = !!r.image;
            return (
              <article
                key={r.i}
                className="bs-rise mb-3 break-inside-avoid overflow-hidden @min-[640px]:mb-4"
                style={{ background: photo ? tile : pink, borderRadius: radius, "--i": k } as React.CSSProperties}
              >
                {photo && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={r.image}
                    alt={`Photo from ${r.name}`}
                    loading="lazy"
                    decoding="async"
                    className="block w-full object-cover"
                    style={{ aspectRatio: RATIOS[r.i % RATIOS.length] }}
                  />
                )}
                <div className={photo ? "p-3 @min-[640px]:p-3.5" : "p-3.5 @min-[640px]:p-4"}>
                  <Stars value={r.rating} size={11} color={text} />
                  <p className={`mt-2 leading-snug ${photo ? "text-[13px]" : "text-[15px] font-medium tracking-[-0.01em]"}`}>
                    &ldquo;{r.quote}&rdquo;
                  </p>
                  <div className="mt-2.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                    <span className="text-[12.5px] font-medium">{r.name}</span>
                    <span className="flex items-center gap-1 text-[9.5px] uppercase tracking-[0.06em]" style={{ fontFamily: MONO, color: accent }}>
                      <svg width="10" height="10" viewBox="0 0 12 12" aria-hidden>
                        <circle cx="6" cy="6" r="6" fill="currentColor" />
                        <path d="M3.4 6.2l1.7 1.6 3.4-3.6" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      {str(config, "verifiedLabel")}
                    </span>
                  </div>
                  {r.product && (
                    <a
                      href="#"
                      onClick={(e) => e.preventDefault()}
                      className="group mt-3 flex max-w-full items-center gap-2 rounded-full bg-white py-1 pl-1 pr-2.5 text-[11.5px] transition-shadow hover:shadow-[0_2px_10px_-4px_rgba(0,0,0,0.25)]"
                      style={{ width: "fit-content" }}
                    >
                      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full" style={{ background: photo ? pink : tile }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                          <path d="M5 8h14l-1.2 11.5a1.5 1.5 0 0 1-1.5 1.5H7.7a1.5 1.5 0 0 1-1.5-1.5z" />
                          <path d="M9 8V6.5a3 3 0 0 1 6 0V8" />
                        </svg>
                      </span>
                      <span className="min-w-0 truncate">
                        <span className="hidden @min-[640px]:inline" style={{ color: muted }}>
                          {str(config, "shopLabel")} ·{" "}
                        </span>
                        <span className="font-medium">{r.product}</span>
                      </span>
                      <svg width="9" height="9" viewBox="0 0 12 12" aria-hidden className="shrink-0 transition-transform duration-300 group-hover:translate-x-0.5">
                        <path d="M4 2l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </a>
                  )}
                </div>
              </article>
            );
          })}
        </div>

        {str(config, "moreText") && (
          <div className="mt-3 flex justify-center">
            <button
              type="button"
              className="h-11 rounded-full px-6 text-[13.5px] font-medium transition-colors hover:bg-black/[0.04]"
              style={{ boxShadow: `inset 0 0 0 1px ${tint(text, 0.2)}` }}
            >
              {str(config, "moreText")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function generateLiquid(config: TweakConfig): string {
  const { face, family } = fontFaceFor(str(config, "font", "system"));
  const S = ".bs-ugc-{{ section.id }}";
  const r = "{{ section.settings.radius }}px";
  const mono = "ui-monospace, 'SF Mono', Menlo, monospace";
  const ease = "cubic-bezier(.22,1,.36,1)";
  const radius = clamp(Math.round(num(config, "radius", 16) / 2) * 2, 0, 28);
  const star = `<path d="M12 2.8l2.8 6 6.5.6-4.9 4.4 1.4 6.4L12 16.9l-5.8 3.3 1.4-6.4-4.9-4.4 6.5-.6z"/>`;

  const style = `<style>
${face ? face + "\n" : ""}  ${S} { container-type: inline-size; background: {{ section.settings.bg }}; color: {{ section.settings.text_color }}; font-family: ${family}; }
  ${S} * { box-sizing: border-box; }
  ${S} p, ${S} h2 { margin: 0; }
  ${S} a { color: inherit; text-decoration: none; }
  ${S} button { font: inherit; color: inherit; }
  ${S} .bs-wrap { max-width: 1200px; margin: 0 auto; padding: 24px 16px 32px; }
  ${S} .bs-head { display: flex; flex-direction: column; gap: 16px; }
  ${S} .bs-eyebrow { font-family: ${mono}; font-size: 10.5px; text-transform: uppercase; letter-spacing: .12em; color: {{ section.settings.accent }}; }
  ${S} .bs-h { margin-top: 8px; font-size: 28px; font-weight: 500; line-height: 1.05; letter-spacing: -.03em; }
  ${S} .bs-score { display: flex; align-items: center; gap: 12px; }
  ${S} .bs-score > b { font-size: 34px; font-weight: 500; line-height: 1; letter-spacing: -.04em; }
  ${S} .bs-score small { display: block; margin-top: 4px; font-family: ${mono}; font-size: 10px; text-transform: uppercase; letter-spacing: .08em; color: {{ section.settings.muted }}; }
  ${S} .bs-stars { display: inline-flex; gap: 2px; fill: currentColor; }
  ${S} .bs-stars .is-off { opacity: .18; }
  ${S} .bs-chips { display: flex; gap: 8px; margin: 20px -16px 0; padding: 0 16px; overflow-x: auto; scrollbar-width: none; }
  ${S} .bs-chips::-webkit-scrollbar { display: none; }
  ${S} .bs-chip { flex-shrink: 0; display: flex; align-items: center; gap: 8px; height: 36px; padding: 0 8px 0 14px; border: 0; border-radius: 99px; cursor: pointer; font-size: 13px; font-weight: 500;
    background: {{ section.settings.bg }}; box-shadow: inset 0 0 0 1px rgba(0,0,0,.16); transition: background-color .25s ${ease}, color .25s ${ease}; }
  ${S} .bs-chip span { min-width: 20px; height: 20px; padding: 0 6px; border-radius: 99px; display: grid; place-items: center; font-family: ${mono}; font-size: 10px; background: {{ section.settings.tile }}; }
  ${S} .bs-chip[aria-selected="true"] { background: {{ section.settings.text_color }}; color: {{ section.settings.bg }}; box-shadow: none; }
  ${S} .bs-chip[aria-selected="true"] span { background: rgba(255,255,255,.18); }
  ${S} .bs-wall { margin-top: 20px; columns: 2; column-gap: 12px; }
  ${S} .bs-card { break-inside: avoid; margin-bottom: 12px; overflow: hidden; border-radius: ${r}; background: {{ section.settings.pink }}; animation: bs-ugc-in .42s ${ease} both; }
  ${S} .bs-card.has-photo { background: {{ section.settings.tile }}; }
  ${S} .bs-card[hidden] { display: none; }
  @keyframes bs-ugc-in { from { opacity: 0; transform: translateY(8px); } }
  ${S} .bs-card img { display: block; width: 100%; height: auto; object-fit: cover; }
  ${S} .bs-card:nth-child(5n+1) img, ${S} .bs-card:nth-child(5n+4) img { aspect-ratio: 4 / 5; }
  ${S} .bs-card:nth-child(5n+2) img, ${S} .bs-card:nth-child(5n+3) img, ${S} .bs-card:nth-child(5n) img { aspect-ratio: 1 / 1; }
  ${S} .bs-body { padding: 14px; }
  ${S} .has-photo .bs-body { padding: 12px; }
  ${S} .bs-quote { margin-top: 8px; font-size: 15px; font-weight: 500; line-height: 1.35; letter-spacing: -.01em; }
  ${S} .has-photo .bs-quote { font-size: 13px; font-weight: 400; letter-spacing: 0; }
  ${S} .bs-who { margin-top: 10px; display: flex; flex-wrap: wrap; align-items: center; column-gap: 6px; row-gap: 2px; }
  ${S} .bs-who b { font-size: 12.5px; font-weight: 500; }
  ${S} .bs-ver { display: inline-flex; align-items: center; gap: 4px; font-family: ${mono}; font-size: 9.5px; text-transform: uppercase; letter-spacing: .06em; color: {{ section.settings.accent }}; }
  ${S} .bs-shop { margin-top: 12px; display: flex; width: fit-content; max-width: 100%; align-items: center; gap: 8px; padding: 4px 10px 4px 4px; border-radius: 99px; background: #fff; font-size: 11.5px;
    transition: box-shadow .3s ${ease}; }
  ${S} .bs-shop:hover { box-shadow: 0 2px 10px -4px rgba(0,0,0,.25); }
  ${S} .bs-shop i { width: 24px; height: 24px; flex-shrink: 0; border-radius: 99px; overflow: hidden; display: grid; place-items: center; background: {{ section.settings.tile }}; }
  ${S} .has-photo .bs-shop i { background: {{ section.settings.pink }}; }
  ${S} .bs-shop i img { width: 100%; height: 100%; object-fit: cover; aspect-ratio: 1 / 1; }
  ${S} .bs-shop em { font-style: normal; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  ${S} .bs-shop em span { display: none; color: {{ section.settings.muted }}; }
  ${S} .bs-shop em b { font-weight: 500; }
  ${S} .bs-shop svg.bs-arr { flex-shrink: 0; transition: transform .3s ${ease}; }
  ${S} .bs-shop:hover svg.bs-arr { transform: translateX(2px); }
  ${S} .bs-more { margin-top: 12px; display: flex; justify-content: center; }
  ${S} .bs-more a { display: inline-flex; align-items: center; height: 44px; padding: 0 24px; border-radius: 99px; font-size: 13.5px; font-weight: 500; box-shadow: inset 0 0 0 1px rgba(0,0,0,.2); transition: background-color .2s; }
  ${S} .bs-more a:hover { background: rgba(0,0,0,.04); }
  ${S} .bs-empty { padding: 24px 0; font-size: 14px; color: {{ section.settings.muted }}; }
  @container (min-width: 640px) {
    ${S} .bs-wrap { padding: 40px 32px 48px; }
    ${S} .bs-head { flex-direction: row; align-items: flex-end; justify-content: space-between; }
    ${S} .bs-h { font-size: 38px; }
    ${S} .bs-chips { margin: 20px 0 0; padding: 0; }
    ${S} .bs-shop em span { display: inline; }
    ${S} .bs-wall { columns: 3; column-gap: 16px; }
    ${S} .bs-card { margin-bottom: 16px; }
    ${S} .bs-body { padding: 16px; }
    ${S} .has-photo .bs-body { padding: 14px; }
  }
  @container (min-width: 900px) { ${S} .bs-wall { columns: {{ section.settings.columns }}; } }
</style>`;

  const markup = `{%- comment -%}
  UGC Review Wall by boost.supply. Add it to a product page, the homepage or
  a landing page.
  - Static by design: add one "Review" block per review, with the customer's
    photo, their first name, a short quote and the product it is about.
  - To show live reviews instead, wire your reviews app: most apps expose
    reviews as product metafields or a snippet. Replace the block loop below
    with that data and keep the same card markup and classes.
  - Filter chips (All / With photos / 5 stars) work on the reviews shown.
{%- endcomment -%}
{%- assign bs_n_photo = 0 -%}
{%- assign bs_n_five = 0 -%}
{%- for block in section.blocks -%}
  {%- if block.settings.image != blank -%}{%- assign bs_n_photo = bs_n_photo | plus: 1 -%}{%- endif -%}
  {%- if block.settings.rating == 5 -%}{%- assign bs_n_five = bs_n_five | plus: 1 -%}{%- endif -%}
{%- endfor -%}
{%- assign bs_avg = section.settings.rating | plus: 0 | round -%}
<div class="bs-ugc-{{ section.id }}" id="bs-ugc-{{ section.id }}">
  <div class="bs-wrap">
    <div class="bs-head">
      <div>
        {%- if section.settings.eyebrow != blank -%}<p class="bs-eyebrow">{{ section.settings.eyebrow }}</p>{%- endif -%}
        <h2 class="bs-h">{{ section.settings.heading }}</h2>
      </div>
      {%- if section.settings.rating != blank -%}
        <div class="bs-score">
          <b>{{ section.settings.rating }}</b>
          <span>
            <span class="bs-stars" aria-label="{{ section.settings.rating }} out of 5 stars">
              {%- for i in (1..5) -%}<svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"{% if i > bs_avg %} class="is-off"{% endif %}>${star}</svg>{%- endfor -%}
            </span>
            <small>{{ section.settings.review_count }} {{ section.settings.count_label }}</small>
          </span>
        </div>
      {%- endif -%}
    </div>

    <div class="bs-chips" role="tablist">
      <button type="button" class="bs-chip" role="tab" aria-selected="true" data-filter="all">{{ section.settings.all_label }}<span>{{ section.blocks.size }}</span></button>
      <button type="button" class="bs-chip" role="tab" aria-selected="false" data-filter="photo">{{ section.settings.photos_label }}<span>{{ bs_n_photo }}</span></button>
      <button type="button" class="bs-chip" role="tab" aria-selected="false" data-filter="five">{{ section.settings.five_label }}<span>{{ bs_n_five }}</span></button>
    </div>

    <div class="bs-wall">
      {%- for block in section.blocks -%}
        {%- assign bs_prod = block.settings.product -%}
        <article class="bs-card{% if block.settings.image != blank %} has-photo{% endif %}" data-photo="{% if block.settings.image != blank %}1{% else %}0{% endif %}" data-rating="{{ block.settings.rating }}" {{ block.shopify_attributes }}>
          {%- if block.settings.image != blank -%}
            {{ block.settings.image | image_url: width: 700 | image_tag: loading: 'lazy', alt: block.settings.name, sizes: '(min-width: 990px) 25vw, 50vw' }}
          {%- endif -%}
          <div class="bs-body">
            <span class="bs-stars" aria-label="{{ block.settings.rating }} out of 5 stars">
              {%- for i in (1..5) -%}<svg width="11" height="11" viewBox="0 0 24 24" aria-hidden="true"{% if i > block.settings.rating %} class="is-off"{% endif %}>${star}</svg>{%- endfor -%}
            </span>
            <p class="bs-quote">“{{ block.settings.quote }}”</p>
            <div class="bs-who">
              <b>{{ block.settings.name }}</b>
              {%- if block.settings.verified -%}
                <span class="bs-ver"><svg width="10" height="10" viewBox="0 0 12 12" aria-hidden="true"><circle cx="6" cy="6" r="6" fill="currentColor"/><path d="M3.4 6.2l1.7 1.6 3.4-3.6" fill="none" stroke="#fff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>{{ section.settings.verified_label }}</span>
              {%- endif -%}
            </div>
            {%- if bs_prod != blank or block.settings.product_label != blank -%}
              <a class="bs-shop" href="{% if bs_prod != blank %}{{ bs_prod.url }}{% else %}{{ routes.all_products_collection_url }}{% endif %}">
                <i>
                  {%- if bs_prod.featured_image -%}
                    {{ bs_prod.featured_image | image_url: width: 80 | image_tag: loading: 'lazy', alt: '' }}
                  {%- else -%}
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 8h14l-1.2 11.5a1.5 1.5 0 0 1-1.5 1.5H7.7a1.5 1.5 0 0 1-1.5-1.5z"/><path d="M9 8V6.5a3 3 0 0 1 6 0V8"/></svg>
                  {%- endif -%}
                </i>
                <em><span>{{ section.settings.shop_label }} · </span><b>{% if block.settings.product_label != blank %}{{ block.settings.product_label }}{% else %}{{ bs_prod.title }}{% endif %}</b></em>
                <svg class="bs-arr" width="9" height="9" viewBox="0 0 12 12" aria-hidden="true"><path d="M4 2l4 4-4 4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
              </a>
            {%- endif -%}
          </div>
        </article>
      {%- else -%}
        <p class="bs-empty">Add “Review” blocks in the theme editor.</p>
      {%- endfor -%}
    </div>

    {%- if section.settings.more_text != blank and section.settings.more_url != blank -%}
      <div class="bs-more"><a href="{{ section.settings.more_url }}">{{ section.settings.more_text }}</a></div>
    {%- endif -%}
  </div>
</div>
<script>
  (function () {
    var root = document.getElementById('bs-ugc-{{ section.id }}');
    if (!root) return;
    var chips = [].slice.call(root.querySelectorAll('[data-filter]'));
    var cards = [].slice.call(root.querySelectorAll('.bs-card'));
    chips.forEach(function (chip) {
      chip.addEventListener('click', function () {
        var f = chip.dataset.filter;
        chips.forEach(function (c) { c.setAttribute('aria-selected', c === chip ? 'true' : 'false'); });
        cards.forEach(function (card) {
          var show = f === 'all' || (f === 'photo' && card.dataset.photo === '1') || (f === 'five' && card.dataset.rating === '5');
          card.hidden = !show;
          if (show) { card.style.animation = 'none'; void card.offsetWidth; card.style.animation = ''; }
        });
      });
    });
  })();
</script>`;

  const schema = buildSchema({
    name: "UGC Review Wall",
    settings: [
      { type: "text", id: "eyebrow", label: "Eyebrow", default: str(config, "eyebrow") },
      { type: "text", id: "heading", label: "Heading", default: str(config, "heading") },
      { type: "header", content: "Rating summary" },
      { type: "text", id: "rating", label: "Average rating (e.g. 4.8)", default: str(config, "rating") },
      { type: "text", id: "review_count", label: "Review count", default: str(config, "reviewCount") },
      { type: "text", id: "count_label", label: "Count label", default: str(config, "countLabel") },
      { type: "header", content: "Filters & labels" },
      { type: "text", id: "all_label", label: "All chip", default: str(config, "allLabel") },
      { type: "text", id: "photos_label", label: "With photos chip", default: str(config, "photosLabel") },
      { type: "text", id: "five_label", label: "5 stars chip", default: str(config, "fiveLabel") },
      { type: "text", id: "verified_label", label: "Verified label", default: str(config, "verifiedLabel") },
      { type: "text", id: "shop_label", label: "Product chip label", default: str(config, "shopLabel") },
      { type: "text", id: "more_text", label: "Button text", default: str(config, "moreText") },
      { type: "url", id: "more_url", label: "Button link (e.g. your full reviews page)" },
      { type: "header", content: "Style" },
      {
        type: "select", id: "columns", label: "Columns on desktop",
        options: [
          { value: "3", label: "3" },
          { value: "4", label: "4" },
        ],
        default: str(config, "columns", "4") === "3" ? "3" : "4",
      },
      { type: "color", id: "accent", label: "Accent (verified)", default: str(config, "accent") },
      { type: "color", id: "pink", label: "Quote cards", default: str(config, "pink") },
      { type: "color", id: "tile", label: "Photo cards", default: str(config, "tile") },
      { type: "color", id: "bg", label: "Background", default: str(config, "bg") },
      { type: "color", id: "text_color", label: "Text", default: str(config, "textColor") },
      { type: "color", id: "muted", label: "Muted text", default: str(config, "muted") },
      { type: "range", id: "radius", label: "Corner radius", min: 0, max: 28, step: 2, unit: "px", default: radius },
    ],
    blocks: [
      {
        type: "review",
        name: "Review",
        settings: [
          { type: "image_picker", id: "image", label: "Customer photo", info: "Optional. Reviews without a photo show as quote cards." },
          { type: "text", id: "name", label: "First name" },
          { type: "range", id: "rating", label: "Rating", min: 1, max: 5, step: 1, default: 5 },
          { type: "textarea", id: "quote", label: "Quote" },
          { type: "checkbox", id: "verified", label: "Verified buyer", default: true },
          { type: "product", id: "product", label: "Shop this product" },
          { type: "text", id: "product_label", label: "Product chip text (optional, overrides the product title)" },
        ],
      },
    ],
    maxBlocks: 24,
    presetBlocks: list(config, "reviews").map((rv) => ({
      type: "review",
      settings: {
        name: esc(rv.name ?? ""),
        rating: clamp(Math.round(toNum(rv.rating, 5)), 1, 5),
        quote: esc(rv.quote ?? ""),
        verified: true,
        product_label: esc(rv.product ?? ""),
      },
    })),
  });

  return section({ style, markup, schema });
}

export const ugcReviewWall: Tweak = {
  slug: "ugc-review-wall",
  inspiredBy: "glossier",
  name: "UGC Review Wall",
  tagline: "A masonry wall of customer photos and quotes, each one linked to the product.",
  description:
    "Modeled on the customer review wall Glossier uses to show real routines. Customer photos and quote cards stack into a masonry wall, each with a star rating, the reviewer's first name, a verified-buyer badge and a “shop this” chip that links to the product. Filter chips narrow the wall to all reviews, reviews with photos or 5-star reviews. Static review blocks in Liquid, ready to wire to your reviews app.",
  category: "social-proof",
  tier: "free",
  tint: "#fdeef1",
  Preview,
  generateLiquid,
  defaults,
  fields: [
    { key: "eyebrow", label: "Eyebrow", type: "text", group: "Content" },
    { key: "heading", label: "Heading", type: "text", group: "Content" },
    { key: "rating", label: "Average rating", type: "text", group: "Rating summary" },
    { key: "reviewCount", label: "Review count", type: "text", group: "Rating summary" },
    { key: "countLabel", label: "Count label", type: "text", group: "Rating summary" },
    {
      key: "reviews", label: "Reviews", type: "list", group: "Reviews",
      hint: "Rating 1–5. Image URL is the customer photo; leave it empty for a quote card. In Shopify each review is a block with its own photo and product",
      itemFields: [
        { key: "name", label: "First name", type: "text" },
        { key: "rating", label: "Rating", type: "text" },
        { key: "quote", label: "Quote", type: "textarea" },
        { key: "image", label: "Image URL", type: "text" },
        { key: "product", label: "Product", type: "text" },
      ],
      newItem: { name: "Rosa", rating: "5", quote: "Soft, glowy and it plays nicely with my makeup.", image: "/mockups/award-primer.jpg", product: "Glow Primer" },
      addLabel: "Add review", max: 16,
    },
    { key: "allLabel", label: "All chip", type: "text", group: "Labels" },
    { key: "photosLabel", label: "With photos chip", type: "text", group: "Labels" },
    { key: "fiveLabel", label: "5 stars chip", type: "text", group: "Labels" },
    { key: "verifiedLabel", label: "Verified label", type: "text", group: "Labels" },
    { key: "shopLabel", label: "Product chip label", type: "text", group: "Labels" },
    { key: "moreText", label: "Button text", type: "text", group: "Labels" },
    {
      key: "columns", label: "Columns on desktop", type: "select", group: "Layout",
      options: [
        { label: "3", value: "3" },
        { label: "4", value: "4" },
      ],
    },
    { key: "radius", label: "Corner radius", type: "slider", group: "Layout", min: 0, max: 28, step: 2, unit: "px" },
    fontField("Typography"),
    { key: "accent", label: "Accent (verified)", type: "color", group: "Colors" },
    { key: "pink", label: "Quote cards", type: "color", group: "Colors" },
    { key: "tile", label: "Photo cards", type: "color", group: "Colors" },
    { key: "bg", label: "Background", type: "color", group: "Colors" },
    { key: "textColor", label: "Text", type: "color", group: "Colors" },
    { key: "muted", label: "Muted text", type: "color", group: "Colors" },
  ],
};
