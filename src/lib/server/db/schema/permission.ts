import { mysqlTable, bigint, varchar, datetime } from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";

export const permission = mysqlTable("permission", {
  permissionPk: bigint("permission_pk", { mode: "number", unsigned: true })
    .primaryKey()
    .autoincrement(),
  key: varchar("key", { length: 100 }).notNull().unique(), // e.g. "fuel:submit"
  module: varchar("module", { length: 50 }).notNull(), // e.g. "fuel", "admin", "ghg"
  description: varchar("description", { length: 255 }),
  createdAt: datetime("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});
