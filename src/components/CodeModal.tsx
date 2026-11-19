"use client";

import { useState } from "react";

export function CodeModal({
  code,
  name,
  slug,
  onClose,
}: {
  code: string;
  name: string;
  slug: string;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [tab, setTab] = useState<"code" | "how">("code");

  const copy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const download = () => {
    const blob = new Blob([code], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${slug}.liquid`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-ink/30 backdrop-blur-sm bs-fade-up"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[680px] max-h-[86vh] flex flex-col rounded-2xl bg-surface border border-border overflow-hidden"
        style={{ boxShadow: "var(--shadow-lg)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 h-14 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-[13px] font-semibold">{name}</span>
            <span className="text-[12px] text-ink-3">{slug}.liquid</span>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 grid place-items-center rounded-lg hover:bg-surface-2 text-ink-3"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="flex items-center gap-1 px-5 pt-3 shrink-0">
          <Tab active={tab === "code"} onClick={() => setTab("code")}>
            Liquid code
          </Tab>
          <Tab active={tab === "how"} onClick={() => setTab("how")}>
            How to install
          </Tab>
        </div>

        <div className="flex-1 overflow-auto p-5">
          {tab === "code" ? (
            <pre className="rounded-xl bg-[#0d0d0d] text-[#e8e8e8] p-4 text-[12px] leading-relaxed font-mono overflow-auto">
              <code>{code}</code>
            </pre>
          ) : (
            <ol className="space-y-3 text-sm text-ink-2 leading-relaxed">
              {[
                <>
                  In Shopify admin, open{" "}
                  <b className="text-ink">Online Store → Themes</b>, then{" "}
                  <b className="text-ink">⋯ → Edit code</b>.
                </>,
                <>
                  Under <b className="text-ink">Sections</b>, click{" "}
                  <b className="text-ink">Add a new section</b>, name it{" "}
                  <code className="px-1 rounded bg-surface-2">{slug}</code>, and
                  delete the boilerplate.
                </>,
                <>Paste the Liquid code and save.</>,
                <>
                  Open the <b className="text-ink">Theme editor</b>,{" "}
                  <b className="text-ink">Add section</b>, and pick{" "}
                  <b className="text-ink">{name}</b>. It already matches what you
                  designed — tweak further right inside Shopify if you like.
                </>,
              ].map((step, i) => (
                <li key={i} className="flex gap-3">
                  <span className="shrink-0 grid place-items-center w-6 h-6 rounded-full bg-ink text-surface text-[12px] font-semibold">
                    {i + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          )}
        </div>

        <div className="flex items-center gap-2 px-5 h-16 border-t border-border shrink-0">
          <button
            onClick={copy}
            className="flex-1 h-10 rounded-full bg-ink text-surface text-sm font-medium hover:opacity-90 active:scale-[0.99] transition-all"
          >
            {copied ? "Copied ✓" : "Copy code"}
          </button>
          <button
            onClick={download}
            className="h-10 px-4 rounded-full border border-border text-sm font-medium hover:bg-surface-2 transition-colors"
          >
            Download .liquid
          </button>
        </div>
      </div>
    </div>
  );
}

function Tab({
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
      className={`h-8 px-3 rounded-lg text-[13px] font-medium transition-colors ${
        active ? "bg-surface-2 text-ink" : "text-ink-3 hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}
