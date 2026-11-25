import { db } from "$lib/server/db";
import { airTravelFlight, airTravelMonthlyReport } from "$lib/server/db/schema";
import { between, eq } from "drizzle-orm";
import { monthOf } from "../paper/paper-month";
import { legsOf } from "./air-travel-format";
import type { AirTravelMonth } from "./air-travel-types";

/**
 * Each month of `year` up to `lastMonth`, with its flights, km flown, and
 * status. A round trip counts as two flights, and its km both ways.
 */
export async function airTravelYear(year: string, lastMonth: string) {
  const range = between(
    airTravelMonthlyReport.reportMonth,
    `${year}-01-01`,
    `${year}-12-01`,
  );
  const [reports, flights] = await Promise.all([
    db
      .select({
        reportMonth: airTravelMonthlyReport.reportMonth,
        status: airTravelMonthlyReport.status,
      })
      .from(airTravelMonthlyReport)
      .where(range),
    db
      .select({
        reportMonth: airTravelMonthlyReport.reportMonth,
        distanceKm: airTravelFlight.distanceKm,
        roundTrip: airTravelFlight.roundTrip,
      })
      .from(airTravelFlight)
      .innerJoin(
        airTravelMonthlyReport,
        eq(
          airTravelFlight.airTravelMonthlyReportFk,
          airTravelMonthlyReport.airTravelMonthlyReportPk,
        ),
      )
      .where(range),
  ]);

  const months: AirTravelMonth[] = [];
  for (let m = 1; m <= 12; m++) {
    const key = `${year}-${String(m).padStart(2, "0")}`;
    if (key > lastMonth) break;
    const own = flights.filter((f) => monthOf(f.reportMonth) === key);
    months.push({
      month: key,
      status:
        reports.find((r) => monthOf(r.reportMonth) === key)?.status ?? null,
      flights: own.reduce((sum, f) => sum + legsOf(f), 0),
      km: own.reduce((sum, f) => sum + f.distanceKm * legsOf(f), 0),
    });
  }
  return months;
}
