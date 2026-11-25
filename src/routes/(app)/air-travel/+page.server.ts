import { can } from "$lib/rbac/access";
import { db } from "$lib/server/db";
import {
  airTravelFlight,
  airTravelMonthlyReport,
  airTravelRoute,
  employee,
  employeeHistory,
} from "$lib/server/db/schema";
import { fullName } from "$lib/utils";
import { getLocalTimeZone, today } from "@internationalized/date";
import { error, fail } from "@sveltejs/kit";
import { asc, eq, inArray, or, sql } from "drizzle-orm";
import { versionsOn } from "../fuel/issuance.server";
import {
  firstDay,
  isMonth,
  monthLabel,
  monthOf,
  submitTooEarly,
} from "../paper/paper-month";
import { userName } from "../paper/paper-report.server";
import type { Actions, PageServerLoad } from "./$types";
import { airTravelYear } from "./air-travel-year.server";
import { findRoute } from "./air-travel-routes.server";
import type {
  AirTravelReport,
  Flight,
  RouteOption,
  StaffOption,
} from "./air-travel-types";

/**
 * The Finance office records each flight that staff took on official
 * business, one person per flight, and submits each month, for the whole
 * PENRO (cards/air-travel.md).
 */

function todayIso() {
  return today(getLocalTimeZone()).toString();
}

async function selectReport(month: string) {
  const [row] = await db
    .select()
    .from(airTravelMonthlyReport)
    .where(eq(airTravelMonthlyReport.reportMonth, firstDay(month)));
  return row ?? null;
}

/**
 * The month's report, made if it is missing. Two people saving the month's
 * first flight at once both reach the unique index, which keeps one.
 */
async function reportFor(month: string) {
  await db
    .insert(airTravelMonthlyReport)
    .values({ reportMonth: firstDay(month) })
    .onDuplicateKeyUpdate({
      set: { reportMonth: sql`${airTravelMonthlyReport.reportMonth}` },
    });
  return (await selectReport(month))!;
}

function deny(locals: App.Locals) {
  if (!can(locals.permissions, "air_travel:manage")) {
    return fail(403, { error: "You do not have permission to do this." });
  }
  return null;
}

function readText(form: FormData, field: string) {
  return String(form.get(field) ?? "")
    .trim()
    .replace(/\s+/g, " ");
}

type ReadFlight =
  | { error: string }
  | {
      values: {
        flownOn: string;
        travelOrderNo: string;
        fromPlace: string;
        toPlace: string;
        roundTrip: boolean;
        destination: string | null;
        note: string | null;
      };
      employeePk: number;
    };

/** The add and edit form, checked. */
function readFlight(form: FormData): ReadFlight {
  const flownOn = String(form.get("flownOn") ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(flownOn)) {
    return { error: "Choose the date of the flight." };
  }
  if (flownOn > todayIso()) {
    return { error: "The date cannot be after today." };
  }

  const employeePk = Number(form.get("traveller"));
  if (!(employeePk > 0)) return { error: "Choose the traveller." };

  const travelOrderNo = readText(form, "travelOrderNo");
  if (!travelOrderNo) return { error: "Enter the travel order number." };
  if (travelOrderNo.length > 50) {
    return { error: "Shorten the travel order number to 50 characters." };
  }

  const fromPlace = readText(form, "fromPlace");
  if (!fromPlace) return { error: "Choose where the flight left from." };
  const toPlace = readText(form, "toPlace");
  if (!toPlace) return { error: "Choose where the flight went to." };
  if (fromPlace.length > 100 || toPlace.length > 100) {
    return { error: "Shorten the place to 100 characters." };
  }
  if (fromPlace.toLowerCase() === toPlace.toLowerCase()) {
    return { error: "Choose two different places." };
  }

  const roundTrip = form.get("roundTrip") === "on";

  const destination = readText(form, "destination");
  if (destination.length > 150) {
    return { error: "Shorten the destination to 150 characters." };
  }

  const note = readText(form, "note");
  if (note.length > 200) {
    return { error: "Shorten the note to 200 characters." };
  }

  return {
    values: {
      flownOn,
      travelOrderNo,
      fromPlace,
      toPlace,
      roundTrip,
      destination: destination || null,
      note: note || null,
    },
    employeePk,
  };
}

/**
 * Saves a flight, with the traveller's name version on the flight date, and
 * the route's places and distance of the day.
 */
async function saveFlight(
  flightPk: number | null,
  read: Extract<ReadFlight, { values: unknown }>,
  userPk: number,
): Promise<{ error: string } | { month: string }> {
  const { fromPlace, toPlace } = read.values;
  const route = await findRoute(fromPlace, toPlace);
  if (!route) {
    return {
      error: `There is no route between ${fromPlace} and ${toPlace} yet. Add it on the Routes page.`,
    };
  }
  // An inactive route stays only on a flight that already uses it.
  if (route.status === "inactive") {
    const [current] = flightPk
      ? await db
          .select({ routeFk: airTravelFlight.airTravelRouteFk })
          .from(airTravelFlight)
          .where(eq(airTravelFlight.airTravelFlightPk, flightPk))
      : [];
    if (current?.routeFk !== route.airTravelRoutePk) {
      return {
        error: `The route between ${fromPlace} and ${toPlace} is inactive. Make it active on the Routes page.`,
      };
    }
  }
  // The places as the route spells them, in the direction flown.
  const fromIsA = route.placeA.toLowerCase() === fromPlace.toLowerCase();

  const versions = await versionsOn([read.employeePk], read.values.flownOn);
  const travellerFk = versions.get(read.employeePk);
  if (travellerFk === undefined) {
    return { error: "The traveller is not on the employee list." };
  }

  // A new date in another month moves the flight to that month.
  const month = monthOf(read.values.flownOn);
  const report = await reportFor(month);
  const values = {
    airTravelMonthlyReportFk: report.airTravelMonthlyReportPk,
    travellerFk,
    ...read.values,
    airTravelRouteFk: route.airTravelRoutePk,
    fromPlace: fromIsA ? route.placeA : route.placeB,
    toPlace: fromIsA ? route.placeB : route.placeA,
    distanceKm: route.distanceKm,
  };

  if (flightPk === null) {
    await db.insert(airTravelFlight).values({ ...values, createdByFk: userPk });
  } else {
    await db
      .update(airTravelFlight)
      .set({ ...values, updatedAt: new Date() })
      .where(eq(airTravelFlight.airTravelFlightPk, flightPk));
  }
  return { month };
}

async function selectFlight(flightPk: number) {
  const [row] = await db
    .select({ flightPk: airTravelFlight.airTravelFlightPk })
    .from(airTravelFlight)
    .where(eq(airTravelFlight.airTravelFlightPk, flightPk));
  return row ?? null;
}

export const load: PageServerLoad = async ({ locals, url }) => {
  if (!can(locals.permissions, "air_travel:view")) {
    throw error(403, "You do not have permission to view this page.");
  }

  const currentMonth = monthOf(todayIso());
  const askedMonth = url.searchParams.get("month");
  const month =
    isMonth(askedMonth) && askedMonth <= currentMonth
      ? askedMonth
      : currentMonth;

  const reportRow = await selectReport(month);
  const report: AirTravelReport | null = reportRow && {
    status: reportRow.status,
    // The office's own calendar date, not UTC, which is 8 hours behind.
    submittedOn: reportRow.submittedAt
      ? reportRow.submittedAt.toLocaleDateString("en-CA")
      : null,
    submittedBy: await userName(reportRow.submittedByFk),
  };

  const flights: Flight[] = reportRow
    ? (
        await db
          .select({
            flight: airTravelFlight,
            employeePk: employeeHistory.employeeFk,
            firstName: employeeHistory.firstName,
            middleName: employeeHistory.middleName,
            lastName: employeeHistory.lastName,
            suffix: employeeHistory.suffix,
          })
          .from(airTravelFlight)
          .innerJoin(
            employeeHistory,
            eq(airTravelFlight.travellerFk, employeeHistory.employeeHistoryPk),
          )
          .where(
            eq(
              airTravelFlight.airTravelMonthlyReportFk,
              reportRow.airTravelMonthlyReportPk,
            ),
          )
          .orderBy(
            asc(airTravelFlight.flownOn),
            asc(airTravelFlight.airTravelFlightPk),
          )
      ).map(({ flight: r, ...person }) => ({
        flightPk: r.airTravelFlightPk,
        flownOn: r.flownOn,
        travelOrderNo: r.travelOrderNo,
        fromPlace: r.fromPlace,
        toPlace: r.toPlace,
        roundTrip: r.roundTrip,
        destination: r.destination,
        note: r.note,
        km: r.distanceKm,
        traveller: { employeePk: person.employeePk, name: fullName(person) },
      }))
    : [];

  const staff: StaffOption[] = (
    await db
      .select({
        employeePk: employee.employeePk,
        firstName: employee.firstName,
        middleName: employee.middleName,
        lastName: employee.lastName,
        suffix: employee.suffix,
        position: employee.positionTitle,
      })
      .from(employee)
      .where(eq(employee.employmentStatus, "active"))
      .orderBy(asc(employee.lastName), asc(employee.firstName))
  ).map((e) => ({
    employeePk: e.employeePk,
    name: fullName(e),
    position: e.position,
  }));

  // The active routes, and any inactive one that a flight of this month
  // uses, so editing that flight keeps it.
  const usedRoutes = [
    ...new Set(
      (
        await db
          .select({ routeFk: airTravelFlight.airTravelRouteFk })
          .from(airTravelFlight)
          .where(
            eq(
              airTravelFlight.airTravelMonthlyReportFk,
              reportRow?.airTravelMonthlyReportPk ?? 0,
            ),
          )
      ).map((r) => r.routeFk),
    ),
  ];
  const routes: RouteOption[] = await db
    .select({
      placeA: airTravelRoute.placeA,
      placeB: airTravelRoute.placeB,
      distanceKm: airTravelRoute.distanceKm,
    })
    .from(airTravelRoute)
    .where(
      usedRoutes.length
        ? or(
            eq(airTravelRoute.status, "active"),
            inArray(airTravelRoute.airTravelRoutePk, usedRoutes),
          )
        : eq(airTravelRoute.status, "active"),
    )
    .orderBy(asc(airTravelRoute.placeA), asc(airTravelRoute.placeB));

  const yearOf = month.slice(0, 4);
  const lastMonth =
    yearOf === currentMonth.slice(0, 4) ? currentMonth : `${yearOf}-12`;

  return {
    month,
    currentMonth,
    today: todayIso(),
    report,
    flights,
    staff,
    routes,
    year: await airTravelYear(yearOf, lastMonth),
  };
};

export const actions: Actions = {
  add: async ({ request, locals }) => {
    const denied = deny(locals);
    if (denied) return denied;

    const read = readFlight(await request.formData());
    if ("error" in read) return fail(400, { error: read.error });

    const saved = await saveFlight(null, read, locals.user!.userPk);
    if ("error" in saved) return fail(400, saved);
    return { success: true, month: saved.month };
  },

  edit: async ({ request, locals }) => {
    const denied = deny(locals);
    if (denied) return denied;

    const form = await request.formData();
    const flight = await selectFlight(Number(form.get("flightPk")));
    if (!flight) {
      return fail(404, { error: "That entry no longer exists." });
    }
    const read = readFlight(form);
    if ("error" in read) return fail(400, { error: read.error });

    const saved = await saveFlight(flight.flightPk, read, locals.user!.userPk);
    if ("error" in saved) return fail(400, saved);
    return { success: true, month: saved.month };
  },

  remove: async ({ request, locals }) => {
    const denied = deny(locals);
    if (denied) return denied;

    const form = await request.formData();
    const flight = await selectFlight(Number(form.get("flightPk")));
    if (!flight) {
      return fail(404, { error: "That entry no longer exists." });
    }
    await db
      .delete(airTravelFlight)
      .where(eq(airTravelFlight.airTravelFlightPk, flight.flightPk));
    return { success: true };
  },

  submit: async ({ request, locals }) => {
    const denied = deny(locals);
    if (denied) return denied;

    const form = await request.formData();
    const month = String(form.get("month") ?? "");
    if (!isMonth(month)) return fail(400, { error: "Choose a month." });
    const tooEarly = submitTooEarly(month, monthOf(todayIso()));
    if (tooEarly) return fail(409, { error: tooEarly });
    if ((await selectReport(month))?.status === "submitted") {
      return fail(409, { error: `${monthLabel(month)} is already submitted.` });
    }

    // A month with no flight is submitted too, as no flights. Its report is
    // made here, already submitted.
    const submitted = {
      status: "submitted" as const,
      submittedAt: new Date(),
      submittedByFk: locals.user!.userPk,
      updatedAt: new Date(),
    };
    await db
      .insert(airTravelMonthlyReport)
      .values({ reportMonth: firstDay(month), ...submitted })
      .onDuplicateKeyUpdate({ set: submitted });
    return { success: true };
  },
};
