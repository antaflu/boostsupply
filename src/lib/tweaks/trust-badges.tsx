import type { Tweak, TweakConfig } from "../types";
import { str, num, bool, list, fontStack, esc } from "../cfg";
import { fontField } from "../fields";
import { buildSchema, section, fontFaceFor } from "../liquid";

const defaults: TweakConfig = {
  heading: "Guaranteed safe checkout",
  badges: [
    { label: "Visa" },
    { label: "Mastercard" },
    { label: "Amex" },
    { label: "PayPal" },
    { label: "Apple Pay" },
    { label: "Shop Pay" },
  ],
  bg: "#ffffff",
  pillBg: "#f5f5f4",
  pillBorder: "#e6e6e4",
  textColor: "#8a8a85",
  font: "inherit",
  fontSize: 12,
  radius: 8,
  align: "center",
  showHeading: true,
  paddingY: 16,
};

function Preview({ config }: { config: TweakConfig }) {
  const badges = list(config, "badges");
  const items = badges.length ? badges : [{ label: "Badge" }];
  const align = str(config, "align", "center");
  return (
    <div
      className="w-full px-6"
      style={{
        background: str(config, "bg", "#fff"),
        paddingTop: num(config, "paddingY", 16),
        paddingBottom: num(config, "paddingY", 16),
        fontFamily: fontStack(str(config, "font", "inherit")),
      }}
    >
      {bool(config, "showHeading", true) && (
        <p
          className="mb-3 flex items-center gap-1.5"
          style={{
            color: str(config, "textColor", "#8a8a85"),
            fontSize: num(config, "fontSize", 12),
            justifyContent:
              align === "center"
                ? "center"
                : align === "right"
                  ? "flex-end"
                  : "flex-start",
            fontWeight: 500,
          }}
        >
          <LockIcon /> {str(config, "heading")}
        </p>
      )}
      <div
        className="flex flex-wrap gap-2"
        style={{
          justifyContent:
            align === "center"
              ? "center"
              : align === "right"
                ? "flex-end"
                : "flex-start",
        }}
      >
        {items.map((b, i) => (
          <span
            key={i}
            className="inline-flex items-center px-3 py-2"
            style={{
              background: str(config, "pillBg", "#f5f5f4"),
              border: `1px solid ${str(config, "pillBorder", "#e6e6e4")}`,
              borderRadius: num(config, "radius", 8),
              color: str(config, "textColor", "#8a8a85"),
              fontSize: num(config, "fontSize", 12),
              fontWeight: 600,
              letterSpacing: -0.2,
            }}
          >
            {b.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function LockIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden>
      <rect x="3" y="7" width="10" height="7" rx="1.5" fill="currentColor" />
      <path
        d="M5.5 7V5a2.5 2.5 0 015 0v2"
        stroke="currentColor"
        strokeWidth="1.4"
      />
    </svg>
  );
}

function generateLiquid(config: TweakConfig): string {
  const { face, family } = fontFaceFor(str(config, "font", "inherit"));
  const badges = list(config, "badges");
  const justify =
    str(config, "align") === "center"
      ? "center"
      : str(config, "align") === "right"
        ? "flex-end"
        : "flex-start";

  const style = `<style>
${face ? face + "\n" : ""}  .bs-trust-{{ section.id }} {
    background: {{ section.settings.bg }}; padding: {{ section.settings.padding_y }}px 24px;
    font-family: ${family};
  }
  .bs-trust-{{ section.id }} .bs-head {
    display: flex; align-items: center; gap: 6px; justify-content: ${justify};
    margin: 0 0 12px; font-size: {{ section.settings.font_size }}px; font-weight: 500;
    color: {{ section.settings.text_color }};
  }
  .bs-trust-{{ section.id }} .bs-row {
    display: flex; flex-wrap: wrap; gap: 8px; justify-content: ${justify};
  }
  .bs-trust-{{ section.id }} .bs-pill {
    padding: 8px 12px; border-radius: {{ section.settings.radius }}px;
    background: {{ section.settings.pill_bg }}; border: 1px solid {{ section.settings.pill_border }};
    color: {{ section.settings.text_color }}; font-size: {{ section.settings.font_size }}px;
    font-weight: 600; letter-spacing: -.2px;
  }
</style>`;

  const markup = `<div class="bs-trust-{{ section.id }}">
  {% if section.settings.show_heading %}
  <p class="bs-head">
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><rect x="3" y="7" width="10" height="7" rx="1.5" fill="currentColor"/><path d="M5.5 7V5a2.5 2.5 0 015 0v2" stroke="currentColor" stroke-width="1.4"/></svg>
    {{ section.settings.heading }}
  </p>
  {% endif %}
  <div class="bs-row">
    {%- for block in section.blocks -%}
      <span class="bs-pill" {{ block.shopify_attributes }}>{{ block.settings.label }}</span>
    {%- endfor -%}
  </div>
</div>`;

  const schema = buildSchema({
    name: "Trust Badge Bar",
    settings: [
      { type: "checkbox", id: "show_heading", label: "Show heading", default: bool(config, "showHeading") },
      { type: "text", id: "heading", label: "Heading", default: str(config, "heading") },
      { type: "select", id: "align", label: "Alignment", options: [
        { value: "left", label: "Left" }, { value: "center", label: "Center" }, { value: "right", label: "Right" },
      ], default: str(config, "align") },
      { type: "header", content: "Style" },
      { type: "color", id: "bg", label: "Background", default: str(config, "bg") },
      { type: "color", id: "pill_bg", label: "Badge background", default: str(config, "pillBg") },
      { type: "color", id: "pill_border", label: "Badge border", default: str(config, "pillBorder") },
      { type: "color", id: "text_color", label: "Text color", default: str(config, "textColor") },
      { type: "range", id: "font_size", label: "Font size", min: 10, max: 18, step: 1, unit: "px", default: num(config, "fontSize") },
      { type: "range", id: "radius", label: "Corner radius", min: 0, max: 24, step: 2, unit: "px", default: num(config, "radius") },
      { type: "range", id: "padding_y", label: "Vertical padding", min: 4, max: 40, step: 2, unit: "px", default: num(config, "paddingY") },
    ],
    blocks: [
      { type: "badge", name: "Badge", settings: [{ type: "text", id: "label", label: "Label" }] },
    ],
    presetBlocks: badges.map((b) => ({ type: "badge", settings: { label: esc(b.label ?? "") } })),
  });

  return section({ style, markup, schema });
}

export const trustBadges: Tweak = {
  slug: "trust-badge-bar",
  name: "Trust Badge Bar",
  tagline: "Payment & guarantee badges to place under your CTA.",
  description:
    "A reassurance row of payment methods and trust signals — the kind that lifts checkout confidence right where it matters. Pill style, alignment and colors fully adjustable.",
  category: "social-proof",
  tier: "free",
  tint: "#eef2ee",
  Preview,
  generateLiquid,
  defaults,
  fields: [
    { key: "showHeading", label: "Show heading", type: "toggle", group: "Content" },
    { key: "heading", label: "Heading", type: "text", group: "Content" },
    {
      key: "badges",
      label: "Badges",
      type: "list",
      group: "Content",
      itemFields: [{ key: "label", label: "Label", type: "text" }],
      newItem: { label: "Klarna" },
      addLabel: "Add badge",
      max: 12,
    },
    fontField("Typography"),
    { key: "fontSize", label: "Font size", type: "slider", group: "Typography", min: 10, max: 18, step: 1, unit: "px" },
    {
      key: "align", label: "Alignment", type: "select", group: "Layout",
      options: [
        { label: "Left", value: "left" }, { label: "Center", value: "center" }, { label: "Right", value: "right" },
      ],
    },
    { key: "radius", label: "Corner radius", type: "slider", group: "Layout", min: 0, max: 24, step: 2, unit: "px" },
    { key: "paddingY", label: "Vertical padding", type: "slider", group: "Layout", min: 4, max: 40, step: 2, unit: "px" },
    { key: "bg", label: "Background", type: "color", group: "Colors" },
    { key: "pillBg", label: "Badge background", type: "color", group: "Colors" },
    { key: "pillBorder", label: "Badge border", type: "color", group: "Colors" },
    { key: "textColor", label: "Text", type: "color", group: "Colors" },
  ],
};
