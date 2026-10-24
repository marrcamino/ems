/**
 * Liters and pesos for purchase orders, shared by the add PO dialog and the
 * server so the two always add up the same way.
 *
 * Everything is counted in whole hundredths: hundredths of a liter, and
 * centavos. Adding decimals directly goes wrong in JavaScript (0.1 + 0.2 is
 * 0.30000000000000004), and "the allocations add up exactly to the PO" has to be
 * an exact comparison, not a close one.
 */

export const FUELS = ["gasoline", "diesel"] as const;
export type Fuel = (typeof FUELS)[number];

/**
 * The largest quantity or unit cost a PO row takes: 999.99, which is 3
 * whole digits and 2 decimals, in hundredths. The add PO dialog stops the
 * typing there, and the server refuses anything larger.
 */
export const MAX_HUNDREDTHS = 99999;

export const FUEL_LABELS: Record<Fuel, string> = {
  gasoline: "Gasoline",
  diesel: "Diesel",
};

/**
 * A typed number as whole hundredths, or null when it is empty, negative,
 * not a number, or has more than 2 decimals.
 */
export function toHundredths(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n < 0) return null;
  const hundredths = Math.round(n * 100);
  // More than 2 decimals: 1.005 is not a liter amount anybody wrote down.
  if (Math.abs(n * 100 - hundredths) > 1e-6) return null;
  return hundredths;
}

/** Hundredths back to the decimal text that MySQL's DECIMAL(…, 2) takes. */
export function fromHundredths(hundredths: number) {
  return (hundredths / 100).toFixed(2);
}

/** Pesos for some liters at a unit cost, in centavos, rounded to the centavo. */
export function amountInCentavos(litersH: number, unitCostC: number) {
  return Math.round((litersH * unitCostC) / 100);
}

/**
 * The other way round: the liters a peso amount buys at a unit cost, in
 * hundredths of a liter, rounded to the nearest 0.01 L. Rounded, so those
 * liters may cost a few centavos more or less than the pesos given:
 * ₱100 at ₱65.50/L is 1.53 L, which costs ₱100.22.
 */
export function litersForPesos(centavos: number, unitCostC: number) {
  if (unitCostC <= 0) return 0;
  return Math.round((centavos * 100) / unitCostC);
}
