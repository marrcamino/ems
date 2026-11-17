/**
 * One RIS number as the RIS Numbers page lists it: one that GSU reserved for
 * a supply that is not fuel, or one that a fuel withdrawal took.
 */
export type RisRow = {
  /** The reservation's id; null for a fuel withdrawal's number. */
  id: number | null;
  /** In full, `2026-11-013`. */
  risNumber: string;
  /** When the number was given: the day it was reserved, or the withdrawal's file date. */
  date: string;
  /** What the RIS is for: as typed on a reservation, or the withdrawal's asset. */
  purpose: string;
  status: RisStatus;
  notUsedReason: string | null;
  /** Who reserved it, or who recorded the withdrawal. */
  reservedBy: string;
  /** The withdrawal's control number, in full; null on a reservation. */
  controlNumber: string | null;
  /** A cancelled withdrawal keeps its number (point 9.8 of "Recording a fuel issuance"). */
  cancelled: boolean;
};

/** A row with its number as the list shows it, without the year. */
export type ListRow = RisRow & { shortNumber: string };

export const RIS_STATUSES = ["reserved", "not_used", "fuel"] as const;
export type RisStatus = (typeof RIS_STATUSES)[number];

export const STATUS_LABELS: Record<RisStatus, string> = {
  reserved: "Reserved",
  not_used: "Not used",
  fuel: "Fuel withdrawal",
};

/** Blue, the destructive colour, and gray. */
export const STATUS_BADGE: Record<RisStatus, string> = {
  reserved: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
  not_used: "bg-destructive/10 text-destructive dark:bg-destructive/20",
  fuel: "bg-secondary text-secondary-foreground",
};

/**
 * The Remarks column: why a reservation was not used, or that the withdrawal
 * which took the number was cancelled. Empty for the rest.
 */
export function remarksOf(row: RisRow) {
  if (row.notUsedReason) return row.notUsedReason;
  if (row.cancelled) return "Withdrawal cancelled";
  return "";
}

/** Keep equal to the columns' lengths in ris-reservation.ts. */
export const PURPOSE_MAX = 200;
export const REASON_MAX = 200;

/**
 * A number's place in the sequence, for sorting. As text, `11-1000` would
 * come before `11-200`.
 */
export function risOrder(risNumber: string) {
  const [year, , running] = risNumber.split("-").map(Number);
  return year * 100_000 + running;
}

/**
 * Why a reservation cannot be deleted: a newer number of its year was given
 * out after it. Only the newest can go, because deleting it takes the count
 * back by one and leaves no gap (decided by the owner, 17 November 2026).
 * The screen and the server share it; `newer` is the number as the list
 * shows it.
 */
export function notNewestMessage(newer: string) {
  return `RIS ${newer} was given out after it, and only the newest number can be deleted. Mark this one not used instead.`;
}

/** The newest number of the same year as `risNumber`, if it is newer. */
export function newerThan(risNumber: string, all: string[]) {
  const year = risNumber.slice(0, 4);
  let newest = risNumber;
  for (const other of all) {
    if (other.startsWith(year) && risOrder(other) > risOrder(newest)) {
      newest = other;
    }
  }
  return newest === risNumber ? null : newest;
}

/** The newest not-used number, which the next RIS takes again with its own month. */
export type Reusable = {
  /** The reservation that is deleted when the number is taken. */
  id: number;
  /** The number it would get, as the list shows it, and the next new one. */
  again: string;
  instead: string;
  reason: string | null;
};
