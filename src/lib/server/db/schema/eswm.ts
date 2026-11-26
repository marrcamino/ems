import { sql } from "drizzle-orm";
import {
  bigint,
  date,
  datetime,
  decimal,
  foreignKey,
  mysqlEnum,
  mysqlTable,
  unique,
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

// One month's kilos of one type of waste, from the coastal cleanups or from
// the office's own bins, as the office's workbook keeps them. A type that was
// not weighed has no line; 0 means none. Which types belong to which source
// is a list in code (`eswm/eswm-waste.ts`).
export const eswmWaste = mysqlTable(
  "eswm_waste",
  {
    eswmWastePk: bigint("eswm_waste_pk", { mode: "number", unsigned: true })
      .primaryKey()
      .autoincrement(),
    eswmMonthlyReportFk: bigint("eswm_monthly_report_fk", {
      mode: "number",
      unsigned: true,
    }).notNull(),
    source: mysqlEnum("source", ["coastal", "office"]).notNull(),
    wasteType: mysqlEnum("waste_type", [
      "recyclable",
      "residual",
      "non_biodegradable",
      "biodegradable",
      "special",
    ]).notNull(),
    kilos: decimal("kilos", { precision: 10, scale: 2 }).notNull(),
    // Semantic FK name: points at `user.user_pk`, who typed it first.
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
      name: "ew_eswm_monthly_report_fk",
      columns: [t.eswmMonthlyReportFk],
      foreignColumns: [eswmMonthlyReport.eswmMonthlyReportPk],
    }).onDelete("restrict"),
    unique("ew_month_source_type_unique").on(
      t.eswmMonthlyReportFk,
      t.source,
      t.wasteType,
    ),
  ],
);
