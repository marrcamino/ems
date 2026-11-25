export type EswmStatus = "open" | "submitted";

/** The garbage collected at one cleanup drive. */
export type CleanupDrive = {
  drivePk: number;
  heldOn: string;
  activity: string;
  place: string;
  participants: number | null;
  sacks: number;
  kilos: number;
};

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
  kilos: number;
};

/** One month of the year on the summary page. */
export type SummaryMonth = {
  month: string;
  status: EswmStatus | null;
  activities: number;
  /** Null when no entry in the month has a number of participants. */
  participants: number | null;
  sacks: number;
  kilos: number;
};
