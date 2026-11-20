import type { Tweak, TweakConfig } from "../types";
import { str, num, bool, fontStack } from "../cfg";
import { fontField } from "../fields";
import { buildSchema, section, fontFaceFor } from "../liquid";

const defaults: TweakConfig = {
  threshold: 50,
  preview: 32,
  beforeText: "You're {{remaining}} away from free shipping",
  afterText: "🎉 You've unlocked free shipping!",
  currency: "$",
  bg: "#f7f7f6",
  fill: "#131313",
  track: "#e6e6e4",
  textColor: "#131313",
  font: "inherit",
  fontSize: 13,
  barHeight: 8,
  radius: 999,
  paddingY: 14,
  showGift: true,
};

function Preview({ config }: { config: TweakConfig }) {
  const threshold = num(config, "threshold", 50);
  const current = num(config, "preview", 32);
  const cur = str(config, "currency", "$");
  const remaining = Math.max(0, threshold - current);
  const pct = Math.min(100, threshold > 0 ? (current / threshold) * 100 : 100);
  const unlocked = remaining <= 0;

  const msg = unlocked
    ? str(config, "afterText")
    : str(config, "beforeText").replace(
        "{{remaining}}",
        `${cur}${remaining.toFixed(2).replace(/\.00$/, "")}`,
      );

  return (
    <div
      className="w-full px-6"
      style={{
        background: str(config, "bg", "#f7f7f6"),
        paddingTop: num(config, "paddingY", 14),
        paddingBottom: num(config, "paddingY", 14),
        fontFamily: fontStack(str(config, "font", "inherit")),
      }}
    >
      <div className="max-w-[420px] mx-auto">
        <p
          className="mb-2 flex items-center gap-1.5"
          style={{
            color: str(config, "textColor", "#131313"),
            fontSize: num(config, "fontSize", 13),
            fontWeight: 500,
          }}
        >
          {bool(config, "showGift", true) && <span>{unlocked ? "✅" : "🚚"}</span>}
          {msg}
        </p>
        <div
          style={{
            background: str(config, "track", "#e6e6e4"),
            height: num(config, "barHeight", 8),
            borderRadius: num(config, "radius", 999),
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${pct}%`,
              height: "100%",
              background: str(config, "fill", "#131313"),
              borderRadius: num(config, "radius", 999),
              transition: "width .6s cubic-bezier(.22,1,.36,1)",
            }}
          />
        </div>
      </div>
    </div>
  );
}

function generateLiquid(config: TweakConfig): string {
  const { face, family } = fontFaceFor(str(config, "font", "inherit"));

  const style = `<style>
${face ? face + "\n" : ""}  .bs-ship-{{ section.id }} { background: {{ section.settings.bg }}; padding: {{ section.settings.padding_y }}px 24px; font-family: ${family}; }
  .bs-ship-{{ section.id }} .bs-in { max-width: 420px; margin: 0 auto; }
  .bs-ship-{{ section.id }} .bs-msg { display: flex; align-items: center; gap: 6px; margin: 0 0 8px;
    color: {{ section.settings.text_color }}; font-size: {{ section.settings.font_size }}px; font-weight: 500; }
  .bs-ship-{{ section.id }} .bs-track { background: {{ section.settings.track }}; height: {{ section.settings.bar_height }}px;
    border-radius: {{ section.settings.radius }}px; overflow: hidden; }
  .bs-ship-{{ section.id }} .bs-fill { height: 100%; background: {{ section.settings.fill }}; border-radius: {{ section.settings.radius }}px;
    transition: width .6s cubic-bezier(.22,1,.36,1); }
</style>`;

  const markup = `{%- assign bs_threshold = section.settings.threshold | times: 100 -%}
{%- assign bs_remaining = bs_threshold | minus: cart.total_price -%}
{%- assign bs_pct = cart.total_price | times: 100.0 | divided_by: bs_threshold -%}
{%- if bs_pct > 100 -%}{%- assign bs_pct = 100 -%}{%- endif -%}
{%- assign bs_rem_money = bs_remaining | money_without_trailing_zeros -%}
{%- comment -%} Build the remaining-amount token here: curly pairs inside an output tag would break the Liquid parser {%- endcomment -%}
{%- assign bs_open = '{' | append: '{' -%}
{%- assign bs_close = '}' | append: '}' -%}
{%- assign bs_token = bs_open | append: 'remaining' | append: bs_close -%}
<div class="bs-ship-{{ section.id }}">
  <div class="bs-in">
    <p class="bs-msg">
      {%- if bs_remaining <= 0 -%}
        {% if section.settings.show_gift %}✅ {% endif %}{{ section.settings.after_text }}
      {%- else -%}
        {% if section.settings.show_gift %}🚚 {% endif %}{{ section.settings.before_text | replace: bs_token, bs_rem_money }}
      {%- endif -%}
    </p>
    <div class="bs-track"><div class="bs-fill" style="width: {{ bs_pct }}%;"></div></div>
  </div>
</div>`;

  const schema = buildSchema({
    name: "Free Shipping Bar",
    settings: [
      { type: "range", id: "threshold", label: "Free shipping threshold", min: 10, max: 250, step: 5, unit: str(config, "currency", "$"), default: num(config, "threshold") },
      { type: "text", id: "before_text", label: "Before (use {{remaining}})", default: str(config, "beforeText") },
      { type: "text", id: "after_text", label: "After unlocked", default: str(config, "afterText") },
      { type: "checkbox", id: "show_gift", label: "Show icon", default: bool(config, "showGift") },
      { type: "header", content: "Style" },
      { type: "color", id: "bg", label: "Background", default: str(config, "bg") },
      { type: "color", id: "fill", label: "Bar fill", default: str(config, "fill") },
      { type: "color", id: "track", label: "Bar track", default: str(config, "track") },
      { type: "color", id: "text_color", label: "Text", default: str(config, "textColor") },
      { type: "range", id: "font_size", label: "Font size", min: 11, max: 18, step: 1, unit: "px", default: num(config, "fontSize") },
      { type: "range", id: "bar_height", label: "Bar height", min: 4, max: 20, step: 1, unit: "px", default: num(config, "barHeight") },
      /* Shopify allows at most 101 steps; 100px already reads as a full pill on this bar */
      { type: "range", id: "radius", label: "Corner radius", min: 0, max: 100, step: 1, unit: "px", default: Math.min(100, Math.round(num(config, "radius"))) },
      { type: "range", id: "padding_y", label: "Vertical padding", min: 6, max: 32, step: 2, unit: "px", default: num(config, "paddingY") },
    ],
  });

  return section({ style, markup, schema });
}

export const shippingBar: Tweak = {
  slug: "free-shipping-bar",
  name: "Free Shipping Bar",
  tagline: "A cart progress bar that nudges shoppers to spend more.",
  description:
    "Shows how close a customer is to free shipping with a live progress bar, then celebrates when they unlock it. Reads the real cart total via Liquid — a proven AOV lever for the cart drawer or page.",
  category: "cart",
  tier: "paid",
  price: 19,
  tint: "#eef2ee",
  Preview,
  generateLiquid,
  defaults,
  fields: [
    { key: "threshold", label: "Threshold", type: "slider", group: "Content", min: 10, max: 250, step: 5, unit: "$" },
    { key: "preview", label: "Preview cart total", type: "slider", group: "Content", min: 0, max: 250, step: 1, unit: "$", hint: "Editor preview only" },
    { key: "beforeText", label: "Before text", type: "text", group: "Content", hint: "Use {{remaining}} for the amount left" },
    { key: "afterText", label: "After unlocked", type: "text", group: "Content" },
    { key: "currency", label: "Currency symbol", type: "text", group: "Content" },
    { key: "showGift", label: "Show icon", type: "toggle", group: "Content" },
    fontField("Typography"),
    { key: "fontSize", label: "Font size", type: "slider", group: "Typography", min: 11, max: 18, step: 1, unit: "px" },
    { key: "barHeight", label: "Bar height", type: "slider", group: "Layout", min: 4, max: 20, step: 1, unit: "px" },
    { key: "radius", label: "Corner radius", type: "slider", group: "Layout", min: 0, max: 999, step: 1, unit: "px" },
    { key: "paddingY", label: "Vertical padding", type: "slider", group: "Layout", min: 6, max: 32, step: 2, unit: "px" },
    { key: "bg", label: "Background", type: "color", group: "Colors" },
    { key: "fill", label: "Bar fill", type: "color", group: "Colors" },
    { key: "track", label: "Bar track", type: "color", group: "Colors" },
    { key: "textColor", label: "Text", type: "color", group: "Colors" },
  ],
};
