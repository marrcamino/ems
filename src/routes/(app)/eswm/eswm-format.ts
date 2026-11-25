import { LOCALE } from "$lib/utils/format-number.js";

// Made once and reused: building a formatter on every call is slow.
const kilosFormat = new Intl.NumberFormat(LOCALE, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const countFormat = new Intl.NumberFormat(LOCALE);

/** 61.5 → "61.50", so kilos in a column line up. */
export function formatKilos(kilos: number) {
  return kilosFormat.format(kilos);
}

/** 1234 → "1,234". */
export function formatCount(count: number) {
  return countFormat.format(count);
}

/** 1 and "sack", "sacks" → "1 sack"; 27 → "27 sacks". */
export function countOf(count: number, one: string, many: string) {
  return `${formatCount(count)} ${count === 1 ? one : many}`;
}
