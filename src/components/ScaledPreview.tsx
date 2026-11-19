"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";

/**
 * Renders children at a fixed "design width" and scales the whole thing
 * down to fit the available container width. Used for card thumbnails so
 * full-bleed sections read as mini-previews.
 */
export function ScaledPreview({
  children,
  designWidth = 880,
  className = "",
}: {
  children: ReactNode;
  designWidth?: number;
  className?: string;
}) {
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.3);
  const [height, setHeight] = useState(0);

  useLayoutEffect(() => {
    const el = outer.current;
    const content = inner.current;
    if (!el || !content) return;

    const update = () => {
      const w = el.clientWidth;
      const s = w / designWidth;
      setScale(s);
      setHeight(content.offsetHeight * s);
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    ro.observe(content);
    return () => ro.disconnect();
  }, [designWidth]);

  return (
    <div
      ref={outer}
      className={className}
      style={{
        height: height || undefined,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        ref={inner}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: designWidth,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          pointerEvents: "none",
        }}
      >
        {children}
      </div>
    </div>
  );
}
