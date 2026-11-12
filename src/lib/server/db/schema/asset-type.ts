import { sql } from "drizzle-orm";
import {
  bigint,
  datetime,
  mysqlEnum,
  mysqlTable,
  varchar,
} from "drizzle-orm/mysql-core";

// The kinds of thing the office fuels: motorcycle, pick-up, generator,
// grass cutter, and whatever joins the fleet later. A table rather than a
// list in the code so the General Services Unit can add a kind the day it
// arrives, without waiting for a new release.
//
// Deliberately not named `fuel_asset_type`. The Government Energy Management
// Program asks for an inventory of everything that consumes energy, air
// conditioning units and lighting included, so this list is expected to
// outgrow fuel.
export const assetType = mysqlTable("asset_type", {
  assetTypePk: bigint("asset_type_pk", { mode: "number", unsigned: true })
    .primaryKey()
    .autoincrement(),
  // Unique so the list cannot end up holding both "Pickup" and "Pick-up",
  // which would split one kind of asset across two rows in every report.
  assetTypeName: varchar("asset_type_name", { length: 100 }).notNull().unique(),
  // A kind that is no longer in use is deactivated rather than deleted,
  // because assets already recorded under it still point here.
  status: mysqlEnum("status", ["active", "inactive"])
    .notNull()
    .default("active"),
  createdAt: datetime("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: datetime("updated_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});
