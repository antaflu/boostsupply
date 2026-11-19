import type { Tweak, TweakConfig } from "../types";
import { str, num, bool, fontStack } from "../cfg";
import { fontField } from "../fields";
import { buildSchema, section, fontFaceFor } from "../liquid";

const defaults: TweakConfig = {
  product: "Everyday Carry Tote",
  price: "$89.00",
  compareAt: "$120.00",
  buttonText: "Add to cart",
  showThumb: true,
  thumb: "🛍️",
  bg: "#ffffff",
  border: "#e6e6e4",
  textColor: "#131313",
  btnBg: "#131313",
  btnColor: "#ffffff",
  font: "inherit",
  radius: 12,
  shadow: true,
};

function Preview({ config }: { config: TweakConfig }) {
  return (
    <div
      className="w-full relative"
      style={{
        height: 180,
        background:
          "repeating-linear-gradient(135deg,#fafafa,#fafafa 12px,#f4f4f3 12px,#f4f4f3 24px)",
        fontFamily: fontStack(str(config, "font", "inherit")),
      }}
    >
      <span className="absolute top-3 left-4 text-[11px] text-ink-4">
        product page ↑
      </span>
      <div
        className="absolute left-3 right-3 bottom-3 flex items-center gap-3 px-3 py-2.5"
        style={{
          background: str(config, "bg", "#fff"),
          border: `1px solid ${str(config, "border", "#e6e6e4")}`,
          borderRadius: num(config, "radius", 12),
          boxShadow: bool(config, "shadow", true)
            ? "0 8px 24px rgba(0,0,0,0.10)"
            : "none",
        }}
      >
        {bool(config, "showThumb", true) && (
          <div
            className="grid place-items-center shrink-0"
            style={{
              width: 40,
              height: 40,
              borderRadius: Math.max(6, num(config, "radius", 12) - 4),
              background: "#f0f0ef",
              fontSize: 20,
            }}
          >
            {str(config, "thumb", "🛍️")}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div
            className="truncate"
            style={{
              color: str(config, "textColor", "#131313"),
              fontWeight: 600,
              fontSize: 14,
            }}
          >
            {str(config, "product")}
          </div>
          <div className="flex items-center gap-2">
            <span
              style={{ color: str(config, "textColor"), fontWeight: 600, fontSize: 13 }}
            >
              {str(config, "price")}
            </span>
            {str(config, "compareAt") && (
              <span className="text-ink-4 line-through" style={{ fontSize: 12 }}>
                {str(config, "compareAt")}
              </span>
            )}
          </div>
        </div>
        <button
          className="shrink-0 px-5 h-10 font-medium text-sm"
          style={{
            background: str(config, "btnBg", "#131313"),
            color: str(config, "btnColor", "#fff"),
            borderRadius: 100,
          }}
        >
          {str(config, "buttonText", "Add to cart")}
        </button>
      </div>
    </div>
  );
}

function generateLiquid(config: TweakConfig): string {
  const { face, family } = fontFaceFor(str(config, "font", "inherit"));
  const style = `<style>
${face ? face + "\n" : ""}  .bs-atc-{{ section.id }} {
    position: fixed; left: 12px; right: 12px; bottom: 12px; z-index: 50;
    display: flex; align-items: center; gap: 12px; padding: 10px 12px;
    background: {{ section.settings.bg }}; border: 1px solid {{ section.settings.border }};
    border-radius: {{ section.settings.radius }}px; font-family: ${family};
    transform: translateY(150%); transition: transform .35s cubic-bezier(.22,1,.36,1);
    {% if section.settings.shadow %}box-shadow: 0 8px 24px rgba(0,0,0,.10);{% endif %}
  }
  .bs-atc-{{ section.id }}.is-visible { transform: translateY(0); }
  .bs-atc-{{ section.id }} .bs-thumb { width: 40px; height: 40px; border-radius: 8px; background: #f0f0ef; display: grid; place-items: center; font-size: 20px; flex-shrink: 0; }
  .bs-atc-{{ section.id }} .bs-info { min-width: 0; flex: 1; }
  .bs-atc-{{ section.id }} .bs-name { color: {{ section.settings.text_color }}; font-weight: 600; font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .bs-atc-{{ section.id }} .bs-price { color: {{ section.settings.text_color }}; font-weight: 600; font-size: 13px; }
  .bs-atc-{{ section.id }} .bs-was { color: #b4b4ae; text-decoration: line-through; font-size: 12px; margin-left: 6px; }
  .bs-atc-{{ section.id }} .bs-btn { flex-shrink: 0; height: 40px; padding: 0 22px; border: 0; cursor: pointer;
    background: {{ section.settings.btn_bg }}; color: {{ section.settings.btn_color }};
    border-radius: 100px; font-weight: 600; font-size: 14px; }
</style>`;

  const markup = `<div class="bs-atc-{{ section.id }}" id="bs-atc-{{ section.id }}">
  {% if section.settings.show_thumb %}<div class="bs-thumb">{{ section.settings.thumb }}</div>{% endif %}
  <div class="bs-info">
    <div class="bs-name">{{ section.settings.product }}</div>
    <div>
      <span class="bs-price">{{ section.settings.price }}</span>
      {% if section.settings.compare_at != blank %}<span class="bs-was">{{ section.settings.compare_at }}</span>{% endif %}
    </div>
  </div>
  <button class="bs-btn" onclick="document.querySelector('form[action*=\\'/cart/add\\'] [type=submit], button[name=add]')?.click()">{{ section.settings.button_text }}</button>
</div>
<script>
  (function () {
    var bar = document.getElementById('bs-atc-{{ section.id }}');
    {%- comment -%} Show the bar once the main Add to cart scrolls out of view {%- endcomment -%}
    var anchor = document.querySelector('button[name=add], form[action*="/cart/add"] [type=submit]');
    if (!bar || !anchor) { if (bar) bar.classList.add('is-visible'); return; }
    var io = new IntersectionObserver(function (e) {
      bar.classList.toggle('is-visible', !e[0].isIntersecting);
    }, { threshold: 0 });
    io.observe(anchor);
  })();
</script>`;

  const schema = buildSchema({
    name: "Sticky Add to Cart",
    settings: [
      { type: "text", id: "product", label: "Product name", default: str(config, "product") },
      { type: "text", id: "price", label: "Price", default: str(config, "price") },
      { type: "text", id: "compare_at", label: "Compare-at price", default: str(config, "compareAt") },
      { type: "text", id: "button_text", label: "Button text", default: str(config, "buttonText") },
      { type: "checkbox", id: "show_thumb", label: "Show thumbnail", default: bool(config, "showThumb") },
      { type: "text", id: "thumb", label: "Thumbnail (emoji)", default: str(config, "thumb") },
      { type: "header", content: "Style" },
      { type: "color", id: "bg", label: "Bar background", default: str(config, "bg") },
      { type: "color", id: "border", label: "Border", default: str(config, "border") },
      { type: "color", id: "text_color", label: "Text", default: str(config, "textColor") },
      { type: "color", id: "btn_bg", label: "Button background", default: str(config, "btnBg") },
      { type: "color", id: "btn_color", label: "Button text", default: str(config, "btnColor") },
      { type: "range", id: "radius", label: "Corner radius", min: 0, max: 24, step: 2, unit: "px", default: num(config, "radius") },
      { type: "checkbox", id: "shadow", label: "Drop shadow", default: bool(config, "shadow") },
    ],
  });

  return section({ style, markup, schema });
}

export const stickyAtc: Tweak = {
  slug: "sticky-add-to-cart",
  name: "Sticky Add to Cart",
  tagline: "A floating buy bar that follows shoppers down the PDP.",
  description:
    "Keeps price and the buy button one tap away as customers scroll product details. Slides in once the main Add-to-cart leaves the viewport — wired to your theme's add button automatically.",
  category: "product-page",
  tier: "paid",
  price: 24,
  tint: "#f1eff4",
  Preview,
  generateLiquid,
  defaults,
  fields: [
    { key: "product", label: "Product name", type: "text", group: "Content" },
    { key: "price", label: "Price", type: "text", group: "Content" },
    { key: "compareAt", label: "Compare-at price", type: "text", group: "Content" },
    { key: "buttonText", label: "Button text", type: "text", group: "Content" },
    { key: "showThumb", label: "Show thumbnail", type: "toggle", group: "Content" },
    { key: "thumb", label: "Thumbnail (emoji)", type: "text", group: "Content" },
    fontField("Typography"),
    { key: "radius", label: "Corner radius", type: "slider", group: "Layout", min: 0, max: 24, step: 2, unit: "px" },
    { key: "shadow", label: "Drop shadow", type: "toggle", group: "Layout" },
    { key: "bg", label: "Bar background", type: "color", group: "Colors" },
    { key: "border", label: "Border", type: "color", group: "Colors" },
    { key: "textColor", label: "Text", type: "color", group: "Colors" },
    { key: "btnBg", label: "Button", type: "color", group: "Colors" },
    { key: "btnColor", label: "Button text", type: "color", group: "Colors" },
  ],
};
