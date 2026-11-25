import { can } from "$lib/rbac/access";
import { db } from "$lib/server/db";
import { waterConsumption, waterMonthlyReport } from "$lib/server/db/schema";
import { getLocalTimeZone, today } from "@internationalized/date";
import { error, fail } from "@sveltejs/kit";
import { asc, eq, sql } from "drizzle-orm";
import { firstDay, isMonth, monthLabel, monthOf } from "../paper/paper-month";
import { userName } from "../paper/paper-report.server";
import type { Actions, PageServerLoad } from "./$types";
import { lastMonthOver, MONTH_NOT_OVER } from "./water-month";
import type { WaterReport, WaterUse } from "./water-types";
import { waterYear } from "./water-year.server";

/**
 * GSU records the office's water use and submits each month, for the whole
 * PENRO (cards/water.md).
 */

/** The dialog's limit: 7 digits. */
const MAX_CUBIC_METERS = 9_999_999;
const MAX_NOTE = 200;

function newestMonth() {
  return lastMonthOver(monthOf(today(getLocalTimeZone()).toString()));
}

async function selectReport(month: string) {
  const [row] = await db
    .select()
    .from(waterMonthlyReport)
    .where(eq(waterMonthlyReport.reportMonth, firstDay(month)));
  return row ?? null;
}

/**
 * The month's report, made if it is missing. Two people saving the month's
 * first entry at once both reach the unique index, which keeps one.
 */
async function reportFor(month: string) {
  await db
    .insert(waterMonthlyReport)
    .values({ reportMonth: firstDay(month) })
    .onDuplicateKeyUpdate({
      set: { reportMonth: sql`${waterMonthlyReport.reportMonth}` },
    });
  return (await selectReport(month))!;
}

function deny(locals: App.Locals) {
  if (!can(locals.permissions, "water:manage")) {
    return fail(403, { error: "You do not have permission to do this." });
  }
  return null;
}

type ReadUse =
  { error: string } | { values: { cubicMeters: number; note: string | null } };

/** The add and edit form, checked. */
function readUse(form: FormData): ReadUse {
  const raw = String(form.get("cubicMeters") ?? "").trim();
  const cubicMeters = Number(raw);
  if (
    raw === "" ||
    !Number.isInteger(cubicMeters) ||
    cubicMeters < 0 ||
    cubicMeters > MAX_CUBIC_METERS
  ) {
    return { error: "Enter the cubic meters as a whole number from 0." };
  }

  const note = String(form.get("note") ?? "")
    .trim()
    .replace(/\s+/g, " ");
  if (note.length > MAX_NOTE) {
    return { error: `Shorten the note to ${MAX_NOTE} characters.` };
  }

  return { values: { cubicMeters, note: note || null } };
}

/** The month of the form, refused unless it is over. */
function readMonth(form: FormData): { month: string } | { error: string } {
  const month = String(form.get("month") ?? "");
  if (!isMonth(month)) return { error: "Choose a month." };
  if (month > newestMonth()) return { error: MONTH_NOT_OVER };
  return { month };
}

async function selectUse(usePk: number) {
  const [row] = await db
    .select({ usePk: waterConsumption.waterConsumptionPk })
    .from(waterConsumption)
    .where(eq(waterConsumption.waterConsumptionPk, usePk));
  return row ?? null;
}

export const load: PageServerLoad = async ({ locals, url }) => {
  if (!can(locals.permissions, "water:view")) {
    throw error(403, "You do not have permission to view this page.");
  }

  const lastMonth = newestMonth();
  const askedMonth = url.searchParams.get("month");
  const month =
    isMonth(askedMonth) && askedMonth <= lastMonth ? askedMonth : lastMonth;

  const reportRow = await selectReport(month);
  const report: WaterReport | null = reportRow && {
    status: reportRow.status,
    // The office's own calendar date, not UTC, which is 8 hours behind.
    submittedOn: reportRow.submittedAt
      ? reportRow.submittedAt.toLocaleDateString("en-CA")
      : null,
    submittedBy: await userName(reportRow.submittedByFk),
  };

  const uses: WaterUse[] = reportRow
    ? await db
        .select({
          usePk: waterConsumption.waterConsumptionPk,
          cubicMeters: waterConsumption.cubicMeters,
          note: waterConsumption.note,
          // The column's default stores the server's local time, which
          // Drizzle would read as UTC and move 8 hours ahead; the date part
          // read by MySQL is the office's own day.
          enteredOn: sql<string>`date_format(${waterConsumption.createdAt}, '%Y-%m-%d')`,
        })
        .from(waterConsumption)
        .where(
          eq(
            waterConsumption.waterMonthlyReportFk,
            reportRow.waterMonthlyReportPk,
          ),
        )
        .orderBy(asc(waterConsumption.waterConsumptionPk))
    : [];

  return {
    month,
    lastMonth,
    report,
    uses,
    year: await waterYear(month.slice(0, 4), lastMonth),
  };
};

export const actions: Actions = {
  add: async ({ request, locals }) => {
    const denied = deny(locals);
    if (denied) return denied;

    const form = await request.formData();
    const asked = readMonth(form);
    if ("error" in asked) return fail(400, { error: asked.error });
    const read = readUse(form);
    if ("error" in read) return fail(400, { error: read.error });

    const report = await reportFor(asked.month);
    await db.insert(waterConsumption).values({
      waterMonthlyReportFk: report.waterMonthlyReportPk,
      ...read.values,
      createdByFk: locals.user!.userPk,
    });
    return { success: true };
  },

  // The entry keeps its month: it has no date to move it by.
  edit: async ({ request, locals }) => {
    const denied = deny(locals);
    if (denied) return denied;

    const form = await request.formData();
    const use = await selectUse(Number(form.get("usePk")));
    if (!use) {
      return fail(404, { error: "That entry no longer exists." });
    }
    const read = readUse(form);
    if ("error" in read) return fail(400, { error: read.error });

    await db
      .update(waterConsumption)
      .set({ ...read.values, updatedAt: new Date() })
      .where(eq(waterConsumption.waterConsumptionPk, use.usePk));
    return { success: true };
  },

  remove: async ({ request, locals }) => {
    const denied = deny(locals);
    if (denied) return denied;

    const form = await request.formData();
    const use = await selectUse(Number(form.get("usePk")));
    if (!use) {
      return fail(404, { error: "That entry no longer exists." });
    }
    await db
      .delete(waterConsumption)
      .where(eq(waterConsumption.waterConsumptionPk, use.usePk));
    return { success: true };
  },

  submit: async ({ request, locals }) => {
    const denied = deny(locals);
    if (denied) return denied;

    const asked = readMonth(await request.formData());
    if ("error" in asked) return fail(400, { error: asked.error });
    const { month } = asked;
    if ((await selectReport(month))?.status === "submitted") {
      return fail(409, { error: `${monthLabel(month)} is already submitted.` });
    }

    // A month with no entry is submitted too, as none recorded. Its report
    // is made here, already submitted.
    const submitted = {
      status: "submitted" as const,
      submittedAt: new Date(),
      submittedByFk: locals.user!.userPk,
      updatedAt: new Date(),
    };
    await db
      .insert(waterMonthlyReport)
      .values({ reportMonth: firstDay(month), ...submitted })
      .onDuplicateKeyUpdate({ set: submitted });
    return { success: true };
  },
};
