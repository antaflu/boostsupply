"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Logo } from "@/components/Nav";
import { usePresence } from "@/components/Dialog";
import { useAuth } from "@/lib/auth";
import { usePalette, useModKey } from "@/lib/palette";
import { CATEGORIES } from "@/lib/categories";
import { ALL_FREE, TWEAKS } from "@/lib/registry";
import {
  filterHref,
  useFilters,
  type CatFilter,
  type TierFilter,
} from "@/lib/filters";
import { useGlide } from "@/lib/useGlide";
import {
  CATEGORY_ICON,
  IconLogout,
  IconMenu,
  IconSearch,
  IconUnlock,
} from "@/lib/nav-icons";

/* ============================================================
   App shell (Chopper / Orcus layout)
   Desktop: grey chrome page, fixed sidebar on it, content in a
   white rounded panel inset by 8px that scrolls on its own.
   Mobile: top bar + slide-in drawer, content full-bleed.
   ============================================================ */

export const MAIN_ID = "bs-main";

/* The desktop layout scrolls inside <main>, which the browser's own scroll
   restoration ignores. Remember its position per URL and put it back when
   the visitor returns with Back/Forward. */
let poppedHistory = false;
if (typeof window !== "undefined") {
  window.addEventListener("popstate", () => {
    poppedHistory = true;
  });
}

function useMainScrollMemory() {
  const pathname = usePathname();
  useEffect(() => {
    const el = document.getElementById(MAIN_ID);
    if (!el) return;
    const key = `bs.scroll:${pathname}${window.location.search}`;
    if (poppedHistory) {
      poppedHistory = false;
      let saved = 0;
      try {
        saved = Number(sessionStorage.getItem(key) || 0);
      } catch {
        /* ignore */
      }
      if (saved) requestAnimationFrame(() => (el.scrollTop = saved));
    }
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        try {
          sessionStorage.setItem(key, String(Math.round(el.scrollTop)));
        } catch {
          /* ignore */
        }
      });
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("scroll", onScroll);
    };
  }, [pathname]);
}

export function AppShell({ children }: { children: ReactNode }) {
  useMainScrollMemory();
  return (
    <div className="min-h-dvh bg-surface lg:grid lg:h-dvh lg:grid-cols-[var(--sidebar-w)_minmax(0,1fr)] lg:overflow-hidden lg:bg-chrome">
      <aside className="hidden min-h-0 flex-col pb-2 pl-2.5 pr-2 pt-2.5 lg:flex">
        <Suspense fallback={null}>
          <SidebarContent />
        </Suspense>
      </aside>

      <MobileBar />

      <main
        id={MAIN_ID}
        className="min-w-0 bg-surface [overscroll-behavior:none] lg:my-[var(--frame-gap)] lg:mr-[var(--frame-gap)] lg:overflow-y-auto lg:rounded-[18px] lg:shadow-[0_0_0_1px_var(--border)] lg:[scrollbar-gutter:stable]"
      >
        {children}
      </main>
    </div>
  );
}

/* ---- Sidebar content (shared by desktop and mobile drawer) ---- */

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { cat, tier } = useFilters();
  const { user } = useAuth();
  const onHome = pathname === "/";

  const navActive = onHome ? cat : pathname === "/account" ? "account" : null;
  const { container: navContainer, activeStyle: navActiveStyle, hoverStyle: navHoverStyle, hoverProps: navHoverProps } = useGlide<HTMLDivElement>(navActive, { hover: true });

  const countFor = (id: string) =>
    TWEAKS.filter(
      (t) =>
        (id === "all" || t.category === id) &&
        (tier === "all" || t.tier === tier),
    ).length;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex h-[30px] shrink-0 items-center px-1.5">
        <Logo />
      </div>

      <div className="mt-3.5 shrink-0">
        <SearchField />
      </div>

      <nav className="bs-no-scrollbar -mx-1 mt-2.5 min-h-0 flex-1 overflow-y-auto px-1 pb-3 pt-0.5">
        <div ref={navContainer} className="relative" {...navHoverProps}>
          <span
            data-glide-pill
            aria-hidden
            className="pointer-events-none absolute rounded-[8px] bg-hover"
            style={navHoverStyle}
          />
          <span
            data-glide-pill
            aria-hidden
            className="pointer-events-none absolute rounded-[8px] bg-select"
            style={navActiveStyle}
          />

          <GroupLabel first>Sections</GroupLabel>
          <NavRow
            id="all"
            href={filterHref({ cat: "all", tier })}
            label="All sections"
            count={countFor("all")}
            active={navActive === "all"}
            onNavigate={onNavigate}
          />
          {CATEGORIES.map((c) => (
            <NavRow
              key={c.id}
              id={c.id}
              href={filterHref({ cat: c.id, tier })}
              label={c.label}
              count={countFor(c.id)}
              active={navActive === c.id}
              onNavigate={onNavigate}
            />
          ))}

          {user && (
            <>
              <GroupLabel>You</GroupLabel>
              <NavRow
                id="account"
                href="/account"
                label="My unlocks"
                icon={<IconUnlock />}
                active={navActive === "account"}
                onNavigate={onNavigate}
              />
            </>
          )}
        </div>

        {!ALL_FREE && (
          <>
            <GroupLabel>Pricing</GroupLabel>
            <TierSwitch
              tier={tier}
              cat={onHome ? cat : "all"}
              onNavigate={onNavigate}
            />
          </>
        )}
      </nav>

      <div className="shrink-0 border-t border-border pt-2">
        <AccountButton />
      </div>
    </div>
  );
}

function GroupLabel({
  children,
  first = false,
}: {
  children: ReactNode;
  first?: boolean;
}) {
  return (
    <p
      className={`mb-1 px-1.5 text-[12.5px] leading-4 text-ink-4 ${
        first ? "mt-2" : "mt-4"
      }`}
    >
      {children}
    </p>
  );
}

function NavRow({
  id,
  href,
  label,
  count,
  icon,
  active,
  onNavigate,
}: {
  id: string;
  href: string;
  label: string;
  count?: number;
  icon?: ReactNode;
  active: boolean;
  onNavigate?: () => void;
}) {
  const Icon = CATEGORY_ICON[id];
  return (
    <Link
      href={href}
      scroll={false}
      data-glide={id}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={`group relative flex h-8 items-center gap-2 rounded-[8px] px-1.5 text-[13.5px] transition-colors duration-[var(--dur-fast)] ${
        active ? "font-medium text-ink" : "text-ink-2 hover:text-ink"
      }`}
    >
      <span
        className={`grid w-4 shrink-0 place-items-center transition-colors duration-[var(--dur-fast)] ${
          active ? "text-ink" : "text-ink-3 group-hover:text-ink-2"
        }`}
      >
        {icon ?? (Icon ? <Icon /> : null)}
      </span>
      <span className="flex-1 truncate">{label}</span>
      {count !== undefined && (
        <span className="text-[12px] tabular-nums text-ink-4">{count}</span>
      )}
    </Link>
  );
}

/* Segmented All / Free / Premium with a gliding thumb */
function TierSwitch({
  tier,
  cat,
  onNavigate,
}: {
  tier: TierFilter;
  cat: CatFilter;
  onNavigate?: () => void;
}) {
  const { container, activeStyle } = useGlide<HTMLDivElement>(tier);
  const opts: [TierFilter, string][] = [
    ["all", "All"],
    ["free", "Free"],
    ["paid", "Premium"],
  ];
  return (
    <div className="rounded-[11px] bg-[rgba(0,0,0,0.045)] p-[3px]">
      <div ref={container} className="relative flex">
        <span
          data-glide-pill
          aria-hidden
          className="pointer-events-none absolute rounded-[8px] bg-surface shadow-[0_0_0_0.5px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.08),0_2px_8px_-2px_rgba(0,0,0,0.06)]"
          style={activeStyle}
        />
        {opts.map(([val, label]) => {
          const on = tier === val;
          return (
            <Link
              key={val}
              href={filterHref({ cat, tier: val })}
              scroll={false}
              data-glide={val}
              onClick={onNavigate}
              aria-current={on ? "true" : undefined}
              className={`relative flex h-[28px] flex-1 items-center justify-center rounded-[8px] text-[13px] transition-colors duration-[var(--dur-fast)] ${
                on ? "text-ink" : "text-ink-3 hover:text-ink"
              }`}
            >
              {/* bold/regular stacked so the weight change never shifts width */}
              <span className="grid">
                <span
                  className={`col-start-1 row-start-1 font-medium transition-opacity duration-200 ${on ? "opacity-0" : ""}`}
                >
                  {label}
                </span>
                <span
                  className={`col-start-1 row-start-1 font-semibold transition-opacity duration-200 ${on ? "" : "opacity-0"}`}
                  aria-hidden
                >
                  {label}
                </span>
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function SearchField() {
  const { open, openPalette } = usePalette();
  const mod = useModKey();
  return (
    <button
      type="button"
      onClick={openPalette}
      aria-expanded={open}
      className="flex h-8 w-full items-center gap-2 rounded-[9px] bg-surface pl-[9px] pr-2 text-[13px] text-ink-4 shadow-[0_0_0_1px_var(--border),var(--shadow-sm)] transition-[box-shadow,transform,translate,scale] duration-[var(--dur-fast)] ease-[var(--ease)] hover:shadow-[0_0_0_1px_var(--border-strong),var(--shadow-sm)] active:scale-[0.985] aria-expanded:shadow-[0_0_0_1px_var(--border-strong),var(--shadow-sm)]"
    >
      <IconSearch className="text-ink-3" />
      <span className="flex-1 text-left">Search or jump</span>
      <kbd className="text-[11.5px] tracking-[0.02em] text-ink-4">
        {mod === "⌘" ? "⌘K" : "Ctrl K"}
      </kbd>
    </button>
  );
}

/* ---- Account (sidebar footer) ---- */

function AccountButton() {
  const { user, openAuth, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const { mounted, closing } = usePresence(open, 120);
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!user) {
    return (
      <div className="px-0.5 pb-0.5">
        <button
          type="button"
          onClick={() => openAuth()}
          className="bs-btn bs-btn-primary group h-[34px] w-full rounded-[10px] text-[13.5px]"
        >
          Sign in
          <span className="bs-reveal">
            <Chevron />
          </span>
        </button>
        <p className="mt-2 px-1 text-center text-[11.5px] leading-snug text-ink-4">
          Free · save designs and unlocks
        </p>
      </div>
    );
  }

  return (
    <div ref={wrap} className="relative">
      {mounted && (
        <div
          data-state={closing ? "closed" : "open"}
          role="menu"
          className="bs-pop absolute bottom-[calc(100%+6px)] left-0 right-0 z-20 origin-bottom-left rounded-[12px] bg-surface p-1 shadow-[0_0_0_1px_var(--border),var(--shadow-pop)]"
        >
          <div className="px-2 pb-1.5 pt-1">
            <p className="truncate text-[13px] font-medium capitalize">
              {user.name}
            </p>
            <p className="truncate text-[12px] text-ink-3">{user.email}</p>
          </div>
          <div className="mx-1 my-1 h-px bg-border" />
          <MenuItem href="/account" icon={<IconUnlock />} onClick={() => setOpen(false)}>
            My unlocks
          </MenuItem>
          <MenuItem
            icon={<IconLogout />}
            onClick={() => {
              setOpen(false);
              signOut();
            }}
          >
            Sign out
          </MenuItem>
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        className={`flex h-[34px] w-full items-center gap-[7px] rounded-[8px] px-1.5 text-left text-[13.5px] font-medium transition-colors duration-[var(--dur-fast)] ${
          open ? "bg-select" : "hover:bg-hover"
        }`}
      >
        <Avatar name={user.name} size={21} />
        <span className="min-w-0 flex-1 truncate capitalize">{user.name}</span>
        <svg
          width="14"
          height="14"
          viewBox="0 0 16 16"
          fill="none"
          className="shrink-0 text-ink-4"
          aria-hidden
        >
          <path
            d="M5 6.5L8 3.5l3 3M5 9.5l3 3 3-3"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </div>
  );
}

export function Avatar({ name, size = 28 }: { name: string; size?: number }) {
  return (
    <span
      className="grid shrink-0 place-items-center rounded-full bg-ink font-semibold uppercase text-white shadow-[0_0_0_1px_rgba(0,0,0,0.06)]"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.45) }}
    >
      {name.trim().slice(0, 1) || "?"}
    </span>
  );
}

export function MenuItem({
  href,
  icon,
  onClick,
  children,
}: {
  href?: string;
  icon: ReactNode;
  onClick?: () => void;
  children: ReactNode;
}) {
  const cls =
    "flex h-8 w-full items-center gap-2 rounded-[8px] px-2 text-[13px] text-ink-2 transition-colors duration-[var(--dur-fast)] hover:bg-hover hover:text-ink";
  const inner = (
    <>
      <span className="text-ink-3">{icon}</span>
      {children}
    </>
  );
  return href ? (
    <Link href={href} onClick={onClick} className={cls} role="menuitem">
      {inner}
    </Link>
  ) : (
    <button type="button" onClick={onClick} className={cls} role="menuitem">
      {inner}
    </button>
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

/* ---- Mobile: top bar + drawer ---- */

function MobileBar() {
  const [open, setOpen] = useState(false);
  const { mounted, closing } = usePresence(open, 240);
  const { openPalette } = usePalette();
  const pathname = usePathname();
  const [lastPath, setLastPath] = useState(pathname);

  /* close when the route changes */
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    document.documentElement.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.documentElement.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <header className="sticky top-0 z-30 flex h-[52px] items-center justify-between gap-2 border-b border-border bg-surface/85 pl-2 pr-3 backdrop-blur-xl lg:hidden">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
            className="bs-press grid h-9 w-9 place-items-center rounded-[10px] text-ink-2 hover:bg-hover hover:text-ink"
          >
            <IconMenu />
          </button>
          <Logo />
        </div>
        <button
          type="button"
          onClick={openPalette}
          aria-label="Search"
          className="bs-press grid h-9 w-9 place-items-center rounded-full text-ink-2 shadow-[0_0_0_1px_var(--border)] hover:bg-hover hover:text-ink"
        >
          <IconSearch />
        </button>
      </header>

      {mounted &&
        createPortal(
          <div className="fixed inset-0 z-[90] lg:hidden">
            <div
              data-state={closing ? "closed" : "open"}
              className="bs-overlay absolute inset-0 bg-[rgba(0,0,0,0.28)]"
              onClick={() => setOpen(false)}
            />
            <aside
              data-state={closing ? "closed" : "open"}
              className="bs-drawer absolute inset-y-0 left-0 flex w-[min(280px,calc(100%-56px))] flex-col rounded-r-[18px] bg-chrome pb-2 pl-2.5 pr-2 pt-2.5 shadow-[var(--shadow-modal)]"
            >
              <Suspense fallback={null}>
                <SidebarContent onNavigate={() => setOpen(false)} />
              </Suspense>
            </aside>
          </div>,
          document.body,
        )}
    </>
  );
}
