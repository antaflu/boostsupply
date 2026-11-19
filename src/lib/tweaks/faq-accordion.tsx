"use client";

import { useState } from "react";
import type { Tweak, TweakConfig } from "../types";
import { str, num, bool, list, fontStack, esc } from "../cfg";
import { fontField } from "../fields";
import { buildSchema, section, fontFaceFor } from "../liquid";

const defaults: TweakConfig = {
  heading: "Frequently asked questions",
  items: [
    { q: "How long does shipping take?", a: "Orders ship within 24 hours and arrive in 2–4 business days with free tracked delivery." },
    { q: "What's your return policy?", a: "You have 30 days to return anything, no questions asked. We'll cover the return label." },
    { q: "Do you ship internationally?", a: "Yes — we ship to 40+ countries. Duties and taxes are calculated at checkout so there are no surprises." },
    { q: "Is checkout secure?", a: "Absolutely. Every payment is encrypted and processed through Shopify's PCI-compliant checkout." },
  ],
  bg: "#ffffff",
  cardBg: "#f7f7f6",
  border: "transparent",
  qColor: "#131313",
  aColor: "#6b6b66",
  headingColor: "#131313",
  font: "inherit",
  radius: 14,
  gap: 8,
  paddingY: 48,
  openFirst: true,
};

function Preview({ config }: { config: TweakConfig }) {
  const items = list(config, "items");
  const data = items.length ? items : [{ q: "Question?", a: "Answer." }];
  const [open, setOpen] = useState<number>(bool(config, "openFirst", true) ? 0 : -1);

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
      <div className="mx-auto" style={{ maxWidth: 640 }}>
        {str(config, "heading") && (
          <h2
            className="text-center"
            style={{
              color: str(config, "headingColor", "#131313"),
              fontSize: 24,
              fontWeight: 600,
              letterSpacing: -0.4,
              marginBottom: 24,
            }}
          >
            {str(config, "heading")}
          </h2>
        )}
        <div className="flex flex-col" style={{ gap: num(config, "gap", 8) }}>
          {data.map((it, i) => {
            const isOpen = open === i;
            return (
              <div
                key={i}
                style={{
                  background: str(config, "cardBg", "#f7f7f6"),
                  border: `1px solid ${str(config, "border", "transparent")}`,
                  borderRadius: num(config, "radius", 14),
                  overflow: "hidden",
                }}
              >
                <button
                  onClick={() => setOpen(isOpen ? -1 : i)}
                  className="w-full flex items-center justify-between gap-3 text-left"
                  style={{ padding: "16px 18px" }}
                >
                  <span style={{ color: str(config, "qColor", "#131313"), fontWeight: 600, fontSize: 15 }}>
                    {it.q}
                  </span>
                  <span
                    style={{
                      color: str(config, "qColor"),
                      transition: "transform .25s",
                      transform: isOpen ? "rotate(45deg)" : "none",
                      fontSize: 20,
                      lineHeight: 1,
                      flexShrink: 0,
                    }}
                    aria-hidden
                  >
                    +
                  </span>
                </button>
                <div
                  style={{
                    display: "grid",
                    gridTemplateRows: isOpen ? "1fr" : "0fr",
                    transition: "grid-template-rows .3s cubic-bezier(.22,1,.36,1)",
                  }}
                >
                  <div style={{ overflow: "hidden" }}>
                    <p style={{ color: str(config, "aColor", "#6b6b66"), fontSize: 14, lineHeight: 1.6, padding: "0 18px 16px" }}>
                      {it.a}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function generateLiquid(config: TweakConfig): string {
  const { face, family } = fontFaceFor(str(config, "font", "inherit"));
  const items = list(config, "items");

  const style = `<style>
${face ? face + "\n" : ""}  .bs-faq-{{ section.id }} { background: {{ section.settings.bg }}; padding: {{ section.settings.padding_y }}px 24px; font-family: ${family}; }
  .bs-faq-{{ section.id }} .bs-in { max-width: 640px; margin: 0 auto; }
  .bs-faq-{{ section.id }} .bs-head { text-align: center; color: {{ section.settings.heading_color }}; font-size: 24px; font-weight: 600; letter-spacing: -.4px; margin: 0 0 24px; }
  .bs-faq-{{ section.id }} details { background: {{ section.settings.card_bg }}; border: 1px solid {{ section.settings.border }};
    border-radius: {{ section.settings.radius }}px; margin-bottom: {{ section.settings.gap }}px; overflow: hidden; }
  .bs-faq-{{ section.id }} summary { list-style: none; cursor: pointer; display: flex; align-items: center; justify-content: space-between;
    gap: 12px; padding: 16px 18px; color: {{ section.settings.q_color }}; font-weight: 600; font-size: 15px; }
  .bs-faq-{{ section.id }} summary::-webkit-details-marker { display: none; }
  .bs-faq-{{ section.id }} summary .bs-plus { font-size: 20px; line-height: 1; transition: transform .25s; flex-shrink: 0; }
  .bs-faq-{{ section.id }} details[open] summary .bs-plus { transform: rotate(45deg); }
  .bs-faq-{{ section.id }} .bs-a { color: {{ section.settings.a_color }}; font-size: 14px; line-height: 1.6; padding: 0 18px 16px; margin: 0; }
</style>`;

  const markup = `<div class="bs-faq-{{ section.id }}">
  <div class="bs-in">
    {% if section.settings.heading != blank %}<h2 class="bs-head">{{ section.settings.heading }}</h2>{% endif %}
    {%- for block in section.blocks -%}
      <details {% if section.settings.open_first and forloop.first %}open{% endif %} {{ block.shopify_attributes }}>
        <summary>{{ block.settings.q }}<span class="bs-plus">+</span></summary>
        <p class="bs-a">{{ block.settings.a }}</p>
      </details>
    {%- endfor -%}
  </div>
</div>`;

  const schema = buildSchema({
    name: "FAQ Accordion",
    settings: [
      { type: "text", id: "heading", label: "Heading", default: str(config, "heading") },
      { type: "checkbox", id: "open_first", label: "Open first by default", default: bool(config, "openFirst") },
      { type: "header", content: "Style" },
      { type: "color", id: "bg", label: "Background", default: str(config, "bg") },
      { type: "color", id: "card_bg", label: "Card background", default: str(config, "cardBg") },
      { type: "color", id: "border", label: "Card border", default: str(config, "border") },
      { type: "color", id: "heading_color", label: "Heading", default: str(config, "headingColor") },
      { type: "color", id: "q_color", label: "Question", default: str(config, "qColor") },
      { type: "color", id: "a_color", label: "Answer", default: str(config, "aColor") },
      { type: "range", id: "radius", label: "Corner radius", min: 0, max: 28, step: 2, unit: "px", default: num(config, "radius") },
      { type: "range", id: "gap", label: "Gap", min: 0, max: 20, step: 1, unit: "px", default: num(config, "gap") },
      { type: "range", id: "padding_y", label: "Section padding", min: 16, max: 96, step: 4, unit: "px", default: num(config, "paddingY") },
    ],
    blocks: [
      { type: "qa", name: "Question", settings: [
        { type: "text", id: "q", label: "Question" },
        { type: "textarea", id: "a", label: "Answer" },
      ] },
    ],
    presetBlocks: items.map((it) => ({
      type: "qa",
      settings: { q: esc(it.q ?? ""), a: esc(it.a ?? "") },
    })),
  });

  return section({ style, markup, schema });
}

export const faqAccordion: Tweak = {
  slug: "faq-accordion",
  name: "FAQ Accordion",
  tagline: "Clean expand-collapse FAQ that answers objections fast.",
  description:
    "A tidy accordion that handles shipping, returns and trust questions right on the page — fewer objections, fewer support tickets, more conversions. Exports as pure CSS using <details>, so it works even with JavaScript disabled.",
  category: "product-page",
  tier: "paid",
  price: 19,
  tint: "#f1eff4",
  Preview,
  generateLiquid,
  defaults,
  fields: [
    { key: "heading", label: "Heading", type: "text", group: "Content" },
    {
      key: "items",
      label: "Questions",
      type: "list",
      group: "Content",
      itemFields: [
        { key: "q", label: "Question", type: "text" },
        { key: "a", label: "Answer", type: "textarea" },
      ],
      newItem: { q: "New question?", a: "Your answer here." },
      addLabel: "Add question",
      max: 16,
    },
    { key: "openFirst", label: "Open first by default", type: "toggle", group: "Behavior" },
    fontField("Typography"),
    { key: "radius", label: "Corner radius", type: "slider", group: "Layout", min: 0, max: 28, step: 2, unit: "px" },
    { key: "gap", label: "Gap", type: "slider", group: "Layout", min: 0, max: 20, step: 1, unit: "px" },
    { key: "paddingY", label: "Section padding", type: "slider", group: "Layout", min: 16, max: 96, step: 4, unit: "px" },
    { key: "bg", label: "Background", type: "color", group: "Colors" },
    { key: "cardBg", label: "Card", type: "color", group: "Colors" },
    { key: "border", label: "Card border", type: "color", group: "Colors" },
    { key: "headingColor", label: "Heading", type: "color", group: "Colors" },
    { key: "qColor", label: "Question", type: "color", group: "Colors" },
    { key: "aColor", label: "Answer", type: "color", group: "Colors" },
  ],
};
