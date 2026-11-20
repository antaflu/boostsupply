"use client";

import { useRef, useState } from "react";
import type { Field, TweakConfig, ListField } from "@/lib/types";
import { FONT_OPTIONS } from "@/lib/fields";
import { Icon, ICON_PACK, sanitizeSvg, parseIcon } from "@/lib/icons";
import { useGlide } from "@/lib/useGlide";

interface Props {
  field: Field;
  value: unknown;
  onChange: (key: string, value: unknown) => void;
}

const INPUT =
  "bs-input w-full rounded-[10px] text-[13.5px] text-ink outline-none";

export function Control({ field, value, onChange }: Props) {
  const set = (v: unknown) => onChange(field.key, v);

  return (
    <div className="space-y-1.5">
      {field.type !== "toggle" && (
        <label className="flex items-center justify-between text-[12.5px] font-medium text-ink-2">
          <span>{field.label}</span>
          {field.type === "slider" && (
            <span className="rounded-[6px] bg-surface-2 px-1.5 py-px text-[11.5px] tabular-nums text-ink-3">
              {Number(value)}
              {field.unit ?? ""}
            </span>
          )}
        </label>
      )}

      {field.type === "text" && (
        <input
          value={String(value ?? "")}
          placeholder={field.placeholder}
          onChange={(e) => set(e.target.value)}
          className={`${INPUT} h-9 px-3`}
        />
      )}

      {field.type === "textarea" && (
        <textarea
          value={String(value ?? "")}
          placeholder={field.placeholder}
          onChange={(e) => set(e.target.value)}
          rows={2}
          className={`${INPUT} resize-none px-3 py-2 leading-snug`}
        />
      )}

      {field.type === "color" && (
        <ColorControl value={String(value ?? "#000000")} onChange={set} />
      )}

      {field.type === "slider" && (
        <div className="flex h-5 items-center">
          <input
            type="range"
            min={field.min}
            max={field.max}
            step={field.step ?? 1}
            value={Number(value)}
            onChange={(e) => set(Number(e.target.value))}
            className="bs-range w-full"
            style={
              {
                "--fill": `${((Number(value) - field.min) / (field.max - field.min || 1)) * 100}%`,
              } as React.CSSProperties
            }
          />
        </div>
      )}

      {field.type === "select" && (
        <SelectBox
          value={String(value ?? "")}
          onChange={set}
          options={field.options}
        />
      )}

      {field.type === "toggle" && (
        <button
          type="button"
          role="switch"
          aria-checked={!!value}
          onClick={() => set(!value)}
          className="group -mx-1.5 flex w-[calc(100%+12px)] items-center justify-between rounded-[9px] px-1.5 py-1.5 transition-colors duration-[var(--dur-fast)] hover:bg-hover"
        >
          <span className="text-[12.5px] font-medium text-ink-2">
            {field.label}
          </span>
          <span
            className={`relative inline-flex h-[22px] w-[38px] shrink-0 rounded-full transition-colors duration-200 ${
              value ? "bg-ink" : "bg-[#e3e3e3] group-hover:bg-[#d9d9d9]"
            }`}
          >
            <span
              className="absolute left-[2px] top-[2px] h-[18px] w-[18px] rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.2),0_0_0_0.5px_rgba(0,0,0,0.04)] transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-active:scale-x-110"
              style={{ transform: value ? "translateX(16px)" : "translateX(0)" }}
            />
          </span>
        </button>
      )}

      {field.type === "font" && (
        <FontControl value={String(value ?? "inherit")} onChange={set} />
      )}

      {field.type === "icon" && (
        <IconControl value={String(value ?? "")} onChange={set} />
      )}

      {field.type === "list" && (
        <ListControl
          field={field}
          value={Array.isArray(value) ? (value as Record<string, string>[]) : []}
          onChange={set}
        />
      )}

      {field.hint && field.type !== "toggle" && (
        <p className="text-[11.5px] leading-snug text-ink-4">{field.hint}</p>
      )}
    </div>
  );
}

/* ---- Select (native for a11y, styled shell) ---- */

function SelectBox({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { label: string; value: string }[];
}) {
  return (
    <div className="group relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${INPUT} h-9 cursor-pointer appearance-none pl-3 pr-8`}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <Caret />
    </div>
  );
}

/* ---- Color ---- */

function ColorControl({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const isTransparent = value === "transparent";
  const colorRef = useRef<HTMLInputElement>(null);
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => colorRef.current?.click()}
        aria-label="Pick color"
        className="relative h-9 w-9 shrink-0 overflow-hidden rounded-[10px] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.1)] transition-transform duration-200 ease-[var(--ease)] hover:scale-[1.06] active:scale-95"
        style={{
          background: isTransparent
            ? "repeating-conic-gradient(#e6e6e6 0% 25%, #fff 0% 50%) 50%/10px 10px"
            : value,
        }}
      >
        <input
          ref={colorRef}
          type="color"
          value={isTransparent ? "#ffffff" : value}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 cursor-pointer opacity-0"
          tabIndex={-1}
        />
      </button>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        spellCheck={false}
        className={`${INPUT} h-9 flex-1 px-3 font-mono text-[12.5px] lowercase`}
      />
      <button
        type="button"
        onClick={() => onChange(isTransparent ? "#ffffff" : "transparent")}
        title="Toggle transparent"
        aria-pressed={isTransparent}
        className={`bs-press h-9 rounded-[10px] px-2.5 text-[12px] font-medium ${
          isTransparent
            ? "bg-ink text-white"
            : "text-ink-3 shadow-[inset_0_0_0_1px_var(--border-strong)] hover:bg-hover hover:text-ink"
        }`}
      >
        none
      </button>
    </div>
  );
}

/* ---- Font (with custom upload) ---- */

function FontControl({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleFile = async (file: File) => {
    setLoading(true);
    try {
      const buf = await file.arrayBuffer();
      const face = new FontFace("BS Custom Font", buf);
      await face.load();
      document.fonts.add(face);
      setFileName(file.name);
      onChange("custom");
    } catch {
      /* ignore bad font */
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="group relative">
        <select
          value={value}
          onChange={(e) => {
            const v = e.target.value;
            if (v === "custom") fileRef.current?.click();
            else onChange(v);
          }}
          className={`${INPUT} h-9 cursor-pointer appearance-none pl-3 pr-8`}
        >
          {FONT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <Caret />
      </div>

      <input
        ref={fileRef}
        type="file"
        accept=".woff,.woff2,.ttf,.otf"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
        }}
      />

      {value === "custom" && (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="bs-fade-up flex h-9 w-full items-center gap-2 rounded-[10px] border border-dashed border-border-strong px-3 text-[12.5px] text-ink-2 transition-colors duration-[var(--dur-fast)] hover:border-ink-4 hover:bg-hover hover:text-ink"
        >
          <UploadIcon />
          {loading
            ? "Loading…"
            : fileName
              ? `${fileName} · replace`
              : "Upload .woff2 / .ttf / .otf"}
        </button>
      )}
    </div>
  );
}

/* ---- Icon picker (pack / emoji / upload) ---- */

function IconControl({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"pack" | "emoji" | "upload">("pack");
  const fileRef = useRef<HTMLInputElement>(null);
  const parsed = parseIcon(value);
  const { container: gContainer, activeStyle: gActiveStyle } = useGlide<HTMLDivElement>(tab);

  const handleSvg = async (file: File) => {
    const text = await file.text();
    onChange("svg:" + sanitizeSvg(text));
    setOpen(false);
  };

  return (
    <div
      className={`rounded-[12px] bg-surface transition-shadow duration-[var(--dur-fast)] ${
        open
          ? "shadow-[inset_0_0_0_1px_var(--ink-4)]"
          : "shadow-[inset_0_0_0_1px_var(--border-strong)] hover:shadow-[inset_0_0_0_1px_#cfcfcf]"
      }`}
    >
      {/* current value + toggle */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex h-10 w-full items-center gap-2.5 px-2 text-left"
      >
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-[8px] bg-surface-2 text-ink">
          {value ? <Icon token={value} size={18} /> : "?"}
        </span>
        <span className="flex-1 truncate text-[12.5px] text-ink-2">
          {parsed.kind === "pack"
            ? `Icon · ${parsed.value || "choose"}`
            : parsed.kind === "emoji"
              ? "Emoji"
              : "Custom SVG"}
        </span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden
          className={`mr-1 text-ink-3 transition-transform duration-300 ease-[var(--ease)] ${open ? "rotate-180" : ""}`}
        >
          <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* animated expand */}
      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-[var(--ease)] ${
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="min-h-0 overflow-hidden" inert={!open}>
          <div className="space-y-2.5 border-t border-hairline p-2.5">
            <div className="rounded-[10px] bg-[rgba(0,0,0,0.045)] p-[3px]">
              <div ref={gContainer} className="relative flex" role="tablist">
                <span
                  data-glide-pill
                  aria-hidden
                  className="pointer-events-none absolute rounded-[7px] bg-surface shadow-[0_0_0_0.5px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.08)]"
                  style={gActiveStyle}
                />
                {(
                  [
                    ["pack", "Icons"],
                    ["emoji", "Emoji"],
                    ["upload", "Upload"],
                  ] as const
                ).map(([t, label]) => (
                  <button
                    key={t}
                    type="button"
                    role="tab"
                    aria-selected={tab === t}
                    data-glide={t}
                    onClick={() => setTab(t)}
                    className={`relative h-7 flex-1 rounded-[7px] text-[12px] font-medium transition-colors duration-[var(--dur-fast)] ${
                      tab === t ? "text-ink" : "text-ink-3 hover:text-ink"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {tab === "pack" && (
              <div key="pack" className="bs-fade-up grid max-h-[168px] grid-cols-6 gap-1 overflow-y-auto">
                {ICON_PACK.map((ic) => {
                  const token = `pack:${ic.id}`;
                  const active = value === token;
                  return (
                    <button
                      key={ic.id}
                      type="button"
                      title={ic.label}
                      onClick={() => {
                        onChange(token);
                        setOpen(false);
                      }}
                      className={`bs-press grid h-9 place-items-center rounded-[8px] ${
                        active
                          ? "bg-ink text-white"
                          : "text-ink-2 hover:bg-hover hover:text-ink"
                      }`}
                    >
                      <Icon token={token} size={18} />
                    </button>
                  );
                })}
              </div>
            )}

            {tab === "emoji" && (
              <div key="emoji" className="bs-fade-up space-y-2">
                <input
                  value={parsed.kind === "emoji" ? parsed.value : ""}
                  onChange={(e) => onChange("emoji:" + e.target.value)}
                  placeholder="Paste or type an emoji…"
                  className={`${INPUT} h-9 px-3 text-base`}
                />
                <div className="flex flex-wrap gap-1">
                  {"🚚 ↩️ ✅ 🔒 💳 🎁 ⭐ ❤️ 🌱 ⚡ 🔥 🏆 🌍 📦 ✨ 💬"
                    .split(" ")
                    .map((e) => (
                      <button
                        key={e}
                        type="button"
                        onClick={() => {
                          onChange("emoji:" + e);
                          setOpen(false);
                        }}
                        className="grid h-8 w-8 place-items-center rounded-[8px] text-lg transition-[background-color,transform,translate,scale] duration-[var(--dur-fast)] hover:scale-110 hover:bg-hover active:scale-95"
                      >
                        {e}
                      </button>
                    ))}
                </div>
              </div>
            )}

            {tab === "upload" && (
              <div key="upload" className="bs-fade-up space-y-2">
                <input
                  ref={fileRef}
                  type="file"
                  accept=".svg,image/svg+xml"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleSvg(f);
                  }}
                />
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="flex h-16 w-full items-center justify-center gap-2 rounded-[10px] border border-dashed border-border-strong text-[12.5px] text-ink-2 transition-colors duration-[var(--dur-fast)] hover:border-ink-4 hover:bg-hover hover:text-ink"
                >
                  <UploadIcon />
                  {parsed.kind === "svg" ? "Replace SVG" : "Upload an .svg file"}
                </button>
                <p className="text-[11.5px] text-ink-4">
                  Tip: single-color SVGs using <code>currentColor</code> inherit
                  your icon color.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---- List repeater ---- */

function ListControl({
  field,
  value,
  onChange,
}: {
  field: ListField;
  value: Record<string, string>[];
  onChange: (v: Record<string, string>[]) => void;
}) {
  const update = (i: number, key: string, v: string) => {
    const next = value.map((row, idx) =>
      idx === i ? { ...row, [key]: v } : row,
    );
    onChange(next);
  };
  const remove = (i: number) => onChange(value.filter((_, idx) => idx !== i));
  const add = () => onChange([...value, { ...field.newItem }]);
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= value.length) return;
    const next = [...value];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };

  return (
    <div className="space-y-2">
      {value.map((row, i) => (
        <div
          key={i}
          className="group/row bs-fade-up space-y-2 rounded-[12px] bg-surface-2/70 p-2.5 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.03)] transition-[background-color,box-shadow] duration-[var(--dur-fast)] hover:bg-surface-2 hover:shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)] focus-within:bg-surface-2"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11.5px] font-medium tabular-nums text-ink-4">
              #{i + 1}
            </span>
            <div className="flex items-center gap-0.5 text-ink-3 opacity-60 transition-opacity duration-[var(--dur-fast)] group-hover/row:opacity-100 group-focus-within/row:opacity-100">
              <IconBtn onClick={() => move(i, -1)} disabled={i === 0} label="Move up">
                <path d="M8 12.5V3.5M4.5 7L8 3.5 11.5 7" />
              </IconBtn>
              <IconBtn
                onClick={() => move(i, 1)}
                disabled={i === value.length - 1}
                label="Move down"
              >
                <path d="M8 3.5v9M4.5 9L8 12.5 11.5 9" />
              </IconBtn>
              <IconBtn onClick={() => remove(i)} label="Remove" danger>
                <path d="M4.5 4.5l7 7M11.5 4.5l-7 7" />
              </IconBtn>
            </div>
          </div>
          {field.itemFields.map((f) =>
            f.type === "icon" ? (
              <div key={f.key} className="space-y-1.5">
                <span className="text-[11.5px] font-medium text-ink-3">
                  {f.label}
                </span>
                <IconControl
                  value={row[f.key] ?? ""}
                  onChange={(v) => update(i, f.key, v)}
                />
              </div>
            ) : f.type === "textarea" ? (
              <textarea
                key={f.key}
                value={row[f.key] ?? ""}
                placeholder={f.label}
                rows={2}
                onChange={(e) => update(i, f.key, e.target.value)}
                className={`${INPUT} resize-none px-2.5 py-1.5 text-[13px] leading-snug`}
              />
            ) : (
              <input
                key={f.key}
                value={row[f.key] ?? ""}
                placeholder={f.label}
                onChange={(e) => update(i, f.key, e.target.value)}
                className={`${INPUT} h-8 px-2.5 text-[13px]`}
              />
            ),
          )}
        </div>
      ))}
      {(!field.max || value.length < field.max) && (
        <button
          type="button"
          onClick={add}
          className="bs-press flex h-9 w-full items-center justify-center gap-1.5 rounded-[10px] border border-dashed border-border-strong text-[12.5px] font-medium text-ink-2 hover:border-ink-4 hover:bg-hover hover:text-ink"
        >
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden>
            <path d="M8 3.5v9M3.5 8h9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
          {field.addLabel ?? "Add item"}
        </button>
      )}
    </div>
  );
}

function IconBtn({
  onClick,
  disabled,
  label,
  danger = false,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  label: string;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`bs-press grid h-6 w-6 place-items-center rounded-[6px] disabled:opacity-30 disabled:hover:bg-transparent ${
        danger
          ? "hover:bg-[#fdecec] hover:text-[#d93036]"
          : "hover:bg-[rgba(0,0,0,0.06)] hover:text-ink"
      }`}
    >
      <svg
        width="13"
        height="13"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        {children}
      </svg>
    </button>
  );
}

function Caret() {
  return (
    <svg
      className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-3 transition-[color,transform,translate,scale] duration-[var(--dur-fast)] group-hover:translate-y-[calc(-50%+1px)] group-hover:text-ink-2"
      width="12"
      height="12"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden
    >
      <path
        d="M4 6l4 4 4-4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M8 10.5V3m0 0L5 6m3-3l3 3M3 11.5v1A1.5 1.5 0 004.5 14h7a1.5 1.5 0 001.5-1.5v-1"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* Shared export so the editor can group fields */
export type { Field, TweakConfig };
