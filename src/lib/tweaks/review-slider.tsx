"use client";

import { useEffect, useState } from "react";
import type { Tweak, TweakConfig } from "../types";
import { str, num, bool, list, fontStack, esc } from "../cfg";
import { fontField } from "../fields";
import { buildSchema, section, fontFaceFor } from "../liquid";

const defaults: TweakConfig = {
  heading: "Loved by 20,000+ customers",
  reviews: [
    { quote: "Genuinely the best purchase I've made this year. Quality is unreal.", author: "Mara T.", role: "Verified buyer" },
    { quote: "Shipping was fast and the packaging felt premium. Already ordered again.", author: "Devon R.", role: "Verified buyer" },
    { quote: "I've recommended this to my whole group chat. It just works.", author: "Priya N.", role: "Verified buyer" },
  ],
  showStars: true,
  autoplay: 5,
  bg: "#ffffff",
  cardBg: "#f7f7f6",
  quoteColor: "#131313",
  metaColor: "#8a8a85",
  starColor: "#131313",
  font: "inherit",
  radius: 20,
  paddingY: 48,
};

function Stars({ color }: { color: string }) {
  return (
    <div className="flex gap-0.5 mb-3" style={{ color }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} width="15" height="15" viewBox="0 0 20 20" fill="currentColor">
          <path d="M10 1.5l2.6 5.3 5.9.9-4.2 4.1 1 5.8L10 15l-5.3 2.6 1-5.8L1.5 7.7l5.9-.9z" />
        </svg>
      ))}
    </div>
  );
}

function Preview({ config }: { config: TweakConfig }) {
  const reviews = list(config, "reviews");
  const data = reviews.length ? reviews : [{ quote: "Your review here", author: "Name", role: "Role" }];
  const [i, setI] = useState(0);
  const delay = num(config, "autoplay", 5);

  useEffect(() => {
    if (delay <= 0) return;
    const t = setInterval(() => setI((p) => (p + 1) % data.length), delay * 1000);
    return () => clearInterval(t);
  }, [delay, data.length]);

  const r = data[Math.min(i, data.length - 1)];

  return (
    <div
      className="w-full px-6 text-center"
      style={{
        background: str(config, "bg", "#fff"),
        paddingTop: num(config, "paddingY", 48),
        paddingBottom: num(config, "paddingY", 48),
        fontFamily: fontStack(str(config, "font", "inherit")),
      }}
    >
      {str(config, "heading") && (
        <p
          className="mb-5"
          style={{ color: str(config, "metaColor"), fontSize: 13, fontWeight: 500, letterSpacing: 0.2 }}
        >
          {str(config, "heading")}
        </p>
      )}
      <div
        className="mx-auto max-w-[520px] bs-fade-up"
        key={i}
        style={{
          background: str(config, "cardBg", "#f7f7f6"),
          borderRadius: num(config, "radius", 20),
          padding: 32,
        }}
      >
        {bool(config, "showStars", true) && (
          <div className="flex justify-center">
            <Stars color={str(config, "starColor", "#131313")} />
          </div>
        )}
        <p
          style={{ color: str(config, "quoteColor", "#131313"), fontSize: 18, lineHeight: 1.45, fontWeight: 500 }}
        >
          “{r.quote}”
        </p>
        <p className="mt-4" style={{ color: str(config, "metaColor"), fontSize: 13 }}>
          <span style={{ fontWeight: 600, color: str(config, "quoteColor") }}>{r.author}</span>
          {r.role ? ` · ${r.role}` : ""}
        </p>
      </div>
      <div className="flex justify-center gap-1.5 mt-5">
        {data.map((_, d) => (
          <button
            key={d}
            onClick={() => setI(d)}
            style={{
              width: d === i ? 18 : 6,
              height: 6,
              borderRadius: 999,
              background: d === i ? str(config, "quoteColor", "#131313") : "#d8d8d5",
              transition: "all .3s",
            }}
            aria-label={`Go to review ${d + 1}`}
          />
        ))}
      </div>
    </div>
  );
}

function generateLiquid(config: TweakConfig): string {
  const { face, family } = fontFaceFor(str(config, "font", "inherit"));
  const reviews = list(config, "reviews");

  const style = `<style>
${face ? face + "\n" : ""}  .bs-rev-{{ section.id }} { background: {{ section.settings.bg }}; padding: {{ section.settings.padding_y }}px 24px; text-align: center; font-family: ${family}; }
  .bs-rev-{{ section.id }} .bs-h { color: {{ section.settings.meta_color }}; font-size: 13px; font-weight: 500; margin: 0 0 20px; }
  .bs-rev-{{ section.id }} .bs-viewport { max-width: 520px; margin: 0 auto; overflow: hidden; }
  .bs-rev-{{ section.id }} .bs-track { display: flex; transition: transform .5s cubic-bezier(.22,1,.36,1); }
  .bs-rev-{{ section.id }} .bs-slide { min-width: 100%; }
  .bs-rev-{{ section.id }} .bs-card { background: {{ section.settings.card_bg }}; border-radius: {{ section.settings.radius }}px; padding: 32px; margin: 0 4px; }
  .bs-rev-{{ section.id }} .bs-stars { color: {{ section.settings.star_color }}; display: flex; justify-content: center; gap: 2px; margin-bottom: 12px; }
  .bs-rev-{{ section.id }} .bs-q { color: {{ section.settings.quote_color }}; font-size: 18px; line-height: 1.45; font-weight: 500; margin: 0; }
  .bs-rev-{{ section.id }} .bs-m { color: {{ section.settings.meta_color }}; font-size: 13px; margin: 16px 0 0; }
  .bs-rev-{{ section.id }} .bs-m b { color: {{ section.settings.quote_color }}; }
  .bs-rev-{{ section.id }} .bs-dots { display: flex; justify-content: center; gap: 6px; margin-top: 20px; }
  .bs-rev-{{ section.id }} .bs-dot { width: 6px; height: 6px; border-radius: 999px; background: #d8d8d5; border: 0; cursor: pointer; transition: all .3s; padding: 0; }
  .bs-rev-{{ section.id }} .bs-dot[aria-current="true"] { width: 18px; background: {{ section.settings.quote_color }}; }
</style>`;

  const markup = `<div class="bs-rev-{{ section.id }}" data-autoplay="{{ section.settings.autoplay }}">
  {% if section.settings.heading != blank %}<p class="bs-h">{{ section.settings.heading }}</p>{% endif %}
  <div class="bs-viewport"><div class="bs-track">
    {%- for block in section.blocks -%}
      <div class="bs-slide" {{ block.shopify_attributes }}><div class="bs-card">
        {% if section.settings.show_stars %}<div class="bs-stars">
          {% for i in (1..5) %}<svg width="15" height="15" viewBox="0 0 20 20" fill="currentColor"><path d="M10 1.5l2.6 5.3 5.9.9-4.2 4.1 1 5.8L10 15l-5.3 2.6 1-5.8L1.5 7.7l5.9-.9z"/></svg>{% endfor %}
        </div>{% endif %}
        <p class="bs-q">“{{ block.settings.quote }}”</p>
        <p class="bs-m"><b>{{ block.settings.author }}</b>{% if block.settings.role != blank %} · {{ block.settings.role }}{% endif %}</p>
      </div></div>
    {%- endfor -%}
  </div></div>
  <div class="bs-dots">
    {%- for block in section.blocks -%}<button class="bs-dot" data-i="{{ forloop.index0 }}" {% if forloop.first %}aria-current="true"{% endif %}></button>{%- endfor -%}
  </div>
</div>
<script>
  (function () {
    var root = document.currentScript.previousElementSibling;
    var track = root.querySelector('.bs-track'), dots = root.querySelectorAll('.bs-dot');
    var n = dots.length, cur = 0;
    function go(i) { cur = (i + n) % n; track.style.transform = 'translateX(-' + (cur * 100) + '%)';
      dots.forEach(function (d, k) { d.setAttribute('aria-current', k === cur); }); }
    dots.forEach(function (d) { d.addEventListener('click', function () { go(+d.dataset.i); }); });
    var ms = (parseFloat(root.dataset.autoplay) || 0) * 1000;
    if (ms > 0 && n > 1) setInterval(function () { go(cur + 1); }, ms);
  })();
</script>`;

  const schema = buildSchema({
    name: "Review Slider",
    settings: [
      { type: "text", id: "heading", label: "Heading", default: str(config, "heading") },
      { type: "checkbox", id: "show_stars", label: "Show stars", default: bool(config, "showStars") },
      { type: "range", id: "autoplay", label: "Autoplay (0 = off)", min: 0, max: 12, step: 1, unit: "s", default: num(config, "autoplay") },
      { type: "header", content: "Style" },
      { type: "color", id: "bg", label: "Background", default: str(config, "bg") },
      { type: "color", id: "card_bg", label: "Card", default: str(config, "cardBg") },
      { type: "color", id: "quote_color", label: "Quote", default: str(config, "quoteColor") },
      { type: "color", id: "meta_color", label: "Meta", default: str(config, "metaColor") },
      { type: "color", id: "star_color", label: "Stars", default: str(config, "starColor") },
      { type: "range", id: "radius", label: "Corner radius", min: 0, max: 40, step: 2, unit: "px", default: num(config, "radius") },
      { type: "range", id: "padding_y", label: "Section padding", min: 16, max: 96, step: 4, unit: "px", default: num(config, "paddingY") },
    ],
    blocks: [
      { type: "review", name: "Review", settings: [
        { type: "textarea", id: "quote", label: "Quote" },
        { type: "text", id: "author", label: "Author" },
        { type: "text", id: "role", label: "Role / tag" },
      ] },
    ],
    presetBlocks: reviews.map((r) => ({
      type: "review",
      settings: { quote: esc(r.quote ?? ""), author: esc(r.author ?? ""), role: esc(r.role ?? "") },
    })),
  });

  return section({ style, markup, schema });
}

export const reviewSlider: Tweak = {
  slug: "review-slider",
  name: "Review Slider",
  tagline: "An auto-playing testimonial carousel with star ratings.",
  description:
    "Rotate your best customer quotes in a clean, centered card with star ratings and dot navigation. Autoplay speed, colors and corners all adjustable — social proof that actually looks designed.",
  category: "social-proof",
  tier: "paid",
  price: 24,
  tint: "#f3f1ee",
  Preview,
  generateLiquid,
  defaults,
  fields: [
    { key: "heading", label: "Heading", type: "text", group: "Content" },
    {
      key: "reviews",
      label: "Reviews",
      type: "list",
      group: "Content",
      itemFields: [
        { key: "quote", label: "Quote", type: "textarea" },
        { key: "author", label: "Author", type: "text" },
        { key: "role", label: "Role / tag", type: "text" },
      ],
      newItem: { quote: "A glowing review goes here.", author: "Customer", role: "Verified buyer" },
      addLabel: "Add review",
      max: 12,
    },
    { key: "showStars", label: "Show stars", type: "toggle", group: "Style" },
    { key: "autoplay", label: "Autoplay", type: "slider", group: "Motion", min: 0, max: 12, step: 1, unit: "s", hint: "0 turns autoplay off" },
    fontField("Typography"),
    { key: "radius", label: "Corner radius", type: "slider", group: "Layout", min: 0, max: 40, step: 2, unit: "px" },
    { key: "paddingY", label: "Section padding", type: "slider", group: "Layout", min: 16, max: 96, step: 4, unit: "px" },
    { key: "bg", label: "Background", type: "color", group: "Colors" },
    { key: "cardBg", label: "Card", type: "color", group: "Colors" },
    { key: "quoteColor", label: "Quote", type: "color", group: "Colors" },
    { key: "metaColor", label: "Meta", type: "color", group: "Colors" },
    { key: "starColor", label: "Stars", type: "color", group: "Colors" },
  ],
};
