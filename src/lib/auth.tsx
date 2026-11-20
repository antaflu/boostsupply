"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { AuthDialog } from "@/components/AuthDialog";

/* ============================================================
   Mock auth + entitlements layer.

   This is intentionally a thin, swappable shim. Everything the
   rest of the app needs goes through `useAuth()`. To wire real
   auth + payments later, replace the bodies of `signIn`,
   `signOut` and `purchase` with Shopify/Stripe calls and keep
   the same shape — no UI changes required.
   ============================================================ */

export interface User {
  email: string;
  name: string;
  /** optional store URL from the login wall (lead qualification) */
  store?: string;
}

/** No email provider is wired up yet: no code is sent and any 6-digit
    code is accepted. The login wall says so while this is true. */
export const DEMO_AUTH = true;

export type ModalState =
  | { kind: "none" }
  | {
      kind: "auth";
      then?: { slug: string; name: string; price: number };
      /** route to open after a successful sign-in (e.g. the section editor) */
      next?: string;
    }
  | { kind: "paywall"; slug: string; name: string; price: number };

interface AuthValue {
  user: User | null;
  /** false until the stored session has been read (avoids a wall flash) */
  hydrated: boolean;
  /** email a one-time sign-in code */
  requestCode: (email: string) => Promise<void>;
  /** check a one-time code; resolves true when it is valid */
  verifyCode: (email: string, code: string) => Promise<boolean>;
  purchased: string[];
  hasPurchased: (slug: string) => boolean;
  /** open the sign-in modal; `then` reopens a paywall after sign-in */
  openAuth: (
    then?: { slug: string; name: string; price: number },
    next?: string,
  ) => void;
  /** open the paywall for a paid tweak */
  openPaywall: (slug: string, name: string, price: number) => void;
  signIn: (email: string, store?: string) => void;
  signOut: () => void;
  closeModal: () => void;
  modal: ModalState;
  /** complete a purchase (assumes user is signed in) */
  purchase: (slug: string) => void;
  /** set by the paywall's "Export now"; the editor opens its code modal */
  exportRequest: string | null;
  requestExport: (slug: string | null) => void;
}

const Ctx = createContext<AuthValue | null>(null);

const LS_USER = "bs.user";
const LS_PURCHASED = "bs.purchased";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [purchased, setPurchased] = useState<string[]>([]);
  const [modal, setModal] = useState<ModalState>({ kind: "none" });
  const router = useRouter();
  /* signIn reads the open modal without re-creating itself on every change */
  const modalRef = useRef<ModalState>(modal);
  useEffect(() => {
    modalRef.current = modal;
  }, [modal]);
  const [exportRequest, setExportRequest] = useState<string | null>(null);

  useEffect(() => {
    try {
      const u = localStorage.getItem(LS_USER);
      const p = localStorage.getItem(LS_PURCHASED);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate from storage after mount
      if (u) setUser(JSON.parse(u));
      if (p) setPurchased(JSON.parse(p));
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  /* Mock email-code flow. Swap these two bodies for your auth provider
     (e.g. Supabase signInWithOtp / verifyOtp) and keep the shape. */
  const requestCode = useCallback(
    (email: string) =>
      new Promise<void>((resolve) => {
        void email;
        setTimeout(resolve, 700);
      }),
    [],
  );
  const verifyCode = useCallback(
    (email: string, code: string) =>
      new Promise<boolean>((resolve) => {
        void email;
        setTimeout(() => resolve(/^\d{6}$/.test(code)), 600);
      }),
    [],
  );

  const signIn = useCallback((email: string, store?: string) => {
    const name = email.split("@")[0].replace(/[._-]+/g, " ").trim();
    const u: User = { email, name: name || email, ...(store ? { store } : {}) };
    setUser(u);
    try {
      localStorage.setItem(LS_USER, JSON.stringify(u));
    } catch {
      /* ignore */
    }
    const m = modalRef.current;
    setModal(
      m.kind === "auth" && m.then ? { kind: "paywall", ...m.then } : { kind: "none" },
    );
    if (m.kind === "auth" && m.next) router.push(m.next);
  }, [router]);

  const signOut = useCallback(() => {
    setUser(null);
    try {
      localStorage.removeItem(LS_USER);
    } catch {
      /* ignore */
    }
  }, []);

  const purchase = useCallback((slug: string) => {
    setPurchased((prev) => {
      if (prev.includes(slug)) return prev;
      const next = [...prev, slug];
      try {
        localStorage.setItem(LS_PURCHASED, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const openAuth = useCallback(
    (then?: { slug: string; name: string; price: number }, next?: string) =>
      setModal({ kind: "auth", then, next }),
    [],
  );
  const openPaywall = useCallback(
    (slug: string, name: string, price: number) =>
      setModal({ kind: "paywall", slug, name, price }),
    [],
  );
  const closeModal = useCallback(() => setModal({ kind: "none" }), []);

  const value: AuthValue = useMemo(
    () => ({
      user,
      hydrated,
      requestCode,
      verifyCode,
      purchased,
      hasPurchased: (slug) => purchased.includes(slug),
      openAuth,
      openPaywall,
      signIn,
      signOut,
      closeModal,
      modal,
      purchase,
      exportRequest,
      requestExport: setExportRequest,
    }),
    [
      user,
      hydrated,
      requestCode,
      verifyCode,
      purchased,
      openAuth,
      openPaywall,
      signIn,
      signOut,
      closeModal,
      modal,
      purchase,
      exportRequest,
    ],
  );

  return (
    <Ctx.Provider value={value}>
      {children}
      <AuthDialog />
    </Ctx.Provider>
  );
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used within AuthProvider");
  return v;
}
