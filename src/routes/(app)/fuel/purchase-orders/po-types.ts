import type { Fuel, PoType } from "./po-math";

/** A division, section, unit or office that can be given an allocation. */
export type UnitOption = {
  orgUnitPk: number;
  orgUnitName: string;
  abbr: string;
  level: "office" | "division" | "section" | "unit";
};

/** A withdrawal on a PO whose slip is not back from the gas station yet. */
export type SlipOut = {
  office: string;
  fuel: Fuel;
  /** One of the two, as requested: liters, or pesos on a price-based PO. */
  requestedH: number | null;
  requestedC: number | null;
  fileDate: string;
};

/**
 * A PO as the list on the page shows it. Liters and unit cost arrive as
 * whole hundredths (see po-math.ts), so the page can add them up exactly.
 */
export type PurchaseOrderRow = {
  purchaseOrderPk: number;
  poNumber: string;
  poDate: string;
  poType: PoType;
  supplierFk: number;
  supplierName: string;
  note: string | null;
  /** ISO date and time it was closed; null while it is open. */
  closedAt: string | null;
  items: {
    fuelType: Fuel;
    litersH: number;
    unitCostC: number;
    /**
     * Each unit's allocation of this fuel, in the order they were typed,
     * with what its withdrawals have used, in centavos.
     */
    allocations: (UnitOption & { litersH: number; usedC: number })[];
  }[];
  /** Oldest first. */
  slipsOut: SlipOut[];
  /** Withdrawals completed without their trip ticket's tank lines. */
  slipsIncomplete: SlipOut[];
};
