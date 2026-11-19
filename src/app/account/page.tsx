"use client";

import Link from "next/link";
import { Nav } from "@/components/Nav";
import { useAuth } from "@/lib/auth";
import { TWEAKS } from "@/lib/registry";

export default function AccountPage() {
  const { user, purchased, openAuth } = useAuth();
  const unlocked = TWEAKS.filter((t) => purchased.includes(t.slug));

  return (
    <>
      <Nav />
      <main className="mx-auto max-w-[760px] w-full px-5 py-12">
        {!user ? (
          <div className="rounded-2xl border border-border bg-surface p-10 text-center">
            <h1 className="text-xl font-semibold tracking-tight">
              Sign in to view your unlocks
            </h1>
            <p className="mt-2 text-sm text-ink-2">
              Your purchases and saved customizations live here.
            </p>
            <button
              onClick={openAuth}
              className="mt-5 h-10 px-5 rounded-full bg-ink text-surface text-sm font-medium hover:opacity-90 transition-all"
            >
              Sign in
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-4">
              <span className="grid place-items-center w-14 h-14 rounded-full bg-accent-soft text-ink text-xl font-semibold uppercase">
                {user.name.slice(0, 1)}
              </span>
              <div>
                <h1 className="text-xl font-semibold tracking-tight capitalize">
                  {user.name}
                </h1>
                <p className="text-sm text-ink-3">{user.email}</p>
              </div>
            </div>

            <h2 className="mt-10 mb-3 text-sm font-semibold">
              Unlocked sections{" "}
              <span className="text-ink-4">({unlocked.length})</span>
            </h2>

            {unlocked.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border-strong p-10 text-center text-ink-3">
                No premium sections yet.{" "}
                <Link href="/" className="text-ink underline">
                  Browse the directory
                </Link>
                .
              </div>
            ) : (
              <div className="space-y-2">
                {unlocked.map((t) => (
                  <Link
                    key={t.slug}
                    href={`/tweak/${t.slug}`}
                    className="flex items-center justify-between rounded-xl border border-border bg-surface p-4 hover:border-border-strong transition-colors"
                  >
                    <div>
                      <p className="font-medium text-sm">{t.name}</p>
                      <p className="text-[13px] text-ink-3">{t.tagline}</p>
                    </div>
                    <span className="text-[13px] font-medium text-ink-3">
                      Open →
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </>
  );
}
