/* Placeholder packshots for section previews (cart, buy box).
   Simple vector products on a soft tile, so previews read as a real
   store without shipping stock photos. The exported Liquid uses the
   merchant's actual product images instead. */

export type ArtKind = "bottle" | "jar" | "tube" | "comb" | "bag" | "spray";

const SHAPES: Record<ArtKind, (tone: string) => React.ReactNode> = {
  bottle: (tone) => (
    <>
      <rect x="20" y="5" width="8" height="5" rx="1.4" fill="#2b2b2b" />
      <rect x="21.5" y="9.5" width="5" height="5" fill="#d9d9d9" />
      <rect x="16" y="14" width="16" height="29" rx="4" fill="#fff" stroke="rgba(0,0,0,.08)" />
      <rect x="16" y="23" width="16" height="11" fill={tone} />
      <rect x="19" y="26.5" width="10" height="1.6" rx=".8" fill="rgba(255,255,255,.75)" />
      <rect x="19" y="29.5" width="6" height="1.2" rx=".6" fill="rgba(255,255,255,.55)" />
    </>
  ),
  spray: (tone) => (
    <>
      <path d="M21 5h7l3 3h-4v3h-6z" fill="#2b2b2b" />
      <rect x="20" y="10.5" width="9" height="4" rx="1" fill="#d9d9d9" />
      <rect x="17" y="14" width="15" height="29" rx="5" fill="#fff" stroke="rgba(0,0,0,.08)" />
      <rect x="17" y="22" width="15" height="13" fill={tone} />
      <rect x="20" y="26" width="9" height="1.6" rx=".8" fill="rgba(255,255,255,.75)" />
    </>
  ),
  jar: (tone) => (
    <>
      <rect x="9" y="14" width="30" height="9" rx="3" fill={tone} />
      <rect x="10.5" y="22" width="27" height="17" rx="5" fill="#fff" stroke="rgba(0,0,0,.08)" />
      <rect x="15" y="28" width="18" height="2" rx="1" fill="rgba(0,0,0,.18)" />
      <rect x="18" y="32" width="12" height="1.4" rx=".7" fill="rgba(0,0,0,.1)" />
    </>
  ),
  tube: (tone) => (
    <>
      <path d="M15 8h18l-2.5 27h-13z" fill="#fff" stroke="rgba(0,0,0,.08)" />
      <path d="M15.6 15h16.8l-1 11H16.6z" fill={tone} />
      <rect x="19" y="35" width="10" height="7" rx="1.5" fill="#2b2b2b" />
    </>
  ),
  comb: () => (
    <>
      <rect x="9" y="15" width="30" height="6" rx="3" fill="#d4d4d0" />
      {Array.from({ length: 9 }, (_, i) => (
        <rect key={i} x={11 + i * 3.1} y="20" width="1.7" height="14" rx=".85" fill="#d4d4d0" />
      ))}
    </>
  ),
  bag: (tone) => (
    <>
      <rect x="8" y="17" width="32" height="19" rx="7" fill={tone} />
      <path d="M12 21.5h24" stroke="rgba(255,255,255,.35)" strokeWidth="1.2" strokeDasharray="1.6 1.6" />
      <rect x="31" y="19.5" width="4" height="3.5" rx="1" fill="rgba(255,255,255,.6)" />
    </>
  ),
};

export function ProductArt({
  kind,
  tone = "#1e2a44",
  size = 56,
  tile = "#f3f3f1",
  radius = 12,
}: {
  kind: ArtKind;
  tone?: string;
  size?: number;
  tile?: string;
  radius?: number;
}) {
  return (
    <div
      className="grid shrink-0 place-items-center overflow-hidden"
      style={{ width: size, height: size, borderRadius: radius, background: tile }}
    >
      <svg width={size * 0.82} height={size * 0.82} viewBox="0 0 48 48" aria-hidden>
        <ellipse cx="24" cy="44" rx="12" ry="1.8" fill="rgba(0,0,0,.08)" />
        {SHAPES[kind](tone)}
      </svg>
    </div>
  );
}

/** Small money helpers shared by the commerce previews. */
export const toNum = (s: string | undefined, fb = 0) => {
  const n = parseFloat(String(s ?? "").replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : fb;
};

export const money = (n: number, cur = "$") =>
  `${cur}${n.toFixed(2).replace(/\.00$/, "")}`;
