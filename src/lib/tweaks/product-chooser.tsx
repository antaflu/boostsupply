"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { Tweak, TweakConfig } from "../types";
import { str, num, list, fontStack, esc } from "../cfg";
import { fontField } from "../fields";
import { buildSchema, section, fontFaceFor } from "../liquid";
import { money, toNum } from "./product-art";

/* ============================================================
   Use-Case Chooser
   Two or three big product cards side by side, each with a role
   ("for cooking"), an intensity word with a meter, size, price,
   a one-line usage rule and an add button. Tabs on top ("Cook
   with it" / "Finish with it") lift the best match.
   ============================================================ */

const SERIF = "Georgia, 'Times New Roman', serif";
const TYPE = "'Courier New', Courier, ui-monospace, monospace";
const EASE = "cubic-bezier(.22,1,.36,1)";
const POP = "cubic-bezier(.34,1.56,.64,1)";

const defaults: TweakConfig = {
  eyebrow: "Olive oil, sorted",
  heading: "One for the pan, one for the plate.",
  subheading: "Not every bottle does the same job. Tell us what you're making and we'll point you to the right one.",
  prompt: "I want to…",
  currency: "$",
  cards: [
    {
      tab: "Cook with it", role: "for cooking", name: "Everyday", intensity: "Mellow", level: "2",
      size: "750 mL", price: "16", rule: "Sauté, roast, bake. Pour without thinking.", color: "#9eef80",
    },
    {
      tab: "Finish with it", role: "for finishing", name: "Top Coat", intensity: "Punchy", level: "5",
      size: "500 mL", price: "21", rule: "Raw only. Heat flattens the good stuff.", color: "#d1e030",
    },
    {
      tab: "Go high heat", role: "for high heat", name: "Heatwave", intensity: "Neutral", level: "1",
      size: "750 mL", price: "14", rule: "Sear, fry and wok it hot, up to 450°F.", color: "#fbd535",
    },
  ],
  selected: 2,
  matchText: "Best match",
  addText: "Add to cart",
  addedText: "Added",
  bg: "#f6e6d9",
  textColor: "#3c422e",
  accent: "#d1e030",
  paper: "#f6e6d9",
  font: "system",
  headFont: "serif",
  monoFont: "mono",
  radius: 28,
};

const headStack = (f: string) => (f === "serif" ? SERIF : fontStack(f));
const monoStack = (f: string) => (f === "mono" ? TYPE : fontStack(f));
const headFamily = (f: string) => (f === "serif" ? SERIF : fontFaceFor(f).family);
const monoFamily = (f: string) => (f === "mono" ? TYPE : fontFaceFor(f).family);

/* ---------- the drawn squeeze bottle ----------
   Params are plain strings so the same markup works in the preview
   and in Liquid (where they are {{ }} expressions). */
function bottleSvg(p: { name: string; size: string; band: string; body: string; paper: string; fit: string }): string {
  return `<svg viewBox="0 0 80 160" aria-hidden="true" style="display:block;height:100%;width:auto;overflow:visible">
<ellipse cx="40" cy="156" rx="23" ry="3" fill="#000" fill-opacity=".13"/>
<path d="M37.8 3h4.4l2.8 23h-10z" fill="${p.paper}"/>
<rect x="28" y="24" width="24" height="14" rx="3.5" fill="${p.paper}"/>
<rect x="28" y="33" width="24" height="1.6" fill="#000" fill-opacity=".1"/>
<rect x="31" y="37" width="18" height="7" fill="${p.body}"/>
<path d="M21 55c0-7.5 4.5-12 12-12h14c7.5 0 12 4.5 12 12v89c0 6.5-4 10.5-10.5 10.5h-17C25 154.5 21 150.5 21 144z" fill="${p.body}"/>
<path d="M26.5 58c0-4.5 2-7.5 6-8" stroke="#fff" stroke-opacity=".3" stroke-width="2.4" stroke-linecap="round" fill="none"/>
<rect x="25.5" y="62" width="3" height="78" rx="1.5" fill="#fff" fill-opacity=".14"/>
<rect x="21" y="77" width="38" height="54" fill="${p.paper}"/>
<rect x="21" y="77" width="38" height="11" fill="${p.band}"/>
<rect x="21" y="88" width="38" height="1.2" fill="${p.body}" fill-opacity=".9"/>
<text x="40" y="107" text-anchor="middle" font-family="Georgia, serif" font-size="8" letter-spacing="-.3" fill="${p.body}"${p.fit}>“${p.name}”</text>
<rect x="31" y="113" width="18" height="1" fill="${p.body}" fill-opacity=".35"/>
<text x="40" y="123" text-anchor="middle" font-family="'Courier New', monospace" font-size="5.2" font-weight="700" fill="${p.body}">${p.size}</text>
<rect x="56" y="62" width="3" height="78" rx="1.5" fill="#000" fill-opacity=".12"/>
</svg>`;
}

const FIT = ` textLength="31" lengthAdjust="spacingAndGlyphs"`;

/** Five rising bars, `level` of them filled. */
function Meter({ level, color }: { level: number; color: string }) {
  return (
    <span className="inline-flex items-end gap-[2px]" aria-hidden>
      {[6, 8, 10, 12, 14].map((h, i) => (
        <span
          key={i}
          className="block w-[4px] rounded-[1px] transition-opacity duration-300"
          style={{ height: h, background: color, opacity: i < level ? 1 : 0.22 }}
        />
      ))}
    </span>
  );
}

/* ---------- preview ---------- */

function Preview({ config }: { config: TweakConfig }) {
  const cur = str(config, "currency", "$");
  const bg = str(config, "bg", "#f6e6d9");
  const text = str(config, "textColor", "#3c422e");
  const accent = str(config, "accent", "#d1e030");
  const paper = str(config, "paper", "#f6e6d9");
  const radius = num(config, "radius", 28);
  const head = headStack(str(config, "headFont", "serif"));
  const mono = monoStack(str(config, "monoFont", "mono"));

  const cards = list(config, "cards").map((c) => ({
    tab: c.tab ?? "",
    role: c.role ?? "",
    name: c.name ?? "",
    intensity: c.intensity ?? "",
    level: Math.max(0, Math.min(5, Math.round(toNum(c.level, 3)))),
    size: c.size ?? "",
    price: toNum(c.price),
    rule: c.rule ?? "",
    color: c.color || accent,
  }));

  /* follow the "preselected" control, but let shoppers click around */
  const initial = Math.max(0, Math.min(num(config, "selected", 2) - 1, cards.length - 1));
  const [prevInitial, setPrevInitial] = useState(initial);
  const [sel, setSel] = useState(initial);
  if (initial !== prevInitial) {
    setPrevInitial(initial);
    setSel(initial);
  }
  const active = Math.max(0, Math.min(sel, cards.length - 1));
  const [added, setAdded] = useState<number[]>([]);
  const rail = useRef<HTMLDivElement>(null);

  const pick = (i: number) => setSel(i);
  /* Keep the matched card centred on narrow screens. We tween scrollLeft
     ourselves with snapping paused: the cards animate their lift, and the
     browser re-snaps the rail during that, which cancels a native smooth
     scroll halfway. */
  const firstScroll = useRef(true);
  const glide = useRef(0);
  useEffect(() => {
    const el = rail.current;
    const card = el?.children[active] as HTMLElement | undefined;
    if (!el || !card || el.scrollWidth <= el.clientWidth + 2) return;
    const max = el.scrollWidth - el.clientWidth;
    const to = Math.max(0, Math.min(max, card.offsetLeft - (el.clientWidth - card.offsetWidth) / 2));
    if (firstScroll.current) {
      firstScroll.current = false;
      el.scrollLeft = to;
      return;
    }
    cancelAnimationFrame(glide.current);
    const from = el.scrollLeft;
    const t0 = performance.now();
    el.style.scrollSnapType = "none";
    const step = (now: number) => {
      const p = Math.min(1, (now - t0) / 480);
      el.scrollLeft = from + (to - from) * (1 - (1 - p) ** 3);
      if (p < 1) glide.current = requestAnimationFrame(step);
      else el.style.scrollSnapType = "";
    };
    glide.current = requestAnimationFrame(step);
  }, [active]);

  const toggleAdd = (i: number) =>
    setAdded((a) => (a.includes(i) ? a.filter((x) => x !== i) : [...a, i]));

  return (
    <div
      className="@container w-full overflow-hidden"
      style={{ background: bg, color: text, fontFamily: fontStack(str(config, "font", "system")) }}
    >
      <div className="mx-auto w-full max-w-[1120px] px-4 pb-8 pt-7 @min-[640px]:px-8 @min-[640px]:pb-12 @min-[640px]:pt-11">
        {/* Header */}
        <div className="flex flex-col gap-5 @min-[760px]:flex-row @min-[760px]:items-end @min-[760px]:justify-between @min-[760px]:gap-10">
          <div className="max-w-[560px]">
            {str(config, "eyebrow") && (
              <p className="text-[12.5px] font-bold" style={{ fontFamily: mono }}>
                {str(config, "eyebrow")}
              </p>
            )}
            <h3
              className="mt-2 text-[42px] font-normal leading-[0.9] tracking-[-0.035em] @min-[640px]:text-[58px]"
              style={{ fontFamily: head, fontStretch: "condensed" }}
            >
              {str(config, "heading")}
            </h3>
            {str(config, "subheading") && (
              <p className="mt-3 max-w-[440px] text-[14px] leading-relaxed opacity-85">{str(config, "subheading")}</p>
            )}
          </div>

          {cards.length > 1 && (
            <div className="shrink-0">
              {str(config, "prompt") && (
                <p className="mb-2 text-[12px] font-bold" style={{ fontFamily: mono }}>
                  {str(config, "prompt")}
                </p>
              )}
              <div
                role="tablist"
                className="flex w-full gap-1 rounded-full p-1 @min-[760px]:w-auto"
                style={{ boxShadow: `inset 0 0 0 2px ${text}` }}
              >
                {cards.map((c, i) => {
                  const on = i === active;
                  return (
                    <button
                      key={i}
                      type="button"
                      role="tab"
                      aria-selected={on}
                      onClick={() => pick(i)}
                      className="h-9 min-w-0 flex-1 truncate rounded-full px-3 text-[12.5px] font-bold transition-[background-color,color,scale] duration-300 active:scale-[0.97] @min-[760px]:flex-none @min-[760px]:px-4 @min-[760px]:text-[13.5px]"
                      style={{ background: on ? text : "transparent", color: on ? accent : text }}
                    >
                      {c.tab}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Cards */}
        <div
          ref={rail}
          className="bs-no-scrollbar relative -mx-4 mt-6 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-4 px-4 pb-4 pt-3 @min-[640px]:mx-0 @min-[640px]:mt-8 @min-[640px]:grid @min-[640px]:grid-cols-[repeat(var(--n),minmax(0,1fr))] @min-[640px]:gap-4 @min-[640px]:overflow-visible @min-[640px]:px-0"
          style={{ "--n": Math.max(1, cards.length) } as CSSProperties}
        >
          {cards.map((c, i) => {
            const on = i === active;
            const isAdded = added.includes(i);
            return (
              <article
                key={i}
                className="relative flex w-[80%] shrink-0 snap-center flex-col p-4 transition-[translate,scale,opacity,box-shadow] duration-500 @min-[640px]:w-auto @min-[640px]:p-5"
                style={{
                  transitionTimingFunction: EASE,
                  background: c.color,
                  borderRadius: radius,
                  boxShadow: on ? `inset 0 0 0 2px ${text}, 0 8px 0 ${text}` : `inset 0 0 0 2px ${text}, 0 0 0 ${text}`,
                  translate: on ? "0 -8px" : "0 0",
                  scale: on ? "1" : "0.97",
                  opacity: on ? 1 : 0.8,
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="pt-1 text-[12.5px] font-bold" style={{ fontFamily: mono }}>
                    {c.role}
                  </span>
                  <span className="text-[28px] leading-none tracking-[-0.03em] tabular-nums" style={{ fontFamily: head }}>
                    {money(c.price, cur)}
                  </span>
                </div>

                <div className="relative mt-1 grid h-[188px] place-items-center">
                  <div
                    className="h-[172px] transition-[rotate] duration-700"
                    style={{ rotate: on ? "-4deg" : "0deg", transitionTimingFunction: POP }}
                    dangerouslySetInnerHTML={{
                      __html: bottleSvg({
                        name: esc(c.name),
                        size: esc(c.size),
                        band: c.color,
                        body: text,
                        paper,
                        fit: c.name.length > 8 ? FIT : "",
                      }),
                    }}
                  />
                  <span
                    aria-hidden={!on}
                    className="absolute right-0 top-1 grid h-[68px] w-[68px] place-items-center rounded-full px-2 text-center text-[10.5px] font-bold uppercase leading-[1.1] tracking-[0.02em] transition-[scale,rotate,opacity] duration-500"
                    style={{
                      fontFamily: mono,
                      background: text,
                      color: accent,
                      transitionTimingFunction: POP,
                      scale: on ? "1" : "0.3",
                      rotate: on ? "12deg" : "-30deg",
                      opacity: on ? 1 : 0,
                    }}
                  >
                    {str(config, "matchText")}
                  </span>
                </div>

                <p className="text-[34px] leading-[0.95] tracking-[-0.035em] @min-[640px]:text-[38px]" style={{ fontFamily: head }}>
                  “{c.name}”
                </p>

                <div className="mt-4 flex items-center justify-between gap-2 pt-3" style={{ borderTop: `2px solid ${text}` }}>
                  <span className="flex items-center gap-2">
                    <span className="text-[15px] font-bold">{c.intensity}</span>
                    <Meter level={c.level} color={text} />
                  </span>
                  <span
                    className="rounded-full px-2.5 py-[3px] text-[11.5px] font-bold"
                    style={{ fontFamily: mono, boxShadow: `inset 0 0 0 1.5px ${text}` }}
                  >
                    {c.size}
                  </span>
                </div>

                <p className="mt-3 min-h-[2.7em] text-[12.5px] font-bold leading-snug" style={{ fontFamily: mono }}>
                  {c.rule}
                </p>

                <div className="mt-auto pt-4">
                <button
                  type="button"
                  onClick={() => toggleAdd(i)}
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-full text-[14px] font-bold transition-[filter,scale] duration-200 hover:brightness-125 active:scale-[0.98]"
                  style={{ background: text, color: c.color }}
                >
                  <span key={isAdded ? "y" : "n"} className="bs-swap">
                    {isAdded ? `${str(config, "addedText", "Added")} ✓` : `${str(config, "addText", "Add to cart")} +`}
                  </span>
                </button>
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

type TextKind = "text" | "textarea";
const txt = (type: TextKind, id: string, label: string, value: string, info?: string) => ({
  type,
  id,
  label,
  ...(value ? { default: value } : {}),
  ...(info ? { info } : {}),
});

function generateLiquid(config: TweakConfig): string {
  const bodyFont = str(config, "font", "system");
  const body = fontFaceFor(bodyFont);
  const faces = [body.face];
  const hf = str(config, "headFont", "serif");
  const mf = str(config, "monoFont", "mono");
  if (hf === "custom" && bodyFont !== "custom") faces.push(fontFaceFor(hf).face);
  if (mf === "custom" && bodyFont !== "custom" && hf !== "custom") faces.push(fontFaceFor(mf).face);
  const face = faces.filter(Boolean).join("\n");
  const head = headFamily(hf);
  const mono = monoFamily(mf);
  const S = ".bs-pc-{{ section.id }}";
  const r = "{{ section.settings.radius }}px";

  const style = `<style>
${face ? face + "\n" : ""}  ${S} { container-type: inline-size; overflow: hidden; background: {{ section.settings.bg }}; color: {{ section.settings.text_color }}; font-family: ${body.family}; }
  ${S} * { box-sizing: border-box; }
  ${S} p, ${S} h2 { margin: 0; }
  ${S} .bs-wrap { max-width: 1120px; margin: 0 auto; padding: 28px 16px 32px; }
  ${S} .bs-mono { font-family: ${mono}; font-weight: 700; }
  ${S} .bs-head { display: flex; flex-direction: column; gap: 20px; }
  ${S} .bs-intro { max-width: 560px; }
  ${S} .bs-eyebrow { font-size: 12.5px; }
  ${S} .bs-h { margin-top: 8px; font-family: ${head}; font-size: 42px; font-weight: 400; line-height: .9; letter-spacing: -.035em; font-stretch: condensed; text-transform: none; color: inherit; }
  ${S} .bs-sub { margin-top: 12px; max-width: 440px; font-size: 14px; line-height: 1.6; opacity: .85; }
  ${S} .bs-prompt { margin-bottom: 8px; font-size: 12px; }
  ${S} .bs-tabs { display: flex; gap: 4px; padding: 4px; border-radius: 99px; box-shadow: inset 0 0 0 2px {{ section.settings.text_color }}; }
  ${S} .bs-tab { flex: 1; min-width: 0; height: 36px; padding: 0 12px; border: 0; border-radius: 99px; cursor: pointer; font: inherit; font-size: 12.5px; font-weight: 700;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis; background: transparent; color: inherit; transition: background-color .3s, color .3s, transform .2s; }
  ${S} .bs-tab:active { transform: scale(.97); }
  ${S} .bs-tab[aria-selected="true"] { background: {{ section.settings.text_color }}; color: {{ section.settings.accent }}; }
  ${S} .bs-tab:focus-visible { outline: 2px solid {{ section.settings.text_color }}; outline-offset: 2px; }
  ${S} .bs-rail { position: relative; display: flex; gap: 12px; margin: 24px -16px 0; padding: 12px 16px 16px; overflow-x: auto; scroll-snap-type: x mandatory;
    scroll-padding: 0 16px; scrollbar-width: none; }
  ${S} .bs-rail::-webkit-scrollbar { display: none; }
  ${S} .bs-card { position: relative; flex: 0 0 80%; scroll-snap-align: center; display: flex; flex-direction: column; padding: 16px; border-radius: ${r};
    box-shadow: inset 0 0 0 2px {{ section.settings.text_color }};
    transition: translate .5s cubic-bezier(.22,1,.36,1), scale .5s cubic-bezier(.22,1,.36,1), opacity .5s cubic-bezier(.22,1,.36,1), box-shadow .5s cubic-bezier(.22,1,.36,1); }
  ${S} .bs-card.is-match { translate: 0 -8px; box-shadow: inset 0 0 0 2px {{ section.settings.text_color }}, 0 8px 0 {{ section.settings.text_color }}; }
  ${S} .bs-card.is-dim { scale: .97; opacity: .8; }
  ${S} .bs-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; }
  ${S} .bs-role { padding-top: 4px; font-size: 12.5px; }
  ${S} .bs-price { font-family: ${head}; font-size: 28px; line-height: 1; letter-spacing: -.03em; }
  ${S} .bs-art { position: relative; margin-top: 4px; height: 188px; display: grid; place-items: center; }
  ${S} .bs-art > a { display: grid; place-items: center; height: 172px; transition: rotate .7s cubic-bezier(.34,1.56,.64,1); }
  ${S} .bs-card.is-match .bs-art > a { rotate: -4deg; }
  ${S} .bs-art img { height: 172px; width: auto; max-width: 100%; object-fit: contain; display: block; }
  ${S} .bs-sticker { position: absolute; right: 0; top: 4px; width: 68px; height: 68px; padding: 0 8px; border-radius: 99px; display: grid; place-items: center; text-align: center;
    font-size: 10.5px; text-transform: uppercase; line-height: 1.1; letter-spacing: .02em;
    background: {{ section.settings.text_color }}; color: {{ section.settings.accent }};
    scale: .3; rotate: -30deg; opacity: 0; transition: scale .5s cubic-bezier(.34,1.56,.64,1), rotate .5s cubic-bezier(.34,1.56,.64,1), opacity .5s; }
  ${S} .bs-card.is-match .bs-sticker { scale: 1; rotate: 12deg; opacity: 1; }
  ${S} .bs-name { font-family: ${head}; font-size: 34px; line-height: .95; letter-spacing: -.035em; }
  ${S} .bs-name a { color: inherit; text-decoration: none; }
  ${S} .bs-meta { margin-top: 16px; padding-top: 12px; border-top: 2px solid {{ section.settings.text_color }}; display: flex; align-items: center; justify-content: space-between; gap: 8px; }
  ${S} .bs-int { display: flex; align-items: center; gap: 8px; font-size: 15px; font-weight: 700; }
  ${S} .bs-meter { display: inline-flex; align-items: flex-end; gap: 2px; }
  ${S} .bs-meter i { display: block; width: 4px; border-radius: 1px; background: {{ section.settings.text_color }}; opacity: .22; }
  ${S} .bs-meter i.is-on { opacity: 1; }
  ${S} .bs-size { padding: 3px 10px; border-radius: 99px; font-size: 11.5px; box-shadow: inset 0 0 0 1.5px {{ section.settings.text_color }}; }
  ${S} .bs-rule { margin-top: 12px; min-height: 2.7em; font-size: 12.5px; line-height: 1.375; }
  ${S} .bs-form { margin: 16px 0 0; margin-top: auto; padding-top: 16px; }
  ${S} .bs-add { width: 100%; height: 44px; border: 0; border-radius: 99px; cursor: pointer; font: inherit; font-size: 14px; font-weight: 700;
    background: {{ section.settings.text_color }}; transition: filter .2s, transform .2s; }
  ${S} .bs-add:hover { filter: brightness(1.25); }
  ${S} .bs-add:active { transform: scale(.98); }
  ${S} .bs-add:disabled { opacity: .5; cursor: not-allowed; }
  @container (min-width: 640px) {
    ${S} .bs-wrap { padding: 44px 32px 48px; }
    ${S} .bs-h { font-size: 58px; }
    ${S} .bs-rail { display: grid; grid-auto-flow: column; grid-auto-columns: minmax(0, 1fr); gap: 16px; margin: 32px 0 0; padding: 12px 0 16px; overflow: visible; }
    ${S} .bs-card { padding: 20px; }
    ${S} .bs-name { font-size: 38px; }
  }
  @container (min-width: 760px) {
    ${S} .bs-head { flex-direction: row; align-items: flex-end; justify-content: space-between; gap: 40px; }
    ${S} .bs-tabs { width: auto; }
    ${S} .bs-tab { flex: none; padding: 0 16px; font-size: 13.5px; }
  }
  @media (prefers-reduced-motion: reduce) { ${S} * { transition-duration: 1ms !important; } }
</style>`;

  const bottle = bottleSvg({
    name: "{{ bs_name | escape }}",
    size: "{{ block.settings.size | escape }}",
    band: "{{ block.settings.color }}",
    body: "{{ section.settings.text_color }}",
    paper: "{{ section.settings.paper }}",
    fit: `{% if bs_name.size > 8 %}${FIT}{% endif %}`,
  }).replace(/\n/g, "\n                ");

  const markup = `{%- comment -%}
  Use-Case Chooser by boost.supply. Add it to your homepage (or any page).
  Each "Product card" block picks a real product and adds it to the cart.
  The tab label on each card becomes a tab on top; picking a tab lifts that card.
{%- endcomment -%}
{%- assign bs_sel = section.settings.selected | at_most: section.blocks.size -%}
<div class="bs-pc-{{ section.id }}" id="bs-pc-{{ section.id }}">
  <div class="bs-wrap">
    <div class="bs-head">
      <div class="bs-intro">
        {%- if section.settings.eyebrow != blank -%}<p class="bs-eyebrow bs-mono">{{ section.settings.eyebrow }}</p>{%- endif -%}
        <h2 class="bs-h">{{ section.settings.heading }}</h2>
        {%- if section.settings.subheading != blank -%}<p class="bs-sub">{{ section.settings.subheading }}</p>{%- endif -%}
      </div>
      {%- if section.blocks.size > 1 -%}
        <div>
          {%- if section.settings.prompt != blank -%}<p class="bs-prompt bs-mono">{{ section.settings.prompt }}</p>{%- endif -%}
          <div class="bs-tabs" role="tablist">
            {%- for block in section.blocks -%}
              {%- if block.settings.tab_label != blank -%}
                <button type="button" class="bs-tab" role="tab" data-tab data-i="{{ forloop.index0 }}" aria-selected="{% if forloop.index == bs_sel %}true{% else %}false{% endif %}">{{ block.settings.tab_label }}</button>
              {%- endif -%}
            {%- endfor -%}
          </div>
        </div>
      {%- endif -%}
    </div>

    <div class="bs-rail" data-rail>
      {%- for block in section.blocks -%}
        {%- assign bs_p = block.settings.product -%}
        {%- assign bs_name = block.settings.name | default: bs_p.title -%}
        {%- assign bs_v = bs_p.selected_or_first_available_variant -%}
        <article class="bs-card{% if bs_sel > 0 %}{% if forloop.index == bs_sel %} is-match{% else %} is-dim{% endif %}{% endif %}" data-card style="background: {{ block.settings.color }};" {{ block.shopify_attributes }}>
          <div class="bs-top">
            <span class="bs-role bs-mono">{{ block.settings.role }}</span>
            <span class="bs-price">{%- if bs_p != blank -%}{{ bs_v.price | money_without_trailing_zeros }}{%- else -%}{{ block.settings.price }}{%- endif -%}</span>
          </div>
          <div class="bs-art">
            <a href="{%- if bs_p != blank -%}{{ bs_p.url }}{%- else -%}#{%- endif -%}" aria-label="{{ bs_name | escape }}">
              {%- if bs_p.featured_image -%}
                {{ bs_p.featured_image | image_url: width: 400 | image_tag: loading: 'lazy', alt: bs_name }}
              {%- else -%}
                ${bottle}
              {%- endif -%}
            </a>
            <span class="bs-sticker bs-mono" aria-hidden="true">{{ section.settings.match_text }}</span>
          </div>
          <p class="bs-name">{%- if bs_p != blank -%}<a href="{{ bs_p.url }}">“{{ bs_name }}”</a>{%- else -%}“{{ bs_name }}”{%- endif -%}</p>
          <div class="bs-meta">
            <span class="bs-int">
              {{ block.settings.intensity }}
              <span class="bs-meter" aria-hidden="true">
                {%- for bs_i in (1..5) -%}<i style="height: {{ bs_i | times: 2 | plus: 4 }}px;"{% if bs_i <= block.settings.level %} class="is-on"{% endif %}></i>{%- endfor -%}
              </span>
            </span>
            {%- if block.settings.size != blank -%}<span class="bs-size bs-mono">{{ block.settings.size }}</span>{%- endif -%}
          </div>
          {%- if block.settings.rule != blank -%}<p class="bs-rule bs-mono">{{ block.settings.rule }}</p>{%- endif -%}
          {%- if bs_p != blank -%}
            {%- form 'product', bs_p, class: 'bs-form' -%}
              <input type="hidden" name="id" value="{{ bs_v.id }}">
              <input type="hidden" name="quantity" value="1">
              <button type="submit" name="add" class="bs-add" style="color: {{ block.settings.color }};"{% unless bs_v.available %} disabled{% endunless %}>
                {%- if bs_v.available -%}{{ section.settings.add_text }} +{%- else -%}{{ section.settings.sold_out_text }}{%- endif -%}
              </button>
            {%- endform -%}
          {%- else -%}
            <div class="bs-form"><button type="button" class="bs-add" style="color: {{ block.settings.color }};" disabled>{{ section.settings.add_text }} +</button></div>
          {%- endif -%}
        </article>
      {%- endfor -%}
    </div>
  </div>
</div>
<script>
  (function () {
    var root = document.getElementById('bs-pc-{{ section.id }}');
    if (!root) return;
    var tabs = Array.prototype.slice.call(root.querySelectorAll('[data-tab]'));
    var cards = Array.prototype.slice.call(root.querySelectorAll('[data-card]'));
    var rail = root.querySelector('[data-rail]');
    function pick(i, scroll) {
      tabs.forEach(function (t) {
        t.setAttribute('aria-selected', parseInt(t.dataset.i, 10) === i ? 'true' : 'false');
      });
      cards.forEach(function (c, j) {
        c.classList.toggle('is-match', j === i);
        c.classList.toggle('is-dim', j !== i);
      });
      var card = cards[i];
      if (scroll && rail && card && rail.scrollWidth > rail.clientWidth + 2) {
        /* tween scrollLeft with snapping paused: the cards' lift animation
           makes the browser re-snap, which would cancel a native smooth scroll */
        var max = rail.scrollWidth - rail.clientWidth;
        var to = Math.max(0, Math.min(max, card.offsetLeft - (rail.clientWidth - card.offsetWidth) / 2));
        var from = rail.scrollLeft, t0 = performance.now();
        cancelAnimationFrame(rail._bsGlide);
        rail.style.scrollSnapType = 'none';
        var step = function (now) {
          var p = Math.min(1, (now - t0) / 480);
          rail.scrollLeft = from + (to - from) * (1 - Math.pow(1 - p, 3));
          if (p < 1) rail._bsGlide = requestAnimationFrame(step);
          else rail.style.scrollSnapType = '';
        };
        rail._bsGlide = requestAnimationFrame(step);
      }
    }
    tabs.forEach(function (t) {
      t.addEventListener('click', function () { pick(parseInt(t.dataset.i, 10), true); });
    });
    var first = root.querySelector('.bs-card.is-match');
    if (first && rail && rail.scrollWidth > rail.clientWidth + 2) {
      rail.scrollLeft = first.offsetLeft - (rail.clientWidth - first.offsetWidth) / 2;
    }
  })();
</script>`;

  const cards = list(config, "cards");
  const hexOk = (h: string) => (/^#[0-9a-f]{6}$/i.test(h) ? h.toLowerCase() : str(config, "accent", "#d1e030"));

  const schema = buildSchema({
    name: "Use-Case Chooser",
    settings: [
      txt("text", "eyebrow", "Eyebrow", str(config, "eyebrow")),
      txt("text", "heading", "Heading", str(config, "heading")),
      txt("textarea", "subheading", "Subheading", str(config, "subheading")),
      txt("text", "prompt", "Tabs prompt", str(config, "prompt")),
      { type: "range", id: "selected", label: "Preselected card", min: 0, max: 6, step: 1, default: Math.max(0, Math.min(6, num(config, "selected", 2))), },
      txt("text", "match_text", "Best match sticker", str(config, "matchText")),
      txt("text", "add_text", "Add button", str(config, "addText")),
      txt("text", "sold_out_text", "Sold out text", "Sold out"),
      { type: "header", content: "Style" },
      { type: "color", id: "bg", label: "Background", default: str(config, "bg") },
      { type: "color", id: "text_color", label: "Text & outlines", default: str(config, "textColor") },
      { type: "color", id: "accent", label: "Accent (active tab, sticker)", default: str(config, "accent") },
      { type: "color", id: "paper", label: "Bottle label", default: str(config, "paper") },
      { type: "range", id: "radius", label: "Card radius", min: 0, max: 40, step: 2, unit: "px", default: Math.max(0, Math.min(40, Math.round(num(config, "radius", 28) / 2) * 2)) },
    ],
    blocks: [
      {
        type: "card",
        name: "Product card",
        settings: [
          { type: "product", id: "product", label: "Product" },
          { type: "text", id: "tab_label", label: "Tab label", default: "Cook with it" },
          { type: "text", id: "role", label: "Role label", default: "for cooking" },
          { type: "text", id: "name", label: "Name (leave empty for product title)" },
          { type: "text", id: "intensity", label: "Intensity word", default: "Mellow" },
          { type: "range", id: "level", label: "Intensity meter", min: 0, max: 5, step: 1, default: 3 },
          { type: "text", id: "size", label: "Size", default: "750 mL" },
          { type: "text", id: "price", label: "Price shown before a product is picked" },
          { type: "text", id: "rule", label: "Usage rule" },
          { type: "color", id: "color", label: "Card colour", default: "#d1e030" },
        ],
      },
    ],
    maxBlocks: 6,
    presetBlocks: cards.map((c) => ({
      type: "card",
      settings: {
        tab_label: esc(c.tab ?? ""),
        role: esc(c.role ?? ""),
        name: esc(c.name ?? ""),
        intensity: esc(c.intensity ?? ""),
        level: Math.max(0, Math.min(5, Math.round(toNum(c.level, 3)))),
        size: esc(c.size ?? ""),
        price: money(toNum(c.price), str(config, "currency", "$")),
        rule: esc(c.rule ?? ""),
        color: hexOk(c.color ?? ""),
      },
    })),
  });

  return section({ style, markup, schema });
}

export const productChooser: Tweak = {
  slug: "product-chooser",
  inspiredBy: "graza",
  name: "Use-Case Chooser",
  tagline: "Big side-by-side product cards with tabs that lift the best match for the job.",
  description:
    "Modeled on the oil chooser Graza uses on its homepage. Two or three bold product cards sit side by side, each with a role label, an intensity word and meter, size, price, a one-line rule for when to use it and its own add button. Tabs on top let shoppers say what they're making and lift the best match. Every card is a block with a real product, so it adds straight to the cart.",
  category: "homepage",
  tier: "free",
  tint: "#f3f5df",
  Preview,
  generateLiquid,
  defaults,
  fields: [
    { key: "eyebrow", label: "Eyebrow", type: "text", group: "Content" },
    { key: "heading", label: "Heading", type: "text", group: "Content" },
    { key: "subheading", label: "Subheading", type: "textarea", group: "Content" },
    { key: "prompt", label: "Tabs prompt", type: "text", group: "Content" },
    { key: "currency", label: "Currency symbol", type: "text", group: "Content" },
    {
      key: "cards", label: "Cards", type: "list", group: "Cards",
      hint: "Meter is 0 to 5. Colour is a hex value. Price is preview only; your store uses the product price",
      itemFields: [
        { key: "tab", label: "Tab label", type: "text" },
        { key: "role", label: "Role", type: "text" },
        { key: "name", label: "Name", type: "text" },
        { key: "intensity", label: "Intensity", type: "text" },
        { key: "level", label: "Meter (0–5)", type: "text" },
        { key: "size", label: "Size", type: "text" },
        { key: "price", label: "Price", type: "text" },
        { key: "rule", label: "Usage rule", type: "text" },
        { key: "color", label: "Card colour", type: "text" },
      ],
      newItem: {
        tab: "Bake with it", role: "for baking", name: "Golden", intensity: "Buttery", level: "3",
        size: "500 mL", price: "18", rule: "Cakes, focaccia, anything with a crumb.", color: "#f6c8a8",
      },
      addLabel: "Add card", max: 4,
    },
    { key: "selected", label: "Preselected card", type: "slider", group: "Cards", min: 1, max: 4, step: 1 },
    { key: "matchText", label: "Best match sticker", type: "text", group: "Cards" },
    { key: "addText", label: "Add button", type: "text", group: "Cards" },
    { key: "addedText", label: "Added state", type: "text", group: "Cards" },
    fontField("Typography", "font", "Body font"),
    fontField("Typography", "headFont", "Headline font"),
    fontField("Typography", "monoFont", "Label font"),
    { key: "radius", label: "Card radius", type: "slider", group: "Layout", min: 0, max: 40, step: 2, unit: "px" },
    { key: "bg", label: "Background", type: "color", group: "Colors" },
    { key: "textColor", label: "Text & outlines", type: "color", group: "Colors" },
    { key: "accent", label: "Accent", type: "color", group: "Colors", hint: "Active tab and best-match sticker" },
    { key: "paper", label: "Bottle label", type: "color", group: "Colors" },
  ],
};
