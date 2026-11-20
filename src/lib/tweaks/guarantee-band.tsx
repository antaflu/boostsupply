"use client";

import { useId, useState } from "react";
import type { Tweak, TweakConfig } from "../types";
import { str, num, bool, list, fontStack, esc } from "../cfg";
import { fontField } from "../fields";
import { buildSchema, section, fontFaceFor } from "../liquid";

/* ============================================================
   Guarantee Band
   A bold full-width band: a big rotating "money-back guarantee"
   seal on the left, a short reassurance pitch with a CTA in the
   middle and three mini FAQ accordions on the right that answer
   the "but what if..." questions before they stall the sale.
   ============================================================ */

const EASE = "cubic-bezier(.22,1,.36,1)";

const defaults: TweakConfig = {
  days: 90,
  sealText: "Money-back guarantee",
  sealUnit: "Days",
  eyebrow: "Our promise",
  heading: "Feel the difference in 90 days, or it's on us",
  text: "Take it every day for three months. If you don't love how you feel, we'll refund every cent. No return needed, no awkward questions.",
  buttonText: "Try it risk-free",
  faqs: [
    {
      q: "How do I get my money back?",
      a: "Email our care team or tap Refund in your account within 90 days of your first order. Refunds land within 3 business days.",
    },
    {
      q: "Do I have to send it back?",
      a: "No. Keep what you have or pass it on to a friend. We'd rather hear what didn't work for you.",
    },
    {
      q: "Does it cover subscriptions?",
      a: "Yes. Your first order is fully covered, and you can cancel the subscription anytime from your account.",
    },
  ],
  openFirst: true,
  bg: "#12372A",
  textColor: "#F4F1E8",
  seal: "#C9D6C3",
  sealInk: "#12372A",
  button: "#F4F1E8",
  buttonTextColor: "#12372A",
  font: "system",
  radius: 100,
};

/** Hex color + alpha byte, e.g. tint("#F4F1E8", 0.2). */
const tint = (hex: string, a: number) =>
  /^#[0-9a-f]{6}$/i.test(hex)
    ? hex + Math.round(a * 255).toString(16).padStart(2, "0")
    : hex;

/** The seal's ring text, repeated twice around the circle. */
const ringText = (s: string) => {
  const t = s.trim().toUpperCase();
  return t ? `${t}  •  ${t}  •  ` : "";
};

function Seal({
  id,
  days,
  unit,
  text,
  ring,
  disc,
  ink,
}: {
  id: string;
  days: number;
  unit: string;
  text: string;
  ring: string;
  disc: string;
  ink: string;
}) {
  return (
    <div className="relative aspect-square w-full">
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-[14%] rounded-full"
        style={{ background: `radial-gradient(circle, ${tint(disc, 0.18)} 0%, ${tint(disc, 0)} 66%)` }}
      />
      <svg viewBox="0 0 200 200" className="bs-gb-spin absolute inset-0 h-full w-full" aria-hidden>
        <defs>
          <path id={id} d="M100,100 m-80,0 a80,80 0 1,1 160,0 a80,80 0 1,1 -160,0" />
        </defs>
        <circle cx="100" cy="100" r="97" fill="none" stroke={tint(ring, 0.28)} strokeWidth="1" />
        <circle cx="100" cy="100" r="66" fill="none" stroke={tint(ring, 0.28)} strokeWidth="1" strokeDasharray="1.5 4" />
        <text fill={ring} fontSize="13" fontWeight="600" letterSpacing="2.4">
          <textPath href={`#${id}`} textLength="498" lengthAdjust="spacing">
            {ringText(text)}
          </textPath>
        </text>
      </svg>
      <div
        className="absolute inset-[23%] grid place-items-center rounded-full"
        style={{ background: disc, color: ink, boxShadow: `0 18px 40px -18px rgba(0,0,0,.55)` }}
      >
        <div className="text-center leading-none">
          <span className="block font-semibold tracking-[-0.06em] tabular-nums" style={{ fontSize: "clamp(22px, 24cqw, 64px)" }}>
            {days}
          </span>
          <span className="mt-[0.35em] block font-bold uppercase tracking-[0.2em]" style={{ fontSize: "clamp(7px, 5cqw, 12px)" }}>
            {unit}
          </span>
        </div>
      </div>
    </div>
  );
}

function Preview({ config }: { config: TweakConfig }) {
  const bg = str(config, "bg", "#12372A");
  const text = str(config, "textColor", "#F4F1E8");
  const seal = str(config, "seal", "#C9D6C3");
  const sealInk = str(config, "sealInk", "#12372A");
  const btn = str(config, "button", "#F4F1E8");
  const btnText = str(config, "buttonTextColor", "#12372A");
  const radius = num(config, "radius", 100);
  const days = Math.max(1, Math.round(num(config, "days", 90)));
  const faqs = list(config, "faqs");
  const uid = useId().replace(/:/g, "");

  /* follow the "open first" control, but let shoppers click around */
  const initial = bool(config, "openFirst", true) ? 0 : -1;
  const [prevInitial, setPrevInitial] = useState(initial);
  const [open, setOpen] = useState(initial);
  if (initial !== prevInitial) {
    setPrevInitial(initial);
    setOpen(initial);
  }

  return (
    <div className="@container w-full" style={{ background: bg, color: text, fontFamily: fontStack(str(config, "font", "system")) }}>
      <style>{`@keyframes bs-gb-spin{to{transform:rotate(360deg)}}.bs-gb-spin{animation:bs-gb-spin 40s linear infinite}@media (prefers-reduced-motion: reduce){.bs-gb-spin{animation:none}}`}</style>
      <div
        className="mx-auto grid w-full max-w-[1120px] grid-cols-[108px_minmax(0,1fr)] items-center gap-x-5 gap-y-6 px-5 py-9 [grid-template-areas:'seal_head'_'text_text'_'faq_faq'_'cta_cta'] @min-[480px]:grid-cols-[132px_minmax(0,1fr)] @min-[480px]:gap-x-7 @min-[760px]:grid-cols-[196px_minmax(0,1fr)_minmax(0,1.05fr)] @min-[760px]:gap-x-12 @min-[760px]:px-10 @min-[760px]:py-14 @min-[760px]:[grid-template-areas:'seal_main_faq'] @min-[1000px]:grid-cols-[236px_minmax(0,1fr)_minmax(0,1fr)]"
      >
        {/* Seal */}
        <div className="@container [grid-area:seal]">
          <Seal id={`bs-gb-${uid}`} days={days} unit={str(config, "sealUnit")} text={str(config, "sealText")} ring={text} disc={seal} ink={sealInk} />
        </div>

        {/* Pitch */}
        <div className="contents @min-[760px]:block @min-[760px]:[grid-area:main]">
          <div className="[grid-area:head]">
            {str(config, "eyebrow") && (
              <p className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: seal }}>
                {str(config, "eyebrow")}
              </p>
            )}
            {str(config, "heading") && (
              <h3 className="mt-2 text-balance text-[23px] font-semibold leading-[1.05] tracking-[-0.03em] @min-[480px]:text-[28px] @min-[760px]:mt-3 @min-[760px]:text-[34px] @min-[1000px]:text-[40px]">
                {str(config, "heading")}
              </h3>
            )}
          </div>
          {str(config, "text") && (
            <p className="text-[14px] leading-relaxed [grid-area:text] @min-[760px]:mt-4 @min-[760px]:max-w-[420px]" style={{ color: tint(text, 0.75) }}>
              {str(config, "text")}
            </p>
          )}
          {str(config, "buttonText") && (
            <div className="[grid-area:cta] @min-[760px]:mt-7">
              <button
                type="button"
                className="flex h-12 w-full items-center justify-center gap-2 px-7 text-[15px] font-semibold transition-[filter,scale] duration-200 hover:brightness-95 active:scale-[0.99] @min-[760px]:w-auto"
                style={{ background: btn, color: btnText, borderRadius: radius }}
              >
                {str(config, "buttonText")}
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M3 8h10M9 4l4 4-4 4" />
                </svg>
              </button>
            </div>
          )}
        </div>

        {/* FAQs */}
        {faqs.length > 0 && (
          <div className="[grid-area:faq]" style={{ borderBottom: `1px solid ${tint(text, 0.18)}` }}>
            {faqs.map((f, i) => {
              const on = open === i;
              return (
                <div key={i} style={{ borderTop: `1px solid ${tint(text, 0.18)}` }}>
                  <button
                    type="button"
                    aria-expanded={on}
                    onClick={() => setOpen(on ? -1 : i)}
                    className="flex w-full items-center gap-4 py-4 text-left text-[15px] font-semibold tracking-[-0.01em]"
                  >
                    <span className="min-w-0 flex-1">{f.q}</span>
                    <span
                      aria-hidden
                      className="grid h-7 w-7 shrink-0 place-items-center rounded-full transition-[background-color,color,rotate] duration-500"
                      style={{
                        background: on ? seal : tint(text, 0.1),
                        color: on ? sealInk : text,
                        rotate: on ? "45deg" : "0deg",
                        transitionTimingFunction: EASE,
                      }}
                    >
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                        <path d="M6 1.5v9M1.5 6h9" />
                      </svg>
                    </span>
                  </button>
                  <div
                    className="grid transition-[grid-template-rows,opacity] duration-500"
                    style={{ gridTemplateRows: on ? "1fr" : "0fr", opacity: on ? 1 : 0, transitionTimingFunction: EASE }}
                  >
                    <div className="min-h-0 overflow-hidden">
                      <p className="pb-4 pr-11 text-[13.5px] leading-relaxed" style={{ color: tint(text, 0.75) }}>
                        {f.a}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function generateLiquid(config: TweakConfig): string {
  const { face, family } = fontFaceFor(str(config, "font", "system"));
  const S = ".bs-gb-{{ section.id }}";
  const t = "{{ section.settings.text_color }}";
  const tx = (pct: number) => `color-mix(in srgb, ${t} ${pct}%, transparent)`;
  const seal = "{{ section.settings.seal }}";
  const ink = "{{ section.settings.seal_ink }}";

  const style = `<style>
${face ? face + "\n" : ""}  ${S} { container-type: inline-size; background: {{ section.settings.bg }}; color: ${t}; font-family: ${family}; }
  ${S} * { box-sizing: border-box; }
  ${S} p, ${S} h2 { margin: 0; }
  ${S} .bs-in { max-width: 1120px; margin: 0 auto; padding: 36px 20px; display: grid; grid-template-columns: 108px minmax(0, 1fr); align-items: center;
    gap: 24px 20px; grid-template-areas: 'seal head' 'text text' 'faq faq' 'cta cta'; }
  ${S} .bs-seal { grid-area: seal; position: relative; aspect-ratio: 1; container-type: inline-size; }
  ${S} .bs-seal::before { content: ""; position: absolute; inset: -14%; border-radius: 99px; pointer-events: none;
    background: radial-gradient(circle, color-mix(in srgb, ${seal} 18%, transparent) 0%, transparent 66%); }
  ${S} .bs-ring { position: absolute; inset: 0; width: 100%; height: 100%; animation: bs-gb-spin 40s linear infinite; }
  ${S} .bs-ring text { fill: ${t}; font-size: 13px; font-weight: 600; letter-spacing: 2.4px; font-family: ${family}; }
  ${S} .bs-ring circle { stroke: ${tx(28)}; }
  ${S} .bs-disc { position: absolute; inset: 23%; border-radius: 99px; display: grid; place-items: center; text-align: center; line-height: 1;
    background: ${seal}; color: ${ink}; box-shadow: 0 18px 40px -18px rgba(0,0,0,.55); }
  ${S} .bs-days { display: block; font-size: clamp(22px, 24cqw, 64px); font-weight: 600; letter-spacing: -.06em; font-variant-numeric: tabular-nums; }
  ${S} .bs-unit { display: block; margin-top: .35em; font-size: clamp(7px, 5cqw, 12px); font-weight: 700; letter-spacing: .2em; text-transform: uppercase; }
  ${S} .bs-main { display: contents; }
  ${S} .bs-head { grid-area: head; }
  ${S} .bs-eyebrow { font-size: 11px; font-weight: 700; letter-spacing: .18em; text-transform: uppercase; color: ${seal}; }
  ${S} .bs-h { margin-top: 8px; font-size: 23px; font-weight: 600; line-height: 1.05; letter-spacing: -.03em; text-wrap: balance; }
  ${S} .bs-x { grid-area: text; font-size: 14px; line-height: 1.6; color: ${tx(75)}; }
  ${S} .bs-cta { grid-area: cta; }
  ${S} .bs-btn { display: flex; width: 100%; height: 48px; align-items: center; justify-content: center; gap: 8px; padding: 0 28px; text-decoration: none;
    font-size: 15px; font-weight: 600; border-radius: {{ section.settings.radius }}px; background: {{ section.settings.button }}; color: {{ section.settings.button_text_color }};
    transition: filter .2s, transform .2s; }
  ${S} .bs-btn:hover { filter: brightness(.95); }
  ${S} .bs-btn:active { transform: scale(.99); }
  ${S} .bs-faqs { grid-area: faq; border-bottom: 1px solid ${tx(18)}; }
  ${S} .bs-faq { border-top: 1px solid ${tx(18)}; }
  ${S} .bs-q { display: flex; width: 100%; align-items: center; gap: 16px; padding: 16px 0; border: 0; background: none; cursor: pointer; text-align: left;
    color: inherit; font: inherit; font-size: 15px; font-weight: 600; letter-spacing: -.01em; }
  ${S} .bs-q span:first-child { flex: 1; min-width: 0; }
  ${S} .bs-plus { width: 28px; height: 28px; flex-shrink: 0; border-radius: 99px; display: grid; place-items: center; background: ${tx(10)}; color: ${t};
    transition: background-color .5s cubic-bezier(.22,1,.36,1), color .5s cubic-bezier(.22,1,.36,1), transform .5s cubic-bezier(.22,1,.36,1); }
  ${S} .bs-q[aria-expanded="true"] .bs-plus { background: ${seal}; color: ${ink}; transform: rotate(45deg); }
  ${S} .bs-a { display: grid; grid-template-rows: 0fr; opacity: 0; transition: grid-template-rows .5s cubic-bezier(.22,1,.36,1), opacity .5s cubic-bezier(.22,1,.36,1); }
  ${S} .bs-faq.is-open .bs-a { grid-template-rows: 1fr; opacity: 1; }
  ${S} .bs-a > div { min-height: 0; overflow: hidden; }
  ${S} .bs-a p { padding: 0 44px 16px 0; font-size: 13.5px; line-height: 1.6; color: ${tx(75)}; }
  @keyframes bs-gb-spin { to { transform: rotate(360deg); } }
  @container (min-width: 480px) {
    ${S} .bs-in { grid-template-columns: 132px minmax(0, 1fr); column-gap: 28px; }
    ${S} .bs-h { font-size: 28px; }
  }
  @container (min-width: 760px) {
    ${S} .bs-in { padding: 56px 40px; gap: 24px 48px; grid-template-columns: 196px minmax(0, 1fr) minmax(0, 1.05fr); grid-template-areas: 'seal main faq'; }
    ${S} .bs-main { display: block; grid-area: main; }
    ${S} .bs-h { margin-top: 12px; font-size: 34px; }
    ${S} .bs-x { margin-top: 16px; max-width: 420px; }
    ${S} .bs-cta { margin-top: 28px; }
    ${S} .bs-btn { display: inline-flex; width: auto; }
  }
  @container (min-width: 1000px) {
    ${S} .bs-in { grid-template-columns: 236px minmax(0, 1fr) minmax(0, 1fr); }
    ${S} .bs-h { font-size: 40px; }
  }
  @media (prefers-reduced-motion: reduce) {
    ${S} .bs-ring { animation: none; }
    ${S} .bs-a, ${S} .bs-plus { transition: none; }
  }
</style>`;

  const plus = `<svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M6 1.5v9M1.5 6h9"/></svg>`;
  const arrow = `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 8h10M9 4l4 4-4 4"/></svg>`;

  const markup = `{%- comment -%}
  Guarantee Band by boost.supply. Add a FAQ block per question (three
  works best). Make sure your refund policy matches the promise here.
{%- endcomment -%}
{%- liquid
  assign bs_ring = section.settings.seal_text | strip | upcase
  if bs_ring != blank
    assign bs_ring = bs_ring | append: '  •  ' | append: bs_ring | append: '  •  '
  endif
-%}
<div class="bs-gb-{{ section.id }}" id="bs-gb-{{ section.id }}">
  <div class="bs-in">
    <div class="bs-seal" aria-hidden="true">
      <svg class="bs-ring" viewBox="0 0 200 200">
        <defs><path id="bs-gb-ring-{{ section.id }}" d="M100,100 m-80,0 a80,80 0 1,1 160,0 a80,80 0 1,1 -160,0"/></defs>
        <circle cx="100" cy="100" r="97" fill="none" stroke-width="1"/>
        <circle cx="100" cy="100" r="66" fill="none" stroke-width="1" stroke-dasharray="1.5 4"/>
        <text><textPath href="#bs-gb-ring-{{ section.id }}" textLength="498" lengthAdjust="spacing">{{ bs_ring }}</textPath></text>
      </svg>
      <div class="bs-disc"><div><span class="bs-days">{{ section.settings.days }}</span><span class="bs-unit">{{ section.settings.seal_unit }}</span></div></div>
    </div>

    <div class="bs-main">
      <div class="bs-head">
        {%- if section.settings.eyebrow != blank -%}<p class="bs-eyebrow">{{ section.settings.eyebrow }}</p>{%- endif -%}
        {%- if section.settings.heading != blank -%}<h2 class="bs-h">{{ section.settings.heading }}</h2>{%- endif -%}
      </div>
      {%- if section.settings.text != blank -%}<p class="bs-x">{{ section.settings.text }}</p>{%- endif -%}
      {%- if section.settings.button_text != blank -%}
        <div class="bs-cta"><a class="bs-btn" href="{{ section.settings.button_link | default: routes.all_products_collection_url }}">{{ section.settings.button_text }}${arrow}</a></div>
      {%- endif -%}
    </div>

    {%- if section.blocks.size > 0 -%}
      <div class="bs-faqs">
        {%- for block in section.blocks -%}
          {%- assign bs_open = false -%}
          {%- if forloop.first and section.settings.open_first -%}{%- assign bs_open = true -%}{%- endif -%}
          <div class="bs-faq{% if bs_open %} is-open{% endif %}" {{ block.shopify_attributes }}>
            <button type="button" class="bs-q" aria-expanded="{{ bs_open }}" aria-controls="bs-gb-a-{{ block.id }}">
              <span>{{ block.settings.question }}</span>
              <span class="bs-plus" aria-hidden="true">${plus}</span>
            </button>
            <div class="bs-a" id="bs-gb-a-{{ block.id }}" role="region"><div><p>{{ block.settings.answer }}</p></div></div>
          </div>
        {%- endfor -%}
      </div>
    {%- endif -%}
  </div>
</div>
<script>
  (function () {
    var root = document.getElementById('bs-gb-{{ section.id }}');
    if (!root) return;
    var items = root.querySelectorAll('.bs-faq');
    items.forEach(function (item) {
      var q = item.querySelector('.bs-q');
      if (!q) return;
      q.addEventListener('click', function () {
        var open = !item.classList.contains('is-open');
        items.forEach(function (o) {
          var on = o === item && open;
          o.classList.toggle('is-open', on);
          var b = o.querySelector('.bs-q');
          if (b) b.setAttribute('aria-expanded', on ? 'true' : 'false');
        });
      });
    });
  })();
</script>`;

  const faqs = list(config, "faqs");

  const schema = buildSchema({
    name: "Guarantee Band",
    settings: [
      { type: "header", content: "Seal" },
      { type: "number", id: "days", label: "Guarantee days", default: Math.max(1, Math.round(num(config, "days", 90))) },
      { type: "text", id: "seal_unit", label: "Unit under the number", default: str(config, "sealUnit") },
      { type: "text", id: "seal_text", label: "Ring text", default: str(config, "sealText") },
      { type: "header", content: "Content" },
      { type: "text", id: "eyebrow", label: "Eyebrow", default: str(config, "eyebrow") },
      { type: "text", id: "heading", label: "Heading", default: str(config, "heading") },
      { type: "textarea", id: "text", label: "Text", default: str(config, "text") },
      { type: "text", id: "button_text", label: "Button text", default: str(config, "buttonText") },
      { type: "url", id: "button_link", label: "Button link" },
      { type: "checkbox", id: "open_first", label: "Open the first question", default: bool(config, "openFirst", true) },
      { type: "header", content: "Style" },
      { type: "color", id: "bg", label: "Background", default: str(config, "bg") },
      { type: "color", id: "text_color", label: "Text", default: str(config, "textColor") },
      { type: "color", id: "seal", label: "Seal & accent", default: str(config, "seal") },
      { type: "color", id: "seal_ink", label: "Seal number", default: str(config, "sealInk") },
      { type: "color", id: "button", label: "Button", default: str(config, "button") },
      { type: "color", id: "button_text_color", label: "Button text", default: str(config, "buttonTextColor") },
      { type: "range", id: "radius", label: "Button radius", min: 0, max: 100, step: 2, unit: "px", default: Math.max(0, Math.min(100, Math.round(num(config, "radius", 100) / 2) * 2)) },
    ],
    blocks: [
      {
        type: "faq",
        name: "FAQ",
        settings: [
          { type: "text", id: "question", label: "Question" },
          { type: "textarea", id: "answer", label: "Answer" },
        ],
      },
    ],
    maxBlocks: 6,
    presetBlocks: faqs.slice(0, 6).map((f) => ({
      type: "faq",
      settings: { question: esc(f.q ?? ""), answer: esc(f.a ?? "") },
    })),
  });

  return section({ style, markup, schema });
}

export const guaranteeBand: Tweak = {
  slug: "guarantee-band",
  inspiredBy: "ag1",
  name: "Guarantee Band",
  tagline: "A bold money-back guarantee band with a rotating seal and three mini FAQs.",
  description:
    "Modeled on the guarantee band AG1 runs under its buy box. A big rotating 90-day seal anchors the left, a short reassurance pitch with a CTA sits in the middle, and three mini FAQ accordions on the right answer the 'but what if...' questions (how refunds work, whether to send it back, subscriptions) before they stall the sale. Deep green with cream, full width.",
  category: "product-page",
  tier: "free",
  tint: "#e3ebe2",
  Preview,
  generateLiquid,
  defaults,
  fields: [
    { key: "days", label: "Guarantee days", type: "slider", group: "Seal", min: 7, max: 365, step: 1 },
    { key: "sealUnit", label: "Unit under the number", type: "text", group: "Seal" },
    { key: "sealText", label: "Ring text", type: "text", group: "Seal" },
    { key: "eyebrow", label: "Eyebrow", type: "text", group: "Content" },
    { key: "heading", label: "Heading", type: "text", group: "Content" },
    { key: "text", label: "Text", type: "textarea", group: "Content" },
    { key: "buttonText", label: "Button text", type: "text", group: "Content" },
    {
      key: "faqs", label: "FAQs", type: "list", group: "FAQs",
      itemFields: [
        { key: "q", label: "Question", type: "text" },
        { key: "a", label: "Answer", type: "textarea" },
      ],
      newItem: { q: "When does the 90 days start?", a: "On the day your first order is delivered, not the day you place it." },
      addLabel: "Add question",
      max: 6,
    },
    { key: "openFirst", label: "Open the first question", type: "toggle", group: "FAQs" },
    fontField("Typography"),
    { key: "radius", label: "Button radius", type: "slider", group: "Layout", min: 0, max: 100, step: 2, unit: "px" },
    { key: "bg", label: "Background", type: "color", group: "Colors" },
    { key: "textColor", label: "Text", type: "color", group: "Colors" },
    { key: "seal", label: "Seal & accent", type: "color", group: "Colors" },
    { key: "sealInk", label: "Seal number", type: "color", group: "Colors" },
    { key: "button", label: "Button", type: "color", group: "Colors" },
    { key: "buttonTextColor", label: "Button text", type: "color", group: "Colors" },
  ],
};
