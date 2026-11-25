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
