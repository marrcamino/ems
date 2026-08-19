import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  datetime,
  mysqlEnum,
  mysqlTable,
  smallint,
  varchar,
  type AnyMySqlColumn,
} from "drizzle-orm/mysql-core";
import { role } from "./role";
import { orgUnit } from "./org-unit";

export const user = mysqlTable("user", {
  userPk: bigint("user_pk", { mode: "number", unsigned: true })
    .primaryKey()
    .autoincrement(),
  username: varchar("username", { length: 50 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  firstName: varchar("first_name", { length: 100 }).notNull(),
  middleName: varchar("middle_name", { length: 100 }),
  lastName: varchar("last_name", { length: 100 }).notNull(),
  suffix: varchar("suffix", { length: 20 }),
  positionTitle: varchar("position_title", { length: 100 }),
  roleFk: bigint("role_fk", { mode: "number", unsigned: true })
    .notNull()
    .references((): AnyMySqlColumn => role.rolePk),
  orgUnitFk: bigint("org_unit_fk", {
    mode: "number",
    unsigned: true,
  }).references((): AnyMySqlColumn => orgUnit.orgUnitPk, {
    onDelete: "restrict",
  }),
  status: mysqlEnum("status", ["active", "inactive", "locked"])
    .notNull()
    .default("active"),
  mustChangePassword: boolean("must_change_password").notNull().default(true),
  failedLoginAttempts: smallint("failed_login_attempts").notNull().default(0),
  lockedUntil: datetime("locked_until"),
  lastLoginAt: datetime("last_login_at"),
  createdByFk: bigint("created_by_fk", { mode: "number", unsigned: true }),
  createdAt: datetime("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: datetime("updated_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});
