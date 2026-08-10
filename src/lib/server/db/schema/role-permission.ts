import { mysqlTable, bigint, primaryKey } from "drizzle-orm/mysql-core";
import { role } from "./role";
import { permission } from "./permission";

export const rolePermission = mysqlTable(
  "role_permission",
  {
    roleFk: bigint("role_fk", { mode: "number", unsigned: true })
      .notNull()
      .references(() => role.rolePk),
    permissionFk: bigint("permission_fk", { mode: "number", unsigned: true })
      .notNull()
      .references(() => permission.permissionPk),
  },
  (table) => [primaryKey({ columns: [table.roleFk, table.permissionFk] })],
);
