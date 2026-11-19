"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { getTweak } from "@/lib/registry";
import { categoryLabel } from "@/lib/categories";
import type { ConfigValue, Field, Tweak, TweakConfig } from "@/lib/types";
import { Control } from "@/components/Controls";
import { CodeModal } from "@/components/CodeModal";
import { Logo } from "@/components/Nav";
import { useAuth } from "@/lib/auth";

export default function EditorPage() {
  const params = useParams<{ slug: string }>();
  const tweak = getTweak(params.slug);

  if (!tweak) {
    return (
      <div className="min-h-screen grid place-items-center">
        <div className="text-center">
          <p className="text-lg font-semibold">Section not found</p>
          <Link href="/" className="text-sm text-ink-3 underline mt-2 inline-block">
            Back to directory
          </Link>
        </div>
      </div>
    );
  }

  // key by slug so switching sections remounts with a fresh config
  return <Editor key={tweak.slug} tweak={tweak} />;
}

function Editor({ tweak }: { tweak: Tweak }) {
  const { user, openAuth, signOut, hasPurchased, openPaywall } = useAuth();

  const [config, setConfig] = useState<TweakConfig>(() =>
    structuredClone(tweak.defaults),
  );
  const [viewport, setViewport] = useState<"desktop" | "mobile">("desktop");
  const [showCode, setShowCode] = useState(false);

  const owned = tweak.tier === "free" || hasPurchased(tweak.slug);

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
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Top bar */}
      <header className="shrink-0 h-14 border-b border-border bg-surface flex items-center justify-between px-4 gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <Logo />
          <span className="text-ink-4">/</span>
          <Link
            href="/"
            className="text-sm text-ink-3 hover:text-ink transition-colors hidden sm:block"
          >
            {categoryLabel(tweak.category)}
          </Link>
          <span className="text-ink-4 hidden sm:block">/</span>
          <span className="text-sm font-medium truncate">{tweak.name}</span>
          {tweak.tier === "free" ? (
            <span className="shrink-0 px-2 py-0.5 rounded-full bg-surface-2 text-[11px] font-semibold text-ink-2">
              Free
            </span>
          ) : owned ? (
            <span className="shrink-0 px-2 py-0.5 rounded-full bg-ink text-surface text-[11px] font-semibold">
              Unlocked
            </span>
          ) : (
            <span className="shrink-0 px-2 py-0.5 rounded-full bg-surface-2 text-[11px] font-semibold text-ink-2">
              ${tweak.price}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={reset}
            className="h-9 px-3 rounded-lg text-sm font-medium text-ink-2 hover:bg-surface-2 transition-colors"
          >
            Reset
          </button>
          <button
            onClick={handleExport}
            className="h-9 px-4 rounded-full bg-ink text-surface text-sm font-medium hover:opacity-90 active:scale-[0.98] transition-all flex items-center gap-2"
          >
            {owned ? (
              <>
                <CodeIcon />
                Export Liquid
              </>
            ) : (
              <>
                <LockIcon />
                Unlock ${tweak.price}
              </>
            )}
          </button>
          {user ? (
            <button
              onClick={signOut}
              title={user.email}
              className="h-9 w-9 grid place-items-center rounded-full bg-accent-soft text-ink text-sm font-semibold uppercase"
            >
              {user.name.slice(0, 1)}
            </button>
          ) : (
            <button
              onClick={openAuth}
              className="h-9 px-3 rounded-lg border border-border text-sm font-medium hover:bg-surface-2 transition-colors"
            >
              Sign in
            </button>
          )}
        </div>
      </header>

      {/* Body */}
      <div className="flex flex-1 min-h-0">
        {/* Canvas */}
        <div className="flex-1 min-w-0 flex flex-col bg-bg overflow-hidden">
          <div className="shrink-0 h-12 flex items-center justify-center border-b border-border bg-surface/50">
            <div className="inline-flex items-center gap-0.5 p-0.5 rounded-lg bg-surface-2 border border-border">
              <ViewBtn
                active={viewport === "desktop"}
                onClick={() => setViewport("desktop")}
              >
                Desktop
              </ViewBtn>
              <ViewBtn
                active={viewport === "mobile"}
                onClick={() => setViewport("mobile")}
              >
                Mobile
              </ViewBtn>
            </div>
          </div>

          <div
            className="flex-1 overflow-auto p-6 md:p-10 bg-surface-2"
            style={{
              backgroundImage:
                "radial-gradient(var(--border-strong) 1px, transparent 1px)",
              backgroundSize: "22px 22px",
            }}
          >
            <div
              className="mx-auto transition-all duration-300"
              style={{ maxWidth: viewport === "mobile" ? 390 : 980 }}
            >
              {/* Faux browser frame */}
              <div
                className="rounded-2xl bg-surface border border-border overflow-hidden"
                style={{ boxShadow: "var(--shadow-lg)" }}
              >
                <div className="h-9 flex items-center gap-1.5 px-4 border-b border-border bg-surface-2/60">
                  <span className="h-2.5 w-2.5 rounded-full bg-border-strong" />
                  <span className="h-2.5 w-2.5 rounded-full bg-border-strong" />
                  <span className="h-2.5 w-2.5 rounded-full bg-border-strong" />
                  <span className="ml-3 text-[11px] text-ink-4 truncate">
                    your-store.myshopify.com
                  </span>
                </div>
                <div>
                  <Preview config={config} />
                </div>
              </div>

              {/* Description */}
              <div className="mt-8 max-w-[620px]">
                <h1 className="text-xl font-semibold tracking-tight">
                  {tweak.name}
                </h1>
                <p className="mt-2 text-[15px] text-ink-2 leading-relaxed">
                  {tweak.description}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Controls */}
        <aside className="w-[340px] shrink-0 border-l border-border bg-surface flex flex-col">
          <div className="shrink-0 px-5 h-12 flex items-center border-b border-border">
            <span className="text-[13px] font-semibold">Customize</span>
            <span className="ml-auto text-[11px] text-ink-4">
              {tweak.fields.length} controls
            </span>
          </div>
          <div className="flex-1 overflow-y-auto px-5 py-5 space-y-7">
            {groups.map(({ group, fields }) => (
              <div key={group}>
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-ink-4">
                  {group}
                </p>
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
              </div>
            ))}
          </div>
          <div className="shrink-0 p-4 border-t border-border">
            <button
              onClick={handleExport}
              className="w-full h-11 rounded-full bg-ink text-surface text-sm font-medium hover:opacity-90 active:scale-[0.99] transition-all flex items-center justify-center gap-2"
            >
              {owned ? (
                <>
                  <CodeIcon /> Export Liquid code
                </>
              ) : (
                <>
                  <LockIcon /> Unlock & export · ${tweak.price}
                </>
              )}
            </button>
            {!owned && (
              <p className="mt-2 text-[11px] text-ink-4 text-center">
                Tweak everything free — pay once to export.
              </p>
            )}
          </div>
        </aside>
      </div>

      {showCode && (
        <CodeModal
          code={tweak.generateLiquid(config)}
          name={tweak.name}
          slug={tweak.slug}
          onClose={() => setShowCode(false)}
        />
      )}
    </div>
  );
}

function ViewBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`h-7 px-3 rounded-md text-[12px] font-medium transition-colors ${
        active ? "bg-surface text-ink shadow-sm" : "text-ink-3 hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}

function CodeIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
      <path
        d="M5.5 5L2.5 8l3 3M10.5 5l3 3-3 3"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <rect x="3.5" y="7" width="9" height="6.5" rx="1.5" fill="currentColor" />
      <path
        d="M5.5 7V5a2.5 2.5 0 015 0v2"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  );
}
