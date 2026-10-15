import type { Fuel } from "./po-math";

/** A division, section, unit or office that can be given an allocation. */
export type UnitOption = {
  orgUnitPk: number;
  orgUnitName: string;
  abbr: string | null;
  level: "office" | "division" | "section" | "unit";
};

/**
 * A PO as the list on the page shows it. Liters and unit cost arrive as
 * whole hundredths (see po-math.ts), so the page can add them up exactly.
 */
export type PurchaseOrderRow = {
  purchaseOrderPk: number;
  poNumber: string;
  poDate: string;
  supplierName: string;
  note: string | null;
  items: { fuelType: Fuel; litersH: number; unitCostC: number }[];
};
