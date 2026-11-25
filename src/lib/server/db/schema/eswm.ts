import { sql } from "drizzle-orm";
import {
  bigint,
  date,
  datetime,
  decimal,
  foreignKey,
  int,
  mysqlEnum,
  mysqlTable,
  unique,
  varchar,
} from "drizzle-orm/mysql-core";

// One month of the PENRO's ESWM record, entered by the ESWM Focal Person for
// the whole office, so there is no office column. A submitted month can still
// be corrected: nobody receives it yet (cards/eswm.md).
export const eswmMonthlyReport = mysqlTable(
  "eswm_monthly_report",
  {
    eswmMonthlyReportPk: bigint("eswm_monthly_report_pk", {
      mode: "number",
      unsigned: true,
    })
      .primaryKey()
      .autoincrement(),
    // Always the first day of the month, `2026-11-01`.
    reportMonth: date("report_month", { mode: "string" }).notNull(),
    status: mysqlEnum("status", ["open", "submitted"])
      .notNull()
      .default("open"),
    submittedAt: datetime("submitted_at"),
    // Semantic FK name: points at `user.user_pk`, who submitted it. No
    // constraint, the same as `paper_monthly_report.submitted_by_fk`.
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
  (t) => [unique("emr_report_month_unique").on(t.reportMonth)],
);

// The garbage collected at one cleanup drive: the sacks and their weight.
export const eswmCleanupDrive = mysqlTable(
  "eswm_cleanup_drive",
  {
    eswmCleanupDrivePk: bigint("eswm_cleanup_drive_pk", {
      mode: "number",
      unsigned: true,
    })
      .primaryKey()
      .autoincrement(),
    eswmMonthlyReportFk: bigint("eswm_monthly_report_fk", {
      mode: "number",
      unsigned: true,
    }).notNull(),
    // Always inside the month of its report.
    heldOn: date("held_on", { mode: "string" }).notNull(),
    activity: varchar("activity", { length: 150 }).notNull(),
    place: varchar("place", { length: 200 }).notNull(),
    participants: int("participants", { unsigned: true }),
    sacks: int("sacks", { unsigned: true }).notNull(),
    kilos: decimal("kilos", { precision: 10, scale: 2 }).notNull(),
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
      name: "ecd_eswm_monthly_report_fk",
      columns: [t.eswmMonthlyReportFk],
      foreignColumns: [eswmMonthlyReport.eswmMonthlyReportPk],
    }).onDelete("restrict"),
  ],
);
