"use client";

import { useState, useSyncExternalStore } from "react";
import type { Tweak, TweakConfig } from "../types";
import { str, num, list, fontStack, esc } from "../cfg";
import { fontField } from "../fields";
import { buildSchema, section, fontFaceFor } from "../liquid";

/* ============================================================
   Refill Flow
   How a refill subscription works, in three steps on a
   horizontal track: the welcome kit (a jar to keep), monthly
   refills in compostable pouches, and skip or pause anytime.
   Below, a delivery calendar strip shows the coming months with
   a "first delivery" date chip; tap a month to skip it. Hovering
   a step lights up the months it applies to. Ends on a CTA.
   ============================================================ */

const EASE = "cubic-bezier(.22,1,.36,1)";
const MONO = "ui-monospace, 'SF Mono', Menlo, monospace";

const defaults: TweakConfig = {
  eyebrow: "How refills work",
  heading: "Start once. Refills take care of themselves.",
  subheading: "Your first order is a glass jar to keep. After that, light refills arrive every month and you stay in control.",
  steps: [
    { tag: "Day one", title: "Your welcome kit", text: "A refillable glass jar with your first 30 days inside, delivered to your door.", image: "/mockups/timeline-capsules.jpg", art: "jar" },
    { tag: "Every 30 days", title: "Refills arrive monthly", text: "A compostable pouch slips through the letterbox. Top up the jar, then compost the pouch.", image: "", art: "pouch" },
    { tag: "Anytime", title: "Skip or pause anytime", text: "Stocked up or away? Skip a month or pause in two taps. No calls, no fees.", image: "", art: "controls" },
  ],
  calendarTitle: "Your first six months",
  months: 6,
  leadDays: 3,
  firstLabel: "First delivery",
  inDaysText: "in",
  daysText: "days",
  kitLabel: "Kit",
  refillLabel: "Refill",
  skipLabel: "Skipped",
  skipHint: "Tap a month to see how skipping works.",
  skipped: "4",
  deliveriesText: "deliveries",
  ctaText: "Start my refills",
  ctaNote: "From $49 a month · Cancel anytime",
  accent: "#1F3B2D",
  soft: "#DCE6C9",
  bg: "#F7F6F1",
  card: "#FFFFFF",
  textColor: "#1A1A1A",
  font: "system",
  radius: 20,
};

/** Hex color + alpha byte, e.g. tint("#1F3B2D", 0.14). */
const tint = (hex: string, a: number) =>
  /^#[0-9a-f]{6}$/i.test(hex)
    ? hex + Math.round(a * 255).toString(16).padStart(2, "0")
    : hex;

/* Step illustrations as plain SVG so preview and Liquid share them.
   Colours come from CSS variables set on the section root. */
const ART: Record<string, string> = {
  jar: `<svg viewBox="0 0 160 120" fill="none" aria-hidden="true"><ellipse cx="80" cy="104" rx="34" ry="4" fill="var(--bs-a)" opacity=".08"/><rect x="58" y="22" width="44" height="10" rx="3" fill="var(--bs-a)"/><path d="M56 36c0-2.2 1.8-4 4-4h40c2.2 0 4 1.8 4 4v58c0 5.5-4.5 10-10 10H66c-5.5 0-10-4.5-10-10z" fill="var(--bs-c)" opacity=".7" stroke="var(--bs-a)" stroke-opacity=".25"/><g fill="var(--bs-a)"><rect x="63" y="74" width="16" height="7" rx="3.5" transform="rotate(-18 71 77.5)" opacity=".85"/><rect x="80" y="80" width="16" height="7" rx="3.5" transform="rotate(12 88 83.5)" opacity=".55"/><rect x="66" y="88" width="16" height="7" rx="3.5" transform="rotate(8 74 91.5)" opacity=".7"/><rect x="83" y="66" width="16" height="7" rx="3.5" transform="rotate(-30 91 69.5)" opacity=".4"/></g><path d="M62 44v40" stroke="var(--bs-c)" stroke-width="3" stroke-linecap="round" opacity=".9"/></svg>`,
  pouch: `<svg viewBox="0 0 160 120" fill="none" aria-hidden="true"><ellipse cx="78" cy="106" rx="38" ry="4" fill="var(--bs-a)" opacity=".1"/><path d="M50 22h56l-2 6 2 6v64c0 4-3 7-7 7H57c-4 0-7-3-7-7V34l2-6z" fill="var(--bs-a)"/><path d="M50 34h56" stroke="var(--bs-c)" stroke-opacity=".35" stroke-dasharray="2 2.5"/><path d="M104 22l2 6-2 6" stroke="var(--bs-c)" stroke-opacity=".25"/><rect x="60" y="50" width="36" height="36" rx="5" fill="var(--bs-s)"/><path d="M78 76c-7-3-9-10-6-17 7 1 10 8 6 17zM78 76c0-6 1-10 4-13" stroke="var(--bs-a)" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/><rect x="66" y="80" width="24" height="2" rx="1" fill="var(--bs-a)" opacity=".35"/><g transform="rotate(-24 122 96)"><rect x="112" y="92" width="20" height="9" rx="4.5" fill="var(--bs-c)"/><rect x="122" y="92" width="10" height="9" rx="4.5" fill="var(--bs-a)" opacity=".7"/><rect x="122" y="92" width="4" height="9" fill="var(--bs-a)" opacity=".7"/></g><g transform="rotate(14 128 82)"><rect x="120" y="78" width="18" height="8" rx="4" fill="var(--bs-c)"/><rect x="129" y="78" width="9" height="8" rx="4" fill="var(--bs-a)" opacity=".45"/><rect x="129" y="78" width="3" height="8" fill="var(--bs-a)" opacity=".45"/></g></svg>`,
  controls: `<svg viewBox="0 0 160 120" fill="none" aria-hidden="true"><rect x="36" y="16" width="88" height="92" rx="12" fill="var(--bs-c)"/><rect x="36.5" y="16.5" width="87" height="91" rx="11.5" stroke="var(--bs-a)" stroke-opacity=".1"/><rect x="48" y="28" width="14" height="14" rx="4" fill="var(--bs-s)"/><path d="M51.5 33h7M53 30.5v3M57 30.5v3" stroke="var(--bs-a)" stroke-width="1.1" stroke-linecap="round"/><rect x="67" y="29.5" width="30" height="4" rx="2" fill="var(--bs-a)" opacity=".7"/><rect x="67" y="36.5" width="20" height="3" rx="1.5" fill="var(--bs-a)" opacity=".25"/><rect x="48" y="52" width="30" height="24" rx="8" fill="var(--bs-a)"/><path d="M57 59v10l6-5zM64 59v10l6-5" fill="var(--bs-c)"/><rect x="82" y="52" width="30" height="24" rx="8" fill="var(--bs-s)"/><rect x="92" y="59" width="3" height="10" rx="1" fill="var(--bs-a)"/><rect x="98" y="59" width="3" height="10" rx="1" fill="var(--bs-a)"/><rect x="48" y="88" width="34" height="3" rx="1.5" fill="var(--bs-a)" opacity=".25"/><rect x="94" y="84" width="18" height="11" rx="5.5" fill="var(--bs-a)"/><circle cx="106.5" cy="89.5" r="3.8" fill="var(--bs-c)"/></svg>`,
};

const GLYPH = {
  jar: "M8.5 4h7v3h-7zM7.5 7h9a1 1 0 0 1 1 1v10.5a2 2 0 0 1-2 2h-7a2 2 0 0 1-2-2V8a1 1 0 0 1 1-1zM9.5 12.5h5",
  pouch: "M6.5 4h11l-.8 2.5.8 2.5v9.5a1.5 1.5 0 0 1-1.5 1.5h-8a1.5 1.5 0 0 1-1.5-1.5V9l.8-2.5zM6.5 9h11M10.5 16.5c-.2-2.4 1.2-3.9 3.5-4.2.2 2.4-1.3 3.9-3.5 4.2z",
  skip: "M7 7l10 10M17 7L7 17",
};

/* today's date, read on the client only so server and client markup match */
const noop = () => () => {};
const dayKey = () => new Date().toDateString();

function Preview({ config }: { config: TweakConfig }) {
  const accent = str(config, "accent", "#1F3B2D");
  const soft = str(config, "soft", "#DCE6C9");
  const bg = str(config, "bg", "#F7F6F1");
  const card = str(config, "card", "#FFFFFF");
  const text = str(config, "textColor", "#1A1A1A");
  const radius = num(config, "radius", 20);
  const ri = Math.max(8, radius - 6);
  const steps = list(config, "steps");
  const months = Math.max(3, Math.min(12, Math.round(num(config, "months", 6))));
  const lead = Math.max(0, Math.round(num(config, "leadDays", 3)));

  const today = useSyncExternalStore(noop, dayKey, () => "");
  const first = today ? new Date(new Date(today).getTime() + lead * 864e5) : null;
  const monthName = (i: number) => {
    if (!first) return `M${i + 1}`;
    const d = new Date(first.getFullYear(), first.getMonth() + i, 1);
    return d.toLocaleDateString("en-US", { month: "short" });
  };
  const firstText = first
    ? first.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
    : `${str(config, "inDaysText")} ${lead} ${str(config, "daysText")}`;

  /* skipped months: seeded from the editor, toggled by tapping */
  const seed = str(config, "skipped")
    .split(",")
    .map((x) => parseInt(x.trim(), 10) - 1)
    .filter((n) => n > 0);
  const seedKey = seed.join(",");
  const [prevSeed, setPrevSeed] = useState(seedKey);
  const [skipped, setSkipped] = useState<number[]>(seed);
  const [hot, setHot] = useState(-1);
  if (seedKey !== prevSeed) {
    setPrevSeed(seedKey);
    setSkipped(seed);
  }
  const toggle = (i: number) => setSkipped((s) => (s.includes(i) ? s.filter((x) => x !== i) : [...s, i]));
  const deliveries = Array.from({ length: months }, (_, i) => i).filter((i) => !skipped.includes(i)).length;

  /* which months a step "applies to", for the hover link */
  const lit = (i: number) => {
    if (hot < 0) return false;
    const kind = steps[hot]?.art;
    if (kind === "jar" || hot === 0) return i === 0;
    if (kind === "controls") return skipped.includes(i);
    return i > 0 && !skipped.includes(i);
  };

  const vars = { ["--bs-a" as string]: accent, ["--bs-s" as string]: soft, ["--bs-c" as string]: card, ["--bs-b" as string]: bg };

  return (
    <div className="@container w-full" style={{ background: bg, color: text, fontFamily: fontStack(str(config, "font", "system")), ...vars }}>
      <div className="mx-auto w-full max-w-[1120px] px-4 py-8 @min-[680px]:px-10 @min-[680px]:py-12">
        {/* header */}
        <div className="px-1 @min-[680px]:px-0">
          {str(config, "eyebrow") && (
            <p className="text-[12.5px]" style={{ color: accent }}>
              {str(config, "eyebrow")}
            </p>
          )}
          <h3 className="mt-2 max-w-[620px] text-[26px] font-light leading-[1.1] tracking-[-0.025em] @min-[680px]:text-[36px]">{str(config, "heading")}</h3>
          {str(config, "subheading") && (
            <p className="mt-3 max-w-[520px] text-[13.5px] leading-relaxed" style={{ color: tint(text, 0.62) }}>
              {str(config, "subheading")}
            </p>
          )}
        </div>

        {/* step track */}
        <div className="bs-no-scrollbar -mx-4 mt-7 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-4 px-4 pb-1 @min-[680px]:mx-0 @min-[680px]:grid @min-[680px]:grid-cols-3 @min-[680px]:gap-4 @min-[680px]:overflow-visible @min-[680px]:px-0">
          {steps.map((s, i) => {
            const on = hot === i;
            const photo = (s.image ?? "").trim();
            const art = ART[s.art ?? ""] ?? "";
            return (
              <div
                key={i}
                role="button"
                tabIndex={0}
                aria-pressed={on}
                onMouseEnter={() => setHot(i)}
                onMouseLeave={() => setHot(-1)}
                onFocus={() => setHot(i)}
                onBlur={() => setHot(-1)}
                onClick={() => setHot(on ? -1 : i)}
                className="relative flex w-[78%] shrink-0 snap-start flex-col outline-none transition-[translate,box-shadow] duration-500 @min-[520px]:w-[46%] @min-[680px]:w-auto"
                style={{
                  background: card,
                  borderRadius: radius,
                  boxShadow: on ? `0 0 0 1.5px ${accent}, 0 18px 40px -24px ${tint(accent, 0.45)}` : `0 0 0 1px ${tint(accent, 0.08)}`,
                  translate: on ? "0 -3px" : "0 0",
                  transitionTimingFunction: EASE,
                }}
              >
                <div className="relative m-2 aspect-[4/3] overflow-hidden" style={{ background: soft, borderRadius: ri }}>
                  {photo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={photo} alt="" loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover" />
                  ) : art ? (
                    <div className="absolute inset-0 grid place-items-center p-3 [&>svg]:h-full [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: art }} />
                  ) : null}
                  <span
                    className="absolute left-2.5 top-2.5 grid h-7 w-7 place-items-center rounded-full text-[11px] tabular-nums transition-colors duration-300"
                    style={{ background: on ? accent : tint(card, 0.9), color: on ? card : accent, fontFamily: MONO }}
                  >
                    {i + 1}
                  </span>
                </div>
                <div className="flex flex-1 flex-col px-4 pb-5 pt-2">
                  {s.tag && (
                    <span className="self-start rounded-full px-2 py-[3px] text-[10.5px] uppercase tracking-[0.04em]" style={{ background: soft, color: accent, fontFamily: MONO }}>
                      {s.tag}
                    </span>
                  )}
                  <p className="mt-3 text-[16px] leading-snug tracking-[-0.01em]">{s.title}</p>
                  <p className="mt-1.5 text-[13px] leading-relaxed" style={{ color: tint(text, 0.62) }}>
                    {s.text}
                  </p>
                </div>
                {i < steps.length - 1 && (
                  <span
                    aria-hidden
                    className="absolute -right-[13px] top-[calc(50%-12px)] z-[1] hidden h-6 w-6 place-items-center rounded-full @min-[680px]:grid"
                    style={{ background: bg, color: accent }}
                  >
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M2.5 8h11M9 3.5L13.5 8 9 12.5" />
                    </svg>
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* calendar strip */}
        <div className="mt-4 p-5 @min-[680px]:mt-5 @min-[680px]:p-7" style={{ background: accent, color: card, borderRadius: radius }}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[16px] font-light tracking-[-0.01em] @min-[680px]:text-[18px]">{str(config, "calendarTitle")}</p>
              <p className="mt-1 text-[11.5px] tabular-nums" style={{ color: tint(card, 0.6), fontFamily: MONO }}>
                {deliveries} {str(config, "deliveriesText")}
                {skipped.length > 0 && ` · ${skipped.filter((x) => x < months).length} ${str(config, "skipLabel").toLowerCase()}`}
              </p>
            </div>
            <span key={firstText} className="bs-swap inline-flex items-center gap-2 rounded-full py-1.5 pl-1.5 pr-3 text-[12px]" style={{ background: soft, color: accent }}>
              <span className="grid h-6 w-6 place-items-center rounded-full" style={{ background: accent, color: soft }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <rect x="4" y="5.5" width="16" height="14" rx="3" />
                  <path d="M4 10h16M8.5 3.5v3.5M15.5 3.5v3.5" />
                </svg>
              </span>
              <span style={{ color: tint(accent, 0.7) }}>{str(config, "firstLabel")}</span>
              <span className="font-medium tabular-nums">{firstText}</span>
            </span>
          </div>

          <div className="relative mt-6">
            <div aria-hidden className="absolute inset-x-[calc(50%/var(--n))] top-[17px] h-px" style={{ ["--n" as string]: months, background: tint(card, 0.2) }} />
            <div className="relative grid" style={{ gridTemplateColumns: `repeat(${months}, minmax(0, 1fr))` }}>
              {Array.from({ length: months }, (_, i) => {
                const isSkip = i > 0 && skipped.includes(i);
                const glow = lit(i);
                return (
                  <button
                    key={i}
                    type="button"
                    disabled={i === 0}
                    aria-pressed={isSkip}
                    aria-label={`${monthName(i)}: ${i === 0 ? str(config, "kitLabel") : isSkip ? str(config, "skipLabel") : str(config, "refillLabel")}`}
                    onClick={() => toggle(i)}
                    className="group/m flex min-w-0 flex-col items-center gap-2 disabled:cursor-default"
                  >
                    <span
                      className="grid h-[34px] w-[34px] place-items-center rounded-full transition-[background-color,color,box-shadow,scale] duration-300 group-enabled/m:group-hover/m:scale-110 group-active/m:scale-95"
                      style={{
                        background: isSkip ? accent : i === 0 ? soft : card,
                        color: isSkip ? tint(card, 0.55) : accent,
                        boxShadow: [isSkip ? `inset 0 0 0 1px ${tint(card, 0.35)}` : "", glow ? `0 0 0 3px ${accent}, 0 0 0 4.5px ${soft}` : ""].filter(Boolean).join(", ") || "none",
                        transitionTimingFunction: EASE,
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <path d={i === 0 ? GLYPH.jar : isSkip ? GLYPH.skip : GLYPH.pouch} />
                      </svg>
                    </span>
                    <span className="text-[10.5px] uppercase tracking-[0.04em]" style={{ fontFamily: MONO, color: isSkip ? tint(card, 0.45) : card, textDecoration: isSkip ? "line-through" : "none" }}>
                      {monthName(i)}
                    </span>
                    <span className="-mt-1 hidden truncate text-[10.5px] @min-[420px]:block" style={{ color: tint(card, isSkip ? 0.45 : 0.62) }}>
                      {i === 0 ? str(config, "kitLabel") : isSkip ? str(config, "skipLabel") : str(config, "refillLabel")}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-4 border-t pt-5 @min-[560px]:flex-row @min-[560px]:items-center @min-[560px]:justify-between" style={{ borderColor: tint(card, 0.14) }}>
            <p className="text-[12px] leading-snug" style={{ color: tint(card, 0.62) }}>
              {str(config, "skipHint")}
            </p>
            <div className="flex flex-col items-stretch gap-2 @min-[560px]:items-end">
              <button
                type="button"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full px-6 text-[14px] font-medium transition-[filter,scale] duration-300 hover:brightness-105 active:scale-[.98]"
                style={{ background: soft, color: accent, transitionTimingFunction: EASE }}
              >
                {str(config, "ctaText")}
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M2.5 8h11M9 3.5L13.5 8 9 12.5" />
                </svg>
              </button>
              {str(config, "ctaNote") && (
                <p className="text-center text-[11.5px] @min-[560px]:text-right" style={{ color: tint(card, 0.55) }}>
                  {str(config, "ctaNote")}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function generateLiquid(config: TweakConfig): string {
  const { face, family } = fontFaceFor(str(config, "font", "system"));
  const S = ".bs-rf-{{ section.id }}";
  const ri = "{{ section.settings.radius | minus: 6 | at_least: 8 }}px";
  const mono = "ui-monospace, 'SF Mono', Menlo, monospace";
  const glyph = (d: string) =>
    `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg>`;
  const arrow = `<svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2.5 8h11M9 3.5L13.5 8 9 12.5"/></svg>`;

  const style = `<style>
${face ? face + "\n" : ""}  ${S} { container-type: inline-size; --bs-a: {{ section.settings.accent }}; --bs-s: {{ section.settings.soft }}; --bs-c: {{ section.settings.card }}; --bs-b: {{ section.settings.bg }};
    background: var(--bs-b); color: {{ section.settings.text_color }}; font-family: ${family}; }
  ${S} * { box-sizing: border-box; }
  ${S} p, ${S} h2 { margin: 0; }
  ${S} .bs-in { max-width: 1120px; margin: 0 auto; padding: 32px 16px; }
  ${S} .bs-head { padding: 0 4px; }
  ${S} .bs-eye { font-size: 12.5px; color: var(--bs-a); }
  ${S} .bs-h { margin-top: 8px; max-width: 620px; font-size: 26px; font-weight: 300; line-height: 1.1; letter-spacing: -.025em; }
  ${S} .bs-sh { margin-top: 12px; max-width: 520px; font-size: 13.5px; line-height: 1.6; opacity: .62; }
  ${S} .bs-track { margin: 28px -16px 0; padding: 0 16px 4px; display: flex; gap: 12px; overflow-x: auto; scroll-snap-type: x mandatory; scroll-padding: 0 16px; scrollbar-width: none; }
  ${S} .bs-track::-webkit-scrollbar { display: none; }
  ${S} .bs-step { position: relative; flex: 0 0 78%; display: flex; flex-direction: column; scroll-snap-align: start; border-radius: {{ section.settings.radius }}px;
    background: var(--bs-c); box-shadow: 0 0 0 1px color-mix(in srgb, var(--bs-a) 8%, transparent); outline: none;
    transition: transform .5s cubic-bezier(.22,1,.36,1), box-shadow .5s cubic-bezier(.22,1,.36,1); }
  ${S} .bs-step.is-hot, ${S} .bs-step:focus-visible { transform: translateY(-3px); box-shadow: 0 0 0 1.5px var(--bs-a), 0 18px 40px -24px color-mix(in srgb, var(--bs-a) 45%, transparent); }
  ${S} .bs-vis { position: relative; margin: 8px; aspect-ratio: 4 / 3; overflow: hidden; border-radius: ${ri}; background: var(--bs-s); }
  ${S} .bs-vis img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
  ${S} .bs-art { position: absolute; inset: 0; display: grid; place-items: center; padding: 12px; }
  ${S} .bs-art svg { width: 100%; height: 100%; }
  ${S} .bs-n { position: absolute; left: 10px; top: 10px; width: 28px; height: 28px; display: grid; place-items: center; border-radius: 99px; font-family: ${mono}; font-size: 11px;
    background: color-mix(in srgb, var(--bs-c) 90%, transparent); color: var(--bs-a); transition: background-color .3s, color .3s; }
  ${S} .bs-step.is-hot .bs-n { background: var(--bs-a); color: var(--bs-c); }
  ${S} .bs-body { flex: 1; display: flex; flex-direction: column; padding: 8px 16px 20px; }
  ${S} .bs-tag { align-self: flex-start; padding: 3px 8px; border-radius: 99px; font-family: ${mono}; font-size: 10.5px; text-transform: uppercase; letter-spacing: .04em; background: var(--bs-s); color: var(--bs-a); }
  ${S} .bs-st { margin-top: 12px; font-size: 16px; line-height: 1.35; letter-spacing: -.01em; }
  ${S} .bs-sx { margin-top: 6px; font-size: 13px; line-height: 1.6; opacity: .62; }
  ${S} .bs-next { position: absolute; right: -13px; top: calc(50% - 12px); z-index: 1; width: 24px; height: 24px; display: none; place-items: center; border-radius: 99px; background: var(--bs-b); color: var(--bs-a); }
  ${S} .bs-cal { margin-top: 16px; padding: 20px; border-radius: {{ section.settings.radius }}px; background: var(--bs-a); color: var(--bs-c); }
  ${S} .bs-cal-top { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; }
  ${S} .bs-ct { font-size: 16px; font-weight: 300; letter-spacing: -.01em; }
  ${S} .bs-cs { margin-top: 4px; font-family: ${mono}; font-size: 11.5px; font-variant-numeric: tabular-nums; opacity: .6; }
  ${S} .bs-first { display: inline-flex; align-items: center; gap: 8px; padding: 6px 12px 6px 6px; border-radius: 99px; font-size: 12px; background: var(--bs-s); color: var(--bs-a); }
  ${S} .bs-first i { width: 24px; height: 24px; display: grid; place-items: center; border-radius: 99px; background: var(--bs-a); color: var(--bs-s); font-style: normal; }
  ${S} .bs-first span { opacity: .7; }
  ${S} .bs-first b { font-weight: 500; font-variant-numeric: tabular-nums; }
  ${S} .bs-months { position: relative; margin-top: 24px; display: grid; grid-template-columns: repeat(var(--n), minmax(0, 1fr)); }
  ${S} .bs-months::before { content: ""; position: absolute; top: 17px; left: calc(50% / var(--n)); right: calc(50% / var(--n)); height: 1px; background: color-mix(in srgb, var(--bs-c) 20%, transparent); }
  ${S} .bs-m { position: relative; min-width: 0; display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 0; border: 0; background: none; color: inherit; font: inherit; cursor: pointer; }
  ${S} .bs-m:disabled { cursor: default; }
  ${S} .bs-dot { width: 34px; height: 34px; display: grid; place-items: center; border-radius: 99px; background: var(--bs-c); color: var(--bs-a);
    transition: background-color .3s, color .3s, box-shadow .3s, transform .3s cubic-bezier(.22,1,.36,1); }
  ${S} .bs-m:first-child .bs-dot { background: var(--bs-s); }
  ${S} .bs-m:not(:disabled):hover .bs-dot { transform: scale(1.1); }
  ${S} .bs-m:active .bs-dot { transform: scale(.95); }
  ${S} .bs-m:focus-visible { outline: none; }
  ${S} .bs-m:focus-visible .bs-dot { outline: 2px solid var(--bs-s); outline-offset: 3px; }
  ${S} .bs-m svg { display: none; }
  ${S} .bs-m .g-jar { display: block; }
  ${S} .bs-m:not(:first-child) .g-jar { display: none; }
  ${S} .bs-m:not(:first-child) .g-pouch { display: block; }
  ${S} .bs-m.is-skip .g-pouch { display: none; }
  ${S} .bs-m.is-skip .g-skip { display: block; }
  ${S} .bs-m.is-skip .bs-dot { background: var(--bs-a); color: color-mix(in srgb, var(--bs-c) 55%, transparent); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--bs-c) 35%, transparent); }
  ${S} .bs-m.is-lit .bs-dot { box-shadow: 0 0 0 3px var(--bs-a), 0 0 0 4.5px var(--bs-s); }
  ${S} .bs-m.is-skip.is-lit .bs-dot { box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--bs-c) 35%, transparent), 0 0 0 3px var(--bs-a), 0 0 0 4.5px var(--bs-s); }
  ${S} .bs-mn { font-family: ${mono}; font-size: 10.5px; text-transform: uppercase; letter-spacing: .04em; }
  ${S} .bs-ml { display: none; margin-top: -4px; max-width: 100%; font-size: 10.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; opacity: .62; }
  ${S} .bs-m.is-skip .bs-mn { text-decoration: line-through; opacity: .45; }
  ${S} .bs-m.is-skip .bs-ml { opacity: .45; }
  ${S} .bs-ml-skip, ${S} .bs-m.is-skip .bs-ml-on { display: none; }
  ${S} .bs-m.is-skip .bs-ml-skip { display: inline; }
  ${S} .bs-foot { margin-top: 24px; padding-top: 20px; display: flex; flex-direction: column; gap: 16px; border-top: 1px solid color-mix(in srgb, var(--bs-c) 14%, transparent); }
  ${S} .bs-hint { font-size: 12px; line-height: 1.4; opacity: .62; }
  ${S} .bs-cta-wrap { display: flex; flex-direction: column; align-items: stretch; gap: 8px; }
  ${S} .bs-form { margin: 0; }
  ${S} .bs-cta { width: 100%; height: 48px; padding: 0 24px; border: 0; border-radius: 99px; cursor: pointer; font: inherit; font-size: 14px; font-weight: 500; text-decoration: none;
    display: inline-flex; align-items: center; justify-content: center; gap: 8px; background: var(--bs-s); color: var(--bs-a); transition: filter .3s, transform .2s; }
  ${S} .bs-cta:hover { filter: brightness(1.05); }
  ${S} .bs-cta:active { transform: scale(.98); }
  ${S} .bs-note { text-align: center; font-size: 11.5px; opacity: .55; }
  @container (min-width: 420px) { ${S} .bs-ml { display: block; } }
  @container (min-width: 520px) { ${S} .bs-step { flex-basis: 46%; } }
  @container (min-width: 560px) {
    ${S} .bs-foot { flex-direction: row; align-items: center; justify-content: space-between; }
    ${S} .bs-cta-wrap { align-items: flex-end; }
    ${S} .bs-cta { width: auto; }
    ${S} .bs-note { text-align: right; }
  }
  @container (min-width: 680px) {
    ${S} .bs-in { padding: 48px 40px; }
    ${S} .bs-head { padding: 0; }
    ${S} .bs-h { font-size: 36px; }
    ${S} .bs-track { margin: 28px 0 0; padding: 0; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; overflow: visible; }
    ${S} .bs-next { display: grid; }
    ${S} .bs-cal { margin-top: 20px; padding: 28px; }
    ${S} .bs-ct { font-size: 18px; }
  }
  @media (prefers-reduced-motion: reduce) { ${S} * { transition-duration: 1ms !important; } }
</style>`;

  const artLiquid = Object.entries(ART)
    .map(([k, svg], i) => `${i ? "{%- elsif" : "{%- if"} block.settings.art == '${k}' -%}<div class="bs-art">${svg}</div>`)
    .join("\n                ");

  const markup = `{%- comment -%}
  Refill Flow by boost.supply.
  - Add one "Step" block per step (welcome kit, refills, skip/pause). Pick an
    image, or leave it empty to show the built-in illustration.
  - The calendar starts at today plus "Days until first delivery" and is a
    visual explainer: shoppers can tap months to see how skipping works.
    Real skips and pauses happen in your subscription app's customer portal.
  - CTA: pick your subscription product. If it has a selling plan (from your
    subscription app), the button adds it to the cart on that plan; otherwise
    it links to the product. Without a product it uses the CTA link.
{%- endcomment -%}
{%- assign bs_p = section.settings.product -%}
<div class="bs-rf-{{ section.id }}" id="bs-rf-{{ section.id }}" data-lead="{{ section.settings.lead_days }}" data-skipped="{{ section.settings.skipped | escape }}">
  <div class="bs-in">
    <div class="bs-head">
      {%- if section.settings.eyebrow != blank -%}<p class="bs-eye">{{ section.settings.eyebrow }}</p>{%- endif -%}
      <h2 class="bs-h">{{ section.settings.heading }}</h2>
      {%- if section.settings.subheading != blank -%}<p class="bs-sh">{{ section.settings.subheading }}</p>{%- endif -%}
    </div>

    <div class="bs-track">
      {%- for block in section.blocks -%}
        <div class="bs-step" tabindex="0" data-step data-kind="{{ block.settings.art }}" {{ block.shopify_attributes }}>
          <div class="bs-vis">
            {%- if block.settings.image != blank -%}
              {{ block.settings.image | image_url: width: 800 | image_tag: loading: 'lazy', alt: block.settings.image.alt, sizes: '(min-width: 990px) 340px, 78vw' }}
            {%- else -%}
                ${artLiquid}
              {%- endif -%}
            {%- endif -%}
            <span class="bs-n">{{ forloop.index }}</span>
          </div>
          <div class="bs-body">
            {%- if block.settings.tag != blank -%}<span class="bs-tag">{{ block.settings.tag }}</span>{%- endif -%}
            <p class="bs-st">{{ block.settings.title }}</p>
            {%- if block.settings.text != blank -%}<p class="bs-sx">{{ block.settings.text }}</p>{%- endif -%}
          </div>
          {%- unless forloop.last -%}<span class="bs-next" aria-hidden="true">${arrow}</span>{%- endunless -%}
        </div>
      {%- endfor -%}
    </div>

    <div class="bs-cal">
      <div class="bs-cal-top">
        <div>
          <p class="bs-ct">{{ section.settings.calendar_title }}</p>
          <p class="bs-cs"><span data-count>{{ section.settings.months }}</span> {{ section.settings.deliveries_text }}<span data-skips></span></p>
        </div>
        <span class="bs-first">
          <i><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="5.5" width="16" height="14" rx="3"/><path d="M4 10h16M8.5 3.5v3.5M15.5 3.5v3.5"/></svg></i>
          <span>{{ section.settings.first_label }}</span>
          <b data-first>{{ section.settings.in_days_text }} {{ section.settings.lead_days }} {{ section.settings.days_text }}</b>
        </span>
      </div>
      <div class="bs-months" style="--n: {{ section.settings.months }};">
        {%- for bs_i in (1..section.settings.months) -%}
          <button type="button" class="bs-m" data-m="{{ forloop.index0 }}"{% if forloop.first %} disabled{% endif %} aria-pressed="false">
            <span class="bs-dot">${glyph(GLYPH.jar).replace("<svg ", '<svg class="g-jar" ')}${glyph(GLYPH.pouch).replace("<svg ", '<svg class="g-pouch" ')}${glyph(GLYPH.skip).replace("<svg ", '<svg class="g-skip" ')}</span>
            <span class="bs-mn" data-mn>M{{ bs_i }}</span>
            <span class="bs-ml">{%- if forloop.first -%}{{ section.settings.kit_label }}{%- else -%}<span class="bs-ml-on">{{ section.settings.refill_label }}</span><span class="bs-ml-skip">{{ section.settings.skip_label }}</span>{%- endif -%}</span>
          </button>
        {%- endfor -%}
      </div>
      <div class="bs-foot">
        {%- if section.settings.skip_hint != blank -%}<p class="bs-hint">{{ section.settings.skip_hint }}</p>{%- else -%}<span></span>{%- endif -%}
        <div class="bs-cta-wrap">
          {%- if bs_p != blank -%}
            {%- assign bs_plan = bs_p.selling_plan_groups.first.selling_plans.first -%}
            {%- if bs_plan -%}
              {%- form 'product', bs_p, class: 'bs-form' -%}
                <input type="hidden" name="id" value="{{ bs_p.selected_or_first_available_variant.id }}">
                <input type="hidden" name="selling_plan" value="{{ bs_plan.id }}">
                <button type="submit" name="add" class="bs-cta">{{ section.settings.cta_text }}${arrow}</button>
              {%- endform -%}
            {%- else -%}
              <a class="bs-cta" href="{{ bs_p.url }}">{{ section.settings.cta_text }}${arrow}</a>
            {%- endif -%}
          {%- else -%}
            <a class="bs-cta" href="{{ section.settings.cta_url | default: routes.all_products_collection_url }}">{{ section.settings.cta_text }}${arrow}</a>
          {%- endif -%}
          {%- if section.settings.cta_note != blank -%}<p class="bs-note">{{ section.settings.cta_note }}</p>{%- endif -%}
        </div>
      </div>
    </div>
  </div>
</div>
<script>
  (function () {
    var root = document.getElementById('bs-rf-{{ section.id }}');
    if (!root) return;
    var lang = document.documentElement.lang || undefined;
    var lead = parseInt(root.getAttribute('data-lead'), 10) || 0;
    var first = new Date(Date.now() + lead * 864e5);
    var cells = Array.prototype.slice.call(root.querySelectorAll('[data-m]'));
    var steps = Array.prototype.slice.call(root.querySelectorAll('[data-step]'));
    var skipWord = {{ section.settings.skip_label | downcase | json }};
    try {
      root.querySelector('[data-first]').textContent = first.toLocaleDateString(lang, { weekday: 'short', month: 'short', day: 'numeric' });
      cells.forEach(function (c, i) {
        var d = new Date(first.getFullYear(), first.getMonth() + i, 1);
        c.querySelector('[data-mn]').textContent = d.toLocaleDateString(lang, { month: 'short' });
      });
    } catch (e) {}
    String(root.getAttribute('data-skipped') || '').split(',').forEach(function (s) {
      var n = parseInt(s, 10) - 1;
      if (n > 0 && cells[n]) cells[n].classList.add('is-skip');
    });
    function count() {
      var skips = cells.filter(function (c) { return c.classList.contains('is-skip'); }).length;
      root.querySelector('[data-count]').textContent = cells.length - skips;
      root.querySelector('[data-skips]').textContent = skips ? ' · ' + skips + ' ' + skipWord : '';
      cells.forEach(function (c) { c.setAttribute('aria-pressed', c.classList.contains('is-skip') ? 'true' : 'false'); });
    }
    cells.forEach(function (c, i) {
      if (i === 0) return;
      c.addEventListener('click', function () { c.classList.toggle('is-skip'); count(); });
    });
    function light(step) {
      var kind = step ? step.getAttribute('data-kind') : '';
      var idx = step ? steps.indexOf(step) : -1;
      steps.forEach(function (s) { s.classList.toggle('is-hot', s === step); });
      cells.forEach(function (c, i) {
        var skip = c.classList.contains('is-skip');
        var on = false;
        if (idx === 0 || kind === 'jar') on = i === 0;
        else if (kind === 'controls') on = skip;
        else if (idx > 0) on = i > 0 && !skip;
        c.classList.toggle('is-lit', on);
      });
    }
    steps.forEach(function (s) {
      s.addEventListener('mouseenter', function () { light(s); });
      s.addEventListener('mouseleave', function () { light(null); });
      s.addEventListener('focus', function () { light(s); });
      s.addEventListener('blur', function () { light(null); });
    });
    count();
  })();
</script>`;

  const steps = list(config, "steps");
  const arts = ["jar", "pouch", "controls", "none"];

  const schema = buildSchema({
    name: "Refill Flow",
    settings: [
      { type: "text", id: "eyebrow", label: "Eyebrow", default: str(config, "eyebrow") },
      { type: "text", id: "heading", label: "Heading", default: str(config, "heading") },
      { type: "textarea", id: "subheading", label: "Subheading", default: str(config, "subheading") },
      { type: "header", content: "Delivery calendar" },
      { type: "text", id: "calendar_title", label: "Title", default: str(config, "calendarTitle") },
      { type: "range", id: "months", label: "Months shown", min: 3, max: 12, step: 1, default: Math.max(3, Math.min(12, Math.round(num(config, "months", 6)))) },
      { type: "range", id: "lead_days", label: "Days until first delivery", min: 0, max: 14, step: 1, default: Math.max(0, Math.min(14, Math.round(num(config, "leadDays", 3)))) },
      { type: "text", id: "first_label", label: "First delivery label", default: str(config, "firstLabel") },
      { type: "text", id: "in_days_text", label: "Fallback: \"in\"", default: str(config, "inDaysText") },
      { type: "text", id: "days_text", label: "Fallback: \"days\"", default: str(config, "daysText") },
      { type: "text", id: "kit_label", label: "First month label", default: str(config, "kitLabel") },
      { type: "text", id: "refill_label", label: "Refill month label", default: str(config, "refillLabel") },
      { type: "text", id: "skip_label", label: "Skipped month label", default: str(config, "skipLabel") },
      { type: "text", id: "deliveries_text", label: "Deliveries word", default: str(config, "deliveriesText") },
      { type: "text", id: "skipped", label: "Months shown as skipped (e.g. 4)", default: str(config, "skipped") },
      { type: "text", id: "skip_hint", label: "Hint", default: str(config, "skipHint") },
      { type: "header", content: "Call to action" },
      { type: "product", id: "product", label: "Subscription product", info: "Adds it on its first selling plan, or links to it" },
      { type: "text", id: "cta_text", label: "Button text", default: str(config, "ctaText") },
      { type: "url", id: "cta_url", label: "Button link (when no product is picked)" },
      { type: "text", id: "cta_note", label: "Note under the button", default: str(config, "ctaNote") },
      { type: "header", content: "Style" },
      { type: "color", id: "accent", label: "Accent (calendar background)", default: str(config, "accent") },
      { type: "color", id: "soft", label: "Soft (labels, button)", default: str(config, "soft") },
      { type: "color", id: "card", label: "Cards", default: str(config, "card") },
      { type: "color", id: "bg", label: "Background", default: str(config, "bg") },
      { type: "color", id: "text_color", label: "Text", default: str(config, "textColor") },
      { type: "range", id: "radius", label: "Corner radius", min: 0, max: 32, step: 2, unit: "px", default: Math.max(0, Math.min(32, Math.round(num(config, "radius", 20) / 2) * 2)) },
    ],
    blocks: [
      {
        type: "step",
        name: "Step",
        settings: [
          { type: "text", id: "tag", label: "Tag", default: "Every 30 days" },
          { type: "text", id: "title", label: "Title", default: "Refills arrive monthly" },
          { type: "textarea", id: "text", label: "Text" },
          { type: "image_picker", id: "image", label: "Image", info: "Optional. Without one, the illustration below shows" },
          {
            type: "select",
            id: "art",
            label: "Illustration",
            options: [
              { value: "jar", label: "Glass jar" },
              { value: "pouch", label: "Refill pouch" },
              { value: "controls", label: "Skip & pause controls" },
              { value: "none", label: "None" },
            ],
            default: "pouch",
          },
        ],
      },
    ],
    maxBlocks: 4,
    presetBlocks: steps.slice(0, 4).map((s) => ({
      type: "step",
      settings: {
        tag: esc(s.tag ?? ""),
        title: esc(s.title ?? ""),
        text: esc(s.text ?? ""),
        art: arts.includes(s.art ?? "") ? (s.art as string) : "none",
      },
    })),
  });

  return section({ style, markup, schema });
}

export const refillFlow: Tweak = {
  slug: "refill-flow",
  inspiredBy: "seed",
  name: "Refill Flow",
  tagline: "Explain the subscription in three steps, with a delivery calendar shoppers can tap.",
  description:
    "Modeled on the refill explainer Seed uses for its subscriptions. Three steps sit on a horizontal track: the welcome kit with a glass jar to keep, refills that arrive monthly in compostable pouches, and skip or pause anytime. Below, a delivery calendar strip shows the coming months with a \"first delivery\" date chip, and tapping a month shows how skipping works, so the commitment feels light. Hovering a step lights up the months it applies to. In Shopify each step is a block with its own image (or a built-in illustration), and the CTA adds your subscription product on its selling plan.",
  category: "product-page",
  tier: "free",
  tint: "#eef2ea",
  Preview,
  generateLiquid,
  defaults,
  fields: [
    { key: "eyebrow", label: "Eyebrow", type: "text", group: "Content" },
    { key: "heading", label: "Heading", type: "text", group: "Content" },
    { key: "subheading", label: "Subheading", type: "textarea", group: "Content" },
    {
      key: "steps", label: "Steps", type: "list", group: "Steps",
      hint: "Illustration is jar, pouch, controls or none; it shows when Image URL is empty. In Shopify you pick each step's image in the theme editor",
      itemFields: [
        { key: "tag", label: "Tag", type: "text" },
        { key: "title", label: "Title", type: "text" },
        { key: "text", label: "Text", type: "textarea" },
        { key: "image", label: "Image URL", type: "text" },
        { key: "art", label: "Illustration", type: "text" },
      ],
      newItem: { tag: "Every 90 days", title: "Bonus gift on your third refill", text: "A travel case for your capsules, on us.", image: "", art: "pouch" },
      addLabel: "Add step",
      max: 4,
    },
    { key: "calendarTitle", label: "Title", type: "text", group: "Calendar" },
    { key: "months", label: "Months shown", type: "slider", group: "Calendar", min: 3, max: 12, step: 1 },
    { key: "leadDays", label: "Days until first delivery", type: "slider", group: "Calendar", min: 0, max: 14, step: 1 },
    { key: "firstLabel", label: "First delivery label", type: "text", group: "Calendar" },
    { key: "kitLabel", label: "First month label", type: "text", group: "Calendar" },
    { key: "refillLabel", label: "Refill month label", type: "text", group: "Calendar" },
    { key: "skipLabel", label: "Skipped month label", type: "text", group: "Calendar" },
    { key: "deliveriesText", label: "Deliveries word", type: "text", group: "Calendar" },
    { key: "skipped", label: "Months shown as skipped", type: "text", group: "Calendar", hint: "Comma separated month numbers, e.g. 4. Month 1 can't be skipped" },
    { key: "skipHint", label: "Hint", type: "text", group: "Calendar" },
    { key: "inDaysText", label: "Fallback \"in\"", type: "text", group: "Calendar", hint: "Shown as \"in 3 days\" until the date loads" },
    { key: "daysText", label: "Fallback \"days\"", type: "text", group: "Calendar" },
    { key: "ctaText", label: "Button text", type: "text", group: "Call to action", hint: "In Shopify pick your subscription product: the button adds it on its selling plan" },
    { key: "ctaNote", label: "Note under the button", type: "text", group: "Call to action" },
    { key: "radius", label: "Corner radius", type: "slider", group: "Layout", min: 0, max: 32, step: 2, unit: "px" },
    fontField("Typography"),
    { key: "accent", label: "Accent", type: "color", group: "Colors" },
    { key: "soft", label: "Soft", type: "color", group: "Colors" },
    { key: "card", label: "Cards", type: "color", group: "Colors" },
    { key: "bg", label: "Background", type: "color", group: "Colors" },
    { key: "textColor", label: "Text", type: "color", group: "Colors" },
  ],
};
