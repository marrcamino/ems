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
  // Which meter this kind of asset carries, which decides what the fuel
  // issuance form asks for. A pick-up and a dump truck are different kinds
  // but both read an odometer; a generator and a backhoe both read an hour
  // meter. Branching on the meter gives three cases instead of one per kind,
  // and it lives here so it is settled once per kind rather than re-picked on
  // every asset.
  //
  // `none` is for a kind that carries no meter at all, such as a grass cutter
  // or a chainsaw: liters went out, and there is nothing else to read off it.
  meterType: mysqlEnum("meter_type", [
    "odometer",
    "hour_meter",
    "none",
  ]).notNull(),
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
