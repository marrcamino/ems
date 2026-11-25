import { can } from "$lib/rbac/access";
import { db } from "$lib/server/db";
import {
  electricityBuilding,
  electricityConsumption,
  electricityMonthlyReport,
} from "$lib/server/db/schema";
import { getLocalTimeZone, today } from "@internationalized/date";
import { error, fail } from "@sveltejs/kit";
import { and, asc, eq, sql } from "drizzle-orm";
import { firstDay, isMonth, monthLabel, monthOf } from "../paper/paper-month";
import { userName } from "../paper/paper-report.server";
import type { Actions, PageServerLoad } from "./$types";
import { lastMonthOver, MONTH_NOT_OVER } from "./electricity-month";
import { allBuildings } from "./electricity-buildings.server";
import type {
  BuildingOption,
  ElectricityReport,
  ElectricityUse,
} from "./electricity-types";
import { electricityYear } from "./electricity-year.server";

/**
 * Whoever holds `electricity:manage` records each building's electricity use
 * and submits each month, for the whole PENRO (cards/electricity.md).
 */

/** The dialog's limit: 7 digits. */
const MAX_KWH = 9_999_999;
const MAX_NOTE = 200;

function newestMonth() {
  return lastMonthOver(monthOf(today(getLocalTimeZone()).toString()));
}

async function selectReport(month: string) {
  const [row] = await db
    .select()
    .from(electricityMonthlyReport)
    .where(eq(electricityMonthlyReport.reportMonth, firstDay(month)));
  return row ?? null;
}

/**
 * The month's report, made if it is missing. Two people saving the month's
 * first entry at once both reach the unique index, which keeps one.
 */
async function reportFor(month: string) {
  await db
    .insert(electricityMonthlyReport)
    .values({ reportMonth: firstDay(month) })
    .onDuplicateKeyUpdate({
      set: { reportMonth: sql`${electricityMonthlyReport.reportMonth}` },
    });
  return (await selectReport(month))!;
}

function deny(locals: App.Locals) {
  if (!can(locals.permissions, "electricity:manage")) {
    return fail(403, { error: "You do not have permission to do this." });
  }
  return null;
}

type ReadUse =
  | { error: string }
  | { values: { buildingPk: number; kwh: number; note: string | null } };

/** The add and edit form, checked. */
function readUse(form: FormData): ReadUse {
  const buildingPk = Number(form.get("buildingPk"));
  if (!Number.isInteger(buildingPk) || buildingPk < 1) {
    return { error: "Choose the building." };
  }

  const raw = String(form.get("kwh") ?? "").trim();
  const kwh = Number(raw);
  if (raw === "" || !Number.isInteger(kwh) || kwh < 0 || kwh > MAX_KWH) {
    return { error: "Enter the kWh as a whole number from 0." };
  }

  const note = String(form.get("note") ?? "")
    .trim()
    .replace(/\s+/g, " ");
  if (note.length > MAX_NOTE) {
    return { error: `Shorten the note to ${MAX_NOTE} characters.` };
  }

  return { values: { buildingPk, kwh, note: note || null } };
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
    .select({
      usePk: electricityConsumption.electricityConsumptionPk,
      reportPk: electricityConsumption.electricityMonthlyReportFk,
      buildingPk: electricityConsumption.electricityBuildingFk,
    })
    .from(electricityConsumption)
    .where(eq(electricityConsumption.electricityConsumptionPk, usePk));
  return row ?? null;
}

/**
 * Why a building cannot take a new entry in the month, or null when it can:
 * it must be on the list and active, and have no entry in the month yet.
 */
async function buildingRefusal(
  buildingPk: number,
  reportPk: number,
  month: string,
) {
  const [building] = await db
    .select()
    .from(electricityBuilding)
    .where(eq(electricityBuilding.electricityBuildingPk, buildingPk));
  if (!building) return "That building is no longer on the list.";
  if (building.status === "inactive") {
    return `${building.name} is inactive. Make it active on the Buildings page.`;
  }
  const [taken] = await db
    .select({ usePk: electricityConsumption.electricityConsumptionPk })
    .from(electricityConsumption)
    .where(
      and(
        eq(electricityConsumption.electricityMonthlyReportFk, reportPk),
        eq(electricityConsumption.electricityBuildingFk, buildingPk),
      ),
    );
  if (taken) return alreadyEntered(building.name, month);
  return null;
}

function alreadyEntered(building: string, month: string) {
  return `${building} already has an entry for ${monthLabel(month)}. Edit that entry instead.`;
}

/** True for MySQL's duplicate-key error, from two saves at once. */
function isDuplicate(e: unknown) {
  const err = e as { code?: string; cause?: { code?: string } };
  return (err.cause?.code ?? err.code) === "ER_DUP_ENTRY";
}

export const load: PageServerLoad = async ({ locals, url }) => {
  if (!can(locals.permissions, "electricity:view")) {
    throw error(403, "You do not have permission to view this page.");
  }

  const lastMonth = newestMonth();
  const askedMonth = url.searchParams.get("month");
  const month =
    isMonth(askedMonth) && askedMonth <= lastMonth ? askedMonth : lastMonth;

  const reportRow = await selectReport(month);
  const report: ElectricityReport | null = reportRow && {
    status: reportRow.status,
    // The office's own calendar date, not UTC, which is 8 hours behind.
    submittedOn: reportRow.submittedAt
      ? reportRow.submittedAt.toLocaleDateString("en-CA")
      : null,
    submittedBy: await userName(reportRow.submittedByFk),
  };

  const uses: ElectricityUse[] = reportRow
    ? await db
        .select({
          usePk: electricityConsumption.electricityConsumptionPk,
          buildingPk: electricityBuilding.electricityBuildingPk,
          building: electricityBuilding.name,
          kwh: electricityConsumption.kwh,
          note: electricityConsumption.note,
          // The column's default stores the server's local time, which
          // Drizzle would read as UTC and move 8 hours ahead; the date part
          // read by MySQL is the office's own day.
          enteredOn: sql<string>`date_format(${electricityConsumption.createdAt}, '%Y-%m-%d')`,
        })
        .from(electricityConsumption)
        .innerJoin(
          electricityBuilding,
          eq(
            electricityBuilding.electricityBuildingPk,
            electricityConsumption.electricityBuildingFk,
          ),
        )
        .where(
          eq(
            electricityConsumption.electricityMonthlyReportFk,
            reportRow.electricityMonthlyReportPk,
          ),
        )
        .orderBy(asc(electricityBuilding.electricityBuildingPk))
    : [];

  // The active buildings, and any inactive one with an entry this month, so
  // editing that entry keeps its building.
  const buildings: BuildingOption[] = (await allBuildings())
    .filter(
      (b) =>
        b.status === "active" ||
        uses.some((u) => u.buildingPk === b.buildingPk),
    )
    .map(({ buildingPk, name, status }) => ({ buildingPk, name, status }));

  return {
    month,
    lastMonth,
    report,
    uses,
    buildings,
    year: await electricityYear(month.slice(0, 4), lastMonth),
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
    const refusal = await buildingRefusal(
      read.values.buildingPk,
      report.electricityMonthlyReportPk,
      asked.month,
    );
    if (refusal) return fail(409, { error: refusal });

    try {
      await db.insert(electricityConsumption).values({
        electricityMonthlyReportFk: report.electricityMonthlyReportPk,
        electricityBuildingFk: read.values.buildingPk,
        kwh: read.values.kwh,
        note: read.values.note,
        createdByFk: locals.user!.userPk,
      });
    } catch (e) {
      if (isDuplicate(e)) {
        return fail(409, {
          error: "That building already has an entry for this month. Edit that entry instead.",
        });
      }
      throw e;
    }
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

    // A different building must be able to take a new entry this month.
    if (read.values.buildingPk !== use.buildingPk) {
      const asked = readMonth(form);
      if ("error" in asked) return fail(400, { error: asked.error });
      const refusal = await buildingRefusal(
        read.values.buildingPk,
        use.reportPk,
        asked.month,
      );
      if (refusal) return fail(409, { error: refusal });
    }

    try {
      await db
        .update(electricityConsumption)
        .set({
          electricityBuildingFk: read.values.buildingPk,
          kwh: read.values.kwh,
          note: read.values.note,
          updatedAt: new Date(),
        })
        .where(eq(electricityConsumption.electricityConsumptionPk, use.usePk));
    } catch (e) {
      if (isDuplicate(e)) {
        return fail(409, {
          error: "That building already has an entry for this month. Edit that entry instead.",
        });
      }
      throw e;
    }
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
      .delete(electricityConsumption)
      .where(eq(electricityConsumption.electricityConsumptionPk, use.usePk));
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
      .insert(electricityMonthlyReport)
      .values({ reportMonth: firstDay(month), ...submitted })
      .onDuplicateKeyUpdate({ set: submitted });
    return { success: true };
  },
};
