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
import { orgUnit } from "./org-unit";

// One row per person in the office, whether or not they can sign in.
// A person who never logs in — the PENR Officer, for example — has a row
// here and no `user` row. Signatory records point at this table.
export const employee = mysqlTable("employee", {
  employeePk: bigint("employee_pk", { mode: "number", unsigned: true })
    .primaryKey()
    .autoincrement(),
  firstName: varchar("first_name", { length: 100 }).notNull(),
  middleName: varchar("middle_name", { length: 100 }),
  lastName: varchar("last_name", { length: 100 }).notNull(),
  suffix: varchar("suffix", { length: 20 }),
  // Required: the office hires into a named position, so a person on file
  // without one is not a real case. Contract of Service and Job Order staff
  // hold no plantilla item but still have a position or a designation.
  positionTitle: varchar("position_title", { length: 100 }).notNull(),
  orgUnitFk: bigint("org_unit_fk", {
    mode: "number",
    unsigned: true,
  }).references((): AnyMySqlColumn => orgUnit.orgUnitPk, {
    onDelete: "restrict",
  }),
  // Kept as a plain "YYYY-MM-DD" string rather than a Date. A birthday has
  // no time and no timezone, and turning it into a Date is what makes it
  // shift by a day when it crosses one.
  birthDate: date("birth_date", { mode: "string" }),
  sex: mysqlEnum("sex", ["male", "female"]),
  civilStatus: mysqlEnum("civil_status", [
    "single",
    "married",
    "widowed",
    "separated",
    "annulled",
  ]),
  // How the person is hired. The first five are CSC categories; `cos` and
  // `job_order` sit outside CSC and are engaged under a separate circular.
  tenureStatus: mysqlEnum("tenure_status", [
    "permanent",
    "temporary",
    "casual",
    "coterminous",
    "contractual",
    "cos",
    "job_order",
  ]).notNull(),
  // Whether the person still works here. Distinct from `user.account_status`,
  // which is only about whether a login may sign in.
  employmentStatus: mysqlEnum("employment_status", ["active", "separated"])
    .notNull()
    .default("active"),
  createdAt: datetime("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: datetime("updated_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});
