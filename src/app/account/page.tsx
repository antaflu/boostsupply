"use client";

import Link from "next/link";
import { AppShell, Avatar } from "@/components/AppShell";
import { useAuth } from "@/lib/auth";
import { TWEAKS } from "@/lib/registry";
import { categoryLabel } from "@/lib/categories";
import { CATEGORY_ICON, IconUnlock } from "@/lib/nav-icons";

export default function AccountPage() {
  const { user, purchased, openAuth } = useAuth();
  const unlocked = TWEAKS.filter((t) => purchased.includes(t.slug));
  const free = TWEAKS.filter((t) => t.tier === "free");

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-[760px] px-4 pb-24 pt-8 sm:px-8 sm:pt-14">
        {!user ? (
          <div className="bs-fade-up grid place-items-center rounded-[24px] bg-surface-2 px-6 py-16 text-center">
            <span className="grid h-12 w-12 place-items-center rounded-full bg-surface text-ink shadow-[0_0_0_1px_var(--border),var(--shadow-sm)]">
              <IconUnlock size={20} />
            </span>
            <h1 className="mt-4 text-[20px] font-semibold tracking-[-0.02em]">
              Sign in to see your unlocks
            </h1>
            <p className="mt-1.5 max-w-[320px] text-[13.5px] leading-5 text-ink-3">
              Your purchases and saved designs live here.
            </p>
            <button
              type="button"
              onClick={() => openAuth()}
              className="bs-btn bs-btn-md bs-btn-primary mt-6"
            >
              Sign in
            </button>
          </div>
        ) : (
          <>
            <div className="bs-fade-up flex items-center gap-4">
              <Avatar name={user.name} size={52} />
              <div className="min-w-0">
                <h1 className="truncate text-[22px] font-semibold capitalize leading-7 tracking-[-0.02em]">
                  {user.name}
                </h1>
                <p className="truncate text-[13.5px] text-ink-3">{user.email}</p>
              </div>
            </div>

            <Section title="Unlocked sections" count={unlocked.length}>
              {unlocked.length === 0 ? (
                <div className="rounded-[16px] bg-surface-2 px-6 py-10 text-center text-[13.5px] text-ink-3">
                  No premium sections yet.{" "}
                  <Link
                    href="/?tier=paid"
                    className="font-medium text-ink underline decoration-border-strong underline-offset-[3px] transition-colors hover:decoration-ink"
                  >
                    Browse premium
                  </Link>
                </div>
              ) : (
                <List items={unlocked} />
              )}
            </Section>

            <Section title="Free with your account" count={free.length}>
              <List items={free} />
            </Section>
          </>
        )}
      </div>
    </AppShell>
  );
}

function Section({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-10">
      <h2 className="mb-3 text-[13.5px] font-medium">
        {title} <span className="text-ink-4">{count}</span>
      </h2>
      {children}
    </section>
  );
}

function List({ items }: { items: typeof TWEAKS }) {
  return (
    <div className="overflow-hidden rounded-[16px] shadow-[0_0_0_1px_var(--border),var(--shadow-sm)]">
      {items.map((t, i) => {
        const Icon = CATEGORY_ICON[t.category];
        return (
          <Link
            key={t.slug}
            href={`/tweak/${t.slug}`}
            className="bs-rise group flex items-center gap-3 border-t border-hairline bg-surface px-4 py-3 transition-colors duration-[var(--dur-fast)] first:border-t-0 hover:bg-[#fafafa]"
            style={{ "--i": i } as React.CSSProperties}
          >
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-surface-2 text-ink-2 transition-colors group-hover:bg-surface-3 group-hover:text-ink">
              <Icon />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[14px] font-medium">{t.name}</span>
              <span className="block truncate text-[12.5px] text-ink-3">
                {categoryLabel(t.category)} · {t.tagline}
              </span>
            </span>
            <span className="flex shrink-0 items-center gap-1 text-[13px] font-medium text-ink-3 transition-colors group-hover:text-ink">
              Open
              <svg
                width="13"
                height="13"
                viewBox="0 0 16 16"
                fill="none"
                aria-hidden
                className="transition-transform duration-300 ease-[var(--ease)] group-hover:translate-x-0.5"
              >
                <path
                  d="M6 3.5L10.5 8 6 12.5"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
          </Link>
        );
      })}
    </div>
  );
}
