import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  date,
  datetime,
  foreignKey,
  int,
  mysqlEnum,
  mysqlTable,
  unique,
  varchar,
} from "drizzle-orm/mysql-core";
import { employeeHistory } from "./employee-history";

// One month of the staff's flights on official business, entered by the
// Finance office for the whole PENRO, so there is no office column. A
// submitted month can still be corrected: nobody receives it yet
// (cards/air-travel.md).
export const airTravelMonthlyReport = mysqlTable(
  "air_travel_monthly_report",
  {
    airTravelMonthlyReportPk: bigint("air_travel_monthly_report_pk", {
      mode: "number",
      unsigned: true,
    })
      .primaryKey()
      .autoincrement(),
    // Always the first day of the month, `2026-10-01`.
    reportMonth: date("report_month", { mode: "string" }).notNull(),
    status: mysqlEnum("status", ["open", "submitted"])
      .notNull()
      .default("open"),
    submittedAt: datetime("submitted_at"),
    // Semantic FK name: points at `user.user_pk`, who submitted it. No
    // constraint, the same as `eswm_monthly_report.submitted_by_fk`.
    submittedByFk: bigint("submitted_by_fk", {
      mode: "number",
      unsigned: true,
    }),
    createdAt: datetime("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: datetime("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (t) => [unique("atmr_report_month_unique").on(t.reportMonth)],
);

// A route the office flies, with its distance, kept on the Routes page by
// whoever records the flights, so every flight on it has the same checked
// figure. Both directions are one route: the places are stored in
// alphabetical order. Never deleted, only made inactive, because flights
// point at it.
export const airTravelRoute = mysqlTable(
  "air_travel_route",
  {
    airTravelRoutePk: bigint("air_travel_route_pk", {
      mode: "number",
      unsigned: true,
    })
      .primaryKey()
      .autoincrement(),
    placeA: varchar("place_a", { length: 100 }).notNull(),
    placeB: varchar("place_b", { length: 100 }).notNull(),
    // Whole km, one way.
    distanceKm: int("distance_km", { unsigned: true }).notNull(),
    // Where the distance came from, so anyone can check it.
    source: varchar("source", { length: 150 }),
    status: mysqlEnum("status", ["active", "inactive"])
      .notNull()
      .default("active"),
    // Semantic FK name: points at `user.user_pk`, who added it.
    createdByFk: bigint("created_by_fk", { mode: "number", unsigned: true }),
    createdAt: datetime("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: datetime("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (t) => [unique("atr_route_unique").on(t.placeA, t.placeB)],
);

// One person's flight, from one place to the next, or there and back with
// `round_trip`: a trip through Cebu is two flights, because the GHG methods
// count each one on its own.
export const airTravelFlight = mysqlTable(
  "air_travel_flight",
  {
    airTravelFlightPk: bigint("air_travel_flight_pk", {
      mode: "number",
      unsigned: true,
    })
      .primaryKey()
      .autoincrement(),
    airTravelMonthlyReportFk: bigint("air_travel_monthly_report_fk", {
      mode: "number",
      unsigned: true,
    }).notNull(),
    // Always inside the month of its report.
    flownOn: date("flown_on", { mode: "string" }).notNull(),
    // Semantic FK name: points at `employee_history.employee_history_pk`, the
    // version of the person's name valid on the flight date, as
    // `fuel_issuance.driver_fk` does, so a later name change does not rewrite
    // the flight. It counts in `countDocumentsUsingVersions`.
    travellerFk: bigint("traveller_fk", {
      mode: "number",
      unsigned: true,
    }).notNull(),
    // Each staff member has a travel order of their own (owner, 25 November
    // 2026), such as "PDI 2025-02-03012". Not unique: one order covers every
    // flight of the person's trip.
    travelOrderNo: varchar("travel_order_no", { length: 50 }).notNull(),
    airTravelRouteFk: bigint("air_travel_route_fk", {
      mode: "number",
      unsigned: true,
    }).notNull(),
    // The route's places in the direction flown, and its distance (km, one
    // way) on the day the flight was saved: a later correction to the route
    // does not change a month already submitted. A round trip counts the
    // distance twice.
    fromPlace: varchar("from_place", { length: 100 }).notNull(),
    toPlace: varchar("to_place", { length: 100 }).notNull(),
    distanceKm: int("distance_km", { unsigned: true }).notNull(),
    // The flight back too, as Finance's "vice versa" tick: it counts as a
    // second flight, under the same month.
    roundTrip: boolean("round_trip").notNull().default(false),
    // The office or event visited, such as "DENR Central Office".
    destination: varchar("destination", { length: 150 }),
    note: varchar("note", { length: 200 }),
    // Semantic FK name: points at `user.user_pk`, who typed it.
    createdByFk: bigint("created_by_fk", { mode: "number", unsigned: true }),
    createdAt: datetime("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: datetime("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (t) => [
    foreignKey({
      name: "atf_air_travel_monthly_report_fk",
      columns: [t.airTravelMonthlyReportFk],
      foreignColumns: [airTravelMonthlyReport.airTravelMonthlyReportPk],
    }).onDelete("restrict"),
    foreignKey({
      name: "atf_air_travel_route_fk",
      columns: [t.airTravelRouteFk],
      foreignColumns: [airTravelRoute.airTravelRoutePk],
    }).onDelete("restrict"),
    foreignKey({
      name: "atf_traveller_fk",
      columns: [t.travellerFk],
      foreignColumns: [employeeHistory.employeeHistoryPk],
    }).onDelete("restrict"),
  ],
);
