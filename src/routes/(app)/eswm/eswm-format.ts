import { LOCALE } from "$lib/utils/format-number.js";

// Made once and reused: building a formatter on every call is slow.
const kilosFormat = new Intl.NumberFormat(LOCALE, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** 61.5 → "61.50", so kilos in a column line up. */
export function formatKilos(kilos: number) {
  return kilosFormat.format(kilos);
}
