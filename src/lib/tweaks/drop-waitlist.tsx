"use client";

import { useEffect, useState, type CSSProperties, type FormEvent } from "react";
import type { Tweak, TweakConfig } from "../types";
import { str, num, bool, fontStack } from "../cfg";
import { fontField } from "../fields";
import { buildSchema, section, fontFaceFor } from "../liquid";
import { money, toNum } from "./product-art";

/* ============================================================
   Drop Waitlist
   A calm product-drop teaser: a beige product photo, a lowercase
   product name, the drop time in small caps, a live countdown
   (days / hours / min / sec), a "join the waitlist" email field
   with a success state and a "1,284 people waiting" counter.
   Once the drop time passes it flips to "available now" with a
   shop now button. The Liquid posts a real customer form with a
   tag, so the waitlist lands in Shopify customers.
   ============================================================ */

const EASE = "cubic-bezier(.22,1,.36,1)";
/** Rolling demo countdown for the preview once the set date has passed. */
const DEMO_MS = ((4 * 24 + 13) * 60 + 27) * 60 * 1000 + 45 * 1000;

const defaults: TweakConfig = {
  label: "new drop",
  dropNo: "no. 04",
  name: "soft-focus serum",
  description: "a weightless peptide serum that blurs, plumps and leaves skin looking glassy. first batch of 3,000.",
  dateLabel: "drops friday 9am pt",
  dropAt: "2026-11-27T09:00:00-08:00",
  previewState: "before",
  image: "/mockups/award-serum.jpg",
  imageTag: "coming soon",
  daysLabel: "days",
  hoursLabel: "hours",
  minLabel: "min",
  secLabel: "sec",
  placeholder: "email address",
  buttonText: "join the waitlist",
  successTitle: "you're on the list",
  successText: "we'll email you the minute it drops. waitlist gets a one-hour head start.",
  waitingCount: "1284",
  waitingText: "people waiting",
  privacyText: "no spam. one email when it drops.",
  liveLabel: "available now",
  liveText: "the wait is over. first batch ships monday.",
  currency: "$",
  price: "32",
  shopText: "shop now",
  bg: "#F1F0ED",
  card: "#FFFFFF",
  textColor: "#303030",
  accent: "#67645E",
  muted: "#84827E",
  buttonBg: "#303030",
  buttonText2: "#FFFFFF",
  font: "system",
  lowercase: true,
  radius: 2,
};

/** Hex color + alpha byte, e.g. tint("#303030", 0.12). */
const tint = (hex: string, a: number) =>
  /^#[0-9a-f]{6}$/i.test(hex)
    ? hex + Math.round(a * 255).toString(16).padStart(2, "0")
    : hex;

const pad = (n: number) => String(Math.max(0, n)).padStart(2, "0");
const fmtCount = (n: number) => Math.round(n).toLocaleString("en-US");

function split(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return [Math.floor(s / 86400), Math.floor((s % 86400) / 3600), Math.floor((s % 3600) / 60), s % 60];
}

function Preview({ config }: { config: TweakConfig }) {
  const bg = str(config, "bg", "#F1F0ED");
  const card = str(config, "card", "#FFFFFF");
  const text = str(config, "textColor", "#303030");
  const accent = str(config, "accent", "#67645E");
  const muted = str(config, "muted", "#84827E");
  const btnBg = str(config, "buttonBg", "#303030");
  const btnText = str(config, "buttonText2", "#FFFFFF");
  const radius = num(config, "radius", 2);
  const line = tint(text, 0.14);
  const lower = bool(config, "lowercase", true);
  const caps: CSSProperties = { letterSpacing: "0.16em" };

  const [now, setNow] = useState<number | null>(null);
  const [mountAt, setMountAt] = useState<number | null>(null);
  const [email, setEmail] = useState("");
  const [joined, setJoined] = useState(false);
  const [bad, setBad] = useState(false);

  useEffect(() => {
    const start = Date.now();
    const r = requestAnimationFrame(() => {
      setMountAt(start);
      setNow(Date.now());
    });
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      cancelAnimationFrame(r);
      clearInterval(id);
    };
  }, []);

  const live = str(config, "previewState") === "after";
  const parsed = Date.parse(str(config, "dropAt"));
  const target = Number.isFinite(parsed) && now !== null && parsed > now ? parsed : mountAt !== null ? mountAt + DEMO_MS : null;
  const parts = target !== null && now !== null ? split(target - now) : null;
  const units = [str(config, "daysLabel"), str(config, "hoursLabel"), str(config, "minLabel"), str(config, "secLabel")];
  const waiting = Math.round(toNum(str(config, "waitingCount"))) + (joined ? 1 : 0);
  const image = str(config, "image").trim();

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setBad(true);
      return;
    }
    setBad(false);
    setJoined(true);
  };

  return (
    <div className="@container w-full" style={{ background: bg, color: text, fontFamily: fontStack(str(config, "font", "system")) }}>
      <div className="mx-auto grid w-full max-w-[1100px] @min-[640px]:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] @min-[640px]:items-center @min-[640px]:gap-12 @min-[640px]:p-10">
        {/* Photo */}
        <div className="relative aspect-square overflow-hidden @min-[640px]:aspect-[4/5]" style={{ background: card, borderRadius: 0 }}>
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={image}
              alt={str(config, "name")}
              loading="lazy"
              decoding="async"
              draggable={false}
              className="absolute inset-0 h-full w-full object-cover"
              style={{ objectPosition: "50% 62%", filter: live ? "none" : "saturate(.92)", transition: `filter 600ms ${EASE}` }}
            />
          ) : (
            <div aria-hidden className="absolute inset-0 grid place-items-center">
              <span className="h-[46%] w-[18%] rounded-t-[40%]" style={{ background: tint(accent, 0.25), boxShadow: `inset 0 -40px 0 ${tint(accent, 0.18)}` }} />
            </div>
          )}
          {str(config, "imageTag") && !live && (
            <span className="absolute left-4 top-4 flex items-center gap-2 px-2.5 py-[7px] text-[9.5px] font-medium uppercase leading-none backdrop-blur-md" style={{ ...caps, background: tint(card, 0.72), borderRadius: radius }}>
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60" style={{ background: accent }} />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full" style={{ background: accent }} />
              </span>
              {str(config, "imageTag")}
            </span>
          )}
          {str(config, "dropNo") && (
            <span className="absolute right-4 top-4 text-[10px] font-medium uppercase" style={{ ...caps, color: accent }}>
              {str(config, "dropNo")}
            </span>
          )}
        </div>

        {/* Copy */}
        <div className="min-w-0 px-5 pb-7 pt-6 @min-[640px]:p-0">
          <p className="flex items-center gap-2 text-[10px] font-medium uppercase" style={{ ...caps, color: accent }}>
            {live ? str(config, "liveLabel") : str(config, "label")}
          </p>
          <h3 className={`mt-2.5 text-[34px] font-medium leading-[1] tracking-[-0.04em] @min-[640px]:text-[48px] ${lower ? "lowercase" : ""}`}>
            {str(config, "name")}
          </h3>
          {str(config, "description") && (
            <p className="mt-3 max-w-[400px] text-[13.5px] leading-[1.55]" style={{ color: muted }}>
              {str(config, "description")}
            </p>
          )}

          {!live ? (
            <>
              <p className="mt-5 flex items-center gap-2 border-t pt-4 text-[10.5px] font-medium uppercase" style={{ ...caps, borderColor: line }}>
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden>
                  <circle cx="8" cy="8" r="6.2" />
                  <path d="M8 4.6V8l2.3 1.5" strokeLinecap="round" />
                </svg>
                {str(config, "dateLabel")}
              </p>

              {/* Countdown */}
              <div className="mt-3 grid grid-cols-4" role="timer" aria-live="off">
                {units.map((u, i) => (
                  <div key={i} className="min-w-0 border-l px-3 first:border-l-0 first:pl-0" style={{ borderColor: line }}>
                    <span className="block text-[38px] font-medium leading-none tracking-[-0.04em] tabular-nums @min-[640px]:text-[46px]">
                      {parts ? pad(parts[i]) : "00"}
                    </span>
                    <span className="mt-1.5 block text-[9.5px] font-medium uppercase" style={{ ...caps, color: muted }}>
                      {u}
                    </span>
                  </div>
                ))}
              </div>

              {/* Waitlist */}
              <div className="mt-6">
                {joined ? (
                  <div key="ok" className="bs-fade-up flex items-start gap-3 p-4" style={{ background: card, borderRadius: radius }}>
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full" style={{ background: btnBg, color: btnText }}>
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <path d="M2.5 6.3l2.3 2.2 4.7-5" />
                      </svg>
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[15px] font-medium tracking-[-0.02em]">{str(config, "successTitle")}</span>
                      <span className="mt-1 block text-[12.5px] leading-[1.5]" style={{ color: muted }}>
                        {str(config, "successText")}
                      </span>
                    </span>
                  </div>
                ) : (
                  <form onSubmit={submit} noValidate className="flex h-12 items-stretch gap-1 p-1" style={{ background: card, borderRadius: radius + 2, boxShadow: `inset 0 0 0 1px ${bad ? "#B4483A" : line}` }}>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setBad(false);
                      }}
                      placeholder={str(config, "placeholder")}
                      aria-label={str(config, "placeholder")}
                      className="min-w-0 flex-1 bg-transparent px-3 text-[13.5px] outline-none placeholder:text-[var(--m)]"
                      style={{ color: text, "--m": muted } as CSSProperties}
                    />
                    <button
                      type="submit"
                      className="shrink-0 px-4 text-[11px] font-medium uppercase transition-[filter,scale] duration-200 hover:brightness-125 active:scale-[0.97]"
                      style={{ ...caps, letterSpacing: "0.12em", background: btnBg, color: btnText, borderRadius: radius }}
                    >
                      {str(config, "buttonText")}
                    </button>
                  </form>
                )}
              </div>

              <div className="mt-3.5 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                {waiting > 0 && (
                  <p className="flex items-center gap-2 text-[12px]">
                    <span className="flex" aria-hidden>
                      {["#D8CFC4", "#BFB3A5", "#A39684"].map((c, i) => (
                        <span key={c} className="h-[18px] w-[18px] rounded-full" style={{ background: c, marginLeft: i ? -6 : 0, boxShadow: `0 0 0 2px ${bg}` }} />
                      ))}
                    </span>
                    <b key={waiting} className="bs-swap inline-block font-medium tabular-nums">
                      {fmtCount(waiting)}
                    </b>
                    <span style={{ color: muted }}>{str(config, "waitingText")}</span>
                  </p>
                )}
                {str(config, "privacyText") && !joined && (
                  <p className="text-[11px]" style={{ color: muted }}>
                    {str(config, "privacyText")}
                  </p>
                )}
              </div>
            </>
          ) : (
            <div key="live" className="bs-fade-up">
              <p className="mt-5 border-t pt-4 text-[13.5px] leading-[1.5]" style={{ borderColor: line }}>
                {str(config, "liveText")}
              </p>
              <div className="mt-5 flex items-center gap-4">
                <button
                  type="button"
                  className="h-12 flex-1 px-6 text-[11.5px] font-medium uppercase transition-[filter,scale] duration-200 hover:brightness-125 active:scale-[0.98] @min-[640px]:flex-none"
                  style={{ letterSpacing: "0.14em", background: btnBg, color: btnText, borderRadius: radius }}
                >
                  {str(config, "shopText")}
                </button>
                {toNum(str(config, "price")) > 0 && (
                  <span className="text-[18px] font-medium tracking-[-0.02em] tabular-nums">{money(toNum(str(config, "price")), str(config, "currency", "$"))}</span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------------- Liquid ---------------- */

function generateLiquid(config: TweakConfig): string {
  const { face, family } = fontFaceFor(str(config, "font", "system"));
  const S = ".bs-dw-{{ section.id }}";
  const r = "{{ section.settings.radius }}px";
  const line = "{{ section.settings.text_color | color_modify: 'alpha', 0.14 }}";
  const tick = `<svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2.5 6.3l2.3 2.2 4.7-5"/></svg>`;

  const style = `<style>
${face ? face + "\n" : ""}  ${S} { container-type: inline-size; background: {{ section.settings.bg }}; color: {{ section.settings.text_color }}; font-family: ${family}; }
  ${S} * { box-sizing: border-box; }
  ${S} p, ${S} h2 { margin: 0; }
  ${S} button, ${S} input { font: inherit; }
  ${S} .bs-caps { font-size: 10px; font-weight: 500; text-transform: uppercase; letter-spacing: .16em; }
  ${S} .bs-wrap { max-width: 1100px; margin: 0 auto; display: grid; }
  ${S} .bs-photo { position: relative; aspect-ratio: 1; overflow: hidden; background: {{ section.settings.card }}; }
  ${S} .bs-photo img, ${S} .bs-photo svg { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; object-position: 50% 62%; }
  ${S} .bs-tag { position: absolute; left: 16px; top: 16px; z-index: 1; display: flex; align-items: center; gap: 8px; padding: 7px 10px; font-size: 9.5px; line-height: 1; border-radius: ${r};
    background: {{ section.settings.card | color_modify: 'alpha', 0.72 }}; -webkit-backdrop-filter: blur(12px); backdrop-filter: blur(12px); }
  ${S} .bs-tag i { position: relative; width: 6px; height: 6px; border-radius: 99px; background: {{ section.settings.accent }}; }
  ${S} .bs-tag i::after { content: ""; position: absolute; inset: 0; border-radius: inherit; background: inherit; animation: bs-dw-ping 1.6s cubic-bezier(0,0,.2,1) infinite; }
  @keyframes bs-dw-ping { 75%, 100% { transform: scale(2.4); opacity: 0; } }
  ${S} .bs-no { position: absolute; right: 16px; top: 16px; z-index: 1; color: {{ section.settings.accent }}; }
  ${S} .bs-copy { min-width: 0; padding: 24px 20px 28px; }
  ${S} .bs-label { color: {{ section.settings.accent }}; }
  ${S} .bs-name { margin-top: 10px; font-size: 34px; font-weight: 500; line-height: 1; letter-spacing: -.04em;{% if section.settings.lowercase %} text-transform: lowercase;{% endif %} }
  ${S} .bs-desc { margin-top: 12px; max-width: 400px; font-size: 13.5px; line-height: 1.55; color: {{ section.settings.muted }}; }
  ${S} .bs-date { display: flex; align-items: center; gap: 8px; margin-top: 20px; padding-top: 16px; border-top: 1px solid ${line}; font-size: 10.5px; }
  ${S} .bs-cd { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); margin-top: 12px; }
  ${S} .bs-cd > div { min-width: 0; padding: 0 12px; border-left: 1px solid ${line}; }
  ${S} .bs-cd > div:first-child { padding-left: 0; border-left: 0; }
  ${S} .bs-cd b { display: block; font-size: 38px; font-weight: 500; line-height: 1; letter-spacing: -.04em; font-variant-numeric: tabular-nums; }
  ${S} .bs-cd span { display: block; margin-top: 6px; font-size: 9.5px; color: {{ section.settings.muted }}; }
  ${S} .bs-wl { margin-top: 24px; }
  ${S} .bs-form { margin: 0; }
  ${S} .bs-field { display: flex; align-items: stretch; gap: 4px; height: 48px; padding: 4px; border-radius: {{ section.settings.radius | plus: 2 }}px; background: {{ section.settings.card }};
    box-shadow: inset 0 0 0 1px ${line}; transition: box-shadow .2s; }
  ${S} .bs-field:focus-within { box-shadow: inset 0 0 0 1px {{ section.settings.text_color }}; }
  ${S} .bs-field.is-bad { box-shadow: inset 0 0 0 1px #b4483a; }
  ${S} .bs-field input { flex: 1; min-width: 0; padding: 0 12px; border: 0; outline: none; background: transparent; font-size: 13.5px; color: {{ section.settings.text_color }}; }
  ${S} .bs-field input::placeholder { color: {{ section.settings.muted }}; }
  ${S} .bs-btn { flex-shrink: 0; padding: 0 16px; border: 0; border-radius: ${r}; cursor: pointer; font-size: 11px; font-weight: 500; text-transform: uppercase; letter-spacing: .12em;
    background: {{ section.settings.button_bg }}; color: {{ section.settings.button_fg }}; text-decoration: none; display: inline-flex; align-items: center; justify-content: center; transition: filter .2s, transform .2s; }
  ${S} .bs-btn:hover { filter: brightness(1.25); }
  ${S} .bs-btn:active { transform: scale(.97); }
  ${S} .bs-ok { display: flex; align-items: flex-start; gap: 12px; padding: 16px; border-radius: ${r}; background: {{ section.settings.card }}; }
  ${S} .bs-ok-i { width: 28px; height: 28px; flex-shrink: 0; display: grid; place-items: center; border-radius: 99px; background: {{ section.settings.button_bg }}; color: {{ section.settings.button_fg }}; }
  ${S} .bs-ok b { display: block; font-size: 15px; font-weight: 500; letter-spacing: -.02em; }
  ${S} .bs-ok span { display: block; margin-top: 4px; font-size: 12.5px; line-height: 1.5; color: {{ section.settings.muted }}; }
  ${S} .bs-error { margin-top: 8px; font-size: 12px; color: #b4483a; }
  ${S} .bs-meta { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px 16px; margin-top: 14px; }
  ${S} .bs-wait { display: flex; align-items: center; gap: 8px; font-size: 12px; }
  ${S} .bs-wait b { font-weight: 500; font-variant-numeric: tabular-nums; }
  ${S} .bs-wait em { font-style: normal; color: {{ section.settings.muted }}; }
  ${S} .bs-av { display: flex; }
  ${S} .bs-av i { width: 18px; height: 18px; border-radius: 99px; box-shadow: 0 0 0 2px {{ section.settings.bg }}; }
  ${S} .bs-av i + i { margin-left: -6px; }
  ${S} .bs-priv { font-size: 11px; color: {{ section.settings.muted }}; }
  ${S} .bs-live-t { margin-top: 20px; padding-top: 16px; border-top: 1px solid ${line}; font-size: 13.5px; line-height: 1.5; }
  ${S} .bs-shop { display: flex; align-items: center; gap: 16px; margin-top: 20px; }
  ${S} .bs-shop .bs-btn { flex: 1; height: 48px; padding: 0 24px; font-size: 11.5px; letter-spacing: .14em; }
  ${S} .bs-shop span { font-size: 18px; font-weight: 500; letter-spacing: -.02em; font-variant-numeric: tabular-nums; }
  ${S} [data-live] { display: none; }
  ${S}.is-live [data-live] { display: block; }
  ${S}.is-live [data-soon] { display: none; }
  @container (min-width: 640px) {
    ${S} .bs-wrap { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); align-items: center; gap: 48px; padding: 40px; }
    ${S} .bs-photo { aspect-ratio: 4 / 5; }
    ${S} .bs-copy { padding: 0; }
    ${S} .bs-name { font-size: 48px; }
    ${S} .bs-cd b { font-size: 46px; }
    ${S} .bs-shop .bs-btn { flex: none; }
  }
  @media (prefers-reduced-motion: reduce) { ${S} .bs-tag i::after { animation: none; } }
</style>`;

  const clock = `<svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.2" aria-hidden="true"><circle cx="8" cy="8" r="6.2"/><path d="M8 4.6V8l2.3 1.5" stroke-linecap="round"/></svg>`;

  const markup = `{%- comment -%}
  Drop Waitlist by boost.supply. Add it to your homepage or a landing page.
  - Drop time: an ISO date with its UTC offset, e.g. 2026-11-27T09:00:00-08:00
    (9am Pacific). The countdown runs in the shopper's browser and the section
    flips to "available now" with the shop button once that time has passed.
  - The waitlist posts Shopify's customer form: every email becomes a customer
    with the tag below, subscribed to email marketing (like a newsletter form). Filter customers by that tag
    to email the list (Shopify Email, Klaviyo and others can segment on it).
  - "People waiting" is a number you set; it goes up by one for the shopper who
    just joined. Swap it for a live count from your email app if you have one.
  - Pick the drop product to link the shop button, show its price and use its
    image when no photo is picked.
{%- endcomment -%}
{%- liquid
  assign bs_p = section.settings.product
  assign bs_img = section.settings.image
  if bs_img == blank and bs_p != blank
    assign bs_img = bs_p.featured_image
  endif
  assign bs_now = 'now' | date: '%s' | plus: 0
  assign bs_drop = section.settings.drop_at | date: '%s' | plus: 0
  assign bs_live = false
  if bs_drop > 0 and bs_now >= bs_drop
    assign bs_live = true
  endif
  assign bs_shop_url = section.settings.shop_url
  if bs_shop_url == blank and bs_p != blank
    assign bs_shop_url = bs_p.url
  endif
  if bs_shop_url == blank
    assign bs_shop_url = routes.all_products_collection_url
  endif
  assign bs_fid = 'bs-dw-form-' | append: section.id
-%}
<div class="bs-dw-{{ section.id }}{% if bs_live %} is-live{% endif %}" id="bs-dw-{{ section.id }}" data-drop="{{ section.settings.drop_at | escape }}">
  <div class="bs-wrap">
    <div class="bs-photo">
      {%- if bs_img != blank -%}
        {{ bs_img | image_url: width: 1400 | image_tag: loading: 'lazy', alt: section.settings.name, sizes: '(min-width: 990px) 560px, 100vw' }}
      {%- else -%}
        {{ 'product-1' | placeholder_svg_tag }}
      {%- endif -%}
      {%- if section.settings.image_tag != blank -%}<span class="bs-caps bs-tag" data-soon><i aria-hidden="true"></i>{{ section.settings.image_tag }}</span>{%- endif -%}
      {%- if section.settings.drop_no != blank -%}<span class="bs-caps bs-no">{{ section.settings.drop_no }}</span>{%- endif -%}
    </div>

    <div class="bs-copy">
      <p class="bs-caps bs-label"><span data-soon>{{ section.settings.label }}</span><span data-live>{{ section.settings.live_label }}</span></p>
      <h2 class="bs-name">{{ section.settings.name }}</h2>
      {%- if section.settings.description != blank -%}<p class="bs-desc">{{ section.settings.description }}</p>{%- endif -%}

      <div data-soon>
        <p class="bs-caps bs-date">${clock}{{ section.settings.date_label }}</p>
        <div class="bs-cd" role="timer" data-cd>
          <div><b data-u="d">00</b><span class="bs-caps">{{ section.settings.days_label }}</span></div>
          <div><b data-u="h">00</b><span class="bs-caps">{{ section.settings.hours_label }}</span></div>
          <div><b data-u="m">00</b><span class="bs-caps">{{ section.settings.min_label }}</span></div>
          <div><b data-u="s">00</b><span class="bs-caps">{{ section.settings.sec_label }}</span></div>
        </div>

        <div class="bs-wl">
          {%- form 'customer', id: bs_fid, class: 'bs-form', novalidate: 'novalidate' -%}
            {%- assign bs_count = section.settings.waiting_count -%}
            {%- if form.posted_successfully? -%}
              {%- assign bs_count = bs_count | plus: 1 -%}
              <div class="bs-ok" role="status">
                <span class="bs-ok-i">${tick}</span>
                <span style="margin:0"><b>{{ section.settings.success_title }}</b><span>{{ section.settings.success_text }}</span></span>
              </div>
            {%- else -%}
              <input type="hidden" name="contact[tags]" value="{{ section.settings.customer_tag | escape }}">
              <div class="bs-field{% if form.errors %} is-bad{% endif %}">
                <input type="email" name="contact[email]" required autocomplete="email" placeholder="{{ section.settings.placeholder | escape }}" aria-label="{{ section.settings.placeholder | escape }}">
                <button type="submit" class="bs-btn">{{ section.settings.button_text }}</button>
              </div>
              {%- if form.errors -%}<p class="bs-error" role="alert">{{ form.errors.translated_fields.email | capitalize }} {{ form.errors.messages.email }}</p>{%- endif -%}
            {%- endif -%}
            <div class="bs-meta">
              {%- if bs_count > 0 -%}
                {%- if bs_count >= 1000 -%}
                  {%- assign bs_th = bs_count | divided_by: 1000 -%}
                  {%- assign bs_rest = bs_count | modulo: 1000 | prepend: '00' | slice: -3, 3 -%}
                  {%- assign bs_count_fmt = bs_th | append: ',' | append: bs_rest -%}
                {%- else -%}
                  {%- assign bs_count_fmt = bs_count -%}
                {%- endif -%}
                <p class="bs-wait"><span class="bs-av" aria-hidden="true"><i style="background:#d8cfc4"></i><i style="background:#bfb3a5"></i><i style="background:#a39684"></i></span><b>{{ bs_count_fmt }}</b><em>{{ section.settings.waiting_text }}</em></p>
              {%- endif -%}
              {%- unless form.posted_successfully? -%}{%- if section.settings.privacy_text != blank -%}<p class="bs-priv">{{ section.settings.privacy_text }}</p>{%- endif -%}{%- endunless -%}
            </div>
          {%- endform -%}
        </div>
      </div>

      <div data-live>
        {%- if section.settings.live_text != blank -%}<p class="bs-live-t">{{ section.settings.live_text }}</p>{%- endif -%}
        <div class="bs-shop">
          <a class="bs-btn" href="{{ bs_shop_url }}">{{ section.settings.shop_text }}</a>
          {%- if bs_p != blank -%}<span>{{ bs_p.price | money }}</span>{%- endif -%}
        </div>
      </div>
    </div>
  </div>
</div>
<script>
  (function () {
    var root = document.getElementById('bs-dw-{{ section.id }}');
    if (!root) return;
    var drop = Date.parse(root.dataset.drop);
    var cd = root.querySelector('[data-cd]');
    if (!isFinite(drop)) { if (cd) cd.hidden = true; return; }
    var u = {};
    ['d', 'h', 'm', 's'].forEach(function (k) { u[k] = root.querySelector('[data-u="' + k + '"]'); });
    function pad(n) { return (n < 10 ? '0' : '') + n; }
    function tick() {
      var left = Math.max(0, Math.floor((drop - Date.now()) / 1000));
      if (left === 0) { root.classList.add('is-live'); clearInterval(timer); return; }
      root.classList.remove('is-live');
      u.d.textContent = pad(Math.floor(left / 86400));
      u.h.textContent = pad(Math.floor(left % 86400 / 3600));
      u.m.textContent = pad(Math.floor(left % 3600 / 60));
      u.s.textContent = pad(left % 60);
    }
    var timer = setInterval(tick, 1000);
    tick();
    if (window.location.hash === '#' + {{ bs_fid | json }} || root.querySelector('.bs-ok')) {
      root.scrollIntoView({ block: 'center' });
    }
  })();
</script>`;

  const schema = buildSchema({
    name: "Drop Waitlist",
    settings: [
      { type: "text", id: "label", label: "Label (before the drop)", default: str(config, "label") },
      { type: "text", id: "drop_no", label: "Drop number", default: str(config, "dropNo") },
      { type: "text", id: "name", label: "Product name", default: str(config, "name") },
      { type: "textarea", id: "description", label: "Description", default: str(config, "description") },
      { type: "product", id: "product", label: "Drop product (optional)", info: "Links the shop button, shows the price and lends its image." },
      { type: "image_picker", id: "image", label: "Photo", info: "Leave empty to use the drop product's image." },
      { type: "text", id: "image_tag", label: "Photo tag", default: str(config, "imageTag") },
      { type: "header", content: "Drop time" },
      { type: "text", id: "drop_at", label: "Drop date and time (ISO with offset)", default: str(config, "dropAt") },
      { type: "text", id: "date_label", label: "Drop time label", default: str(config, "dateLabel") },
      { type: "text", id: "days_label", label: "Days label", default: str(config, "daysLabel") },
      { type: "text", id: "hours_label", label: "Hours label", default: str(config, "hoursLabel") },
      { type: "text", id: "min_label", label: "Minutes label", default: str(config, "minLabel") },
      { type: "text", id: "sec_label", label: "Seconds label", default: str(config, "secLabel") },
      { type: "header", content: "Waitlist" },
      { type: "text", id: "placeholder", label: "Email placeholder", default: str(config, "placeholder") },
      { type: "text", id: "button_text", label: "Button text", default: str(config, "buttonText") },
      { type: "text", id: "customer_tag", label: "Customer tag", default: "waitlist, drop-" + (str(config, "name").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "drop") },
      { type: "text", id: "success_title", label: "Success title", default: str(config, "successTitle") },
      { type: "textarea", id: "success_text", label: "Success text", default: str(config, "successText") },
      { type: "number", id: "waiting_count", label: "People waiting", default: Math.max(0, Math.round(toNum(str(config, "waitingCount")))) },
      { type: "text", id: "waiting_text", label: "“people waiting” text", default: str(config, "waitingText") },
      { type: "text", id: "privacy_text", label: "Privacy line", default: str(config, "privacyText") },
      { type: "header", content: "After the drop" },
      { type: "text", id: "live_label", label: "Label", default: str(config, "liveLabel") },
      { type: "textarea", id: "live_text", label: "Text", default: str(config, "liveText") },
      { type: "text", id: "shop_text", label: "Shop button", default: str(config, "shopText") },
      { type: "url", id: "shop_url", label: "Shop button link (defaults to the drop product)" },
      { type: "header", content: "Style" },
      { type: "checkbox", id: "lowercase", label: "Lowercase product name", default: bool(config, "lowercase", true) },
      { type: "color", id: "bg", label: "Background", default: str(config, "bg") },
      { type: "color", id: "card", label: "Field & photo background", default: str(config, "card") },
      { type: "color", id: "text_color", label: "Text", default: str(config, "textColor") },
      { type: "color", id: "accent", label: "Accent (labels)", default: str(config, "accent") },
      { type: "color", id: "muted", label: "Muted text", default: str(config, "muted") },
      { type: "color", id: "button_bg", label: "Button", default: str(config, "buttonBg") },
      { type: "color", id: "button_fg", label: "Button label", default: str(config, "buttonText2") },
      { type: "range", id: "radius", label: "Corner radius", min: 0, max: 16, step: 1, unit: "px", default: Math.max(0, Math.min(16, Math.round(num(config, "radius", 2)))) },
    ],
  });

  return section({ style, markup, schema });
}

export const dropWaitlist: Tweak = {
  slug: "drop-waitlist",
  inspiredBy: "rhode",
  name: "Drop Waitlist",
  tagline: "A calm launch teaser with a live countdown, a waitlist signup and a flip to “shop now”.",
  description:
    "Modeled on the product-drop teasers Rhode runs before a launch. A quiet product photo, a lowercase product name, the drop time in small caps and a live days / hours / min / sec countdown, with a “join the waitlist” email field, a success state and a “people waiting” counter for social proof. When the drop time passes it flips to “available now” with a shop button. In Shopify the signup is a real customer form with a tag, so the list lives in your customers, ready to email the moment it drops.",
  category: "homepage",
  tier: "free",
  tint: "#f1f0ed",
  Preview,
  generateLiquid,
  defaults,
  fields: [
    { key: "label", label: "Label", type: "text", group: "Content" },
    { key: "dropNo", label: "Drop number", type: "text", group: "Content", hint: "Leave empty to hide" },
    { key: "name", label: "Product name", type: "text", group: "Content" },
    { key: "description", label: "Description", type: "textarea", group: "Content" },
    { key: "image", label: "Image URL", type: "text", group: "Media", hint: "Editor preview only. In Shopify you pick the photo in the theme editor (or it uses the drop product's image)", placeholder: "https://…" },
    { key: "imageTag", label: "Photo tag", type: "text", group: "Media", hint: "Leave empty to hide" },
    { key: "dropAt", label: "Drop date and time", type: "text", group: "Drop time", hint: "ISO with offset, e.g. 2026-11-27T09:00:00-08:00. Once it has passed, the preview keeps a demo countdown running" },
    { key: "dateLabel", label: "Drop time label", type: "text", group: "Drop time" },
    {
      key: "previewState", label: "Preview state", type: "select", group: "Drop time",
      options: [
        { label: "Before the drop (countdown)", value: "before" },
        { label: "After the drop (shop now)", value: "after" },
      ],
      hint: "Editor preview only. Your store switches by itself at the drop time",
    },
    { key: "daysLabel", label: "Days label", type: "text", group: "Drop time" },
    { key: "hoursLabel", label: "Hours label", type: "text", group: "Drop time" },
    { key: "minLabel", label: "Minutes label", type: "text", group: "Drop time" },
    { key: "secLabel", label: "Seconds label", type: "text", group: "Drop time" },
    { key: "placeholder", label: "Email placeholder", type: "text", group: "Waitlist" },
    { key: "buttonText", label: "Button text", type: "text", group: "Waitlist" },
    { key: "successTitle", label: "Success title", type: "text", group: "Waitlist" },
    { key: "successText", label: "Success text", type: "textarea", group: "Waitlist" },
    { key: "waitingCount", label: "People waiting", type: "text", group: "Waitlist", hint: "A number. Goes up by one when the shopper joins" },
    { key: "waitingText", label: "“people waiting” text", type: "text", group: "Waitlist" },
    { key: "privacyText", label: "Privacy line", type: "text", group: "Waitlist" },
    { key: "liveLabel", label: "Label", type: "text", group: "After the drop" },
    { key: "liveText", label: "Text", type: "textarea", group: "After the drop" },
    { key: "shopText", label: "Shop button", type: "text", group: "After the drop" },
    { key: "currency", label: "Currency symbol", type: "text", group: "After the drop" },
    { key: "price", label: "Price", type: "text", group: "After the drop", hint: "Preview only. Your store shows the drop product's price" },
    fontField("Typography"),
    { key: "lowercase", label: "Lowercase product name", type: "toggle", group: "Typography" },
    { key: "radius", label: "Corner radius", type: "slider", group: "Layout", min: 0, max: 16, step: 1, unit: "px" },
    { key: "bg", label: "Background", type: "color", group: "Colors" },
    { key: "card", label: "Field & photo background", type: "color", group: "Colors" },
    { key: "textColor", label: "Text", type: "color", group: "Colors" },
    { key: "accent", label: "Accent (labels)", type: "color", group: "Colors" },
    { key: "muted", label: "Muted text", type: "color", group: "Colors" },
    { key: "buttonBg", label: "Button", type: "color", group: "Colors" },
    { key: "buttonText2", label: "Button label", type: "color", group: "Colors" },
  ],
};
