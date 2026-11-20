"use client";

import { useState } from "react";
import type { Tweak, TweakConfig } from "../types";
import { str, num, bool, list, fontStack, esc } from "../cfg";
import { fontField } from "../fields";
import { buildSchema, section, fontFaceFor } from "../liquid";
import { Icon, iconMarkup } from "../icons";
import { ProductArt, money, toNum, type ArtKind } from "./product-art";

/* ============================================================
   Bundle Buy Box
   Quantity-break offers ("Buy 1 / Buy 2 / Buy 3") with savings
   badges, a free-gift unlock track that fills as the bundle
   grows, and an add-to-cart button that shows the bundle price.
   ============================================================ */

const MONO = "ui-monospace, 'SF Mono', Menlo, monospace";
const GIFT_ART: ArtKind[] = ["comb", "bag", "jar", "tube"];

const defaults: TweakConfig = {
  heading: "Bundle & save",
  subheading: "The more you stock up, the more you save",
  currency: "$",
  basePrice: "29",
  compareAt: "36",
  tiers: [
    { title: "Buy 1", qty: "1", discount: "0", badge: "", caption: "" },
    { title: "Buy 2", qty: "2", discount: "15", badge: "Most popular", caption: "" },
    { title: "Buy 3", qty: "3", discount: "25", badge: "Best value", caption: "" },
  ],
  selected: 2,
  showGifts: true,
  giftTitle: "Unlock free gifts",
  gifts: [
    { name: "Hair Comb", unlock: "2", icon: "" },
    { name: "Wash Bag", unlock: "3", icon: "" },
    { name: "Mini Clay", unlock: "3", icon: "" },
  ],
  buttonText: "Add to cart",
  trustLeft: "300,000+ sold",
  trustRight: "30-day guarantee",
  accent: "#1e2a44",
  accentText: "#ffffff",
  badgeBg: "#e4e4e0",
  bg: "#f4f4f2",
  card: "#ffffff",
  textColor: "#161616",
  muted: "#7a7a76",
  font: "inherit",
  radius: 16,
};

/** Hex color + alpha byte, e.g. tint("#1e2a44", 0.12). */
const tint = (hex: string, a: number) =>
  /^#[0-9a-f]{6}$/i.test(hex)
    ? hex + Math.round(a * 255).toString(16).padStart(2, "0")
    : hex;

function Preview({ config }: { config: TweakConfig }) {
  const cur = str(config, "currency", "$");
  const accent = str(config, "accent", "#1e2a44");
  const accentText = str(config, "accentText", "#fff");
  const text = str(config, "textColor", "#161616");
  const muted = str(config, "muted", "#7a7a76");
  const card = str(config, "card", "#fff");
  const radius = num(config, "radius", 16);

  const tiers = list(config, "tiers");
  const gifts = bool(config, "showGifts", true) ? list(config, "gifts") : [];
  const unit = toNum(str(config, "basePrice"), 29);
  const cmpUnit = Math.max(toNum(str(config, "compareAt")), unit);

  /* follow the "preselected" control, but let shoppers click around */
  const initial = Math.max(0, Math.min(num(config, "selected", 2) - 1, tiers.length - 1));
  const [prevInitial, setPrevInitial] = useState(initial);
  const [sel, setSel] = useState(initial);
  if (initial !== prevInitial) {
    setPrevInitial(initial);
    setSel(initial);
  }
  const active = Math.max(0, Math.min(sel, tiers.length - 1));

  const priced = tiers.map((t) => {
    const qty = Math.max(1, Math.round(toNum(t.qty, 1)));
    const d = Math.min(90, Math.max(0, toNum(t.discount)));
    const total = unit * qty * (1 - d / 100);
    const compare = cmpUnit * qty;
    return {
      title: t.title ?? "",
      badge: t.badge ?? "",
      caption: t.caption ?? "",
      qty,
      d,
      total,
      compare,
      each: total / qty,
    };
  });
  const chosen = priced[active];
  const qty = chosen?.qty ?? 1;

  const unlocked = gifts.map((g) => qty >= Math.max(1, toNum(g.unlock, 1)));
  const lastOn = unlocked.lastIndexOf(true);
  const next = gifts.find((_, i) => !unlocked[i]);
  const fill =
    gifts.length > 1 ? (Math.max(0, lastOn) / (gifts.length - 1)) * 100 : lastOn >= 0 ? 100 : 0;

  return (
    <div
      className="@container w-full bg-white"
      style={{ fontFamily: fontStack(str(config, "font", "inherit")), color: text }}
    >
      <div
        className="mx-auto w-full max-w-[440px] p-4 @min-[520px]:my-8"
        style={{ background: str(config, "bg", "#f4f4f2"), borderRadius: radius + 8 }}
      >
        {str(config, "heading") && (
          <h3 className="px-1 text-[17px] font-medium tracking-[-0.015em]">
            {str(config, "heading")}
          </h3>
        )}
        {str(config, "subheading") && (
          <p className="mt-0.5 px-1 text-[12.5px]" style={{ color: muted }}>
            {str(config, "subheading")}
          </p>
        )}

        {/* Tiers */}
        <div role="radiogroup" className="mt-4 flex flex-col gap-3 pt-1">
          {priced.map((t, i) => {
            const on = i === active;
            const caption =
              t.caption ||
              (t.compare > t.total + 0.005 ? `You save ${money(t.compare - t.total, cur)}` : "Standard price");
            return (
              <button
                key={i}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => setSel(i)}
                className="relative flex w-full items-center gap-3 px-4 py-[15px] text-left transition-[box-shadow,transform] duration-300 ease-[cubic-bezier(.22,1,.36,1)] active:scale-[0.99]"
                style={{
                  background: card,
                  borderRadius: radius,
                  boxShadow: on
                    ? `0 0 0 1.5px ${accent}, 0 8px 20px -12px ${tint(accent, 0.45)}`
                    : "0 0 0 1px rgba(0,0,0,0.07)",
                }}
              >
                <span
                  aria-hidden
                  className="h-5 w-5 shrink-0 rounded-full transition-[border-width,border-color] duration-300"
                  style={{
                    border: on ? `6px solid ${accent}` : "1.5px solid #c9c9c5",
                  }}
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-medium">{t.title}</span>
                  <span
                    className="mt-0.5 block text-[12.5px] transition-colors duration-300"
                    style={{ color: on && t.d > 0 ? accent : muted }}
                  >
                    {caption}
                  </span>
                </span>
                <span className="shrink-0 text-right tabular-nums">
                  <span className="block text-[15px]">
                    {t.compare > t.total + 0.005 && (
                      <s className="mr-1.5 text-[13px]" style={{ color: muted }}>
                        {money(t.compare, cur)}
                      </s>
                    )}
                    <b className="font-semibold">{money(t.total, cur)}</b>
                  </span>
                  {t.qty > 1 && (
                    <span className="mt-0.5 block text-[11.5px]" style={{ color: muted }}>
                      {money(t.each, cur)} each
                    </span>
                  )}
                </span>

                {(t.d > 0 || t.badge) && (
                  <span className="absolute -top-2.5 right-3 flex gap-1" style={{ fontFamily: MONO }}>
                    {t.d > 0 && (
                      <span
                        className="rounded-full px-2 py-[3px] text-[10px] uppercase tracking-[0.06em]"
                        style={{ background: accent, color: accentText }}
                      >
                        Save {t.d}%
                      </span>
                    )}
                    {t.badge && (
                      <span
                        className="rounded-full px-2 py-[3px] text-[10px] uppercase tracking-[0.06em]"
                        style={{ background: str(config, "badgeBg", "#e4e4e0"), color: text }}
                      >
                        {t.badge}
                      </span>
                    )}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Free gift track */}
        {gifts.length > 0 && (
          <div className="mt-3 px-4 pb-4 pt-3.5" style={{ background: card, borderRadius: radius }}>
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-[13.5px] font-medium">{str(config, "giftTitle")}</p>
              <p key={next?.name ?? "all"} className="bs-swap text-right text-[12px]" style={{ color: muted }}>
                {next
                  ? `Buy ${Math.max(1, toNum(next.unlock, 1))} to unlock a free ${next.name}`
                  : "All free gifts unlocked"}
              </p>
            </div>

            <div className="relative mt-4">
              <div
                className="absolute top-[22px] h-[3px] -translate-y-1/2 rounded-full bg-black/[0.07]"
                style={{ left: `${50 / gifts.length}%`, right: `${50 / gifts.length}%` }}
              >
                <div
                  className="h-full rounded-full transition-[width] duration-700 ease-[cubic-bezier(.22,1,.36,1)]"
                  style={{ width: `${fill}%`, background: accent }}
                />
              </div>
              <div className="relative grid" style={{ gridTemplateColumns: `repeat(${gifts.length}, minmax(0,1fr))` }}>
                {gifts.map((g, i) => {
                  const on = unlocked[i];
                  return (
                    <div key={i} className="flex flex-col items-center text-center">
                      <span
                        className="relative grid h-11 w-11 place-items-center rounded-full transition-[background-color,box-shadow,transform] duration-500 ease-[cubic-bezier(.34,1.56,.64,1)]"
                        style={{
                          background: on ? tint(accent, 0.12) : "#efefec",
                          boxShadow: on ? `0 0 0 1.5px ${accent}` : "0 0 0 1px rgba(0,0,0,0.04)",
                          transform: on ? "scale(1)" : "scale(0.92)",
                          color: on ? accent : muted,
                        }}
                      >
                        {g.icon ? (
                          <Icon token={g.icon} size={20} />
                        ) : (
                          <span className={on ? "" : "opacity-50 grayscale"}>
                            <ProductArt kind={GIFT_ART[i % GIFT_ART.length]} tone={accent} size={36} tile="transparent" />
                          </span>
                        )}
                        <span
                          aria-hidden
                          className="absolute -bottom-0.5 -right-0.5 grid h-[17px] w-[17px] place-items-center rounded-full bg-[#2f9e62] text-white ring-2 ring-white transition-[opacity,transform] duration-300"
                          style={{ opacity: on ? 1 : 0, transform: on ? "scale(1)" : "scale(0.4)" }}
                        >
                          <svg width="9" height="9" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M2.5 6.3l2.3 2.2 4.7-5" />
                          </svg>
                        </span>
                      </span>
                      <span className="mt-2 text-[10px] uppercase leading-tight tracking-[0.06em]" style={{ fontFamily: MONO }}>
                        {g.name}
                      </span>
                      <span className="mt-0.5 text-[10.5px]" style={{ color: on ? accent : muted }}>
                        {on ? "Free" : `Buy ${Math.max(1, toNum(g.unlock, 1))}+`}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Add to cart */}
        <button
          type="button"
          className="mt-4 flex h-[52px] w-full items-center justify-center gap-2 rounded-full text-[16px] font-medium transition-[filter,transform] duration-200 hover:brightness-110 active:scale-[0.99]"
          style={{ background: accent, color: accentText }}
        >
          <span>{str(config, "buttonText", "Add to cart")}</span>
          {chosen && (
            <span key={active} className="bs-swap tabular-nums">
              <span className="opacity-60">—</span>{" "}
              {chosen.compare > chosen.total + 0.005 && (
                <s className="mr-1 opacity-60">{money(chosen.compare, cur)}</s>
              )}
              {money(chosen.total, cur)}
            </span>
          )}
        </button>

        {(str(config, "trustLeft") || str(config, "trustRight")) && (
          <p
            className="mt-3 flex items-center justify-center gap-2 text-[10.5px] uppercase tracking-[0.06em]"
            style={{ fontFamily: MONO }}
          >
            {str(config, "trustLeft")}
            {str(config, "trustLeft") && str(config, "trustRight") && (
              <span aria-hidden className="text-[8px]">◆</span>
            )}
            {str(config, "trustRight")}
          </p>
        )}
      </div>
    </div>
  );
}

function generateLiquid(config: TweakConfig): string {
  const { face, family } = fontFaceFor(str(config, "font", "inherit"));
  const S = ".bs-bb-{{ section.id }}";
  const r = "{{ section.settings.radius }}px";
  const mono = "ui-monospace, 'SF Mono', Menlo, monospace";

  const style = `<style>
${face ? face + "\n" : ""}  ${S} { max-width: 460px; padding: 16px; background: {{ section.settings.bg }}; color: {{ section.settings.text_color }};
    font-family: ${family}; border-radius: {{ section.settings.radius | plus: 8 }}px; }
  ${S} * { box-sizing: border-box; }
  ${S} p { margin: 0; }
  ${S} .bs-h { padding: 0 4px; font-size: 17px; font-weight: 500; letter-spacing: -.015em; }
  ${S} .bs-sh { padding: 2px 4px 0; font-size: 12.5px; color: {{ section.settings.muted }}; }
  ${S} .bs-tiers { display: flex; flex-direction: column; gap: 12px; margin-top: 16px; padding-top: 4px; }
  ${S} .bs-tier { position: relative; display: flex; align-items: center; gap: 12px; padding: 15px 16px; cursor: pointer;
    background: {{ section.settings.card }}; border-radius: ${r}; box-shadow: 0 0 0 1px rgba(0,0,0,.07);
    transition: box-shadow .3s cubic-bezier(.22,1,.36,1), transform .2s; }
  ${S} .bs-tier:active { transform: scale(.99); }
  ${S} .bs-tier input { position: absolute; opacity: 0; pointer-events: none; }
  ${S} .bs-radio { width: 20px; height: 20px; flex-shrink: 0; border-radius: 99px; border: 1.5px solid #c9c9c5; transition: border .3s; }
  ${S} .bs-tier:has(input:checked) { box-shadow: 0 0 0 1.5px {{ section.settings.accent }}, 0 8px 20px -12px rgba(0,0,0,.35); }
  ${S} .bs-tier:has(input:checked) .bs-radio { border: 6px solid {{ section.settings.accent }}; }
  ${S} .bs-tier:has(input:focus-visible) { outline: 2px solid {{ section.settings.accent }}; outline-offset: 2px; }
  ${S} .bs-main { flex: 1; min-width: 0; }
  ${S} .bs-t { display: block; font-size: 15px; font-weight: 500; }
  ${S} .bs-c { display: block; margin-top: 2px; font-size: 12.5px; color: {{ section.settings.muted }}; }
  ${S} .bs-tier:has(input:checked) .bs-c.is-save { color: {{ section.settings.accent }}; }
  ${S} .bs-p { flex-shrink: 0; text-align: right; font-size: 15px; }
  ${S} .bs-p b { font-weight: 600; }
  ${S} s { color: {{ section.settings.muted }}; font-size: 13px; margin-right: 6px; }
  ${S} .bs-each { display: block; margin-top: 2px; font-size: 11.5px; color: {{ section.settings.muted }}; }
  ${S} .bs-badges { position: absolute; top: -10px; right: 12px; display: flex; gap: 4px; }
  ${S} .bs-b { font-family: ${mono}; font-size: 10px; text-transform: uppercase; letter-spacing: .06em; padding: 3px 8px; border-radius: 99px; }
  ${S} .bs-b1 { background: {{ section.settings.accent }}; color: {{ section.settings.accent_text }}; }
  ${S} .bs-b2 { background: {{ section.settings.badge_bg }}; color: {{ section.settings.text_color }}; }
  ${S} .bs-gifts { margin-top: 12px; padding: 14px 16px 16px; background: {{ section.settings.card }}; border-radius: ${r}; }
  ${S} .bs-gh { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; }
  ${S} .bs-gt { font-size: 13.5px; font-weight: 500; }
  ${S} .bs-gm { font-size: 12px; color: {{ section.settings.muted }}; text-align: right; }
  ${S} .bs-track { position: relative; margin-top: 16px; }
  ${S} .bs-line { position: absolute; top: 21px; height: 3px; border-radius: 99px; background: rgba(0,0,0,.07); }
  ${S} .bs-line-fill { height: 100%; width: 0; border-radius: 99px; background: {{ section.settings.accent }}; transition: width .7s cubic-bezier(.22,1,.36,1); }
  ${S} .bs-nodes { position: relative; display: grid; grid-auto-flow: column; grid-auto-columns: minmax(0, 1fr); }
  ${S} .bs-node { display: flex; flex-direction: column; align-items: center; text-align: center; }
  ${S} .bs-dot { position: relative; width: 44px; height: 44px; border-radius: 99px; display: grid; place-items: center;
    background: #efefec; color: {{ section.settings.muted }}; transform: scale(.92); filter: grayscale(1); opacity: .75;
    transition: transform .5s cubic-bezier(.34,1.56,.64,1), background .3s, box-shadow .3s, filter .3s, opacity .3s; }
  ${S} .bs-dot img { width: 32px; height: 32px; object-fit: contain; border-radius: 99px; }
  ${S} .bs-node.is-on .bs-dot { transform: none; filter: none; opacity: 1; color: {{ section.settings.accent }};
    background: {{ section.settings.card }}; box-shadow: 0 0 0 1.5px {{ section.settings.accent }}; }
  ${S} .bs-ok { position: absolute; right: -2px; bottom: -2px; width: 17px; height: 17px; border-radius: 99px; background: #2f9e62; color: #fff;
    display: grid; place-items: center; box-shadow: 0 0 0 2px #fff; opacity: 0; transform: scale(.4); transition: opacity .3s, transform .3s; }
  ${S} .bs-node.is-on .bs-ok { opacity: 1; transform: none; }
  ${S} .bs-nn { margin-top: 8px; font-family: ${mono}; font-size: 10px; text-transform: uppercase; letter-spacing: .06em; line-height: 1.2; }
  ${S} .bs-atc { margin-top: 16px; width: 100%; height: 52px; border: 0; border-radius: 99px; cursor: pointer; font: inherit; font-size: 16px; font-weight: 500;
    display: flex; align-items: center; justify-content: center; gap: 8px;
    background: {{ section.settings.accent }}; color: {{ section.settings.accent_text }}; transition: filter .2s, transform .2s; }
  ${S} .bs-atc:hover { filter: brightness(1.1); }
  ${S} .bs-atc:active { transform: scale(.99); }
  ${S} .bs-atc:disabled { opacity: .5; cursor: not-allowed; }
  ${S} .bs-atc s, ${S} .bs-atc .bs-dash { color: inherit; opacity: .6; font-size: inherit; margin: 0; }
  ${S} .bs-trust { margin-top: 12px; display: flex; align-items: center; justify-content: center; gap: 8px;
    font-family: ${mono}; font-size: 10.5px; text-transform: uppercase; letter-spacing: .06em; }
</style>`;

  const markup = `{%- comment -%}
  Bundle Buy Box by boost.supply. Add it to your product template.
  The bundle prices shown here are display only: create a matching
  discount in Shopify (Discounts → Amount off products → minimum
  quantity, one per tier) or use your volume-discount app.
  Free gifts: set up an automatic "Buy X get Y" discount per gift.
{%- endcomment -%}
{%- assign bs_v = product.selected_or_first_available_variant -%}
{%- assign bs_cmp_unit = bs_v.compare_at_price | default: bs_v.price -%}
{%- if bs_cmp_unit < bs_v.price -%}{%- assign bs_cmp_unit = bs_v.price -%}{%- endif -%}
<div class="bs-bb-{{ section.id }}" id="bs-bb-{{ section.id }}">
  {%- if section.settings.heading != blank -%}<p class="bs-h">{{ section.settings.heading }}</p>{%- endif -%}
  {%- if section.settings.subheading != blank -%}<p class="bs-sh">{{ section.settings.subheading }}</p>{%- endif -%}

  {%- form 'product', product -%}
    <input type="hidden" name="id" value="{{ bs_v.id }}">
    <div class="bs-tiers" role="radiogroup">
      {%- assign bs_i = 0 -%}
      {%- for block in section.blocks -%}
        {%- if block.type == 'tier' -%}
          {%- assign bs_i = bs_i | plus: 1 -%}
          {%- assign bs_q = block.settings.quantity -%}
          {%- assign bs_keep = 100 | minus: block.settings.discount -%}
          {%- assign bs_total = bs_v.price | times: bs_q | times: bs_keep | divided_by: 100 -%}
          {%- assign bs_cmp = bs_cmp_unit | times: bs_q -%}
          {%- assign bs_each = bs_total | divided_by: bs_q -%}
          <label class="bs-tier" {{ block.shopify_attributes }}>
            <input type="radio" name="quantity" value="{{ bs_q }}" data-total="{{ bs_total }}" data-compare="{{ bs_cmp }}"{% if bs_i == section.settings.selected %} checked{% endif %}>
            <span class="bs-radio" aria-hidden="true"></span>
            <span class="bs-main">
              <span class="bs-t">{{ block.settings.title }}</span>
              {%- if block.settings.caption != blank -%}
                <span class="bs-c">{{ block.settings.caption }}</span>
              {%- elsif bs_cmp > bs_total -%}
                <span class="bs-c is-save">You save {{ bs_cmp | minus: bs_total | money }}</span>
              {%- else -%}
                <span class="bs-c">Standard price</span>
              {%- endif -%}
            </span>
            <span class="bs-p">
              {%- if bs_cmp > bs_total -%}<s>{{ bs_cmp | money }}</s>{%- endif -%}<b>{{ bs_total | money }}</b>
              {%- if bs_q > 1 -%}<span class="bs-each">{{ bs_each | money }} each</span>{%- endif -%}
            </span>
            {%- if block.settings.discount > 0 or block.settings.badge != blank -%}
              <span class="bs-badges">
                {%- if block.settings.discount > 0 -%}<span class="bs-b bs-b1">Save {{ block.settings.discount }}%</span>{%- endif -%}
                {%- if block.settings.badge != blank -%}<span class="bs-b bs-b2">{{ block.settings.badge }}</span>{%- endif -%}
              </span>
            {%- endif -%}
          </label>
        {%- endif -%}
      {%- endfor -%}
    </div>

    {%- if section.settings.show_gifts -%}
      <div class="bs-gifts">
        <div class="bs-gh">
          <p class="bs-gt">{{ section.settings.gift_title }}</p>
          <p class="bs-gm" data-gift-msg></p>
        </div>
        <div class="bs-track">
          <div class="bs-line" data-gift-line><div class="bs-line-fill" data-gift-fill></div></div>
          <div class="bs-nodes">
            {%- for block in section.blocks -%}
              {%- if block.type == 'gift' -%}
                <div class="bs-node" data-unlock="{{ block.settings.unlock_qty }}" data-name="{{ block.settings.name | escape }}" {{ block.shopify_attributes }}>
                  <span class="bs-dot">
                    {%- if block.settings.image -%}{{ block.settings.image | image_url: width: 96 | image_tag: alt: block.settings.name }}{%- else -%}{{ block.settings.icon }}{%- endif -%}
                    <i class="bs-ok" aria-hidden="true"><svg width="9" height="9" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 6.3l2.3 2.2 4.7-5"/></svg></i>
                  </span>
                  <span class="bs-nn">{{ block.settings.name }}</span>
                </div>
              {%- endif -%}
            {%- endfor -%}
          </div>
        </div>
      </div>
    {%- endif -%}

    <button type="submit" name="add" class="bs-atc"{% unless bs_v.available %} disabled{% endunless %}>
      <span>{{ section.settings.button_text }}</span>
      <span><span class="bs-dash">—</span> <s data-cmp></s> <span data-total></span></span>
    </button>
  {%- endform -%}

  {%- if section.settings.trust_left != blank or section.settings.trust_right != blank -%}
    <p class="bs-trust">
      {{ section.settings.trust_left }}
      {%- if section.settings.trust_left != blank and section.settings.trust_right != blank -%}<span aria-hidden="true" style="font-size:8px">◆</span>{%- endif -%}
      {{ section.settings.trust_right }}
    </p>
  {%- endif -%}
</div>
<script>
  (function () {
    var root = document.getElementById('bs-bb-{{ section.id }}');
    if (!root) return;
    var fmt = String({{ shop.money_format | json }}).replace(/<[^>]*>/g, '');
    function money(cents) {
      var open = '{' + '{', close = '}' + '}';
      var a = fmt.indexOf(open), b = fmt.indexOf(close, a);
      var v = cents / 100;
      if (a < 0 || b < 0) return v.toFixed(2);
      var key = fmt.slice(a + 2, b).trim();
      var s = key.indexOf('no_decimals') > -1 ? String(Math.round(v)) : v.toFixed(2);
      if (key.indexOf('comma') > -1) s = s.replace('.', ',');
      return fmt.slice(0, a) + s + fmt.slice(b + 2);
    }
    var radios = root.querySelectorAll('input[name="quantity"]');
    var nodes = root.querySelectorAll('.bs-node');
    var line = root.querySelector('[data-gift-line]');
    var fill = root.querySelector('[data-gift-fill]');
    var msg = root.querySelector('[data-gift-msg]');
    var total = root.querySelector('[data-total]');
    var cmp = root.querySelector('[data-cmp]');
    if (line && nodes.length) {
      var edge = 50 / nodes.length + '%';
      line.style.left = edge;
      line.style.right = edge;
    }
    function update() {
      var r = root.querySelector('input[name="quantity"]:checked') || radios[0];
      if (!r) return;
      var q = parseInt(r.value, 10), t = +r.dataset.total, c = +r.dataset.compare;
      if (total) total.textContent = money(t);
      if (cmp) cmp.textContent = c > t ? money(c) : '';
      var last = -1, next = null;
      nodes.forEach(function (n, i) {
        var u = parseInt(n.dataset.unlock, 10) || 1;
        var on = q >= u;
        n.classList.toggle('is-on', on);
        if (on) last = i;
        else if (!next) next = { name: n.dataset.name, u: u };
      });
      if (fill) fill.style.width = (nodes.length > 1 ? Math.max(0, last) / (nodes.length - 1) * 100 : (last >= 0 ? 100 : 0)) + '%';
      if (msg) msg.textContent = next ? 'Buy ' + next.u + ' to unlock a free ' + next.name : 'All free gifts unlocked';
    }
    radios.forEach(function (r) { r.addEventListener('change', update); });
    update();
  })();
</script>`;

  const tiers = list(config, "tiers");
  const gifts = list(config, "gifts");

  const schema = buildSchema({
    name: "Bundle Buy Box",
    settings: [
      { type: "text", id: "heading", label: "Heading", default: str(config, "heading") },
      { type: "text", id: "subheading", label: "Subheading", default: str(config, "subheading") },
      { type: "range", id: "selected", label: "Preselected bundle", min: 1, max: 5, step: 1, default: Math.max(1, Math.min(5, num(config, "selected", 2))) },
      { type: "header", content: "Free gifts" },
      { type: "checkbox", id: "show_gifts", label: "Show free gift track", default: bool(config, "showGifts") },
      { type: "text", id: "gift_title", label: "Gift title", default: str(config, "giftTitle") },
      { type: "header", content: "Button & trust" },
      { type: "text", id: "button_text", label: "Button text", default: str(config, "buttonText") },
      { type: "text", id: "trust_left", label: "Trust text (left)", default: str(config, "trustLeft") },
      { type: "text", id: "trust_right", label: "Trust text (right)", default: str(config, "trustRight") },
      { type: "header", content: "Style" },
      { type: "color", id: "accent", label: "Accent", default: str(config, "accent") },
      { type: "color", id: "accent_text", label: "Accent text", default: str(config, "accentText") },
      { type: "color", id: "badge_bg", label: "Secondary badge", default: str(config, "badgeBg") },
      { type: "color", id: "bg", label: "Background", default: str(config, "bg") },
      { type: "color", id: "card", label: "Cards", default: str(config, "card") },
      { type: "color", id: "text_color", label: "Text", default: str(config, "textColor") },
      { type: "color", id: "muted", label: "Muted text", default: str(config, "muted") },
      { type: "range", id: "radius", label: "Corner radius", min: 4, max: 28, step: 2, unit: "px", default: num(config, "radius") },
    ],
    blocks: [
      {
        type: "tier",
        name: "Bundle tier",
        settings: [
          { type: "text", id: "title", label: "Title" },
          { type: "range", id: "quantity", label: "Quantity", min: 1, max: 10, step: 1, default: 1 },
          { type: "range", id: "discount", label: "Discount", min: 0, max: 60, step: 1, unit: "%", default: 0 },
          { type: "text", id: "badge", label: "Badge" },
          { type: "text", id: "caption", label: "Caption (leave empty for “You save …”)" },
        ],
      },
      {
        type: "gift",
        name: "Free gift",
        settings: [
          { type: "text", id: "name", label: "Name" },
          { type: "range", id: "unlock_qty", label: "Unlocks at quantity", min: 1, max: 10, step: 1, default: 2 },
          { type: "image_picker", id: "image", label: "Image" },
          { type: "html", id: "icon", label: "Icon (if no image)" },
        ],
      },
    ],
    maxBlocks: 12,
    presetBlocks: [
      ...tiers.map((t) => ({
        type: "tier",
        settings: {
          title: esc(t.title ?? ""),
          quantity: Math.max(1, Math.min(10, Math.round(toNum(t.qty, 1)))),
          discount: Math.max(0, Math.min(60, Math.round(toNum(t.discount)))),
          badge: esc(t.badge ?? ""),
          caption: esc(t.caption ?? ""),
        },
      })),
      ...gifts.map((g) => ({
        type: "gift",
        settings: {
          name: esc(g.name ?? ""),
          unlock_qty: Math.max(1, Math.min(10, Math.round(toNum(g.unlock, 2)))),
          icon: iconMarkup(g.icon || "pack:gift", 20),
        },
      })),
    ],
  });

  return section({ style, markup, schema });
}

export const bundleBuyBox: Tweak = {
  slug: "bundle-buy-box",
  name: "Bundle Buy Box",
  tagline: "Buy 1, 2 or 3 with savings badges and free gifts that unlock as the bundle grows.",
  description:
    "A quantity-break offer for the product page. Shoppers pick a bundle, see exactly what they save and watch free gifts unlock on a progress track. The add-to-cart button updates with the bundle price. The proven way to lift AOV without discounting your single unit.",
  category: "product-page",
  tier: "paid",
  price: 39,
  tint: "#eef0f4",
  Preview,
  generateLiquid,
  defaults,
  fields: [
    { key: "heading", label: "Heading", type: "text", group: "Content" },
    { key: "subheading", label: "Subheading", type: "text", group: "Content" },
    { key: "basePrice", label: "Preview unit price", type: "text", group: "Content", hint: "Editor preview only; your store uses the real product price" },
    { key: "compareAt", label: "Preview compare-at", type: "text", group: "Content" },
    { key: "currency", label: "Currency symbol", type: "text", group: "Content" },
    {
      key: "tiers", label: "Bundles", type: "list", group: "Bundles",
      hint: "Quantity and discount are numbers. Leave caption empty to show the savings",
      itemFields: [
        { key: "title", label: "Title", type: "text" },
        { key: "qty", label: "Quantity", type: "text" },
        { key: "discount", label: "Discount %", type: "text" },
        { key: "badge", label: "Badge", type: "text" },
        { key: "caption", label: "Caption", type: "text" },
      ],
      newItem: { title: "Buy 4", qty: "4", discount: "30", badge: "", caption: "" }, addLabel: "Add bundle", max: 5,
    },
    { key: "selected", label: "Preselected bundle", type: "slider", group: "Bundles", min: 1, max: 5, step: 1 },
    { key: "showGifts", label: "Show free gift track", type: "toggle", group: "Free gifts" },
    { key: "giftTitle", label: "Title", type: "text", group: "Free gifts" },
    {
      key: "gifts", label: "Gifts", type: "list", group: "Free gifts",
      hint: "Unlock = the bundle quantity that earns the gift",
      itemFields: [
        { key: "name", label: "Name", type: "text" },
        { key: "unlock", label: "Unlock at", type: "text" },
        { key: "icon", label: "Icon", type: "icon" },
      ],
      newItem: { name: "Travel Pouch", unlock: "3", icon: "pack:gift" }, addLabel: "Add gift", max: 5,
    },
    { key: "buttonText", label: "Button text", type: "text", group: "Button & trust" },
    { key: "trustLeft", label: "Trust text (left)", type: "text", group: "Button & trust" },
    { key: "trustRight", label: "Trust text (right)", type: "text", group: "Button & trust" },
    fontField("Typography"),
    { key: "radius", label: "Corner radius", type: "slider", group: "Layout", min: 4, max: 28, step: 2, unit: "px" },
    { key: "accent", label: "Accent", type: "color", group: "Colors" },
    { key: "accentText", label: "Accent text", type: "color", group: "Colors" },
    { key: "badgeBg", label: "Secondary badge", type: "color", group: "Colors" },
    { key: "bg", label: "Background", type: "color", group: "Colors" },
    { key: "card", label: "Cards", type: "color", group: "Colors" },
    { key: "textColor", label: "Text", type: "color", group: "Colors" },
    { key: "muted", label: "Muted text", type: "color", group: "Colors" },
  ],
};
