"use client";

import type { Tweak, TweakConfig } from "../types";
import { str, num, list, fontStack, esc } from "../cfg";
import { fontField } from "../fields";
import { buildSchema, section, fontFaceFor } from "../liquid";
import { Icon, iconMarkup } from "../icons";
import { useWidth } from "../useWidth";

const defaults: TweakConfig = {
  items: [
    { icon: "pack:truck", title: "Free shipping", text: "On every order over $50, no code needed." },
    { icon: "pack:returns", title: "30-day returns", text: "Changed your mind? Send it back, on us." },
    { icon: "pack:leaf", title: "Sustainably made", text: "Recycled materials, carbon-neutral delivery." },
    { icon: "pack:star", title: "20k+ reviews", text: "Rated 4.9/5 by customers worldwide." },
  ],
  columns: 4,
  bg: "#ffffff",
  cardBg: "#f7f7f6",
  cardBorder: "transparent",
  iconColor: "#131313",
  titleColor: "#131313",
  textColor: "#6b6b66",
  font: "inherit",
  radius: 16,
  iconSize: 26,
  gap: 16,
  paddingY: 40,
  cardPadding: 24,
  align: "left",
};

function Preview({ config }: { config: TweakConfig }) {
  const items = list(config, "items");
  const data = items.length
    ? items
    : [{ icon: "pack:sparkles", title: "Title", text: "Description" }];
  const align = str(config, "align", "left");
  const maxCols = num(config, "columns", 4);
  const [ref, w] = useWidth<HTMLDivElement>();
  const cols = w === 0 ? maxCols : w < 440 ? 1 : w < 720 ? 2 : maxCols;

  return (
    <div
      ref={ref}
      className="w-full px-6"
      style={{
        background: str(config, "bg", "#fff"),
        paddingTop: num(config, "paddingY", 40),
        paddingBottom: num(config, "paddingY", 40),
        fontFamily: fontStack(str(config, "font", "inherit")),
      }}
    >
      <div
        className="grid"
        style={{
          gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))`,
          gap: num(config, "gap", 16),
        }}
      >
        {data.map((it, i) => (
          <div
            key={i}
            style={{
              background: str(config, "cardBg", "#f7f7f6"),
              border: `1px solid ${str(config, "cardBorder", "transparent")}`,
              borderRadius: num(config, "radius", 16),
              padding: num(config, "cardPadding", 24),
              textAlign: align as "left" | "center",
            }}
          >
            <div
              style={{
                marginBottom: 12,
                color: str(config, "iconColor", "#131313"),
                display: "flex",
                justifyContent: align === "center" ? "center" : "flex-start",
              }}
            >
              <Icon token={it.icon ?? ""} size={num(config, "iconSize", 26)} />
            </div>
            <div
              style={{
                color: str(config, "titleColor", "#131313"),
                fontWeight: 600,
                fontSize: 15,
                marginBottom: 4,
              }}
            >
              {it.title}
            </div>
            <div
              style={{
                color: str(config, "textColor", "#6b6b66"),
                fontSize: 13,
                lineHeight: 1.5,
              }}
            >
              {it.text}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function generateLiquid(config: TweakConfig): string {
  const { face, family } = fontFaceFor(str(config, "font", "inherit"));
  const items = list(config, "items");
  const iconSize = num(config, "iconSize", 26);

  const style = `<style>
${face ? face + "\n" : ""}  .bs-usp-{{ section.id }} {
    background: {{ section.settings.bg }}; padding: {{ section.settings.padding_y }}px 24px;
    font-family: ${family};
  }
  .bs-usp-{{ section.id }} .bs-grid {
    display: grid; gap: {{ section.settings.gap }}px;
    grid-template-columns: repeat({{ section.settings.columns }}, minmax(0,1fr));
  }
  @media (max-width: 749px) { .bs-usp-{{ section.id }} .bs-grid { grid-template-columns: repeat(2, minmax(0,1fr)); } }
  @media (max-width: 479px) { .bs-usp-{{ section.id }} .bs-grid { grid-template-columns: 1fr; } }
  .bs-usp-{{ section.id }} .bs-card {
    background: {{ section.settings.card_bg }}; border: 1px solid {{ section.settings.card_border }};
    border-radius: {{ section.settings.radius }}px; padding: {{ section.settings.card_padding }}px;
    text-align: {{ section.settings.align }};
  }
  .bs-usp-{{ section.id }} .bs-ico { display: flex; margin-bottom: 12px; color: {{ section.settings.icon_color }}; }
  .bs-usp-{{ section.id }} .bs-ico svg { display: block; }
  .bs-usp-{{ section.id }}[data-align="center"] .bs-ico { justify-content: center; }
  .bs-usp-{{ section.id }} .bs-t { color: {{ section.settings.title_color }}; font-weight: 600; font-size: 15px; margin: 0 0 4px; }
  .bs-usp-{{ section.id }} .bs-x { color: {{ section.settings.text_color }}; font-size: 13px; line-height: 1.5; margin: 0; }
</style>`;

  const markup = `<div class="bs-usp-{{ section.id }}" data-align="{{ section.settings.align }}">
  <div class="bs-grid">
    {%- for block in section.blocks -%}
      <div class="bs-card" {{ block.shopify_attributes }}>
        <div class="bs-ico">{{ block.settings.icon }}</div>
        <p class="bs-t">{{ block.settings.title }}</p>
        <p class="bs-x">{{ block.settings.text }}</p>
      </div>
    {%- endfor -%}
  </div>
</div>`;

  const schema = buildSchema({
    name: "USP Grid",
    settings: [
      { type: "range", id: "columns", label: "Columns (desktop)", min: 2, max: 5, step: 1, default: num(config, "columns") },
      { type: "select", id: "align", label: "Text align", options: [
        { value: "left", label: "Left" }, { value: "center", label: "Center" },
      ], default: str(config, "align") },
      { type: "header", content: "Style" },
      { type: "color", id: "bg", label: "Background", default: str(config, "bg") },
      { type: "color", id: "card_bg", label: "Card background", default: str(config, "cardBg") },
      { type: "color", id: "card_border", label: "Card border", default: str(config, "cardBorder") },
      { type: "color", id: "icon_color", label: "Icon color", default: str(config, "iconColor") },
      { type: "color", id: "title_color", label: "Title color", default: str(config, "titleColor") },
      { type: "color", id: "text_color", label: "Text color", default: str(config, "textColor") },
      { type: "range", id: "radius", label: "Corner radius", min: 0, max: 32, step: 2, unit: "px", default: num(config, "radius") },
      { type: "range", id: "gap", label: "Gap", min: 8, max: 40, step: 2, unit: "px", default: num(config, "gap") },
      { type: "range", id: "card_padding", label: "Card padding", min: 12, max: 48, step: 2, unit: "px", default: num(config, "cardPadding") },
      { type: "range", id: "padding_y", label: "Section padding", min: 16, max: 96, step: 4, unit: "px", default: num(config, "paddingY") },
    ],
    blocks: [
      { type: "usp", name: "USP", settings: [
        { type: "html", id: "icon", label: "Icon (SVG or emoji)" },
        { type: "text", id: "title", label: "Title" },
        { type: "textarea", id: "text", label: "Text" },
      ] },
    ],
    presetBlocks: items.map((it) => ({
      type: "usp",
      settings: {
        icon: iconMarkup(it.icon ?? "", iconSize),
        title: esc(it.title ?? ""),
        text: esc(it.text ?? ""),
      },
    })),
  });

  return section({ style, markup, schema });
}

export const uspGrid: Tweak = {
  slug: "usp-grid",
  name: "USP Grid",
  tagline: "Benefit boxes with icons to sell the why, not just the what.",
  description:
    "A responsive grid of value props — shipping, returns, guarantees, sustainability. Pick an icon per box from the free pack, an emoji, or upload your own SVG. Wraps to 2 columns on tablet and 1 on mobile automatically.",
  category: "homepage",
  tier: "paid",
  price: 19,
  tint: "#eef0f4",
  Preview,
  generateLiquid,
  defaults,
  fields: [
    {
      key: "items",
      label: "USPs",
      type: "list",
      group: "Content",
      itemFields: [
        { key: "icon", label: "Icon", type: "icon" },
        { key: "title", label: "Title", type: "text" },
        { key: "text", label: "Text", type: "textarea" },
      ],
      newItem: { icon: "pack:sparkles", title: "New benefit", text: "Describe the benefit." },
      addLabel: "Add USP",
      max: 8,
    },
    { key: "columns", label: "Columns (desktop)", type: "slider", group: "Layout", min: 2, max: 5, step: 1, hint: "Auto-wraps to 2 on tablet, 1 on mobile" },
    {
      key: "align", label: "Text align", type: "select", group: "Layout",
      options: [{ label: "Left", value: "left" }, { label: "Center", value: "center" }],
    },
    { key: "gap", label: "Gap", type: "slider", group: "Layout", min: 8, max: 40, step: 2, unit: "px" },
    { key: "cardPadding", label: "Card padding", type: "slider", group: "Layout", min: 12, max: 48, step: 2, unit: "px" },
    { key: "paddingY", label: "Section padding", type: "slider", group: "Layout", min: 16, max: 96, step: 4, unit: "px" },
    { key: "radius", label: "Corner radius", type: "slider", group: "Layout", min: 0, max: 32, step: 2, unit: "px" },
    fontField("Typography"),
    { key: "iconSize", label: "Icon size", type: "slider", group: "Typography", min: 18, max: 48, step: 2, unit: "px" },
    { key: "bg", label: "Background", type: "color", group: "Colors" },
    { key: "cardBg", label: "Card", type: "color", group: "Colors" },
    { key: "cardBorder", label: "Card border", type: "color", group: "Colors" },
    { key: "iconColor", label: "Icon", type: "color", group: "Colors" },
    { key: "titleColor", label: "Title", type: "color", group: "Colors" },
    { key: "textColor", label: "Text", type: "color", group: "Colors" },
  ],
};
