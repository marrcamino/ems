import { LOCALE } from "$lib/utils/format-number.js";

const wholeFormat = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 0 });

/** 1234 → "1,234". */
export function formatCubicMeters(cubicMeters: number) {
  return wholeFormat.format(cubicMeters);
}

/** 41 → "41 m³". */
export function cubicMeters(cubicMeters: number) {
  return `${formatCubicMeters(cubicMeters)} m³`;
}
