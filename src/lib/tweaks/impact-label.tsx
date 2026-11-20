"use client";

import { useState } from "react";
import type { Tweak, TweakConfig } from "../types";
import { str, num, list, fontStack, esc } from "../cfg";
import { fontField } from "../fields";
import { buildSchema, section, fontFaceFor } from "../liquid";
import { Icon, iconMarkup } from "../icons";

/* ============================================================
   Impact Label
   A nutrition-label style carbon footprint card beside the
   product photo: one big kg CO2e number, a breakdown bar
   (materials, manufacturing, transport, end of life) with
   values, a comparison to a typical product and material
   callouts with small icons.
   ============================================================ */

const SERIF = "Georgia, 'Times New Roman', serif";
const MONO = "ui-monospace, 'SF Mono', Menlo, monospace";
const EASE = "cubic-bezier(.22,1,.36,1)";

/* material icons, drawn on a 24px grid in currentColor */
const svg = (body: string) =>
  `svg:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
const WOOL = svg(`<circle cx="12" cy="12" r="8"/><path d="M5.2 8.6c4.2-.2 9 2.6 11.2 9"/><path d="M8.2 4.8c3.2 1.6 7 5.6 8 11.4"/><path d="M4.4 13.4c3.6-.6 7.6 1.4 9.6 6"/>`);
const CANE = svg(`<path d="M8 21V3M14 21V7"/><path d="M6.5 8h3M6.5 14h3M12.5 12h3M12.5 17.5h3"/><path d="M14 7c.8-2.6 3.2-4 6-4-.4 2.6-2.6 4.6-6 4.6"/>`);
const BOTTLE = svg(`<path d="M10 2.5h4v3l1.5 2.5V20a1.5 1.5 0 0 1-1.5 1.5h-4A1.5 1.5 0 0 1 8.5 20V8L10 5.5z"/><path d="M8.5 11h7M8.5 16h7"/>`);
const BEAN = svg(`<path d="M12 3.5c3.6 0 6 3.6 6 8.5s-2.4 8.5-6 8.5-6-3.6-6-8.5 2.4-8.5 6-8.5z"/><path d="M12 3.5c-1.6 3-1.6 14 0 17"/>`);

const defaults: TweakConfig = {
  eyebrow: "Our footprint",
  heading: "Made to tread",
  headingAccent: "lightly",
  intro: "Every pair carries its carbon number, like a nutrition label, so you can see exactly what goes into it.",
  image: "/mockups/sneaker-sand.jpg",
  productName: "Daily Runner · Sand",
  labelTitle: "Carbon footprint",
  labelSub: "Per pair, cradle to grave",
  unit: "kg CO2e",
  materialsLabel: "Materials",
  materialsKg: 4.2,
  manufacturingLabel: "Manufacturing",
  manufacturingKg: 2.1,
  transportLabel: "Transport",
  transportKg: 0.9,
  eolLabel: "End of life",
  eolKg: 0.4,
  compareTitle: "Vs. a typical sneaker",
  thisLabel: "This pair",
  typicalLabel: "Typical",
  industryKg: 12.5,
  lowerText: "lower than a typical sneaker",
  footnote: "Measured with a third-party life cycle assessment, from raw materials to end of life.",
  materialsTitle: "What it's made of",
  materials: [
    { icon: WOOL, name: "Merino wool upper", detail: "Renewable and naturally soft" },
    { icon: CANE, name: "Sugarcane sole", detail: "Plant-based foam" },
    { icon: BOTTLE, name: "Recycled laces", detail: "Spun from plastic bottles" },
    { icon: BEAN, name: "Castor bean insole", detail: "Bio-based cushioning" },
  ],
  bg: "#FFFFFF",
  card: "#FFFFFF",
  textColor: "#212121",
  muted: "#6E6A64",
  line: "#E0DACF",
  tile: "#F5F4F1",
  accent: "#10714E",
  navy: "#03143B",
  font: "system",
  radius: 6,
};

/* ---------- colour helpers ---------- */

const rgb = (hex: string) =>
  /^#[0-9a-f]{6}$/i.test(hex) ? [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) : null;

const mix = (a: string, b: string, t: number) => {
  const pa = rgb(a);
  const pb = rgb(b);
  if (!pa || !pb) return a;
  return "#" + pa.map((v, i) => Math.round(v + (pb[i] - v) * t).toString(16).padStart(2, "0")).join("");
};

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const fmt1 = (n: number) => (Math.round(n * 10) / 10).toFixed(1);
/** "CO2" → "CO₂" for the label unit. */
const sub2 = (s: string) => s.replace(/CO2/g, "CO₂");

function Preview({ config }: { config: TweakConfig }) {
  const bg = str(config, "bg", "#FFFFFF");
  const card = str(config, "card", "#FFFFFF");
  const text = str(config, "textColor", "#212121");
  const muted = str(config, "muted", "#6E6A64");
  const line = str(config, "line", "#E0DACF");
  const tile = str(config, "tile", "#F5F4F1");
  const accent = str(config, "accent", "#10714E");
  const navy = str(config, "navy", "#03143B");
  const radius = num(config, "radius", 6);
  const image = str(config, "image").trim();
  const unit = sub2(str(config, "unit", "kg CO2e"));
  const [active, setActive] = useState<number | null>(null);

  const parts = [
    { label: str(config, "materialsLabel"), v: Math.max(0, num(config, "materialsKg", 4.2)), c: accent },
    { label: str(config, "manufacturingLabel"), v: Math.max(0, num(config, "manufacturingKg", 2.1)), c: navy },
    { label: str(config, "transportLabel"), v: Math.max(0, num(config, "transportKg", 0.9)), c: mix(line, "#000000", 0.25) },
    { label: str(config, "eolLabel"), v: Math.max(0, num(config, "eolKg", 0.4)), c: line },
  ];
  const total = parts.reduce((s, p) => s + p.v, 0);
  const ind = Math.max(0, num(config, "industryKg", 12.5));
  const max = Math.max(total, ind, 0.1);
  const lower = ind > 0 ? Math.round((1 - total / ind) * 100) : 0;
  const materials = list(config, "materials");
  const caps = "uppercase tracking-[0.16em]";
  /* each column collapses into the parent grid on narrow widths, so the
     order there is heading → photo → label → materials */
  const col = "contents @min-[720px]:flex @min-[720px]:flex-col @min-[720px]:gap-6";

  return (
    <div className="@container w-full" style={{ background: bg, color: text, fontFamily: fontStack(str(config, "font", "system")) }}>
      <div className="mx-auto grid w-full max-w-[1100px] items-start gap-5 px-4 pb-8 pt-6 @min-[720px]:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] @min-[720px]:gap-10 @min-[720px]:px-10 @min-[720px]:pb-12 @min-[720px]:pt-12">
        <div className={col}>
          {/* Photo */}
          <div
            className="relative order-2 aspect-square overflow-hidden @min-[520px]:aspect-[4/3] @min-[720px]:aspect-square"
            style={{ background: tile, borderRadius: radius }}
          >
            {image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={image} alt={str(config, "productName")} loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover" />
            ) : (
              <span className="absolute inset-0 grid place-items-center">
                <svg width="96" height="56" viewBox="0 0 120 70" aria-hidden>
                  <path d="M10 50C8 45 12 41 20 39C30 37 40 35 48 32C56 29 64 25 70 21C73 19 77 19 79 22C81 25 84 28 90 28C96 28 102 25 106 24C109 23 112 25 112 29L113 50Z" fill={line} />
                  <path d="M12 49C9.5 49 7 51 7 54.5C7 58.5 11 61 17 61H105C110 61 114 59 114 55C114 52 112 50 109 49.5Z" fill={mix(line, "#FFFFFF", 0.5)} />
                </svg>
              </span>
            )}
            <span
              className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full py-1.5 pl-2 pr-3 text-[12px] font-medium tabular-nums"
              style={{ background: accent, color: "#FFFFFF" }}
            >
              <Icon token="pack:leaf" size={13} strokeWidth={2} />
              {fmt1(total)} {unit}
            </span>
            {str(config, "productName") && (
              <span className={`absolute bottom-3 left-3 rounded-full bg-white/90 px-3 py-1.5 text-[10px] font-medium ${caps}`}>
                {str(config, "productName")}
              </span>
            )}
          </div>

          {/* Materials */}
          {materials.length > 0 && (
            <div className="order-4">
              <p className={`text-[11px] font-semibold ${caps}`}>{str(config, "materialsTitle")}</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {materials.map((m, i) => (
                  <div key={i} className="flex items-start gap-2.5 p-3" style={{ background: tile, borderRadius: radius }}>
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white" style={{ color: accent }}>
                      <Icon token={m.icon ?? ""} size={20} strokeWidth={1.6} />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[13px] font-semibold leading-tight">{m.name}</span>
                      <span className="mt-0.5 block text-[11.5px] leading-snug" style={{ color: muted }}>
                        {m.detail}
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className={col}>
          {/* Heading */}
          <div className="order-1">
            {str(config, "eyebrow") && (
              <p className={`text-[11px] font-medium ${caps}`} style={{ color: accent }}>
                {str(config, "eyebrow")}
              </p>
            )}
            <h3 className="mt-2 text-[30px] font-medium leading-[1.05] tracking-[-0.02em] @min-[720px]:text-[40px]">
              {str(config, "heading")}{" "}
              {str(config, "headingAccent") && (
                <em className="font-normal italic" style={{ fontFamily: SERIF }}>
                  {str(config, "headingAccent")}
                </em>
              )}
            </h3>
            {str(config, "intro") && (
              <p className="mt-3 max-w-[440px] text-[14px] leading-relaxed" style={{ color: muted }}>
                {str(config, "intro")}
              </p>
            )}
          </div>

          {/* Label */}
          <div className="order-3 border-2 p-4 @min-[720px]:p-5" style={{ borderColor: text, borderRadius: radius, background: card }}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className={`text-[13px] font-semibold ${caps}`}>{str(config, "labelTitle")}</p>
                <p className="mt-0.5 text-[12px]" style={{ color: muted }}>
                  {str(config, "labelSub")}
                </p>
              </div>
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full" style={{ background: mix(accent, "#FFFFFF", 0.88), color: accent }}>
                <Icon token="pack:leaf" size={16} strokeWidth={1.8} />
              </span>
            </div>
            <div className="mt-3 h-[6px]" style={{ background: text }} />

            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-[60px] font-semibold leading-none tracking-[-0.05em] tabular-nums @min-[720px]:text-[68px]">{fmt1(total)}</span>
              <span className="text-[16px] font-medium">{unit}</span>
            </div>

            {/* Breakdown bar */}
            <div className="mt-4 flex h-3 gap-[2px] overflow-hidden" style={{ borderRadius: 3 }}>
              {parts.map((p, i) =>
                p.v > 0 ? (
                  <span
                    key={i}
                    className="block h-full"
                    style={{
                      flex: `${p.v} 1 0`,
                      background: p.c,
                      opacity: active === null || active === i ? 1 : 0.25,
                      transition: `opacity 300ms ${EASE}`,
                    }}
                  />
                ) : null,
              )}
            </div>

            <div className="mt-4 h-px" style={{ background: text }} />
            <ul>
              {parts.map((p, i) => {
                const on = active === i;
                const pct = total > 0 ? Math.round((p.v / total) * 100) : 0;
                return (
                  <li key={i}>
                    <button
                      type="button"
                      onMouseEnter={() => setActive(i)}
                      onMouseLeave={() => setActive(null)}
                      onFocus={() => setActive(i)}
                      onBlur={() => setActive(null)}
                      onClick={() => setActive(on ? null : i)}
                      className="-mx-2 flex w-[calc(100%+16px)] items-center gap-2.5 border-b px-2 py-2.5 text-left text-[13.5px]"
                      style={{ borderColor: line, background: on ? tile : "transparent", transition: `background-color 250ms ${EASE}` }}
                    >
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ background: p.c, boxShadow: p.c === line ? `inset 0 0 0 1px ${mix(line, "#000000", 0.15)}` : "none" }}
                      />
                      <span className={`flex-1 ${i === 0 ? "font-semibold" : ""}`}>{p.label}</span>
                      <span className="font-semibold tabular-nums">{fmt1(p.v)} kg</span>
                      <span className="w-9 text-right text-[11px] tabular-nums" style={{ fontFamily: MONO, color: muted }}>
                        {pct}%
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
            <div className="h-[6px]" style={{ background: text }} />

            {/* Comparison */}
            <p className={`mt-3.5 text-[11px] font-semibold ${caps}`}>{str(config, "compareTitle")}</p>
            <div className="mt-2.5 flex flex-col gap-2">
              {[
                { label: str(config, "thisLabel"), v: total, c: accent },
                { label: str(config, "typicalLabel"), v: ind, c: mix(line, "#000000", 0.18) },
              ].map((row, i) => (
                <div key={i} className="flex items-center gap-3 text-[12px]">
                  <span className="w-[68px] shrink-0 truncate" style={{ color: i ? muted : text }}>
                    {row.label}
                  </span>
                  <span className="h-2.5 flex-1 overflow-hidden rounded-full" style={{ background: tile }}>
                    <span className="block h-full rounded-full" style={{ width: `${(row.v / max) * 100}%`, background: row.c, transition: `width 700ms ${EASE}` }} />
                  </span>
                  <span className="w-9 shrink-0 text-right font-semibold tabular-nums">{fmt1(row.v)}</span>
                </div>
              ))}
            </div>
            {lower > 0 && (
              <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${caps}`} style={{ background: accent, color: "#FFFFFF" }}>
                  {lower}% lower
                </span>
                <span className="text-[14px] italic" style={{ fontFamily: SERIF }}>
                  {str(config, "lowerText")}
                </span>
              </p>
            )}
            {str(config, "footnote") && (
              <p className="mt-3.5 border-t pt-2.5 text-[10.5px] leading-relaxed" style={{ borderColor: line, color: muted }}>
                {str(config, "footnote")}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function generateLiquid(config: TweakConfig): string {
  const { face, family } = fontFaceFor(str(config, "font", "system"));
  const S = ".bs-il-{{ section.id }}";
  const r = "{{ section.settings.radius }}px";
  const mono = "ui-monospace, 'SF Mono', Menlo, monospace";
  const ease = "cubic-bezier(.22,1,.36,1)";
  const caps = "text-transform: uppercase; letter-spacing: .16em;";
  const radius = clamp(Math.round(num(config, "radius", 6) / 2) * 2, 0, 24);
  const kg = (k: string, fb: number) => Math.round(Math.max(0, num(config, k, fb)) * 10) / 10;
  const leaf = iconMarkup("pack:leaf", 13, 2);
  const leafBig = iconMarkup("pack:leaf", 16, 1.8);
  const rows = [
    { k: "m", label: "materials_label", v: "bs_m" },
    { k: "f", label: "manufacturing_label", v: "bs_f" },
    { k: "t", label: "transport_label", v: "bs_t" },
    { k: "e", label: "eol_label", v: "bs_e" },
  ];

  const style = `<style>
${face ? face + "\n" : ""}  ${S} { container-type: inline-size; background: {{ section.settings.bg }}; color: {{ section.settings.text_color }}; font-family: ${family};
    --c-m: {{ section.settings.accent }}; --c-f: {{ section.settings.navy }};
    --c-t: color-mix(in srgb, {{ section.settings.line }} 75%, #000); --c-e: {{ section.settings.line }}; }
  ${S} * { box-sizing: border-box; }
  ${S} p, ${S} h2, ${S} ul { margin: 0; padding: 0; }
  ${S} ul { list-style: none; }
  ${S} .bs-wrap { max-width: 1100px; margin: 0 auto; padding: 24px 16px 32px; display: grid; gap: 20px; align-items: start; }
  ${S} .bs-col { display: contents; }
  ${S} .bs-headw { order: 1; }
  ${S} .bs-photo { order: 2; }
  ${S} .bs-label { order: 3; }
  ${S} .bs-matw { order: 4; }
  ${S} .bs-caps { ${caps} }
  ${S} .bs-eyebrow { font-size: 11px; font-weight: 500; color: {{ section.settings.accent }}; }
  ${S} .bs-h { margin-top: 8px; font-size: 30px; font-weight: 500; line-height: 1.05; letter-spacing: -.02em; }
  ${S} .bs-h em { font-family: Georgia, 'Times New Roman', serif; font-style: italic; font-weight: 400; }
  ${S} .bs-intro { margin-top: 12px; max-width: 440px; font-size: 14px; line-height: 1.6; color: {{ section.settings.muted }}; }
  ${S} .bs-photo { position: relative; aspect-ratio: 1 / 1; overflow: hidden; border-radius: ${r}; background: {{ section.settings.tile }}; }
  ${S} .bs-photo img, ${S} .bs-photo .bs-ph { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
  ${S} .bs-badge { position: absolute; left: 12px; top: 12px; display: flex; align-items: center; gap: 6px; padding: 6px 12px 6px 8px; border-radius: 99px;
    background: {{ section.settings.accent }}; color: #fff; font-size: 12px; font-weight: 500; font-variant-numeric: tabular-nums; }
  ${S} .bs-pname { position: absolute; left: 12px; bottom: 12px; padding: 6px 12px; border-radius: 99px; background: rgba(255,255,255,.9); font-size: 10px; font-weight: 500; }
  ${S} .bs-label { padding: 16px; border: 2px solid {{ section.settings.text_color }}; border-radius: ${r}; background: {{ section.settings.card }}; }
  ${S} .bs-lt { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
  ${S} .bs-lt b { display: block; font-size: 13px; font-weight: 600; }
  ${S} .bs-lt small { display: block; margin-top: 2px; font-size: 12px; color: {{ section.settings.muted }}; }
  ${S} .bs-leaf { width: 32px; height: 32px; flex-shrink: 0; border-radius: 99px; display: grid; place-items: center;
    background: color-mix(in srgb, {{ section.settings.accent }} 12%, #fff); color: {{ section.settings.accent }}; }
  ${S} .bs-thick { height: 6px; background: {{ section.settings.text_color }}; }
  ${S} .bs-thin { height: 1px; margin-top: 16px; background: {{ section.settings.text_color }}; }
  ${S} .bs-lt + .bs-thick { margin-top: 12px; }
  ${S} .bs-num { margin-top: 12px; display: flex; align-items: baseline; gap: 8px; }
  ${S} .bs-num b { font-size: 60px; font-weight: 600; line-height: 1; letter-spacing: -.05em; font-variant-numeric: tabular-nums; }
  ${S} .bs-num span { font-size: 16px; font-weight: 500; }
  ${S} .bs-bar { margin-top: 16px; display: flex; gap: 2px; height: 12px; border-radius: 3px; overflow: hidden; }
  ${S} .bs-seg { display: block; height: 100%; transition: opacity .3s ${ease}; }
  ${S} .bs-row { display: flex; align-items: center; gap: 10px; margin: 0 -8px; padding: 10px 8px; border-bottom: 1px solid {{ section.settings.line }}; font-size: 13.5px; transition: background-color .25s ${ease}; }
  ${S} .bs-row:hover { background: {{ section.settings.tile }}; }
  ${S} .bs-row i { width: 10px; height: 10px; flex-shrink: 0; border-radius: 99px; }
  ${S} .bs-row span { flex: 1; }
  ${S} .bs-row:first-child span { font-weight: 600; }
  ${S} .bs-row b { font-weight: 600; font-variant-numeric: tabular-nums; }
  ${S} .bs-row small { width: 36px; text-align: right; font-family: ${mono}; font-size: 11px; color: {{ section.settings.muted }}; }
${rows.map((x) => `  ${S} .bs-label:has(.bs-row[data-k="${x.k}"]:hover) .bs-seg:not([data-k="${x.k}"]) { opacity: .25; }`).join("\n")}
  ${S} .bs-ct { margin-top: 14px; font-size: 11px; font-weight: 600; }
  ${S} .bs-cmp { margin-top: 10px; display: flex; flex-direction: column; gap: 8px; }
  ${S} .bs-cmp div { display: flex; align-items: center; gap: 12px; font-size: 12px; }
  ${S} .bs-cmp span { width: 68px; flex-shrink: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  ${S} .bs-cmp div + div span { color: {{ section.settings.muted }}; }
  ${S} .bs-cmp em { flex: 1; height: 10px; border-radius: 99px; overflow: hidden; background: {{ section.settings.tile }}; }
  ${S} .bs-cmp em i { display: block; height: 100%; border-radius: 99px; background: {{ section.settings.accent }}; }
  ${S} .bs-cmp div + div em i { background: color-mix(in srgb, {{ section.settings.line }} 82%, #000); }
  ${S} .bs-cmp b { width: 36px; flex-shrink: 0; text-align: right; font-weight: 600; font-variant-numeric: tabular-nums; }
  ${S} .bs-lower { margin-top: 12px; display: flex; flex-wrap: wrap; align-items: center; gap: 4px 8px; }
  ${S} .bs-lower b { padding: 4px 10px; border-radius: 99px; background: {{ section.settings.accent }}; color: #fff; font-size: 11px; font-weight: 600; }
  ${S} .bs-lower span { font-family: Georgia, 'Times New Roman', serif; font-style: italic; font-size: 14px; }
  ${S} .bs-foot { margin-top: 14px; padding-top: 10px; border-top: 1px solid {{ section.settings.line }}; font-size: 10.5px; line-height: 1.6; color: {{ section.settings.muted }}; }
  ${S} .bs-mt { font-size: 11px; font-weight: 600; }
  ${S} .bs-mats { margin-top: 12px; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
  ${S} .bs-mat { display: flex; align-items: flex-start; gap: 10px; padding: 12px; border-radius: ${r}; background: {{ section.settings.tile }}; }
  ${S} .bs-mat-ic { width: 36px; height: 36px; flex-shrink: 0; border-radius: 99px; display: grid; place-items: center; background: #fff; color: {{ section.settings.accent }}; }
  ${S} .bs-mat-ic svg { width: 20px; height: 20px; }
  ${S} .bs-mat b { display: block; font-size: 13px; font-weight: 600; line-height: 1.25; }
  ${S} .bs-mat small { display: block; margin-top: 2px; font-size: 11.5px; line-height: 1.4; color: {{ section.settings.muted }}; }
  @container (min-width: 520px) { ${S} .bs-photo { aspect-ratio: 4 / 3; } }
  @container (min-width: 720px) {
    ${S} .bs-wrap { grid-template-columns: minmax(0, 1.05fr) minmax(0, 1fr); gap: 40px; padding: 48px 40px; }
    ${S} .bs-col { display: flex; flex-direction: column; gap: 24px; }
    ${S} .bs-photo { aspect-ratio: 1 / 1; }
    ${S} .bs-label { padding: 20px; }
    ${S} .bs-h { font-size: 40px; }
    ${S} .bs-num b { font-size: 68px; }
  }
</style>`;

  const markup = `{%- comment -%}
  Impact Label by boost.supply. Add it to your product page.
  - Enter your footprint per stage (kg CO2e) under "Footprint"; the big
    number is their sum. Use figures from your own life cycle assessment.
  - Photo: leave it empty on product pages to use the product's image.
  - Materials: one "Material" block per callout. Paste any SVG (or an emoji)
    into the icon field.
{%- endcomment -%}
{%- liquid
  assign bs_m = section.settings.materials_kg | default: 0 | times: 1.0
  assign bs_f = section.settings.manufacturing_kg | default: 0 | times: 1.0
  assign bs_t = section.settings.transport_kg | default: 0 | times: 1.0
  assign bs_e = section.settings.eol_kg | default: 0 | times: 1.0
  assign bs_total = bs_m | plus: bs_f | plus: bs_t | plus: bs_e
  assign bs_div = bs_total | at_least: 0.01
  assign bs_ind = section.settings.industry_kg | default: 0 | times: 1.0
  assign bs_max = bs_total | at_least: bs_ind | at_least: 0.1
  assign bs_lower = 0
  if bs_ind > bs_total
    assign bs_lower = bs_total | times: 100 | divided_by: bs_ind | minus: 100 | times: -1 | round
  endif
  assign bs_img = section.settings.image
  if bs_img == blank and product
    assign bs_img = product.featured_image
  endif
  assign bs_unit = section.settings.unit | replace: 'CO2', 'CO₂'
-%}
<div class="bs-il-{{ section.id }}">
  <div class="bs-wrap">
    <div class="bs-col">
      <div class="bs-photo">
        {%- if bs_img != blank -%}
          {{ bs_img | image_url: width: 1100 | image_tag: loading: 'lazy', alt: section.settings.product_name, sizes: '(min-width: 990px) 50vw, 100vw' }}
        {%- else -%}
          {{ 'product-1' | placeholder_svg_tag: 'bs-ph' }}
        {%- endif -%}
        <span class="bs-badge">${leaf}{{ bs_total | round: 1 }} {{ bs_unit }}</span>
        {%- if section.settings.product_name != blank -%}<span class="bs-pname bs-caps">{{ section.settings.product_name }}</span>{%- endif -%}
      </div>

      {%- if section.blocks.size > 0 -%}
        <div class="bs-matw">
          <p class="bs-mt bs-caps">{{ section.settings.materials_title }}</p>
          <div class="bs-mats">
            {%- for block in section.blocks -%}
              <div class="bs-mat" {{ block.shopify_attributes }}>
                <span class="bs-mat-ic">{{ block.settings.icon }}</span>
                <span><b>{{ block.settings.name }}</b><small>{{ block.settings.detail }}</small></span>
              </div>
            {%- endfor -%}
          </div>
        </div>
      {%- endif -%}
    </div>

    <div class="bs-col">
      <div class="bs-headw">
        {%- if section.settings.eyebrow != blank -%}<p class="bs-eyebrow bs-caps">{{ section.settings.eyebrow }}</p>{%- endif -%}
        <h2 class="bs-h">{{ section.settings.heading }}{% if section.settings.heading_accent != blank %} <em>{{ section.settings.heading_accent }}</em>{% endif %}</h2>
        {%- if section.settings.intro != blank -%}<p class="bs-intro">{{ section.settings.intro }}</p>{%- endif -%}
      </div>

      <div class="bs-label">
        <div class="bs-lt">
          <div><b class="bs-caps">{{ section.settings.label_title }}</b><small>{{ section.settings.label_sub }}</small></div>
          <span class="bs-leaf" aria-hidden="true">${leafBig}</span>
        </div>
        <div class="bs-thick"></div>
        <p class="bs-num"><b>{{ bs_total | round: 1 }}</b><span>{{ bs_unit }}</span></p>
        <div class="bs-bar" aria-hidden="true">
${rows.map((x) => `          {%- if ${x.v} > 0 -%}<span class="bs-seg" data-k="${x.k}" style="flex: {{ ${x.v} }} 1 0; background: var(--c-${x.k});"></span>{%- endif -%}`).join("\n")}
        </div>
        <div class="bs-thin"></div>
        <ul>
${rows.map((x) => `          <li class="bs-row" data-k="${x.k}"><i style="background: var(--c-${x.k});"></i><span>{{ section.settings.${x.label} }}</span><b>{{ ${x.v} | round: 1 }} kg</b><small>{{ ${x.v} | times: 100 | divided_by: bs_div | round }}%</small></li>`).join("\n")}
        </ul>
        <div class="bs-thick"></div>
        <p class="bs-ct bs-caps">{{ section.settings.compare_title }}</p>
        <div class="bs-cmp">
          <div><span>{{ section.settings.this_label }}</span><em><i style="width: {{ bs_total | times: 100 | divided_by: bs_max }}%;"></i></em><b>{{ bs_total | round: 1 }}</b></div>
          <div><span>{{ section.settings.typical_label }}</span><em><i style="width: {{ bs_ind | times: 100 | divided_by: bs_max }}%;"></i></em><b>{{ bs_ind | round: 1 }}</b></div>
        </div>
        {%- if bs_lower > 0 -%}
          <p class="bs-lower"><b class="bs-caps">{{ bs_lower }}% lower</b><span>{{ section.settings.lower_text }}</span></p>
        {%- endif -%}
        {%- if section.settings.footnote != blank -%}<p class="bs-foot">{{ section.settings.footnote }}</p>{%- endif -%}
      </div>
    </div>
  </div>
</div>`;

  const schema = buildSchema({
    name: "Impact Label",
    settings: [
      { type: "text", id: "eyebrow", label: "Eyebrow", default: str(config, "eyebrow") },
      { type: "text", id: "heading", label: "Heading", default: str(config, "heading") },
      { type: "text", id: "heading_accent", label: "Heading accent (serif)", default: str(config, "headingAccent") },
      { type: "textarea", id: "intro", label: "Intro", default: str(config, "intro") },
      { type: "header", content: "Photo" },
      { type: "image_picker", id: "image", label: "Photo", info: "Leave empty on product pages to use the product's featured image." },
      { type: "text", id: "product_name", label: "Photo caption", default: str(config, "productName") },
      { type: "header", content: "Footprint" },
      { type: "text", id: "label_title", label: "Label title", default: str(config, "labelTitle") },
      { type: "text", id: "label_sub", label: "Label subtitle", default: str(config, "labelSub") },
      { type: "text", id: "unit", label: "Unit", default: str(config, "unit") },
      { type: "text", id: "materials_label", label: "Stage 1 label", default: str(config, "materialsLabel") },
      { type: "number", id: "materials_kg", label: "Stage 1 (kg)", default: kg("materialsKg", 4.2) },
      { type: "text", id: "manufacturing_label", label: "Stage 2 label", default: str(config, "manufacturingLabel") },
      { type: "number", id: "manufacturing_kg", label: "Stage 2 (kg)", default: kg("manufacturingKg", 2.1) },
      { type: "text", id: "transport_label", label: "Stage 3 label", default: str(config, "transportLabel") },
      { type: "number", id: "transport_kg", label: "Stage 3 (kg)", default: kg("transportKg", 0.9) },
      { type: "text", id: "eol_label", label: "Stage 4 label", default: str(config, "eolLabel") },
      { type: "number", id: "eol_kg", label: "Stage 4 (kg)", default: kg("eolKg", 0.4) },
      { type: "header", content: "Comparison" },
      { type: "text", id: "compare_title", label: "Comparison title", default: str(config, "compareTitle") },
      { type: "text", id: "this_label", label: "This product label", default: str(config, "thisLabel") },
      { type: "text", id: "typical_label", label: "Typical product label", default: str(config, "typicalLabel") },
      { type: "number", id: "industry_kg", label: "Typical product (kg)", default: kg("industryKg", 12.5) },
      { type: "text", id: "lower_text", label: "Text after the % lower chip", default: str(config, "lowerText") },
      { type: "textarea", id: "footnote", label: "Footnote", default: str(config, "footnote") },
      { type: "header", content: "Materials" },
      { type: "text", id: "materials_title", label: "Materials title", default: str(config, "materialsTitle") },
      { type: "header", content: "Style" },
      { type: "color", id: "accent", label: "Accent (stage 1)", default: str(config, "accent") },
      { type: "color", id: "navy", label: "Stage 2", default: str(config, "navy") },
      { type: "color", id: "line", label: "Lines & stage 4", default: str(config, "line") },
      { type: "color", id: "tile", label: "Tiles", default: str(config, "tile") },
      { type: "color", id: "card", label: "Label background", default: str(config, "card") },
      { type: "color", id: "bg", label: "Background", default: str(config, "bg") },
      { type: "color", id: "text_color", label: "Text", default: str(config, "textColor") },
      { type: "color", id: "muted", label: "Muted text", default: str(config, "muted") },
      { type: "range", id: "radius", label: "Corner radius", min: 0, max: 24, step: 2, unit: "px", default: radius },
    ],
    blocks: [
      {
        type: "material",
        name: "Material",
        settings: [
          { type: "html", id: "icon", label: "Icon (SVG or emoji)" },
          { type: "text", id: "name", label: "Material" },
          { type: "text", id: "detail", label: "Detail" },
        ],
      },
    ],
    maxBlocks: 6,
    presetBlocks: list(config, "materials").map((m) => ({
      type: "material",
      settings: {
        icon: iconMarkup(m.icon ?? "", 20, 1.6),
        name: esc(m.name ?? ""),
        detail: esc(m.detail ?? ""),
      },
    })),
  });

  return section({ style, markup, schema });
}

export const impactLabel: Tweak = {
  slug: "impact-label",
  inspiredBy: "allbirds",
  name: "Impact Label",
  tagline: "A nutrition-label style carbon footprint card beside the product photo.",
  description:
    "Modeled on the carbon footprint label Allbirds shows on its product pages. A big kg CO2e number sits on a nutrition-label style card with a breakdown bar (materials, manufacturing, transport, end of life), each stage's value and share, a comparison to a typical product and material callouts with small icons. Gives eco-minded shoppers a concrete number instead of vague claims; every figure is a theme setting.",
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
    { key: "intro", label: "Intro", type: "textarea", group: "Content" },
    { key: "image", label: "Image URL", type: "text", group: "Media", hint: "Preview only. In Shopify pick a photo or leave it empty to use the product image" },
    { key: "productName", label: "Photo caption", type: "text", group: "Media" },
    { key: "labelTitle", label: "Label title", type: "text", group: "Footprint" },
    { key: "labelSub", label: "Label subtitle", type: "text", group: "Footprint" },
    { key: "unit", label: "Unit", type: "text", group: "Footprint", hint: "CO2 is shown as CO₂" },
    { key: "materialsLabel", label: "Stage 1 label", type: "text", group: "Footprint" },
    { key: "materialsKg", label: "Stage 1", type: "slider", group: "Footprint", min: 0, max: 15, step: 0.1, unit: "kg" },
    { key: "manufacturingLabel", label: "Stage 2 label", type: "text", group: "Footprint" },
    { key: "manufacturingKg", label: "Stage 2", type: "slider", group: "Footprint", min: 0, max: 15, step: 0.1, unit: "kg" },
    { key: "transportLabel", label: "Stage 3 label", type: "text", group: "Footprint" },
    { key: "transportKg", label: "Stage 3", type: "slider", group: "Footprint", min: 0, max: 15, step: 0.1, unit: "kg" },
    { key: "eolLabel", label: "Stage 4 label", type: "text", group: "Footprint" },
    { key: "eolKg", label: "Stage 4", type: "slider", group: "Footprint", min: 0, max: 15, step: 0.1, unit: "kg" },
    { key: "compareTitle", label: "Comparison title", type: "text", group: "Comparison" },
    { key: "thisLabel", label: "This product label", type: "text", group: "Comparison" },
    { key: "typicalLabel", label: "Typical product label", type: "text", group: "Comparison" },
    { key: "industryKg", label: "Typical product", type: "slider", group: "Comparison", min: 0, max: 30, step: 0.5, unit: "kg" },
    { key: "lowerText", label: "Text after the % lower chip", type: "text", group: "Comparison" },
    { key: "footnote", label: "Footnote", type: "textarea", group: "Comparison" },
    { key: "materialsTitle", label: "Materials title", type: "text", group: "Materials" },
    {
      key: "materials", label: "Materials", type: "list", group: "Materials",
      itemFields: [
        { key: "icon", label: "Icon", type: "icon" },
        { key: "name", label: "Material", type: "text" },
        { key: "detail", label: "Detail", type: "text" },
      ],
      newItem: { icon: "pack:leaf", name: "Tree fibre lining", detail: "Breathable and silky" },
      addLabel: "Add material", max: 6,
    },
    fontField("Typography"),
    { key: "radius", label: "Corner radius", type: "slider", group: "Layout", min: 0, max: 24, step: 2, unit: "px" },
    { key: "accent", label: "Accent (stage 1)", type: "color", group: "Colors" },
    { key: "navy", label: "Stage 2", type: "color", group: "Colors" },
    { key: "line", label: "Lines & stage 4", type: "color", group: "Colors" },
    { key: "tile", label: "Tiles", type: "color", group: "Colors" },
    { key: "card", label: "Label background", type: "color", group: "Colors" },
    { key: "bg", label: "Background", type: "color", group: "Colors" },
    { key: "textColor", label: "Text", type: "color", group: "Colors" },
    { key: "muted", label: "Muted text", type: "color", group: "Colors" },
  ],
};
