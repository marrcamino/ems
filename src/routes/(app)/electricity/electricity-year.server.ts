import { db } from "$lib/server/db";
import {
  electricityConsumption,
  electricityMonthlyReport,
} from "$lib/server/db/schema";
import { between, eq, sql } from "drizzle-orm";
import { monthOf } from "../paper/paper-month";
import { allBuildings } from "./electricity-buildings.server";
import type { BuildingYear, ElectricityMonth } from "./electricity-types";

/**
 * Each month of `year` up to `lastMonth`, with its kWh and status.
 * The months after it are left out, so a month that is not over is not read
 * as a month with no electricity.
 */
export async function electricityYear(year: string, lastMonth: string) {
  const rows = await db
    .select({
      reportMonth: electricityMonthlyReport.reportMonth,
      status: electricityMonthlyReport.status,
      // Null when the month has no entry, unlike 0 kWh entered for a meter
      // that used nothing.
      kwh: sql<string | null>`sum(${electricityConsumption.kwh})`,
    })
    .from(electricityMonthlyReport)
    .leftJoin(
      electricityConsumption,
      eq(
        electricityConsumption.electricityMonthlyReportFk,
        electricityMonthlyReport.electricityMonthlyReportPk,
      ),
    )
    .where(
      between(
        electricityMonthlyReport.reportMonth,
        `${year}-01-01`,
        `${year}-12-01`,
      ),
    )
    .groupBy(
      electricityMonthlyReport.reportMonth,
      electricityMonthlyReport.status,
    );

  const months: ElectricityMonth[] = [];
  for (let m = 1; m <= 12; m++) {
    const key = `${year}-${String(m).padStart(2, "0")}`;
    if (key > lastMonth) break;
    const found = rows.find((r) => monthOf(r.reportMonth) === key);
    months.push({
      month: key,
      status: found?.status ?? null,
      kwh: found?.kwh == null ? null : Number(found.kwh),
    });
  }
  return months;
}

/**
 * Each building's kWh for each month of `year` up to `lastMonth`: the active
 * buildings, and any inactive one with an entry that year.
 */
export async function electricityYearByBuilding(
  year: string,
  lastMonth: string,
): Promise<BuildingYear[]> {
  const rows = await db
    .select({
      reportMonth: electricityMonthlyReport.reportMonth,
      buildingPk: electricityConsumption.electricityBuildingFk,
      kwh: electricityConsumption.kwh,
    })
    .from(electricityConsumption)
    .innerJoin(
      electricityMonthlyReport,
      eq(
        electricityConsumption.electricityMonthlyReportFk,
        electricityMonthlyReport.electricityMonthlyReportPk,
      ),
    )
    .where(
      between(
        electricityMonthlyReport.reportMonth,
        `${year}-01-01`,
        `${year}-12-01`,
      ),
    );

  const months: string[] = [];
  for (let m = 1; m <= 12; m++) {
    const key = `${year}-${String(m).padStart(2, "0")}`;
    if (key > lastMonth) break;
    months.push(key);
  }

  return (await allBuildings())
    .filter(
      (b) =>
        b.status === "active" || rows.some((r) => r.buildingPk === b.buildingPk),
    )
    .map((b) => ({
      buildingPk: b.buildingPk,
      name: b.name,
      order: b.order,
      kwh: months.map(
        (m) =>
          rows.find(
            (r) => r.buildingPk === b.buildingPk && monthOf(r.reportMonth) === m,
          )?.kwh ?? null,
      ),
    }));
}
