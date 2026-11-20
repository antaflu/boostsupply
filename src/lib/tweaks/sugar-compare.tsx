"use client";

import { useState, type CSSProperties } from "react";
import type { Tweak, TweakConfig } from "../types";
import { str, num, list, fontStack, esc } from "../cfg";
import { fontField } from "../fields";
import { buildSchema, section, fontFaceFor } from "../liquid";
import { toNum } from "./product-art";

/* ============================================================
   Sugar Compare
   "Us vs classic soda" per can: sugar shown as stacks of sugar
   cubes (2g is half a cube, 39g is almost ten), fiber and calories
   as bars that grow from zero. A flavour toggle swaps the can photo
   and every number, and a sticker on the photo calls out the
   headline stat.
   ============================================================ */

const EASE = "cubic-bezier(.22,1,.36,1)";
const MAX_CUBES = 14;

const DISPLAY_FONTS: Record<string, { family: string; italic: boolean; weight: number }> = {
  retro: { family: "Georgia, 'Iowan Old Style', 'Palatino Linotype', serif", italic: true, weight: 700 },
  serif: { family: "Georgia, 'Iowan Old Style', 'Palatino Linotype', serif", italic: false, weight: 700 },
  sans: { family: "ui-sans-serif, system-ui, -apple-system, sans-serif", italic: false, weight: 800 },
  inherit: { family: "inherit", italic: false, weight: 700 },
};

/* An isometric sugar cube; shared by the preview and the Liquid. */
const CUBE_SVG = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2l9 4.5L12 11 3 6.5z" fill="#fff"/><path d="M3 6.5L12 11v10.5L3 17z" fill="#EEE7DA"/><path d="M12 11l9-4.5V17l-9 4.5z" fill="#D5C8B2"/><path d="M12 2l9 4.5V17l-9 4.5L3 17V6.5zM3 6.5L12 11l9-4.5M12 11v10.5" fill="none" stroke="rgba(60,40,10,.22)" stroke-width=".7" stroke-linejoin="round"/><circle cx="10" cy="6" r=".75" fill="#E2D8C6"/><circle cx="14.2" cy="7.2" r=".6" fill="#E2D8C6"/><circle cx="12" cy="4.6" r=".5" fill="#E2D8C6"/></svg>`;

/* Drawn can for flavours without a photo (--c colour, --lbl label). */
const CAN_SVG = `<svg viewBox="0 0 120 200" aria-hidden="true"><ellipse cx="60" cy="193" rx="34" ry="5" fill="rgba(0,0,0,.16)"/><rect x="26" y="22" width="68" height="166" rx="14" style="fill:var(--c)"/><rect x="29" y="12" width="62" height="14" rx="7" fill="#dcdfdf"/><rect x="26" y="180" width="68" height="9" rx="4.5" fill="#c8cdcd"/><rect x="34" y="62" width="52" height="84" rx="10" style="fill:var(--lbl)"/><circle cx="60" cy="92" r="14" style="fill:var(--c)"/><rect x="32" y="28" width="6" height="150" rx="3" fill="#fff" opacity=".3"/></svg>`;

const defaults: TweakConfig = {
  eyebrow: "Per 12 oz can",
  heading: "All the fizz, a fraction of the sugar",
  usLabel: "Ours",
  themLabel: "Classic soda",
  statSuffix: "less sugar",
  cubeGrams: 4,
  cubeNote: "1 cube = 4g of sugar",
  footnote: "Classic soda based on the average 12 oz cola.",
  flavors: [
    { name: "Black Cherry", color: "#7A1F2A", image: "/mockups/soda-cherry.jpg" },
    { name: "Strawberry", color: "#F59AA5", image: "/mockups/soda-strawberry.jpg" },
    { name: "Orange Cream", color: "#FB9108", image: "/mockups/soda-orange.jpg" },
  ],
  rows: [
    { label: "Sugar", unit: "g", ours: "2, 5, 4", theirs: "39", style: "cubes" },
    { label: "Fiber", unit: "g", ours: "9, 9, 8", theirs: "0", style: "bar" },
    { label: "Calories", unit: "", ours: "35, 45, 40", theirs: "150", style: "bar" },
  ],
  bg: "#FFF6EA",
  textColor: "#034638",
  lightText: "#FFF6EA",
  panelBg: "#F3E4CD",
  themColor: "#C9BBA4",
  mint: "#98E1C3",
  font: "system",
  displayFont: "retro",
  radius: 28,
};

/* ---- helpers ---- */

const parseHex = (hex: string): [number, number, number] | null => {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex).trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

const alpha = (hex: string, a: number) => {
  const c = parseHex(hex);
  return c ? `rgba(${c[0]},${c[1]},${c[2]},${a})` : hex;
};

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

/** "2, 5, 4" -> value for flavour i (falls back to the first). */
const pick = (csv: string | undefined, i: number) => {
  const parts = String(csv ?? "").split(",").map((p) => p.trim()).filter(Boolean);
  return toNum(parts[i] ?? parts[0], 0);
};

const fmtNum = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1).replace(/\.0$/, ""));

const lessPct = (ours: number, theirs: number) =>
  theirs > 0 && ours < theirs ? Math.round((1 - ours / theirs) * 100) : 0;

function Cubes({ grams, per, size, k }: { grams: number; per: number; size: number; k: string }) {
  const exact = per > 0 ? grams / per : 0;
  const shown = Math.min(exact, MAX_CUBES);
  const whole = Math.floor(shown);
  const frac = shown - whole;
  const extra = exact > MAX_CUBES ? Math.ceil(exact - MAX_CUBES) : 0;
  const cubes = [...Array.from({ length: whole }, () => 1), ...(frac > 0.05 ? [frac] : [])];
  return (
    <span className="flex min-h-[24px] flex-wrap items-center gap-[3px] drop-shadow-[0_1px_1px_rgba(60,40,10,0.12)]">
      {cubes.map((f, i) => (
        <span
          key={`${k}-${i}`}
          className="bs-pop-scale block shrink-0 overflow-hidden [&_svg]:block"
          style={{ width: size * f, height: size, animationDelay: `${i * 45}ms` }}
        >
          <span className="block [&_svg]:block" style={{ width: size, height: size }} dangerouslySetInnerHTML={{ __html: CUBE_SVG }} />
        </span>
      ))}
      {extra > 0 && <span className="ml-1 text-[11px] font-bold opacity-60">+{extra}</span>}
      {cubes.length === 0 && <span className="text-[11px] font-semibold opacity-50">0</span>}
    </span>
  );
}

function Preview({ config }: { config: TweakConfig }) {
  const bg = str(config, "bg", "#FFF6EA");
  const ink = str(config, "textColor", "#034638");
  const light = str(config, "lightText", "#FFF6EA");
  const panel = str(config, "panelBg", "#F3E4CD");
  const them = str(config, "themColor", "#C9BBA4");
  const mint = str(config, "mint", "#98E1C3");
  const radius = num(config, "radius", 28);
  const per = clamp(num(config, "cubeGrams", 4), 1, 10);
  const disp = DISPLAY_FONTS[str(config, "displayFont", "retro")] ?? DISPLAY_FONTS.retro;
  const display: CSSProperties = {
    fontFamily: disp.family,
    fontStyle: disp.italic ? "italic" : "normal",
    fontWeight: disp.weight,
    letterSpacing: "-0.02em",
    lineHeight: 1,
  };

  const flavors = list(config, "flavors")
    .slice(0, 3)
    .map((f) => ({
      name: f.name ?? "",
      color: parseHex(f.color ?? "") ? (f.color as string) : "#7A1F2A",
      image: (f.image ?? "").trim(),
    }));
  const rows = list(config, "rows");
  const [sel, setSel] = useState(0);
  const fi = Math.min(sel, Math.max(0, flavors.length - 1));
  const flavor = flavors[fi] ?? { name: "", color: "#7A1F2A", image: "" };

  const hero = rows[0];
  const heroOurs = hero ? pick(hero.ours, fi) : 0;
  const heroTheirs = hero ? toNum(hero.theirs, 0) : 0;
  const pct = lessPct(heroOurs, heroTheirs);

  return (
    <div
      className="@container w-full"
      style={{ background: bg, color: ink, fontFamily: fontStack(str(config, "font", "system")) }}
    >
      <div className="mx-auto grid w-full max-w-[1100px] grid-cols-[minmax(0,42fr)_minmax(0,58fr)] gap-x-4 gap-y-5 px-5 py-7 @min-[640px]:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] @min-[640px]:gap-x-10 @min-[640px]:gap-y-6 @min-[640px]:px-10 @min-[640px]:py-12">
        {/* Header */}
        <div className="col-span-2 @min-[640px]:col-span-1 @min-[640px]:col-start-2 @min-[640px]:row-start-1">
          {str(config, "eyebrow") && (
            <span
              className="inline-flex rounded-full px-3 py-[5px] text-[10.5px] font-extrabold uppercase leading-none tracking-[0.12em]"
              style={{ background: mint, color: ink }}
            >
              {str(config, "eyebrow")}
            </span>
          )}
          <h3 className="mt-3 max-w-[520px] text-[32px] @min-[640px]:text-[42px]" style={display}>
            {str(config, "heading")}
          </h3>
        </div>

        {/* Photo + flavour toggle (a flex column on wide screens) */}
        <div className="contents @min-[640px]:col-start-1 @min-[640px]:row-span-3 @min-[640px]:row-start-1 @min-[640px]:flex @min-[640px]:flex-col @min-[640px]:gap-4 @min-[640px]:self-start">
          <div
            className="relative col-start-1 row-start-2 aspect-[4/5] w-full self-start overflow-hidden"
            style={{
              background: flavor.color,
              borderRadius: radius,
              transition: `background-color 500ms ${EASE}`,
              "--c": flavor.color,
              "--lbl": light,
            } as CSSProperties}
          >
            {flavors.map((f, i) =>
              f.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={i}
                  src={f.image}
                  alt={i === fi ? f.name : ""}
                  aria-hidden={i !== fi}
                  loading="lazy"
                  decoding="async"
                  draggable={false}
                  className="absolute inset-0 h-full w-full object-cover"
                  style={{
                    opacity: i === fi ? 1 : 0,
                    transform: i === fi ? "none" : "scale(1.06)",
                    transition: `opacity 550ms ${EASE}, transform 900ms ${EASE}`,
                  }}
                />
              ) : (
                <span
                  key={i}
                  aria-hidden
                  className="absolute inset-x-0 bottom-[10%] top-[10%] flex justify-center [&_svg]:h-full [&_svg]:w-auto"
                  style={{ opacity: i === fi ? 1 : 0, transition: `opacity 550ms ${EASE}`, "--c": f.color } as CSSProperties}
                  dangerouslySetInnerHTML={{ __html: CAN_SVG }}
                />
              ),
            )}
            {hero && (
              <span
                key={`st-${fi}`}
                className="bs-pop-scale absolute bottom-2.5 right-2.5 grid h-[54px] w-[54px] -rotate-12 place-content-center rounded-full text-center shadow-[0_6px_16px_-6px_rgba(0,0,0,0.35)] @min-[640px]:bottom-4 @min-[640px]:right-4 @min-[640px]:h-[78px] @min-[640px]:w-[78px]"
                style={{ background: mint, color: ink }}
              >
                <b className="block text-[17px] leading-none @min-[640px]:text-[24px]" style={display}>
                  {fmtNum(heroOurs)}
                  {hero.unit}
                </b>
                <span className="mt-0.5 block text-[7.5px] font-extrabold uppercase tracking-[0.08em] @min-[640px]:text-[10px]">
                  {hero.label}
                </span>
              </span>
            )}
          </div>

          {flavors.length > 1 && (
            <div role="group" aria-label="Flavor" className="col-span-2 row-start-3 flex flex-wrap gap-2">
              {flavors.map((f, i) => {
                const on = i === fi;
                return (
                  <button
                    key={i}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setSel(i)}
                    className="inline-flex h-10 items-center gap-2 rounded-full py-1 pl-1 pr-3.5 text-[13px] font-bold transition-[background-color,color,box-shadow,scale] duration-300 active:scale-95"
                    style={{
                      background: on ? ink : "transparent",
                      color: on ? bg : ink,
                      boxShadow: on ? "none" : `inset 0 0 0 1.5px ${alpha(ink, 0.25)}`,
                      transitionTimingFunction: EASE,
                    }}
                  >
                    <span className="block h-8 w-8 shrink-0 overflow-hidden rounded-full" style={{ background: f.color }}>
                      {f.image && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={f.image} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
                      )}
                    </span>
                    {f.name}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Headline stat */}
        {hero && (
          <div className="col-start-2 row-start-2 self-center @min-[640px]:row-start-2">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.1em] opacity-70">{hero.label}</p>
            <p className="mt-1 flex flex-wrap items-baseline gap-x-2">
              <b key={`h-${fi}`} className="bs-swap inline-block text-[52px] tabular-nums @min-[640px]:text-[68px]" style={display}>
                {fmtNum(heroOurs)}
                {hero.unit}
              </b>
              <span className="text-[16px] font-semibold opacity-55 @min-[640px]:text-[20px]">
                vs {fmtNum(heroTheirs)}
                {hero.unit}
              </span>
            </p>
            {pct > 0 && (
              <span
                key={`p-${fi}`}
                className="bs-swap mt-2 inline-flex rounded-full px-2.5 py-[5px] text-[11px] font-extrabold uppercase leading-none tracking-[0.06em]"
                style={{ background: ink, color: bg }}
              >
                {pct}% {str(config, "statSuffix", "less sugar")}
              </span>
            )}
          </div>
        )}

        {/* Comparison rows */}
        <div className="col-span-2 row-start-4 @min-[640px]:col-span-1 @min-[640px]:col-start-2 @min-[640px]:row-start-3">
          <div className="overflow-hidden px-4 @min-[640px]:px-5" style={{ background: panel, borderRadius: Math.max(8, radius - 6) }}>
            {rows.map((r, ri) => {
              const ours = pick(r.ours, fi);
              const theirs = toNum(r.theirs, 0);
              const max = Math.max(ours, theirs, 0.0001);
              const cubes = (r.style ?? "").trim().toLowerCase().startsWith("cube");
              const unit = r.unit ?? "";
              const lines = [
                { label: str(config, "usLabel", "Ours"), v: ours, color: flavor.color, us: true },
                { label: str(config, "themLabel", "Classic soda"), v: theirs, color: them, us: false },
              ];
              return (
                <div key={ri} className="py-4" style={{ borderTop: ri ? `1px solid ${alpha(ink, 0.12)}` : undefined }}>
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-[12px] font-extrabold uppercase tracking-[0.1em]">{r.label}</span>
                    {cubes && str(config, "cubeNote") && (
                      <span className="text-[11px] font-semibold opacity-60">{str(config, "cubeNote")}</span>
                    )}
                  </div>
                  <div className="mt-3 grid grid-cols-[94px_minmax(0,1fr)_40px] items-center gap-x-3 gap-y-2.5 @min-[640px]:grid-cols-[104px_minmax(0,1fr)_48px]">
                    {lines.map((l) => (
                      <div key={l.label} className="contents">
                        <span className="flex min-w-0 items-center gap-1.5 text-[12px] font-semibold">
                          <span
                            aria-hidden
                            className="h-2 w-2 shrink-0 rounded-full"
                            style={{ background: l.color, transition: `background-color 500ms ${EASE}` }}
                          />
                          <span className="truncate" style={{ opacity: l.us ? 1 : 0.7 }}>
                            {l.label}
                          </span>
                        </span>
                        {cubes ? (
                          <Cubes grams={l.v} per={per} size={22} k={`${ri}-${l.us ? fi : "t"}`} />
                        ) : (
                          <span className="block h-3 overflow-hidden rounded-full" style={{ background: alpha(ink, 0.08) }}>
                            <span
                              className="block h-full rounded-full"
                              style={{
                                background: l.color,
                                transform: `scaleX(${l.v / max})`,
                                transformOrigin: "left",
                                transition: `transform 750ms ${EASE}, background-color 500ms ${EASE}`,
                              }}
                            />
                          </span>
                        )}
                        <b
                          key={`${ri}-${l.us ? fi : "t"}-v`}
                          className={`text-right text-[14px] font-extrabold tabular-nums ${l.us ? "bs-swap" : ""}`}
                          style={{ opacity: l.us ? 1 : 0.55 }}
                        >
                          {fmtNum(l.v)}
                          {unit}
                        </b>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          {str(config, "footnote") && <p className="mt-3 text-[11px] leading-snug opacity-60">{str(config, "footnote")}</p>}
        </div>
      </div>
    </div>
  );
}

/* ---------------- Liquid ---------------- */

function generateLiquid(config: TweakConfig): string {
  const { face, family } = fontFaceFor(str(config, "font", "system"));
  const S = ".bs-sg-{{ section.id }}";
  const ease = EASE;
  const dispKey = str(config, "displayFont", "retro");
  const flavors = list(config, "flavors").slice(0, 3);
  const rows = list(config, "rows");

  const style = `<style>
${face ? face + "\n" : ""}  ${S} { container-type: inline-size; background: {{ section.settings.bg }}; color: {{ section.settings.text_color }}; font-family: ${family}; }
  ${S} * { box-sizing: border-box; }
  ${S} p, ${S} h2 { margin: 0; }
  ${S} button { font: inherit; }
  ${S} .bs-disp { letter-spacing: -.02em; line-height: 1;
    {%- case section.settings.display_font -%}
      {%- when 'serif' %} font-family: Georgia, 'Iowan Old Style', 'Palatino Linotype', serif; font-weight: 700; font-style: normal;
      {%- when 'sans' %} font-family: ui-sans-serif, system-ui, -apple-system, sans-serif; font-weight: 800; font-style: normal;
      {%- when 'inherit' %} font-family: inherit; font-weight: 700; font-style: normal;
      {%- else %} font-family: Georgia, 'Iowan Old Style', 'Palatino Linotype', serif; font-weight: 700; font-style: italic;
    {%- endcase %} }
  ${S} .bs-wrap { max-width: 1100px; margin: 0 auto; padding: 28px 20px; display: grid; grid-template-columns: minmax(0, 42fr) minmax(0, 58fr); gap: 20px 16px; }
  ${S} .bs-head { grid-column: 1 / -1; }
  ${S} .bs-eyebrow { display: inline-flex; padding: 5px 12px; border-radius: 99px; font-size: 10.5px; font-weight: 800; line-height: 1; text-transform: uppercase; letter-spacing: .12em;
    background: {{ section.settings.mint }}; color: {{ section.settings.text_color }}; }
  ${S} .bs-h { margin-top: 12px; max-width: 520px; font-size: 32px; }
  ${S} .bs-media { display: contents; }
  ${S} .bs-photo { --lbl: {{ section.settings.light_text }}; position: relative; grid-column: 1; grid-row: 2; align-self: start; width: 100%; aspect-ratio: 4 / 5; overflow: hidden;
    border-radius: {{ section.settings.radius }}px; background: var(--c); transition: background-color .5s ${ease}; }
  ${S} .bs-shot { position: absolute; inset: 0; opacity: 0; transform: scale(1.06); transition: opacity .55s ${ease}, transform .9s ${ease}; }
  ${S} .bs-shot.is-on { opacity: 1; transform: none; }
  ${S} .bs-shot img { display: block; width: 100%; height: 100%; object-fit: cover; }
  ${S} .bs-shot.is-can { top: 10%; bottom: 10%; display: flex; justify-content: center; }
  ${S} .bs-shot.is-can svg { height: 100%; width: auto; }
  ${S} .bs-sticker { position: absolute; right: 10px; bottom: 10px; width: 54px; height: 54px; display: grid; place-content: center; text-align: center; border-radius: 99px;
    transform: rotate(-12deg); box-shadow: 0 6px 16px -6px rgba(0,0,0,.35); background: {{ section.settings.mint }}; color: {{ section.settings.text_color }}; }
  ${S} .bs-sticker b { display: block; font-size: 17px; }
  ${S} .bs-sticker small { display: block; margin-top: 2px; font-size: 7.5px; font-weight: 800; text-transform: uppercase; letter-spacing: .08em; }
  ${S} .bs-chips { grid-column: 1 / -1; grid-row: 3; display: flex; flex-wrap: wrap; gap: 8px; }
  ${S} .bs-chip { display: inline-flex; align-items: center; gap: 8px; height: 40px; padding: 4px 14px 4px 4px; border: 0; border-radius: 99px; cursor: pointer;
    font-size: 13px; font-weight: 700; background: transparent; color: {{ section.settings.text_color }};
    box-shadow: inset 0 0 0 1.5px {{ section.settings.text_color | color_modify: 'alpha', 0.25 }}; transition: background-color .3s ${ease}, color .3s, box-shadow .3s, transform .2s; }
  ${S} .bs-chip:active { transform: scale(.95); }
  ${S} .bs-chip[aria-pressed="true"] { background: {{ section.settings.text_color }}; color: {{ section.settings.bg }}; box-shadow: none; }
  ${S} .bs-chip i { display: block; width: 32px; height: 32px; flex-shrink: 0; overflow: hidden; border-radius: 99px; }
  ${S} .bs-chip i img { display: block; width: 100%; height: 100%; object-fit: cover; }
  ${S} .bs-stat { grid-column: 2; grid-row: 2; align-self: center; }
  ${S} .bs-stat-l { font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: .1em; opacity: .7; }
  ${S} .bs-stat-n { margin-top: 4px; display: flex; flex-wrap: wrap; align-items: baseline; gap: 0 8px; }
  ${S} .bs-stat-n b { font-size: 52px; font-variant-numeric: tabular-nums; }
  ${S} .bs-stat-n > span { font-size: 16px; font-weight: 600; opacity: .55; }
  ${S} .bs-less { margin-top: 8px; display: inline-flex; padding: 5px 10px; border-radius: 99px; font-size: 11px; font-weight: 800; line-height: 1; text-transform: uppercase; letter-spacing: .06em;
    background: {{ section.settings.text_color }}; color: {{ section.settings.bg }}; }
  ${S} .bs-less[hidden] { display: none; }
  ${S} .bs-rows { grid-column: 1 / -1; grid-row: 4; }
  ${S} .bs-card { padding: 0 16px; border-radius: {{ section.settings.radius | minus: 6 | at_least: 8 }}px; background: {{ section.settings.panel_bg }}; }
  ${S} .bs-row { padding: 16px 0; }
  ${S} .bs-row + .bs-row { border-top: 1px solid {{ section.settings.text_color | color_modify: 'alpha', 0.12 }}; }
  ${S} .bs-rh { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; }
  ${S} .bs-rh span:first-child { font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: .1em; }
  ${S} .bs-rh span + span { font-size: 11px; font-weight: 600; opacity: .6; }
  ${S} .bs-lines { margin-top: 12px; display: grid; grid-template-columns: 94px minmax(0, 1fr) 40px; align-items: center; gap: 10px 12px; }
  ${S} .bs-who { display: flex; align-items: center; gap: 6px; min-width: 0; font-size: 12px; font-weight: 600; }
  ${S} .bs-who i { width: 8px; height: 8px; flex-shrink: 0; border-radius: 99px; background: var(--dot); transition: background-color .5s ${ease}; }
  ${S} .bs-who span { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  ${S} .bs-who.is-them span { opacity: .7; }
  ${S} .bs-who i, ${S} .bs-bar span { background: var(--dot); }
  ${S} .bs-bar { display: block; height: 12px; overflow: hidden; border-radius: 99px; background: {{ section.settings.text_color | color_modify: 'alpha', 0.08 }}; }
  ${S} .bs-bar span { display: block; height: 100%; border-radius: 99px; background: var(--dot); transform: scaleX(0); transform-origin: left;
    transition: transform .75s ${ease}, background-color .5s ${ease}; }
  ${S} .bs-cubes { display: flex; flex-wrap: wrap; align-items: center; gap: 3px; min-height: 24px; filter: drop-shadow(0 1px 1px rgba(60,40,10,.12)); }
  ${S} .bs-cube { display: block; flex-shrink: 0; height: 22px; overflow: hidden; }
  ${S}.is-in .bs-cube { animation: bs-sg-pop .42s ${ease} both; }
  ${S} .bs-cube svg { display: block; width: 22px; height: 22px; }
  ${S} .bs-more { margin-left: 4px; font-size: 11px; font-weight: 700; opacity: .6; }
  ${S} .bs-val { text-align: right; font-size: 14px; font-weight: 800; font-variant-numeric: tabular-nums; }
  ${S} .bs-val.is-them { opacity: .55; }
  ${S} .bs-foot { margin-top: 12px; font-size: 11px; line-height: 1.4; opacity: .6; }
  @keyframes bs-sg-pop { 0% { transform: scale(.6); opacity: 0; } 60% { transform: scale(1.06); opacity: 1; } 100% { transform: scale(1); } }
  @container (min-width: 640px) {
    ${S} .bs-wrap { grid-template-columns: minmax(0, 5fr) minmax(0, 7fr); gap: 24px 40px; padding: 48px 40px; }
    ${S} .bs-head { grid-column: 2; grid-row: 1; }
    ${S} .bs-h { font-size: 42px; }
    ${S} .bs-media { grid-column: 1; grid-row: 1 / span 3; align-self: start; display: flex; flex-direction: column; gap: 16px; }
    ${S} .bs-sticker { right: 16px; bottom: 16px; width: 78px; height: 78px; }
    ${S} .bs-sticker b { font-size: 24px; }
    ${S} .bs-sticker small { font-size: 10px; }
    ${S} .bs-stat-n b { font-size: 68px; }
    ${S} .bs-stat-n > span { font-size: 20px; }
    ${S} .bs-rows { grid-column: 2; grid-row: 3; }
    ${S} .bs-card { padding: 0 20px; }
    ${S} .bs-lines { grid-template-columns: 104px minmax(0, 1fr) 48px; }
  }
  @media (prefers-reduced-motion: reduce) {
    ${S} .bs-shot, ${S} .bs-bar span { transition: none; }
    ${S}.is-in .bs-cube { animation: none; }
  }
</style>`;

  /* flavour slot n (1-3) */
  const slot = (n: number) => `{%- if section.settings.flavor_${n}_name != blank -%}
      {%- assign bs_n = bs_n | plus: 1 -%}
      {%- capture bs_shots -%}{{ bs_shots }}<span class="bs-shot{% if bs_n == 1 %} is-on{% endif %}{% if section.settings.flavor_${n}_image == blank %} is-can{% endif %}" data-shot style="--c: {{ section.settings.flavor_${n}_color }};">
        {%- if section.settings.flavor_${n}_image != blank -%}{{ section.settings.flavor_${n}_image | image_url: width: 900 | image_tag: loading: 'lazy', alt: section.settings.flavor_${n}_name, sizes: '(min-width: 990px) 40vw, 45vw' }}{%- else -%}${CAN_SVG}{%- endif -%}
      </span>{%- endcapture -%}
      {%- capture bs_chips -%}{{ bs_chips }}<button type="button" class="bs-chip" data-chip="{{ bs_n | minus: 1 }}" data-color="{{ section.settings.flavor_${n}_color }}" aria-pressed="{% if bs_n == 1 %}true{% else %}false{% endif %}">
        <i style="background: {{ section.settings.flavor_${n}_color }};">{%- if section.settings.flavor_${n}_image != blank -%}{{ section.settings.flavor_${n}_image | image_url: width: 80 | image_tag: loading: 'lazy', alt: '' }}{%- endif -%}</i>{{ section.settings.flavor_${n}_name }}</button>{%- endcapture -%}
      {%- if bs_n == 1 -%}{%- assign bs_c1 = section.settings.flavor_${n}_color -%}{%- endif -%}
    {%- endif -%}`;

  const markup = `{%- comment -%}
  Sugar Compare by boost.supply.
  - Up to three flavours (Flavor 1-3 below): a name, a colour that matches the
    photo backdrop and a 4:5 photo. Without a photo a drawn can is shown.
  - Add one "Row" block per nutrient. "Ours" takes one value per flavour,
    separated by commas (e.g. 2, 5, 4), in the order of the flavours.
    "Cubes" draws the amount as sugar cubes, "Bar" as a bar.
  - The first row feeds the big headline number and the photo sticker.
{%- endcomment -%}
{%- assign bs_n = 0 -%}
{%- assign bs_shots = '' -%}
{%- assign bs_chips = '' -%}
{%- assign bs_c1 = '#7A1F2A' -%}
${slot(1)}
${slot(2)}
${slot(3)}
<div class="bs-sg-{{ section.id }}" id="bs-sg-{{ section.id }}" style="--dot: {{ bs_c1 }};" data-per="{{ section.settings.cube_grams }}" data-less="{{ section.settings.stat_suffix | escape }}">
  <div class="bs-wrap">
    <div class="bs-head">
      {%- if section.settings.eyebrow != blank -%}<span class="bs-eyebrow">{{ section.settings.eyebrow }}</span>{%- endif -%}
      <h2 class="bs-h bs-disp">{{ section.settings.heading }}</h2>
    </div>
    <div class="bs-media">
      <div class="bs-photo" data-photo style="--c: {{ bs_c1 }};">
        {{ bs_shots }}
        {%- assign bs_hero = section.blocks | where: 'type', 'row' | first -%}
        {%- if bs_hero -%}
          <span class="bs-sticker"><b class="bs-disp"><span data-hero-ours></span>{{ bs_hero.settings.unit }}</b><small>{{ bs_hero.settings.label }}</small></span>
        {%- endif -%}
      </div>
      {%- if bs_n > 1 -%}<div class="bs-chips" role="group" aria-label="Flavor">{{ bs_chips }}</div>{%- endif -%}
    </div>
    {%- if bs_hero -%}
      <div class="bs-stat">
        <p class="bs-stat-l">{{ bs_hero.settings.label }}</p>
        <p class="bs-stat-n"><b class="bs-disp"><span data-hero-ours></span>{{ bs_hero.settings.unit }}</b><span>vs {{ bs_hero.settings.theirs }}{{ bs_hero.settings.unit }}</span></p>
        <span class="bs-less" data-hero-less hidden></span>
      </div>
    {%- endif -%}
    <div class="bs-rows">
      <div class="bs-card">
        {%- for block in section.blocks -%}
          <div class="bs-row" data-row data-ours="{{ block.settings.ours | escape }}" data-theirs="{{ block.settings.theirs | escape }}" data-style="{{ block.settings.style }}" data-unit="{{ block.settings.unit | escape }}"{% if forloop.first %} data-hero{% endif %} {{ block.shopify_attributes }}>
            <div class="bs-rh"><span>{{ block.settings.label }}</span>{%- if block.settings.style == 'cubes' and section.settings.cube_note != blank -%}<span>{{ section.settings.cube_note }}</span>{%- endif -%}</div>
            <div class="bs-lines">
              <span class="bs-who" data-us-dot><i></i><span>{{ section.settings.us_label }}</span></span>
              <span data-vis="us"></span>
              <b class="bs-val" data-val="us"></b>
              <span class="bs-who is-them" style="--dot: {{ section.settings.them_color }};"><i></i><span>{{ section.settings.them_label }}</span></span>
              <span data-vis="them" style="--dot: {{ section.settings.them_color }};"></span>
              <b class="bs-val is-them" data-val="them"></b>
            </div>
          </div>
        {%- endfor -%}
      </div>
      {%- if section.settings.footnote != blank -%}<p class="bs-foot">{{ section.settings.footnote }}</p>{%- endif -%}
    </div>
  </div>
</div>
<script>
  (function () {
    var root = document.getElementById('bs-sg-{{ section.id }}');
    if (!root) return;
    var CUBE = ${JSON.stringify(CUBE_SVG)};
    var MAX = ${MAX_CUBES};
    var per = Math.max(1, parseFloat(root.dataset.per) || 4);
    var chips = [].slice.call(root.querySelectorAll('[data-chip]'));
    var shots = [].slice.call(root.querySelectorAll('[data-shot]'));
    var rows = [].slice.call(root.querySelectorAll('[data-row]'));
    var photo = root.querySelector('[data-photo]');
    function num(s) { var n = parseFloat(String(s || '').replace(/[^0-9.]/g, '')); return isFinite(n) ? n : 0; }
    function pick(csv, i) {
      var parts = String(csv || '').split(',').map(function (p) { return p.trim(); }).filter(Boolean);
      return num(parts[i] != null ? parts[i] : parts[0]);
    }
    function fmt(n) { return Math.round(n) === n ? String(n) : n.toFixed(1).replace(/\\.0$/, ''); }
    function cubes(el, grams) {
      el.className = 'bs-cubes';
      el.textContent = '';
      var exact = grams / per, shown = Math.min(exact, MAX), whole = Math.floor(shown), frac = shown - whole;
      var list = [];
      for (var i = 0; i < whole; i++) list.push(1);
      if (frac > 0.05) list.push(frac);
      list.forEach(function (f, i) {
        var c = document.createElement('span');
        c.className = 'bs-cube';
        c.style.width = (22 * f) + 'px';
        c.style.animationDelay = (i * 45) + 'ms';
        c.innerHTML = CUBE;
        el.appendChild(c);
      });
      if (exact > MAX) { var m = document.createElement('span'); m.className = 'bs-more'; m.textContent = '+' + Math.ceil(exact - MAX); el.appendChild(m); }
    }
    function bar(el, v, max) {
      if (!el.firstChild) { el.className = 'bs-bar'; el.appendChild(document.createElement('span')); }
      var fill = el.firstChild;
      requestAnimationFrame(function () { fill.style.transform = 'scaleX(' + (root.classList.contains('is-in') ? v / max : 0) + ')'; });
    }
    function show(i) {
      var color = chips[i] ? chips[i].getAttribute('data-color') : null;
      chips.forEach(function (c, k) { c.setAttribute('aria-pressed', k === i ? 'true' : 'false'); });
      shots.forEach(function (s, k) { s.classList.toggle('is-on', k === i); });
      if (color && photo) photo.style.setProperty('--c', color);
      rows.forEach(function (r) {
        var ours = pick(r.dataset.ours, i), theirs = num(r.dataset.theirs), unit = r.dataset.unit || '';
        var max = Math.max(ours, theirs, 0.0001);
        if (color) r.style.setProperty('--dot', color);
        var vu = r.querySelector('[data-vis="us"]'), vt = r.querySelector('[data-vis="them"]');
        if (r.dataset.style === 'cubes') { cubes(vu, ours); if (!vt.childNodes.length) cubes(vt, theirs); }
        else { bar(vu, ours, max); bar(vt, theirs, max); }
        r.querySelector('[data-val="us"]').textContent = fmt(ours) + unit;
        r.querySelector('[data-val="them"]').textContent = fmt(theirs) + unit;
        if (r.hasAttribute('data-hero')) {
          root.querySelectorAll('[data-hero-ours]').forEach(function (h) { h.textContent = fmt(ours); });
          var less = root.querySelector('[data-hero-less]');
          if (less) {
            var pct = theirs > 0 && ours < theirs ? Math.round((1 - ours / theirs) * 100) : 0;
            less.hidden = !pct;
            less.textContent = pct + '% ' + root.dataset.less;
          }
        }
      });
    }
    var current = 0;
    chips.forEach(function (c, k) { c.addEventListener('click', function () { current = k; show(k); }); });
    function reveal() { root.classList.add('is-in'); show(current); }
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (es) {
        if (es[0] && es[0].isIntersecting) { io.disconnect(); reveal(); }
      }, { threshold: 0.25 });
      io.observe(root);
      show(0);
    } else reveal();
  })();
</script>`;

  const flavorSettings = [1, 2, 3].flatMap((n) => {
    const f = flavors[n - 1];
    return [
      { type: "header" as const, content: `Flavor ${n}` },
      { type: "text" as const, id: `flavor_${n}_name`, label: "Name (leave empty to hide)", default: esc(f?.name ?? "") },
      { type: "color" as const, id: `flavor_${n}_color`, label: "Photo backdrop colour", default: parseHex(f?.color ?? "") ? (f?.color as string) : "#7A1F2A" },
      { type: "image_picker" as const, id: `flavor_${n}_image`, label: "Can photo (4:5)" },
    ];
  });

  const schema = buildSchema({
    name: "Sugar Compare",
    settings: [
      { type: "text", id: "eyebrow", label: "Eyebrow", default: str(config, "eyebrow") },
      { type: "text", id: "heading", label: "Heading", default: str(config, "heading") },
      { type: "text", id: "us_label", label: "Our label", default: str(config, "usLabel") },
      { type: "text", id: "them_label", label: "Competitor label", default: str(config, "themLabel") },
      { type: "text", id: "stat_suffix", label: "Headline chip (after the %)", default: str(config, "statSuffix") },
      { type: "range", id: "cube_grams", label: "Grams per sugar cube", min: 1, max: 10, step: 1, unit: "g", default: clamp(Math.round(num(config, "cubeGrams", 4)), 1, 10) },
      { type: "text", id: "cube_note", label: "Cube note", default: str(config, "cubeNote") },
      { type: "text", id: "footnote", label: "Footnote", default: str(config, "footnote") },
      ...flavorSettings,
      { type: "header", content: "Style" },
      {
        type: "select",
        id: "display_font",
        label: "Display font",
        options: [
          { value: "retro", label: "Retro serif (italic)" },
          { value: "serif", label: "Serif" },
          { value: "sans", label: "Sans" },
          { value: "inherit", label: "Theme font" },
        ],
        default: DISPLAY_FONTS[dispKey] ? dispKey : "retro",
      },
      { type: "color", id: "bg", label: "Background", default: str(config, "bg") },
      { type: "color", id: "text_color", label: "Text", default: str(config, "textColor") },
      { type: "color", id: "light_text", label: "Drawn can label", default: str(config, "lightText") },
      { type: "color", id: "panel_bg", label: "Comparison panel", default: str(config, "panelBg") },
      { type: "color", id: "them_color", label: "Competitor bars", default: str(config, "themColor") },
      { type: "color", id: "mint", label: "Chips & sticker", default: str(config, "mint") },
      { type: "range", id: "radius", label: "Corner radius", min: 0, max: 40, step: 2, unit: "px", default: clamp(Math.round(num(config, "radius", 28) / 2) * 2, 0, 40) },
    ],
    blocks: [
      {
        type: "row",
        name: "Row",
        settings: [
          { type: "text", id: "label", label: "Label", default: "Sugar" },
          { type: "text", id: "unit", label: "Unit (e.g. g)", default: "g" },
          { type: "text", id: "ours", label: "Ours, one value per flavour (2, 5, 4)", default: "2" },
          { type: "text", id: "theirs", label: "Competitor value", default: "39" },
          {
            type: "select",
            id: "style",
            label: "Show as",
            options: [
              { value: "bar", label: "Bar" },
              { value: "cubes", label: "Sugar cubes" },
            ],
            default: "bar",
          },
        ],
      },
    ],
    maxBlocks: 6,
    presetBlocks: rows.map((r) => ({
      type: "row",
      settings: {
        label: esc(r.label ?? ""),
        unit: esc(r.unit ?? ""),
        ours: esc(r.ours ?? ""),
        theirs: esc(r.theirs ?? ""),
        style: (r.style ?? "").trim().toLowerCase().startsWith("cube") ? "cubes" : "bar",
      },
    })),
  });

  return section({ style, markup, schema });
}

export const sugarCompare: Tweak = {
  slug: "sugar-compare",
  inspiredBy: "olipop",
  name: "Sugar Compare",
  tagline: "Us vs classic soda, with sugar cubes that stack up and a flavor toggle.",
  description:
    "Modeled on the “vs classic soda” nutrition comparison OLIPOP uses on its product pages. Sugar is drawn as sugar cubes (half a cube against almost ten), fiber and calories as bars that grow from zero, and a big headline number with a “95% less sugar” chip sums it up. A flavour toggle swaps the can photo and every number, so each flavour proves its own case.",
  category: "product-page",
  tier: "free",
  tint: "#fbefe3",
  Preview,
  generateLiquid,
  defaults,
  fields: [
    { key: "eyebrow", label: "Eyebrow", type: "text", group: "Content" },
    { key: "heading", label: "Heading", type: "text", group: "Content" },
    { key: "usLabel", label: "Our label", type: "text", group: "Content" },
    { key: "themLabel", label: "Competitor label", type: "text", group: "Content" },
    { key: "statSuffix", label: "Headline chip", type: "text", group: "Content", hint: "Shown after the percentage, e.g. 95% less sugar" },
    { key: "footnote", label: "Footnote", type: "text", group: "Content" },
    {
      key: "flavors", label: "Flavors", type: "list", group: "Flavors",
      hint: "Up to 3. Colour is a hex code matching the photo backdrop; leave Image URL empty for a drawn can",
      itemFields: [
        { key: "name", label: "Name", type: "text" },
        { key: "image", label: "Image URL", type: "text" },
        { key: "color", label: "Colour", type: "text" },
      ],
      newItem: { name: "Lime Ginger", color: "#A9D46F", image: "" },
      addLabel: "Add flavor", max: 3,
    },
    {
      key: "rows", label: "Rows", type: "list", group: "Rows",
      hint: "Ours takes one value per flavour, comma separated. Show as: cubes or bar. The first row is the headline",
      itemFields: [
        { key: "label", label: "Label", type: "text" },
        { key: "unit", label: "Unit", type: "text" },
        { key: "ours", label: "Ours (per flavour)", type: "text" },
        { key: "theirs", label: "Competitor", type: "text" },
        { key: "style", label: "Show as (cubes / bar)", type: "text" },
      ],
      newItem: { label: "Sodium", unit: "mg", ours: "10, 10, 10", theirs: "45", style: "bar" },
      addLabel: "Add row", max: 6,
    },
    { key: "cubeGrams", label: "Grams per sugar cube", type: "slider", group: "Rows", min: 1, max: 10, step: 1, unit: "g" },
    { key: "cubeNote", label: "Cube note", type: "text", group: "Rows" },
    fontField("Typography"),
    {
      key: "displayFont", label: "Display font", type: "select", group: "Typography",
      options: [
        { label: "Retro serif (italic)", value: "retro" },
        { label: "Serif", value: "serif" },
        { label: "Sans", value: "sans" },
        { label: "Theme font", value: "inherit" },
      ],
    },
    { key: "radius", label: "Corner radius", type: "slider", group: "Layout", min: 0, max: 40, step: 2, unit: "px" },
    { key: "bg", label: "Background", type: "color", group: "Colors" },
    { key: "textColor", label: "Text", type: "color", group: "Colors" },
    { key: "lightText", label: "Drawn can label", type: "color", group: "Colors" },
    { key: "panelBg", label: "Comparison panel", type: "color", group: "Colors" },
    { key: "themColor", label: "Competitor bars", type: "color", group: "Colors" },
    { key: "mint", label: "Chips & sticker", type: "color", group: "Colors" },
  ],
};
