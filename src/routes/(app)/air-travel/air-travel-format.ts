import { LOCALE } from "$lib/utils/format-number.js";

const countFormat = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 0 });

/** 1234 → "1,234". */
export function formatCount(count: number) {
  return countFormat.format(count);
}

/** 1284 → "1,284 km". */
export function kmText(km: number) {
  return `${formatCount(km)} km`;
}

/** 1 and "flight", "flights" → "1 flight"; 4 → "4 flights". */
export function countOf(count: number, one: string, many: string) {
  return `${formatCount(count)} ${count === 1 ? one : many}`;
}

/** A round trip counts as two flights. */
export function legsOf(flight: { roundTrip: boolean }) {
  return flight.roundTrip ? 2 : 1;
}
