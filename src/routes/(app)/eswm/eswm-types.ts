import type { MonthWaste } from "./eswm-waste";

export type EswmStatus = "open" | "submitted";

export type EswmReport = {
  status: EswmStatus;
  /** `2026-11-30`. */
  submittedOn: string | null;
  submittedBy: string | null;
};

/** One month in the year list. `status` is null before anything is recorded. */
export type EswmYearMonth = {
  month: string;
  status: EswmStatus | null;
  /** Null when nothing was weighed in the month. */
  kilos: number | null;
};

/** One month of the year on the summary page. */
export type SummaryMonth = {
  month: string;
  status: EswmStatus | null;
  waste: MonthWaste;
};
