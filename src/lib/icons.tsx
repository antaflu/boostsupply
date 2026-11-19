import type { CSSProperties } from "react";

/* ============================================================
   Icon system

   An icon value is a token string:
     "pack:truck"   → a free line-icon from the pack below
     "emoji:🚚"     → any emoji
     "svg:<svg…>"   → a user-uploaded SVG (sanitized on upload)

   The same token resolves to a React node (<Icon>) for previews and
   to an HTML string (iconMarkup) for the exported Liquid — so what
   you pick is exactly what ships. Pack icons use `currentColor`, so
   their color follows the surrounding text/icon color.
   ============================================================ */

export interface PackIcon {
  id: string;
  label: string;
  /** inner SVG markup, drawn on a 0 0 24 24 viewBox, stroke = currentColor */
  body: string;
}

export const ICON_PACK: PackIcon[] = [
  { id: "truck", label: "Shipping", body: `<path d="M3 6h11v9H3z"/><path d="M14 9h3.5L21 12v3h-7z"/><circle cx="7" cy="17.5" r="1.7"/><circle cx="17.5" cy="17.5" r="1.7"/>` },
  { id: "package", label: "Package", body: `<path d="M21 8l-9-5-9 5v8l9 5 9-5z"/><path d="M3 8l9 5 9-5"/><path d="M12 13v8"/>` },
  { id: "returns", label: "Returns", body: `<path d="M4 9h11a5 5 0 0 1 0 10h-3"/><path d="M8 5L4 9l4 4"/>` },
  { id: "shield", label: "Guarantee", body: `<path d="M12 3l7 3v5c0 4.5-3 7.6-7 9-4-1.4-7-4.5-7-9V6z"/><path d="M9 12l2 2 4-4"/>` },
  { id: "lock", label: "Secure", body: `<rect x="5" y="10.5" width="14" height="9.5" rx="2"/><path d="M8 10.5V7a4 4 0 0 1 8 0v3.5"/>` },
  { id: "card", label: "Payment", body: `<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M3 10h18"/><path d="M7 14.5h4"/>` },
  { id: "gift", label: "Gift", body: `<rect x="4" y="9.5" width="16" height="10.5" rx="1.5"/><path d="M2.5 9.5h19"/><path d="M12 9.5V20"/><path d="M12 9.5C9.5 9.5 7.5 5 9.4 4s3.1 4.5 2.6 5.5z"/><path d="M12 9.5c2.5 0 4.5-4.5 2.6-5.5S11.5 8.5 12 9.5z"/>` },
  { id: "star", label: "Star", body: `<path d="M12 3.2l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.9 6.6 19.7l1.2-6L3.3 9.5l6.1-.7z"/>` },
  { id: "heart", label: "Loved", body: `<path d="M12 20s-7-4.3-9.2-8.3C1.3 8.6 2.8 5 6.2 5C8.3 5 9.5 6.4 12 9c2.5-2.6 3.7-4 5.8-4 3.4 0 4.9 3.6 3.4 6.7C19 15.7 12 20 12 20z"/>` },
  { id: "leaf", label: "Eco", body: `<path d="M5 19c0-8 6-13.5 14.5-13.5C19.5 14 13.5 19.5 5 19.5z"/><path d="M5.5 18.5C9.5 14 13 11 16.5 9"/>` },
  { id: "clock", label: "Fast", body: `<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>` },
  { id: "bolt", label: "Energy", body: `<path d="M13 3L5 13.5h6l-1 7.5 8-10.5h-6z"/>` },
  { id: "percent", label: "Discount", body: `<path d="M18.5 5.5l-13 13"/><circle cx="8" cy="8" r="2.2"/><circle cx="16" cy="16" r="2.2"/>` },
  { id: "tag", label: "Price", body: `<path d="M3 12.5V4h8.5l8.5 8.5-8 8z"/><circle cx="7.5" cy="7.5" r="1.4"/>` },
  { id: "check", label: "Check", body: `<circle cx="12" cy="12" r="8.5"/><path d="M8.3 12.2l2.4 2.4 5-5"/>` },
  { id: "cross", label: "Cross", body: `<circle cx="12" cy="12" r="8.5"/><path d="M9 9l6 6M15 9l-6 6"/>` },
  { id: "sparkles", label: "Sparkle", body: `<path d="M12 3l1.7 4.6L18 9.3l-4.3 1.7L12 15.6l-1.7-4.6L6 9.3l4.3-1.7z"/><path d="M18.5 14.5l.7 1.9 1.9.7-1.9.7-.7 1.9-.7-1.9-1.9-.7 1.9-.7z"/>` },
  { id: "award", label: "Award", body: `<circle cx="12" cy="9" r="5.5"/><path d="M9 13.4L7.5 21l4.5-2.7L16.5 21 15 13.4"/>` },
  { id: "globe", label: "Worldwide", body: `<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17"/><path d="M12 3.5c2.6 2.6 2.6 14.4 0 17M12 3.5c-2.6 2.6-2.6 14.4 0 17"/>` },
  { id: "phone", label: "Support", body: `<path d="M6 3.5h3l1.5 5-2 1.4a11 11 0 0 0 5 5l1.4-2 5 1.5V21a2 2 0 0 1-2.2 1.8A16 16 0 0 1 4 5.7 2 2 0 0 1 6 3.5z"/>` },
  { id: "mail", label: "Email", body: `<rect x="3" y="5.5" width="18" height="13" rx="2"/><path d="M4 7.5l8 6 8-6"/>` },
  { id: "chat", label: "Chat", body: `<path d="M4 5.5h16V16H8.5L4 20z"/><path d="M8 10h8M8 13h5"/>` },
  { id: "headphones", label: "Service", body: `<path d="M5 13.5v-1.5a7 7 0 0 1 14 0v1.5"/><rect x="3.5" y="13" width="3.8" height="6.5" rx="1.6"/><rect x="16.7" y="13" width="3.8" height="6.5" rx="1.6"/>` },
  { id: "fire", label: "Hot", body: `<path d="M13 3c.8 3-2.2 4.3-2.2 7.2 0 1.2.8 2 2 2s2-.9 2-2.1c2 1.6 3.2 3.6 3.2 5.4a6 6 0 0 1-12 0c0-3.2 2.4-5.4 3.5-7.6C9.7 9 11 9.5 11 8c0-1.5 1-3.4 2-5z"/>` },
  { id: "thumb", label: "Quality", body: `<path d="M7 10.5v9.5H4v-9.5z"/><path d="M7 10.5l3.6-6.7c1.5 0 2.6 1 2.6 2.6L12.8 9.5H18a2 2 0 0 1 2 2.3l-1 6A2 2 0 0 1 17 20H7"/>` },
  { id: "ruler", label: "Sizing", body: `<rect x="2.5" y="8.5" width="19" height="7" rx="1.2"/><path d="M7 8.5v3M11 8.5v4M15 8.5v3M19 8.5v4"/>` },
  { id: "sun", label: "Fresh", body: `<circle cx="12" cy="12" r="3.8"/><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.2 5.2l1.6 1.6M17.2 17.2l1.6 1.6M18.8 5.2l-1.6 1.6M6.8 17.2l-1.6 1.6"/>` },
  { id: "drop", label: "Hydration", body: `<path d="M12 3.5c3 4 6 7 6 10.5a6 6 0 0 1-12 0c0-3.5 3-6.5 6-10.5z"/>` },
];

const PACK_MAP = new Map(ICON_PACK.map((i) => [i.id, i]));

/* ---- token helpers ---- */

export function parseIcon(token: string): {
  kind: "pack" | "emoji" | "svg";
  value: string;
} {
  const t = token ?? "";
  if (t.startsWith("emoji:")) return { kind: "emoji", value: t.slice(6) };
  if (t.startsWith("svg:")) return { kind: "svg", value: t.slice(4) };
  if (t.startsWith("pack:")) return { kind: "pack", value: t.slice(5) };
  // bare emoji / legacy
  if (t && !PACK_MAP.has(t)) return { kind: "emoji", value: t };
  return { kind: "pack", value: t };
}

/** Strip scripts and event handlers from an uploaded SVG. */
export function sanitizeSvg(svg: string): string {
  return svg
    .replace(/<\?xml[\s\S]*?\?>/gi, "")
    .replace(/<!DOCTYPE[\s\S]*?>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/\son\w+="[^"]*"/gi, "")
    .replace(/\son\w+='[^']*'/gi, "")
    .trim();
}

/* ---- React renderer ---- */

export function Icon({
  token,
  size = 24,
  strokeWidth = 1.7,
  style,
}: {
  token: string;
  size?: number;
  strokeWidth?: number;
  style?: CSSProperties;
}) {
  const { kind, value } = parseIcon(token);

  if (kind === "emoji")
    return (
      <span style={{ fontSize: size, lineHeight: 1, ...style }}>{value}</span>
    );

  if (kind === "svg")
    return (
      <span
        className="[&_svg]:w-full [&_svg]:h-full [&_svg]:block"
        style={{ display: "inline-block", width: size, height: size, ...style }}
        dangerouslySetInnerHTML={{ __html: value }}
      />
    );

  const ic = PACK_MAP.get(value);
  if (!ic) return null;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
      dangerouslySetInnerHTML={{ __html: ic.body }}
    />
  );
}

/* ---- HTML string for Liquid export ---- */

export function iconMarkup(token: string, size = 24, strokeWidth = 1.7): string {
  const { kind, value } = parseIcon(token);
  if (kind === "emoji") return value;
  if (kind === "svg") return value;
  const ic = PACK_MAP.get(value);
  if (!ic) return "";
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round">${ic.body}</svg>`;
}
