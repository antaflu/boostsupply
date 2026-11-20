"use client";

import { useEffect, useState } from "react";
import type { Tweak, TweakConfig } from "../types";
import { str, num, bool, list, fontStack, esc } from "../cfg";
import { fontField } from "../fields";
import { buildSchema, section, fontFaceFor } from "../liquid";
import { ProductArt, money, toNum, type ArtKind } from "./product-art";

/* ============================================================
   Shade Card Grid
   Product cards that sell right from the grid: a badge, a row
   of shade swatches (4 shown, "+N" expands the rest), size chips
   that change the price and an "Add to bag" button on the card.
   ============================================================ */

const MONO = "ui-monospace, 'SF Mono', Menlo, monospace";
const EASE = "cubic-bezier(.22,1,.36,1)";
const ART: ArtKind[] = ["bottle", "jar", "tube", "tube"];
const VISIBLE = 4;

const defaults: TweakConfig = {
  eyebrow: "Shop by shade",
  heading: "Find your shade",
  subheading: "Sheer, buildable colour with a shade for every skin tone.",
  linkText: "Shop all",
  currency: "$",
  products: [
    { name: "Glow Drops", detail: "Liquid highlighter", image: "/mockups/set-serum.jpg", badge: "Best seller", shades: "Pearl:#EFE4D8, Opal:#EBC9C6, Gold:#D8B06C, Bronze:#AE774C, Rose Gold:#D59A88", sizes: "8 ml:16, 50 ml:30, 100 ml:48" },
    { name: "Skin Veil", detail: "Sheer skin tint", image: "/mockups/set-cream.jpg", badge: "New", shades: "F1:#F4DECB, F2:#EED0B7, L1:#E4BF9E, L2:#D9AE8A, M1:#C99A72, M2:#B8845E, D1:#9A6A48, D2:#7E5236, R1:#5F3B26, R2:#45291A", sizes: "8 ml:12, 50 ml:28, 100 ml:42" },
    { name: "Petal Balm", detail: "Tinted lip balm", image: "/mockups/set-balm.jpg", badge: "", shades: "Clear:#F3E8E3, Rose:#E7A3A8, Berry:#A8445A, Coral:#EC8A73, Cherry:#C1303F, Mauve:#B98095", sizes: "8 ml:12, 15 ml:18" },
    { name: "Glaze Tint", detail: "Lip and cheek tint", image: "/mockups/award-lip.jpg", badge: "Best seller", shades: "Peony:#E58FA0, Guava:#F07D6A, Fig:#8C3F4F, Toffee:#B9775A, Plum:#7A3550, Nude:#D7A08F, Cocoa:#6E4334", sizes: "8 ml:18" },
  ],
  shadeLabel: "Shade",
  addText: "Add to bag",
  addedText: "Added ✓",
  columns: "4",
  showBadges: true,
  sizeOption: "Size",
  bg: "#FFFFFF",
  textColor: "#000000",
  pink: "#FBD1DA",
  accent: "#0600FF",
  tile: "#F7F7F7",
  muted: "#6B6B6B",
  buttonBg: "#000000",
  buttonText2: "#FFFFFF",
  font: "system",
  radius: 14,
};

/** Hex colour + alpha byte. */
const tint = (hex: string, a: number) =>
  /^#[0-9a-f]{6}$/i.test(hex) ? hex + Math.round(a * 255).toString(16).padStart(2, "0") : hex;

/** "Name:#hex, Name:#hex" → pairs (splits on the last colon). */
const pairs = (s: string) =>
  String(s ?? "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean)
    .map((x) => {
      const i = x.lastIndexOf(":");
      return i > 0 ? { a: x.slice(0, i).trim(), b: x.slice(i + 1).trim() } : { a: x, b: "" };
    });

/** A swatch colour that is safe to drop into CSS. */
const safeHex = (s: string) => (/^#[0-9a-f]{3,8}$/i.test(s) ? s : "#D9D4CF");

const isNew = (badge: string) => /new/i.test(badge);

function Preview({ config }: { config: TweakConfig }) {
  const cur = str(config, "currency", "$");
  const bg = str(config, "bg", "#FFFFFF");
  const text = str(config, "textColor", "#000000");
  const pink = str(config, "pink", "#FBD1DA");
  const accent = str(config, "accent", "#0600FF");
  const tile = str(config, "tile", "#F7F7F7");
  const muted = str(config, "muted", "#6B6B6B");
  const btnBg = str(config, "buttonBg", "#000000");
  const btnText = str(config, "buttonText2", "#FFFFFF");
  const radius = num(config, "radius", 14);
  const cols = str(config, "columns", "4") === "3" ? 3 : 4;
  const showBadges = bool(config, "showBadges", true);

  const products = list(config, "products").map((p, i) => {
    const sizes = pairs(p.sizes ?? "").map((z) => ({ label: z.a, price: toNum(z.b) }));
    return {
      name: p.name ?? "",
      detail: p.detail ?? "",
      image: (p.image ?? "").trim(),
      badge: showBadges ? (p.badge ?? "").trim() : "",
      shades: pairs(p.shades ?? "").map((s) => ({ name: s.a, hex: safeHex(s.b) })),
      sizes: sizes.length ? sizes : [{ label: "", price: 0 }],
      art: ART[i % ART.length],
    };
  });

  const [shade, setShade] = useState<Record<number, number>>({});
  const [size, setSize] = useState<Record<number, number>>({});
  const [open, setOpen] = useState<number[]>([]);
  const [added, setAdded] = useState<number | null>(null);

  useEffect(() => {
    if (added === null) return;
    const t = setTimeout(() => setAdded(null), 1600);
    return () => clearTimeout(t);
  }, [added]);

  const gridCols = cols === 3 ? "@min-[760px]:grid-cols-3" : "@min-[760px]:grid-cols-4";

  return (
    <div className="@container w-full" style={{ background: bg, color: text, fontFamily: fontStack(str(config, "font", "system")) }}>
      <div className="mx-auto w-full max-w-[1200px] px-4 pb-8 pt-6 @min-[640px]:px-8 @min-[640px]:pb-12 @min-[640px]:pt-10">
        {/* Header */}
        <div className="flex items-end justify-between gap-4">
          <div className="min-w-0">
            {str(config, "eyebrow") && (
              <p className="text-[10.5px] uppercase tracking-[0.12em]" style={{ fontFamily: MONO, color: accent }}>
                {str(config, "eyebrow")}
              </p>
            )}
            <h3 className="mt-2 text-[28px] font-medium leading-[1.05] tracking-[-0.03em] @min-[640px]:text-[38px]">
              {str(config, "heading")}
            </h3>
            {str(config, "subheading") && (
              <p className="mt-2 max-w-[460px] text-[14px] leading-relaxed" style={{ color: muted }}>
                {str(config, "subheading")}
              </p>
            )}
          </div>
          {str(config, "linkText") && (
            <a
              href="#"
              onClick={(e) => e.preventDefault()}
              className="hidden shrink-0 pb-1 text-[13.5px] font-medium underline underline-offset-4 transition-opacity hover:opacity-60 @min-[520px]:block"
            >
              {str(config, "linkText")}
            </a>
          )}
        </div>

        {/* Cards */}
        <div className={`mt-6 grid grid-cols-2 gap-x-3 gap-y-7 @min-[640px]:gap-x-4 ${gridCols}`}>
          {products.map((p, i) => {
            const s = Math.min(shade[i] ?? 0, Math.max(0, p.shades.length - 1));
            const z = Math.min(size[i] ?? 0, p.sizes.length - 1);
            const price = p.sizes[z]?.price ?? 0;
            const isOpen = open.includes(i);
            const extra = Math.max(0, p.shades.length - VISIBLE);
            const shown = isOpen ? p.shades : p.shades.slice(0, VISIBLE);
            const cur2 = p.shades[s];
            const done = added === i;
            return (
              <div key={i} className="flex min-w-0 flex-col">
                <div className="group relative aspect-[4/5] w-full overflow-hidden" style={{ background: tile, borderRadius: radius }}>
                  {p.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.image}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-[cubic-bezier(.22,1,.36,1)] group-hover:scale-[1.04]"
                    />
                  ) : (
                    <span className="absolute inset-0 grid place-items-center">
                      <ProductArt kind={p.art} tone={cur2?.hex ?? "#F39AB0"} size={120} tile="transparent" />
                    </span>
                  )}
                  {p.badge && (
                    <span
                      className="absolute left-2 top-2 rounded-full px-2 py-[3px] text-[9.5px] uppercase tracking-[0.08em]"
                      style={{
                        fontFamily: MONO,
                        background: isNew(p.badge) ? accent : pink,
                        color: isNew(p.badge) ? "#FFFFFF" : text,
                      }}
                    >
                      {p.badge}
                    </span>
                  )}
                  {cur2 && (
                    <span
                      key={`${i}-${s}`}
                      className="bs-swap absolute bottom-2 left-2 flex max-w-[calc(100%-16px)] items-center gap-1.5 rounded-full bg-white/90 py-1 pl-1 pr-2.5 text-[11px] font-medium shadow-[0_2px_10px_-4px_rgba(0,0,0,0.25)] backdrop-blur"
                    >
                      <span className="h-4 w-4 shrink-0 rounded-full" style={{ background: cur2.hex, boxShadow: "inset 0 0 0 1px rgba(0,0,0,.08)" }} />
                      <span className="truncate">{cur2.name}</span>
                    </span>
                  )}
                </div>

                <div className="mt-2.5 flex items-baseline justify-between gap-2">
                  <p className="truncate text-[14.5px] font-medium">{p.name}</p>
                  <p key={`${i}-${z}`} className="bs-swap shrink-0 text-[13.5px] tabular-nums">
                    {money(price, cur)}
                  </p>
                </div>
                <p className="truncate text-[12px]" style={{ color: muted }}>
                  {p.detail}
                </p>

                {/* Shades */}
                {p.shades.length > 0 && (
                  <div className="mt-2.5">
                    <p className="text-[9.5px] uppercase tracking-[0.08em]" style={{ fontFamily: MONO, color: muted }}>
                      {str(config, "shadeLabel")} · <span style={{ color: text }}>{cur2?.name}</span>
                    </p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-[7px]">
                      {shown.map((sh, j) => {
                        const on = j === s;
                        return (
                          <button
                            key={j}
                            type="button"
                            aria-label={sh.name}
                            aria-pressed={on}
                            title={sh.name}
                            onClick={() => setShade((m) => ({ ...m, [i]: j }))}
                            className={`h-[22px] w-[22px] rounded-full ${j >= VISIBLE ? "bs-rise" : ""}`}
                            style={
                              {
                                background: sh.hex,
                                boxShadow: on
                                  ? `0 0 0 2px ${bg}, 0 0 0 3.5px ${text}`
                                  : `inset 0 0 0 1px ${tint("#000000", 0.08)}`,
                                transform: on ? "scale(.92)" : "none",
                                transition: `box-shadow 250ms ${EASE}, transform 300ms ${EASE}`,
                                "--i": j - VISIBLE,
                              } as React.CSSProperties
                            }
                          />
                        );
                      })}
                      {extra > 0 && (
                        <button
                          type="button"
                          aria-expanded={isOpen}
                          onClick={() => setOpen((o) => (o.includes(i) ? o.filter((x) => x !== i) : [...o, i]))}
                          className="h-[22px] rounded-full px-2 text-[10.5px] tabular-nums transition-colors hover:bg-black/[0.05]"
                          style={{ fontFamily: MONO, boxShadow: `inset 0 0 0 1px ${tint(text, 0.16)}` }}
                        >
                          {isOpen ? "Less" : `+${extra}`}
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Sizes */}
                {p.sizes.length > 1 && (
                  <div className="mt-2.5 flex flex-wrap gap-1 @min-[640px]:gap-1.5">
                    {p.sizes.map((sz, j) => {
                      const on = j === z;
                      return (
                        <button
                          key={j}
                          type="button"
                          aria-pressed={on}
                          onClick={() => setSize((m) => ({ ...m, [i]: j }))}
                          className="h-[26px] rounded-full px-2 text-[10px] uppercase tabular-nums @min-[640px]:h-7 @min-[640px]:px-2.5 @min-[640px]:text-[10.5px]"
                          style={{
                            fontFamily: MONO,
                            background: on ? text : "transparent",
                            color: on ? bg : text,
                            boxShadow: on ? "none" : `inset 0 0 0 1px ${tint(text, 0.16)}`,
                            transition: `background-color 200ms ${EASE}, color 200ms ${EASE}`,
                          }}
                        >
                          {sz.label}
                        </button>
                      );
                    })}
                  </div>
                )}

                <div className="mt-auto pt-3.5">
                <button
                  type="button"
                  onClick={() => setAdded(i)}
                  className="flex h-10 w-full items-center justify-center rounded-full text-[13px] font-medium hover:brightness-125 active:scale-[0.98]"
                  style={{
                    background: done ? accent : btnBg,
                    color: btnText,
                    transition: `background-color 300ms ${EASE}, filter 200ms ease, scale 200ms ease`,
                  }}
                >
                  <span key={done ? "y" : "n"} className="bs-swap whitespace-nowrap">
                    {done ? str(config, "addedText") : str(config, "addText")}
                  </span>
                </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function generateLiquid(config: TweakConfig): string {
  const { face, family } = fontFaceFor(str(config, "font", "system"));
  const S = ".bs-scg-{{ section.id }}";
  const r = "{{ section.settings.radius }}px";
  const mono = "ui-monospace, 'SF Mono', Menlo, monospace";
  const ease = "cubic-bezier(.22,1,.36,1)";
  const radius = Math.max(0, Math.min(24, Math.round(num(config, "radius", 14) / 2) * 2));
  const count = Math.max(2, Math.min(12, list(config, "products").length || 4));

  /* colour map: every shade name from the editor, once */
  const seen = new Set<string>();
  const swatches: { name: string; color: string }[] = [];
  list(config, "products").forEach((p) =>
    pairs(p.shades ?? "").forEach((s) => {
      const k = s.a.toLowerCase();
      if (!s.a || seen.has(k) || swatches.length >= 48) return;
      seen.add(k);
      swatches.push({ name: s.a, color: /^#[0-9a-f]{6}$/i.test(s.b) ? s.b : "#D9D4CF" });
    }),
  );

  const style = `<style>
${face ? face + "\n" : ""}  ${S} { container-type: inline-size; background: {{ section.settings.bg }}; color: {{ section.settings.text_color }}; font-family: ${family}; }
  ${S} * { box-sizing: border-box; }
  ${S} p, ${S} h2 { margin: 0; }
  ${S} a { color: inherit; }
  ${S} button { font: inherit; color: inherit; }
  ${S} form { margin: 0; }
  ${S} .bs-wrap { max-width: 1200px; margin: 0 auto; padding: 24px 16px 32px; }
  ${S} .bs-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; }
  ${S} .bs-eyebrow { font-family: ${mono}; font-size: 10.5px; text-transform: uppercase; letter-spacing: .12em; color: {{ section.settings.accent }}; }
  ${S} .bs-h { margin-top: 8px; font-size: 28px; font-weight: 500; line-height: 1.05; letter-spacing: -.03em; }
  ${S} .bs-sub { margin-top: 8px; max-width: 460px; font-size: 14px; line-height: 1.6; color: {{ section.settings.muted }}; }
  ${S} .bs-all { display: none; flex-shrink: 0; padding-bottom: 4px; font-size: 13.5px; font-weight: 500; text-underline-offset: 4px; }
  ${S} .bs-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); column-gap: 12px; row-gap: 28px; margin-top: 24px; }
  ${S} .bs-card { display: flex; flex-direction: column; min-width: 0; }
  ${S} .bs-tile { position: relative; display: block; aspect-ratio: 4 / 5; overflow: hidden; border-radius: ${r}; background: {{ section.settings.tile }}; }
  ${S} .bs-tile img, ${S} .bs-tile .bs-ph { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; transition: transform .7s ${ease}; }
  ${S} .bs-tile:hover img { transform: scale(1.04); }
  ${S} .bs-badge { position: absolute; left: 8px; top: 8px; z-index: 1; padding: 3px 8px; border-radius: 99px; font-family: ${mono}; font-size: 9.5px; text-transform: uppercase; letter-spacing: .08em;
    background: {{ section.settings.pink }}; color: {{ section.settings.text_color }}; }
  ${S} .bs-badge.is-new { background: {{ section.settings.accent }}; color: #fff; }
  ${S} .bs-chosen { position: absolute; left: 8px; bottom: 8px; z-index: 1; display: flex; align-items: center; gap: 6px; max-width: calc(100% - 16px); padding: 4px 10px 4px 4px;
    border-radius: 99px; background: rgba(255,255,255,.9); font-size: 11px; font-weight: 500; box-shadow: 0 2px 10px -4px rgba(0,0,0,.25); }
  ${S} .bs-chosen i { width: 16px; height: 16px; flex-shrink: 0; border-radius: 99px; background: var(--c); box-shadow: inset 0 0 0 1px rgba(0,0,0,.08); }
  ${S} .bs-chosen span { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  ${S} .bs-info { margin-top: 10px; display: flex; align-items: baseline; justify-content: space-between; gap: 8px; }
  ${S} .bs-name { min-width: 0; font-size: 14.5px; font-weight: 500; text-decoration: none; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  ${S} .bs-price { flex-shrink: 0; font-size: 13.5px; font-variant-numeric: tabular-nums; }
  ${S} .bs-price s { margin-right: 4px; color: {{ section.settings.muted }}; }
  ${S} .bs-type { font-size: 12px; color: {{ section.settings.muted }}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  ${S} .bs-shade-l { margin-top: 10px; font-family: ${mono}; font-size: 9.5px; text-transform: uppercase; letter-spacing: .08em; color: {{ section.settings.muted }}; }
  ${S} .bs-shade-l b { font-weight: 400; color: {{ section.settings.text_color }}; }
  ${S} .bs-sws { display: flex; flex-wrap: wrap; align-items: center; gap: 7px; margin-top: 6px; }
  ${S} .bs-sw { width: 22px; height: 22px; padding: 0; border: 0; border-radius: 99px; cursor: pointer; background: var(--c);
    box-shadow: inset 0 0 0 1px rgba(0,0,0,.08); transition: box-shadow .25s ${ease}, transform .3s ${ease}; }
  ${S} .bs-sw[aria-pressed="true"] { transform: scale(.92); box-shadow: 0 0 0 2px {{ section.settings.bg }}, 0 0 0 3.5px {{ section.settings.text_color }}; }
  ${S} .bs-sw.is-x { opacity: .35; }
  ${S} .bs-card:not(.is-open) .bs-sw.is-extra { display: none; }
  ${S} .bs-card.is-open .bs-sw.is-extra { animation: bs-scg-in .42s ${ease} both; }
  @keyframes bs-scg-in { from { opacity: 0; transform: translateY(6px); } }
  ${S} .bs-more { height: 22px; padding: 0 8px; border: 0; border-radius: 99px; cursor: pointer; background: none; font-family: ${mono}; font-size: 10.5px; box-shadow: inset 0 0 0 1px rgba(0,0,0,.16); }
  ${S} .bs-more:hover { background: rgba(0,0,0,.05); }
  ${S} .bs-more .bs-less, ${S} .bs-card.is-open .bs-more .bs-n { display: none; }
  ${S} .bs-card.is-open .bs-more .bs-less { display: inline; }
  ${S} .bs-sizes { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
  ${S} .bs-size { height: 28px; padding: 0 10px; border: 0; border-radius: 99px; cursor: pointer; background: transparent; font-family: ${mono}; font-size: 10.5px; text-transform: uppercase;
    box-shadow: inset 0 0 0 1px rgba(0,0,0,.16); transition: background-color .2s, color .2s; }
  ${S} .bs-size[aria-pressed="true"] { background: {{ section.settings.text_color }}; color: {{ section.settings.bg }}; box-shadow: none; }
  ${S} .bs-form { margin-top: auto; padding-top: 14px; }
  ${S} .bs-add { width: 100%; height: 40px; border: 0; border-radius: 99px; cursor: pointer; font-size: 13px; font-weight: 500;
    background: {{ section.settings.button_bg }}; color: {{ section.settings.button_fg }}; transition: background-color .3s ${ease}, filter .2s, transform .2s; }
  ${S} .bs-add:hover:not(:disabled) { filter: brightness(1.25); }
  ${S} .bs-add:active:not(:disabled) { transform: scale(.98); }
  ${S} .bs-add:disabled { opacity: .45; cursor: not-allowed; }
  ${S} .bs-add.is-done { background: {{ section.settings.accent }}; }
  ${S} .bs-empty { grid-column: 1 / -1; padding: 32px 0; font-size: 14px; color: {{ section.settings.muted }}; }
  @container (min-width: 520px) { ${S} .bs-all { display: block; } }
  @container (min-width: 640px) {
    ${S} .bs-wrap { padding: 40px 32px 48px; }
    ${S} .bs-h { font-size: 38px; }
    ${S} .bs-grid { column-gap: 16px; }
  }
  @container (min-width: 760px) { ${S} .bs-grid { grid-template-columns: repeat({{ section.settings.columns }}, minmax(0, 1fr)); } }
</style>`;

  const markup = `{%- comment -%}
  Shade Card Grid by boost.supply. Add it to your homepage or a landing page.
  - Pick a collection; the grid shows its first products.
  - Swatches come from each product's FIRST option (e.g. Shade or Colour).
    Map option values to colours with "Swatch colour" blocks: the block name
    must match the value (not case sensitive). Unmapped values fall back to
    a neutral swatch.
  - Size chips come from the option named under "Size option name" and
    change the price. Sold-out combinations disable the button.
  - Badges: tag a product "badge:Best seller" or "badge:New".
{%- endcomment -%}
{%- assign bs_col = section.settings.collection -%}
{%- assign bs_size_name = section.settings.size_option | downcase | strip -%}
<div class="bs-scg-{{ section.id }}" id="bs-scg-{{ section.id }}" data-add-url="{{ routes.cart_add_url }}" data-added="{{ section.settings.added_text | escape }}">
  <div class="bs-wrap">
    <div class="bs-head">
      <div>
        {%- if section.settings.eyebrow != blank -%}<p class="bs-eyebrow">{{ section.settings.eyebrow }}</p>{%- endif -%}
        <h2 class="bs-h">{{ section.settings.heading }}</h2>
        {%- if section.settings.subheading != blank -%}<p class="bs-sub">{{ section.settings.subheading }}</p>{%- endif -%}
      </div>
      {%- if section.settings.link_text != blank -%}
        <a class="bs-all" href="{% if bs_col != blank %}{{ bs_col.url }}{% else %}{{ routes.all_products_collection_url }}{% endif %}">{{ section.settings.link_text }}</a>
      {%- endif -%}
    </div>

    <div class="bs-grid">
      {%- if bs_col != blank -%}
      {%- for bs_p in bs_col.products limit: section.settings.products_to_show -%}
        {%- assign bs_v = bs_p.selected_or_first_available_variant -%}
        {%- assign bs_size_idx = -1 -%}
        {%- for bs_o in bs_p.options_with_values -%}
          {%- assign bs_on = bs_o.name | downcase | strip -%}
          {%- if bs_on == bs_size_name -%}{%- assign bs_size_idx = forloop.index0 -%}{%- endif -%}
        {%- endfor -%}
        {%- assign bs_shades = false -%}
        {%- unless bs_p.has_only_default_variant or bs_size_idx == 0 -%}{%- assign bs_shades = true -%}{%- endunless -%}
        {%- assign bs_first = bs_p.options_with_values.first -%}
        {%- assign bs_badge = '' -%}
        {%- for bs_tag in bs_p.tags -%}
          {%- assign bs_tag_lc = bs_tag | downcase -%}
          {%- if bs_tag_lc contains 'badge:' -%}{%- assign bs_badge = bs_tag | split: ':' | last | strip -%}{%- endif -%}
        {%- endfor -%}
        {%- assign bs_badge_lc = bs_badge | downcase -%}
        <div class="bs-card" data-card>
          <div hidden>
            {%- for bs_var in bs_p.variants -%}
              <i data-v="{{ bs_var.id }}" data-o="{{ bs_var.options | join: '|' | escape }}" data-p="{{ bs_var.price }}" data-c="{{ bs_var.compare_at_price | default: 0 }}" data-a="{{ bs_var.available }}"{% if bs_var.featured_image %} data-img="{{ bs_var.featured_image | image_url: width: 700 }}"{% endif %}></i>
            {%- endfor -%}
          </div>
          <a class="bs-tile" href="{{ bs_p.url }}">
            {%- if bs_p.featured_image -%}
              {{ bs_p.featured_image | image_url: width: 700 | image_tag: loading: 'lazy', alt: bs_p.title, sizes: '(min-width: 990px) 25vw, 50vw' }}
            {%- else -%}
              {{ 'product-1' | placeholder_svg_tag: 'bs-ph' }}
            {%- endif -%}
            {%- if section.settings.show_badges and bs_badge != '' -%}<span class="bs-badge{% if bs_badge_lc contains 'new' %} is-new{% endif %}">{{ bs_badge }}</span>{%- endif -%}
            {%- if bs_shades -%}
              {%- assign bs_cur = bs_v.option1 -%}
              {%- assign bs_cur_lc = bs_cur | downcase | strip -%}
              {%- assign bs_cur_hex = '#d9d4cf' -%}
              {%- for block in section.blocks -%}
                {%- assign bs_bn = block.settings.name | downcase | strip -%}
                {%- if bs_bn == bs_cur_lc -%}{%- assign bs_cur_hex = block.settings.color -%}{%- endif -%}
              {%- endfor -%}
              <span class="bs-chosen" data-chosen><i style="--c: {{ bs_cur_hex }}"></i><span>{{ bs_cur }}</span></span>
            {%- endif -%}
          </a>
          <div class="bs-info">
            <a class="bs-name" href="{{ bs_p.url }}">{{ bs_p.title }}</a>
            <span class="bs-price" data-price>{%- if bs_v.compare_at_price > bs_v.price -%}<s>{{ bs_v.compare_at_price | money }}</s>{%- endif -%}{{ bs_v.price | money }}</span>
          </div>
          {%- if bs_p.type != blank -%}<p class="bs-type">{{ bs_p.type }}</p>{%- endif -%}

          {%- if bs_shades -%}
            <p class="bs-shade-l">{{ section.settings.shade_label }} · <b data-shade-name>{{ bs_v.option1 }}</b></p>
            <div class="bs-sws">
              {%- for bs_val in bs_first.values -%}
                {%- assign bs_val_lc = bs_val | downcase | strip -%}
                {%- assign bs_hex = '#d9d4cf' -%}
                {%- for block in section.blocks -%}
                  {%- assign bs_bn = block.settings.name | downcase | strip -%}
                  {%- if bs_bn == bs_val_lc -%}{%- assign bs_hex = block.settings.color -%}{%- endif -%}
                {%- endfor -%}
                <button type="button" class="bs-sw{% if forloop.index > 4 %} is-extra{% endif %}" data-opt="0" data-val="{{ bs_val | escape }}" style="--c: {{ bs_hex }}"
                  title="{{ bs_val | escape }}" aria-label="{{ bs_val | escape }}" aria-pressed="{% if bs_val == bs_v.option1 %}true{% else %}false{% endif %}"></button>
              {%- endfor -%}
              {%- if bs_first.values.size > 4 -%}
                <button type="button" class="bs-more" data-more aria-expanded="false"><span class="bs-n">+{{ bs_first.values.size | minus: 4 }}</span><span class="bs-less">Less</span></button>
              {%- endif -%}
            </div>
          {%- endif -%}

          {%- if bs_size_idx >= 0 -%}
            {%- assign bs_size_opt = bs_p.options_with_values[bs_size_idx] -%}
            {%- if bs_size_opt.values.size > 1 -%}
              <div class="bs-sizes">
                {%- for bs_val in bs_size_opt.values -%}
                  <button type="button" class="bs-size" data-opt="{{ bs_size_idx }}" data-val="{{ bs_val | escape }}" aria-pressed="{% if bs_val == bs_v.options[bs_size_idx] %}true{% else %}false{% endif %}">{{ bs_val }}</button>
                {%- endfor -%}
              </div>
            {%- endif -%}
          {%- endif -%}

          {%- form 'product', bs_p, class: 'bs-form' -%}
            <input type="hidden" name="id" value="{{ bs_v.id }}" data-id>
            <input type="hidden" name="quantity" value="1">
            <button type="submit" class="bs-add" data-add{% unless bs_v.available %} disabled{% endunless %}>{{ section.settings.add_text }}</button>
          {%- endform -%}
        </div>
      {%- endfor -%}
      {%- else -%}
        <p class="bs-empty">Pick a collection in the theme editor.</p>
      {%- endif -%}
    </div>
  </div>
</div>
<script>
  (function () {
    var root = document.getElementById('bs-scg-{{ section.id }}');
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
    var addedText = root.dataset.added;
    root.querySelectorAll('[data-card]').forEach(function (card) {
      var variants = [].slice.call(card.querySelectorAll('[data-v]')).map(function (el) {
        return { id: el.dataset.v, o: el.dataset.o.split('|'), p: +el.dataset.p, c: +el.dataset.c, a: el.dataset.a === 'true', img: el.dataset.img };
      });
      var sel = [];
      var idInput = card.querySelector('[data-id]');
      var first = variants.filter(function (v) { return v.id === (idInput && idInput.value); })[0] || variants[0];
      if (first) sel = first.o.slice();
      var btn = card.querySelector('[data-add]');
      var label = btn ? btn.textContent : '';
      var priceEl = card.querySelector('[data-price]');
      var nameEl = card.querySelector('[data-shade-name]');
      var chosen = card.querySelector('[data-chosen]');
      var img = card.querySelector('.bs-tile img');

      function sync() {
        var v = variants.filter(function (x) { return x.o.join('|') === sel.join('|'); })[0];
        card.querySelectorAll('[data-opt]').forEach(function (b) {
          b.setAttribute('aria-pressed', sel[+b.dataset.opt] === b.dataset.val ? 'true' : 'false');
        });
        if (nameEl) nameEl.textContent = sel[0];
        if (chosen) {
          var sw = card.querySelector('.bs-sw[aria-pressed="true"]');
          chosen.querySelector('span').textContent = sel[0];
          if (sw) chosen.querySelector('i').style.setProperty('--c', sw.style.getPropertyValue('--c'));
        }
        if (!v) { if (btn) btn.disabled = true; return; }
        if (idInput) idInput.value = v.id;
        if (btn) btn.disabled = !v.a;
        if (priceEl) priceEl.innerHTML = (v.c > v.p ? '<s>' + money(v.c) + '</s>' : '') + money(v.p);
        if (img && v.img) { img.removeAttribute('srcset'); img.src = v.img; }
      }

      card.querySelectorAll('[data-opt]').forEach(function (b) {
        b.addEventListener('click', function () { sel[+b.dataset.opt] = b.dataset.val; sync(); });
      });
      var more = card.querySelector('[data-more]');
      if (more) more.addEventListener('click', function () {
        var open = card.classList.toggle('is-open');
        more.setAttribute('aria-expanded', open ? 'true' : 'false');
      });

      var form = card.querySelector('form');
      if (form && btn) form.addEventListener('submit', function (e) {
        e.preventDefault();
        btn.disabled = true;
        fetch(root.dataset.addUrl + '.js', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ items: [{ id: +idInput.value, quantity: 1 }] })
        })
          .then(function (r) {
            if (!r.ok) throw new Error('cart');
            btn.classList.add('is-done');
            btn.textContent = addedText;
            document.dispatchEvent(new CustomEvent('cart:refresh', { bubbles: true }));
            setTimeout(function () { btn.classList.remove('is-done'); btn.textContent = label; btn.disabled = false; }, 1600);
          })
          .catch(function () { form.submit(); });
      });
      sync();
    });
  })();
</script>`;

  const schema = buildSchema({
    name: "Shade Card Grid",
    settings: [
      { type: "text", id: "eyebrow", label: "Eyebrow", default: str(config, "eyebrow") },
      { type: "text", id: "heading", label: "Heading", default: str(config, "heading") },
      { type: "textarea", id: "subheading", label: "Subheading", default: str(config, "subheading") },
      { type: "text", id: "link_text", label: "Link text", default: str(config, "linkText") },
      { type: "header", content: "Products" },
      { type: "collection", id: "collection", label: "Collection" },
      { type: "range", id: "products_to_show", label: "Products to show", min: 2, max: 12, step: 1, default: count },
      {
        type: "select", id: "columns", label: "Columns on desktop",
        options: [
          { value: "3", label: "3" },
          { value: "4", label: "4" },
        ],
        default: str(config, "columns", "4") === "3" ? "3" : "4",
      },
      { type: "checkbox", id: "show_badges", label: "Show badges (tag products badge:Best seller)", default: bool(config, "showBadges", true) },
      { type: "text", id: "size_option", label: "Size option name", default: str(config, "sizeOption") },
      { type: "text", id: "shade_label", label: "Shade label", default: str(config, "shadeLabel") },
      { type: "text", id: "add_text", label: "Add button", default: str(config, "addText") },
      { type: "text", id: "added_text", label: "Added confirmation", default: str(config, "addedText") },
      { type: "header", content: "Style" },
      { type: "color", id: "accent", label: "Accent (New badge, added)", default: str(config, "accent") },
      { type: "color", id: "pink", label: "Badge", default: str(config, "pink") },
      { type: "color", id: "tile", label: "Photo tile", default: str(config, "tile") },
      { type: "color", id: "bg", label: "Background", default: str(config, "bg") },
      { type: "color", id: "text_color", label: "Text", default: str(config, "textColor") },
      { type: "color", id: "muted", label: "Muted text", default: str(config, "muted") },
      { type: "color", id: "button_bg", label: "Button", default: str(config, "buttonBg") },
      { type: "color", id: "button_fg", label: "Button label", default: str(config, "buttonText2") },
      { type: "range", id: "radius", label: "Corner radius", min: 0, max: 24, step: 2, unit: "px", default: radius },
    ],
    blocks: [
      {
        type: "swatch",
        name: "Swatch colour",
        settings: [
          { type: "text", id: "name", label: "Option value (e.g. Rose)" },
          { type: "color", id: "color", label: "Colour", default: "#D9D4CF" },
        ],
      },
    ],
    maxBlocks: 50,
    presetBlocks: swatches.map((s) => ({ type: "swatch", settings: { name: esc(s.name), color: s.color } })),
  });

  return section({ style, markup, schema });
}

export const shadeCardGrid: Tweak = {
  slug: "shade-card-grid",
  inspiredBy: "glossier",
  name: "Shade Card Grid",
  tagline: "Product cards with shade swatches, size chips and add to bag, right in the grid.",
  description:
    "Modeled on the product cards Glossier uses across its collection pages. Each card carries a Best seller or New badge, a row of shade swatches (four shown, “+N” reveals the rest), size chips that update the price and an “Add to bag” button, so shoppers pick a shade and buy without opening the product page. In Liquid the swatches come from each product's first option, coloured by a simple swatch map.",
  category: "homepage",
  tier: "free",
  tint: "#fdeef1",
  Preview,
  generateLiquid,
  defaults,
  fields: [
    { key: "eyebrow", label: "Eyebrow", type: "text", group: "Content" },
    { key: "heading", label: "Heading", type: "text", group: "Content" },
    { key: "subheading", label: "Subheading", type: "textarea", group: "Content" },
    { key: "linkText", label: "Link text", type: "text", group: "Content" },
    { key: "currency", label: "Currency symbol", type: "text", group: "Content" },
    {
      key: "products", label: "Products", type: "list", group: "Products",
      hint: "Preview only. In your store the grid shows the collection you pick. Shades: Name:#hex, comma separated (these become the swatch colour map). Sizes: label:price, comma separated",
      itemFields: [
        { key: "name", label: "Name", type: "text" },
        { key: "detail", label: "Descriptor", type: "text" },
        { key: "image", label: "Image URL", type: "text" },
        { key: "badge", label: "Badge", type: "text" },
        { key: "shades", label: "Shades", type: "textarea" },
        { key: "sizes", label: "Sizes", type: "text" },
      ],
      newItem: { name: "Cloud Blush", detail: "Gel-cream blush", image: "/mockups/set-mist.jpg", badge: "New", shades: "Puff:#F2A7B4, Dusk:#C9727F, Haze:#E9B48F, Storm:#9D5B6B, Beam:#F58C7B", sizes: "8 ml:18, 50 ml:32" },
      addLabel: "Add product", max: 8,
    },
    { key: "shadeLabel", label: "Shade label", type: "text", group: "Card" },
    { key: "addText", label: "Add button", type: "text", group: "Card" },
    { key: "addedText", label: "Added confirmation", type: "text", group: "Card" },
    { key: "showBadges", label: "Show badges", type: "toggle", group: "Card" },
    { key: "sizeOption", label: "Size option name", type: "text", group: "Card", hint: "The product option whose values become size chips in your store" },
    {
      key: "columns", label: "Columns on desktop", type: "select", group: "Layout",
      options: [
        { label: "3", value: "3" },
        { label: "4", value: "4" },
      ],
    },
    { key: "radius", label: "Corner radius", type: "slider", group: "Layout", min: 0, max: 24, step: 2, unit: "px" },
    fontField("Typography"),
    { key: "accent", label: "Accent (New badge, added)", type: "color", group: "Colors" },
    { key: "pink", label: "Badge", type: "color", group: "Colors" },
    { key: "tile", label: "Photo tile", type: "color", group: "Colors" },
    { key: "bg", label: "Background", type: "color", group: "Colors" },
    { key: "textColor", label: "Text", type: "color", group: "Colors" },
    { key: "muted", label: "Muted text", type: "color", group: "Colors" },
    { key: "buttonBg", label: "Button", type: "color", group: "Colors" },
    { key: "buttonText2", label: "Button label", type: "color", group: "Colors" },
  ],
};
