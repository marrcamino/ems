import {
  mysqlTable,
  bigint,
  varchar,
  mysqlEnum,
  datetime,
  type AnyMySqlColumn,
} from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";
import { user } from "./user";

export const role = mysqlTable("role", {
  rolePk: bigint("role_pk", { mode: "number", unsigned: true })
    .primaryKey()
    .autoincrement(),
  roleName: varchar("role_name", { length: 100 }).notNull().unique(),
  description: varchar("description", { length: 255 }),
  status: mysqlEnum("status", ["active", "inactive"])
    .notNull()
    .default("active"),
  createdByFk: bigint("created_by_fk", {
    mode: "number",
    unsigned: true,
  }).references((): AnyMySqlColumn => user.userPk),
  createdAt: datetime("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: datetime("updated_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});
