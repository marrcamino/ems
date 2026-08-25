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
import { employee } from "./employee";

// Login details only. The person behind the login — name, position title,
// division — lives on `employee`. Every login belongs to exactly one
// employee, and an employee may hold at most one login.
export const user = mysqlTable("user", {
  userPk: bigint("user_pk", { mode: "number", unsigned: true })
    .primaryKey()
    .autoincrement(),
  employeeFk: bigint("employee_fk", { mode: "number", unsigned: true })
    .notNull()
    .unique()
    .references((): AnyMySqlColumn => employee.employeePk, {
      onDelete: "restrict",
    }),
  username: varchar("username", { length: 50 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  // Permissions inside the software, not the person's post in the office.
  // The post is `employee.position_title`.
  roleFk: bigint("role_fk", { mode: "number", unsigned: true })
    .notNull()
    .references((): AnyMySqlColumn => role.rolePk),
  // Whether this login may sign in. Distinct from
  // `employee.employment_status`, which is about still working here.
  accountStatus: mysqlEnum("account_status", ["active", "inactive", "locked"])
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
