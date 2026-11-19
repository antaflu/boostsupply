"use client";

import { useEffect, useState } from "react";
import type { Tweak, TweakConfig } from "../types";
import { str, num, bool, fontStack } from "../cfg";
import { fontField } from "../fields";
import { buildSchema, section, fontFaceFor } from "../liquid";

const defaults: TweakConfig = {
  heading: "Flash sale ends in",
  buttonText: "Shop the sale",
  showButton: true,
  minutes: 30,
  bg: "#131313",
  color: "#ffffff",
  digitBg: "#262625",
  btnBg: "#ffffff",
  btnColor: "#131313",
  font: "inherit",
  fontSize: 14,
  paddingY: 14,
  radius: 8,
};

function pad(n: number) {
  return String(Math.max(0, n)).padStart(2, "0");
}

function Preview({ config }: { config: TweakConfig }) {
  const total = num(config, "minutes", 30) * 60;
  const [left, setLeft] = useState(total);

  useEffect(() => {
    setLeft(total);
    const t = setInterval(() => setLeft((p) => (p > 0 ? p - 1 : total)), 1000);
    return () => clearInterval(t);
  }, [total]);

  const h = Math.floor(left / 3600);
  const m = Math.floor((left % 3600) / 60);
  const s = left % 60;

  const digit = (v: string, label: string) => (
    <div className="flex flex-col items-center">
      <span
        className="tabular-nums"
        style={{
          background: str(config, "digitBg", "#262625"),
          color: str(config, "color", "#fff"),
          borderRadius: num(config, "radius", 8),
          padding: "4px 8px",
          fontWeight: 700,
          fontSize: num(config, "fontSize", 14) + 2,
          minWidth: 34,
          textAlign: "center",
        }}
      >
        {v}
      </span>
      <span style={{ color: str(config, "color"), opacity: 0.5, fontSize: 9, marginTop: 3, letterSpacing: 1 }}>
        {label}
      </span>
    </div>
  );

  return (
    <div
      className="w-full px-6 flex items-center justify-center gap-4 flex-wrap"
      style={{
        background: str(config, "bg", "#131313"),
        paddingTop: num(config, "paddingY", 14),
        paddingBottom: num(config, "paddingY", 14),
        fontFamily: fontStack(str(config, "font", "inherit")),
      }}
    >
      <span
        style={{ color: str(config, "color", "#fff"), fontSize: num(config, "fontSize", 14), fontWeight: 600 }}
      >
        {str(config, "heading")}
      </span>
      <div className="flex items-end gap-1.5">
        {digit(pad(h), "HRS")}
        <span style={{ color: str(config, "color"), opacity: 0.4, paddingBottom: 14 }}>:</span>
        {digit(pad(m), "MIN")}
        <span style={{ color: str(config, "color"), opacity: 0.4, paddingBottom: 14 }}>:</span>
        {digit(pad(s), "SEC")}
      </div>
      {bool(config, "showButton", true) && (
        <button
          className="px-4 h-9 font-semibold"
          style={{
            background: str(config, "btnBg", "#fff"),
            color: str(config, "btnColor", "#131313"),
            borderRadius: 100,
            fontSize: num(config, "fontSize", 14) - 1,
          }}
        >
          {str(config, "buttonText")}
        </button>
      )}
    </div>
  );
}

function generateLiquid(config: TweakConfig): string {
  const { face, family } = fontFaceFor(str(config, "font", "inherit"));
  const style = `<style>
${face ? face + "\n" : ""}  .bs-cd-{{ section.id }} { background: {{ section.settings.bg }}; padding: {{ section.settings.padding_y }}px 24px;
    display: flex; align-items: center; justify-content: center; gap: 16px; flex-wrap: wrap; font-family: ${family}; }
  .bs-cd-{{ section.id }} .bs-h { color: {{ section.settings.color }}; font-size: {{ section.settings.font_size }}px; font-weight: 600; }
  .bs-cd-{{ section.id }} .bs-clock { display: flex; align-items: flex-end; gap: 6px; }
  .bs-cd-{{ section.id }} .bs-u { display: flex; flex-direction: column; align-items: center; }
  .bs-cd-{{ section.id }} .bs-d { background: {{ section.settings.digit_bg }}; color: {{ section.settings.color }}; border-radius: {{ section.settings.radius }}px;
    padding: 4px 8px; font-weight: 700; font-size: {{ section.settings.font_size | plus: 2 }}px; min-width: 34px; text-align: center; font-variant-numeric: tabular-nums; }
  .bs-cd-{{ section.id }} .bs-l { color: {{ section.settings.color }}; opacity: .5; font-size: 9px; margin-top: 3px; letter-spacing: 1px; }
  .bs-cd-{{ section.id }} .bs-c { color: {{ section.settings.color }}; opacity: .4; padding-bottom: 14px; }
  .bs-cd-{{ section.id }} .bs-btn { background: {{ section.settings.btn_bg }}; color: {{ section.settings.btn_color }};
    border-radius: 100px; height: 36px; padding: 0 18px; border: 0; cursor: pointer; font-weight: 600; font-size: {{ section.settings.font_size | minus: 1 }}px; text-decoration: none; display: inline-flex; align-items: center; }
</style>`;

  const markup = `<div class="bs-cd-{{ section.id }}" data-minutes="{{ section.settings.minutes }}">
  <span class="bs-h">{{ section.settings.heading }}</span>
  <div class="bs-clock">
    <div class="bs-u"><span class="bs-d" data-h>00</span><span class="bs-l">HRS</span></div>
    <span class="bs-c">:</span>
    <div class="bs-u"><span class="bs-d" data-m>00</span><span class="bs-l">MIN</span></div>
    <span class="bs-c">:</span>
    <div class="bs-u"><span class="bs-d" data-s>00</span><span class="bs-l">SEC</span></div>
  </div>
  {% if section.settings.show_button and section.settings.button_link != blank %}
    <a class="bs-btn" href="{{ section.settings.button_link }}">{{ section.settings.button_text }}</a>
  {% elsif section.settings.show_button %}
    <button class="bs-btn">{{ section.settings.button_text }}</button>
  {% endif %}
</div>
<script>
  (function () {
    var root = document.currentScript.previousElementSibling;
    {%- comment -%} Per-visitor evergreen timer, persisted in localStorage {%- endcomment -%}
    var key = 'bs-cd-{{ section.id }}', span = (parseFloat(root.dataset.minutes) || 30) * 60000;
    var end = parseInt(localStorage.getItem(key) || '0', 10);
    if (!end || end < Date.now()) { end = Date.now() + span; localStorage.setItem(key, end); }
    var h = root.querySelector('[data-h]'), m = root.querySelector('[data-m]'), s = root.querySelector('[data-s]');
    function p(n){ return String(Math.max(0, n)).padStart(2, '0'); }
    function tick(){ var l = Math.max(0, Math.floor((end - Date.now()) / 1000));
      h.textContent = p(Math.floor(l/3600)); m.textContent = p(Math.floor(l%3600/60)); s.textContent = p(l%60); }
    tick(); setInterval(tick, 1000);
  })();
</script>`;

  const schema = buildSchema({
    name: "Countdown Bar",
    settings: [
      { type: "text", id: "heading", label: "Heading", default: str(config, "heading") },
      { type: "range", id: "minutes", label: "Duration", min: 5, max: 240, step: 5, unit: "min", default: num(config, "minutes") },
      { type: "checkbox", id: "show_button", label: "Show button", default: bool(config, "showButton") },
      { type: "text", id: "button_text", label: "Button text", default: str(config, "buttonText") },
      { type: "url", id: "button_link", label: "Button link" },
      { type: "header", content: "Style" },
      { type: "color", id: "bg", label: "Background", default: str(config, "bg") },
      { type: "color", id: "color", label: "Text", default: str(config, "color") },
      { type: "color", id: "digit_bg", label: "Digit background", default: str(config, "digitBg") },
      { type: "color", id: "btn_bg", label: "Button", default: str(config, "btnBg") },
      { type: "color", id: "btn_color", label: "Button text", default: str(config, "btnColor") },
      { type: "range", id: "font_size", label: "Font size", min: 11, max: 20, step: 1, unit: "px", default: num(config, "fontSize") },
      { type: "range", id: "radius", label: "Corner radius", min: 0, max: 20, step: 2, unit: "px", default: num(config, "radius") },
      { type: "range", id: "padding_y", label: "Vertical padding", min: 6, max: 32, step: 2, unit: "px", default: num(config, "paddingY") },
    ],
  });

  return section({ style, markup, schema });
}

export const countdownBar: Tweak = {
  slug: "countdown-bar",
  name: "Countdown Bar",
  tagline: "Evergreen urgency timer with HH:MM:SS and a CTA.",
  description:
    "A sale countdown that creates real urgency. Runs as a per-visitor evergreen timer (persists across pages), with an optional shop button. Match the digits and bar to your palette.",
  category: "urgency",
  tier: "paid",
  price: 24,
  tint: "#f1eff4",
  Preview,
  generateLiquid,
  defaults,
  fields: [
    { key: "heading", label: "Heading", type: "text", group: "Content" },
    { key: "minutes", label: "Duration", type: "slider", group: "Content", min: 5, max: 240, step: 5, unit: "min" },
    { key: "showButton", label: "Show button", type: "toggle", group: "Content" },
    { key: "buttonText", label: "Button text", type: "text", group: "Content" },
    fontField("Typography"),
    { key: "fontSize", label: "Font size", type: "slider", group: "Typography", min: 11, max: 20, step: 1, unit: "px" },
    { key: "radius", label: "Corner radius", type: "slider", group: "Layout", min: 0, max: 20, step: 2, unit: "px" },
    { key: "paddingY", label: "Vertical padding", type: "slider", group: "Layout", min: 6, max: 32, step: 2, unit: "px" },
    { key: "bg", label: "Background", type: "color", group: "Colors" },
    { key: "color", label: "Text", type: "color", group: "Colors" },
    { key: "digitBg", label: "Digit background", type: "color", group: "Colors" },
    { key: "btnBg", label: "Button", type: "color", group: "Colors" },
    { key: "btnColor", label: "Button text", type: "color", group: "Colors" },
  ],
};
