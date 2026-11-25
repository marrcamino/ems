export type AirTravelStatus = "open" | "submitted";

/** A person on a flight, as named on the flight date. */
export type Traveller = {
  /** `employee.employee_pk`, so the picker can show who is picked. */
  employeePk: number;
  name: string;
};

/** One person's flight, from one airport to the next, or there and back. */
export type Flight = {
  flightPk: number;
  /** `2026-11-10`. */
  flownOn: string;
  travelOrderNo: string;
  /** As typed, such as "Butuan". */
  fromPlace: string;
  toPlace: string;
  /** The flight back too: it counts as a second flight. */
  roundTrip: boolean;
  destination: string | null;
  note: string | null;
  /** One way, as typed. */
  km: number;
  traveller: Traveller;
};

export type AirTravelReport = {
  status: AirTravelStatus;
  /** `2026-11-30`. */
  submittedOn: string | null;
  submittedBy: string | null;
};

/**
 * One month in the year list and on the summary. `status` is null before
 * anything is recorded. A round trip counts as two flights, and its km both
 * ways.
 */
export type AirTravelMonth = {
  month: string;
  status: AirTravelStatus | null;
  flights: number;
  km: number;
};

/** An active staff member, for the traveller picker. */
export type StaffOption = {
  employeePk: number;
  name: string;
  position: string;
};

export type RouteStatus = "active" | "inactive";

/** A route on the Routes page; `flights` counts the flights that use it. */
export type AirTravelRoute = {
  routePk: number;
  placeA: string;
  placeB: string;
  /** Whole km, one way. */
  distanceKm: number;
  source: string | null;
  status: RouteStatus;
  flights: number;
};

/** A route that the flight dialog can use, in either direction. */
export type RouteOption = {
  placeA: string;
  placeB: string;
  distanceKm: number;
};
