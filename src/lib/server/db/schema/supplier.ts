import { sql } from "drizzle-orm";
import {
  bigint,
  datetime,
  mysqlEnum,
  mysqlTable,
  varchar,
} from "drizzle-orm/mysql-core";

// The businesses the office buys fuel from, such as the gas station named on
// a fuel purchase order. Kept as a list so the same station is picked on
// every PO rather than typed again, which would split one supplier across
// several spellings.
export const supplier = mysqlTable("supplier", {
  supplierPk: bigint("supplier_pk", { mode: "number", unsigned: true })
    .primaryKey()
    .autoincrement(),
  // Not unique: two branches of one company can share a name and differ only
  // by address and TIN branch code.
  supplierName: varchar("supplier_name", { length: 150 }).notNull(),
  businessAddress: varchar("business_address", { length: 255 }).notNull(),
  // Taxpayer Identification Number, stored as digits only (123456789000) so
  // the unique index compares the number itself. The spaces every 3 digits
  // are added only where it is typed and shown.
  tin: varchar("tin", { length: 20 }).notNull().unique(),
  // The supplier's PhilGEPS registration number (Philippine Government
  // Electronic Procurement System). Optional, because a gas station sold
  // to by direct retail purchase may not be registered.
  philgepsNumber: varchar("philgeps_number", { length: 50 }),
  // A supplier is a reference record. One the office no longer buys from
  // (it closed, its contract ended, the office switched) is archived rather
  // than deleted, because past purchase orders and fuel records still name
  // it. Archived means hidden from new use and kept for history: it is not
  // offered when a new PO is added. Deliberately "archived" and not the
  // "inactive" that other lookup tables use, and only these two values.
  status: mysqlEnum("status", ["active", "archived"])
    .notNull()
    .default("active"),
  createdAt: datetime("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: datetime("updated_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});
