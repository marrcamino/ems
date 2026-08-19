import { sql } from "drizzle-orm";
import {
  bigint,
  datetime,
  mysqlEnum,
  mysqlTable,
  varchar,
  type AnyMySqlColumn,
} from "drizzle-orm/mysql-core";

export const orgUnit = mysqlTable("org_unit", {
  orgUnitPk: bigint("org_unit_pk", { mode: "number", unsigned: true })
    .primaryKey()
    .autoincrement(),
  orgUnitName: varchar("org_unit_name", { length: 100 }).notNull(),
  abbr: varchar("abbr", { length: 50 }),
  level: mysqlEnum("level", [
    "office",
    "division",
    "section",
    "unit",
  ]).notNull(),
  parentFk: bigint("parent_fk", { mode: "number", unsigned: true }).references(
    (): AnyMySqlColumn => orgUnit.orgUnitPk,
  ),
  status: mysqlEnum("status", ["active", "inactive"])
    .notNull()
    .default("active"),
  createdAt: datetime("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});
