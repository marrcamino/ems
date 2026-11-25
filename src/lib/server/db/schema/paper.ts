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
import { PAPER_SIZE_VALUES } from "../../../paper-sizes";
import { employeeHistory } from "./employee-history";
import { orgUnit } from "./org-unit";
import { supplier } from "./supplier";

// One office's paper use for one month. Its entries can still change once
// it is submitted, until GSU receives the printed report; a received month
// is locked (paper-consumption.md).
export const paperMonthlyReport = mysqlTable(
  "paper_monthly_report",
  {
    paperMonthlyReportPk: bigint("paper_monthly_report_pk", {
      mode: "number",
      unsigned: true,
    })
      .primaryKey()
      .autoincrement(),
    orgUnitFk: bigint("org_unit_fk", {
      mode: "number",
      unsigned: true,
    }).notNull(),
    // Always the first day of the month, `2026-11-01`.
    reportMonth: date("report_month", { mode: "string" }).notNull(),
    status: mysqlEnum("status", ["open", "submitted", "received"])
      .notNull()
      .default("open"),
    submittedAt: datetime("submitted_at"),
    // Semantic FK name: points at `user.user_pk`, who submitted it. No
    // constraint, the same as `fuel_issuance.created_by_fk`.
    submittedByFk: bigint("submitted_by_fk", {
      mode: "number",
      unsigned: true,
    }),
    // The day the printed report reached GSU, typed by GSU; GSU's own
    // report is received on the day it is submitted.
    receivedOn: date("received_on", { mode: "string" }),
    // Semantic FK name: points at `user.user_pk`, who marked it received.
    // No constraint, the same as `submitted_by_fk`.
    receivedByFk: bigint("received_by_fk", {
      mode: "number",
      unsigned: true,
    }),
    // The form's signature blocks, chosen on submitting. Semantic FK names:
    // each points at `employee_history.employee_history_pk`, the person's
    // name version on the month's last day, as on the fuel forms.
    preparedByFk: bigint("prepared_by_fk", { mode: "number", unsigned: true }),
    notedByFk: bigint("noted_by_fk", { mode: "number", unsigned: true }),
    createdAt: datetime("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: datetime("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (t) => [
    unique("pmr_office_month_unique").on(t.orgUnitFk, t.reportMonth),
    foreignKey({
      name: "pmr_org_unit_fk",
      columns: [t.orgUnitFk],
      foreignColumns: [orgUnit.orgUnitPk],
    }).onDelete("restrict"),
    foreignKey({
      name: "pmr_prepared_by_fk",
      columns: [t.preparedByFk],
      foreignColumns: [employeeHistory.employeeHistoryPk],
    }).onDelete("restrict"),
    foreignKey({
      name: "pmr_noted_by_fk",
      columns: [t.notedByFk],
      foreignColumns: [employeeHistory.employeeHistoryPk],
    }).onDelete("restrict"),
  ],
);

// One line of the office's paper form: the paper someone took on one day, and
// who received it. Its reams of each size are in `paper_consumption_item`.
export const paperConsumption = mysqlTable(
  "paper_consumption",
  {
    paperConsumptionPk: bigint("paper_consumption_pk", {
      mode: "number",
      unsigned: true,
    })
      .primaryKey()
      .autoincrement(),
    paperMonthlyReportFk: bigint("paper_monthly_report_fk", {
      mode: "number",
      unsigned: true,
    }).notNull(),
    // Always inside the month of its report.
    consumedOn: date("consumed_on", { mode: "string" }).notNull(),
    // The form's "Received by". Semantic FK name: points at
    // `employee_history.employee_history_pk`, the person's name version on
    // the date, as on the fuel forms. Someone not in the list is typed in
    // `received_by_name` instead, never both.
    receivedByFk: bigint("received_by_fk", { mode: "number", unsigned: true }),
    receivedByName: varchar("received_by_name", { length: 150 }),
    // Semantic FK name: points at `user.user_pk`, who entered it.
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
      name: "pc_paper_monthly_report_fk",
      columns: [t.paperMonthlyReportFk],
      foreignColumns: [paperMonthlyReport.paperMonthlyReportPk],
    }).onDelete("restrict"),
    foreignKey({
      name: "pc_received_by_fk",
      columns: [t.receivedByFk],
      foreignColumns: [employeeHistory.employeeHistoryPk],
    }).onDelete("restrict"),
  ],
);

// The reams of one size on a line of the form, never two of the same size.
export const paperConsumptionItem = mysqlTable(
  "paper_consumption_item",
  {
    paperConsumptionItemPk: bigint("paper_consumption_item_pk", {
      mode: "number",
      unsigned: true,
    })
      .primaryKey()
      .autoincrement(),
    paperConsumptionFk: bigint("paper_consumption_fk", {
      mode: "number",
      unsigned: true,
    }).notNull(),
    paperSize: mysqlEnum("paper_size", PAPER_SIZE_VALUES).notNull(),
    reams: int("reams", { unsigned: true }).notNull(),
  },
  (t) => [
    unique("pci_entry_size_unique").on(t.paperConsumptionFk, t.paperSize),
    foreignKey({
      name: "pci_paper_consumption_fk",
      columns: [t.paperConsumptionFk],
      foreignColumns: [paperConsumption.paperConsumptionPk],
    }).onDelete("cascade"),
  ],
);

// A paper purchase order, as GSU receives it from COA: the procurement office
// handles the purchase up to the PO, the supplier signs it, and COA forwards
// it to GSU (paper-consumption.md, "How GSU gets the paper"). Its sizes are in
// `paper_purchase_order_item`.
export const paperPurchaseOrder = mysqlTable("paper_purchase_order", {
  paperPurchaseOrderPk: bigint("paper_purchase_order_pk", {
    mode: "number",
    unsigned: true,
  })
    .primaryKey()
    .autoincrement(),
  // The number printed on the PO. Unique, so the same PO cannot be entered
  // twice. Its own list, apart from the fuel POs on `purchase_order`.
  poNumber: varchar("po_number", { length: 50 }).notNull().unique(),
  // The date printed on the PO, not the day it was typed in.
  poDate: date("po_date", { mode: "string" }).notNull(),
  // From the same supplier list as the fuel POs, on its own page. Required
  // on every save; empty only on a PO typed before suppliers were shared.
  supplierFk: bigint("supplier_fk", {
    mode: "number",
    unsigned: true,
  }).references(() => supplier.supplierPk, { onDelete: "restrict" }),
  remarks: varchar("remarks", { length: 255 }),
  // Semantic FK name: points at `user.user_pk`, who typed the PO in.
  createdByFk: bigint("created_by_fk", { mode: "number", unsigned: true }),
  createdAt: datetime("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: datetime("updated_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

// One row per paper size on the PO, never two of the same size.
export const paperPurchaseOrderItem = mysqlTable(
  "paper_purchase_order_item",
  {
    paperPurchaseOrderItemPk: bigint("paper_purchase_order_item_pk", {
      mode: "number",
      unsigned: true,
    })
      .primaryKey()
      .autoincrement(),
    paperPurchaseOrderFk: bigint("paper_purchase_order_fk", {
      mode: "number",
      unsigned: true,
    }).notNull(),
    paperSize: mysqlEnum("paper_size", PAPER_SIZE_VALUES).notNull(),
    reams: int("reams", { unsigned: true }).notNull(),
    // The PO's "Stock/Property No." for this size. Required while some of it
    // is kept in GSU's stock room; the owner's guess is that GSU writes it
    // only then (MPP-146 asks GSU).
    stockNumber: varchar("stock_number", { length: 50 }),
  },
  (t) => [
    unique("ppoi_po_size_unique").on(t.paperPurchaseOrderFk, t.paperSize),
    foreignKey({
      name: "ppoi_paper_purchase_order_fk",
      columns: [t.paperPurchaseOrderFk],
      foreignColumns: [paperPurchaseOrder.paperPurchaseOrderPk],
    }).onDelete("cascade"),
  ],
);

// The reams of one size on a PO that GSU gave one office, GSU included, like
// `purchase_order_allocation` on a fuel PO. A PO's distributions add up to
// the PO exactly: every ream is given out (paper-consumption.md).
export const paperDistribution = mysqlTable(
  "paper_distribution",
  {
    paperDistributionPk: bigint("paper_distribution_pk", {
      mode: "number",
      unsigned: true,
    })
      .primaryKey()
      .autoincrement(),
    paperPurchaseOrderItemFk: bigint("paper_purchase_order_item_fk", {
      mode: "number",
      unsigned: true,
    }).notNull(),
    orgUnitFk: bigint("org_unit_fk", {
      mode: "number",
      unsigned: true,
    }).notNull(),
    reams: int("reams", { unsigned: true }).notNull(),
  },
  (t) => [
    unique("pd_item_office_unique").on(t.paperPurchaseOrderItemFk, t.orgUnitFk),
    foreignKey({
      name: "pd_paper_purchase_order_item_fk",
      columns: [t.paperPurchaseOrderItemFk],
      foreignColumns: [paperPurchaseOrderItem.paperPurchaseOrderItemPk],
    }).onDelete("cascade"),
    foreignKey({
      name: "pd_org_unit_fk",
      columns: [t.orgUnitFk],
      foreignColumns: [orgUnit.orgUnitPk],
    }).onDelete("restrict"),
  ],
);

// The reams an office had before its paper record in EMS starts: the
// "Balance forwarded" on the first month's form, typed by the office from the
// Balance row of its last paper form. One row per size, zero included, all
// with the same start month. From the start month on, EMS carries each
// month's balance into the next by itself (paper-consumption.md).
export const paperStartingBalance = mysqlTable(
  "paper_starting_balance",
  {
    paperStartingBalancePk: bigint("paper_starting_balance_pk", {
      mode: "number",
      unsigned: true,
    })
      .primaryKey()
      .autoincrement(),
    orgUnitFk: bigint("org_unit_fk", {
      mode: "number",
      unsigned: true,
    }).notNull(),
    // The office's first month in EMS, always its first day, `2026-10-01`.
    startMonth: date("start_month", { mode: "string" }).notNull(),
    paperSize: mysqlEnum("paper_size", PAPER_SIZE_VALUES).notNull(),
    reams: int("reams", { unsigned: true }).notNull(),
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
    unique("psb_office_size_unique").on(t.orgUnitFk, t.paperSize),
    foreignKey({
      name: "psb_org_unit_fk",
      columns: [t.orgUnitFk],
      foreignColumns: [orgUnit.orgUnitPk],
    }).onDelete("restrict"),
  ],
);

// Paper GSU handed to an office from its share of a PO, one row per size.
// A PO allocates every ream to an office (`paper_distribution`), but GSU may
// keep part of an office's share, for one with no room to store it, and hand
// it over later (paper-consumption.md). Only what is handed over counts in
// the office's "New", in the month of `handed_on`; the rest is held by GSU.
// Never more than the office's share of that size.
export const paperHandover = mysqlTable(
  "paper_handover",
  {
    paperHandoverPk: bigint("paper_handover_pk", {
      mode: "number",
      unsigned: true,
    })
      .primaryKey()
      .autoincrement(),
    paperPurchaseOrderFk: bigint("paper_purchase_order_fk", {
      mode: "number",
      unsigned: true,
    }).notNull(),
    orgUnitFk: bigint("org_unit_fk", {
      mode: "number",
      unsigned: true,
    }).notNull(),
    // Never before the PO date.
    handedOn: date("handed_on", { mode: "string" }).notNull(),
    paperSize: mysqlEnum("paper_size", PAPER_SIZE_VALUES).notNull(),
    reams: int("reams", { unsigned: true }).notNull(),
    // Semantic FK name: points at `user.user_pk`, who recorded it.
    createdByFk: bigint("created_by_fk", { mode: "number", unsigned: true }),
    createdAt: datetime("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (t) => [
    foreignKey({
      name: "ph_paper_purchase_order_fk",
      columns: [t.paperPurchaseOrderFk],
      foreignColumns: [paperPurchaseOrder.paperPurchaseOrderPk],
    }).onDelete("cascade"),
    foreignKey({
      name: "ph_org_unit_fk",
      columns: [t.orgUnitFk],
      foreignColumns: [orgUnit.orgUnitPk],
    }).onDelete("restrict"),
  ],
);
