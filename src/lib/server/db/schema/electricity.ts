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

// One month of the PENRO's electricity use, entered by GSU for the whole office, so
// there is no office column. A submitted month can still be corrected: nobody
// receives it yet (cards/electricity.md).
export const electricityMonthlyReport = mysqlTable(
  "electricity_monthly_report",
  {
    electricityMonthlyReportPk: bigint("electricity_monthly_report_pk", {
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
    // constraint, the same as `water_monthly_report.submitted_by_fk`.
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
  (t) => [unique("elmr_report_month_unique").on(t.reportMonth)],
);

// A building whose electricity is recorded on its own, as the office's
// workbook does (PENRO DI Office, Nursery, Watch Tower, Info Center). Kept on
// the Buildings page; never deleted, only made inactive, because entries
// point at it.
export const electricityBuilding = mysqlTable(
  "electricity_building",
  {
    electricityBuildingPk: bigint("electricity_building_pk", {
      mode: "number",
      unsigned: true,
    })
      .primaryKey()
      .autoincrement(),
    name: varchar("name", { length: 100 }).notNull(),
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
  (t) => [unique("elb_name_unique").on(t.name)],
);

// The electricity one building used in a month, in whole kWh, as a bill
// gives it. It has no date: it covers the whole month of its report. One
// entry per building in a month.
export const electricityConsumption = mysqlTable(
  "electricity_consumption",
  {
    electricityConsumptionPk: bigint("electricity_consumption_pk", {
      mode: "number",
      unsigned: true,
    })
      .primaryKey()
      .autoincrement(),
    electricityMonthlyReportFk: bigint("electricity_monthly_report_fk", {
      mode: "number",
      unsigned: true,
    }).notNull(),
    electricityBuildingFk: bigint("electricity_building_fk", {
      mode: "number",
      unsigned: true,
    }).notNull(),
    kwh: int("kwh", { unsigned: true }).notNull(),
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
      name: "elc_electricity_monthly_report_fk",
      columns: [t.electricityMonthlyReportFk],
      foreignColumns: [electricityMonthlyReport.electricityMonthlyReportPk],
    }).onDelete("restrict"),
    foreignKey({
      name: "elc_electricity_building_fk",
      columns: [t.electricityBuildingFk],
      foreignColumns: [electricityBuilding.electricityBuildingPk],
    }).onDelete("restrict"),
    unique("elc_month_building_unique").on(
      t.electricityMonthlyReportFk,
      t.electricityBuildingFk,
    ),
  ],
);
