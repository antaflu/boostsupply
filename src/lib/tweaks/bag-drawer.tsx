"use client";

import { useRef, useState } from "react";
import type { Tweak, TweakConfig } from "../types";
import { str, num, bool, list, fontStack } from "../cfg";
import { fontField } from "../fields";
import { buildSchema, section, fontFaceFor } from "../liquid";
import { ProductArt, money, toNum, type ArtKind } from "./product-art";

/* ============================================================
   Bag Drawer
   A complete pink-accented cart drawer: a two-milestone tracker
   (free express shipping, then a free gift), line items with a
   size chip, stepper and remove, an applied "set savings" line,
   a "complete your routine" quick-add rail and a checkout footer.
   The preview is fully interactive.
   ============================================================ */

const MONO = "ui-monospace, 'SF Mono', Menlo, monospace";
const EASE = "cubic-bezier(.22,1,.36,1)";
const ART: ArtKind[] = ["bottle", "jar", "tube", "spray", "jar"];

const defaults: TweakConfig = {
  title: "Your bag",
  currency: "$",
  items: [
    { name: "Cloud Serum", detail: "Hydrating serum", size: "30 ml", price: "28", qty: "1", image: "/mockups/set-serum.jpg" },
    { name: "Whipped Cream", detail: "Daily moisturizer", size: "50 ml", price: "26", qty: "1", image: "/mockups/set-cream.jpg" },
    { name: "Gel Wash", detail: "Gentle cleanser", size: "150 ml", price: "18", qty: "1", image: "/mockups/set-cleanser.jpg" },
  ],
  shipThreshold: 50,
  shipLabel: "Express shipping",
  shipText: "You're {{remaining}} away from free express shipping",
  giftThreshold: 80,
  giftLabel: "Free gift",
  giftText: "Express shipping is on us. {{remaining}} more for a free gift",
  doneText: "Free express shipping and a free gift, unlocked",
  giftName: "Mini Lip Balm",
  giftValue: "12",
  giftImage: "",
  showSet: true,
  setLabel: "Set savings",
  setMinQty: 3,
  setPct: 10,
  setHint: "Add {{count}} more for {{percent}} set savings",
  upsellTitle: "Complete your routine",
  upsells: [
    { name: "Dew Mist", detail: "Hydrating face mist", price: "22", image: "/mockups/set-mist.jpg" },
    { name: "Petal Balm", detail: "Multi-use balm", price: "14", image: "/mockups/set-balm.jpg" },
  ],
  addText: "Add",
  subtotalLabel: "Subtotal",
  noteText: "Taxes and shipping calculated at checkout",
  checkoutText: "Check out",
  bg: "#FFFFFF",
  textColor: "#000000",
  pink: "#FBD1DA",
  accent: "#0600FF",
  tile: "#F7F7F7",
  muted: "#6B6B6B",
  buttonBg: "#000000",
  buttonText2: "#FFFFFF",
  font: "system",
  radius: 12,
};

/** Hex colour + alpha byte. */
const tint = (hex: string, a: number) =>
  /^#[0-9a-f]{6}$/i.test(hex) ? hex + Math.round(a * 255).toString(16).padStart(2, "0") : hex;

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

/** Fill a template and bold the amount it carries. */
function Rich({ tpl, token, value }: { tpl: string; token: string; value: string }) {
  const parts = tpl.split(token);
  return (
    <>
      {parts.map((p, i) => (
        <span key={i}>
          {p}
          {i < parts.length - 1 && <b className="font-semibold">{value}</b>}
        </span>
      ))}
    </>
  );
}

function Photo({ src, art, size, tile, radius }: { src: string; art: ArtKind; size: number; tile: string; radius: number }) {
  if (!src) return <ProductArt kind={art} tone="#F39AB0" size={size} tile={tile} radius={radius} />;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      className="block aspect-square shrink-0 object-cover"
      style={{ width: size, height: size, borderRadius: radius, background: tile }}
    />
  );
}

const TRUCK = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M3 6h11v9H3z" />
    <path d="M14 9h3.5L21 12v3h-7z" />
    <circle cx="7" cy="17.5" r="1.7" />
    <circle cx="17.5" cy="17.5" r="1.7" />
  </svg>
);

const GIFT = (size = 12) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <rect x="4" y="9.5" width="16" height="10.5" rx="1.5" />
    <path d="M2.5 9.5h19M12 9.5V20" />
    <path d="M12 9.5C9.5 9.5 7.5 5 9.4 4s3.1 4.5 2.6 5.5zM12 9.5c2.5 0 4.5-4.5 2.6-5.5S11.5 8.5 12 9.5z" />
  </svg>
);

const TAG = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M3 12.5V4h8.5l8.5 8.5-8 8z" />
    <circle cx="7.5" cy="7.5" r="1.4" />
  </svg>
);

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
  const radius = num(config, "radius", 12);
  const line = tint(text, 0.08);

  const items = list(config, "items");
  const upsells = list(config, "upsells");

  /* quantities keyed i0.. (bag items) and u0.. (upsells); reset when the editor list changes */
  const seed = () => {
    const q: Record<string, number> = {};
    items.forEach((it, i) => (q[`i${i}`] = clamp(Math.round(toNum(it.qty, 1)), 0, 9)));
    return q;
  };
  const key = items.map((it) => `${it.qty}`).join(",") + `|${upsells.length}`;
  const [prevKey, setPrevKey] = useState(key);
  const [qty, setQty] = useState<Record<string, number>>(seed);
  if (key !== prevKey) {
    setPrevKey(key);
    setQty(seed());
  }
  const rail = useRef<HTMLDivElement>(null);

  const lines = [
    ...items.map((it, i) => ({ k: `i${i}`, name: it.name ?? "", detail: it.detail ?? "", size: it.size ?? "", price: toNum(it.price), image: (it.image ?? "").trim(), art: ART[i % ART.length] })),
    ...upsells.map((u, i) => ({ k: `u${i}`, name: u.name ?? "", detail: u.detail ?? "", size: "", price: toNum(u.price), image: (u.image ?? "").trim(), art: ART[(i + 3) % ART.length] })),
  ].filter((l) => (qty[l.k] ?? 0) > 0);

  const setQ = (k: string, n: number) => setQty((q) => ({ ...q, [k]: clamp(n, 0, 9) }));

  const sub = lines.reduce((s, l) => s + l.price * (qty[l.k] ?? 0), 0);
  const count = lines.reduce((s, l) => s + (qty[l.k] ?? 0), 0);
  const showSet = bool(config, "showSet", true);
  const setMin = clamp(Math.round(num(config, "setMinQty", 3)), 2, 10);
  const setPct = clamp(num(config, "setPct", 10), 0, 50);
  const setOn = showSet && count >= setMin && setPct > 0;
  const save = setOn ? sub * (setPct / 100) : 0;
  const total = sub - save;

  const t1 = Math.max(1, num(config, "shipThreshold", 50));
  const t2 = Math.max(t1, num(config, "giftThreshold", 80));
  const giftOn = count > 0 && total >= t2;
  const pct = Math.min(100, (total / t2) * 100);
  const m1 = (t1 / t2) * 100;
  const shipHit = total >= t1;

  const msg =
    total < t1
      ? { tpl: str(config, "shipText"), v: money(t1 - total, cur) }
      : total < t2
        ? { tpl: str(config, "giftText"), v: money(t2 - total, cur) }
        : { tpl: str(config, "doneText"), v: "" };

  const giftValue = toNum(str(config, "giftValue"));
  const giftImage = str(config, "giftImage").trim();
  const bagCount = count + (giftOn ? 1 : 0);
  const ri = Math.max(6, radius - 2);

  const marker = (hit: boolean, icon: React.ReactNode, left: string) => (
    <span
      className="absolute top-1/2 grid h-[22px] w-[22px] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full"
      style={{
        left,
        background: hit ? accent : "#FFFFFF",
        color: hit ? "#FFFFFF" : text,
        boxShadow: hit ? `0 4px 10px -3px ${tint(accent, 0.55)}` : `0 0 0 1px ${tint(text, 0.1)}`,
        transition: `background-color 400ms ${EASE}, color 400ms ${EASE}, box-shadow 400ms ${EASE}`,
      }}
    >
      {icon}
    </span>
  );

  const stepper = (k: string) => (
    <div className="inline-flex h-7 items-center rounded-full" style={{ boxShadow: `inset 0 0 0 1px ${tint(text, 0.14)}` }}>
      <button
        type="button"
        aria-label="Decrease quantity"
        onClick={() => setQ(k, (qty[k] ?? 1) - 1)}
        className="grid h-7 w-7 place-items-center rounded-full text-[14px] transition-colors hover:bg-black/[0.05]"
      >
        −
      </button>
      <span key={qty[k]} className="bs-swap w-5 text-center text-[12px] tabular-nums" style={{ fontFamily: MONO }}>
        {qty[k]}
      </span>
      <button
        type="button"
        aria-label="Increase quantity"
        onClick={() => setQ(k, (qty[k] ?? 0) + 1)}
        className="grid h-7 w-7 place-items-center rounded-full text-[14px] transition-colors hover:bg-black/[0.05]"
      >
        +
      </button>
    </div>
  );

  const fill = (tpl: string) =>
    tpl
      .split("{{count}}")
      .join(String(Math.max(0, setMin - count)))
      .split("{{percent}}")
      .join(`${setPct}%`);

  return (
    <div className="@container w-full" style={{ color: text, fontFamily: fontStack(str(config, "font", "system")) }}>
      <div className="relative @min-[640px]:flex @min-[640px]:min-h-[700px]" style={{ background: bg }}>
        {/* Storefront behind the drawer (wide only) */}
        <div aria-hidden className="absolute inset-0 hidden overflow-hidden @min-[640px]:block" style={{ background: "#FFFFFF" }}>
          <div className="flex items-center gap-6 px-8 py-5">
            <span className="h-3 w-20 rounded-full" style={{ background: text }} />
            <span className="h-2 w-12 rounded-full bg-black/10" />
            <span className="h-2 w-12 rounded-full bg-black/10" />
            <span className="h-2 w-12 rounded-full bg-black/10" />
          </div>
          <div className="mx-8 h-[260px] rounded-[20px]" style={{ background: pink }} />
          <div className="mx-8 mt-6 grid grid-cols-3 gap-4">
            {[0, 1, 2].map((i) => (
              <div key={i}>
                <div className="aspect-square rounded-[14px]" style={{ background: tile }} />
                <div className="mt-3 h-2 w-2/3 rounded-full bg-black/10" />
              </div>
            ))}
          </div>
          <div className="absolute inset-0" style={{ background: "rgba(0,0,0,.34)" }} />
        </div>

        {/* Drawer */}
        <aside
          className="relative ml-auto flex w-full flex-col @min-[640px]:w-[400px] @min-[640px]:shadow-[-24px_0_60px_-20px_rgba(0,0,0,0.35)]"
          style={{ background: bg }}
        >
          <div className="flex items-center justify-between px-5 pb-3 pt-5">
            <h3 className="text-[21px] font-medium tracking-[-0.02em]">
              {str(config, "title", "Your bag")}{" "}
              <span key={bagCount} className="bs-swap inline-block tabular-nums">
                ({bagCount})
              </span>
            </h3>
            <button
              type="button"
              aria-label="Close bag"
              className="grid h-9 w-9 place-items-center rounded-full transition-[filter] hover:brightness-95"
              style={{ background: tile }}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden>
                <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          {/* Two-milestone tracker */}
          <div className="mx-4 px-4 pb-3 pt-3.5" style={{ background: pink, borderRadius: radius }}>
            <p key={msg.tpl + msg.v} className="bs-swap text-[13px] leading-snug">
              <Rich tpl={msg.tpl} token="{{remaining}}" value={msg.v} />
            </p>
            <div className="relative mx-[11px] mt-3 h-[22px]">
              <div className="absolute inset-x-0 top-1/2 h-[5px] -translate-y-1/2 overflow-hidden rounded-full" style={{ background: tint("#FFFFFF", 0.75) }}>
                <div
                  className="h-full rounded-full"
                  style={{ width: `${pct}%`, background: accent, transition: `width 700ms ${EASE}` }}
                />
              </div>
              {m1 < 99 && marker(shipHit, TRUCK(), `${m1}%`)}
              {marker(giftOn, GIFT(12), "100%")}
            </div>
            <div className="relative mx-[11px] mt-1.5 h-3 text-[9.5px] uppercase tracking-[0.06em]" style={{ fontFamily: MONO }}>
              {m1 < 99 && (
                <span
                  className="absolute whitespace-nowrap"
                  style={{
                    left: `${m1}%`,
                    transform: m1 < 50 ? "translateX(-11px)" : "translateX(calc(-100% + 11px))",
                    color: shipHit ? accent : tint(text, 0.6),
                  }}
                >
                  {money(t1, cur)} · {str(config, "shipLabel")}
                </span>
              )}
              <span className="absolute -right-[11px] whitespace-nowrap" style={{ color: giftOn ? accent : tint(text, 0.6) }}>
                {money(t2, cur)} · {str(config, "giftLabel")}
              </span>
            </div>
          </div>

          {/* Lines */}
          <div className="px-5 pt-1">
            {lines.map((l) => (
              <div key={l.k} className={`flex gap-3 border-b py-4 ${l.k.startsWith("u") ? "bs-fade-up" : ""}`} style={{ borderColor: line }}>
                <Photo src={l.image} art={l.art} size={76} tile={tile} radius={ri} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="truncate text-[14.5px] font-medium">{l.name}</p>
                    <p key={qty[l.k]} className="bs-swap shrink-0 text-[14px] tabular-nums">
                      {money(l.price * (qty[l.k] ?? 0), cur)}
                    </p>
                  </div>
                  <p className="truncate text-[12.5px]" style={{ color: muted }}>
                    {l.detail}
                  </p>
                  <div className="mt-2.5 flex items-center gap-2">
                    {l.size && (
                      <span
                        className="inline-flex h-6 items-center rounded-full px-2 text-[10px] uppercase tracking-[0.06em]"
                        style={{ fontFamily: MONO, background: tile }}
                      >
                        {l.size}
                      </span>
                    )}
                    {stepper(l.k)}
                    <button
                      type="button"
                      onClick={() => setQ(l.k, 0)}
                      className="ml-auto text-[12px] underline underline-offset-2 transition-opacity hover:opacity-60"
                      style={{ color: muted }}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {giftOn && (
              <div className="bs-fade-up flex items-center gap-3 border-b py-4" style={{ borderColor: line }}>
                {giftImage ? (
                  <Photo src={giftImage} art="jar" size={76} tile={pink} radius={ri} />
                ) : (
                  <span className="grid h-[76px] w-[76px] shrink-0 place-items-center" style={{ background: pink, borderRadius: ri, color: accent }}>
                    {GIFT(26)}
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] uppercase tracking-[0.1em]" style={{ fontFamily: MONO, color: accent }}>
                    {str(config, "giftLabel")}
                  </p>
                  <p className="truncate text-[14.5px] font-medium">{str(config, "giftName")}</p>
                </div>
                <p className="shrink-0 text-[14px] tabular-nums">
                  {giftValue > 0 && (
                    <s className="mr-1.5" style={{ color: muted }}>
                      {money(giftValue, cur)}
                    </s>
                  )}
                  Free
                </p>
              </div>
            )}

            {count === 0 && (
              <p className="py-10 text-center text-[14px]" style={{ color: muted }}>
                Your bag is empty.
              </p>
            )}

            {/* Set savings */}
            {showSet && count > 0 && setPct > 0 && (
              <div
                className="mt-3 flex items-center gap-2.5 px-3 py-2.5 text-[13px]"
                style={{
                  borderRadius: ri,
                  background: setOn ? tint(accent, 0.07) : "transparent",
                  color: setOn ? accent : muted,
                  boxShadow: setOn ? "none" : `inset 0 0 0 1px ${tint(text, 0.14)}`,
                  transition: `background-color 300ms ${EASE}, color 300ms ${EASE}`,
                }}
              >
                {TAG()}
                {setOn ? (
                  <>
                    <span className="font-medium">{str(config, "setLabel")}</span>
                    <span className="rounded-full bg-white px-1.5 py-[2px] text-[9.5px] uppercase tracking-[0.08em]" style={{ fontFamily: MONO }}>
                      {setPct}% off
                    </span>
                    <b key={save} className="bs-swap ml-auto font-medium tabular-nums">
                      −{money(save, cur)}
                    </b>
                  </>
                ) : (
                  <span>{fill(str(config, "setHint"))}</span>
                )}
              </div>
            )}
          </div>

          {/* Complete your routine */}
          {upsells.length > 0 && (
            <div className="pt-5">
              <div className="flex items-center justify-between px-5">
                <p className="text-[15px] font-medium tracking-[-0.01em]">{str(config, "upsellTitle")}</p>
                {upsells.length > 1 && (
                  <div className="flex gap-1">
                    {[-1, 1].map((d) => (
                      <button
                        key={d}
                        type="button"
                        aria-label={d < 0 ? "Previous" : "Next"}
                        onClick={() => rail.current?.scrollBy({ left: d * 240, behavior: "smooth" })}
                        className="grid h-7 w-7 place-items-center rounded-full transition-colors hover:bg-black/[0.05]"
                        style={{ boxShadow: `inset 0 0 0 1px ${tint(text, 0.12)}` }}
                      >
                        <svg width="10" height="10" viewBox="0 0 12 12" aria-hidden style={{ transform: d < 0 ? "scaleX(-1)" : "none" }}>
                          <path d="M4 2l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div ref={rail} className="bs-no-scrollbar mt-3 flex snap-x snap-mandatory scroll-px-5 gap-2.5 overflow-x-auto px-5">
                {upsells.map((u, i) => {
                  const k = `u${i}`;
                  const on = (qty[k] ?? 0) > 0;
                  return (
                    <div key={i} className="flex w-[80%] max-w-[300px] shrink-0 snap-start items-center gap-3 p-2.5" style={{ background: tile, borderRadius: radius }}>
                      <Photo src={(u.image ?? "").trim()} art={ART[(i + 3) % ART.length]} size={60} tile={pink} radius={Math.max(6, radius - 4)} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13.5px] font-medium">{u.name}</p>
                        <p className="truncate text-[11.5px]" style={{ color: muted }}>
                          {u.detail}
                        </p>
                        <p className="mt-0.5 text-[13px] tabular-nums">{money(toNum(u.price), cur)}</p>
                      </div>
                      <button
                        type="button"
                        aria-pressed={on}
                        onClick={() => setQ(k, on ? 0 : 1)}
                        className="h-8 shrink-0 rounded-full px-3.5 text-[12.5px] font-medium active:scale-95"
                        style={{
                          background: on ? accent : bg,
                          color: on ? "#FFFFFF" : text,
                          boxShadow: on ? "none" : `inset 0 0 0 1px ${tint(text, 0.16)}`,
                          transition: `background-color 300ms ${EASE}, color 300ms ${EASE}, scale 200ms ease`,
                        }}
                      >
                        <span key={on ? "y" : "n"} className="bs-swap inline-block whitespace-nowrap">
                          {on ? "Added ✓" : `+ ${str(config, "addText", "Add")}`}
                        </span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="mt-auto px-5 pb-5 pt-5">
            <div className="border-t pt-4" style={{ borderColor: line }}>
              <div className="flex items-baseline justify-between gap-2 text-[14px]">
                <span className="font-medium">{str(config, "subtotalLabel")}</span>
                <span className="flex items-baseline gap-2 tabular-nums">
                  {save > 0.005 && (
                    <s className="text-[12.5px]" style={{ color: muted }}>
                      {money(sub, cur)}
                    </s>
                  )}
                  <b key={total} className="bs-swap text-[17px] font-semibold tracking-[-0.01em]">
                    {money(total, cur)}
                  </b>
                </span>
              </div>
              {save > 0.005 && (
                <p className="mt-1 text-right text-[10px] uppercase tracking-[0.08em]" style={{ fontFamily: MONO, color: accent }}>
                  You save {money(save, cur)}
                </p>
              )}
              <button
                type="button"
                className="mt-3.5 flex h-[50px] w-full items-center justify-center gap-2 rounded-full text-[15px] font-medium hover:brightness-125 active:scale-[0.99]"
                style={{ background: btnBg, color: btnText, transition: "filter 200ms ease, scale 200ms ease" }}
              >
                {str(config, "checkoutText", "Check out")}
                <span className="opacity-50">·</span>
                <span className="tabular-nums">{money(total, cur)}</span>
              </button>
              {str(config, "noteText") && (
                <p className="mt-2.5 text-center text-[11.5px]" style={{ color: muted }}>
                  {str(config, "noteText")}
                </p>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function generateLiquid(config: TweakConfig): string {
  const { face, family } = fontFaceFor(str(config, "font", "system"));
  const S = ".bs-bd-{{ section.id }}";
  const r = "{{ section.settings.radius }}px";
  const ri = "{{ section.settings.radius | minus: 2 | at_least: 6 }}px";
  const mono = "ui-monospace, 'SF Mono', Menlo, monospace";
  const ease = "cubic-bezier(.22,1,.36,1)";
  const t1 = clamp(Math.round(num(config, "shipThreshold", 50) / 5) * 5, 10, 200);
  const t2 = clamp(Math.round(num(config, "giftThreshold", 80) / 5) * 5, 20, 300);
  const setMin = clamp(Math.round(num(config, "setMinQty", 3)), 2, 10);
  const setPct = clamp(Math.round(num(config, "setPct", 10)), 0, 50);
  const radius = clamp(Math.round(num(config, "radius", 12) / 2) * 2, 0, 24);
  const cur = str(config, "currency", "$").slice(0, 3) || "$";

  const style = `<style>
${face ? face + "\n" : ""}  ${S} { max-width: 420px; margin: 0 auto; display: flex; flex-direction: column; background: {{ section.settings.bg }}; color: {{ section.settings.text_color }}; font-family: ${family}; }
  ${S} * { box-sizing: border-box; }
  ${S} p, ${S} h2 { margin: 0; }
  ${S} a { color: inherit; text-decoration: none; }
  ${S} button { font: inherit; color: inherit; }
  ${S} form { margin: 0; }
  ${S} .bs-mono { font-family: ${mono}; text-transform: uppercase; letter-spacing: .08em; }
  ${S} .bs-head { display: flex; align-items: center; justify-content: space-between; padding: 20px 20px 12px; }
  ${S} .bs-head h2 { font-size: 21px; font-weight: 500; letter-spacing: -.02em; }
  ${S} .bs-close { width: 36px; height: 36px; border-radius: 99px; display: grid; place-items: center; background: {{ section.settings.tile }}; }
  ${S} .bs-track-card { margin: 0 16px; padding: 14px 16px 12px; border-radius: ${r}; background: {{ section.settings.pink }}; }
  ${S} .bs-msg { font-size: 13px; line-height: 1.4; }
  ${S} .bs-msg b { font-weight: 600; }
  ${S} .bs-bar { position: relative; margin: 12px 11px 0; height: 22px; }
  ${S} .bs-rail-bg { position: absolute; left: 0; right: 0; top: 50%; height: 5px; transform: translateY(-50%); border-radius: 99px; overflow: hidden; background: rgba(255,255,255,.75); }
  ${S} .bs-fill { height: 100%; border-radius: 99px; background: {{ section.settings.accent }}; transition: width .7s ${ease}; }
  ${S} .bs-mark { position: absolute; top: 50%; width: 22px; height: 22px; border-radius: 99px; display: grid; place-items: center; transform: translate(-50%, -50%);
    background: #fff; color: {{ section.settings.text_color }}; box-shadow: 0 0 0 1px rgba(0,0,0,.1); }
  ${S} .bs-mark.is-on { background: {{ section.settings.accent }}; color: #fff; box-shadow: 0 4px 10px -3px rgba(0,0,0,.35); }
  ${S} .bs-labels { position: relative; height: 12px; margin: 6px 11px 0; font-size: 9.5px; letter-spacing: .06em; }
  ${S} .bs-labels span { position: absolute; white-space: nowrap; opacity: .6; }
  ${S} .bs-labels span.is-on { opacity: 1; color: {{ section.settings.accent }}; }
  ${S} .bs-l1 { transform: translateX(calc(-100% + 11px)); }
  ${S} .bs-l1.is-left { transform: translateX(-11px); }
  ${S} .bs-l2 { right: -11px; }
  ${S} .bs-lines { padding: 4px 20px 0; }
  ${S} .bs-line { display: flex; gap: 12px; padding: 16px 0; border-bottom: 1px solid rgba(0,0,0,.08); }
  ${S} .bs-img { width: 76px; height: 76px; flex-shrink: 0; border-radius: ${ri}; overflow: hidden; background: {{ section.settings.tile }}; display: block; }
  ${S} .bs-img img { width: 100%; height: 100%; object-fit: cover; display: block; }
  ${S} .bs-gift-ph { display: grid; place-items: center; background: {{ section.settings.pink }}; color: {{ section.settings.accent }}; }
  ${S} .bs-mid { flex: 1; min-width: 0; }
  ${S} .bs-top { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; }
  ${S} .bs-name { font-size: 14.5px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  ${S} .bs-price { flex-shrink: 0; font-size: 14px; font-variant-numeric: tabular-nums; }
  ${S} .bs-price s, ${S} .bs-sum s { color: {{ section.settings.muted }}; margin-right: 6px; font-size: 12.5px; }
  ${S} .bs-detail { font-size: 12.5px; color: {{ section.settings.muted }}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  ${S} .bs-gift-label { font-size: 10px; color: {{ section.settings.accent }}; }
  ${S} .bs-row { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-top: 10px; }
  ${S} .bs-chip { display: inline-flex; align-items: center; height: 24px; padding: 0 8px; border-radius: 99px; font-size: 10px; background: {{ section.settings.tile }}; }
  ${S} .bs-qty { display: inline-flex; align-items: center; height: 28px; border-radius: 99px; box-shadow: inset 0 0 0 1px rgba(0,0,0,.14); }
  ${S} .bs-qty a { width: 28px; height: 28px; border-radius: 99px; display: grid; place-items: center; font-size: 14px; }
  ${S} .bs-qty a:hover { background: rgba(0,0,0,.05); }
  ${S} .bs-qty span { width: 20px; text-align: center; font-size: 12px; font-family: ${mono}; }
  ${S} .bs-remove { margin-left: auto; font-size: 12px; color: {{ section.settings.muted }}; text-decoration: underline; text-underline-offset: 2px; }
  ${S} .bs-save { display: flex; align-items: center; gap: 10px; margin-top: 12px; padding: 10px 12px; border-radius: ${ri}; font-size: 13px;
    background: color-mix(in srgb, {{ section.settings.accent }} 7%, transparent); color: {{ section.settings.accent }}; }
  ${S} .bs-save .bs-off { padding: 2px 6px; border-radius: 99px; background: #fff; font-size: 9.5px; }
  ${S} .bs-save b { margin-left: auto; font-weight: 500; font-variant-numeric: tabular-nums; }
  ${S} .bs-save.is-hint { background: transparent; color: {{ section.settings.muted }}; box-shadow: inset 0 0 0 1px rgba(0,0,0,.14); }
  ${S} .bs-gift-add { display: flex; align-items: center; gap: 12px; margin-top: 12px; padding: 10px 12px; border-radius: ${ri}; background: {{ section.settings.pink }}; font-size: 13px; }
  ${S} .bs-gift-add form { margin-left: auto; }
  ${S} .bs-ups { padding-top: 20px; }
  ${S} .bs-ups-h { display: flex; align-items: center; justify-content: space-between; padding: 0 20px; }
  ${S} .bs-ups-h p { font-size: 15px; font-weight: 500; letter-spacing: -.01em; }
  ${S} .bs-arrows { display: flex; gap: 4px; }
  ${S} .bs-arrow { width: 28px; height: 28px; padding: 0; border: 0; border-radius: 99px; display: grid; place-items: center; cursor: pointer; background: none; box-shadow: inset 0 0 0 1px rgba(0,0,0,.12); }
  ${S} .bs-arrow:hover { background: rgba(0,0,0,.05); }
  ${S} .bs-rail { display: flex; gap: 10px; overflow-x: auto; scroll-snap-type: x mandatory; scroll-padding: 0 20px; padding: 0 20px; margin-top: 12px; scrollbar-width: none; }
  ${S} .bs-rail::-webkit-scrollbar { display: none; }
  ${S} .bs-up { flex: 0 0 80%; max-width: 300px; scroll-snap-align: start; display: flex; align-items: center; gap: 12px; padding: 10px; border-radius: ${r}; background: {{ section.settings.tile }}; }
  ${S} .bs-up .bs-img { width: 60px; height: 60px; background: {{ section.settings.pink }}; }
  ${S} .bs-up .bs-name { font-size: 13.5px; }
  ${S} .bs-up .bs-detail { font-size: 11.5px; }
  ${S} .bs-up-p { margin-top: 2px; font-size: 13px; font-variant-numeric: tabular-nums; }
  ${S} .bs-add { height: 32px; padding: 0 14px; border: 0; border-radius: 99px; cursor: pointer; font-size: 12.5px; font-weight: 500; white-space: nowrap;
    background: {{ section.settings.bg }}; box-shadow: inset 0 0 0 1px rgba(0,0,0,.16); transition: transform .2s, background-color .3s; }
  ${S} .bs-add:active { transform: scale(.95); }
  ${S} .bs-foot { margin-top: auto; padding: 20px; }
  ${S} .bs-foot-in { border-top: 1px solid rgba(0,0,0,.08); padding-top: 16px; }
  ${S} .bs-sum { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; font-size: 14px; }
  ${S} .bs-sum > span:first-child { font-weight: 500; }
  ${S} .bs-sum b { font-size: 17px; font-weight: 600; letter-spacing: -.01em; font-variant-numeric: tabular-nums; }
  ${S} .bs-you-save { margin-top: 4px; text-align: right; font-size: 10px; color: {{ section.settings.accent }}; }
  ${S} .bs-checkout { margin-top: 14px; width: 100%; height: 50px; border: 0; border-radius: 99px; cursor: pointer; font-size: 15px; font-weight: 500;
    display: flex; align-items: center; justify-content: center; gap: 8px;
    background: {{ section.settings.button_bg }}; color: {{ section.settings.button_fg }}; transition: filter .2s, transform .2s; }
  ${S} .bs-checkout:hover { filter: brightness(1.25); }
  ${S} .bs-checkout:active { transform: scale(.99); }
  ${S} .bs-checkout i { font-style: normal; opacity: .5; }
  ${S} .bs-note { margin-top: 10px; text-align: center; font-size: 11.5px; color: {{ section.settings.muted }}; }
  ${S} .bs-empty { padding: 40px 20px; text-align: center; font-size: 14px; color: {{ section.settings.muted }}; }
</style>`;

  const markup = `{%- comment -%}
  Bag Drawer by boost.supply. Add it to your cart page, or render it inside
  your cart drawer with the Section Rendering API.
  - Tracker: two milestones on one bar (free express shipping, then a free
    gift), measured against the cart total after discounts.
  - Free express shipping: create a free shipping rate (Settings → Shipping
    and delivery) with a minimum order price equal to the first threshold.
  - Free gift: pick the gift under "Free gift product" and create an automatic
    discount (Discounts → Amount off products, 100%, applied to the gift,
    minimum purchase amount = the gift threshold). Once unlocked, shoppers can
    add it in one tap; any line that costs 0 shows as a free gift.
  - Set savings: every discount applied to the cart is listed by its title.
    For the set line, create an automatic "Amount off products" discount
    titled e.g. "${str(config, "setLabel") || "Set savings"}" with a minimum quantity of ${setMin} items and ${setPct}% off.
  - Upsells: pick products under "Upsell products"; items already in the bag
    are skipped.
{%- endcomment -%}
{%- assign bs_t1 = section.settings.ship_threshold | times: 100 -%}
{%- assign bs_t2 = section.settings.gift_threshold | times: 100 | at_least: bs_t1 -%}
{%- assign bs_total = cart.total_price -%}
{%- assign bs_pct = bs_total | times: 100.0 | divided_by: bs_t2 | at_most: 100 -%}
{%- assign bs_m1 = bs_t1 | times: 100.0 | divided_by: bs_t2 -%}
{%- assign bs_open = '{' | append: '{' -%}
{%- assign bs_close = '}' | append: '}' -%}
{%- assign bs_tok_rem = bs_open | append: 'remaining' | append: bs_close -%}
{%- assign bs_tok_count = bs_open | append: 'count' | append: bs_close -%}
{%- assign bs_tok_pct = bs_open | append: 'percent' | append: bs_close -%}
<div class="bs-bd-{{ section.id }}">
  <div class="bs-head">
    <h2>{{ section.settings.title }} ({{ cart.item_count }})</h2>
    <a class="bs-close" href="{{ routes.all_products_collection_url }}" aria-label="Continue shopping">
      <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
    </a>
  </div>

  {%- if cart.item_count == 0 -%}
    <p class="bs-empty">Your bag is empty.</p>
  {%- else -%}
  <div class="bs-track-card">
    {%- if bs_total < bs_t1 -%}
      {%- assign bs_rem = bs_t1 | minus: bs_total | money -%}
      {%- assign bs_rem_b = '<b>' | append: bs_rem | append: '</b>' -%}
      <p class="bs-msg">{{ section.settings.ship_text | replace: bs_tok_rem, bs_rem_b }}</p>
    {%- elsif bs_total < bs_t2 -%}
      {%- assign bs_rem = bs_t2 | minus: bs_total | money -%}
      {%- assign bs_rem_b = '<b>' | append: bs_rem | append: '</b>' -%}
      <p class="bs-msg">{{ section.settings.gift_text | replace: bs_tok_rem, bs_rem_b }}</p>
    {%- else -%}
      <p class="bs-msg">{{ section.settings.done_text }}</p>
    {%- endif -%}
    <div class="bs-bar">
      <div class="bs-rail-bg"><div class="bs-fill" style="width: {{ bs_pct }}%;"></div></div>
      {%- if bs_m1 < 99 -%}
        <span class="bs-mark{% if bs_total >= bs_t1 %} is-on{% endif %}" style="left: {{ bs_m1 }}%;" aria-hidden="true">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h11v9H3z"/><path d="M14 9h3.5L21 12v3h-7z"/><circle cx="7" cy="17.5" r="1.7"/><circle cx="17.5" cy="17.5" r="1.7"/></svg>
        </span>
      {%- endif -%}
      <span class="bs-mark{% if bs_total >= bs_t2 %} is-on{% endif %}" style="left: 100%;" aria-hidden="true">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="9.5" width="16" height="10.5" rx="1.5"/><path d="M2.5 9.5h19M12 9.5V20"/><path d="M12 9.5C9.5 9.5 7.5 5 9.4 4s3.1 4.5 2.6 5.5zM12 9.5c2.5 0 4.5-4.5 2.6-5.5S11.5 8.5 12 9.5z"/></svg>
      </span>
    </div>
    <div class="bs-labels bs-mono">
      {%- if bs_m1 < 99 -%}
        <span class="bs-l1{% if bs_m1 < 50 %} is-left{% endif %}{% if bs_total >= bs_t1 %} is-on{% endif %}" style="left: {{ bs_m1 }}%;">{{ bs_t1 | money_without_trailing_zeros }} · {{ section.settings.ship_label }}</span>
      {%- endif -%}
      <span class="bs-l2{% if bs_total >= bs_t2 %} is-on{% endif %}">{{ bs_t2 | money_without_trailing_zeros }} · {{ section.settings.gift_label }}</span>
    </div>
  </div>

  <div class="bs-lines">
    {%- for item in cart.items -%}
      <div class="bs-line">
        <a class="bs-img{% if item.final_line_price == 0 and item.image == blank %} bs-gift-ph{% endif %}" href="{{ item.url }}">
          {%- if item.image -%}{{ item.image | image_url: width: 200 | image_tag: loading: 'lazy', alt: item.product.title }}{%- endif -%}
        </a>
        <div class="bs-mid">
          {%- if item.final_line_price == 0 -%}
            <p class="bs-mono bs-gift-label">{{ section.settings.gift_label }}</p>
            <div class="bs-top">
              <a class="bs-name" href="{{ item.url }}">{{ item.product.title }}</a>
              <p class="bs-price">{%- if item.original_line_price > 0 -%}<s>{{ item.original_line_price | money }}</s>{%- endif -%}Free</p>
            </div>
          {%- else -%}
            <div class="bs-top">
              <a class="bs-name" href="{{ item.url }}">{{ item.product.title }}</a>
              <p class="bs-price">
                {%- if item.original_line_price > item.final_line_price -%}<s>{{ item.original_line_price | money }}</s>{%- endif -%}
                {{ item.final_line_price | money }}
              </p>
            </div>
            {%- if item.product.type != blank -%}<p class="bs-detail">{{ item.product.type }}</p>{%- endif -%}
            <div class="bs-row">
              {%- unless item.product.has_only_default_variant -%}
                {%- for bs_opt in item.options_with_values -%}<span class="bs-chip bs-mono">{{ bs_opt.value }}</span>{%- endfor -%}
              {%- endunless -%}
              {%- if item.selling_plan_allocation -%}<span class="bs-chip bs-mono">{{ item.selling_plan_allocation.selling_plan.name }}</span>{%- endif -%}
              <div class="bs-qty">
                <a href="{{ routes.cart_change_url }}?line={{ forloop.index }}&quantity={{ item.quantity | minus: 1 }}" aria-label="Decrease quantity">−</a>
                <span>{{ item.quantity }}</span>
                <a href="{{ routes.cart_change_url }}?line={{ forloop.index }}&quantity={{ item.quantity | plus: 1 }}" aria-label="Increase quantity">+</a>
              </div>
              <a class="bs-remove" href="{{ routes.cart_change_url }}?line={{ forloop.index }}&quantity=0">Remove</a>
            </div>
          {%- endif -%}
        </div>
      </div>
    {%- endfor -%}

    {%- if section.settings.show_set -%}
      {%- for bs_app in cart.discount_applications -%}
        <div class="bs-save">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12.5V4h8.5l8.5 8.5-8 8z"/><circle cx="7.5" cy="7.5" r="1.4"/></svg>
          <span>{{ bs_app.title }}</span>
          {%- if bs_app.value_type == 'percentage' -%}<span class="bs-off bs-mono">{{ bs_app.value | round }}% off</span>{%- endif -%}
          <b>−{{ bs_app.total_allocated_amount | money }}</b>
        </div>
      {%- else -%}
        {%- if cart.item_count < section.settings.set_min_qty and section.settings.set_pct > 0 -%}
          {%- assign bs_need = section.settings.set_min_qty | minus: cart.item_count -%}
          {%- assign bs_pct_txt = section.settings.set_pct | append: '%' -%}
          <div class="bs-save is-hint">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12.5V4h8.5l8.5 8.5-8 8z"/><circle cx="7.5" cy="7.5" r="1.4"/></svg>
            <span>{{ section.settings.set_hint | replace: bs_tok_count, bs_need | replace: bs_tok_pct, bs_pct_txt }}</span>
          </div>
        {%- endif -%}
      {%- endfor -%}
    {%- endif -%}

    {%- assign bs_gift = section.settings.gift_product -%}
    {%- if bs_gift != blank and bs_total >= bs_t2 and bs_gift.available -%}
      {%- assign bs_gift_in = false -%}
      {%- for item in cart.items -%}{%- if item.product_id == bs_gift.id -%}{%- assign bs_gift_in = true -%}{%- endif -%}{%- endfor -%}
      {%- unless bs_gift_in -%}
        <div class="bs-gift-add">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="9.5" width="16" height="10.5" rx="1.5"/><path d="M2.5 9.5h19M12 9.5V20"/><path d="M12 9.5C9.5 9.5 7.5 5 9.4 4s3.1 4.5 2.6 5.5zM12 9.5c2.5 0 4.5-4.5 2.6-5.5S11.5 8.5 12 9.5z"/></svg>
          <span>{{ bs_gift.title }}</span>
          {%- form 'product', bs_gift -%}
            <input type="hidden" name="id" value="{{ bs_gift.selected_or_first_available_variant.id }}">
            <input type="hidden" name="quantity" value="1">
            <button type="submit" class="bs-add">+ {{ section.settings.add_text }}</button>
          {%- endform -%}
        </div>
      {%- endunless -%}
    {%- endif -%}
  </div>

  {%- if section.settings.upsell_products != blank -%}
    <div class="bs-ups">
      <div class="bs-ups-h">
        <p>{{ section.settings.upsell_title }}</p>
        <div class="bs-arrows">
          <button type="button" class="bs-arrow" aria-label="Previous" onclick="this.closest('.bs-ups').querySelector('.bs-rail').scrollBy({ left: -240, behavior: 'smooth' })">
            <svg width="10" height="10" viewBox="0 0 12 12" aria-hidden="true"><path d="M8 2L4 6l4 4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>
          <button type="button" class="bs-arrow" aria-label="Next" onclick="this.closest('.bs-ups').querySelector('.bs-rail').scrollBy({ left: 240, behavior: 'smooth' })">
            <svg width="10" height="10" viewBox="0 0 12 12" aria-hidden="true"><path d="M4 2l4 4-4 4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>
        </div>
      </div>
      <div class="bs-rail">
        {%- for bs_p in section.settings.upsell_products -%}
          {%- assign bs_in = false -%}
          {%- for item in cart.items -%}{%- if item.product_id == bs_p.id -%}{%- assign bs_in = true -%}{%- endif -%}{%- endfor -%}
          {%- unless bs_in or bs_p.available == false -%}
            <div class="bs-up">
              <a class="bs-img" href="{{ bs_p.url }}">{%- if bs_p.featured_image -%}{{ bs_p.featured_image | image_url: width: 160 | image_tag: loading: 'lazy', alt: bs_p.title }}{%- endif -%}</a>
              <div class="bs-mid">
                <p class="bs-name">{{ bs_p.title }}</p>
                {%- if bs_p.type != blank -%}<p class="bs-detail">{{ bs_p.type }}</p>{%- endif -%}
                <p class="bs-up-p">{{ bs_p.price | money }}</p>
              </div>
              {%- form 'product', bs_p -%}
                <input type="hidden" name="id" value="{{ bs_p.selected_or_first_available_variant.id }}">
                <input type="hidden" name="quantity" value="1">
                <button type="submit" class="bs-add">+ {{ section.settings.add_text }}</button>
              {%- endform -%}
            </div>
          {%- endunless -%}
        {%- endfor -%}
      </div>
    </div>
  {%- endif -%}

  <div class="bs-foot">
    <div class="bs-foot-in">
      <div class="bs-sum">
        <span>{{ section.settings.subtotal_label }}</span>
        <span>
          {%- if cart.original_total_price > cart.total_price -%}<s>{{ cart.original_total_price | money }}</s>{%- endif -%}
          <b>{{ cart.total_price | money }}</b>
        </span>
      </div>
      {%- if cart.total_discount > 0 -%}
        <p class="bs-you-save bs-mono">You save {{ cart.total_discount | money }}</p>
      {%- endif -%}
      <form action="{{ routes.cart_url }}" method="post">
        <button type="submit" name="checkout" class="bs-checkout">
          {{ section.settings.checkout_text }} <i>·</i> {{ cart.total_price | money }}
        </button>
      </form>
      {%- if section.settings.note_text != blank -%}<p class="bs-note">{{ section.settings.note_text }}</p>{%- endif -%}
    </div>
  </div>
  {%- endif -%}
</div>`;

  const schema = buildSchema({
    name: "Bag Drawer",
    settings: [
      { type: "text", id: "title", label: "Title", default: str(config, "title") },
      { type: "header", content: "Tracker" },
      { type: "range", id: "ship_threshold", label: "Free express shipping at", min: 10, max: 200, step: 5, unit: cur, default: t1 },
      { type: "text", id: "ship_label", label: "Shipping milestone label", default: str(config, "shipLabel") },
      { type: "text", id: "ship_text", label: "Text before shipping (use {{remaining}})", default: str(config, "shipText") },
      { type: "range", id: "gift_threshold", label: "Free gift at", min: 20, max: 300, step: 5, unit: cur, default: t2 },
      { type: "text", id: "gift_label", label: "Gift milestone label", default: str(config, "giftLabel") },
      { type: "text", id: "gift_text", label: "Text before gift (use {{remaining}})", default: str(config, "giftText") },
      { type: "text", id: "done_text", label: "Text when both are unlocked", default: str(config, "doneText") },
      { type: "product", id: "gift_product", label: "Free gift product", info: "Shown as a one-tap add once the gift threshold is reached. Make it free with an automatic discount." },
      { type: "header", content: "Set savings" },
      { type: "checkbox", id: "show_set", label: "Show applied discounts and the set hint", default: bool(config, "showSet", true) },
      { type: "range", id: "set_min_qty", label: "Set: minimum items (display)", min: 2, max: 10, step: 1, default: setMin },
      { type: "range", id: "set_pct", label: "Set: discount (display)", min: 0, max: 50, step: 1, unit: "%", default: setPct },
      { type: "text", id: "set_hint", label: "Hint before the set (use {{count}} and {{percent}})", default: str(config, "setHint") },
      { type: "header", content: "Upsells" },
      { type: "text", id: "upsell_title", label: "Rail title", default: str(config, "upsellTitle") },
      { type: "product_list", id: "upsell_products", label: "Upsell products", limit: 8 },
      { type: "text", id: "add_text", label: "Add button", default: str(config, "addText") },
      { type: "header", content: "Checkout" },
      { type: "text", id: "subtotal_label", label: "Subtotal label", default: str(config, "subtotalLabel") },
      { type: "text", id: "checkout_text", label: "Checkout button", default: str(config, "checkoutText") },
      { type: "text", id: "note_text", label: "Note under the button", default: str(config, "noteText") },
      { type: "header", content: "Style" },
      { type: "color", id: "accent", label: "Accent", default: str(config, "accent") },
      { type: "color", id: "pink", label: "Tracker & gift", default: str(config, "pink") },
      { type: "color", id: "tile", label: "Tiles & chips", default: str(config, "tile") },
      { type: "color", id: "bg", label: "Background", default: str(config, "bg") },
      { type: "color", id: "text_color", label: "Text", default: str(config, "textColor") },
      { type: "color", id: "muted", label: "Muted text", default: str(config, "muted") },
      { type: "color", id: "button_bg", label: "Checkout button", default: str(config, "buttonBg") },
      { type: "color", id: "button_fg", label: "Checkout label", default: str(config, "buttonText2") },
      { type: "range", id: "radius", label: "Corner radius", min: 0, max: 24, step: 2, unit: "px", default: radius },
    ],
  });

  return section({ style, markup, schema });
}

export const bagDrawer: Tweak = {
  slug: "bag-drawer",
  inspiredBy: "glossier",
  name: "Bag Drawer",
  tagline: "A pink cart drawer with two rewards on one bar, set savings and a routine rail.",
  description:
    "Modeled on the cart drawer Glossier uses. One progress bar carries two milestones (free express shipping, then a free gift), line items get a size chip, stepper and remove link, applied set savings show as their own line, and a “complete your routine” rail adds products in one tap. Reads the real cart in Liquid, with both thresholds and the upsell products as theme settings.",
  category: "cart",
  tier: "free",
  tint: "#fdeef1",
  Preview,
  generateLiquid,
  defaults,
  fields: [
    { key: "title", label: "Title", type: "text", group: "Content" },
    { key: "currency", label: "Currency symbol", type: "text", group: "Content" },
    {
      key: "items", label: "Bag items", type: "list", group: "Content",
      hint: "Preview only. The real drawer shows the shopper's cart with each product's own photo",
      itemFields: [
        { key: "name", label: "Name", type: "text" },
        { key: "detail", label: "Descriptor", type: "text" },
        { key: "size", label: "Size chip", type: "text" },
        { key: "price", label: "Price", type: "text" },
        { key: "qty", label: "Quantity", type: "text" },
        { key: "image", label: "Image URL", type: "text" },
      ],
      newItem: { name: "Night Veil", detail: "Overnight mask", size: "50 ml", price: "30", qty: "1", image: "/mockups/set-cream.jpg" },
      addLabel: "Add item", max: 5,
    },
    { key: "shipThreshold", label: "Free express shipping at", type: "slider", group: "Tracker", min: 10, max: 200, step: 5, unit: "$" },
    { key: "shipLabel", label: "Shipping milestone label", type: "text", group: "Tracker" },
    { key: "shipText", label: "Text before shipping", type: "text", group: "Tracker", hint: "Use {{remaining}} for the amount left" },
    { key: "giftThreshold", label: "Free gift at", type: "slider", group: "Tracker", min: 20, max: 300, step: 5, unit: "$", hint: "Keep it above the shipping threshold" },
    { key: "giftLabel", label: "Gift milestone label", type: "text", group: "Tracker" },
    { key: "giftText", label: "Text before gift", type: "text", group: "Tracker", hint: "Use {{remaining}} for the amount left" },
    { key: "doneText", label: "Text when both are unlocked", type: "text", group: "Tracker" },
    { key: "giftName", label: "Gift name", type: "text", group: "Free gift", hint: "Preview only. In your store, pick the gift product in the theme editor" },
    { key: "giftValue", label: "Gift value", type: "text", group: "Free gift" },
    { key: "giftImage", label: "Gift image URL", type: "text", group: "Free gift", hint: "Empty shows a gift icon" },
    { key: "showSet", label: "Show set savings", type: "toggle", group: "Set savings" },
    { key: "setLabel", label: "Savings label", type: "text", group: "Set savings", hint: "In your store, the line shows the title of the applied discount" },
    { key: "setMinQty", label: "Minimum items", type: "slider", group: "Set savings", min: 2, max: 10, step: 1 },
    { key: "setPct", label: "Discount", type: "slider", group: "Set savings", min: 0, max: 50, step: 1, unit: "%" },
    { key: "setHint", label: "Hint before the set", type: "text", group: "Set savings", hint: "Use {{count}} for items to go and {{percent}} for the discount" },
    { key: "upsellTitle", label: "Rail title", type: "text", group: "Upsells" },
    { key: "addText", label: "Add button", type: "text", group: "Upsells" },
    {
      key: "upsells", label: "Upsell products", type: "list", group: "Upsells",
      hint: "Preview only. Pick the real products in the Shopify theme editor",
      itemFields: [
        { key: "name", label: "Name", type: "text" },
        { key: "detail", label: "Descriptor", type: "text" },
        { key: "price", label: "Price", type: "text" },
        { key: "image", label: "Image URL", type: "text" },
      ],
      newItem: { name: "Lip Gloss", detail: "Sheer shine", price: "16", image: "/mockups/set-balm.jpg" },
      addLabel: "Add product", max: 6,
    },
    { key: "subtotalLabel", label: "Subtotal label", type: "text", group: "Checkout" },
    { key: "checkoutText", label: "Checkout button", type: "text", group: "Checkout" },
    { key: "noteText", label: "Note under the button", type: "text", group: "Checkout" },
    fontField("Typography"),
    { key: "radius", label: "Corner radius", type: "slider", group: "Layout", min: 0, max: 24, step: 2, unit: "px" },
    { key: "accent", label: "Accent", type: "color", group: "Colors" },
    { key: "pink", label: "Tracker & gift", type: "color", group: "Colors" },
    { key: "tile", label: "Tiles & chips", type: "color", group: "Colors" },
    { key: "bg", label: "Background", type: "color", group: "Colors" },
    { key: "textColor", label: "Text", type: "color", group: "Colors" },
    { key: "muted", label: "Muted text", type: "color", group: "Colors" },
    { key: "buttonBg", label: "Checkout button", type: "color", group: "Colors" },
    { key: "buttonText2", label: "Checkout label", type: "color", group: "Colors" },
  ],
};
