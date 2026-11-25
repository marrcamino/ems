import type { PaperSize } from "$lib/paper-sizes";

/** One line of the office's paper form: paper taken on one day. */
export type PaperEntry = {
  entryPk: number;
  consumedOn: string;
  /** Only the sizes on the line. */
  reams: Partial<Record<PaperSize, number>>;
  /** The person picked, as a string for the picker; "" when typed. */
  receivedByPk: string;
  /** The picked person's name on that date, or the typed name. */
  receivedBy: string;
};

export type ReportStatus = "open" | "submitted" | "received";

export type PaperReport = {
  status: ReportStatus;
  /** `2026-11-30`. */
  submittedOn: string | null;
  submittedBy: string | null;
  /** The day the printed report reached GSU, `2026-12-02`. */
  receivedOn: string | null;
  receivedBy: string | null;
  /** The form's signature blocks, as chosen on submitting. */
  preparedBy: string | null;
  notedBy: string | null;
};

/** Someone who can sign the form, for the submit box. */
export type PaperSigner = {
  employeePk: number;
  name: string;
  positionTitle: string;
};

/** One size's line of the four summary rows on the office's form. */
export type PaperBalance = {
  paperSize: PaperSize;
  /** Left at the end of the month before. */
  forwarded: number;
  /** "New": given to the office by GSU during the month. */
  received: number;
  consumed: number;
  /** Left at the end of the month. */
  balance: number;
};

/** The reams the office typed as its first month's balance forwarded. */
export type PaperStart = {
  month: string;
  reams: Record<PaperSize, number>;
};

/** One month in the year list. `status` is null before any entry. */
export type YearMonth = {
  month: string;
  status: ReportStatus | null;
  reams: number;
};
