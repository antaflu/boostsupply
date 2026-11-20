/* ============================================================
   Logos of the DTC brands our sections are modeled on.

   Files live in /public/brands (taken from each brand's own site
   or CDN, sanitized). They're drawn as a CSS mask, so any logo can
   be tinted to the colour around it: white on a dark orb, ink on a
   light chip. Seed draws its logo with a web font, so it falls
   back to a typeset wordmark.
   ============================================================ */

export interface BrandLogo {
  name: string;
  /** logo file in /public/brands; omitted = typeset wordmark */
  src?: string;
  /** width / height of the logo artwork */
  ratio: number;
}

export const BRAND_LOGOS: Record<string, BrandLogo> = {
  skims: { name: "SKIMS", src: "/brands/skims.svg", ratio: 108 / 24 },
  seed: { name: "Seed", ratio: 3.2 },
  im8: { name: "IM8", src: "/brands/im8.svg", ratio: 1052 / 272 },
  ag1: { name: "AG1", src: "/brands/ag1.svg", ratio: 123 / 55 },
  glossier: { name: "Glossier", src: "/brands/glossier.png", ratio: 600 / 128 },
  allbirds: { name: "Allbirds", src: "/brands/allbirds.svg", ratio: 74 / 24 },
  gymshark: { name: "Gymshark", src: "/brands/gymshark.png", ratio: 300 / 54 },
  rhode: { name: "Rhode", src: "/brands/rhode.svg", ratio: 100 / 26 },
  olipop: { name: "OLIPOP", src: "/brands/olipop.png", ratio: 560 / 218 },
  oura: { name: "Oura", src: "/brands/oura.svg", ratio: 993 / 311 },
  ridge: { name: "Ridge", src: "/brands/ridge.svg", ratio: 553 / 151 },
  graza: { name: "Graza", src: "/brands/graza.svg", ratio: 132 / 36 },
};

/**
 * A brand logo tinted to `color`. Give it a height; the width follows
 * the artwork's ratio, capped by `maxWidth`.
 */
export function BrandMark({
  id,
  height = 14,
  maxWidth,
  color = "currentColor",
  className = "",
}: {
  id: string;
  height?: number;
  maxWidth?: number;
  color?: string;
  className?: string;
}) {
  const b = BRAND_LOGOS[id];
  if (!b) return null;
  let h = height;
  if (maxWidth && h * b.ratio > maxWidth) h = maxWidth / b.ratio;
  const w = h * b.ratio;

  if (!b.src) {
    /* typeset fallback: name + a round full stop, like the real mark */
    return (
      <span
        role="img"
        aria-label={b.name}
        className={`inline-flex items-center whitespace-nowrap font-medium leading-none ${className}`}
        style={{ color, fontSize: h * 1.12, letterSpacing: "-0.02em" }}
      >
        {b.name}
        <span
          aria-hidden
          className="ml-[0.08em] inline-block rounded-full"
          style={{ width: h * 0.42, height: h * 0.42, background: color }}
        />
      </span>
    );
  }

  return (
    <span
      role="img"
      aria-label={b.name}
      className={`inline-block shrink-0 ${className}`}
      style={{
        width: w,
        height: h,
        backgroundColor: color,
        WebkitMaskImage: `url(${b.src})`,
        maskImage: `url(${b.src})`,
        WebkitMaskSize: "contain",
        maskSize: "contain",
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
        maskPosition: "center",
      }}
    />
  );
}

/** "Inspired by [logo]" chip for section cards and the editor. */
export function InspiredBy({
  id,
  className = "",
}: {
  id: string;
  className?: string;
}) {
  if (!BRAND_LOGOS[id]) return null;
  return (
    <span
      className={`inline-flex h-7 items-center gap-2 rounded-full bg-surface/95 pl-2.5 pr-3 text-[11.5px] font-medium text-ink-3 shadow-[0_0_0_1px_var(--border),0_1px_2px_rgba(0,0,0,0.04)] ${className}`}
    >
      Inspired by
      <BrandMark id={id} height={12} maxWidth={64} color="var(--ink)" />
    </span>
  );
}
