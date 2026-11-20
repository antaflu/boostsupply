"use client";

import { useRef, useState } from "react";
import type { Tweak, TweakConfig } from "../types";
import { str, num, list, fontStack } from "../cfg";
import { fontField } from "../fields";
import { buildSchema, section, fontFaceFor } from "../liquid";
import { ProductArt, money, toNum } from "./product-art";

/* ============================================================
   Set Tiers
   Multi-set offer tiers for a product page: 1 set, 2 sets (free
   shipping), 3 sets (+5% off), 6 sets (+10% off). Bold stacked
   cards with sticker badges and a little fan of bottles per tier;
   picking one gives it a wobble, and the button adds that many
   sets to the cart.
   ============================================================ */

const EASE = "cubic-bezier(.22,1,.36,1)";
const TYPE = "'Courier New', Courier, ui-monospace, monospace";
const SERIF = "Georgia, 'Times New Roman', serif";

const defaults: TweakConfig = {
  eyebrow: "Stock up & save",
  heading: "More bottles, more perks",
  subheading: "Each set is one bottle for cooking and one for finishing.",
  currency: "$",
  setPrice: "36",
  tiers: [
    { title: "1 set", qty: "1", perk: "The everyday pair", discount: "0", badge: "" },
    { title: "2 sets", qty: "2", perk: "Free shipping", discount: "0", badge: "" },
    { title: "3 sets", qty: "3", perk: "Free shipping + 5% off", discount: "5", badge: "Most popular" },
    { title: "6 sets", qty: "6", perk: "Free shipping + 10% off", discount: "10", badge: "Best value" },
  ],
  selected: 3,
  perSetLabel: "/set",
  buttonText: "Add to cart",
  note: "Ships in 1–2 business days",
  imageA: "/mockups/oil-yellow.jpg",
  imageB: "/mockups/oil-green.jpg",
  bg: "#F6E6D9",
  card: "#FFF8F1",
  textColor: "#3C422E",
  selectedBg: "#D1E030",
  badgeA: "#FBD535",
  badgeB: "#9EEF80",
  headFont: "georgia",
  font: "system",
  radius: 18,
};

/* ---------- helpers ---------- */

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const headStack = (v: string) => (v === "theme" ? "inherit" : v === "sans" ? fontStack("system") : SERIF);

/** Hex colour + alpha byte. */
const alpha = (hex: string, a: number) =>
  /^#[0-9a-f]{6}$/i.test(hex) ? hex + Math.round(a * 255).toString(16).padStart(2, "0") : hex;

const WOBBLE: Keyframe[] = [
  { transform: "rotate(0deg) scale(1)" },
  { transform: "rotate(-2.2deg) scale(1.025)", offset: 0.22 },
  { transform: "rotate(1.6deg) scale(1.02)", offset: 0.48 },
  { transform: "rotate(-0.8deg) scale(1.01)", offset: 0.72 },
  { transform: "rotate(0deg) scale(1)" },
];

/** A little fan of bottle photos, one per set (capped at 6). */
function BottleFan({ n, a, b, ink, tile }: { n: number; a: string; b: string; ink: string; tile: string }) {
  const shown = Math.min(n, 6);
  const W = 32;
  const H = 40;
  const box = 92;
  const step = shown > 1 ? Math.min(16, (box - W) / (shown - 1)) : 0;
  const width = W + step * (shown - 1);
  return (
    <span className="relative block shrink-0" style={{ width: box, height: H + 8 }} aria-hidden>
      <span className="absolute top-1" style={{ left: (box - width) / 2, width, height: H }}>
        {Array.from({ length: shown }, (_, i) => {
          const src = i % 2 ? b : a;
          const rot = shown === 1 ? 0 : ((i % 3) - 1) * 4;
          return (
            <span
              key={i}
              className="absolute top-0 block overflow-hidden"
              style={{
                left: i * step,
                width: W,
                height: H,
                borderRadius: 7,
                background: tile,
                transform: `rotate(${rot}deg)`,
                boxShadow: `0 0 0 1.5px ${ink}, 2px 2px 0 ${ink}`,
                zIndex: i,
              }}
            >
              {src ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={src} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" style={{ objectPosition: "35% 50%" }} />
              ) : (
                <span className="grid h-full w-full place-items-center">
                  <ProductArt kind="bottle" tone={ink} size={30} tile="transparent" />
                </span>
              )}
            </span>
          );
        })}
      </span>
      {n > 6 && (
        <span
          className="absolute -bottom-0.5 right-0 rounded-full px-1.5 py-px text-[10px] font-bold"
          style={{ background: ink, color: tile, fontFamily: TYPE, zIndex: 9 }}
        >
          ×{n}
        </span>
      )}
    </span>
  );
}

/* ---------- preview ---------- */

function Preview({ config }: { config: TweakConfig }) {
  const bg = str(config, "bg", "#F6E6D9");
  const card = str(config, "card", "#FFF8F1");
  const ink = str(config, "textColor", "#3C422E");
  const selBg = str(config, "selectedBg", "#D1E030");
  const badges = [str(config, "badgeA", "#FBD535"), str(config, "badgeB", "#9EEF80")];
  const radius = num(config, "radius", 18);
  const cur = str(config, "currency", "$");
  const head = headStack(str(config, "headFont", "georgia"));
  const unit = toNum(str(config, "setPrice"), 36);
  const imgA = str(config, "imageA").trim();
  const imgB = str(config, "imageB").trim();

  const raw = list(config, "tiers");
  const tiers = raw.map((t, i) => {
    const q = clamp(Math.round(toNum(t.qty, 1)), 1, 24);
    const d = clamp(toNum(t.discount, 0), 0, 60);
    const full = unit * q;
    const total = full * (1 - d / 100);
    const badge = (t.badge ?? "").trim();
    /* stickers alternate colours in order of appearance */
    const nth = raw.slice(0, i).filter((x) => (x.badge ?? "").trim()).length;
    return { title: t.title ?? `${q}`, q, d, perk: t.perk ?? "", badge, tone: badges[nth % 2], full, total };
  });

  /* default pick follows the editor slider; shoppers can click after */
  const pre = clamp(Math.round(num(config, "selected", 3)), 1, Math.max(1, tiers.length)) - 1;
  const key = `${pre}:${tiers.length}`;
  const [prevKey, setPrevKey] = useState(key);
  const [sel, setSel] = useState(pre);
  const [added, setAdded] = useState(false);
  if (key !== prevKey) {
    setPrevKey(key);
    setSel(pre);
  }
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const cur0 = tiers[Math.min(sel, tiers.length - 1)];

  const pick = (i: number) => {
    setSel(i);
    setAdded(false);
    const el = refs.current[i];
    if (el && typeof el.animate === "function" && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.animate(WOBBLE, { duration: 560, easing: "ease-out" });
    }
  };

  return (
    <div className="@container w-full" style={{ background: bg, color: ink, fontFamily: fontStack(str(config, "font", "system")) }}>
      <div className="mx-auto max-w-[560px] px-4 pb-6 pt-6 @min-[720px]:py-10">
        {str(config, "eyebrow") && (
          <p className="text-[12px] font-bold uppercase tracking-[0.08em]" style={{ fontFamily: TYPE }}>
            {str(config, "eyebrow")}
          </p>
        )}
        <h3 className="mt-1.5 text-[34px] font-bold leading-[0.95] tracking-[-0.045em] @min-[520px]:text-[42px]" style={{ fontFamily: head }}>
          {str(config, "heading")}
        </h3>
        {str(config, "subheading") && (
          <p className="mt-2 text-[13.5px] leading-snug" style={{ color: alpha(ink, 0.8) }}>
            {str(config, "subheading")}
          </p>
        )}

        <div className="mt-6 flex flex-col gap-3.5" role="radiogroup" aria-label={str(config, "heading")}>
          {tiers.map((t, i) => {
            const on = i === sel;
            return (
              <button
                key={i}
                ref={(el) => {
                  refs.current[i] = el;
                }}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => pick(i)}
                className={`relative flex w-full items-center gap-3 px-3 pb-3 text-left ${t.badge ? "pt-[18px]" : "pt-3"}`}
                style={{
                  background: on ? selBg : card,
                  borderRadius: radius,
                  boxShadow: on ? `0 0 0 2.5px ${ink}, 5px 5px 0 2.5px ${ink}` : `0 0 0 1.5px ${alpha(ink, 0.35)}`,
                  transition: `background-color 300ms ${EASE}, box-shadow 300ms ${EASE}`,
                }}
              >
                <BottleFan n={t.q} a={imgA} b={imgB} ink={ink} tile={card} />
                <span className="min-w-0 flex-1">
                  <span className="block text-[23px] font-bold leading-none tracking-[-0.04em]" style={{ fontFamily: head }}>
                    {t.title}
                  </span>
                  {t.perk && (
                    <span className="mt-1.5 flex items-start gap-1 text-[11.5px] font-bold leading-tight" style={{ fontFamily: TYPE }}>
                      <svg width="11" height="11" viewBox="0 0 12 12" aria-hidden className="mt-px shrink-0">
                        <path d="M2.2 6.4l2.4 2.3 5.2-5.4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      {t.perk}
                    </span>
                  )}
                </span>
                <span className="flex shrink-0 flex-col items-end leading-none tabular-nums">
                  <span className="text-[21px] font-bold tracking-[-0.03em]" style={{ fontFamily: head }}>
                    {money(t.total, cur)}
                  </span>
                  {t.d > 0 && (
                    <s className="mt-1 text-[11.5px]" style={{ fontFamily: TYPE, color: alpha(ink, 0.6) }}>
                      {money(t.full, cur)}
                    </s>
                  )}
                  {t.q > 1 && (
                    <span className="mt-1 text-[10.5px] font-bold" style={{ fontFamily: TYPE, color: alpha(ink, 0.75) }}>
                      {money(t.total / t.q, cur)}
                      {str(config, "perSetLabel")}
                    </span>
                  )}
                </span>
                {t.badge && (
                  <span
                    className="absolute -top-3 right-4 rotate-[4deg] rounded-full px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-[0.04em]"
                    style={{ background: t.tone, color: ink, fontFamily: TYPE, boxShadow: `0 0 0 2px ${ink}` }}
                  >
                    {t.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => setAdded(true)}
          className="mt-6 flex h-14 w-full items-center justify-center gap-2 rounded-full px-5 text-[15px] font-bold hover:brightness-110 active:scale-[0.98]"
          style={{
            background: ink,
            color: selBg,
            boxShadow: `4px 4px 0 ${alpha(ink, 0.25)}`,
            transition: `filter 200ms ease, scale 200ms ${EASE}`,
          }}
        >
          <span key={`${sel}-${added}`} className="bs-swap whitespace-nowrap">
            {added ? (
              `Added ${cur0?.title ?? ""} ✓`
            ) : (
              <>
                {str(config, "buttonText")} <span style={{ opacity: 0.5 }}>·</span> {cur0?.title}{" "}
                <span style={{ opacity: 0.5 }}>·</span> {money(cur0?.total ?? 0, cur)}
              </>
            )}
          </span>
        </button>
        {str(config, "note") && (
          <p className="mt-3 text-center text-[11.5px]" style={{ fontFamily: TYPE, color: alpha(ink, 0.75) }}>
            {str(config, "note")}
          </p>
        )}
      </div>
    </div>
  );
}

/* ---------- Liquid ---------- */

function generateLiquid(config: TweakConfig): string {
  const { face, family } = fontFaceFor(str(config, "font", "system"));
  const S = ".bs-stt-{{ section.id }}";
  const r = "{{ section.settings.radius }}px";
  const ease = "cubic-bezier(.22,1,.36,1)";
  const type = "'Courier New', Courier, ui-monospace, monospace";
  const tick = `<svg width="11" height="11" viewBox="0 0 12 12" aria-hidden="true"><path d="M2.2 6.4l2.4 2.3 5.2-5.4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

  const style = `<style>
${face ? face + "\n" : ""}  ${S} { container-type: inline-size; background: {{ section.settings.bg }}; color: {{ section.settings.text_color }}; font-family: ${family}; }
  ${S} * { box-sizing: border-box; }
  ${S} p, ${S} h2 { margin: 0; }
  ${S} .bs-head-f { font-family: {% case section.settings.head_font %}{% when 'theme' %}inherit{% when 'sans' %}-apple-system, BlinkMacSystemFont, system-ui, sans-serif{% else %}Georgia, 'Times New Roman', serif{% endcase %}; }
  ${S} .bs-type { font-family: ${type}; }
  ${S} .bs-wrap { max-width: 560px; margin: 0 auto; padding: 24px 16px; }
  ${S} .bs-eyebrow { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; }
  ${S} .bs-h { margin-top: 6px; font-size: 34px; font-weight: 700; line-height: .95; letter-spacing: -.045em; }
  ${S} .bs-sub { margin-top: 8px; font-size: 13.5px; line-height: 1.35; opacity: .8; }
  ${S} .bs-tiers { display: flex; flex-direction: column; gap: 14px; margin-top: 24px; }
  ${S} .bs-tier { position: relative; display: flex; align-items: center; gap: 12px; padding: 12px; cursor: pointer; border-radius: ${r};
    background: {{ section.settings.card }}; box-shadow: 0 0 0 1.5px rgba(60,66,46,.35); transition: background-color .3s ${ease}, box-shadow .3s ${ease}; }
  ${S} .bs-tier.has-stk { padding-top: 18px; }
  ${S} .bs-tier input { position: absolute; opacity: 0; width: 1px; height: 1px; pointer-events: none; }
  ${S} .bs-tier:has(input:checked) { background: {{ section.settings.selected_bg }}; box-shadow: 0 0 0 2.5px {{ section.settings.text_color }}, 5px 5px 0 2.5px {{ section.settings.text_color }}; }
  ${S} .bs-tier:has(input:focus-visible) { outline: 2px solid {{ section.settings.text_color }}; outline-offset: 6px; }
  ${S} .bs-tier.is-wobble { animation: bs-stt-wob .56s ease-out; }
  @keyframes bs-stt-wob {
    22% { transform: rotate(-2.2deg) scale(1.025); }
    48% { transform: rotate(1.6deg) scale(1.02); }
    72% { transform: rotate(-.8deg) scale(1.01); }
  }
  ${S} .bs-fan { position: relative; flex-shrink: 0; width: 92px; height: 48px; }
  ${S} .bs-fan-in { position: absolute; top: 4px; left: 50%; height: 40px; transform: translateX(-50%); }
  ${S} .bs-b { position: absolute; top: 0; width: 32px; height: 40px; overflow: hidden; border-radius: 7px; background: {{ section.settings.card }};
    box-shadow: 0 0 0 1.5px {{ section.settings.text_color }}, 2px 2px 0 {{ section.settings.text_color }}; }
  ${S} .bs-b img, ${S} .bs-b svg { display: block; width: 100%; height: 100%; object-fit: cover; object-position: 35% 50%; }
  ${S} .bs-more { position: absolute; right: 0; bottom: -2px; z-index: 9; padding: 1px 6px; border-radius: 99px; background: {{ section.settings.text_color }}; color: {{ section.settings.card }};
    font-family: ${type}; font-size: 10px; font-weight: 700; }
  ${S} .bs-mid { flex: 1; min-width: 0; }
  ${S} .bs-tt { display: block; font-size: 23px; font-weight: 700; line-height: 1; letter-spacing: -.04em; }
  ${S} .bs-perk { display: flex; align-items: flex-start; gap: 4px; margin-top: 6px; font-family: ${type}; font-size: 11.5px; font-weight: 700; line-height: 1.2; }
  ${S} .bs-perk svg { flex-shrink: 0; margin-top: 1px; }
  ${S} .bs-pr { display: flex; flex-shrink: 0; flex-direction: column; align-items: flex-end; line-height: 1; font-variant-numeric: tabular-nums; }
  ${S} .bs-pr b { font-size: 21px; letter-spacing: -.03em; }
  ${S} .bs-pr s { margin-top: 4px; font-family: ${type}; font-size: 11.5px; opacity: .6; }
  ${S} .bs-pr small { margin-top: 4px; font-family: ${type}; font-size: 10.5px; font-weight: 700; opacity: .75; }
  ${S} .bs-stk { position: absolute; top: -12px; right: 16px; padding: 4px 10px; border-radius: 99px; transform: rotate(4deg); color: {{ section.settings.text_color }};
    font-family: ${type}; font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; box-shadow: 0 0 0 2px {{ section.settings.text_color }}; }
  ${S} .bs-atc { display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; height: 56px; margin-top: 24px; padding: 0 20px; border: 0; border-radius: 99px; cursor: pointer;
    background: {{ section.settings.text_color }}; color: {{ section.settings.selected_bg }}; font: inherit; font-size: 15px; font-weight: 700; white-space: nowrap;
    box-shadow: 4px 4px 0 rgba(60,66,46,.25); transition: filter .2s, transform .2s ${ease}; }
  ${S} .bs-atc:hover:not(:disabled) { filter: brightness(1.1); }
  ${S} .bs-atc:active:not(:disabled) { transform: scale(.98); }
  ${S} .bs-atc:disabled { opacity: .5; cursor: not-allowed; }
  ${S} .bs-dot { opacity: .5; }
  ${S} .bs-note { margin-top: 12px; text-align: center; font-family: ${type}; font-size: 11.5px; opacity: .75; }
  @container (min-width: 520px) {
    ${S} .bs-h { font-size: 42px; }
  }
  @container (min-width: 720px) {
    ${S} .bs-wrap { padding: 40px 16px; }
  }
  @media (prefers-reduced-motion: reduce) {
    ${S} .bs-tier.is-wobble { animation: none; }
  }
</style>`;

  /* the bottle fan for a given set count, built server side */
  const fan = `{%- assign bs_n = block.settings.quantity | at_most: 6 -%}
              {%- assign bs_step = 0 -%}
              {%- if bs_n > 1 -%}{%- assign bs_nm = bs_n | minus: 1 -%}{%- assign bs_step = 60 | divided_by: bs_nm | at_most: 16 -%}{%- endif -%}
              {%- assign bs_w = bs_n | minus: 1 | times: bs_step | plus: 32 -%}
              <span class="bs-fan" aria-hidden="true">
                <span class="bs-fan-in" style="width: {{ bs_w }}px;">
                  {%- for i in (1..bs_n) -%}
                    {%- assign bs_m = forloop.index0 | modulo: 2 -%}
                    {%- assign bs_r = forloop.index0 | modulo: 3 | minus: 1 | times: 4 -%}
                    {%- if bs_n == 1 -%}{%- assign bs_r = 0 -%}{%- endif -%}
                    <span class="bs-b" style="left: {{ forloop.index0 | times: bs_step }}px; z-index: {{ forloop.index }}; transform: rotate({{ bs_r }}deg);">
                      {%- if bs_m == 0 -%}{%- assign bs_img = bs_img_a -%}{%- else -%}{%- assign bs_img = bs_img_b -%}{%- endif -%}
                      {%- if bs_img != blank -%}{{ bs_img | image_url: width: 120 | image_tag: loading: 'lazy', alt: '' }}{%- else -%}{{ 'product-1' | placeholder_svg_tag }}{%- endif -%}
                    </span>
                  {%- endfor -%}
                </span>
                {%- if block.settings.quantity > 6 -%}<span class="bs-more">×{{ block.settings.quantity }}</span>{%- endif -%}
              </span>`;

  const markup = `{%- comment -%}
  Set Tiers by boost.supply. Add it to your product template (or pick a
  product below). One "Tier" block per offer; the chosen tier's quantity
  goes to the cart in a normal add-to-cart form.
  SETUP (the perks shown here are display only, create them in Shopify):
  - Discounts → Create discount → Amount off products → Automatic discount,
    for this product, minimum quantity of items = the tier quantity, one per
    tier with a discount (with the defaults: 3+ items 5% off, 6+ items 10% off).
    Leave these tier discounts NOT combining with each other, so the best
    one applies.
  - Free shipping from 2 sets: Discounts → Free shipping → Automatic
    discount with a minimum quantity of 2 for this product, set to combine
    with product discounts.
  - "Sets": if one set is a bundle of two bottles, sell the set as its own
    product (or variant) and use that product here.
  Bottle photos: the two image pickers, or the product's first two images.
{%- endcomment -%}
{%- liquid
  assign bs_p = section.settings.product
  if bs_p == blank
    assign bs_p = product
  endif
-%}
{%- if bs_p != blank -%}
{%- liquid
  assign bs_v = bs_p.selected_or_first_available_variant
  assign bs_img_a = section.settings.image_a
  if bs_img_a == blank
    assign bs_img_a = bs_p.images[0]
  endif
  assign bs_img_b = section.settings.image_b
  if bs_img_b == blank
    assign bs_img_b = bs_p.images[1] | default: bs_img_a
  endif
-%}
<div class="bs-stt-{{ section.id }}" id="bs-stt-{{ section.id }}">
  <div class="bs-wrap">
    {%- if section.settings.eyebrow != blank -%}<p class="bs-eyebrow bs-type">{{ section.settings.eyebrow }}</p>{%- endif -%}
    <h2 class="bs-h bs-head-f">{{ section.settings.heading }}</h2>
    {%- if section.settings.subheading != blank -%}<p class="bs-sub">{{ section.settings.subheading }}</p>{%- endif -%}

    {%- form 'product', bs_p, class: 'bs-form' -%}
      <input type="hidden" name="id" value="{{ bs_v.id }}">
      <div class="bs-tiers" role="radiogroup" aria-label="{{ section.settings.heading | escape }}">
        {%- assign bs_badge_i = 0 -%}
        {%- for block in section.blocks -%}
          {%- assign bs_q = block.settings.quantity -%}
          {%- assign bs_keep = 100 | minus: block.settings.discount -%}
          {%- assign bs_full = bs_v.price | times: bs_q -%}
          {%- assign bs_total = bs_full | times: bs_keep | divided_by: 100 -%}
          {%- assign bs_each = bs_total | divided_by: bs_q -%}
          <label class="bs-tier{% if block.settings.badge != blank %} has-stk{% endif %}" {{ block.shopify_attributes }}>
            <input type="radio" name="quantity" value="{{ bs_q }}" data-title="{{ block.settings.title | escape }}" data-total="{{ bs_total | money | strip_html | escape }}"{% if forloop.index == section.settings.selected %} checked{% endif %}>
            ${fan}
            <span class="bs-mid">
              <span class="bs-tt bs-head-f">{{ block.settings.title }}</span>
              {%- if block.settings.perk != blank -%}<span class="bs-perk">${tick}{{ block.settings.perk }}</span>{%- endif -%}
            </span>
            <span class="bs-pr">
              <b class="bs-head-f">{{ bs_total | money_without_trailing_zeros }}</b>
              {%- if block.settings.discount > 0 -%}<s>{{ bs_full | money_without_trailing_zeros }}</s>{%- endif -%}
              {%- if bs_q > 1 -%}<small>{{ bs_each | money }}{{ section.settings.per_set_label }}</small>{%- endif -%}
            </span>
            {%- if block.settings.badge != blank -%}
              {%- assign bs_bm = bs_badge_i | modulo: 2 -%}
              <span class="bs-stk" style="background: {% if bs_bm == 0 %}{{ section.settings.badge_a }}{% else %}{{ section.settings.badge_b }}{% endif %};">{{ block.settings.badge }}</span>
              {%- assign bs_badge_i = bs_badge_i | plus: 1 -%}
            {%- endif -%}
          </label>
        {%- endfor -%}
      </div>
      <button type="submit" name="add" class="bs-atc"{% unless bs_v.available %} disabled{% endunless %}>
        {%- if bs_v.available -%}
          <span>{{ section.settings.button_text }}</span><span class="bs-dot">·</span><span data-sel-title></span><span class="bs-dot">·</span><span data-sel-total></span>
        {%- else -%}
          <span>{{ section.settings.sold_out_text }}</span>
        {%- endif -%}
      </button>
    {%- endform -%}
    {%- if section.settings.note != blank -%}<p class="bs-note">{{ section.settings.note }}</p>{%- endif -%}
  </div>
</div>
<script>
  (function () {
    var root = document.getElementById('bs-stt-{{ section.id }}');
    if (!root) return;
    var radios = [].slice.call(root.querySelectorAll('input[name="quantity"]'));
    if (radios.length && !radios.some(function (r) { return r.checked; })) radios[0].checked = true;
    var title = root.querySelector('[data-sel-title]'), total = root.querySelector('[data-sel-total]');
    var calm = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function update(wobble) {
      var r = radios.filter(function (x) { return x.checked; })[0];
      if (!r) return;
      if (title) title.textContent = r.dataset.title;
      if (total) total.textContent = r.dataset.total;
      if (wobble && !calm) {
        var card = r.closest('.bs-tier');
        card.classList.remove('is-wobble');
        void card.offsetWidth;
        card.classList.add('is-wobble');
      }
    }
    radios.forEach(function (r) { r.addEventListener('change', function () { update(true); }); });
    update(false);
  })();
</script>
{%- else -%}
<p style="padding:24px;text-align:center;opacity:.6">Pick a product in the section settings, or add this section to a product template.</p>
{%- endif -%}`;

  const tiers = list(config, "tiers");
  const head = str(config, "headFont", "georgia");

  const schema = buildSchema({
    name: "Set Tiers",
    settings: [
      { type: "text", id: "eyebrow", label: "Eyebrow", default: str(config, "eyebrow") },
      { type: "text", id: "heading", label: "Heading", default: str(config, "heading") },
      { type: "textarea", id: "subheading", label: "Subheading", default: str(config, "subheading") },
      { type: "header", content: "Product" },
      { type: "product", id: "product", label: "Product", info: "Leave empty on a product template to use that product." },
      { type: "image_picker", id: "image_a", label: "Bottle photo 1", info: "Optional. Defaults to the product's first image." },
      { type: "image_picker", id: "image_b", label: "Bottle photo 2", info: "Optional. Defaults to the product's second image." },
      { type: "range", id: "selected", label: "Tier selected by default", min: 1, max: 6, step: 1, default: clamp(Math.round(num(config, "selected", 3)), 1, 6) },
      { type: "header", content: "Labels" },
      { type: "text", id: "per_set_label", label: "Per set suffix", default: str(config, "perSetLabel") },
      { type: "text", id: "button_text", label: "Button text", default: str(config, "buttonText") },
      { type: "text", id: "sold_out_text", label: "Sold out text", default: "Sold out" },
      { type: "text", id: "note", label: "Note under the button", default: str(config, "note") },
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
      { type: "color", id: "card", label: "Card", default: str(config, "card") },
      { type: "color", id: "selected_bg", label: "Selected card & button text", default: str(config, "selectedBg") },
      { type: "color", id: "text_color", label: "Text, borders & button", default: str(config, "textColor") },
      { type: "color", id: "badge_a", label: "Sticker 1", default: str(config, "badgeA") },
      { type: "color", id: "badge_b", label: "Sticker 2", default: str(config, "badgeB") },
      { type: "range", id: "radius", label: "Corner radius", min: 0, max: 28, step: 2, unit: "px", default: clamp(Math.round(num(config, "radius", 18) / 2) * 2, 0, 28) },
    ],
    blocks: [
      {
        type: "tier",
        name: "Tier",
        settings: [
          { type: "text", id: "title", label: "Title", default: "2 sets" },
          { type: "range", id: "quantity", label: "Quantity", min: 1, max: 24, step: 1, default: 2 },
          { type: "text", id: "perk", label: "Perk text", default: "Free shipping" },
          { type: "range", id: "discount", label: "Discount", min: 0, max: 50, step: 1, unit: "%", default: 0 },
          { type: "text", id: "badge", label: "Sticker badge" },
        ],
      },
    ],
    maxBlocks: 6,
    presetBlocks: tiers.slice(0, 6).map((t) => ({
      type: "tier",
      settings: {
        title: t.title ?? "",
        quantity: clamp(Math.round(toNum(t.qty, 1)), 1, 24),
        perk: t.perk ?? "",
        discount: clamp(Math.round(toNum(t.discount, 0)), 0, 50),
        badge: t.badge ?? "",
      },
    })),
  });

  return section({ style, markup, schema });
}

export const setTiers: Tweak = {
  slug: "set-tiers",
  inspiredBy: "graza",
  name: "Set Tiers",
  tagline: "Bold stacked multi-set offers with sticker badges, a bottle fan per tier and a wobble on pick.",
  description:
    "Modeled on the multi-pack offer cards Graza uses on its product pages. Shoppers pick 1, 2, 3 or 6 sets from bold stacked cards: each shows a little fan of bottles, the perk it unlocks (free shipping, +5% off, +10% off), the total against the full price and the price per set, and the best picks carry sticker badges. The chosen card lights up with a playful wobble and the button adds that quantity to the cart. Lifts order value by making the bigger box the fun choice.",
  category: "product-page",
  tier: "free",
  tint: "#eef3c4",
  Preview,
  generateLiquid,
  defaults,
  fields: [
    { key: "eyebrow", label: "Eyebrow", type: "text", group: "Content" },
    { key: "heading", label: "Heading", type: "text", group: "Content" },
    { key: "subheading", label: "Subheading", type: "textarea", group: "Content" },
    { key: "currency", label: "Currency symbol", type: "text", group: "Content" },
    { key: "setPrice", label: "Price per set", type: "text", group: "Content", hint: "Preview only; Shopify uses the product price" },
    {
      key: "tiers", label: "Tiers", type: "list", group: "Tiers",
      hint: "Quantity is the number of sets added to the cart. Discount is a % off the full price (display only; create the matching discount in Shopify)",
      itemFields: [
        { key: "title", label: "Title", type: "text" },
        { key: "qty", label: "Quantity", type: "text" },
        { key: "perk", label: "Perk text", type: "text" },
        { key: "discount", label: "Discount %", type: "text" },
        { key: "badge", label: "Sticker badge", type: "text" },
      ],
      newItem: { title: "12 sets", qty: "12", perk: "Free shipping + 15% off", discount: "15", badge: "Pantry hero" },
      addLabel: "Add tier", max: 6,
    },
    { key: "selected", label: "Tier selected by default", type: "slider", group: "Tiers", min: 1, max: 6, step: 1 },
    { key: "perSetLabel", label: "Per set suffix", type: "text", group: "Labels" },
    { key: "buttonText", label: "Button text", type: "text", group: "Labels" },
    { key: "note", label: "Note under the button", type: "text", group: "Labels" },
    {
      key: "imageA", label: "Image URL", type: "text", group: "Media",
      hint: "First bottle in each fan (4:5 works best). Preview only; your store uses the image pickers or product images",
    },
    { key: "imageB", label: "Second image URL", type: "text", group: "Media", hint: "Alternates with the first. Leave both empty for drawn bottles" },
    {
      key: "headFont", label: "Headline font", type: "select", group: "Typography",
      options: [
        { label: "Condensed serif (Georgia)", value: "georgia" },
        { label: "System sans", value: "sans" },
        { label: "Theme font", value: "theme" },
      ],
    },
    fontField("Typography", "font", "Body font"),
    { key: "radius", label: "Corner radius", type: "slider", group: "Layout", min: 0, max: 28, step: 2, unit: "px" },
    { key: "bg", label: "Background", type: "color", group: "Colors" },
    { key: "card", label: "Card", type: "color", group: "Colors" },
    { key: "selectedBg", label: "Selected card & button text", type: "color", group: "Colors" },
    { key: "textColor", label: "Text, borders & button", type: "color", group: "Colors" },
    { key: "badgeA", label: "Sticker 1", type: "color", group: "Colors" },
    { key: "badgeB", label: "Sticker 2", type: "color", group: "Colors" },
  ],
};
