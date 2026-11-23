import { sql } from "drizzle-orm";
import {
  bigint,
  date,
  datetime,
  decimal,
  foreignKey,
  int,
  time,
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
    // Each form keeps its own purpose and remarks, though the two purposes
    // are usually the same (point 5 of "Three forms, and they are not peers").
    risPurpose: varchar("ris_purpose", { length: 500 }),
    risRemarks: varchar("ris_remarks", { length: 200 }),
    risStockNumber: varchar("ris_stock_number", { length: 50 }),
    // Rarely filled in, but the RIS has a box for each.
    risFundCluster: varchar("ris_fund_cluster", { length: 50 }),
    risResponsibilityCenterCode: varchar("ris_responsibility_center_code", {
      length: 50,
    }),
    // The DTT part, only for an asset whose Trip ticket switch is on.
    dttPurpose: varchar("dtt_purpose", { length: 500 }),
    dttRemarks: varchar("dtt_remarks", { length: 200 }),
    destination: varchar("destination", { length: 200 }),
    travelFrom: date("travel_from", { mode: "string" }),
    travelTo: date("travel_to", { mode: "string" }),
    // Hours of travel, kept though nobody knows what it is for (told by the
    // owner, 17 November 2026).
    travelHours: decimal("travel_hours", { precision: 6, scale: 2 }),
    // What is known before the trip; the lines after it come with the
    // Complete step.
    departureTime: time("departure_time"),
    tankBalanceBefore: decimal("tank_balance_before", {
      precision: 8,
      scale: 2,
    }),
    // The DTT's "c. Purchased during trip": fuel the driver paid for on the
    // road. Required on a reimbursed trip, where it is what the office pays
    // back and what the CO2 figures count; GSU corrects it at Complete.
    purchasedLiters: decimal("purchased_liters", { precision: 8, scale: 2 }),
    // What goes here is still asked of GSU (MPP-139).
    oilLubricant: varchar("oil_lubricant", { length: 100 }),
    odometerStart: int("odometer_start", { unsigned: true }),
    // The people on the forms. Semantic FK names: each points at
    // `employee_history.employee_history_pk`, the version of the person's name
    // and title valid on the file date, so a later name change does not
    // rewrite a filed form (signatory.md, "What the report stores").
    //
    // The person sent to withdraw the fuel and the DTT's driver may not work
    // in the office (point 6), so each is either picked (`_fk`) or typed
    // (`_name`), never both.
    driverFk: bigint("driver_fk", { mode: "number", unsigned: true }),
    driverName: varchar("driver_name", { length: 150 }),
    wsWithdrawnByFk: bigint("ws_withdrawn_by_fk", {
      mode: "number",
      unsigned: true,
    }),
    wsWithdrawnByName: varchar("ws_withdrawn_by_name", { length: 150 }),
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
      person("fi_ws_withdrawn_by_fk", t.wsWithdrawnByFk),
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

// The passengers printed on a withdrawal's trip ticket, as typed: names
// only, in the order they were added.
export const fuelIssuancePassenger = mysqlTable(
  "fuel_issuance_passenger",
  {
    fuelIssuancePassengerPk: bigint("fuel_issuance_passenger_pk", {
      mode: "number",
      unsigned: true,
    })
      .primaryKey()
      .autoincrement(),
    fuelIssuanceFk: bigint("fuel_issuance_fk", {
      mode: "number",
      unsigned: true,
    }).notNull(),
    name: varchar("name", { length: 150 }).notNull(),
    sortOrder: int("sort_order", { unsigned: true }).notNull(),
  },
  (t) => [
    foreignKey({
      name: "fip_fuel_issuance_fk",
      columns: [t.fuelIssuanceFk],
      foreignColumns: [fuelIssuance.fuelIssuancePk],
    }).onDelete("cascade"),
  ],
);
