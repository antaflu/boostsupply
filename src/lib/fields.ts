import type { FontField, SelectField } from "./types";

export const FONT_OPTIONS = [
  { label: "Theme default", value: "inherit" },
  { label: "System sans", value: "system" },
  { label: "Serif", value: "serif" },
  { label: "Monospace", value: "mono" },
  { label: "Rounded", value: "rounded" },
  { label: "Custom upload…", value: "custom" },
];

export const fontField = (
  group: string,
  key = "font",
  label = "Font",
): FontField => ({
  key,
  label,
  type: "font",
  group,
});

export const weightField = (group: string, key = "weight"): SelectField => ({
  key,
  label: "Weight",
  type: "select",
  group,
  options: [
    { label: "Regular", value: "400" },
    { label: "Medium", value: "500" },
    { label: "Semibold", value: "600" },
    { label: "Bold", value: "700" },
    { label: "Extrabold", value: "800" },
  ],
});
