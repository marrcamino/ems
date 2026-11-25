import type { PaperSize } from "$lib/paper-sizes";
import { can } from "$lib/rbac/access";
import { db } from "$lib/server/db";
import {
  orgUnit,
  paperConsumption,
  paperConsumptionItem,
  paperMonthlyReport,
} from "$lib/server/db/schema";
import { getLocalTimeZone, today } from "@internationalized/date";
import { error, fail } from "@sveltejs/kit";
import { and, asc, eq, inArray, or, sql } from "drizzle-orm";
import { addMonths, firstDay, isMonth, monthLabel, monthOf } from "../paper-month";
import {
  selectGsuOfficePk,
  selectReceivedFrom,
  userName,
} from "../paper-report.server";
import type { ReportStatus } from "../paper-types";
import type { Actions, PageServerLoad } from "./$types";

/**
 * Every office's monthly paper report, where GSU marks each printed report
 * received, which locks the month (paper-consumption.md).
 */

export type SubmittedRow = {
  orgUnitPk: number;
  orgUnitName: string;
  abbr: string;
  /** Null when nothing is recorded for the month. */
  reportPk: number | null;
  status: ReportStatus | null;
  /** The reams used, only the sizes used. */
  consumed: Partial<Record<PaperSize, number>>;
  submittedOn: string | null;
  submittedBy: string | null;
  receivedOn: string | null;
  receivedBy: string | null;
  /** GSU's own report, received as it is submitted. */
  isGsu: boolean;
};

function todayIso() {
  return today(getLocalTimeZone()).toString();
}

function deny(locals: App.Locals) {
  return can(locals.permissions, "paper:receive")
    ? null
    : fail(403, { error: "You do not have permission to do this." });
}

async function selectReportByPk(reportPk: number) {
  const [row] = await db
    .select({
      reportPk: paperMonthlyReport.paperMonthlyReportPk,
      orgUnitFk: paperMonthlyReport.orgUnitFk,
      abbr: orgUnit.abbr,
      reportMonth: paperMonthlyReport.reportMonth,
      status: paperMonthlyReport.status,
      submittedAt: paperMonthlyReport.submittedAt,
    })
    .from(paperMonthlyReport)
    .innerJoin(orgUnit, eq(paperMonthlyReport.orgUnitFk, orgUnit.orgUnitPk))
    .where(eq(paperMonthlyReport.paperMonthlyReportPk, reportPk));
  return row ?? null;
}

export const load: PageServerLoad = async ({ locals, url }) => {
  if (!can(locals.permissions, "paper:receive")) {
    throw error(403, "You do not have permission to view this page.");
  }

  // A month can be submitted only once it is over, so the latest month
  // with anything to receive is last month.
  const latestMonth = addMonths(monthOf(todayIso()), -1);
  const asked = url.searchParams.get("month");
  const month = isMonth(asked) && asked <= latestMonth ? asked : latestMonth;

  const reports = await db
    .select()
    .from(paperMonthlyReport)
    .where(eq(paperMonthlyReport.reportMonth, firstDay(month)));

  // Every active office, and any other office with a report this month.
  const offices = await db
    .select({
      orgUnitPk: orgUnit.orgUnitPk,
      orgUnitName: orgUnit.orgUnitName,
      abbr: orgUnit.abbr,
    })
    .from(orgUnit)
    .where(
      reports.length === 0
        ? eq(orgUnit.status, "active")
        : or(
            eq(orgUnit.status, "active"),
            inArray(
              orgUnit.orgUnitPk,
              reports.map((r) => r.orgUnitFk),
            ),
          ),
    )
    .orderBy(asc(orgUnit.orgUnitName));

  const sums =
    reports.length === 0
      ? []
      : await db
          .select({
            reportPk: paperConsumption.paperMonthlyReportFk,
            paperSize: paperConsumptionItem.paperSize,
            reams: sql<string>`sum(${paperConsumptionItem.reams})`,
          })
          .from(paperConsumption)
          .innerJoin(
            paperConsumptionItem,
            eq(
              paperConsumptionItem.paperConsumptionFk,
              paperConsumption.paperConsumptionPk,
            ),
          )
          .where(
            inArray(
              paperConsumption.paperMonthlyReportFk,
              reports.map((r) => r.paperMonthlyReportPk),
            ),
          )
          .groupBy(
            paperConsumption.paperMonthlyReportFk,
            paperConsumptionItem.paperSize,
          );

  const gsuOfficePk = await selectGsuOfficePk();

  const rows: SubmittedRow[] = [];
  for (const office of offices) {
    const report = reports.find((r) => r.orgUnitFk === office.orgUnitPk);
    rows.push({
      ...office,
      reportPk: report?.paperMonthlyReportPk ?? null,
      status: report?.status ?? null,
      consumed: Object.fromEntries(
        sums
          .filter((s) => s.reportPk === report?.paperMonthlyReportPk)
          .map((s) => [s.paperSize, Number(s.reams)]),
      ),
      // The office's own calendar date, not UTC, which is 8 hours behind.
      submittedOn: report?.submittedAt?.toLocaleDateString("en-CA") ?? null,
      submittedBy: (await userName(report?.submittedByFk ?? null)) ?? null,
      receivedOn: report?.receivedOn ?? null,
      receivedBy: (await userName(report?.receivedByFk ?? null)) ?? null,
      isGsu: office.orgUnitPk === gsuOfficePk,
    });
  }

  return {
    month,
    latestMonth,
    today: todayIso(),
    rows,
    canViewOffices: can(locals.permissions, "paper:view_all_offices"),
  };
};

export const actions: Actions = {
  receive: async ({ request, locals }) => {
    const denied = deny(locals);
    if (denied) return denied;

    const form = await request.formData();
    const report = await selectReportByPk(Number(form.get("reportPk")));
    if (!report) return fail(404, { error: "That report no longer exists." });
    const label = monthLabel(monthOf(report.reportMonth));
    if (report.status === "received") {
      return fail(409, {
        error: `The ${report.abbr} report for ${label} is already received.`,
      });
    }
    if (report.status !== "submitted") {
      return fail(409, {
        error: `${report.abbr} has not submitted ${label} yet.`,
      });
    }

    const receivedOn = String(form.get("receivedOn") ?? "");
    const submittedOn = report.submittedAt?.toLocaleDateString("en-CA") ?? "";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(receivedOn)) {
      return fail(400, { error: "Enter the date the printed report arrived." });
    }
    if (receivedOn < submittedOn || receivedOn > todayIso()) {
      return fail(400, {
        error: "Choose a date from the day it was submitted to today.",
      });
    }

    await db
      .update(paperMonthlyReport)
      .set({
        status: "received",
        receivedOn,
        receivedByFk: locals.user!.userPk,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(paperMonthlyReport.paperMonthlyReportPk, report.reportPk),
          eq(paperMonthlyReport.status, "submitted"),
        ),
      );
    return { success: true };
  },

  /**
   * GSU's own report is received as it is submitted, so this is how GSU
   * changes one submitted by mistake: the month is open again, to submit
   * again.
   */
  reopen: async ({ request, locals }) => {
    const denied = deny(locals);
    if (denied) return denied;

    const form = await request.formData();
    const report = await selectReportByPk(Number(form.get("reportPk")));
    if (!report) return fail(404, { error: "That report no longer exists." });
    if (report.orgUnitFk !== (await selectGsuOfficePk())) {
      return fail(409, { error: "Only GSU's own report can be reopened." });
    }
    if (report.status === "open") return { success: true };

    const month = monthOf(report.reportMonth);
    const later = await selectReceivedFrom(
      [report.orgUnitFk],
      addMonths(month, 1),
    );
    if (later) {
      return fail(409, {
        error: `The report for ${monthLabel(later.month)} is already received and counts the paper from ${monthLabel(month)}. Reopen ${monthLabel(later.month)} first.`,
      });
    }

    await db
      .update(paperMonthlyReport)
      .set({
        status: "open",
        submittedAt: null,
        submittedByFk: null,
        receivedOn: null,
        receivedByFk: null,
        updatedAt: new Date(),
      })
      .where(eq(paperMonthlyReport.paperMonthlyReportPk, report.reportPk));
    return { success: true };
  },
};
