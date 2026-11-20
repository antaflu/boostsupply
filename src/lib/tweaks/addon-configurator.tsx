"use client";

import { useId, useState, type CSSProperties } from "react";
import type { Tweak, TweakConfig } from "../types";
import { str, num, list, fontStack, esc } from "../cfg";
import { fontField } from "../fields";
import { buildSchema, section, fontFaceFor } from "../liquid";
import { Icon, iconMarkup } from "../icons";
import { money, toNum } from "./product-art";

/* ============================================================
   Add-on Configurator
   Build-your-own product box: named finish swatches, a carry
   style segmented toggle, add-on checkboxes with their own
   prices, a running total, a CTA and a guarantee row. The drawn
   wallet recolours with the finish and shows each add-on.
   ============================================================ */

const EASE = "cubic-bezier(.22,1,.36,1)";

const defaults: TweakConfig = {
  badge: "Build yours",
  title: "The slim wallet",
  subtitle: "Two metal plates, one band. Holds 1 to 12 cards and blocks card skimming.",
  currency: "$",
  finishLabel: "Finish",
  finishes: [
    { name: "Gunmetal", hex: "#55585d", price: "95" },
    { name: "Matte Black", hex: "#262626", price: "85" },
    { name: "Titanium", hex: "#9a9ea4", price: "125" },
    { name: "Carbon", hex: "#2e2e2e", price: "135" },
    { name: "Sandstone", hex: "#c3ab88", price: "95" },
  ],
  styleLabel: "Carry",
  styles: [
    { name: "Cash strap", price: "0" },
    { name: "Money clip", price: "0" },
  ],
  addonLabel: "Add-ons",
  addons: [
    { name: "Tracker holder", desc: "Snaps on, fits a coin-size tracker", price: "20" },
    { name: "Engraving", desc: "Up to 3 initials, laser etched", price: "15" },
    { name: "Key organizer", desc: "Holds up to 6 keys, no jingle", price: "29" },
  ],
  totalLabel: "Total",
  buttonText: "Add to cart",
  perks: [
    { text: "Lifetime warranty", icon: "pack:shield" },
    { text: "60-day returns", icon: "pack:returns" },
    { text: "Free shipping", icon: "pack:truck" },
  ],
  finishOption: "Finish",
  styleOption: "Style",
  bg: "#ffffff",
  panel: "#e9e9e9",
  textColor: "#000000",
  muted: "#6e6e6e",
  accent: "#c8a464",
  button: "#1a1a1a",
  buttonText2: "#ffffff",
  font: "system",
  radius: 6,
};

/* ---------- colour helpers ---------- */

const parseHex = (h: string): number[] => {
  let s = String(h).trim().replace(/^#/, "");
  if (/^[0-9a-f]{3}$/i.test(s)) s = s.replace(/(.)/g, "$1$1");
  const n = /^[0-9a-f]{6}$/i.test(s) ? parseInt(s, 16) : 0x55585d;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const mix = (a: string, b: string, t: number): string => {
  const A = parseHex(a);
  const B = parseHex(b);
  return "#" + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, "0")).join("");
};
/** Same ratios as the color-mix() tones in the exported CSS. */
const tones = (hex: string) => ({
  shine: mix(hex, "#ffffff", 0.55),
  light: mix(hex, "#ffffff", 0.25),
  mid: mix(hex, hex, 0),
  dark: mix(hex, "#000000", 0.35),
  deep: mix(hex, "#000000", 0.6),
});
const textureOf = (name: string) =>
  /carbon/i.test(name) ? "carbon" : /matte/i.test(name) ? "matte" : "brushed";

/** What each add-on shows on the drawn wallet, by keyword. */
const addonVis = (name: string) =>
  /track|tag|gps|locat/i.test(name)
    ? "tracker"
    : /engrav|monogram|initial|etch/i.test(name)
      ? "engrave"
      : /key/i.test(name)
        ? "key"
        : "";

/* ---------- the drawn wallet ----------
   One SVG string for the preview and the export. Colours and
   layers are driven by CSS variables on the wrapper:
   --bs-shine … --bs-deep (finish), --bs-brushed / --bs-carbon
   (texture), --bs-strap / --bs-clip (carry style) and
   --bs-tracker / --bs-engrave / --bs-key (add-ons, 0 or 1). */

const st = (k: string) => `stop-color:var(--bs-${k});transition:stop-color .6s ${EASE}`;
const fade = (v: string, extra = "") =>
  `opacity:var(--bs-${v});transition:opacity .5s ${EASE},transform .6s ${EASE};transform-box:fill-box;transform-origin:center;${extra}`;

function walletSvg(u: string): string {
  return `<svg viewBox="0 0 260 190" width="100%" height="100%" aria-hidden="true" style="display:block;overflow:visible">
<defs>
<linearGradient id="${u}-m" gradientUnits="userSpaceOnUse" x1="40" y1="40" x2="216" y2="150"><stop offset="0" style="${st("light")}"/><stop offset=".38" style="${st("mid")}"/><stop offset=".52" style="${st("shine")}"/><stop offset=".66" style="${st("mid")}"/><stop offset="1" style="${st("dark")}"/></linearGradient>
<linearGradient id="${u}-c" x1="0" y1="0" x2="1" y2="0"><stop offset="0" style="${st("dark")}"/><stop offset=".45" style="${st("shine")}"/><stop offset="1" style="${st("deep")}"/></linearGradient>
<linearGradient id="${u}-v" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".22"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".18"/></linearGradient>
<pattern id="${u}-b" patternUnits="userSpaceOnUse" width="6" height="2"><rect width="6" height=".7" fill="#fff" fill-opacity=".09"/></pattern>
<pattern id="${u}-k" patternUnits="userSpaceOnUse" width="8" height="8" patternTransform="rotate(45)"><rect width="4" height="4" fill="#fff" fill-opacity=".07"/><rect x="4" y="4" width="4" height="4" fill="#fff" fill-opacity=".07"/><rect x="4" width="4" height="4" fill="#000" fill-opacity=".3"/><rect y="4" width="4" height="4" fill="#000" fill-opacity=".3"/></pattern>
<radialGradient id="${u}-s"><stop offset="0" stop-color="#000" stop-opacity=".22"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>
</defs>
<ellipse cx="132" cy="166" rx="104" ry="9" fill="url(#${u}-s)"/>
<g transform="rotate(-6 130 110)"><rect x="66" y="20" width="128" height="60" rx="5" fill="#f4f4f4" stroke="#000" stroke-opacity=".08"/><rect x="78" y="30" width="16" height="12" rx="2.5" fill="#d8c08a"/></g>
<g transform="rotate(3 130 110)"><rect x="70" y="26" width="128" height="60" rx="5" fill="#222"/><rect x="82" y="34" width="44" height="3" rx="1.5" fill="#fff" fill-opacity=".25"/></g>
<rect x="74" y="31" width="120" height="60" rx="5" fill="#bdbdbd"/>
<rect x="46" y="47" width="176" height="110" rx="12" style="fill:var(--bs-deep)"/>
<rect x="43" y="44" width="176" height="110" rx="12" fill="#121212"/>
<rect x="40" y="40" width="176" height="110" rx="12" fill="url(#${u}-m)"/>
<rect x="40" y="40" width="176" height="110" rx="12" fill="url(#${u}-b)" style="opacity:var(--bs-brushed);transition:opacity .4s"/>
<rect x="40" y="40" width="176" height="110" rx="12" fill="url(#${u}-k)" style="opacity:var(--bs-carbon);transition:opacity .4s"/>
<rect x="40" y="40" width="176" height="110" rx="12" fill="url(#${u}-v)"/>
<rect x="40.5" y="40.5" width="175" height="109" rx="11.5" fill="none" stroke="#fff" stroke-opacity=".3"/>
<g style="fill:var(--bs-dark)"><circle cx="54" cy="54" r="4.2"/><circle cx="202" cy="54" r="4.2"/><circle cx="54" cy="136" r="4.2"/><circle cx="202" cy="136" r="4.2"/></g>
<g style="fill:var(--bs-deep)"><circle cx="54" cy="54" r="1.7"/><circle cx="202" cy="54" r="1.7"/><circle cx="54" cy="136" r="1.7"/><circle cx="202" cy="136" r="1.7"/></g>
<g style="${fade("engrave")}" font-family="Georgia, serif" font-size="12" letter-spacing="4"><text x="60" y="133" fill="#fff" fill-opacity=".3">A·R·K</text><text x="60" y="132" style="fill:var(--bs-deep)">A·R·K</text></g>
<g style="${fade("strap", "transform:scaleY(calc(.9 + var(--bs-strap) * .1))")}"><rect x="152" y="33" width="22" height="124" rx="3" fill="#161616"/><path d="M155 33v124M171 33v124" stroke="#fff" stroke-opacity=".08"/><rect x="152" y="33" width="22" height="124" rx="3" fill="url(#${u}-v)"/></g>
<g style="${fade("clip", "transform:translateY(calc((1 - var(--bs-clip)) * -16px))")}"><rect x="150" y="30" width="26" height="80" rx="7" fill="url(#${u}-c)"/><rect x="150" y="30" width="26" height="80" rx="7" fill="url(#${u}-v)"/><rect x="156" y="36" width="3" height="66" rx="1.5" fill="#fff" fill-opacity=".35"/></g>
<g style="${fade("key", "transform:translateY(calc((1 - var(--bs-key)) * 10px))")}"><rect x="198" y="119" width="42" height="6" rx="2" fill="#d9d9d9" transform="rotate(-8 219 122)"/><rect x="202" y="121" width="38" height="6" rx="2" fill="#d8c08a" transform="rotate(5 221 124)"/><rect x="186" y="124" width="66" height="26" rx="13" style="fill:var(--bs-dark)"/><rect x="186" y="124" width="66" height="26" rx="13" fill="url(#${u}-v)"/><circle cx="199" cy="137" r="4.2" style="fill:var(--bs-deep)"/><circle cx="239" cy="137" r="4.2" style="fill:var(--bs-deep)"/></g>
<g style="${fade("tracker", "transform:scale(calc(.7 + var(--bs-tracker) * .3))")}"><rect x="14" y="104" width="50" height="50" rx="14" style="fill:var(--bs-dark)"/><rect x="14" y="104" width="50" height="50" rx="14" fill="url(#${u}-v)"/><circle cx="39" cy="129" r="16" fill="#f3f3f3"/><circle cx="39" cy="129" r="16" fill="url(#${u}-v)"/><circle cx="39" cy="129" r="5" fill="none" stroke="#000" stroke-opacity=".12" stroke-width="1.5"/></g>
</svg>`;
}

/* small drawn thumbnails for the add-on rows (preview only) */
function AddonThumb({ kind, color }: { kind: string; color: string }) {
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      {kind === "tracker" ? (
        <>
          <rect x="3" y="3" width="20" height="20" rx="6" />
          <circle cx="13" cy="13" r="5.5" />
        </>
      ) : kind === "engrave" ? (
        <>
          <path d="M5 20l3-9 3 9M6 17h4" />
          <path d="M14 20V11h3a2.3 2.3 0 0 1 0 4.5h-3h3.6a2.3 2.3 0 0 1 0 4.5z" />
        </>
      ) : kind === "key" ? (
        <>
          <circle cx="8.5" cy="13" r="4" />
          <path d="M12.5 13H22M19 13v3M16.5 13v2" />
        </>
      ) : (
        <path d="M13 6v14M6 13h14" />
      )}
    </svg>
  );
}

/* ---------- preview ---------- */

function Preview({ config }: { config: TweakConfig }) {
  const uid = "bsac" + useId().replace(/[^a-zA-Z0-9]/g, "");
  const cur = str(config, "currency", "$");
  const bg = str(config, "bg", "#ffffff");
  const panel = str(config, "panel", "#e9e9e9");
  const text = str(config, "textColor", "#000000");
  const muted = str(config, "muted", "#6e6e6e");
  const accent = str(config, "accent", "#c8a464");
  const button = str(config, "button", "#1a1a1a");
  const buttonText = str(config, "buttonText2", "#ffffff");
  const radius = num(config, "radius", 6);

  const finishes = list(config, "finishes").map((f) => ({
    name: f.name ?? "",
    hex: f.hex || "#55585d",
    price: toNum(f.price),
  }));
  const styles = list(config, "styles").map((s) => ({ name: s.name ?? "", price: toNum(s.price) }));
  const addons = list(config, "addons").map((a) => ({
    name: a.name ?? "",
    desc: a.desc ?? "",
    price: toNum(a.price),
    vis: addonVis(a.name ?? ""),
  }));
  const perks = list(config, "perks");

  const [fi, setFi] = useState(0);
  const [si, setSi] = useState(0);
  const [picked, setPicked] = useState<number[]>([0]);

  const fin = finishes[Math.min(fi, finishes.length - 1)] ?? { name: "", hex: "#55585d", price: 0 };
  const sIdx = Math.min(si, Math.max(0, styles.length - 1));
  const style = styles[sIdx];
  const on = picked.filter((i) => i < addons.length);
  const addonTotal = on.reduce((s, i) => s + addons[i].price, 0);
  const base = fin.price + (style?.price ?? 0);
  const total = base + addonTotal;
  const t = tones(fin.hex);
  const tex = textureOf(fin.name);
  const isClip = /clip/i.test(style?.name ?? "");
  const has = (k: string) => (on.some((i) => addons[i].vis === k) ? 1 : 0);

  const vars = {
    "--bs-shine": t.shine,
    "--bs-light": t.light,
    "--bs-mid": t.mid,
    "--bs-dark": t.dark,
    "--bs-deep": t.deep,
    "--bs-brushed": tex === "brushed" ? 1 : 0,
    "--bs-carbon": tex === "carbon" ? 1 : 0,
    "--bs-strap": isClip ? 0 : 1,
    "--bs-clip": isClip ? 1 : 0,
    "--bs-tracker": has("tracker"),
    "--bs-engrave": has("engrave"),
    "--bs-key": has("key"),
  } as CSSProperties;

  const toggle = (i: number) =>
    setPicked((p) => (p.includes(i) ? p.filter((x) => x !== i) : [...p, i]));

  const caps = "font-extrabold uppercase tracking-[0.06em]";
  const label = `${caps} text-[11.5px]`;

  return (
    <div className="@container w-full" style={{ background: bg, color: text, fontFamily: fontStack(str(config, "font", "system")) }}>
      <div className="mx-auto grid w-full max-w-[1040px] gap-5 p-4 @min-[640px]:grid-cols-[1.1fr_1fr] @min-[640px]:items-start @min-[640px]:gap-9 @min-[640px]:p-8">
        {/* Visual */}
        <div
          className="relative overflow-hidden @min-[640px]:sticky @min-[640px]:top-6"
          style={{ background: `linear-gradient(180deg, ${mix(panel, "#ffffff", 0.35)}, ${panel})`, borderRadius: radius + 2 }}
        >
          <div className="grid aspect-[4/3] place-items-center @min-[640px]:aspect-square">
            <div
              className="w-[84%] max-w-[420px]"
              style={vars}
              dangerouslySetInnerHTML={{ __html: walletSvg(uid) }}
            />
          </div>
          {str(config, "badge") && (
            <span className={`absolute left-3 top-3 px-2.5 py-[5px] ${caps} text-[10.5px]`} style={{ background: text, color: bg, borderRadius: Math.max(2, radius - 3) }}>
              {str(config, "badge")}
            </span>
          )}
          <span
            key={`${fin.name}-${style?.name}`}
            className={`bs-swap absolute bottom-3 left-3 right-3 truncate text-center ${caps} text-[10.5px]`}
            style={{ color: muted }}
          >
            {fin.name}
            {style ? ` / ${style.name}` : ""}
          </span>
        </div>

        {/* Configurator */}
        <div className="flex min-w-0 flex-col">
          <div className="flex items-start justify-between gap-4">
            <h3 className="text-[28px] font-black uppercase leading-[0.92] tracking-[-0.02em] @min-[640px]:text-[34px]">
              {str(config, "title")}
            </h3>
            <span key={fin.name} className="bs-swap mt-0.5 shrink-0 text-[20px] font-extrabold tabular-nums tracking-[-0.01em]">
              {money(base, cur)}
            </span>
          </div>
          {str(config, "subtitle") && (
            <p className="mt-2.5 text-[13px] leading-relaxed" style={{ color: muted }}>
              {str(config, "subtitle")}
            </p>
          )}

          {/* 01 Finish */}
          <div className="mt-5">
            <div className="flex items-baseline justify-between gap-3">
              <p className={label}>
                <span className="mr-2 tabular-nums" style={{ color: accent }}>01</span>
                {str(config, "finishLabel", "Finish")}
              </p>
              <p key={fin.name} className={`bs-swap truncate ${label}`} style={{ color: muted }}>
                {fin.name}
              </p>
            </div>
            <div role="radiogroup" aria-label={str(config, "finishLabel", "Finish")} className="mt-3 grid grid-cols-[repeat(auto-fill,minmax(60px,1fr))] gap-2">
              {finishes.map((f, i) => {
                const sel = f === fin;
                const ft = tones(f.hex);
                const ftex = textureOf(f.name);
                return (
                  <button
                    key={i}
                    type="button"
                    role="radio"
                    aria-checked={sel}
                    onClick={() => setFi(i)}
                    className="group flex min-w-0 flex-col items-center gap-1.5 pb-0.5"
                  >
                    <span
                      className="relative block aspect-square w-full max-w-[56px] transition-[box-shadow,scale] duration-300 group-active:scale-95"
                      style={{
                        transitionTimingFunction: EASE,
                        borderRadius: radius,
                        boxShadow: sel ? `0 0 0 2px ${bg}, 0 0 0 4px ${text}` : `0 0 0 1px ${panel}`,
                        background:
                          (ftex === "carbon"
                            ? `repeating-conic-gradient(rgba(0,0,0,.35) 0 25%, rgba(255,255,255,.06) 0 50%) 0 0/6px 6px, `
                            : ftex === "brushed"
                              ? `repeating-linear-gradient(0deg, rgba(255,255,255,.1) 0 1px, transparent 1px 3px), `
                              : "") +
                          `linear-gradient(135deg, ${ft.light}, ${f.hex} 45%, ${ft.shine} 55%, ${f.hex} 65%, ${ft.dark})`,
                      }}
                    />
                    <span className="line-clamp-2 w-full text-center text-[9px] font-bold uppercase leading-[1.2] tracking-[0.04em]" style={{ color: sel ? text : muted }}>
                      {f.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 02 Carry style */}
          {styles.length > 0 && (
            <div className="mt-5">
              <p className={label}>
                <span className="mr-2 tabular-nums" style={{ color: accent }}>02</span>
                {str(config, "styleLabel", "Carry")}
              </p>
              <div role="radiogroup" className="relative mt-3 flex h-11 p-1" style={{ background: panel, borderRadius: radius + 2 }}>
                <span
                  aria-hidden
                  className="absolute bottom-1 left-1 top-1 transition-transform duration-500"
                  style={{
                    width: `calc((100% - 8px) / ${styles.length})`,
                    transform: `translateX(${sIdx * 100}%)`,
                    transitionTimingFunction: EASE,
                    background: text,
                    borderRadius: radius,
                  }}
                />
                {styles.map((s, i) => (
                  <button
                    key={i}
                    type="button"
                    role="radio"
                    aria-checked={i === sIdx}
                    onClick={() => setSi(i)}
                    className={`relative z-[1] flex flex-1 items-center justify-center gap-1.5 truncate px-2 ${label} transition-colors duration-300`}
                    style={{ color: i === sIdx ? bg : text }}
                  >
                    {s.name}
                    {s.price > 0 && <span className="opacity-60">+{money(s.price, cur)}</span>}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 03 Add-ons */}
          {addons.length > 0 && (
            <div className="mt-5">
              <p className={label}>
                <span className="mr-2 tabular-nums" style={{ color: accent }}>{styles.length > 0 ? "03" : "02"}</span>
                {str(config, "addonLabel", "Add-ons")}
              </p>
              <div className="mt-3 flex flex-col gap-2">
                {addons.map((a, i) => {
                  const checked = on.includes(i);
                  return (
                    <button
                      key={i}
                      type="button"
                      role="checkbox"
                      aria-checked={checked}
                      onClick={() => toggle(i)}
                      className="flex w-full items-center gap-3 p-2.5 pr-3.5 text-left transition-[box-shadow,background-color] duration-300 active:scale-[0.995]"
                      style={{
                        borderRadius: radius + 2,
                        background: checked ? mix(panel, "#ffffff", 0.6) : bg,
                        boxShadow: checked ? `inset 0 0 0 1.5px ${text}` : `inset 0 0 0 1px ${panel}`,
                      }}
                    >
                      <span
                        aria-hidden
                        className="grid h-5 w-5 shrink-0 place-items-center transition-[background-color,box-shadow] duration-200"
                        style={{
                          borderRadius: Math.max(2, radius - 3),
                          background: checked ? text : "transparent",
                          boxShadow: checked ? "none" : `inset 0 0 0 1.5px ${mix(panel, "#000000", 0.25)}`,
                        }}
                      >
                        <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke={bg} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="transition-[opacity,scale] duration-200" style={{ opacity: checked ? 1 : 0, scale: checked ? "1" : "0.5" }}>
                          <path d="M2.5 6.3l2.3 2.2 4.7-5" />
                        </svg>
                      </span>
                      <span className="grid h-10 w-10 shrink-0 place-items-center" style={{ background: panel, borderRadius: Math.max(2, radius - 1) }}>
                        <AddonThumb kind={a.vis} color={text} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[12.5px] font-extrabold uppercase tracking-[0.04em]">{a.name}</span>
                        <span className="mt-0.5 block truncate text-[12px]" style={{ color: muted }}>{a.desc}</span>
                      </span>
                      <span className="shrink-0 text-[13px] font-extrabold tabular-nums">+{money(a.price, cur)}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Total + CTA */}
          <div className="mt-5 flex items-end justify-between gap-3 border-t pt-4" style={{ borderColor: panel }}>
            <div className="min-w-0">
              <p className={label}>{str(config, "totalLabel", "Total")}</p>
              <p className="mt-1 truncate text-[12px] tabular-nums" style={{ color: muted }}>
                {money(base, cur)}
                {on.length > 0 && ` + ${on.length} add-on${on.length > 1 ? "s" : ""} ${money(addonTotal, cur)}`}
              </p>
            </div>
            <span key={total} className="bs-swap shrink-0 text-[26px] font-black leading-none tabular-nums tracking-[-0.02em]">
              {money(total, cur)}
            </span>
          </div>
          <button
            type="button"
            className={`mt-4 flex h-14 w-full items-center justify-center gap-2 ${caps} text-[13px] transition-[filter,scale] duration-200 hover:brightness-150 active:scale-[0.99]`}
            style={{ background: button, color: buttonText, borderRadius: radius }}
          >
            {str(config, "buttonText", "Add to cart")}
            <span className="opacity-50">—</span>
            <span key={total} className="bs-swap tabular-nums">{money(total, cur)}</span>
          </button>

          {perks.length > 0 && (
            <div className="mt-4 grid border-y py-3" style={{ borderColor: panel, gridTemplateColumns: `repeat(${perks.length}, minmax(0,1fr))` }}>
              {perks.map((p, i) => (
                <div
                  key={i}
                  className="flex min-w-0 flex-col items-center gap-1.5 px-1 text-center @min-[420px]:flex-row @min-[420px]:justify-center"
                  style={{ borderLeft: i ? `1px solid ${panel}` : undefined }}
                >
                  {p.icon && (
                    <span className="shrink-0" style={{ color: text }}>
                      <Icon token={p.icon} size={17} />
                    </span>
                  )}
                  <span className="text-[9.5px] font-extrabold uppercase leading-tight tracking-[0.06em]">{p.text}</span>
                </div>
              ))}
            </div>
          )}
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
  const { face, family } = fontFaceFor(str(config, "font", "system"));
  const S = ".bs-ac-{{ section.id }}";
  const r = "{{ section.settings.radius }}px";
  const lab = "font-size: 11.5px; font-weight: 800; text-transform: uppercase; letter-spacing: .06em;";

  const style = `<style>
${face ? face + "\n" : ""}  ${S} { container-type: inline-size; background: {{ section.settings.bg }}; color: {{ section.settings.text_color }}; font-family: ${family}; }
  ${S} * { box-sizing: border-box; }
  ${S} p, ${S} h2 { margin: 0; }
  ${S} .bs-wrap { max-width: 1040px; margin: 0 auto; padding: 16px; display: grid; gap: 20px; }
  ${S} .bs-lab { ${lab} }
  ${S} .bs-num { margin-right: 8px; color: {{ section.settings.accent }}; }
  ${S} .bs-mut { color: {{ section.settings.muted }}; }
  ${S} .bs-tones { --bs-mid: var(--bs-c); --bs-shine: color-mix(in srgb, var(--bs-c) 45%, #fff); --bs-light: color-mix(in srgb, var(--bs-c) 75%, #fff);
    --bs-dark: color-mix(in srgb, var(--bs-c) 65%, #000); --bs-deep: color-mix(in srgb, var(--bs-c) 40%, #000); }
  ${S} .bs-vis { position: relative; overflow: hidden; border-radius: {{ section.settings.radius | plus: 2 }}px;
    background: linear-gradient(180deg, color-mix(in srgb, {{ section.settings.panel }} 65%, #fff), {{ section.settings.panel }}); }
  ${S} .bs-stage { aspect-ratio: 4 / 3; display: grid; place-items: center; }
  ${S} .bs-wallet { width: 84%; max-width: 420px; }
  ${S} .bs-img { width: 100%; height: 100%; object-fit: cover; display: block; }
  ${S} .bs-badge { position: absolute; left: 12px; top: 12px; padding: 5px 10px; ${lab} font-size: 10.5px;
    background: {{ section.settings.text_color }}; color: {{ section.settings.bg }}; border-radius: {{ section.settings.radius | minus: 3 | at_least: 2 }}px; }
  ${S} .bs-cap { position: absolute; left: 12px; right: 12px; bottom: 12px; text-align: center; ${lab} font-size: 10.5px; color: {{ section.settings.muted }};
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  ${S} .bs-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
  ${S} .bs-title { font-family: inherit; font-size: 28px; font-weight: 900; text-transform: uppercase; line-height: .92; letter-spacing: -.02em; color: inherit; }
  ${S} .bs-base { margin-top: 2px; flex-shrink: 0; font-size: 20px; font-weight: 800; letter-spacing: -.01em; }
  ${S} .bs-sub { margin-top: 10px; font-size: 13px; line-height: 1.6; color: {{ section.settings.muted }}; }
  ${S} .bs-step { margin-top: 20px; }
  ${S} .bs-row { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; }
  ${S} input[type="radio"], ${S} input[type="checkbox"] { position: absolute; opacity: 0; pointer-events: none; }
  ${S} .bs-sw { margin-top: 12px; display: grid; grid-template-columns: repeat(auto-fill, minmax(60px, 1fr)); gap: 8px; }
  ${S} .bs-swo { position: relative; display: flex; flex-direction: column; align-items: center; gap: 6px; min-width: 0; cursor: pointer; padding-bottom: 2px; color: {{ section.settings.muted }}; }
  ${S} .bs-swd { display: block; width: 100%; max-width: 56px; aspect-ratio: 1; border-radius: ${r}; box-shadow: 0 0 0 1px {{ section.settings.panel }};
    background: linear-gradient(135deg, var(--bs-light), var(--bs-c) 45%, var(--bs-shine) 55%, var(--bs-c) 65%, var(--bs-dark));
    transition: box-shadow .3s cubic-bezier(.22,1,.36,1), transform .2s; }
  ${S} .bs-swd.is-brushed { background: repeating-linear-gradient(0deg, rgba(255,255,255,.1) 0 1px, transparent 1px 3px), linear-gradient(135deg, var(--bs-light), var(--bs-c) 45%, var(--bs-shine) 55%, var(--bs-c) 65%, var(--bs-dark)); }
  ${S} .bs-swd.is-carbon { background: repeating-conic-gradient(rgba(0,0,0,.35) 0 25%, rgba(255,255,255,.06) 0 50%) 0 0 / 6px 6px, linear-gradient(135deg, var(--bs-light), var(--bs-c) 45%, var(--bs-shine) 55%, var(--bs-c) 65%, var(--bs-dark)); }
  ${S} .bs-swo:active .bs-swd { transform: scale(.95); }
  ${S} .bs-swo:has(input:checked) { color: {{ section.settings.text_color }}; }
  ${S} .bs-swo:has(input:checked) .bs-swd { box-shadow: 0 0 0 2px {{ section.settings.bg }}, 0 0 0 4px {{ section.settings.text_color }}; }
  ${S} .bs-swo:has(input:focus-visible) .bs-swd { outline: 2px solid {{ section.settings.accent }}; outline-offset: 6px; }
  ${S} .bs-swo.is-out .bs-swd { opacity: .4; }
  ${S} .bs-swn { width: 100%; text-align: center; font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; line-height: 1.2;
    display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  ${S} .bs-seg { position: relative; margin-top: 12px; display: flex; height: 44px; padding: 4px; background: {{ section.settings.panel }}; border-radius: {{ section.settings.radius | plus: 2 }}px; }
  ${S} .bs-pill { position: absolute; top: 4px; bottom: 4px; left: 4px; background: {{ section.settings.text_color }}; border-radius: ${r};
    transition: transform .5s cubic-bezier(.22,1,.36,1); }
  ${S} .bs-sego { position: relative; z-index: 1; flex: 1; display: flex; align-items: center; justify-content: center; padding: 0 8px; cursor: pointer; ${lab}
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis; transition: color .3s; }
  ${S} .bs-sego:has(input:checked) { color: {{ section.settings.bg }}; }
  ${S} .bs-sego.is-out { opacity: .45; }
  ${S} .bs-sego:has(input:focus-visible) { outline: 2px solid {{ section.settings.accent }}; outline-offset: -2px; border-radius: ${r}; }
  ${S} .bs-adds { margin-top: 12px; display: flex; flex-direction: column; gap: 8px; }
  ${S} .bs-add { position: relative; display: flex; align-items: center; gap: 12px; padding: 10px 14px 10px 10px; cursor: pointer; border-radius: {{ section.settings.radius | plus: 2 }}px;
    box-shadow: inset 0 0 0 1px {{ section.settings.panel }}; transition: box-shadow .3s, background-color .3s; }
  ${S} .bs-add:has(input:checked) { box-shadow: inset 0 0 0 1.5px {{ section.settings.text_color }}; background: color-mix(in srgb, {{ section.settings.panel }} 40%, #fff); }
  ${S} .bs-add:has(input:focus-visible) { outline: 2px solid {{ section.settings.accent }}; outline-offset: 2px; }
  ${S} .bs-add.is-off { opacity: .5; cursor: not-allowed; }
  ${S} .bs-box { width: 20px; height: 20px; flex-shrink: 0; display: grid; place-items: center; border-radius: {{ section.settings.radius | minus: 3 | at_least: 2 }}px;
    box-shadow: inset 0 0 0 1.5px color-mix(in srgb, {{ section.settings.panel }} 75%, #000); transition: background-color .2s, box-shadow .2s; }
  ${S} .bs-box svg { opacity: 0; transform: scale(.5); transition: opacity .2s, transform .2s; }
  ${S} .bs-add:has(input:checked) .bs-box { background: {{ section.settings.text_color }}; box-shadow: none; }
  ${S} .bs-add:has(input:checked) .bs-box svg { opacity: 1; transform: none; }
  ${S} .bs-thumb { width: 40px; height: 40px; flex-shrink: 0; display: grid; place-items: center; overflow: hidden; background: {{ section.settings.panel }};
    border-radius: {{ section.settings.radius | minus: 1 | at_least: 2 }}px; }
  ${S} .bs-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
  ${S} .bs-add-m { flex: 1; min-width: 0; }
  ${S} .bs-add-t { display: block; font-size: 12.5px; font-weight: 800; text-transform: uppercase; letter-spacing: .04em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  ${S} .bs-add-d { display: block; margin-top: 2px; font-size: 12px; color: {{ section.settings.muted }}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  ${S} .bs-add-p { flex-shrink: 0; font-size: 13px; font-weight: 800; }
  ${S} .bs-total { margin-top: 20px; padding-top: 16px; border-top: 1px solid {{ section.settings.panel }}; display: flex; align-items: flex-end; justify-content: space-between; gap: 12px; }
  ${S} .bs-break { margin-top: 4px; font-size: 12px; color: {{ section.settings.muted }}; }
  ${S} .bs-sum { flex-shrink: 0; font-size: 26px; font-weight: 900; line-height: 1; letter-spacing: -.02em; }
  ${S} .bs-form { margin: 0; }
  ${S} .bs-atc { margin-top: 16px; width: 100%; height: 56px; border: 0; cursor: pointer; font: inherit; ${lab} font-size: 13px;
    display: flex; align-items: center; justify-content: center; gap: 8px; border-radius: ${r};
    background: {{ section.settings.button }}; color: {{ section.settings.button_text_color }}; transition: filter .2s, transform .2s; }
  ${S} .bs-atc:hover { filter: brightness(1.5); }
  ${S} .bs-atc:active { transform: scale(.99); }
  ${S} .bs-atc:disabled { opacity: .45; cursor: not-allowed; }
  ${S} .bs-atc .bs-dash { opacity: .5; }
  ${S} .bs-perks { margin-top: 16px; display: grid; grid-auto-flow: column; grid-auto-columns: minmax(0, 1fr); padding: 12px 0;
    border-top: 1px solid {{ section.settings.panel }}; border-bottom: 1px solid {{ section.settings.panel }}; }
  ${S} .bs-perk { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 0 4px; text-align: center; min-width: 0; }
  ${S} .bs-perk + .bs-perk { border-left: 1px solid {{ section.settings.panel }}; }
  ${S} .bs-perk svg { flex-shrink: 0; }
  ${S} .bs-perk span { font-size: 9.5px; font-weight: 800; text-transform: uppercase; letter-spacing: .06em; line-height: 1.2; }
  @container (min-width: 420px) { ${S} .bs-perk { flex-direction: row; justify-content: center; } }
  @container (min-width: 640px) {
    ${S} .bs-wrap { grid-template-columns: 1.1fr 1fr; align-items: start; gap: 36px; padding: 32px; }
    ${S} .bs-vis { position: sticky; top: 24px; }
    ${S} .bs-stage { aspect-ratio: 1; }
    ${S} .bs-title { font-size: 34px; }
  }
  @media (prefers-reduced-motion: reduce) { ${S} * { transition-duration: 1ms !important; } }
</style>`;

  const check = `<svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="{{ section.settings.bg }}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 6.3l2.3 2.2 4.7-5"/></svg>`;

  const markup = `{%- comment -%}
  Add-on Configurator by boost.supply. Add it to your product template.
  Setup:
  - Finish and carry style come from your product options. Set "Finish option
    name" and "Style option name" to the exact option names on your product.
  - Add a "Finish swatch" block per finish (value must match the option value)
    to set its swatch colour and texture.
  - Create each add-on as its own product in Shopify, then pick it in an
    "Add-on" block. Checked add-ons are added to the cart with the main product.
  - Engraving text or other personalisation needs line item properties or an
    app; this section only adds the add-on product.
{%- endcomment -%}
{%- if product != blank -%}
{%- assign bs_v = product.selected_or_first_available_variant -%}
{%- assign bs_fin_key = section.settings.finish_option | downcase | strip -%}
{%- assign bs_sty_key = section.settings.style_option | downcase | strip -%}
{%- assign bs_fin = nil -%}
{%- assign bs_sty = nil -%}
{%- for bs_o in product.options_with_values -%}
  {%- assign bs_on = bs_o.name | downcase | strip -%}
  {%- if bs_on == bs_fin_key -%}{%- assign bs_fin = bs_o -%}{%- endif -%}
  {%- if bs_on == bs_sty_key -%}{%- assign bs_sty = bs_o -%}{%- endif -%}
{%- endfor -%}
{%- assign bs_fi = -1 -%}
{%- assign bs_si = -1 -%}
{%- assign bs_cur_fin = '' -%}
{%- assign bs_cur_sty = '' -%}
{%- if bs_fin -%}{%- assign bs_fi = bs_fin.position | minus: 1 -%}{%- assign bs_cur_fin = bs_v.options[bs_fi] -%}{%- endif -%}
{%- if bs_sty -%}{%- assign bs_si = bs_sty.position | minus: 1 -%}{%- assign bs_cur_sty = bs_v.options[bs_si] -%}{%- endif -%}
{%- assign bs_cur_h = bs_cur_fin | handleize -%}
{%- assign bs_cur_col = '#55585d' -%}
{%- assign bs_cur_tex = 'brushed' -%}
{%- for block in section.blocks -%}
  {%- if block.type == 'finish' -%}
    {%- assign bs_bh = block.settings.value | handleize -%}
    {%- if bs_bh == bs_cur_h -%}{%- assign bs_cur_col = block.settings.color -%}{%- assign bs_cur_tex = block.settings.texture -%}{%- endif -%}
  {%- endif -%}
{%- endfor -%}
{%- assign bs_cur_sty_l = bs_cur_sty | downcase -%}
<div class="bs-ac-{{ section.id }}" id="bs-ac-{{ section.id }}" data-fi="{{ bs_fi }}" data-si="{{ bs_si }}">
  <div class="bs-wrap">
    <div class="bs-vis">
      <div class="bs-stage">
        {%- if section.settings.visual == 'image' and product.featured_media != blank -%}
          {%- assign bs_media = bs_v.featured_media | default: product.featured_media -%}
          {{ bs_media | image_url: width: 1200 | image_tag: class: 'bs-img', alt: product.title, loading: 'eager' }}
        {%- else -%}
          <div class="bs-wallet bs-tones" data-wallet style="--bs-c: {{ bs_cur_col }}; --bs-brushed: {% if bs_cur_tex == 'brushed' %}1{% else %}0{% endif %}; --bs-carbon: {% if bs_cur_tex == 'carbon' %}1{% else %}0{% endif %}; --bs-strap: {% if bs_cur_sty_l contains 'clip' %}0{% else %}1{% endif %}; --bs-clip: {% if bs_cur_sty_l contains 'clip' %}1{% else %}0{% endif %}; --bs-tracker: 0; --bs-engrave: 0; --bs-key: 0;">
            ${walletSvg("bsac{{ section.id }}").replace(/\n/g, "\n            ")}
          </div>
        {%- endif -%}
      </div>
      {%- if section.settings.badge != blank -%}<span class="bs-badge">{{ section.settings.badge }}</span>{%- endif -%}
      <span class="bs-cap" data-cap>{{ bs_cur_fin }}{%- if bs_cur_sty != blank -%} / {{ bs_cur_sty }}{%- endif -%}</span>
    </div>

    <div class="bs-cfg">
      <div class="bs-top">
        <h2 class="bs-title">{{ section.settings.title | default: product.title }}</h2>
        <span class="bs-base" data-base>{{ bs_v.price | money_without_trailing_zeros }}</span>
      </div>
      {%- if section.settings.subtitle != blank -%}<p class="bs-sub">{{ section.settings.subtitle }}</p>{%- endif -%}

      {%- assign bs_step = 0 -%}
      {%- if bs_fin -%}
        {%- assign bs_step = bs_step | plus: 1 -%}
        <div class="bs-step">
          <div class="bs-row">
            <p class="bs-lab"><span class="bs-num">0{{ bs_step }}</span>{{ section.settings.finish_label }}</p>
            <p class="bs-lab bs-mut" data-fin-name>{{ bs_cur_fin }}</p>
          </div>
          <div class="bs-sw" role="radiogroup" aria-label="{{ section.settings.finish_label | escape }}">
            {%- for bs_val in bs_fin.values -%}
              {%- capture bs_name -%}{{ bs_val }}{%- endcapture -%}
              {%- assign bs_h = bs_name | handleize -%}
              {%- assign bs_col = '#55585d' -%}
              {%- assign bs_tex = 'brushed' -%}
              {%- assign bs_blk = nil -%}
              {%- for block in section.blocks -%}
                {%- if block.type == 'finish' -%}
                  {%- assign bs_bh = block.settings.value | handleize -%}
                  {%- if bs_bh == bs_h -%}{%- assign bs_col = block.settings.color -%}{%- assign bs_tex = block.settings.texture -%}{%- assign bs_blk = block -%}{%- endif -%}
                {%- endif -%}
              {%- endfor -%}
              {%- assign bs_av = false -%}
              {%- for bs_var in product.variants -%}
                {%- if bs_var.options[bs_fi] == bs_name and bs_var.available -%}{%- assign bs_av = true -%}{%- endif -%}
              {%- endfor -%}
              <label class="bs-swo{% unless bs_av %} is-out{% endunless %}"{% if bs_blk %} {{ bs_blk.shopify_attributes }}{% endif %}>
                <input type="radio" name="bs-fin-{{ section.id }}" value="{{ bs_name | escape }}" data-fin data-color="{{ bs_col }}" data-tex="{{ bs_tex }}"{% if bs_name == bs_cur_fin %} checked{% endif %}>
                <span class="bs-swd bs-tones is-{{ bs_tex }}" style="--bs-c: {{ bs_col }};" aria-hidden="true"></span>
                <span class="bs-swn">{{ bs_name }}</span>
              </label>
            {%- endfor -%}
          </div>
        </div>
      {%- endif -%}

      {%- if bs_sty -%}
        {%- assign bs_step = bs_step | plus: 1 -%}
        <div class="bs-step">
          <p class="bs-lab"><span class="bs-num">0{{ bs_step }}</span>{{ section.settings.style_label }}</p>
          <div class="bs-seg" role="radiogroup" aria-label="{{ section.settings.style_label | escape }}">
            <span class="bs-pill" data-pill style="width: calc((100% - 8px) / {{ bs_sty.values.size }});" aria-hidden="true"></span>
            {%- for bs_val in bs_sty.values -%}
              {%- capture bs_name -%}{{ bs_val }}{%- endcapture -%}
              <label class="bs-sego">
                <input type="radio" name="bs-sty-{{ section.id }}" value="{{ bs_name | escape }}" data-sty data-i="{{ forloop.index0 }}"{% if bs_name == bs_cur_sty %} checked{% endif %}>
                {{ bs_name }}
              </label>
            {%- endfor -%}
          </div>
        </div>
      {%- endif -%}

      {%- assign bs_has_add = false -%}
      {%- for block in section.blocks -%}{%- if block.type == 'addon' -%}{%- assign bs_has_add = true -%}{%- endif -%}{%- endfor -%}
      {%- if bs_has_add -%}
        {%- assign bs_step = bs_step | plus: 1 -%}
        <div class="bs-step">
          <p class="bs-lab"><span class="bs-num">0{{ bs_step }}</span>{{ section.settings.addon_label }}</p>
          <div class="bs-adds">
            {%- for block in section.blocks -%}
              {%- if block.type == 'addon' -%}
                {%- assign bs_p = block.settings.product -%}
                {%- assign bs_t = block.settings.title | default: bs_p.title -%}
                {%- assign bs_tl = bs_t | downcase -%}
                {%- assign bs_vis = '' -%}
                {%- if bs_tl contains 'track' or bs_tl contains 'tag' or bs_tl contains 'gps' -%}{%- assign bs_vis = 'tracker' -%}
                {%- elsif bs_tl contains 'engrav' or bs_tl contains 'monogram' or bs_tl contains 'initial' -%}{%- assign bs_vis = 'engrave' -%}
                {%- elsif bs_tl contains 'key' -%}{%- assign bs_vis = 'key' -%}{%- endif -%}
                {%- assign bs_av2 = bs_p.selected_or_first_available_variant -%}
                <label class="bs-add{% if bs_p == blank or bs_av2.available == false %} is-off{% endif %}" {{ block.shopify_attributes }}>
                  <input type="checkbox" data-add data-vis="{{ bs_vis }}"{% if bs_p != blank %} data-id="{{ bs_av2.id }}" data-price="{{ bs_av2.price }}"{% endif %}{% if bs_p == blank or bs_av2.available == false %} disabled{% endif %}>
                  <span class="bs-box" aria-hidden="true">${check}</span>
                  <span class="bs-thumb">
                    {%- if bs_p.featured_image -%}{{ bs_p.featured_image | image_url: width: 120 | image_tag: loading: 'lazy', alt: bs_t }}{%- else -%}{{ block.settings.icon }}{%- endif -%}
                  </span>
                  <span class="bs-add-m">
                    <span class="bs-add-t">{{ bs_t }}</span>
                    {%- if block.settings.description != blank -%}<span class="bs-add-d">{{ block.settings.description }}</span>{%- endif -%}
                  </span>
                  <span class="bs-add-p">+{%- if bs_p != blank -%}{{ bs_av2.price | money_without_trailing_zeros }}{%- else -%}{{ block.settings.price_label }}{%- endif -%}</span>
                </label>
              {%- endif -%}
            {%- endfor -%}
          </div>
        </div>
      {%- endif -%}

      {%- form 'product', product, class: 'bs-form' -%}
        <input type="hidden" name="id" value="{{ bs_v.id }}" data-id>
        <div class="bs-total">
          <div>
            <p class="bs-lab">{{ section.settings.total_label }}</p>
            <p class="bs-break" data-break>{{ bs_v.price | money_without_trailing_zeros }}</p>
          </div>
          <span class="bs-sum" data-sum>{{ bs_v.price | money_without_trailing_zeros }}</span>
        </div>
        <button type="submit" name="add" class="bs-atc" data-atc{% unless bs_v.available %} disabled{% endunless %}>
          <span data-atc-label>{%- if bs_v.available -%}{{ section.settings.button_text }}{%- else -%}{{ section.settings.sold_out_text }}{%- endif -%}</span>
          <span class="bs-dash" aria-hidden="true">—</span>
          <span data-atc-price>{{ bs_v.price | money_without_trailing_zeros }}</span>
        </button>
      {%- endform -%}

      {%- assign bs_has_perk = false -%}
      {%- for block in section.blocks -%}{%- if block.type == 'perk' -%}{%- assign bs_has_perk = true -%}{%- endif -%}{%- endfor -%}
      {%- if bs_has_perk -%}
        <div class="bs-perks">
          {%- for block in section.blocks -%}
            {%- if block.type == 'perk' -%}
              <div class="bs-perk" {{ block.shopify_attributes }}>{{ block.settings.icon }}<span>{{ block.settings.text }}</span></div>
            {%- endif -%}
          {%- endfor -%}
        </div>
      {%- endif -%}
    </div>
  </div>
  <script type="application/json" data-variants>{{ product.variants | json }}</script>
</div>
<script>
  (function () {
    var root = document.getElementById('bs-ac-{{ section.id }}');
    if (!root) return;
    var variants = [];
    try { variants = JSON.parse(root.querySelector('[data-variants]').textContent); } catch (e) { return; }
    var fi = parseInt(root.dataset.fi, 10), si = parseInt(root.dataset.si, 10);
    var T = {
      add: {{ section.settings.button_text | json }},
      out: {{ section.settings.sold_out_text | json }},
      none: {{ section.settings.unavailable_text | json }},
      addon: {{ section.settings.addon_word | json }},
      cart: {{ routes.cart_url | json }},
      cartAdd: {{ routes.cart_add_url | json }}
    };
    var fmt = String({{ shop.money_format | json }}).replace(/<[^>]*>/g, '');
    function money(cents) {
      var open = '{' + '{', close = '}' + '}';
      var a = fmt.indexOf(open), b = fmt.indexOf(close, a);
      var v = cents / 100;
      if (a < 0 || b < 0) return v.toFixed(2);
      var key = fmt.slice(a + 2, b).trim();
      var s = key.indexOf('no_decimals') > -1 ? String(Math.round(v)) : v.toFixed(2).replace(/\\.00$/, '');
      if (key.indexOf('comma') > -1) s = s.replace('.', ',');
      return fmt.slice(0, a) + s + fmt.slice(b + 2);
    }
    function $(sel) { return root.querySelector(sel); }
    function all(sel) { return Array.prototype.slice.call(root.querySelectorAll(sel)); }
    var wallet = $('[data-wallet]');
    var current = null;
    function setVar(k, v) { if (wallet) wallet.style.setProperty('--bs-' + k, v); }
    function update() {
      var f = $('[data-fin]:checked'), s = $('[data-sty]:checked');
      var fv = f ? f.value : null, sv = s ? s.value : null;
      if (f) {
        setVar('c', f.dataset.color);
        setVar('brushed', f.dataset.tex === 'brushed' ? 1 : 0);
        setVar('carbon', f.dataset.tex === 'carbon' ? 1 : 0);
      }
      var clip = sv && sv.toLowerCase().indexOf('clip') > -1;
      setVar('strap', clip ? 0 : 1);
      setVar('clip', clip ? 1 : 0);
      var pill = $('[data-pill]');
      if (pill && s) pill.style.transform = 'translateX(' + (parseInt(s.dataset.i, 10) * 100) + '%)';
      var fn = $('[data-fin-name]');
      if (fn) fn.textContent = fv || '';
      $('[data-cap]').textContent = (fv || '') + (sv ? ' / ' + sv : '');
      all('[data-sty]').forEach(function (el) {
        var ok = variants.some(function (v) {
          return (fi < 0 || v.options[fi] === fv) && v.options[si] === el.value && v.available;
        });
        el.parentNode.classList.toggle('is-out', !ok);
      });
      current = null;
      for (var i = 0; i < variants.length; i++) {
        var v = variants[i];
        if ((fi < 0 || v.options[fi] === fv) && (si < 0 || v.options[si] === sv)) { current = v; break; }
      }
      var flags = { tracker: 0, engrave: 0, key: 0 };
      var extra = 0, count = 0;
      all('[data-add]:checked').forEach(function (el) {
        extra += parseInt(el.dataset.price, 10) || 0;
        count += 1;
        if (el.dataset.vis) flags[el.dataset.vis] = 1;
      });
      setVar('tracker', flags.tracker);
      setVar('engrave', flags.engrave);
      setVar('key', flags.key);
      var atc = $('[data-atc]'), label = $('[data-atc-label]');
      if (!current) {
        atc.disabled = true;
        label.textContent = T.none;
        return;
      }
      $('[data-id]').value = current.id;
      var total = current.price + extra;
      $('[data-base]').textContent = money(current.price);
      $('[data-sum]').textContent = money(total);
      $('[data-atc-price]').textContent = money(total);
      $('[data-break]').textContent = money(current.price) + (count ? ' + ' + count + ' ' + T.addon + ' ' + money(extra) : '');
      atc.disabled = !current.available;
      label.textContent = current.available ? T.add : T.out;
      var img = $('.bs-img');
      if (img && current.featured_image && current.featured_image.src) {
        var src = current.featured_image.src;
        img.removeAttribute('srcset');
        img.src = src + (src.indexOf('?') > -1 ? '&' : '?') + 'width=1200';
      }
    }
    all('[data-fin], [data-sty], [data-add]').forEach(function (el) { el.addEventListener('change', update); });
    var form = $('form.bs-form');
    if (form) {
      form.addEventListener('submit', function (e) {
        if (!current || !window.fetch) return;
        e.preventDefault();
        var items = [{ id: current.id, quantity: 1 }];
        all('[data-add]:checked').forEach(function (el) {
          if (el.dataset.id) items.push({ id: parseInt(el.dataset.id, 10), quantity: 1 });
        });
        var atc = $('[data-atc]');
        atc.disabled = true;
        fetch(T.cartAdd + '.js', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify({ items: items })
        }).then(function (res) {
          if (!res.ok) throw new Error('cart');
          window.location.href = T.cart;
        }).catch(function () {
          atc.disabled = false;
          form.submit();
        });
      });
    }
    update();
  })();
</script>
{%- else -%}
<p style="padding:24px;text-align:center;opacity:.6">Add this section to a product template.</p>
{%- endif -%}`;

  const finishes = list(config, "finishes");
  const addons = list(config, "addons");
  const perks = list(config, "perks");
  const hexOk = (h: string) => (/^#[0-9a-f]{6}$/i.test(h) ? h.toLowerCase() : "#55585d");

  const schema = buildSchema({
    name: "Add-on Configurator",
    settings: [
      txt("text", "badge", "Badge", str(config, "badge")),
      txt("text", "title", "Title", str(config, "title"), "Leave empty to use the product title"),
      txt("textarea", "subtitle", "Subtitle", str(config, "subtitle")),
      {
        type: "select",
        id: "visual",
        label: "Product visual",
        options: [
          { value: "drawn", label: "Drawn wallet (recolours with the finish)" },
          { value: "image", label: "Variant images" },
        ],
        default: "drawn",
      },
      { type: "header", content: "Product options" },
      txt("text", "finish_option", "Finish option name", str(config, "finishOption", "Finish"), "Must match the option name on your product"),
      txt("text", "finish_label", "Finish label", str(config, "finishLabel")),
      txt("text", "style_option", "Style option name", str(config, "styleOption", "Style"), "Must match the option name on your product"),
      txt("text", "style_label", "Style label", str(config, "styleLabel")),
      txt("text", "addon_label", "Add-ons label", str(config, "addonLabel")),
      txt("text", "addon_word", "Add-on count word", "add-ons", "Shown in the total breakdown, e.g. “+ 2 add-ons”"),
      { type: "header", content: "Total & button" },
      txt("text", "total_label", "Total label", str(config, "totalLabel")),
      txt("text", "button_text", "Button text", str(config, "buttonText")),
      txt("text", "sold_out_text", "Sold out text", "Sold out"),
      txt("text", "unavailable_text", "Unavailable text", "Unavailable"),
      { type: "header", content: "Style" },
      { type: "color", id: "bg", label: "Background", default: str(config, "bg") },
      { type: "color", id: "panel", label: "Panel & lines", default: str(config, "panel") },
      { type: "color", id: "text_color", label: "Text", default: str(config, "textColor") },
      { type: "color", id: "muted", label: "Muted text", default: str(config, "muted") },
      { type: "color", id: "accent", label: "Accent", default: str(config, "accent") },
      { type: "color", id: "button", label: "Button", default: str(config, "button") },
      { type: "color", id: "button_text_color", label: "Button text", default: str(config, "buttonText2") },
      { type: "range", id: "radius", label: "Corner radius", min: 0, max: 20, step: 1, unit: "px", default: Math.max(0, Math.min(20, Math.round(num(config, "radius", 6)))) },
    ],
    blocks: [
      {
        type: "finish",
        name: "Finish swatch",
        settings: [
          { type: "text", id: "value", label: "Option value", default: "Gunmetal" },
          { type: "color", id: "color", label: "Swatch colour", default: "#55585d" },
          {
            type: "select",
            id: "texture",
            label: "Texture",
            options: [
              { value: "brushed", label: "Brushed metal" },
              { value: "matte", label: "Matte" },
              { value: "carbon", label: "Carbon weave" },
            ],
            default: "brushed",
          },
        ],
      },
      {
        type: "addon",
        name: "Add-on",
        settings: [
          { type: "product", id: "product", label: "Add-on product" },
          { type: "text", id: "title", label: "Title (leave empty for product title)" },
          { type: "text", id: "description", label: "Description" },
          { type: "text", id: "price_label", label: "Price shown before a product is picked" },
          { type: "html", id: "icon", label: "Icon (if the product has no image)" },
        ],
      },
      {
        type: "perk",
        name: "Guarantee",
        settings: [
          { type: "text", id: "text", label: "Text", default: "Lifetime warranty" },
          { type: "html", id: "icon", label: "Icon" },
        ],
      },
    ],
    maxBlocks: 20,
    presetBlocks: [
      ...finishes.map((f) => ({
        type: "finish",
        settings: { value: esc(f.name ?? ""), color: hexOk(f.hex ?? ""), texture: textureOf(f.name ?? "") },
      })),
      ...addons.map((a) => ({
        type: "addon",
        settings: {
          title: esc(a.name ?? ""),
          description: esc(a.desc ?? ""),
          price_label: money(toNum(a.price), str(config, "currency", "$")),
          icon: iconMarkup(
            addonVis(a.name ?? "") === "tracker" ? "pack:check" : addonVis(a.name ?? "") === "engrave" ? "pack:sparkles" : addonVis(a.name ?? "") === "key" ? "pack:lock" : "pack:package",
            20,
          ),
        },
      })),
      ...perks.map((p) => ({
        type: "perk",
        settings: { text: esc(p.text ?? ""), icon: iconMarkup(p.icon || "pack:check", 17) },
      })),
    ],
  });

  return section({ style, markup, schema });
}

export const addonConfigurator: Tweak = {
  slug: "addon-configurator",
  inspiredBy: "ridge",
  name: "Add-on Configurator",
  tagline: "Finish swatches, a carry-style toggle and priced add-ons with a running total.",
  description:
    "Modeled on the wallet configurator Ridge uses on its product pages. Shoppers pick a named finish, switch carry style on a segmented toggle and tick add-ons that each show their own price, while the total and the add-to-cart button update live. A guarantee row closes it out. In Shopify the finish and style map to your product options, every add-on is a real product, and one click adds the main product plus the checked add-ons to the cart.",
  category: "product-page",
  tier: "paid",
  price: 39,
  tint: "#ececec",
  Preview,
  generateLiquid,
  defaults,
  fields: [
    { key: "badge", label: "Badge", type: "text", group: "Content" },
    { key: "title", label: "Title", type: "text", group: "Content" },
    { key: "subtitle", label: "Subtitle", type: "textarea", group: "Content" },
    { key: "currency", label: "Currency symbol", type: "text", group: "Content" },
    { key: "finishLabel", label: "Label", type: "text", group: "Finishes" },
    {
      key: "finishes", label: "Finishes", type: "list", group: "Finishes",
      hint: "Swatch is a hex colour. Names with “carbon” or “matte” get that texture. Prices are preview only",
      itemFields: [
        { key: "name", label: "Name", type: "text" },
        { key: "hex", label: "Swatch hex", type: "text" },
        { key: "price", label: "Price", type: "text" },
      ],
      newItem: { name: "Navy", hex: "#26324a", price: "95" }, addLabel: "Add finish", max: 8,
    },
    { key: "styleLabel", label: "Label", type: "text", group: "Carry style" },
    {
      key: "styles", label: "Styles", type: "list", group: "Carry style",
      hint: "A style with “clip” in its name shows the money clip on the wallet",
      itemFields: [
        { key: "name", label: "Name", type: "text" },
        { key: "price", label: "Extra price", type: "text" },
      ],
      newItem: { name: "Card only", price: "0" }, addLabel: "Add style", max: 3,
    },
    { key: "addonLabel", label: "Label", type: "text", group: "Add-ons" },
    {
      key: "addons", label: "Add-ons", type: "list", group: "Add-ons",
      hint: "Preview only. Pick the real add-on products in the Shopify theme editor",
      itemFields: [
        { key: "name", label: "Name", type: "text" },
        { key: "desc", label: "Description", type: "text" },
        { key: "price", label: "Price", type: "text" },
      ],
      newItem: { name: "Gift box", desc: "Ready to give, with a note", price: "10" }, addLabel: "Add add-on", max: 5,
    },
    { key: "totalLabel", label: "Total label", type: "text", group: "Total & button" },
    { key: "buttonText", label: "Button text", type: "text", group: "Total & button" },
    {
      key: "perks", label: "Guarantees", type: "list", group: "Guarantees",
      itemFields: [
        { key: "text", label: "Text", type: "text" },
        { key: "icon", label: "Icon", type: "icon" },
      ],
      newItem: { text: "Secure checkout", icon: "pack:lock" }, addLabel: "Add guarantee", max: 4,
    },
    { key: "finishOption", label: "Finish option name", type: "text", group: "Shopify", hint: "The product option that holds the finishes" },
    { key: "styleOption", label: "Style option name", type: "text", group: "Shopify", hint: "The product option that holds the carry styles" },
    fontField("Typography"),
    { key: "radius", label: "Corner radius", type: "slider", group: "Layout", min: 0, max: 20, step: 1, unit: "px" },
    { key: "bg", label: "Background", type: "color", group: "Colors" },
    { key: "panel", label: "Panel & lines", type: "color", group: "Colors" },
    { key: "textColor", label: "Text", type: "color", group: "Colors" },
    { key: "muted", label: "Muted text", type: "color", group: "Colors" },
    { key: "accent", label: "Accent", type: "color", group: "Colors" },
    { key: "button", label: "Button", type: "color", group: "Colors" },
    { key: "buttonText2", label: "Button text", type: "color", group: "Colors" },
  ],
};
