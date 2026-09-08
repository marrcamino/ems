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
  // The primary key, against the project's rule that every table gets a
  // numeric `<tablename>_pk`. The exception is deliberate: the key names the
  // setting, it is already unique, it never changes, and every read and write
  // here finds its row by it. A separate `config_pk` would have been a second
  // identity nothing ever used. Writes upsert on this column rather than
  // inserting, so a setting can never end up with two rows.
  configKey: varchar("config_key", { length: 100 }).primaryKey(),
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
  /**
   * The employee filled in by default on the "Approved by" block of the
   * Driver Trip Ticket and the Requisition and Issue Slip. Optional, and the
   * person preparing the document can always change it.
   */
  fuelUsualApprover: "fuel.usual_approver",
} as const;

export type ConfigKey = (typeof CONFIG_KEYS)[keyof typeof CONFIG_KEYS];

// How each setting's text is read back, and what it reads back as.
//
// `config_value` is always text, so something has to say what that text means.
// A key's entry here is the function that turns the text into the real thing,
// and the type of that setting follows from what the function returns — so
// declaring the parser is the only step. `ConfigValue<K>` below is what a
// caller of `getConfigValue` is handed.
//
// A parser returns null for text it cannot read, which is the same answer as a
// setting nobody has filled in yet. Neither ever throws.
const asNumber = (raw: string): number | null => {
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
};

// Every key in CONFIG_KEYS needs an entry. Adding a key without adding it here
// is a type error rather than a setting that quietly reads back as raw text.
export const CONFIG_PARSERS = {
  [CONFIG_KEYS.gsuUnit]: asNumber,
  [CONFIG_KEYS.fuelUsualApprover]: asNumber,
} satisfies Record<ConfigKey, (raw: string) => unknown>;

/** What a given setting reads back as once it has been parsed. */
export type ConfigValue<K extends ConfigKey> = NonNullable<
  ReturnType<(typeof CONFIG_PARSERS)[K]>
>;
