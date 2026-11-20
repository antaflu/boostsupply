"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Dialog } from "@/components/Dialog";
import { useAuth } from "@/lib/auth";
import { TWEAKS } from "@/lib/registry";
import { CATEGORIES, categoryLabel } from "@/lib/categories";
import { filterHref } from "@/lib/filters";
import { getRecent, pushRecent } from "@/lib/recent";
import { useGlide } from "@/lib/useGlide";
import {
  CATEGORY_ICON,
  IconArrowRight,
  IconLogout,
  IconSearch,
  IconSparkle,
  IconUnlock,
} from "@/lib/nav-icons";

/* ============================================================
   Search palette (Chopper ⌘K)
   Spotlight position, frosted panel, grouped results, a pill
   that glides to the selected row, Esc peels back one layer
   (clear the query first, then close).
   ============================================================ */

type Kind = "section" | "category" | "action";

interface Item {
  id: string;
  kind: Kind;
  title: string;
  sub?: string;
  icon: ReactNode;
  meta?: ReactNode;
  /** extra text that should match but is not shown */
  keywords?: string;
  run: () => void;
}

interface Group {
  title: string;
  items: Item[];
}

const KIND_LABEL: Record<Kind, string> = {
  section: "Section",
  category: "Category",
  action: "Action",
};

export function SearchPalette({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      label="Search or jump"
      variant="palette"
      escapeCloses={false}
      panelClassName="max-w-[680px]"
    >
      {/* Dialog unmounts this after the exit animation, so every
          open starts fresh (empty query, first row picked). */}
      <PaletteBody onClose={onClose} />
    </Dialog>
  );
}

function PaletteBody({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const { user, openAuth, signOut } = useAuth();
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const [recent] = useState(getRecent);
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLDivElement>(null);

  /* ---- the catalogue of things you can jump to ---- */
  const items = useMemo(() => {
    const go = (href: string) => () => {
      onClose();
      router.push(href, { scroll: false });
    };

    const sections: Item[] = TWEAKS.map((t) => {
      const Icon = CATEGORY_ICON[t.category];
      return {
        id: `s:${t.slug}`,
        kind: "section",
        title: t.name,
        sub: t.tagline,
        icon: <Icon />,
        meta: t.tier === "free" ? "Free" : `$${t.price}`,
        keywords: `${categoryLabel(t.category)} ${t.description}`,
        run: () => {
          pushRecent(t.slug);
          onClose();
          router.push(`/tweak/${t.slug}`);
        },
      };
    });

    const categories: Item[] = CATEGORIES.map((c) => {
      const Icon = CATEGORY_ICON[c.id];
      const n = TWEAKS.filter((t) => t.category === c.id).length;
      return {
        id: `c:${c.id}`,
        kind: "category",
        title: c.label,
        sub: c.blurb,
        icon: <Icon />,
        meta: `${n} section${n === 1 ? "" : "s"}`,
        run: go(filterHref({ cat: c.id })),
      };
    });

    const actions: Item[] = [
      {
        id: "a:all",
        kind: "action",
        title: "Browse all sections",
        icon: <IconArrowRight />,
        keywords: "home directory library",
        run: go("/"),
      },
      {
        id: "a:free",
        kind: "action",
        title: "Show free sections",
        icon: <IconSparkle />,
        keywords: "free gratis try",
        run: go(filterHref({ tier: "free" })),
      },
      ...(user
        ? [
            {
              id: "a:unlocks",
              kind: "action" as const,
              title: "My unlocks",
              icon: <IconUnlock />,
              keywords: "account purchases bought",
              run: go("/account"),
            },
            {
              id: "a:signout",
              kind: "action" as const,
              title: "Sign out",
              icon: <IconLogout />,
              keywords: "log out logout",
              run: () => {
                onClose();
                signOut();
              },
            },
          ]
        : [
            {
              id: "a:signin",
              kind: "action" as const,
              title: "Sign in",
              icon: <IconUnlock />,
              keywords: "log in login account register create",
              run: () => {
                onClose();
                setTimeout(openAuth, 150);
              },
            },
          ]),
    ];

    return { sections, categories, actions };
  }, [router, onClose, user, openAuth, signOut]);

  /* ---- grouping + ranking ---- */
  const q = query.trim().toLowerCase();
  const groups: Group[] = useMemo(() => {
    const { sections, categories, actions } = items;
    if (!q) {
      const recentItems = recent
        .map((slug) => sections.find((s) => s.id === `s:${slug}`))
        .filter((x): x is Item => !!x);
      return [
        { title: "Recent", items: recentItems },
        {
          title: "Sections",
          items: sections.filter((s) => !recentItems.includes(s)),
        },
        { title: "Browse", items: categories },
        { title: "Actions", items: actions },
      ].filter((g) => g.items.length > 0);
    }

    const scored = [...sections, ...categories, ...actions]
      .map((item) => ({ item, score: score(item, q) }))
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score);
    if (scored.length === 0) return [];

    const top = scored[0].item;
    const rest = (kind: Kind, cap: number) =>
      scored
        .filter((r) => r.item.kind === kind && r.item !== top)
        .slice(0, cap)
        .map((r) => r.item);

    return [
      { title: "Top hit", items: [top] },
      { title: "Sections", items: rest("section", 6) },
      { title: "Browse", items: rest("category", 4) },
      { title: "Actions", items: rest("action", 4) },
    ].filter((g) => g.items.length > 0);
  }, [items, q, recent]);

  const flat = useMemo(() => groups.flatMap((g) => g.items), [groups]);
  const safeIndex = Math.min(index, Math.max(flat.length - 1, 0));
  const picked = flat[safeIndex];

  const { container: glideContainer, activeStyle: glideActiveStyle } = useGlide<HTMLDivElement>(picked?.id ?? null);

  /* keep the picked row in view */
  useEffect(() => {
    if (!picked) return;
    list.current
      ?.querySelector<HTMLElement>(`[data-glide="${CSS.escape(picked.id)}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [picked]);

  useEffect(() => {
    input.current?.focus();
  }, []);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setIndex(Math.min(safeIndex + 1, flat.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setIndex(Math.max(safeIndex - 1, 0));
    } else if (e.key === "Home" && !query) {
      e.preventDefault();
      setIndex(0);
    } else if (e.key === "End" && !query) {
      e.preventDefault();
      setIndex(flat.length - 1);
    } else if (e.key === "Enter") {
      e.preventDefault();
      picked?.run();
    } else if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      if (query) {
        setQuery("");
        setIndex(0);
      } else onClose();
    }
  };

  let row = -1;

  return (
    <div
      onKeyDown={onKeyDown}
      className="bs-cmdk-glass flex max-h-[min(560px,calc(100dvh-32px-min(16vh,140px)))] flex-col overflow-hidden rounded-[18px] max-sm:max-h-[calc(100dvh-20px)] max-sm:rounded-[16px]"
    >
      {/* input bar */}
      <div className="flex h-[60px] shrink-0 items-center gap-2.5 border-b border-hairline pl-[18px] pr-4 text-ink-3">
        <IconSearch size={18} />
        <input
          ref={input}
          data-autofocus
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIndex(0);
          }}
          placeholder="Search sections, categories, actions…"
          aria-label="Search"
          aria-controls="bs-cmdk-list"
          aria-activedescendant={picked ? `cmdk-${picked.id}` : undefined}
          role="combobox"
          aria-expanded="true"
          spellCheck={false}
          autoComplete="off"
          className="h-full min-w-0 flex-1 bg-transparent text-[18px] tracking-[-0.01em] text-ink outline-none placeholder:text-ink-4"
        />
        <button
          type="button"
          onClick={onClose}
          className="rounded-[6px] bg-surface-2 px-1.5 py-0.5 text-[11px] text-ink-4 transition-colors hover:bg-surface-3 hover:text-ink-3"
        >
          esc
        </button>
      </div>

      {/* results */}
      <div
        ref={list}
        id="bs-cmdk-list"
        role="listbox"
        /* keep focus (and typing) in the input while clicking rows */
        onMouseDown={(e) => e.preventDefault()}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 pb-2 pt-1.5 [scroll-padding:8px]"
      >
        {flat.length === 0 ? (
          <div className="px-3 py-9 text-center">
            <p className="text-[13.5px] text-ink-3">
              Nothing for &ldquo;{query.trim()}&rdquo;
            </p>
            <p className="mt-1 text-[12.5px] text-ink-4">
              Try &ldquo;reviews&rdquo;, &ldquo;shipping&rdquo; or
              &ldquo;countdown&rdquo;.
            </p>
          </div>
        ) : (
          <div ref={glideContainer} className="relative">
            <span
              data-glide-pill
              aria-hidden
              className="pointer-events-none absolute rounded-[10px] bg-[rgba(0,0,0,0.05)]"
              style={glideActiveStyle}
            />
            {groups.map((g, gi) => (
              <div key={g.title} className={gi > 0 ? "mt-1.5" : ""}>
                <p className="px-2.5 pb-1 pt-2 text-[11.5px] font-semibold tracking-[0.02em] text-ink-4">
                  {g.title}
                </p>
                {g.items.map((item) => {
                  row += 1;
                  const i = row;
                  const on = i === safeIndex;
                  return (
                    <div
                      key={item.id}
                      id={`cmdk-${item.id}`}
                      role="option"
                      aria-selected={on}
                      data-glide={item.id}
                      onMouseMove={() => i !== safeIndex && setIndex(i)}
                      onClick={() => item.run()}
                      className={`relative flex min-h-[42px] cursor-pointer items-center gap-2.5 rounded-[10px] px-2.5 py-[5px] transition-colors duration-100 ${
                        on ? "text-ink" : "text-ink-2"
                      }`}
                    >
                      <span
                        className={`grid h-[26px] w-[26px] shrink-0 place-items-center rounded-[7px] transition-colors duration-150 ${
                          on
                            ? "bg-surface text-ink shadow-[0_0_0_1px_var(--border),0_1px_2px_rgba(0,0,0,0.06)]"
                            : "text-ink-3"
                        }`}
                      >
                        {item.icon}
                      </span>
                      <span className="flex min-w-0 flex-1 items-baseline gap-2">
                        <span className="truncate text-[14.5px]">
                          <Highlight text={item.title} q={q} />
                        </span>
                        {item.sub && (
                          <span className="max-w-[48%] shrink-0 truncate text-[12.5px] text-ink-4 max-sm:hidden">
                            {item.sub}
                          </span>
                        )}
                      </span>
                      <span className="shrink-0 text-[12px] text-ink-4">
                        {g.title === "Top hit" ? KIND_LABEL[item.kind] : item.meta}
                      </span>
                      <kbd
                        className={`shrink-0 rounded-[6px] bg-surface-2 px-1.5 py-px text-[12px] text-ink-3 transition-[opacity,transform,translate,scale] duration-150 ease-[var(--ease)] ${
                          on ? "opacity-100" : "-translate-x-1 opacity-0"
                        }`}
                        aria-hidden
                      >
                        ↵
                      </kbd>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* footer hints */}
      <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1 border-t border-hairline px-[18px] py-[9px] text-[12px] text-ink-4 max-sm:hidden">
        <span>
          <kbd className="bs-kbd mr-0.5">↑</kbd>
          <kbd className="bs-kbd mr-1">↓</kbd>
          to move
        </span>
        <span>
          <kbd className="bs-kbd mr-1">↵</kbd>
          to open
        </span>
        <span>
          <kbd className="bs-kbd mr-1">esc</kbd>
          {query ? "to clear" : "to close"}
        </span>
        <span className="ml-auto">{TWEAKS.length} sections</span>
      </div>
    </div>
  );
}

/* ---- ranking ---- */

function score(item: Item, q: string) {
  const title = item.title.toLowerCase();
  const sub = (item.sub ?? "").toLowerCase();
  const extra = (item.keywords ?? "").toLowerCase();
  const kindWeight =
    item.kind === "section" ? 1.15 : item.kind === "category" ? 1 : 0.9;

  let total = 0;
  for (const tok of q.split(/\s+/).filter(Boolean)) {
    let s = 0;
    if (title.startsWith(tok)) s = 100;
    else if (title.split(/[\s-]+/).some((w) => w.startsWith(tok))) s = 80;
    else if (title.includes(tok)) s = 60;
    else if (sub.includes(tok)) s = 30;
    else if (extra.includes(tok)) s = 20;
    else if (tok.length > 2 && subsequence(title, tok)) s = 12;
    if (s === 0) return 0; // every word must match somewhere
    total += s;
  }
  return total * kindWeight;
}

function subsequence(hay: string, needle: string) {
  let i = 0;
  for (const ch of hay) if (ch === needle[i]) i++;
  return i === needle.length;
}

/** Bold the matched letters (no colour highlight, Chopper-style). */
function Highlight({ text, q }: { text: string; q: string }) {
  if (!q) return <>{text}</>;
  const lower = text.toLowerCase();
  const tokens = q.split(/\s+/).filter(Boolean);
  const marks = new Array(text.length).fill(false);
  for (const tok of tokens) {
    const at = lower.indexOf(tok);
    if (at >= 0) for (let i = at; i < at + tok.length; i++) marks[i] = true;
  }
  if (!marks.some(Boolean)) return <>{text}</>;
  const out: ReactNode[] = [];
  let buf = "";
  let on = marks[0];
  text.split("").forEach((ch, i) => {
    if (marks[i] !== on) {
      out.push(on ? <mark key={i} className="bs-match">{buf}</mark> : buf);
      buf = "";
      on = marks[i];
    }
    buf += ch;
  });
  out.push(on ? <mark key="end" className="bs-match">{buf}</mark> : buf);
  return <>{out}</>;
}
