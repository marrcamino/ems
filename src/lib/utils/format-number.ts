/**
 * Pesos and liters as they read on screen: commas between thousands and the
 * right number of decimals. Shared by every page and by the server, so an
 * amount reads the same in a table, a dialog and an error message.
 *
 * Every function takes whole hundredths (centavos, or hundredths of a liter),
 * the way the fuel code counts. A DECIMAL column from MySQL arrives as text
 * like "1234.50"; turn it into hundredths first (`toHundredths` in
 * po-math.ts), so that no caller passes pesos where centavos are expected.
 */

/** The locale every number on screen is written in. */
export const LOCALE = "en-PH";

/**
 * How pesos are written: ₱1,234.50, always 2 decimals. Exported for
 * NumberFlow, which takes the options rather than a function, so its animated
 * amounts match the plain ones.
 */
export const PESO_FORMAT: Intl.NumberFormatOptions = {
  style: "currency",
  currency: "PHP",
};

// Made once here and reused: building a formatter on every call is slow.
const pesoFormat = new Intl.NumberFormat(LOCALE, PESO_FORMAT);

const litersFormat = new Intl.NumberFormat(LOCALE, {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

/** 123450 → "₱1,234.50". */
export function formatPesos(centavos: number) {
  return pesoFormat.format(centavos / 100);
}

/** 350000 → "3,500 L", 350050 → "3,500.5 L". */
export function formatLiters(hundredths: number) {
  return `${litersFormat.format(hundredths / 100)} L`;
}
