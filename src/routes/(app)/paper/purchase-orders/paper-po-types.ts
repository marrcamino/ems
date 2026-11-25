import type { PaperSize } from "$lib/paper-sizes";

/** The most reams of one size on a PO, or given to one office: 4 digits. */
export const MAX_REAMS = 9999;

/** An office that can be given paper. */
export type OfficeOption = {
  orgUnitPk: number;
  orgUnitName: string;
  abbr: string;
};

/** A paper PO as the list on the page shows it. */
export type PaperPoRow = {
  paperPurchaseOrderPk: number;
  poNumber: string;
  poDate: string;
  /** Null only on a PO typed before suppliers were shared. */
  supplierFk: number | null;
  supplierName: string | null;
  remarks: string | null;
  /** One per size on the PO, in the order of PAPER_SIZES. */
  items: {
    paperSize: PaperSize;
    reams: number;
    /** The PO's "Stock/Property No.", written for paper in the stock room. */
    stockNumber: string | null;
  }[];
  /** Each office given paper from this PO, in the order they were typed. */
  distributions: (OfficeOption & {
    /** The office's share of each size: what the PO allocates to it. */
    reams: Partial<Record<PaperSize, number>>;
    /** Of that share, what GSU has handed over so far. */
    handed: Partial<Record<PaperSize, number>>;
    /** Each hand-over, oldest first. */
    handovers: {
      handedOn: string;
      reams: Partial<Record<PaperSize, number>>;
    }[];
  })[];
};

/** Reams of each size GSU still holds for an office: its share less what it was handed. */
export function heldFor(d: PaperPoRow["distributions"][number]) {
  return Object.fromEntries(
    Object.entries(d.reams).map(([size, reams]) => [
      size,
      (reams ?? 0) - (d.handed[size as PaperSize] ?? 0),
    ]),
  ) as Partial<Record<PaperSize, number>>;
}
