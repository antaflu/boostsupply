"use client";

import { useState } from "react";
import { CloseButton, Dialog } from "@/components/Dialog";
import { LoginWall } from "@/components/LoginWall";
import { CardStage } from "@/components/CardStage";
import { cardModeFor } from "@/components/TweakCard";
import { useAuth, type ModalState } from "@/lib/auth";
import { getTweak } from "@/lib/registry";
import { IconCheck, IconLock } from "@/lib/nav-icons";

/* ============================================================
   Sign-in + paywall, in ONE dialog so moving from one to the
   other swaps content in place instead of stacking overlays.
   ============================================================ */

type Shown = Exclude<ModalState, { kind: "none" }>;

export function AuthDialog() {
  const { modal, closeModal } = useAuth();
  const open = modal.kind !== "none";

  /* keep the last real view on screen while the dialog animates out */
  const [shown, setShown] = useState<Shown | null>(null);
  if (modal.kind !== "none" && modal !== shown) setShown(modal);

  const isAuth = shown?.kind === "auth";

  return (
    <Dialog
      open={open}
      onClose={closeModal}
      label={isAuth ? "Sign in" : "Unlock export"}
      panelClassName={isAuth ? "max-w-[380px]" : "max-w-[440px]"}
      backdrop={isAuth ? <div className="bs-glow" /> : null}
    >
      {shown?.kind === "auth" && <LoginWall key="auth" />}
      {shown?.kind === "paywall" && (
        <Paywall key={`pay-${shown.slug}`} view={shown} />
      )}
    </Dialog>
  );
}

/* ---------------------------------------------------------------
   Paywall
   --------------------------------------------------------------- */

function Paywall({
  view,
}: {
  view: { slug: string; name: string; price: number };
}) {
  const { user, purchase, openAuth, closeModal, requestExport } = useAuth();
  const [state, setState] = useState<"idle" | "paying" | "done">("idle");
  const tweak = getTweak(view.slug);

  const pay = () => {
    if (!user) return openAuth(view);
    setState("paying");
    setTimeout(() => {
      purchase(view.slug);
      setState("done");
    }, 900);
  };

  return (
    <div className="bs-fade-up overflow-hidden rounded-[20px] bg-surface shadow-[0_0_0_1px_var(--border),var(--shadow-modal)]">
      {/* live preview of the section being unlocked */}
      <div className="relative flex h-[148px] items-center justify-center overflow-hidden bg-surface-2">
        {tweak && (
          <div className="pointer-events-none w-full">
            <CardStage
              mode={cardModeFor(tweak.slug)}
              Preview={tweak.Preview}
              config={tweak.defaults}
            />
          </div>
        )}
        <CloseButton
          onClick={closeModal}
          className="absolute right-3 top-3 bg-surface/80 backdrop-blur"
        />
      </div>

      {state === "done" ? (
        <div className="bs-step px-6 pb-6 pt-7 text-center">
          <div className="bs-pop-scale mx-auto grid h-12 w-12 place-items-center rounded-full bg-ink text-white">
            <svg width="22" height="22" viewBox="0 0 16 16" fill="none" aria-hidden>
              <path
                className="bs-draw"
                d="M3.5 8.4l2.9 2.9 6.1-6.3"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <h2 className="mt-4 text-[20px] font-semibold tracking-[-0.02em]">
            {view.name} is yours
          </h2>
          <p className="mx-auto mt-1.5 max-w-[300px] text-[13.5px] leading-5 text-ink-3">
            Export the Liquid whenever you like. Updates to this section are
            included.
          </p>
          <div className="mt-5 grid gap-2">
            <button
              type="button"
              data-autofocus
              onClick={() => {
                closeModal();
                requestExport(view.slug);
              }}
              className="bs-btn bs-btn-lg bs-btn-primary group w-full"
            >
              Export Liquid now
              <span className="bs-reveal">
                <Chevron />
              </span>
            </button>
            <button
              type="button"
              onClick={closeModal}
              className="bs-btn bs-btn-md bs-btn-ghost w-full"
            >
              Keep designing
            </button>
          </div>
        </div>
      ) : (
        <div className="px-6 pb-6 pt-5">
          <p className="text-[12.5px] text-ink-4">Unlock export</p>
          <h2 className="mt-0.5 text-[20px] font-semibold tracking-[-0.02em]">
            {view.name}
          </h2>
          <p className="mt-1.5 text-[13.5px] leading-5 text-ink-3">
            Design it free. Pay once to export the Liquid and use it in your
            store, no subscription.
          </p>

          <div className="mt-5 flex items-baseline gap-1.5">
            <span className="text-[32px] font-semibold leading-none tracking-[-0.03em]">
              ${view.price}
            </span>
            <span className="text-[13px] text-ink-3">one-time</span>
          </div>

          <ul className="mt-4 grid gap-2 text-[13.5px] text-ink-2">
            {[
              "Clean, paste-ready Liquid section",
              "Free updates to this section",
              "Use it on every store you own",
            ].map((f, i) => (
              <li
                key={f}
                className="bs-rise flex items-center gap-2.5"
                style={{ "--i": i + 1 } as React.CSSProperties}
              >
                <span className="grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full bg-ink text-white">
                  <IconCheck size={11} />
                </span>
                {f}
              </li>
            ))}
          </ul>

          <button
            type="button"
            data-autofocus
            onClick={pay}
            disabled={state === "paying"}
            className="bs-btn bs-btn-lg bs-btn-primary group mt-6 w-full"
          >
            {state === "paying" ? (
              <>
                <Spinner /> Processing…
              </>
            ) : user ? (
              <>
                <IconLock size={15} /> Pay ${view.price} &amp; unlock
              </>
            ) : (
              <>
                Sign in to unlock
                <span className="bs-reveal">
                  <Chevron />
                </span>
              </>
            )}
          </button>
          <p className="mt-3 text-center text-[11.5px] text-ink-4">
            Demo checkout · no card is charged.
          </p>
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------
   bits
   --------------------------------------------------------------- */

function Spinner({ dark = false }: { dark?: boolean }) {
  return (
    <svg
      className="bs-spin"
      width="15"
      height="15"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden
    >
      <circle
        cx="8"
        cy="8"
        r="6"
        stroke="currentColor"
        strokeOpacity={dark ? 0.15 : 0.25}
        strokeWidth="2"
      />
      <path
        d="M14 8a6 6 0 00-6-6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function Chevron() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M6 3.5L10.5 8 6 12.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

