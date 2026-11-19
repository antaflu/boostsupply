import type { Tweak, TweakConfig } from "../types";
import { str, num, bool, list, fontStack, esc } from "../cfg";
import { fontField, weightField } from "../fields";
import { buildSchema, section, fontFaceFor } from "../liquid";

const defaults: TweakConfig = {
  messages: [
    { text: "Free shipping on orders over $50" },
    { text: "30-day no-questions returns" },
    { text: "20.000+ five-star reviews" },
    { text: "Ships within 24 hours" },
  ],
  separator: "✦",
  bg: "#131313",
  color: "#ffffff",
  font: "inherit",
  weight: "500",
  fontSize: 13,
  uppercase: true,
  letterSpacing: 1.2,
  paddingY: 12,
  gap: 48,
  speed: 28,
  direction: "left",
  pauseOnHover: true,
};

function Preview({ config }: { config: TweakConfig }) {
  const messages = list(config, "messages");
  const sep = str(config, "separator", "•");
  const speed = num(config, "speed", 28);
  const dir = str(config, "direction", "left");
  const gap = num(config, "gap", 48);
  const items = messages.length ? messages : [{ text: "Add a message…" }];

  const sequence = [...items, ...items];

  return (
    <div
      className="w-full overflow-hidden"
      style={{
        background: str(config, "bg", "#131313"),
        paddingTop: num(config, "paddingY", 12),
        paddingBottom: num(config, "paddingY", 12),
      }}
    >
      <div
        className="flex w-max"
        style={{
          gap,
          animation: `${dir === "right" ? "bs-marquee-rev" : "bs-marquee"} ${speed}s linear infinite`,
        }}
        onMouseEnter={(e) => {
          if (bool(config, "pauseOnHover", true))
            e.currentTarget.style.animationPlayState = "paused";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.animationPlayState = "running";
        }}
      >
        {sequence.map((m, i) => (
          <div key={i} className="flex items-center shrink-0" style={{ gap }}>
            <span
              style={{
                color: str(config, "color", "#fff"),
                fontFamily: fontStack(str(config, "font", "inherit")),
                fontSize: num(config, "fontSize", 13),
                fontWeight: Number(str(config, "weight", "500")),
                textTransform: bool(config, "uppercase", true)
                  ? "uppercase"
                  : "none",
                letterSpacing: `${num(config, "letterSpacing", 1.2)}px`,
                whiteSpace: "nowrap",
              }}
            >
              {m.text}
            </span>
            <span
              style={{
                color: str(config, "color", "#fff"),
                opacity: 0.5,
                fontSize: num(config, "fontSize", 13),
              }}
              aria-hidden
            >
              {sep}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function generateLiquid(config: TweakConfig): string {
  const { face, family } = fontFaceFor(str(config, "font", "inherit"));
  const messages = list(config, "messages");
  const dir = str(config, "direction", "left");

  const style = `<style>
${face ? face + "\n" : ""}  .bs-ticker-{{ section.id }} {
    background: {{ section.settings.bg }};
    padding: {{ section.settings.padding_y }}px 0;
    overflow: hidden;
  }
  .bs-ticker-{{ section.id }} .bs-track {
    display: flex;
    width: max-content;
    gap: {{ section.settings.gap }}px;
    animation: bs-ticker-scroll {{ section.settings.speed }}s linear infinite;
    animation-direction: ${dir === "right" ? "reverse" : "normal"};
  }
  {% if section.settings.pause_on_hover %}
  .bs-ticker-{{ section.id }}:hover .bs-track { animation-play-state: paused; }
  {% endif %}
  .bs-ticker-{{ section.id }} .bs-item {
    display: flex; align-items: center; gap: {{ section.settings.gap }}px;
    flex-shrink: 0; white-space: nowrap;
    color: {{ section.settings.color }};
    font-family: ${family};
    font-size: {{ section.settings.font_size }}px;
    font-weight: {{ section.settings.weight }};
    letter-spacing: {{ section.settings.letter_spacing }}px;
    {% if section.settings.uppercase %}text-transform: uppercase;{% endif %}
  }
  .bs-ticker-{{ section.id }} .bs-sep { opacity: .5; }
  @keyframes bs-ticker-scroll { to { transform: translateX(-50%); } }
</style>`;

  const markup = `<div class="bs-ticker-{{ section.id }}">
  <div class="bs-track">
    {%- for n in (1..2) -%}
      {%- for block in section.blocks -%}
        <span class="bs-item" {{ block.shopify_attributes }}>
          {{ block.settings.text }}
          <span class="bs-sep">{{ section.settings.separator }}</span>
        </span>
      {%- endfor -%}
    {%- endfor -%}
  </div>
</div>`;

  const schema = buildSchema({
    name: "Announcement Ticker",
    settings: [
      { type: "header", content: "Style" },
      { type: "color", id: "bg", label: "Background", default: str(config, "bg") },
      { type: "color", id: "color", label: "Text color", default: str(config, "color") },
      { type: "text", id: "separator", label: "Separator", default: str(config, "separator") },
      { type: "checkbox", id: "uppercase", label: "Uppercase", default: bool(config, "uppercase") },
      { type: "range", id: "font_size", label: "Font size", min: 10, max: 24, step: 1, unit: "px", default: num(config, "fontSize") },
      { type: "range", id: "weight", label: "Weight", min: 400, max: 800, step: 100, default: Number(str(config, "weight", "500")) },
      { type: "range", id: "letter_spacing", label: "Letter spacing", min: 0, max: 4, step: 0.1, unit: "px", default: num(config, "letterSpacing") },
      { type: "header", content: "Layout & motion" },
      { type: "range", id: "padding_y", label: "Vertical padding", min: 4, max: 32, step: 1, unit: "px", default: num(config, "paddingY") },
      { type: "range", id: "gap", label: "Gap", min: 16, max: 96, step: 2, unit: "px", default: num(config, "gap") },
      { type: "range", id: "speed", label: "Scroll duration", min: 8, max: 60, step: 1, unit: "s", default: num(config, "speed") },
      { type: "checkbox", id: "pause_on_hover", label: "Pause on hover", default: bool(config, "pauseOnHover") },
    ],
    blocks: [
      {
        type: "message",
        name: "Message",
        settings: [{ type: "text", id: "text", label: "Text" }],
      },
    ],
    presetBlocks: messages.map((m) => ({
      type: "message",
      settings: { text: esc(m.text ?? "") },
    })),
  });

  return section({ style, markup, schema });
}

export const ticker: Tweak = {
  slug: "announcement-ticker",
  name: "Announcement Ticker",
  tagline: "Smooth scrolling marquee for shipping, returns & USPs.",
  description:
    "A clean, infinitely-scrolling announcement bar. Drop in any number of messages, control the speed and direction, and match it to your brand. Pauses on hover so shoppers can actually read it.",
  category: "announcement",
  tier: "free",
  tint: "#eef0f4",
  Preview,
  generateLiquid,
  defaults,
  fields: [
    {
      key: "messages",
      label: "Messages",
      type: "list",
      group: "Content",
      itemFields: [{ key: "text", label: "Text", type: "text" }],
      newItem: { text: "New message" },
      addLabel: "Add message",
      max: 12,
    },
    { key: "separator", label: "Separator", type: "text", group: "Content", placeholder: "•" },

    fontField("Typography"),
    weightField("Typography"),
    { key: "fontSize", label: "Font size", type: "slider", group: "Typography", min: 10, max: 24, step: 1, unit: "px" },
    { key: "letterSpacing", label: "Letter spacing", type: "slider", group: "Typography", min: 0, max: 4, step: 0.1, unit: "px" },
    { key: "uppercase", label: "Uppercase", type: "toggle", group: "Typography" },

    { key: "bg", label: "Background", type: "color", group: "Colors" },
    { key: "color", label: "Text", type: "color", group: "Colors" },

    { key: "paddingY", label: "Vertical padding", type: "slider", group: "Layout", min: 4, max: 32, step: 1, unit: "px" },
    { key: "gap", label: "Gap between items", type: "slider", group: "Layout", min: 16, max: 96, step: 2, unit: "px" },

    { key: "speed", label: "Scroll duration", type: "slider", group: "Motion", min: 8, max: 60, step: 1, unit: "s", hint: "Lower = faster" },
    {
      key: "direction",
      label: "Direction",
      type: "select",
      group: "Motion",
      options: [
        { label: "Left", value: "left" },
        { label: "Right", value: "right" },
      ],
    },
    { key: "pauseOnHover", label: "Pause on hover", type: "toggle", group: "Motion" },
  ],
};
