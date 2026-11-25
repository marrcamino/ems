export type WaterStatus = "open" | "submitted";

/** The water used in a month, or by one meter in it. */
export type WaterUse = {
  usePk: number;
  cubicMeters: number;
  note: string | null;
  /** The day it was typed in, `2026-11-05`. */
  enteredOn: string;
};

export type WaterReport = {
  status: WaterStatus;
  /** `2026-11-30`. */
  submittedOn: string | null;
  submittedBy: string | null;
};

/**
 * One month in the year list and on the summary. `status` is null before
 * anything is recorded; `cubicMeters` is null when the month has no entry,
 * so a missing figure is never read as 0.
 */
export type WaterMonth = {
  month: string;
  status: WaterStatus | null;
  cubicMeters: number | null;
};
