"use client";

import { useState } from "react";
import type { Tweak, TweakConfig } from "../types";
import { str, num, bool, list, fontStack, esc } from "../cfg";
import { fontField } from "../fields";
import { buildSchema, section, fontFaceFor } from "../liquid";

/* ============================================================
   Ingredient Explorer
   "What's inside" by benefit area. Tabs (Gut, Heart, Skin,
   Immune) reveal the strains or ingredients behind each one as
   cards with a name, a mono code label and a one-line benefit.
   Beside it, the product photo carries a big count ("24
   strains"). Tabs scroll sideways on narrow screens.
   ============================================================ */

const EASE = "cubic-bezier(.22,1,.36,1)";

const defaults: TweakConfig = {
  eyebrow: "What's inside",
  heading: "Every strain has a job to do",
  subheading: "Tap a benefit area to see the strains that support it, and what each one is there for.",
  image: "/mockups/timeline-capsules.jpg",
  countValue: "24",
  countLabel: "strains",
  countNote: "across four benefit areas, in two capsules a day",
  tab1: "Gut",
  tab2: "Heart",
  tab3: "Skin",
  tab4: "Immune",
  startTab: 1,
  ingredients: [
    { group: "Gut", name: "Lactiplantibacillus plantarum", code: "LP-0421", benefit: "Eases occasional bloating after meals" },
    { group: "Gut", name: "Bifidobacterium longum", code: "BL-1907", benefit: "Supports regularity and everyday gut comfort" },
    { group: "Gut", name: "Bifidobacterium breve", code: "BB-2210", benefit: "Helps maintain a healthy gut lining" },
    { group: "Gut", name: "Lactobacillus gasseri", code: "LG-0812", benefit: "Supports a comfortable, settled stomach" },
    { group: "Heart", name: "Limosilactobacillus reuteri", code: "LR-3318", benefit: "Helps maintain healthy cholesterol levels" },
    { group: "Heart", name: "Lacticaseibacillus rhamnosus", code: "LH-0716", benefit: "Supports heart health alongside a balanced diet" },
    { group: "Skin", name: "Bifidobacterium lactis", code: "BX-0904", benefit: "Supports skin hydration from within" },
    { group: "Skin", name: "Lactobacillus acidophilus", code: "LA-1523", benefit: "Helps keep skin calm, clear and even" },
    { group: "Immune", name: "Lacticaseibacillus paracasei", code: "LC-2681", benefit: "Supports a healthy immune response" },
    { group: "Immune", name: "Lactobacillus crispatus", code: "LK-1145", benefit: "Strengthens the gut barrier, home to most immune cells" },
  ],
  italicNames: true,
  showIndex: true,
  accent: "#1F3B2D",
  soft: "#DCE6C9",
  bg: "#F7F6F1",
  card: "#FFFFFF",
  textColor: "#1A1A1A",
  font: "system",
  radius: 18,
};

/** Hex color + alpha byte, e.g. tint("#1F3B2D", 0.14). */
const tint = (hex: string, a: number) =>
  /^#[0-9a-f]{6}$/i.test(hex)
    ? hex + Math.round(a * 255).toString(16).padStart(2, "0")
    : hex;

const MONO = "ui-monospace, 'SF Mono', Menlo, monospace";

/** Tab index for a list item: matches a tab label, or "1"–"4". */
const groupIndex = (g: string | undefined, tabs: string[]) => {
  const t = String(g ?? "").trim().toLowerCase();
  const byLabel = tabs.findIndex((x) => x.trim().toLowerCase() === t && t);
  if (byLabel >= 0) return byLabel;
  const n = parseInt(t, 10);
  return n >= 1 && n <= 4 ? n - 1 : 0;
};

function Strain({ color }: { color: string }) {
  /* a rod-shaped microbe with two short flagella */
  return (
    <svg width="22" height="14" viewBox="0 0 22 14" fill="none" stroke={color} strokeWidth="1.2" strokeLinecap="round" aria-hidden>
      <rect x="4.5" y="3.5" width="13" height="7" rx="3.5" />
      <path d="M4.5 7c-1.4 0-1.6-2-3.5-2M17.5 7c1.4 0 1.6 2 3.5 2" />
      <circle cx="9" cy="7" r=".9" fill={color} stroke="none" />
      <circle cx="13" cy="6.2" r=".7" fill={color} stroke="none" />
    </svg>
  );
}

function Preview({ config }: { config: TweakConfig }) {
  const accent = str(config, "accent", "#1F3B2D");
  const soft = str(config, "soft", "#DCE6C9");
  const bg = str(config, "bg", "#F7F6F1");
  const card = str(config, "card", "#FFFFFF");
  const text = str(config, "textColor", "#1A1A1A");
  const radius = num(config, "radius", 18);
  const photo = str(config, "image").trim();
  const items = list(config, "ingredients");
  const tabs = [str(config, "tab1"), str(config, "tab2"), str(config, "tab3"), str(config, "tab4")];
  const live = tabs.map((t, i) => ({ t, i })).filter((x) => x.t.trim());
  const counts = tabs.map((_, i) => items.filter((it) => groupIndex(it.group, tabs) === i).length);

  const start = Math.max(0, Math.min(3, num(config, "startTab", 1) - 1));
  const [prevStart, setPrevStart] = useState(start);
  const [tab, setTab] = useState(start);
  if (start !== prevStart) {
    setPrevStart(start);
    setTab(start);
  }
  const active = live.some((x) => x.i === tab) ? tab : (live[0]?.i ?? 0);
  const shown = items.filter((it) => groupIndex(it.group, tabs) === active);
  const italic = bool(config, "italicNames", true);
  const showIndex = bool(config, "showIndex", true);

  return (
    <div className="@container w-full" style={{ background: bg, color: text, fontFamily: fontStack(str(config, "font", "system")) }}>
      <div className="mx-auto grid w-full max-w-[1120px] gap-6 p-4 @min-[680px]:grid-cols-[minmax(0,.8fr)_minmax(0,1.2fr)] @min-[680px]:items-center @min-[680px]:gap-12 @min-[680px]:p-10">
        {/* ---- Photo + count ---- */}
        <div className="relative aspect-[5/4] overflow-hidden @min-[680px]:aspect-[4/5]" style={{ background: soft, borderRadius: radius }}>
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo} alt="" loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <div className="absolute inset-0 grid place-items-center" aria-hidden>
              <div className="flex gap-2">
                {[0, 1, 2].map((i) => (
                  <span key={i} className="h-16 w-7 rounded-full" style={{ background: tint(accent, 0.18 + i * 0.12), rotate: `${-14 + i * 14}deg` }} />
                ))}
              </div>
            </div>
          )}
          <div
            className="absolute bottom-3 left-3 flex max-w-[calc(100%-24px)] items-end gap-3 px-4 py-3 @min-[680px]:bottom-4 @min-[680px]:left-4 @min-[680px]:px-5 @min-[680px]:py-4"
            style={{ background: tint(bg, 0.86), borderRadius: Math.max(8, radius - 6), backdropFilter: "blur(12px) saturate(1.3)", WebkitBackdropFilter: "blur(12px) saturate(1.3)" }}
          >
            <span className="text-[40px] font-light leading-[.85] tracking-[-0.04em] tabular-nums @min-[680px]:text-[52px]" style={{ color: accent }}>
              {str(config, "countValue")}
            </span>
            <span className="min-w-0 pb-0.5">
              <span className="block text-[14px] leading-tight" style={{ color: accent }}>
                {str(config, "countLabel")}
              </span>
              {str(config, "countNote") && (
                <span className="mt-0.5 block max-w-[190px] text-[11.5px] leading-snug" style={{ color: tint(text, 0.6) }}>
                  {str(config, "countNote")}
                </span>
              )}
            </span>
          </div>
        </div>

        {/* ---- Explorer ---- */}
        <div className="@container/ex min-w-0 px-1 pb-2 @min-[680px]:px-0 @min-[680px]:pb-0">
          {str(config, "eyebrow") && (
            <p className="text-[12.5px]" style={{ color: accent }}>
              {str(config, "eyebrow")}
            </p>
          )}
          <h3 className="mt-2 text-[26px] font-light leading-[1.1] tracking-[-0.025em] @min-[680px]:text-[34px]">{str(config, "heading")}</h3>
          {str(config, "subheading") && (
            <p className="mt-3 max-w-[440px] text-[13.5px] leading-relaxed" style={{ color: tint(text, 0.62) }}>
              {str(config, "subheading")}
            </p>
          )}

          {/* tabs */}
          <div role="tablist" className="bs-no-scrollbar -mx-1 mt-6 flex gap-1.5 overflow-x-auto px-1 py-0.5">
            {live.map(({ t, i }) => {
              const on = i === active;
              return (
                <button
                  key={i}
                  type="button"
                  role="tab"
                  aria-selected={on}
                  onClick={() => setTab(i)}
                  className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full pl-3.5 pr-1.5 text-[12.5px] @min-[680px]:gap-2 @min-[680px]:pl-4 @min-[680px]:pr-2 @min-[680px]:text-[13px] transition-[background-color,color,box-shadow,scale] duration-300 active:scale-[.97]"
                  style={{
                    background: on ? accent : "transparent",
                    color: on ? bg : text,
                    boxShadow: on ? "none" : `inset 0 0 0 1px ${tint(accent, 0.18)}`,
                    transitionTimingFunction: EASE,
                  }}
                >
                  {t}
                  <span
                    className="grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-[10.5px] tabular-nums transition-colors duration-300"
                    style={{ background: on ? tint(bg, 0.16) : soft, color: on ? bg : accent, fontFamily: MONO }}
                  >
                    {counts[i]}
                  </span>
                </button>
              );
            })}
          </div>

          {/* cards */}
          <div key={active} role="tabpanel" className="mt-4 grid gap-2 @min-[440px]/ex:grid-cols-2">
            {shown.map((it, k) => (
              <div
                key={k}
                className="bs-rise flex min-w-0 flex-col p-4 transition-[translate,box-shadow] duration-500 hover:-translate-y-0.5"
                style={{
                  ["--i" as string]: k,
                  background: card,
                  borderRadius: Math.max(8, radius - 6),
                  boxShadow: `0 0 0 1px ${tint(accent, 0.08)}, 0 1px 2px ${tint(accent, 0.04)}`,
                  transitionTimingFunction: EASE,
                }}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="rounded-full px-2 py-[3px] text-[10.5px] uppercase tracking-[0.04em]" style={{ background: soft, color: accent, fontFamily: MONO }}>
                    {it.code}
                  </span>
                  {showIndex ? (
                    <span className="text-[10.5px] tabular-nums" style={{ color: tint(text, 0.35), fontFamily: MONO }}>
                      {String(k + 1).padStart(2, "0")}/{String(shown.length).padStart(2, "0")}
                    </span>
                  ) : (
                    <Strain color={tint(accent, 0.55)} />
                  )}
                </div>
                <p className="mt-3.5 text-[15px] leading-snug" style={{ fontStyle: italic ? "italic" : "normal" }}>
                  {it.name}
                </p>
                <p className="mt-1 text-[12.5px] leading-snug" style={{ color: tint(text, 0.6) }}>
                  {it.benefit}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function generateLiquid(config: TweakConfig): string {
  const { face, family } = fontFaceFor(str(config, "font", "system"));
  const S = ".bs-ie-{{ section.id }}";
  const ri = "{{ section.settings.radius | minus: 6 | at_least: 8 }}px";
  const mono = "ui-monospace, 'SF Mono', Menlo, monospace";

  const style = `<style>
${face ? face + "\n" : ""}  ${S} { container-type: inline-size; background: {{ section.settings.bg }}; color: {{ section.settings.text_color }}; font-family: ${family}; }
  ${S} * { box-sizing: border-box; }
  ${S} p, ${S} h2 { margin: 0; }
  ${S} .bs-in { max-width: 1120px; margin: 0 auto; padding: 16px; display: grid; gap: 24px; }
  ${S} .bs-vis { position: relative; aspect-ratio: 5 / 4; overflow: hidden; border-radius: {{ section.settings.radius }}px; background: {{ section.settings.soft }}; }
  ${S} .bs-vis img, ${S} .bs-vis .bs-ph { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
  ${S} .bs-vis .bs-ph { fill: {{ section.settings.accent }}; opacity: .25; }
  ${S} .bs-count { position: absolute; left: 12px; bottom: 12px; max-width: calc(100% - 24px); display: flex; align-items: flex-end; gap: 12px; padding: 12px 16px;
    border-radius: ${ri}; background: color-mix(in srgb, {{ section.settings.bg }} 86%, transparent);
    -webkit-backdrop-filter: blur(12px) saturate(1.3); backdrop-filter: blur(12px) saturate(1.3); }
  ${S} .bs-num { font-size: 40px; font-weight: 300; line-height: .85; letter-spacing: -.04em; font-variant-numeric: tabular-nums; color: {{ section.settings.accent }}; }
  ${S} .bs-cl { display: block; font-size: 14px; line-height: 1.25; color: {{ section.settings.accent }}; }
  ${S} .bs-cn { display: block; margin-top: 2px; max-width: 190px; font-size: 11.5px; line-height: 1.35; opacity: .6; }
  ${S} .bs-ex { min-width: 0; padding: 0 4px 8px; container-type: inline-size; }
  ${S} .bs-eye { font-size: 12.5px; color: {{ section.settings.accent }}; }
  ${S} .bs-h { margin-top: 8px; font-size: 26px; font-weight: 300; line-height: 1.1; letter-spacing: -.025em; }
  ${S} .bs-sh { margin-top: 12px; max-width: 440px; font-size: 13.5px; line-height: 1.6; opacity: .62; }
  ${S} .bs-tabs { margin: 24px -4px 0; padding: 2px 4px; display: flex; gap: 6px; overflow-x: auto; scrollbar-width: none; }
  ${S} .bs-tabs::-webkit-scrollbar { display: none; }
  ${S} .bs-tab { flex-shrink: 0; height: 36px; display: inline-flex; align-items: center; gap: 6px; padding: 0 6px 0 14px; border: 0; border-radius: 99px; cursor: pointer;
    font: inherit; font-size: 12.5px; background: transparent; color: inherit; box-shadow: inset 0 0 0 1px color-mix(in srgb, {{ section.settings.accent }} 18%, transparent);
    transition: background-color .3s, color .3s, box-shadow .3s, transform .2s; }
  ${S} .bs-tab:active { transform: scale(.97); }
  ${S} .bs-tab:focus-visible { outline: 2px solid {{ section.settings.accent }}; outline-offset: 2px; }
  ${S} .bs-tab span { min-width: 20px; height: 20px; padding: 0 6px; display: grid; place-items: center; border-radius: 99px; font-family: ${mono}; font-size: 10.5px;
    font-variant-numeric: tabular-nums; background: {{ section.settings.soft }}; color: {{ section.settings.accent }}; transition: background-color .3s, color .3s; }
  ${S} .bs-tab[aria-selected="true"] { background: {{ section.settings.accent }}; color: {{ section.settings.bg }}; box-shadow: none; }
  ${S} .bs-tab[aria-selected="true"] span { background: color-mix(in srgb, {{ section.settings.bg }} 16%, transparent); color: {{ section.settings.bg }}; }
  ${S} .bs-cards { margin-top: 16px; display: grid; gap: 8px; }
  ${S} .bs-card { min-width: 0; display: flex; flex-direction: column; padding: 16px; border-radius: ${ri}; background: {{ section.settings.card }};
    box-shadow: 0 0 0 1px color-mix(in srgb, {{ section.settings.accent }} 8%, transparent), 0 1px 2px color-mix(in srgb, {{ section.settings.accent }} 4%, transparent);
    transition: transform .5s cubic-bezier(.22,1,.36,1); }
  ${S} .bs-card:hover { transform: translateY(-2px); }
  ${S} .bs-card[hidden] { display: none; }
  ${S} .bs-card.is-in { animation: bsIeIn .6s cubic-bezier(.22,1,.36,1) both; animation-delay: calc(var(--i, 0) * 45ms); }
  @keyframes bsIeIn { from { opacity: 0; transform: translateY(8px); } }
  ${S} .bs-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
  ${S} .bs-code { padding: 3px 8px; border-radius: 99px; font-family: ${mono}; font-size: 10.5px; text-transform: uppercase; letter-spacing: .04em;
    background: {{ section.settings.soft }}; color: {{ section.settings.accent }}; }
  ${S} .bs-idx { font-family: ${mono}; font-size: 10.5px; font-variant-numeric: tabular-nums; opacity: .35; }
  ${S} .bs-name { margin-top: 14px; font-size: 15px; line-height: 1.35; }
  ${S} .bs-name.is-italic { font-style: italic; }
  ${S} .bs-ben { margin-top: 4px; font-size: 12.5px; line-height: 1.4; opacity: .6; }
  @container (min-width: 440px) { ${S} .bs-cards { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
  @container (min-width: 680px) {
    ${S} .bs-in { grid-template-columns: minmax(0, .8fr) minmax(0, 1.2fr); align-items: center; gap: 48px; padding: 40px; }
    ${S} .bs-vis { aspect-ratio: 4 / 5; }
    ${S} .bs-count { left: 16px; bottom: 16px; padding: 16px 20px; }
    ${S} .bs-num { font-size: 52px; }
    ${S} .bs-ex { padding: 0; }
    ${S} .bs-h { font-size: 34px; }
    ${S} .bs-tab { gap: 8px; padding: 0 8px 0 16px; font-size: 13px; }
  }
  @media (prefers-reduced-motion: reduce) { ${S} * { transition-duration: 1ms !important; animation: none !important; } }
</style>`;

  const tabBtn = (n: number) => `{%- if section.settings.tab_${n} != blank -%}
          {%- assign bs_c = 0 -%}
          {%- for block in section.blocks -%}{%- if block.settings.group == '${n}' -%}{%- assign bs_c = bs_c | plus: 1 -%}{%- endif -%}{%- endfor -%}
          <button type="button" class="bs-tab" role="tab" data-tab="${n}" aria-selected="false">{{ section.settings.tab_${n} }}<span>{{ bs_c }}</span></button>
        {%- endif -%}`;

  const markup = `{%- comment -%}
  Ingredient Explorer by boost.supply.
  - Name up to four benefit areas under "Tabs" (leave one empty to hide it).
  - Add one "Ingredient" block per strain or ingredient and pick its tab.
  - The count on the photo is plain text, so it can say "24 strains" even if
    you only list the highlights.
{%- endcomment -%}
<div class="bs-ie-{{ section.id }}" id="bs-ie-{{ section.id }}" data-start="{{ section.settings.start_tab }}">
  <div class="bs-in">
    <div class="bs-vis">
      {%- if section.settings.image != blank -%}
        {{ section.settings.image | image_url: width: 1200 | image_tag: loading: 'lazy', alt: section.settings.image.alt, sizes: '(min-width: 990px) 480px, 100vw' }}
      {%- else -%}
        {{ 'product-1' | placeholder_svg_tag: 'bs-ph' }}
      {%- endif -%}
      {%- if section.settings.count_value != blank -%}
        <div class="bs-count">
          <span class="bs-num">{{ section.settings.count_value }}</span>
          <span style="min-width:0;padding-bottom:2px">
            <span class="bs-cl">{{ section.settings.count_label }}</span>
            {%- if section.settings.count_note != blank -%}<span class="bs-cn">{{ section.settings.count_note }}</span>{%- endif -%}
          </span>
        </div>
      {%- endif -%}
    </div>

    <div class="bs-ex">
      {%- if section.settings.eyebrow != blank -%}<p class="bs-eye">{{ section.settings.eyebrow }}</p>{%- endif -%}
      <h2 class="bs-h">{{ section.settings.heading }}</h2>
      {%- if section.settings.subheading != blank -%}<p class="bs-sh">{{ section.settings.subheading }}</p>{%- endif -%}
      <div class="bs-tabs" role="tablist" aria-label="{{ section.settings.heading | escape }}">
        ${[1, 2, 3, 4].map(tabBtn).join("\n        ")}
      </div>
      <div class="bs-cards" role="tabpanel">
        {%- for block in section.blocks -%}
          <div class="bs-card" data-group="{{ block.settings.group }}" {{ block.shopify_attributes }}>
            <div class="bs-top">
              {%- if block.settings.code != blank -%}<span class="bs-code">{{ block.settings.code }}</span>{%- endif -%}
              {%- if section.settings.show_index -%}<span class="bs-idx" data-idx></span>{%- endif -%}
            </div>
            <p class="bs-name{% if section.settings.italic_names %} is-italic{% endif %}">{{ block.settings.name }}</p>
            {%- if block.settings.benefit != blank -%}<p class="bs-ben">{{ block.settings.benefit }}</p>{%- endif -%}
          </div>
        {%- endfor -%}
      </div>
    </div>
  </div>
</div>
<script>
  (function () {
    var root = document.getElementById('bs-ie-{{ section.id }}');
    if (!root) return;
    var tabs = Array.prototype.slice.call(root.querySelectorAll('[data-tab]'));
    var cards = Array.prototype.slice.call(root.querySelectorAll('.bs-card'));
    if (!tabs.length) return;
    function pad(n) { return (n < 10 ? '0' : '') + n; }
    function show(g, animate) {
      tabs.forEach(function (t) { t.setAttribute('aria-selected', t.getAttribute('data-tab') === g ? 'true' : 'false'); });
      var mine = cards.filter(function (c) { return c.getAttribute('data-group') === g; });
      cards.forEach(function (c) { c.hidden = mine.indexOf(c) < 0; c.classList.remove('is-in'); });
      mine.forEach(function (c, i) {
        var idx = c.querySelector('[data-idx]');
        if (idx) idx.textContent = pad(i + 1) + '/' + pad(mine.length);
        c.style.setProperty('--i', i);
        if (animate) { void c.offsetWidth; c.classList.add('is-in'); }
      });
    }
    tabs.forEach(function (t, k) {
      t.addEventListener('click', function () { show(t.getAttribute('data-tab'), true); });
      t.addEventListener('keydown', function (e) {
        if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
        var n = tabs[(k + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
        n.focus();
        n.click();
      });
    });
    var start = root.getAttribute('data-start');
    var first = tabs.filter(function (t) { return t.getAttribute('data-tab') === start; })[0] || tabs[0];
    show(first.getAttribute('data-tab'), false);
  })();
</script>`;

  const items = list(config, "ingredients");
  const tabs = [str(config, "tab1"), str(config, "tab2"), str(config, "tab3"), str(config, "tab4")];

  const schema = buildSchema({
    name: "Ingredient Explorer",
    settings: [
      { type: "text", id: "eyebrow", label: "Eyebrow", default: str(config, "eyebrow") },
      { type: "text", id: "heading", label: "Heading", default: str(config, "heading") },
      { type: "textarea", id: "subheading", label: "Subheading", default: str(config, "subheading") },
      { type: "image_picker", id: "image", label: "Product image" },
      { type: "header", content: "Count on the photo" },
      { type: "text", id: "count_value", label: "Number", default: str(config, "countValue") },
      { type: "text", id: "count_label", label: "Label", default: str(config, "countLabel") },
      { type: "text", id: "count_note", label: "Note", default: str(config, "countNote") },
      { type: "header", content: "Tabs" },
      { type: "text", id: "tab_1", label: "Tab 1", default: tabs[0] },
      { type: "text", id: "tab_2", label: "Tab 2", default: tabs[1] },
      { type: "text", id: "tab_3", label: "Tab 3", default: tabs[2] },
      { type: "text", id: "tab_4", label: "Tab 4", default: tabs[3] },
      { type: "range", id: "start_tab", label: "Open on tab", min: 1, max: 4, step: 1, default: Math.max(1, Math.min(4, Math.round(num(config, "startTab", 1)))) },
      { type: "checkbox", id: "italic_names", label: "Italic names (for strain names)", default: bool(config, "italicNames", true) },
      { type: "checkbox", id: "show_index", label: "Show card numbers", default: bool(config, "showIndex", true) },
      { type: "header", content: "Style" },
      { type: "color", id: "accent", label: "Accent", default: str(config, "accent") },
      { type: "color", id: "soft", label: "Soft (labels, image background)", default: str(config, "soft") },
      { type: "color", id: "card", label: "Cards", default: str(config, "card") },
      { type: "color", id: "bg", label: "Background", default: str(config, "bg") },
      { type: "color", id: "text_color", label: "Text", default: str(config, "textColor") },
      { type: "range", id: "radius", label: "Corner radius", min: 0, max: 32, step: 2, unit: "px", default: Math.max(0, Math.min(32, Math.round(num(config, "radius", 18) / 2) * 2)) },
    ],
    blocks: [
      {
        type: "ingredient",
        name: "Ingredient",
        settings: [
          {
            type: "select",
            id: "group",
            label: "Tab",
            options: tabs.map((t, i) => ({ value: String(i + 1), label: t ? `${i + 1} · ${t}` : `Tab ${i + 1}` })),
            default: "1",
          },
          { type: "text", id: "name", label: "Name", default: "Lactobacillus plantarum" },
          { type: "text", id: "code", label: "Code label", default: "LP-0421" },
          { type: "text", id: "benefit", label: "Benefit", default: "Eases occasional bloating" },
        ],
      },
    ],
    maxBlocks: 40,
    presetBlocks: items.slice(0, 40).map((it) => ({
      type: "ingredient",
      settings: {
        group: String(groupIndex(it.group, tabs) + 1),
        name: esc(it.name ?? ""),
        code: esc(it.code ?? ""),
        benefit: esc(it.benefit ?? ""),
      },
    })),
  });

  return section({ style, markup, schema });
}

export const ingredientExplorer: Tweak = {
  slug: "ingredient-explorer",
  inspiredBy: "seed",
  name: "Ingredient Explorer",
  tagline: "Benefit tabs that reveal the strains behind each claim, next to the product and a big count.",
  description:
    "Modeled on the ingredient explorer Seed uses on its product pages. Tabs for each benefit area (gut, heart, skin, immune) reveal the strains or ingredients behind it as clean cards with the name, a mono code label and a one-line benefit. Beside it, the product photo carries a big count like \"24 strains\". It turns a long ingredient list into proof shoppers can scan by the outcome they care about. In Shopify each ingredient is a block with its tab, and a few lines of inline JS switch the tabs.",
  category: "product-page",
  tier: "free",
  tint: "#eef2ea",
  Preview,
  generateLiquid,
  defaults,
  fields: [
    { key: "eyebrow", label: "Eyebrow", type: "text", group: "Content" },
    { key: "heading", label: "Heading", type: "text", group: "Content" },
    { key: "subheading", label: "Subheading", type: "textarea", group: "Content" },
    { key: "image", label: "Image URL", type: "text", group: "Media", hint: "Editor preview only. In Shopify you pick the image in the theme editor", placeholder: "https://…" },
    { key: "countValue", label: "Count", type: "text", group: "Media", hint: "Leave empty to hide the count" },
    { key: "countLabel", label: "Count label", type: "text", group: "Media" },
    { key: "countNote", label: "Count note", type: "text", group: "Media" },
    { key: "tab1", label: "Tab 1", type: "text", group: "Tabs", hint: "Leave a tab empty to hide it" },
    { key: "tab2", label: "Tab 2", type: "text", group: "Tabs" },
    { key: "tab3", label: "Tab 3", type: "text", group: "Tabs" },
    { key: "tab4", label: "Tab 4", type: "text", group: "Tabs" },
    { key: "startTab", label: "Open on tab", type: "slider", group: "Tabs", min: 1, max: 4, step: 1 },
    {
      key: "ingredients", label: "Ingredients", type: "list", group: "Ingredients",
      hint: "Tab is the tab's name (or 1 to 4). Code is the short mono label",
      itemFields: [
        { key: "group", label: "Tab", type: "text" },
        { key: "name", label: "Name", type: "text" },
        { key: "code", label: "Code", type: "text" },
        { key: "benefit", label: "Benefit", type: "text" },
      ],
      newItem: { group: "Immune", name: "Bifidobacterium bifidum", code: "BF-0388", benefit: "Supports resilience through the seasons" },
      addLabel: "Add ingredient",
      max: 40,
    },
    { key: "italicNames", label: "Italic names", type: "toggle", group: "Ingredients" },
    { key: "showIndex", label: "Show card numbers", type: "toggle", group: "Ingredients" },
    { key: "radius", label: "Corner radius", type: "slider", group: "Layout", min: 0, max: 32, step: 2, unit: "px" },
    fontField("Typography"),
    { key: "accent", label: "Accent", type: "color", group: "Colors" },
    { key: "soft", label: "Soft", type: "color", group: "Colors" },
    { key: "card", label: "Cards", type: "color", group: "Colors" },
    { key: "bg", label: "Background", type: "color", group: "Colors" },
    { key: "textColor", label: "Text", type: "color", group: "Colors" },
  ],
};
