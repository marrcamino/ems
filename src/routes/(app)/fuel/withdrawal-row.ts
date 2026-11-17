import { formatLiters, formatPesos } from "$lib/utils/format-number";
import { FUEL_LABELS, type Fuel, type PoType } from "./purchase-orders/po-math";
import type { WithdrawalStatus } from "./withdrawal-status";

/**
 * Which kind of transaction a row is (point 1 of "Recording a fuel
 * issuance"): a withdrawal, a trip only with no fuel taken, or a reimbursed
 * trip, where the driver bought the fuel during the trip.
 */
export type TransactionKind = "withdrawal" | "trip" | "reimbursed";

/**
 * One row of the Fuel page's list, as the server works it out from
 * `fuel_issuance`. Liters are in hundredths and amounts in centavos, as in
 * po-math.ts.
 */
export type WithdrawalRow = {
  id: number;
  fileDate: string;
  /** The office's short name. */
  office: string;
  kind: TransactionKind;
  /** The transaction's own number, one count across every office. */
  controlNumber: string;
  /**
   * The office's own count for the year, trips and cancelled ones included,
   * in the order of entry. Worked out for the list, never saved (point 8).
   */
  officeCount: number;
  wsNumber: string | null;
  risNumber: string | null;
  status: WithdrawalStatus;
  /** The liters asked for; null when the slip asks for pesos. */
  requestedH: number | null;
  /** The pesos asked for, on a price-based PO only. */
  requestedC: number | null;
  /** The liters the supplier pumped; null until the slip is back. */
  withdrawnH: number | null;
  /** The liters on the DTT's "purchased during trip" line. */
  boughtH: number | null;
  /**
   * The pump price of a slip that is back. For any other slip, the price
   * used to estimate its balance. Null on a trip.
   */
  priceC: number | null;
  /** Null until the slip is back. */
  amountC: number | null;
  /**
   * The pesos left of the office's allocation of this fuel on this PO after
   * this slip. Null on a trip, which counts down nothing.
   */
  balanceC: number | null;
  /** What `balanceC` buys at `priceC`. Exact only on a liter-based PO. */
  balanceH: number | null;
  poNumber: string | null;
  poType: PoType | null;
  fuel: Fuel;
  asset: string;
  tripTicketNumber: string | null;
  driver: string | null;
  remarks: string;
};

/** One PO where an office still has some of a fuel, with what is left. */
export type PoBalance = {
  purchaseOrderPk: number;
  orgUnitPk: number;
  fuel: Fuel;
  poNumber: string;
  /** "2026-10-06" */
  poDate: string;
  poType: PoType;
  supplierName: string;
  /**
   * The price a request is worked out at. Until the Complete step records
   * pump prices, it is the PO's unit cost (see priceOf in issuance.server).
   */
  priceC: number;
  balanceC: number;
  balanceH: number;
};

/**
 * Why a newer PO is refused: the office's fuel on an older PO is used up
 * first (point 11 of "How the office handles fuel today"). The form shows
 * the same words.
 */
export function oldestPoFirstMessage(oldest: PoBalance, officeAbbr: string) {
  const left =
    oldest.poType === "liter"
      ? formatLiters(oldest.balanceH)
      : formatPesos(oldest.balanceC);
  const fuelName = FUEL_LABELS[oldest.fuel].toLowerCase();
  return `Use PO ${oldest.poNumber} first. ${officeAbbr} still has ${left} of ${fuelName} on it.`;
}

/**
 * What an office has left on a PO, as text. A price-based PO shows pesos with
 * the liters they come to at the last known price; a liter-based one shows
 * liters only.
 */
export const leftOn = (b: PoBalance) =>
  b.poType === "price"
    ? `${formatPesos(b.balanceC)} (≈ ${formatLiters(b.balanceH)})`
    : formatLiters(b.balanceH);

/**
 * Why a request above the balance is refused, or null when it fits (point 3
 * of "How POs and withdrawal slips work"). Pesos are compared with the pesos
 * left, liters with the liters left: exact on a liter-based PO, an estimate
 * on a price-based one, where more is asked for in pesos. The form shows the
 * same words.
 */
export function overBalanceMessage(
  b: PoBalance,
  request: { requestedH: number | null; requestedC: number | null },
) {
  if (request.requestedC !== null) {
    if (request.requestedC <= b.balanceC) return null;
    return `Enter ${formatPesos(b.balanceC)} or less. That is what is left on PO ${b.poNumber}.`;
  }
  if ((request.requestedH ?? 0) <= b.balanceH) return null;
  return b.poType === "price"
    ? `Enter ${formatLiters(b.balanceH)} or less, about what is left on PO ${b.poNumber} at the last known price. To ask for more, request it in pesos.`
    : `Enter ${formatLiters(b.balanceH)} or less. That is what is left on PO ${b.poNumber}.`;
}
