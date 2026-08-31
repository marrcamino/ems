import { sql } from "drizzle-orm";
import {
  bigint,
  date,
  datetime,
  mysqlTable,
  varchar,
  type AnyMySqlColumn,
} from "drizzle-orm/mysql-core";
import { employee } from "./employee";
import { user } from "./user";

// One row per version of a person's name and position title, with the dates
// that version was in use. A printed document points at a row here rather
// than at `employee`, so a woman who marries and changes surname does not
// silently change every document she ever signed.
//
// `employee` keeps the current name and title as well. The two are always
// written together in one transaction, so they cannot drift apart.
export const employeeHistory = mysqlTable("employee_history", {
  employeeHistoryPk: bigint("employee_history_pk", {
    mode: "number",
    unsigned: true,
  })
    .primaryKey()
    .autoincrement(),
  // `cascade`, not the `restrict` used everywhere else in this schema. With
  // `restrict` every employee would become undeletable the moment they got
  // their first version. History belongs to the person and goes with them.
  // The protection arrives later from the document side: a document holds a
  // history row with `restrict`, so deleting the employee tries to cascade
  // into a held row, and the database refuses the whole delete.
  employeeFk: bigint("employee_fk", { mode: "number", unsigned: true })
    .notNull()
    .references((): AnyMySqlColumn => employee.employeePk, {
      onDelete: "cascade",
    }),
  firstName: varchar("first_name", { length: 100 }).notNull(),
  middleName: varchar("middle_name", { length: 100 }),
  lastName: varchar("last_name", { length: 100 }).notNull(),
  suffix: varchar("suffix", { length: 20 }),
  // The full title, for example "Administrative Officer I (Supply Officer)".
  positionTitle: varchar("position_title", { length: 100 }).notNull(),
  // What is actually printed, for example "AO-I/Supply Officer". Nullable
  // because nobody has typed one for the employees already on file, and no
  // rule turns the full title into the short form reliably. A document that
  // prints a short form must refuse to print when this is empty rather than
  // printing a blank line — that belongs to the report work.
  positionShortForm: varchar("position_short_form", { length: 50 }),
  // Plain "YYYY-MM-DD" strings for the same reason as `employee.birth_date`:
  // a date with no time should not become a Date, because that is what makes
  // it shift by a day when it crosses a timezone.
  validFrom: date("valid_from", { mode: "string" }).notNull(),
  // Empty means this is the current version. A document asks which version
  // was valid on its filed date, so this range is what decides who may be
  // named on it.
  validUntil: date("valid_until", { mode: "string" }),
  // Who made this version — a semantic foreign key pointing at `user_pk`,
  // named for its meaning rather than for the table it references, the
  // same as on `role` and `user`. The design's condition for keeping
  // employee history in this system at all was that every change is
  // attributable to a person.
  createdByFk: bigint("created_by_fk", {
    mode: "number",
    unsigned: true,
  }).references((): AnyMySqlColumn => user.userPk),
  // Bookkeeping only. Never choose a version by this; use the dates above.
  createdAt: datetime("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});
