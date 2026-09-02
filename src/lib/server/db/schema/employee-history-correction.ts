import { sql } from "drizzle-orm";
import {
  bigint,
  datetime,
  mysqlEnum,
  mysqlTable,
  varchar,
  type AnyMySqlColumn,
} from "drizzle-orm/mysql-core";
import { employeeHistory } from "./employee-history";
import { user } from "./user";

// One row per field written over on an existing entry in `employee_history`.
//
// Only a repair is recorded here. Recording a real change — a marriage, a
// promotion — adds a new entry instead, and that entry already carries
// `created_by_fk` and `created_at`, so it says who made it and when. Writing
// over an entry leaves nothing behind: the wrong wording is simply gone, and
// every document already using that entry silently starts reading the new
// wording. That is the case the design wanted somebody to be accountable for,
// and it is the reason this table exists.
//
// No screen shows it. To read it, join `user` on `corrected_by_fk`.
export const employeeHistoryCorrection = mysqlTable(
  "employee_history_correction",
  {
    employeeHistoryCorrectionPk: bigint("employee_history_correction_pk", {
      mode: "number",
      unsigned: true,
    })
      .primaryKey()
      .autoincrement(),
    // `cascade`, matching `employee_history.employee_fk` and for the same
    // reason. The log belongs to the entry it describes; an entry that no
    // longer exists has nothing left to explain. The protection against
    // deleting somebody named on a filed document arrives from the document
    // side, not from here.
    employeeHistoryFk: bigint("employee_history_fk", {
      mode: "number",
      unsigned: true,
    })
      .notNull()
      .references((): AnyMySqlColumn => employeeHistory.employeeHistoryPk, {
        onDelete: "cascade",
      }),
    // Which of the six printed fields was written over, named by its database
    // column rather than by its name in the TypeScript code, because the only
    // way to read this table today is a SQL query typed by hand.
    field: mysqlEnum("field", [
      "first_name",
      "middle_name",
      "last_name",
      "suffix",
      "position_title",
      "position_short_form",
    ]).notNull(),
    // 100 characters covers the longest of the six, `position_title`. Both are
    // nullable because a middle name, a suffix and a short form are all allowed
    // to be empty, so a repair can add one or take one away.
    oldValue: varchar("old_value", { length: 100 }),
    newValue: varchar("new_value", { length: 100 }),
    // Who did it — a semantic foreign key pointing at `user_pk`, named for its
    // meaning rather than for the table it references, the same as
    // `employee_history.created_by_fk`.
    correctedByFk: bigint("corrected_by_fk", {
      mode: "number",
      unsigned: true,
    }).references((): AnyMySqlColumn => user.userPk),
    correctedAt: datetime("corrected_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
);
