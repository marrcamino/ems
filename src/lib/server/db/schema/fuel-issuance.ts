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
  type AnyMySqlColumn,
} from "drizzle-orm/mysql-core";
import { asset } from "./asset";
import { employeeHistory } from "./employee-history";
import { orgUnit } from "./org-unit";
import { purchaseOrder } from "./purchase-order";

// One row per fuel transaction: a withdrawal, a trip only (no fuel taken), or
// a reimbursed trip. The withdrawal slip, the RIS, and the DTT are printouts
// of this one row, which is why their numbers and signatories all live here
// ("Recording a fuel issuance" in fuel-purchase-orders.md).
export const fuelIssuance = mysqlTable(
  "fuel_issuance",
  {
    fuelIssuancePk: bigint("fuel_issuance_pk", {
      mode: "number",
      unsigned: true,
    })
      .primaryKey()
      .autoincrement(),
    // Only a withdrawal counts down a PO and an allocation.
    kind: mysqlEnum("kind", ["withdrawal", "trip", "reimbursed"]).notNull(),
    status: mysqlEnum("status", [
      "waiting",
      "out",
      "complete",
      "incomplete",
      "cancelled",
    ]).notNull(),
    // Every number is saved in full, `2026-11-001`, the WS too, so the counts
    // of two years never clash. Lists show them without the year. The DTT is
    // not unique: a second slip of one fueling may share the first one's DTT
    // (MPP-129).
    controlNumber: varchar("control_number", { length: 20 }).notNull(),
    wsNumber: varchar("ws_number", { length: 20 }),
    risNumber: varchar("ris_number", { length: 20 }),
    dttNumber: varchar("dtt_number", { length: 20 }),
    // The numbers take their year and month from this date.
    fileDate: date("file_date", { mode: "string" }).notNull(),
    // The office whose allocation a withdrawal counts down.
    orgUnitFk: bigint("org_unit_fk", {
      mode: "number",
      unsigned: true,
    }).notNull(),
    assetFk: bigint("asset_fk", { mode: "number", unsigned: true }).notNull(),
    // Copied from the asset when saved, so editing the asset later never
    // moves liters between gasoline and diesel on a PO.
    fuelType: mysqlEnum("fuel_type", ["gasoline", "diesel"]).notNull(),
    // Worked out by EMS, never picked: the oldest PO where the office still
    // has this fuel. Empty on a trip.
    purchaseOrderFk: bigint("purchase_order_fk", {
      mode: "number",
      unsigned: true,
    }),
    // One of the two: liters, or pesos on a price-based PO.
    requestedLiters: decimal("requested_liters", { precision: 12, scale: 2 }),
    requestedAmount: decimal("requested_amount", { precision: 12, scale: 2 }),
    purpose: varchar("purpose", { length: 500 }).notNull(),
    remarks: varchar("remarks", { length: 200 }),
    // The DTT part, only for an asset whose Trip ticket switch is on.
    destination: varchar("destination", { length: 200 }),
    travelFrom: date("travel_from", { mode: "string" }),
    travelTo: date("travel_to", { mode: "string" }),
    odometerStart: int("odometer_start", { unsigned: true }),
    // The people on the forms. Semantic FK names: each points at
    // `employee_history.employee_history_pk`, the version of the person's name
    // and title valid on the file date, so a later name change does not
    // rewrite a filed form (signatory.md, "What the report stores").
    driverFk: bigint("driver_fk", { mode: "number", unsigned: true }),
    wsRequestedByFk: bigint("ws_requested_by_fk", {
      mode: "number",
      unsigned: true,
    }),
    wsApprovedByFk: bigint("ws_approved_by_fk", {
      mode: "number",
      unsigned: true,
    }),
    risRequestedByFk: bigint("ris_requested_by_fk", {
      mode: "number",
      unsigned: true,
    }),
    risApprovedByFk: bigint("ris_approved_by_fk", {
      mode: "number",
      unsigned: true,
    }),
    risIssuedByFk: bigint("ris_issued_by_fk", {
      mode: "number",
      unsigned: true,
    }),
    // May stay empty, left for writing by hand.
    risReceivedByFk: bigint("ris_received_by_fk", {
      mode: "number",
      unsigned: true,
    }),
    dttApprovedByFk: bigint("dtt_approved_by_fk", {
      mode: "number",
      unsigned: true,
    }),
    // Semantic FK name: points at `user.user_pk`, who entered it. No
    // constraint, the same as `purchase_order.created_by_fk`.
    createdByFk: bigint("created_by_fk", { mode: "number", unsigned: true }),
    createdAt: datetime("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: datetime("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  // Named by hand, prefixed `fi_`: the names Drizzle makes up go past the 64
  // characters MySQL allows (see `purchase_order_item`). `restrict`
  // everywhere, so nothing a filed form points at can be deleted under it.
  (t) => {
    const person = (name: string, column: AnyMySqlColumn) =>
      foreignKey({
        name,
        columns: [column],
        foreignColumns: [employeeHistory.employeeHistoryPk],
      }).onDelete("restrict");
    return [
      unique("fi_control_number_unique").on(t.controlNumber),
      unique("fi_ws_number_unique").on(t.wsNumber),
      unique("fi_ris_number_unique").on(t.risNumber),
      foreignKey({
        name: "fi_org_unit_fk",
        columns: [t.orgUnitFk],
        foreignColumns: [orgUnit.orgUnitPk],
      }).onDelete("restrict"),
      foreignKey({
        name: "fi_asset_fk",
        columns: [t.assetFk],
        foreignColumns: [asset.assetPk],
      }).onDelete("restrict"),
      foreignKey({
        name: "fi_purchase_order_fk",
        columns: [t.purchaseOrderFk],
        foreignColumns: [purchaseOrder.purchaseOrderPk],
      }).onDelete("restrict"),
      person("fi_driver_fk", t.driverFk),
      person("fi_ws_requested_by_fk", t.wsRequestedByFk),
      person("fi_ws_approved_by_fk", t.wsApprovedByFk),
      person("fi_ris_requested_by_fk", t.risRequestedByFk),
      person("fi_ris_approved_by_fk", t.risApprovedByFk),
      person("fi_ris_issued_by_fk", t.risIssuedByFk),
      person("fi_ris_received_by_fk", t.risReceivedByFk),
      person("fi_dtt_approved_by_fk", t.dttApprovedByFk),
    ];
  },
);
