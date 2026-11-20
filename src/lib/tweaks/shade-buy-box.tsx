"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { Tweak, TweakConfig } from "../types";
import { str, num, bool, list, fontStack, esc } from "../cfg";
import { fontField } from "../fields";
import { buildSchema, section, fontFaceFor } from "../liquid";
import { money, toNum } from "./product-art";

/* ============================================================
   Shade & Size Buy Box
   A product-page buy box: caps title with a lowercase style
   name, price, shade swatches grouped as Classic / Limited /
   Sale with the chosen shade's name, size chips with sold-out
   sizes that turn the button into "notify me", a fit note, add
   to bag and small delivery and returns lines. The photo
   crossfades to the chosen shade.
   ============================================================ */

const EASE = "cubic-bezier(.22,1,.36,1)";
const GROUP_IDS = ["classic", "limited", "sale"] as const;

const defaults: TweakConfig = {
  title: "Second Skin",
  styleName: "Scoop neck bralette",
  price: "52",
  currency: "$",
  shades: [
    { name: "Clay", group: "Classic", hex: "#C9A68C", price: "", compare: "", soldOut: "XS", image: "/mockups/ladder-bra-nude.jpg" },
    { name: "Cocoa", group: "Classic", hex: "#6F4C3E", price: "", compare: "", soldOut: "", image: "/mockups/ladder-bra-cocoa.jpg" },
    { name: "Onyx", group: "Classic", hex: "#1F1D1C", price: "", compare: "", soldOut: "M, 3X", image: "/mockups/ladder-bra-black.jpg" },
    { name: "Rosewood", group: "Limited", hex: "#9A6560", price: "", compare: "", soldOut: "XXS, 2X, 3X", image: "" },
    { name: "Bone", group: "Sale", hex: "#EDE6DB", price: "36", compare: "52", soldOut: "L", image: "/mockups/ladder-bra-white.jpg" },
  ],
  selectedShade: 1,
  groupClassic: "Classic",
  groupLimited: "Limited",
  groupSale: "Sale",
  sizes: "XXS, XS, S, M, L, XL, 2X, 3X",
  selectedSize: "M",
  shadeLabel: "Shade",
  sizeLabel: "Size",
  sizeGuideText: "Size guide",
  fitNote: "Fits true to size. Between sizes? Size up for a softer feel.",
  buttonText: "Add to bag",
  selectSizeText: "Select a size",
  addedText: "Added to bag",
  soldOutText: "Sold out",
  notifyHint: "Leave your email and we'll send one note the moment it's back.",
  notifyButton: "Notify me",
  notifyPlaceholder: "Email address",
  notifyDone: "You're on the list. We'll email you once.",
  deliveryText: "Free shipping on orders over $75",
  returnsText: "Free returns and exchanges within 30 days",
  lowercaseStyle: true,
  textColor: "#2D2A26",
  accent: "#986B58",
  soft: "#B69A81",
  line: "#E8E0D5",
  tile: "#E8E0D5",
  bg: "#F7F4F0",
  font: "system",
  radius: 4,
};

/** Hex color + alpha byte, e.g. tint("#2D2A26", 0.7). */
const tint = (hex: string, a: number) =>
  /^#[0-9a-f]{6}$/i.test(hex)
    ? hex + Math.round(a * 255).toString(16).padStart(2, "0")
    : hex;

const isLight = (hex: string) => {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return false;
  const n = parseInt(m[1], 16);
  return 0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255) > 200;
};

const csv = (s: string) =>
  String(s ?? "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);

const hexOk = (h: string) => (/^#[0-9a-f]{6}$/i.test(h ?? "") ? h : "#D9D2C8");

function Icon({ d, size = 14 }: { d: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="shrink-0">
      <path d={d} />
    </svg>
  );
}

const ICONS = {
  ruler: "M3.5 15.5l12-12 5 5-12 12zM7 12l2 2M9.5 9.5l1.5 1.5M12 7l2 2",
  truck: "M2.5 6.5h11v9h-11zM13.5 9.5h4l3 3v3h-7M6.5 18.5a1.5 1.5 0 1 0 0-.01M17 18.5a1.5 1.5 0 1 0 0-.01",
  returns: "M4 9h11a5 5 0 0 1 0 10H9M4 9l4-4M4 9l4 4",
  check: "M4.5 12.5l4.5 4.5L19.5 7",
  bell: "M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 1.5h-15zM10 20.5a2 2 0 0 0 4 0",
};

function Preview({ config }: { config: TweakConfig }) {
  const text = str(config, "textColor", "#2D2A26");
  const accent = str(config, "accent", "#986B58");
  const soft = str(config, "soft", "#B69A81");
  const line = str(config, "line", "#E8E0D5");
  const tile = str(config, "tile", "#E8E0D5");
  const bg = str(config, "bg", "#F7F4F0");
  const radius = num(config, "radius", 4);
  const chipR = Math.min(radius, 6);
  const cur = str(config, "currency", "$");
  const shades = list(config, "shades");
  const sizes = csv(str(config, "sizes"));
  const groupLabels = [str(config, "groupClassic"), str(config, "groupLimited"), str(config, "groupSale")];
  const groupOf = (s: Record<string, string>) => {
    const g = (s.group ?? "").trim().toLowerCase();
    const i = groupLabels.findIndex((l) => l.trim().toLowerCase() === g);
    return i < 0 ? (GROUP_IDS as readonly string[]).indexOf(g) : i;
  };

  /* follow the editor's preselection, but let shoppers click around */
  const initShade = Math.max(0, Math.min(num(config, "selectedShade", 1) - 1, shades.length - 1));
  const initSize = sizes.indexOf(str(config, "selectedSize").trim());
  const [prev, setPrev] = useState({ initShade, initSize });
  const [shade, setShade] = useState(initShade);
  const [size, setSize] = useState(initSize);
  const [added, setAdded] = useState(false);
  const [notified, setNotified] = useState(false);
  if (prev.initShade !== initShade || prev.initSize !== initSize) {
    setPrev({ initShade, initSize });
    setShade(initShade);
    setSize(initSize);
  }
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const si = Math.max(0, Math.min(shade, shades.length - 1));
  const s = shades[si] ?? {};
  const out = csv(s.soldOut ?? "").map((x) => x.toLowerCase());
  const sz = size >= 0 && size < sizes.length ? size : -1;
  const sizeOut = sz >= 0 && out.includes(sizes[sz].toLowerCase());
  const base = toNum(str(config, "price"));
  const price = s.price ? toNum(s.price, base) : base;
  const cmp = toNum(s.compare);
  const sale = cmp > price;
  const g = Math.max(0, groupOf(s));

  /* photo for each shade; shades without one borrow the first photo, tinted */
  const firstPhoto = shades.find((x) => (x.image ?? "").trim())?.image?.trim() ?? "";

  const pickShade = (i: number) => {
    setShade(i);
    setNotified(false);
    setAdded(false);
  };
  const pickSize = (i: number) => {
    setSize(i);
    setNotified(false);
    setAdded(false);
  };
  const add = () => {
    if (sz < 0) return;
    setAdded(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setAdded(false), 1800);
  };

  const label = "text-[10.5px] font-medium uppercase leading-none tracking-[0.025em]";
  const styleCase: CSSProperties["textTransform"] = bool(config, "lowercaseStyle", true) ? "lowercase" : "none";

  return (
    <div
      className="@container w-full"
      style={{ background: bg, color: text, fontFamily: fontStack(str(config, "font", "system")), ["--r" as string]: `${radius}px` }}
    >
      <div className="mx-auto grid w-full max-w-[1040px] @min-[640px]:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] @min-[640px]:items-start @min-[640px]:gap-10 @min-[640px]:p-8 @min-[880px]:p-10">
        {/* ---- Photo ---- */}
        <div className="relative aspect-square overflow-hidden @min-[640px]:aspect-[4/5] @min-[640px]:rounded-[var(--r)]" style={{ background: tile }}>
          {shades.map((x, i) => {
            const own = (x.image ?? "").trim();
            const src = own || firstPhoto;
            if (!src) return null;
            const on = i === si;
            return (
              <div
                key={i}
                aria-hidden={!on}
                className="absolute inset-0 transition-[opacity,scale] duration-700"
                style={{ opacity: on ? 1 : 0, scale: on ? "1" : "1.03", transitionTimingFunction: EASE }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt={on ? `${str(config, "title")} in ${x.name ?? ""}` : ""} loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover" />
                {!own && (
                  <div className="absolute inset-0" style={{ background: hexOk(x.hex), mixBlendMode: "color", opacity: 0.55 }} />
                )}
              </div>
            );
          })}
          {!firstPhoto && (
            <div className="absolute inset-0 grid place-items-center transition-colors duration-700" style={{ background: tint(hexOk(s.hex), 0.35) }}>
              <span className="aspect-square w-[38%] rounded-full transition-colors duration-700" style={{ background: hexOk(s.hex), boxShadow: `inset 0 0 0 1px ${tint(text, 0.08)}` }} />
            </div>
          )}
          {g > 0 && groupLabels[g] && (
            <span
              key={`tag${si}`}
              className={`bs-swap absolute left-3 top-3 px-2.5 py-[7px] ${label}`}
              style={{ background: g === 2 ? accent : tint(bg, 0.9), color: g === 2 ? bg : text, borderRadius: chipR, backdropFilter: "blur(8px)" }}
            >
              {groupLabels[g]}
              {g === 2 && sale ? ` · −${Math.round((1 - price / cmp) * 100)}%` : ""}
            </span>
          )}
        </div>

        {/* ---- Buy box ---- */}
        <div className="@container/box min-w-0 px-5 pb-7 pt-6 @min-[640px]:px-0 @min-[640px]:pb-0 @min-[640px]:pt-1">
          <h3 className="text-[16px] font-medium uppercase leading-tight tracking-[0.025em] @min-[640px]:text-[18px]">{str(config, "title")}</h3>
          {str(config, "styleName") && (
            <p className="mt-1 text-[14px] leading-snug" style={{ textTransform: styleCase, color: tint(text, 0.78) }}>
              {str(config, "styleName")}
            </p>
          )}
          <p key={`p${si}`} className="bs-swap mt-3 flex items-baseline gap-2 text-[15px] tabular-nums">
            {sale && <s style={{ color: soft }}>{money(cmp, cur)}</s>}
            <span style={{ color: sale ? accent : text }}>{money(price, cur)}</span>
          </p>

          {/* shades */}
          <div className="mt-6 border-t pt-5" style={{ borderColor: line }}>
            <p className="flex items-baseline gap-2">
              <span className={label}>{str(config, "shadeLabel")}</span>
              <span key={s.name} className="bs-swap text-[13px]" style={{ color: tint(text, 0.75) }}>
                {s.name}
              </span>
            </p>
            <div className="mt-3.5 flex flex-wrap gap-x-5 gap-y-4">
              {GROUP_IDS.map((gid, gi) => {
                const members = shades.map((x, i) => ({ x, i })).filter(({ x }) => Math.max(0, groupOf(x)) === gi);
                if (!members.length) return null;
                return (
                  <div key={gid} className="min-w-0">
                    <p className={label} style={{ fontSize: 9.5, color: gi === 2 ? accent : tint(text, 0.5) }}>
                      {groupLabels[gi]}
                    </p>
                    <div className="mt-2.5 flex flex-wrap gap-2.5">
                      {members.map(({ x, i }) => {
                        const on = i === si;
                        const hex = hexOk(x.hex);
                        return (
                          <button
                            key={i}
                            type="button"
                            aria-label={x.name}
                            aria-pressed={on}
                            title={x.name}
                            onClick={() => pickShade(i)}
                            className="group/sw relative grid h-[30px] w-[30px] place-items-center rounded-full transition-[box-shadow,scale] duration-300 active:scale-95"
                            style={{ boxShadow: on ? `0 0 0 2px ${bg}, 0 0 0 3px ${text}` : "none", transitionTimingFunction: EASE }}
                          >
                            <span
                              className="h-full w-full rounded-full transition-[scale] duration-300 group-hover/sw:scale-[.9]"
                              style={{ background: hex, boxShadow: isLight(hex) ? `inset 0 0 0 1px ${tint(soft, 0.5)}` : `inset 0 0 0 1px ${tint(text, 0.06)}`, transitionTimingFunction: EASE }}
                            />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* sizes */}
          <div className="mt-6">
            <div className="flex items-baseline justify-between gap-3">
              <p className="flex items-baseline gap-2">
                <span className={label}>{str(config, "sizeLabel")}</span>
                {sz >= 0 && (
                  <span key={sizes[sz]} className="bs-swap text-[13px]" style={{ color: tint(text, 0.75) }}>
                    {sizes[sz]}
                  </span>
                )}
              </p>
              {str(config, "sizeGuideText") && (
                <span className={`border-b pb-0.5 ${label}`} style={{ borderColor: tint(text, 0.5), fontSize: 9.5 }}>
                  {str(config, "sizeGuideText")}
                </span>
              )}
            </div>
            <div
              role="radiogroup"
              className="mt-3 grid grid-cols-[repeat(var(--h),minmax(0,1fr))] gap-1.5 @min-[390px]/box:grid-cols-[repeat(var(--n),minmax(0,1fr))]"
              style={{ ["--n" as string]: sizes.length <= 9 ? sizes.length : Math.ceil(sizes.length / 2), ["--h" as string]: sizes.length <= 5 ? sizes.length : Math.ceil(sizes.length / 2) }}
            >
              {sizes.map((v, i) => {
                const on = i === sz;
                const isOut = out.includes(v.toLowerCase());
                return (
                  <button
                    key={v + i}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    aria-label={isOut ? `${v}, ${str(config, "soldOutText")}` : v}
                    onClick={() => pickSize(i)}
                    className="relative grid h-10 place-items-center overflow-hidden text-[12px] uppercase tabular-nums tracking-[0.025em] transition-[background-color,color,box-shadow,scale] duration-300 hover:shadow-[inset_0_0_0_1px_currentColor] active:scale-[.96]"
                    style={{
                      borderRadius: chipR,
                      background: on && !isOut ? text : "transparent",
                      color: on && !isOut ? bg : isOut ? tint(text, 0.38) : text,
                      boxShadow: `inset 0 0 0 1px ${on ? text : tint(soft, 0.45)}`,
                      transitionTimingFunction: EASE,
                    }}
                  >
                    {isOut && (
                      <span
                        aria-hidden
                        className="absolute inset-0"
                        style={{ background: `linear-gradient(to top right, transparent calc(50% - .5px), ${tint(soft, 0.55)} calc(50% - .5px), ${tint(soft, 0.55)} calc(50% + .5px), transparent calc(50% + .5px))` }}
                      />
                    )}
                    <span className="relative">{v}</span>
                  </button>
                );
              })}
            </div>
            {str(config, "fitNote") && (
              <p className="mt-3 flex items-start gap-2 text-[12px] leading-snug" style={{ color: tint(text, 0.72) }}>
                <span className="mt-px" style={{ color: accent }}>
                  <Icon d={ICONS.ruler} />
                </span>
                {str(config, "fitNote")}
              </p>
            )}
          </div>

          {/* action */}
          <div className="mt-5">
            {sizeOut ? (
              <div key={`n${si}-${sz}`} className="bs-swap p-3.5" style={{ background: tint(tile, 0.6), borderRadius: chipR }}>
                <p className={`flex items-center gap-1.5 ${label}`}>
                  <span style={{ color: accent }}>
                    <Icon d={ICONS.bell} size={13} />
                  </span>
                  {str(config, "soldOutText")} · {s.name} / {sizes[sz]}
                </p>
                {notified ? (
                  <p className="bs-swap mt-3 flex items-center gap-2 text-[12.5px]">
                    <Icon d={ICONS.check} />
                    {str(config, "notifyDone")}
                  </p>
                ) : (
                  <>
                    <p className="mt-1.5 text-[12px] leading-snug" style={{ color: tint(text, 0.65) }}>
                      {str(config, "notifyHint")}
                    </p>
                    <form
                      className="mt-3 flex gap-1.5"
                      onSubmit={(e) => {
                        e.preventDefault();
                        setNotified(true);
                      }}
                    >
                      <input
                        type="email"
                        placeholder={str(config, "notifyPlaceholder")}
                        aria-label={str(config, "notifyPlaceholder")}
                        className="h-11 min-w-0 flex-1 px-3 text-[13px] outline-none transition-shadow duration-300 focus:shadow-[inset_0_0_0_1px_currentColor]"
                        style={{ background: bg, borderRadius: chipR, boxShadow: `inset 0 0 0 1px ${tint(soft, 0.45)}`, color: text }}
                      />
                      <button
                        type="submit"
                        className="h-11 shrink-0 px-4 text-[11px] font-medium uppercase tracking-[0.06em] transition-[filter,scale] duration-300 hover:brightness-125 active:scale-[.98]"
                        style={{ background: text, color: bg, borderRadius: chipR }}
                      >
                        {str(config, "notifyButton")}
                      </button>
                    </form>
                  </>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={add}
                aria-disabled={sz < 0}
                className="flex h-12 w-full items-center justify-center gap-2 text-[11.5px] font-medium uppercase tracking-[0.06em] transition-[filter,scale,opacity] duration-300 hover:brightness-125 active:scale-[.99]"
                style={{ background: text, color: bg, borderRadius: chipR, opacity: sz < 0 ? 0.5 : 1, transitionTimingFunction: EASE }}
              >
                <span key={added ? "a" : sz < 0 ? "s" : "b"} className="bs-swap inline-flex items-center gap-2">
                  {added ? (
                    <>
                      <Icon d={ICONS.check} size={13} />
                      {str(config, "addedText")}
                    </>
                  ) : sz < 0 ? (
                    str(config, "selectSizeText")
                  ) : (
                    <>
                      {str(config, "buttonText")}
                      <span aria-hidden>—</span>
                      <span className="tabular-nums">{money(price, cur)}</span>
                    </>
                  )}
                </span>
              </button>
            )}
          </div>

          {/* delivery & returns */}
          <div className="mt-5 grid gap-2 text-[12px] leading-snug" style={{ color: tint(text, 0.7) }}>
            {[
              { d: ICONS.truck, t: str(config, "deliveryText") },
              { d: ICONS.returns, t: str(config, "returnsText") },
            ]
              .filter((x) => x.t)
              .map((x, i) => (
                <p key={i} className="flex items-center gap-2.5">
                  <span style={{ color: accent }}>
                    <Icon d={x.d} size={15} />
                  </span>
                  {x.t}
                </p>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function generateLiquid(config: TweakConfig): string {
  const { face, family } = fontFaceFor(str(config, "font", "system"));
  const S = ".bs-sb-{{ section.id }}";
  const cr = "{{ section.settings.radius | at_most: 6 }}px";
  const lbl = "font-size: 10.5px; font-weight: 500; line-height: 1; text-transform: uppercase; letter-spacing: .025em;";
  const svg = (d: string, size = 14) =>
    `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg>`;

  const style = `<style>
${face ? face + "\n" : ""}  ${S} { container-type: inline-size; background: {{ section.settings.bg }}; color: {{ section.settings.text_color }}; font-family: ${family}; }
  ${S} * { box-sizing: border-box; }
  ${S} p, ${S} h1, ${S} h2 { margin: 0; }
  ${S} a { color: inherit; }
  ${S} .bs-in { max-width: 1040px; margin: 0 auto; display: grid; }
  ${S} .bs-lbl { ${lbl} }
  ${S} .bs-vh { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
  ${S} .bs-vis { position: relative; aspect-ratio: 1; overflow: hidden; background: {{ section.settings.tile }}; }
  ${S} .bs-vis img, ${S} .bs-vis .bs-ph { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; transition: opacity .5s cubic-bezier(.22,1,.36,1); }
  ${S} .bs-vis .bs-ph { fill: {{ section.settings.soft }}; }
  ${S} .bs-tag { position: absolute; left: 12px; top: 12px; padding: 7px 10px; border-radius: ${cr}; background: color-mix(in srgb, {{ section.settings.bg }} 90%, transparent);
    -webkit-backdrop-filter: blur(8px); backdrop-filter: blur(8px); }
  ${S} .bs-tag[hidden] { display: none; }
  ${S} .bs-tag.is-sale { background: {{ section.settings.accent }}; color: {{ section.settings.bg }}; }
  ${S} .bs-box { min-width: 0; padding: 24px 20px 28px; container-type: inline-size; }
  ${S} .bs-title { font-size: 16px; font-weight: 500; line-height: 1.25; text-transform: uppercase; letter-spacing: .025em; }
  ${S} .bs-style { margin-top: 4px; font-size: 14px; line-height: 1.35; opacity: .78; }
  ${S} .bs-style.is-lower { text-transform: lowercase; }
  ${S} .bs-price { margin-top: 12px; display: flex; align-items: baseline; gap: 8px; font-size: 15px; font-variant-numeric: tabular-nums; }
  ${S} .bs-price s { color: {{ section.settings.soft }}; }
  ${S} .bs-price s:empty { display: none; }
  ${S} .bs-price.is-sale [data-price] { color: {{ section.settings.accent }}; }
  ${S} .bs-shades { margin-top: 24px; padding-top: 20px; border-top: 1px solid {{ section.settings.line }}; }
  ${S} .bs-row { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; }
  ${S} .bs-row p { display: flex; align-items: baseline; gap: 8px; }
  ${S} .bs-val { font-size: 13px; opacity: .75; }
  ${S} .bs-groups { margin-top: 14px; display: flex; flex-wrap: wrap; gap: 16px 20px; }
  ${S} .bs-grp .bs-lbl { font-size: 9.5px; opacity: .5; }
  ${S} .bs-grp.is-sale .bs-lbl { opacity: 1; color: {{ section.settings.accent }}; }
  ${S} .bs-sws { margin-top: 10px; display: flex; flex-wrap: wrap; gap: 10px; }
  ${S} .bs-sw { position: relative; width: 30px; height: 30px; border-radius: 99px; cursor: pointer; display: grid; place-items: center;
    transition: box-shadow .3s cubic-bezier(.22,1,.36,1), transform .2s; }
  ${S} .bs-sw input { position: absolute; opacity: 0; pointer-events: none; }
  ${S} .bs-sw > span:first-of-type { width: 100%; height: 100%; border-radius: 99px; background: var(--c); box-shadow: inset 0 0 0 1px rgba(0,0,0,.08);
    transition: transform .3s cubic-bezier(.22,1,.36,1); }
  ${S} .bs-sw:hover > span:first-of-type { transform: scale(.9); }
  ${S} .bs-sw:active { transform: scale(.95); }
  ${S} .bs-sw:has(input:checked) { box-shadow: 0 0 0 2px {{ section.settings.bg }}, 0 0 0 3px {{ section.settings.text_color }}; }
  ${S} .bs-sw:has(input:focus-visible) { outline: 2px solid {{ section.settings.text_color }}; outline-offset: 4px; }
  ${S} .bs-sizes { margin-top: 24px; }
  ${S} .bs-guide { padding-bottom: 2px; border-bottom: 1px solid currentColor; font-size: 9.5px; text-decoration: none; opacity: .8; }
  ${S} .bs-chips { margin-top: 12px; display: grid; grid-template-columns: repeat(var(--h), minmax(0, 1fr)); gap: 6px; }
  @container (min-width: 390px) { ${S} .bs-chips { grid-template-columns: repeat(var(--n), minmax(0, 1fr)); } }
  ${S} .bs-chip { position: relative; height: 40px; display: grid; place-items: center; overflow: hidden; cursor: pointer; border-radius: ${cr};
    font-size: 12px; text-transform: uppercase; letter-spacing: .025em; font-variant-numeric: tabular-nums;
    box-shadow: inset 0 0 0 1px color-mix(in srgb, {{ section.settings.soft }} 45%, transparent); transition: background-color .3s, color .3s, box-shadow .3s, transform .2s; }
  ${S} .bs-chip input { position: absolute; opacity: 0; pointer-events: none; }
  ${S} .bs-chip span { position: relative; }
  ${S} .bs-chip:hover { box-shadow: inset 0 0 0 1px currentColor; }
  ${S} .bs-chip:active { transform: scale(.96); }
  ${S} .bs-chip.is-out { color: color-mix(in srgb, {{ section.settings.text_color }} 38%, transparent);
    background: linear-gradient(to top right, transparent calc(50% - .5px), color-mix(in srgb, {{ section.settings.soft }} 55%, transparent) calc(50% - .5px), color-mix(in srgb, {{ section.settings.soft }} 55%, transparent) calc(50% + .5px), transparent calc(50% + .5px)); }
  ${S} .bs-chip:has(input:checked) { box-shadow: inset 0 0 0 1px {{ section.settings.text_color }}; }
  ${S} .bs-chip:not(.is-out):has(input:checked) { background: {{ section.settings.text_color }}; color: {{ section.settings.bg }}; }
  ${S} .bs-chip:has(input:focus-visible) { outline: 2px solid {{ section.settings.text_color }}; outline-offset: 2px; }
  ${S} .bs-fit { margin-top: 12px; display: flex; align-items: flex-start; gap: 8px; font-size: 12px; line-height: 1.4; opacity: .85; }
  ${S} .bs-fit svg, ${S} .bs-perk svg, ${S} .bs-ntitle svg { color: {{ section.settings.accent }}; flex-shrink: 0; }
  ${S} .bs-act { margin-top: 20px; }
  ${S} .bs-form { margin: 0; }
  ${S} .bs-atc { width: 100%; height: 48px; border: 0; border-radius: ${cr}; cursor: pointer; font: inherit; display: flex; align-items: center; justify-content: center; gap: 8px;
    font-size: 11.5px; font-weight: 500; text-transform: uppercase; letter-spacing: .06em;
    background: {{ section.settings.text_color }}; color: {{ section.settings.bg }}; transition: filter .3s, transform .2s, opacity .3s; }
  ${S} .bs-atc:hover:not(:disabled) { filter: brightness(1.25); }
  ${S} .bs-atc:active:not(:disabled) { transform: scale(.99); }
  ${S} .bs-atc:disabled { opacity: .5; cursor: not-allowed; }
  ${S} .bs-atc[hidden], ${S} .bs-notify[hidden] { display: none; }
  ${S} .bs-notify { margin: 0; padding: 14px; border-radius: ${cr}; background: color-mix(in srgb, {{ section.settings.tile }} 60%, transparent); }
  ${S} .bs-ntitle { display: flex; align-items: center; gap: 6px; }
  ${S} .bs-nhint { margin-top: 6px; font-size: 12px; line-height: 1.4; opacity: .65; }
  ${S} .bs-nrow { margin-top: 12px; display: flex; gap: 6px; }
  ${S} .bs-nrow input { flex: 1; min-width: 0; height: 44px; padding: 0 12px; border: 0; border-radius: ${cr}; font: inherit; font-size: 13px; outline: none;
    background: {{ section.settings.bg }}; color: inherit; box-shadow: inset 0 0 0 1px color-mix(in srgb, {{ section.settings.soft }} 45%, transparent); }
  ${S} .bs-nrow input:focus { box-shadow: inset 0 0 0 1px currentColor; }
  ${S} .bs-nrow button { height: 44px; padding: 0 16px; border: 0; border-radius: ${cr}; cursor: pointer; font: inherit; font-size: 11px; font-weight: 500;
    text-transform: uppercase; letter-spacing: .06em; background: {{ section.settings.text_color }}; color: {{ section.settings.bg }}; }
  ${S} .bs-sent { margin-top: 10px; font-size: 12.5px; display: flex; align-items: center; gap: 8px; }
  ${S} .bs-perks { margin-top: 20px; display: grid; gap: 8px; font-size: 12px; line-height: 1.35; opacity: .8; }
  ${S} .bs-perk { display: flex; align-items: center; gap: 10px; }
  @container (min-width: 640px) {
    ${S} .bs-in { grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr); align-items: start; gap: 40px; padding: 32px; }
    ${S} .bs-vis { aspect-ratio: 4 / 5; border-radius: {{ section.settings.radius }}px; position: sticky; top: 24px; }
    ${S} .bs-box { padding: 4px 0 0; }
    ${S} .bs-title { font-size: 18px; }
  }
  @container (min-width: 880px) { ${S} .bs-in { padding: 40px; } }
  @media (prefers-reduced-motion: reduce) { ${S} * { transition-duration: 1ms !important; } }
</style>`;

  const groupMarkup = (gid: string) => `{%- capture bs_sw -%}
            {%- for bs_val in bs_shade.values -%}
              {%- capture bs_name -%}{{ bs_val }}{%- endcapture -%}
              {%- assign bs_h = bs_name | handleize -%}
              {%- assign bs_col = '#d9d2c8' -%}
              {%- assign bs_grp = 'classic' -%}
              {%- assign bs_blk = nil -%}
              {%- for block in section.blocks -%}
                {%- assign bs_bh = block.settings.value | handleize -%}
                {%- if bs_bh == bs_h -%}{%- assign bs_col = block.settings.color -%}{%- assign bs_grp = block.settings.group -%}{%- assign bs_blk = block -%}{%- endif -%}
              {%- endfor -%}
              {%- if bs_grp == '${gid}' -%}
                <label class="bs-sw" title="{{ bs_name | escape }}"{% if bs_blk %} {{ bs_blk.shopify_attributes }}{% endif %}>
                  <input type="radio" name="bs-sb-shade-{{ section.id }}" value="{{ bs_name | escape }}" data-shade data-group="${gid}"{% if bs_name == bs_cur_shade %} checked{% endif %}>
                  <span style="--c: {{ bs_col }};"></span><span class="bs-vh">{{ bs_name }}</span>
                </label>
              {%- endif -%}
            {%- endfor -%}
          {%- endcapture -%}
          {%- assign bs_sw = bs_sw | strip -%}
          {%- if bs_sw != blank -%}
            <div class="bs-grp${gid === "sale" ? " is-sale" : ""}"><p class="bs-lbl">{{ section.settings.group_${gid} }}</p><div class="bs-sws">{{ bs_sw }}</div></div>
          {%- endif -%}`;

  const markup = `{%- comment -%}
  Shade & Size Buy Box by boost.supply. Add it to your product template.
  Setup:
  - Set "Shade option name" and "Size option name" to the exact option names
    on your product (for example "Color" and "Size").
  - Add one "Shade" block per shade: the value must match the option value,
    then pick its swatch colour and its group (Classic, Limited or Sale).
    Shades without a block show in the first group with a neutral swatch.
  - The photo follows the shade: give each shade's variants their own image.
  - Sale pricing comes from each variant's compare-at price.
  - "Notify me" sends a contact-form message to your store email with the
    product and size. If you use a back-in-stock app, point its form here.
{%- endcomment -%}
{%- liquid
  assign bs_p = product
  if section.settings.product != blank
    assign bs_p = section.settings.product
  endif
-%}
{%- if bs_p != blank -%}
{%- liquid
  assign bs_v = bs_p.selected_or_first_available_variant
  assign bs_shade_key = section.settings.shade_option | downcase | strip
  assign bs_size_key = section.settings.size_option | downcase | strip
  assign bs_shade = nil
  assign bs_size = nil
  assign bs_hi = -1
  assign bs_si = -1
  for bs_o in bs_p.options_with_values
    assign bs_on = bs_o.name | downcase | strip
    if bs_on == bs_shade_key
      assign bs_shade = bs_o
      assign bs_hi = bs_o.position | minus: 1
    endif
    if bs_on == bs_size_key
      assign bs_size = bs_o
      assign bs_si = bs_o.position | minus: 1
    endif
  endfor
  assign bs_cur_shade = ''
  if bs_hi > -1
    assign bs_cur_shade = bs_v.options[bs_hi]
  endif
  # Only preselect a size when the URL names a variant (or there is one size)
  assign bs_cur_size = ''
  if bs_si > -1
    if bs_p.selected_variant != blank or bs_size.values.size == 1
      assign bs_cur_size = bs_v.options[bs_si]
    endif
  endif
  assign bs_media = bs_v.featured_media | default: bs_p.featured_media
-%}
<div class="bs-sb-{{ section.id }}" id="bs-sb-{{ section.id }}" data-hi="{{ bs_hi }}" data-si="{{ bs_si }}">
  <div class="bs-in">
    <div class="bs-vis">
      {%- if bs_media != blank -%}
        {{ bs_media | image_url: width: 1200 | image_tag: loading: 'eager', alt: bs_p.title, sizes: '(min-width: 990px) 540px, 100vw', class: 'bs-photo' }}
      {%- else -%}
        {{ 'product-apparel-1' | placeholder_svg_tag: 'bs-ph' }}
      {%- endif -%}
      <span class="bs-tag bs-lbl" data-tag hidden></span>
    </div>

    <div class="bs-box">
      <h2 class="bs-title">{{ bs_p.title }}</h2>
      {%- assign bs_style = section.settings.style_name | default: bs_p.type -%}
      {%- if bs_style != blank -%}<p class="bs-style{% if section.settings.lowercase_style %} is-lower{% endif %}">{{ bs_style }}</p>{%- endif -%}
      <p class="bs-price{% if bs_v.compare_at_price > bs_v.price %} is-sale{% endif %}" data-price-row>
        <s data-cmp>{%- if bs_v.compare_at_price > bs_v.price -%}{{ bs_v.compare_at_price | money }}{%- endif -%}</s>
        <span data-price>{{ bs_v.price | money }}</span>
      </p>

      {%- if bs_shade -%}
        <div class="bs-shades">
          <p class="bs-lbl" style="display:flex;align-items:baseline;gap:8px">{{ section.settings.shade_label }} <span class="bs-val" data-shade-name style="text-transform:none;letter-spacing:0;font-weight:400">{{ bs_cur_shade }}</span></p>
          <div class="bs-groups" role="radiogroup" aria-label="{{ section.settings.shade_label | escape }}">
          ${GROUP_IDS.map(groupMarkup).join("\n          ")}
          </div>
        </div>
      {%- endif -%}

      {%- if bs_size -%}
        <div class="bs-sizes">
          <div class="bs-row">
            <p><span class="bs-lbl">{{ section.settings.size_label }}</span> <span class="bs-val" data-size-name>{{ bs_cur_size }}</span></p>
            {%- if section.settings.size_guide_url != blank -%}<a class="bs-lbl bs-guide" href="{{ section.settings.size_guide_url }}">{{ section.settings.size_guide_text }}</a>{%- endif -%}
          </div>
          {%- liquid
            assign bs_n = bs_size.values.size
            assign bs_h = bs_n
            if bs_n > 5
              assign bs_h = bs_n | plus: 1 | divided_by: 2
            endif
            assign bs_n2 = bs_n
            if bs_n > 9
              assign bs_n2 = bs_h
            endif
          -%}
          <div class="bs-chips" style="--n: {{ bs_n2 }}; --h: {{ bs_h }};" role="radiogroup" aria-label="{{ section.settings.size_label | escape }}">
            {%- for bs_val in bs_size.values -%}
              {%- capture bs_name -%}{{ bs_val }}{%- endcapture -%}
              {%- assign bs_av = false -%}
              {%- for bs_var in bs_p.variants -%}
                {%- if bs_var.options[bs_si] == bs_name and bs_var.available -%}
                  {%- if bs_hi < 0 -%}
                    {%- assign bs_av = true -%}
                  {%- elsif bs_var.options[bs_hi] == bs_cur_shade -%}
                    {%- assign bs_av = true -%}
                  {%- endif -%}
                {%- endif -%}
              {%- endfor -%}
              <label class="bs-chip{% unless bs_av %} is-out{% endunless %}">
                <input type="radio" name="bs-sb-size-{{ section.id }}" value="{{ bs_name | escape }}" data-size{% if bs_name == bs_cur_size %} checked{% endif %}>
                <span>{{ bs_name }}</span>
              </label>
            {%- endfor -%}
          </div>
          {%- if section.settings.fit_note != blank -%}<p class="bs-fit">${svg(ICONS.ruler)}<span>{{ section.settings.fit_note }}</span></p>{%- endif -%}
        </div>
      {%- endif -%}

      <div class="bs-act">
        {%- form 'product', bs_p, class: 'bs-form' -%}
          <input type="hidden" name="id" value="{{ bs_v.id }}" data-id>
          <button type="submit" name="add" class="bs-atc" data-atc{% if bs_si > -1 and bs_cur_size == blank %} disabled{% endif %}{% unless bs_v.available %} disabled{% endunless %}>
            <span data-atc-label>
              {%- if bs_si > -1 and bs_cur_size == blank -%}{{ section.settings.select_size_text }}
              {%- elsif bs_v.available -%}{{ section.settings.button_text }} — {{ bs_v.price | money }}
              {%- else -%}{{ section.settings.sold_out_text }}{%- endif -%}
            </span>
          </button>
        {%- endform -%}
        <div data-notify hidden>
        {%- form 'contact', class: 'bs-notify' -%}
          {%- if form.posted_successfully? -%}{%- assign bs_sent = true -%}{%- endif -%}
          <p class="bs-lbl bs-ntitle">${svg(ICONS.bell, 13)}<span data-notify-title>{{ section.settings.sold_out_text }}</span></p>
          {%- if section.settings.notify_hint != blank -%}<p class="bs-nhint">{{ section.settings.notify_hint }}</p>{%- endif -%}
          {{- form.errors | default_errors -}}
          <input type="hidden" name="contact[body]" value="" data-notify-body>
          <div class="bs-nrow">
            <input type="email" name="contact[email]" required autocomplete="email" placeholder="{{ section.settings.notify_placeholder | escape }}" aria-label="{{ section.settings.notify_placeholder | escape }}">
            <button type="submit">{{ section.settings.notify_button }}</button>
          </div>
        {%- endform -%}
        </div>
        {%- if bs_sent -%}<p class="bs-sent">${svg(ICONS.check)}{{ section.settings.notify_done }}</p>{%- endif -%}
      </div>

      {%- if section.settings.delivery_text != blank or section.settings.returns_text != blank -%}
        <div class="bs-perks">
          {%- if section.settings.delivery_text != blank -%}<p class="bs-perk">${svg(ICONS.truck, 15)}{{ section.settings.delivery_text }}</p>{%- endif -%}
          {%- if section.settings.returns_text != blank -%}<p class="bs-perk">${svg(ICONS.returns, 15)}{{ section.settings.returns_text }}</p>{%- endif -%}
        </div>
      {%- endif -%}
    </div>
  </div>
  <script type="application/json" data-variants>{{ bs_p.variants | json }}</script>
</div>
<script>
  (function () {
    var root = document.getElementById('bs-sb-{{ section.id }}');
    if (!root) return;
    function $(s) { return root.querySelector(s); }
    function all(s) { return Array.prototype.slice.call(root.querySelectorAll(s)); }
    var variants = [];
    try { variants = JSON.parse($('[data-variants]').textContent); } catch (e) { return; }
    var hi = parseInt(root.getAttribute('data-hi'), 10), si = parseInt(root.getAttribute('data-si'), 10);
    var T = {
      add: {{ section.settings.button_text | json }},
      pick: {{ section.settings.select_size_text | json }},
      out: {{ section.settings.sold_out_text | json }},
      title: {{ bs_p.title | json }},
      groups: { limited: {{ section.settings.group_limited | json }}, sale: {{ section.settings.group_sale | json }} }
    };
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
    function picked(sel) { var el = $(sel + ':checked'); return el ? el.value : null; }
    function fits(v, shade, size) {
      return (hi < 0 || shade === null || v.options[hi] === shade) && (si < 0 || size === null || v.options[si] === size);
    }
    function find(shade, size, avail) {
      for (var i = 0; i < variants.length; i++) {
        var v = variants[i];
        if (fits(v, shade, size) && (!avail || v.available)) return v;
      }
      return null;
    }
    var atc = $('[data-atc]'), label = $('[data-atc-label]'), notify = $('[data-notify]'), img = $('.bs-photo');
    function update() {
      var shade = picked('[data-shade]'), size = picked('[data-size]');
      var sn = $('[data-shade-name]'); if (sn) sn.textContent = shade || '';
      var zn = $('[data-size-name]'); if (zn) zn.textContent = size || '';
      all('[data-size]').forEach(function (el) {
        el.parentNode.classList.toggle('is-out', !find(shade, el.value, true));
      });
      var match = size !== null || si < 0 ? find(shade, size, false) : null;
      var show = match || find(shade, null, true) || find(shade, null, false);
      if (show) {
        var sale = show.compare_at_price > show.price;
        $('[data-price-row]').classList.toggle('is-sale', sale);
        $('[data-price]').textContent = money(show.price);
        $('[data-cmp]').textContent = sale ? money(show.compare_at_price) : '';
        var g = $('[data-shade]:checked'), gid = g ? g.getAttribute('data-group') : 'classic';
        var tag = $('[data-tag]');
        tag.hidden = gid === 'classic' || !T.groups[gid];
        tag.classList.toggle('is-sale', gid === 'sale');
        tag.textContent = (T.groups[gid] || '') + (gid === 'sale' && sale ? ' · −' + Math.round((1 - show.price / show.compare_at_price) * 100) + '%' : '');
        if (img && show.featured_image && show.featured_image.src) {
          var src = show.featured_image.src;
          var next = src + (src.indexOf('?') > -1 ? '&' : '?') + 'width=1200';
          if (img.getAttribute('src') !== next) {
            img.style.opacity = '.35';
            img.onload = function () { img.style.opacity = ''; };
            img.removeAttribute('srcset');
            img.src = next;
          }
        }
      }
      if (si > -1 && size === null) {
        atc.hidden = false; notify.hidden = true;
        atc.disabled = true;
        label.textContent = T.pick;
        return;
      }
      if (match && match.available) {
        atc.hidden = false; notify.hidden = true;
        atc.disabled = false;
        $('[data-id]').value = match.id;
        label.textContent = T.add + ' — ' + money(match.price);
      } else {
        atc.hidden = true; notify.hidden = false;
        $('[data-notify-title]').textContent = T.out + ' · ' + [shade, size].filter(Boolean).join(' / ');
        $('[data-notify-body]').value = 'Back in stock request: ' + T.title + ' – ' + (match ? match.title : [shade, size].filter(Boolean).join(' / '));
      }
      if (match && window.history && window.URL) {
        var u = new URL(window.location.href);
        u.searchParams.set('variant', match.id);
        window.history.replaceState(window.history.state, '', u.toString());
      }
    }
    all('[data-shade], [data-size]').forEach(function (el) { el.addEventListener('change', update); });
    update();
  })();
</script>
{%- else -%}
<p style="padding:24px;text-align:center;opacity:.6">Add this section to a product template, or pick a product in its settings.</p>
{%- endif -%}`;

  const shades = list(config, "shades");
  const labels = [str(config, "groupClassic"), str(config, "groupLimited"), str(config, "groupSale")];
  const gidFor = (g: string) => {
    const t = (g ?? "").trim().toLowerCase();
    const i = labels.findIndex((l) => l.trim().toLowerCase() === t);
    return GROUP_IDS[i >= 0 ? i : Math.max(0, (GROUP_IDS as readonly string[]).indexOf(t))];
  };

  const schema = buildSchema({
    name: "Shade & Size Buy Box",
    settings: [
      { type: "product", id: "product", label: "Product", info: "Leave empty on a product template to use that product" },
      { type: "text", id: "shade_option", label: "Shade option name", default: "Color" },
      { type: "text", id: "size_option", label: "Size option name", default: "Size" },
      { type: "text", id: "style_name", label: "Style name", default: str(config, "styleName") },
      { type: "checkbox", id: "lowercase_style", label: "Lowercase style name", default: bool(config, "lowercaseStyle", true) },
      { type: "header", content: "Shades" },
      { type: "text", id: "shade_label", label: "Shade label", default: str(config, "shadeLabel") },
      { type: "text", id: "group_classic", label: "Group 1 name", default: labels[0] },
      { type: "text", id: "group_limited", label: "Group 2 name", default: labels[1] },
      { type: "text", id: "group_sale", label: "Group 3 name (sale)", default: labels[2] },
      { type: "header", content: "Sizes" },
      { type: "text", id: "size_label", label: "Size label", default: str(config, "sizeLabel") },
      { type: "text", id: "size_guide_text", label: "Size guide link text", default: str(config, "sizeGuideText") },
      { type: "url", id: "size_guide_url", label: "Size guide link" },
      { type: "text", id: "fit_note", label: "Fit note", default: str(config, "fitNote") },
      { type: "header", content: "Buttons" },
      { type: "text", id: "button_text", label: "Add to bag", default: str(config, "buttonText") },
      { type: "text", id: "select_size_text", label: "No size picked", default: str(config, "selectSizeText") },
      { type: "text", id: "sold_out_text", label: "Sold out", default: str(config, "soldOutText") },
      { type: "header", content: "Notify me" },
      { type: "text", id: "notify_hint", label: "Hint", default: str(config, "notifyHint") },
      { type: "text", id: "notify_placeholder", label: "Email placeholder", default: str(config, "notifyPlaceholder") },
      { type: "text", id: "notify_button", label: "Button", default: str(config, "notifyButton") },
      { type: "text", id: "notify_done", label: "Thank-you message", default: str(config, "notifyDone") },
      { type: "header", content: "Delivery & returns" },
      { type: "text", id: "delivery_text", label: "Delivery line", default: str(config, "deliveryText") },
      { type: "text", id: "returns_text", label: "Returns line", default: str(config, "returnsText") },
      { type: "header", content: "Style" },
      { type: "color", id: "text_color", label: "Text & button", default: str(config, "textColor") },
      { type: "color", id: "accent", label: "Accent (icons, sale)", default: str(config, "accent") },
      { type: "color", id: "soft", label: "Soft (borders, was price)", default: str(config, "soft") },
      { type: "color", id: "line", label: "Lines", default: str(config, "line") },
      { type: "color", id: "tile", label: "Image background", default: str(config, "tile") },
      { type: "color", id: "bg", label: "Background", default: str(config, "bg") },
      { type: "range", id: "radius", label: "Corner radius", min: 0, max: 20, step: 2, unit: "px", default: Math.max(0, Math.min(20, Math.round(num(config, "radius", 4) / 2) * 2)) },
    ],
    blocks: [
      {
        type: "shade",
        name: "Shade",
        settings: [
          { type: "text", id: "value", label: "Option value", default: "Clay" },
          { type: "color", id: "color", label: "Swatch colour", default: "#c9a68c" },
          {
            type: "select",
            id: "group",
            label: "Group",
            options: GROUP_IDS.map((id, i) => ({ value: id, label: labels[i] || id })),
            default: "classic",
          },
        ],
      },
    ],
    maxBlocks: 30,
    presetBlocks: shades.slice(0, 30).map((s) => ({
      type: "shade",
      settings: { value: esc(s.name ?? ""), color: hexOk(s.hex ?? "").toLowerCase(), group: gidFor(s.group ?? "") },
    })),
  });

  return section({ style, markup, schema });
}

export const shadeBuyBox: Tweak = {
  slug: "shade-buy-box",
  inspiredBy: "skims",
  name: "Shade & Size Buy Box",
  tagline: "Grouped shade swatches, size chips with notify-me and a photo that follows the shade.",
  description:
    "Modeled on the buy box SKIMS uses on its product pages. A caps product title with a lowercase style name, the price, shade swatches grouped as Classic, Limited and Sale with the chosen shade spelled out, and size chips where sold-out sizes are struck through. Picking a sold-out size turns the button into a notify-me form instead of a dead end. A fit note, add to bag and small delivery and returns lines finish it, and the photo crossfades to the chosen shade. In Shopify it reads your product's real shade and size options, maps each shade to a swatch colour and group with blocks, and adds the matching variant.",
  category: "product-page",
  tier: "free",
  tint: "#f3eee8",
  Preview,
  generateLiquid,
  defaults,
  fields: [
    { key: "title", label: "Product title", type: "text", group: "Product", hint: "Preview only, with the price. Your store shows the real product title and variant prices" },
    { key: "styleName", label: "Style name", type: "text", group: "Product" },
    { key: "lowercaseStyle", label: "Lowercase style name", type: "toggle", group: "Product" },
    { key: "price", label: "Price", type: "text", group: "Product" },
    { key: "currency", label: "Currency symbol", type: "text", group: "Product" },
    {
      key: "shades", label: "Shades", type: "list", group: "Shades",
      hint: "Group must match one of the group names below. Swatch is a hex colour. Price and compare-at are optional (sale shades). Sold out lists sizes, comma separated. Image URL is the photo for that shade; leave it empty to tint the first photo. In Shopify the shades, prices, stock and photos come from your variants",
      itemFields: [
        { key: "name", label: "Name", type: "text" },
        { key: "group", label: "Group", type: "text" },
        { key: "hex", label: "Swatch", type: "text" },
        { key: "price", label: "Price", type: "text" },
        { key: "compare", label: "Compare-at", type: "text" },
        { key: "soldOut", label: "Sold out sizes", type: "text" },
        { key: "image", label: "Image URL", type: "text" },
      ],
      newItem: { name: "Sand", group: "Classic", hex: "#D8C3A5", price: "", compare: "", soldOut: "", image: "/mockups/ladder-bra-nude.jpg" },
      addLabel: "Add shade",
      max: 12,
    },
    { key: "selectedShade", label: "Selected shade", type: "slider", group: "Shades", min: 1, max: 12, step: 1, hint: "Preview only. In your store it starts on the selected variant" },
    { key: "shadeLabel", label: "Shade label", type: "text", group: "Shades" },
    { key: "groupClassic", label: "Group 1 name", type: "text", group: "Shades" },
    { key: "groupLimited", label: "Group 2 name", type: "text", group: "Shades" },
    { key: "groupSale", label: "Group 3 name (sale)", type: "text", group: "Shades" },
    { key: "sizes", label: "Sizes", type: "text", group: "Sizes", hint: "Comma separated. In Shopify these come from your size option" },
    { key: "selectedSize", label: "Selected size", type: "text", group: "Sizes", hint: "Preview only. Leave empty to show the \"select a size\" state" },
    { key: "sizeLabel", label: "Size label", type: "text", group: "Sizes" },
    { key: "sizeGuideText", label: "Size guide link text", type: "text", group: "Sizes" },
    { key: "fitNote", label: "Fit note", type: "text", group: "Sizes" },
    { key: "buttonText", label: "Add to bag", type: "text", group: "Buttons" },
    { key: "selectSizeText", label: "No size picked", type: "text", group: "Buttons" },
    { key: "addedText", label: "Added text", type: "text", group: "Buttons", hint: "Preview only. In your store the theme's cart opens" },
    { key: "soldOutText", label: "Sold out", type: "text", group: "Buttons" },
    { key: "notifyHint", label: "Notify hint", type: "text", group: "Notify me" },
    { key: "notifyPlaceholder", label: "Email placeholder", type: "text", group: "Notify me" },
    { key: "notifyButton", label: "Notify button", type: "text", group: "Notify me" },
    { key: "notifyDone", label: "Thank-you message", type: "text", group: "Notify me" },
    { key: "deliveryText", label: "Delivery line", type: "text", group: "Delivery & returns" },
    { key: "returnsText", label: "Returns line", type: "text", group: "Delivery & returns" },
    { key: "radius", label: "Corner radius", type: "slider", group: "Layout", min: 0, max: 20, step: 2, unit: "px" },
    fontField("Typography"),
    { key: "textColor", label: "Text & button", type: "color", group: "Colors" },
    { key: "accent", label: "Accent", type: "color", group: "Colors" },
    { key: "soft", label: "Soft", type: "color", group: "Colors" },
    { key: "line", label: "Lines", type: "color", group: "Colors" },
    { key: "tile", label: "Image background", type: "color", group: "Colors" },
    { key: "bg", label: "Background", type: "color", group: "Colors" },
  ],
};
