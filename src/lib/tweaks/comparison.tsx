import type { Tweak, TweakConfig } from "../types";
import { str, num, list, fontStack, esc } from "../cfg";
import { fontField } from "../fields";
import { buildSchema, section, fontFaceFor } from "../liquid";
import { Icon, iconMarkup } from "../icons";

const defaults: TweakConfig = {
  heading: "Why customers switch to us",
  usLabel: "Us",
  themLabel: "The rest",
  rows: [
    { feature: "Free 2-day shipping", us: "yes", them: "no" },
    { feature: "30-day money-back guarantee", us: "yes", them: "no" },
    { feature: "Sustainably sourced materials", us: "yes", them: "no" },
    { feature: "24/7 human support", us: "yes", them: "no" },
    { feature: "Price", us: "$49", them: "$79" },
  ],
  bg: "#ffffff",
  highlight: "#131313",
  highlightText: "#ffffff",
  rowBg: "#f7f7f6",
  textColor: "#131313",
  mutedColor: "#b4b4ae",
  font: "inherit",
  radius: 18,
  paddingY: 48,
};

function Cell({ value, positive, muted }: { value: string; positive: string; muted: string }) {
  const v = (value ?? "").trim().toLowerCase();
  if (v === "yes")
    return (
      <span style={{ color: positive, display: "inline-flex" }}>
        <Icon token="pack:check" size={20} />
      </span>
    );
  if (v === "no")
    return (
      <span style={{ color: muted, display: "inline-flex" }}>
        <Icon token="pack:cross" size={20} />
      </span>
    );
  return <span style={{ fontWeight: 600, fontSize: 14 }}>{value}</span>;
}

function Preview({ config }: { config: TweakConfig }) {
  const rows = list(config, "rows");
  const data = rows.length ? rows : [{ feature: "Feature", us: "yes", them: "no" }];
  const highlight = str(config, "highlight", "#131313");
  const hlText = str(config, "highlightText", "#fff");
  const text = str(config, "textColor", "#131313");
  const muted = str(config, "mutedColor", "#b4b4ae");

  return (
    <div
      className="w-full px-6"
      style={{
        background: str(config, "bg", "#fff"),
        paddingTop: num(config, "paddingY", 48),
        paddingBottom: num(config, "paddingY", 48),
        fontFamily: fontStack(str(config, "font", "inherit")),
      }}
    >
      <div className="mx-auto" style={{ maxWidth: 600 }}>
        {str(config, "heading") && (
          <h2
            className="text-center"
            style={{ color: text, fontSize: 24, fontWeight: 600, letterSpacing: -0.4, marginBottom: 24 }}
          >
            {str(config, "heading")}
          </h2>
        )}
        <div
          style={{
            background: str(config, "rowBg", "#f7f7f6"),
            borderRadius: num(config, "radius", 18),
            overflow: "hidden",
          }}
        >
          {/* header */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 88px 88px", alignItems: "stretch" }}>
            <div />
            <div
              style={{
                background: highlight,
                color: hlText,
                fontWeight: 600,
                fontSize: 13,
                textAlign: "center",
                padding: "12px 8px",
                borderTopLeftRadius: num(config, "radius", 18),
                borderTopRightRadius: num(config, "radius", 18),
              }}
            >
              {str(config, "usLabel", "Us")}
            </div>
            <div style={{ color: muted, fontWeight: 600, fontSize: 13, textAlign: "center", padding: "12px 8px" }}>
              {str(config, "themLabel", "Them")}
            </div>
          </div>
          {/* rows */}
          {data.map((r, i) => (
            <div
              key={i}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 88px 88px",
                alignItems: "center",
                borderTop: `1px solid rgba(0,0,0,0.05)`,
              }}
            >
              <div style={{ color: text, fontSize: 14, fontWeight: 500, padding: "14px 16px" }}>
                {r.feature}
              </div>
              <div
                style={{
                  background: highlight,
                  color: hlText,
                  textAlign: "center",
                  padding: "14px 8px",
                  ...(i === data.length - 1
                    ? { borderBottomLeftRadius: num(config, "radius", 18), borderBottomRightRadius: num(config, "radius", 18) }
                    : {}),
                }}
              >
                <Cell value={r.us} positive={hlText} muted={hlText} />
              </div>
              <div style={{ textAlign: "center", color: text, padding: "14px 8px" }}>
                <Cell value={r.them} positive={text} muted={muted} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function generateLiquid(config: TweakConfig): string {
  const { face, family } = fontFaceFor(str(config, "font", "inherit"));
  const rows = list(config, "rows");
  const check = iconMarkup("pack:check", 20);
  const cross = iconMarkup("pack:cross", 20);

  const style = `<style>
${face ? face + "\n" : ""}  .bs-cmp-{{ section.id }} { background: {{ section.settings.bg }}; padding: {{ section.settings.padding_y }}px 24px; font-family: ${family}; }
  .bs-cmp-{{ section.id }} .bs-in { max-width: 600px; margin: 0 auto; }
  .bs-cmp-{{ section.id }} .bs-head { text-align: center; color: {{ section.settings.text_color }}; font-size: 24px; font-weight: 600; letter-spacing: -.4px; margin: 0 0 24px; }
  .bs-cmp-{{ section.id }} .bs-table { background: {{ section.settings.row_bg }}; border-radius: {{ section.settings.radius }}px; overflow: hidden; }
  .bs-cmp-{{ section.id }} .bs-r { display: grid; grid-template-columns: 1fr 88px 88px; align-items: center; }
  .bs-cmp-{{ section.id }} .bs-r + .bs-r { border-top: 1px solid rgba(0,0,0,.05); }
  .bs-cmp-{{ section.id }} .bs-feat { color: {{ section.settings.text_color }}; font-size: 14px; font-weight: 500; padding: 14px 16px; }
  .bs-cmp-{{ section.id }} .bs-us { background: {{ section.settings.highlight }}; color: {{ section.settings.highlight_text }}; text-align: center; padding: 14px 8px; font-weight: 600; font-size: 14px; }
  .bs-cmp-{{ section.id }} .bs-them { text-align: center; padding: 14px 8px; color: {{ section.settings.text_color }}; font-weight: 600; font-size: 14px; }
  .bs-cmp-{{ section.id }} .bs-them .bs-no { color: {{ section.settings.muted_color }}; }
  .bs-cmp-{{ section.id }} .bs-hl { font-weight: 600; font-size: 13px; padding: 12px 8px; }
  .bs-cmp-{{ section.id }} svg { display: inline-block; vertical-align: middle; }
  .bs-cmp-{{ section.id }} .bs-r:first-child .bs-us { border-radius: {{ section.settings.radius }}px {{ section.settings.radius }}px 0 0; }
  .bs-cmp-{{ section.id }} .bs-r:last-child .bs-us { border-radius: 0 0 {{ section.settings.radius }}px {{ section.settings.radius }}px; }
</style>`;

  const cellLogic = (col: "us" | "them") => `{%- assign v = block.settings.${col} | downcase -%}
        {%- if v == 'yes' -%}<span class="bs-yes">${check}</span>
        {%- elsif v == 'no' -%}<span class="bs-no">${cross}</span>
        {%- else -%}{{ block.settings.${col} }}{%- endif -%}`;

  const markup = `<div class="bs-cmp-{{ section.id }}">
  <div class="bs-in">
    {% if section.settings.heading != blank %}<h2 class="bs-head">{{ section.settings.heading }}</h2>{% endif %}
    <div class="bs-table">
      <div class="bs-r">
        <div></div>
        <div class="bs-us bs-hl">{{ section.settings.us_label }}</div>
        <div class="bs-them bs-hl" style="color: {{ section.settings.muted_color }}">{{ section.settings.them_label }}</div>
      </div>
      {%- for block in section.blocks -%}
      <div class="bs-r" {{ block.shopify_attributes }}>
        <div class="bs-feat">{{ block.settings.feature }}</div>
        <div class="bs-us">${cellLogic("us")}</div>
        <div class="bs-them">${cellLogic("them")}</div>
      </div>
      {%- endfor -%}
    </div>
  </div>
</div>`;

  const schema = buildSchema({
    name: "Comparison Table",
    settings: [
      { type: "text", id: "heading", label: "Heading", default: str(config, "heading") },
      { type: "text", id: "us_label", label: "Your column label", default: str(config, "usLabel") },
      { type: "text", id: "them_label", label: "Their column label", default: str(config, "themLabel") },
      { type: "header", content: "Style" },
      { type: "color", id: "bg", label: "Background", default: str(config, "bg") },
      { type: "color", id: "row_bg", label: "Table background", default: str(config, "rowBg") },
      { type: "color", id: "highlight", label: "Your column", default: str(config, "highlight") },
      { type: "color", id: "highlight_text", label: "Your column text", default: str(config, "highlightText") },
      { type: "color", id: "text_color", label: "Text", default: str(config, "textColor") },
      { type: "color", id: "muted_color", label: "Muted", default: str(config, "mutedColor") },
      { type: "range", id: "radius", label: "Corner radius", min: 0, max: 32, step: 2, unit: "px", default: num(config, "radius") },
      { type: "range", id: "padding_y", label: "Section padding", min: 16, max: 96, step: 4, unit: "px", default: num(config, "paddingY") },
    ],
    blocks: [
      { type: "row", name: "Row", settings: [
        { type: "text", id: "feature", label: "Feature" },
        { type: "text", id: "us", label: "You (yes / no / text)" },
        { type: "text", id: "them", label: "Them (yes / no / text)" },
      ] },
    ],
    presetBlocks: rows.map((r) => ({
      type: "row",
      settings: { feature: esc(r.feature ?? ""), us: esc(r.us ?? ""), them: esc(r.them ?? "") },
    })),
  });

  return section({ style, markup, schema });
}

export const comparison: Tweak = {
  slug: "comparison-table",
  name: "Comparison Table",
  tagline: "An us-vs-them table that makes the choice obvious.",
  description:
    "Stack your advantages against the competition in a clean, highlighted table. Type 'yes' or 'no' for a check or cross, or any text (like a price) for custom cells. Your column is accent-highlighted to draw the eye.",
  category: "product-page",
  tier: "paid",
  price: 29,
  tint: "#eef0f4",
  Preview,
  generateLiquid,
  defaults,
  fields: [
    { key: "heading", label: "Heading", type: "text", group: "Content" },
    { key: "usLabel", label: "Your column label", type: "text", group: "Content" },
    { key: "themLabel", label: "Their column label", type: "text", group: "Content" },
    {
      key: "rows",
      label: "Rows",
      type: "list",
      group: "Content",
      itemFields: [
        { key: "feature", label: "Feature", type: "text" },
        { key: "us", label: "You (yes / no / text)", type: "text" },
        { key: "them", label: "Them (yes / no / text)", type: "text" },
      ],
      newItem: { feature: "New feature", us: "yes", them: "no" },
      addLabel: "Add row",
      max: 12,
    },
    fontField("Typography"),
    { key: "radius", label: "Corner radius", type: "slider", group: "Layout", min: 0, max: 32, step: 2, unit: "px" },
    { key: "paddingY", label: "Section padding", type: "slider", group: "Layout", min: 16, max: 96, step: 4, unit: "px" },
    { key: "bg", label: "Background", type: "color", group: "Colors" },
    { key: "rowBg", label: "Table", type: "color", group: "Colors" },
    { key: "highlight", label: "Your column", type: "color", group: "Colors" },
    { key: "highlightText", label: "Your column text", type: "color", group: "Colors" },
    { key: "textColor", label: "Text", type: "color", group: "Colors" },
    { key: "mutedColor", label: "Muted", type: "color", group: "Colors" },
  ],
};
