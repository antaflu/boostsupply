import type { ComponentType } from "react";

/* ============================================================
   Config field schema
   Each tweak declares a list of fields. The editor renders a
   control per field; the value lives in a flat config object.
   ============================================================ */

export type FieldType =
  | "text"
  | "textarea"
  | "color"
  | "slider"
  | "select"
  | "toggle"
  | "font"
  | "icon"
  | "list";

export interface FieldBase {
  /** Key into the config object */
  key: string;
  label: string;
  type: FieldType;
  /** Section heading in the editor sidebar */
  group: string;
  hint?: string;
}

export interface TextField extends FieldBase {
  type: "text" | "textarea";
  placeholder?: string;
}

export interface ColorField extends FieldBase {
  type: "color";
  /** allow "transparent" / alpha */
  allowAlpha?: boolean;
}

export interface SliderField extends FieldBase {
  type: "slider";
  min: number;
  max: number;
  step?: number;
  unit?: string;
}

export interface SelectField extends FieldBase {
  type: "select";
  options: { label: string; value: string }[];
}

export interface ToggleField extends FieldBase {
  type: "toggle";
}

export interface FontField extends FieldBase {
  type: "font";
}

export interface IconField extends FieldBase {
  type: "icon";
}

/** A repeatable list of sub-records (e.g. ticker messages, USPs, reviews). */
export interface ListField extends FieldBase {
  type: "list";
  /** schema for a single item */
  itemFields: {
    key: string;
    label: string;
    type: "text" | "textarea" | "icon";
  }[];
  /** default item when adding a new row */
  newItem: Record<string, string>;
  addLabel?: string;
  max?: number;
}

export type Field =
  | TextField
  | ColorField
  | SliderField
  | SelectField
  | ToggleField
  | FontField
  | IconField
  | ListField;

/* ============================================================
   Config value bag
   ============================================================ */

export type ConfigValue =
  | string
  | number
  | boolean
  | Record<string, string>[];

export type TweakConfig = Record<string, ConfigValue>;

/* ============================================================
   Categories & tiers
   ============================================================ */

export type CategoryId =
  | "announcement"
  | "social-proof"
  | "product-page"
  | "cart"
  | "homepage"
  | "urgency";

export interface Category {
  id: CategoryId;
  label: string;
  /** short helper line shown under the label in the sidebar */
  blurb: string;
}

export type Tier = "free" | "paid";

/* ============================================================
   The Tweak definition
   ============================================================ */

export interface Tweak {
  slug: string;
  name: string;
  /** one-line pitch shown on the card */
  tagline: string;
  /** longer description on the editor page */
  description: string;
  category: CategoryId;
  tier: Tier;
  /** USD, one-time. undefined for free */
  price?: number;
  /** soft tint behind the card preview, e.g. "#eef1ff" */
  tint: string;
  fields: Field[];
  defaults: TweakConfig;
  /** Live React preview. Receives the current config. */
  Preview: ComponentType<{ config: TweakConfig }>;
  /** Pure function: config -> Shopify Liquid section code */
  generateLiquid: (config: TweakConfig) => string;
}
