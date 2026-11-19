"use client";

import { useRef, useState } from "react";
import type { Field, TweakConfig, ListField } from "@/lib/types";
import { FONT_OPTIONS } from "@/lib/fields";
import { Icon, ICON_PACK, sanitizeSvg, parseIcon } from "@/lib/icons";

interface Props {
  field: Field;
  value: unknown;
  onChange: (key: string, value: unknown) => void;
}

export function Control({ field, value, onChange }: Props) {
  const set = (v: unknown) => onChange(field.key, v);

  return (
    <div className="space-y-1.5">
      {field.type !== "toggle" && (
        <label className="flex items-center justify-between text-[12px] font-medium text-ink-2">
          <span>{field.label}</span>
          {field.type === "slider" && (
            <span className="tabular-nums text-ink-3">
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
          className="w-full h-9 rounded-md border border-border bg-surface px-3 text-sm outline-none focus:border-ink transition-colors"
        />
      )}

      {field.type === "textarea" && (
        <textarea
          value={String(value ?? "")}
          placeholder={field.placeholder}
          onChange={(e) => set(e.target.value)}
          rows={2}
          className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-ink transition-colors resize-none"
        />
      )}

      {field.type === "color" && (
        <ColorControl value={String(value ?? "#000000")} onChange={set} />
      )}

      {field.type === "slider" && (
        <input
          type="range"
          min={field.min}
          max={field.max}
          step={field.step ?? 1}
          value={Number(value)}
          onChange={(e) => set(Number(e.target.value))}
          className="bs-range w-full"
        />
      )}

      {field.type === "select" && (
        <div className="relative">
          <select
            value={String(value ?? "")}
            onChange={(e) => set(e.target.value)}
            className="w-full h-9 rounded-md border border-border bg-surface pl-3 pr-8 text-sm outline-none focus:border-ink appearance-none cursor-pointer"
          >
            {field.options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <Caret />
        </div>
      )}

      {field.type === "toggle" && (
        <button
          onClick={() => set(!value)}
          className="w-full flex items-center justify-between py-1"
        >
          <span className="text-[12px] font-medium text-ink-2">
            {field.label}
          </span>
          <span
            className={`relative inline-flex h-5 w-9 rounded-full transition-colors ${
              value ? "bg-ink" : "bg-surface-3"
            }`}
          >
            <span
              className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-all ${
                value ? "left-[18px]" : "left-0.5"
              }`}
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
        <p className="text-[11px] text-ink-4">{field.hint}</p>
      )}
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
        className="relative h-9 w-9 shrink-0 rounded-md border border-border overflow-hidden"
        style={{
          background: isTransparent
            ? "repeating-conic-gradient(#e6e6e4 0% 25%, #fff 0% 50%) 50%/10px 10px"
            : value,
        }}
      >
        <input
          ref={colorRef}
          type="color"
          value={isTransparent ? "#ffffff" : value}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 opacity-0 cursor-pointer"
        />
      </button>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 h-9 rounded-md border border-border bg-surface px-3 text-sm font-mono outline-none focus:border-ink transition-colors lowercase"
      />
      <button
        type="button"
        onClick={() => onChange(isTransparent ? "#ffffff" : "transparent")}
        title="Toggle transparent"
        className={`h-9 px-2 rounded-md border text-[11px] font-medium transition-colors ${
          isTransparent
            ? "border-ink bg-ink text-surface"
            : "border-border text-ink-3 hover:border-border-strong"
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
      <div className="relative">
        <select
          value={value}
          onChange={(e) => {
            const v = e.target.value;
            if (v === "custom") fileRef.current?.click();
            else onChange(v);
          }}
          className="w-full h-9 rounded-md border border-border bg-surface pl-3 pr-8 text-sm outline-none focus:border-ink appearance-none cursor-pointer"
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
          onClick={() => fileRef.current?.click()}
          className="w-full flex items-center gap-2 h-9 rounded-md border border-dashed border-border-strong px-3 text-[12px] text-ink-2 hover:border-ink hover:bg-surface-2 transition-colors"
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

  const handleSvg = async (file: File) => {
    const text = await file.text();
    onChange("svg:" + sanitizeSvg(text));
    setOpen(false);
  };

  return (
    <div className="rounded-lg border border-border bg-surface">
      {/* current value + toggle */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2.5 h-10 px-2.5 text-left"
      >
        <span className="grid place-items-center w-7 h-7 rounded-md bg-surface-2 text-ink shrink-0">
          {value ? <Icon token={value} size={18} /> : "?"}
        </span>
        <span className="text-[12px] text-ink-2 flex-1 truncate">
          {parsed.kind === "pack"
            ? `Icon · ${parsed.value || "choose"}`
            : parsed.kind === "emoji"
              ? "Emoji"
              : "Custom SVG"}
        </span>
        <span className="text-ink-4 text-xs">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="border-t border-border p-2.5 space-y-2.5">
          <div className="flex items-center gap-0.5 p-0.5 rounded-md bg-surface-2">
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
                onClick={() => setTab(t)}
                className={`flex-1 h-7 rounded text-[11px] font-medium transition-colors ${
                  tab === t ? "bg-surface text-ink shadow-sm" : "text-ink-3"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {tab === "pack" && (
            <div className="grid grid-cols-6 gap-1 max-h-[168px] overflow-y-auto">
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
                    className={`grid place-items-center h-9 rounded-md border transition-colors ${
                      active
                        ? "border-ink bg-ink text-surface"
                        : "border-transparent text-ink-2 hover:bg-surface-2"
                    }`}
                  >
                    <Icon token={token} size={18} />
                  </button>
                );
              })}
            </div>
          )}

          {tab === "emoji" && (
            <div className="space-y-2">
              <input
                autoFocus
                value={parsed.kind === "emoji" ? parsed.value : ""}
                onChange={(e) => onChange("emoji:" + e.target.value)}
                placeholder="Paste or type an emoji…"
                className="w-full h-9 rounded-md border border-border bg-surface px-3 text-base outline-none focus:border-ink"
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
                      className="w-8 h-8 grid place-items-center rounded-md hover:bg-surface-2 text-lg"
                    >
                      {e}
                    </button>
                  ))}
              </div>
            </div>
          )}

          {tab === "upload" && (
            <div className="space-y-2">
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
                className="w-full flex items-center justify-center gap-2 h-16 rounded-md border border-dashed border-border-strong text-[12px] text-ink-2 hover:border-ink hover:bg-surface-2 transition-colors"
              >
                <UploadIcon />
                {parsed.kind === "svg" ? "Replace SVG" : "Upload an .svg file"}
              </button>
              <p className="text-[11px] text-ink-4">
                Tip: single-color SVGs using <code>currentColor</code> inherit
                your icon color.
              </p>
            </div>
          )}
        </div>
      )}
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
          className="rounded-lg border border-border bg-surface-2/60 p-2.5 space-y-2"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-ink-4">
              #{i + 1}
            </span>
            <div className="flex items-center gap-0.5 text-ink-3">
              <IconBtn onClick={() => move(i, -1)} disabled={i === 0} label="Up">
                ↑
              </IconBtn>
              <IconBtn
                onClick={() => move(i, 1)}
                disabled={i === value.length - 1}
                label="Down"
              >
                ↓
              </IconBtn>
              <IconBtn onClick={() => remove(i)} label="Remove">
                ✕
              </IconBtn>
            </div>
          </div>
          {field.itemFields.map((f) =>
            f.type === "icon" ? (
              <div key={f.key} className="space-y-1.5">
                <span className="text-[11px] font-medium text-ink-3">
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
                className="w-full rounded-md border border-border bg-surface px-2.5 py-1.5 text-[13px] outline-none focus:border-ink resize-none"
              />
            ) : (
              <input
                key={f.key}
                value={row[f.key] ?? ""}
                placeholder={f.label}
                onChange={(e) => update(i, f.key, e.target.value)}
                className="w-full h-8 rounded-md border border-border bg-surface px-2.5 text-[13px] outline-none focus:border-ink"
              />
            ),
          )}
        </div>
      ))}
      {(!field.max || value.length < field.max) && (
        <button
          onClick={add}
          className="w-full h-9 rounded-md border border-dashed border-border-strong text-[12px] font-medium text-ink-2 hover:border-ink hover:bg-surface-2 transition-colors"
        >
          + {field.addLabel ?? "Add item"}
        </button>
      )}
    </div>
  );
}

function IconBtn({
  onClick,
  disabled,
  label,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="h-6 w-6 grid place-items-center rounded text-xs hover:bg-surface-3 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
    >
      {children}
    </button>
  );
}

function Caret() {
  return (
    <svg
      className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-3"
      width="12"
      height="12"
      viewBox="0 0 16 16"
      fill="none"
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
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
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
