"use client";

import { useEffect, useRef, useState } from "react";
import { DEMO_AUTH, useAuth } from "@/lib/auth";
import { LogoTicker } from "@/components/LogoTicker";

/* ============================================================
   Login wall: email-only, passwordless, as a step-by-step card.

   1. Your email        → we send a 6-digit code
   2. Check your inbox  → enter the code
   3. Your store        → optional store URL (lead qualification)
   4. Start building    → signed in

   Light-mode take on a vertical stepper: finished steps turn
   green, the active step expands into an inner card, upcoming
   steps wait in grey. Narrow on purpose (max 380px).
   ============================================================ */

type Step = 0 | 1 | 2 | 3;

const STEPS = ["Your email", "Check your inbox", "Your store", "Start building"];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const BLUE = "#2f7cf6";
const GREEN = "#22a35a";

export function LoginWall({
  title = "Get free access",
  subtitle = "Three quick steps and every section is yours to customize and export.",
  className = "",
  panel = false,
}: {
  title?: string;
  subtitle?: string;
  className?: string;
  /** mark the cards as the wall's panel (clicks outside it close the wall) */
  panel?: boolean;
}) {
  const { signIn, requestCode, verifyCode } = useAuth();
  const [step, setStep] = useState<Step>(0);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [store, setStore] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [codeFocused, setCodeFocused] = useState(false);

  const emailRef = useRef<HTMLInputElement>(null);
  const codeRef = useRef<HTMLInputElement>(null);
  const storeRef = useRef<HTMLInputElement>(null);

  /* move focus into the step that just opened */
  useEffect(() => {
    const el = [emailRef, codeRef, storeRef][step]?.current;
    if (!el) return;
    const t = setTimeout(() => el.focus({ preventScroll: true }), 260);
    return () => clearTimeout(t);
  }, [step]);

  /* resend cooldown */
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const go = (s: Step) => {
    setError(null);
    setStep(s);
  };

  const sendCode = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const v = email.trim();
    if (!EMAIL_RE.test(v)) {
      setError("Enter a valid email address.");
      return;
    }
    setEmail(v);
    setBusy(true);
    await requestCode(v);
    setBusy(false);
    setCode("");
    setCooldown(30);
    go(1);
  };

  const submitCode = async (value: string) => {
    setBusy(true);
    const ok = await verifyCode(email, value);
    setBusy(false);
    if (!ok) {
      setError("That code doesn't match. Try again.");
      setCode("");
      return;
    }
    go(2);
  };

  const onCode = (raw: string) => {
    const v = raw.replace(/\D/g, "").slice(0, 6);
    setCode(v);
    setError(null);
    if (v.length === 6 && !busy) void submitCode(v);
  };

  const finish = (skip = false) => {
    const s = skip ? "" : store.trim().replace(/^https?:\/\//, "").replace(/\/$/, "");
    go(3);
    /* let the last check land before the wall lifts */
    setTimeout(() => signIn(email, s || undefined), 900);
  };

  return (
    <div
      data-wall-panel={panel || undefined}
      className={`mx-auto w-full max-w-[380px] ${className}`}
    >
      {/* ---- Liquid ticker of the stores we learn from ---- */}
      <LogoTicker className="mb-3" />

      {/* ---- Steps card ---- */}
      <div className="relative overflow-hidden rounded-[24px] bg-surface p-5 shadow-[0_0_0_1px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04),0_24px_60px_-28px_rgba(0,0,0,0.22)]">
        <Sparkles />

        <h2 className="relative pr-16 text-[20px] font-semibold leading-tight tracking-[-0.02em] text-ink">
          {title}
        </h2>
        <p className="relative mt-1.5 pr-6 text-[14px] leading-relaxed text-ink-3">
          {subtitle}
        </p>

        <ol className="relative mt-5">
          {STEPS.map((label, i) => {
            const state = i < step ? "done" : i === step ? "active" : "todo";
            const last = i === STEPS.length - 1;
            const editable = state === "done" && step < 3 && i < 2;
            const value = i === 0 ? email : i === 2 ? store.trim() : "";
            return (
              <li key={label} className={`relative flex gap-3 ${last ? "" : "pb-4"}`}>
                {/* connector to the next step */}
                {!last && (
                  <span
                    aria-hidden
                    className="absolute left-[10px] top-[22px] bottom-0 w-[3px] -translate-x-1/2 rounded-full transition-[background] duration-500"
                    style={{
                      background:
                        state === "done"
                          ? GREEN
                          : state === "active"
                            ? `linear-gradient(${BLUE}, rgba(47,124,246,0.12))`
                            : "#ededec",
                    }}
                  />
                )}

                <StepDot state={state} n={i + 1} />

                <div className="min-w-0 flex-1">
                  {editable ? (
                    <button
                      type="button"
                      onClick={() => go(i as Step)}
                      className="group flex w-full min-w-0 items-baseline gap-2 text-left"
                    >
                      <span className="text-[15px] text-ink">{label}</span>
                      {value && (
                        <span className="truncate text-[13px] text-ink-4 transition-colors group-hover:text-ink-3">
                          {value}
                        </span>
                      )}
                      <span className="ml-auto shrink-0 text-[12.5px] text-ink-4 opacity-0 transition-opacity group-hover:opacity-100">
                        Edit
                      </span>
                    </button>
                  ) : (
                    <p
                      className={`transition-[font-size,color] duration-300 ${
                        state === "active"
                          ? "text-[17px] font-medium text-ink"
                          : state === "done"
                            ? "text-[15px] text-ink"
                            : "text-[15px] text-ink-3"
                      }`}
                    >
                      {label}
                      {state === "done" && value && (
                        <span className="ml-2 text-[13px] text-ink-4">{value}</span>
                      )}
                    </p>
                  )}

                  {/* expanding inner card for the active step */}
                  <div
                    className="grid transition-[grid-template-rows,opacity] duration-500 ease-[var(--ease)]"
                    style={{
                      gridTemplateRows: state === "active" ? "1fr" : "0fr",
                      opacity: state === "active" ? 1 : 0,
                    }}
                    inert={state !== "active"}
                  >
                    <div className="min-h-0 overflow-hidden">
                      <div className="mt-3 rounded-[16px] bg-[#f6f6f5] p-4">
                        {i === 0 && (
                          <form onSubmit={sendCode} noValidate>
                            <Emoji>📩</Emoji>
                            <p className="mt-2 text-[15px] font-medium text-ink">
                              Where should we send your code?
                            </p>
                            <p className="mt-1 text-[13.5px] leading-relaxed text-ink-3">
                              No password needed. We email you a 6-digit code.
                            </p>
                            <input
                              ref={emailRef}
                              type="email"
                              autoComplete="email"
                              inputMode="email"
                              placeholder="you@yourbrand.com"
                              value={email}
                              onChange={(e) => {
                                setEmail(e.target.value);
                                setError(null);
                              }}
                              aria-invalid={!!error || undefined}
                              aria-label="Email address"
                              className={`bs-input mt-3 h-11 w-full rounded-[12px] px-3.5 text-[14px] text-ink outline-none ${
                                error ? "shadow-[inset_0_0_0_1.5px_#e5484d]" : ""
                              }`}
                            />
                            {error && step === 0 && (
                              <p className="mt-1.5 text-[12.5px] text-[#d93d42]">{error}</p>
                            )}
                            <button
                              type="submit"
                              disabled={busy}
                              className="bs-btn bs-btn-md bs-btn-primary mt-3 w-full rounded-[12px]"
                            >
                              {busy ? (
                                <>
                                  <Spinner /> Sending code…
                                </>
                              ) : (
                                "Send my code"
                              )}
                            </button>
                          </form>
                        )}

                        {i === 1 && (
                          <div>
                            <Emoji>🔑</Emoji>
                            <p className="mt-2 text-[15px] font-medium text-ink">
                              Enter your 6-digit code
                            </p>
                            <p className="mt-1 text-[13.5px] leading-relaxed text-ink-3">
                              We sent it to <span className="text-ink-2">{email}</span>.
                            </p>
                            <div className="relative mt-3">
                              <input
                                ref={codeRef}
                                value={code}
                                onChange={(e) => onCode(e.target.value)}
                                onFocus={() => setCodeFocused(true)}
                                onBlur={() => setCodeFocused(false)}
                                inputMode="numeric"
                                autoComplete="one-time-code"
                                maxLength={6}
                                aria-label="6-digit code"
                                disabled={busy}
                                className="absolute inset-0 z-10 h-full w-full cursor-text opacity-0"
                              />
                              <div aria-hidden className="grid grid-cols-6 gap-1.5">
                                {Array.from({ length: 6 }, (_, k) => {
                                  const ch = code[k];
                                  const here = codeFocused && !busy && k === Math.min(code.length, 5);
                                  return (
                                    <span
                                      key={k}
                                      className="grid h-12 place-items-center rounded-[12px] bg-surface text-[19px] font-semibold tabular-nums text-ink transition-shadow duration-150"
                                      style={{
                                        boxShadow: here
                                          ? `inset 0 0 0 1.5px ${BLUE}, 0 0 0 4px rgba(47,124,246,0.12)`
                                          : error && step === 1
                                            ? "inset 0 0 0 1.5px #e5484d"
                                            : "inset 0 0 0 1px var(--border-strong)",
                                      }}
                                    >
                                      {ch ? (
                                        <span className="bs-check-in">{ch}</span>
                                      ) : here ? (
                                        <span className="bs-caret h-5 w-[2px] rounded-full" style={{ background: BLUE }} />
                                      ) : null}
                                    </span>
                                  );
                                })}
                              </div>
                            </div>
                            {error && step === 1 && (
                              <p className="mt-1.5 text-[12.5px] text-[#d93d42]">{error}</p>
                            )}
                            <div className="mt-3 flex items-center justify-between text-[12.5px]">
                              {busy ? (
                                <span className="inline-flex items-center gap-1.5 text-ink-3">
                                  <Spinner /> Checking…
                                </span>
                              ) : cooldown > 0 ? (
                                <span className="text-ink-4">Resend in {cooldown}s</span>
                              ) : (
                                <button type="button" onClick={() => sendCode()} className="font-medium text-ink-2 hover:text-ink">
                                  Resend code
                                </button>
                              )}
                              <button type="button" onClick={() => go(0)} className="text-ink-3 hover:text-ink">
                                Use another email
                              </button>
                            </div>
                            {DEMO_AUTH && (
                              <p className="mt-3 rounded-[10px] bg-surface px-2.5 py-1.5 text-[11.5px] leading-snug text-ink-4 shadow-[inset_0_0_0_1px_var(--border)]">
                                Preview: no email is sent yet, so any 6 digits work.
                              </p>
                            )}
                          </div>
                        )}

                        {i === 2 && (
                          <form
                            onSubmit={(e) => {
                              e.preventDefault();
                              finish();
                            }}
                          >
                            <Emoji>🛒</Emoji>
                            <p className="mt-2 text-[15px] font-medium text-ink">
                              Which store are we boosting?
                            </p>
                            <p className="mt-1 text-[13.5px] leading-relaxed text-ink-3">
                              Optional. Helps us suggest sections that fit your store.
                            </p>
                            <input
                              ref={storeRef}
                              inputMode="url"
                              autoComplete="url"
                              placeholder="yourbrand.com"
                              value={store}
                              onChange={(e) => setStore(e.target.value)}
                              aria-label="Store URL"
                              className="bs-input mt-3 h-11 w-full rounded-[12px] px-3.5 text-[14px] text-ink outline-none"
                            />
                            <div className="mt-3 flex gap-2">
                              <button
                                type="button"
                                onClick={() => finish(true)}
                                className="bs-btn bs-btn-md bs-btn-secondary flex-1 rounded-[12px]"
                              >
                                Skip
                              </button>
                              <button
                                type="submit"
                                className="bs-btn bs-btn-md bs-btn-primary flex-[2] rounded-[12px]"
                              >
                                Continue
                              </button>
                            </div>
                          </form>
                        )}

                        {i === 3 && (
                          <div>
                            <Emoji>🚀</Emoji>
                            <p className="mt-2 text-[15px] font-medium text-ink">You&apos;re in</p>
                            <p className="mt-1 inline-flex items-center gap-1.5 text-[13.5px] text-ink-3">
                              <Spinner /> Opening the editor…
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </div>

      {/* ---- Why-your-email card ---- */}
      <div className="relative mt-3 overflow-hidden rounded-[24px] bg-surface p-5 shadow-[0_0_0_1px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)]">
        <p className="text-[16px] font-semibold tracking-[-0.01em] text-ink">Why your email?</p>
        <p className="mt-1 pr-16 text-[13.5px] leading-relaxed text-ink-3">
          It&apos;s your key to the library. No password, no spam.
        </p>
        <ul className="mt-3 space-y-2 pr-16 text-[13.5px] text-ink-2">
          {[
            "Unlimited exports of every free section",
            "Your designs and unlocks, saved",
            "Unsubscribe in one click",
          ].map((t) => (
            <li key={t} className="flex items-start gap-2">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="mt-[2px] shrink-0" aria-hidden>
                <circle cx="8" cy="8" r="7" fill="rgba(47,124,246,0.12)" />
                <path d="M5 8.2l2 2 4-4.2" stroke={BLUE} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {t}
            </li>
          ))}
        </ul>
        <span
          aria-hidden
          className="pointer-events-none absolute -bottom-2 right-3 rotate-[-10deg] select-none text-[64px] leading-none drop-shadow-[0_10px_14px_rgba(0,0,0,0.18)]"
        >
          🎁
        </span>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------
   bits
   --------------------------------------------------------------- */

function StepDot({ state, n }: { state: "done" | "active" | "todo"; n: number }) {
  return (
    <span
      className="relative z-10 mt-[1px] grid h-5 w-5 shrink-0 place-items-center rounded-full text-[11px] font-semibold tabular-nums transition-[background-color,color,box-shadow] duration-300"
      style={
        state === "done"
          ? { background: GREEN, color: "#fff" }
          : state === "active"
            ? { background: BLUE, color: "#fff", boxShadow: "0 0 0 4px rgba(47,124,246,0.14)" }
            : { background: "#ededec", color: "var(--ink-3)" }
      }
    >
      {state === "done" ? (
        <svg key="c" className="bs-check-in" width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden>
          <path d="M2.5 6.3l2.3 2.2 4.7-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : (
        n
      )}
    </span>
  );
}

function Emoji({ children }: { children: React.ReactNode }) {
  return (
    <span
      aria-hidden
      className="block text-[30px] leading-none drop-shadow-[0_4px_6px_rgba(0,0,0,0.12)]"
    >
      {children}
    </span>
  );
}

/* Twinkling four-point stars in the top-right corner. */
const STARS: [number, number, number, string, number][] = [
  // x, y, size, color, delay
  [262, 6, 9, "#93c5fd", 0],
  [292, 18, 7, "#c7cbd3", 0.6],
  [318, 8, 11, BLUE, 1.2],
  [340, 30, 7, "#93c5fd", 0.3],
  [276, 36, 10, BLUE, 1.6],
  [306, 46, 6, "#c7cbd3", 0.9],
  [330, 56, 9, "#93c5fd", 2.1],
  [354, 12, 6, "#c7cbd3", 1.4],
  [248, 28, 5, "#93c5fd", 2.4],
];

function Sparkles() {
  return (
    <>
      <span
        aria-hidden
        className="pointer-events-none absolute -right-10 -top-16 h-44 w-56 rounded-full"
        style={{ background: "radial-gradient(closest-side, rgba(47,124,246,0.12), transparent)" }}
      />
      <svg
        aria-hidden
        className="pointer-events-none absolute right-0 top-0"
        width="140"
        height="72"
        viewBox="240 0 140 72"
      >
        {STARS.map(([x, y, s, c, d], i) => (
          /* position on the group; the CSS twinkle animates the path */
          <g key={i} transform={`translate(${x - s / 2} ${y - s / 2}) scale(${s / 24})`}>
            <path
              className="bs-twinkle"
              style={{ "--d": `${d}s` } as React.CSSProperties}
              d="M12 0C12.7 6.6 17.4 11.3 24 12 17.4 12.7 12.7 17.4 12 24 11.3 17.4 6.6 12.7 0 12 6.6 11.3 11.3 6.6 12 0Z"
              fill={c}
            />
          </g>
        ))}
      </svg>
    </>
  );
}

function Spinner() {
  return (
    <svg className="bs-spin" width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2" />
      <path d="M14 8a6 6 0 00-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
