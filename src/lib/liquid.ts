/* ============================================================
   Helpers for generating real Shopify section files.

   Output = self-contained <style> + markup that reads from
   {{ section.settings.* }} and {% for block in section.blocks %},
   followed by a {% schema %} whose defaults equal the values the
   user configured in the visual editor. That means: paste it in,
   add the section, and it already looks exactly like the preview —
   and the merchant can still fine-tune it in the theme editor.
   ============================================================ */

type SchemaSetting =
  | { type: "header"; content: string }
  | { type: "text"; id: string; label: string; default?: string }
  | { type: "textarea"; id: string; label: string; default?: string }
  | { type: "html"; id: string; label: string; default?: string }
  | { type: "richtext"; id: string; label: string; default?: string }
  | { type: "url"; id: string; label: string; default?: string }
  | { type: "color"; id: string; label: string; default?: string }
  | {
      type: "range";
      id: string;
      label: string;
      min: number;
      max: number;
      step: number;
      unit?: string;
      default?: number;
    }
  | { type: "checkbox"; id: string; label: string; default?: boolean }
  | { type: "product_list"; id: string; label: string; limit?: number; info?: string }
  | { type: "image_picker"; id: string; label: string; info?: string }
  | { type: "product"; id: string; label: string; info?: string }
  | { type: "collection"; id: string; label: string; info?: string }
  | { type: "number"; id: string; label: string; default?: number; info?: string }
  | {
      type: "select";
      id: string;
      label: string;
      options: { value: string; label: string }[];
      default?: string;
    };

interface BlockDef {
  type: string;
  name: string;
  settings: SchemaSetting[];
}

interface PresetBlock {
  type: string;
  settings: Record<string, string | number | boolean>;
}

export interface SchemaSpec {
  name: string;
  tag?: string;
  class?: string;
  settings: SchemaSetting[];
  blocks?: BlockDef[];
  /** preset blocks (the user's list items, baked as defaults) */
  presetBlocks?: PresetBlock[];
  maxBlocks?: number;
}

export function buildSchema(spec: SchemaSpec): string {
  const schema: Record<string, unknown> = {
    name: spec.name,
    tag: spec.tag ?? "section",
    class: spec.class ?? "shopify-section",
    settings: spec.settings,
  };
  if (spec.blocks) schema.blocks = spec.blocks;
  if (spec.maxBlocks) schema.max_blocks = spec.maxBlocks;
  schema.presets = [
    {
      name: spec.name,
      ...(spec.presetBlocks ? { blocks: spec.presetBlocks } : {}),
    },
  ];
  return `{% schema %}\n${JSON.stringify(schema, null, 2)}\n{% endschema %}`;
}

/** Wrap markup + style + schema into one section file. */
export function section(parts: {
  style: string;
  markup: string;
  schema: string;
}): string {
  return `${parts.style.trim()}\n\n${parts.markup.trim()}\n\n${parts.schema}\n`;
}

/** Produce a @font-face note + family for the chosen font. */
export function fontFaceFor(font: string): { face: string; family: string } {
  if (font === "custom") {
    return {
      face: `  {%- comment -%} Upload your font to Settings → Files, then replace the URL below {%- endcomment -%}
  @font-face {
    font-family: 'Brand Font';
    src: url('YOUR_FONT_URL.woff2') format('woff2');
    font-display: swap;
  }`,
      family: "'Brand Font', sans-serif",
    };
  }
  const map: Record<string, string> = {
    inherit: "inherit",
    system: "-apple-system, BlinkMacSystemFont, system-ui, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    mono: "'SF Mono', ui-monospace, monospace",
    rounded: "ui-rounded, 'SF Pro Rounded', sans-serif",
  };
  return { face: "", family: map[font] ?? "inherit" };
}
