import { sql } from "drizzle-orm";
import {
  bigint,
  datetime,
  mysqlEnum,
  mysqlTable,
  varchar,
  type AnyMySqlColumn,
} from "drizzle-orm/mysql-core";
import { assetType } from "./asset-type";

// One row per vehicle, boat or machine the office fuels. Only assets the
// office owns are entered here; a borrowed or rented one is left out until
// the General Services Unit says it takes office fuel.
export const asset = mysqlTable("asset", {
  assetPk: bigint("asset_pk", { mode: "number", unsigned: true })
    .primaryKey()
    .autoincrement(),
  // The meter is not stored on the asset: it comes from the type, so every
  // motorcycle reads an odometer without anyone picking it again.
  assetTypeFk: bigint("asset_type_fk", {
    mode: "number",
    unsigned: true,
  })
    .notNull()
    .references((): AnyMySqlColumn => assetType.assetTypePk, {
      onDelete: "restrict",
    }),
  // Not unique: the office has three motorcycles all called "Honda XR".
  // Lists that offer an asset to pick show the plate or property number
  // beside the name to tell them apart.
  assetName: varchar("asset_name", { length: 100 }).notNull(),
  // Nullable because boats and generators carry no plate. Required when the
  // type reads an odometer, which the server checks, since the rule depends
  // on another table. Several NULLs do not clash with the unique index.
  plateNumber: varchar("plate_number", { length: 20 }).unique(),
  // What identifies the machine: every office-owned asset has one, and no
  // two share it.
  propertyNumber: varchar("property_number", { length: 50 })
    .notNull()
    .unique(),
  // Each asset stays on one fuel. The logbook never shows the same machine
  // under both the gasoline and the diesel column.
  fuelType: mysqlEnum("fuel_type", ["gasoline", "diesel"]).notNull(),
  // Switched off rather than deleted, because fuel records will point here.
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
