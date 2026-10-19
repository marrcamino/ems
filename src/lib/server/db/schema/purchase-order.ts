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
  varchar,
  type AnyMySqlColumn,
} from "drizzle-orm/mysql-core";
import { orgUnit } from "./org-unit";
import { supplier } from "./supplier";

// A fuel purchase order. There is one PO for the whole office at a time (more
// than one can be open), paid for before the fuel is used, and the fuel stays
// at the supplier's station until it is withdrawn with a withdrawal slip.
export const purchaseOrder = mysqlTable("purchase_order", {
  purchaseOrderPk: bigint("purchase_order_pk", {
    mode: "number",
    unsigned: true,
  })
    .primaryKey()
    .autoincrement(),
  // The number printed on the PO, such as 2026-03-22. Unique, so the same
  // paper cannot be entered twice.
  poNumber: varchar("po_number", { length: 50 }).notNull().unique(),
  // The date printed on the PO, not the day it was typed in.
  poDate: date("po_date", { mode: "string" }).notNull(),
  supplierFk: bigint("supplier_fk", { mode: "number", unsigned: true })
    .notNull()
    .references((): AnyMySqlColumn => supplier.supplierPk, {
      onDelete: "restrict",
    }),
  // Where the shares came from, such as a memo number or "as agreed on
  // 7 Oct". The system needs only the numbers, not the paper behind them.
  note: varchar("note", { length: 255 }),
  // Semantic FK name: points at `user.user_pk`, the GSU user who typed the
  // PO in. No constraint, the same as `user.created_by_fk`.
  createdByFk: bigint("created_by_fk", { mode: "number", unsigned: true }),
  createdAt: datetime("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: datetime("updated_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

// One row per fuel on the PO, as printed: quantity, unit cost and (worked
// out from those two) amount. A PO has a gasoline row, a diesel row, or both,
// never two of the same fuel.
export const purchaseOrderItem = mysqlTable(
  "purchase_order_item",
  {
    purchaseOrderItemPk: bigint("purchase_order_item_pk", {
      mode: "number",
      unsigned: true,
    })
      .primaryKey()
      .autoincrement(),
    purchaseOrderFk: bigint("purchase_order_fk", {
      mode: "number",
      unsigned: true,
    }).notNull(),
    fuelType: mysqlEnum("fuel_type", ["gasoline", "diesel"]).notNull(),
    // Decimals, because a share can be split to a part of a liter.
    liters: decimal("liters", { precision: 12, scale: 2 }).notNull(),
    // Pesos per liter, as on the PO. The system counts down pesos, so the
    // amount is liters × unit cost and is not stored separately.
    unitCost: decimal("unit_cost", { precision: 12, scale: 2 }).notNull(),
  },
  // Constraint names are given by hand, prefixed `poi_` and `poa_` below.
  // The names Drizzle makes up join the table, column and referenced table,
  // which comes to more than the 64 characters MySQL allows here, and
  // `drizzle-kit push` stops at the first one (ER_TOO_LONG_IDENT). The same
  // fix as `employee_history_correction`.
  (t) => [
    foreignKey({
      name: "poi_purchase_order_fk",
      columns: [t.purchaseOrderFk],
      foreignColumns: [purchaseOrder.purchaseOrderPk],
    }).onDelete("cascade"),
    unique("poi_order_fuel_unique").on(t.purchaseOrderFk, t.fuelType),
  ],
);

// Each division, section or unit's share of one fuel row, typed by GSU when
// the PO is added. The shares of a row add up exactly to the row's liters;
// the server refuses a PO whose shares do not. A withdrawal will count down
// one of these.
export const purchaseOrderAllocation = mysqlTable(
  "purchase_order_allocation",
  {
    purchaseOrderAllocationPk: bigint("purchase_order_allocation_pk", {
      mode: "number",
      unsigned: true,
    })
      .primaryKey()
      .autoincrement(),
    purchaseOrderItemFk: bigint("purchase_order_item_fk", {
      mode: "number",
      unsigned: true,
    }).notNull(),
    orgUnitFk: bigint("org_unit_fk", {
      mode: "number",
      unsigned: true,
    }).notNull(),
    liters: decimal("liters", { precision: 12, scale: 2 }).notNull(),
  },
  // Names given by hand, for the same reason as on `purchase_order_item`.
  (t) => [
    foreignKey({
      name: "poa_item_fk",
      columns: [t.purchaseOrderItemFk],
      foreignColumns: [purchaseOrderItem.purchaseOrderItemPk],
    }).onDelete("cascade"),
    foreignKey({
      name: "poa_org_unit_fk",
      columns: [t.orgUnitFk],
      foreignColumns: [orgUnit.orgUnitPk],
    }).onDelete("restrict"),
    // A unit gets one share per fuel, not two lines that would have to be
    // added together.
    unique("poa_item_unit_unique").on(t.purchaseOrderItemFk, t.orgUnitFk),
  ],
);
