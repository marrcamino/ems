import { sql } from "drizzle-orm";
import {
  bigint,
  date,
  datetime,
  foreignKey,
  int,
  mysqlEnum,
  mysqlTable,
  unique,
  varchar,
} from "drizzle-orm/mysql-core";

// One month of the PENRO's water use, entered by GSU for the whole office, so
// there is no office column. A submitted month can still be corrected: nobody
// receives it yet (cards/water.md).
export const waterMonthlyReport = mysqlTable(
  "water_monthly_report",
  {
    waterMonthlyReportPk: bigint("water_monthly_report_pk", {
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
  (t) => [unique("wmr_report_month_unique").on(t.reportMonth)],
);

// The water used in a month, in whole cubic meters, as a water bill gives it.
// It has no date: it covers the whole month of its report. A month with more
// than one meter has one entry per meter, named in the note.
export const waterConsumption = mysqlTable(
  "water_consumption",
  {
    waterConsumptionPk: bigint("water_consumption_pk", {
      mode: "number",
      unsigned: true,
    })
      .primaryKey()
      .autoincrement(),
    waterMonthlyReportFk: bigint("water_monthly_report_fk", {
      mode: "number",
      unsigned: true,
    }).notNull(),
    cubicMeters: int("cubic_meters", { unsigned: true }).notNull(),
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
      name: "wc_water_monthly_report_fk",
      columns: [t.waterMonthlyReportFk],
      foreignColumns: [waterMonthlyReport.waterMonthlyReportPk],
    }).onDelete("restrict"),
  ],
);
