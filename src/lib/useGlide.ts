"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";

/* ============================================================
   useGlide: highlight pills that glide between items
   (the Chopper / Orcus segmented-control technique).

   - Pass `container` as the container's ref (position: relative).
   - Mark every item with `data-glide="<key>"`.
   - Render pills as absolutely positioned children with
     `style={g.activeStyle}` / `style={g.hoverStyle}`.

   The pill is placed with left/right/top/bottom insets measured
   from the item's layout box, and the edge facing the target
   moves faster than the trailing edge: the pill stretches toward
   its destination and then settles, which reads as "physical".
   First placement is instant (no fly-in from the corner).

   `hover: true` adds a second, softer pill that follows the
   pointer: it fades in place when the pointer enters and glides
   while the pointer moves between items.
   ============================================================ */

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}
type Dir = "left" | "right" | "up" | "down" | null;

function measure(container: HTMLElement | null, key: string | null) {
  if (!container || key == null) return null;
  const el = container.querySelector<HTMLElement>(
    `[data-glide="${CSS.escape(key)}"]`,
  );
  if (!el || !el.offsetWidth) return null;
  return {
    x: el.offsetLeft,
    y: el.offsetTop,
    w: el.offsetWidth,
    h: el.offsetHeight,
  } satisfies Box;
}

function dirBetween(a: Box | null, b: Box | null): Dir {
  if (!a || !b) return null;
  if (Math.abs(b.y - a.y) > Math.abs(b.x - a.x)) return b.y > a.y ? "down" : "up";
  if (b.x !== a.x) return b.x > a.x ? "right" : "left";
  return null;
}

const LEAD = 260;
const TRAIL = 400;
const EVEN = 340;

function durations(dir: Dir) {
  // order: left, right, top, bottom
  switch (dir) {
    case "right":
      return [TRAIL, LEAD, EVEN, EVEN];
    case "left":
      return [LEAD, TRAIL, EVEN, EVEN];
    case "down":
      return [EVEN, EVEN, TRAIL, LEAD];
    case "up":
      return [EVEN, EVEN, LEAD, TRAIL];
    default:
      return [EVEN, EVEN, EVEN, EVEN];
  }
}

function insetStyle(
  box: Box | null,
  size: { w: number; h: number },
  dir: Dir,
  animate: boolean,
  opacity: number,
): React.CSSProperties {
  if (!box) return { opacity: 0 };
  const d = animate ? durations(dir) : [0, 0, 0, 0];
  return {
    left: box.x,
    right: size.w - box.x - box.w,
    top: box.y,
    bottom: size.h - box.y - box.h,
    opacity,
    transitionProperty: "left, right, top, bottom, opacity",
    transitionDuration: `${d[0]}ms, ${d[1]}ms, ${d[2]}ms, ${d[3]}ms, 160ms`,
    transitionTimingFunction: "var(--ease)",
  };
}

export function useGlide<T extends HTMLElement = HTMLDivElement>(
  active: string | null,
  opts: { hover?: boolean } = {},
) {
  /* callback ref: the container lives in state, so effects re-run
     when it mounts/remounts and nothing ref-like leaks into render */
  const [el, container] = useState<T | null>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [box, setBox] = useState<Box | null>(null);
  const [dir, setDir] = useState<Dir>(null);
  const [ready, setReady] = useState(false);

  const [hoverKey, setHoverKey] = useState<string | null>(null);
  const [hoverBox, setHoverBox] = useState<Box | null>(null);
  const [hoverDir, setHoverDir] = useState<Dir>(null);
  const [hoverSnap, setHoverSnap] = useState(true);

  const boxRef = useRef<Box | null>(null);
  const hoverBoxRef = useRef<Box | null>(null);

  const place = useCallback(
    (animate: boolean) => {
      if (!el) return;
      setSize({ w: el.clientWidth, h: el.clientHeight });
      const next = measure(el, active);
      setDir(animate ? dirBetween(boxRef.current, next) : null);
      boxRef.current = next;
      setBox(next);
    },
    [active, el],
  );

  /* active item changed → measure the DOM, then glide (layout effect
     so the pill is placed before paint) */
  useLayoutEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- DOM measurement has to happen after layout
    place(true);
  }, [place]);

  /* container resized → re-place without animating. Created once;
     reads the latest key from a ref so selecting an item never
     resets the glide direction. */
  const activeRef = useRef(active);
  useLayoutEffect(() => {
    activeRef.current = active;
  }, [active]);
  useLayoutEffect(() => {
    if (!el) return;
    let last = { w: el.clientWidth, h: el.clientHeight };
    const ro = new ResizeObserver(() => {
      const now = { w: el.clientWidth, h: el.clientHeight };
      if (now.w === last.w && now.h === last.h) return;
      last = now;
      setSize(now);
      const next = measure(el, activeRef.current);
      boxRef.current = next;
      setDir(null);
      setBox(next);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [el]);

  useLayoutEffect(() => {
    const id = requestAnimationFrame(() =>
      requestAnimationFrame(() => setReady(true)),
    );
    return () => cancelAnimationFrame(id);
  }, []);

  /* hover pill */
  useLayoutEffect(() => {
    if (!opts.hover || hoverKey == null) return;
    const next = measure(el, hoverKey);
    setHoverDir(dirBetween(hoverBoxRef.current, next));
    hoverBoxRef.current = next;
    setHoverBox(next);
  }, [hoverKey, opts.hover, el]);

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!opts.hover || e.pointerType === "touch") return;
      const item = (e.target as HTMLElement).closest<HTMLElement>(
        "[data-glide]",
      );
      const key =
        item && el?.contains(item) && !item.hasAttribute("disabled")
          ? (item.dataset.glide ?? null)
          : null;
      if (key === hoverKey) return;
      /* coming from "no visible hover pill" → appear in place */
      setHoverSnap(hoverKey === null || hoverKey === active);
      setHoverKey(key);
    },
    [hoverKey, active, opts.hover, el],
  );
  const onPointerLeave = useCallback(() => setHoverKey(null), []);

  const hoverVisible = hoverKey !== null && hoverKey !== active;

  return {
    /** pass to the container's `ref` prop */
    container,
    hoverKey,
    activeStyle: insetStyle(box, size, dir, ready, box ? 1 : 0),
    hoverStyle: insetStyle(
      hoverBox,
      size,
      hoverDir,
      ready && !hoverSnap,
      hoverVisible ? 1 : 0,
    ),
    hoverProps: { onPointerMove, onPointerLeave },
  };
}
