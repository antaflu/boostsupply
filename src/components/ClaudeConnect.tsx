"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import { useGlide } from "@/lib/useGlide";
import { IconCheck, IconCopy, IconLink, IconTerminal } from "@/lib/nav-icons";

/* ============================================================
   "Connect to Claude" field for the hero.

   One string to copy, framed so it is obvious where it goes:
   - Claude app (claude.ai / desktop): a custom-connector URL
   - Claude Code: the `claude mcp add` command
   Styled like the install box on UI-kit sites: tabs on top,
   monospace value, one copy button.
   ============================================================ */

/** Where the boost.supply MCP server will live. Not deployed yet. */
export const MCP_URL = "https://boost.supply/mcp";

type Target = "app" | "code";

const TARGETS: Record<
  Target,
  { label: string; value: string; hint: React.ReactNode }
> = {
  app: {
    label: "Claude app",
    value: MCP_URL,
    hint: (
      <>
        In Claude, open{" "}
        <span className="font-medium text-white">
          Settings → Connectors → Add custom connector
        </span>{" "}
        and paste this URL.
      </>
    ),
  },
  code: {
    label: "Claude Code",
    value: `claude mcp add --transport http boostsupply ${MCP_URL}`,
    hint: (
      <>
        Run this in your terminal, then ask Claude to{" "}
        <span className="font-medium text-white">
          “add a bundle buy box to my product page”
        </span>
        .
      </>
    ),
  },
};

export function ClaudeConnect({ className = "" }: { className?: string }) {
  const [target, setTarget] = useState<Target>("app");
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const valueRef = useRef<HTMLDivElement>(null);
  const {
    container: tabsContainer,
    activeStyle: tabsActiveStyle,
    hoverStyle: tabsHoverStyle,
    hoverProps: tabsHoverProps,
  } = useGlide<HTMLDivElement>(target, { hover: true });

  const current = TARGETS[target];
  const refract = useSyncExternalStore(noopSubscribe, supportsRefraction, () => false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(current.value);
    } catch {
      /* clipboard blocked: select the text so ⌘C still works */
      const el = valueRef.current;
      if (el) {
        const range = document.createRange();
        range.selectNodeContents(el);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
      }
      return;
    }
    setCopied(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 1800);
  };

  const pick = (t: Target) => {
    setTarget(t);
    setCopied(false);
  };

  return (
    <div
      data-refract={refract || undefined}
      className={`bs-liquid mx-auto w-full max-w-[560px] rounded-[24px] p-2 text-left text-white ${className}`}
    >
      {/* Liquid glass layers: refracted backdrop, tint, specular rim */}
      <span aria-hidden className="bs-liquid-refract" />
      <span aria-hidden className="bs-liquid-tint" />
      <span aria-hidden className="bs-liquid-rim" />
      <svg aria-hidden width="0" height="0" className="absolute">
        <filter id="bs-liquid-distort" x="0%" y="0%" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.008 0.014" numOctaves="2" seed="7" result="noise" />
          <feGaussianBlur in="noise" stdDeviation="2" result="soft" />
          <feDisplacementMap in="SourceGraphic" in2="soft" scale="55" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </svg>

      <div className="bs-liquid-body">
        {/* Header: app icon, what this is, where it goes */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2.5 px-2 pt-2">
          <ClaudeTile />
          <div className="min-w-0 flex-1 basis-[200px]">
            <p className="text-[14px] font-semibold leading-tight tracking-[-0.01em]">
              Connect to Claude
            </p>
            <p className="mt-0.5 text-[12.5px] leading-snug text-white/70">
              Build and install sections just by asking.
            </p>
          </div>

          <div
            ref={tabsContainer}
            role="tablist"
            aria-label="Where to connect"
            className="bs-liquid-seg relative flex rounded-full p-[3px] max-sm:w-full"
            {...tabsHoverProps}
          >
            <span
              data-glide-pill
              aria-hidden
              className="pointer-events-none absolute rounded-full bg-white/[0.12]"
              style={tabsHoverStyle}
            />
            <span
              data-glide-pill
              aria-hidden
              className="pointer-events-none absolute rounded-full bg-white shadow-[0_1px_2px_rgba(0,0,0,0.18),inset_0_-1px_0_rgba(0,0,0,0.06)]"
              style={tabsActiveStyle}
            />
            {(Object.keys(TARGETS) as Target[]).map((t) => (
              <button
                key={t}
                type="button"
                role="tab"
                aria-selected={target === t}
                data-glide={t}
                onClick={() => pick(t)}
                className={`relative z-10 h-7 rounded-full px-3 text-[12.5px] font-medium transition-colors duration-[var(--dur-fast)] max-sm:flex-1 ${
                  target === t ? "text-ink" : "text-white/75 hover:text-white"
                }`}
              >
                {TARGETS[t].label}
              </button>
            ))}
          </div>
        </div>

        {/* The string */}
        <div className="bs-liquid-well mt-3 flex items-center gap-2 rounded-[15px] p-1.5 pl-3">
          <span className="shrink-0 text-white/60" aria-hidden>
            {target === "app" ? <IconLink /> : <IconTerminal />}
          </span>
          <div className="relative min-w-0 flex-1 overflow-hidden">
            <div
              key={target}
              ref={valueRef}
              className="bs-swap bs-no-scrollbar overflow-x-auto whitespace-nowrap pr-6 font-mono text-[13px] text-white [mask-image:linear-gradient(to_right,#000_calc(100%-28px),transparent)]"
            >
              {current.value}
            </div>
          </div>
          <button
            type="button"
            onClick={copy}
            aria-label={copied ? "Copied" : `Copy ${current.label} ${target === "app" ? "URL" : "command"}`}
            className="bs-btn bs-btn-sm shrink-0 rounded-[10px] bg-white px-3 text-ink shadow-[0_1px_2px_rgba(0,0,0,0.2)] hover:bg-white/90"
          >
            <span key={copied ? "y" : "n"} className="bs-swap inline-flex items-center gap-1.5">
              {copied ? <IconCheck /> : <IconCopy />}
              {copied ? "Copied" : "Copy"}
            </span>
          </button>
        </div>

        {/* Where to paste it */}
        <p
          key={target}
          className="bs-swap px-2 pb-1.5 pt-2.5 text-[12.5px] leading-relaxed text-white/70"
        >
          {current.hint}
        </p>
      </div>
    </div>
  );
}

/* The SVG lensing only renders well in Chromium; other engines keep
   the plain glass (blur + rim) instead of risking a missing backdrop. */
const noopSubscribe = () => () => {};
function supportsRefraction() {
  const brands = (
    navigator as Navigator & { userAgentData?: { brands?: { brand: string }[] } }
  ).userAgentData?.brands;
  return !!brands?.some((b) => /Chromium/i.test(b.brand));
}

/* Claude-style app tile: terracotta square with a cream starburst. */
const RAYS = [
  [0, 9.6], [33, 8.2], [65, 9.2], [98, 7.8], [130, 9.8], [163, 8.4],
  [196, 9.4], [229, 8], [262, 9.7], [295, 8.3], [327, 9],
] as const;
const RAY_PATH = RAYS.map(([deg, len]) => {
  const a = (deg * Math.PI) / 180;
  const p = (r: number) =>
    `${(12 + Math.cos(a) * r).toFixed(2)} ${(12 + Math.sin(a) * r).toFixed(2)}`;
  return `M${p(1.6)}L${p(len)}`;
}).join("");

export function ClaudeTile({ size = 36 }: { size?: number }) {
  return (
    <span
      aria-hidden
      className="grid shrink-0 place-items-center bg-[#d97757] shadow-[inset_0_1px_0_rgba(255,255,255,0.25),inset_0_0_0_1px_rgba(0,0,0,0.06),0_2px_6px_-2px_rgba(217,119,87,0.6)]"
      style={{ width: size, height: size, borderRadius: size * 0.28 }}
    >
      <svg
        width={size * 0.62}
        height={size * 0.62}
        viewBox="0 0 24 24"
        fill="none"
        stroke="#faf9f5"
        strokeWidth="2.3"
        strokeLinecap="round"
      >
        <path d={RAY_PATH} />
      </svg>
    </span>
  );
}
