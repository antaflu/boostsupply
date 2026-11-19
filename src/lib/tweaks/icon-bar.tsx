"use client";

import type { Tweak, TweakConfig } from "../types";
import { str, num, bool, list, fontStack, esc } from "../cfg";
import { fontField } from "../fields";
import { buildSchema, section, fontFaceFor } from "../liquid";
import { Icon, iconMarkup } from "../icons";
import { useWidth } from "../useWidth";

const defaults: TweakConfig = {
  items: [
    { icon: "pack:truck", label: "Free 2-day shipping" },
    { icon: "pack:returns", label: "Free 30-day returns" },
    { icon: "pack:shield", label: "2-year warranty" },
    { icon: "pack:headphones", label: "24/7 support" },
  ],
  layout: "row",
  bg: "#ffffff",
  iconColor: "#131313",
  textColor: "#131313",
  font: "inherit",
  iconSize: 24,
  fontSize: 14,
  gap: 24,
  paddingY: 20,
  dividers: true,
};

function Preview({ config }: { config: TweakConfig }) {
  const items = list(config, "items");
  const data = items.length ? items : [{ icon: "pack:star", label: "Feature" }];
  const layout = str(config, "layout", "row");
  const dividers = bool(config, "dividers", true);
  const [ref, w] = useWidth<HTMLDivElement>();
  const stack = w !== 0 && w < 560;

  return (
    <div
      ref={ref}
      className="w-full px-6"
      style={{
        background: str(config, "bg", "#fff"),
        paddingTop: num(config, "paddingY", 20),
        paddingBottom: num(config, "paddingY", 20),
        fontFamily: fontStack(str(config, "font", "inherit")),
      }}
    >
      <div
        className="flex flex-wrap items-center justify-center"
        style={{ gap: stack ? 12 : num(config, "gap", 24) }}
      >
        {data.map((it, i) => (
          <div key={i} className="flex items-center" style={{ gap: stack ? 12 : num(config, "gap", 24) }}>
            <div
              className="flex items-center"
              style={{
                gap: 10,
                flexDirection: layout === "stack" ? "column" : "row",
                textAlign: "center",
              }}
            >
              <span style={{ color: str(config, "iconColor", "#131313"), display: "flex" }}>
                <Icon token={it.icon ?? ""} size={num(config, "iconSize", 24)} />
              </span>
              <span
                style={{
                  color: str(config, "textColor", "#131313"),
                  fontSize: num(config, "fontSize", 14),
                  fontWeight: 500,
                  whiteSpace: layout === "stack" ? "normal" : "nowrap",
                }}
              >
                {it.label}
              </span>
            </div>
            {dividers && !stack && i < data.length - 1 && (
              <span
                aria-hidden
                style={{ width: 1, height: 22, background: "currentColor", opacity: 0.12, color: str(config, "textColor") }}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function generateLiquid(config: TweakConfig): string {
  const { face, family } = fontFaceFor(str(config, "font", "inherit"));
  const items = list(config, "items");
  const iconSize = num(config, "iconSize", 24);
  const isStack = str(config, "layout") === "stack";

  const style = `<style>
${face ? face + "\n" : ""}  .bs-ib-{{ section.id }} { background: {{ section.settings.bg }}; padding: {{ section.settings.padding_y }}px 24px; font-family: ${family}; }
  .bs-ib-{{ section.id }} .bs-row { display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: {{ section.settings.gap }}px; }
  .bs-ib-{{ section.id }} .bs-item { display: flex; align-items: center; gap: 10px; ${isStack ? "flex-direction: column; text-align: center;" : ""} }
  .bs-ib-{{ section.id }} .bs-ico { color: {{ section.settings.icon_color }}; display: flex; }
  .bs-ib-{{ section.id }} .bs-ico svg { display: block; }
  .bs-ib-{{ section.id }} .bs-label { color: {{ section.settings.text_color }}; font-size: {{ section.settings.font_size }}px; font-weight: 500; ${isStack ? "" : "white-space: nowrap;"} }
  .bs-ib-{{ section.id }} .bs-div { width: 1px; height: 22px; background: {{ section.settings.text_color }}; opacity: .12; }
  @media (max-width: 559px) {
    .bs-ib-{{ section.id }} .bs-row { gap: 12px; }
    .bs-ib-{{ section.id }} .bs-div { display: none; }
  }
</style>`;

  const markup = `<div class="bs-ib-{{ section.id }}">
  <div class="bs-row">
    {%- for block in section.blocks -%}
      <div class="bs-item" {{ block.shopify_attributes }}>
        <span class="bs-ico">{{ block.settings.icon }}</span>
        <span class="bs-label">{{ block.settings.label }}</span>
      </div>
      {%- if section.settings.dividers and forloop.last == false -%}<span class="bs-div"></span>{%- endif -%}
    {%- endfor -%}
  </div>
</div>`;

  const schema = buildSchema({
    name: "Icon Feature Bar",
    settings: [
      { type: "select", id: "layout", label: "Layout", options: [
        { value: "row", label: "Icon left of text" }, { value: "stack", label: "Icon above text" },
      ], default: str(config, "layout") },
      { type: "checkbox", id: "dividers", label: "Show dividers", default: bool(config, "dividers") },
      { type: "header", content: "Style" },
      { type: "color", id: "bg", label: "Background", default: str(config, "bg") },
      { type: "color", id: "icon_color", label: "Icon color", default: str(config, "iconColor") },
      { type: "color", id: "text_color", label: "Text color", default: str(config, "textColor") },
      { type: "range", id: "icon_size", label: "Icon size", min: 16, max: 40, step: 2, unit: "px", default: num(config, "iconSize") },
      { type: "range", id: "font_size", label: "Font size", min: 11, max: 20, step: 1, unit: "px", default: num(config, "fontSize") },
      { type: "range", id: "gap", label: "Gap", min: 8, max: 56, step: 2, unit: "px", default: num(config, "gap") },
      { type: "range", id: "padding_y", label: "Vertical padding", min: 8, max: 48, step: 2, unit: "px", default: num(config, "paddingY") },
    ],
    blocks: [
      { type: "feature", name: "Feature", settings: [
        { type: "html", id: "icon", label: "Icon (SVG or emoji)" },
        { type: "text", id: "label", label: "Label" },
      ] },
    ],
    presetBlocks: items.map((it) => ({
      type: "feature",
      settings: { icon: iconMarkup(it.icon ?? "", iconSize), label: esc(it.label ?? "") },
    })),
  });

  return section({ style, markup, schema });
}

export const iconBar: Tweak = {
  slug: "icon-feature-bar",
  name: "Icon Feature Bar",
  tagline: "A crisp row of icon + benefit, perfect under your header.",
  description:
    "A compact strip of icon-and-label features — shipping, warranty, support — that reassures shoppers at a glance. Pick icons from the free pack, drop in emojis, or upload your own SVGs. Collapses cleanly on mobile.",
  category: "social-proof",
  tier: "free",
  tint: "#eef2ee",
  Preview,
  generateLiquid,
  defaults,
  fields: [
    {
      key: "items",
      label: "Features",
      type: "list",
      group: "Content",
      itemFields: [
        { key: "icon", label: "Icon", type: "icon" },
        { key: "label", label: "Label", type: "text" },
      ],
      newItem: { icon: "pack:check", label: "New feature" },
      addLabel: "Add feature",
      max: 8,
    },
    {
      key: "layout", label: "Layout", type: "select", group: "Layout",
      options: [{ label: "Icon left of text", value: "row" }, { label: "Icon above text", value: "stack" }],
    },
    { key: "dividers", label: "Show dividers", type: "toggle", group: "Layout" },
    { key: "gap", label: "Gap", type: "slider", group: "Layout", min: 8, max: 56, step: 2, unit: "px" },
    { key: "paddingY", label: "Vertical padding", type: "slider", group: "Layout", min: 8, max: 48, step: 2, unit: "px" },
    fontField("Typography"),
    { key: "iconSize", label: "Icon size", type: "slider", group: "Typography", min: 16, max: 40, step: 2, unit: "px" },
    { key: "fontSize", label: "Font size", type: "slider", group: "Typography", min: 11, max: 20, step: 1, unit: "px" },
    { key: "bg", label: "Background", type: "color", group: "Colors" },
    { key: "iconColor", label: "Icon", type: "color", group: "Colors" },
    { key: "textColor", label: "Text", type: "color", group: "Colors" },
  ],
};
