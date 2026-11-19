"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

/* ============================================================
   Mock auth + entitlements layer.

   This is intentionally a thin, swappable shim. Everything the
   rest of the app needs goes through `useAuth()`. To wire real
   auth + payments later, replace the bodies of `signIn`,
   `signOut` and `purchase` with Shopify/Stripe calls and keep
   the same shape — no UI changes required.
   ============================================================ */

interface User {
  email: string;
  name: string;
}

type ModalState =
  | { kind: "none" }
  | { kind: "auth"; afterAuthPurchase?: string }
  | { kind: "paywall"; slug: string; name: string; price: number };

interface AuthValue {
  user: User | null;
  purchased: string[];
  hasPurchased: (slug: string) => boolean;
  /** open the sign-in / sign-up modal */
  openAuth: () => void;
  /** open the paywall for a paid tweak */
  openPaywall: (slug: string, name: string, price: number) => void;
  signIn: (email: string) => void;
  signOut: () => void;
  closeModal: () => void;
  modal: ModalState;
  /** complete a purchase (assumes user is signed in) */
  purchase: (slug: string) => void;
}

const Ctx = createContext<AuthValue | null>(null);

const LS_USER = "bs.user";
const LS_PURCHASED = "bs.purchased";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [purchased, setPurchased] = useState<string[]>([]);
  const [modal, setModal] = useState<ModalState>({ kind: "none" });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const u = localStorage.getItem(LS_USER);
      const p = localStorage.getItem(LS_PURCHASED);
      if (u) setUser(JSON.parse(u));
      if (p) setPurchased(JSON.parse(p));
    } catch {
      /* ignore */
    }
    setReady(true);
  }, []);

  const persistUser = useCallback((u: User | null) => {
    if (u) localStorage.setItem(LS_USER, JSON.stringify(u));
    else localStorage.removeItem(LS_USER);
  }, []);

  const persistPurchased = useCallback((p: string[]) => {
    localStorage.setItem(LS_PURCHASED, JSON.stringify(p));
  }, []);

  const signIn = useCallback(
    (email: string) => {
      const name = email.split("@")[0].replace(/[._-]/g, " ");
      const u: User = { email, name };
      setUser(u);
      persistUser(u);
      setModal((m) =>
        m.kind === "auth" && m.afterAuthPurchase
          ? { kind: "none" }
          : { kind: "none" },
      );
    },
    [persistUser],
  );

  const signOut = useCallback(() => {
    setUser(null);
    persistUser(null);
  }, [persistUser]);

  const purchase = useCallback(
    (slug: string) => {
      setPurchased((prev) => {
        if (prev.includes(slug)) return prev;
        const next = [...prev, slug];
        persistPurchased(next);
        return next;
      });
      setModal({ kind: "none" });
    },
    [persistPurchased],
  );

  const value: AuthValue = {
    user,
    purchased,
    hasPurchased: (slug) => purchased.includes(slug),
    openAuth: () => setModal({ kind: "auth" }),
    openPaywall: (slug, name, price) =>
      setModal({ kind: "paywall", slug, name, price }),
    signIn,
    signOut,
    closeModal: () => setModal({ kind: "none" }),
    modal,
    purchase,
  };

  return (
    <Ctx.Provider value={value}>
      {children}
      {ready && <AuthModals />}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used within AuthProvider");
  return v;
}

/* ---- Modals ---------------------------------------------------------- */

function AuthModals() {
  const { modal } = useAuth();
  if (modal.kind === "none") return null;
  if (modal.kind === "auth") return <AuthModal />;
  return <PaywallModal />;
}

function Backdrop({ children }: { children: ReactNode }) {
  const { closeModal } = useAuth();
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-ink/30 backdrop-blur-sm bs-fade-up"
      onClick={closeModal}
    >
      <div
        className="w-full max-w-[420px] rounded-2xl bg-surface shadow-lg border border-border p-7"
        style={{ boxShadow: "var(--shadow-lg)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

function AuthModal() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  return (
    <Backdrop>
      <div className="mb-1 text-xs font-medium tracking-wide text-ink-3 uppercase">
        Welcome to boost.supply
      </div>
      <h2 className="text-[22px] font-semibold tracking-tight">
        Create your account
      </h2>
      <p className="mt-1.5 text-sm text-ink-2 leading-relaxed">
        Save your customizations and unlock exports. No password needed for the
        demo — just your email.
      </p>
      <form
        className="mt-5 space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (email.includes("@")) signIn(email);
        }}
      >
        <input
          autoFocus
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@brand.com"
          className="w-full h-11 rounded-md border border-border-strong bg-surface px-3.5 text-sm outline-none focus:border-ink transition-colors"
        />
        <button
          type="submit"
          className="w-full h-11 rounded-full bg-ink text-surface text-sm font-medium hover:opacity-90 active:scale-[0.99] transition-all"
        >
          Continue
        </button>
      </form>
      <p className="mt-4 text-[11px] text-ink-4 text-center">
        Demo account — stored locally in your browser.
      </p>
    </Backdrop>
  );
}

function PaywallModal() {
  const { modal, user, purchase, openAuth } = useAuth();
  if (modal.kind !== "paywall") return null;
  const { slug, name, price } = modal;

  return (
    <Backdrop>
      <div className="mb-1 text-xs font-medium tracking-wide text-ink-3 uppercase">
        Unlock export
      </div>
      <h2 className="text-[22px] font-semibold tracking-tight">{name}</h2>
      <p className="mt-1.5 text-sm text-ink-2 leading-relaxed">
        Tweak everything for free. Pay once to export the Liquid code and use it
        in your store — yours forever, no subscription.
      </p>

      <div className="mt-5 flex items-baseline gap-1.5">
        <span className="text-3xl font-semibold tracking-tight">${price}</span>
        <span className="text-sm text-ink-3">one-time</span>
      </div>

      <ul className="mt-4 space-y-2 text-sm text-ink-2">
        {[
          "Clean, copy-paste Liquid section",
          "Free updates to this section",
          "Use on unlimited stores you own",
        ].map((f) => (
          <li key={f} className="flex items-center gap-2">
            <Check /> {f}
          </li>
        ))}
      </ul>

      <button
        onClick={() => (user ? purchase(slug) : openAuth())}
        className="mt-6 w-full h-11 rounded-full bg-ink text-surface text-sm font-medium hover:opacity-90 active:scale-[0.99] transition-all"
      >
        {user ? `Pay $${price} & unlock` : "Sign in to continue"}
      </button>
      <p className="mt-3 text-[11px] text-ink-4 text-center">
        Demo checkout — no card charged.
      </p>
    </Backdrop>
  );
}

function Check() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <circle cx="8" cy="8" r="8" fill="#131313" />
      <path
        d="M4.5 8.2l2.2 2.2 4.8-4.8"
        stroke="#fff"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
