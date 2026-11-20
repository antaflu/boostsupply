"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { SearchPalette } from "@/components/SearchPalette";

/* Global search palette state + shortcuts (⌘K / Ctrl+K / "/"). */

interface PaletteValue {
  open: boolean;
  openPalette: () => void;
  closePalette: () => void;
}

const Ctx = createContext<PaletteValue | null>(null);

function isTyping(el: Element | null) {
  if (!el) return false;
  const tag = el.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    (el as HTMLElement).isContentEditable
  );
}

export function PaletteProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const openPalette = useCallback(() => setOpen(true), []);
  const closePalette = useCallback(() => setOpen(false), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
        return;
      }
      if (
        e.key === "/" &&
        !e.metaKey &&
        !e.ctrlKey &&
        !e.altKey &&
        !isTyping(document.activeElement)
      ) {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const value = useMemo(
    () => ({ open, openPalette, closePalette }),
    [open, openPalette, closePalette],
  );

  return (
    <Ctx.Provider value={value}>
      {children}
      <SearchPalette open={open} onClose={closePalette} />
    </Ctx.Provider>
  );
}

export function usePalette() {
  const v = useContext(Ctx);
  if (!v) throw new Error("usePalette must be used within PaletteProvider");
  return v;
}

/** "⌘" on Apple platforms, "Ctrl" elsewhere. SSR-safe (server renders ⌘). */
const noopSubscribe = () => () => {};
export function useModKey() {
  return useSyncExternalStore(
    noopSubscribe,
    () =>
      /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent)
        ? "⌘"
        : "Ctrl",
    () => "⌘",
  );
}
