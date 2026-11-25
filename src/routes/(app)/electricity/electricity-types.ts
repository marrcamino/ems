export type ElectricityStatus = "open" | "submitted";

/** The electricity one building used in a month. */
export type ElectricityUse = {
  usePk: number;
  buildingPk: number;
  building: string;
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

/** A building on the Buildings page, with the number of entries for it. */
export type ElectricityBuilding = {
  buildingPk: number;
  name: string;
  status: "active" | "inactive";
  /** Its place in the order the buildings were added, which picks its colour. */
  order: number;
  entries: number;
};

/** A building the Add electricity use dialog can pick. */
export type BuildingOption = {
  buildingPk: number;
  name: string;
  status: "active" | "inactive";
};

/**
 * One building's line on the summary: its kWh for each month of the year,
 * null where it has no entry.
 */
export type BuildingYear = {
  buildingPk: number;
  name: string;
  order: number;
  kwh: (number | null)[];
};
