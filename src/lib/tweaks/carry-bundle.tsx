"use client";

import { useEffect, useState } from "react";
import type { Tweak, TweakConfig } from "../types";
import { str, num, list, fontStack } from "../cfg";
import { fontField } from "../fields";
import { buildSchema, section, fontFaceFor } from "../liquid";
import { money, toNum } from "./product-art";

/* ============================================================
   Carry Bundle Builder
   "Build your everyday carry": the wallet is always in, shoppers
   tap accessories (key case, tracker holder, pen) into the kit and
   a three-step discount ladder lights up as the item count climbs
   (2 items 10%, 3 items 15%, 4 items 20%). The kit stacks up on
   the hero photo and a running total shows the savings.
   ============================================================ */

const EASE = "cubic-bezier(.22,1,.36,1)";
const POP = "cubic-bezier(.34,1.56,.64,1)";

type Kind = "key" | "tracker" | "pen" | "strap";

const defaults: TweakConfig = {
  eyebrow: "Bundle & save",
  heading: "Build your everyday carry",
  subheading: "Start with the wallet, then add the pieces you reach for every day. Every item you add takes more off the whole kit.",
  currency: "$",
  mainName: "The Card Wallet",
  mainDesc: "Aluminum · money clip · 12 cards",
  mainPrice: "95",
  mainImage: "/mockups/wallet.jpg",
  mainTag: "Included",
  accessories: [
    { name: "Key Case", desc: "Up to 6 keys, no jingle", price: "35", image: "" },
    { name: "Tracker Holder", desc: "Holds a coin-size tracker", price: "25", image: "" },
    { name: "Slim Pen", desc: "Rides along the money clip", price: "29", image: "" },
  ],
  preselected: 1,
  tier1Qty: 2,
  tier1Off: 10,
  tier2Qty: 3,
  tier2Off: 15,
  tier3Qty: 4,
  tier3Off: 20,
  ladderLabel: "Bundle discount",
  itemsWord: "items",
  offLabel: "off",
  nextText: "Add {{count}} more to save {{percent}}",
  topText: "Max discount: {{percent}} off",
  kitWord: "Your kit",
  totalLabel: "Bundle total",
  saveLabel: "You save",
  buttonText: "Add bundle to cart",
  note: "Free shipping on every bundle · 45-day returns",
  bg: "#FFFFFF",
  textColor: "#000000",
  panel: "#E9E9E9",
  dark: "#1A1A1A",
  accent: "#c8a464",
  muted: "#6E6E6E",
  buttonBg: "#000000",
  buttonFg: "#FFFFFF",
  font: "system",
  radius: 4,
};

/* ---------- helpers ---------- */

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const range = (n: number) => Array.from({ length: n }, (_, i) => i);

/** Fill a "{{count}} / {{percent}}" template. */
const fillTpl = (tpl: string, count: number, pct: number) =>
  tpl.split("{{count}}").join(String(count)).split("{{percent}}").join(`${pct}%`);

/** Which drawing an accessory gets, from its name. */
const kindOf = (name: string): Kind => {
  const n = name.toLowerCase();
  if (/track|tag|gps|finder/.test(n)) return "tracker";
  if (/\bpen\b|pencil|stylus/.test(n)) return "pen";
  if (/key/.test(n)) return "key";
  return "strap";
};

interface Tier {
  q: number;
  o: number;
}

/** The three discount steps, clamped and sorted by item count. */
const tiersOf = (c: TweakConfig): Tier[] =>
  [
    { q: clamp(Math.round(num(c, "tier1Qty", 2)), 2, 6), o: clamp(Math.round(num(c, "tier1Off", 10)), 0, 50) },
    { q: clamp(Math.round(num(c, "tier2Qty", 3)), 2, 8), o: clamp(Math.round(num(c, "tier2Off", 15)), 0, 50) },
    { q: clamp(Math.round(num(c, "tier3Qty", 4)), 2, 10), o: clamp(Math.round(num(c, "tier3Off", 20)), 0, 60) },
  ].sort((a, b) => a.q - b.q);

/* ---------- drawings ---------- */

/** Accessory drawn in gunmetal + brass, for a dark tile. */
function AccArt({ kind, accent, size }: { kind: Kind; accent: string; size: number }) {
  const body = "#313131";
  const edge = "rgba(255,255,255,.16)";
  const sheen = "rgba(255,255,255,.07)";
  const steel = "#c3c6ca";
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden>
      <ellipse cx="24" cy="43" rx="13" ry="1.8" fill="rgba(0,0,0,.45)" />
      {kind === "key" && (
        <>
          <g transform="rotate(-20 24 28)">
            <rect x="22.7" y="5" width="2.6" height="17" rx="1.1" fill={steel} />
            <path d="M25.3 8.5h2.4v1.6h-2.4zM25.3 11.8h1.7v1.5h-1.7z" fill={steel} />
          </g>
          <g transform="rotate(16 24 28)">
            <rect x="22.7" y="4" width="2.6" height="18" rx="1.1" fill={accent} />
            <path d="M25.3 7.5h2.2v1.6h-2.2zM25.3 10.6h1.5v1.4h-1.5z" fill={accent} />
          </g>
          <rect x="14" y="17" width="20" height="25" rx="5" fill={body} stroke={edge} strokeWidth=".8" />
          <rect x="14.4" y="17.4" width="9.6" height="24.2" rx="4.6" fill={sheen} />
          <circle cx="24" cy="22.5" r="2.1" fill={accent} />
          <circle cx="24" cy="22.5" r=".8" fill="rgba(0,0,0,.35)" />
          <path d="M18 37.5h12" stroke={edge} strokeWidth=".8" strokeLinecap="round" />
        </>
      )}
      {kind === "tracker" && (
        <>
          <rect x="20" y="6.5" width="8" height="6" rx="2" fill={body} stroke={edge} strokeWidth=".8" />
          <rect x="11" y="11" width="26" height="28" rx="7" fill={body} stroke={edge} strokeWidth=".8" />
          <rect x="11.4" y="11.4" width="12.6" height="27.2" rx="6.6" fill={sheen} />
          <circle cx="24" cy="25" r="8.6" fill="#141414" />
          <circle cx="24" cy="25" r="7.2" fill="#ececed" />
          <circle cx="24" cy="25" r="7.2" fill="none" stroke={accent} strokeWidth="1" />
          <circle cx="21.6" cy="22.6" r="2.4" fill="rgba(255,255,255,.9)" />
          <circle cx="15" cy="15" r="1" fill={accent} />
          <circle cx="33" cy="15" r="1" fill={accent} />
          <circle cx="15" cy="35" r="1" fill={accent} />
          <circle cx="33" cy="35" r="1" fill={accent} />
        </>
      )}
      {kind === "pen" && (
        <g transform="rotate(-38 24 24)">
          <rect x="21.4" y="4.5" width="5.2" height="35" rx="2.6" fill={body} stroke={edge} strokeWidth=".8" />
          <rect x="21.8" y="5" width="2.2" height="34" rx="1.1" fill={sheen} />
          <path d="M21.6 39.2 24 45l2.4-5.8z" fill={steel} />
          <rect x="26.2" y="7" width="1.7" height="14" rx=".85" fill={accent} />
          <rect x="21.4" y="15.5" width="5.2" height="1.3" fill={accent} />
        </g>
      )}
      {kind === "strap" && (
        <>
          <rect x="9" y="15" width="30" height="20" rx="6" fill="none" stroke={body} strokeWidth="5" />
          <rect x="9" y="15" width="30" height="20" rx="6" fill="none" stroke={edge} strokeWidth=".8" />
          <rect x="20" y="12" width="8" height="26" rx="2" fill={accent} />
          <rect x="21.5" y="13.5" width="5" height="23" rx="1.2" fill="rgba(0,0,0,.18)" />
        </>
      )}
    </svg>
  );
}

/** Drawn card wallet, used when the main product has no photo. */
function WalletArt({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden>
      <ellipse cx="24" cy="42" rx="15" ry="2" fill="rgba(0,0,0,.45)" />
      <rect x="11" y="9" width="26" height="32" rx="3" fill="#262626" stroke="rgba(255,255,255,.14)" strokeWidth=".8" />
      <rect x="13" y="7" width="22" height="4" rx="1.4" fill="#3a3a3a" />
      <rect x="19" y="13" width="10" height="17" rx="2" fill="#c3c6ca" />
      <rect x="19" y="13" width="4.5" height="17" rx="2" fill="rgba(255,255,255,.35)" />
      <circle cx="16" cy="36" r="2.4" fill="#141414" />
    </svg>
  );
}

/** Product tile: photo when there is one, the drawing on a dark tile otherwise. */
function Thumb({
  src,
  kind,
  accent,
  size,
  radius,
  ring,
}: {
  src: string;
  kind: Kind | "wallet";
  accent: string;
  size: number;
  radius: number;
  ring?: string;
}) {
  const style = {
    width: size,
    height: size,
    borderRadius: radius,
    boxShadow: ring ? `0 0 0 2px ${ring}` : undefined,
  };
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt=""
        width={size}
        height={size}
        loading="lazy"
        decoding="async"
        className="block shrink-0 object-cover"
        style={{ ...style, background: "#1A1A1A" }}
      />
    );
  }
  return (
    <span
      className="grid shrink-0 place-items-center overflow-hidden"
      style={{ ...style, background: "radial-gradient(circle at 30% 22%, #3b3b3b, #151515 72%)" }}
    >
      {kind === "wallet" ? <WalletArt size={size * 0.86} /> : <AccArt kind={kind} accent={accent} size={size * 0.86} />}
    </span>
  );
}

function Check({ on, ink, line }: { on: boolean; ink: string; line: string }) {
  return (
    <span
      className="grid h-[22px] w-[22px] shrink-0 place-items-center rounded-[3px] transition-[background-color,box-shadow] duration-300"
      style={{ background: on ? ink : "transparent", boxShadow: on ? "none" : `inset 0 0 0 1.5px ${line}` }}
      aria-hidden
    >
      <svg
        width="12"
        height="12"
        viewBox="0 0 12 12"
        style={{
          opacity: on ? 1 : 0,
          transform: on ? "none" : "scale(.4)",
          transition: `opacity 200ms ease, transform 420ms ${POP}`,
        }}
      >
        <path d="M2.2 6.4l2.4 2.3 5.2-5.4" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

/* ---------- preview ---------- */

function Preview({ config }: { config: TweakConfig }) {
  const cur = str(config, "currency", "$");
  const bg = str(config, "bg", "#FFFFFF");
  const ink = str(config, "textColor", "#000000");
  const panel = str(config, "panel", "#E9E9E9");
  const dark = str(config, "dark", "#1A1A1A");
  const accent = str(config, "accent", "#c8a464");
  const muted = str(config, "muted", "#6E6E6E");
  const btnBg = str(config, "buttonBg", "#000000");
  const btnFg = str(config, "buttonFg", "#FFFFFF");
  const radius = num(config, "radius", 4);
  const itemsWord = str(config, "itemsWord", "items");
  const offLabel = str(config, "offLabel", "off");

  const tiers = tiersOf(config);
  const maxQ = tiers[tiers.length - 1].q;
  const mainPrice = toNum(str(config, "mainPrice"), 95);
  const mainImg = str(config, "mainImage").trim();
  const accs = list(config, "accessories").map((a) => ({
    name: a.name ?? "",
    desc: a.desc ?? "",
    price: toNum(a.price),
    image: (a.image ?? "").trim(),
    kind: kindOf(a.name ?? ""),
  }));

  /* preselect follows the editor control; shoppers can click around after */
  const pre = clamp(Math.round(num(config, "preselected", 1)), 0, accs.length);
  const key = `${pre}:${accs.length}`;
  const [prevKey, setPrevKey] = useState(key);
  const [picked, setPicked] = useState<number[]>(() => range(pre));
  const [added, setAdded] = useState(false);
  if (key !== prevKey) {
    setPrevKey(key);
    setPicked(range(pre));
  }

  useEffect(() => {
    if (!added) return;
    const t = setTimeout(() => setAdded(false), 1800);
    return () => clearTimeout(t);
  }, [added]);

  const on = picked.filter((i) => i < accs.length).sort((a, b) => a - b);
  const n = 1 + on.length;
  const full = mainPrice + on.reduce((s, i) => s + accs[i].price, 0);
  const reached = tiers.filter((t) => n >= t.q);
  const curTier = reached[reached.length - 1];
  const off = curTier?.o ?? 0;
  const total = full * (1 - off / 100);
  const next = tiers.find((t) => t.q > n);
  const status = next
    ? fillTpl(str(config, "nextText"), next.q - n, next.o)
    : fillTpl(str(config, "topText"), 0, off);
  const fillPct = maxQ > 1 ? clamp((n - 1) / (maxQ - 1), 0, 1) : 1;

  const toggle = (i: number) => setPicked((p) => (p.includes(i) ? p.filter((x) => x !== i) : [...p, i]));
  const label = "text-[10.5px] font-bold uppercase tracking-[0.14em]";

  return (
    <div
      className="@container w-full"
      style={{ background: bg, color: ink, fontFamily: fontStack(str(config, "font", "system")) }}
    >
      <div className="grid grid-cols-1 @min-[720px]:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
        {/* Hero: photo, heading and the kit stacking up */}
        <div className="relative aspect-[4/3] overflow-hidden @min-[720px]:aspect-auto" style={{ background: dark }}>
          {mainImg ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={mainImg}
              alt=""
              loading="lazy"
              decoding="async"
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <span className="absolute inset-0 grid place-items-center">
              <WalletArt size={180} />
            </span>
          )}
          <div
            className="absolute inset-x-0 top-0 px-4 pb-10 pt-4 @min-[720px]:px-7 @min-[720px]:pt-7"
            style={{ background: "linear-gradient(180deg, rgba(0,0,0,.78), rgba(0,0,0,.35) 60%, rgba(0,0,0,0))" }}
          >
            {str(config, "eyebrow") && (
              <p className={label} style={{ color: accent }}>
                {str(config, "eyebrow")}
              </p>
            )}
            <h3 className="mt-2 max-w-[13ch] text-[31px] font-black uppercase leading-[0.9] tracking-[-0.025em] text-white @min-[520px]:text-[42px] @min-[720px]:text-[46px]">
              {str(config, "heading")}
            </h3>
          </div>

          <div
            className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 px-4 pb-4 pt-10 @min-[720px]:px-7 @min-[720px]:pb-7"
            style={{ background: "linear-gradient(0deg, rgba(0,0,0,.7), rgba(0,0,0,0))" }}
          >
            <div className="min-w-0">
              <p className="text-[9.5px] font-bold uppercase tracking-[0.16em] text-white/60">{str(config, "kitWord")}</p>
              <div className="mt-1.5 flex items-center">
                <Thumb src={mainImg} kind="wallet" accent={accent} size={36} radius={Math.max(2, radius)} ring={dark} />
                {on.map((i) => (
                  <span key={i} className="bs-fade-up -ml-2 block">
                    <Thumb
                      src={accs[i].image}
                      kind={accs[i].kind}
                      accent={accent}
                      size={36}
                      radius={Math.max(2, radius)}
                      ring={dark}
                    />
                  </span>
                ))}
              </div>
            </div>
            <p
              key={`${n}-${off}`}
              className="bs-swap shrink-0 whitespace-nowrap px-2.5 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.1em]"
              style={{ background: accent, color: "#000", borderRadius: Math.max(2, radius - 1) }}
            >
              {n} {itemsWord}
              {off > 0 ? ` · ${off}% ${offLabel}` : ""}
            </p>
          </div>
        </div>

        {/* Builder */}
        <div className="px-4 pb-5 pt-5 @min-[720px]:px-8 @min-[720px]:py-8">
          {str(config, "subheading") && (
            <p className="text-[13.5px] leading-relaxed" style={{ color: muted }}>
              {str(config, "subheading")}
            </p>
          )}

          {/* Discount ladder */}
          <div className="mt-5">
            <div className="flex items-baseline justify-between gap-3">
              <p className={`${label} shrink-0 whitespace-nowrap`}>{str(config, "ladderLabel")}</p>
              <p
                key={status}
                className="bs-swap flex items-center gap-1.5 text-right text-[10.5px] font-bold uppercase tracking-[0.06em]"
              >
                <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: accent }} />
                {status}
              </p>
            </div>
            <div className="mt-2.5 h-[3px] overflow-hidden" style={{ background: panel }}>
              <span
                className="block h-full"
                style={{
                  background: accent,
                  transform: `scaleX(${fillPct})`,
                  transformOrigin: "left",
                  transition: `transform 600ms ${EASE}`,
                }}
              />
            </div>
            <div className="mt-2 grid grid-cols-3 gap-1.5">
              {tiers.map((t, k) => {
                const hit = n >= t.q;
                const isCur = curTier === t;
                return (
                  <div
                    key={k}
                    className="relative overflow-hidden px-3 pb-2.5 pt-3 transition-[background-color,color,box-shadow] duration-300"
                    style={{
                      borderRadius: radius,
                      background: isCur ? ink : hit ? panel : bg,
                      color: isCur ? bg : ink,
                      boxShadow: isCur ? "none" : `inset 0 0 0 1px ${panel}`,
                    }}
                  >
                    <p className="flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.12em]">
                      <span style={{ opacity: isCur ? 0.75 : 0.6 }}>
                        {t.q} {itemsWord}
                      </span>
                      <svg
                        width="10"
                        height="10"
                        viewBox="0 0 12 12"
                        aria-hidden
                        style={{
                          opacity: hit ? 1 : 0,
                          transform: hit ? "none" : "scale(.3)",
                          transition: `opacity 200ms ease, transform 400ms ${POP}`,
                        }}
                      >
                        <path d="M2 6.4l2.6 2.4L10 3.4" fill="none" stroke={accent} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </p>
                    <p className="mt-1.5 flex items-baseline gap-1 text-[25px] font-black leading-none tracking-[-0.04em] tabular-nums">
                      {t.o}%
                      <span className="text-[9.5px] font-bold uppercase tracking-[0.12em]">{offLabel}</span>
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Items */}
          <ul className="mt-5 flex flex-col gap-2">
            <li className="flex items-center gap-3 p-2 pr-3" style={{ background: panel, borderRadius: radius }}>
              <Thumb src={mainImg} kind="wallet" accent={accent} size={52} radius={Math.max(2, radius - 1)} />
              <div className="min-w-0 flex-1 leading-tight">
                <p className="truncate text-[13px] font-extrabold uppercase tracking-[0.02em]">{str(config, "mainName")}</p>
                <p className="mt-0.5 truncate text-[12px]" style={{ color: muted }}>
                  {str(config, "mainDesc")}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <span className="text-[13.5px] font-bold tabular-nums">{money(mainPrice, cur)}</span>
                <span
                  className="px-1.5 py-[2px] text-[9px] font-bold uppercase tracking-[0.12em]"
                  style={{ background: ink, color: accent, borderRadius: 2 }}
                >
                  {str(config, "mainTag")}
                </span>
              </div>
            </li>
            {accs.map((a, i) => {
              const sel = on.includes(i);
              return (
                <li key={i}>
                  <button
                    type="button"
                    aria-pressed={sel}
                    onClick={() => toggle(i)}
                    className="flex w-full items-center gap-3 p-2 pr-3 text-left transition-[box-shadow] duration-300"
                    style={{
                      borderRadius: radius,
                      background: bg,
                      boxShadow: sel ? `inset 0 0 0 2px ${ink}` : `inset 0 0 0 1px ${panel}`,
                    }}
                  >
                    <Thumb src={a.image} kind={a.kind} accent={accent} size={52} radius={Math.max(2, radius - 1)} />
                    <span className="min-w-0 flex-1 leading-tight">
                      <span className="block truncate text-[13px] font-extrabold uppercase tracking-[0.02em]">{a.name}</span>
                      <span className="mt-0.5 block truncate text-[12px]" style={{ color: muted }}>
                        {a.desc}
                      </span>
                    </span>
                    <span className="shrink-0 text-[13.5px] font-bold tabular-nums">+{money(a.price, cur)}</span>
                    <Check on={sel} ink={ink} line={tintLine(ink)} />
                  </button>
                </li>
              );
            })}
          </ul>

          {/* Summary */}
          <div className="mt-5 flex items-end justify-between gap-3 border-t pt-4" style={{ borderColor: panel }}>
            <div className="min-w-0">
              <p className={label}>{str(config, "totalLabel")}</p>
              <p
                key={off}
                className="bs-swap mt-1.5 inline-block px-1.5 py-[3px] text-[10.5px] font-extrabold uppercase tracking-[0.08em] tabular-nums"
                style={{
                  background: off > 0 ? accent : "transparent",
                  color: off > 0 ? "#000" : muted,
                  borderRadius: 2,
                  boxShadow: off > 0 ? "none" : `inset 0 0 0 1px ${panel}`,
                }}
              >
                {off > 0
                  ? `${str(config, "saveLabel")} ${money(full - total, cur)} (${off}%)`
                  : `${n} ${itemsWord}`}
              </p>
            </div>
            <p className="flex shrink-0 items-baseline gap-2 tabular-nums">
              {off > 0 && (
                <s className="text-[14px]" style={{ color: muted }}>
                  {money(full, cur)}
                </s>
              )}
              <b key={total.toFixed(2)} className="bs-swap text-[28px] font-black leading-none tracking-[-0.04em]">
                {money(total, cur)}
              </b>
            </p>
          </div>
          <button
            type="button"
            onClick={() => setAdded(true)}
            className="mt-4 flex h-[52px] w-full items-center justify-center gap-2 px-4 text-[12.5px] font-extrabold uppercase tracking-[0.14em] hover:brightness-125 active:scale-[0.99]"
            style={{
              background: added ? accent : btnBg,
              color: added ? "#000" : btnFg,
              borderRadius: radius,
              transition: `background-color 300ms ${EASE}, color 300ms ${EASE}, filter 200ms ease, scale 200ms ease`,
            }}
          >
            <span key={added ? "y" : "n"} className="bs-swap whitespace-nowrap">
              {added ? "Added to cart ✓" : (
                <>
                  {str(config, "buttonText")} <span style={{ opacity: 0.45 }}>—</span> {money(total, cur)}
                </>
              )}
            </span>
          </button>
          {str(config, "note") && (
            <p className="mt-3 text-center text-[11px] uppercase tracking-[0.1em]" style={{ color: muted }}>
              {str(config, "note")}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/** Border colour for unchecked boxes: the ink at low alpha. */
const tintLine = (hex: string) => (/^#[0-9a-f]{6}$/i.test(hex) ? `${hex}40` : "rgba(0,0,0,.25)");

/* ---------- Liquid ---------- */

function generateLiquid(config: TweakConfig): string {
  const { face, family } = fontFaceFor(str(config, "font", "system"));
  const S = ".bs-ecb-{{ section.id }}";
  const r = "{{ section.settings.radius }}px";
  const ease = "cubic-bezier(.22,1,.36,1)";
  const pop = "cubic-bezier(.34,1.56,.64,1)";
  const tick = `<svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M2.2 6.4l2.4 2.3 5.2-5.4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

  const q1 = clamp(Math.round(num(config, "tier1Qty", 2)), 2, 6);
  const o1 = clamp(Math.round(num(config, "tier1Off", 10)), 0, 50);
  const q2 = clamp(Math.round(num(config, "tier2Qty", 3)), 2, 8);
  const o2 = clamp(Math.round(num(config, "tier2Off", 15)), 0, 50);
  const q3 = clamp(Math.round(num(config, "tier3Qty", 4)), 2, 10);
  const o3 = clamp(Math.round(num(config, "tier3Off", 20)), 0, 60);

  const style = `<style>
${face ? face + "\n" : ""}  ${S} { container-type: inline-size; background: {{ section.settings.bg }}; color: {{ section.settings.text_color }}; font-family: ${family}; }
  ${S} * { box-sizing: border-box; }
  ${S} p, ${S} h2, ${S} ul { margin: 0; padding: 0; }
  ${S} ul { list-style: none; }
  ${S} button { font: inherit; }
  ${S} .bs-wrap { display: grid; grid-template-columns: minmax(0, 1fr); max-width: 1200px; margin: 0 auto; }
  ${S} .bs-lab { font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .14em; }
  ${S} .bs-vis { position: relative; aspect-ratio: 4 / 3; overflow: hidden; background: {{ section.settings.dark }}; }
  ${S} .bs-hero { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
  ${S} .bs-ph { background: {{ section.settings.dark }}; fill: rgba(255,255,255,.25); }
  ${S} .bs-head { position: absolute; left: 0; right: 0; top: 0; padding: 16px 16px 40px; background: linear-gradient(180deg, rgba(0,0,0,.78), rgba(0,0,0,.35) 60%, rgba(0,0,0,0)); }
  ${S} .bs-eyebrow { color: {{ section.settings.accent }}; }
  ${S} .bs-h { margin-top: 8px; max-width: 13ch; color: #fff; font-size: 31px; font-weight: 900; line-height: .9; letter-spacing: -.025em; text-transform: uppercase; }
  ${S} .bs-kit { position: absolute; left: 0; right: 0; bottom: 0; display: flex; align-items: flex-end; justify-content: space-between; gap: 12px; padding: 40px 16px 16px; background: linear-gradient(0deg, rgba(0,0,0,.7), rgba(0,0,0,0)); }
  ${S} .bs-kit-l { min-width: 0; }
  ${S} .bs-kit-w { font-size: 9.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .16em; color: rgba(255,255,255,.6); }
  ${S} .bs-chips { display: flex; align-items: center; margin-top: 6px; }
  ${S} .bs-chip { display: none; width: 36px; height: 36px; border-radius: {{ section.settings.radius | at_least: 2 }}px; overflow: hidden; background: #1a1a1a; box-shadow: 0 0 0 2px {{ section.settings.dark }}; }
  ${S} .bs-chip + .bs-chip { margin-left: -8px; }
  ${S} .bs-chip.is-on { display: block; animation: bs-ecb-in .45s ${ease} both; }
  ${S} .bs-chip img, ${S} .bs-chip svg { display: block; width: 100%; height: 100%; object-fit: cover; }
  @keyframes bs-ecb-in { from { opacity: 0; transform: translateY(8px); } }
  ${S} .bs-badge { flex-shrink: 0; white-space: nowrap; padding: 6px 10px; border-radius: {{ section.settings.radius | minus: 1 | at_least: 2 }}px; background: {{ section.settings.accent }}; color: #000;
    font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: .1em; }
  ${S} .bs-panel { padding: 20px 16px; }
  ${S} .bs-sub { font-size: 13.5px; line-height: 1.6; color: {{ section.settings.muted }}; }
  ${S} .bs-ladder { margin-top: 20px; }
  ${S} .bs-lh { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; }
  ${S} .bs-next { display: flex; align-items: center; gap: 6px; text-align: right; font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; }
  ${S} .bs-next::before { content: ""; flex-shrink: 0; width: 6px; height: 6px; border-radius: 99px; background: {{ section.settings.accent }}; }
  ${S} .bs-track { height: 3px; margin-top: 10px; overflow: hidden; background: {{ section.settings.panel }}; }
  ${S} .bs-fill { display: block; height: 100%; background: {{ section.settings.accent }}; transform: scaleX(0); transform-origin: left; transition: transform .6s ${ease}; }
  ${S} .bs-tiers { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px; margin-top: 8px; }
  ${S} .bs-tier { padding: 12px 12px 10px; border-radius: ${r}; box-shadow: inset 0 0 0 1px {{ section.settings.panel }}; transition: background-color .3s, color .3s, box-shadow .3s; }
  ${S} .bs-tier.is-hit { background: {{ section.settings.panel }}; }
  ${S} .bs-tier.is-cur { background: {{ section.settings.text_color }}; color: {{ section.settings.bg }}; box-shadow: none; }
  ${S} .bs-tq { display: flex; align-items: center; justify-content: space-between; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .12em; }
  ${S} .bs-tq span { opacity: .6; }
  ${S} .bs-tq svg { color: {{ section.settings.accent }}; opacity: 0; transform: scale(.3); transition: opacity .2s, transform .4s ${pop}; }
  ${S} .bs-tier.is-hit .bs-tq svg { opacity: 1; transform: none; }
  ${S} .bs-to { display: flex; align-items: baseline; gap: 4px; margin-top: 6px; font-size: 25px; font-weight: 900; line-height: 1; letter-spacing: -.04em; font-variant-numeric: tabular-nums; }
  ${S} .bs-to small { font-size: 9.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .12em; }
  ${S} .bs-items { display: flex; flex-direction: column; gap: 8px; margin-top: 20px; }
  ${S} .bs-item { position: relative; display: flex; align-items: center; gap: 12px; padding: 8px 12px 8px 8px; border-radius: ${r}; box-shadow: inset 0 0 0 1px {{ section.settings.panel }}; transition: box-shadow .3s; }
  ${S} label.bs-item { cursor: pointer; }
  ${S} .bs-item.is-main { background: {{ section.settings.panel }}; box-shadow: none; }
  ${S} .bs-item:has(input:checked) { box-shadow: inset 0 0 0 2px {{ section.settings.text_color }}; }
  ${S} .bs-item:has(input:focus-visible) { outline: 2px solid {{ section.settings.accent }}; outline-offset: 2px; }
  ${S} .bs-item.is-off { opacity: .5; cursor: not-allowed; }
  ${S} .bs-item input { position: absolute; opacity: 0; width: 1px; height: 1px; pointer-events: none; }
  ${S} .bs-thumb { flex-shrink: 0; width: 52px; height: 52px; border-radius: {{ section.settings.radius | minus: 1 | at_least: 2 }}px; overflow: hidden; background: radial-gradient(circle at 30% 22%, #3b3b3b, #151515 72%); }
  ${S} .bs-thumb img, ${S} .bs-thumb svg { display: block; width: 100%; height: 100%; object-fit: cover; }
  ${S} .bs-meta { flex: 1; min-width: 0; line-height: 1.25; }
  ${S} .bs-name { display: block; font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: .02em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  ${S} .bs-desc { display: block; margin-top: 2px; font-size: 12px; color: {{ section.settings.muted }}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  ${S} .bs-price { flex-shrink: 0; font-size: 13.5px; font-weight: 700; font-variant-numeric: tabular-nums; }
  ${S} .bs-end { display: flex; flex-shrink: 0; flex-direction: column; align-items: flex-end; gap: 4px; }
  ${S} .bs-tag { padding: 2px 6px; border-radius: 2px; background: {{ section.settings.text_color }}; color: {{ section.settings.accent }}; font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: .12em; }
  ${S} .bs-box { display: grid; place-items: center; flex-shrink: 0; width: 22px; height: 22px; border-radius: 3px; color: #fff; box-shadow: inset 0 0 0 1.5px rgba(0,0,0,.25); transition: background-color .3s, box-shadow .3s; }
  ${S} .bs-box svg { opacity: 0; transform: scale(.4); transition: opacity .2s, transform .42s ${pop}; }
  ${S} .bs-item:has(input:checked) .bs-box { background: {{ section.settings.text_color }}; box-shadow: none; }
  ${S} .bs-item:has(input:checked) .bs-box svg { opacity: 1; transform: none; }
  ${S} .bs-sum { display: flex; align-items: flex-end; justify-content: space-between; gap: 12px; margin-top: 20px; padding-top: 16px; border-top: 1px solid {{ section.settings.panel }}; }
  ${S} .bs-save { display: inline-block; margin-top: 6px; padding: 3px 6px; border-radius: 2px; font-size: 10.5px; font-weight: 800; text-transform: uppercase; letter-spacing: .08em; font-variant-numeric: tabular-nums;
    color: {{ section.settings.muted }}; box-shadow: inset 0 0 0 1px {{ section.settings.panel }}; }
  ${S} .bs-save.is-on { background: {{ section.settings.accent }}; color: #000; box-shadow: none; }
  ${S} .bs-amt { display: flex; flex-shrink: 0; align-items: baseline; gap: 8px; font-variant-numeric: tabular-nums; }
  ${S} .bs-amt s { font-size: 14px; color: {{ section.settings.muted }}; }
  ${S} .bs-amt b { font-size: 28px; font-weight: 900; line-height: 1; letter-spacing: -.04em; }
  ${S} .bs-atc { display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; height: 52px; margin-top: 16px; padding: 0 16px; border: 0; cursor: pointer;
    border-radius: ${r}; background: {{ section.settings.button_bg }}; color: {{ section.settings.button_fg }};
    font-size: 12.5px; font-weight: 800; text-transform: uppercase; letter-spacing: .14em; white-space: nowrap; transition: filter .2s, transform .2s, opacity .2s; }
  ${S} .bs-atc:hover:not(:disabled) { filter: brightness(1.25); }
  ${S} .bs-atc:active:not(:disabled) { transform: scale(.99); }
  ${S} .bs-atc:disabled { opacity: .45; cursor: not-allowed; }
  ${S} .bs-dash { opacity: .45; }
  ${S} .bs-note { margin-top: 12px; text-align: center; font-size: 11px; text-transform: uppercase; letter-spacing: .1em; color: {{ section.settings.muted }}; }
  @container (min-width: 520px) {
    ${S} .bs-h { font-size: 42px; }
  }
  @container (min-width: 720px) {
    ${S} .bs-wrap { grid-template-columns: minmax(0, 1.05fr) minmax(0, 1fr); }
    ${S} .bs-vis { aspect-ratio: auto; min-height: 100%; }
    ${S} .bs-head { padding: 28px 28px 40px; }
    ${S} .bs-h { font-size: 46px; }
    ${S} .bs-kit { padding: 40px 28px 28px; }
    ${S} .bs-panel { padding: 32px; }
  }
  @media (prefers-reduced-motion: reduce) {
    ${S} *, ${S} *::before { transition: none !important; animation: none !important; }
  }
</style>`;

  const tierCells = [1, 2, 3]
    .map(
      (i) => `          <div class="bs-tier" data-tier data-q="{{ section.settings.tier${i}_qty }}" data-o="{{ section.settings.tier${i}_off }}" style="order: {{ section.settings.tier${i}_qty }};">
            <p class="bs-tq"><span>{{ section.settings.tier${i}_qty }} {{ section.settings.items_word }}</span><svg width="10" height="10" viewBox="0 0 12 12" aria-hidden="true"><path d="M2 6.4l2.6 2.4L10 3.4" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg></p>
            <p class="bs-to">{{ section.settings.tier${i}_off }}%<small>{{ section.settings.off_label }}</small></p>
          </div>`,
    )
    .join("\n");

  const markup = `{%- comment -%}
  Carry Bundle Builder by boost.supply. Add it to a product or landing page.
  - Main product: pick it under "Main product", or leave it empty on a
    product template to use that product. It is always in the bundle.
  - Add one "Accessory" block per add-on and pick its product. Checked
    accessories are added to the cart together with the main product.
  - TIERED DISCOUNT SETUP: the ladder and totals here are display only.
    Put the main product and every accessory in one collection, then create
    one automatic discount per tier (Discounts → Create discount → Amount off
    products → Automatic discount), applied to that collection, with
    "Minimum quantity of items" as the requirement. With the defaults:
      ${q1} items → ${o1}% off, ${q2} items → ${o2}% off, ${q3} items → ${o3}% off.
    Leave the three tier discounts set NOT to combine with each other, so
    Shopify applies the best one the cart qualifies for. A bundle or volume
    discount app works too; keep its tiers equal to the settings below.
  - Photos come from your store: the hero is the optional "Hero image" or the
    main product's featured image; each row uses its product's featured image.
{%- endcomment -%}
{%- liquid
  assign bs_main = section.settings.product
  if bs_main == blank
    assign bs_main = product
  endif
-%}
{%- if bs_main != blank -%}
{%- assign bs_mv = bs_main.selected_or_first_available_variant -%}
<div class="bs-ecb-{{ section.id }}" id="bs-ecb-{{ section.id }}"
  data-next="{{ section.settings.next_text | escape }}" data-top="{{ section.settings.top_text | escape }}"
  data-save="{{ section.settings.save_label | escape }}" data-items="{{ section.settings.items_word | escape }}" data-off="{{ section.settings.off_label | escape }}"
  data-add-url="{{ routes.cart_add_url }}" data-cart-url="{{ routes.cart_url }}">
  <div class="bs-wrap">
    <div class="bs-vis">
      {%- if section.settings.image != blank -%}
        {{ section.settings.image | image_url: width: 1400 | image_tag: class: 'bs-hero', loading: 'lazy', alt: bs_main.title, sizes: '(min-width: 990px) 50vw, 100vw' }}
      {%- elsif bs_main.featured_image -%}
        {{ bs_main.featured_image | image_url: width: 1400 | image_tag: class: 'bs-hero', loading: 'lazy', alt: bs_main.title, sizes: '(min-width: 990px) 50vw, 100vw' }}
      {%- else -%}
        {{ 'product-1' | placeholder_svg_tag: 'bs-hero bs-ph' }}
      {%- endif -%}
      <div class="bs-head">
        {%- if section.settings.eyebrow != blank -%}<p class="bs-lab bs-eyebrow">{{ section.settings.eyebrow }}</p>{%- endif -%}
        <h2 class="bs-h">{{ section.settings.heading }}</h2>
      </div>
      <div class="bs-kit">
        <div class="bs-kit-l">
          {%- if section.settings.kit_word != blank -%}<p class="bs-kit-w">{{ section.settings.kit_word }}</p>{%- endif -%}
          <div class="bs-chips">
            <span class="bs-chip is-on">
              {%- if bs_main.featured_image -%}{{ bs_main.featured_image | image_url: width: 120 | image_tag: loading: 'lazy', alt: '' }}{%- else -%}{{ 'product-1' | placeholder_svg_tag }}{%- endif -%}
            </span>
            {%- for block in section.blocks -%}
              {%- assign bs_p = block.settings.product -%}
              <span class="bs-chip" data-chip="{{ block.id }}">
                {%- if bs_p.featured_image -%}{{ bs_p.featured_image | image_url: width: 120 | image_tag: loading: 'lazy', alt: '' }}{%- else -%}{{ 'product-2' | placeholder_svg_tag }}{%- endif -%}
              </span>
            {%- endfor -%}
          </div>
        </div>
        <p class="bs-badge" data-badge>1 {{ section.settings.items_word }}</p>
      </div>
    </div>

    <div class="bs-panel">
      {%- if section.settings.subheading != blank -%}<p class="bs-sub">{{ section.settings.subheading }}</p>{%- endif -%}

      <div class="bs-ladder">
        <div class="bs-lh">
          <p class="bs-lab">{{ section.settings.ladder_label }}</p>
          <p class="bs-next" data-status aria-live="polite"></p>
        </div>
        <div class="bs-track"><span class="bs-fill" data-fill></span></div>
        <div class="bs-tiers">
${tierCells}
        </div>
      </div>

      <ul class="bs-items">
        <li class="bs-item is-main">
          <span class="bs-thumb">
            {%- if bs_main.featured_image -%}{{ bs_main.featured_image | image_url: width: 160 | image_tag: loading: 'lazy', alt: bs_main.title }}{%- else -%}{{ 'product-1' | placeholder_svg_tag }}{%- endif -%}
          </span>
          <span class="bs-meta">
            <span class="bs-name">{{ section.settings.main_title | default: bs_main.title }}</span>
            {%- if section.settings.main_desc != blank -%}<span class="bs-desc">{{ section.settings.main_desc }}</span>{%- endif -%}
          </span>
          <span class="bs-end">
            <span class="bs-price">{{ bs_mv.price | money_without_trailing_zeros }}</span>
            {%- if section.settings.main_tag != blank -%}<span class="bs-tag">{{ section.settings.main_tag }}</span>{%- endif -%}
          </span>
        </li>
        {%- for block in section.blocks -%}
          {%- assign bs_p = block.settings.product -%}
          {%- assign bs_v = bs_p.selected_or_first_available_variant -%}
          {%- assign bs_off = false -%}
          {%- if bs_p == blank or bs_v.available == false -%}{%- assign bs_off = true -%}{%- endif -%}
          <li {{ block.shopify_attributes }}>
            <label class="bs-item{% if bs_off %} is-off{% endif %}">
              <input type="checkbox" data-acc data-chip-id="{{ block.id }}"{% unless bs_off %} data-id="{{ bs_v.id }}" data-price="{{ bs_v.price }}"{% if block.settings.preselected %} checked{% endif %}{% else %} disabled{% endunless %}>
              <span class="bs-thumb">
                {%- if bs_p.featured_image -%}{{ bs_p.featured_image | image_url: width: 160 | image_tag: loading: 'lazy', alt: bs_p.title }}{%- else -%}{{ 'product-2' | placeholder_svg_tag }}{%- endif -%}
              </span>
              <span class="bs-meta">
                <span class="bs-name">{{ block.settings.title | default: bs_p.title }}</span>
                {%- if block.settings.description != blank -%}<span class="bs-desc">{{ block.settings.description }}</span>{%- endif -%}
              </span>
              <span class="bs-price">+{%- if bs_p != blank -%}{{ bs_v.price | money_without_trailing_zeros }}{%- else -%}{{ block.settings.price_label }}{%- endif -%}</span>
              <span class="bs-box">${tick}</span>
            </label>
          </li>
        {%- endfor -%}
      </ul>

      {%- form 'product', bs_main, class: 'bs-form' -%}
        <input type="hidden" name="id" value="{{ bs_mv.id }}">
        <input type="hidden" name="quantity" value="1">
        <div class="bs-sum">
          <div>
            <p class="bs-lab">{{ section.settings.total_label }}</p>
            <p class="bs-save" data-save-chip>1 {{ section.settings.items_word }}</p>
          </div>
          <p class="bs-amt"><s data-cmp></s><b data-total>{{ bs_mv.price | money }}</b></p>
        </div>
        <button type="submit" name="add" class="bs-atc" data-atc data-main-id="{{ bs_mv.id }}" data-main-price="{{ bs_mv.price }}"{% unless bs_mv.available %} disabled{% endunless %}>
          <span>{{ section.settings.button_text }}</span><span class="bs-dash" aria-hidden="true">—</span><span data-atc-price>{{ bs_mv.price | money }}</span>
        </button>
      {%- endform -%}
      {%- if section.settings.note != blank -%}<p class="bs-note">{{ section.settings.note }}</p>{%- endif -%}
    </div>
  </div>
</div>
<script>
  (function () {
    var root = document.getElementById('bs-ecb-{{ section.id }}');
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
    function token(k) { return '{' + '{' + k + '}' + '}'; }
    function fill(tpl, count, pct) {
      return String(tpl || '').split(token('count')).join(count).split(token('percent')).join(pct + '%');
    }
    function q(s) { return root.querySelector(s); }
    function all(s) { return [].slice.call(root.querySelectorAll(s)); }
    var d = root.dataset;
    var cells = all('[data-tier]');
    var tiers = cells.map(function (c) { return [+c.dataset.q, +c.dataset.o]; })
      .sort(function (a, b) { return a[0] - b[0]; });
    if (!tiers.length) return;
    var maxQ = tiers[tiers.length - 1][0];
    var accs = all('[data-acc]');
    var btn = q('[data-atc]'), form = q('form.bs-form');
    var mainId = btn ? +btn.dataset.mainId : 0, mainPrice = btn ? +btn.dataset.mainPrice : 0;

    function checked() { return accs.filter(function (a) { return a.checked && !a.disabled; }); }
    function update() {
      var on = checked(), n = 1 + on.length, full = mainPrice, off = 0, curQ = 0, next = null;
      on.forEach(function (a) { full += +a.dataset.price || 0; });
      tiers.forEach(function (t) {
        if (n >= t[0]) { off = t[1]; curQ = t[0]; }
        else if (!next) next = t;
      });
      var total = Math.round(full * (100 - off) / 100);
      cells.forEach(function (c) {
        var cq = +c.dataset.q;
        c.classList.toggle('is-hit', n >= cq);
        c.classList.toggle('is-cur', cq === curQ);
      });
      var fillEl = q('[data-fill]');
      if (fillEl) fillEl.style.transform = 'scaleX(' + (maxQ > 1 ? Math.min(1, (n - 1) / (maxQ - 1)) : 1) + ')';
      var st = q('[data-status]');
      if (st) st.textContent = next ? fill(d.next, next[0] - n, next[1]) : fill(d.top, 0, off);
      var badge = q('[data-badge]');
      if (badge) badge.textContent = n + ' ' + d.items + (off ? ' · ' + off + '% ' + d.off : '');
      var chip = q('[data-save-chip]');
      if (chip) {
        chip.classList.toggle('is-on', off > 0);
        chip.textContent = off ? d.save + ' ' + money(full - total) + ' (' + off + '%)' : n + ' ' + d.items;
      }
      var cmp = q('[data-cmp]');
      if (cmp) cmp.textContent = off ? money(full) : '';
      var tot = q('[data-total]');
      if (tot) tot.textContent = money(total);
      var ap = q('[data-atc-price]');
      if (ap) ap.textContent = money(total);
      accs.forEach(function (a) {
        var c = root.querySelector('[data-chip="' + a.dataset.chipId + '"]');
        if (c) c.classList.toggle('is-on', a.checked && !a.disabled);
      });
    }
    accs.forEach(function (a) { a.addEventListener('change', update); });

    if (form && btn) {
      form.addEventListener('submit', function (e) {
        if (!window.fetch) return;
        e.preventDefault();
        var items = [{ id: mainId, quantity: 1 }];
        checked().forEach(function (a) { if (a.dataset.id) items.push({ id: +a.dataset.id, quantity: 1 }); });
        btn.disabled = true;
        fetch(d.addUrl + '.js', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ items: items })
        })
          .then(function (res) {
            if (!res.ok) throw new Error('cart');
            window.location.href = d.cartUrl;
          })
          .catch(function () {
            /* fallback: a normal form post adds the main product */
            btn.disabled = false;
            form.submit();
          });
      });
    }
    update();
  })();
</script>
{%- else -%}
<p style="padding:24px;text-align:center;opacity:.6">Pick a main product in the section settings, or add this section to a product template.</p>
{%- endif -%}`;

  const accs = list(config, "accessories");
  const pre = clamp(Math.round(num(config, "preselected", 1)), 0, accs.length);

  const schema = buildSchema({
    name: "Carry Bundle Builder",
    settings: [
      { type: "text", id: "eyebrow", label: "Eyebrow", default: str(config, "eyebrow") },
      { type: "text", id: "heading", label: "Heading", default: str(config, "heading") },
      { type: "textarea", id: "subheading", label: "Subheading", default: str(config, "subheading") },
      { type: "header", content: "Main product" },
      { type: "product", id: "product", label: "Main product", info: "Always in the bundle. Leave empty on a product template to use that product." },
      { type: "image_picker", id: "image", label: "Hero image", info: "Optional. Defaults to the main product's featured image." },
      { type: "text", id: "main_title", label: "Title (empty = product title)", default: str(config, "mainName") },
      { type: "text", id: "main_desc", label: "Description", default: str(config, "mainDesc") },
      { type: "text", id: "main_tag", label: "Included tag", default: str(config, "mainTag") },
      { type: "text", id: "kit_word", label: "Kit label on the photo", default: str(config, "kitWord") },
      { type: "header", content: "Bundle discount" },
      { type: "range", id: "tier1_qty", label: "Tier 1: items", min: 2, max: 6, step: 1, default: q1 },
      { type: "range", id: "tier1_off", label: "Tier 1: discount", min: 0, max: 50, step: 1, unit: "%", default: o1 },
      { type: "range", id: "tier2_qty", label: "Tier 2: items", min: 2, max: 8, step: 1, default: q2 },
      { type: "range", id: "tier2_off", label: "Tier 2: discount", min: 0, max: 50, step: 1, unit: "%", default: o2 },
      { type: "range", id: "tier3_qty", label: "Tier 3: items", min: 2, max: 10, step: 1, default: q3 },
      { type: "range", id: "tier3_off", label: "Tier 3: discount", min: 0, max: 60, step: 1, unit: "%", default: o3 },
      { type: "text", id: "ladder_label", label: "Ladder label", default: str(config, "ladderLabel") },
      { type: "text", id: "items_word", label: "“items” word", default: str(config, "itemsWord") },
      { type: "text", id: "off_label", label: "“off” word", default: str(config, "offLabel") },
      { type: "text", id: "next_text", label: "Next tier text (use {{count}} and {{percent}})", default: str(config, "nextText") },
      { type: "text", id: "top_text", label: "Top tier text (use {{percent}})", default: str(config, "topText") },
      { type: "header", content: "Summary" },
      { type: "text", id: "total_label", label: "Total label", default: str(config, "totalLabel") },
      { type: "text", id: "save_label", label: "Savings label", default: str(config, "saveLabel") },
      { type: "text", id: "button_text", label: "Button text", default: str(config, "buttonText") },
      { type: "text", id: "note", label: "Note under the button", default: str(config, "note") },
      { type: "header", content: "Style" },
      { type: "color", id: "bg", label: "Background", default: str(config, "bg") },
      { type: "color", id: "text_color", label: "Text", default: str(config, "textColor") },
      { type: "color", id: "panel", label: "Panel & lines", default: str(config, "panel") },
      { type: "color", id: "dark", label: "Photo backdrop", default: str(config, "dark") },
      { type: "color", id: "accent", label: "Accent (brass)", default: str(config, "accent") },
      { type: "color", id: "muted", label: "Muted text", default: str(config, "muted") },
      { type: "color", id: "button_bg", label: "Button", default: str(config, "buttonBg") },
      { type: "color", id: "button_fg", label: "Button text", default: str(config, "buttonFg") },
      { type: "range", id: "radius", label: "Corner radius", min: 0, max: 16, step: 1, unit: "px", default: clamp(Math.round(num(config, "radius", 4)), 0, 16) },
    ],
    blocks: [
      {
        type: "accessory",
        name: "Accessory",
        settings: [
          { type: "product", id: "product", label: "Accessory product" },
          { type: "text", id: "title", label: "Title (empty = product title)" },
          { type: "text", id: "description", label: "Description" },
          { type: "text", id: "price_label", label: "Price shown before a product is picked" },
          { type: "checkbox", id: "preselected", label: "Checked by default", default: false },
        ],
      },
    ],
    maxBlocks: 6,
    presetBlocks: accs.slice(0, 6).map((a, i) => ({
      type: "accessory",
      settings: {
        title: a.name ?? "",
        description: a.desc ?? "",
        price_label: money(toNum(a.price), str(config, "currency", "$")),
        preselected: i < pre,
      },
    })),
  });

  return section({ style, markup, schema });
}

export const carryBundle: Tweak = {
  slug: "carry-bundle",
  inspiredBy: "ridge",
  name: "Carry Bundle Builder",
  tagline: "Build-your-kit bundle with a discount ladder that climbs with every accessory.",
  description:
    "Modeled on the everyday-carry bundle builder Ridge uses to sell wallets with accessories. The wallet is always in; shoppers tap a key case, tracker holder or pen into the kit and a three-step discount ladder (2 items 10%, 3 items 15%, 4 items 20%) lights up the current tier. The kit stacks up on the hero photo, the total shows the savings live, and one button adds the whole bundle to the cart. Raises units per order with a clear reason to add one more.",
  category: "product-page",
  tier: "free",
  tint: "#ececec",
  Preview,
  generateLiquid,
  defaults,
  fields: [
    { key: "eyebrow", label: "Eyebrow", type: "text", group: "Content" },
    { key: "heading", label: "Heading", type: "text", group: "Content" },
    { key: "subheading", label: "Subheading", type: "textarea", group: "Content" },
    { key: "currency", label: "Currency symbol", type: "text", group: "Content" },
    { key: "mainName", label: "Main product name", type: "text", group: "Main product" },
    { key: "mainDesc", label: "Main product description", type: "text", group: "Main product" },
    { key: "mainPrice", label: "Main product price", type: "text", group: "Main product" },
    { key: "mainTag", label: "Included tag", type: "text", group: "Main product" },
    {
      key: "mainImage", label: "Image URL", type: "text", group: "Main product",
      hint: "Hero and thumbnail photo. Leave empty for a drawn wallet. Preview only; your store uses the product's featured image",
    },
    { key: "kitWord", label: "Kit label on the photo", type: "text", group: "Main product" },
    {
      key: "accessories", label: "Accessories", type: "list", group: "Accessories",
      hint: "Preview only. Pick the real products in Shopify blocks. Leave Image URL empty for a drawing (key, tracker and pen are matched by name)",
      itemFields: [
        { key: "name", label: "Name", type: "text" },
        { key: "desc", label: "Description", type: "text" },
        { key: "price", label: "Price", type: "text" },
        { key: "image", label: "Image URL", type: "text" },
      ],
      newItem: { name: "Cash Strap", desc: "Elastic band for folded bills", price: "15", image: "" },
      addLabel: "Add accessory", max: 6,
    },
    { key: "preselected", label: "Preselected accessories", type: "slider", group: "Accessories", min: 0, max: 6, step: 1 },
    { key: "tier1Qty", label: "Tier 1: items", type: "slider", group: "Bundle discount", min: 2, max: 6, step: 1, hint: "Items count the wallet too" },
    { key: "tier1Off", label: "Tier 1: discount", type: "slider", group: "Bundle discount", min: 0, max: 50, step: 1, unit: "%" },
    { key: "tier2Qty", label: "Tier 2: items", type: "slider", group: "Bundle discount", min: 2, max: 8, step: 1 },
    { key: "tier2Off", label: "Tier 2: discount", type: "slider", group: "Bundle discount", min: 0, max: 50, step: 1, unit: "%" },
    { key: "tier3Qty", label: "Tier 3: items", type: "slider", group: "Bundle discount", min: 2, max: 10, step: 1 },
    { key: "tier3Off", label: "Tier 3: discount", type: "slider", group: "Bundle discount", min: 0, max: 60, step: 1, unit: "%" },
    { key: "ladderLabel", label: "Ladder label", type: "text", group: "Bundle discount" },
    { key: "itemsWord", label: "“items” word", type: "text", group: "Bundle discount" },
    { key: "offLabel", label: "“off” word", type: "text", group: "Bundle discount" },
    { key: "nextText", label: "Next tier text", type: "text", group: "Bundle discount", hint: "Use {{count}} for items to go and {{percent}} for the next discount" },
    { key: "topText", label: "Top tier text", type: "text", group: "Bundle discount", hint: "Use {{percent}} for the top discount" },
    { key: "totalLabel", label: "Total label", type: "text", group: "Summary" },
    { key: "saveLabel", label: "Savings label", type: "text", group: "Summary" },
    { key: "buttonText", label: "Button text", type: "text", group: "Summary" },
    { key: "note", label: "Note under the button", type: "text", group: "Summary" },
    fontField("Typography"),
    { key: "radius", label: "Corner radius", type: "slider", group: "Layout", min: 0, max: 16, step: 1, unit: "px" },
    { key: "accent", label: "Accent (brass)", type: "color", group: "Colors" },
    { key: "bg", label: "Background", type: "color", group: "Colors" },
    { key: "textColor", label: "Text", type: "color", group: "Colors" },
    { key: "panel", label: "Panel & lines", type: "color", group: "Colors" },
    { key: "dark", label: "Photo backdrop", type: "color", group: "Colors" },
    { key: "muted", label: "Muted text", type: "color", group: "Colors" },
    { key: "buttonBg", label: "Button", type: "color", group: "Colors" },
    { key: "buttonFg", label: "Button text", type: "color", group: "Colors" },
  ],
};
