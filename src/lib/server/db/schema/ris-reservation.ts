import { sql } from "drizzle-orm";
import {
  bigint,
  date,
  datetime,
  mysqlEnum,
  mysqlTable,
  varchar,
  type AnyMySqlColumn,
} from "drizzle-orm/mysql-core";
import { user } from "./user";

// One row per RIS number that GSU reserved for a supply that is not fuel. It
// comes from the same count as the fuel withdrawals' RIS numbers, the `ris`
// row of `form_counter`, so a paper RIS and a fuel RIS never share a number
// (point 6 of "Recording a fuel issuance" in fuel-purchase-orders.md). A fuel
// withdrawal's RIS number stays on `fuel_issuance`.
export const risReservation = mysqlTable("ris_reservation", {
  risReservationPk: bigint("ris_reservation_pk", {
    mode: "number",
    unsigned: true,
  })
    .primaryKey()
    .autoincrement(),
  // In full, `2026-11-013`, like the numbers on `fuel_issuance`.
  risNumber: varchar("ris_number", { length: 20 }).notNull().unique(),
  // The number takes its year and month from this day.
  reservedOn: date("reserved_on", { mode: "string" }).notNull(),
  purpose: varchar("purpose", { length: 200 }).notNull(),
  // A number that is not used is never deleted and never reused, because
  // later numbers already come after it (point 6.5).
  status: mysqlEnum("status", ["reserved", "not_used"])
    .notNull()
    .default("reserved"),
  notUsedReason: varchar("not_used_reason", { length: 200 }),
  // Semantic FK name: points at `user.user_pk`, the login that reserved it.
  reservedByFk: bigint("reserved_by_fk", { mode: "number", unsigned: true })
    .notNull()
    .references((): AnyMySqlColumn => user.userPk, { onDelete: "restrict" }),
  createdAt: datetime("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: datetime("updated_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});
