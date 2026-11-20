"use client";

import { useRef, useState } from "react";
import type { Tweak, TweakConfig } from "../types";
import { str, num, bool, list, fontStack } from "../cfg";
import { fontField } from "../fields";
import { buildSchema, section, fontFaceFor } from "../liquid";
import { ProductArt, money, toNum, type ArtKind } from "./product-art";

/* ============================================================
   Upsell Cart
   Cart with free-shipping progress, free-gift lines, a
   "complete your routine" upsell rail, a subscribe-and-save
   upgrade and a trust-backed checkout. The preview is fully
   interactive: change quantity, add upsells, toggle subscribe.
   ============================================================ */

const MONO = "ui-monospace, 'SF Mono', Menlo, monospace";
const UPSELL_ART: ArtKind[] = ["jar", "tube", "spray", "bottle"];
const GIFT_ART: ArtKind[] = ["comb", "bag", "jar", "tube"];

const defaults: TweakConfig = {
  title: "Cart",
  currency: "$",
  product: "Curl Texture Duo",
  price: "48",
  compare: "64",
  threshold: 75,
  progressText: "You're {{remaining}} away from FREE shipping",
  unlockedText: "You've unlocked FREE shipping",
  showGifts: true,
  gifts: [
    { name: "Hair Comb", value: "10" },
    { name: "Wash Bag", value: "15" },
  ],
  upsellTitle: "Complete your routine",
  upsellText: "One more product and your routine is complete",
  upsells: [
    { name: "Hair Clay", price: "12.75", compare: "23" },
    { name: "Texture Powder", price: "12.75", compare: "23" },
    { name: "Sea Salt Spray", price: "16", compare: "24" },
  ],
  addText: "Add +",
  showSubscribe: true,
  subscribeTitle: "Upgrade to Subscribe & Save",
  subscribeText: "Same routine, better value, delivered on your schedule",
  subscribeDiscount: 15,
  checkoutText: "Secure Checkout",
  showTrust: true,
  trustText: "Trusted by 300,000+ customers",
  accent: "#1e2a44",
  accentText: "#ffffff",
  bg: "#ffffff",
  panel: "#f4f4f2",
  card: "#ffffff",
  textColor: "#161616",
  muted: "#7a7a76",
  font: "inherit",
  radius: 18,
};

/** Bold every "FREE" so the reward pops, like the reference design. */
function Emph({ text }: { text: string }) {
  return (
    <>
      {text.split(/(FREE)/).map((part, i) =>
        part === "FREE" ? <b key={i}>FREE</b> : <span key={i}>{part}</span>,
      )}
    </>
  );
}

function Stars({ color }: { color: string }) {
  return (
    <span className="inline-flex gap-[2px]" aria-hidden>
      {Array.from({ length: 5 }, (_, i) => (
        <svg key={i} width="12" height="12" viewBox="0 0 24 24" fill={color}>
          <path d="M12 2.8l2.8 6 6.5.6-4.9 4.4 1.4 6.4L12 16.9l-5.8 3.3 1.4-6.4-4.9-4.4 6.5-.6z" />
        </svg>
      ))}
    </span>
  );
}

function Preview({ config }: { config: TweakConfig }) {
  const cur = str(config, "currency", "$");
  const accent = str(config, "accent", "#1e2a44");
  const accentText = str(config, "accentText", "#fff");
  const text = str(config, "textColor", "#161616");
  const muted = str(config, "muted", "#7a7a76");
  const card = str(config, "card", "#fff");
  const panel = str(config, "panel", "#f4f4f2");
  const radius = num(config, "radius", 18);
  const inner = Math.max(6, radius - 6);

  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState<number[]>([]);
  const [sub, setSub] = useState(false);
  const [page, setPage] = useState(0);
  const rail = useRef<HTMLDivElement>(null);

  const upsells = list(config, "upsells");
  const gifts = bool(config, "showGifts", true) ? list(config, "gifts") : [];
  const showSub = bool(config, "showSubscribe", true);
  const off = showSub && sub ? num(config, "subscribeDiscount", 15) / 100 : 0;

  const lines = [
    {
      key: "main",
      name: str(config, "product"),
      price: toNum(str(config, "price"), 48),
      compare: toNum(str(config, "compare")),
      qty,
      art: "bottle" as ArtKind,
      upsell: -1,
    },
    ...added
      .filter((i) => i < upsells.length)
      .map((i) => ({
        key: `u${i}`,
        name: upsells[i].name ?? "",
        price: toNum(upsells[i].price),
        compare: toNum(upsells[i].compare),
        qty: 1,
        art: UPSELL_ART[i % UPSELL_ART.length],
        upsell: i,
      })),
  ];

  const subtotal = lines.reduce((s, l) => s + l.price * l.qty * (1 - off), 0);
  const compareTotal =
    lines.reduce((s, l) => s + Math.max(l.compare, l.price) * l.qty, 0) +
    gifts.reduce((s, g) => s + toNum(g.value), 0);
  const savings = Math.max(0, compareTotal - subtotal);
  const count = lines.reduce((s, l) => s + l.qty, 0) + gifts.length;
  const threshold = num(config, "threshold", 75);
  const remaining = Math.max(0, threshold - subtotal);
  const pct = threshold > 0 ? Math.min(100, (subtotal / threshold) * 100) : 100;

  const toggleUpsell = (i: number) =>
    setAdded((a) => (a.includes(i) ? a.filter((x) => x !== i) : [...a, i]));

  const onRailScroll = () => {
    const el = rail.current;
    if (!el || !el.firstElementChild) return;
    const step = (el.firstElementChild as HTMLElement).offsetWidth + 8;
    setPage(Math.round(el.scrollLeft / step));
  };

  return (
    <div
      className="@container w-full"
      style={{
        fontFamily: fontStack(str(config, "font", "inherit")),
        background: "linear-gradient(180deg,#ecebe8,#e4e3df)",
      }}
    >
      <div
        className="mx-auto w-full max-w-[420px] overflow-hidden @min-[520px]:my-8 @min-[520px]:shadow-[0_30px_80px_-30px_rgba(0,0,0,0.35)]"
        style={{
          background: str(config, "bg", "#fff"),
          color: text,
          borderRadius: radius + 6,
        }}
      >
        {/* Header */}
        <div className="flex items-center gap-2 px-5 pb-3 pt-5">
          <h3 className="text-[22px] font-medium tracking-[-0.02em]">
            {str(config, "title", "Cart")}
          </h3>
          <span
            className="rounded-full px-2 py-[3px] text-[10.5px] uppercase tracking-[0.06em]"
            style={{ background: panel, fontFamily: MONO }}
          >
            {count} items
          </span>
          <button
            type="button"
            aria-label="Close cart"
            className="ml-auto grid h-9 w-9 place-items-center rounded-full transition-[filter] hover:brightness-95"
            style={{ background: panel }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden>
              <path d="M2 2l8 8M10 2l-8 8" stroke={text} strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="mx-3 p-3" style={{ background: panel, borderRadius: radius }}>
          {/* Free shipping progress */}
          <div className="px-1 pb-3 pt-1">
            <div className="h-2 overflow-hidden rounded-full bg-black/[0.08]">
              <div
                className="h-full rounded-full transition-[width] duration-700 ease-[cubic-bezier(.22,1,.36,1)]"
                style={{ width: `${pct}%`, background: accent }}
              />
            </div>
            <p className="mt-2 text-center text-[12.5px]">
              <Emph
                text={
                  remaining <= 0
                    ? str(config, "unlockedText")
                    : str(config, "progressText").replace(
                        "{{remaining}}",
                        money(remaining, cur),
                      )
                }
              />
            </p>
          </div>

          {/* Lines */}
          <div className="flex flex-col gap-2">
            {lines.map((l) => (
              <div
                key={l.key}
                className={`flex items-center gap-3 p-3 ${l.upsell >= 0 ? "bs-fade-up" : ""}`}
                style={{ background: card, borderRadius: inner }}
              >
                <ProductArt kind={l.art} tone={accent} size={60} radius={Math.max(6, inner - 4)} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px]">{l.name}</p>
                  {l.upsell < 0 ? (
                    <div
                      className="mt-2 inline-flex h-8 items-center rounded-full p-[3px] shadow-[0_0_0_1px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.05)]"
                      style={{ background: card }}
                    >
                      <button
                        type="button"
                        aria-label="Decrease quantity"
                        onClick={() => setQty((q) => Math.max(1, q - 1))}
                        className="grid h-[26px] w-[26px] place-items-center rounded-full text-[14px] transition-colors hover:bg-black/[0.05]"
                      >
                        −
                      </button>
                      <span className="w-7 text-center text-[12.5px] tabular-nums" style={{ fontFamily: MONO }}>
                        {String(qty).padStart(2, "0")}
                      </span>
                      <button
                        type="button"
                        aria-label="Increase quantity"
                        onClick={() => setQty((q) => Math.min(9, q + 1))}
                        className="grid h-[26px] w-[26px] place-items-center rounded-full text-[14px] transition-colors hover:bg-black/[0.05]"
                      >
                        +
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => toggleUpsell(l.upsell)}
                      className="mt-1 text-[12px] underline underline-offset-2 transition-opacity hover:opacity-70"
                      style={{ color: muted }}
                    >
                      remove
                    </button>
                  )}
                </div>
                <div className="shrink-0 text-right text-[13.5px] tabular-nums">
                  {l.compare > l.price * (1 - off) && (
                    <span className="mr-1.5 line-through" style={{ color: muted }}>
                      {money(Math.max(l.compare, l.price) * l.qty, cur)}
                    </span>
                  )}
                  {money(l.price * l.qty * (1 - off), cur)}
                </div>
              </div>
            ))}

            {gifts.map((g, i) => (
              <div
                key={`g${i}`}
                className="flex items-center gap-3 p-3"
                style={{ background: card, borderRadius: inner }}
              >
                <ProductArt kind={GIFT_ART[i % GIFT_ART.length]} tone={accent} size={60} radius={Math.max(6, inner - 4)} />
                <div className="min-w-0 flex-1">
                  <p className="text-[10.5px] uppercase tracking-[0.08em]" style={{ fontFamily: MONO, color: accent }}>
                    Free gift
                  </p>
                  <p className="truncate text-[14px]">{g.name}</p>
                </div>
                <div className="shrink-0 text-[13.5px] tabular-nums">
                  {toNum(g.value) > 0 && (
                    <span className="mr-1.5 line-through" style={{ color: muted }}>
                      {money(toNum(g.value), cur)}
                    </span>
                  )}
                  FREE
                </div>
              </div>
            ))}
          </div>

          {/* Upsell rail */}
          {upsells.length > 0 && (
            <div className="pt-6">
              <p className="px-1 text-[15px] font-medium tracking-[-0.01em]">
                {str(config, "upsellTitle")}
              </p>
              <p className="mt-0.5 px-1 text-[12.5px]" style={{ color: muted }}>
                {str(config, "upsellText")}
              </p>
              <div
                ref={rail}
                onScroll={onRailScroll}
                className="bs-no-scrollbar -mx-3 mt-3 flex snap-x snap-mandatory gap-2 overflow-x-auto scroll-px-3 px-3"
              >
                {upsells.map((u, i) => {
                  const on = added.includes(i);
                  return (
                    <div
                      key={i}
                      className="flex w-[82%] shrink-0 snap-start items-center gap-3 p-3"
                      style={{ background: card, borderRadius: inner }}
                    >
                      <ProductArt kind={UPSELL_ART[i % UPSELL_ART.length]} tone={accent} size={52} radius={Math.max(6, inner - 6)} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13.5px]">{u.name}</p>
                        <p className="mt-0.5 text-[13px] tabular-nums">
                          {toNum(u.compare) > toNum(u.price) && (
                            <span className="mr-1.5 line-through" style={{ color: muted }}>
                              {money(toNum(u.compare), cur)}
                            </span>
                          )}
                          {money(toNum(u.price), cur)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleUpsell(i)}
                        aria-pressed={on}
                        className="h-8 shrink-0 rounded-full px-3.5 text-[12.5px] font-medium transition-[background-color,color,transform] duration-200 active:scale-95"
                        style={
                          on
                            ? { background: accent, color: accentText }
                            : { background: panel, color: text }
                        }
                      >
                        {on ? "Added ✓" : str(config, "addText", "Add +")}
                      </button>
                    </div>
                  );
                })}
              </div>
              {upsells.length > 1 && (
                <div className="mt-3 flex justify-center gap-1" aria-hidden>
                  {upsells.map((_, i) => (
                    <span
                      key={i}
                      className="h-[2px] rounded-full transition-all duration-300"
                      style={{
                        width: i === page ? 26 : 14,
                        background: i === page ? accent : "rgba(0,0,0,0.12)",
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Subscribe upgrade */}
          {showSub && (
            <button
              type="button"
              role="switch"
              aria-checked={sub}
              onClick={() => setSub((s) => !s)}
              className="mt-4 flex w-full items-center gap-3 p-4 text-left"
              style={{ background: card, borderRadius: inner }}
            >
              <span className="min-w-0 flex-1">
                <span className="block text-[14px] font-medium">
                  {str(config, "subscribeTitle")}
                </span>
                <span className="mt-0.5 block text-[12.5px] leading-snug" style={{ color: muted }}>
                  {str(config, "subscribeText")}
                </span>
              </span>
              <span
                className="relative h-7 w-12 shrink-0 rounded-full transition-colors duration-300"
                style={{ background: sub ? accent : "#d5d5d1" }}
              >
                <span
                  className="absolute left-[3px] top-[3px] h-[22px] w-[22px] rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.2)] transition-transform duration-300 ease-[cubic-bezier(.34,1.56,.64,1)]"
                  style={{ transform: sub ? "translateX(20px)" : "none" }}
                />
              </span>
            </button>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 pt-4">
          <div className="flex items-center gap-2 text-[14px]">
            <span className="font-medium">Subtotal:</span>
            <span style={{ color: muted }}>{count} items</span>
            <span className="ml-auto flex items-center gap-2 tabular-nums">
              {savings > 0.005 && (
                <span className="line-through" style={{ color: muted }}>
                  {money(compareTotal, cur)}
                </span>
              )}
              <b className="text-[16px] font-semibold">{money(subtotal, cur)}</b>
            </span>
          </div>
          {savings > 0.005 && (
            <div className="mt-1 flex justify-end">
              <span
                className="rounded-full px-2 py-[3px] text-[10.5px] uppercase tracking-[0.06em]"
                style={{ background: panel, fontFamily: MONO }}
              >
                You save {money(savings, cur)}
              </span>
            </div>
          )}
          <button
            type="button"
            className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-full text-[15px] font-medium transition-[filter,transform] duration-200 hover:brightness-110 active:scale-[0.99]"
            style={{ background: accent, color: accentText }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              <rect x="5" y="10.5" width="14" height="10" rx="2" />
              <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
            </svg>
            {str(config, "checkoutText", "Secure Checkout")}
          </button>
          {bool(config, "showTrust", true) && (
            <p
              className="mt-3 flex items-center justify-center gap-2 text-[10.5px] uppercase tracking-[0.06em]"
              style={{ fontFamily: MONO }}
            >
              <Stars color={accent} />
              {str(config, "trustText")}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function generateLiquid(config: TweakConfig): string {
  const { face, family } = fontFaceFor(str(config, "font", "inherit"));
  const r = "{{ section.settings.radius }}px";
  const ri = "{{ section.settings.radius | minus: 6 | at_least: 6 }}px";
  const S = ".bs-cu-{{ section.id }}";

  const style = `<style>
${face ? face + "\n" : ""}  ${S} { max-width: 440px; margin: 0 auto; background: {{ section.settings.bg }}; color: {{ section.settings.text_color }};
    font-family: ${family}; border-radius: {{ section.settings.radius | plus: 6 }}px; overflow: hidden; }
  ${S} * { box-sizing: border-box; }
  ${S} p { margin: 0; }
  ${S} a { color: inherit; text-decoration: none; }
  ${S} .bs-mono { font-family: ui-monospace, 'SF Mono', Menlo, monospace; text-transform: uppercase; letter-spacing: .06em; font-size: 10.5px; }
  ${S} .bs-head { display: flex; align-items: center; gap: 8px; padding: 20px 20px 12px; }
  ${S} .bs-head h2 { margin: 0; font-size: 22px; font-weight: 500; letter-spacing: -.02em; }
  ${S} .bs-pill { background: {{ section.settings.panel }}; border-radius: 99px; padding: 3px 8px; }
  ${S} .bs-close { margin-left: auto; width: 36px; height: 36px; border-radius: 99px; display: grid; place-items: center; background: {{ section.settings.panel }}; }
  ${S} .bs-panel { margin: 0 12px; padding: 12px; background: {{ section.settings.panel }}; border-radius: ${r}; }
  ${S} .bs-ship { padding: 4px 4px 12px; text-align: center; font-size: 12.5px; }
  ${S} .bs-track { height: 8px; border-radius: 99px; background: rgba(0,0,0,.08); overflow: hidden; margin-bottom: 8px; }
  ${S} .bs-fill { height: 100%; border-radius: 99px; background: {{ section.settings.accent }}; transition: width .7s cubic-bezier(.22,1,.36,1); }
  ${S} .bs-lines { display: flex; flex-direction: column; gap: 8px; }
  ${S} .bs-line { display: flex; align-items: center; gap: 12px; padding: 12px; background: {{ section.settings.card }}; border-radius: ${ri}; }
  ${S} .bs-img { width: 60px; height: 60px; flex-shrink: 0; border-radius: 10px; overflow: hidden; background: #f3f3f1; display: block; }
  ${S} .bs-img img { width: 100%; height: 100%; object-fit: cover; display: block; }
  ${S} .bs-mid { flex: 1; min-width: 0; }
  ${S} .bs-name { font-size: 14px; display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  ${S} .bs-var { font-size: 12px; color: {{ section.settings.muted }}; margin-top: 2px; }
  ${S} .bs-gift { color: {{ section.settings.accent }}; letter-spacing: .08em; }
  ${S} .bs-qty { margin-top: 8px; display: inline-flex; align-items: center; height: 32px; padding: 3px; border-radius: 99px;
    background: {{ section.settings.card }}; box-shadow: 0 0 0 1px rgba(0,0,0,.06), 0 1px 2px rgba(0,0,0,.05); }
  ${S} .bs-qty a { width: 26px; height: 26px; border-radius: 99px; display: grid; place-items: center; font-size: 14px; }
  ${S} .bs-qty a:hover { background: rgba(0,0,0,.05); }
  ${S} .bs-qty span { width: 28px; text-align: center; font-size: 12.5px; font-family: ui-monospace, 'SF Mono', Menlo, monospace; }
  ${S} .bs-end { text-align: right; flex-shrink: 0; font-size: 13.5px; }
  ${S} s { color: {{ section.settings.muted }}; margin-right: 6px; }
  ${S} .bs-remove { display: inline-block; margin-top: 10px; font-size: 12px; color: {{ section.settings.muted }}; text-decoration: underline; text-underline-offset: 2px; }
  ${S} .bs-ups { padding-top: 24px; }
  ${S} .bs-ups-t { padding: 0 4px; font-size: 15px; font-weight: 500; }
  ${S} .bs-ups-x { padding: 2px 4px 0; font-size: 12.5px; color: {{ section.settings.muted }}; }
  ${S} .bs-rail { display: flex; gap: 8px; overflow-x: auto; scroll-snap-type: x mandatory; margin: 12px -12px 0; padding: 0 12px; scroll-padding: 0 12px; scrollbar-width: none; }
  ${S} .bs-rail::-webkit-scrollbar { display: none; }
  ${S} .bs-up { flex: 0 0 82%; scroll-snap-align: start; display: flex; align-items: center; gap: 12px; padding: 12px; background: {{ section.settings.card }}; border-radius: ${ri}; }
  ${S} .bs-up .bs-img { width: 52px; height: 52px; }
  ${S} .bs-up form { margin: 0; flex-shrink: 0; }
  ${S} .bs-add { height: 32px; padding: 0 14px; border: 0; border-radius: 99px; cursor: pointer; font: inherit; font-size: 12.5px; font-weight: 500;
    background: {{ section.settings.panel }}; color: {{ section.settings.text_color }}; transition: transform .15s; }
  ${S} .bs-add:active { transform: scale(.95); }
  ${S} .bs-sub { margin: 16px 0 0; display: flex; align-items: center; gap: 12px; padding: 16px; background: {{ section.settings.card }}; border-radius: ${ri}; }
  ${S} .bs-sub-t { font-size: 14px; font-weight: 500; }
  ${S} .bs-sub-x { font-size: 12.5px; color: {{ section.settings.muted }}; margin-top: 2px; line-height: 1.4; }
  ${S} .bs-switch { position: relative; width: 48px; height: 28px; flex-shrink: 0; border: 0; border-radius: 99px; background: #d5d5d1; cursor: pointer; transition: background .3s; }
  ${S} .bs-switch::after { content: ""; position: absolute; left: 3px; top: 3px; width: 22px; height: 22px; border-radius: 99px; background: #fff;
    box-shadow: 0 1px 3px rgba(0,0,0,.2); transition: transform .3s cubic-bezier(.34,1.56,.64,1); }
  ${S} .bs-switch[aria-checked="true"] { background: {{ section.settings.accent }}; }
  ${S} .bs-switch[aria-checked="true"]::after { transform: translateX(20px); }
  ${S} .bs-foot { padding: 16px 20px 20px; }
  ${S} .bs-sum { display: flex; align-items: center; gap: 8px; font-size: 14px; }
  ${S} .bs-sum .bs-count { color: {{ section.settings.muted }}; }
  ${S} .bs-tot { margin-left: auto; display: flex; align-items: center; gap: 6px; }
  ${S} .bs-tot b { font-size: 16px; font-weight: 600; }
  ${S} .bs-save { display: flex; justify-content: flex-end; margin-top: 4px; }
  ${S} .bs-checkout { margin-top: 12px; width: 100%; height: 48px; border: 0; border-radius: 99px; cursor: pointer; font: inherit; font-size: 15px; font-weight: 500;
    display: flex; align-items: center; justify-content: center; gap: 8px;
    background: {{ section.settings.accent }}; color: {{ section.settings.accent_text }}; transition: filter .2s, transform .2s; }
  ${S} .bs-checkout:hover { filter: brightness(1.1); }
  ${S} .bs-checkout:active { transform: scale(.99); }
  ${S} .bs-trust { margin-top: 12px; display: flex; align-items: center; justify-content: center; gap: 8px; }
  ${S} .bs-trust svg { fill: {{ section.settings.accent }}; }
  ${S} .bs-empty { padding: 32px 12px; text-align: center; font-size: 14px; color: {{ section.settings.muted }}; }
</style>`;

  const markup = `{%- comment -%}
  Upsell Cart by boost.supply. Add it to your cart page (or render it in
  your cart drawer with the Section Rendering API).
  - Free gifts: any line that costs 0 (e.g. from an automatic "Buy X get Y"
    discount) is shown as a FREE GIFT row.
  - Upsells: pick products under "Upsell products"; items already in the
    cart are skipped.
  - Subscribe & Save: appears when a cart item has a selling plan.
{%- endcomment -%}
{%- assign bs_threshold = section.settings.threshold | times: 100 -%}
{%- assign bs_remaining = bs_threshold | minus: cart.total_price -%}
{%- assign bs_pct = cart.total_price | times: 100.0 | divided_by: bs_threshold -%}
{%- if bs_pct > 100 -%}{%- assign bs_pct = 100 -%}{%- endif -%}
<div class="bs-cu-{{ section.id }}">
  <div class="bs-head">
    <h2>{{ section.settings.title }}</h2>
    <span class="bs-pill bs-mono">{{ cart.item_count }} items</span>
    <a class="bs-close" href="{{ routes.all_products_collection_url }}" aria-label="Continue shopping">
      <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
    </a>
  </div>

  {%- if cart.item_count == 0 -%}
    <p class="bs-empty">Your cart is empty.</p>
  {%- else -%}
  <div class="bs-panel">
    <div class="bs-ship">
      <div class="bs-track"><div class="bs-fill" style="width: {{ bs_pct }}%;"></div></div>
      {%- if bs_remaining <= 0 -%}
        <p>{{ section.settings.unlocked_text | replace: 'FREE', '<b>FREE</b>' }}</p>
      {%- else -%}
        {%- comment -%} Build the remaining-amount token here: curly pairs inside an output tag would break the Liquid parser {%- endcomment -%}
        {%- assign bs_open = '{' | append: '{' -%}
        {%- assign bs_close = '}' | append: '}' -%}
        {%- assign bs_token = bs_open | append: 'remaining' | append: bs_close -%}
        {%- assign bs_rem_money = bs_remaining | money_without_trailing_zeros -%}
        <p>{{ section.settings.progress_text | replace: bs_token, bs_rem_money | replace: 'FREE', '<b>FREE</b>' }}</p>
      {%- endif -%}
    </div>

    <div class="bs-lines">
      {%- for item in cart.items -%}
        <div class="bs-line">
          <a class="bs-img" href="{{ item.url }}">
            {%- if item.image -%}{{ item.image | image_url: width: 160 | image_tag: loading: 'lazy', alt: item.product.title }}{%- endif -%}
          </a>
          <div class="bs-mid">
            {%- if item.final_line_price == 0 -%}
              <p class="bs-mono bs-gift">Free gift</p>
              <a class="bs-name" href="{{ item.url }}">{{ item.product.title }}</a>
            {%- else -%}
              <a class="bs-name" href="{{ item.url }}">{{ item.product.title }}</a>
              {%- unless item.product.has_only_default_variant -%}<p class="bs-var">{{ item.variant.title }}</p>{%- endunless -%}
              {%- if item.selling_plan_allocation -%}<p class="bs-var">{{ item.selling_plan_allocation.selling_plan.name }}</p>{%- endif -%}
              <div class="bs-qty">
                <a href="{{ routes.cart_change_url }}?line={{ forloop.index }}&quantity={{ item.quantity | minus: 1 }}" aria-label="Decrease quantity">−</a>
                <span>{{ item.quantity | prepend: '0' | slice: -2, 2 }}</span>
                <a href="{{ routes.cart_change_url }}?line={{ forloop.index }}&quantity={{ item.quantity | plus: 1 }}" aria-label="Increase quantity">+</a>
              </div>
            {%- endif -%}
          </div>
          <div class="bs-end">
            {%- assign bs_cmp = item.variant.compare_at_price | times: item.quantity -%}
            {%- if item.final_line_price == 0 -%}
              {%- if item.original_line_price > 0 -%}<s>{{ item.original_line_price | money }}</s>{%- endif -%}FREE
            {%- else -%}
              {%- if item.original_line_price > item.final_line_price -%}<s>{{ item.original_line_price | money }}</s>
              {%- elsif bs_cmp > item.final_line_price -%}<s>{{ bs_cmp | money }}</s>{%- endif -%}
              {{ item.final_line_price | money }}
              <br><a class="bs-remove" href="{{ routes.cart_change_url }}?line={{ forloop.index }}&quantity=0">remove</a>
            {%- endif -%}
          </div>
        </div>
      {%- endfor -%}
    </div>

    {%- if section.settings.upsell_products != blank -%}
      <div class="bs-ups">
        <p class="bs-ups-t">{{ section.settings.upsell_title }}</p>
        <p class="bs-ups-x">{{ section.settings.upsell_text }}</p>
        <div class="bs-rail">
          {%- for bs_p in section.settings.upsell_products -%}
            {%- assign bs_in_cart = false -%}
            {%- for item in cart.items -%}{%- if item.product_id == bs_p.id -%}{%- assign bs_in_cart = true -%}{%- endif -%}{%- endfor -%}
            {%- unless bs_in_cart or bs_p.available == false -%}
              <div class="bs-up">
                <a class="bs-img" href="{{ bs_p.url }}">{%- if bs_p.featured_image -%}{{ bs_p.featured_image | image_url: width: 160 | image_tag: loading: 'lazy', alt: bs_p.title }}{%- endif -%}</a>
                <div class="bs-mid">
                  <p class="bs-name">{{ bs_p.title }}</p>
                  <p style="font-size:13px;margin-top:2px">{%- if bs_p.compare_at_price > bs_p.price -%}<s>{{ bs_p.compare_at_price | money }}</s>{%- endif -%}{{ bs_p.price | money }}</p>
                </div>
                <form action="{{ routes.cart_add_url }}" method="post">
                  <input type="hidden" name="id" value="{{ bs_p.selected_or_first_available_variant.id }}">
                  <input type="hidden" name="quantity" value="1">
                  <button type="submit" class="bs-add">{{ section.settings.add_text }}</button>
                </form>
              </div>
            {%- endunless -%}
          {%- endfor -%}
        </div>
      </div>
    {%- endif -%}

    {%- liquid
      assign bs_sub_line = 0
      for item in cart.items
        if bs_sub_line == 0 and item.product.selling_plan_groups.size > 0 and item.final_line_price > 0
          assign bs_sub_line = forloop.index
          assign bs_sub_item = item
        endif
      endfor
    -%}
    {%- if section.settings.show_subscribe and bs_sub_line > 0 -%}
      {%- assign bs_plan = bs_sub_item.product.selling_plan_groups.first.selling_plans.first -%}
      <form class="bs-sub" action="{{ routes.cart_change_url }}" method="post">
        <input type="hidden" name="line" value="{{ bs_sub_line }}">
        <input type="hidden" name="quantity" value="{{ bs_sub_item.quantity }}">
        {%- comment -%} An empty selling_plan switches the item back to one-time {%- endcomment -%}
        <input type="hidden" name="selling_plan" value="{% if bs_sub_item.selling_plan_allocation == blank %}{{ bs_plan.id }}{% endif %}">
        <div style="flex:1;min-width:0">
          <p class="bs-sub-t">{{ section.settings.subscribe_title }}</p>
          <p class="bs-sub-x">{{ section.settings.subscribe_text }}</p>
        </div>
        <button type="submit" class="bs-switch" role="switch" aria-checked="{% if bs_sub_item.selling_plan_allocation %}true{% else %}false{% endif %}" aria-label="{{ section.settings.subscribe_title | escape }}"></button>
      </form>
    {%- endif -%}
  </div>

  <div class="bs-foot">
    <div class="bs-sum">
      <b>Subtotal:</b><span class="bs-count">{{ cart.item_count }} items</span>
      <p class="bs-tot">
        {%- if cart.original_total_price > cart.total_price -%}<s>{{ cart.original_total_price | money }}</s>{%- endif -%}
        <b>{{ cart.total_price | money }}</b>
      </p>
    </div>
    {%- if cart.total_discount > 0 -%}
      <div class="bs-save"><span class="bs-pill bs-mono">You save {{ cart.total_discount | money }}</span></div>
    {%- endif -%}
    <form action="{{ routes.cart_url }}" method="post">
      <button type="submit" name="checkout" class="bs-checkout">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/></svg>
        {{ section.settings.checkout_text }}
      </button>
    </form>
    {%- if section.settings.show_trust -%}
      <p class="bs-trust bs-mono">
        <span aria-hidden="true">{%- for i in (1..5) -%}<svg width="12" height="12" viewBox="0 0 24 24"><path d="M12 2.8l2.8 6 6.5.6-4.9 4.4 1.4 6.4L12 16.9l-5.8 3.3 1.4-6.4-4.9-4.4 6.5-.6z"/></svg>{%- endfor -%}</span>
        {{ section.settings.trust_text }}
      </p>
    {%- endif -%}
  </div>
  {%- endif -%}
</div>`;

  const schema = buildSchema({
    name: "Upsell Cart",
    settings: [
      { type: "text", id: "title", label: "Title", default: str(config, "title") },
      { type: "header", content: "Free shipping" },
      { type: "range", id: "threshold", label: "Free shipping threshold", min: 10, max: 300, step: 5, unit: str(config, "currency", "$"), default: num(config, "threshold") },
      { type: "text", id: "progress_text", label: "Progress text (use {{remaining}})", default: str(config, "progressText") },
      { type: "text", id: "unlocked_text", label: "Unlocked text", default: str(config, "unlockedText") },
      { type: "header", content: "Upsells" },
      { type: "product_list", id: "upsell_products", label: "Upsell products", limit: 8 },
      { type: "text", id: "upsell_title", label: "Upsell title", default: str(config, "upsellTitle") },
      { type: "text", id: "upsell_text", label: "Upsell subtitle", default: str(config, "upsellText") },
      { type: "text", id: "add_text", label: "Add button", default: str(config, "addText") },
      { type: "header", content: "Subscribe & Save" },
      { type: "checkbox", id: "show_subscribe", label: "Show subscribe upgrade", default: bool(config, "showSubscribe") },
      { type: "text", id: "subscribe_title", label: "Title", default: str(config, "subscribeTitle") },
      { type: "text", id: "subscribe_text", label: "Text", default: str(config, "subscribeText") },
      { type: "header", content: "Checkout" },
      { type: "text", id: "checkout_text", label: "Checkout button", default: str(config, "checkoutText") },
      { type: "checkbox", id: "show_trust", label: "Show trust line", default: bool(config, "showTrust") },
      { type: "text", id: "trust_text", label: "Trust line", default: str(config, "trustText") },
      { type: "header", content: "Style" },
      { type: "color", id: "accent", label: "Accent", default: str(config, "accent") },
      { type: "color", id: "accent_text", label: "Accent text", default: str(config, "accentText") },
      { type: "color", id: "bg", label: "Background", default: str(config, "bg") },
      { type: "color", id: "panel", label: "Panel", default: str(config, "panel") },
      { type: "color", id: "card", label: "Cards", default: str(config, "card") },
      { type: "color", id: "text_color", label: "Text", default: str(config, "textColor") },
      { type: "color", id: "muted", label: "Muted text", default: str(config, "muted") },
      { type: "range", id: "radius", label: "Corner radius", min: 6, max: 28, step: 2, unit: "px", default: num(config, "radius") },
    ],
  });

  return section({ style, markup, schema });
}

export const cartUpsell: Tweak = {
  slug: "upsell-cart",
  name: "Upsell Cart",
  tagline: "A cart that sells: free-shipping progress, gifts, upsells and subscribe & save.",
  description:
    "Turns the cart into an AOV engine. A free-shipping progress bar, free-gift lines, a swipeable “complete your routine” upsell rail and a one-tap subscribe & save upgrade, finished with a trust-backed checkout button. Reads the real cart in Liquid and works without extra apps.",
  category: "cart",
  tier: "paid",
  price: 39,
  tint: "#eef0f4",
  Preview,
  generateLiquid,
  defaults,
  fields: [
    { key: "title", label: "Title", type: "text", group: "Content" },
    { key: "product", label: "Preview product", type: "text", group: "Content", hint: "Editor preview only; the real cart shows its own items" },
    { key: "price", label: "Preview price", type: "text", group: "Content" },
    { key: "compare", label: "Preview compare-at", type: "text", group: "Content" },
    { key: "currency", label: "Currency symbol", type: "text", group: "Content" },
    { key: "threshold", label: "Free shipping at", type: "slider", group: "Free shipping", min: 10, max: 300, step: 5, unit: "$" },
    { key: "progressText", label: "Progress text", type: "text", group: "Free shipping", hint: "Use {{remaining}} for the amount left" },
    { key: "unlockedText", label: "Unlocked text", type: "text", group: "Free shipping" },
    { key: "showGifts", label: "Show free gifts", type: "toggle", group: "Free gifts" },
    {
      key: "gifts", label: "Gifts", type: "list", group: "Free gifts",
      hint: "Preview only. In your store, any line priced at 0 (e.g. from a Buy X Get Y discount) shows as a free gift",
      itemFields: [
        { key: "name", label: "Name", type: "text" },
        { key: "value", label: "Value", type: "text" },
      ],
      newItem: { name: "Travel Pouch", value: "12" }, addLabel: "Add gift", max: 4,
    },
    { key: "upsellTitle", label: "Title", type: "text", group: "Upsells" },
    { key: "upsellText", label: "Subtitle", type: "text", group: "Upsells" },
    { key: "addText", label: "Add button", type: "text", group: "Upsells" },
    {
      key: "upsells", label: "Upsell products", type: "list", group: "Upsells",
      hint: "Preview only. Pick the real products in the Shopify theme editor",
      itemFields: [
        { key: "name", label: "Name", type: "text" },
        { key: "price", label: "Price", type: "text" },
        { key: "compare", label: "Compare-at", type: "text" },
      ],
      newItem: { name: "Scalp Serum", price: "18", compare: "26" }, addLabel: "Add product", max: 6,
    },
    { key: "showSubscribe", label: "Show subscribe upgrade", type: "toggle", group: "Subscribe & Save" },
    { key: "subscribeTitle", label: "Title", type: "text", group: "Subscribe & Save" },
    { key: "subscribeText", label: "Text", type: "textarea", group: "Subscribe & Save" },
    { key: "subscribeDiscount", label: "Preview discount", type: "slider", group: "Subscribe & Save", min: 5, max: 40, step: 1, unit: "%" },
    { key: "checkoutText", label: "Checkout button", type: "text", group: "Checkout" },
    { key: "showTrust", label: "Show trust line", type: "toggle", group: "Checkout" },
    { key: "trustText", label: "Trust line", type: "text", group: "Checkout" },
    fontField("Typography"),
    { key: "radius", label: "Corner radius", type: "slider", group: "Layout", min: 6, max: 28, step: 2, unit: "px" },
    { key: "accent", label: "Accent", type: "color", group: "Colors" },
    { key: "accentText", label: "Accent text", type: "color", group: "Colors" },
    { key: "bg", label: "Background", type: "color", group: "Colors" },
    { key: "panel", label: "Panel", type: "color", group: "Colors" },
    { key: "card", label: "Cards", type: "color", group: "Colors" },
    { key: "textColor", label: "Text", type: "color", group: "Colors" },
    { key: "muted", label: "Muted text", type: "color", group: "Colors" },
  ],
};
