import { can } from "$lib/rbac/access";
import { db } from "$lib/server/db";
import { eswmCleanupDrive, eswmMonthlyReport } from "$lib/server/db/schema";
import { getLocalTimeZone, today } from "@internationalized/date";
import { error } from "@sveltejs/kit";
import { between, eq, sql } from "drizzle-orm";
import { monthOf } from "../../paper/paper-month";
import type { SummaryMonth } from "../eswm-types";
import type { PageServerLoad } from "./$types";

/** The year's figures, month by month, from what is already entered. */
export const load: PageServerLoad = async ({ locals, url }) => {
  if (!can(locals.permissions, "eswm:view")) {
    throw error(403, "You do not have permission to view this page.");
  }

  const currentMonth = monthOf(today(getLocalTimeZone()).toString());
  const currentYear = Number(currentMonth.slice(0, 4));
  const asked = Number(url.searchParams.get("year"));
  const year =
    Number.isInteger(asked) && asked >= 2000 && asked <= currentYear
      ? asked
      : currentYear;

  const rows = await db
    .select({
      reportMonth: eswmMonthlyReport.reportMonth,
      status: eswmMonthlyReport.status,
      activities: sql<number>`count(${eswmCleanupDrive.eswmCleanupDrivePk})`,
      participants: sql<string | null>`sum(${eswmCleanupDrive.participants})`,
      sacks: sql<string | null>`sum(${eswmCleanupDrive.sacks})`,
      kilos: sql<string | null>`sum(${eswmCleanupDrive.kilos})`,
    })
    .from(eswmMonthlyReport)
    .leftJoin(
      eswmCleanupDrive,
      eq(
        eswmCleanupDrive.eswmMonthlyReportFk,
        eswmMonthlyReport.eswmMonthlyReportPk,
      ),
    )
    .where(
      between(eswmMonthlyReport.reportMonth, `${year}-01-01`, `${year}-12-01`),
    )
    .groupBy(eswmMonthlyReport.reportMonth, eswmMonthlyReport.status);

  // Only the months so far, so a month that has not come yet is not read
  // as a month with no waste.
  const lastMonth = year === currentYear ? currentMonth : `${year}-12`;
  const months: SummaryMonth[] = [];
  for (let m = 1; `${year}-${String(m).padStart(2, "0")}` <= lastMonth; m++) {
    const key = `${year}-${String(m).padStart(2, "0")}`;
    const found = rows.find((r) => monthOf(r.reportMonth) === key);
    months.push({
      month: key,
      status: found?.status ?? null,
      activities: Number(found?.activities ?? 0),
      participants:
        found?.participants == null ? null : Number(found.participants),
      sacks: Number(found?.sacks ?? 0),
      kilos: Number(found?.kilos ?? 0),
    });
  }

  return { year, currentYear, months };
};
