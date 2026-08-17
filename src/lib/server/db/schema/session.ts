import { sql } from "drizzle-orm";
import {
  bigint,
  datetime,
  mysqlTable,
  varchar,
  type AnyMySqlColumn,
} from "drizzle-orm/mysql-core";
import { user } from "./user";

export const session = mysqlTable("session", {
  sessionPk: varchar("session_pk", { length: 64 }).primaryKey(), // sha256 hash of the raw token
  userFk: bigint("user_fk", { mode: "number", unsigned: true })
    .notNull()
    .references((): AnyMySqlColumn => user.userPk),
  expiresAt: datetime("expires_at").notNull(),
  createdAt: datetime("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});
