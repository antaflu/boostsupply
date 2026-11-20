"use client";

import { useEffect, useId, useRef } from "react";
import { BrandMark } from "@/lib/brands";

/* ============================================================
   Liquid logo ticker
   Round "brand orbs" drift right → left and swell toward the
   centre. Both side walls act as a glass lens (one SVG filter on
   the whole strip): content entering the edge zone is stretched
   into streaks pinned to the wall, split into colour fringes and
   lit by a blue bloom, then vanishes; new orbs are drawn out of
   the opposite wall the same way. The rAF loop only moves orbs
   (transforms), so nothing toggles mid-animation.

   Each orb shows a brand wordmark on a "brand photo". Until real,
   licensed photos are added (public/brands/<id>.jpg, then set
   `photo`), a soft gradient in the brand's palette stands in.
   ============================================================ */

export interface Brand {
  id: string;
  name: string;
  /** CSS background for the orb (gradient or url(...)) */
  bg: string;
  ink: string;
  font: React.CSSProperties;
  photo?: string;
}

const SANS = "var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif";
const SERIF = "Georgia, 'Times New Roman', serif";

export const DTC_BRANDS: Brand[] = [
  { id: "skims", name: "SKIMS", ink: "#3b2f27", bg: "radial-gradient(circle at 30% 25%, #f6e7da, #d9bba3 60%, #b8927a)", font: { fontFamily: SANS, fontWeight: 500, letterSpacing: "0.28em", fontSize: 11 } },
  { id: "seed", name: "seed", ink: "#0f3d2e", bg: "radial-gradient(circle at 35% 30%, #e8f1e4, #a9c9a4 55%, #5e8f6c)", font: { fontFamily: SERIF, fontWeight: 400, fontSize: 17, letterSpacing: "-0.01em" } },
  { id: "im8", name: "IM8", ink: "#f3e6c8", bg: "radial-gradient(circle at 30% 25%, #3a4a6b, #1b2440 60%, #0c1226)", font: { fontFamily: SANS, fontWeight: 800, fontSize: 16, letterSpacing: "0.06em" } },
  { id: "ag1", name: "AG1", ink: "#ffffff", bg: "radial-gradient(circle at 30% 25%, #6fae7d, #2f6b45 60%, #173d27)", font: { fontFamily: SANS, fontWeight: 800, fontSize: 16, letterSpacing: "0.02em" } },
  { id: "glossier", name: "Glossier.", ink: "#2b1a1f", bg: "radial-gradient(circle at 30% 25%, #fff1f3, #f6cfd6 55%, #e7a9b6)", font: { fontFamily: SERIF, fontWeight: 700, fontSize: 13, letterSpacing: "-0.01em" } },
  { id: "allbirds", name: "allbirds", ink: "#2a2722", bg: "radial-gradient(circle at 30% 25%, #f4efe6, #ddd2bf 58%, #b9ab92)", font: { fontFamily: SANS, fontWeight: 600, fontSize: 12.5, letterSpacing: "-0.01em" } },
  { id: "gymshark", name: "GYMSHARK", ink: "#ffffff", bg: "radial-gradient(circle at 30% 25%, #4a4a4a, #1f1f1f 60%, #0a0a0a)", font: { fontFamily: SANS, fontWeight: 800, fontSize: 9.5, letterSpacing: "0.08em" } },
  { id: "rhode", name: "rhode", ink: "#3a332d", bg: "radial-gradient(circle at 30% 25%, #fbf6ef, #eadfd0 58%, #cdbba6)", font: { fontFamily: SANS, fontWeight: 300, fontSize: 16, letterSpacing: "0.02em" } },
  { id: "olipop", name: "OLIPOP", ink: "#ffffff", bg: "radial-gradient(circle at 30% 25%, #ffb38a, #f0607a 55%, #8f4fd6)", font: { fontFamily: SANS, fontWeight: 800, fontSize: 12, letterSpacing: "0.04em" } },
  { id: "oura", name: "ŌURA", ink: "#e9e9ec", bg: "radial-gradient(circle at 30% 25%, #8d8f98, #3e4048 58%, #17181c)", font: { fontFamily: SANS, fontWeight: 400, fontSize: 12.5, letterSpacing: "0.3em" } },
  { id: "ridge", name: "RIDGE", ink: "#ffffff", bg: "radial-gradient(circle at 30% 25%, #6d7177, #2c2f33 60%, #111214)", font: { fontFamily: SANS, fontWeight: 800, fontSize: 13, letterSpacing: "0.14em" } },
  { id: "graza", name: "graza", ink: "#1f3b17", bg: "radial-gradient(circle at 30% 25%, #f6f2b4, #c9dc77 55%, #6f9d3a)", font: { fontFamily: SANS, fontWeight: 800, fontSize: 15, letterSpacing: "-0.02em" } },
];

const ORB = 72; // base orb size (px); scaled 0.8–1.12 by position
const STEP = 104; // distance between orb centres
const SPEED = 34; // px per second

/* Edge lens: inside a zone of width Z at each side, the output samples
   the source closer to the centre. The sampling curve g(u) has slope
   M at the outer edge (≈12× stretch, so content smears into streaks
   pinned to the wall) easing back to slope 1 at the zone's inner edge
   (seamless join). Content past g(0)·Z never shows: orbs melt into the
   wall and vanish, and new ones are drawn out of the opposite wall. */
const M = 0.08;
const C = 1 - M - (1 - M) / 3; // g(0)
const g = (u: number) => C + M * u + ((1 - M) * u * u * u) / 3;

function buildLensMap(W: number, Z: number) {
  const S = Math.ceil(C * Z * 2 * 1.25); // displacement scale with headroom
  const cv = document.createElement("canvas");
  cv.width = W;
  cv.height = 1;
  const ctx = cv.getContext("2d");
  if (!ctx) return null;
  const img = ctx.createImageData(W, 1);
  for (let x = 0; x < W; x++) {
    const xc = x + 0.5;
    let off = 0;
    let edge = 0;
    if (xc < Z) {
      const u = xc / Z;
      off = (g(u) - u) * Z;
      edge = (1 - u) ** 2.4;
    } else if (xc > W - Z) {
      const u = (W - xc) / Z;
      off = -(g(u) - u) * Z;
      edge = (1 - u) ** 2.4;
    }
    const i = x * 4;
    img.data[i] = Math.round(255 * (0.5 + off / S)); // R: horizontal shift
    img.data[i + 1] = 128; // G: no vertical shift
    img.data[i + 2] = Math.round(255 * edge); // B: edge weight (for the bloom)
    img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return { url: cv.toDataURL("image/png"), S };
}

export function LogoTicker({
  brands = DTC_BRANDS,
  label = "Inspired by",
  title = "the best stores in DTC",
  className = "",
}: {
  brands?: Brand[];
  label?: string;
  title?: string;
  className?: string;
}) {
  const fid = `bs-lens-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const track = useRef<HTMLDivElement>(null);
  const mapEl = useRef<SVGFEImageElement>(null);
  const dispR = useRef<SVGFEDisplacementMapElement>(null);
  const dispG = useRef<SVGFEDisplacementMapElement>(null);
  const dispB = useRef<SVGFEDisplacementMapElement>(null);
  const orbs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const loop = brands.length * STEP;
    let W = el.clientWidth;
    let offset = 0;
    let last = performance.now();
    let raf = 0;

    const layout = () => {
      W = el.clientWidth;
      const H = el.clientHeight;
      const Z = Math.max(40, Math.min(70, W * 0.16));
      const map = buildLensMap(Math.max(1, Math.round(W)), Z);
      const fe = mapEl.current;
      if (!map || !fe) return;
      fe.setAttribute("href", map.url);
      fe.setAttributeNS("http://www.w3.org/1999/xlink", "xlink:href", map.url);
      fe.setAttribute("width", String(W));
      fe.setAttribute("height", String(H));
      /* slightly different shifts per channel = chromatic fringes */
      dispR.current?.setAttribute("scale", String(map.S));
      dispG.current?.setAttribute("scale", String(map.S * 1.06));
      dispB.current?.setAttribute("scale", String(map.S * 1.14));
    };

    const paint = () => {
      const mid = W / 2;
      orbs.current.forEach((orb, i) => {
        if (!orb) return;
        /* orb centre, wrapped so each orb re-enters from the right */
        let cx = (((i * STEP - offset) % loop) + loop) % loop;
        if (cx > W + STEP) cx -= loop;
        const t = Math.max(-1.3, Math.min(1.3, (cx - mid) / mid));
        const s = 0.8 + 0.32 * Math.max(0, 1 - t * t);
        orb.style.transform = `translate3d(${(cx - ORB / 2).toFixed(2)}px, -50%, 0) scale(${s.toFixed(4)})`;
      });
    };

    const tick = (now: number) => {
      const dt = Math.min(50, now - last);
      last = now;
      offset += (SPEED * dt) / 1000;
      paint();
      raf = requestAnimationFrame(tick);
    };

    layout();
    if (reduce) {
      offset = STEP * 0.35;
      paint();
    } else {
      raf = requestAnimationFrame(tick);
    }
    const ro = new ResizeObserver(() => {
      layout();
      paint();
    });
    ro.observe(el);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [brands]);

  return (
    <div
      className={`relative overflow-hidden rounded-[24px] bg-surface shadow-[0_0_0_1px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)] ${className}`}
    >
      <svg aria-hidden width="0" height="0" className="absolute">
        <filter id={fid} x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
          <feImage ref={mapEl} x="0" y="0" width="1" height="1" preserveAspectRatio="none" result="map" />
          <feDisplacementMap ref={dispR} in="SourceGraphic" in2="map" scale="0" xChannelSelector="R" yChannelSelector="G" result="dR" />
          <feDisplacementMap ref={dispG} in="SourceGraphic" in2="map" scale="0" xChannelSelector="R" yChannelSelector="G" result="dG" />
          <feDisplacementMap ref={dispB} in="SourceGraphic" in2="map" scale="0" xChannelSelector="R" yChannelSelector="G" result="dB" />
          <feColorMatrix in="dR" type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="r" />
          <feColorMatrix in="dG" type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0" result="g" />
          <feColorMatrix in="dB" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" result="b" />
          <feBlend in="r" in2="g" mode="screen" result="rg" />
          <feBlend in="rg" in2="b" mode="screen" result="lens" />
          {/* blue bloom wherever content sits inside an edge zone */}
          <feColorMatrix in="lens" type="matrix" values="0 0 0 0 0.16  0 0 0 0 0.48  0 0 0 0 1  -0.62 -0.62 -0.62 0 1.86" result="ink" />
          <feColorMatrix in="map" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 1 0 0" result="edge" />
          <feComposite in="ink" in2="edge" operator="in" result="edgeInk" />
          <feGaussianBlur in="edgeInk" stdDeviation="8 5" result="bloom" />
          <feComponentTransfer in="bloom" result="glow">
            <feFuncA type="linear" slope="1.1" />
          </feComponentTransfer>
          <feMerge>
            <feMergeNode in="lens" />
            <feMergeNode in="glow" />
          </feMerge>
        </filter>
      </svg>

      <div className="flex items-center gap-2 px-5 pt-4">
        <span className="rounded-full bg-surface-2 px-2 py-[3px] text-[11px] font-medium text-ink-2 shadow-[inset_0_0_0_1px_var(--border)]">
          {label}
        </span>
        <span className="text-[13.5px] text-ink-2">{title}</span>
      </div>

      {/* Full-bleed strip: the lens walls sit right on the card edges.
          It's opaque white on purpose (the channel split needs a solid
          background to turn dark-on-white edges into colour fringes) and
          a few px taller than its clip, so the filter's outermost rows,
          which sample just outside the strip, are never visible. */}
      <div className="relative h-[112px] overflow-hidden">
      <div
        ref={track}
        className="absolute inset-x-0 -bottom-[4px] -top-[4px] overflow-hidden bg-surface"
        style={{ filter: `url(#${fid})` }}
        aria-label={`Stores we draw inspiration from: ${brands.map((b) => b.name).join(", ")}`}
        role="img"
      >
        {brands.map((b, i) => (
          <div
            key={b.id}
            ref={(node) => {
              orbs.current[i] = node;
            }}
            aria-hidden
            className="absolute left-0 top-1/2 grid place-items-center overflow-hidden rounded-full"
            style={{
              width: ORB,
              height: ORB,
              background: b.photo ? `center / cover no-repeat url(${b.photo})` : b.bg,
              boxShadow: "inset 0 1px 1px rgba(255,255,255,0.45), inset 0 -8px 16px rgba(0,0,0,0.14)",
              transform: `translate3d(${i * STEP}px, -50%, 0)`,
            }}
          >
            <span
              className="pointer-events-none absolute inset-0 rounded-full"
              style={{ background: "radial-gradient(120% 70% at 30% 8%, rgba(255,255,255,0.45), transparent 52%)" }}
            />
            <BrandMark id={b.id} height={15} maxWidth={ORB * 0.64} color={b.ink} className="relative" />
          </div>
        ))}
      </div>
      </div>
    </div>
  );
}
