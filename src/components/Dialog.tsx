"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

/* ============================================================
   Dialog: one modal primitive for the whole app.

   - Animates in AND out (stays mounted while closing).
   - Portals to <body>, locks page scroll, Escape + backdrop
     close, traps Tab, restores focus to the trigger on close.
   - variant "modal":   centered card, dimmed + lightly blurred
     variant "palette": Spotlight position (min(16vh,140px) from
                        the top), plain dim, panel is the glass
   ============================================================ */

const EXIT_MS = 160;

export function usePresence(open: boolean, exitMs = EXIT_MS) {
  const [mounted, setMounted] = useState(open);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- mount/unmount follows `open` with an exit delay
      setMounted(true);
      setClosing(false);
      return;
    }
    setClosing(true);
    const t = setTimeout(() => {
      setMounted(false);
      setClosing(false);
    }, exitMs);
    return () => clearTimeout(t);
  }, [open, exitMs]);

  return { mounted, closing };
}

export function Dialog({
  open,
  onClose,
  children,
  label,
  variant = "modal",
  panelClassName = "",
  backdrop,
  escapeCloses = true,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  /** accessible name */
  label: string;
  variant?: "modal" | "palette";
  panelClassName?: string;
  /** extra decoration rendered on the overlay (e.g. a glow) */
  backdrop?: ReactNode;
  /** palette handles Escape itself (clear query first) */
  escapeCloses?: boolean;
}) {
  const { mounted, closing } = usePresence(open);
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const prevFocus = document.activeElement as HTMLElement | null;
    const html = document.documentElement;
    const prevOverflow = html.style.overflow;
    html.style.overflow = "hidden";

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && escapeCloses) {
        e.preventDefault();
        onCloseRef.current();
      }
      if (e.key === "Tab" && panelRef.current) trapTab(e, panelRef.current);
    };
    window.addEventListener("keydown", onKey);

    const raf = requestAnimationFrame(() => {
      const p = panelRef.current;
      if (!p || p.contains(document.activeElement)) return;
      const auto = p.querySelector<HTMLElement>("[data-autofocus]");
      (auto ?? p).focus({ preventScroll: true });
    });

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKey);
      html.style.overflow = prevOverflow;
      if (prevFocus && document.contains(prevFocus)) {
        prevFocus.focus({ preventScroll: true });
      }
    };
  }, [open, escapeCloses]);

  if (!mounted || typeof document === "undefined") return null;
  const state = closing ? "closed" : "open";
  const palette = variant === "palette";

  return createPortal(
    <div
      className={`fixed inset-0 z-[100] flex justify-center px-4 ${
        palette
          ? "items-start pt-[min(16vh,140px)] max-sm:px-2.5 max-sm:pt-2.5"
          : /* my-auto on the panel centres it, but tall panels still scroll from the top */
            "items-start overflow-y-auto py-6"
      }`}
    >
      <div
        data-state={state}
        aria-hidden
        onMouseDown={onClose}
        className={`bs-overlay fixed inset-0 overflow-hidden ${
          palette
            ? "bg-[rgba(0,0,0,0.26)]"
            : "bg-[rgba(10,10,10,0.34)] backdrop-blur-[3px]"
        }`}
      >
        {backdrop}
      </div>
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        data-state={state}
        className={`relative w-full outline-none ${
          palette ? "bs-cmdk" : "bs-panel my-auto"
        } ${panelClassName}`}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}

function trapTab(e: KeyboardEvent, root: HTMLElement) {
  const nodes = Array.from(
    root.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((n) => n.offsetParent !== null);
  if (nodes.length === 0) return;
  const first = nodes[0];
  const last = nodes[nodes.length - 1];
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
}

/** Round close button used in dialog headers. */
export function CloseButton({
  onClick,
  className = "",
}: {
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Close"
      className={`bs-press grid h-8 w-8 place-items-center rounded-[9px] text-ink-3 hover:bg-hover hover:text-ink ${className}`}
    >
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
        <path
          d="M4 4l8 8M12 4l-8 8"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
    </button>
  );
}
