"use client";

import { useState } from "react";
import { CloseButton, Dialog } from "@/components/Dialog";
import { useGlide } from "@/lib/useGlide";
import { IconCheck } from "@/lib/nav-icons";

export function CodeModal({
  open,
  code,
  name,
  slug,
  onClose,
}: {
  open: boolean;
  code: string;
  name: string;
  slug: string;
  onClose: () => void;
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      label={`${name} Liquid code`}
      panelClassName="max-w-[720px]"
    >
      <CodeBody code={code} name={name} slug={slug} onClose={onClose} />
    </Dialog>
  );
}

function CodeBody({
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
  /* keep the last code while the dialog animates out */
  const [shownCode, setShownCode] = useState(code);
  if (code && code !== shownCode) setShownCode(code);

  const [copied, setCopied] = useState(false);
  const [tab, setTab] = useState<"code" | "how">("code");
  const { container: gContainer, activeStyle: gActiveStyle, hoverStyle: gHoverStyle, hoverProps: gHoverProps } = useGlide<HTMLDivElement>(tab, { hover: true });
  const lines = shownCode.split("\n").length;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shownCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked: user can still download */
    }
  };

  const download = () => {
    const blob = new Blob([shownCode], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${slug}.liquid`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex max-h-[86dvh] flex-col overflow-hidden rounded-[20px] bg-surface shadow-[0_0_0_1px_var(--border),var(--shadow-modal)]">
      <div className="flex h-14 shrink-0 items-center justify-between gap-3 pl-5 pr-3">
        <div className="flex min-w-0 items-baseline gap-2">
          <span className="truncate text-[15px] font-semibold tracking-[-0.01em]">
            {name}
          </span>
          <span className="shrink-0 text-[12.5px] text-ink-4">
            {slug}.liquid · {lines} lines
          </span>
        </div>
        <CloseButton onClick={onClose} />
      </div>

      <div className="shrink-0 px-4">
        <div
          ref={gContainer}
          role="tablist"
          className="relative flex w-max gap-0.5"
          {...gHoverProps}
        >
          <span
            data-glide-pill
            aria-hidden
            className="pointer-events-none absolute rounded-[9px] bg-hover"
            style={gHoverStyle}
          />
          <span
            data-glide-pill
            aria-hidden
            className="pointer-events-none absolute rounded-[9px] bg-select"
            style={gActiveStyle}
          />
          {(
            [
              ["code", "Liquid code"],
              ["how", "How to install"],
            ] as const
          ).map(([t, label]) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              data-glide={t}
              onClick={() => setTab(t)}
              className={`relative h-8 rounded-[9px] px-2.5 text-[13.5px] transition-colors duration-[var(--dur-fast)] ${
                tab === t ? "font-medium text-ink" : "text-ink-3 hover:text-ink"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-4">
        {tab === "code" ? (
          <pre
            key="code"
            className="bs-fade-up overflow-auto rounded-[14px] bg-[#0f0f10] p-4 font-mono text-[12px] leading-relaxed text-[#e6e6e6] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]"
          >
            <code>{shownCode}</code>
          </pre>
        ) : (
          <ol key="how" className="grid gap-3 px-1 py-1">
            {[
              <>
                In Shopify admin, open <b className="font-medium text-ink">Online Store → Themes</b>, then{" "}
                <b className="font-medium text-ink">⋯ → Edit code</b>.
              </>,
              <>
                Under <b className="font-medium text-ink">Sections</b>, click{" "}
                <b className="font-medium text-ink">Add a new section</b>, name it{" "}
                <code className="rounded-[5px] bg-surface-2 px-1 py-px text-[12.5px]">{slug}</code>, and
                delete the boilerplate.
              </>,
              <>Paste the Liquid code and save.</>,
              <>
                Open the <b className="font-medium text-ink">Theme editor</b>, choose{" "}
                <b className="font-medium text-ink">Add section</b> and pick{" "}
                <b className="font-medium text-ink">{name}</b>. It already matches what you designed, and you
                can keep tweaking inside Shopify.
              </>,
            ].map((step, i) => (
              <li
                key={i}
                className="bs-rise flex gap-3 rounded-[12px] bg-surface-2/60 p-3.5 text-[14px] leading-relaxed text-ink-2"
                style={{ "--i": i } as React.CSSProperties}
              >
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-ink text-[12px] font-semibold text-white">
                  {i + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-2 border-t border-hairline p-3">
        <button
          type="button"
          onClick={copy}
          data-autofocus
          className="bs-btn bs-btn-md bs-btn-primary flex-1"
        >
          {copied ? (
            <span key="copied" className="bs-swap inline-flex items-center gap-2">
              <IconCheck /> Copied to clipboard
            </span>
          ) : (
            <span key="copy" className="bs-swap">
              Copy code
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={download}
          className="bs-btn bs-btn-md bs-btn-secondary"
        >
          Download .liquid
        </button>
      </div>
    </div>
  );
}
