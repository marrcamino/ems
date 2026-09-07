import { sql } from "drizzle-orm";
import {
  bigint,
  datetime,
  mysqlTable,
  varchar,
  type AnyMySqlColumn,
} from "drizzle-orm/mysql-core";
import { user } from "./user";

// One row per system-wide setting an admin fills in from the Settings page.
//
// These exist because some things the code needs cannot be written into the
// program. Which org unit is the General Services Unit is the first of them:
// the printed fuel documents restrict two of their signature blocks to GSU
// staff, and the row id of that unit is different on every installation.
//
// Keys are fixed strings in the code and are never created at runtime. The
// value is deliberately plain text rather than a foreign key, even when it
// holds a row id. A foreign key would only have protected deletion, while
// deactivating an org unit is an ordinary column change no foreign key can
// catch, so a check in the program was needed either way. One check covering
// both beats two covering one each — see `src/lib/server/org-unit-guard.ts`.
export const config = mysqlTable("config", {
  configPk: bigint("config_pk", { mode: "number", unsigned: true })
    .primaryKey()
    .autoincrement(),
  // Unique, because a setting with two rows has no answer. Writes upsert on
  // this column rather than inserting.
  configKey: varchar("config_key", { length: 100 }).notNull().unique(),
  // Nullable, and empty means the setting has never been filled in or was
  // cleared. Callers must handle that rather than assuming a value is there.
  configValue: varchar("config_value", { length: 255 }),
  // Who set it last — a semantic foreign key pointing at `user_pk`, named for
  // its meaning rather than for the table it references, the same as
  // `employee_history.created_by_fk`.
  updatedByFk: bigint("updated_by_fk", {
    mode: "number",
    unsigned: true,
  }).references((): AnyMySqlColumn => user.userPk),
  updatedAt: datetime("updated_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

// The settings the code knows about. Adding one here and reading it by this
// constant keeps the string in a single place, so a typo is a type error
// rather than a setting that silently reads as empty.
export const CONFIG_KEYS = {
  /** The org unit whose staff may be named as the GSU representative. */
  gsuUnit: "org.gsu_unit",
} as const;

export type ConfigKey = (typeof CONFIG_KEYS)[keyof typeof CONFIG_KEYS];
