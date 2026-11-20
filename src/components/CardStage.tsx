"use client";

import { useLayoutEffect, useRef, useState, type ComponentType } from "react";
import type { TweakConfig } from "@/lib/types";

export type CardMode = "frame" | "zoom" | "panel";

interface StageProps {
  Preview: ComponentType<{ config: TweakConfig }>;
  config: TweakConfig;
}

function useSize<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, size] as const;
}

/* ---- frame: whole section in a floating browser card ---- */

function FrameStage({ Preview, config }: StageProps) {
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const designWidth = 880;
  const [scale, setScale] = useState(0.4);
  const [h, setH] = useState(0);

  useLayoutEffect(() => {
    const el = outer.current;
    const content = inner.current;
    if (!el || !content) return;
    const update = () => {
      const s = el.clientWidth / designWidth;
      setScale(s);
      setH(content.offsetHeight * s);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    ro.observe(content);
    return () => ro.disconnect();
  }, []);

  return (
    <div className="mx-auto w-full max-w-[920px] px-6 py-7">
      <div
        className="rounded-2xl overflow-hidden bg-surface"
        style={{ boxShadow: "var(--shadow-md)" }}
      >
        <div ref={outer} style={{ height: h || undefined, position: "relative", overflow: "hidden" }}>
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
            <Preview config={config} />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---- zoom: enlarged section bleeding off the left/right edges ---- */

function ZoomStage({ Preview, config }: StageProps) {
  const [ref, { w }] = useSize<HTMLDivElement>();
  const designWidth = 900;
  const fit = w ? w / designWidth : 0.5;
  /* enlarge to bleed off the edges, but cap it on wide one-per-row cards */
  const scale = Math.min(fit * 1.72, 1.55);

  return (
    <div ref={ref} className="absolute inset-0 flex items-center justify-center overflow-hidden">
      <div
        style={{
          width: designWidth,
          transform: `scale(${scale})`,
          transformOrigin: "center center",
          flexShrink: 0,
          pointerEvents: "none",
        }}
      >
        <Preview config={config} />
      </div>
    </div>
  );
}

/* ---- panel: large white card bleeding off the bottom edge ---- */

function PanelStage({ Preview, config }: StageProps) {
  const [ref, { w }] = useSize<HTMLDivElement>();
  /* wide cards render the section at a roomier design width and cap
     the floating card, so it never balloons across a full-width row */
  const wide = w > 760;
  const designWidth = wide ? 560 : 380;
  const cardW = Math.max(0, Math.min(w - 44, wide ? 760 : Infinity));
  const scale = cardW ? cardW / designWidth : 0;

  return (
    <div ref={ref} className="absolute inset-0 overflow-hidden">
      <div className="absolute left-1/2 -translate-x-1/2 top-7">
        <div
          className="rounded-[20px] overflow-hidden bg-surface border border-border"
          style={{ width: cardW || undefined, boxShadow: "var(--shadow-lg)" }}
        >
          <div
            style={{
              width: designWidth,
              transform: `scale(${scale})`,
              transformOrigin: "top left",
              pointerEvents: "none",
            }}
          >
            <Preview config={config} />
          </div>
        </div>
      </div>
    </div>
  );
}

export function CardStage({
  mode,
  Preview,
  config,
}: StageProps & { mode: CardMode }) {
  if (mode === "zoom") return <ZoomStage Preview={Preview} config={config} />;
  if (mode === "panel") return <PanelStage Preview={Preview} config={config} />;
  return <FrameStage Preview={Preview} config={config} />;
}
