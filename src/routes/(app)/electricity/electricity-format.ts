import { LOCALE } from "$lib/utils/format-number.js";

const wholeFormat = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 0 });

/** 1234 → "1,234". */
export function formatKwh(kwh: number) {
  return wholeFormat.format(kwh);
}

/** 1284 → "1,284 kWh". */
export function kwhText(kwh: number) {
  return `${formatKwh(kwh)} kWh`;
}

/**
 * The colour of each building on the Summary, by the order it was added, so
 * it never changes. The dataviz skill's checked colours for light and dark
 * mode, in their fixed order; a ninth building and after share a grey.
 */
const BUILDING_COLOURS = [
  ["#2a78d6", "#3987e5"],
  ["#eb6834", "#d95926"],
  ["#1baf7a", "#199e70"],
  ["#eda100", "#c98500"],
  ["#e87ba4", "#d55181"],
  ["#008300", "#0ca30c"],
  ["#6250d6", "#9085e9"],
  ["#e34948", "#e66767"],
] as const;
const OTHER_COLOUR = ["#8a8a85", "#6f6f6a"] as const;

/** Sets `--light` and `--dark` for `bg-(--light) dark:bg-(--dark)`. */
export function buildingColour(order: number) {
  const [light, dark] = BUILDING_COLOURS[order] ?? OTHER_COLOUR;
  return `--light: ${light}; --dark: ${dark}`;
}
