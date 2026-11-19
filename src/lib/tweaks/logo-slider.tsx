import type { Tweak, TweakConfig } from "../types";
import { str, num, bool, list, fontStack, esc } from "../cfg";
import { fontField } from "../fields";
import { buildSchema, section, fontFaceFor } from "../liquid";

const defaults: TweakConfig = {
  heading: "As seen in",
  logos: [
    { label: "VOGUE" },
    { label: "Forbes" },
    { label: "TechCrunch" },
    { label: "WIRED" },
    { label: "GQ" },
    { label: "Bloomberg" },
  ],
  bg: "#ffffff",
  color: "#9a9a95",
  headingColor: "#b4b4ae",
  font: "inherit",
  logoSize: 22,
  gap: 72,
  speed: 30,
  grayscale: true,
  fadeEdges: true,
  paddingY: 32,
};

function Preview({ config }: { config: TweakConfig }) {
  const logos = list(config, "logos");
  const items = logos.length ? logos : [{ label: "LOGO" }];
  const seq = [...items, ...items];
  const fade = bool(config, "fadeEdges", true);

  return (
    <div
      className="w-full overflow-hidden"
      style={{
        background: str(config, "bg", "#fff"),
        paddingTop: num(config, "paddingY", 32),
        paddingBottom: num(config, "paddingY", 32),
        WebkitMaskImage: fade
          ? "linear-gradient(90deg, transparent, #000 12%, #000 88%, transparent)"
          : undefined,
        maskImage: fade
          ? "linear-gradient(90deg, transparent, #000 12%, #000 88%, transparent)"
          : undefined,
      }}
    >
      {str(config, "heading") && (
        <p
          className="text-center mb-5"
          style={{
            color: str(config, "headingColor", "#b4b4ae"),
            fontFamily: fontStack(str(config, "font", "inherit")),
            fontSize: 11,
            letterSpacing: 1.5,
            textTransform: "uppercase",
            fontWeight: 600,
          }}
        >
          {str(config, "heading")}
        </p>
      )}
      <div
        className="flex w-max items-center"
        style={{
          gap: num(config, "gap", 72),
          animation: `bs-marquee ${num(config, "speed", 30)}s linear infinite`,
        }}
      >
        {seq.map((l, i) => (
          <span
            key={i}
            className="shrink-0"
            style={{
              color: str(config, "color", "#9a9a95"),
              fontFamily: fontStack(str(config, "font", "inherit")),
              fontSize: num(config, "logoSize", 22),
              fontWeight: 700,
              letterSpacing: -0.5,
              whiteSpace: "nowrap",
              filter: bool(config, "grayscale", true) ? "grayscale(1)" : "none",
              opacity: 0.85,
            }}
          >
            {l.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function generateLiquid(config: TweakConfig): string {
  const { face, family } = fontFaceFor(str(config, "font", "inherit"));
  const logos = list(config, "logos");

  const style = `<style>
${face ? face + "\n" : ""}  .bs-logos-{{ section.id }} {
    background: {{ section.settings.bg }};
    padding: {{ section.settings.padding_y }}px 0;
    overflow: hidden;
    {% if section.settings.fade_edges %}
    -webkit-mask-image: linear-gradient(90deg, transparent, #000 12%, #000 88%, transparent);
    mask-image: linear-gradient(90deg, transparent, #000 12%, #000 88%, transparent);
    {% endif %}
  }
  .bs-logos-{{ section.id }} .bs-heading {
    text-align: center; margin: 0 0 20px; font-family: ${family};
    font-size: 11px; letter-spacing: 1.5px; text-transform: uppercase;
    font-weight: 600; color: {{ section.settings.heading_color }};
  }
  .bs-logos-{{ section.id }} .bs-track {
    display: flex; width: max-content; align-items: center;
    gap: {{ section.settings.gap }}px;
    animation: bs-logos-scroll {{ section.settings.speed }}s linear infinite;
  }
  .bs-logos-{{ section.id }} .bs-logo {
    flex-shrink: 0; white-space: nowrap; font-family: ${family};
    font-size: {{ section.settings.logo_size }}px; font-weight: 700;
    letter-spacing: -.5px; color: {{ section.settings.color }}; opacity: .85;
    {% if section.settings.grayscale %}filter: grayscale(1);{% endif %}
  }
  @keyframes bs-logos-scroll { to { transform: translateX(-50%); } }
</style>`;

  const markup = `<div class="bs-logos-{{ section.id }}">
  {% if section.settings.heading != blank %}<p class="bs-heading">{{ section.settings.heading }}</p>{% endif %}
  <div class="bs-track">
    {%- for n in (1..2) -%}
      {%- for block in section.blocks -%}
        <span class="bs-logo" {{ block.shopify_attributes }}>{{ block.settings.label }}</span>
      {%- endfor -%}
    {%- endfor -%}
  </div>
</div>`;

  const schema = buildSchema({
    name: "Logo Slider",
    settings: [
      { type: "text", id: "heading", label: "Heading", default: str(config, "heading") },
      { type: "header", content: "Style" },
      { type: "color", id: "bg", label: "Background", default: str(config, "bg") },
      { type: "color", id: "color", label: "Logo color", default: str(config, "color") },
      { type: "color", id: "heading_color", label: "Heading color", default: str(config, "headingColor") },
      { type: "range", id: "logo_size", label: "Logo size", min: 12, max: 40, step: 1, unit: "px", default: num(config, "logoSize") },
      { type: "checkbox", id: "grayscale", label: "Grayscale logos", default: bool(config, "grayscale") },
      { type: "checkbox", id: "fade_edges", label: "Fade edges", default: bool(config, "fadeEdges") },
      { type: "header", content: "Layout & motion" },
      { type: "range", id: "padding_y", label: "Vertical padding", min: 8, max: 80, step: 2, unit: "px", default: num(config, "paddingY") },
      { type: "range", id: "gap", label: "Gap", min: 24, max: 140, step: 4, unit: "px", default: num(config, "gap") },
      { type: "range", id: "speed", label: "Scroll duration", min: 10, max: 60, step: 1, unit: "s", default: num(config, "speed") },
    ],
    blocks: [
      { type: "logo", name: "Logo", settings: [{ type: "text", id: "label", label: "Logo text" }] },
    ],
    presetBlocks: logos.map((l) => ({ type: "logo", settings: { label: esc(l.label ?? "") } })),
  });

  return section({ style, markup, schema });
}

export const logoSlider: Tweak = {
  slug: "logo-slider",
  name: "Logo Slider",
  tagline: "Infinite press / brand logo marquee with edge fade.",
  description:
    "An endlessly looping band of press mentions or brand partners. Optional grayscale and edge fade keep it tasteful. Text logos in the demo — swap for image blocks in your theme.",
  category: "social-proof",
  tier: "free",
  tint: "#f3f1ee",
  Preview,
  generateLiquid,
  defaults,
  fields: [
    { key: "heading", label: "Heading", type: "text", group: "Content", placeholder: "As seen in" },
    {
      key: "logos",
      label: "Logos",
      type: "list",
      group: "Content",
      itemFields: [{ key: "label", label: "Logo text", type: "text" }],
      newItem: { label: "BRAND" },
      addLabel: "Add logo",
      max: 16,
    },
    fontField("Typography"),
    { key: "logoSize", label: "Logo size", type: "slider", group: "Typography", min: 12, max: 40, step: 1, unit: "px" },
    { key: "bg", label: "Background", type: "color", group: "Colors" },
    { key: "color", label: "Logo color", type: "color", group: "Colors" },
    { key: "headingColor", label: "Heading", type: "color", group: "Colors" },
    { key: "grayscale", label: "Grayscale", type: "toggle", group: "Style" },
    { key: "fadeEdges", label: "Fade edges", type: "toggle", group: "Style" },
    { key: "paddingY", label: "Vertical padding", type: "slider", group: "Layout", min: 8, max: 80, step: 2, unit: "px" },
    { key: "gap", label: "Gap", type: "slider", group: "Layout", min: 24, max: 140, step: 4, unit: "px" },
    { key: "speed", label: "Scroll duration", type: "slider", group: "Motion", min: 10, max: 60, step: 1, unit: "s" },
  ],
};
