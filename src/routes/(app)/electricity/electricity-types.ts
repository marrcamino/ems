export type ElectricityStatus = "open" | "submitted";

/** The electricity used in a month, or by one meter in it. */
export type ElectricityUse = {
  usePk: number;
  kwh: number;
  note: string | null;
  /** The day it was typed in, `2026-11-05`. */
  enteredOn: string;
};

export type ElectricityReport = {
  status: ElectricityStatus;
  /** `2026-11-30`. */
  submittedOn: string | null;
  submittedBy: string | null;
};

/**
 * One month in the year list and on the summary. `status` is null before
 * anything is recorded; `kwh` is null when the month has no entry,
 * so a missing figure is never read as 0.
 */
export type ElectricityMonth = {
  month: string;
  status: ElectricityStatus | null;
  kwh: number | null;
};
