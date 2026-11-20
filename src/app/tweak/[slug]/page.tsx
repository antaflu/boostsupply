"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { getTweak } from "@/lib/registry";
import { categoryLabel } from "@/lib/categories";
import type { ConfigValue, Field, Tweak, TweakConfig } from "@/lib/types";
import { Control } from "@/components/Controls";
import { CodeModal } from "@/components/CodeModal";
import { LogoMark } from "@/components/Nav";
import { Avatar, MenuItem } from "@/components/AppShell";
import { usePresence } from "@/components/Dialog";
import { LoginWall } from "@/components/LoginWall";
import { InspiredBy } from "@/lib/brands";
import { useAuth } from "@/lib/auth";
import { usePalette } from "@/lib/palette";
import { pushRecent } from "@/lib/recent";
import { filterHref } from "@/lib/filters";
import { useGlide } from "@/lib/useGlide";
import {
  IconCode,
  IconLock,
  IconLogout,
  IconSearch,
  IconUnlock,
} from "@/lib/nav-icons";

export default function EditorPage() {
  const params = useParams<{ slug: string }>();
  const tweak = getTweak(params.slug);

  if (!tweak) {
    return (
      <div className="grid min-h-dvh place-items-center bg-chrome px-6">
        <div className="bs-fade-up text-center">
          <p className="text-[17px] font-semibold">Section not found</p>
          <p className="mt-1 text-[13.5px] text-ink-3">
            It may have been renamed or removed.
          </p>
          <Link href="/" className="bs-btn bs-btn-sm bs-btn-secondary mt-5">
            Back to all sections
          </Link>
        </div>
      </div>
    );
  }

  // key by slug so switching sections remounts with a fresh config
  return <Editor key={tweak.slug} tweak={tweak} />;
}

type Viewport = "desktop" | "mobile";

function Editor({ tweak }: { tweak: Tweak }) {
  const { user, hydrated, hasPurchased, openPaywall, exportRequest, requestExport } =
    useAuth();
  /* the editor is free, but behind an email: it's a lead magnet */
  const walled = hydrated && !user;

  const [config, setConfig] = useState<TweakConfig>(() =>
    structuredClone(tweak.defaults),
  );
  const [viewport, setViewport] = useState<Viewport>("desktop");
  const [showCode, setShowCode] = useState(false);

  const owned = tweak.tier === "free" || hasPurchased(tweak.slug);
  const dirty = useMemo(
    () => JSON.stringify(config) !== JSON.stringify(tweak.defaults),
    [config, tweak.defaults],
  );

  useEffect(() => pushRecent(tweak.slug), [tweak.slug]);

  /* paywall → "Export Liquid now" */
  useEffect(() => {
    if (exportRequest !== tweak.slug) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reacting to a one-shot request from the paywall
    setShowCode(true);
    requestExport(null);
  }, [exportRequest, tweak.slug, requestExport]);

  const groups = useMemo(() => {
    const order: string[] = [];
    const map = new Map<string, Field[]>();
    for (const f of tweak.fields) {
      if (!map.has(f.group)) {
        map.set(f.group, []);
        order.push(f.group);
      }
      map.get(f.group)!.push(f);
    }
    return order.map((g) => ({ group: g, fields: map.get(g)! }));
  }, [tweak]);

  const Preview = tweak.Preview;

  const onChange = (key: string, value: unknown) =>
    setConfig((c) => ({ ...c, [key]: value as ConfigValue }));

  const reset = () => setConfig(structuredClone(tweak.defaults));

  const handleExport = () => {
    if (owned) setShowCode(true);
    else openPaywall(tweak.slug, tweak.name, tweak.price ?? 0);
  };

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-chrome">
      {/* ---- Top bar ---- */}
      <header
        inert={walled}
        className="flex h-14 shrink-0 items-center justify-between gap-3 px-3 sm:px-4"
      >
        <div className="flex min-w-0 items-center gap-1">
          <Link
            href="/"
            aria-label="All sections"
            className="bs-press grid h-8 w-8 shrink-0 place-items-center rounded-[9px] text-ink hover:bg-hover"
          >
            <LogoMark size={16} />
          </Link>
          <Crumb href="/" className="hidden md:inline-flex">
            Sections
          </Crumb>
          <Slash className="hidden md:block" />
          <Crumb
            href={filterHref({ cat: tweak.category })}
            className="hidden sm:inline-flex"
          >
            {categoryLabel(tweak.category)}
          </Crumb>
          <Slash className="hidden sm:block" />
          <span className="truncate px-1 text-[13.5px] font-medium">
            {tweak.name}
          </span>
          <TierBadge tweak={tweak} owned={owned} />
        </div>

        <div className="flex items-center gap-1.5">
          <SearchButton />
          <button
            type="button"
            onClick={reset}
            disabled={!dirty}
            className="bs-btn bs-btn-sm bs-btn-ghost hidden sm:inline-flex"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={handleExport}
            className="bs-btn bs-btn-sm bs-btn-primary"
          >
            {owned ? (
              <>
                <IconCode /> Export
              </>
            ) : (
              <>
                <IconLock size={14} /> Unlock ${tweak.price}
              </>
            )}
          </button>
          <UserButton />
        </div>
      </header>

      {/* ---- Body: canvas panel + controls ---- */}
      <div
        inert={walled}
        className="flex min-h-0 flex-1 gap-2 px-2 pb-2 max-md:flex-col max-md:overflow-y-auto"
      >
        {/* Canvas */}
        <section className="relative flex min-w-0 flex-1 flex-col overflow-hidden rounded-[18px] bg-surface shadow-[0_0_0_1px_var(--border)] max-md:min-h-[520px] max-md:flex-none">
          <div className="flex h-12 shrink-0 items-center justify-center border-b border-hairline">
            <ViewportSwitch value={viewport} onChange={setViewport} />
          </div>

          <div
            className="flex-1 overflow-auto bg-[#fafafa] p-5 md:p-10"
            style={{
              backgroundImage:
                "radial-gradient(rgba(0,0,0,0.07) 1px, transparent 1px)",
              backgroundSize: "20px 20px",
            }}
          >
            <div
              className="mx-auto transition-[max-width] duration-[520ms] ease-[var(--ease-sheet)]"
              style={{ maxWidth: viewport === "mobile" ? 390 : 980 }}
            >
              {/* Faux browser frame */}
              <div className="overflow-hidden rounded-[16px] bg-surface shadow-[0_0_0_1px_var(--border),var(--shadow-lg)]">
                <div className="flex h-9 items-center gap-1.5 border-b border-hairline bg-[#fbfbfb] px-4">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#e5e5e5]" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[#e5e5e5]" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[#e5e5e5]" />
                  <span className="mx-auto flex h-5 items-center rounded-[6px] bg-surface-2 px-3 text-[11px] text-ink-4">
                    your-store.myshopify.com
                  </span>
                  <span className="w-[42px]" />
                </div>
                <div>
                  <Preview config={config} />
                </div>
              </div>

              <div className="mt-8 max-w-[620px]">
                <h1 className="text-[20px] font-semibold tracking-[-0.02em]">
                  {tweak.name}
                </h1>
                {tweak.inspiredBy && (
                  <InspiredBy id={tweak.inspiredBy} className="mt-3" />
                )}
                <p className="mt-3 text-[14.5px] leading-relaxed text-ink-3">
                  {tweak.description}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Controls */}
        <aside className="flex w-[340px] shrink-0 flex-col overflow-hidden rounded-[18px] bg-surface shadow-[0_0_0_1px_var(--border)] max-md:w-full max-md:flex-none">
          <ControlsPanel
            groups={groups}
            config={config}
            onChange={onChange}
            fieldCount={tweak.fields.length}
          />
          <div className="shrink-0 border-t border-hairline p-3">
            <button
              type="button"
              onClick={handleExport}
              className="bs-btn bs-btn-md bs-btn-primary group w-full"
            >
              {owned ? (
                <>
                  <IconCode /> Export Liquid code
                </>
              ) : (
                <>
                  <IconLock size={14} /> Unlock &amp; export · ${tweak.price}
                </>
              )}
            </button>
            {!owned && (
              <p className="mt-2 text-center text-[11.5px] text-ink-4">
                Design everything free, pay once to export.
              </p>
            )}
          </div>
        </aside>
      </div>

      {walled && <EditorWall name={tweak.name} />}

      <CodeModal
        open={showCode}
        code={showCode ? tweak.generateLiquid(config) : ""}
        name={tweak.name}
        slug={tweak.slug}
        onClose={() => setShowCode(false)}
      />
    </div>
  );
}

/* ---------------------------------------------------------------
   Login wall over the editor: the section stays visible (blurred)
   behind it, so visitors see exactly what they are unlocking.
   --------------------------------------------------------------- */

function EditorWall({ name }: { name: string }) {
  const router = useRouter();
  /* Close = go back to where the visitor came from (the grid keeps its
     scroll position); a direct visit falls back to the library. */
  const leave = () => {
    let internal = false;
    try {
      internal = !!document.referrer && new URL(document.referrer).origin === location.origin;
    } catch {
      /* ignore */
    }
    if (internal && window.history.length > 1) router.back();
    else router.push("/");
  };
  const leaveRef = useRef(leave);
  useEffect(() => {
    leaveRef.current = leave;
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") leaveRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div
      className="bs-fade-up fixed inset-0 z-50 overflow-y-auto bg-[rgba(248,248,248,0.55)] backdrop-blur-[10px]"
      onMouseDown={(e) => {
        /* a click anywhere outside the wall's cards closes it */
        const t = e.target as HTMLElement;
        if (!t.closest("[data-wall-panel], a, button, input")) leave();
      }}
    >
      <div className="flex min-h-full flex-col items-center px-4 py-6 sm:py-10">
        <Link
          href="/"
          className="bs-press mb-5 inline-flex h-8 items-center gap-1.5 self-start rounded-full bg-surface px-3 text-[13px] font-medium text-ink-2 shadow-[0_0_0_1px_var(--border)] hover:text-ink sm:absolute sm:left-4 sm:top-4 sm:mb-0"
        >
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden>
            <path d="M10 3.5L5.5 8l4.5 4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          All sections
        </Link>
        <div className="my-auto w-full">
          <LoginWall
            panel
            title={`Customize ${name} for free`}
            subtitle="Sign in with your email to style it to your brand and export it to Shopify."
          />
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------
   Controls panel with scroll-spy group tabs
   --------------------------------------------------------------- */

function ControlsPanel({
  groups,
  config,
  onChange,
  fieldCount,
}: {
  groups: { group: string; fields: Field[] }[];
  config: TweakConfig;
  onChange: (key: string, value: unknown) => void;
  fieldCount: number;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const tabsBar = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(groups[0]?.group ?? "");
  const lock = useRef(false);
  const { container: tabsContainer, activeStyle: tabsActiveStyle, hoverStyle: tabsHoverStyle, hoverProps: tabsHoverProps } = useGlide<HTMLDivElement>(active, { hover: true });

  /* scroll-spy: the last group whose top passed the panel's top */
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const onScroll = () => {
      if (lock.current) return;
      const top = el.getBoundingClientRect().top + 24;
      let current = groups[0]?.group ?? "";
      for (const { group } of groups) {
        const sec = el.querySelector<HTMLElement>(`[data-group="${CSS.escape(group)}"]`);
        if (sec && sec.getBoundingClientRect().top <= top) current = group;
      }
      if (el.scrollTop + el.clientHeight >= el.scrollHeight - 4) {
        current = groups[groups.length - 1]?.group ?? current;
      }
      setActive(current);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [groups]);

  /* keep the active tab visible in the (scrollable) tab bar */
  useEffect(() => {
    tabsBar.current
      ?.querySelector<HTMLElement>(`[data-glide="${CSS.escape(active)}"]`)
      ?.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
  }, [active]);

  const jump = (group: string) => {
    const el = scroller.current;
    const sec = el?.querySelector<HTMLElement>(`[data-group="${CSS.escape(group)}"]`);
    if (!el || !sec) return;
    setActive(group);
    lock.current = true;
    el.scrollTo({ top: sec.offsetTop - 12, behavior: "smooth" });
    window.setTimeout(() => (lock.current = false), 600);
  };

  return (
    <>
      <div className="shrink-0 border-b border-hairline">
        <div className="flex h-11 items-center justify-between px-4">
          <span className="text-[13.5px] font-semibold">Customize</span>
          <span className="text-[12px] text-ink-4">{fieldCount} controls</span>
        </div>
        {groups.length > 1 && (
          <div
            ref={tabsBar}
            className="bs-no-scrollbar overflow-x-auto px-2.5 pb-2 [mask-image:linear-gradient(to_right,transparent,#000_10px,#000_calc(100%-16px),transparent)]"
          >
            <div
              ref={tabsContainer}
              role="tablist"
              className="relative flex w-max gap-0.5"
              {...tabsHoverProps}
            >
              <span
                data-glide-pill
                aria-hidden
                className="pointer-events-none absolute rounded-[8px] bg-hover"
                style={tabsHoverStyle}
              />
              <span
                data-glide-pill
                aria-hidden
                className="pointer-events-none absolute rounded-[8px] bg-select"
                style={tabsActiveStyle}
              />
              {groups.map(({ group }) => (
                <button
                  key={group}
                  type="button"
                  role="tab"
                  aria-selected={active === group}
                  data-glide={group}
                  onClick={() => jump(group)}
                  className={`relative h-7 rounded-[8px] px-2.5 text-[13px] transition-colors duration-[var(--dur-fast)] ${
                    active === group
                      ? "font-medium text-ink"
                      : "text-ink-3 hover:text-ink"
                  }`}
                >
                  {group}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div
        ref={scroller}
        className="relative min-h-0 flex-1 overflow-y-auto px-4 pb-6 pt-3 max-md:max-h-none"
      >
        {groups.map(({ group, fields }, gi) => (
          <section
            key={group}
            data-group={group}
            className={gi > 0 ? "mt-7 border-t border-hairline pt-5" : ""}
          >
            <p className="mb-3 text-[12.5px] text-ink-4">{group}</p>
            <div className="space-y-4">
              {fields.map((f) => (
                <Control
                  key={f.key}
                  field={f}
                  value={config[f.key]}
                  onChange={onChange}
                />
              ))}
            </div>
          </section>
        ))}
        {/* let the last group scroll to the top */}
        <div className="h-[30vh] max-md:hidden" aria-hidden />
      </div>
    </>
  );
}

/* ---------------------------------------------------------------
   Header bits
   --------------------------------------------------------------- */

function Crumb({
  href,
  className = "",
  children,
}: {
  href: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`h-7 items-center rounded-[7px] px-1.5 text-[13.5px] text-ink-3 transition-colors duration-[var(--dur-fast)] hover:bg-hover hover:text-ink ${className}`}
    >
      {children}
    </Link>
  );
}

function Slash({ className = "" }: { className?: string }) {
  return (
    <span className={`select-none text-[13px] text-ink-4/70 ${className}`}>
      /
    </span>
  );
}

function TierBadge({ tweak, owned }: { tweak: Tweak; owned: boolean }) {
  const label =
    tweak.tier === "free" ? "Free" : owned ? "Unlocked" : `$${tweak.price}`;
  const dark = tweak.tier !== "free" && owned;
  return (
    <span
      key={label}
      className={`bs-chip-pop ml-1 inline-flex h-5 shrink-0 items-center rounded-[6px] px-1.5 text-[11.5px] font-medium ${
        dark ? "bg-ink text-white" : "bg-surface-2 text-ink-2"
      }`}
    >
      {label}
    </span>
  );
}

function ViewportSwitch({
  value,
  onChange,
}: {
  value: Viewport;
  onChange: (v: Viewport) => void;
}) {
  const { container: gContainer, activeStyle: gActiveStyle } = useGlide<HTMLDivElement>(value);
  const opts: [Viewport, string, React.ReactNode][] = [
    [
      "desktop",
      "Desktop",
      <svg key="d" width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden>
        <rect x="2" y="3" width="12" height="8" rx="1.5" />
        <path d="M6 13.5h4" strokeLinecap="round" />
      </svg>,
    ],
    [
      "mobile",
      "Mobile",
      <svg key="m" width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden>
        <rect x="4.5" y="2" width="7" height="12" rx="1.6" />
        <path d="M7.2 11.8h1.6" strokeLinecap="round" />
      </svg>,
    ],
  ];
  return (
    <div className="rounded-[11px] bg-[rgba(0,0,0,0.045)] p-[3px]">
      <div ref={gContainer} role="tablist" className="relative flex">
        <span
          data-glide-pill
          aria-hidden
          className="pointer-events-none absolute rounded-[8px] bg-surface shadow-[0_0_0_0.5px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.08),0_2px_8px_-2px_rgba(0,0,0,0.06)]"
          style={gActiveStyle}
        />
        {opts.map(([v, label, icon]) => (
          <button
            key={v}
            type="button"
            role="tab"
            aria-selected={value === v}
            data-glide={v}
            onClick={() => onChange(v)}
            className={`relative flex h-7 items-center gap-1.5 rounded-[8px] px-3 text-[13px] font-medium transition-colors duration-[var(--dur-fast)] ${
              value === v ? "text-ink" : "text-ink-3 hover:text-ink"
            }`}
          >
            {icon}
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

function SearchButton() {
  const { openPalette } = usePalette();
  return (
    <button
      type="button"
      onClick={openPalette}
      aria-label="Search sections"
      title="Search (⌘K)"
      className="bs-press grid h-8 w-8 place-items-center rounded-[9px] text-ink-3 hover:bg-hover hover:text-ink"
    >
      <IconSearch />
    </button>
  );
}

function UserButton() {
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
      <button
        type="button"
        onClick={() => openAuth()}
        className="bs-btn bs-btn-sm bs-btn-secondary"
      >
        Sign in
      </button>
    );
  }

  return (
    <div ref={wrap} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Account"
        className={`bs-press grid h-8 w-8 place-items-center rounded-full transition-shadow ${
          open
            ? "shadow-[0_0_0_3px_var(--select)]"
            : "hover:shadow-[0_0_0_3px_var(--hover)]"
        }`}
      >
        <Avatar name={user.name} size={26} />
      </button>
      {mounted && (
        <div
          data-state={closing ? "closed" : "open"}
          role="menu"
          className="bs-pop-down absolute right-0 top-[calc(100%+6px)] z-50 w-56 origin-top-right rounded-[12px] bg-surface p-1 shadow-[0_0_0_1px_var(--border),var(--shadow-pop)]"
        >
          <div className="px-2 pb-1.5 pt-1">
            <p className="truncate text-[13px] font-medium capitalize">{user.name}</p>
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
    </div>
  );
}
