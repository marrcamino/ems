import type { Fuel } from "./po-math";

/**
 * Made-up parts of the Purchase Orders page, copied from the approved design
 * (layout 2a of "Purchase Orders Page" in Claude Design, 21 October 2026).
 * The open POs come from the database; these stay made up until withdrawal
 * slips and closing a PO exist.
 *
 * Amounts are in centavos and liters in hundredths, as in po-math.ts.
 */

export type SampleSlipOut = {
  unit: string;
  fuel: Fuel;
  litersH: number;
  requestedOn: string;
};

export type SampleClosedPo = {
  poNumber: string;
  poDate: string;
  supplierName: string;
  amountC: number;
  closedOn: string;
};

/** Shown on every open PO's card for now. */
export const SAMPLE_SLIPS_OUT: SampleSlipOut[] = [
  { unit: "CDS", fuel: "diesel", litersH: 2000, requestedOn: "2026-10-14" },
];

/** Newest first. The design shows 3 of 11. */
export const SAMPLE_CLOSED_POS: SampleClosedPo[] = [
  { poNumber: "2025-11-04", poDate: "2025-11-04", supplierName: "Island Fuel Station", amountC: 1598000, closedOn: "2026-01-22" },
  { poNumber: "2025-08-19", poDate: "2025-08-19", supplierName: "Island Fuel Station", amountC: 1430000, closedOn: "2025-11-10" },
  { poNumber: "2025-05-02", poDate: "2025-05-02", supplierName: "Island Fuel Station", amountC: 1395000, closedOn: "2025-08-12" },
];

export const SAMPLE_CLOSED_COUNT = 11;
